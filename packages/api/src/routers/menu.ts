/**
 * Menu tRPC router for Altora Resto.
 *
 * Endpoints:
 * - menu.kategori.list: List all categories (with optional items)
 * - menu.kategori.create: Create a new category
 * - menu.kategori.update: Update a category
 * - menu.kategori.delete: Soft-delete a category
 * - menu.item.list: List all menu items
 * - menu.item.get: Get a single item with all relations
 * - menu.item.withHarga: List items with outlet-specific pricing
 * - menu.item.create: Create a new menu item
 * - menu.item.update: Update a menu item
 * - menu.item.delete: Soft-delete a menu item
 * - menu.varian.create: Create a variant for an item
 * - menu.varian.update: Update a variant
 * - menu.varian.delete: Soft-delete a variant
 * - menu.modifier.list: List all modifier groups
 * - menu.modifier.create: Create a modifier group
 * - menu.modifier.update: Update a modifier group
 * - menu.modifier.delete: Delete a modifier group
 * - menu.modifier.opsi.set: Create/update a modifier option
 * - menu.modifier.opsi.delete: Delete a modifier option
 * - menu.modifier.attach: Attach a modifier group to an item
 * - menu.modifier.detach: Detach a modifier group from an item
 * - menu.harga.set: Set price for an item at an outlet
 * - menu.harga.remove: Remove price for an item at an outlet
 */

import { z } from "zod";
import { router, tenantProcedure, TRPCError } from "../trpc"
import {
  // Kategori
  listKategori,
  getKategori,
  createKategori,
  updateKategori,
  deleteKategori,
  // Item
  listItem,
  getItem,
  listItemDenganHarga,
  createItem,
  updateItem,
  deleteItem,
  // Varian
  createVarian,
  updateVarian,
  deleteVarian,
  // Modifier
  listModifierGrup,
  createModifierGrup,
  updateModifierGrup,
  deleteModifierGrup,
  setModifierOpsi,
  deleteModifierOpsi,
  // Item ↔ Modifier
  attachModifierGrup,
  detachModifierGrup,
  // Harga
  setHargaItemOutlet,
  removeHargaItemOutlet,
  // Errors
  MenuError,
} from "@altora/menu";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const listKategoriSchema = z.object({
  includeItems: z.boolean().default(false),
  includeNonActive: z.boolean().default(false),
});

const createKategoriSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama kategori tidak boleh kosong")
    .max(100, "Nama kategori maksimal 100 karakter"),
  urutan: z.number().int().min(0).optional(),
  outletId: z.string().optional(),
});

const updateKategoriSchema = z.object({
  id: z.string().min(1, "ID kategori tidak valid"),
  nama: z
    .string()
    .min(1, "Nama kategori tidak boleh kosong")
    .max(100, "Nama kategori maksimal 100 karakter")
    .optional(),
  urutan: z.number().int().min(0).optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
  outletId: z.string().optional(),
});

const deleteKategoriSchema = z.object({
  id: z.string().min(1, "ID kategori tidak valid"),
});

const listItemsSchema = z.object({
  kategoriId: z.string().optional(),
  includeRelations: z.boolean().default(false),
  includeNonActive: z.boolean().default(false),
});

const getItemSchema = z.object({
  id: z.string().min(1, "ID item tidak valid"),
});

const listItemDenganHargaSchema = z.object({
  kategoriId: z.string().optional(),
  outletId: z.string().optional(),
  includeNonActive: z.boolean().default(false),
});

const createItemSchema = z.object({
  kategoriId: z.string().min(1, "ID kategori tidak valid"),
  nama: z
    .string()
    .min(1, "Nama item tidak boleh kosong")
    .max(200, "Nama item maksimal 200 karakter"),
  deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
  gambarUrl: z.string().url("URL gambar tidak valid").optional(),
  stokTakTerbatas: z.boolean().optional(),
  status: z.enum(["AKTIF", "NONAKTIF", "HABIS"]).optional(),
});

const updateItemSchema = z.object({
  id: z.string().min(1, "ID item tidak valid"),
  kategoriId: z.string().min(1, "ID kategori tidak valid").optional(),
  nama: z
    .string()
    .min(1, "Nama item tidak boleh kosong")
    .max(200, "Nama item maksimal 200 karakter")
    .optional(),
  deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
  gambarUrl: z.string().url("URL gambar tidak valid").optional(),
  stokTakTerbatas: z.boolean().optional(),
  status: z.enum(["AKTIF", "NONAKTIF", "HABIS"]).optional(),
});

const deleteItemSchema = z.object({
  id: z.string().min(1, "ID item tidak valid"),
});

const createVarianSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  nama: z
    .string()
    .min(1, "Nama varian tidak boleh kosong")
    .max(100, "Nama varian maksimal 100 karakter"),
  hargaTambahan: z.number().int().min(0).optional(),
});

const updateVarianSchema = z.object({
  id: z.string().min(1, "ID varian tidak valid"),
  nama: z
    .string()
    .min(1, "Nama varian tidak boleh kosong")
    .max(100, "Nama varian maksimal 100 karakter")
    .optional(),
  hargaTambahan: z.number().int().min(0).optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

const deleteVarianSchema = z.object({
  id: z.string().min(1, "ID varian tidak valid"),
});

const listModifierGrupSchema = z.object({});

const createModifierGrupSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama grup modifier tidak boleh kosong")
    .max(100, "Nama grup modifier maksimal 100 karakter"),
  wajibPilih: z.boolean().optional(),
  minPilihan: z.number().int().min(0).optional(),
  maxPilihan: z.number().int().min(1).optional(),
});

const updateModifierGrupSchema = z.object({
  id: z.string().min(1, "ID grup modifier tidak valid"),
  nama: z
    .string()
    .min(1, "Nama grup modifier tidak boleh kosong")
    .max(100, "Nama grup modifier maksimal 100 karakter")
    .optional(),
  wajibPilih: z.boolean().optional(),
  minPilihan: z.number().int().min(0).optional(),
  maxPilihan: z.number().int().min(1).optional(),
});

const deleteModifierGrupSchema = z.object({
  id: z.string().min(1, "ID grup modifier tidak valid"),
});

const setModifierOpsiSchema = z.object({
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
  nama: z
    .string()
    .min(1, "Nama opsi modifier tidak boleh kosong")
    .max(100, "Nama opsi modifier maksimal 100 karakter"),
  hargaTambahan: z.number().int().min(0).optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

const deleteModifierOpsiSchema = z.object({
  id: z.string().min(1, "ID opsi modifier tidak valid"),
});

const attachModifierGrupSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
  urutan: z.number().int().min(0).optional(),
});

const detachModifierGrupSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
});

const setHargaSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  harga: z.number().int().min(0, "Harga tidak boleh negatif"),
});

const removeHargaSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleMenuError(error: unknown): never {
  if (error instanceof MenuError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      KATEGORI_NOT_FOUND: "NOT_FOUND",
      ITEM_NOT_FOUND: "NOT_FOUND",
      VARIAN_NOT_FOUND: "NOT_FOUND",
      MODIFIER_GRUP_NOT_FOUND: "NOT_FOUND",
      MODIFIER_OPSI_NOT_FOUND: "NOT_FOUND",
      HARGA_NOT_FOUND: "NOT_FOUND",
      KATEGORI_HAS_ITEMS: "BAD_REQUEST",
      ITEM_HAS_VARIAN: "BAD_REQUEST",
      ITEM_HAS_MODIFIERS: "BAD_REQUEST",
      ITEM_HAS_PESANAN: "FORBIDDEN",
      DUPLICATE_NAMA: "BAD_REQUEST",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const menuRouter = router({
  // ─── Kategori ───────────────────────────────────────────────────────────
  kategori: router({
    /** List all categories, optionally with their items. */
    list: tenantProcedure
      .input(listKategoriSchema)
      .query(async ({ ctx, input }) => {
        return listKategori(ctx.db, {
          includeItems: input.includeItems,
          includeNonActive: input.includeNonActive,
        });
      }),

    /** Create a new category. */
    create: tenantProcedure
      .input(createKategoriSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createKategori(ctx.db, ctx.ctx.tenantId!, {
            nama: input.nama,
            ...(input.urutan != null && { urutan: input.urutan }),
            ...(input.outletId != null && { outletId: input.outletId }),
          });
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Update an existing category. */
    update: tenantProcedure
      .input(updateKategoriSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          const opts: Parameters<typeof updateKategori>[2] = {
            ...(data.nama ? { nama: data.nama } : {}),
            ...(data.urutan !== undefined ? { urutan: data.urutan } : {}),
            ...(data.status ? { status: data.status } : {}),
            ...(data.outletId ? { outletId: data.outletId } : {}),
          };
          return await updateKategori(ctx.db, id, opts);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Soft-delete a category (only if no active items). */
    delete: tenantProcedure
      .input(deleteKategoriSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteKategori(ctx.db, input.id);
        } catch (error) {
          handleMenuError(error);
        }
      }),
  }),

  // ─── Item ───────────────────────────────────────────────────────────────
  item: router({
    /** List all menu items, optionally by category. */
    list: tenantProcedure
      .input(listItemsSchema)
      .query(async ({ ctx, input }) => {
        return listItem(ctx.db, {
          ...(input.kategoriId ? { kategoriId: input.kategoriId } : {}),
          includeRelations: input.includeRelations,
          includeNonActive: input.includeNonActive,
        });
      }),

    /** Get a single item with all relations. */
    get: tenantProcedure
      .input(getItemSchema)
      .query(async ({ ctx, input }) => {
        const item = await getItem(ctx.db, input.id);
        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Item tidak ditemukan",
          });
        }
        return item;
      }),

    /** List items with outlet-specific pricing. */
    withHarga: tenantProcedure
      .input(listItemDenganHargaSchema)
      .query(async ({ ctx, input }) => {
        const filterOpts: Parameters<typeof listItemDenganHarga>[1] = {
          ...(input.kategoriId ? { kategoriId: input.kategoriId } : {}),
          ...(input.outletId ? { outletId: input.outletId } : {}),
          ...(input.includeNonActive !== undefined ? { includeNonActive: input.includeNonActive } : {}),
        };
        return listItemDenganHarga(ctx.db, filterOpts);
      }),

    /** Create a new menu item. */
    create: tenantProcedure
      .input(createItemSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createItem(ctx.db, ctx.ctx.tenantId!, input);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Update an existing menu item. */
    update: tenantProcedure
      .input(updateItemSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          const updateOpts: Parameters<typeof updateItem>[2] = {
            ...(data.kategoriId ? { kategoriId: data.kategoriId } : {}),
            ...(data.nama ? { nama: data.nama } : {}),
            ...(data.deskripsi ? { deskripsi: data.deskripsi } : {}),
            ...(data.gambarUrl ? { gambarUrl: data.gambarUrl } : {}),
            ...(data.stokTakTerbatas !== undefined ? { stokTakTerbatas: data.stokTakTerbatas } : {}),
            ...(data.status ? { status: data.status } : {}),
          };
          return await updateItem(ctx.db, id, updateOpts);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Soft-delete a menu item. */
    delete: tenantProcedure
      .input(deleteItemSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteItem(ctx.db, input.id);
        } catch (error) {
          handleMenuError(error);
        }
      }),
  }),

  // ─── Varian ─────────────────────────────────────────────────────────────
  varian: router({
    /** Create a new variant for an item. */
    create: tenantProcedure
      .input(createVarianSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const createData: Parameters<typeof createVarian>[1] = {
            itemMenuId: input.itemMenuId,
            nama: input.nama,
            ...(input.hargaTambahan != null ? { hargaTambahan: BigInt(input.hargaTambahan) } : {}),
          };
          return await createVarian(ctx.db, createData);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Update an existing variant. */
    update: tenantProcedure
      .input(updateVarianSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          const updateData: Parameters<typeof updateVarian>[2] = {
            ...(data.nama ? { nama: data.nama } : {}),
            ...(data.status ? { status: data.status } : {}),
            ...(data.hargaTambahan != null ? { hargaTambahan: BigInt(data.hargaTambahan) } : {}),
          };
          return await updateVarian(ctx.db, id, updateData);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Soft-delete a variant. */
    delete: tenantProcedure
      .input(deleteVarianSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteVarian(ctx.db, input.id);
        } catch (error) {
          handleMenuError(error);
        }
      }),
  }),

  // ─── Modifier ───────────────────────────────────────────────────────────
  modifier: router({
    /** List all modifier groups with their options. */
    list: tenantProcedure
      .input(listModifierGrupSchema)
      .query(async ({ ctx }) => {
        return listModifierGrup(ctx.db);
      }),

    /** Create a new modifier group. */
    create: tenantProcedure
      .input(createModifierGrupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createModifierGrup(ctx.db, ctx.ctx.tenantId!, input);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Update an existing modifier group. */
    update: tenantProcedure
      .input(updateModifierGrupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          const updateData: Parameters<typeof updateModifierGrup>[2] = {
            ...(data.nama ? { nama: data.nama } : {}),
            ...(data.wajibPilih !== undefined ? { wajibPilih: data.wajibPilih } : {}),
            ...(data.minPilihan !== undefined ? { minPilihan: data.minPilihan } : {}),
            ...(data.maxPilihan !== undefined ? { maxPilihan: data.maxPilihan } : {}),
          };
          return await updateModifierGrup(ctx.db, id, updateData);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Delete a modifier group (and its options). */
    delete: tenantProcedure
      .input(deleteModifierGrupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteModifierGrup(ctx.db, input.id);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Create or update a modifier option. */
    opsi: router({
      set: tenantProcedure
        .input(setModifierOpsiSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await setModifierOpsi(ctx.db, {
              modifierGrupId: input.modifierGrupId,
              nama: input.nama,
              hargaTambahan:
                input.hargaTambahan != null
                  ? BigInt(input.hargaTambahan)
                  : undefined,
              status: input.status,
            });
          } catch (error) {
            handleMenuError(error);
          }
        }),

      delete: tenantProcedure
        .input(deleteModifierOpsiSchema)
        .mutation(async ({ ctx, input }) => {
          try {
            return await deleteModifierOpsi(ctx.db, input.id);
          } catch (error) {
            handleMenuError(error);
          }
        }),
    }),

    /** Attach a modifier group to an item. */
    attach: tenantProcedure
      .input(attachModifierGrupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const attachData: Parameters<typeof attachModifierGrup>[1] = {
            itemMenuId: input.itemMenuId,
            modifierGrupId: input.modifierGrupId,
            ...(input.urutan !== undefined ? { urutan: input.urutan } : {}),
          };
          return await attachModifierGrup(ctx.db, attachData);
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Detach a modifier group from an item. */
    detach: tenantProcedure
      .input(detachModifierGrupSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await detachModifierGrup(ctx.db, input);
        } catch (error) {
          handleMenuError(error);
        }
      }),
  }),

  // ─── Harga ──────────────────────────────────────────────────────────────
  harga: router({
    /** Set price for an item at a specific outlet. */
    set: tenantProcedure
      .input(setHargaSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await setHargaItemOutlet(ctx.db, ctx.ctx.tenantId!, {
            itemMenuId: input.itemMenuId,
            outletId: input.outletId,
            harga: BigInt(input.harga),
          });
        } catch (error) {
          handleMenuError(error);
        }
      }),

    /** Remove price for an item at a specific outlet. */
    remove: tenantProcedure
      .input(removeHargaSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await removeHargaItemOutlet(ctx.db, input);
        } catch (error) {
          handleMenuError(error);
        }
      }),
  }),
});
