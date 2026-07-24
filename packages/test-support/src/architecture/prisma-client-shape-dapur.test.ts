// Test compile-time untuk ALT-DEF-006: memverifikasi bahwa `@prisma/client`
// yang di-generate dari prisma/schema/schema.prisma benar-benar mengekspos tipe
// input `UncheckedCreateInput` yang sesuai untuk model-model baru/diperbarui
// pada batch KDS multi-stasiun - bukan hanya bahwa schema.prisma valid secara
// teks (lihat dapur-kds-multi-stasiun.test.ts untuk assertion berbasis teks).
//
// Nilai tambah file ini di atas assertion teks: ia membuktikan bahwa Prisma
// benar-benar MENAFSIRKAN skema sesuai maksud kita - mis. bahwa
// `Pesanan.tiketDapur` sungguh 1:N (sehingga `TiketDapurUncheckedCreateInput`
// menerima `pesananId` yang sama untuk lebih dari satu tiket tanpa tipe
// one-to-one), dan bahwa `nomorGelombang` punya default (opsional saat create).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian pass ALT-DEF-006
// untuk output `prisma generate` dan `tsc --noEmit --strict` aktual.

import type { Prisma } from "@prisma/client";

// --- ADR-018 Keputusan 5: StatusTiketDapur 8 nilai, dipakai sebagai literal type ---

// Bila salah satu nilai di bawah TIDAK ada di enum yang di-generate, baris
// `satisfies` ini gagal compile - itulah assertion-nya.
const semuaStatusTiketDapur = [
  "BARU",
  "DITERIMA",
  "DITAHAN",
  "SEDANG_DISIAPKAN",
  "SELESAI_SEBAGIAN",
  "SIAP",
  "DISAJIKAN",
  "DIBATALKAN",
] satisfies Prisma.TiketDapurUncheckedCreateInput["status"][];

// --- ADR-018 Keputusan 1: kardinalitas 1:N - DUA tiket, `pesananId` SAMA ---
//
// Inti defect ALT-DEF-006: di bawah skema lama (`pesananId @unique`) kedua
// objek ini tidak akan pernah bisa hidup berdampingan di database. Keduanya
// dideklarasikan di sini untuk menegaskan bahwa bentuk data ini kini SAH -
// dibedakan hanya oleh `stasiunDapurId` (constraint komposit baru).

const PESANAN_ID = "01J...PESANAN";

const tiketStasiunDapur = {
  id: "01J...TIKET-DAPUR",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  pesananId: PESANAN_ID,
  stasiunDapurId: "01J...STASIUN-DAPUR-PANAS",
  status: "BARU",
  // nomorGelombang sengaja TIDAK diisi - membuktikan @default(1) terbaca Prisma
  // sebagai field opsional saat create.
} satisfies Prisma.TiketDapurUncheckedCreateInput;

const tiketStasiunBar = {
  id: "01J...TIKET-BAR",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  // pesananId SAMA dengan tiket di atas - sah sejak ALT-DEF-006.
  pesananId: PESANAN_ID,
  stasiunDapurId: "01J...STASIUN-BAR",
  status: "BARU",
} satisfies Prisma.TiketDapurUncheckedCreateInput;

// Tiket gelombang KEDUA di stasiun yang SAMA dengan tiketStasiunDapur -
// dibedakan oleh nomorGelombang (re-fire/repeat course, ADR-018 Keputusan 2).
const tiketGelombangKedua = {
  id: "01J...TIKET-DAPUR-G2",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  pesananId: PESANAN_ID,
  stasiunDapurId: "01J...STASIUN-DAPUR-PANAS",
  nomorGelombang: 2,
  status: "BARU",
} satisfies Prisma.TiketDapurUncheckedCreateInput;

// --- ADR-018 Keputusan 4: AturanRoutingDapur (ALT-DPR-002) ---
//
// Kedua varian di bawah menunjukkan invariant XOR: yang satu mengisi
// itemMenuId, yang lain kategoriMenuId. Keduanya harus type-check - buktinya
// XOR memang TIDAK dipaksakan di level tipe/database dan wajib divalidasi di
// service-layer (justru itulah isi ADR-018 Keputusan 4).

const aturanRoutingPerItem = {
  id: "01J...ATURAN-ITEM",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  itemMenuId: "01J...MENU-KOPI",
  kategoriMenuId: null,
  stasiunDapurId: "01J...STASIUN-BAR",
  prioritas: 10,
  status: "AKTIF",
} satisfies Prisma.AturanRoutingDapurUncheckedCreateInput;

const aturanRoutingPerKategori = {
  id: "01J...ATURAN-KATEGORI",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  itemMenuId: null,
  kategoriMenuId: "01J...KATEGORI-DESSERT",
  stasiunDapurId: "01J...STASIUN-DESSERT",
  status: "AKTIF",
} satisfies Prisma.AturanRoutingDapurUncheckedCreateInput;

// --- RiwayatStatusTiketDapur: kolom enum (bukan String), aktor nullable ---

const riwayatStatusTiket = {
  id: "01J...RIWAYAT-TIKET",
  tenantId: "01J...TENANT",
  tiketDapurId: tiketStasiunDapur.id,
  statusSebelumnya: "DITERIMA",
  statusBaru: "SEDANG_DISIAPKAN",
  diubahOlehId: "01J...PENGGUNA",
} satisfies Prisma.RiwayatStatusTiketDapurUncheckedCreateInput;

// Varian event sistem/timer tanpa aktor manusia (mis. auto-hold karena SLA) -
// membuktikan diubahOlehId memang nullable.
const riwayatStatusTiketOlehSistem = {
  id: "01J...RIWAYAT-TIKET-SISTEM",
  tenantId: "01J...TENANT",
  tiketDapurId: tiketStasiunDapur.id,
  statusSebelumnya: "SEDANG_DISIAPKAN",
  statusBaru: "DITAHAN",
  diubahOlehId: null,
} satisfies Prisma.RiwayatStatusTiketDapurUncheckedCreateInput;

// --- ADR-018 Keputusan 3: GelombangDapur sebagai model nyata ---

const gelombangBelumDipicu = {
  id: "01J...GELOMBANG-2",
  tenantId: "01J...TENANT",
  pesananId: PESANAN_ID,
  nomorGelombang: 2,
  status: "MENUNGGU",
  // dipicuPada/dipicuOlehId sengaja tidak diisi - gelombang belum dipicu.
} satisfies Prisma.GelombangDapurUncheckedCreateInput;

const gelombangSudahDipicu = {
  id: "01J...GELOMBANG-2-DIPICU",
  tenantId: "01J...TENANT",
  pesananId: PESANAN_ID,
  nomorGelombang: 2,
  dipicuPada: new Date("2026-07-25T12:34:56.000Z"),
  dipicuOlehId: "01J...PELAYAN",
  status: "DIPICU",
} satisfies Prisma.GelombangDapurUncheckedCreateInput;

// --- ADR-018 Keputusan 6: StatusMasakBaris TETAP enum terpisah ---
//
// `statusMasak` di bawah menerima nilai StatusMasakBaris, BUKAN
// StatusTiketDapur - kalau kedua enum digabung, "DITAHAN" akan lolos di sini.

const tiketDapurBaris = {
  id: "01J...BARIS",
  tiketDapurId: tiketStasiunDapur.id,
  itemPesananId: "01J...ITEM-PESANAN",
  statusMasak: "DIMASAK",
} satisfies Prisma.TiketDapurBarisUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipeDapur = {
  semuaStatusTiketDapur,
  tiketStasiunDapur,
  tiketStasiunBar,
  tiketGelombangKedua,
  aturanRoutingPerItem,
  aturanRoutingPerKategori,
  riwayatStatusTiket,
  riwayatStatusTiketOlehSistem,
  gelombangBelumDipicu,
  gelombangSudahDipicu,
  tiketDapurBaris,
};
