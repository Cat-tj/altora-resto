/**
 * Zod validation schemas for the menu domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas). Each schema corresponds to a service operation.
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const statusAktifNonaktifSchema = z.enum(["AKTIF", "NONAKTIF"]);

export const statusItemMenuSchema = z.enum(["AKTIF", "NONAKTIF", "HABIS"]);

// ─── Kategori Menu ─────────────────────────────────────────────────────────

export const createKategoriSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama kategori tidak boleh kosong")
    .max(100, "Nama kategori maksimal 100 karakter"),
  urutan: z.number().int().min(0).default(0),
  outletId: z.string().optional(),
});

export const updateKategoriSchema = z.object({
  id: z.string().min(1, "ID kategori tidak valid"),
  nama: z
    .string()
    .min(1, "Nama kategori tidak boleh kosong")
    .max(100, "Nama kategori maksimal 100 karakter")
    .optional(),
  urutan: z.number().int().min(0).optional(),
  status: statusAktifNonaktifSchema.optional(),
  outletId: z.string().optional(),
});

// ─── Item Menu ──────────────────────────────────────────────────────────────

export const createItemSchema = z.object({
  kategoriId: z.string().min(1, "ID kategori tidak valid"),
  nama: z
    .string()
    .min(1, "Nama item tidak boleh kosong")
    .max(200, "Nama item maksimal 200 karakter"),
  deskripsi: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
  gambarUrl: z.string().url("URL gambar tidak valid").optional(),
  stokTakTerbatas: z.boolean().default(true),
  status: statusItemMenuSchema.default("AKTIF"),
});

export const updateItemSchema = z.object({
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
  status: statusItemMenuSchema.optional(),
});

export const deleteItemSchema = z.object({
  id: z.string().min(1, "ID item tidak valid"),
});

export const getItemSchema = z.object({
  id: z.string().min(1, "ID item tidak valid"),
});

// ─── Varian Menu ────────────────────────────────────────────────────────────

export const createVarianSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  nama: z
    .string()
    .min(1, "Nama varian tidak boleh kosong")
    .max(100, "Nama varian maksimal 100 karakter"),
  hargaTambahan: z.bigint().min(0n).default(0n),
});

export const updateVarianSchema = z.object({
  id: z.string().min(1, "ID varian tidak valid"),
  nama: z
    .string()
    .min(1, "Nama varian tidak boleh kosong")
    .max(100, "Nama varian maksimal 100 karakter")
    .optional(),
  hargaTambahan: z.bigint().min(0n).optional(),
  status: statusAktifNonaktifSchema.optional(),
});

// ─── Modifier Grup ──────────────────────────────────────────────────────────

export const createModifierGrupSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama grup modifier tidak boleh kosong")
    .max(100, "Nama grup modifier maksimal 100 karakter"),
  wajibPilih: z.boolean().default(false),
  minPilihan: z.number().int().min(0).default(0),
  maxPilihan: z.number().int().min(1).default(1),
});

export const updateModifierGrupSchema = z.object({
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

// ─── Modifier Opsi ──────────────────────────────────────────────────────────

export const setModifierOpsiSchema = z.object({
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
  nama: z
    .string()
    .min(1, "Nama opsi modifier tidak boleh kosong")
    .max(100, "Nama opsi modifier maksimal 100 karakter"),
  hargaTambahan: z.bigint().min(0n).default(0n),
  status: statusAktifNonaktifSchema.default("AKTIF"),
});

export const deleteModifierOpsiSchema = z.object({
  id: z.string().min(1, "ID opsi modifier tidak valid"),
});

// ─── Item Modifier Grup ─────────────────────────────────────────────────────

export const attachModifierGrupSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
  urutan: z.number().int().min(0).default(0),
});

export const detachModifierGrupSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  modifierGrupId: z.string().min(1, "ID grup modifier tidak valid"),
});

// ─── Harga Item Outlet ──────────────────────────────────────────────────────

export const setHargaItemOutletSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  harga: z.bigint().min(0n, "Harga tidak boleh negatif"),
});

export const removeHargaItemOutletSchema = z.object({
  itemMenuId: z.string().min(1, "ID item tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
});

// ─── List Query Schemas ─────────────────────────────────────────────────────

export const listKategoriQuerySchema = z.object({
  includeItems: z.boolean().default(false),
  includeNonActive: z.boolean().default(false),
});

export const listItemsQuerySchema = z.object({
  kategoriId: z.string().optional(),
  includeRelations: z.boolean().default(false),
  includeNonActive: z.boolean().default(false),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CreateKategoriInput = z.infer<typeof createKategoriSchema>;
export type UpdateKategoriInput = z.infer<typeof updateKategoriSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type DeleteItemInput = z.infer<typeof deleteItemSchema>;
export type GetItemInput = z.infer<typeof getItemSchema>;
export type CreateVarianInput = z.infer<typeof createVarianSchema>;
export type UpdateVarianInput = z.infer<typeof updateVarianSchema>;
export type CreateModifierGrupInput = z.infer<typeof createModifierGrupSchema>;
export type UpdateModifierGrupInput = z.infer<typeof updateModifierGrupSchema>;
export type SetModifierOpsiInput = z.infer<typeof setModifierOpsiSchema>;
export type DeleteModifierOpsiInput = z.infer<typeof deleteModifierOpsiSchema>;
export type AttachModifierGrupInput = z.infer<typeof attachModifierGrupSchema>;
export type DetachModifierGrupInput = z.infer<typeof detachModifierGrupSchema>;
export type SetHargaItemOutletInput = z.infer<typeof setHargaItemOutletSchema>;
export type RemoveHargaItemOutletInput = z.infer<typeof removeHargaItemOutletSchema>;
export type ListKategoriQuery = z.infer<typeof listKategoriQuerySchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
