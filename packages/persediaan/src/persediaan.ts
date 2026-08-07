/**
 * Persediaan (Inventory) service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID().
 */

import type { PrismaClient } from "@prisma/client";
import type {
  LowStockAlert,
  GudangDenganRingkasan,
  PurchaseOrderLengkap,
  StokOpnameLengkap,
} from "./types"

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class PersediaanError extends Error {
  constructor(
    message: string,
    public code: PersediaanErrorCode,
  ) {
    super(message);
    this.name = "PersediaanError";
  }
}

export type PersediaanErrorCode =
  | "GUDANG_NOT_FOUND"
  | "STOK_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "BAHAN_NOT_FOUND"
  | "SUPPLIER_NOT_FOUND"
  | "PO_NOT_FOUND"
  | "PO_INVALID_STATUS"
  | "PO_NO_ITEMS"
  | "PENERIMAAN_NOT_FOUND"
  | "OPNAME_NOT_FOUND"
  | "OPNAME_INVALID_STATUS"
  | "OUTLET_NOT_IN_TENANT"
  | "VERSION_CONFLICT";

// ─── Gudang (Warehouse) ─────────────────────────────────────────────────────

/**
 * List all warehouses for the tenant, optionally filtered by outlet.
 */
export async function listGudang(
  db: PrismaClient,
  options: { outletId?: string | undefined; includeStok?: boolean | undefined } = {},
): Promise<GudangDenganRingkasan[]> {
  const where: Record<string, unknown> = { status: "AKTIF" };

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  return db.gudang.findMany({
    where,
    orderBy: { nama: "asc" },
    ...(options.includeStok
      ? {
          include: {
            stokBahan: {
              orderBy: { bahanId: "asc" },
            },
          },
        }
      : {}),
  }) as Promise<GudangDenganRingkasan[]>;
}

// ─── Stock Operations ───────────────────────────────────────────────────────

/**
 * Check current stock level for a bahan at a gudang.
 */
export async function checkStock(
  db: PrismaClient,
  input: { bahanId: string; gudangId: string; lokasiStokId?: string | undefined },
): Promise<{ kuantitas: number; kuantitasDireservasi: number; tersedia: number } | null> {
  const where: Record<string, unknown> = {
    bahanId: input.bahanId,
    gudangId: input.gudangId,
  };

  if (input.lokasiStokId) {
    where.lokasiStokId = input.lokasiStokId;
  }

  const stok = await db.stokBahan.findFirst({ where });

  if (!stok) return null;

  return {
    kuantitas: Number(stok.kuantitas),
    kuantitasDireservasi: Number(stok.kuantitasDireservasi),
    tersedia: Number(stok.kuantitas) - Number(stok.kuantitasDireservasi),
  };
}

/**
 * Deduct stock with mutation logging. Creates a MutasiStok entry
 * and updates the StokBahan cache.
 *
 * Validates sufficient stock before proceeding.
 */
export async function deductStock(
  db: PrismaClient,
  tenantId: string,
  input: {
    outletId: string;
    gudangId: string;
    bahanId: string;
    jumlah: number;
    alasan: string;
    catatan?: string | undefined;
    referensiJenis: string;
    referensiId: string;
    dibuatOlehId: string;
    lokasiSumberId?: string | undefined;
    lokasiTujuanId?: string | undefined;
    satuanId?: string | undefined;
    batchStokId?: string | undefined;
    hargaPerolehan?: bigint | undefined;
  },
) {
  // Find existing stock row (aggregate level gudang)
  const stok = await db.stokBahan.findFirst({
    where: {
      tenantId,
      gudangId: input.gudangId,
      bahanId: input.bahanId,
    },
  });

  const tersedia = stok
    ? Number(stok.kuantitas) - Number(stok.kuantitasDireservasi)
    : 0;

  if (tersedia < input.jumlah) {
    throw new PersediaanError(
      `Stok tidak mencukupi. Tersedia: ${tersedia}, dibutuhkan: ${input.jumlah}`,
      "INSUFFICIENT_STOCK",
    );
  }

  // Create mutation entry (negative jumlah for outgoing)
  const mutasi = await db.mutasiStok.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: input.outletId,
      gudangId: input.gudangId,
      bahanId: input.bahanId,
      jenis: "PEMAKAIAN_RESEP",
      jumlah: -Math.abs(input.jumlah),
      referensiJenis: input.referensiJenis as "PEMBELIAN" | "PESANAN" | "OPNAME" | "TRANSFER" | "PRODUKSI" | "WASTE" | "PENYESUAIAN" | "RETUR_PEMBELIAN" | "PEMAKAIAN_INTERNAL",
      referensiId: input.referensiId,
      alasan: input.alasan,
      ...(input.catatan != null && { catatan: input.catatan }),
      ...(input.satuanId != null && { satuanId: input.satuanId }),
      ...(input.batchStokId != null && { batchStokId: input.batchStokId }),
      ...(input.hargaPerolehan != null && { hargaPerolehan: input.hargaPerolehan }),
      ...(input.lokasiSumberId != null && { lokasiSumberId: input.lokasiSumberId }),
      ...(input.lokasiTujuanId != null && { lokasiTujuanId: input.lokasiTujuanId }),
      dibuatOlehId: input.dibuatOlehId,
    },
  });

  // Update stock cache
  if (stok) {
    await db.stokBahan.update({
      where: { id: stok.id },
      data: {
        kuantitas: Number(stok.kuantitas) - input.jumlah,
        version: stok.version + 1,
      },
    });
  }

  return mutasi;
}

// ─── Stok Opname ────────────────────────────────────────────────────────────

/**
 * Create a new stock opname in DRAF status.
 */
export async function createStokOpname(
  db: PrismaClient,
  tenantId: string,
  input: {
    gudangId: string;
    dijadwalkanPada: Date;
    alasan?: string | undefined;
    dibuatOlehId: string;
  },
) {
  return db.stokOpname.create({
    data: {
      id: generateId(),
      tenantId,
      gudangId: input.gudangId,
      status: "DRAF",
      dijadwalkanPada: input.dijadwalkanPada,
      ...(input.alasan != null && { alasan: input.alasan }),
      dibuatOlehId: input.dibuatOlehId,
    },
  });
}

/**
 * Get a stock opname with its line items.
 */
export async function getStokOpname(
  db: PrismaClient,
  id: string,
): Promise<StokOpnameLengkap | null> {
  return db.stokOpname.findUnique({
    where: { id },
    include: { baris: true },
  }) as Promise<StokOpnameLengkap | null>;
}

/**
 * List stock opname records with optional filters.
 */
export async function listStokOpname(
  db: PrismaClient,
  options: { gudangId?: string | undefined; status?: string | undefined } = {},
) {
  const where: Record<string, unknown> = {};

  if (options.gudangId) where.gudangId = options.gudangId;
  if (options.status) where.status = options.status;

  return db.stokOpname.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { baris: true },
  });
}

// ─── Purchase Order ─────────────────────────────────────────────────────────

/**
 * Create a new purchase order with line items.
 */
export async function createPurchaseOrder(
  db: PrismaClient,
  tenantId: string,
  input: {
    outletId: string;
    supplierId: string;
    nomorPo: string;
    dibuatOlehId: string;
    items: Array<{
      bahanId: string;
      jumlahDipesan: number;
      hargaSatuan: bigint;
    }>;
  },
) {
  if (input.items.length === 0) {
    throw new PersediaanError("Minimal satu item harus dipesan", "PO_NO_ITEMS");
  }

  const totalEstimasi = input.items.reduce(
    (sum, item) => sum + item.hargaSatuan * BigInt(Math.round(item.jumlahDipesan)),
    0n,
  );

  return db.purchaseOrder.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: input.outletId,
      supplierId: input.supplierId,
      nomorPo: input.nomorPo,
      status: "DRAFT",
      totalEstimasi,
      dibuatOlehId: input.dibuatOlehId,
      baris: {
        create: input.items.map((item) => ({
          id: generateId(),
          bahanId: item.bahanId,
          jumlahDipesan: item.jumlahDipesan,
          hargaSatuan: item.hargaSatuan,
        })),
      },
    },
    include: {
      baris: true,
      supplier: { select: { id: true, nama: true } },
    },
  });
}

/**
 * Get a purchase order with its line items.
 */
export async function getPurchaseOrder(
  db: PrismaClient,
  id: string,
): Promise<PurchaseOrderLengkap | null> {
  return db.purchaseOrder.findUnique({
    where: { id },
    include: {
      baris: true,
      supplier: { select: { id: true, nama: true } },
    },
  }) as Promise<PurchaseOrderLengkap | null>;
}

/**
 * List purchase orders with optional filters.
 */
export async function listPurchaseOrder(
  db: PrismaClient,
  options: {
    outletId?: string | undefined;
    status?: string | undefined;
    supplierId?: string | undefined;
  } = {},
) {
  const where: Record<string, unknown> = {};

  if (options.outletId) where.outletId = options.outletId;
  if (options.status) where.status = options.status;
  if (options.supplierId) where.supplierId = options.supplierId;

  return db.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      baris: true,
      supplier: { select: { id: true, nama: true } },
    },
  });
}

/**
 * Receive goods against a PO and update stock.
 */
export async function receiveGoods(
  db: PrismaClient,
  tenantId: string,
  input: {
    purchaseOrderId: string;
    gudangId: string;
    nomorPenerimaan: string;
    diterimaOlehId: string;
    items: Array<{
      bahanId: string;
      jumlahDiterima: number;
      hargaSatuanAktual: bigint;
    }>;
  },
) {
  const po = await db.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
  });

  if (!po) {
    throw new PersediaanError("Purchase order tidak ditemukan", "PO_NOT_FOUND");
  }

  if (!["DISETUJUI", "DIKIRIM_SUPPLIER", "DITERIMA_SEBAGIAN"].includes(po.status)) {
    throw new PersediaanError(
      `Purchase order dalam status ${po.status}, tidak bisa diterima`,
      "PO_INVALID_STATUS",
    );
  }

  // Create the goods receipt
  const penerimaan = await db.penerimaanBarang.create({
    data: {
      id: generateId(),
      tenantId,
      purchaseOrderId: input.purchaseOrderId,
      gudangId: input.gudangId,
      nomorPenerimaan: input.nomorPenerimaan,
      diterimaOlehId: input.diterimaOlehId,
      baris: {
        create: input.items.map((item) => ({
          id: generateId(),
          bahanId: item.bahanId,
          jumlahDiterima: item.jumlahDiterima,
          hargaSatuanAktual: item.hargaSatuanAktual,
        })),
      },
    },
    include: { baris: true },
  });

  // Update PO status
  await db.purchaseOrder.update({
    where: { id: input.purchaseOrderId },
    data: { status: "DITERIMA_PENUH" },
  });

  // For each received item, create a stock mutation (incoming)
  for (const item of input.items) {
    await db.mutasiStok.create({
      data: {
        id: generateId(),
        tenantId,
        outletId: po.outletId,
        gudangId: input.gudangId,
        bahanId: item.bahanId,
        jenis: "PEMBELIAN_MASUK",
        jumlah: item.jumlahDiterima,
        referensiJenis: "PEMBELIAN",
        referensiId: penerimaan.id,
        alasan: `Penerimaan barang ${input.nomorPenerimaan}`,
        hargaPerolehan: item.hargaSatuanAktual,
        dibuatOlehId: input.diterimaOlehId,
      },
    });

    // Upsert stock cache
    const existing = await db.stokBahan.findFirst({
      where: {
        tenantId,
        gudangId: input.gudangId,
        bahanId: item.bahanId,
        lokasiStokId: null,
      },
    });

    if (existing) {
      await db.stokBahan.update({
        where: { id: existing.id },
        data: {
          kuantitas: Number(existing.kuantitas) + item.jumlahDiterima,
          version: existing.version + 1,
        },
      });
    } else {
      await db.stokBahan.create({
        data: {
          id: generateId(),
          tenantId,
          gudangId: input.gudangId,
          bahanId: item.bahanId,
          kuantitas: item.jumlahDiterima,
          kuantitasDireservasi: 0,
        },
      });
    }
  }

  return penerimaan;
}

// ─── Low Stock Alerts ───────────────────────────────────────────────────────

/**
 * Get low stock alerts for items below the threshold.
 */
export async function getLowStockAlerts(
  db: PrismaClient,
  tenantId: string,
  options: { gudangId?: string | undefined; ambangBatas?: number | undefined } = {},
): Promise<LowStockAlert[]> {
  const ambangBatas = options.ambangBatas ?? 10;

  const where: Record<string, unknown> = {
    tenantId,
    kuantitas: { lte: ambangBatas },
  };

  if (options.gudangId) {
    where.gudangId = options.gudangId;
  }

  const stokList = await db.stokBahan.findMany({
    where,
    include: {
      bahan: { select: { id: true, nama: true } },
      gudang: { select: { id: true, nama: true } },
    },
  });

  return stokList.map((stok) => ({
    bahanId: stok.bahan.id,
    bahanNama: stok.bahan.nama,
    gudangId: stok.gudang.id,
    gudangNama: stok.gudang.nama,
    kuantitasSekarang: Number(stok.kuantitas),
    kuantitasMinimum: ambangBatas,
  }));
}
