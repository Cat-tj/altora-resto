/**
 * Kitchen (Dapur) domain types for Altora Resto.
 *
 * These types represent the kitchen display system aggregate:
 * - StasiunDapur: Kitchen stations (Bar, Dapur, Grill, Dessert, etc.)
 * - AturanRoutingDapur: Rules that route menu items to stations
 * - TiketDapur: Kitchen tickets created when an order is confirmed
 * - TiketDapurBaris: Individual line items in a kitchen ticket
 * - RiwayatStatusTiketDapur: Status change history for tickets
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusAktifNonaktif = "AKTIF" | "NONAKTIF";

export type StatusTiketDapur =
  | "BARU"
  | "DITERIMA"
  | "DITAHAN"
  | "SEDANG_DISIAPKAN"
  | "SELESAI_SEBAGIAN"
  | "SIAP"
  | "DISAJIKAN"
  | "DIBATALKAN";

export type StatusMasakBaris = "MENUNGGU" | "DIMASAK" | "SIAP";

// ─── Stasiun Dapur ─────────────────────────────────────────────────────────

export interface StasiunDapur {
  id: string;
  tenantId: string;
  outletId: string;
  nama: string;
}

// ─── Aturan Routing Dapur ───────────────────────────────────────────────────

export interface AturanRoutingDapur {
  id: string;
  tenantId: string;
  outletId: string;
  itemMenuId: string | null;
  kategoriMenuId: string | null;
  stasiunDapurId: string;
  prioritas: number;
  status: StatusAktifNonaktif;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Tiket Dapur ───────────────────────────────────────────────────────────

export interface TiketDapur {
  id: string;
  tenantId: string;
  outletId: string;
  pesananId: string;
  stasiunDapurId: string | null;
  nomorGelombang: number;
  status: StatusTiketDapur;
  masukPada: Date;
  mulaiDiprosesPada: Date | null;
  siapPada: Date | null;
  alasanPembatalan: string | null;
}

// ─── Tiket Dapur Baris ─────────────────────────────────────────────────────

export interface TiketDapurBaris {
  id: string;
  tiketDapurId: string;
  itemPesananId: string;
  statusMasak: StatusMasakBaris;
}

// ─── Riwayat Status Tiket Dapur ────────────────────────────────────────────

export interface RiwayatStatusTiketDapur {
  id: string;
  tenantId: string;
  tiketDapurId: string;
  statusSebelumnya: StatusTiketDapur;
  statusBaru: StatusTiketDapur;
  diubahOlehId: string | null;
  createdAt: Date;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** A ticket with its lines and station info included. */
export interface TiketDapurLengkap extends TiketDapur {
  stasiunDapur: Pick<StasiunDapur, "id" | "nama"> | null;
  baris: TiketDapurBaris[];
  riwayatStatus: RiwayatStatusTiketDapur[];
}

/** A station with routing rules included. */
export interface StasiunDapurDenganAturan extends StasiunDapur {
  aturanRoutingDapur: AturanRoutingDapur[];
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CreateStasiunInput {
  nama: string;
}

export interface UpdateStasiunInput {
  nama?: string;
}

export interface CreateAturanRoutingInput {
  outletId: string;
  itemMenuId?: string | undefined;
  kategoriMenuId?: string | undefined;
  stasiunDapurId: string;
  prioritas?: number | undefined;
}

export interface UpdateAturanRoutingInput {
  stasiunDapurId?: string | undefined;
  itemMenuId?: string | undefined | null;
  kategoriMenuId?: string | undefined | null;
  prioritas?: number | undefined;
  status?: StatusAktifNonaktif;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListTiketOptions {
  outletId?: string;
  stasiunDapurId?: string | undefined;
  status?: StatusTiketDapur;
  includeBaris?: boolean;
  includeRiwayat?: boolean;
}

export interface ListStasiunOptions {
  outletId?: string;
  includeAturan?: boolean;
}
