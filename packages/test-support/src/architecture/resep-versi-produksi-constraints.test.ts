// Test struktur/arsitektur untuk ALT-DEF-007 (versi resep, subresep,
// modifier-yang-mengubah-resep, dan proses produksi - lihat ADR-022 di
// docs/engineering/DECISION-LOG.md).
//
// KONTEKS: sama seperti architecture test batch-batch sebelumnya, tidak ada
// Postgres nyata di environment correction-loop ini (ALT-DEF-029). File ini
// memverifikasi bahwa model/enum/constraint yang DIKLAIM ADR-022 benar-benar
// ada di prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF yang paling penting di file ini (urut kepentingannya):
//   1. Model `ResepBahan` HARUS BENAR-BENAR HILANG. Membiarkannya berdampingan
//      dengan `KomponenResep` menciptakan DUA sumber kebenaran untuk komposisi
//      resep - persis kelas defect yang sedang diperbaiki.
//   2. `KomponenResep` TIDAK boleh punya kolom `resepId`. Kalau komposisi tetap
//      menggantung pada `Resep`, `VersiResep` hanya menjadi tabel metadata
//      dekoratif dan mengubah resep TETAP menulis ulang HPP transaksi lampau -
//      versioning yang komponennya tidak ikut ter-versi adalah versioning palsu.
//      Ini assertion terpenting di seluruh file.
//   3. `Resep` TIDAK boleh lagi punya `itemMenuId String @unique` - constraint
//      itulah bunyi harfiah ALT-DEF-007.
//   4. `VersiResep` TIDAK boleh punya `@@unique([resepId, status])` - constraint
//      itu SALAH (melarang banyak versi NONAKTIF, yang justru WAJIB menumpuk)
//      dan hanya TAMPAK menegakkan "satu versi AKTIF per resep". Aturan
//      sebenarnya adalah partial unique index Postgres (ADR-022 Keputusan 3).
//
// Test ini JUGA memverifikasi keberadaan DUA file SQL manual (CHECK XOR dan
// partial unique index) - kalau file itu tidak ada, tidak ada apa pun yang akan
// menegakkan kedua invariant dan ADR-022 Keputusan 2/3 hanya jadi klaim.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini yang SUDAH dijalankan nyata: `tsc --noEmit --strict` atas file
// ini dan `node --experimental-strip-types` - lihat RELEASE-EVIDENCE.md.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../../..");
const SCHEMA_PATH = resolve(ROOT, "prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(ROOT, "prisma/seed/izin.seed.ts");
const SQL_XOR_PATH = resolve(ROOT, "prisma/migrations/manual/002_resep_target_xor_check.sql");
const SQL_SATU_AKTIF_PATH = resolve(ROOT, "prisma/migrations/manual/003_versi_resep_satu_aktif.sql");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

// ALT-DEF-033: normalisasi runs spasi/tab horizontal sebelum mencocokkan
// (`prisma format` menyelaraskan lebar kolom antar-field, sehingga assertion
// whitespace-exact gagal PALSU saat field baru ditambahkan ke model lain).
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

function adaModel(schema: string, modelName: string): boolean {
  return new RegExp(`(^|\\n)model ${modelName} \\{`).test(schema);
}

function getNilaiEnum(schema: string, enumName: string): string[] {
  const body = getEnumBody(schema, enumName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

// Nama field (bukan komentar/atribut blok) - dipakai untuk assertion negatif
// yang tahan terhadap penyebutan nama kolom di dalam komentar dokumentasi.
// Ini PENTING di file ini: schema.prisma memuat banyak komentar yang menyebut
// kata "resepId"/"ResepBahan" sebagai penjelasan sejarah, dan assertion negatif
// yang naif akan gagal PALSU karenanya.
function getNamaField(schema: string, modelName: string): string[] {
  const body = getModelBody(schema, modelName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  const nama: string[] = [];
  for (const barisMentah of isi.split("\n")) {
    const baris = barisMentah.trim();
    if (baris.length === 0 || baris.startsWith("//") || baris.startsWith("@@")) {
      continue;
    }
    const cocok = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(baris);
    if (cocok && cocok[1] !== undefined) {
      nama.push(cocok[1]);
    }
  }
  return nama;
}

// Atribut blok (`@@unique`, `@@map`, ...) SAJA - dipakai agar assertion tentang
// constraint tidak tertipu oleh penyebutan `@@unique(...)` di dalam komentar.
function getAtributBlok(schema: string, modelName: string): string[] {
  const body = getModelBody(schema, modelName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => normalisasiSpasiHorizontal(baris.trim()))
    .filter((baris) => baris.startsWith("@@"));
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ADR-022 Keputusan 4: ResepBahan HARUS BENAR-BENAR HILANG
  // ===================================================================
  // Assertion NEGATIF paling struktural di file ini. Dicek sebagai deklarasi
  // MODEL sungguhan (bukan penyebutan di komentar - schema.prisma memang masih
  // menyebut "ResepBahan" di komentar sejarah, dan itu SAH).
  if (adaModel(schema, "ResepBahan")) {
    throw new Error(
      "ASSERTION GAGAL: model `ResepBahan` MASIH ADA di schema.prisma. Ia harus DIHAPUS SEPENUHNYA dan digantikan `KomponenResep` (ADR-022 Keputusan 4). Membiarkan keduanya berdampingan menciptakan DUA sumber kebenaran untuk komposisi resep - persis kelas defect yang sedang diperbaiki ALT-DEF-007. Penghapusan aman karena belum ada migrasi yang pernah dijalankan (ALT-DEF-029), sehingga belum ada satu baris data pun.",
    );
  }
  // Tabel `resep_bahan` (@@map) juga tidak boleh tersisa di mana pun.
  assertNotContains(
    schema,
    '@@map("resep_bahan")',
    'Tidak boleh ada model mana pun yang memetakan ke tabel "resep_bahan" - tabel itu dihapus bersama modelnya (ADR-022 Keputusan 4).',
  );
  // Back-relation `resepBahan` juga harus hilang dari SELURUH model yang dulu
  // memilikinya, kalau tidak `prisma validate` akan gagal - tapi dicek eksplisit
  // di sini agar pesan kegagalannya menjelaskan MENGAPA, bukan sekadar error Prisma.
  for (const model of ["Bahan", "Satuan", "Resep"]) {
    const fields = getNamaField(schema, model);
    if (fields.includes("resepBahan")) {
      throw new Error(
        `ASSERTION GAGAL: model ${model} masih punya field relasi \`resepBahan\` - back-relation ke model yang sudah dihapus (ADR-022 Keputusan 4).`,
      );
    }
  }

  // ===================================================================
  // ADR-022 Keputusan 1: Bahan.jenis sebagai diskriminator
  // ===================================================================
  const bahanBody = getModelBody(schema, "Bahan");
  const fieldBahan = getNamaField(schema, "Bahan");
  if (!fieldBahan.includes("jenis")) {
    throw new Error(
      `ASSERTION GAGAL: Bahan harus punya kolom \`jenis\` (enum JenisBahan) - INILAH yang membuat subresep mungkin: sebuah BAHAN_SETENGAH_JADI adalah HASIL satu resep (Resep.bahanHasilId) sekaligus INPUT resep lain (KomponenResep.bahanId). Tanpa diskriminator ini ALT-RSP-005 tidak punya kolom untuk diterapkan sama sekali. Field aktual: [${fieldBahan.join(", ")}]`,
    );
  }
  assertContains(
    bahanBody,
    "jenis JenisBahan @default(BAHAN_BAKU)",
    "Bahan.jenis harus bertipe enum JenisBahan dengan @default(BAHAN_BAKU) - seluruh baris yang ada sebelum ALT-DEF-007 adalah bahan baku beli (ADR-022 Keputusan 1).",
  );
  const JENIS_BAHAN = ["BAHAN_BAKU", "BAHAN_SETENGAH_JADI", "PRODUK_JADI", "KEMASAN", "BARANG_OPERASIONAL"];
  const nilaiJenisBahan = getNilaiEnum(schema, "JenisBahan");
  assertEqual(
    nilaiJenisBahan.length,
    5,
    `JenisBahan harus punya PERSIS 5 nilai. Aktual: [${nilaiJenisBahan.join(", ")}]`,
  );
  for (const nilai of JENIS_BAHAN) {
    if (!nilaiJenisBahan.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: JenisBahan harus memuat nilai ${nilai} (ADR-022 Keputusan 1).`);
    }
  }

  // ===================================================================
  // ADR-022 Keputusan 2: Resep sebagai kontainer bersasaran XOR
  // ===================================================================
  const resepBody = getModelBody(schema, "Resep");
  const fieldResep = getNamaField(schema, "Resep");

  // Assertion NEGATIF: bunyi harfiah ALT-DEF-007. `itemMenuId String @unique`
  // adalah constraint yang MEMBUAT satu item menu hanya bisa punya satu resep.
  assertNotContains(
    resepBody,
    "itemMenuId String @unique",
    "Resep TIDAK boleh lagi punya `itemMenuId String @unique` - constraint itulah bunyi harfiah ALT-DEF-007 (satu item menu terkunci ke satu resep sederhana). Kini itemMenuId nullable dan salah satu dari tiga sasaran XOR (ADR-022 Keputusan 2).",
  );
  // Kolom `versi String` bebas juga harus hilang - ia label kosmetik yang
  // digantikan entitas VersiResep sungguhan.
  if (fieldResep.includes("versi") && normalisasiSpasiHorizontal(resepBody).includes("versi String")) {
    throw new Error(
      "ASSERTION GAGAL: Resep masih punya kolom `versi String` - kolom itu kosmetik (label, bukan entitas: tidak ada satu baris data pun yang menggantung padanya) dan digantikan model VersiResep sungguhan (ADR-022 Keputusan 2/3). Field `versi` yang SAH di Resep hanyalah relasi list `versi VersiResep[]`.",
    );
  }
  assertContains(
    resepBody,
    "versi VersiResep[]",
    "Resep harus punya relasi list `versi VersiResep[]` - satu kontainer resep memiliki banyak versi.",
  );

  // Tiga sasaran XOR, seluruhnya nullable.
  for (const kolom of ["itemMenuId String?", "varianMenuId String?", "bahanHasilId String?"]) {
    assertContains(
      resepBody,
      kolom,
      `Resep harus punya \`${kolom}\` - sasaran XOR (tepat satu non-null): itemMenu (ALT-RSP-001), varianMenu (ALT-RSP-003), atau bahanHasil/subresep (ALT-RSP-005). Ketiganya WAJIB nullable (ADR-022 Keputusan 2).`,
    );
  }
  assertContains(resepBody, "nama String", "Resep harus punya kolom `nama` - ia kini kontainer BERNAMA, bukan lagi turunan anonim dari satu item menu.");

  // Composite-FK per ADR-013 ke parent yang punya @@unique([tenantId, id]).
  assertContains(
    resepBody,
    "itemMenu ItemMenu? @relation(fields: [tenantId, itemMenuId], references: [tenantId, id])",
    "Resep.itemMenu harus composite-FK (tenantId, itemMenuId) -> ItemMenu(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    resepBody,
    'bahanHasil Bahan? @relation("ResepBahanHasil", fields: [tenantId, bahanHasilId], references: [tenantId, id])',
    "Resep.bahanHasil harus composite-FK (tenantId, bahanHasilId) -> Bahan(tenantId, id) mengikuti ADR-013 - inilah relasi subresep (ALT-RSP-005).",
  );
  // `varianMenu` SENGAJA FK tunggal - VarianMenu tidak membawa tenantId
  // (ALT-DEF-035). Diassert apa adanya supaya perubahan diam-diam ke bentuk
  // lain tetap terdeteksi.
  assertContains(
    resepBody,
    "varianMenu VarianMenu? @relation(fields: [varianMenuId], references: [id])",
    "Resep.varianMenu memakai FK ID tunggal karena VarianMenu tidak membawa tenantId sama sekali (di luar audit ADR-013) - dicatat sebagai ALT-DEF-035, bukan dilewati diam-diam.",
  );
  assertContains(
    getAtributBlok(schema, "Resep").join("\n"),
    "@@unique([tenantId, id])",
    "Resep harus punya @@unique([tenantId, id]) - VersiResep bergantung padanya untuk composite-FK.",
  );

  // File SQL CHECK XOR HARUS ada - tanpa itu, invariant XOR tidak punya penegak
  // apa pun dan ADR-022 Keputusan 2 hanya jadi klaim di dokumen.
  if (!existsSync(SQL_XOR_PATH)) {
    throw new Error(
      `ASSERTION GAGAL: file SQL CHECK constraint XOR tidak ditemukan di ${SQL_XOR_PATH}. Tanpa file ini, invariant "Resep menargetkan TEPAT SATU dari itemMenu/varianMenu/bahanHasil" tidak punya penegak apa pun - DSL Prisma tidak dapat mengekspresikan CHECK constraint (ADR-022 Keputusan 2).`,
    );
  }
  const sqlXor = normalisasiSpasiHorizontal(readFileSync(SQL_XOR_PATH, "utf-8")).replace(/\n/g, " ");
  assertContains(sqlXor, "ALTER TABLE resep", "File 002 harus benar-benar meng-ALTER tabel resep, bukan sekadar komentar penjelasan.");
  assertContains(sqlXor, "CHECK", "File 002 harus benar-benar berisi CHECK constraint.");
  for (const kolom of ['"itemMenuId"', '"varianMenuId"', '"bahanHasilId"']) {
    assertContains(sqlXor, kolom, `CHECK constraint XOR harus menyebut kolom ${kolom} (dikutip ganda - nama kolom nyata di Postgres camelCase).`);
  }

  // ===================================================================
  // ADR-022 Keputusan 3: VersiResep
  // ===================================================================
  const versiBody = getModelBody(schema, "VersiResep");
  const fieldVersi = getNamaField(schema, "VersiResep");
  const KOLOM_VERSI = [
    "id",
    "tenantId",
    "resepId",
    "nomorVersi",
    "berlakuSejak",
    "berlakuSampai",
    "jumlahHasil",
    "satuanHasilId",
    "penyusutanPersen",
    "snapshotBiaya",
    "status",
    "createdAt",
  ];
  for (const kolom of KOLOM_VERSI) {
    if (!fieldVersi.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: VersiResep harus punya kolom ${kolom} (ALT-RSP-002/006/007/012, ADR-022 Keputusan 3). Field aktual: [${fieldVersi.join(", ")}]`,
      );
    }
  }
  assertContains(versiBody, "nomorVersi Int", "VersiResep.nomorVersi harus Int (urutan versi), bukan String bebas seperti kolom `versi` lama yang dihapus.");
  // jumlahHasil/penyusutanPersen WAJIB Decimal, snapshotBiaya WAJIB Int -
  // ADR-005 mewajibkan Int HANYA untuk nilai uang rupiah; kuantitas bahan dan
  // persen butuh presisi pecahan. Membalik keduanya adalah defect diam-diam.
  assertContains(
    versiBody,
    "jumlahHasil Decimal",
    "VersiResep.jumlahHasil harus Decimal (yield satu batch, mis. 5.5 kg) - Int akan membulatkan yield produksi secara diam-diam (ALT-RSP-006).",
  );
  assertContains(
    versiBody,
    "penyusutanPersen Decimal @default(0)",
    "VersiResep.penyusutanPersen harus Decimal @default(0) - persen susut wajar bersifat pecahan (ALT-RSP-007).",
  );
  assertContains(
    versiBody,
    "snapshotBiaya Int?",
    "VersiResep.snapshotBiaya harus Int (rupiah bulat, ADR-005) DAN nullable - versi DRAF belum pernah diaktifkan sehingga belum punya HPP terhitung (ALT-RSP-012).",
  );
  assertContains(
    versiBody,
    "berlakuSampai DateTime?",
    "VersiResep.berlakuSampai harus nullable - versi yang masih berlaku belum punya tanggal akhir.",
  );
  assertContains(
    versiBody,
    "status StatusVersiResep @default(DRAF)",
    "VersiResep.status harus @default(DRAF) - versi baru tidak boleh langsung AKTIF sebelum diaktifkan lewat alur transaksi yang menonaktifkan versi lama (ADR-022 Keputusan 3).",
  );
  assertContains(
    versiBody,
    "resep Resep @relation(fields: [tenantId, resepId], references: [tenantId, id])",
    "VersiResep.resep harus composite-FK (tenantId, resepId) -> Resep(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    versiBody,
    'satuanHasil Satuan @relation("VersiResepSatuanHasil", fields: [tenantId, satuanHasilId], references: [tenantId, id])',
    "VersiResep.satuanHasil harus composite-FK (tenantId, satuanHasilId) -> Satuan(tenantId, id) mengikuti ADR-013.",
  );

  const atributVersi = getAtributBlok(schema, "VersiResep").join("\n");
  assertContains(
    atributVersi,
    "@@unique([resepId, nomorVersi])",
    "VersiResep harus punya @@unique([resepId, nomorVersi]) - nomor versi tidak pernah dipakai ulang dalam satu resep (ADR-022 Keputusan 3).",
  );
  assertContains(
    atributVersi,
    "@@unique([tenantId, id])",
    "VersiResep harus punya @@unique([tenantId, id]) - KomponenResep/KomponenResepModifier/ProsesProduksi bergantung padanya untuk composite-FK.",
  );
  // Assertion NEGATIF: constraint palsu satu-versi-AKTIF.
  assertNotContains(
    atributVersi,
    "@@unique([resepId, status])",
    "VersiResep TIDAK boleh punya @@unique([resepId, status]) - constraint itu tidak menegakkan 'satu versi AKTIF per resep' dan justru SALAH: ia melarang satu resep punya lebih dari satu versi NONAKTIF/ARSIP, padahal riwayat versi lama yang menumpuk ADALAH SELURUH ALASAN keberadaan model ini (ADR-006). Aturan sebenarnya adalah partial unique index Postgres, lihat ADR-022 Keputusan 3.",
  );
  assertNotContains(
    atributVersi,
    "@@unique([tenantId, resepId, status])",
    "VersiResep TIDAK boleh punya @@unique([tenantId, resepId, status]) - varian dari constraint palsu yang sama, lihat pesan di atas.",
  );

  const STATUS_VERSI = ["DRAF", "AKTIF", "NONAKTIF", "ARSIP"];
  const nilaiStatusVersi = getNilaiEnum(schema, "StatusVersiResep");
  assertEqual(
    nilaiStatusVersi.length,
    4,
    `StatusVersiResep harus punya PERSIS 4 nilai. Aktual: [${nilaiStatusVersi.join(", ")}]`,
  );
  for (const nilai of STATUS_VERSI) {
    if (!nilaiStatusVersi.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusVersiResep harus memuat nilai ${nilai} (ADR-022 Keputusan 3).`);
    }
  }
  // Tidak boleh ada nilai yang menyiratkan penghapusan - VersiResep TIDAK PERNAH
  // dihapus karena ItemPesanan historis mereferensikannya (ADR-006).
  for (const terlarang of ["DIHAPUS", "DELETED", "DIBUANG"]) {
    if (nilaiStatusVersi.includes(terlarang)) {
      throw new Error(
        `ASSERTION GAGAL: StatusVersiResep TIDAK boleh punya nilai ${terlarang} - versi resep tidak pernah dihapus/dibuang; ItemPesanan historis mereferensikannya lewat resepVersiId (ADR-006, ADR-022 Keputusan 3/7).`,
      );
    }
  }

  // File SQL partial unique index HARUS ada.
  if (!existsSync(SQL_SATU_AKTIF_PATH)) {
    throw new Error(
      `ASSERTION GAGAL: file SQL partial unique index tidak ditemukan di ${SQL_SATU_AKTIF_PATH}. Tanpa file ini, aturan "satu VersiResep AKTIF per Resep" (ALT-RSP-002) tidak punya penegak apa pun - DSL Prisma tidak dapat mengekspresikan filtered index (ADR-022 Keputusan 3).`,
    );
  }
  const sqlSatuAktif = normalisasiSpasiHorizontal(readFileSync(SQL_SATU_AKTIF_PATH, "utf-8")).replace(/\n/g, " ");
  assertContains(sqlSatuAktif, "CREATE UNIQUE INDEX", "File 003 harus benar-benar berisi CREATE UNIQUE INDEX, bukan sekadar komentar penjelasan.");
  assertContains(sqlSatuAktif, "ON versi_resep", "Partial index harus dibuat atas tabel versi_resep (nama tabel hasil @@map di schema.prisma).");
  assertContains(
    sqlSatuAktif,
    "WHERE status = 'AKTIF'",
    "Index harus PARTIAL (klausa WHERE status = 'AKTIF') - inilah satu-satunya bentuk yang menegakkan 'satu versi AKTIF per resep' TANPA melarang banyak versi NONAKTIF/ARSIP.",
  );

  // ===================================================================
  // ADR-022 Keputusan 4: KomponenResep menggantung pada VERSI, bukan Resep
  // ===================================================================
  // INI ASSERTION TERPENTING DI SELURUH FILE.
  const komponenBody = getModelBody(schema, "KomponenResep");
  const fieldKomponen = getNamaField(schema, "KomponenResep");
  if (!fieldKomponen.includes("versiResepId")) {
    throw new Error(
      `ASSERTION GAGAL: KomponenResep HARUS punya kolom \`versiResepId\`. Field aktual: [${fieldKomponen.join(", ")}]`,
    );
  }
  if (fieldKomponen.includes("resepId")) {
    throw new Error(
      "ASSERTION GAGAL: KomponenResep TIDAK boleh punya kolom `resepId` - ia WAJIB menggantung pada `versiResepId`. Kalau komposisi tetap menggantung pada Resep, membuat VersiResep tidak mengubah apa pun secara fungsional: mengubah komposisi TETAP akan menulis ulang HPP seluruh transaksi lampau, dan VersiResep hanya menjadi tabel metadata dekoratif. Versioning yang komponennya tidak ikut ter-versi adalah versioning PALSU - ini seluruh inti ALT-DEF-007 (ADR-022 Keputusan 4).",
    );
  }
  for (const kolom of ["id", "tenantId", "versiResepId", "bahanId", "jumlah", "satuanId", "opsional", "createdAt"]) {
    if (!fieldKomponen.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: KomponenResep harus punya kolom ${kolom} (ALT-RSP-001, ADR-022 Keputusan 4). Field aktual: [${fieldKomponen.join(", ")}]`,
      );
    }
  }
  assertContains(komponenBody, "jumlah Decimal", "KomponenResep.jumlah harus Decimal - satuan bahan baku (gram/ml) butuh presisi pecahan (ADR-005: Int hanya untuk uang rupiah).");
  assertContains(komponenBody, "opsional Boolean @default(false)", "KomponenResep.opsional harus Boolean @default(false) - komponen default WAJIB dipakai; hanya garnish/sejenisnya yang boleh dilewati.");
  assertContains(
    komponenBody,
    "versiResep VersiResep @relation(fields: [tenantId, versiResepId], references: [tenantId, id])",
    "KomponenResep.versiResep harus composite-FK (tenantId, versiResepId) -> VersiResep(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    komponenBody,
    "bahan Bahan @relation(fields: [tenantId, bahanId], references: [tenantId, id])",
    "KomponenResep.bahan harus composite-FK (tenantId, bahanId) -> Bahan(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    komponenBody,
    "satuan Satuan @relation(fields: [tenantId, satuanId], references: [tenantId, id])",
    "KomponenResep.satuan harus composite-FK (tenantId, satuanId) -> Satuan(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    getAtributBlok(schema, "KomponenResep").join("\n"),
    "@@unique([versiResepId, bahanId])",
    "KomponenResep harus punya @@unique([versiResepId, bahanId]) - dua baris untuk bahan yang sama dalam satu versi membuat perhitungan HPP dan pemotongan stok ambigu.",
  );

  // ===================================================================
  // ADR-022 Keputusan 5: KomponenResepModifier (ALT-RSP-004)
  // ===================================================================
  const modBody = getModelBody(schema, "KomponenResepModifier");
  const fieldMod = getNamaField(schema, "KomponenResepModifier");
  for (const kolom of [
    "id",
    "tenantId",
    "versiResepId",
    "modifierOpsiId",
    "aksi",
    "bahanId",
    "bahanPenggantiId",
    "jumlah",
    "satuanId",
    "createdAt",
  ]) {
    if (!fieldMod.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: KomponenResepModifier harus punya kolom ${kolom} (ALT-RSP-004, ADR-022 Keputusan 5). Field aktual: [${fieldMod.join(", ")}]`,
      );
    }
  }
  // Sama seperti KomponenResep: efek modifier WAJIB ikut ter-versi.
  if (fieldMod.includes("resepId")) {
    throw new Error(
      "ASSERTION GAGAL: KomponenResepModifier TIDAK boleh punya kolom `resepId` - ia menggantung pada `versiResepId` dengan alasan yang sama seperti KomponenResep: efek modifier ikut ter-snapshot bersama versinya, sehingga 'extra cheese' yang dulu +20g dan sekarang +30g tidak menulis ulang pesanan lampau (ADR-022 Keputusan 5).",
    );
  }
  assertContains(modBody, "aksi AksiKomponenModifier", "KomponenResepModifier.aksi harus bertipe enum AksiKomponenModifier, bukan String bebas.");
  assertContains(
    modBody,
    "bahanPenggantiId String?",
    "KomponenResepModifier.bahanPenggantiId harus nullable - ia HANYA bermakna saat aksi = GANTI (ADR-022 Keputusan 5).",
  );
  assertContains(modBody, "jumlah Decimal", "KomponenResepModifier.jumlah harus Decimal (kuantitas bahan, bukan uang).");
  assertContains(
    getAtributBlok(schema, "KomponenResepModifier").join("\n"),
    "@@unique([versiResepId, modifierOpsiId, bahanId])",
    "KomponenResepModifier harus punya @@unique([versiResepId, modifierOpsiId, bahanId]) - satu opsi modifier tidak boleh punya dua aturan berbeda atas bahan yang sama dalam satu versi.",
  );

  const AKSI_MODIFIER = ["TAMBAH", "KURANGI", "GANTI"];
  const nilaiAksi = getNilaiEnum(schema, "AksiKomponenModifier");
  assertEqual(
    nilaiAksi.length,
    3,
    `AksiKomponenModifier harus punya PERSIS 3 nilai (ADR-022 Keputusan 5 menolak nilai HAPUS terpisah - "no onion" dimodelkan sebagai KURANGI sejumlah komponen dasar). Aktual: [${nilaiAksi.join(", ")}]`,
  );
  for (const nilai of AKSI_MODIFIER) {
    if (!nilaiAksi.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: AksiKomponenModifier harus memuat nilai ${nilai} (ALT-RSP-004).`);
    }
  }

  // ===================================================================
  // ADR-022 Keputusan 6: KonversiSatuan (ALT-RSP-008)
  // ===================================================================
  const konversiBody = getModelBody(schema, "KonversiSatuan");
  const fieldKonversi = getNamaField(schema, "KonversiSatuan");
  for (const kolom of ["id", "tenantId", "satuanDariId", "satuanKeId", "faktor", "createdAt"]) {
    if (!fieldKonversi.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: KonversiSatuan harus punya kolom ${kolom} (ALT-RSP-008). Field aktual: [${fieldKonversi.join(", ")}]`,
      );
    }
  }
  assertContains(
    konversiBody,
    "faktor Decimal",
    "KonversiSatuan.faktor harus Decimal - ADR-005 mewajibkan Int HANYA untuk nilai uang rupiah; faktor konversi butuh pecahan (ons -> gram = 28.3495).",
  );
  assertContains(
    getAtributBlok(schema, "KonversiSatuan").join("\n"),
    "@@unique([tenantId, satuanDariId, satuanKeId])",
    "KonversiSatuan harus punya @@unique([tenantId, satuanDariId, satuanKeId]) - dua faktor berbeda untuk pasangan satuan yang sama membuat konversi non-deterministik (ALT-RSP-008).",
  );
  assertContains(
    konversiBody,
    'satuanDari Satuan @relation("KonversiSatuanDari", fields: [tenantId, satuanDariId], references: [tenantId, id])',
    "KonversiSatuan.satuanDari harus composite-FK mengikuti ADR-013.",
  );
  assertContains(
    konversiBody,
    'satuanKe Satuan @relation("KonversiSatuanKe", fields: [tenantId, satuanKeId], references: [tenantId, id])',
    "KonversiSatuan.satuanKe harus composite-FK mengikuti ADR-013.",
  );
  // Satuan harus mendapat @@unique([tenantId, id]) baru agar seluruh
  // composite-FK di atas mungkin sama sekali.
  assertContains(
    getAtributBlok(schema, "Satuan").join("\n"),
    "@@unique([tenantId, id])",
    "Satuan harus punya @@unique([tenantId, id]) - TANPA ini seluruh composite-FK (tenantId, satuanId) di domain resep/produksi tidak mungkin dan Prisma akan menolaknya (ADR-013, ADR-022 Keputusan 6).",
  );

  // ===================================================================
  // ADR-022 Keputusan 6: ProsesProduksi / ProsesProduksiBaris / BatchProduksi
  // ===================================================================
  const prosesBody = getModelBody(schema, "ProsesProduksi");
  const fieldProses = getNamaField(schema, "ProsesProduksi");
  for (const kolom of [
    "id",
    "tenantId",
    "outletId",
    "versiResepId",
    "jumlahTarget",
    "jumlahAktual",
    "status",
    "dimulaiPada",
    "diselesaikanPada",
    "dibuatOlehId",
    "createdAt",
  ]) {
    if (!fieldProses.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: ProsesProduksi harus punya kolom ${kolom} (ALT-RSP-009/ALT-RSP-010). Field aktual: [${fieldProses.join(", ")}]`,
      );
    }
  }
  assertContains(prosesBody, "jumlahTarget Decimal", "ProsesProduksi.jumlahTarget harus Decimal (kuantitas produksi, bukan uang).");
  assertContains(
    prosesBody,
    "jumlahAktual Decimal?",
    "ProsesProduksi.jumlahAktual harus Decimal DAN nullable - ia baru terisi saat SELESAI; selisih target vs aktual adalah realisasi vs rencana (ALT-RSP-009).",
  );
  assertContains(prosesBody, "dimulaiPada DateTime?", "ProsesProduksi.dimulaiPada harus nullable - proses berstatus DRAF belum dimulai.");
  assertContains(prosesBody, "diselesaikanPada DateTime?", "ProsesProduksi.diselesaikanPada harus nullable.");
  assertContains(
    prosesBody,
    "status StatusProsesProduksi @default(DRAF)",
    "ProsesProduksi.status harus @default(DRAF) - produksi tidak pernah langsung BERJALAN tanpa aksi manusia.",
  );
  assertContains(
    prosesBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "ProsesProduksi.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id) mengikuti ADR-013 - produksi berjalan PER OUTLET.",
  );
  assertContains(
    prosesBody,
    "versiResep VersiResep @relation(fields: [tenantId, versiResepId], references: [tenantId, id])",
    "ProsesProduksi.versiResep harus composite-FK mengikuti ADR-013.",
  );
  // ADR-013 poin 5: relasi ke Pengguna TIDAK PERNAH di-composite-kan ke tenant.
  assertContains(
    prosesBody,
    'dibuatOleh Pengguna @relation("ProsesProduksiDibuatOleh", fields: [dibuatOlehId], references: [id])',
    "ProsesProduksi.dibuatOleh harus FK ID tunggal ke Pengguna - relasi ke Pengguna TIDAK PERNAH di-composite-kan ke tenant (Pengguna sengaja lintas-tenant, ADR-013 poin 5).",
  );
  assertContains(
    getAtributBlok(schema, "ProsesProduksi").join("\n"),
    "@@unique([tenantId, id])",
    "ProsesProduksi harus punya @@unique([tenantId, id]) - ProsesProduksiBaris/BatchProduksi bergantung padanya untuk composite-FK.",
  );

  const STATUS_PROSES = ["DRAF", "BERJALAN", "SELESAI", "DIBATALKAN"];
  const nilaiStatusProses = getNilaiEnum(schema, "StatusProsesProduksi");
  assertEqual(
    nilaiStatusProses.length,
    4,
    `StatusProsesProduksi harus punya PERSIS 4 nilai. Aktual: [${nilaiStatusProses.join(", ")}]`,
  );
  for (const nilai of STATUS_PROSES) {
    if (!nilaiStatusProses.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusProsesProduksi harus memuat nilai ${nilai} (ALT-RSP-009).`);
    }
  }

  const barisBody = getModelBody(schema, "ProsesProduksiBaris");
  const fieldBaris = getNamaField(schema, "ProsesProduksiBaris");
  for (const kolom of ["id", "tenantId", "prosesProduksiId", "bahanId", "jumlahDipakai", "satuanId"]) {
    if (!fieldBaris.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: ProsesProduksiBaris harus punya kolom ${kolom} (ALT-RSP-010). Field aktual: [${fieldBaris.join(", ")}]`,
      );
    }
  }
  assertContains(
    barisBody,
    "jumlahDipakai Decimal",
    "ProsesProduksiBaris.jumlahDipakai harus Decimal - ini konsumsi AKTUAL, sengaja terpisah dari KomponenResep (rencana). Tanpa baris aktual, susut nyata tidak pernah bisa dibandingkan dengan VersiResep.penyusutanPersen yang diasumsikan (ALT-RSP-007).",
  );
  assertContains(
    barisBody,
    "prosesProduksi ProsesProduksi @relation(fields: [tenantId, prosesProduksiId], references: [tenantId, id])",
    "ProsesProduksiBaris.prosesProduksi harus composite-FK mengikuti ADR-013.",
  );

  const batchBody = getModelBody(schema, "BatchProduksi");
  const fieldBatch = getNamaField(schema, "BatchProduksi");
  for (const kolom of [
    "id",
    "tenantId",
    "outletId",
    "prosesProduksiId",
    "bahanHasilId",
    "nomorBatch",
    "jumlah",
    "satuanId",
    "tanggalProduksi",
    "tanggalKedaluwarsa",
    "status",
    "createdAt",
  ]) {
    if (!fieldBatch.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: BatchProduksi harus punya kolom ${kolom} (ALT-RSP-010). Field aktual: [${fieldBatch.join(", ")}]`,
      );
    }
  }
  assertContains(
    batchBody,
    "tanggalKedaluwarsa DateTime?",
    "BatchProduksi.tanggalKedaluwarsa harus nullable - tidak semua hasil produksi punya masa kedaluwarsa yang dicatat. Kolom inilah yang akan dipakai FEFO oleh batch persediaan berikutnya (ALT-DEF-008, ADR-022 Keputusan 8).",
  );
  assertContains(batchBody, "jumlah Decimal", "BatchProduksi.jumlah harus Decimal (kuantitas hasil, bukan uang).");
  assertContains(
    batchBody,
    'bahanHasil Bahan @relation("BatchProduksiBahanHasil", fields: [tenantId, bahanHasilId], references: [tenantId, id])',
    "BatchProduksi.bahanHasil harus composite-FK (tenantId, bahanHasilId) -> Bahan(tenantId, id) mengikuti ADR-013.",
  );
  const atributBatch = getAtributBlok(schema, "BatchProduksi").join("\n");
  assertContains(
    atributBatch,
    "@@unique([tenantId, nomorBatch])",
    "BatchProduksi harus punya @@unique([tenantId, nomorBatch]) - nomor batch adalah identitas telusur yang tidak boleh berulang dalam satu tenant (ALT-RSP-010).",
  );
  assertContains(
    atributBatch,
    "@@unique([tenantId, id])",
    "BatchProduksi harus punya @@unique([tenantId, id]) - SEAM untuk batch persediaan/FEFO berikutnya (ALT-DEF-008) agar bisa memakai composite-FK ke sini (ADR-022 Keputusan 8).",
  );

  const STATUS_BATCH = ["TERSEDIA", "HABIS", "KEDALUWARSA", "DIBUANG"];
  const nilaiStatusBatch = getNilaiEnum(schema, "StatusBatchProduksi");
  assertEqual(
    nilaiStatusBatch.length,
    4,
    `StatusBatchProduksi harus punya PERSIS 4 nilai. Aktual: [${nilaiStatusBatch.join(", ")}]`,
  );
  for (const nilai of STATUS_BATCH) {
    if (!nilaiStatusBatch.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusBatchProduksi harus memuat nilai ${nilai} (ALT-RSP-010).`);
    }
  }

  // ===================================================================
  // ADR-022 Keputusan 7: ItemPesanan.resepVersiId kini FK SUNGGUHAN
  // ===================================================================
  // Utang yang dijanjikan ADR-017 Keputusan 8 (kolom scalar polos karena model
  // VersiResep belum ada) dilunasi di batch ini. Assertion yang sama juga
  // ditegakkan dari sisi domain Pesanan di
  // pesanan-state-machine-snapshot-constraints.test.ts - sengaja diduplikasi
  // karena kedua batch punya alasan berbeda untuk peduli.
  const itemPesananBody = getModelBody(schema, "ItemPesanan");
  assertContains(
    itemPesananBody,
    "resepVersi VersiResep? @relation(fields: [resepVersiId], references: [id])",
    "ItemPesanan.resepVersi WAJIB berupa relasi FK sungguhan ke VersiResep (bukan lagi scalar polos, ADR-017 Keputusan 8 -> ADR-022 Keputusan 7). Inilah yang membuat satu baris pesanan permanen menunjuk versi resep PERSIS yang dipakai saat transaksi - tanpanya, reversal pesanan berumur dua minggu akan membalik jumlah bahan menurut resep HARI INI, bukan resep saat pesanan dibuat.",
  );
  assertContains(
    itemPesananBody,
    "resepVersiId String?",
    "ItemPesanan.resepVersiId harus tetap nullable - item menu tanpa resep (mis. minuman botol) sah tidak punya versi resep.",
  );
  assertContains(
    versiBody,
    "itemPesanan ItemPesanan[]",
    "VersiResep harus punya back-relation `itemPesanan ItemPesanan[]` - sisi lain dari FK yang disambungkan ADR-022 Keputusan 7.",
  );

  // ===================================================================
  // Back-relation Tenant/Outlet/Pengguna/menu
  // ===================================================================
  const tenantBody = getModelBody(schema, "Tenant");
  for (const relasi of [
    "konversiSatuan KonversiSatuan[]",
    "versiResep VersiResep[]",
    "komponenResep KomponenResep[]",
    "komponenResepModifier KomponenResepModifier[]",
    "prosesProduksi ProsesProduksi[]",
    "prosesProduksiBaris ProsesProduksiBaris[]",
    "batchProduksi BatchProduksi[]",
  ]) {
    assertContains(tenantBody, relasi, `Tenant harus punya back-relation "${relasi}" untuk model resep/produksi ALT-DEF-007.`);
  }
  const outletBody = getModelBody(schema, "Outlet");
  for (const relasi of ["prosesProduksi ProsesProduksi[]", "batchProduksi BatchProduksi[]"]) {
    assertContains(outletBody, relasi, `Outlet harus punya back-relation "${relasi}" - produksi bahan setengah jadi berjalan PER OUTLET (ALT-RSP-009).`);
  }
  assertContains(
    getModelBody(schema, "Pengguna"),
    'prosesProduksiDibuat ProsesProduksi[] @relation("ProsesProduksiDibuatOleh")',
    "Pengguna harus punya back-relation prosesProduksiDibuat (aktor pembuat proses produksi).",
  );
  // ItemMenu.resep BUKAN LAGI 1:1 - `Resep?` akan mengunci kembali satu item
  // menu ke satu resep, yaitu defect yang sedang diperbaiki.
  const itemMenuFieldsRaw = normalisasiSpasiHorizontal(getModelBody(schema, "ItemMenu"));
  assertContains(
    itemMenuFieldsRaw,
    "resep Resep[]",
    "ItemMenu.resep harus berupa list `Resep[]`, BUKAN `Resep?` - `Resep?` adalah sisi lain dari `itemMenuId @unique` yang dihapus dan akan mengunci kembali satu item menu ke satu resep (ALT-DEF-007).",
  );
  assertNotContains(
    itemMenuFieldsRaw,
    "resep Resep?",
    "ItemMenu TIDAK boleh punya `resep Resep?` - lihat pesan di atas.",
  );
  assertContains(
    getModelBody(schema, "VarianMenu"),
    "resep Resep[]",
    "VarianMenu harus punya back-relation `resep Resep[]` - resep khusus per varian (ALT-RSP-003).",
  );
  assertContains(
    getModelBody(schema, "ModifierOpsi"),
    "komponenResepModifier KomponenResepModifier[]",
    "ModifierOpsi harus punya back-relation komponenResepModifier (ALT-RSP-004).",
  );

  // ===================================================================
  // Katalog izin: kode resep.* (ALT-DEF-007)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  for (const kode of [
    "resep.kelola",
    "resep.versi.kelola",
    "resep.varian.kelola",
    "resep.modifier.kelola",
    "resep.subresep.kelola",
    "resep.penyusutan.kelola",
    "resep.konversi.kelola",
    "resep.produksi.kelola",
    "resep.hpp.lihat",
    "resep.pemakaian.reversal",
  ]) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" (ALT-DEF-007; MASTER-CHECKLIST.md ALT-RSP-001 s.d. ALT-RSP-013 sudah mereferensikannya).`,
    );
  }
  // `resep.pemakaian.otomatis` SENGAJA TIDAK ada - aktornya "sistem", bukan
  // manusia. Menjadikannya kode izin menyiratkan ada peran yang boleh
  // menyelesaikan pesanan TANPA memotong stok - jalur penyimpangan yang tidak
  // boleh ada (alasan yang sama dengan keamanan.qris.enkripsi, ALT-DEF-034).
  if (izinSeed.includes('kode: "resep.pemakaian.otomatis"')) {
    throw new Error(
      'ASSERTION GAGAL: izin.seed.ts TIDAK boleh memuat kode "resep.pemakaian.otomatis" (ALT-RSP-011) - aktor requirement itu adalah "sistem" dan pemicunya event internal pesanan-selesai. Menjadikannya kode izin menyiratkan ada peran yang boleh menyelesaikan pesanan TANPA memotong stok, yaitu jalur penyimpangan yang tidak boleh ada. Lihat docs/keamanan/PERMISSION-MATRIX.md bagian 1a dan ALT-DEF-034.',
    );
  }
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest.
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-007 (resep/versi/produksi) lulus.");
