/**
 * Karyawan (Employee) service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID().
 */

import type { PrismaClient } from "@prisma/client";
import type {
  KaryawanLengkap,
  LaporanAbsensi,
} from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class KaryawanError extends Error {
  constructor(
    message: string,
    public code: KaryawanErrorCode,
  ) {
    super(message);
    this.name = "KaryawanError";
  }
}

export type KaryawanErrorCode =
  | "KARYAWAN_NOT_FOUND"
  | "ABSENSI_NOT_FOUND"
  | "ALREADY_CLOCKED_IN"
  | "NOT_CLOCKED_IN"
  | "ALREADY_CLOCKED_OUT"
  | "OUTLET_NOT_IN_TENANT"
  | "DUPLICATE_NOMOR_INDUK";

// ─── List Employees ─────────────────────────────────────────────────────────

/**
 * List employees for the tenant, optionally filtered by outlet.
 */
export async function listKaryawan(
  db: PrismaClient,
  options: {
    outletId?: string;
    status?: string;
    includeRelations?: boolean;
  } = {},
): Promise<KaryawanLengkap[]> {
  const where: Record<string, unknown> = {};

  if (options.status) {
    where.status = options.status;
  }

  // If filtering by outlet, use the KaryawanOutlet junction
  if (options.outletId) {
    where.karyawanOutlet = {
      some: {
        outletId: options.outletId,
        status: "AKTIF",
      },
    };
  }

  return db.karyawan.findMany({
    where,
    orderBy: { nomorInduk: "asc" },
    include: {
      karyawanOutlet: true,
      ...(options.includeRelations
        ? {
            hubunganKerja: {
              where: { status: "AKTIF" },
              orderBy: { mulaiPada: "desc" },
              take: 1,
            },
          }
        : {}),
    },
  }) as Promise<KaryawanLengkap[]>;
}

/**
 * Get a single employee by ID.
 */
export async function getKaryawan(
  db: PrismaClient,
  id: string,
): Promise<KaryawanLengkap | null> {
  return db.karyawan.findUnique({
    where: { id },
    include: {
      karyawanOutlet: true,
      hubunganKerja: {
        orderBy: { mulaiPada: "desc" },
        take: 5,
      },
    },
  }) as Promise<KaryawanLengkap | null>;
}

// ─── Clock In ───────────────────────────────────────────────────────────────

/**
 * Clock in an employee. Creates an Absensi record.
 * Validates that the employee is not already clocked in today.
 */
export async function clockIn(
  db: PrismaClient,
  tenantId: string,
  input: {
    karyawanId: string;
    outletId: string;
    metode: string;
    perangkatId?: string | undefined;
    lokasiLat?: number | undefined;
    lokasiLng?: number | undefined;
    jarakDariOutletMeter?: number | undefined;
  },
) {
  // Verify employee exists
  const karyawan = await db.karyawan.findFirst({
    where: { tenantId, id: input.karyawanId },
  });

  if (!karyawan) {
    throw new KaryawanError("Karyawan tidak ditemukan", "KARYAWAN_NOT_FOUND");
  }

  // Check if already clocked in today (no jamPulang yet)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAbsensi = await db.absensi.findFirst({
    where: {
      tenantId,
      karyawanId: input.karyawanId,
      outletId: input.outletId,
      jamMasuk: { gte: today, lt: tomorrow },
      jamPulang: null,
    },
  });

  if (existingAbsensi) {
    throw new KaryawanError(
      "Karyawan sudah melakukan clock in hari ini",
      "ALREADY_CLOCKED_IN",
    );
  }

  // Determine attendance status
  const now = new Date();
  const jamMasuk = now;
  // Simple check: if after 09:00, mark as TERLAMBAT
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isLate = hour > 9 || (hour === 9 && minute > 0);
  const status = isLate ? "TERLAMBAT" : "TEPAT_WAKTU";

  return db.absensi.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: input.outletId,
      karyawanId: input.karyawanId,
      ...(input.perangkatId != null && { perangkatId: input.perangkatId }),
      jamMasuk,
      jamPulang: null,
      jamMasukEfektif: jamMasuk,
      metode: input.metode as "QR" | "PIN" | "GPS" | "MANUAL_SUPERVISOR",
      status: status as "TEPAT_WAKTU" | "TERLAMBAT" | "PULANG_AWAL" | "LEMBUR",
      ...(input.lokasiLat != null && { lokasiLat: input.lokasiLat }),
      ...(input.lokasiLng != null && { lokasiLng: input.lokasiLng }),
      ...(input.jarakDariOutletMeter != null && {
        jarakDariOutletMeter: input.jarakDariOutletMeter,
      }),
    },
  });
}

// ─── Clock Out ──────────────────────────────────────────────────────────────

/**
 * Clock out an employee. Updates the existing Absensi record.
 */
export async function clockOut(
  db: PrismaClient,
  tenantId: string,
  input: {
    karyawanId: string;
    outletId: string;
  },
) {
  // Find today's open absensi
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const absensi = await db.absensi.findFirst({
    where: {
      tenantId,
      karyawanId: input.karyawanId,
      outletId: input.outletId,
      jamMasuk: { gte: today, lt: tomorrow },
      jamPulang: null,
    },
  });

  if (!absensi) {
    throw new KaryawanError(
      "Tidak ada sesi clock in yang aktif untuk hari ini",
      "NOT_CLOCKED_IN",
    );
  }

  const now = new Date();

  return db.absensi.update({
    where: { id: absensi.id },
    data: {
      jamPulang: now,
      jamPulangEfektif: now,
    },
  });
}

// ─── Attendance Report ──────────────────────────────────────────────────────

/**
 * Get attendance report for a date range.
 */
export async function getAttendanceReport(
  db: PrismaClient,
  tenantId: string,
  options: {
    outletId: string;
    dariTanggal: Date;
    sampaiTanggal: Date;
  },
): Promise<LaporanAbsensi[]> {
  const absensiList = await db.absensi.findMany({
    where: {
      tenantId,
      outletId: options.outletId,
      jamMasuk: {
        gte: options.dariTanggal,
        lte: options.sampaiTanggal,
      },
    },
    include: {
      karyawan: {
        select: {
          id: true,
          nomorInduk: true,
          // We need the name from the linked Pengguna
          keanggotaanTenant: {
            select: {
              pengguna: {
                select: { namaLengkap: true },
              },
            },
          },
        },
      },
    },
    orderBy: { jamMasuk: "asc" },
  });

  // Group by karyawan
  const grouped = new Map<
    string,
    {
      nomorInduk: string;
      namaKaryawan: string;
      hadir: number;
      terlambat: number;
      pulangAwal: number;
      lembur: number;
      totalJamKerja: number;
    }
  >();

  for (const absensi of absensiList) {
    const key = absensi.karyawanId;
    const existing = grouped.get(key);

    const nama =
      absensi.karyawan.keanggotaanTenant?.pengguna?.namaLengkap ?? "Unknown";
    const totalMenit =
      absensi.jamPulang
        ? (absensi.jamPulang.getTime() - absensi.jamMasuk.getTime()) / 60000
        : 0;

    if (existing) {
      existing.hadir += 1;
      if (absensi.status === "TERLAMBAT") existing.terlambat += 1;
      if (absensi.status === "PULANG_AWAL") existing.pulangAwal += 1;
      if (absensi.status === "LEMBUR") existing.lembur += 1;
      existing.totalJamKerja += totalMenit;
    } else {
      grouped.set(key, {
        nomorInduk: absensi.karyawan.nomorInduk,
        namaKaryawan: nama,
        hadir: 1,
        terlambat: absensi.status === "TERLAMBAT" ? 1 : 0,
        pulangAwal: absensi.status === "PULANG_AWAL" ? 1 : 0,
        lembur: absensi.status === "LEMBUR" ? 1 : 0,
        totalJamKerja: totalMenit,
      });
    }
  }

  return Array.from(grouped.entries()).map(([karyawanId, data]) => ({
    karyawanId,
    nomorInduk: data.nomorInduk,
    namaKaryawan: data.namaKaryawan,
    totalHadir: data.hadir,
    totalTerlambat: data.terlambat,
    totalPulangAwal: data.pulangAwal,
    totalLembur: data.lembur,
    totalJamKerja: Math.round(data.totalJamKerja),
  }));
}

// ─── List Attendance ────────────────────────────────────────────────────────

/**
 * List attendance records with optional filters.
 */
export async function listAbsensi(
  db: PrismaClient,
  options: {
    outletId?: string;
    karyawanId?: string;
    dariTanggal?: Date;
    sampaiTanggal?: Date;
    limit?: number;
  } = {},
) {
  const where: Record<string, unknown> = {};

  if (options.outletId) where.outletId = options.outletId;
  if (options.karyawanId) where.karyawanId = options.karyawanId;
  if (options.dariTanggal || options.sampaiTanggal) {
    where.jamMasuk = {
      ...(options.dariTanggal && { gte: options.dariTanggal }),
      ...(options.sampaiTanggal && { lte: options.sampaiTanggal }),
    };
  }

  return db.absensi.findMany({
    where,
    orderBy: { jamMasuk: "desc" },
    take: options.limit ?? 50,
    include: {
      karyawan: {
        select: {
          id: true,
          nomorInduk: true,
          keanggotaanTenant: {
            select: {
              pengguna: { select: { namaLengkap: true } },
            },
          },
        },
      },
    },
  });
}
