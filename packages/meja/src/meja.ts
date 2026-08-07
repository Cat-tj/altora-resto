/**
 * Table management (Meja) service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID().
 */

import type { PrismaClient } from "@prisma/client";
import type {
  MejaDenganArea,
  MejaLengkap,
  ReservasiDenganMeja,
  StatusMeja,
  StatusReservasi,
} from "./types"

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class MejaError extends Error {
  constructor(
    message: string,
    public code: MejaErrorCode,
  ) {
    super(message);
    this.name = "MejaError";
  }
}

export type MejaErrorCode =
  | "AREA_NOT_FOUND"
  | "MEJA_NOT_FOUND"
  | "RESERVASI_NOT_FOUND"
  | "MEJA_NOT_AVAILABLE"
  | "MEJA_NOT_IN_OUTLET"
  | "AREA_NOT_IN_OUTLET"
  | "DUPLICATE_NAMA"
  | "DUPLICATE_NOMOR_MEJA"
  | "MEJA_HAS_ACTIVE_ORDER"
  | "MEJA_HAS_ACTIVE_RESERVATION"
  | "OUTLET_NOT_IN_TENANT"
  | "INVALID_TRANSITION"
  | "RESERVASI_CONFLICT"
  | "PELANGGAN_NOT_IN_TENANT"
  | "VERSION_CONFLICT";

// ─── Area Meja ──────────────────────────────────────────────────────────────

/**
 * List all table areas for an outlet.
 * The db parameter should be a tenant-scoped PrismaClient.
 */
export async function listArea(
  db: PrismaClient,
  options: { outletId?: string; includeMeja?: boolean } = {},
) {
  const where: Record<string, unknown> = {};

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  return db.areaMeja.findMany({
    where,
    orderBy: { nama: "asc" },
    ...(options.includeMeja
      ? {
          include: {
            meja: {
              orderBy: { nomor: "asc" },
            },
          },
        }
      : {}),
  });
}

/**
 * Get a single table area by ID.
 */
export async function getArea(db: PrismaClient, id: string) {
  return db.areaMeja.findUnique({
    where: { id },
    include: {
      meja: {
        orderBy: { nomor: "asc" },
      },
    },
  });
}

/**
 * Create a new table area.
 * @param tenantId — the tenant this area belongs to (from ctx)
 * @param outletId — the outlet this area belongs to
 */
export async function createArea(
  db: PrismaClient,
  tenantId: string,
  outletId: string,
  data: { nama: string },
) {
  // Check for duplicate name within outlet
  const existing = await db.areaMeja.findFirst({
    where: { outletId, nama: data.nama.trim() },
  });

  if (existing) {
    throw new MejaError(
      "Nama area sudah digunakan di outlet ini",
      "DUPLICATE_NAMA",
    );
  }

  return db.areaMeja.create({
    data: {
      id: generateId(),
      tenantId,
      outletId,
      nama: data.nama.trim(),
    },
  });
}

/**
 * Update an existing table area.
 */
export async function updateArea(
  db: PrismaClient,
  id: string,
  data: { nama?: string | undefined },
) {
  const existing = await db.areaMeja.findUnique({ where: { id } });

  if (!existing) {
    throw new MejaError("Area meja tidak ditemukan", "AREA_NOT_FOUND");
  }

  if (data.nama) {
    const duplicate = await db.areaMeja.findFirst({
      where: {
        outletId: existing.outletId,
        nama: data.nama.trim(),
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new MejaError(
        "Nama area sudah digunakan di outlet ini",
        "DUPLICATE_NAMA",
      );
    }
  }

  return db.areaMeja.update({
    where: { id },
    data: {
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
    },
  });
}

// ─── Meja ───────────────────────────────────────────────────────────────────

/**
 * List all tables for an outlet, optionally filtered by area/status.
 */
export async function listMeja(
  db: PrismaClient,
  options: {
    outletId?: string;
    areaMejaId?: string;
    status?: StatusMeja;
    includeArea?: boolean;
  } = {},
): Promise<MejaDenganArea[]> {
  const where: Record<string, unknown> = {};

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  if (options.areaMejaId) {
    where.areaMejaId = options.areaMejaId;
  }

  if (options.status) {
    where.status = options.status;
  }

  return db.meja.findMany({
    where,
    orderBy: { nomor: "asc" },
    include: {
      areaMeja: { select: { id: true, nama: true } },
    },
  }) as Promise<MejaDenganArea[]>;
}

/**
 * Get a single table by ID with full details.
 */
export async function getMeja(
  db: PrismaClient,
  id: string,
): Promise<MejaLengkap | null> {
  return db.meja.findUnique({
    where: { id },
    include: {
      areaMeja: { select: { id: true, nama: true } },
      reservasi: {
        orderBy: { waktuReservasi: "desc" },
        take: 10,
      },
    },
  }) as Promise<MejaLengkap | null>;
}

/**
 * Create a new table.
 * @param tenantId — the tenant this table belongs to (from ctx)
 * @param outletId — the outlet this table belongs to
 */
export async function createMeja(
  db: PrismaClient,
  tenantId: string,
  outletId: string,
  data: { areaMejaId: string; nomor: string; kapasitas: number },
) {
  // Verify area exists in outlet
  const area = await db.areaMeja.findFirst({
    where: { id: data.areaMejaId, outletId },
  });

  if (!area) {
    throw new MejaError("Area meja tidak ditemukan di outlet ini", "AREA_NOT_IN_OUTLET");
  }

  // Check for duplicate nomor within outlet
  const existing = await db.meja.findFirst({
    where: { outletId, nomor: data.nomor.trim() },
  });

  if (existing) {
    throw new MejaError(
      "Nomor meja sudah digunakan di outlet ini",
      "DUPLICATE_NOMOR_MEJA",
    );
  }

  return db.meja.create({
    data: {
      id: generateId(),
      tenantId,
      outletId,
      areaMejaId: data.areaMejaId,
      nomor: data.nomor.trim(),
      kapasitas: data.kapasitas,
    },
  });
}

/**
 * Update an existing table.
 */
export async function updateMeja(
  db: PrismaClient,
  id: string,
  data: {
    areaMejaId?: string | undefined;
    nomor?: string | undefined;
    kapasitas?: number | undefined;
    status?: StatusMeja | undefined;
  },
) {
  const existing = await db.meja.findUnique({ where: { id } });

  if (!existing) {
    throw new MejaError("Meja tidak ditemukan", "MEJA_NOT_FOUND");
  }

  // If changing area, verify new area exists in same outlet
  if (data.areaMejaId) {
    const area = await db.areaMeja.findFirst({
      where: { id: data.areaMejaId, outletId: existing.outletId },
    });

    if (!area) {
      throw new MejaError(
        "Area meja tidak ditemukan di outlet ini",
        "AREA_NOT_IN_OUTLET",
      );
    }
  }

  // If changing nomor, check for duplicate
  if (data.nomor) {
    const duplicate = await db.meja.findFirst({
      where: {
        outletId: existing.outletId,
        nomor: data.nomor.trim(),
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new MejaError(
        "Nomor meja sudah digunakan di outlet ini",
        "DUPLICATE_NOMOR_MEJA",
      );
    }
  }

  return db.meja.update({
    where: { id },
    data: {
      ...(data.areaMejaId !== undefined && { areaMejaId: data.areaMejaId }),
      ...(data.nomor !== undefined && { nomor: data.nomor.trim() }),
      ...(data.kapasitas !== undefined && { kapasitas: data.kapasitas }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

/**
 * Assign a table to an order.
 * Sets table status to TERPAKAI and links it to the order.
 */
export async function assignTable(
  db: PrismaClient,
  data: { mejaId: string; pesananId: string },
) {
  const meja = await db.meja.findUnique({ where: { id: data.mejaId } });

  if (!meja) {
    throw new MejaError("Meja tidak ditemukan", "MEJA_NOT_FOUND");
  }

  if (meja.status !== "TERSEDIA") {
    throw new MejaError(
      `Meja tidak tersedia (status: ${meja.status})`,
      "MEJA_NOT_AVAILABLE",
    );
  }

  // Verify order exists
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
  });

  if (!pesanan) {
    throw new MejaError("Pesanan tidak ditemukan", "MEJA_NOT_FOUND");
  }

  return db.$transaction(async (tx) => {
    // Update table status
    await tx.meja.update({
      where: { id: data.mejaId },
      data: { status: "TERPAKAI" },
    });

    // Link order to table
    return tx.pesanan.update({
      where: { id: data.pesananId },
      data: { mejaId: data.mejaId },
    });
  });
}

/**
 * Release a table (set back to available).
 * Only allowed if no active orders are linked to this table.
 */
export async function releaseTable(
  db: PrismaClient,
  mejaId: string,
) {
  const meja = await db.meja.findUnique({ where: { id: mejaId } });

  if (!meja) {
    throw new MejaError("Meja tidak ditemukan", "MEJA_NOT_FOUND");
  }

  // Check for active orders
  const activeOrderCount = await db.pesanan.count({
    where: {
      mejaId,
      status: {
        notIn: ["SELESAI", "DIBATALKAN"],
      },
    },
  });

  if (activeOrderCount > 0) {
    throw new MejaError(
      "Meja masih memiliki pesanan aktif",
      "MEJA_HAS_ACTIVE_ORDER",
    );
  }

  return db.meja.update({
    where: { id: mejaId },
    data: { status: "TERSEDIA" },
  });
}

// ─── Reservasi ──────────────────────────────────────────────────────────────

/**
 * List reservations with optional filters.
 */
export async function listReservasi(
  db: PrismaClient,
  options: {
    outletId?: string;
    status?: StatusReservasi;
    dariTanggal?: Date;
    sampaiTanggal?: Date;
    includeMeja?: boolean;
  } = {},
): Promise<ReservasiDenganMeja[]> {
  const where: Record<string, unknown> = {};

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.dariTanggal || options.sampaiTanggal) {
    const waktuFilter: Record<string, Date> = {};
    if (options.dariTanggal) {
      waktuFilter.gte = options.dariTanggal;
    }
    if (options.sampaiTanggal) {
      waktuFilter.lte = options.sampaiTanggal;
    }
    where.waktuReservasi = waktuFilter;
  }

  return db.reservasi.findMany({
    where,
    orderBy: { waktuReservasi: "asc" },
    include: {
      meja: options.includeMeja
        ? { select: { id: true, nomor: true, kapasitas: true } }
        : false,
    },
  }) as Promise<ReservasiDenganMeja[]>;
}

/**
 * Create a new reservation.
 * Optionally assigns a specific table.
 */
export async function createReservasi(
  db: PrismaClient,
  tenantId: string,
  data: {
    outletId: string;
    mejaId?: string;
    pelangganId: string;
    jumlahTamu: number;
    waktuReservasi: Date;
  },
) {
  // Verify customer belongs to tenant
  const pelanggan = await db.pelanggan.findFirst({
    where: { id: data.pelangganId, tenantId },
  });

  if (!pelanggan) {
    throw new MejaError("Pelanggan tidak ditemukan", "PELANGGAN_NOT_IN_TENANT");
  }

  // If specific table requested, verify it's available
  if (data.mejaId) {
    const meja = await db.meja.findFirst({
      where: { id: data.mejaId, outletId: data.outletId },
    });

    if (!meja) {
      throw new MejaError(
        "Meja tidak ditemukan di outlet ini",
        "MEJA_NOT_IN_OUTLET",
      );
    }

    if (meja.status !== "TERSEDIA") {
      throw new MejaError(
        `Meja tidak tersedia (status: ${meja.status})`,
        "MEJA_NOT_AVAILABLE",
      );
    }

    // Check for overlapping reservations on the same table
    const overlapping = await db.reservasi.findFirst({
      where: {
        mejaId: data.mejaId,
        status: { in: ["DIAJUKAN", "DIKONFIRMASI"] },
        waktuReservasi: {
          // Within 2-hour window of requested time
          gte: new Date(data.waktuReservasi.getTime() - 2 * 60 * 60 * 1000),
          lte: new Date(data.waktuReservasi.getTime() + 2 * 60 * 60 * 1000),
        },
      },
    });

    if (overlapping) {
      throw new MejaError(
        "Meja sudah memiliki reservasi pada waktu tersebut",
        "RESERVASI_CONFLICT",
      );
    }

    // Mark table as reserved
    await db.meja.update({
      where: { id: data.mejaId },
      data: { status: "DIPESAN" },
    });
  }

  return db.reservasi.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: data.outletId,
      ...(data.mejaId != null && { mejaId: data.mejaId }),
      pelangganId: data.pelangganId,
      jumlahTamu: data.jumlahTamu,
      waktuReservasi: data.waktuReservasi,
    },
    include: {
      meja: { select: { id: true, nomor: true, kapasitas: true } },
    },
  });
}

/**
 * Update reservation status with transition validation.
 */
export async function updateReservasiStatus(
  db: PrismaClient,
  data: {
    id: string;
    status: StatusReservasi;
  },
) {
  const reservasi = await db.reservasi.findUnique({
    where: { id: data.id },
  });

  if (!reservasi) {
    throw new MejaError("Reservasi tidak ditemukan", "RESERVASI_NOT_FOUND");
  }

  // Validate transition
  const validTransitions: Record<StatusReservasi, StatusReservasi[]> = {
    DIAJUKAN: ["DIKONFIRMASI", "DIBATALKAN"],
    DIKONFIRMASI: ["TIBA", "DIBATALKAN", "TIDAK_HADIR"],
    TIBA: ["SELESAI"],
    SELESAI: [],
    TIDAK_HADIR: [],
    DIBATALKAN: [],
  };

  const validNext = validTransitions[reservasi.status];
  if (!validNext.includes(data.status)) {
    throw new MejaError(
      `Transisi dari ${reservasi.status} ke ${data.status} tidak valid`,
      "INVALID_TRANSITION",
    );
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.reservasi.update({
      where: { id: data.id },
      data: { status: data.status },
    });

    // If cancelled or completed, release the table
    if (
      (data.status === "DIBATALKAN" || data.status === "SELESAI") &&
      reservasi.mejaId
    ) {
      // Only release if no active orders on the table
      const activeOrders = await tx.pesanan.count({
        where: {
          mejaId: reservasi.mejaId,
          status: { notIn: ["SELESAI", "DIBATALKAN"] },
        },
      });

      if (activeOrders === 0) {
        await tx.meja.update({
          where: { id: reservasi.mejaId },
          data: { status: "TERSEDIA" },
        });
      }
    }

    // If arrived, set table to TERPAKAI
    if (data.status === "TIBA" && reservasi.mejaId) {
      await tx.meja.update({
        where: { id: reservasi.mejaId },
        data: { status: "TERPAKAI" },
      });
    }

    return updated;
  });
}

/**
 * Cancel a reservation (convenience wrapper for updateReservasiStatus).
 */
export async function cancelReservasi(
  db: PrismaClient,
  id: string,
) {
  return updateReservasiStatus(db, { id, status: "DIBATALKAN" });
}
