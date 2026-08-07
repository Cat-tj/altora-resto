/**
 * Order domain types for Altora Resto.
 *
 * These types represent the order aggregate:
 * - Pesanan: The main order entity
 * - ItemPesanan: Individual line items in an order
 * - ItemPesananModifier: Modifiers applied to order items
 * - Pembayaran: Payment events
 * - AlokasiPembayaran: Payment-to-order allocation (supports split bill / partial payment)
 * - PembayaranMetodeBaris: Individual payment method lines (supports mixed payment)
 * - PesananRiwayatStatus: Status history for audit trail
 * - PesananPerubahan: Change log for post-confirmation modifications
 * - PesananPenolakan: Order rejection record
 * - PesananPembatalan: Order cancellation record
 * - Struk: Receipt per payment event
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

/** Ordering channel. */
export type KanalPesanan = "KASIR" | "PELAYAN" | "QR_PELANGGAN";

/**
 * 13-status order lifecycle (14-status ALT-DEF-005 minus DIRETUR,
 * removed by ADR-036 — replaced by PesananRetur model + orthogonal
 * Pesanan.statusRetur cache).
 */
export type StatusPesanan =
  | "DRAF"
  | "DIKIRIM"
  | "MENUNGGU_PERSETUJUAN"
  | "DITERIMA"
  | "DITOLAK"
  | "MENUNGGU_PEMBAYARAN"
  | "DIKONFIRMASI"
  | "DIKIRIM_KE_DAPUR"
  | "SEDANG_DISIAPKAN"
  | "SIAP"
  | "DISAJIKAN"
  | "SELESAI"
  | "DIBATALKAN";

/** Item-level order status (granularity: per item, not per order). */
export type StatusItemPesanan =
  | "DRAF"
  | "DITERIMA"
  | "DIKIRIM_KE_DAPUR"
  | "DITAHAN"
  | "SEDANG_DISIAPKAN"
  | "SIAP"
  | "DISAJIKAN"
  | "DIBATALKAN"
  | "DIRETUR";

/** Types of post-confirmation order changes. */
export type JenisPerubahanPesanan =
  | "TAMBAH_ITEM"
  | "UBAH_KUANTITAS"
  | "HAPUS_ITEM"
  | "PINDAH_MEJA"
  | "SPLIT"
  | "MERGE"
  | "LAINNYA";

/** Payment status (9-status state machine, ADR-020). */
export type StatusPembayaran =
  | "DRAF"
  | "MENUNGGU"
  | "MENUNGGU_KONFIRMASI"
  | "DIBAYAR"
  | "GAGAL"
  | "DIBATALKAN"
  | "DIKOREKSI"
  | "DIKEMBALIKAN_SEBAGIAN"
  | "DIKEMBALIKAN";

/** Payment method codes (4 fixed values, ADR-019). */
export type KodeMetodeBayar =
  | "TUNAI"
  | "TRANSFER_MANUAL"
  | "QRIS_MANUAL"
  | "SALDO_TOKO";

/** Return status. */
export type StatusRetur =
  | "DRAF"
  | "DIAJUKAN"
  | "DISETUJUI"
  | "DITOLAK"
  | "DIPROSES"
  | "SELESAI"
  | "DIBATALKAN";

/** Derived return summary cache on Pesanan (orthogonal to StatusPesanan). */
export type StatusRingkasanRetur =
  | "TANPA_RETUR"
  | "RETUR_SEBAGIAN"
  | "RETUR_PENUH";

/** Cancellation type (ADR-036). */
export type JenisPembatalan =
  | "SEBELUM_PRODUKSI"
  | "SETELAH_PRODUKSI";

/** Cashier shift status. */
export type StatusGiliranKasir =
  | "DIBUKA"
  | "DITUTUP_MENUNGGU_VERIFIKASI"
  | "DITUTUP_SELESAI";

/** Cashier transaction type. */
export type JenisTransaksiKasir =
  | "PENJUALAN"
  | "REFUND"
  | "KOREKSI";

// ─── Pesanan ────────────────────────────────────────────────────────────────

export interface Pesanan {
  id: string;
  tenantId: string;
  outletId: string;
  mejaId: string | null;
  pelangganId: string | null;
  kanal: KanalPesanan;
  nomorPesanan: string;
  status: StatusPesanan;
  subtotal: bigint;
  totalDiskon: bigint;
  totalPajak: bigint;
  totalServiceCharge: bigint;
  totalAkhir: bigint;
  dibuatOlehId: string;
  version: number;
  dibatalkanPada: Date | null;
  statusRetur: StatusRingkasanRetur;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Item Pesanan ───────────────────────────────────────────────────────────

export interface ItemPesanan {
  id: string;
  pesananId: string;
  itemMenuId: string;
  varianMenuId: string | null;
  kuantitas: number;
  hargaSatuan: bigint;
  catatan: string | null;
  status: StatusItemPesanan;
  // Snapshot fields (ALT-DEF-016)
  namaItemSnapshot: string;
  namaVarianSnapshot: string | null;
  hargaDasarSnapshot: bigint;
  hargaVarianSnapshot: bigint;
  hargaModifierSnapshot: bigint;
  diskonSnapshot: bigint;
  pajakSnapshot: bigint;
  serviceChargeSnapshot: bigint;
  totalBarisSnapshot: bigint;
  resepVersiId: string | null;
}

export interface ItemPesananModifier {
  id: string;
  itemPesananId: string;
  modifierOpsiId: string;
  hargaTambahan: bigint;
  // Snapshot fields (ALT-DEF-016)
  namaModifierSnapshot: string;
  hargaSnapshot: bigint;
  jumlah: number;
  totalSnapshot: bigint;
}

// ─── Pembayaran ─────────────────────────────────────────────────────────────

export interface Pembayaran {
  id: string;
  tenantId: string;
  outletId: string;
  jumlah: bigint;
  totalDiterima: bigint;
  kembalian: bigint;
  status: StatusPembayaran;
  dikonfirmasiOlehId: string | null;
  version: number;
  dikonfirmasiPada: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlokasiPembayaran {
  id: string;
  tenantId: string;
  pembayaranId: string;
  pesananId: string;
  jumlah: bigint;
  createdAt: Date;
}

export interface PembayaranMetodeBaris {
  id: string;
  tenantId: string;
  pembayaranId: string;
  metodeBayarId: string;
  jumlah: bigint;
}

// ─── Struk ──────────────────────────────────────────────────────────────────

export interface Struk {
  id: string;
  tenantId: string;
  pembayaranId: string;
  nomorStruk: string;
  dicetakPada: Date | null;
  jumlahCetakUlang: number;
}

// ─── Pesanan Audit Models ───────────────────────────────────────────────────

export interface PesananRiwayatStatus {
  id: string;
  pesananId: string;
  statusSebelumnya: StatusPesanan;
  statusBaru: StatusPesanan;
  diubahOlehId: string;
  createdAt: Date;
}

export interface PesananPerubahan {
  id: string;
  tenantId: string;
  pesananId: string;
  jenisPerubahan: JenisPerubahanPesanan;
  sebelum: unknown | null;
  sesudah: unknown | null;
  diubahOlehId: string;
  createdAt: Date;
}

export interface PesananPenolakan {
  id: string;
  tenantId: string;
  pesananId: string;
  alasan: string;
  ditolakOlehId: string;
  createdAt: Date;
}

export interface PesananPembatalan {
  id: string;
  tenantId: string;
  pesananId: string;
  alasan: string;
  jenisPembatalan: JenisPembatalan;
  dibatalkanOlehId: string;
  disetujuiOlehId: string | null;
  createdAt: Date;
}

// ─── Giliran Kasir ──────────────────────────────────────────────────────────

export interface GiliranKasir {
  id: string;
  tenantId: string;
  outletId: string;
  penggunaId: string;
  modalAwal: bigint;
  modalAkhirDihitung: bigint | null;
  modalAkhirSistem: bigint | null;
  status: StatusGiliranKasir;
  version: number;
  dibukaPada: Date;
  ditutupPada: Date | null;
  updatedAt: Date;
}

export interface TransaksiKasir {
  id: string;
  giliranKasirId: string;
  pesananId: string;
  jenis: JenisTransaksiKasir;
  jumlah: bigint;
  createdAt: Date;
}

// ─── Combined / Response Types ──────────────────────────────────────────────

/** An order with its line items and modifiers. */
export interface PesananLengkap extends Pesanan {
  itemPesanan: (ItemPesanan & {
    modifier: ItemPesananModifier[];
  })[];
  meja: { id: string; nama: string } | null;
  pelanggan: { id: string; nama: string } | null;
}

/** A payment with its allocations and method lines. */
export interface PembayaranLengkap extends Pembayaran {
  alokasi: AlokasiPembayaran[];
  metodeBaris: PembayaranMetodeBaris[];
  struk: Struk | null;
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CreatePesananInput {
  outletId: string;
  mejaId?: string;
  pelangganId?: string;
  kanal: KanalPesanan;
  dibuatOlehId: string;
}

export interface AddItemInput {
  pesananId: string;
  itemMenuId: string;
  varianMenuId?: string;
  kuantitas: number;
  catatan?: string;
  modifier?: Array<{
    modifierOpsiId: string;
    jumlah?: number;
  }>;
}

export interface RemoveItemInput {
  pesananId: string;
  itemPesananId: string;
}

export interface UpdateItemQuantityInput {
  itemPesananId: string;
  kuantitas: number;
}

export interface UpdateStatusInput {
  pesananId: string;
  statusBaru: StatusPesanan;
  diubahOlehId: string;
  alasan?: string;
}

export interface CreatePaymentInput {
  outletId: string;
  alokasi: Array<{
    pesananId: string;
    jumlah: bigint;
  }>;
  metodeBayar: Array<{
    metodeBayarId: string;
    jumlah: bigint;
  }>;
  totalDiterima: bigint;
  dikonfirmasiOlehId: string;
}

export interface SplitBillInput {
  pesananId: string;
  /** Each element represents a new order to split into. */
  splits: Array<{
    itemPesananIds: string[];
    targetMejaId?: string;
  }>;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListPesananOptions {
  outletId?: string;
  status?: StatusPesanan[];
  kanal?: KanalPesanan;
  mejaId?: string;
  dariTanggal?: Date;
  sampaiTanggal?: Date;
  includeItems?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetPesananOptions {
  includeItems?: boolean;
  includePembayaran?: boolean;
  includeRiwayat?: boolean;
}
