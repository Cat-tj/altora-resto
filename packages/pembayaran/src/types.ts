/**
 * Pembayaran (Payments) domain types for Altora Resto.
 *
 * These types represent the payment aggregate:
 * - Pembayaran: Payment event (one per cashier action)
 * - PembayaranMetodeBaris: Payment method line (supports split/campuran)
 * - AlokasiPembayaran: Allocation of payment to orders (supports group bill)
 * - QrisKonfirmasiManual: Manual QRIS confirmation by cashier
 * - MetodeBayar: Payment method catalog
 * - KonfigurasiQris: QRIS configuration per outlet
 * - PembayaranRefund: Refund records
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusAktifNonaktif = "AKTIF" | "NONAKTIF";

export type KodeMetodeBayar =
  | "TUNAI"
  | "TRANSFER_MANUAL"
  | "QRIS_MANUAL"
  | "SALDO_TOKO";

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

// ─── MetodeBayar ────────────────────────────────────────────────────────────

export interface MetodeBayar {
  id: string;
  tenantId: string;
  kode: KodeMetodeBayar;
  nama: string;
  status: StatusAktifNonaktif;
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
  createdAt: Date;
  updatedAt: Date;
  version: number;
  dikonfirmasiPada: Date | null;
}

// ─── PembayaranMetodeBaris ──────────────────────────────────────────────────

export interface PembayaranMetodeBaris {
  id: string;
  tenantId: string;
  pembayaranId: string;
  metodeBayarId: string;
  jumlah: bigint;
}

// ─── AlokasiPembayaran ──────────────────────────────────────────────────────

export interface AlokasiPembayaran {
  id: string;
  tenantId: string;
  pembayaranId: string;
  pesananId: string;
  jumlah: bigint;
  createdAt: Date;
}

// ─── QrisKonfirmasiManual ───────────────────────────────────────────────────

export interface QrisKonfirmasiManual {
  id: string;
  tenantId: string;
  pembayaranId: string;
  catatanKasir: string | null;
  diverifikasiOlehId: string;
  diverifikasiPada: Date;
}

// ─── KoreksiPembayaran ──────────────────────────────────────────────────────

export interface KoreksiPembayaran {
  id: string;
  tenantId: string;
  pembayaranId: string;
  alasan: string;
  jumlahSebelum: bigint;
  jumlahSesudah: bigint;
  dikoreksiOlehId: string;
  createdAt: Date;
}

// ─── PembayaranRefund ───────────────────────────────────────────────────────

export interface PembayaranRefund {
  id: string;
  tenantId: string;
  pembayaranId: string;
  jumlah: bigint;
  alasan: string;
  disetujuiOlehId: string;
  createdAt: Date;
}

// ─── KonfigurasiQris ────────────────────────────────────────────────────────

export type StatusKonfigurasiQris =
  | "DRAF"
  | "MENUNGGU_VERIFIKASI"
  | "AKTIF"
  | "DITOLAK"
  | "DINONAKTIFKAN";

export interface KonfigurasiQris {
  id: string;
  tenantId: string;
  outletId: string;
  payloadTerenkripsi: string;
  fingerprint: string;
  namaMerchant: string;
  kotaMerchant: string;
  status: StatusKonfigurasiQris;
  dibuatOlehId: string;
  diverifikasiOlehId: string | null;
  diverifikasiPada: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** Payment with its method lines and allocations. */
export interface PembayaranLengkap extends Pembayaran {
  metodeBaris: (PembayaranMetodeBaris & {
    metodeBayar: Pick<MetodeBayar, "id" | "kode" | "nama">;
  })[];
  alokasi: AlokasiPembayaran[];
  qrisKonfirmasi: QrisKonfirmasiManual | null;
}

/** Payment summary for an order. */
export interface RingkasanPembayaran {
  pesananId: string;
  totalTagihan: bigint;
  totalDibayar: bigint;
  sisaTagihan: bigint;
  isFullyPaid: boolean;
  riwayatPembayaran: Array<{
    id: string;
    jumlah: bigint;
    metode: string;
    createdAt: Date;
  }>;
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CreatePaymentInput {
  alokasi: Array<{
    pesananId: string;
    jumlah: number;
  }>;
  metodeBayar: Array<{
    metodeBayarId: string;
    jumlah: number;
  }>;
  totalDiterima: number;
  dikonfirmasiOlehId: string;
}

export interface ConfirmQrisInput {
  pembayaranId: string;
  catatanKasir?: string | undefined;
  diverifikasiOlehId: string;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListPembayaranOptions {
  outletId?: string;
  status?: StatusPembayaran;
  dariTanggal?: Date;
  sampaiTanggal?: Date;
  limit?: number;
}

export interface ListMetodeBayarOptions {
  includeNonActive?: boolean;
}
