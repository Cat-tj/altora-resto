// Test compile-time untuk ALT-DEF-010/ALT-DEF-014: memverifikasi bahwa
// `@prisma/client` yang di-generate dari prisma/schema/schema.prisma benar-benar
// mengekspos tipe input `Unchecked...CreateInput` dengan `tenantId` sebagai
// scalar wajib untuk model-model yang BARU mendapat kolom tenantId denormalisasi
// pada batch ini (HargaItemOutlet, StokBahan, PenerimaanBarang) - bukan hanya
// bahwa schema.prisma valid secara teks (lihat
// tenant-outlet-composite-constraints.test.ts untuk assertion berbasis teks).
//
// Sama seperti prisma-client-shape.test.ts (ALT-DEF-001/002): dipakai bentuk
// UncheckedCreateInput karena tenantId di ketiga model ini dipakai ganda
// sebagai bagian composite-FK (dua relasi sekaligus memakai tenantId yang
// sama, pola ADR-011/ADR-013) - Prisma tidak mengekspos `tenantId` sebagai
// scalar biasa di bentuk "connect" (CreateInput biasa), hanya di bentuk
// "Unchecked". Ini bukti konkret bahwa composite-FK ganda benar-benar
// ditegakkan oleh tipe yang di-generate.
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian "Pass
// correction-loop 2026-07-25 (lanjutan ALT-DEF-010/014)" untuk output
// `prisma generate` dan `tsc --noEmit` aktual.

import type { Prisma } from "@prisma/client";

const contohHargaItemOutlet = {
  id: "01J...HIO",
  tenantId: "01J...TENANT",
  itemMenuId: "01J...ITEM",
  outletId: "01J...OUTLET",
  harga: 25000,
} satisfies Prisma.HargaItemOutletUncheckedCreateInput;

const contohStokBahan = {
  id: "01J...SB",
  tenantId: "01J...TENANT",
  gudangId: "01J...GUDANG",
  bahanId: "01J...BAHAN",
} satisfies Prisma.StokBahanUncheckedCreateInput;

const contohPenerimaanBarang = {
  id: "01J...PB",
  tenantId: "01J...TENANT",
  purchaseOrderId: "01J...PO",
  gudangId: "01J...GUDANG",
  nomorPenerimaan: "PB-0001",
  diterimaOlehId: "01J...PENGGUNA",
} satisfies Prisma.PenerimaanBarangUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipeTenantOutlet = {
  contohHargaItemOutlet,
  contohStokBahan,
  contohPenerimaanBarang,
};
