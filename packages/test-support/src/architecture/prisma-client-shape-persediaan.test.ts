// Test compile-time untuk ALT-DEF-008: memverifikasi bahwa `@prisma/client`
// yang di-generate dari prisma/schema/schema.prisma benar-benar mengekspos tipe
// input yang sesuai untuk model-model persediaan - bukan hanya bahwa
// schema.prisma cocok secara TEKS (lihat
// persediaan-ledger-reservasi-constraints.test.ts untuk assertion berbasis teks).
//
// Kedua lapis dibutuhkan: test teks membuktikan constraint/komentar/atribut ada
// persis seperti yang diklaim ADR-023/024/025, test tipe ini membuktikan Prisma
// benar-benar MENERIMA bentuk data tersebut (mis. bahwa `lokasiSumberId` dan
// `lokasiTujuanId` sungguh-sungguh KEDUANYA opsional, sehingga ketiga bentuk
// mutasi - transfer/pembelian/pemakaian - sama-sama mungkin; bukan sekadar
// tertulis `String?` di file).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian batch ALT-DEF-008
// untuk output `prisma generate` dan `tsc --noEmit --strict` aktual.

import type { Prisma } from "@prisma/client";

const TENANT = "01J...TENANT";
const OUTLET = "01J...OUTLET";
const GUDANG = "01J...GUDANG";
const BAHAN = "01J...BAHAN";
const SATUAN = "01J...SATUAN";
const PENGGUNA = "01J...PENGGUNA";

// --- ADR-024 Keputusan 1: LokasiStok, `jenis` benar-benar opsional ---

const contohLokasiTanpaJenis = {
  id: "01J...LOKASI-RAK3",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  // `jenis` SENGAJA tidak diisi: "rak nomor 3" yang tidak dikategorikan tetap
  // sah. Kalau kolomnya ternyata wajib, baris ini tidak akan meng-compile.
  nama: "Rak 3",
} satisfies Prisma.LokasiStokUncheckedCreateInput;

const contohLokasiFreezer = {
  id: "01J...LOKASI-FREEZER",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  nama: "Freezer utama",
  jenis: "FREEZER",
} satisfies Prisma.LokasiStokUncheckedCreateInput;

// --- ADR-023 Keputusan 1/2: MutasiStok sebagai ledger ---
// TIGA bentuk di bawah membuktikan lokasiSumberId/lokasiTujuanId KEDUANYA
// opsional. Kalau salah satunya wajib, dua dari tiga baris ini gagal compile -
// dan dua dari tiga bentuk mutasi nyata menjadi mustahil dimodelkan.

// (a) Pembelian: HANYA tujuan.
const contohMutasiPembelian = {
  id: "01J...MUTASI-BELI",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  bahanId: BAHAN,
  jenis: "PEMBELIAN_MASUK",
  // Positif = masuk. Decimal diterima sebagai number/string oleh Prisma.
  jumlah: 25,
  referensiJenis: "PEMBELIAN",
  referensiId: "01J...PENERIMAAN",
  lokasiTujuanId: contohLokasiFreezer.id,
  // Rupiah bulat per ADR-005 - hanya mutasi MASUK yang membawa biaya perolehan.
  hargaPerolehan: 18500,
  dibuatOlehId: PENGGUNA,
  // ADR-032: `alasan` wajib pada seluruh baris ledger (bukan cuma pembalik).
  alasan: "Penerimaan pembelian PO-001 - contoh fixture tipe",
} satisfies Prisma.MutasiStokUncheckedCreateInput;

// (b) Pemakaian resep: HANYA sumber, jumlah NEGATIF.
const contohMutasiPemakaian = {
  id: "01J...MUTASI-PAKAI",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  bahanId: BAHAN,
  jenis: "PEMAKAIAN_RESEP",
  // Negatif = keluar. Arah dibawa TANDA, bukan kolom terpisah (ADR-023 K1).
  jumlah: -2.5,
  satuanId: SATUAN,
  referensiJenis: "PESANAN",
  referensiId: "01J...ITEMPESANAN",
  lokasiSumberId: contohLokasiFreezer.id,
  batchStokId: "01J...BATCHSTOK",
  dibuatOlehId: PENGGUNA,
  alasan: "Pemakaian resep untuk item pesanan - contoh fixture tipe",
} satisfies Prisma.MutasiStokUncheckedCreateInput;

// (c) Transfer: KEDUANYA terisi.
const contohMutasiTransferKeluar = {
  id: "01J...MUTASI-TFKELUAR",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  bahanId: BAHAN,
  jenis: "TRANSFER_KELUAR",
  jumlah: -10,
  referensiJenis: "TRANSFER",
  referensiId: "01J...TRANSFER",
  lokasiSumberId: contohLokasiFreezer.id,
  lokasiTujuanId: contohLokasiTanpaJenis.id,
  dibuatOlehId: PENGGUNA,
  alasan: "Transfer stok keluar antar gudang - contoh fixture tipe",
} satisfies Prisma.MutasiStokUncheckedCreateInput;

// Bukti bahwa SELURUH 12 nilai enum baru benar-benar diterima Prisma - kalau
// satu nilai saja tidak ter-generate, baris ini gagal compile.
const seluruhJenisMutasi: Prisma.MutasiStokUncheckedCreateInput["jenis"][] = [
  "PEMBELIAN_MASUK",
  "RETUR_PENJUALAN",
  "TRANSFER_MASUK",
  "PRODUKSI_MASUK",
  "PEMAKAIAN_RESEP",
  "RETUR_SUPPLIER",
  "TRANSFER_KELUAR",
  "PRODUKSI_KELUAR",
  "WASTE",
  "PEMAKAIAN_INTERNAL",
  "PENYESUAIAN",
  "KOREKSI_OPNAME",
];

// --- ADR-023 Keputusan 3: StokBahan sebagai cache turunan ---
// `lokasiStokId` opsional (NULL = baris agregat level-gudang) dan
// `direkonsiliasiPada` opsional (belum pernah direkonsiliasi).

const contohSaldoAgregatGudang = {
  id: "01J...SALDO-AGREGAT",
  tenantId: TENANT,
  gudangId: GUDANG,
  bahanId: BAHAN,
  kuantitas: 120.75,
} satisfies Prisma.StokBahanUncheckedCreateInput;

const contohSaldoPerLokasi = {
  id: "01J...SALDO-LOKASI",
  tenantId: TENANT,
  gudangId: GUDANG,
  bahanId: BAHAN,
  lokasiStokId: contohLokasiFreezer.id,
  kuantitas: 40,
  kuantitasDireservasi: 5.5,
  direkonsiliasiPada: new Date("2026-07-25T00:00:00.000Z"),
} satisfies Prisma.StokBahanUncheckedCreateInput;

// --- ADR-024 Keputusan 3: BatchStok dan SEAM ke BatchProduksi ---
// DUA bentuk: batch hasil PEMBELIAN (tanpa batchProduksiId) dan batch hasil
// PRODUKSI (dengan batchProduksiId). Bila `batchProduksiId` ternyata wajib,
// bentuk pertama gagal compile - dan itulah alasan pokok mengapa BatchStok dan
// BatchProduksi TIDAK disatukan.

const contohBatchPembelian = {
  id: "01J...BATCH-BELI",
  tenantId: TENANT,
  outletId: OUTLET,
  bahanId: BAHAN,
  nomorBatch: "SUP-2026-0713",
  tanggalKedaluwarsa: new Date("2026-08-30T00:00:00.000Z"),
  kuantitasAwal: 25,
  hargaPerolehan: 18500,
} satisfies Prisma.BatchStokUncheckedCreateInput;

const contohBatchHasilProduksi = {
  id: "01J...BATCH-PRODUKSI",
  tenantId: TENANT,
  outletId: OUTLET,
  bahanId: BAHAN,
  nomorBatch: "PRD-2026-0725-01",
  tanggalProduksi: new Date("2026-07-25T02:00:00.000Z"),
  tanggalKedaluwarsa: new Date("2026-07-28T02:00:00.000Z"),
  kuantitasAwal: 5.5,
  hargaPerolehan: 42000,
  lokasiStokId: contohLokasiFreezer.id,
  // SEAM ADR-024 Keputusan 3 (menebus ADR-022 Keputusan 8 poin 4).
  batchProduksiId: "01J...BATCHPRODUKSI",
} satisfies Prisma.BatchStokUncheckedCreateInput;

// --- ADR-024 Keputusan 2: ReservasiStok ---

const contohReservasiAktif = {
  id: "01J...RESERVASI",
  tenantId: TENANT,
  outletId: OUTLET,
  // Digantung pada BARIS pesanan, bukan Pesanan (ADR-024 K2).
  itemPesananId: "01J...ITEMPESANAN",
  bahanId: BAHAN,
  jumlah: 0.25,
  satuanId: SATUAN,
  // `status` sengaja tidak diisi - membuktikan @default(AKTIF) benar-benar ada.
} satisfies Prisma.ReservasiStokUncheckedCreateInput;

const seluruhStatusReservasi: Prisma.ReservasiStokUncheckedCreateInput["status"][] = [
  "AKTIF",
  "DILEPAS",
  "DIKONSUMSI",
  "KEDALUWARSA",
];

// --- ADR-023 Keputusan 4: PenyesuaianStok / CatatanWaste wajib punya ledger ---
// `mutasiStokId` WAJIB pada keduanya - kalau ia opsional, kedua baris di bawah
// tetap compile TANPA-nya, dan dokumen penyesuaian/waste bisa lahir tanpa jejak
// ledger. Kewajibannya dibuktikan test TEKS; di sini dibuktikan Prisma memang
// menerima bentuk lengkapnya.

const contohPenyesuaian = {
  id: "01J...PENYESUAIAN",
  tenantId: TENANT,
  outletId: OUTLET,
  bahanId: BAHAN,
  jumlahSebelum: 120.75,
  jumlahSesudah: 118,
  alasan: "Koreksi salah input penerimaan barang",
  mutasiStokId: "01J...MUTASI-SESUAI",
  dicatatOlehId: PENGGUNA,
} satisfies Prisma.PenyesuaianStokUncheckedCreateInput;

const contohAlasanWaste = {
  id: "01J...ALASAN-KEDALUWARSA",
  tenantId: TENANT,
  kode: "KEDALUWARSA",
  nama: "Kedaluwarsa",
} satisfies Prisma.AlasanWasteUncheckedCreateInput;

const contohCatatanWaste = {
  id: "01J...WASTE",
  tenantId: TENANT,
  outletId: OUTLET,
  gudangId: GUDANG,
  bahanId: BAHAN,
  // WAJIB - bukan teks bebas (ALT-PSD-014).
  alasanWasteId: contohAlasanWaste.id,
  jumlah: 1.2,
  satuanId: SATUAN,
  nilaiKerugian: 22200,
  batchStokId: contohBatchPembelian.id,
  mutasiStokId: "01J...MUTASI-WASTE",
  dicatatOlehId: PENGGUNA,
} satisfies Prisma.CatatanWasteUncheckedCreateInput;

// --- ADR-024 Keputusan 4: TransferStok / TransferStokBaris ---

const contohTransferDraf = {
  id: "01J...TRANSFER",
  tenantId: TENANT,
  nomorTransfer: "TRF-2026-0725-001",
  outletAsalId: OUTLET,
  gudangAsalId: GUDANG,
  outletTujuanId: "01J...OUTLET-B",
  gudangTujuanId: "01J...GUDANG-B",
  dibuatOlehId: PENGGUNA,
  // `status` sengaja tidak diisi - membuktikan @default(DRAF).
} satisfies Prisma.TransferStokUncheckedCreateInput;

// Baris transfer BARU: hanya `jumlahDiminta` yang diketahui. Kalau
// `jumlahDikirim`/`jumlahDiterima` ternyata wajib, baris ini gagal compile -
// dan status DITERIMA_SEBAGIAN menjadi mustahil dimodelkan.
const contohTransferBarisBaru = {
  id: "01J...TRANSFER-BARIS",
  tenantId: TENANT,
  transferStokId: contohTransferDraf.id,
  bahanId: BAHAN,
  jumlahDiminta: 10,
  satuanId: SATUAN,
} satisfies Prisma.TransferStokBarisUncheckedCreateInput;

const seluruhStatusTransfer: Prisma.TransferStokUncheckedCreateInput["status"][] = [
  "DRAF",
  "DIAJUKAN",
  "DISETUJUI",
  "DIKIRIM",
  "DITERIMA_SEBAGIAN",
  "DITERIMA",
  "DIBATALKAN",
];

// --- ADR-024 Keputusan 5 / ADR-025: kebijakan dan pengaturan ---

const contohKebijakanReorder = {
  id: "01J...REORDER",
  tenantId: TENANT,
  outletId: OUTLET,
  bahanId: BAHAN,
  // Decimal, bukan Int - ambang 0.5 kg adalah kebutuhan nyata (ALT-DEF-036).
  stokMinimum: 0.5,
  stokMaksimum: 20,
  jumlahPemesananUlang: 10,
} satisfies Prisma.KebijakanPemesananUlangUncheckedCreateInput;

// Seluruh kolom kebijakan sengaja TIDAK diisi - membuktikan setiap kolom
// benar-benar punya @default, sehingga outlet baru mendapat perilaku aman
// (SAAT_MASUK_DAPUR / FEFO / tolak stok negatif) tanpa konfigurasi apa pun.
const contohPengaturanDefault = {
  id: "01J...PENGATURAN-PSD",
  tenantId: TENANT,
  outletId: OUTLET,
} satisfies Prisma.PengaturanPersediaanOutletUncheckedCreateInput;

const contohPengaturanEksplisit = {
  id: "01J...PENGATURAN-PSD-B",
  tenantId: TENANT,
  outletId: "01J...OUTLET-B",
  kebijakanPemotongan: "SAAT_SELESAI",
  reservasiSaatPesananDiterima: false,
  kedaluwarsaReservasiMenit: 120,
  metodeAlokasiBatch: "FIFO",
  izinkanStokNegatif: true,
  ambangSelisihOpname: 250000,
} satisfies Prisma.PengaturanPersediaanOutletUncheckedCreateInput;

// --- ADR-025 Keputusan 5: StokOpname / StokOpnameBaris ---

const contohOpnameDraf = {
  id: "01J...OPNAME",
  tenantId: TENANT,
  gudangId: GUDANG,
  dijadwalkanPada: new Date("2026-07-25T15:00:00.000Z"),
  dibuatOlehId: PENGGUNA,
  // Seluruh kolom aktor/waktu lain sengaja tidak diisi - membuktikan opname
  // DRAF benar-benar bisa lahir tanpa penghitung/pengunci/penyetuju.
} satisfies Prisma.StokOpnameUncheckedCreateInput;

const contohOpnameDisetujui = {
  id: "01J...OPNAME-B",
  tenantId: TENANT,
  gudangId: GUDANG,
  status: "MENUNGGU_PERSETUJUAN",
  dijadwalkanPada: new Date("2026-07-25T15:00:00.000Z"),
  snapshotPada: new Date("2026-07-25T15:05:00.000Z"),
  dikunciPada: new Date("2026-07-25T16:30:00.000Z"),
  dibuatOlehId: PENGGUNA,
  penghitungId: "01J...PENGGUNA-GUDANG",
  pengunciId: "01J...PENGGUNA-GUDANG",
  // `penyetujuId` sengaja BERBEDA dari penghitungId - invariant level-aplikasi
  // (ADR-025 K5); di sini yang dibuktikan hanyalah kolomnya benar-benar ada.
  penyetujuId: "01J...PENGGUNA-MANAJER",
} satisfies Prisma.StokOpnameUncheckedCreateInput;

// Baris opname yang BELUM dihitung: kuantitasFisik/selisih tidak diisi. Kalau
// keduanya ternyata masih non-null, baris ini gagal compile - dan implementasi
// akan terpaksa menulis 0, yang membuat selisih sebesar SELURUH SALDO dan
// memposting koreksi yang MENGHAPUS STOK NYATA.
const contohOpnameBarisBelumDihitung = {
  id: "01J...OPNAME-BARIS",
  stokOpnameId: contohOpnameDraf.id,
  bahanId: BAHAN,
  kuantitasSistem: 120.75,
} satisfies Prisma.StokOpnameBarisUncheckedCreateInput;

const contohOpnameBarisSudahDihitung = {
  id: "01J...OPNAME-BARIS-B",
  stokOpnameId: contohOpnameDisetujui.id,
  bahanId: BAHAN,
  lokasiStokId: contohLokasiFreezer.id,
  kuantitasSistem: 120.75,
  kuantitasFisik: 118,
  selisih: -2.75,
  alasan: "Susut penyimpanan",
  dihitungPada: new Date("2026-07-25T16:00:00.000Z"),
  mutasiKoreksiId: "01J...MUTASI-KOREKSI",
} satisfies Prisma.StokOpnameBarisUncheckedCreateInput;

const seluruhStatusOpname: Prisma.StokOpnameUncheckedCreateInput["status"][] = [
  "DRAF",
  "SEDANG_DIHITUNG",
  "DIKUNCI",
  "MENUNGGU_PERSETUJUAN",
  "DISETUJUI",
  "DIPOSTING",
  "DIBATALKAN",
];

// Menjaga seluruh binding "terpakai" bagi linter tanpa efek runtime apa pun -
// nilai sebenarnya dari file ini adalah pengecekan TIPE saat `tsc --noEmit`.
export const contohPersediaanAltDef008 = {
  contohLokasiTanpaJenis,
  contohLokasiFreezer,
  contohMutasiPembelian,
  contohMutasiPemakaian,
  contohMutasiTransferKeluar,
  seluruhJenisMutasi,
  contohSaldoAgregatGudang,
  contohSaldoPerLokasi,
  contohBatchPembelian,
  contohBatchHasilProduksi,
  contohReservasiAktif,
  seluruhStatusReservasi,
  contohPenyesuaian,
  contohAlasanWaste,
  contohCatatanWaste,
  contohTransferDraf,
  contohTransferBarisBaru,
  seluruhStatusTransfer,
  contohKebijakanReorder,
  contohPengaturanDefault,
  contohPengaturanEksplisit,
  contohOpnameDraf,
  contohOpnameDisetujui,
  contohOpnameBarisBelumDihitung,
  contohOpnameBarisSudahDihitung,
  seluruhStatusOpname,
} as const;
