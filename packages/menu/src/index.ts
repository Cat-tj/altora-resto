/**
 * @altora/menu — Menu domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the menu aggregate
 * - Zod validation schemas for all menu operations
 * - Service layer (CRUD) with tenant-scoped Prisma queries
 *
 * @example
 * ```ts
 * import {
 *   listKategori,
 *   createItem,
 *   createKategoriSchema,
 *   type KategoriMenu,
 * } from "@altora/menu";
 *
 * // List categories (auto-scoped to tenant)
 * const categories = await listKategori(db, { includeItems: true });
 *
 * // Create an item (validated by Zod)
 * const input = createItemSchema.parse({ kategoriId: "...", nama: "Nasi Goreng" });
 * const item = await createItem(db, input);
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusAktifNonaktif,
  StatusItemMenu,
  KategoriMenu,
  ItemMenu,
  VarianMenu,
  ModifierGrup,
  ItemModifierGrup,
  ModifierOpsi,
  HargaItemOutlet,
  KategoriMenuDenganItem,
  ItemMenuLengkap,
  ItemMenuDenganHarga,
  CreateKategoriInput,
  UpdateKategoriInput,
  CreateItemInput,
  UpdateItemInput,
  CreateVarianInput,
  UpdateVarianInput,
  CreateModifierGrupInput,
  UpdateModifierGrupInput,
  SetModifierOpsiInput,
  SetHargaItemOutletInput,
  ListKategoriOptions,
  ListItemOptions,
} from "./types.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  statusAktifNonaktifSchema,
  statusItemMenuSchema,
  // Kategori
  createKategoriSchema,
  updateKategoriSchema,
  // Item
  createItemSchema,
  updateItemSchema,
  deleteItemSchema,
  getItemSchema,
  // Varian
  createVarianSchema,
  updateVarianSchema,
  // Modifier
  createModifierGrupSchema,
  updateModifierGrupSchema,
  setModifierOpsiSchema,
  deleteModifierOpsiSchema,
  attachModifierGrupSchema,
  detachModifierGrupSchema,
  // Harga
  setHargaItemOutletSchema,
  removeHargaItemOutletSchema,
  // List queries
  listKategoriQuerySchema,
  listItemsQuerySchema,
} from "./schemas.js";

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  MenuError,
  type MenuErrorCode,
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
} from "./menu.js";
