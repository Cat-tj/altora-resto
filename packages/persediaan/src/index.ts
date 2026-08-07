/**
 * @altora/persediaan — Inventory domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the inventory aggregate
 * - Zod validation schemas for all inventory operations
 * - Service layer with tenant-scoped Prisma queries
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusAktifNonaktif,
  JenisMutasiStok,
  ReferensiJenisMutasi,
  StatusStokOpname,
  StatusPurchaseOrder,
  StatusBatchStok,
  JenisLokasiStok,
  Gudang,
  LokasiStok,
  StokBahan,
  MutasiStok,
  BatchStok,
  Supplier,
  PurchaseOrder,
  PurchaseOrderBaris,
  PenerimaanBarang,
  PenerimaanBarangBaris,
  StokOpname,
  StokOpnameBaris,
  GudangDenganRingkasan,
  PurchaseOrderLengkap,
  PenerimaanBarangLengkap,
  StokOpnameLengkap,
  CheckStockInput,
  DeductStockInput,
  CreateStokOpnameInput,
  HitungStokOpnameInput,
  CreatePurchaseOrderInput,
  ReceiveGoodsInput,
  LowStockAlert,
  ListGudangOptions,
  ListMutasiStokOptions,
  ListPurchaseOrderOptions,
  ListStokOpnameOptions,
} from "./types.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  statusAktifNonaktifSchema,
  jenisMutasiStokSchema,
  referensiJenisMutasiSchema,
  statusStokOpnameSchema,
  statusPurchaseOrderSchema,
  // Stock
  checkStockSchema,
  deductStockSchema,
  // Stok Opname
  createStokOpnameSchema,
  hitungStokOpnameSchema,
  lockStokOpnameSchema,
  approveStokOpnameSchema,
  // Purchase Order
  createPurchaseOrderSchema,
  updateStatusPoSchema,
  // Receive Goods
  receiveGoodsSchema,
  // List queries
  listGudangSchema,
  listMutasiStokSchema,
  listPurchaseOrderSchema,
  listStokOpnameSchema,
  // Get
  getPurchaseOrderSchema,
  getStokOpnameSchema,
  // Alerts
  lowStockAlertSchema,
} from "./schemas.js";

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  PersediaanError,
  type PersediaanErrorCode,
  // Gudang
  listGudang,
  // Stock
  checkStock,
  deductStock,
  // Stok Opname
  createStokOpname,
  getStokOpname,
  listStokOpname,
  // Purchase Order
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrder,
  receiveGoods,
  // Alerts
  getLowStockAlerts,
} from "./persediaan.js";
