/**
 * @altora/db — Tenant-aware Prisma client wrapper.
 *
 * This module provides:
 * 1. A singleton Prisma client instance
 * 2. A TenantContext that carries tenantId + outletId through the request
 * 3. A tenant-scoped Prisma proxy that auto-injects tenantId into queries
 *
 * Usage:
 * ```ts
 * import { createTenantDb } from "@altora/db";
 *
 * // In your request handler / tRPC context:
 * const db = createTenantDb(prisma, { tenantId: "...", outletId: "..." });
 *
 * // All queries automatically scope to the tenant:
 * const items = await db.itemMenu.findMany(); // WHERE tenantId = ?
 * const item = await db.itemMenu.findFirst({ where: { id: "..." } });
 * // ↑ Automatically adds AND tenantId = "..."
 * ```
 */

import { PrismaClient } from "@prisma/client";
import type {
  Prisma,
  Pengguna,
  KeanggotaanTenant,
  KeanggotaanOutlet,
  Outlet,
  Tenant,
} from "@prisma/client";

// ─── Singleton Prisma Client ────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client. In development, we cache on globalThis to survive
 * hot-module reloads without leaking connections.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─── Tenant Context ─────────────────────────────────────────────────────────

/**
 * The tenant context that flows through every request.
 * - `tenantId` is always required for tenant-scoped queries
 * - `outletId` is optional (some operations are tenant-wide, e.g. admin settings)
 * - `keanggotaanTenantId` is the user's membership record for this tenant
 * - `keanggotaanOutletId` is the user's outlet membership (if applicable)
 */
export interface TenantContext {
  tenantId: string;
  outletId?: string;
  keanggotaanTenantId?: string;
  keanggotaanOutletId?: string;
  penggunaId?: string;
}

// ─── Models that are tenant-scoped ──────────────────────────────────────────

/**
 * List of Prisma model names that have a `tenantId` field and should be
 * auto-scoped by the tenant proxy. This is the source of truth for which
 * models get automatic tenant filtering.
 *
 * NOTE: Keep this list in sync with the schema. Models NOT in this list
 * (e.g., Pengguna which is global) will NOT be filtered by tenantId.
 */
const TENANT_SCOPED_MODELS = new Set([
  // Platform
  "outlet",
  "keanggotaanTenant",
  "peran",
  "auditLog",
  "pengaturanTenant",
  "pengaturanOutlet",
  "perangkat",
  "riwayatPerangkat",

  // Menu
  "kategoriMenu",
  "itemMenu",
  "varianMenu",
  "modifierGrup",
  "modifierOpsi",
  "itemModifierGrup",
  "hargaItemOutlet",
  "jadwalKetersediaanMenu",
  "itemMenuOutlet",
  "fotoItemMenu",
  "itemMenuAlergen",

  // Resep & Produksi
  "resep",
  "versiResep",
  "komponenResep",
  "komponenResepModifier",
  "konversiSatuan",
  "prosesProduksi",
  "prosesProduksiBaris",
  "batchProduksi",

  // Persediaan
  "bahan",
  "satuan",
  "gudang",
  "lokasiStok",
  "stokBahan",
  "mutasiStok",
  "batchStok",
  "reservasiStok",
  "penyesuaianStok",
  "transferStok",
  "transferStokBaris",
  "alasanWaste",
  "catatanWaste",
  "kebijakanPemesananUlang",
  "stokOpname",
  "stokOpnameBaris",

  // Pembelian
  "supplier",
  "barangSupplier",
  "riwayatHargaSupplier",
  "purchaseOrder",
  "purchaseOrderBaris",
  "penerimaanBarang",
  "penerimaanBarangBaris",
  "returPembelian",
  "returPembelianBaris",
  "hutangSupplier",
  "pembayaranSupplier",
  "lampiranPembelian",

  // Meja & Reservasi
  "lantai",
  "areaMeja",
  "meja",
  "grupMeja",
  "tokenQrMeja",
  "sesiKunjunganMeja",
  "reservasi",
  "waitingListEntry",

  // Pesanan
  "pesanan",
  "itemPesanan",
  "itemPesananModifier",
  "pesananRiwayatStatus",
  "pesananPerubahan",
  "pesananPenolakan",
  "pesananPembatalan",

  // Dapur
  "tiketDapur",
  "tiketDapurBaris",
  "aturanRoutingDapur",
  "riwayatStatusTiketDapur",
  "gelombangDapur",

  // Pembayaran
  "pembayaran",
  "pembayaranMetodeBaris",
  "alokasiPembayaran",
  "qrisKonfirmasiManual",
  "refundPembayaran",

  // QRIS
  "konfigurasiQris",

  // Promo
  "promo",
  "promoKondisi",
  "promoReward",
  "promoPemakaian",

  // Keanggotaan (Pelanggan)
  "pelanggan",
  "poinRiwayat",
  "stempelKartu",
  "ledgerStempel",
  "saldoToko",
  "ledgerSaldoToko",

  // HR & Absensi
  "jadwalKerja",
  "shiftKerja",
  "giliranKasir",
  "absensi",
  "permohonanCuti",

  // Notifikasi
  "notification",

  // Pengaturan
  "pengaturanOutbox",

  // Antrian Cetak
  "antrianCetak",
]);

// ─── Tenant-Scoped Prisma Proxy ─────────────────────────────────────────────

type PrismaModelName = keyof Prisma.TypeMap["model"];

/**
 * Creates a tenant-scoped Prisma client proxy.
 *
 * For models in `TENANT_SCOPED_MODELS`, automatically injects `tenantId`
 * into findMany/findFirst/findFirstOrThrow/findUnique/findUniqueOrThrow
 * queries. For mutations (create/update/delete), the caller must provide
 * `tenantId` explicitly (we don't inject it silently to avoid confusion).
 *
 * For models NOT in the tenant-scoped list (like `Pengguna`), queries
 * pass through unmodified.
 */
export function createTenantDb(
  client: PrismaClient,
  ctx: TenantContext,
): TenantScopedDb {
  return new Proxy(client, {
    get(target, modelName: string) {
      // Only proxy model access (e.g., db.itemMenu, db.pesanan, etc.)
      if (typeof modelName !== "string" || !(modelName in target)) {
        return Reflect.get(target, modelName);
      }

      // Access the model delegate (e.g., target.itemMenu)
      const modelDelegate = Reflect.get(target, modelName);

      // Only proxy if it's a function (model delegates are accessed as properties
      // but their methods are functions)
      if (typeof modelDelegate !== "object" || modelDelegate === null) {
        return modelDelegate;
      }

      return new Proxy(modelDelegate, {
        get(delegate, methodName: string) {
          const method = Reflect.get(delegate, methodName);

          if (typeof method !== "function") {
            return method;
          }

          // Only auto-inject tenantId for read queries
          const READ_METHODS = new Set([
            "findMany",
            "findFirst",
            "findFirstOrThrow",
            "findUnique",
            "findUniqueOrThrow",
            "count",
            "aggregate",
          ]);

          if (
            TENANT_SCOPED_MODELS.has(modelName) &&
            READ_METHODS.has(methodName)
          ) {
            return function (args?: Record<string, unknown>) {
              const originalWhere = (args?.where as Record<string, unknown>) ?? {};
              const scopedWhere = {
                ...originalWhere,
                tenantId: ctx.tenantId,
              };

              return method.call(delegate, { ...args, where: scopedWhere });
            };
          }

          return method;
        },
      });
    },
  }) as TenantScopedDb;
}

/**
 * Type for the tenant-scoped database. It's the same as PrismaClient
 * but with auto-scoped read queries.
 */
export type TenantScopedDb = PrismaClient;

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { PrismaClient } from "@prisma/client";
export type {
  Prisma,
  Pengguna,
  KeanggotaanTenant,
  KeanggotaanOutlet,
  Outlet,
  Tenant,
} from "@prisma/client";
