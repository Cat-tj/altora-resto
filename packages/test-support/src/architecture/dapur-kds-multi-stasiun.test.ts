// Test struktur/arsitektur untuk ALT-DEF-006 (KDS multi-stasiun: kardinalitas
// Pesanan<->TiketDapur, gelombang masak, dan routing item ke stasiun).
//
// KONTEKS: Sama seperti test arsitektur batch-batch sebelumnya (lihat
// tenant-outlet-composite-constraints.test.ts, sesi-auth-pin-constraints.test.ts,
// pesanan-state-machine-snapshot-constraints.test.ts), tidak ada Postgres nyata
// di environment correction-loop ini (lihat ALT-DEF-029), sehingga integration
// test sungguhan terhadap database belum bisa dijalankan pada pass ini. File
// ini adalah "architecture test" berbasis pembacaan teks skema Prisma -
// memverifikasi bahwa perubahan kardinalitas, enum 8-status, dan model baru
// (AturanRoutingDapur/RiwayatStatusTiketDapur/GelombangDapur) yang diklaim di
// ADR-018 (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Yang secara SENGAJA diuji sebagai assertion NEGATIF (assertNotContains):
// `TiketDapur.pesananId @unique` dan `@@unique([tenantId, pesananId])` lama
// harus benar-benar HILANG - inilah inti defect ALT-DEF-006. Menguji hanya
// keberadaan constraint baru tidak cukup, karena skema bisa saja memuat
// KEDUANYA sekaligus (constraint lama yang tertinggal akan tetap memaksa
// kardinalitas 1:1 dan membuat perbaikan ini tidak berefek sama sekali).
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR sama seperti file-file
// architecture test lain. Yang SUDAH dijalankan secara nyata adalah
// `tsc --noEmit --strict` atas file ini dan `node --experimental-strip-types`
// untuk mengeksekusi assertion di bawah - lihat RELEASE-EVIDENCE.md untuk
// output aktual.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../../prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(__dirname, "../../../../prisma/seed/izin.seed.ts");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

// ALT-DEF-033: cocokkan needle dengan runs spasi/tab horizontal dinormalisasi.
// `prisma format` menyelaraskan lebar kolom antar-field, sehingga menambah satu
// field baru ke sebuah model menggeser spasi pada baris LAIN yang tidak
// disentuh - assertion whitespace-exact akan gagal PALSU. Newline TIDAK
// dinormalisasi supaya needle yang memakai "\n" (penanda awal deklarasi field)
// tetap bermakna.
function normalisasiSpasiHorizontal(teks: string): string {
  return teks.replace(/[ \t]+/g, " ");
}

function assertContains(haystack: string, needle: string, pesan: string): void {
  if (!normalisasiSpasiHorizontal(haystack).includes(normalisasiSpasiHorizontal(needle))) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nTidak ditemukan: ${JSON.stringify(needle)}`);
  }
}

function assertNotContains(haystack: string, needle: string, pesan: string): void {
  if (normalisasiSpasiHorizontal(haystack).includes(normalisasiSpasiHorizontal(needle))) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nSeharusnya tidak ditemukan tetapi ada: ${JSON.stringify(needle)}`);
  }
}

function assertEqual(aktual: unknown, diharapkan: unknown, pesan: string): void {
  if (aktual !== diharapkan) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nDiharapkan: ${String(diharapkan)}, aktual: ${String(aktual)}`);
  }
}

function getBlock(schema: string, pattern: RegExp, label: string): string {
  const match = schema.match(pattern);
  if (!match) {
    throw new Error(`ASSERTION GAGAL: ${label} tidak ditemukan di schema.prisma`);
  }
  return match[0];
}

function getEnumBody(schema: string, enumName: string): string {
  return getBlock(schema, new RegExp(`enum ${enumName} \\{[\\s\\S]*?\\n\\}`), `enum ${enumName}`);
}

function getModelBody(schema: string, modelName: string): string {
  return getBlock(schema, new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`), `model ${modelName}`);
}

// Mengambil daftar nilai enum sebagai array, mengabaikan komentar dan baris
// kosong - dipakai untuk memastikan JUMLAH nilai enum persis, bukan sekadar
// "memuat nilai X" (yang tidak akan menangkap nilai lama yang tertinggal).
function getNilaiEnum(schema: string, enumName: string): string[] {
  const body = getEnumBody(schema, enumName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ADR-018 Keputusan 1: kardinalitas Pesanan -> TiketDapur menjadi 1:N
  // ===================================================================
  const tiketDapurBody = getModelBody(schema, "TiketDapur");

  // Assertion NEGATIF - inti defect ALT-DEF-006: `@unique` tunggal lama HARUS hilang.
  assertNotContains(
    tiketDapurBody,
    "pesananId String @unique",
    "TiketDapur.pesananId TIDAK boleh lagi punya @unique tunggal - inilah constraint yang memaksa kardinalitas 1:1 dan menjadi inti defect ALT-DEF-006 (ADR-018 Keputusan 1).",
  );
  // `@@unique([tenantId, pesananId])` lama (yang hanya ada untuk memenuhi syarat
  // relasi one-to-one Prisma) juga harus hilang - kalau tertinggal, ia SENDIRI
  // masih memaksa satu tiket per pesanan per tenant, jadi perbaikan tidak berefek.
  assertNotContains(
    tiketDapurBody,
    "@@unique([tenantId, pesananId])",
    "TiketDapur TIDAK boleh lagi punya @@unique([tenantId, pesananId]) - constraint itu masih akan memaksa kardinalitas 1:1 walaupun @unique tunggal sudah dihapus (ADR-018 Keputusan 1).",
  );

  // Assertion POSITIF: constraint komposit pengganti.
  assertContains(
    tiketDapurBody,
    "@@unique([pesananId, stasiunDapurId, nomorGelombang])",
    "TiketDapur harus punya @@unique([pesananId, stasiunDapurId, nomorGelombang]) - paling banyak SATU tiket per kombinasi (pesanan, stasiun, gelombang) (ADR-018 Keputusan 1).",
  );
  assertContains(
    tiketDapurBody,
    "nomorGelombang Int @default(1)",
    "TiketDapur harus punya kolom nomorGelombang Int @default(1) - dipakai sebagai bagian dari constraint komposit di atas.",
  );
  // pesananId tetap ada sebagai kolom biasa (bukan dihapus) - hanya @unique-nya yang hilang.
  assertContains(
    tiketDapurBody,
    "\n pesananId String\n",
    "TiketDapur.pesananId harus tetap ada sebagai kolom String biasa (tanpa @unique) - yang dihapus hanya constraint uniknya, bukan kolomnya.",
  );

  // Sisi Pesanan: relasi harus menjadi list, bukan opsional-tunggal.
  const pesananBody = getModelBody(schema, "Pesanan");
  assertContains(
    pesananBody,
    "tiketDapur TiketDapur[]",
    "Pesanan.tiketDapur harus bertipe list TiketDapur[] (1:N) - satu pesanan kini menghasilkan banyak tiket (ADR-018 Keputusan 1).",
  );
  assertNotContains(
    pesananBody,
    "tiketDapur TiketDapur?\n",
    "Pesanan.tiketDapur TIDAK boleh lagi bertipe TiketDapur? (1:1) - itu bentuk lama sebelum ALT-DEF-006.",
  );
  assertContains(
    pesananBody,
    "gelombangDapur GelombangDapur[]",
    "Pesanan harus punya relasi list ke GelombangDapur (ADR-018 Keputusan 3).",
  );

  // Regresi ALT-DEF-010: composite-FK TiketDapur TIDAK boleh rusak oleh batch ini.
  assertContains(
    tiketDapurBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "REGRESI ALT-DEF-010: TiketDapur.outlet harus TETAP composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    tiketDapurBody,
    "pesanan Pesanan @relation(fields: [tenantId, pesananId], references: [tenantId, id])",
    "REGRESI ALT-DEF-010: TiketDapur.pesanan harus TETAP composite FK (tenantId, pesananId) -> Pesanan(tenantId, id), kini sebagai relasi many-to-one.",
  );
  assertContains(
    tiketDapurBody,
    "stasiunDapur StasiunDapur? @relation(fields: [outletId, stasiunDapurId], references: [outletId, id])",
    "REGRESI ALT-DEF-010: TiketDapur.stasiunDapur harus TETAP composite FK (outletId, stasiunDapurId) -> StasiunDapur(outletId, id).",
  );
  // Pesanan harus tetap punya @@unique([tenantId, id]) - composite-FK di atas bergantung padanya.
  assertContains(
    pesananBody,
    "@@unique([tenantId, id])",
    "REGRESI ALT-DEF-010: Pesanan harus TETAP punya @@unique([tenantId, id]) - composite-FK TiketDapur.pesanan bergantung padanya.",
  );

  // ===================================================================
  // ADR-018 Keputusan 5: StatusTiketDapur 8 nilai
  // ===================================================================
  const STATUS_TIKET_8 = [
    "BARU",
    "DITERIMA",
    "DITAHAN",
    "SEDANG_DISIAPKAN",
    "SELESAI_SEBAGIAN",
    "SIAP",
    "DISAJIKAN",
    "DIBATALKAN",
  ];
  const nilaiStatusTiket = getNilaiEnum(schema, "StatusTiketDapur");
  assertEqual(
    nilaiStatusTiket.length,
    8,
    `StatusTiketDapur harus punya PERSIS 8 nilai (ADR-018 Keputusan 5). Aktual: [${nilaiStatusTiket.join(", ")}]`,
  );
  for (const nilai of STATUS_TIKET_8) {
    if (!nilaiStatusTiket.includes(nilai)) {
      throw new Error(
        `ASSERTION GAGAL: StatusTiketDapur harus memuat nilai enum ${nilai} (ADR-018 Keputusan 5). Aktual: [${nilaiStatusTiket.join(", ")}]`,
      );
    }
  }
  // Nilai lama harus benar-benar hilang - dicek terhadap daftar nilai yang
  // sudah diparse (bukan terhadap teks blok mentah, supaya penyebutan di
  // komentar migrasi tidak menghasilkan false positive).
  for (const nilaiLama of ["MASUK_ANTRIAN", "DIPROSES", "DIAMBIL_PELAYAN"]) {
    if (nilaiStatusTiket.includes(nilaiLama)) {
      throw new Error(
        `ASSERTION GAGAL: StatusTiketDapur seharusnya sudah TIDAK memuat nilai lama ${nilaiLama} (digantikan 8 nilai baru, ADR-018 Keputusan 5).`,
      );
    }
  }
  // Default status tiket ikut berubah dari MASUK_ANTRIAN ke BARU.
  assertContains(
    tiketDapurBody,
    "status StatusTiketDapur @default(BARU)",
    "TiketDapur.status harus @default(BARU) - MASUK_ANTRIAN sudah tidak ada lagi (ADR-018 Keputusan 5).",
  );

  // ===================================================================
  // ADR-018 Keputusan 6: StatusMasakBaris TETAP enum terpisah, tidak digabung
  // ===================================================================
  const nilaiStatusMasak = getNilaiEnum(schema, "StatusMasakBaris");
  assertEqual(
    nilaiStatusMasak.length,
    3,
    `StatusMasakBaris harus TETAP punya 3 nilai dan TIDAK digabung ke StatusTiketDapur (ADR-018 Keputusan 6). Aktual: [${nilaiStatusMasak.join(", ")}]`,
  );
  for (const nilai of ["MENUNGGU", "DIMASAK", "SIAP"]) {
    if (!nilaiStatusMasak.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusMasakBaris harus memuat nilai enum ${nilai} (ADR-018 Keputusan 6).`);
    }
  }
  const tiketDapurBarisBody = getModelBody(schema, "TiketDapurBaris");
  assertContains(
    tiketDapurBarisBody,
    "statusMasak StatusMasakBaris",
    "TiketDapurBaris.statusMasak harus TETAP bertipe StatusMasakBaris (bukan StatusTiketDapur) - ADR-018 Keputusan 6.",
  );

  // ADR-018 Keputusan 2: itemPesananId TETAP @unique (keputusan eksplisit, bukan kelalaian).
  assertContains(
    tiketDapurBarisBody,
    "itemPesananId String @unique",
    "TiketDapurBaris.itemPesananId harus TETAP @unique - keputusan eksplisit ADR-018 Keputusan 2 (satu ItemPesanan pergi ke tepat satu tiket; re-fire dimodelkan sebagai TiketDapur gelombang BERBEDA, bukan baris kedua di tiket yang sama).",
  );

  // ===================================================================
  // ADR-018 Keputusan 4: AturanRoutingDapur (ALT-DPR-002)
  // ===================================================================
  const aturanRoutingBody = getModelBody(schema, "AturanRoutingDapur");
  for (const kolom of [
    "tenantId",
    "outletId",
    "itemMenuId",
    "kategoriMenuId",
    "stasiunDapurId",
    "prioritas",
    "status",
  ]) {
    assertContains(aturanRoutingBody, kolom, `AturanRoutingDapur harus punya kolom ${kolom} (ALT-DPR-002).`);
  }
  // Invariant XOR: KEDUA kolom harus nullable (String?) - kalau salah satu
  // dibuat wajib, XOR-nya mustahil dipenuhi.
  assertContains(
    aturanRoutingBody,
    "itemMenuId String?",
    "AturanRoutingDapur.itemMenuId harus nullable (String?) - invariant XOR dengan kategoriMenuId (ADR-018 Keputusan 4).",
  );
  assertContains(
    aturanRoutingBody,
    "kategoriMenuId String?",
    "AturanRoutingDapur.kategoriMenuId harus nullable (String?) - invariant XOR dengan itemMenuId (ADR-018 Keputusan 4).",
  );
  // Relasi composite-FK mengikuti pola ADR-013/ALT-DEF-010.
  assertContains(
    aturanRoutingBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "AturanRoutingDapur.outlet harus composite FK (tenantId, outletId) -> Outlet(tenantId, id) mengikuti ALT-DEF-010.",
  );
  assertContains(
    aturanRoutingBody,
    "itemMenu ItemMenu? @relation(fields: [tenantId, itemMenuId], references: [tenantId, id])",
    "AturanRoutingDapur.itemMenu harus composite FK nullable (tenantId, itemMenuId) -> ItemMenu(tenantId, id).",
  );
  assertContains(
    aturanRoutingBody,
    "kategoriMenu KategoriMenu? @relation(fields: [tenantId, kategoriMenuId], references: [tenantId, id])",
    "AturanRoutingDapur.kategoriMenu harus composite FK nullable (tenantId, kategoriMenuId) -> KategoriMenu(tenantId, id).",
  );
  assertContains(
    aturanRoutingBody,
    "stasiunDapur StasiunDapur @relation(fields: [outletId, stasiunDapurId], references: [outletId, id])",
    "AturanRoutingDapur.stasiunDapur harus composite FK level-outlet (outletId, stasiunDapurId) -> StasiunDapur(outletId, id) - menjamin stasiun tujuan berada di outlet yang sama dengan aturan.",
  );
  // Back-relation wajib ada di sisi lawan, kalau tidak `prisma validate` gagal.
  assertContains(
    getModelBody(schema, "KategoriMenu"),
    "aturanRoutingDapur AturanRoutingDapur[]",
    "KategoriMenu harus punya back-relation ke AturanRoutingDapur.",
  );
  assertContains(
    getModelBody(schema, "ItemMenu"),
    "aturanRoutingDapur AturanRoutingDapur[]",
    "ItemMenu harus punya back-relation ke AturanRoutingDapur.",
  );
  assertContains(
    getModelBody(schema, "StasiunDapur"),
    "aturanRoutingDapur AturanRoutingDapur[]",
    "StasiunDapur harus punya back-relation ke AturanRoutingDapur.",
  );

  // ===================================================================
  // RiwayatStatusTiketDapur - enum-typed history (pola PesananRiwayatStatus)
  // ===================================================================
  const riwayatTiketBody = getModelBody(schema, "RiwayatStatusTiketDapur");
  assertContains(
    riwayatTiketBody,
    "statusSebelumnya StatusTiketDapur",
    "RiwayatStatusTiketDapur.statusSebelumnya harus bertipe enum StatusTiketDapur, bukan String bebas (pola yang sama dengan PesananRiwayatStatus, ALT-DEF-005).",
  );
  assertContains(
    riwayatTiketBody,
    "statusBaru StatusTiketDapur",
    "RiwayatStatusTiketDapur.statusBaru harus bertipe enum StatusTiketDapur, bukan String bebas.",
  );
  assertNotContains(
    riwayatTiketBody,
    "statusSebelumnya String",
    "RiwayatStatusTiketDapur.statusSebelumnya TIDAK boleh bertipe String bebas - itulah kelemahan yang sudah diperbaiki pada PesananRiwayatStatus (ALT-DEF-005).",
  );
  assertContains(
    riwayatTiketBody,
    "diubahOlehId String?",
    "RiwayatStatusTiketDapur.diubahOlehId harus nullable - event sistem/timer (mis. auto-hold SLA) tidak selalu punya aktor manusia.",
  );
  assertContains(
    tiketDapurBody,
    "riwayatStatus RiwayatStatusTiketDapur[]",
    "TiketDapur harus punya relasi list ke RiwayatStatusTiketDapur.",
  );

  // ===================================================================
  // ADR-018 Keputusan 3: GelombangDapur sebagai model NYATA
  // ===================================================================
  const gelombangBody = getModelBody(schema, "GelombangDapur");
  for (const kolom of ["tenantId", "pesananId", "nomorGelombang", "dipicuPada", "dipicuOlehId", "status"]) {
    assertContains(gelombangBody, kolom, `GelombangDapur harus punya kolom ${kolom} (ADR-018 Keputusan 3).`);
  }
  assertContains(
    gelombangBody,
    "@@unique([pesananId, nomorGelombang])",
    "GelombangDapur harus punya @@unique([pesananId, nomorGelombang]) - satu baris gelombang per nomor gelombang per pesanan.",
  );
  assertContains(
    gelombangBody,
    "status StatusGelombangDapur",
    "GelombangDapur.status harus bertipe enum StatusGelombangDapur (agregat lintas-tiket, terpisah dari StatusTiketDapur).",
  );
  assertContains(
    gelombangBody,
    "pesanan Pesanan @relation(fields: [tenantId, pesananId], references: [tenantId, id])",
    "GelombangDapur.pesanan harus composite FK (tenantId, pesananId) -> Pesanan(tenantId, id) mengikuti ALT-DEF-010/ADR-013.",
  );
  const nilaiStatusGelombang = getNilaiEnum(schema, "StatusGelombangDapur");
  assertEqual(
    nilaiStatusGelombang.length,
    3,
    `StatusGelombangDapur harus punya 3 nilai (MENUNGGU/DIPICU/SELESAI). Aktual: [${nilaiStatusGelombang.join(", ")}]`,
  );
  for (const nilai of ["MENUNGGU", "DIPICU", "SELESAI"]) {
    if (!nilaiStatusGelombang.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusGelombangDapur harus memuat nilai enum ${nilai}.`);
    }
  }

  // ===================================================================
  // Back-relation Tenant/Pengguna untuk tiga model baru
  // ===================================================================
  const tenantBody = getModelBody(schema, "Tenant");
  for (const relasi of [
    "riwayatStatusTiketDapur RiwayatStatusTiketDapur[]",
    "gelombangDapur GelombangDapur[]",
    "aturanRoutingDapur AturanRoutingDapur[]",
  ]) {
    assertContains(tenantBody, relasi, `Tenant harus punya back-relation "${relasi}" untuk model baru ALT-DEF-006.`);
  }
  // ADR-033: diubahOlehId/dipicuOlehId sekarang composite-FK tenant-scoped ke
  // KeanggotaanTenant (bukan lagi FK langsung ke Pengguna) - back-relation
  // dipindah ke KeanggotaanTenant.
  const keanggotaanTenantBody = getModelBody(schema, "KeanggotaanTenant");
  assertContains(
    keanggotaanTenantBody,
    'riwayatStatusTiketDapurDiubah   RiwayatStatusTiketDapur[] @relation("RiwayatStatusTiketDapurDiubahOleh")',
    "KeanggotaanTenant harus punya back-relation ke RiwayatStatusTiketDapur (aktor yang mengubah status tiket, ADR-033).",
  );
  assertContains(
    keanggotaanTenantBody,
    'gelombangDapurDipicu            GelombangDapur[]          @relation("GelombangDapurDipicuOleh")',
    "KeanggotaanTenant harus punya back-relation ke GelombangDapur (aktor yang memicu gelombang, ADR-033).",
  );

  // ===================================================================
  // Katalog izin: 11 kode domain `dapur` baru (ALT-DEF-006)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  const KODE_DAPUR = [
    "dapur.stasiun.kelola",
    "dapur.routing.kelola",
    "dapur.tiket.buat-otomatis",
    "dapur.tiket.lihat",
    "dapur.tiket.prioritas",
    "dapur.tiket.tahan",
    "dapur.baris.siap",
    "dapur.tiket.siap",
    "dapur.tiket.ambil",
    "dapur.cetak",
    "dapur.cetak-ulang",
  ];
  for (const kode of KODE_DAPUR) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" (domain dapur, ALT-DEF-006).`,
    );
  }
  // Tidak boleh ada kode duplikat setelah penambahan 11 kode di atas
  // (Izin.kode unik global) - dicek langsung dari teks seed, bukan lewat
  // import runtime (file seed diimpor oleh keanggotaan-izin.test.ts).
  // `m[1]` bertipe `string | undefined` di bawah noUncheckedIndexedAccess -
  // capture group 1 selalu ada bila regex cocok, tapi difilter eksplisit agar
  // type-safe tanpa non-null assertion.
  const semuaKode = [...izinSeed.matchAll(/kode: "([^"]+)"/g)]
    .map((m) => m[1])
    .filter((kode): kode is string => kode !== undefined);
  const terlihat = new Set<string>();
  const duplikat: string[] = [];
  for (const kode of semuaKode) {
    if (terlihat.has(kode)) {
      duplikat.push(kode);
    }
    terlihat.add(kode);
  }
  assertEqual(duplikat.length, 0, `izin.seed.ts tidak boleh punya kode duplikat. Duplikat: [${duplikat.join(", ")}]`);
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-006 lulus.");
