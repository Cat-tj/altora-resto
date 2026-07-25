// Test struktur/arsitektur untuk ALT-DEF-018 (poin/saldo toko sebagai
// ledger), ALT-DEF-023 (consent/merge pelanggan), dan ALT-DEF-039 (Step 0
// audit correction-loop: program stempel/punch-card loyalty) - lihat ADR-027
// di docs/engineering/DECISION-LOG.md.
//
// KONTEKS: sama seperti architecture test batch-batch sebelumnya, tidak ada
// Postgres nyata di environment correction-loop ini (ALT-DEF-029). File ini
// memverifikasi bahwa model/enum/constraint yang DIKLAIM ADR-027 benar-benar
// ada di prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF paling penting di file ini (urut kepentingannya):
//   1. `Keanggotaan` dan `PoinRiwayat` benar-benar punya `tenantId` sekarang -
//      sebelumnya TIDAK ADA sama sekali (gap tenant-safety identik ALT-DEF-010).
//   2. `TierMembership` benar-benar HILANG, digantikan `TierKeanggotaan` -
//      dua nama untuk satu model yang sama akan menciptakan kebingungan
//      referensi yang sama seperti kelas defect JenisMutasiStok lama.
//   3. `PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` masing-masing punya
//      pola reversal `dibalikOlehId String? @unique` + self-relation - kolom
//      TUNGGAL (bukan list) adalah jaminan "satu baris dibalik paling banyak
//      sekali".
//   4. `LedgerSaldoToko.pelangganId` ada dan `keanggotaanId` TIDAK ada di
//      model itu - inilah bukti struktural keputusan ADR-027 Keputusan 3
//      (saldo toko digantung ke Pelanggan, bukan Keanggotaan).
//   5. `Pelanggan.status`/`saldoTokoCache` dan komentar CACHE eksplisit pada
//      `Keanggotaan.poinAktif`/`poinKumulatif` - aturan emas "cache, bukan
//      sumber kebenaran" harus benar-benar tertulis di schema, bukan hanya
//      di dokumen terpisah yang bisa menyimpang diam-diam.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini yang SUDAH dijalankan nyata: `tsc --noEmit` atas file ini dan
// `node --experimental-strip-types` untuk mengeksekusi assertion di bawah -
// lihat RELEASE-EVIDENCE.md untuk output aktual, termasuk mutation test yang
// membuktikan beberapa assertion kunci benar-benar GAGAL bila schema
// dikembalikan ke bentuk lama.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../../..");
const SCHEMA_PATH = resolve(ROOT, "prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(ROOT, "prisma/seed/izin.seed.ts");
const MASTER_CHECKLIST_PATH = resolve(ROOT, "docs/engineering/MASTER-CHECKLIST.md");
const DEFECT_LEDGER_PATH = resolve(ROOT, "docs/engineering/DEFECT-LEDGER.md");
const PERMISSION_MATRIX_PATH = resolve(ROOT, "docs/keamanan/PERMISSION-MATRIX.md");
const API_CONTRACT_PATH = resolve(ROOT, "docs/api/API-CONTRACT.md");

function readFile(path: string): string {
  return readFileSync(path, "utf-8");
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

function adaEnum(schema: string, enumName: string): boolean {
  return new RegExp(`(^|\\n)enum ${enumName} \\{`).test(schema);
}

function getNilaiEnum(schema: string, enumName: string): string[] {
  const body = getEnumBody(schema, enumName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

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
  const schema = readFile(SCHEMA_PATH);

  // ===================================================================
  // ADR-027 Keputusan 1: rename TierMembership -> TierKeanggotaan;
  // PoinRiwayat DIPERTAHANKAN namanya.
  // ===================================================================
  if (adaModel(schema, "TierMembership")) {
    throw new Error(
      "ASSERTION GAGAL: model `TierMembership` MASIH ADA - harus di-rename `TierKeanggotaan` (ADR-027 Keputusan 1) agar selaras dengan MASTER-CHECKLIST.md ALT-MBR-005 yang sudah memakai nama itu sejak awal. Dua nama untuk model yang sama menciptakan kebingungan referensi.",
    );
  }
  if (!adaModel(schema, "TierKeanggotaan")) {
    throw new Error("ASSERTION GAGAL: model `TierKeanggotaan` tidak ditemukan (rename dari `TierMembership`, ADR-027 Keputusan 1).");
  }
  // PoinRiwayat SENGAJA dipertahankan namanya - assertion POSITIF bahwa ia
  // masih ada (bukan di-rename ke LedgerPoin).
  if (!adaModel(schema, "PoinRiwayat")) {
    throw new Error(
      "ASSERTION GAGAL: model `PoinRiwayat` hilang. Nama ini SENGAJA dipertahankan (bukan di-rename `LedgerPoin`) karena MASTER-CHECKLIST.md konsisten memakai nama ini - lihat ADR-027 Keputusan 1 untuk rasional asimetri penamaan dengan model BARU LedgerStempel/LedgerSaldoToko.",
    );
  }
  if (adaModel(schema, "LedgerPoin")) {
    throw new Error(
      "ASSERTION GAGAL: model `LedgerPoin` ADA - ADR-027 Keputusan 1 memutuskan TIDAK me-rename PoinRiwayat, seharusnya tidak ada model kedua dengan nama ini berdampingan.",
    );
  }

  // ===================================================================
  // ADR-027: Keanggotaan/PoinRiwayat mendapat tenantId (sebelumnya TIDAK
  // ADA sama sekali) + composite-FK per ADR-013.
  // ===================================================================
  const keanggotaanBody = getModelBody(schema, "Keanggotaan");
  wajibPunyaKolom(
    schema,
    "Keanggotaan",
    ["tenantId", "pelangganId", "tierKeanggotaanId", "poinAktif", "poinKumulatif", "status", "bergabungPada"],
    "ALT-DEF-018/ADR-027",
  );
  assertContains(
    keanggotaanBody,
    "pelanggan Pelanggan @relation(fields: [tenantId, pelangganId], references: [tenantId, id])",
    "Keanggotaan.pelanggan harus composite-FK (tenantId, pelangganId) -> Pelanggan(tenantId, id) - ADR-013.",
  );
  assertContains(
    keanggotaanBody,
    "tierKeanggotaan TierKeanggotaan @relation(fields: [tenantId, tierKeanggotaanId], references: [tenantId, id])",
    "Keanggotaan.tierKeanggotaan harus composite-FK (tenantId, tierKeanggotaanId) -> TierKeanggotaan(tenantId, id) - ADR-013.",
  );
  const atributKeanggotaan = getAtributBlok(schema, "Keanggotaan").join("\n");
  assertContains(
    atributKeanggotaan,
    "@@unique([tenantId, id])",
    "Keanggotaan harus punya @@unique([tenantId, id]) - PoinRiwayat/LedgerStempel bergantung padanya untuk composite-FK.",
  );
  // Cache terdokumentasi: poinAktif/poinKumulatif WAJIB punya komentar CACHE.
  assertContains(
    keanggotaanBody,
    "CACHE",
    "Keanggotaan.poinAktif/poinKumulatif harus punya komentar eksplisit menyatakan CACHE (bukan sumber kebenaran) - aturan emas ADR-027, pola sama StokBahan/ADR-023.",
  );

  const poinBody = getModelBody(schema, "PoinRiwayat");
  wajibPunyaKolom(
    schema,
    "PoinRiwayat",
    ["tenantId", "keanggotaanId", "pesananId", "jenis", "jumlah", "kadaluarsaPada", "dibalikOlehId", "dicatatOlehId", "catatan", "createdAt"],
    "ALT-DEF-018/ADR-027 Keputusan 2",
  );
  assertContains(
    poinBody,
    "keanggotaan Keanggotaan @relation(fields: [tenantId, keanggotaanId], references: [tenantId, id])",
    "PoinRiwayat.keanggotaan harus composite-FK (tenantId, keanggotaanId) -> Keanggotaan(tenantId, id).",
  );
  assertContains(
    poinBody,
    "dibalikOlehId String? @unique",
    "PoinRiwayat.dibalikOlehId harus String? @unique - kolom TUNGGAL + unique = satu baris dibalik paling banyak sekali, pola identik MutasiStok.dibalikOlehId (ADR-023 Keputusan 5).",
  );
  assertContains(
    poinBody,
    'dibalikOleh PoinRiwayat? @relation("PoinRiwayatPembalik", fields: [dibalikOlehId], references: [id])',
    "PoinRiwayat.dibalikOleh harus self-relation bernama PoinRiwayatPembalik.",
  );
  assertContains(
    poinBody,
    'pembalikDari PoinRiwayat? @relation("PoinRiwayatPembalik")',
    "PoinRiwayat.pembalikDari adalah sisi lain self-relation PoinRiwayatPembalik.",
  );
  assertNotContains(
    poinBody,
    "dibalikOleh PoinRiwayat[]",
    "PoinRiwayat.dibalikOleh TIDAK boleh list - itu mengizinkan satu baris dibalik berkali-kali.",
  );
  assertContains(poinBody, "kadaluarsaPada DateTime?", "PoinRiwayat.kadaluarsaPada harus nullable (ALT-MBR-009).");
  assertContains(poinBody, "dicatatOlehId String?", "PoinRiwayat.dicatatOlehId harus nullable - baris sistem tidak punya aktor manusia.");

  wajibNilaiEnumPersis(
    schema,
    "JenisPoinRiwayat",
    ["PEROLEHAN", "PENUKARAN", "PENYESUAIAN", "PEMBALIKAN", "KADALUARSA"],
    "ADR-027 Keputusan 2 - PEMBALIKAN ditambahkan",
  );

  // ===================================================================
  // ALT-DEF-039 (Step 0 audit): HadiahStempel + LedgerStempel (program
  // stempel/punch-card, sebelumnya hilang total).
  // ===================================================================
  if (!adaModel(schema, "HadiahStempel")) {
    throw new Error("ASSERTION GAGAL: model `HadiahStempel` tidak ditemukan (ALT-DEF-039/ALT-MBR-014).");
  }
  if (!adaModel(schema, "LedgerStempel")) {
    throw new Error("ASSERTION GAGAL: model `LedgerStempel` tidak ditemukan (ALT-DEF-039/ALT-MBR-018).");
  }
  wajibPunyaKolom(
    schema,
    "HadiahStempel",
    ["id", "tenantId", "jumlahStempelDibutuhkan", "deskripsi", "itemGratisId", "aktif", "createdAt"],
    "ALT-MBR-014",
  );
  const hadiahBody = getModelBody(schema, "HadiahStempel");
  assertContains(hadiahBody, "itemGratisId String?", "HadiahStempel.itemGratisId harus nullable - hadiah boleh berupa deskripsi bebas.");
  assertContains(
    hadiahBody,
    "itemGratis ItemMenu? @relation(fields: [tenantId, itemGratisId], references: [tenantId, id])",
    "HadiahStempel.itemGratis harus composite-FK (tenantId, itemGratisId) -> ItemMenu(tenantId, id).",
  );
  assertContains(
    getAtributBlok(schema, "HadiahStempel").join("\n"),
    "@@unique([tenantId, id])",
    "HadiahStempel harus punya @@unique([tenantId, id]) - LedgerStempel bergantung padanya untuk composite-FK.",
  );

  const stempelBody = getModelBody(schema, "LedgerStempel");
  wajibPunyaKolom(
    schema,
    "LedgerStempel",
    ["id", "tenantId", "keanggotaanId", "jenis", "jumlah", "pesananId", "hadiahStempelId", "dibalikOlehId", "dicatatOlehId", "catatan", "createdAt"],
    "ALT-DEF-039/ALT-MBR-018",
  );
  assertContains(
    stempelBody,
    "dibalikOlehId String? @unique",
    "LedgerStempel.dibalikOlehId harus String? @unique - pola reversal identik PoinRiwayat/MutasiStok.",
  );
  assertContains(
    stempelBody,
    'dibalikOleh LedgerStempel? @relation("LedgerStempelPembalik", fields: [dibalikOlehId], references: [id])',
    "LedgerStempel.dibalikOleh harus self-relation bernama LedgerStempelPembalik.",
  );
  assertContains(
    stempelBody,
    'pembalikDari LedgerStempel? @relation("LedgerStempelPembalik")',
    "LedgerStempel.pembalikDari adalah sisi lain self-relation LedgerStempelPembalik.",
  );
  assertContains(
    stempelBody,
    "keanggotaan Keanggotaan @relation(fields: [tenantId, keanggotaanId], references: [tenantId, id])",
    "LedgerStempel.keanggotaan harus composite-FK (tenantId, keanggotaanId) -> Keanggotaan(tenantId, id).",
  );
  assertContains(
    stempelBody,
    "hadiahStempel HadiahStempel? @relation(fields: [tenantId, hadiahStempelId], references: [tenantId, id])",
    "LedgerStempel.hadiahStempel harus composite-FK (tenantId, hadiahStempelId) -> HadiahStempel(tenantId, id).",
  );
  wajibNilaiEnumPersis(
    schema,
    "JenisLedgerStempel",
    ["PEROLEHAN", "PENUKARAN", "PEMBALIKAN", "PENYESUAIAN"],
    "ADR-027 Keputusan 5",
  );
  // Assertion NEGATIF penting: TIDAK ada nilai KADALUARSA pada stempel -
  // keputusan sadar (belum ada dasar produk), bukan kelalaian.
  const nilaiJenisStempel = getNilaiEnum(schema, "JenisLedgerStempel");
  if (nilaiJenisStempel.includes("KADALUARSA")) {
    throw new Error(
      "ASSERTION GAGAL: JenisLedgerStempel TIDAK boleh punya nilai KADALUARSA pada batch ini - master spec belum menetapkan kebijakan kedaluwarsa stempel (beda dari poin, ALT-MBR-009); menambahkannya adalah keputusan produk tanpa dasar (ADR-027 Keputusan 5).",
    );
  }

  // ===================================================================
  // ALT-DEF-018: LedgerSaldoToko digantung ke Pelanggan, BUKAN Keanggotaan.
  // ===================================================================
  if (!adaModel(schema, "LedgerSaldoToko")) {
    throw new Error("ASSERTION GAGAL: model `LedgerSaldoToko` tidak ditemukan (ALT-DEF-018/ALT-MBR-011).");
  }
  const saldoTokoBody = getModelBody(schema, "LedgerSaldoToko");
  const fieldSaldoToko = getNamaField(schema, "LedgerSaldoToko");
  wajibPunyaKolom(
    schema,
    "LedgerSaldoToko",
    ["id", "tenantId", "pelangganId", "jenis", "jumlah", "pesananId", "pembayaranId", "dibalikOlehId", "dicatatOlehId", "catatan", "createdAt"],
    "ALT-DEF-018/ALT-MBR-011/012",
  );
  // Assertion NEGATIF paling penting untuk keputusan ADR-027 Keputusan 3.
  if (fieldSaldoToko.includes("keanggotaanId")) {
    throw new Error(
      "ASSERTION GAGAL: LedgerSaldoToko TIDAK boleh punya kolom `keanggotaanId` - saldo toko digantung LANGSUNG ke Pelanggan (ADR-027 Keputusan 3), bukan Keanggotaan, karena pelanggan bisa punya saldo toko (mis. refund) tanpa pernah mendaftar program loyalitas/tier.",
    );
  }
  assertContains(
    saldoTokoBody,
    "pelanggan Pelanggan @relation(fields: [tenantId, pelangganId], references: [tenantId, id])",
    "LedgerSaldoToko.pelanggan harus composite-FK (tenantId, pelangganId) -> Pelanggan(tenantId, id).",
  );
  assertContains(
    saldoTokoBody,
    "pembayaran Pembayaran? @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
    "LedgerSaldoToko.pembayaran harus composite-FK nullable (tenantId, pembayaranId) -> Pembayaran(tenantId, id) - menutup integrasi metode SALDO_TOKO.",
  );
  assertContains(
    saldoTokoBody,
    "dibalikOlehId String? @unique",
    "LedgerSaldoToko.dibalikOlehId harus String? @unique - pola reversal identik ledger lain.",
  );
  wajibNilaiEnumPersis(
    schema,
    "JenisLedgerSaldoToko",
    ["PENAMBAHAN", "PEMAKAIAN", "REFUND", "PENYESUAIAN", "PEMBALIKAN"],
    "ALT-MBR-011/012",
  );

  // ===================================================================
  // ALT-DEF-018/023: Pelanggan.status/saldoTokoCache (cache terdokumentasi).
  // ===================================================================
  const pelangganBody = getModelBody(schema, "Pelanggan");
  wajibPunyaKolom(schema, "Pelanggan", ["status", "saldoTokoCache"], "ADR-027 Keputusan 3/ALT-DEF-023");
  assertContains(pelangganBody, "status StatusPelanggan @default(AKTIF)", "Pelanggan.status harus @default(AKTIF).");
  assertContains(
    pelangganBody,
    "saldoTokoCache Int",
    "Pelanggan.saldoTokoCache harus Int - CACHE terdokumentasi dari SUM(LedgerSaldoToko.jumlah).",
  );
  wajibNilaiEnumPersis(schema, "StatusPelanggan", ["AKTIF", "DIGABUNGKAN"], "ALT-DEF-023/ALT-MBR-003");

  // ===================================================================
  // ALT-DEF-023: PersetujuanPelanggan (consent) dan RiwayatGabungPelanggan
  // (merge history) - profil korban TIDAK dihapus.
  // ===================================================================
  if (!adaModel(schema, "PersetujuanPelanggan")) {
    throw new Error("ASSERTION GAGAL: model `PersetujuanPelanggan` tidak ditemukan (ALT-DEF-023/ALT-MBR-004).");
  }
  // Assertion NEGATIF: nama lama yang disebut rencana korektif awal TIDAK ada.
  if (adaModel(schema, "ConsentPelanggan")) {
    throw new Error(
      "ASSERTION GAGAL: model `ConsentPelanggan` ADA - ADR-027 Keputusan 6 memutuskan nama `PersetujuanPelanggan` (konsisten Bahasa Indonesia dengan model lain di domain ini), seharusnya tidak ada model kedua.",
    );
  }
  wajibNilaiEnumPersis(
    schema,
    "JenisPersetujuanPelanggan",
    ["PEMASARAN", "DATA_PRIBADI", "WHATSAPP_NOTIFIKASI"],
    "ALT-DEF-023/ALT-MBR-004",
  );

  if (!adaModel(schema, "RiwayatGabungPelanggan")) {
    throw new Error("ASSERTION GAGAL: model `RiwayatGabungPelanggan` tidak ditemukan (ALT-DEF-023/ALT-MBR-003).");
  }
  const gabungBody = getModelBody(schema, "RiwayatGabungPelanggan");
  wajibPunyaKolom(
    schema,
    "RiwayatGabungPelanggan",
    ["id", "tenantId", "pelangganUtamaId", "pelangganGabunganId", "digabungOlehId", "alasan", "createdAt"],
    "ALT-DEF-023/ALT-MBR-003",
  );
  assertContains(
    gabungBody,
    'pelangganUtama Pelanggan @relation("RiwayatGabungUtama", fields: [tenantId, pelangganUtamaId], references: [tenantId, id])',
    "RiwayatGabungPelanggan.pelangganUtama harus composite-FK bernama relasi RiwayatGabungUtama.",
  );
  assertContains(
    gabungBody,
    'pelangganGabungan Pelanggan @relation("RiwayatGabungGabungan", fields: [tenantId, pelangganGabunganId], references: [tenantId, id])',
    "RiwayatGabungPelanggan.pelangganGabungan harus composite-FK bernama relasi RiwayatGabungGabungan.",
  );
  assertContains(
    getAtributBlok(schema, "RiwayatGabungPelanggan").join("\n"),
    "@@unique([pelangganGabunganId])",
    "RiwayatGabungPelanggan harus punya @@unique([pelangganGabunganId]) - satu profil hanya bisa jadi korban SEKALI.",
  );

  // ===================================================================
  // Prisma client shape sanity: pastikan model-model ini benar-benar
  // ter-generate (dicek di prisma-client-shape.test.ts secara umum, di sini
  // cukup cek nama model konsisten schema<->dokumen).
  // ===================================================================

  // ===================================================================
  // Permission: kode LAMA anggota.* harus HILANG dari seed; kode BARU yang
  // direferensikan MASTER-CHECKLIST.md harus ADA (ALT-DEF-040).
  // ===================================================================
  const izinSeed = readFile(IZIN_SEED_PATH);
  for (const lama of ['"anggota.lihat"', '"anggota.kelola"', '"anggota.tukar-poin"']) {
    if (izinSeed.includes(`kode: ${lama}`)) {
      throw new Error(
        `ASSERTION GAGAL: prisma/seed/izin.seed.ts MASIH memuat kode lama ${lama} - kode ini dangling (tidak pernah direferensikan MASTER-CHECKLIST.md), seharusnya sudah diganti kode granular pelanggan.*/keanggotaan.* (ALT-DEF-040).`,
      );
    }
  }
  const KODE_WAJIB_ADA = [
    "pelanggan.kelola",
    "pelanggan.duplikat.lihat",
    "pelanggan.merge",
    "pelanggan.consent.kelola",
    "keanggotaan.tier.kelola",
    "keanggotaan.daftar",
    "keanggotaan.poin.lihat",
    "keanggotaan.saldo.rekonsiliasi",
    "keanggotaan.poin.kedaluwarsa",
    "keanggotaan.poin.tukar",
    "keanggotaan.saldo-toko.lihat",
    "keanggotaan.anti-fraud",
    "keanggotaan.stempel.kelola",
    "keanggotaan.stempel.lihat",
    "keanggotaan.stempel.tukar",
    "keanggotaan.stempel.balik",
  ];
  for (const kode of KODE_WAJIB_ADA) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin \`${kode}\` (direferensikan MASTER-CHECKLIST.md domain ALT-MBR, ALT-DEF-040).`,
    );
  }

  // ===================================================================
  // MASTER-CHECKLIST.md: ALT-MBR-014 s.d. ALT-MBR-019 harus ada (Step 0 audit).
  // ===================================================================
  const masterChecklist = readFile(MASTER_CHECKLIST_PATH);
  for (const id of ["ALT-MBR-014", "ALT-MBR-015", "ALT-MBR-016", "ALT-MBR-017", "ALT-MBR-018", "ALT-MBR-019"]) {
    assertContains(
      masterChecklist,
      `| ${id} |`,
      `docs/engineering/MASTER-CHECKLIST.md harus memuat baris ${id} (Step 0 audit correction-loop, program stempel - ALT-DEF-039).`,
    );
  }
  assertContains(
    masterChecklist,
    "| ALT-MBR | Pelanggan & Keanggotaan | 19 |",
    "docs/engineering/MASTER-CHECKLIST.md tabel ringkasan domain harus menyatakan 19 requirement untuk ALT-MBR (13 lama + 6 baru stempel).",
  );

  // ===================================================================
  // DEFECT-LEDGER.md: ALT-DEF-039 dan ALT-DEF-040 harus tercatat.
  // ===================================================================
  const defectLedger = readFile(DEFECT_LEDGER_PATH);
  assertContains(defectLedger, "| ALT-DEF-039 |", "DEFECT-LEDGER.md harus memuat baris ALT-DEF-039 (Step 0 audit, program stempel).");
  assertContains(defectLedger, "| ALT-DEF-040 |", "DEFECT-LEDGER.md harus memuat baris ALT-DEF-040 (mismatch kode izin anggota.* vs pelanggan.*/keanggotaan.*).");

  // ===================================================================
  // PERMISSION-MATRIX.md dan API-CONTRACT.md: kode/endpoint baru ada.
  // ===================================================================
  const permissionMatrix = readFile(PERMISSION_MATRIX_PATH);
  assertContains(
    permissionMatrix,
    "keanggotaan.stempel.kelola",
    "docs/keamanan/PERMISSION-MATRIX.md harus memuat kode keanggotaan.stempel.kelola (ALT-DEF-039).",
  );
  assertNotContains(
    permissionMatrix,
    "`anggota.lihat`, `anggota.kelola`, `anggota.tukar-poin`",
    "docs/keamanan/PERMISSION-MATRIX.md TIDAK boleh lagi memuat daftar kode lama anggota.lihat/kelola/tukar-poin sebagai isi baris domain anggota (ALT-DEF-040).",
  );
  const apiContract = readFile(API_CONTRACT_PATH);
  for (const endpoint of [
    "/api/v1/hadiah-stempel",
    "/api/v1/keanggotaan/{id}/tukar-stempel",
    "/api/v1/ledger-stempel/{id}/balik",
    "/api/v1/pelanggan/{id}/saldo-toko",
    "/api/v1/pelanggan/merge",
    "/api/v1/pelanggan/{id}/consent",
  ]) {
    assertContains(
      apiContract,
      endpoint,
      `docs/api/API-CONTRACT.md harus memuat endpoint \`${endpoint}\` (ALT-DEF-018/023/039).`,
    );
  }
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest.
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-018/ALT-DEF-023/ALT-DEF-039 (ledger keanggotaan) lulus.");
