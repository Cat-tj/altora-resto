// Test compile-time untuk ALT-DEF-007: memverifikasi bahwa `@prisma/client`
// yang di-generate dari prisma/schema/schema.prisma benar-benar mengekspos tipe
// input yang sesuai untuk model-model resep/versi/produksi - bukan hanya bahwa
// schema.prisma cocok secara TEKS (lihat resep-versi-produksi-constraints.test.ts
// untuk assertion berbasis teks).
//
// Kedua lapis dibutuhkan: test teks membuktikan constraint/komentar/atribut ada
// persis seperti yang diklaim ADR-022, test tipe ini membuktikan Prisma
// benar-benar MENERIMA bentuk data tersebut (mis. bahwa `snapshotBiaya`
// sungguh-sungguh opsional, bukan sekadar tertulis `Int?` di file).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian batch ALT-DEF-007
// untuk output `prisma generate` dan `tsc --noEmit --strict` aktual.

import type { Prisma } from "@prisma/client";

// --- ADR-022 Keputusan 1: Bahan.jenis (diskriminator subresep) ---

const contohBahanSetengahJadi = {
  id: "01J...BAHAN-ADONAN",
  tenantId: "01J...TENANT",
  nama: "Adonan roti",
  kodeSku: "SJ-ADONAN-001",
  satuanDasarId: "01J...SATUAN-KG",
  // BAHAN_SETENGAH_JADI: hasil satu resep sekaligus input resep lain.
  jenis: "BAHAN_SETENGAH_JADI",
} satisfies Prisma.BahanUncheckedCreateInput;

// --- ADR-022 Keputusan 6: KonversiSatuan (ALT-RSP-008) ---

const contohKonversiSatuan = {
  id: "01J...KONVERSI",
  tenantId: contohBahanSetengahJadi.tenantId,
  satuanDariId: "01J...SATUAN-KG",
  satuanKeId: "01J...SATUAN-GRAM",
  // Decimal diterima sebagai number/string oleh Prisma - dibuktikan di sini.
  faktor: 1000,
} satisfies Prisma.KonversiSatuanUncheckedCreateInput;

// --- ADR-022 Keputusan 2: Resep bersasaran XOR ---
// Tiga contoh di bawah membuktikan KETIGA sasaran benar-benar opsional di
// level tipe. Kalau salah satu masih wajib (sisa `itemMenuId @unique`), satu
// dari ketiga baris ini tidak akan meng-compile.

const contohResepItemMenu = {
  id: "01J...RESEP-ITEM",
  tenantId: contohBahanSetengahJadi.tenantId,
  nama: "Nasi goreng spesial - resep dasar",
  itemMenuId: "01J...ITEMMENU",
} satisfies Prisma.ResepUncheckedCreateInput;

const contohResepVarian = {
  id: "01J...RESEP-VARIAN",
  tenantId: contohBahanSetengahJadi.tenantId,
  nama: "Nasi goreng spesial - porsi jumbo",
  varianMenuId: "01J...VARIAN",
} satisfies Prisma.ResepUncheckedCreateInput;

const contohResepSubresep = {
  id: "01J...RESEP-SUB",
  tenantId: contohBahanSetengahJadi.tenantId,
  nama: "Adonan roti - subresep",
  bahanHasilId: contohBahanSetengahJadi.id,
} satisfies Prisma.ResepUncheckedCreateInput;

// --- ADR-022 Keputusan 3: VersiResep ---

const contohVersiResepDraf = {
  id: "01J...VERSI-1",
  tenantId: contohBahanSetengahJadi.tenantId,
  resepId: contohResepSubresep.id,
  nomorVersi: 1,
  berlakuSejak: new Date("2026-07-25T00:00:00.000Z"),
  jumlahHasil: 5,
  satuanHasilId: "01J...SATUAN-KG",
  // penyusutanPersen punya @default(0) -> opsional.
  // snapshotBiaya nullable -> versi DRAF belum punya HPP terhitung.
  // status punya @default(DRAF) -> opsional.
} satisfies Prisma.VersiResepUncheckedCreateInput;

const contohVersiResepAktif = {
  id: "01J...VERSI-2",
  tenantId: contohBahanSetengahJadi.tenantId,
  resepId: contohResepSubresep.id,
  nomorVersi: 2,
  berlakuSejak: new Date("2026-08-01T00:00:00.000Z"),
  berlakuSampai: null,
  jumlahHasil: 5.5,
  satuanHasilId: "01J...SATUAN-KG",
  penyusutanPersen: 10,
  // ADR-005: HPP adalah UANG -> Int rupiah bulat, bukan Decimal.
  snapshotBiaya: 42500,
  status: "AKTIF",
} satisfies Prisma.VersiResepUncheckedCreateInput;

// --- ADR-022 Keputusan 4: KomponenResep menggantung pada VERSI ---

const contohKomponenResep = {
  id: "01J...KOMPONEN",
  tenantId: contohBahanSetengahJadi.tenantId,
  // versiResepId - BUKAN resepId. Inti ALT-DEF-007.
  versiResepId: contohVersiResepAktif.id,
  bahanId: "01J...BAHAN-TERIGU",
  jumlah: 2.5,
  satuanId: "01J...SATUAN-KG",
  opsional: false,
} satisfies Prisma.KomponenResepUncheckedCreateInput;

// --- ADR-022 Keputusan 5: KomponenResepModifier (ALT-RSP-004) ---

const contohModifierTambah = {
  id: "01J...MOD-TAMBAH",
  tenantId: contohBahanSetengahJadi.tenantId,
  versiResepId: contohVersiResepAktif.id,
  modifierOpsiId: "01J...OPSI-EXTRA-CHEESE",
  aksi: "TAMBAH",
  bahanId: "01J...BAHAN-KEJU",
  jumlah: 20,
  satuanId: "01J...SATUAN-GRAM",
} satisfies Prisma.KomponenResepModifierUncheckedCreateInput;

// "tanpa bawang" = KURANGI sejumlah komponen dasar (tidak ada nilai HAPUS
// terpisah - ADR-022 Keputusan 5).
const contohModifierKurangi = {
  id: "01J...MOD-KURANGI",
  tenantId: contohBahanSetengahJadi.tenantId,
  versiResepId: contohVersiResepAktif.id,
  modifierOpsiId: "01J...OPSI-NO-ONION",
  aksi: "KURANGI",
  bahanId: "01J...BAHAN-BAWANG",
  jumlah: 15,
  satuanId: "01J...SATUAN-GRAM",
} satisfies Prisma.KomponenResepModifierUncheckedCreateInput;

// bahanPenggantiId HANYA bermakna saat aksi = GANTI - dibuktikan opsional
// pada dua contoh di atas dan terisi di sini.
const contohModifierGanti = {
  id: "01J...MOD-GANTI",
  tenantId: contohBahanSetengahJadi.tenantId,
  versiResepId: contohVersiResepAktif.id,
  modifierOpsiId: "01J...OPSI-SUSU-OAT",
  aksi: "GANTI",
  bahanId: "01J...BAHAN-SUSU-SAPI",
  bahanPenggantiId: "01J...BAHAN-SUSU-OAT",
  jumlah: 200,
  satuanId: "01J...SATUAN-ML",
} satisfies Prisma.KomponenResepModifierUncheckedCreateInput;

// --- ADR-022 Keputusan 6: ProsesProduksi / baris / batch ---

const contohProsesProduksi = {
  id: "01J...PRODUKSI",
  tenantId: contohBahanSetengahJadi.tenantId,
  outletId: "01J...OUTLET",
  versiResepId: contohVersiResepAktif.id,
  jumlahTarget: 20,
  // jumlahAktual sengaja TIDAK diisi - baru terisi saat SELESAI (ALT-RSP-009).
  dibuatOlehId: "01J...PENGGUNA",
} satisfies Prisma.ProsesProduksiUncheckedCreateInput;

const contohProsesProduksiSelesai = {
  id: "01J...PRODUKSI-2",
  tenantId: contohBahanSetengahJadi.tenantId,
  outletId: "01J...OUTLET",
  versiResepId: contohVersiResepAktif.id,
  jumlahTarget: 20,
  jumlahAktual: 18.4,
  status: "SELESAI",
  dimulaiPada: new Date("2026-07-25T01:00:00.000Z"),
  diselesaikanPada: new Date("2026-07-25T04:30:00.000Z"),
  dibuatOlehId: "01J...PENGGUNA",
} satisfies Prisma.ProsesProduksiUncheckedCreateInput;

const contohProsesProduksiBaris = {
  id: "01J...PRODUKSI-BARIS",
  tenantId: contohBahanSetengahJadi.tenantId,
  prosesProduksiId: contohProsesProduksiSelesai.id,
  bahanId: "01J...BAHAN-TERIGU",
  // Konsumsi AKTUAL - dibandingkan dengan rencana KomponenResep untuk
  // memvalidasi VersiResep.penyusutanPersen (ALT-RSP-007).
  jumlahDipakai: 9.8,
  satuanId: "01J...SATUAN-KG",
} satisfies Prisma.ProsesProduksiBarisUncheckedCreateInput;

const contohBatchProduksi = {
  id: "01J...BATCH",
  tenantId: contohBahanSetengahJadi.tenantId,
  outletId: "01J...OUTLET",
  prosesProduksiId: contohProsesProduksiSelesai.id,
  bahanHasilId: contohBahanSetengahJadi.id,
  nomorBatch: "BATCH-20260725-001",
  jumlah: 18.4,
  satuanId: "01J...SATUAN-KG",
  tanggalProduksi: new Date("2026-07-25T04:30:00.000Z"),
  // Kolom yang akan dipakai FEFO oleh ALT-DEF-008.
  tanggalKedaluwarsa: new Date("2026-07-28T04:30:00.000Z"),
} satisfies Prisma.BatchProduksiUncheckedCreateInput;

// --- ADR-022 Keputusan 7: ItemPesanan.resepVersiId sebagai FK sungguhan ---
// Bukti TIPE bahwa FK-nya benar-benar tersambung: `VersiResepInclude` hanya
// punya properti `itemPesanan` kalau relasi tersebut ADA di schema. Selama
// kolomnya masih scalar polos (keadaan sebelum batch ini), baris di bawah
// TIDAK meng-compile.
const contohIncludeItemPesanan = {
  itemPesanan: true,
} satisfies Prisma.VersiResepInclude;

// Arah sebaliknya: ItemPesanan dapat meng-include relasi resepVersi.
const contohIncludeResepVersi = {
  resepVersi: true,
} satisfies Prisma.ItemPesananInclude;

// Referensi agar linter/compiler tidak menganggap seluruh binding di atas
// tidak terpakai - pola yang sama dengan prisma-client-shape-*.test.ts lain.
export const CONTOH_RESEP_PRODUKSI = {
  contohBahanSetengahJadi,
  contohKonversiSatuan,
  contohResepItemMenu,
  contohResepVarian,
  contohResepSubresep,
  contohVersiResepDraf,
  contohVersiResepAktif,
  contohKomponenResep,
  contohModifierTambah,
  contohModifierKurangi,
  contohModifierGanti,
  contohProsesProduksi,
  contohProsesProduksiSelesai,
  contohProsesProduksiBaris,
  contohBatchProduksi,
  contohIncludeItemPesanan,
  contohIncludeResepVersi,
} as const;
