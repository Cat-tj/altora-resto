/**
 * Pembayaran (Payments) service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * Payment invariant (ADR-019 Keputusan 4):
 *   1. SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah
 *   2. SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah
 * Both must hold true within a single DB transaction.
 */

import type { PrismaClient } from "@prisma/client";
import type {
  PembayaranLengkap,
  RingkasanPembayaran,
} from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class PembayaranError extends Error {
  constructor(
    message: string,
    public code: PembayaranErrorCode,
  ) {
    super(message);
    this.name = "PembayaranError";
  }
}

export type PembayaranErrorCode =
  | "PEMBAYARAN_NOT_FOUND"
  | "PESANAN_NOT_FOUND"
  | "METODE_BAYAR_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "PAYMENT_INVARIANT_FAILED"
  | "ALREADY_FULLY_PAID"
  | "AMOUNT_MISMATCH"
  | "QRIS_NOT_CONFIRMED"
  | "QRIS_ALREADY_CONFIRMED"
  | "VERSION_CONFLICT"
  | "OUTLET_NOT_IN_TENANT";

// ─── Create Payment ─────────────────────────────────────────────────────────

/**
 * Create a payment with split method lines and allocate to orders.
 * Enforces payment invariants within a single DB transaction.
 */
export async function createPayment(
  db: PrismaClient,
  tenantId: string,
  input: {
    outletId: string;
    alokasi: Array<{ pesananId: string; jumlah: number }>;
    metodeBayar: Array<{ metodeBayarId: string; jumlah: number }>;
    totalDiterima: number;
    dikonfirmasiOlehId: string;
  },
) {
  // Validate: total metode bayar must equal total alokasi
  const totalMetodeBayar = input.metodeBayar.reduce((s, m) => s + m.jumlah, 0);
  const totalAlokasi = input.alokasi.reduce((s, a) => s + a.jumlah, 0);

  if (totalMetodeBayar !== totalAlokasi) {
    throw new PembayaranError(
      `Total metode bayar (${totalMetodeBayar}) tidak sama dengan total alokasi (${totalAlokasi})`,
      "PAYMENT_INVARIANT_FAILED",
    );
  }

  const jumlah = totalAlokasi;

  // Determine status based on method type
  const isQris = input.metodeBayar.some(
    (m) => m.metodeBayarId.includes("QRIS"),
  );
  const status = isQris ? "MENUNGGU_KONFIRMASI" : "DIBAYAR";

  // Calculate kembalian for cash
  const totalTunai = input.metodeBayar.reduce((s, m) => {
    // This is simplified — in production you'd look up the method code
    return s + m.jumlah;
  }, 0);
  const kembalian = input.totalDiterima > jumlah
    ? BigInt(input.totalDiterima) - BigInt(jumlah)
    : 0n;

  return db.pembayaran.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: input.outletId,
      jumlah: BigInt(jumlah),
      totalDiterima: BigInt(input.totalDiterima),
      kembalian,
      status: status as "DRAF" | "MENUNGGU" | "MENUNGGU_KONFIRMASI" | "DIBAYAR" | "GAGAL" | "DIBATALKAN" | "DIKOREKSI" | "DIKEMBALIKAN_SEBAGIAN" | "DIKEMBALIKAN",
      dikonfirmasiOlehId: input.dikonfirmasiOlehId,
      dikonfirmasiPada: new Date(),
      metodeBaris: {
        create: input.metodeBayar.map((m) => ({
          id: generateId(),
          tenantId,
          metodeBayarId: m.metodeBayarId,
          jumlah: BigInt(m.jumlah),
        })),
      },
      alokasi: {
        create: input.alokasi.map((a) => ({
          id: generateId(),
          tenantId,
          pesananId: a.pesananId,
          jumlah: BigInt(a.jumlah),
        })),
      },
    },
    include: {
      metodeBaris: {
        include: {
          metodeBayar: { select: { id: true, kode: true, nama: true } },
        },
      },
      alokasi: true,
      qrisKonfirmasi: true,
    },
  });
}

// ─── Confirm QRIS ───────────────────────────────────────────────────────────

/**
 * Confirm a QRIS payment manually by cashier.
 * Transitions status from MENUNGGU_KONFIRMASI to DIBAYAR.
 */
export async function confirmQris(
  db: PrismaClient,
  tenantId: string,
  input: {
    pembayaranId: string;
    catatanKasir?: string | undefined;
    diverifikasiOlehId: string;
  },
) {
  const pembayaran = await db.pembayaran.findUnique({
    where: { id: input.pembayaranId },
  });

  if (!pembayaran) {
    throw new PembayaranError(
      "Pembayaran tidak ditemukan",
      "PEMBAYARAN_NOT_FOUND",
    );
  }

  if (pembayaran.status !== "MENUNGGU_KONFIRMASI") {
    throw new PembayaranError(
      `Pembayaran dalam status ${pembayaran.status}, bukan MENUNGGU_KONFIRMASI`,
      "INVALID_TRANSITION",
    );
  }

  // Check if already confirmed
  const existingConfirm = await db.qrisKonfirmasiManual.findUnique({
    where: { pembayaranId: input.pembayaranId },
  });

  if (existingConfirm) {
    throw new PembayaranError(
      "Pembayaran QRIS sudah dikonfirmasi sebelumnya",
      "QRIS_ALREADY_CONFIRMED",
    );
  }

  // Create confirmation and update payment status in one transaction
  return db.$transaction(async (tx) => {
    const confirm = await tx.qrisKonfirmasiManual.create({
      data: {
        id: generateId(),
        tenantId,
        pembayaranId: input.pembayaranId,
        ...(input.catatanKasir != null && { catatanKasir: input.catatanKasir }),
        diverifikasiOlehId: input.diverifikasiOlehId,
      },
    });

    await tx.pembayaran.update({
      where: { id: input.pembayaranId },
      data: {
        status: "DIBAYAR",
        dikonfirmasiPada: new Date(),
      },
    });

    return confirm;
  });
}

// ─── Get Payment Summary ────────────────────────────────────────────────────

/**
 * Get payment summary for an order (total paid, remaining, history).
 */
export async function getPaymentSummary(
  db: PrismaClient,
  pesananId: string,
): Promise<RingkasanPembayaran | null> {
  const pesanan = await db.pesanan.findUnique({
    where: { id: pesananId },
    select: { id: true, totalAkhir: true },
  });

  if (!pesanan) return null;

  const alokasiList = await db.alokasiPembayaran.findMany({
    where: { pesananId },
    include: {
      pembayaran: {
        select: {
          id: true,
          jumlah: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  // Only count allocations from non-terminal-negative payments
  const totalDibayar = alokasiList
    .filter((a) =>
      !["GAGAL", "DIBATALKAN", "DIKEMBALIKAN"].includes(a.pembayaran.status),
    )
    .reduce((sum, a) => sum + a.jumlah, 0n);

  const totalTagihan = pesanan.totalAkhir;
  const sisaTagihan = totalTagihan - totalDibayar;

  return {
    pesananId,
    totalTagihan,
    totalDibayar,
    sisaTagihan,
    isFullyPaid: sisaTagihan <= 0n,
    riwayatPembayaran: alokasiList.map((a) => ({
      id: a.pembayaran.id,
      jumlah: a.jumlah,
      metode: a.pembayaran.status,
      createdAt: a.pembayaran.createdAt,
    })),
  };
}

// ─── List Payments ──────────────────────────────────────────────────────────

/**
 * List payments with optional filters.
 */
export async function listPembayaran(
  db: PrismaClient,
  options: {
    outletId?: string;
    status?: string;
    dariTanggal?: Date;
    sampaiTanggal?: Date;
    limit?: number;
  } = {},
) {
  const where: Record<string, unknown> = {};

  if (options.outletId) where.outletId = options.outletId;
  if (options.status) where.status = options.status;
  if (options.dariTanggal || options.sampaiTanggal) {
    where.createdAt = {
      ...(options.dariTanggal && { gte: options.dariTanggal }),
      ...(options.sampaiTanggal && { lte: options.sampaiTanggal }),
    };
  }

  return db.pembayaran.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
    include: {
      metodeBaris: {
        include: {
          metodeBayar: { select: { id: true, kode: true, nama: true } },
        },
      },
      alokasi: true,
    },
  });
}

// ─── Get Payment ────────────────────────────────────────────────────────────

/**
 * Get a single payment with all relations.
 */
export async function getPembayaran(
  db: PrismaClient,
  id: string,
): Promise<PembayaranLengkap | null> {
  return db.pembayaran.findUnique({
    where: { id },
    include: {
      metodeBaris: {
        include: {
          metodeBayar: { select: { id: true, kode: true, nama: true } },
        },
      },
      alokasi: true,
      qrisKonfirmasi: true,
    },
  }) as Promise<PembayaranLengkap | null>;
}

// ─── List MetodeBayar ───────────────────────────────────────────────────────

/**
 * List payment methods for the tenant.
 */
export async function listMetodeBayar(
  db: PrismaClient,
  options: { includeNonActive?: boolean } = {},
) {
  return db.metodeBayar.findMany({
    where: options.includeNonActive ? {} : { status: "AKTIF" },
    orderBy: { kode: "asc" },
  });
}
