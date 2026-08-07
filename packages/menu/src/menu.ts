/**
 * Menu service layer for Altora Resto.
 *
 * All operations are tenant-scoped — the caller must provide a
 * tenant-scoped PrismaClient (via createTenantDb) for reads,
 * and the tenantId explicitly for writes.
 *
 * IDs are generated using crypto.randomUUID() (Prisma models use
 * String @id without @default, so the app provides IDs).
 */

import type { PrismaClient } from "@prisma/client";
import type {
  KategoriMenuDenganItem,
  ItemMenuLengkap,
  ItemMenuDenganHarga,
} from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for Prisma models. */
function generateId(): string {
  return crypto.randomUUID();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class MenuError extends Error {
  constructor(
    message: string,
    public code: MenuErrorCode,
  ) {
    super(message);
    this.name = "MenuError";
  }
}

export type MenuErrorCode =
  | "KATEGORI_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "VARIAN_NOT_FOUND"
  | "MODIFIER_GRUP_NOT_FOUND"
  | "MODIFIER_OPSI_NOT_FOUND"
  | "HARGA_NOT_FOUND"
  | "KATEGORI_HAS_ITEMS"
  | "ITEM_HAS_VARIAN"
  | "ITEM_HAS_MODIFIERS"
  | "ITEM_HAS_PESANAN"
  | "DUPLICATE_NAMA"
  | "OUTLET_NOT_IN_TENANT";

// ─── Kategori Menu ─────────────────────────────────────────────────────────

/**
 * List all categories for the tenant.
 * The db parameter should be a tenant-scoped PrismaClient.
 */
export async function listKategori(
  db: PrismaClient,
  options: { includeItems?: boolean; includeNonActive?: boolean } = {},
): Promise<KategoriMenuDenganItem[]> {
  const where: Record<string, unknown> = {};

  if (!options.includeNonActive) {
    where.status = "AKTIF";
  }

  return db.kategoriMenu.findMany({
    where,
    orderBy: { urutan: "asc" },
    ...(options.includeItems
      ? {
          include: {
            itemMenu: {
              orderBy: { nama: "asc" },
              ...(options.includeNonActive
                ? {}
                : { where: { status: { not: "NONAKTIF" } } }),
            },
          },
        }
      : {}),
  }) as Promise<KategoriMenuDenganItem[]>;
}

/**
 * Get a single category by ID.
 */
export async function getKategori(
  db: PrismaClient,
  id: string,
): Promise<KategoriMenuDenganItem | null> {
  return db.kategoriMenu.findUnique({
    where: { id },
    include: {
      itemMenu: { orderBy: { nama: "asc" } },
    },
  }) as Promise<KategoriMenuDenganItem | null>;
}

/**
 * Create a new category.
 * @param tenantId — the tenant this category belongs to (from ctx)
 */
export async function createKategori(
  db: PrismaClient,
  tenantId: string,
  data: { nama: string; urutan?: number | undefined; outletId?: string },
) {
  return db.kategoriMenu.create({
    data: {
      id: generateId(),
      tenantId,
      nama: data.nama.trim(),
      urutan: data.urutan ?? 0,
      ...(data.outletId != null && { outletId: data.outletId }),
    },
  });
}

/**
 * Update an existing category.
 */
export async function updateKategori(
  db: PrismaClient,
  id: string,
  data: { nama?: string; urutan?: number | undefined; status?: string | undefined; outletId?: string },
) {
  const existing = await db.kategoriMenu.findUnique({ where: { id } });

  if (!existing) {
    throw new MenuError("Kategori tidak ditemukan", "KATEGORI_NOT_FOUND");
  }

  return db.kategoriMenu.update({
    where: { id },
    data: {
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
      ...(data.urutan !== undefined && { urutan: data.urutan }),
      ...(data.status !== undefined && {
        status: data.status as "AKTIF" | "NONAKTIF",
      }),
      ...(data.outletId !== undefined && { outletId: data.outletId }),
    },
  });
}

/**
 * Soft-delete a category by setting status to NONAKTIF.
 * Only allowed if no active items belong to it.
 */
export async function deleteKategori(db: PrismaClient, id: string) {
  const existing = await db.kategoriMenu.findUnique({ where: { id } });

  if (!existing) {
    throw new MenuError("Kategori tidak ditemukan", "KATEGORI_NOT_FOUND");
  }

  const itemCount = await db.itemMenu.count({
    where: {
      kategoriId: id,
      status: { not: "NONAKTIF" },
    },
  });

  if (itemCount > 0) {
    throw new MenuError(
      `Kategori masih memiliki ${itemCount} item aktif. Nonaktifkan item terlebih dahulu.`,
      "KATEGORI_HAS_ITEMS",
    );
  }

  return db.kategoriMenu.update({
    where: { id },
    data: { status: "NONAKTIF" },
  });
}

// ─── Item Menu ──────────────────────────────────────────────────────────────

/**
 * List all menu items for the tenant, optionally filtered by category.
 */
export async function listItem(
  db: PrismaClient,
  options: {
    kategoriId?: string;
    includeRelations?: boolean;
    includeNonActive?: boolean;
  } = {},
): Promise<ItemMenuLengkap[]> {
  const where: Record<string, unknown> = {};

  if (options.kategoriId) {
    where.kategoriId = options.kategoriId;
  }

  if (!options.includeNonActive) {
    where.status = { not: "NONAKTIF" };
  }

  return db.itemMenu.findMany({
    where,
    orderBy: { nama: "asc" },
    include: {
      kategori: { select: { id: true, nama: true } },
      varian: {
        orderBy: { nama: "asc" },
        ...(options.includeNonActive
          ? {}
          : { where: { status: "AKTIF" } }),
      },
      ...(options.includeRelations
        ? {
            modifierGrup: {
              orderBy: { urutan: "asc" },
              include: {
                modifierGrup: {
                  include: {
                    opsi: {
                      orderBy: { nama: "asc" },
                      ...(options.includeNonActive
                        ? {}
                        : { where: { status: "AKTIF" } }),
                    },
                  },
                },
              },
            },
            hargaOutlet: true,
          }
        : {}),
    },
  }) as Promise<ItemMenuLengkap[]>;
}

/**
 * Get a single item by ID with all relations.
 */
export async function getItem(
  db: PrismaClient,
  id: string,
): Promise<ItemMenuLengkap | null> {
  return db.itemMenu.findUnique({
    where: { id },
    include: {
      kategori: { select: { id: true, nama: true } },
      varian: { orderBy: { nama: "asc" } },
      modifierGrup: {
        orderBy: { urutan: "asc" },
        include: {
          modifierGrup: {
            include: {
              opsi: { orderBy: { nama: "asc" } },
            },
          },
        },
      },
      hargaOutlet: true,
    },
  }) as Promise<ItemMenuLengkap | null>;
}

/**
 * List items with outlet-specific pricing.
 */
export async function listItemDenganHarga(
  db: PrismaClient,
  options: {
    kategoriId?: string;
    outletId?: string | undefined;
    includeNonActive?: boolean;
  } = {},
): Promise<ItemMenuDenganHarga[]> {
  const where: Record<string, unknown> = {};

  if (options.kategoriId) {
    where.kategoriId = options.kategoriId;
  }

  if (!options.includeNonActive) {
    where.status = { not: "NONAKTIF" };
  }

  return db.itemMenu.findMany({
    where,
    orderBy: { nama: "asc" },
    include: {
      kategori: { select: { id: true, nama: true } },
      hargaOutlet: options.outletId
        ? { where: { outletId: options.outletId } }
        : true,
    },
  }) as Promise<ItemMenuDenganHarga[]>;
}

/**
 * Create a new menu item.
 * @param tenantId — the tenant this item belongs to (from ctx)
 */
export async function createItem(
  db: PrismaClient,
  tenantId: string,
  data: {
    kategoriId: string;
    nama: string;
    deskripsi?: string | undefined;
    gambarUrl?: string | undefined;
    stokTakTerbatas?: boolean | undefined;
    status?: string | undefined;
  },
) {
  // Verify category exists in the same tenant
  const kategori = await db.kategoriMenu.findUnique({
    where: { id: data.kategoriId },
  });

  if (!kategori) {
    throw new MenuError("Kategori tidak ditemukan", "KATEGORI_NOT_FOUND");
  }

  return db.itemMenu.create({
    data: {
      id: generateId(),
      tenantId,
      kategoriId: data.kategoriId,
      nama: data.nama.trim(),
      ...(data.deskripsi != null && { deskripsi: data.deskripsi.trim() }),
      ...(data.gambarUrl != null && { gambarUrl: data.gambarUrl }),
      stokTakTerbatas: data.stokTakTerbatas ?? true,
      status: (data.status as "AKTIF" | "NONAKTIF" | "HABIS") ?? "AKTIF",
    },
  });
}

/**
 * Update an existing menu item.
 */
export async function updateItem(
  db: PrismaClient,
  id: string,
  data: {
    kategoriId?: string;
    nama?: string;
    deskripsi?: string | undefined;
    gambarUrl?: string | undefined;
    stokTakTerbatas?: boolean | undefined;
    status?: string | undefined;
  },
) {
  const existing = await db.itemMenu.findUnique({ where: { id } });

  if (!existing) {
    throw new MenuError("Item tidak ditemukan", "ITEM_NOT_FOUND");
  }

  // If changing category, verify new category exists
  if (data.kategoriId) {
    const kategori = await db.kategoriMenu.findUnique({
      where: { id: data.kategoriId },
    });
    if (!kategori) {
      throw new MenuError("Kategori tidak ditemukan", "KATEGORI_NOT_FOUND");
    }
  }

  return db.itemMenu.update({
    where: { id },
    data: {
      ...(data.kategoriId !== undefined && { kategoriId: data.kategoriId }),
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
      ...(data.deskripsi !== undefined && {
        deskripsi: data.deskripsi?.trim(),
      }),
      ...(data.gambarUrl !== undefined && { gambarUrl: data.gambarUrl }),
      ...(data.stokTakTerbatas !== undefined && {
        stokTakTerbatas: data.stokTakTerbatas,
      }),
      ...(data.status !== undefined && {
        status: data.status as "AKTIF" | "NONAKTIF" | "HABIS",
      }),
    },
  });
}

/**
 * Soft-delete an item by setting status to NONAKTIF.
 */
export async function deleteItem(db: PrismaClient, id: string) {
  const existing = await db.itemMenu.findUnique({ where: { id } });

  if (!existing) {
    throw new MenuError("Item tidak ditemukan", "ITEM_NOT_FOUND");
  }

  return db.itemMenu.update({
    where: { id },
    data: { status: "NONAKTIF" },
  });
}

// ─── Varian Menu ────────────────────────────────────────────────────────────

/**
 * Create a new variant for a menu item.
 */
export async function createVarian(
  db: PrismaClient,
  data: { itemMenuId: string; nama: string; hargaTambahan?: bigint },
) {
  const item = await db.itemMenu.findUnique({
    where: { id: data.itemMenuId },
  });
  if (!item) {
    throw new MenuError("Item tidak ditemukan", "ITEM_NOT_FOUND");
  }

  return db.varianMenu.create({
    data: {
      id: generateId(),
      itemMenuId: data.itemMenuId,
      nama: data.nama.trim(),
      hargaTambahan: data.hargaTambahan ?? 0n,
    },
  });
}

/**
 * Update an existing variant.
 */
export async function updateVarian(
  db: PrismaClient,
  id: string,
  data: { nama?: string; hargaTambahan?: bigint | undefined; status?: string },
) {
  const existing = await db.varianMenu.findUnique({ where: { id } });
  if (!existing) {
    throw new MenuError("Varian tidak ditemukan", "VARIAN_NOT_FOUND");
  }

  return db.varianMenu.update({
    where: { id },
    data: {
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
      ...(data.hargaTambahan !== undefined && {
        hargaTambahan: data.hargaTambahan,
      }),
      ...(data.status !== undefined && {
        status: data.status as "AKTIF" | "NONAKTIF",
      }),
    },
  });
}

/**
 * Soft-delete a variant.
 */
export async function deleteVarian(db: PrismaClient, id: string) {
  const existing = await db.varianMenu.findUnique({ where: { id } });
  if (!existing) {
    throw new MenuError("Varian tidak ditemukan", "VARIAN_NOT_FOUND");
  }

  return db.varianMenu.update({
    where: { id },
    data: { status: "NONAKTIF" },
  });
}

// ─── Modifier Grup ──────────────────────────────────────────────────────────

/**
 * List all modifier groups for the tenant.
 */
export async function listModifierGrup(db: PrismaClient) {
  return db.modifierGrup.findMany({
    orderBy: { nama: "asc" },
    include: {
      opsi: {
        orderBy: { nama: "asc" },
        where: { status: "AKTIF" },
      },
    },
  });
}

/**
 * Create a new modifier group.
 * @param tenantId — the tenant this modifier group belongs to (from ctx)
 */
export async function createModifierGrup(
  db: PrismaClient,
  tenantId: string,
  data: {
    nama: string;
    wajibPilih?: boolean | undefined;
    minPilihan?: number | undefined;
    maxPilihan?: number | undefined;
  },
) {
  return db.modifierGrup.create({
    data: {
      id: generateId(),
      tenantId,
      nama: data.nama.trim(),
      wajibPilih: data.wajibPilih ?? false,
      minPilihan: data.minPilihan ?? 0,
      maxPilihan: data.maxPilihan ?? 1,
    },
  });
}

/**
 * Update an existing modifier group.
 */
export async function updateModifierGrup(
  db: PrismaClient,
  id: string,
  data: {
    nama?: string;
    wajibPilih?: boolean | undefined;
    minPilihan?: number | undefined;
    maxPilihan?: number | undefined;
  },
) {
  const existing = await db.modifierGrup.findUnique({ where: { id } });
  if (!existing) {
    throw new MenuError(
      "Grup modifier tidak ditemukan",
      "MODIFIER_GRUP_NOT_FOUND",
    );
  }

  return db.modifierGrup.update({
    where: { id },
    data: {
      ...(data.nama !== undefined && { nama: data.nama.trim() }),
      ...(data.wajibPilih !== undefined && { wajibPilih: data.wajibPilih }),
      ...(data.minPilihan !== undefined && { minPilihan: data.minPilihan }),
      ...(data.maxPilihan !== undefined && { maxPilihan: data.maxPilihan }),
    },
  });
}

/**
 * Delete a modifier group and all its options.
 */
export async function deleteModifierGrup(db: PrismaClient, id: string) {
  const existing = await db.modifierGrup.findUnique({ where: { id } });
  if (!existing) {
    throw new MenuError(
      "Grup modifier tidak ditemukan",
      "MODIFIER_GRUP_NOT_FOUND",
    );
  }

  // Check if any items use this modifier group
  const usageCount = await db.itemModifierGrup.count({
    where: { modifierGrupId: id },
  });

  if (usageCount > 0) {
    throw new MenuError(
      `Grup modifier masih digunakan oleh ${usageCount} item.`,
      "ITEM_HAS_MODIFIERS",
    );
  }

  // Delete options first, then the group
  await db.modifierOpsi.deleteMany({ where: { modifierGrupId: id } });
  return db.modifierGrup.delete({ where: { id } });
}

// ─── Modifier Opsi ──────────────────────────────────────────────────────────

/**
 * Create or update an option in a modifier group.
 * If an option with the same name exists, it's updated.
 */
export async function setModifierOpsi(
  db: PrismaClient,
  data: {
    modifierGrupId: string;
    nama: string;
    hargaTambahan?: bigint | undefined;
    status?: string | undefined;
  },
) {
  const grup = await db.modifierGrup.findUnique({
    where: { id: data.modifierGrupId },
  });
  if (!grup) {
    throw new MenuError(
      "Grup modifier tidak ditemukan",
      "MODIFIER_GRUP_NOT_FOUND",
    );
  }

  // Upsert by (modifierGrupId, nama) — find existing first
  const existing = await db.modifierOpsi.findFirst({
    where: {
      modifierGrupId: data.modifierGrupId,
      nama: data.nama.trim(),
    },
  });

  if (existing) {
    return db.modifierOpsi.update({
      where: { id: existing.id },
      data: {
        hargaTambahan: data.hargaTambahan ?? existing.hargaTambahan,
        ...(data.status !== undefined && {
          status: data.status as "AKTIF" | "NONAKTIF",
        }),
      },
    });
  }

  return db.modifierOpsi.create({
    data: {
      id: generateId(),
      modifierGrupId: data.modifierGrupId,
      nama: data.nama.trim(),
      hargaTambahan: data.hargaTambahan ?? 0n,
    },
  });
}

/**
 * Delete a modifier option.
 */
export async function deleteModifierOpsi(db: PrismaClient, id: string) {
  const existing = await db.modifierOpsi.findUnique({ where: { id } });
  if (!existing) {
    throw new MenuError(
      "Opsi modifier tidak ditemukan",
      "MODIFIER_OPSI_NOT_FOUND",
    );
  }

  return db.modifierOpsi.delete({ where: { id } });
}

// ─── Item ↔ Modifier Grup ──────────────────────────────────────────────────

/**
 * Attach a modifier group to an item.
 */
export async function attachModifierGrup(
  db: PrismaClient,
  data: { itemMenuId: string; modifierGrupId: string; urutan?: number },
) {
  const item = await db.itemMenu.findUnique({ where: { id: data.itemMenuId } });
  if (!item) {
    throw new MenuError("Item tidak ditemukan", "ITEM_NOT_FOUND");
  }

  const grup = await db.modifierGrup.findUnique({
    where: { id: data.modifierGrupId },
  });
  if (!grup) {
    throw new MenuError(
      "Grup modifier tidak ditemukan",
      "MODIFIER_GRUP_NOT_FOUND",
    );
  }

  // Upsert to handle reordering
  const existing = await db.itemModifierGrup.findUnique({
    where: {
      itemMenuId_modifierGrupId: {
        itemMenuId: data.itemMenuId,
        modifierGrupId: data.modifierGrupId,
      },
    },
  });

  if (existing) {
    return db.itemModifierGrup.update({
      where: { id: existing.id },
      data: { urutan: data.urutan ?? existing.urutan },
    });
  }

  return db.itemModifierGrup.create({
    data: {
      id: generateId(),
      itemMenuId: data.itemMenuId,
      modifierGrupId: data.modifierGrupId,
      urutan: data.urutan ?? 0,
    },
  });
}

/**
 * Detach a modifier group from an item.
 */
export async function detachModifierGrup(
  db: PrismaClient,
  data: { itemMenuId: string; modifierGrupId: string },
) {
  return db.itemModifierGrup.delete({
    where: {
      itemMenuId_modifierGrupId: {
        itemMenuId: data.itemMenuId,
        modifierGrupId: data.modifierGrupId,
      },
    },
  });
}

// ─── Harga Item Outlet ──────────────────────────────────────────────────────

/**
 * Set price for an item at a specific outlet (upsert).
 * @param tenantId — the tenant this pricing belongs to (from ctx)
 */
export async function setHargaItemOutlet(
  db: PrismaClient,
  tenantId: string,
  data: { itemMenuId: string; outletId: string; harga: bigint },
) {
  const item = await db.itemMenu.findUnique({ where: { id: data.itemMenuId } });
  if (!item) {
    throw new MenuError("Item tidak ditemukan", "ITEM_NOT_FOUND");
  }

  // Verify outlet exists in the same tenant
  const outlet = await db.outlet.findUnique({ where: { id: data.outletId } });
  if (!outlet) {
    throw new MenuError("Outlet tidak ditemukan", "OUTLET_NOT_IN_TENANT");
  }

  const existing = await db.hargaItemOutlet.findFirst({
    where: {
      itemMenuId: data.itemMenuId,
      outletId: data.outletId,
    },
  });

  if (existing) {
    return db.hargaItemOutlet.update({
      where: { id: existing.id },
      data: { harga: data.harga },
    });
  }

  return db.hargaItemOutlet.create({
    data: {
      id: generateId(),
      tenantId,
      itemMenuId: data.itemMenuId,
      outletId: data.outletId,
      harga: data.harga,
    },
  });
}

/**
 * Remove price for an item at a specific outlet.
 */
export async function removeHargaItemOutlet(
  db: PrismaClient,
  data: { itemMenuId: string; outletId: string },
) {
  const existing = await db.hargaItemOutlet.findFirst({
    where: {
      itemMenuId: data.itemMenuId,
      outletId: data.outletId,
    },
  });

  if (!existing) {
    throw new MenuError(
      "Harga untuk item ini di outlet ini tidak ditemukan",
      "HARGA_NOT_FOUND",
    );
  }

  return db.hargaItemOutlet.delete({ where: { id: existing.id } });
}
