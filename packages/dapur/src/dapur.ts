/**
 * Kitchen (Dapur) service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID().
 */

import type { PrismaClient } from "@prisma/client";
import type {
  TiketDapurLengkap,
  StasiunDapurDenganAturan,
  StatusTiketDapur,
} from "./types"

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class DapurError extends Error {
  constructor(
    message: string,
    public code: DapurErrorCode,
  ) {
    super(message);
    this.name = "DapurError";
  }
}

export type DapurErrorCode =
  | "STASIUN_NOT_FOUND"
  | "ATURAN_ROUTING_NOT_FOUND"
  | "TIKET_NOT_FOUND"
  | "BARIS_NOT_FOUND"
  | "PESANAN_NOT_FOUND"
  | "OUTLET_NOT_IN_TENANT"
  | "DUPLICATE_NAMA"
  | "INVALID_TRANSITION"
  | "ATURAN_ROUTING_INVALID_XOR"
  | "ITEM_NOT_IN_TENANT"
  | "KATEGORI_NOT_IN_TENANT"
  | "STASIUN_NOT_IN_OUTLET"
  | "ALASAN_WAJIB_Saat_DIBATALKAN"
  | "TIKET_BELUM_SIAP"
  | "SEMUA_BARIS_BELUM_SIAP";

// ─── Status Transition Validation ───────────────────────────────────────────

/**
 * Valid status transitions for TiketDapur.
 * Based on the state machine defined in STATE-MACHINES.md.
 */
const VALID_TRANSITIONS: Record<StatusTiketDapur, StatusTiketDapur[]> = {
  BARU: ["DITERIMA", "DITAHAN", "DIBATALKAN"],
  DITERIMA: ["DITAHAN", "SEDANG_DISIAPKAN", "DIBATALKAN"],
  DITAHAN: ["SEDANG_DISIAPKAN", "DIBATALKAN"],
  SEDANG_DISIAPKAN: ["SELESAI_SEBAGIAN", "SIAP", "DIBATALKAN"],
  SELESAI_SEBAGIAN: ["SIAP", "SEDANG_DISIAPKAN"],
  SIAP: ["DISAJIKAN"],
  DISAJIKAN: [],
  DIBATALKAN: [],
};

// ─── Stasiun Dapur ─────────────────────────────────────────────────────────

/**
 * List all kitchen stations for an outlet.
 * The db parameter should be a tenant-scoped PrismaClient.
 */
export async function listStasiun(
  db: PrismaClient,
  options: { outletId?: string; includeAturan?: boolean } = {},
): Promise<StasiunDapurDenganAturan[]> {
  const where: Record<string, unknown> = {};

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  return db.stasiunDapur.findMany({
    where,
    orderBy: { nama: "asc" },
    ...(options.includeAturan
      ? {
          include: {
            aturanRoutingDapur: {
              orderBy: { prioritas: "desc" },
              where: { status: "AKTIF" },
            },
          },
        }
      : {}),
  }) as Promise<StasiunDapurDenganAturan[]>;
}

/**
 * Get a single kitchen station by ID.
 */
export async function getStasiun(
  db: PrismaClient,
  id: string,
): Promise<StasiunDapurDenganAturan | null> {
  return db.stasiunDapur.findUnique({
    where: { id },
    include: {
      aturanRoutingDapur: {
        orderBy: { prioritas: "desc" },
      },
    },
  }) as Promise<StasiunDapurDenganAturan | null>;
}

/**
 * Create a new kitchen station.
 * @param tenantId — the tenant this station belongs to (from ctx)
 * @param outletId — the outlet this station belongs to
 */
export async function createStasiun(
  db: PrismaClient,
  tenantId: string,
  outletId: string,
  data: { nama: string },
) {
  return db.stasiunDapur.create({
    data: {
      id: generateId(),
      tenantId,
      outletId,
      nama: data.nama.trim(),
    },
  });
}

/**
 * Update an existing kitchen station.
 */
export async function updateStasiun(
  db: PrismaClient,
  id: string,
  data: { nama?: string | undefined },
) {
  const existing = await db.stasiunDapur.findUnique({ where: { id } });

  if (!existing) {
    throw new DapurError("Stasiun dapur tidak ditemukan", "STASIUN_NOT_FOUND");
  }

  return db.stasiunDapur.update({
    where: { id },
    data: {
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
    },
  });
}

// ─── Aturan Routing Dapur ───────────────────────────────────────────────────

/**
 * List routing rules for an outlet.
 */
export async function listAturanRouting(
  db: PrismaClient,
  options: { outletId?: string } = {},
) {
  const where: Record<string, unknown> = { status: "AKTIF" };

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  return db.aturanRoutingDapur.findMany({
    where,
    orderBy: { prioritas: "desc" },
  });
}

/**
 * Create a new routing rule.
 * Enforces XOR invariant: exactly one of itemMenuId/kategoriMenuId must be set.
 */
export async function createAturanRouting(
  db: PrismaClient,
  tenantId: string,
  data: {
    outletId: string;
    itemMenuId?: string;
    kategoriMenuId?: string;
    stasiunDapurId: string;
    prioritas?: number;
  },
) {
  // Enforce XOR invariant
  const hasItem = data.itemMenuId != null;
  const hasKategori = data.kategoriMenuId != null;

  if (hasItem === hasKategori) {
    throw new DapurError(
      "Harus diisi salah satu: itemMenuId atau kategoriMenuId (XOR)",
      "ATURAN_ROUTING_INVALID_XOR",
    );
  }

  // Verify station exists in outlet
  const stasiun = await db.stasiunDapur.findFirst({
    where: { id: data.stasiunDapurId, outletId: data.outletId },
  });
  if (!stasiun) {
    throw new DapurError(
      "Stasiun dapur tidak ditemukan di outlet ini",
      "STASIUN_NOT_IN_OUTLET",
    );
  }

  return db.aturanRoutingDapur.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: data.outletId,
      ...(data.itemMenuId != null && { itemMenuId: data.itemMenuId }),
      ...(data.kategoriMenuId != null && { kategoriMenuId: data.kategoriMenuId }),
      stasiunDapurId: data.stasiunDapurId,
      prioritas: data.prioritas ?? 0,
    },
  });
}

/**
 * Delete a routing rule (soft-delete via status NONAKTIF).
 */
export async function deleteAturanRouting(db: PrismaClient, id: string) {
  const existing = await db.aturanRoutingDapur.findUnique({ where: { id } });

  if (!existing) {
    throw new DapurError(
      "Aturan routing tidak ditemukan",
      "ATURAN_ROUTING_NOT_FOUND",
    );
  }

  return db.aturanRoutingDapur.update({
    where: { id },
    data: { status: "NONAKTIF" },
  });
}

// ─── Tiket Dapur ───────────────────────────────────────────────────────────

/**
 * Resolve the station for a given menu item using routing rules.
 * Checks item-specific rules first, then category-level rules.
 * Returns the station ID or null if no rule matches.
 */
export async function resolveStasiunUntukItem(
  db: PrismaClient,
  itemMenuId: string,
  kategoriMenuId: string,
  outletId: string,
): Promise<string | null> {
  // Try item-specific rule first (higher priority)
  const aturanItem = await db.aturanRoutingDapur.findFirst({
    where: {
      outletId,
      itemMenuId,
      status: "AKTIF",
    },
    orderBy: { prioritas: "desc" },
  });

  if (aturanItem) {
    return aturanItem.stasiunDapurId;
  }

  // Fall back to category-level rule
  const aturanKategori = await db.aturanRoutingDapur.findFirst({
    where: {
      outletId,
      kategoriMenuId,
      status: "AKTIF",
    },
    orderBy: { prioritas: "desc" },
  });

  return aturanKategori?.stasiunDapurId ?? null;
}

/**
 * Create kitchen tickets from an order.
 * Routes each order item to the appropriate station based on routing rules.
 * Creates one ticket per station (grouping items by destination).
 */
export async function createTicketFromOrder(
  db: PrismaClient,
  tenantId: string,
  data: {
    pesananId: string;
    outletId: string;
    nomorGelombang?: number;
  },
) {
  // Verify order exists
  const pesanan = await db.pesanan.findFirst({
    where: { id: data.pesananId, tenantId },
    include: {
      itemPesanan: {
        include: {
          itemMenu: {
            select: { id: true, kategoriId: true },
          },
        },
      },
    },
  });

  if (!pesanan) {
    throw new DapurError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  const nomorGelombang = data.nomorGelombang ?? 1;

  // Group items by target station
  const itemsByStation = new Map<
    string,
    { itemPesananId: string; itemMenuId: string }[]
  >();
  const ungroupedItems: { itemPesananId: string; itemMenuId: string }[] = [];

  for (const item of pesanan.itemPesanan) {
    const stasiunId = await resolveStasiunUntukItem(
      db,
      item.itemMenuId,
      item.itemMenu.kategoriId,
      data.outletId,
    );

    if (stasiunId) {
      const existing = itemsByStation.get(stasiunId) ?? [];
      existing.push({
        itemPesananId: item.id,
        itemMenuId: item.itemMenuId,
      });
      itemsByStation.set(stasiunId, existing);
    } else {
      ungroupedItems.push({
        itemPesananId: item.id,
        itemMenuId: item.itemMenuId,
      });
    }
  }

  // Create tickets per station
  const tickets = [];

  for (const [stasiunId, items] of itemsByStation) {
    // Check uniqueness constraint: one ticket per (pesanan, stasiun, gelombang)
    const existingTicket = await db.tiketDapur.findUnique({
      where: {
        pesananId_stasiunDapurId_nomorGelombang: {
          pesananId: data.pesananId,
          stasiunDapurId: stasiunId,
          nomorGelombang,
        },
      },
    });

    if (existingTicket) {
      tickets.push(existingTicket);
      continue;
    }

    const ticketId = generateId();
    const ticket = await db.tiketDapur.create({
      data: {
        id: ticketId,
        tenantId,
        outletId: data.outletId,
        pesananId: data.pesananId,
        stasiunDapurId: stasiunId,
        nomorGelombang,
        status: "BARU",
        baris: {
          create: items.map((item) => ({
            id: generateId(),
            itemPesananId: item.itemPesananId,
            statusMasak: "MENUNGGU",
          })),
        },
      },
      include: {
        stasiunDapur: { select: { id: true, nama: true } },
        baris: true,
      },
    });

    tickets.push(ticket);
  }

  // Create a ticket for ungrouped items (if any) — assigned to no specific station
  if (ungroupedItems.length > 0) {
    const ticketId = generateId();
    const ticket = await db.tiketDapur.create({
      data: {
        id: ticketId,
        tenantId,
        outletId: data.outletId,
        pesananId: data.pesananId,
        nomorGelombang,
        status: "BARU",
        baris: {
          create: ungroupedItems.map((item) => ({
            id: generateId(),
            itemPesananId: item.itemPesananId,
            statusMasak: "MENUNGGU",
          })),
        },
      },
      include: {
        stasiunDapur: { select: { id: true, nama: true } },
        baris: true,
      },
    });

    tickets.push(ticket);
  }

  return tickets;
}

/**
 * List kitchen tickets with optional filters.
 */
export async function listTiket(
  db: PrismaClient,
  options: {
    outletId?: string;
    stasiunDapurId?: string;
    status?: StatusTiketDapur;
    includeBaris?: boolean;
    includeRiwayat?: boolean;
  } = {},
): Promise<TiketDapurLengkap[]> {
  const where: Record<string, unknown> = {};

  if (options.outletId) {
    where.outletId = options.outletId;
  }

  if (options.stasiunDapurId) {
    where.stasiunDapurId = options.stasiunDapurId;
  }

  if (options.status) {
    where.status = options.status;
  }

  return db.tiketDapur.findMany({
    where,
    orderBy: { masukPada: "asc" },
    include: {
      stasiunDapur: { select: { id: true, nama: true } },
      ...(options.includeBaris ? { baris: true } : {}),
      ...(options.includeRiwayat
        ? {
            riwayatStatus: {
              orderBy: { createdAt: "desc" },
            },
          }
        : {}),
    },
  }) as Promise<TiketDapurLengkap[]>;
}

/**
 * Get a single kitchen ticket by ID.
 */
export async function getTiket(
  db: PrismaClient,
  id: string,
): Promise<TiketDapurLengkap | null> {
  return db.tiketDapur.findUnique({
    where: { id },
    include: {
      stasiunDapur: { select: { id: true, nama: true } },
      baris: true,
      riwayatStatus: {
        orderBy: { createdAt: "desc" },
      },
    },
  }) as Promise<TiketDapurLengkap | null>;
}

/**
 * Update kitchen ticket status with transition validation.
 * Records status change in RiwayatStatusTiketDapur.
 */
export async function updateTicketStatus(
  db: PrismaClient,
  data: {
    tiketDapurId: string;
    status: StatusTiketDapur;
    diubahOlehId?: string;
    alasanPembatalan?: string;
  },
) {
  const tiket = await db.tiketDapur.findUnique({
    where: { id: data.tiketDapurId },
  });

  if (!tiket) {
    throw new DapurError("Tiket dapur tidak ditemukan", "TIKET_NOT_FOUND");
  }

  // Validate transition
  const validNext = VALID_TRANSITIONS[tiket.status];
  if (!validNext.includes(data.status)) {
    throw new DapurError(
      `Transisi dari ${tiket.status} ke ${data.status} tidak valid`,
      "INVALID_TRANSITION",
    );
  }

  // If cancelling, alasan is required
  if (data.status === "DIBATALKAN" && !data.alasanPembatalan) {
    throw new DapurError(
      "Alasan pembatalan wajib diisi saat membatalkan tiket",
      "ALASAN_WAJIB_Saat_DIBATALKAN",
    );
  }

  // If marking SIAP, all baris must be SIAP
  if (data.status === "SIAP") {
    const barisCount = await db.tiketDapurBaris.count({
      where: {
        tiketDapurId: data.tiketDapurId,
        statusMasak: { not: "SIAP" },
      },
    });

    if (barisCount > 0) {
      throw new DapurError(
        "Semua baris harus SIAP sebelum tiket bisa ditandai SIAP",
        "SEMUA_BARIS_BELUM_SIAP",
      );
    }
  }

  const now = new Date();

  // Build update data based on status
  const updateData: Record<string, unknown> = {
    status: data.status,
    ...(data.status === "DIBATALKAN" && {
      alasanPembatalan: data.alasanPembatalan,
    }),
    ...(data.status === "SEDANG_DISIAPKAN" && {
      mulaiDiprosesPada: tiket.mulaiDiprosesPada ?? now,
    }),
    ...(data.status === "SIAP" && { siapPada: now }),
  };

  // Use transaction to update ticket + record history
  return db.$transaction(async (tx) => {
    const updated = await tx.tiketDapur.update({
      where: { id: data.tiketDapurId },
      data: updateData,
    });

    // Record status change
    await tx.riwayatStatusTiketDapur.create({
      data: {
        id: generateId(),
        tenantId: tiket.tenantId,
        tiketDapurId: data.tiketDapurId,
        statusSebelumnya: tiket.status,
        statusBaru: data.status,
        ...(data.diubahOlehId && { diubahOlehId: data.diubahOlehId }),
      },
    });

    return updated;
  });
}

/**
 * Update a single line item's cooking status.
 */
export async function updateBarisStatus(
  db: PrismaClient,
  tiketDapurBarisId: string,
  statusMasak: "MENUNGGU" | "DIMASAK" | "SIAP",
) {
  const baris = await db.tiketDapurBaris.findUnique({
    where: { id: tiketDapurBarisId },
  });

  if (!baris) {
    throw new DapurError("Baris tiket tidak ditemukan", "BARIS_NOT_FOUND");
  }

  return db.tiketDapurBaris.update({
    where: { id: tiketDapurBarisId },
    data: { statusMasak },
  });
}

/**
 * Get estimated prep time for a menu item (from recipe data).
 * Checks if a recipe exists for the item — returns a heuristic estimate
 * based on recipe complexity, or null if no recipe is defined.
 *
 * TODO: Add `estimasiMenit` field to Resep/VersiResep model for proper
 * prep time tracking. Currently returns null as a placeholder.
 */
export async function getItemPrepTime(
  _db: PrismaClient,
  _itemMenuId: string,
): Promise<number | null> {
  // TODO: Implement when Resep model gains an estimasiMenit field.
  // For now, return null to indicate no estimate available.
  return null;
}
