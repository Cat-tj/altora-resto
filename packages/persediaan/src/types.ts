/**
 * Persediaan (Inventory) domain types for Altora Resto.
 *
 * These types represent the inventory aggregate:
 * - Gudang: Warehouse per outlet
 * - LokasiStok: Sub-locations within a warehouse
 * - StokBahan: Stock balance cache (denormalized from MutasiStok ledger)
 * - MutasiStok: Append-only stock mutation ledger
 * - StokOpname: Physical stock count
 * - PurchaseOrder: Supplier purchase orders
 * - PenerimaanBarang: Goods receipt against PO
 * - Supplier: Supplier master data
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusAktifNonaktif = "AKTIF" | "NONAKTIF";

export type JenisMutasiStok =
  | "PEMBELIAN_MASUK"
  | "RETUR_PENJUALAN"
  | "TRANSFER_MASUK"
  | "PRODUKSI_MASUK"
  | "PEMAKAIAN_RESEP"
  | "RETUR_SUPPLIER"
  | "TRANSFER_KELUAR"
  | "PRODUKSI_KELUAR"
  | "WASTE"
  | "PEMAKAIAN_INTERNAL"
  | "PENYESUAIAN"
  | "KOREKSI_OPNAME";

export type ReferensiJenisMutasi =
  | "PEMBELIAN"
  | "PESANAN"
  | "OPNAME"
  | "TRANSFER"
  | "PRODUKSI"
  | "WASTE"
  | "PENYESUAIAN"
  | "RETUR_PEMBELIAN"
  | "PEMAKAIAN_INTERNAL";

export type StatusStokOpname =
  | "DRAF"
  | "SEDANG_DIHITUNG"
  | "DIKUNCI"
  | "MENUNGGU_PERSETUJUAN"
  | "DISETUJUI"
  | "DIPOSTING"
  | "DIBATALKAN";

export type StatusPurchaseOrder =
  | "DRAFT"
  | "DIAJUKAN"
  | "DISETUJUI"
  | "DIKIRIM_SUPPLIER"
  | "DITERIMA_SEBAGIAN"
  | "DITERIMA_PENUH"
  | "DIBATALKAN";

export type StatusBatchStok = "TERSEDIA" | "HABIS";

// ─── Gudang ─────────────────────────────────────────────────────────────────

export interface Gudang {
  id: string;
  tenantId: string;
  outletId: string;
  nama: string;
  status: StatusAktifNonaktif;
}

// ─── LokasiStok ─────────────────────────────────────────────────────────────

export type JenisLokasiStok = "RAK" | "CHILLER" | "FREEZER";

export interface LokasiStok {
  id: string;
  tenantId: string;
  outletId: string;
  gudangId: string;
  nama: string;
  jenis: JenisLokasiStok | null;
  status: StatusAktifNonaktif;
}

// ─── StokBahan ──────────────────────────────────────────────────────────────

export interface StokBahan {
  id: string;
  tenantId: string;
  gudangId: string;
  bahanId: string;
  lokasiStokId: string | null;
  kuantitas: number;
  kuantitasDireservasi: number;
  direkonsiliasiPada: Date | null;
  updatedAt: Date;
  version: number;
}

// ─── MutasiStok ─────────────────────────────────────────────────────────────

export interface MutasiStok {
  id: string;
  tenantId: string;
  outletId: string;
  gudangId: string;
  bahanId: string;
  jenis: JenisMutasiStok;
  jumlah: number;
  satuanId: string | null;
  referensiJenis: ReferensiJenisMutasi;
  referensiId: string;
  lokasiSumberId: string | null;
  lokasiTujuanId: string | null;
  batchStokId: string | null;
  hargaPerolehan: bigint | null;
  alasan: string;
  catatan: string | null;
  membalikMutasiId: string | null;
  dibuatOlehId: string;
  createdAt: Date;
}

// ─── BatchStok ──────────────────────────────────────────────────────────────

export interface BatchStok {
  id: string;
  tenantId: string;
  outletId: string;
  bahanId: string;
  nomorBatch: string;
  tanggalProduksi: Date | null;
  tanggalKedaluwarsa: Date | null;
  kuantitasAwal: number;
  hargaPerolehan: bigint;
  lokasiStokId: string | null;
  batchProduksiId: string | null;
  status: StatusBatchStok;
  createdAt: Date;
}

// ─── Supplier ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  tenantId: string;
  nama: string;
  kontak: string | null;
  status: StatusAktifNonaktif;
}

// ─── PurchaseOrder ──────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  outletId: string;
  supplierId: string;
  nomorPo: string;
  status: StatusPurchaseOrder;
  totalEstimasi: bigint;
  dibuatOlehId: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PurchaseOrderBaris {
  id: string;
  purchaseOrderId: string;
  bahanId: string;
  jumlahDipesan: number;
  hargaSatuan: bigint;
}

// ─── PenerimaanBarang ───────────────────────────────────────────────────────

export interface PenerimaanBarang {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  gudangId: string;
  nomorPenerimaan: string;
  diterimaPada: Date;
  diterimaOlehId: string;
}

export interface PenerimaanBarangBaris {
  id: string;
  penerimaanBarangId: string;
  bahanId: string;
  jumlahDiterima: number;
  hargaSatuanAktual: bigint;
}

// ─── StokOpname ─────────────────────────────────────────────────────────────

export interface StokOpname {
  id: string;
  tenantId: string;
  gudangId: string;
  status: StatusStokOpname;
  dijadwalkanPada: Date;
  snapshotPada: Date | null;
  dikunciPada: Date | null;
  disetujuiPada: Date | null;
  dipostingPada: Date | null;
  dibatalkanPada: Date | null;
  alasan: string | null;
  dibuatOlehId: string;
  penghitungId: string | null;
  pengunciId: string | null;
  penyetujuId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StokOpnameBaris {
  id: string;
  stokOpnameId: string;
  bahanId: string;
  lokasiStokId: string | null;
  batchStokId: string | null;
  kuantitasSistem: number;
  kuantitasFisik: number | null;
  selisih: number | null;
  alasan: string | null;
  mutasiKoreksiId: string | null;
  dihitungPada: Date | null;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** Warehouse with stock summary. */
export interface GudangDenganRingkasan extends Gudang {
  stokBahan: StokBahan[];
}

/** PO with its line items. */
export interface PurchaseOrderLengkap extends PurchaseOrder {
  supplier: Pick<Supplier, "id" | "nama">;
  baris: PurchaseOrderBaris[];
}

/** Goods receipt with line items. */
export interface PenerimaanBarangLengkap extends PenerimaanBarang {
  purchaseOrder: Pick<PurchaseOrder, "id" | "nomorPo">;
  baris: PenerimaanBarangBaris[];
}

/** Stock opname with line items. */
export interface StokOpnameLengkap extends StokOpname {
  baris: StokOpnameBaris[];
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CheckStockInput {
  bahanId: string;
  gudangId: string;
  lokasiStokId?: string | undefined;
}

export interface DeductStockInput {
  tenantId: string;
  outletId: string;
  gudangId: string;
  bahanId: string;
  jumlah: number;
  alasan: string;
  catatan?: string | undefined;
  referensiJenis: ReferensiJenisMutasi;
  referensiId: string;
  dibuatOlehId: string;
  lokasiSumberId?: string | undefined;
  lokasiTujuanId?: string | undefined;
  satuanId?: string | undefined;
  batchStokId?: string | undefined;
  hargaPerolehan?: bigint | undefined;
}

export interface CreateStokOpnameInput {
  gudangId: string;
  dijadwalkanPada: Date;
  alasan?: string | undefined;
  dibuatOlehId: string;
}

export interface HitungStokOpnameInput {
  stokOpnameId: string;
  items: Array<{
    bahanId: string;
    lokasiStokId?: string | undefined;
    kuantitasFisik: number;
    alasan?: string | undefined;
  }>;
  penghitungId: string;
}

export interface CreatePurchaseOrderInput {
  outletId: string;
  supplierId: string;
  nomorPo: string;
  dibuatOlehId: string;
  items: Array<{
    bahanId: string;
    jumlahDipesan: number;
    hargaSatuan: bigint;
  }>;
}

export interface ReceiveGoodsInput {
  purchaseOrderId: string;
  gudangId: string;
  nomorPenerimaan: string;
  diterimaOlehId: string;
  items: Array<{
    bahanId: string;
    jumlahDiterima: number;
    hargaSatuanAktual: bigint;
  }>;
}

export interface LowStockAlert {
  bahanId: string;
  bahanNama: string;
  gudangId: string;
  gudangNama: string;
  kuantitasSekarang: number;
  kuantitasMinimum: number;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListGudangOptions {
  outletId?: string;
  includeStok?: boolean;
}

export interface ListMutasiStokOptions {
  gudangId?: string;
  bahanId?: string;
  jenis?: JenisMutasiStok;
  dariTanggal?: Date;
  sampaiTanggal?: Date;
  limit?: number;
}

export interface ListPurchaseOrderOptions {
  outletId?: string;
  status?: StatusPurchaseOrder;
  supplierId?: string;
  dariTanggal?: Date;
  sampaiTanggal?: Date;
}

export interface ListStokOpnameOptions {
  gudangId?: string;
  status?: StatusStokOpname;
}
