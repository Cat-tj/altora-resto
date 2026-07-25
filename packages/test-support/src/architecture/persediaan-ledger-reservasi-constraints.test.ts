// Test struktur/arsitektur untuk ALT-DEF-008 (ledger stok, lokasi, batch,
// reservasi, transfer, waste, reorder, dan state machine opname - lihat
// ADR-023/ADR-024/ADR-025 di docs/engineering/DECISION-LOG.md).
//
// KONTEKS: sama seperti architecture test batch-batch sebelumnya, tidak ada
// Postgres nyata di environment correction-loop ini (ALT-DEF-029). File ini
// memverifikasi bahwa model/enum/constraint yang DIKLAIM ADR-023/024/025
// benar-benar ada di prisma/schema/schema.prisma, bukan sekadar diklaim di
// dokumentasi.
//
// Assertion NEGATIF yang paling penting di file ini (urut kepentingannya):
//   1. `MutasiStok` TIDAK boleh punya `updatedAt`, kolom status, maupun kolom
//      soft-delete. Kehadiran salah satunya menyiratkan baris ledger punya
//      SIKLUS HIDUP, padahal ia PERISTIWA YANG SUDAH TERJADI - dan begitu
//      sebuah baris mutasi bisa "diubah" atau "dinonaktifkan", saldo yang
//      dihitung dari SUM(jumlah) tidak lagi dapat direkonstruksi. Ini
//      assertion terpenting di seluruh file.
//   2. Nilai enum LAMA `JenisMutasiStok` (MASUK_PEMBELIAN/KELUAR_PENJUALAN/
//      OPNAME_PENYESUAIAN/RETUR) HARUS BENAR-BENAR HILANG. Membiarkannya
//      berdampingan dengan nilai baru menciptakan DUA nama untuk satu
//      peristiwa yang sama - persis kelas defect yang sedang diperbaiki.
//   3. Nilai status opname LAMA (DIRENCANAKAN/BERLANGSUNG/SELESAI) HARUS
//      hilang - state machine 4-status itu tidak punya tempat sama sekali
//      untuk ALT-PSD-017 (approval selisih signifikan).
//   4. `StokOpnameBaris.kuantitasFisik` HARUS nullable. Non-null memaksa
//      baris yang BELUM dihitung berpura-pura fisiknya 0, yang membuat
//      `selisih` sebesar seluruh saldo dan memposting koreksi yang MENGHAPUS
//      STOK NYATA.
//   5. `BatchStok` TIDAK boleh punya kolom sisa/kuantitasSisa - itu akan
//      menjadi cache turunan KEDUA di samping StokBahan, dengan aturan
//      rekonsiliasi sendiri (ADR-025 Keputusan 3).
//
// Test ini JUGA memverifikasi keberadaan DUA file SQL manual (partial unique
// index NULL-semantics, dan trigger append-only + kesepadanan pembalik) -
// kalau file itu tidak ada, tidak ada apa pun yang akan menegakkan invariant
// tersebut dan ADR-023 Keputusan 1/3/5 hanya jadi klaim.
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
const SQL_AGREGAT_PATH = resolve(ROOT, "prisma/migrations/manual/004_stok_bahan_agregat_gudang_unik.sql");
const SQL_APPEND_ONLY_PATH = resolve(ROOT, "prisma/migrations/manual/005_mutasi_stok_append_only_dan_pembalik.sql");
const STATE_MACHINES_PATH = resolve(ROOT, "docs/arsitektur/STATE-MACHINES.md");
const API_CONTRACT_PATH = resolve(ROOT, "docs/api/API-CONTRACT.md");

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
// PENTING di file ini: schema.prisma memuat banyak komentar yang menyebut
// "updatedAt", "status", dan nama enum lama sebagai penjelasan; assertion
// negatif yang naif akan gagal PALSU karenanya.
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

// Atribut blok (`@@unique`, `@@index`, `@@map`, ...) SAJA - agar assertion
// tentang constraint tidak tertipu penyebutan `@@unique(...)` di komentar.
function getAtributBlok(schema: string, modelName: string): string[] {
  const body = getModelBody(schema, modelName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => normalisasiSpasiHorizontal(baris.trim()))
    .filter((baris) => baris.startsWith("@@"));
}

function wajibPunyaKolom(schema: string, model: string, kolom: string[], konteks: string): void {
  const fields = getNamaField(schema, model);
  for (const k of kolom) {
    if (!fields.includes(k)) {
      throw new Error(
        `ASSERTION GAGAL: model ${model} harus punya kolom \`${k}\` (${konteks}). Field aktual: [${fields.join(", ")}]`,
      );
    }
  }
}

function wajibNilaiEnumPersis(schema: string, enumName: string, nilai: string[], konteks: string): void {
  const aktual = getNilaiEnum(schema, enumName);
  assertEqual(
    aktual.length,
    nilai.length,
    `enum ${enumName} harus punya PERSIS ${nilai.length} nilai (${konteks}). Aktual (${aktual.length}): [${aktual.join(", ")}]`,
  );
  for (const n of nilai) {
    if (!aktual.includes(n)) {
      throw new Error(
        `ASSERTION GAGAL: enum ${enumName} harus memuat nilai ${n} (${konteks}). Aktual: [${aktual.join(", ")}]`,
      );
    }
  }
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ADR-023 Keputusan 1: MutasiStok adalah LEDGER APPEND-ONLY
  // ===================================================================
  // INI ASSERTION TERPENTING DI SELURUH FILE.
  const mutasiBody = getModelBody(schema, "MutasiStok");
  const fieldMutasi = getNamaField(schema, "MutasiStok");

  for (const terlarang of ["updatedAt", "status", "dihapusPada", "deletedAt", "aktif"]) {
    if (fieldMutasi.includes(terlarang)) {
      throw new Error(
        `ASSERTION GAGAL: MutasiStok TIDAK boleh punya kolom \`${terlarang}\`. Model ini adalah LEDGER APPEND-ONLY: satu-satunya operasi yang sah adalah INSERT, dan koreksi SELALU berupa baris PEMBALIK baru (ADR-006, ADR-023 Keputusan 1). Kehadiran kolom ini menyiratkan baris mutasi punya SIKLUS HIDUP, padahal ia PERISTIWA YANG SUDAH TERJADI - dan begitu sebuah baris mutasi bisa diubah atau dinonaktifkan, saldo yang dihitung dari SUM(jumlah) TIDAK LAGI dapat direkonstruksi dari ledger, yang menghapus seluruh alasan keberadaan model ini. Field aktual: [${fieldMutasi.join(", ")}]`,
      );
    }
  }
  // `createdAt` WAJIB ada - ia satu-satunya penanda waktu peristiwa, dan
  // sekaligus kunci urut FIFO.
  assertContains(
    mutasiBody,
    "createdAt DateTime @default(now())",
    "MutasiStok.createdAt wajib ada dengan @default(now()) - ia satu-satunya penanda waktu peristiwa di model append-only ini.",
  );
  // `jumlah` Decimal bertanda: TIDAK boleh ada kolom arah terpisah, karena dua
  // sumber kebenaran arah membuat SUM() tidak lagi menghasilkan saldo.
  assertContains(
    mutasiBody,
    "jumlah Decimal",
    "MutasiStok.jumlah harus Decimal (kuantitas bahan butuh presisi pecahan; ADR-005 mewajibkan Int HANYA untuk nilai uang rupiah).",
  );
  for (const terlarang of ["arah", "isMasuk", "masuk", "tipeArah"]) {
    if (fieldMutasi.includes(terlarang)) {
      throw new Error(
        `ASSERTION GAGAL: MutasiStok TIDAK boleh punya kolom arah terpisah (\`${terlarang}\`) - arah dibawa TANDA \`jumlah\` (positif=masuk, negatif=keluar). Dua sumber kebenaran untuk arah membuat SUM(jumlah) tidak lagi menghasilkan saldo yang benar begitu keduanya tidak konsisten (ADR-023 Keputusan 1).`,
      );
    }
  }

  // ===================================================================
  // ADR-023 Keputusan 2: JenisMutasiStok 12 nilai; nilai lama HILANG
  // ===================================================================
  const JENIS_MUTASI = [
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
  wajibNilaiEnumPersis(schema, "JenisMutasiStok", JENIS_MUTASI, "ADR-023 Keputusan 2");
  // Assertion NEGATIF: nilai KOARSE lama harus BENAR-BENAR HILANG.
  const nilaiJenis = getNilaiEnum(schema, "JenisMutasiStok");
  for (const lama of ["MASUK_PEMBELIAN", "KELUAR_PENJUALAN", "OPNAME_PENYESUAIAN", "RETUR"]) {
    if (nilaiJenis.includes(lama)) {
      throw new Error(
        `ASSERTION GAGAL: JenisMutasiStok MASIH punya nilai lama \`${lama}\`. Nilai koarse lama harus DIGANTI, bukan dipertahankan berdampingan dengan nilai baru - dua nama untuk satu peristiwa yang sama adalah persis kelas defect yang sedang diperbaiki ALT-DEF-008. Pemetaan lama->baru ada di ADR-023 Keputusan 2 dan docs/database/04-persediaan.md. Penggantian aman karena belum ada migrasi yang pernah dijalankan (ALT-DEF-029), sehingga belum ada satu baris data pun. Aktual: [${nilaiJenis.join(", ")}]`,
      );
    }
  }
  // `RETUR` polos harus hilang KHUSUSNYA karena ia AMBIGU: ia menutupi dua
  // peristiwa berarah berlawanan (retur pelanggan = masuk; retur supplier =
  // keluar). Dicek eksplisit agar pesannya menjelaskan MENGAPA.
  if (nilaiJenis.includes("RETUR")) {
    throw new Error(
      "ASSERTION GAGAL: JenisMutasiStok tidak boleh punya nilai `RETUR` polos - ia AMBIGU: satu nilai menutupi DUA peristiwa dengan arah berlawanan (retur pelanggan = barang MASUK kembali; retur ke supplier = barang KELUAR). Harus dipecah menjadi RETUR_PENJUALAN dan RETUR_SUPPLIER (ADR-023 Keputusan 2).",
    );
  }

  const REFERENSI_JENIS = [
    "PEMBELIAN",
    "PESANAN",
    "OPNAME",
    "TRANSFER",
    "PRODUKSI",
    "WASTE",
    "PENYESUAIAN",
    "RETUR_PEMBELIAN",
    "PEMAKAIAN_INTERNAL",
  ];
  wajibNilaiEnumPersis(schema, "ReferensiJenisMutasi", REFERENSI_JENIS, "ADR-023 Keputusan 2");

  // ===================================================================
  // ADR-023 Keputusan 5: integritas reversal
  // ===================================================================
  assertContains(
    mutasiBody,
    "dibalikOlehId String? @unique",
    "MutasiStok.dibalikOlehId harus `String? @unique`. Kolom TUNGGAL = satu mutasi dibalik PALING BANYAK sekali (tidak ada tempat untuk pembalik kedua); @unique = satu pembalik membalik PALING BANYAK satu mutasi asal. HANYA kedua hal itu yang dijamin database - tanda berlawanan, kesamaan tenant/gudang/bahan, dan larangan rantai pembalik-dari-pembalik TIDAK dijamin dan bergantung pada trigger di SQL manual 005 (ADR-023 Keputusan 5).",
  );
  assertContains(
    mutasiBody,
    'dibalikOleh MutasiStok? @relation("MutasiPembalik", fields: [dibalikOlehId], references: [id])',
    "MutasiStok.dibalikOleh harus self-relation bernama `MutasiPembalik`.",
  );
  assertContains(
    mutasiBody,
    'pembalikDari MutasiStok? @relation("MutasiPembalik")',
    "MutasiStok.pembalikDari adalah sisi lain self-relation `MutasiPembalik` - tanpanya tidak ada cara menelusuri dari baris pembalik ke mutasi asalnya.",
  );
  // Assertion NEGATIF: `dibalikOlehId` TIDAK boleh menjadi list.
  assertNotContains(
    mutasiBody,
    "dibalikOleh MutasiStok[]",
    "MutasiStok.dibalikOleh TIDAK boleh berupa list `MutasiStok[]` - itu akan mengizinkan satu mutasi dibalik BERKALI-KALI, sehingga saldo bersihnya dikoreksi berlipat (ADR-023 Keputusan 5 poin 1).",
  );

  // Kolom baru ALT-DEF-008 pada ledger.
  wajibPunyaKolom(
    schema,
    "MutasiStok",
    ["lokasiSumberId", "lokasiTujuanId", "batchStokId", "satuanId", "hargaPerolehan", "dibuatOlehId"],
    "ADR-024 Keputusan 1 / ADR-025 Keputusan 3",
  );
  // KEDUANYA nullable: transfer punya dua-duanya, pembelian hanya tujuan,
  // pemakaian hanya sumber.
  for (const kolom of ["lokasiSumberId String?", "lokasiTujuanId String?", "batchStokId String?"]) {
    assertContains(
      mutasiBody,
      kolom,
      `MutasiStok.${kolom.split(" ")[0]} WAJIB nullable - transfer bergerak antar lokasi (dua-duanya terisi), pembelian hanya punya tujuan, pemakaian hanya punya sumber. Menjadikan salah satunya wajib membuat dua dari tiga bentuk itu mustahil (ADR-024 Keputusan 1).`,
    );
  }
  assertContains(
    mutasiBody,
    "hargaPerolehan Int?",
    "MutasiStok.hargaPerolehan harus Int (rupiah bulat per ADR-005) DAN nullable - hanya mutasi MASUK yang membawa biaya perolehan.",
  );
  // `dibuatOlehId` sebelumnya kolom scalar TANPA relasi FK sama sekali.
  assertContains(
    mutasiBody,
    'dibuatOleh Pengguna @relation("MutasiStokDibuatOleh", fields: [dibuatOlehId], references: [id])',
    "MutasiStok.dibuatOleh harus FK sungguhan ke Pengguna (sebelumnya `dibuatOlehId` hanya kolom scalar tanpa relasi apa pun - gap yang sama seperti `gudangId` dulu). FK ID TUNGGAL, bukan composite: relasi ke Pengguna TIDAK PERNAH di-composite-kan ke tenant (ADR-013 poin 5).",
  );
  const atributMutasi = getAtributBlok(schema, "MutasiStok").join("\n");
  assertContains(
    atributMutasi,
    "@@unique([tenantId, id])",
    "MutasiStok harus punya @@unique([tenantId, id]) - PenyesuaianStok/CatatanWaste/TransferStokBaris bergantung padanya untuk composite-FK (tenantId, mutasiStokId).",
  );

  // ===================================================================
  // ADR-023 Keputusan 3: StokBahan sebagai CACHE, bukan sumber kebenaran
  // ===================================================================
  // Nama model SENGAJA tetap `StokBahan`, BUKAN `SaldoStok`.
  if (!adaModel(schema, "StokBahan")) {
    throw new Error(
      "ASSERTION GAGAL: model `StokBahan` hilang. ADR-023 Keputusan 3 memutuskan namanya DIPERTAHANKAN (bukan diganti `SaldoStok` seperti bunyi MASTER-CHECKLIST ALT-PSD-007) - `SaldoStok` adalah ALIAS DOKUMENTASI. Yang berubah bukan namanya melainkan STATUSNYA: ia kini dinyatakan eksplisit sebagai cache turunan.",
    );
  }
  if (adaModel(schema, "SaldoStok")) {
    throw new Error(
      "ASSERTION GAGAL: model `SaldoStok` TIDAK boleh ada berdampingan dengan `StokBahan` - keduanya akan menjadi DUA cache saldo untuk data yang sama, dengan aturan rekonsiliasi masing-masing. ADR-023 Keputusan 3 memutuskan `StokBahan` dipertahankan dan `SaldoStok` hanya alias dokumentasi.",
    );
  }
  const stokBody = getModelBody(schema, "StokBahan");
  wajibPunyaKolom(
    schema,
    "StokBahan",
    ["lokasiStokId", "kuantitas", "kuantitasDireservasi", "direkonsiliasiPada"],
    "ADR-023 Keputusan 1/3",
  );
  assertContains(
    stokBody,
    "lokasiStokId String?",
    "StokBahan.lokasiStokId harus nullable - NULL adalah baris AGREGAT level-gudang, non-NULL adalah saldo satu sub-lokasi (ALT-PSD-004).",
  );
  assertContains(
    stokBody,
    "kuantitasDireservasi Decimal @default(0)",
    "StokBahan.kuantitasDireservasi harus Decimal @default(0) - stok TERSEDIA = kuantitas - kuantitasDireservasi. Reservasi mengurangi stok TERSEDIA tanpa menyentuh stok FISIK (ADR-024 Keputusan 2).",
  );
  assertContains(
    stokBody,
    "direkonsiliasiPada DateTime?",
    "StokBahan.direkonsiliasiPada harus ada dan nullable - ia SEAM job rekonsiliasi (ADR-023 Keputusan 1): job menghitung ulang SUM(MutasiStok.jumlah), MENIMPA kuantitas, dan mengisi kolom ini. Arah penulisan SATU ARAH; ledger tidak pernah disesuaikan ke cache.",
  );
  const atributStok = getAtributBlok(schema, "StokBahan").join("\n");
  assertContains(
    atributStok,
    "@@unique([gudangId, bahanId, lokasiStokId])",
    "StokBahan harus punya @@unique([gudangId, bahanId, lokasiStokId]) - satu baris saldo per (gudang, bahan, lokasi).",
  );
  // Assertion NEGATIF: constraint LAMA yang melarang granularitas lokasi.
  assertNotContains(
    atributStok,
    "@@unique([gudangId, bahanId])\n",
    "StokBahan TIDAK boleh lagi punya @@unique([gudangId, bahanId]) tanpa lokasiStokId - constraint itu MELARANG adanya lebih dari satu baris saldo per (gudang, bahan), sehingga saldo per sub-lokasi (ALT-PSD-004) menjadi mustahil secara struktural.",
  );

  // ===================================================================
  // ADR-024 Keputusan 1: LokasiStok + composite-FK OUTLET-LEVEL
  // ===================================================================
  const lokasiBody = getModelBody(schema, "LokasiStok");
  wajibPunyaKolom(schema, "LokasiStok", ["id", "tenantId", "outletId", "gudangId", "nama", "jenis", "status"], "ALT-PSD-004");
  assertContains(
    lokasiBody,
    "jenis JenisLokasiStok?",
    "LokasiStok.jenis harus nullable - 'rak nomor 3' yang tidak dikategorikan tetap sah (ALT-PSD-004).",
  );
  assertContains(
    lokasiBody,
    "gudang Gudang @relation(fields: [outletId, gudangId], references: [outletId, id])",
    "LokasiStok.gudang harus composite-FK OUTLET-LEVEL (outletId, gudangId) -> Gudang(outletId, id), BUKAN varian tenant-level. Risiko nyatanya adalah lokasi outlet A menunjuk gudang outlet B dalam tenant yang SAMA - composite (tenantId, gudangId) tidak menangkap itu sama sekali (ADR-013 poin 3, ADR-024 Keputusan 1).",
  );
  assertContains(
    getAtributBlok(schema, "LokasiStok").join("\n"),
    "@@unique([gudangId, nama])",
    "LokasiStok harus punya @@unique([gudangId, nama]) - dua rak bernama sama dalam satu gudang membuat pemilihan lokasi ambigu.",
  );
  // Gudang WAJIB mendapat @@unique([outletId, id]) baru, kalau tidak
  // composite-FK outlet-level di atas mustahil.
  assertContains(
    getAtributBlok(schema, "Gudang").join("\n"),
    "@@unique([outletId, id])",
    "Gudang harus punya @@unique([outletId, id]) BARU - TANPA ini composite-FK outlet-level milik LokasiStok dan TransferStok tidak mungkin sama sekali dan Prisma akan menolaknya (ADR-013 poin 3, ADR-024 Keputusan 1/4).",
  );
  wajibNilaiEnumPersis(
    schema,
    "JenisLokasiStok",
    ["RAK", "CHILLER", "FREEZER", "GUDANG_KERING", "AREA_PERSIAPAN", "LAINNYA"],
    "ALT-PSD-004",
  );

  // ===================================================================
  // ADR-024 Keputusan 3: BatchStok + SEAM ke BatchProduksi
  // ===================================================================
  const batchBody = getModelBody(schema, "BatchStok");
  const fieldBatch = getNamaField(schema, "BatchStok");
  wajibPunyaKolom(
    schema,
    "BatchStok",
    [
      "id",
      "tenantId",
      "outletId",
      "bahanId",
      "nomorBatch",
      "tanggalProduksi",
      "tanggalKedaluwarsa",
      "kuantitasAwal",
      "hargaPerolehan",
      "lokasiStokId",
      "batchProduksiId",
      "status",
      "createdAt",
    ],
    "ALT-PSD-010, ADR-024 Keputusan 3",
  );
  // FEFO/FIFO: skema WAJIB membawa cukup kolom (ADR-025 Keputusan 3).
  assertContains(
    batchBody,
    "tanggalKedaluwarsa DateTime?",
    "BatchStok.tanggalKedaluwarsa harus nullable - inilah kunci urut FEFO (first-expired-first-out); batch tanpa tanggal diurutkan TERAKHIR lalu jatuh ke FIFO by createdAt (ADR-025 Keputusan 3).",
  );
  assertContains(
    batchBody,
    "tanggalProduksi DateTime?",
    "BatchStok.tanggalProduksi harus nullable - tidak semua batch (mis. bahan beli) punya tanggal produksi yang dicatat.",
  );
  assertContains(
    batchBody,
    "createdAt DateTime @default(now())",
    "BatchStok.createdAt wajib - ia kunci urut FIFO dan fallback FEFO untuk batch tanpa tanggal kedaluwarsa (ADR-025 Keputusan 3).",
  );
  assertContains(
    batchBody,
    "hargaPerolehan Int",
    "BatchStok.hargaPerolehan harus Int (rupiah bulat, ADR-005) dan WAJIB - tanpa biaya perolehan per batch, penilaian persediaan dan nilai kerugian waste tidak dapat dihitung.",
  );
  assertContains(batchBody, "kuantitasAwal Decimal", "BatchStok.kuantitasAwal harus Decimal (kuantitas bahan, bukan uang).");
  // Assertion NEGATIF: TIDAK boleh ada kolom sisa - itu cache turunan KEDUA.
  for (const terlarang of ["kuantitasSisa", "sisa", "kuantitasTersisa", "kuantitasTerpakai"]) {
    if (fieldBatch.includes(terlarang)) {
      throw new Error(
        `ASSERTION GAGAL: BatchStok TIDAK boleh punya kolom \`${terlarang}\`. Sisa batch WAJIB dihitung dari ledger (kuantitasAwal - SUM(MutasiStok.jumlah WHERE batchStokId = ...)). Menyimpannya sebagai kolom menciptakan CACHE TURUNAN KEDUA di samping StokBahan, dengan aturan rekonsiliasinya sendiri - persis kelas defect yang ADR-023 Keputusan 1 ada untuk mencegahnya (ADR-025 Keputusan 3).`,
      );
    }
  }
  const atributBatch = getAtributBlok(schema, "BatchStok").join("\n");
  assertContains(
    atributBatch,
    "@@unique([tenantId, bahanId, nomorBatch])",
    "BatchStok harus punya @@unique([tenantId, bahanId, nomorBatch]) - unik PER BAHAN, bukan per tenant saja seperti BatchProduksi: nomor batch dalam praktik diberikan supplier dan hanya bermakna dalam konteks satu bahan; menuntutnya unik lintas-bahan akan menolak data supplier yang sah (ADR-024 Keputusan 3).",
  );
  // SEAM: FK 1:1 opsional ke BatchProduksi (menebus ADR-022 Keputusan 8 poin 4).
  assertContains(
    batchBody,
    "batchProduksiId String?",
    "BatchStok.batchProduksiId WAJIB nullable - batch hasil PEMBELIAN tidak punya proses produksi sama sekali. Inilah alasan utama BatchStok dan BatchProduksi TIDAK disatukan (ADR-024 Keputusan 3).",
  );
  assertContains(
    batchBody,
    "batchProduksi BatchProduksi? @relation(fields: [tenantId, batchProduksiId], references: [tenantId, id])",
    "BatchStok.batchProduksi harus composite-FK (tenantId, batchProduksiId) -> BatchProduksi(tenantId, id). INI ADALAH SEAM yang dijanjikan ADR-022 Keputusan 8 poin 4 - ADR-022 sudah menyiapkan @@unique([tenantId, id]) di BatchProduksi SECARA EKSPLISIT untuk tujuan ini. Tanpa relasi ini, akan ada DUA konsep batch yang terputus di skema yang sama.",
  );
  assertContains(
    atributBatch,
    "@@unique([tenantId, batchProduksiId])",
    "BatchStok harus punya @@unique([tenantId, batchProduksiId]) - inilah yang menjadikan seam BatchProduksi<->BatchStok 1:1 OPSIONAL: satu BatchProduksi melahirkan PALING BANYAK satu BatchStok. Tanpanya satu batch produksi bisa diklaim banyak batch stok dan kuantitasnya terhitung berlipat.",
  );
  assertContains(
    getModelBody(schema, "BatchProduksi"),
    "batchStok BatchStok?",
    "BatchProduksi harus punya back-relation `batchStok BatchStok?` - sisi lain dari seam ADR-024 Keputusan 3.",
  );
  // Indeks pendukung FEFO/FIFO harus BENAR-BENAR ada.
  assertContains(
    atributBatch,
    "@@index([tenantId, bahanId, status, tanggalKedaluwarsa])",
    "BatchStok harus punya indeks FEFO @@index([tenantId, bahanId, status, tanggalKedaluwarsa]) - alokasi batch berjalan di jalur panas setiap pemotongan stok (ADR-025 Keputusan 3).",
  );
  assertContains(
    atributBatch,
    "@@index([tenantId, bahanId, status, createdAt])",
    "BatchStok harus punya indeks FIFO @@index([tenantId, bahanId, status, createdAt]) (ADR-025 Keputusan 3).",
  );
  wajibNilaiEnumPersis(schema, "StatusBatchStok", ["TERSEDIA", "HABIS", "KEDALUWARSA", "DIBUANG"], "ALT-PSD-010");

  // ===================================================================
  // ADR-024 Keputusan 2: ReservasiStok
  // ===================================================================
  const reservasiBody = getModelBody(schema, "ReservasiStok");
  const fieldReservasi = getNamaField(schema, "ReservasiStok");
  wajibPunyaKolom(
    schema,
    "ReservasiStok",
    ["id", "tenantId", "outletId", "itemPesananId", "bahanId", "jumlah", "satuanId", "status", "createdAt", "dilepasPada"],
    "ALT-PSD-008/ALT-PSD-009, ADR-024 Keputusan 2",
  );
  // Digantung pada BARIS pesanan, bukan Pesanan.
  if (fieldReservasi.includes("pesananId")) {
    throw new Error(
      "ASSERTION GAGAL: ReservasiStok TIDAK boleh punya kolom `pesananId` - ia WAJIB digantung pada `itemPesananId`. Membatalkan SATU baris pesanan tidak boleh melepas reservasi baris LAIN di pesanan yang sama, dan itu mustahil dinyatakan bila reservasi hanya menunjuk Pesanan (ADR-024 Keputusan 2).",
    );
  }
  assertContains(
    reservasiBody,
    "itemPesanan ItemPesanan @relation(fields: [itemPesananId], references: [id])",
    "ReservasiStok.itemPesanan harus FK ID TUNGGAL ke ItemPesanan - ItemPesanan tidak membawa tenantId sendiri (baris di bawah Pesanan, ADR-013), konsisten dengan ItemPesanan.resepVersi (ADR-022 Keputusan 7).",
  );
  assertContains(reservasiBody, "jumlah Decimal", "ReservasiStok.jumlah harus Decimal (kuantitas bahan, bukan uang).");
  assertContains(
    reservasiBody,
    "status StatusReservasiStok @default(AKTIF)",
    "ReservasiStok.status harus @default(AKTIF) - reservasi baru selalu mengunci stok sampai ada keputusan.",
  );
  assertContains(
    reservasiBody,
    "dilepasPada DateTime?",
    "ReservasiStok.dilepasPada harus nullable - reservasi AKTIF belum dilepas.",
  );
  // DILEPAS vs DIKONSUMSI WAJIB dibedakan.
  wajibNilaiEnumPersis(
    schema,
    "StatusReservasiStok",
    ["AKTIF", "DILEPAS", "DIKONSUMSI", "KEDALUWARSA"],
    "ADR-024 Keputusan 2 - DILEPAS (dibatalkan tanpa pemakaian) dan DIKONSUMSI (berubah menjadi mutasi nyata) WAJIB dibedakan: hanya yang kedua punya baris MutasiStok pendamping. Menggabungkannya membuat pertanyaan 'apakah reservasi ini pernah menjadi pemakaian?' tidak terjawab dari data",
  );
  assertContains(
    getModelBody(schema, "ItemPesanan"),
    "reservasiStok ReservasiStok[]",
    "ItemPesanan harus punya back-relation `reservasiStok ReservasiStok[]` - sisi lain dari FK ADR-024 Keputusan 2.",
  );

  // ===================================================================
  // ADR-023 Keputusan 4: PenyesuaianStok / CatatanWaste WAJIB punya ledger
  // ===================================================================
  for (const model of ["PenyesuaianStok", "CatatanWaste"]) {
    const body = getModelBody(schema, model);
    assertContains(
      body,
      "mutasiStokId String @unique",
      `${model}.mutasiStokId harus NON-NULL dan @unique. Non-null: dokumen ${model} yang tidak menulis baris ledger berarti saldo berubah TANPA JEJAK, pelanggaran langsung aturan keras domain ini (ADR-023 Keputusan 1). @unique: dua dokumen yang mengklaim satu baris mutasi yang sama akan membuat nilainya terhitung GANDA di laporan (ADR-023 Keputusan 4).`,
    );
    assertContains(
      getAtributBlok(schema, model).join("\n"),
      "@@unique([tenantId, mutasiStokId])",
      `${model} harus punya @@unique([tenantId, mutasiStokId]) - Prisma mewajibkan unique yang mencakup SELURUH field composite pada relasi 1-1 (pola sama seperti TiketDapur.pesananId, ADR-013).`,
    );
  }
  wajibPunyaKolom(
    schema,
    "PenyesuaianStok",
    ["jumlahSebelum", "jumlahSesudah", "alasan", "disetujuiOlehId", "mutasiStokId"],
    "ADR-023 Keputusan 4",
  );
  assertContains(
    getModelBody(schema, "PenyesuaianStok"),
    "alasan String",
    "PenyesuaianStok.alasan harus NON-NULL - penyesuaian manual tanpa alasan adalah perubahan saldo yang tidak dapat diaudit.",
  );

  // CatatanWaste: alasanWasteId WAJIB (bukan teks bebas) - bunyi ALT-PSD-014.
  const wasteBody = getModelBody(schema, "CatatanWaste");
  assertContains(
    wasteBody,
    "alasanWasteId String",
    "CatatanWaste.alasanWasteId harus NON-NULL - bunyi harfiah acceptance ALT-PSD-014: waste WAJIB memilih dari daftar AlasanWaste standar, BUKAN teks bebas.",
  );
  assertNotContains(
    wasteBody,
    "alasanWasteId String?",
    "CatatanWaste.alasanWasteId TIDAK boleh nullable - nullable berarti waste boleh dicatat tanpa alasan berkode, yang mengembalikan persis masalah teks-bebas yang ALT-PSD-014 larang.",
  );
  assertContains(
    wasteBody,
    "alasanWaste AlasanWaste @relation(fields: [tenantId, alasanWasteId], references: [tenantId, id])",
    "CatatanWaste.alasanWaste harus composite-FK (tenantId, alasanWasteId) -> AlasanWaste(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    wasteBody,
    "nilaiKerugian Int?",
    "CatatanWaste.nilaiKerugian harus Int (rupiah bulat, ADR-005) DAN nullable - ia dihitung dari hargaPerolehan batch, yang tidak selalu diketahui.",
  );
  assertContains(
    getAtributBlok(schema, "AlasanWaste").join("\n"),
    "@@unique([tenantId, kode])",
    "AlasanWaste harus punya @@unique([tenantId, kode]) - taksonomi alasan tenant-scoped (ALT-PSD-015).",
  );
  // AlasanWaste dinonaktifkan lewat status, TIDAK PERNAH dihapus.
  assertContains(
    getModelBody(schema, "AlasanWaste"),
    "status StatusAktifNonaktif @default(AKTIF)",
    "AlasanWaste.status wajib ada - alasan dinonaktifkan lewat status, tidak pernah dihapus, agar histori CatatanWaste yang merujuknya tetap terbaca (ADR-006, ALT-PSD-015).",
  );

  // ===================================================================
  // ADR-024 Keputusan 4: TransferStok / TransferStokBaris
  // ===================================================================
  const transferBody = getModelBody(schema, "TransferStok");
  wajibPunyaKolom(
    schema,
    "TransferStok",
    [
      "nomorTransfer",
      "outletAsalId",
      "gudangAsalId",
      "outletTujuanId",
      "gudangTujuanId",
      "status",
      "dibuatOlehId",
      "disetujuiOlehId",
      "dikirimOlehId",
      "diterimaOlehId",
      "diajukanPada",
      "disetujuiPada",
      "dikirimPada",
      "diterimaPada",
    ],
    "ALT-PSD-012/ALT-PSD-013, ADR-024 Keputusan 4",
  );
  // Composite-FK OUTLET-LEVEL untuk KEDUA gudang - inilah yang menjamin gudang
  // asal benar-benar milik outlet asal, pada operasi yang justru menyeberangi
  // outlet.
  assertContains(
    transferBody,
    'gudangAsal Gudang @relation("TransferStokGudangAsal", fields: [outletAsalId, gudangAsalId], references: [outletId, id])',
    "TransferStok.gudangAsal harus composite-FK OUTLET-LEVEL (outletAsalId, gudangAsalId) -> Gudang(outletId, id). Composite (tenantId, gudangId) saja TIDAK menjamin gudang asal milik outlet asal pada tenant multi-outlet - dan transfer justru operasi yang menyeberangi outlet, jadi di sinilah jaminan itu paling dibutuhkan (ADR-013 poin 3, ADR-024 Keputusan 4).",
  );
  assertContains(
    transferBody,
    'gudangTujuan Gudang @relation("TransferStokGudangTujuan", fields: [outletTujuanId, gudangTujuanId], references: [outletId, id])',
    "TransferStok.gudangTujuan harus composite-FK OUTLET-LEVEL - lihat pesan gudangAsal di atas.",
  );
  assertContains(
    getAtributBlok(schema, "TransferStok").join("\n"),
    "@@unique([tenantId, nomorTransfer])",
    "TransferStok harus punya @@unique([tenantId, nomorTransfer]) - nomor transfer adalah identitas telusur yang tidak boleh berulang dalam satu tenant.",
  );
  wajibNilaiEnumPersis(
    schema,
    "StatusTransferStok",
    ["DRAF", "DIAJUKAN", "DISETUJUI", "DIKIRIM", "DITERIMA_SEBAGIAN", "DITERIMA", "DIBATALKAN"],
    "ADR-024 Keputusan 4 - DITERIMA_SEBAGIAN dipisahkan dari DITERIMA karena yang pertama masih menyisakan barang 'dalam perjalanan' yang belum menjadi saldo gudang mana pun",
  );

  const transferBarisBody = getModelBody(schema, "TransferStokBaris");
  wajibPunyaKolom(
    schema,
    "TransferStokBaris",
    ["jumlahDiminta", "jumlahDikirim", "jumlahDiterima", "batchStokId", "mutasiKeluarId", "mutasiMasukId"],
    "ADR-024 Keputusan 4",
  );
  // TIGA kolom terpisah, bukan satu kolom yang ditimpa.
  assertContains(
    transferBarisBody,
    "jumlahDiminta Decimal",
    "TransferStokBaris.jumlahDiminta wajib Decimal dan NON-NULL - ia jumlah yang diminta, selalu diketahui sejak transfer dibuat.",
  );
  for (const kolom of ["jumlahDikirim Decimal?", "jumlahDiterima Decimal?"]) {
    assertContains(
      transferBarisBody,
      kolom,
      `TransferStokBaris.${kolom.split(" ")[0]} WAJIB nullable dan TERPISAH dari jumlahDiminta. Selisih di antara ketiga kolom itu adalah SELURUH alasan status DITERIMA_SEBAGIAN ada; menimpa satu kolom yang sama akan menghapus informasi susut/kehilangan dalam perjalanan (ADR-024 Keputusan 4).`,
    );
  }
  // Pasangan mutasi keluar/masuk TERPISAH dan masing-masing @unique.
  for (const kolom of ["mutasiKeluarId String? @unique", "mutasiMasukId String? @unique"]) {
    assertContains(
      transferBarisBody,
      kolom,
      `TransferStokBaris.${kolom.split(" ")[0]} harus nullable DAN @unique. Nullable: TRANSFER_KELUAR ditulis saat DIKIRIM dan TRANSFER_MASUK saat DITERIMA - BUKAN keduanya sekaligus, karena barang dalam perjalanan bukan saldo gudang mana pun. @unique: mencegah satu baris mutasi diklaim dua baris transfer (ADR-024 Keputusan 4).`,
    );
  }

  // ===================================================================
  // ADR-024 Keputusan 5: KebijakanPemesananUlang
  // ===================================================================
  const reorderBody = getModelBody(schema, "KebijakanPemesananUlang");
  wajibPunyaKolom(
    schema,
    "KebijakanPemesananUlang",
    ["outletId", "bahanId", "stokMinimum", "stokMaksimum", "jumlahPemesananUlang", "metode", "status"],
    "ALT-PSD-018",
  );
  assertContains(
    reorderBody,
    "stokMinimum Decimal",
    "KebijakanPemesananUlang.stokMinimum harus Decimal, BUKAN Int seperti `Bahan.stokMinimum` yang lama - ambang 0.5 kg adalah kebutuhan nyata dan tidak dapat diwakili Int (lihat ALT-DEF-036).",
  );
  assertContains(
    getAtributBlok(schema, "KebijakanPemesananUlang").join("\n"),
    "@@unique([outletId, bahanId])",
    "KebijakanPemesananUlang harus punya @@unique([outletId, bahanId]) - kebijakan PER OUTLET (ambang outlet bandara dan outlet perumahan berbeda jauh untuk bahan yang sama), dan dua kebijakan untuk pasangan yang sama membuat saran reorder non-deterministik (ALT-PSD-018).",
  );
  wajibNilaiEnumPersis(schema, "MetodePemesananUlang", ["MIN_MAX", "FIXED"], "ALT-PSD-018");

  // ===================================================================
  // ADR-025 Keputusan 1/3/4: PengaturanPersediaanOutlet (KOLOM BERTIPE)
  // ===================================================================
  const pengaturanBody = getModelBody(schema, "PengaturanPersediaanOutlet");
  wajibPunyaKolom(
    schema,
    "PengaturanPersediaanOutlet",
    [
      "outletId",
      "kebijakanPemotongan",
      "reservasiSaatPesananDiterima",
      "kedaluwarsaReservasiMenit",
      "metodeAlokasiBatch",
      "izinkanStokNegatif",
      "ambangSelisihOpname",
    ],
    "ADR-025 Keputusan 1/2/3/4",
  );
  assertContains(
    pengaturanBody,
    "kebijakanPemotongan KebijakanPemotonganStok @default(SAAT_MASUK_DAPUR)",
    "PengaturanPersediaanOutlet.kebijakanPemotongan harus bertipe ENUM dengan @default(SAAT_MASUK_DAPUR) (rekomendasi master spec: saat itulah bahan fisik mulai dipakai). Enum BERTIPE, bukan baris key-value Json di PengaturanOutlet: nilai ini dibaca di jalur panas SETIAP pemotongan stok, dan Json tidak memberi validasi enum maupun default - salah ketik kunci akan diam-diam jatuh ke default dan MENGUBAH PERILAKU POTONG STOK tanpa error apa pun (ADR-025 Keputusan 1).",
  );
  assertContains(
    pengaturanBody,
    "izinkanStokNegatif Boolean @default(false)",
    "PengaturanPersediaanOutlet.izinkanStokNegatif harus Boolean @default(false) - stok negatif DITOLAK secara default (409 STOK_TIDAK_CUKUP). Default true akan membuat kekurangan stok lolos diam-diam (ADR-025 Keputusan 4).",
  );
  assertContains(
    pengaturanBody,
    "metodeAlokasiBatch MetodeAlokasiBatch @default(FEFO)",
    "PengaturanPersediaanOutlet.metodeAlokasiBatch harus @default(FEFO) - first-expired-first-out wajib untuk bahan perishable; FIFO hanya fallback (ADR-025 Keputusan 3).",
  );
  assertContains(
    pengaturanBody,
    "outletId String @unique",
    "PengaturanPersediaanOutlet.outletId harus @unique - tepat SATU baris pengaturan per outlet; dua baris membuat kebijakan pemotongan stok non-deterministik.",
  );
  wajibNilaiEnumPersis(
    schema,
    "KebijakanPemotonganStok",
    ["SAAT_PESANAN_DITERIMA", "SAAT_MASUK_DAPUR", "SAAT_SELESAI", "SAAT_PEMBAYARAN"],
    "ADR-025 Keputusan 1 (master spec)",
  );
  wajibNilaiEnumPersis(schema, "MetodeAlokasiBatch", ["FEFO", "FIFO"], "ALT-PSD-011, ADR-025 Keputusan 3");

  // ===================================================================
  // ADR-025 Keputusan 5: state machine StokOpname
  // ===================================================================
  const STATUS_OPNAME = [
    "DRAF",
    "SEDANG_DIHITUNG",
    "DIKUNCI",
    "MENUNGGU_PERSETUJUAN",
    "DISETUJUI",
    "DIPOSTING",
    "DIBATALKAN",
  ];
  wajibNilaiEnumPersis(schema, "StatusStokOpname", STATUS_OPNAME, "ADR-025 Keputusan 5");
  // Assertion NEGATIF: status LAMA harus hilang.
  const nilaiStatusOpname = getNilaiEnum(schema, "StatusStokOpname");
  for (const lama of ["DIRENCANAKAN", "BERLANGSUNG", "SELESAI"]) {
    if (nilaiStatusOpname.includes(lama)) {
      throw new Error(
        `ASSERTION GAGAL: StatusStokOpname MASIH punya nilai lama \`${lama}\`. State machine 4-status lama tidak punya tempat SAMA SEKALI untuk ALT-PSD-017 (approval selisih signifikan) - DIKUNCI dan MENUNGGU_PERSETUJUAN adalah status baru yang tidak punya padanan apa pun di sana. Pemetaan: DIRENCANAKAN->DRAF, BERLANGSUNG->SEDANG_DIHITUNG, SELESAI->DIPOSTING (ADR-025 Keputusan 5).`,
      );
    }
  }
  const opnameBody = getModelBody(schema, "StokOpname");
  wajibPunyaKolom(
    schema,
    "StokOpname",
    ["snapshotPada", "dikunciPada", "disetujuiPada", "dipostingPada", "alasan", "dibuatOlehId", "penghitungId", "pengunciId", "penyetujuId"],
    "ADR-025 Keputusan 5",
  );
  assertContains(
    opnameBody,
    "status StatusStokOpname @default(DRAF)",
    "StokOpname.status harus @default(DRAF) - opname baru tidak pernah langsung menghitung sebelum snapshot dibekukan.",
  );
  assertContains(
    opnameBody,
    "snapshotPada DateTime?",
    "StokOpname.snapshotPada wajib ada dan nullable. TANPA kolom ini, 'selisih' membandingkan hitungan fisik pukul 22:00 dengan saldo yang sudah bergerak sampai pukul 23:00, dan angkanya TIDAK BERMAKNA - defect diam-diam yang ada di model lama (ADR-025 Keputusan 5).",
  );
  // EMPAT aktor terpisah - inti kontrol internal opname.
  for (const aktor of ["penghitungId String?", "pengunciId String?", "penyetujuId String?"]) {
    assertContains(
      opnameBody,
      aktor,
      `StokOpname.${aktor.split(" ")[0]} wajib ada dan nullable - EMPAT aktor terpisah (pembuat/penghitung/pengunci/penyetuju), bukan satu kolom diubahOlehId. Pemisahan penghitung dari penyetuju adalah INTI kontrol internal opname: orang yang menghitung tidak boleh menyetujui hitungannya sendiri (ADR-025 Keputusan 5).`,
    );
  }
  assertContains(
    opnameBody,
    'penyetuju Pengguna? @relation("OpnameDisetujuiOleh", fields: [penyetujuId], references: [id])',
    "StokOpname.penyetuju harus FK ID TUNGGAL ke Pengguna (ADR-013 poin 5).",
  );

  // StokOpnameBaris: kuantitasFisik/selisih WAJIB nullable.
  const opnameBarisBody = getModelBody(schema, "StokOpnameBaris");
  assertContains(
    opnameBarisBody,
    "kuantitasFisik Decimal?",
    "StokOpnameBaris.kuantitasFisik WAJIB NULLABLE (sebelumnya non-null). Ini perbaikan defect, bukan pelonggaran: non-null memaksa baris yang BELUM dihitung berpura-pura fisiknya 0, yang membuat `selisih` sebesar SELURUH SALDO dan memposting mutasi koreksi yang MENGHAPUS STOK NYATA (ADR-025 Keputusan 5).",
  );
  assertContains(
    opnameBarisBody,
    "selisih Decimal?",
    "StokOpnameBaris.selisih WAJIB nullable - selisih hanya bermakna setelah kuantitasFisik terisi; lihat pesan kuantitasFisik di atas.",
  );
  assertContains(
    opnameBarisBody,
    "mutasiKoreksiId String? @unique",
    "StokOpnameBaris.mutasiKoreksiId harus nullable dan @unique - ia jejak ledger baris ini setelah DIPOSTING (nullable karena baris ber-selisih 0 tidak menghasilkan mutasi; @unique agar satu mutasi koreksi tidak diklaim dua baris opname, yang akan menggandakan koreksi saldo).",
  );
  assertContains(
    getAtributBlok(schema, "StokOpnameBaris").join("\n"),
    "@@unique([stokOpnameId, bahanId, lokasiStokId])",
    "StokOpnameBaris harus punya @@unique([stokOpnameId, bahanId, lokasiStokId]) - dua baris hitung untuk bahan yang sama menghasilkan DUA mutasi KOREKSI_OPNAME dan karena itu koreksi saldo GANDA saat posting.",
  );

  // ===================================================================
  // File SQL manual - tanpa keduanya, invariant tidak punya penegak apa pun
  // ===================================================================
  if (!existsSync(SQL_AGREGAT_PATH)) {
    throw new Error(
      `ASSERTION GAGAL: file SQL partial unique index tidak ditemukan di ${SQL_AGREGAT_PATH}. Tanpa file ini, aturan "satu baris StokBahan agregat level-gudang per (gudang, bahan)" tidak punya penegak apa pun: @@unique([gudangId, bahanId, lokasiStokId]) di schema.prisma TIDAK menutup kasus lokasiStokId NULL, karena Postgres memperlakukan NULL sebagai nilai yang SELALU BERBEDA di unique index (ADR-023 Keputusan 3).`,
    );
  }
  const sqlAgregat = normalisasiSpasiHorizontal(readFileSync(SQL_AGREGAT_PATH, "utf-8")).replace(/\n/g, " ");
  assertContains(sqlAgregat, "CREATE UNIQUE INDEX", "File 004 harus benar-benar berisi CREATE UNIQUE INDEX, bukan sekadar komentar penjelasan.");
  // CATATAN dari mutation testing: memeriksa "ON stok_bahan" dan
  // 'WHERE "lokasiStokId" IS NULL' sebagai DUA assertion terpisah adalah
  // VACUOUS - file ini memuat DUA index yang keduanya ber-klausa WHERE yang
  // sama, sehingga menghapus WHERE dari index PERTAMA tetap lolos karena
  // needle-nya dipenuhi index KEDUA. Karena itu setiap index diperiksa sebagai
  // SATU pernyataan utuh, tabel + klausa WHERE sekaligus.
  assertContains(
    sqlAgregat,
    'ON stok_bahan ("gudangId", "bahanId") WHERE "lokasiStokId" IS NULL;',
    'Index atas stok_bahan harus PARTIAL sebagai SATU pernyataan utuh: ON stok_bahan ("gudangId", "bahanId") WHERE "lokasiStokId" IS NULL. Postgres memperlakukan NULL sebagai nilai yang SELALU BERBEDA di unique index, sehingga @@unique([gudangId, bahanId, lokasiStokId]) di schema.prisma TIDAK mencegah DUA baris saldo agregat level-gudang untuk bahan yang sama - dan pembaca yang memakai findFirst akan melaporkan saldo yang SALAH SEBAGIAN secara non-deterministik. HANYA bentuk partial inilah yang menutupnya (ADR-023 Keputusan 3).',
  );
  assertContains(
    sqlAgregat,
    'ON stok_opname_baris ("stokOpnameId", "bahanId") WHERE "lokasiStokId" IS NULL;',
    'File 004 harus JUGA menutup celah NULL-semantics yang IDENTIK pada stok_opname_baris, sebagai satu pernyataan utuh. Dua baris opname untuk bahan yang sama menghasilkan DUA mutasi KOREKSI_OPNAME dan karena itu koreksi saldo GANDA saat posting (ADR-025 Keputusan 5).',
  );

  if (!existsSync(SQL_APPEND_ONLY_PATH)) {
    throw new Error(
      `ASSERTION GAGAL: file SQL trigger append-only tidak ditemukan di ${SQL_APPEND_ONLY_PATH}. Tanpa file ini, sifat append-only mutasi_stok dan kesepadanan mutasi pembalik tidak punya penegak level-data apa pun - keduanya invariant LINTAS-BARIS yang tidak dapat diekspresikan CHECK constraint (yang dilarang membaca baris lain) maupun DSL Prisma (ADR-023 Keputusan 1/5).`,
    );
  }
  const sqlAppendOnly = normalisasiSpasiHorizontal(readFileSync(SQL_APPEND_ONLY_PATH, "utf-8")).replace(/\n/g, " ");
  assertContains(sqlAppendOnly, "CREATE TRIGGER", "File 005 harus benar-benar berisi CREATE TRIGGER, bukan sekadar komentar penjelasan.");
  assertContains(sqlAppendOnly, "ON mutasi_stok", "Trigger harus dipasang pada tabel mutasi_stok.");
  assertContains(
    sqlAppendOnly,
    "BEFORE UPDATE OR DELETE ON mutasi_stok",
    "Trigger append-only harus menolak BAIK UPDATE MAUPUN DELETE - menolak hanya salah satunya meninggalkan jalur penulisan-ulang sejarah stok yang terbuka lebar.",
  );
  assertContains(
    sqlAppendOnly,
    "RAISE EXCEPTION",
    "Trigger harus benar-benar MENOLAK (RAISE EXCEPTION), bukan sekadar mencatat peringatan.",
  );

  // ===================================================================
  // Katalog izin: kode persediaan.* (ALT-DEF-008)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  for (const kode of [
    "persediaan.bahan.kelola",
    "persediaan.satuan.kelola",
    "persediaan.gudang.kelola",
    "persediaan.lokasi.kelola",
    "persediaan.mutasi.lihat",
    "persediaan.mutasi.balik",
    "persediaan.saldo.lihat",
    "persediaan.reservasi.kelola",
    "persediaan.reservasi.lepas",
    "persediaan.batch.kelola",
    "persediaan.transfer.kelola",
    "persediaan.transfer.setujui",
    "persediaan.transfer.terima",
    "persediaan.waste.kelola",
    "persediaan.alasan-waste.kelola",
    "persediaan.opname.kelola",
    "persediaan.opname.setujui",
    "persediaan.reorder.kelola",
  ]) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" (ALT-DEF-008; MASTER-CHECKLIST.md ALT-PSD-001 s.d. ALT-PSD-018 sudah mereferensikannya).`,
    );
  }
  // Kode KOARSE lama harus DIGANTI, bukan didampingi (ALT-DEF-034).
  for (const lama of ['kode: "persediaan.lihat"', 'kode: "persediaan.sesuaikan"', 'kode: "persediaan.opname"', 'kode: "persediaan.transfer"']) {
    if (izinSeed.includes(lama)) {
      throw new Error(
        `ASSERTION GAGAL: izin.seed.ts MASIH memuat kode koarse lama (${lama}). Empat kode lama DIGANTI 18 kode granular, bukan didampingi - dua nama untuk satu keputusan otorisasi yang sama adalah persis drift yang dicatat ALT-DEF-034. Penggantian aman karena belum ada satu baris PeranIzin pun (ALT-DEF-029).`,
      );
    }
  }
  // `persediaan.alokasi.otomatis` SENGAJA TIDAK ADA - aktornya pemicu internal
  // dan ia tidak punya endpoint sama sekali; pemilihan batch FEFO/FIFO adalah
  // ALGORITMA, bukan keputusan otorisasi yang dipegang siapa pun.
  if (izinSeed.includes('kode: "persediaan.alokasi.otomatis"')) {
    throw new Error(
      'ASSERTION GAGAL: izin.seed.ts TIDAK boleh memuat kode "persediaan.alokasi.otomatis" (ALT-PSD-011) - aktor requirement itu adalah pemicu internal (pemakaian resep/penjualan) dan ia tidak punya endpoint sama sekali. Pemilihan batch FEFO/FIFO adalah ALGORITMA, bukan keputusan otorisasi. Menjadikannya kode izin justru menyiratkan ada peran yang boleh memakai stok TANPA alokasi batch. Kelas yang sama persis dengan keamanan.qris.enkripsi dan resep.pemakaian.otomatis - lihat docs/keamanan/PERMISSION-MATRIX.md bagian 1a dan ALT-DEF-034.',
    );
  }

  // ===================================================================
  // Dokumen: state machine opname/transfer dan penutupan gap ALT-DEF-032
  // ===================================================================
  const stateMachines = readFileSync(STATE_MACHINES_PATH, "utf-8");
  for (const status of STATUS_OPNAME) {
    assertContains(
      stateMachines,
      status,
      `docs/arsitektur/STATE-MACHINES.md harus memuat status opname ${status} - tabel transisi wajib lengkap sesuai ADR-025 Keputusan 5, bukan hanya enum di schema.`,
    );
  }
  assertContains(
    stateMachines,
    "## 8. Transfer Stok",
    "docs/arsitektur/STATE-MACHINES.md harus punya bagian 8 (Transfer Stok) - state machine transfer sebelumnya tidak pernah ada sama sekali (ADR-024 Keputusan 4).",
  );
  // Nilai enum `RETUR` yang sudah dihapus TIDAK boleh masih dirujuk sebagai
  // sideEffect di BARIS TABEL TRANSISI. Dicek hanya atas baris tabel (diawali
  // "|"), BUKAN atas seluruh dokumen: bagian catatan perubahan di kepala
  // dokumen memang MENYEBUT nama lama untuk menjelaskan penggantiannya, dan
  // itu SAH. Assertion naif atas seluruh teks akan gagal PALSU karenanya -
  // kelas kesalahan yang sama seperti assertion negatif atas nama kolom yang
  // muncul di komentar schema.prisma (lihat getNamaField).
  const barisTabelStateMachine = stateMachines
    .split("\n")
    .filter((baris) => baris.trimStart().startsWith("|"))
    .join("\n");
  assertNotContains(
    barisTabelStateMachine,
    "MutasiStok.jenis = RETUR`",
    "Tidak boleh ada BARIS TABEL TRANSISI di docs/arsitektur/STATE-MACHINES.md yang merujuk `MutasiStok.jenis = RETUR` - nilai enum itu sudah TIDAK ADA setelah ADR-023 Keputusan 2. Membiarkan sideEffect menunjuk nilai enum yang tidak ada membuat dokumen state machine salah secara diam-diam. Penggantinya: RETUR_PENJUALAN.",
  );

  const apiContract = readFileSync(API_CONTRACT_PATH, "utf-8");
  // ALT-DEF-032 DITUTUP: endpoint transfer stok wajib ADA.
  for (const endpoint of [
    "/api/v1/transfer-stok",
    "/api/v1/transfer-stok/{id}/kirim",
    "/api/v1/transfer-stok/{id}/terima",
    "/api/v1/waste",
    "/api/v1/reservasi-stok",
    "/api/v1/persediaan/rekonsiliasi",
  ]) {
    assertContains(
      apiContract,
      endpoint,
      `docs/api/API-CONTRACT.md harus memuat endpoint \`${endpoint}\` (ALT-DEF-008; endpoint transfer secara khusus MENUTUP gap ALT-DEF-032).`,
    );
  }
  assertNotContains(
    apiContract,
    "| transfer stok | **belum ada endpoint**",
    "docs/api/API-CONTRACT.md bagian 17.1 TIDAK boleh lagi menyatakan transfer stok 'belum ada endpoint' - gap ALT-DEF-032 ditutup di batch ini dan barisnya wajib menunjuk endpoint nyata beserta requirement Idempotency-Key.",
  );
  // Endpoint opname LAMA yang menggabungkan kunci+setujui+posting harus hilang.
  assertNotContains(
    apiContract,
    "| POST | `/api/v1/stok-opname/{id}/selesaikan` |",
    "docs/api/API-CONTRACT.md TIDAK boleh lagi memuat `POST /stok-opname/{id}/selesaikan` - endpoint itu mengasumsikan opname punya SATU langkah yang sekaligus mengunci, menyetujui, dan memposting, persis penggabungan yang membuat ALT-PSD-017 (approval selisih signifikan) MUSTAHIL. Penggantinya: /kunci -> (/setujui) -> /posting.",
  );
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest.
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-008 (ledger stok/reservasi/transfer/opname) lulus.");
