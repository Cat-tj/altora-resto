/**
 * Table management (Meja) domain types for Altora Resto.
 *
 * These types represent the table management aggregate:
 * - AreaMeja: Table areas/zones within an outlet
 * - Meja: Individual tables with status tracking
 * - Reservasi: Table reservations
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusMeja =
  | "TERSEDIA"
  | "TERPAKAI"
  | "DIPESAN"
  | "PERLU_DIBERSIHKAN"
  | "NONAKTIF";

export type StatusReservasi =
  | "DIAJUKAN"
  | "DIKONFIRMASI"
  | "TIBA"
  | "SELESAI"
  | "TIDAK_HADIR"
  | "DIBATALKAN";

// ─── Area Meja ──────────────────────────────────────────────────────────────

export interface AreaMeja {
  id: string;
  tenantId: string;
  outletId: string;
  nama: string;
}

// ─── Meja ───────────────────────────────────────────────────────────────────

export interface Meja {
  id: string;
  tenantId: string;
  outletId: string;
  areaMejaId: string;
  nomor: string;
  kapasitas: number;
  status: StatusMeja;
}

// ─── Reservasi ──────────────────────────────────────────────────────────────

export interface Reservasi {
  id: string;
  tenantId: string;
  outletId: string;
  mejaId: string | null;
  pelangganId: string;
  jumlahTamu: number;
  waktuReservasi: Date;
  status: StatusReservasi;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** A table with area info included. */
export interface MejaDenganArea extends Meja {
  areaMeja: Pick<AreaMeja, "id" | "nama">;
}

/** A table with reservation history included. */
export interface MejaLengkap extends MejaDenganArea {
  reservasi: Reservasi[];
}

/** A reservation with table info included. */
export interface ReservasiDenganMeja extends Reservasi {
  meja: Pick<Meja, "id" | "nomor" | "kapasitas"> | null;
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CreateAreaInput {
  nama: string;
}

export interface UpdateAreaInput {
  nama?: string;
}

export interface CreateMejaInput {
  areaMejaId: string;
  nomor: string;
  kapasitas: number;
}

export interface UpdateMejaInput {
  areaMejaId?: string;
  nomor?: string;
  kapasitas?: number;
  status?: StatusMeja;
}

export interface CreateReservasiInput {
  outletId: string;
  mejaId?: string | undefined;
  pelangganId: string;
  jumlahTamu: number;
  waktuReservasi: Date;
}

export interface UpdateReservasiInput {
  mejaId?: string | undefined | null;
  jumlahTamu?: number;
  waktuReservasi?: Date;
  status?: StatusReservasi;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListMejaOptions {
  outletId?: string;
  areaMejaId?: string | undefined;
  status?: StatusMeja;
  includeArea?: boolean;
}

export interface ListReservasiOptions {
  outletId?: string;
  status?: StatusReservasi;
  dariTanggal?: Date;
  sampaiTanggal?: Date;
  includeMeja?: boolean;
}

export interface ListAreaOptions {
  outletId?: string;
  includeMeja?: boolean;
}
