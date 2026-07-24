// Test compile-time untuk ALT-DEF-005/ALT-DEF-016: memverifikasi bahwa
// `@prisma/client` yang di-generate dari prisma/schema/schema.prisma benar-benar
// mengekspos tipe input `CreateInput`/`UncheckedCreateInput` yang sesuai
// untuk model-model baru/diperbarui pada batch state-machine Pesanan dan
// snapshot ItemPesanan - bukan hanya bahwa schema.prisma valid secara teks
// (lihat pesanan-state-machine-snapshot-constraints.test.ts untuk assertion
// berbasis teks).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian pass ALT-DEF-005
// untuk output `prisma generate` dan `tsc --noEmit` aktual.

import type { Prisma } from "@prisma/client";

// --- ALT-DEF-005: StatusPesanan 14-status, dipakai sebagai literal type ---

const contohPesanan = {
  id: "01J...PESANAN",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  kanal: "QR_PELANGGAN",
  nomorPesanan: "A-0001",
  status: "MENUNGGU_PERSETUJUAN",
  dibuatOlehId: "01J...PENGGUNA",
} satisfies Prisma.PesananUncheckedCreateInput;

// --- ALT-DEF-005/ALT-PES-009: PesananRiwayatStatus dengan kolom enum (bukan String) ---

const contohRiwayatStatus = {
  id: "01J...RIWAYAT",
  pesananId: contohPesanan.id,
  statusSebelumnya: "DIKIRIM",
  statusBaru: "MENUNGGU_PERSETUJUAN",
  diubahOlehId: "01J...PENGGUNA",
} satisfies Prisma.PesananRiwayatStatusUncheckedCreateInput;

// --- ALT-PES-010: PesananPerubahan ---

const contohPesananPerubahan = {
  id: "01J...PERUBAHAN",
  tenantId: "01J...TENANT",
  pesananId: contohPesanan.id,
  jenisPerubahan: "UBAH_KUANTITAS",
  sebelum: { kuantitas: 1 },
  sesudah: { kuantitas: 2 },
  diubahOlehId: "01J...PENGGUNA",
} satisfies Prisma.PesananPerubahanUncheckedCreateInput;

// --- ALT-PES-011/ADR-017: PesananPenolakan ---

const contohPesananPenolakan = {
  id: "01J...PENOLAKAN",
  tenantId: "01J...TENANT",
  pesananId: contohPesanan.id,
  alasan: "Meja yang dipilih sedang tidak tersedia",
  ditolakOlehId: "01J...PENGGUNA",
} satisfies Prisma.PesananPenolakanUncheckedCreateInput;

// --- ALT-PES-011/ADR-017: PesananPembatalan ---

const contohPesananPembatalan = {
  id: "01J...PEMBATALAN",
  tenantId: "01J...TENANT",
  pesananId: contohPesanan.id,
  alasan: "Stok bahan utama habis setelah dikonfirmasi",
  dibatalkanOlehId: "01J...PENGGUNA",
} satisfies Prisma.PesananPembatalanUncheckedCreateInput;

// --- ALT-DEF-016: ItemPesanan dengan kolom snapshot lengkap ---

const contohItemPesanan = {
  id: "01J...ITEM",
  pesananId: contohPesanan.id,
  itemMenuId: "01J...MENU",
  varianMenuId: "01J...VARIAN",
  kuantitas: 2,
  hargaSatuan: 25000,
  status: "DRAF",
  namaItemSnapshot: "Nasi Goreng Spesial",
  namaVarianSnapshot: "Pedas",
  hargaDasarSnapshot: 25000,
  hargaVarianSnapshot: 0,
  hargaModifierSnapshot: 5000,
  diskonSnapshot: 0,
  pajakSnapshot: 2750,
  serviceChargeSnapshot: 1375,
  totalBarisSnapshot: 59250,
  // Forward-reference ke VersiResep yang belum ada (ADR-017 Keputusan 8) -
  // scalar String? polos, TIDAK ada `connect`/relasi FK di sini.
  resepVersiId: null,
} satisfies Prisma.ItemPesananUncheckedCreateInput;

// --- ALT-DEF-016: ItemPesananModifier dengan kolom snapshot lengkap ---

const contohItemPesananModifier = {
  id: "01J...MODIFIER",
  itemPesananId: contohItemPesanan.id,
  modifierOpsiId: "01J...OPSI",
  hargaTambahan: 5000,
  namaModifierSnapshot: "Extra Keju",
  hargaSnapshot: 2500,
  jumlah: 2,
  totalSnapshot: 5000,
} satisfies Prisma.ItemPesananModifierUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipePesanan = {
  contohPesanan,
  contohRiwayatStatus,
  contohPesananPerubahan,
  contohPesananPenolakan,
  contohPesananPembatalan,
  contohItemPesanan,
  contohItemPesananModifier,
};
