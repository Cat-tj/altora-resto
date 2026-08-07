/**
 * Karyawan (Employee) domain types for Altora Resto.
 *
 * These types represent the employee aggregate:
 * - Karyawan: Employee master data
 * - KeanggotaanTenant: Tenant membership (links Pengguna to Tenant)
 * - KeanggotaanOutlet: Outlet membership (links KeanggotaanTenant to Outlet)
 * - KaryawanOutlet: Many-to-many Employee <-> Outlet (isUtama for main outlet)
 * - Absensi: Attendance records (clock-in/clock-out)
 * - PinOutlet: PIN per employee per outlet
 * - HubunganKerja: Employment history (position, department)
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusAktifNonaktif = "AKTIF" | "NONAKTIF";

export type StatusKaryawan = "AKTIF" | "CUTI" | "NONAKTIF";

export type MetodeAbsensi = "QR" | "PIN" | "GPS" | "MANUAL_SUPERVISOR";

export type StatusAbsensi =
  | "TEPAT_WAKTU"
  | "TERLAMBAT"
  | "PULANG_AWAL"
  | "LEMBUR";

export type TipeHubunganKerja = "TETAP" | "KONTRAK" | "PARUH_WAKTU" | "MAGANG";

// ─── Karyawan ───────────────────────────────────────────────────────────────

export interface Karyawan {
  id: string;
  tenantId: string;
  keanggotaanTenantId: string | null;
  nomorInduk: string;
  status: StatusKaryawan;
  tanggalBergabung: Date;
}

// ─── KaryawanOutlet ─────────────────────────────────────────────────────────

export interface KaryawanOutlet {
  id: string;
  tenantId: string;
  karyawanId: string;
  outletId: string;
  isUtama: boolean;
  status: StatusAktifNonaktif;
  createdAt: Date;
}

// ─── HubunganKerja ──────────────────────────────────────────────────────────

export interface HubunganKerja {
  id: string;
  tenantId: string;
  karyawanId: string;
  jabatanId: string;
  departemenId: string | null;
  tipeHubungan: TipeHubunganKerja;
  mulaiPada: Date;
  berakhirPada: Date | null;
  status: StatusAktifNonaktif;
  createdAt: Date;
}

// ─── Absensi ────────────────────────────────────────────────────────────────

export interface Absensi {
  id: string;
  tenantId: string;
  outletId: string;
  karyawanId: string;
  perangkatId: string | null;
  jamMasuk: Date;
  jamPulang: Date | null;
  jamMasukEfektif: Date | null;
  jamPulangEfektif: Date | null;
  metode: MetodeAbsensi;
  status: StatusAbsensi;
  lokasiLat: number | null;
  lokasiLng: number | null;
  jarakDariOutletMeter: number | null;
  updatedAt: Date;
  version: number;
}

// ─── PinOutlet ──────────────────────────────────────────────────────────────

export interface PinOutlet {
  id: string;
  keanggotaanTenantId: string;
  tenantId: string;
  outletId: string;
  perangkatId: string | null;
  pinHash: string;
  status: StatusAktifNonaktif;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** Employee with outlet assignments. */
export interface KaryawanLengkap extends Karyawan {
  karyawanOutlet: KaryawanOutlet[];
  hubunganKerja: HubunganKerja[];
}

/** Employee with attendance records. */
export interface KaryawanDenganAbsensi extends Karyawan {
  absensi: Absensi[];
}

/** Attendance report row. */
export interface LaporanAbsensi {
  karyawanId: string;
  nomorInduk: string;
  namaKaryawan: string;
  totalHadir: number;
  totalTerlambat: number;
  totalPulangAwal: number;
  totalLembur: number;
  totalJamKerja: number; // in minutes
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface ClockInInput {
  karyawanId: string;
  outletId: string;
  metode: MetodeAbsensi;
  perangkatId?: string | undefined;
  lokasiLat?: number | undefined;
  lokasiLng?: number | undefined;
  jarakDariOutletMeter?: number | undefined;
}

export interface ClockOutInput {
  karyawanId: string;
  outletId: string;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListKaryawanOptions {
  outletId?: string;
  status?: StatusKaryawan;
  includeRelations?: boolean;
}

export interface AbsensiReportOptions {
  outletId: string;
  dariTanggal: Date;
  sampaiTanggal: Date;
}
