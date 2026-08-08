/**
 * @altora/keanggotaan/loyalty-service — Loyalty (Poin) domain service.
 *
 * Manages loyalty accounts, points earning/redemption/expiry, tier calculation,
 * and manual adjustments. All operations are tenant-scoped.
 *
 * Points lifecycle: PEROLEHAN (earn) → PENUKARAN / KADALUARSA / PEMBALIKAN
 * Redemption uses earliest-expiring-first (FIFO by kadaluarsaPada ASC).
 * Source of truth: PoinRiwayat ledger. Keanggotaan caches are documentation-only.
 */

import type { PrismaClient } from "@prisma/client";
import { generateIdempotencyKey } from "@altora/domain";

function genId(): string { return crypto.randomUUID(); }

// ─── Errors ─────────────────────────────────────────────────────────────────

export class LoyaltyError extends Error {
  constructor(message: string, public code: LoyaltyErrorCode) {
    super(message); this.name = "LoyaltyError";
  }
}

export type LoyaltyErrorCode =
  | "ACCOUNT_NOT_FOUND" | "ACCOUNT_INACTIVE" | "CUSTOMER_NOT_IN_TENANT"
  | "PROGRAM_NOT_FOUND" | "TIER_NOT_FOUND" | "INSUFFICIENT_POINTS"
  | "BELOW_MINIMUM_REDEEM" | "LEDGER_ENTRY_NOT_FOUND" | "ALREADY_REVERSED"
  | "IDEMPOTENCY_CONFLICT" | "IDEMPOTENCY_IN_PROGRESS" | "TENANT_MISMATCH"
  | "NON_POSITIVE_ADJUSTMENT" | "ACTOR_NOT_FOUND";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LoyaltyProgramConfig {
  spendUnit: number; pointsPerSpendUnit: number; minimumRedeem: number;
  expiryDays: number | null; metric: "SPEND" | "POINTS" | "VISITS";
  defaultTierId: string;
}

export interface LoyaltyAccountSummary {
  keanggotaanId: string; pelangganId: string; tenantId: string;
  poinAktif: number; poinKumulatif: number; tierId: string;
  tierNama: string; status: string; bergabungPada: Date;
}

const PROGRAM_KEY = "loyalty:config";
async function getConfig(db: PrismaClient, tenantId: string): Promise<LoyaltyProgramConfig | null> {
  const s = await db.pengaturanTenant.findUnique({
    where: { tenantId_kunci: { tenantId, kunci: PROGRAM_KEY } },
  });
  return s ? (s.nilai as unknown as LoyaltyProgramConfig) : null;
}

// ─── 1. Account Management ──────────────────────────────────────────────────

/** Enroll a customer. Creates Keanggotaan with default tier and zero balance. */
export async function enrollCustomer(
  db: PrismaClient, tenantId: string, pelangganId: string,
): Promise<LoyaltyAccountSummary> {
  const pel = await db.pelanggan.findFirst({
    where: { id: pelangganId, tenantId, status: "AKTIF" }, select: { id: true },
  });
  if (!pel) throw new LoyaltyError("Pelanggan tidak ditemukan di tenant", "CUSTOMER_NOT_IN_TENANT");

  const config = await getConfig(db, tenantId);
  if (!config) throw new LoyaltyError("Program loyalitas belum dikonfigurasi", "PROGRAM_NOT_FOUND");

  const tier = await db.tierKeanggotaan.findFirst({
    where: { id: config.defaultTierId, tenantId }, select: { id: true, nama: true },
  });
  if (!tier) throw new LoyaltyError("Tier default tidak ditemukan", "TIER_NOT_FOUND");

  const existing = await db.keanggotaan.findUnique({
    where: { tenantId_pelangganId: { tenantId, pelangganId } },
    select: { id: true, status: true },
  });
  if (existing?.status === "AKTIF") {
    throw new LoyaltyError("Pelanggan sudah terdaftar aktif", "ACCOUNT_INACTIVE");
  }

  // Reuse NONAKTIF row or create new
  if (existing) {
    const r = await db.keanggotaan.update({
      where: { id: existing.id },
      data: { status: "AKTIF", tierKeanggotaanId: tier.id, poinAktif: 0, poinKumulatif: 0, version: { increment: 1 } },
      include: { tierKeanggotaan: { select: { nama: true } } },
    });
    return { keanggotaanId: r.id, pelangganId, tenantId, poinAktif: 0, poinKumulatif: 0,
      tierId: tier.id, tierNama: r.tierKeanggotaan.nama, status: r.status, bergabungPada: r.bergabungPada };
  }

  const c = await db.keanggotaan.create({
    data: { id: genId(), tenantId, pelangganId, tierKeanggotaanId: tier.id, poinAktif: 0, poinKumulatif: 0, status: "AKTIF" },
    include: { tierKeanggotaan: { select: { nama: true } } },
  });
  return { keanggotaanId: c.id, pelangganId, tenantId, poinAktif: 0, poinKumulatif: 0,
    tierId: tier.id, tierNama: c.tierKeanggotaan.nama, status: c.status, bergabungPada: c.bergabungPada };
}

/** Get loyalty account summary (balance + tier). */
export async function getAccount(
  db: PrismaClient, tenantId: string, pelangganId: string,
): Promise<LoyaltyAccountSummary> {
  const k = await db.keanggotaan.findFirst({
    where: { tenantId, pelangganId },
    include: { tierKeanggotaan: { select: { nama: true } } },
  });
  if (!k) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");
  return { keanggotaanId: k.id, pelangganId, tenantId, poinAktif: k.poinAktif,
    poinKumulatif: k.poinKumulatif, tierId: k.tierKeanggotaanId,
    tierNama: k.tierKeanggotaan.nama, status: k.status, bergabungPada: k.bergabungPada };
}

// ─── 2. Points Earning (INTERNAL) ───────────────────────────────────────────

/** Earn points. Formula: floor(eligibleAmount / spendUnit) * pointsPerSpendUnit. Idempotent per order. */
export async function earnPoints(
  db: PrismaClient, tenantId: string, keanggotaanId: string,
  orderId: string, eligibleAmount: number,
): Promise<{ pointsEarned: number; ledgerId: string }> {
  const acc = await db.keanggotaan.findFirst({
    where: { id: keanggotaanId, tenantId }, select: { id: true, status: true },
  });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");
  if (acc.status !== "AKTIF") throw new LoyaltyError("Akun loyalitas tidak aktif", "ACCOUNT_INACTIVE");

  const config = await getConfig(db, tenantId);
  if (!config) throw new LoyaltyError("Program loyalitas belum dikonfigurasi", "PROGRAM_NOT_FOUND");

  const ik = generateIdempotencyKey({ domain: "loyalty", entity: "earn", action: "points",
    fingerprint: [tenantId, keanggotaanId, orderId] });
  const existingKey = await db.idempotencyKey.findUnique({
    where: { tenantId_scope_key: { tenantId, scope: "loyalty.earn", key: ik } },
  });
  if (existingKey?.status === "SELESAI") {
    const c = existingKey.responseBody as { pointsEarned: number; ledgerId: string } | null;
    if (c) return c;
  }
  if (existingKey?.status === "MEMPROSES") {
    throw new LoyaltyError("Operasi earn sedang diproses", "IDEMPOTENCY_IN_PROGRESS");
  }

  const pointsEarned = Math.floor(eligibleAmount / config.spendUnit) * config.pointsPerSpendUnit;
  const kadaluarsaPada = config.expiryDays ? new Date(Date.now() + config.expiryDays * 86400000) : null;

  if (pointsEarned <= 0) {
    await db.idempotencyKey.create({ data: { id: genId(), tenantId, scope: "loyalty.earn", key: ik,
      requestHash: `earn:${orderId}:${eligibleAmount}`, responseStatus: 200,
      responseBody: { pointsEarned: 0, ledgerId: "" }, status: "SELESAI",
      expiresAt: new Date(Date.now() + 604800000) } });
    return { pointsEarned: 0, ledgerId: "" };
  }

  const ledgerId = genId();
  return db.$transaction(async (tx) => {
    await tx.idempotencyKey.create({ data: { id: genId(), tenantId, scope: "loyalty.earn", key: ik,
      requestHash: `earn:${orderId}:${eligibleAmount}`, status: "MEMPROSES",
      expiresAt: new Date(Date.now() + 604800000) } });
    await tx.poinRiwayat.create({ data: { id: ledgerId, tenantId, keanggotaanId, pesananId: orderId,
      jenis: "PEROLEHAN", jumlah: pointsEarned, kadaluarsaPada,
      alasan: `Earn from order ${orderId}` } });
    await tx.keanggotaan.update({ where: { id: keanggotaanId },
      data: { poinAktif: { increment: pointsEarned }, poinKumulatif: { increment: pointsEarned }, version: { increment: 1 } } });
    await tx.idempotencyKey.update({ where: { tenantId_scope_key: { tenantId, scope: "loyalty.earn", key: ik } },
      data: { status: "SELESAI", responseStatus: 200, responseBody: { pointsEarned, ledgerId } } });
    return { pointsEarned, ledgerId };
  });
}

/** Reverse earned points (for refunds). Links reversal to original PEROLEHAN. */
export async function reverseEarn(
  db: PrismaClient, tenantId: string, ledgerEntryId: string, reason: string,
): Promise<{ reversed: number }> {
  const orig = await db.poinRiwayat.findFirst({
    where: { id: ledgerEntryId, tenantId, jenis: "PEROLEHAN" },
  });
  if (!orig) throw new LoyaltyError("Baris perolehan tidak ditemukan", "LEDGER_ENTRY_NOT_FOUND");

  const dup = await db.poinRiwayat.findFirst({ where: { membalikMutasiId: ledgerEntryId }, select: { id: true } });
  if (dup) throw new LoyaltyError("Baris sudah pernah dibalikkan", "ALREADY_REVERSED");

  await db.$transaction(async (tx) => {
    await tx.poinRiwayat.create({ data: { id: genId(), tenantId, keanggotaanId: orig.keanggotaanId,
      pesananId: orig.pesananId, jenis: "PEMBALIKAN", jumlah: -Math.abs(orig.jumlah),
      membalikMutasiId: ledgerEntryId, alasan: reason } });
    await tx.keanggotaan.update({ where: { id: orig.keanggotaanId },
      data: { poinAktif: { decrement: Math.abs(orig.jumlah) }, version: { increment: 1 } } });
  });
  return { reversed: Math.abs(orig.jumlah) };
}

// ─── 3. Points Redemption ───────────────────────────────────────────────────

/** Validate redemption: active account, sufficient balance, meets minimum. */
export async function validateRedemption(
  db: PrismaClient, tenantId: string, keanggotaanId: string, points: number,
): Promise<{ valid: boolean; balance: number; minimum: number }> {
  if (points <= 0) throw new LoyaltyError("Poin harus positif", "NON_POSITIVE_ADJUSTMENT");
  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId },
    select: { id: true, status: true, poinAktif: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");
  if (acc.status !== "AKTIF") throw new LoyaltyError("Akun loyalitas tidak aktif", "ACCOUNT_INACTIVE");
  const config = await getConfig(db, tenantId);
  const minimum = config?.minimumRedeem ?? 1;
  return { valid: acc.poinAktif >= points && points >= minimum, balance: acc.poinAktif, minimum };
}

/** Redeem points using earliest-expiring-first (FIFO). Idempotent per order+points. */
export async function redeemPoints(
  db: PrismaClient, tenantId: string, keanggotaanId: string,
  orderId: string, points: number,
): Promise<{ ledgerId: string; grantsConsumed: string[] }> {
  if (points <= 0) throw new LoyaltyError("Poin harus positif", "NON_POSITIVE_ADJUSTMENT");
  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId },
    select: { id: true, status: true, poinAktif: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");
  if (acc.status !== "AKTIF") throw new LoyaltyError("Akun loyalitas tidak aktif", "ACCOUNT_INACTIVE");

  const config = await getConfig(db, tenantId);
  const minimum = config?.minimumRedeem ?? 1;
  if (points < minimum) throw new LoyaltyError(`Minimum ${minimum} poin`, "BELOW_MINIMUM_REDEEM");
  if (acc.poinAktif < points) throw new LoyaltyError(`Saldo ${acc.poinAktif} < ${points}`, "INSUFFICIENT_POINTS");

  const ik = generateIdempotencyKey({ domain: "loyalty", entity: "redeem", action: "points",
    fingerprint: [tenantId, keanggotaanId, orderId, String(points)] });
  const existingKey = await db.idempotencyKey.findUnique({
    where: { tenantId_scope_key: { tenantId, scope: "loyalty.redeem", key: ik } },
  });
  if (existingKey?.status === "SELESAI") {
    const c = existingKey.responseBody as { ledgerId: string; grantsConsumed: string[] } | null;
    if (c) return c;
  }
  if (existingKey?.status === "MEMPROSES") throw new LoyaltyError("Sedang diproses", "IDEMPOTENCY_IN_PROGRESS");

  // FIFO: find non-expired PEROLEHAN grants, earliest expiry first
  const now = new Date();
  const grants = await db.poinRiwayat.findMany({
    where: { keanggotaanId, tenantId, jenis: "PEROLEHAN", jumlah: { gt: 0 },
      OR: [{ kadaluarsaPada: null }, { kadaluarsaPada: { gt: now } }] },
    orderBy: [{ kadaluarsaPada: "asc" }, { createdAt: "asc" }],
  });

  let remaining = points;
  const grantsConsumed: string[] = [];
  for (const g of grants) {
    if (remaining <= 0) break;
    const deduct = Math.min(g.jumlah, remaining);
    grantsConsumed.push(g.id);
    remaining -= deduct;
  }
  if (remaining > 0) throw new LoyaltyError(`Saldo FIFO tidak cukup, kurang ${remaining}`, "INSUFFICIENT_POINTS");

  const ledgerId = genId();
  return db.$transaction(async (tx) => {
    await tx.idempotencyKey.create({ data: { id: genId(), tenantId, scope: "loyalty.redeem", key: ik,
      requestHash: `redeem:${orderId}:${points}`, status: "MEMPROSES",
      expiresAt: new Date(now.getTime() + 604800000) } });
    await tx.poinRiwayat.create({ data: { id: ledgerId, tenantId, keanggotaanId, pesananId: orderId,
      jenis: "PENUKARAN", jumlah: -points, alasan: `Redeem for order ${orderId}` } });
    await tx.keanggotaan.update({ where: { id: keanggotaanId },
      data: { poinAktif: { decrement: points }, version: { increment: 1 } } });
    await tx.idempotencyKey.update({ where: { tenantId_scope_key: { tenantId, scope: "loyalty.redeem", key: ik } },
      data: { status: "SELESAI", responseStatus: 200, responseBody: { ledgerId, grantsConsumed } } });
    return { ledgerId, grantsConsumed };
  });
}

// ─── 4. Points Expiry ───────────────────────────────────────────────────────

/** Expire overdue PEROLEHAN grants. Writes KADALUARSA entries, deducts cache. */
export async function processExpiry(
  db: PrismaClient, tenantId: string, keanggotaanId: string,
): Promise<{ expiredCount: number; totalExpired: number }> {
  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId }, select: { id: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");

  const expired = await db.poinRiwayat.findMany({
    where: { keanggotaanId, tenantId, jenis: "PEROLEHAN", jumlah: { gt: 0 },
      kadaluarsaPada: { not: null, lt: new Date() } },
    orderBy: { kadaluarsaPada: "asc" },
  });
  if (expired.length === 0) return { expiredCount: 0, totalExpired: 0 };

  let totalExpired = 0;
  await db.$transaction(async (tx) => {
    for (const g of expired) {
      await tx.poinRiwayat.create({ data: { id: genId(), tenantId, keanggotaanId,
        jenis: "KADALUARSA", jumlah: -g.jumlah, membalikMutasiId: g.id,
        alasan: `Poin kedaluwarsa ${g.kadaluarsaPada?.toISOString().split("T")[0]}` } });
      totalExpired += g.jumlah;
    }
    if (totalExpired > 0) await tx.keanggotaan.update({ where: { id: keanggotaanId },
      data: { poinAktif: { decrement: totalExpired }, version: { increment: 1 } } });
  });
  return { expiredCount: expired.length, totalExpired };
}

/** Get points expiring within N days. */
export async function getExpiringPoints(
  db: PrismaClient, tenantId: string, keanggotaanId: string, withinDays: number,
): Promise<{ jumlah: number; kadaluarsaPada: Date }[]> {
  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId }, select: { id: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");

  const now = new Date();
  const deadline = new Date(now.getTime() + withinDays * 86400000);
  const rows = await db.poinRiwayat.findMany({
    where: { keanggotaanId, tenantId, jenis: "PEROLEHAN", jumlah: { gt: 0 },
      kadaluarsaPada: { gt: now, lte: deadline } },
    select: { jumlah: true, kadaluarsaPada: true },
    orderBy: { kadaluarsaPada: "asc" },
  });
  return rows.filter((r): r is typeof r & { kadaluarsaPada: Date } => r.kadaluarsaPada !== null)
    .map((r) => ({ jumlah: r.jumlah, kadaluarsaPada: r.kadaluarsaPada }));
}

// ─── 5. Tier Calculation ────────────────────────────────────────────────────

/** Recalculate tier based on metric (SPEND/POINTS/VISITS). Assigns highest qualifying tier. */
export async function recalculateTier(
  db: PrismaClient, tenantId: string, keanggotaanId: string,
): Promise<{ previousTierId: string; newTierId: string; tierNama: string }> {
  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId },
    select: { id: true, tierKeanggotaanId: true, poinKumulatif: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");

  const config = await getConfig(db, tenantId);
  if (!config) throw new LoyaltyError("Program loyalitas belum dikonfigurasi", "PROGRAM_NOT_FOUND");

  let metricValue: number;
  if (config.metric === "POINTS") {
    metricValue = acc.poinKumulatif;
  } else if (config.metric === "VISITS") {
    const v = await db.poinRiwayat.aggregate({ where: { keanggotaanId, tenantId, jenis: "PEROLEHAN" },
      _count: { pesananId: true } });
    metricValue = v._count.pesananId;
  } else {
    const sum = await db.poinRiwayat.aggregate({ where: { keanggotaanId, tenantId, jenis: "PEROLEHAN" },
      _sum: { jumlah: true } });
    metricValue = Math.floor((sum._sum.jumlah ?? 0) / config.pointsPerSpendUnit) * config.spendUnit;
  }

  const tiers = await db.tierKeanggotaan.findMany({ where: { tenantId },
    orderBy: { minPoinKumulatif: "desc" }, select: { id: true, nama: true, minPoinKumulatif: true } });
  if (tiers.length === 0) throw new LoyaltyError("Tidak ada tier dikonfigurasi", "TIER_NOT_FOUND");

  const target = tiers.find((t) => metricValue >= t.minPoinKumulatif) ?? tiers[tiers.length - 1]!;
  if (acc.tierKeanggotaanId !== target.id) {
    await db.keanggotaan.update({ where: { id: keanggotaanId },
      data: { tierKeanggotaanId: target.id, version: { increment: 1 } } });
  }
  return { previousTierId: acc.tierKeanggotaanId, newTierId: target.id, tierNama: target.nama };
}

/** Get tier benefits config (JSON stored on TierKeanggotaan). */
export async function getTierBenefits(
  db: PrismaClient, tenantId: string, tierId: string,
): Promise<{ id: string; nama: string; benefit: unknown; minPoinKumulatif: number }> {
  const t = await db.tierKeanggotaan.findFirst({ where: { id: tierId, tenantId },
    select: { id: true, nama: true, benefit: true, minPoinKumulatif: true } });
  if (!t) throw new LoyaltyError("Tier tidak ditemukan", "TIER_NOT_FOUND");
  return { id: t.id, nama: t.nama, benefit: t.benefit, minPoinKumulatif: t.minPoinKumulatif };
}

// ─── 6. Adjustments (Manager Only) ─────────────────────────────────────────

/** Manual points adjustment with AuditLog. Requires manager's keanggotaanTenantId as actor. */
export async function adjustPoints(
  db: PrismaClient, tenantId: string, keanggotaanId: string,
  delta: number, reason: string, actorKeanggotaanTenantId: string,
): Promise<{ ledgerId: string; newBalance: number }> {
  if (delta === 0) throw new LoyaltyError("Delta harus bukan nol", "NON_POSITIVE_ADJUSTMENT");

  const acc = await db.keanggotaan.findFirst({ where: { id: keanggotaanId, tenantId },
    select: { id: true, poinAktif: true } });
  if (!acc) throw new LoyaltyError("Akun loyalitas tidak ditemukan", "ACCOUNT_NOT_FOUND");

  const actor = await db.keanggotaanTenant.findFirst({ where: { id: actorKeanggotaanTenantId, tenantId },
    select: { id: true, penggunaId: true } });
  if (!actor) throw new LoyaltyError("Aktor tidak ditemukan di tenant ini", "ACTOR_NOT_FOUND");

  if (acc.poinAktif + delta < 0) {
    throw new LoyaltyError(`Penyesuaian membuat saldo negatif (${acc.poinAktif + delta})`, "INSUFFICIENT_POINTS");
  }

  const ledgerId = genId();
  const prev = acc.poinAktif;
  const newBalance = prev + delta;

  await db.$transaction(async (tx) => {
    await tx.poinRiwayat.create({ data: { id: ledgerId, tenantId, keanggotaanId, jenis: "PENYESUAIAN",
      jumlah: delta, alasan: reason, dicatatOlehId: actorKeanggotaanTenantId } });
    await tx.keanggotaan.update({ where: { id: keanggotaanId },
      data: { poinAktif: { increment: delta },
        ...(delta > 0 && { poinKumulatif: { increment: delta } }), version: { increment: 1 } } });
    await tx.auditLog.create({ data: { id: genId(), tenantId, penggunaId: actor.penggunaId,
      keanggotaanTenantId: actorKeanggotaanTenantId, aksi: "ADJUST", entitas: "LoyaltyLedgerEntry",
      entitasId: ledgerId, sebelum: { poinAktif: prev }, sesudah: { poinAktif: newBalance } } });
  });
  return { ledgerId, newBalance };
}