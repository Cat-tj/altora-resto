/**
 * Menu domain types for Altora Resto.
 *
 * These types represent the core menu aggregate:
 * - KategoriMenu: Menu categories (e.g., "Makanan", "Minuman")
 * - ItemMenu: Individual menu items
 * - VarianMenu: Variants of items (e.g., sizes, portions)
 * - ModifierGrup: Groups of modifiers (e.g., "Topping", "Level Pedas")
 * - ModifierOpsi: Individual modifier options
 * - ItemModifierGrup: Junction table linking items to modifier groups
 * - HargaItemOutlet: Per-outlet pricing for menu items
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type StatusAktifNonaktif = "AKTIF" | "NONAKTIF";

export type StatusItemMenu = "AKTIF" | "NONAKTIF" | "HABIS";

// ─── Kategori Menu ─────────────────────────────────────────────────────────

export interface KategoriMenu {
  id: string;
  tenantId: string;
  outletId: string | null;
  nama: string;
  urutan: number;
  status: StatusAktifNonaktif;
}

// ─── Item Menu ──────────────────────────────────────────────────────────────

export interface ItemMenu {
  id: string;
  tenantId: string;
  kategoriId: string;
  nama: string;
  deskripsi: string | null;
  gambarUrl: string | null;
  stokTakTerbatas: boolean;
  status: StatusItemMenu;
  createdAt: Date;
}

// ─── Varian Menu ────────────────────────────────────────────────────────────

export interface VarianMenu {
  id: string;
  itemMenuId: string;
  nama: string;
  hargaTambahan: bigint;
  status: StatusAktifNonaktif;
}

// ─── Modifier Grup ──────────────────────────────────────────────────────────

export interface ModifierGrup {
  id: string;
  tenantId: string;
  nama: string;
  wajibPilih: boolean;
  minPilihan: number;
  maxPilihan: number;
}

// ─── Item Modifier Grup ─────────────────────────────────────────────────────

export interface ItemModifierGrup {
  id: string;
  itemMenuId: string;
  modifierGrupId: string;
  urutan: number;
}

// ─── Modifier Opsi ──────────────────────────────────────────────────────────

export interface ModifierOpsi {
  id: string;
  modifierGrupId: string;
  nama: string;
  hargaTambahan: bigint;
  status: StatusAktifNonaktif;
}

// ─── Harga Item Outlet ──────────────────────────────────────────────────────

export interface HargaItemOutlet {
  id: string;
  tenantId: string;
  itemMenuId: string;
  outletId: string;
  harga: bigint;
  berlakuSejak: Date;
}

// ─── Combined Types (for API responses) ─────────────────────────────────────

/** A category with its items included. */
export interface KategoriMenuDenganItem extends KategoriMenu {
  itemMenu: ItemMenu[];
}

/** An item with its variants, modifiers, and pricing included. */
export interface ItemMenuLengkap extends ItemMenu {
  kategori: Pick<KategoriMenu, "id" | "nama">;
  varian: VarianMenu[];
  modifierGrup: (ItemModifierGrup & {
    modifierGrup: ModifierGrup & {
      opsi: ModifierOpsi[];
    };
  })[];
  hargaOutlet: HargaItemOutlet[];
}

/** An item with pricing for a specific outlet. */
export interface ItemMenuDenganHarga extends ItemMenu {
  kategori: Pick<KategoriMenu, "id" | "nama">;
  hargaOutlet: HargaItemOutlet[];
}

// ─── Input Types (for service layer) ────────────────────────────────────────

export interface CreateKategoriInput {
  nama: string;
  urutan?: number;
  outletId?: string;
}

export interface UpdateKategoriInput {
  nama?: string;
  urutan?: number;
  status?: StatusAktifNonaktif;
  outletId?: string;
}

export interface CreateItemInput {
  kategoriId: string;
  nama: string;
  deskripsi?: string;
  gambarUrl?: string;
  stokTakTerbatas?: boolean;
  status?: StatusItemMenu;
}

export interface UpdateItemInput {
  kategoriId?: string;
  nama?: string;
  deskripsi?: string;
  gambarUrl?: string;
  stokTakTerbatas?: boolean;
  status?: StatusItemMenu;
}

export interface CreateVarianInput {
  nama: string;
  hargaTambahan?: bigint;
}

export interface UpdateVarianInput {
  nama?: string;
  hargaTambahan?: bigint;
  status?: StatusAktifNonaktif;
}

export interface CreateModifierGrupInput {
  nama: string;
  wajibPilih?: boolean;
  minPilihan?: number;
  maxPilihan?: number;
}

export interface UpdateModifierGrupInput {
  nama?: string;
  wajibPilih?: boolean;
  minPilihan?: number;
  maxPilihan?: number;
}

export interface SetModifierOpsiInput {
  nama: string;
  hargaTambahan?: bigint;
  status?: StatusAktifNonaktif;
}

export interface SetHargaItemOutletInput {
  outletId: string;
  harga: bigint;
}

// ─── List Query Options ─────────────────────────────────────────────────────

export interface ListKategoriOptions {
  includeItems?: boolean;
  includeNonActive?: boolean;
}

export interface ListItemOptions {
  kategoriId?: string;
  includeRelations?: boolean;
  includeNonActive?: boolean;
}
