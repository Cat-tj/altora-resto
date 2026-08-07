/**
 * Order service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID() (Prisma models use
 * String @id without @default, so the app provides IDs).
 *
 * Status transitions are validated against the state machine before
 * any database writes. Payment invariants (SUM of allocations == SUM
 * of method lines == jumlah) are enforced within a single DB transaction.
 */

import type { PrismaClient } from "@prisma/client";
import {
  validateTransition,
  isTerminal,
  canAddItems,
  requiresApprovalForCancel,
  InvalidTransitionError,
} from "./status-machine.js";
import type {
  PesananLengkap,
  PembayaranLengkap,
  StatusPesanan,
} from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class OrderError extends Error {
  constructor(
    message: string,
    public code: OrderErrorCode,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export type OrderErrorCode =
  | "PESANAN_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "ITEM_MENU_NOT_FOUND"
  | "PESANAN_IS_TERMINAL"
  | "INVALID_TRANSITION"
  | "CANNOT_ADD_ITEMS"
  | "ITEM_NOT_IN_ORDER"
  | "OUTLET_NOT_IN_TENANT"
  | "MEJA_NOT_IN_OUTLET"
  | "PAYMENT_INVARIANT_FAILED"
  | "GILIRAN_KASIR_NOT_OPEN"
  | "GILIRAN_KASIR_NOT_FOUND"
  | "PEMBAYARAN_NOT_FOUND"
  | "ALREADY_FULLY_PAID"
  | "VERSION_CONFLICT"
  | "SPLIT_REQUIRES_MULTIPLE_ITEMS";

// ─── Include Helpers ────────────────────────────────────────────────────────

/** Standard includes for fetching a complete Pesanan with relations. */
const PESANAN_INCLUDE = {
  itemPesanan: {
    include: { modifier: true },
  },
  meja: { select: { id: true, nomor: true } },
  pelanggan: { select: { id: true, namaLengkap: true } },
} as const;

// ─── Generate Nomor Pesanan ─────────────────────────────────────────────────

/**
 * Generate a sequential order number for an outlet.
 * Format: yyyyMMdd/NNN (e.g., 20260806/001)
 */
async function generateNomorPesanan(
  db: PrismaClient,
  outletId: string,
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${dateStr}/`;

  const lastOrder = await db.pesanan.findFirst({
    where: {
      outletId,
      nomorPesanan: { startsWith: prefix },
    },
    orderBy: { nomorPesanan: "desc" },
    select: { nomorPesanan: true },
  });

  let seq = 1;
  if (lastOrder) {
    const parts = lastOrder.nomorPesanan.split("/");
    const lastPart = parts[parts.length - 1] ?? "0";
    const lastSeq = parseInt(lastPart, 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// ─── Create Pesanan ─────────────────────────────────────────────────────────

/**
 * Create a new order in DRAF status.
 *
 * For KASIR/PELAYAN channels, the order is created in DRAF and the caller
 * typically transitions it immediately to DIKIRIM or DIKONFIRMASI.
 * For QR_PELANGGAN, the order stays in DRAF while the customer builds it.
 */
export async function createPesanan(
  db: PrismaClient,
  tenantId: string,
  data: {
    outletId: string;
    mejaId?: string;
    pelangganId?: string;
    kanal: string;
    dibuatOlehId: string;
  },
): Promise<PesananLengkap> {
  const nomorPesanan = await generateNomorPesanan(db, data.outletId);

  const pesanan = await db.pesanan.create({
    data: {
      id: generateId(),
      tenantId,
      outletId: data.outletId,
      ...(data.mejaId != null && { mejaId: data.mejaId }),
      ...(data.pelangganId != null && { pelangganId: data.pelangganId }),
      kanal: data.kanal as "KASIR" | "PELAYAN" | "QR_PELANGGAN",
      nomorPesanan,
      status: "DRAF",
      dibuatOlehId: data.dibuatOlehId,
      subtotal: 0n,
      totalDiskon: 0n,
      totalPajak: 0n,
      totalServiceCharge: 0n,
      totalAkhir: 0n,
    },
    include: PESANAN_INCLUDE,
  });

  return pesanan as unknown as PesananLengkap;
}

// ─── Add Item ───────────────────────────────────────────────────────────────

/**
 * Add an item to an order. The order must be in a state that accepts items
 * (DRAF, DIKIRIM, or DITOLAK).
 *
 * Snapshots the item name, price, and modifier details at the time of
 * addition (ALT-DEF-016).
 */
export async function addItem(
  db: PrismaClient,
  data: {
    pesananId: string;
    itemMenuId: string;
    varianMenuId?: string;
    kuantitas: number;
    catatan?: string;
    modifier?: Array<{ modifierOpsiId: string; jumlah?: number }>;
  },
): Promise<PesananLengkap> {
  // Fetch the order
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: PESANAN_INCLUDE,
  });

  if (!pesanan) {
    throw new OrderError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  if (!canAddItems(pesanan.status as StatusPesanan)) {
    throw new OrderError(
      `Pesanan dalam status ${pesanan.status} tidak menerima item baru`,
      "CANNOT_ADD_ITEMS",
    );
  }

  // Fetch the menu item for snapshotting (with includes for harga & varian)
  const itemMenu = await db.itemMenu.findUnique({
    where: { id: data.itemMenuId },
    include: {
      hargaOutlet: {
        where: { outletId: pesanan.outletId },
        take: 1,
      },
      varian: data.varianMenuId
        ? { where: { id: data.varianMenuId } }
        : false,
    },
  });

  if (!itemMenu) {
    throw new OrderError("Item menu tidak ditemukan", "ITEM_MENU_NOT_FOUND");
  }

  // Determine price
  const hargaOutlet = itemMenu.hargaOutlet[0];
  const hargaDasar = hargaOutlet?.harga ?? 0n;
  let hargaVarian = 0n;
  if (data.varianMenuId && Array.isArray(itemMenu.varian) && itemMenu.varian[0]) {
    hargaVarian = itemMenu.varian[0].hargaTambahan;
  }
  const hargaSatuan = hargaDasar + hargaVarian;

  // Calculate modifier totals and snapshot
  let totalModifier = 0n;
  const modifierData: Array<{
    id: string;
    itemPesananId: string;
    modifierOpsiId: string;
    hargaTambahan: bigint;
    namaModifierSnapshot: string;
    hargaSnapshot: bigint;
    jumlah: number;
    totalSnapshot: bigint;
  }> = [];

  if (data.modifier && data.modifier.length > 0) {
    for (const mod of data.modifier) {
      const opsi = await db.modifierOpsi.findUnique({
        where: { id: mod.modifierOpsiId },
      });
      if (!opsi) {
        throw new OrderError("Opsi modifier tidak ditemukan", "ITEM_NOT_FOUND");
      }
      const jumlah = mod.jumlah ?? 1;
      const total = opsi.hargaTambahan * BigInt(jumlah);
      totalModifier += total;
      modifierData.push({
        id: generateId(),
        itemPesananId: "", // will be set after item creation
        modifierOpsiId: mod.modifierOpsiId,
        hargaTambahan: opsi.hargaTambahan,
        namaModifierSnapshot: opsi.nama,
        hargaSnapshot: opsi.hargaTambahan,
        jumlah,
        totalSnapshot: total,
      });
    }
  }

  const totalBaris =
    (hargaSatuan + totalModifier) * BigInt(data.kuantitas);

  // Create the order item with snapshots
  const itemPesanan = await db.itemPesanan.create({
    data: {
      id: generateId(),
      pesananId: data.pesananId,
      itemMenuId: data.itemMenuId,
      ...(data.varianMenuId && { varianMenuId: data.varianMenuId }),
      kuantitas: data.kuantitas,
      hargaSatuan,
      ...(data.catatan && { catatan: data.catatan }),
      status: "DRAF",
      // Snapshots (ALT-DEF-016)
      namaItemSnapshot: itemMenu.nama,
      namaVarianSnapshot:
        Array.isArray(itemMenu.varian) && itemMenu.varian[0]
          ? itemMenu.varian[0].nama
          : null,
      hargaDasarSnapshot: hargaDasar,
      hargaVarianSnapshot: hargaVarian,
      hargaModifierSnapshot: totalModifier,
      diskonSnapshot: 0n,
      pajakSnapshot: 0n,
      serviceChargeSnapshot: 0n,
      totalBarisSnapshot: totalBaris,
    },
  });

  // Create modifier rows
  if (modifierData.length > 0) {
    await db.itemPesananModifier.createMany({
      data: modifierData.map((m) => ({
        ...m,
        itemPesananId: itemPesanan.id,
      })),
    });
  }

  // Recalculate order totals
  await recalculateTotals(db, data.pesananId);

  // Re-fetch with relations
  const updated = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: PESANAN_INCLUDE,
  });

  return updated as unknown as PesananLengkap;
}

// ─── Remove Item ────────────────────────────────────────────────────────────

/**
 * Remove an item from an order. The order must still accept modifications.
 */
export async function removeItem(
  db: PrismaClient,
  data: {
    pesananId: string;
    itemPesananId: string;
  },
): Promise<PesananLengkap> {
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: PESANAN_INCLUDE,
  });

  if (!pesanan) {
    throw new OrderError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  if (!canAddItems(pesanan.status as StatusPesanan)) {
    throw new OrderError(
      `Pesanan dalam status ${pesanan.status} tidak bisa dimodifikasi`,
      "CANNOT_ADD_ITEMS",
    );
  }

  const item = pesanan.itemPesanan.find(
    (i: { id: string }) => i.id === data.itemPesananId,
  );
  if (!item) {
    throw new OrderError(
      "Item tidak ditemukan dalam pesanan",
      "ITEM_NOT_IN_ORDER",
    );
  }

  // Delete modifiers first, then the item
  await db.itemPesananModifier.deleteMany({
    where: { itemPesananId: data.itemPesananId },
  });

  await db.itemPesanan.delete({
    where: { id: data.itemPesananId },
  });

  // Recalculate totals
  await recalculateTotals(db, data.pesananId);

  // Re-fetch
  const updated = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: PESANAN_INCLUDE,
  });

  return updated as unknown as PesananLengkap;
}

// ─── Update Status ──────────────────────────────────────────────────────────

/**
 * Transition an order to a new status. Validates the transition against
 * the state machine, records the history, and handles side effects.
 */
export async function updateStatus(
  db: PrismaClient,
  data: {
    pesananId: string;
    statusBaru: StatusPesanan;
    diubahOlehId: string;
    alasan?: string;
  },
): Promise<PesananLengkap> {
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
  });

  if (!pesanan) {
    throw new OrderError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  if (isTerminal(pesanan.status as StatusPesanan)) {
    throw new OrderError(
      `Pesanan dalam status terminal ${pesanan.status} tidak bisa diubah`,
      "PESANAN_IS_TERMINAL",
    );
  }

  // Validate transition
  try {
    validateTransition(pesanan.status as StatusPesanan, data.statusBaru);
  } catch (e) {
    if (e instanceof InvalidTransitionError) {
      throw new OrderError(e.message, "INVALID_TRANSITION");
    }
    throw e;
  }

  // Use a transaction for status change + history recording
  const updated = await db.$transaction(async (tx) => {
    // Update status
    const pesananBaru = await tx.pesanan.update({
      where: { id: data.pesananId },
      data: {
        status: data.statusBaru,
        ...(data.statusBaru === "DIBATALKAN" && {
          dibatalkanPada: new Date(),
        }),
      },
      include: PESANAN_INCLUDE,
    });

    // Record status history
    await tx.pesananRiwayatStatus.create({
      data: {
        id: generateId(),
        pesananId: data.pesananId,
        statusSebelumnya: pesanan.status as StatusPesanan,
        statusBaru: data.statusBaru,
        diubahOlehId: data.diubahOlehId,
      },
    });

    // Record rejection if applicable
    if (data.statusBaru === "DITOLAK" && data.alasan) {
      await tx.pesananPenolakan.create({
        data: {
          id: generateId(),
          tenantId: pesanan.tenantId,
          pesananId: data.pesananId,
          alasan: data.alasan,
          ditolakOlehId: data.diubahOlehId,
        },
      });
    }

    // Record cancellation if applicable
    if (data.statusBaru === "DIBATALKAN" && data.alasan) {
      const isPostProduction = requiresApprovalForCancel(
        pesanan.status as StatusPesanan,
      );
      await tx.pesananPembatalan.create({
        data: {
          id: generateId(),
          tenantId: pesanan.tenantId,
          pesananId: data.pesananId,
          alasan: data.alasan,
          jenisPembatalan: isPostProduction ? "SETELAH_PRODUKSI" : "SEBELUM_PRODUKSI",
          dibatalkanOlehId: data.diubahOlehId,
        },
      });
    }

    return pesananBaru;
  });

  return updated as unknown as PesananLengkap;
}

// ─── Create Payment ─────────────────────────────────────────────────────────

/**
 * Create a payment event and allocate it to one or more orders.
 *
 * Enforces payment invariants in a single DB transaction:
 * 1. SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah
 * 2. SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah
 * 3. SUM(allocations per pesanan) <= Pesanan.totalAkhir
 */
export async function createPayment(
  db: PrismaClient,
  tenantId: string,
  data: {
    outletId: string;
    alokasi: Array<{ pesananId: string; jumlah: number }>;
    metodeBayar: Array<{ metodeBayarId: string; jumlah: number }>;
    totalDiterima: number;
    dikonfirmasiOlehId: string;
  },
): Promise<PembayaranLengkap> {
  const jumlah = data.metodeBayar.reduce((sum, m) => sum + m.jumlah, 0);
  const totalAlokasi = data.alokasi.reduce((sum, a) => sum + a.jumlah, 0);

  // Invariant: total methods == total allocation
  if (jumlah !== totalAlokasi) {
    throw new OrderError(
      `Total metode bayar (${jumlah}) tidak sama dengan total alokasi (${totalAlokasi})`,
      "PAYMENT_INVARIANT_FAILED",
    );
  }

  return db.$transaction(async (tx) => {
    // Create payment
    const pembayaran = await tx.pembayaran.create({
      data: {
        id: generateId(),
        tenantId,
        outletId: data.outletId,
        jumlah: BigInt(jumlah),
        totalDiterima: BigInt(data.totalDiterima),
        kembalian: BigInt(Math.max(0, data.totalDiterima - jumlah)),
        status: "DIBAYAR",
        dikonfirmasiOlehId: data.dikonfirmasiOlehId,
        dikonfirmasiPada: new Date(),
      },
    });

    // Create method lines
    await tx.pembayaranMetodeBaris.createMany({
      data: data.metodeBayar.map((m) => ({
        id: generateId(),
        tenantId,
        pembayaranId: pembayaran.id,
        metodeBayarId: m.metodeBayarId,
        jumlah: BigInt(m.jumlah),
      })),
    });

    // Create allocations
    await tx.alokasiPembayaran.createMany({
      data: data.alokasi.map((a) => ({
        id: generateId(),
        tenantId,
        pembayaranId: pembayaran.id,
        pesananId: a.pesananId,
        jumlah: BigInt(a.jumlah),
      })),
    });

    // Fetch complete payment
    const result = await tx.pembayaran.findUnique({
      where: { id: pembayaran.id },
      include: {
        alokasi: true,
        metodeBaris: true,
        struk: true,
      },
    });

    return result as unknown as PembayaranLengkap;
  });
}

// ─── Split Bill ─────────────────────────────────────────────────────────────

/**
 * Split an order into multiple new orders. Each split gets a subset of
 * items from the original order. The original order is cancelled.
 *
 * Items not assigned to any split are cancelled.
 */
export async function splitBill(
  db: PrismaClient,
  tenantId: string,
  data: {
    pesananId: string;
    splits: Array<{
      itemPesananIds: string[];
      targetMejaId?: string;
    }>;
  },
): Promise<PesananLengkap[]> {
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: {
      itemPesanan: { include: { modifier: true } },
    },
  });

  if (!pesanan) {
    throw new OrderError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  // Validate all item IDs belong to this order
  const allItemIds = new Set(pesanan.itemPesanan.map((i) => i.id));
  for (const split of data.splits) {
    for (const itemId of split.itemPesananIds) {
      if (!allItemIds.has(itemId)) {
        throw new OrderError(
          `Item ${itemId} tidak ditemukan dalam pesanan`,
          "ITEM_NOT_IN_ORDER",
        );
      }
    }
  }

  // Check no item appears in multiple splits
  const assignedItems = new Set<string>();
  for (const split of data.splits) {
    for (const itemId of split.itemPesananIds) {
      if (assignedItems.has(itemId)) {
        throw new OrderError(
          `Item ${itemId} diassign ke lebih dari satu split`,
          "SPLIT_REQUIRES_MULTIPLE_ITEMS",
        );
      }
      assignedItems.add(itemId);
    }
  }

  // Create new orders in a transaction
  const results = await db.$transaction(async (tx) => {
    const newOrders: PesananLengkap[] = [];

    for (let i = 0; i < data.splits.length; i++) {
      const split = data.splits[i]!;
      const nomorPesanan = await generateNomorPesanan(
        tx as unknown as PrismaClient,
        pesanan.outletId,
      );

      // Create new order
      const newPesanan = await tx.pesanan.create({
        data: {
          id: generateId(),
          tenantId,
          outletId: pesanan.outletId,
          ...(split.targetMejaId && { mejaId: split.targetMejaId }),
          ...(pesanan.pelangganId && { pelangganId: pesanan.pelangganId }),
          kanal: pesanan.kanal,
          nomorPesanan,
          status: "DIKONFIRMASI",
          dibuatOlehId: pesanan.dibuatOlehId,
          subtotal: 0n,
          totalDiskon: 0n,
          totalPajak: 0n,
          totalServiceCharge: 0n,
          totalAkhir: 0n,
        },
      });

      // Move items to new order
      for (const itemId of split.itemPesananIds) {
        await tx.itemPesanan.update({
          where: { id: itemId },
          data: { pesananId: newPesanan.id },
        });
      }

      // Record change on original order
      await tx.pesananPerubahan.create({
        data: {
          id: generateId(),
          tenantId,
          pesananId: pesanan.id,
          jenisPerubahan: "SPLIT",
          sebelum: { pesananId: pesanan.id },
          sesudah: { pesananId: newPesanan.id, itemPesananIds: split.itemPesananIds },
          diubahOlehId: pesanan.dibuatOlehId,
        },
      });

      // Recalculate totals for new order
      await recalculateTotals(tx as unknown as PrismaClient, newPesanan.id);

      // Fetch complete
      const complete = await tx.pesanan.findUnique({
        where: { id: newPesanan.id },
        include: PESANAN_INCLUDE,
      });

      newOrders.push(complete as unknown as PesananLengkap);
    }

    // Cancel the original order
    await tx.pesanan.update({
      where: { id: pesanan.id },
      data: {
        status: "DIBATALKAN",
        dibatalkanPada: new Date(),
      },
    });

    await tx.pesananRiwayatStatus.create({
      data: {
        id: generateId(),
        pesananId: pesanan.id,
        statusSebelumnya: pesanan.status as StatusPesanan,
        statusBaru: "DIBATALKAN",
        diubahOlehId: pesanan.dibuatOlehId,
      },
    });

    return newOrders;
  });

  return results;
}

// ─── List Pesanan ───────────────────────────────────────────────────────────

/**
 * List orders with optional filtering and pagination.
 */
export async function listPesanan(
  db: PrismaClient,
  options: {
    outletId?: string;
    status?: StatusPesanan[];
    kanal?: string;
    mejaId?: string;
    dariTanggal?: Date;
    sampaiTanggal?: Date;
    includeItems?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PesananLengkap[]> {
  const where: Record<string, unknown> = {};

  if (options.status && options.status.length > 0) {
    where.status = { in: options.status };
  }
  if (options.kanal) {
    where.kanal = options.kanal;
  }
  if (options.mejaId) {
    where.mejaId = options.mejaId;
  }
  if (options.dariTanggal || options.sampaiTanggal) {
    where.createdAt = {
      ...(options.dariTanggal && { gte: options.dariTanggal }),
      ...(options.sampaiTanggal && { lte: options.sampaiTanggal }),
    };
  }

  return db.pesanan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
    skip: options.offset ?? 0,
    include: {
      ...(options.includeItems
        ? { itemPesanan: { include: { modifier: true } } }
        : {}),
      meja: { select: { id: true, nomor: true } },
      pelanggan: { select: { id: true, namaLengkap: true } },
    },
  }) as Promise<PesananLengkap[]>;
}

// ─── Get Pesanan ────────────────────────────────────────────────────────────

/**
 * Get a single order by ID with optional related data.
 */
export async function getPesanan(
  db: PrismaClient,
  id: string,
  options: {
    includeItems?: boolean;
    includePembayaran?: boolean;
    includeRiwayat?: boolean;
  } = {},
): Promise<PesananLengkap | null> {
  return db.pesanan.findUnique({
    where: { id },
    include: {
      itemPesanan: options.includeItems
        ? { include: { modifier: true } }
        : false,
      meja: { select: { id: true, nomor: true } },
      pelanggan: { select: { id: true, namaLengkap: true } },
      ...(options.includePembayaran
        ? {
            alokasiPembayaran: {
              include: {
                pembayaran: {
                  include: {
                    metodeBaris: true,
                    struk: true,
                  },
                },
              },
            },
          }
        : {}),
      ...(options.includeRiwayat
        ? { riwayatStatus: { orderBy: { createdAt: "desc" } } }
        : {}),
    },
  }) as Promise<PesananLengkap | null>;
}

// ─── Get Active Orders (POS) ────────────────────────────────────────────────

/**
 * Get all active (non-terminal) orders for the POS/KDS display.
 * Active = status in [DIKONFIRMASI, DIKIRIM_KE_DAPUR, SEDANG_DISIAPKAN, SIAP, DISAJIKAN].
 */
export async function getActiveOrders(
  db: PrismaClient,
  options: {
    outletId?: string;
    kanal?: string;
  } = {},
): Promise<PesananLengkap[]> {
  const ACTIVE_STATUSES: StatusPesanan[] = [
    "DIKONFIRMASI",
    "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
  ];

  const where: Record<string, unknown> = {
    status: { in: ACTIVE_STATUSES },
  };

  if (options.kanal) {
    where.kanal = options.kanal;
  }

  return db.pesanan.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: PESANAN_INCLUDE,
  }) as Promise<PesananLengkap[]>;
}

// ─── Kasir Checkout ─────────────────────────────────────────────────────────

/**
 * Full POS checkout: validates the order, creates payment, transitions
 * the order to SELESAI, and records the transaction.
 */
export async function kasirCheckout(
  db: PrismaClient,
  tenantId: string,
  data: {
    pesananId: string;
    metodeBayar: Array<{ metodeBayarId: string; jumlah: number }>;
    totalDiterima: number;
    giliranKasirId?: string;
  },
): Promise<{ pesanan: PesananLengkap; pembayaran: PembayaranLengkap }> {
  const pesanan = await db.pesanan.findUnique({
    where: { id: data.pesananId },
    include: {
      itemPesanan: { include: { modifier: true } },
    },
  });

  if (!pesanan) {
    throw new OrderError("Pesanan tidak ditemukan", "PESANAN_NOT_FOUND");
  }

  // Must be in a payable status
  const payableStatuses: StatusPesanan[] = [
    "DIKONFIRMASI",
    "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
  ];
  if (!payableStatuses.includes(pesanan.status as StatusPesanan)) {
    throw new OrderError(
      `Pesanan dalam status ${pesanan.status} tidak bisa dibayar`,
      "INVALID_TRANSITION",
    );
  }

  // Calculate total from items
  const totalBayar = Number(pesanan.totalAkhir);
  const jumlahBayar = data.metodeBayar.reduce((s, m) => s + m.jumlah, 0);

  if (jumlahBayar < totalBayar) {
    throw new OrderError(
      `Jumlah bayar (${jumlahBayar}) kurang dari total akhir (${totalBayar})`,
      "PAYMENT_INVARIANT_FAILED",
    );
  }

  // Checkout in transaction
  return db.$transaction(async (tx) => {
    // Create payment
    const pembayaran = await tx.pembayaran.create({
      data: {
        id: generateId(),
        tenantId,
        outletId: pesanan.outletId,
        jumlah: BigInt(totalBayar),
        totalDiterima: BigInt(data.totalDiterima),
        kembalian: BigInt(Math.max(0, data.totalDiterima - totalBayar)),
        status: "DIBAYAR",
        dikonfirmasiOlehId: pesanan.dibuatOlehId,
        dikonfirmasiPada: new Date(),
      },
    });

    // Create method lines
    await tx.pembayaranMetodeBaris.createMany({
      data: data.metodeBayar.map((m) => ({
        id: generateId(),
        tenantId,
        pembayaranId: pembayaran.id,
        metodeBayarId: m.metodeBayarId,
        jumlah: BigInt(m.jumlah),
      })),
    });

    // Create allocation (full amount to this order)
    await tx.alokasiPembayaran.create({
      data: {
        id: generateId(),
        tenantId,
        pembayaranId: pembayaran.id,
        pesananId: pesanan.id,
        jumlah: BigInt(totalBayar),
      },
    });

    // Transition order to SELESAI
    await tx.pesanan.update({
      where: { id: pesanan.id },
      data: { status: "SELESAI" },
    });

    // Record status change
    await tx.pesananRiwayatStatus.create({
      data: {
        id: generateId(),
        pesananId: pesanan.id,
        statusSebelumnya: pesanan.status as StatusPesanan,
        statusBaru: "SELESAI",
        diubahOlehId: pesanan.dibuatOlehId,
      },
    });

    // Record cashier transaction if giliranKasirId provided
    if (data.giliranKasirId) {
      await tx.transaksiKasir.create({
        data: {
          id: generateId(),
          giliranKasirId: data.giliranKasirId,
          pesananId: pesanan.id,
          jenis: "PENJUALAN",
          jumlah: BigInt(totalBayar),
        },
      });
    }

    // Fetch complete data
    const [pesananBaru, pembayaranLengkap] = await Promise.all([
      tx.pesanan.findUnique({
        where: { id: pesanan.id },
        include: PESANAN_INCLUDE,
      }),
      tx.pembayaran.findUnique({
        where: { id: pembayaran.id },
        include: {
          alokasi: true,
          metodeBaris: true,
          struk: true,
        },
      }),
    ]);

    return {
      pesanan: pesananBaru as unknown as PesananLengkap,
      pembayaran: pembayaranLengkap as unknown as PembayaranLengkap,
    };
  });
}

// ─── Recalculate Totals ─────────────────────────────────────────────────────

/**
 * Recalculate order totals from line items. Called after adding/removing items.
 * This is a helper — not exposed as a public API.
 */
async function recalculateTotals(
  db: PrismaClient,
  pesananId: string,
): Promise<void> {
  const items = await db.itemPesanan.findMany({
    where: { pesananId },
    include: { modifier: true },
  });

  let subtotal = 0n;
  for (const item of items) {
    subtotal += item.totalBarisSnapshot;
  }

  await db.pesanan.update({
    where: { id: pesananId },
    data: {
      subtotal,
      totalAkhir: subtotal, // Simplified — tax/discount logic is per-tenant config
    },
  });
}
