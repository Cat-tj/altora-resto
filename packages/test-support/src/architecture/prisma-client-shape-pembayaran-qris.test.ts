// Test compile-time untuk ALT-DEF-004 / ALT-DEF-014 / ALT-DEF-015:
// memverifikasi bahwa `@prisma/client` yang di-generate dari
// prisma/schema/schema.prisma benar-benar mengekspos tipe input yang sesuai
// untuk model pembayaran & QRIS - bukan hanya bahwa schema.prisma valid secara
// teks (lihat pembayaran-alokasi-metode-constraints.test.ts dan
// qris-konfigurasi-constraints.test.ts untuk assertion berbasis teks).
//
// Nilai tambah file ini di atas assertion teks: ia membuktikan bahwa Prisma
// benar-benar MENAFSIRKAN skema sesuai maksud kita - mis. bahwa
// `PembayaranUncheckedCreateInput` sungguh TIDAK LAGI menerima `pesananId`
// (kalau kolom itu diam-diam kembali, `@ts-expect-error` di bawah akan gagal
// compile karena tidak ada error untuk di-suppress), dan bahwa satu
// `pembayaranId` yang sama sah dipakai pada beberapa `AlokasiPembayaran`
// dengan `pesananId` berbeda (split/group bill).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian pass
// ALT-DEF-004/ALT-DEF-014/ALT-DEF-015 untuk output `prisma generate` dan
// `tsc --noEmit --strict` aktual.

import type { Prisma } from "@prisma/client";

// --- ALT-DEF-004 / ADR-019 Keputusan 7: KodeMetodeBayar PERSIS 4 nilai ---
//
// Bila salah satu nilai di bawah TIDAK ada di enum yang di-generate, baris
// `satisfies` ini gagal compile - itulah assertion positifnya.
const semuaMetodeBayar = [
  "TUNAI",
  "TRANSFER_MANUAL",
  "QRIS_MANUAL",
  "SALDO_TOKO",
] satisfies Prisma.MetodeBayarUncheckedCreateInput["kode"][];

// Assertion NEGATIF tingkat-tipe: metode di luar scope produk harus DITOLAK
// compiler. Bila `KARTU_KREDIT`/`EWALLET`/`CAMPURAN` diam-diam kembali ke enum,
// `@ts-expect-error` menjadi tidak terpakai dan build GAGAL - persis yang kita
// inginkan (ALT-QRS-010, ADR-019 Keputusan 3 & 7).
const metodeKartuDitolak = {
  id: "01J...METODE",
  tenantId: "01J...TENANT",
  // @ts-expect-error KARTU_KREDIT sudah dihapus dari KodeMetodeBayar (ALT-DEF-004).
  kode: "KARTU_KREDIT",
  nama: "Kartu Kredit",
} satisfies Prisma.MetodeBayarUncheckedCreateInput;

const metodeEwalletDitolak = {
  id: "01J...METODE",
  tenantId: "01J...TENANT",
  // @ts-expect-error EWALLET sudah dihapus dari KodeMetodeBayar (ALT-DEF-004).
  kode: "EWALLET",
  nama: "E-Wallet",
} satisfies Prisma.MetodeBayarUncheckedCreateInput;

const metodeCampuranDitolak = {
  id: "01J...METODE",
  tenantId: "01J...TENANT",
  // @ts-expect-error CAMPURAN bukan metode bayar - pembayaran campuran adalah
  // SATU Pembayaran dengan BEBERAPA PembayaranMetodeBaris (ADR-019 Keputusan 3).
  kode: "CAMPURAN",
  nama: "Campuran",
} satisfies Prisma.MetodeBayarUncheckedCreateInput;

// --- ALT-DEF-014 / ADR-020: StatusPembayaran 9 nilai ---

const semuaStatusPembayaran = [
  "DRAF",
  "MENUNGGU",
  "MENUNGGU_KONFIRMASI",
  "DIBAYAR",
  "GAGAL",
  "DIBATALKAN",
  "DIKOREKSI",
  "DIKEMBALIKAN_SEBAGIAN",
  "DIKEMBALIKAN",
] satisfies NonNullable<Prisma.PembayaranUncheckedCreateInput["status"]>[];

// Nilai lama harus benar-benar hilang dari enum yang di-generate.
const statusLamaDitolak = {
  id: "01J...PEMBAYARAN",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  jumlah: 80_000,
  totalDiterima: 80_000,
  // @ts-expect-error DIKONFIRMASI diganti DIBAYAR (ADR-020 Keputusan 1).
  status: "DIKONFIRMASI",
} satisfies Prisma.PembayaranUncheckedCreateInput;

// --- ALT-DEF-014 / ADR-019 Keputusan 1: Pembayaran TANPA pesananId ---
//
// Bentuk create yang SAH: tidak ada `pesananId` sama sekali, dan `status`
// tidak diisi (membuktikan @default(DRAF) terbaca Prisma sebagai opsional).
const pembayaranTanpaPesanan = {
  id: "01J...PEMBAYARAN",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  jumlah: 80_000,
  totalDiterima: 100_000,
  kembalian: 20_000,
} satisfies Prisma.PembayaranUncheckedCreateInput;

// Assertion NEGATIF tingkat-tipe - inti defect ALT-DEF-014: bila kolom
// `pesananId` diam-diam kembali ke model `Pembayaran`, `@ts-expect-error` di
// bawah tidak lagi punya error untuk di-suppress dan build GAGAL.
const pembayaranDenganPesananIdDitolak = {
  id: "01J...PEMBAYARAN",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  jumlah: 80_000,
  totalDiterima: 80_000,
  // @ts-expect-error Pembayaran TIDAK lagi terikat langsung ke satu Pesanan -
  // relasi ke pesanan SELALU lewat AlokasiPembayaran (ADR-019 Keputusan 1).
  pesananId: "01J...PESANAN",
} satisfies Prisma.PembayaranUncheckedCreateInput;

// Nama kolom lama `totalDibayar` juga harus sudah tidak ada.
const pembayaranDenganTotalDibayarDitolak = {
  id: "01J...PEMBAYARAN",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  jumlah: 80_000,
  totalDiterima: 80_000,
  // @ts-expect-error totalDibayar diganti nama menjadi `jumlah` (ADR-019 Keputusan 1).
  totalDibayar: 80_000,
} satisfies Prisma.PembayaranUncheckedCreateInput;

// --- ADR-019 Keputusan 1 & 2: satu Pembayaran -> BANYAK Pesanan (group bill) ---
//
// Kedua objek di bawah memakai `pembayaranId` yang SAMA dengan `pesananId`
// BERBEDA. Di bawah skema lama (Pembayaran 1:1 Pesanan) bentuk data ini
// mustahil; kini ia sah dan hanya dibatasi @@unique([pembayaranId, pesananId]).

const PEMBAYARAN_ID = "01J...PEMBAYARAN";

const alokasiKeMejaSatu = {
  id: "01J...ALOKASI-1",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  pesananId: "01J...PESANAN-MEJA-1",
  jumlah: 50_000,
} satisfies Prisma.AlokasiPembayaranUncheckedCreateInput;

const alokasiKeMejaDua = {
  id: "01J...ALOKASI-2",
  tenantId: "01J...TENANT",
  // pembayaranId SAMA dengan alokasi di atas - sah sejak ALT-DEF-014.
  pembayaranId: PEMBAYARAN_ID,
  pesananId: "01J...PESANAN-MEJA-2",
  jumlah: 30_000,
} satisfies Prisma.AlokasiPembayaranUncheckedCreateInput;

// --- ADR-019 Keputusan 1: satu Pesanan -> BANYAK Pembayaran (bayar bertahap) ---

const PESANAN_ID = "01J...PESANAN-BERTAHAP";

const alokasiCicilanPertama = {
  id: "01J...ALOKASI-3",
  tenantId: "01J...TENANT",
  pembayaranId: "01J...PEMBAYARAN-A",
  pesananId: PESANAN_ID,
  jumlah: 40_000,
} satisfies Prisma.AlokasiPembayaranUncheckedCreateInput;

const alokasiCicilanKedua = {
  id: "01J...ALOKASI-4",
  tenantId: "01J...TENANT",
  pembayaranId: "01J...PEMBAYARAN-B",
  // pesananId SAMA dengan alokasi di atas - inilah pembayaran sebagian/
  // bertahap (ALT-KSR-005) yang sebelumnya tidak dapat dimodelkan.
  pesananId: PESANAN_ID,
  jumlah: 60_000,
} satisfies Prisma.AlokasiPembayaranUncheckedCreateInput;

// --- ADR-019 Keputusan 3: pembayaran CAMPURAN = dua baris metode, satu Pembayaran ---

const barisTunai = {
  id: "01J...BARIS-TUNAI",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  metodeBayarId: "01J...METODE-TUNAI",
  jumlah: 50_000,
} satisfies Prisma.PembayaranMetodeBarisUncheckedCreateInput;

const barisQris = {
  id: "01J...BARIS-QRIS",
  tenantId: "01J...TENANT",
  // pembayaranId SAMA - inilah mekanisme "campuran" (ADR-019 Keputusan 3).
  pembayaranId: PEMBAYARAN_ID,
  metodeBayarId: "01J...METODE-QRIS",
  jumlah: 30_000,
} satisfies Prisma.PembayaranMetodeBarisUncheckedCreateInput;

// --- ADR-019 Keputusan 6: KoreksiPembayaran (append-only) ---

const koreksiPembayaran = {
  id: "01J...KOREKSI",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  alasan: "Kasir salah mengetik 150.000 untuk tagihan 15.000.",
  jumlahSebelum: 150_000,
  jumlahSesudah: 15_000,
  dikoreksiOlehId: "01J...SUPERVISOR",
} satisfies Prisma.KoreksiPembayaranUncheckedCreateInput;

// --- ADR-019 Keputusan 8: anak Pembayaran wajib membawa tenantId ---

const refund = {
  id: "01J...REFUND",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  jumlah: 15_000,
  alasan: "Item dibatalkan setelah pembayaran.",
  disetujuiOlehId: "01J...SUPERVISOR",
} satisfies Prisma.PembayaranRefundUncheckedCreateInput;

const struk = {
  id: "01J...STRUK",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  nomorStruk: "STR-2026-000001",
} satisfies Prisma.StrukUncheckedCreateInput;

// --- ALT-DEF-015 / ADR-021: KonfigurasiQris ---

const semuaStatusKonfigurasiQris = [
  "DRAF",
  "MENUNGGU_VERIFIKASI",
  "AKTIF",
  "NONAKTIF",
] satisfies NonNullable<Prisma.KonfigurasiQrisUncheckedCreateInput["status"]>[];

const konfigurasiQris = {
  id: "01J...KONFIG-QRIS",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  // Ciphertext base64 (nonce || tag || ciphertext) - payload EMV mentah TIDAK
  // PERNAH ditulis ke kolom mana pun (ADR-021 Keputusan 2).
  payloadTerenkripsi: "BASE64_NONCE_TAG_CIPHERTEXT",
  // SHA-256 atas payload PLAINTEXT - untuk dedup/deteksi perubahan tanpa dekripsi.
  fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  namaMerchant: "Warung Altora",
  kotaMerchant: "Bandung",
  dibuatOlehId: "01J...MANAJER",
  // status sengaja TIDAK diisi - membuktikan @default(DRAF) terbaca Prisma
  // sebagai opsional (konfigurasi baru tidak boleh langsung AKTIF).
} satisfies Prisma.KonfigurasiQrisUncheckedCreateInput;

// Assertion NEGATIF: tidak boleh ada kolom payload PLAINTEXT.
const konfigurasiPayloadMentahDitolak = {
  id: "01J...KONFIG-QRIS",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  payloadTerenkripsi: "BASE64_NONCE_TAG_CIPHERTEXT",
  fingerprint: "sha256:0000",
  namaMerchant: "Warung Altora",
  kotaMerchant: "Bandung",
  dibuatOlehId: "01J...MANAJER",
  // @ts-expect-error payload QRIS mentah TIDAK PERNAH boleh punya kolom sendiri
  // - hanya payloadTerenkripsi (ALT-QRS-005/ALT-SEC-007, ADR-021 Keputusan 2).
  payload: "00020101021126...6304ABCD",
} satisfies Prisma.KonfigurasiQrisUncheckedCreateInput;

// --- ALT-QRS-008: RiwayatKonfigurasiQris (append-only) ---

const semuaAksiKonfigurasiQris = [
  "DIBUAT",
  "DIUBAH",
  "DIAKTIFKAN",
  "DINONAKTIFKAN",
  "DIVERIFIKASI",
] satisfies Prisma.RiwayatKonfigurasiQrisUncheckedCreateInput["aksi"][];

const riwayatKonfigurasiQris = {
  id: "01J...RIWAYAT-QRIS",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  konfigurasiQrisId: "01J...KONFIG-QRIS",
  aksi: "DIAKTIFKAN",
  // `sebelum`/`sesudah` hanya METADATA - TIDAK PERNAH memuat payload (baik
  // terenkripsi maupun plaintext), agar tabel audit tidak menjadi jalur
  // kebocoran yang melewati ALT-SEC-007 (ADR-021 Keputusan 1).
  sebelum: { status: "MENUNGGU_VERIFIKASI", namaMerchant: "Warung Altora" },
  sesudah: { status: "AKTIF", namaMerchant: "Warung Altora" },
  dilakukanOlehId: "01J...MANAJER",
} satisfies Prisma.RiwayatKonfigurasiQrisUncheckedCreateInput;

// --- ALT-QRS-007 / ADR-019 Keputusan 8: QrisKonfirmasiManual tenant-scoped ---

const qrisKonfirmasiManual = {
  id: "01J...KONFIRMASI",
  tenantId: "01J...TENANT",
  pembayaranId: PEMBAYARAN_ID,
  catatanKasir: "Ref BCA 20260725-0093",
  // WAJIB - baris ini adalah bukti bahwa SEORANG KASIR memverifikasi dana
  // masuk; tombol pelanggan tidak pernah menghasilkannya (ADR-020 Keputusan 2).
  diverifikasiOlehId: "01J...KASIR",
} satisfies Prisma.QrisKonfirmasiManualUncheckedCreateInput;

// Menyentuh setiap konstanta agar tidak dianggap unused oleh linter/tsc
// (`noUnusedLocals`) - nilai runtime-nya tidak relevan, keberadaan tipe-nyalah
// yang menjadi assertion.
export const bentukPembayaranQrisTerverifikasi = {
  semuaMetodeBayar,
  metodeKartuDitolak,
  metodeEwalletDitolak,
  metodeCampuranDitolak,
  semuaStatusPembayaran,
  statusLamaDitolak,
  pembayaranTanpaPesanan,
  pembayaranDenganPesananIdDitolak,
  pembayaranDenganTotalDibayarDitolak,
  alokasiKeMejaSatu,
  alokasiKeMejaDua,
  alokasiCicilanPertama,
  alokasiCicilanKedua,
  barisTunai,
  barisQris,
  koreksiPembayaran,
  refund,
  struk,
  semuaStatusKonfigurasiQris,
  konfigurasiQris,
  konfigurasiPayloadMentahDitolak,
  semuaAksiKonfigurasiQris,
  riwayatKonfigurasiQris,
  qrisKonfirmasiManual,
} as const;
