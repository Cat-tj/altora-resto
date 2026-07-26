// Test struktur/arsitektur untuk ALT-DEF-015 (konfigurasi QRIS statis per
// outlet: payload terenkripsi, fingerprint, audit perubahan, dan constraint
// "satu konfigurasi AKTIF per outlet").
//
// KONTEKS: Sama seperti architecture test batch-batch sebelumnya, tidak ada
// Postgres nyata di environment correction-loop ini (ALT-DEF-029). File ini
// memverifikasi bahwa model/enum/constraint yang diklaim ADR-021
// (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF yang paling penting di file ini:
//   1. `KonfigurasiQris` TIDAK boleh punya kolom bernama `payload` polos -
//      hanya `payloadTerenkripsi`. Kolom plaintext yang tertinggal akan
//      langsung membatalkan ALT-QRS-005/ALT-SEC-007 tanpa terlihat.
//   2. `KonfigurasiQris` TIDAK boleh punya `@@unique([tenantId, outletId,
//      status])` - constraint itu SALAH (melarang banyak baris NONAKTIF, yang
//      justru harus boleh menumpuk sebagai riwayat) dan hanya TAMPAK
//      menegakkan aturan satu-AKTIF-per-outlet. Aturan sebenarnya adalah
//      partial unique index Postgres di file SQL manual (ADR-021 Keputusan 3).
//
// Test ini JUGA memverifikasi keberadaan file SQL partial index tersebut -
// karena kalau file itu tidak ada, tidak ada apa pun yang akan menegakkan
// aturan satu-AKTIF-per-outlet, dan ADR-021 Keputusan 3 hanya jadi klaim.
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
const MIGRASI_MANUAL_PATH = resolve(ROOT, "prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql");

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

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ADR-021 Keputusan 1: model KonfigurasiQris
  // ===================================================================
  const konfigBody = getModelBody(schema, "KonfigurasiQris");
  const fieldKonfig = getNamaField(schema, "KonfigurasiQris");

  const KOLOM_WAJIB = [
    "id",
    "tenantId",
    "outletId",
    "payloadTerenkripsi",
    "fingerprint",
    "namaMerchant",
    "kotaMerchant",
    "status",
    "dibuatOlehId",
    "diverifikasiOlehId",
    "diverifikasiPada",
    "createdAt",
    "updatedAt",
  ];
  for (const kolom of KOLOM_WAJIB) {
    if (!fieldKonfig.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: KonfigurasiQris harus punya kolom ${kolom} (ALT-QRS-001 s.d. ALT-QRS-005, ADR-021 Keputusan 1). Field aktual: [${fieldKonfig.join(", ")}]`,
      );
    }
  }

  // Assertion NEGATIF: tidak boleh ada kolom payload PLAINTEXT yang tertinggal.
  for (const kolomTerlarang of ["payload", "payloadMentah", "payloadPlaintext", "payloadQris"]) {
    if (fieldKonfig.includes(kolomTerlarang)) {
      throw new Error(
        `ASSERTION GAGAL: KonfigurasiQris TIDAK boleh punya kolom "${kolomTerlarang}" - payload QRIS mentah TIDAK PERNAH boleh ditulis ke kolom mana pun; hanya "payloadTerenkripsi" (AES-256-GCM level-aplikasi, kunci dari env/KMS). Kolom plaintext yang tertinggal membatalkan ALT-QRS-005/ALT-SEC-007 tanpa terlihat (ADR-021 Keputusan 2).`,
      );
    }
  }
  assertContains(
    konfigBody,
    "payloadTerenkripsi String",
    "KonfigurasiQris.payloadTerenkripsi harus bertipe String (ciphertext base64: nonce || tag || ciphertext) - ADR-021 Keputusan 2.",
  );
  assertContains(
    konfigBody,
    "fingerprint String",
    "KonfigurasiQris.fingerprint harus ada (SHA-256 atas payload PLAINTEXT) - dipakai deteksi perubahan/dedup TANPA mendekripsi apa pun (ADR-021 Keputusan 2).",
  );
  // Nullable-nya diverifikasiOlehId/diverifikasiPada penting: konfigurasi DRAF
  // belum pernah diverifikasi siapa pun.
  assertContains(
    konfigBody,
    "diverifikasiOlehId String?",
    "KonfigurasiQris.diverifikasiOlehId harus nullable - konfigurasi berstatus DRAF/MENUNGGU_VERIFIKASI belum punya verifikator.",
  );
  assertContains(
    konfigBody,
    "diverifikasiPada DateTime?",
    "KonfigurasiQris.diverifikasiPada harus nullable, konsisten dengan diverifikasiOlehId.",
  );

  // Composite-FK ke Outlet mengikuti ADR-013.
  assertContains(
    konfigBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "KonfigurasiQris.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id) mengikuti ALT-DEF-010/ADR-013.",
  );
  assertContains(
    konfigBody,
    "@@unique([tenantId, id])",
    "KonfigurasiQris harus punya @@unique([tenantId, id]) - RiwayatKonfigurasiQris bergantung padanya untuk composite-FK.",
  );
  assertContains(
    konfigBody,
    "@@unique([tenantId, outletId, fingerprint])",
    "KonfigurasiQris harus punya @@unique([tenantId, outletId, fingerprint]) - payload yang sama persis tidak didaftarkan dua kali di outlet yang sama, tanpa perlu mendekripsi apa pun.",
  );

  // ===================================================================
  // ADR-021 Keputusan 3: constraint satu-AKTIF-per-outlet TIDAK dipalsukan
  // ===================================================================
  // Assertion NEGATIF: `@@unique([tenantId, outletId, status])` akan MELARANG
  // outlet punya lebih dari satu konfigurasi NONAKTIF (riwayat lama) - itu
  // salah, dan ia hanya TAMPAK menegakkan aturan satu-AKTIF.
  assertNotContains(
    konfigBody,
    "@@unique([tenantId, outletId, status])",
    "KonfigurasiQris TIDAK boleh punya @@unique([tenantId, outletId, status]) - constraint itu tidak menegakkan 'satu AKTIF per outlet' dan justru SALAH (melarang banyak baris NONAKTIF, padahal riwayat konfigurasi lama harus boleh menumpuk, ADR-006). Aturan sebenarnya adalah partial unique index Postgres, lihat ADR-021 Keputusan 3.",
  );

  // File SQL partial index HARUS ada - kalau tidak, tidak ada apa pun yang
  // akan menegakkan aturan satu-AKTIF-per-outlet dan ADR-021 Keputusan 3
  // hanya menjadi klaim di dokumen.
  if (!existsSync(MIGRASI_MANUAL_PATH)) {
    throw new Error(
      `ASSERTION GAGAL: file SQL partial unique index tidak ditemukan di ${MIGRASI_MANUAL_PATH}. Tanpa file ini, aturan "satu KonfigurasiQris AKTIF per outlet" (ALT-QRS-001) tidak punya penegak apa pun - DSL Prisma tidak dapat mengekspresikan filtered index (ADR-021 Keputusan 3).`,
    );
  }
  const sqlMigrasi = readFileSync(MIGRASI_MANUAL_PATH, "utf-8");
  const sqlNormal = normalisasiSpasiHorizontal(sqlMigrasi).replace(/\n/g, " ");
  assertContains(
    sqlNormal,
    "CREATE UNIQUE INDEX",
    "File migrasi manual harus benar-benar berisi CREATE UNIQUE INDEX, bukan sekadar komentar penjelasan.",
  );
  assertContains(
    sqlNormal,
    "ON konfigurasi_qris",
    "Partial index harus dibuat atas tabel konfigurasi_qris (nama tabel hasil @@map di schema.prisma).",
  );
  assertContains(
    sqlNormal,
    "WHERE status = 'AKTIF'",
    "Index harus PARTIAL (klausa WHERE status = 'AKTIF') - inilah satu-satunya bentuk yang benar-benar menegakkan 'satu AKTIF per outlet' tanpa melarang banyak baris NONAKTIF.",
  );

  // ===================================================================
  // Enum StatusKonfigurasiQris & AksiKonfigurasiQris
  // ===================================================================
  const STATUS_KONFIG = ["DRAF", "MENUNGGU_VERIFIKASI", "AKTIF", "NONAKTIF"];
  const nilaiStatusKonfig = getNilaiEnum(schema, "StatusKonfigurasiQris");
  assertEqual(
    nilaiStatusKonfig.length,
    4,
    `StatusKonfigurasiQris harus punya PERSIS 4 nilai. Aktual: [${nilaiStatusKonfig.join(", ")}]`,
  );
  for (const nilai of STATUS_KONFIG) {
    if (!nilaiStatusKonfig.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusKonfigurasiQris harus memuat nilai ${nilai} (ADR-021 Keputusan 1).`);
    }
  }
  assertContains(
    konfigBody,
    "status StatusKonfigurasiQris @default(DRAF)",
    "KonfigurasiQris.status harus @default(DRAF) - konfigurasi baru tidak boleh langsung AKTIF sebelum divalidasi/diverifikasi.",
  );

  const AKSI_KONFIG = ["DIBUAT", "DIUBAH", "DIAKTIFKAN", "DINONAKTIFKAN", "DIVERIFIKASI"];
  const nilaiAksi = getNilaiEnum(schema, "AksiKonfigurasiQris");
  assertEqual(
    nilaiAksi.length,
    5,
    `AksiKonfigurasiQris harus punya PERSIS 5 nilai (ALT-QRS-008). Aktual: [${nilaiAksi.join(", ")}]`,
  );
  for (const nilai of AKSI_KONFIG) {
    if (!nilaiAksi.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: AksiKonfigurasiQris harus memuat nilai ${nilai} (ALT-QRS-008).`);
    }
  }

  // ===================================================================
  // ADR-021 Keputusan 1: RiwayatKonfigurasiQris (append-only audit)
  // ===================================================================
  const riwayatBody = getModelBody(schema, "RiwayatKonfigurasiQris");
  const fieldRiwayat = getNamaField(schema, "RiwayatKonfigurasiQris");
  for (const kolom of [
    "id",
    "tenantId",
    "outletId",
    "konfigurasiQrisId",
    "aksi",
    "sebelum",
    "sesudah",
    "dilakukanOlehId",
    "createdAt",
  ]) {
    if (!fieldRiwayat.includes(kolom)) {
      throw new Error(
        `ASSERTION GAGAL: RiwayatKonfigurasiQris harus punya kolom ${kolom} (ALT-QRS-008). Field aktual: [${fieldRiwayat.join(", ")}]`,
      );
    }
  }
  assertContains(
    riwayatBody,
    "aksi AksiKonfigurasiQris",
    "RiwayatKonfigurasiQris.aksi harus bertipe enum AksiKonfigurasiQris, bukan String bebas (pola yang sama dengan RiwayatStatusTiketDapur, ALT-DEF-006).",
  );
  assertContains(riwayatBody, "sebelum Json?", "RiwayatKonfigurasiQris.sebelum harus Json? (nullable - aksi DIBUAT tidak punya keadaan sebelumnya).");
  assertContains(riwayatBody, "sesudah Json?", "RiwayatKonfigurasiQris.sesudah harus Json? (nullable).");
  // Append-only: TIDAK boleh punya updatedAt - kalau ada, ia mengundang update
  // in-place atas baris audit, yang persis dilarang ADR-006.
  if (fieldRiwayat.includes("updatedAt")) {
    throw new Error(
      "ASSERTION GAGAL: RiwayatKonfigurasiQris TIDAK boleh punya kolom updatedAt - tabel ini append-only (ADR-006); adanya updatedAt mengundang update in-place atas baris audit.",
    );
  }
  assertContains(
    riwayatBody,
    "konfigurasiQris KonfigurasiQris @relation(fields: [tenantId, konfigurasiQrisId], references: [tenantId, id])",
    "RiwayatKonfigurasiQris.konfigurasiQris harus composite-FK (tenantId, konfigurasiQrisId) -> KonfigurasiQris(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    riwayatBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "RiwayatKonfigurasiQris.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(konfigBody, "riwayat RiwayatKonfigurasiQris[]", "KonfigurasiQris harus punya relasi list ke RiwayatKonfigurasiQris.");

  // ===================================================================
  // Back-relation Tenant/Outlet/Pengguna
  // ===================================================================
  const tenantBody = getModelBody(schema, "Tenant");
  for (const relasi of ["konfigurasiQris KonfigurasiQris[]", "riwayatKonfigurasiQris RiwayatKonfigurasiQris[]", "qrisKonfirmasiManual QrisKonfirmasiManual[]"]) {
    assertContains(tenantBody, relasi, `Tenant harus punya back-relation "${relasi}" untuk model QRIS ALT-DEF-015.`);
  }
  const outletBody = getModelBody(schema, "Outlet");
  for (const relasi of ["konfigurasiQris KonfigurasiQris[]", "riwayatKonfigurasiQris RiwayatKonfigurasiQris[]"]) {
    assertContains(outletBody, relasi, `Outlet harus punya back-relation "${relasi}" (konfigurasi QRIS bersifat per-outlet, ALT-QRS-001).`);
  }
  // ADR-033: aktor konfigurasi QRIS divalidasi OUTLET-LEVEL (KeanggotaanOutlet) -
  // konfigurasi QRIS SELALU per-outlet (ALT-QRS-001), jadi back-relation-nya
  // pindah dari Pengguna ke KeanggotaanOutlet.
  const keanggotaanOutletBody = getModelBody(schema, "KeanggotaanOutlet");
  for (const relasi of [
    'konfigurasiQrisDibuat      KonfigurasiQris[]        @relation("KonfigurasiQrisDibuatOleh")',
    'konfigurasiQrisDiverifikasi KonfigurasiQris[]       @relation("KonfigurasiQrisDiverifikasiOleh")',
    'riwayatKonfigurasiQrisDilakukan RiwayatKonfigurasiQris[] @relation("RiwayatKonfigurasiQrisDilakukanOleh")',
  ]) {
    assertContains(keanggotaanOutletBody, relasi, `KeanggotaanOutlet harus punya back-relation "${relasi}" (aktor konfigurasi QRIS, ADR-033).`);
  }

  // ===================================================================
  // QrisKonfirmasiManual: tenant-safety + tetap 1:1 ke Pembayaran
  // ===================================================================
  const konfirmasiBody = getModelBody(schema, "QrisKonfirmasiManual");
  const fieldKonfirmasi = getNamaField(schema, "QrisKonfirmasiManual");
  if (!fieldKonfirmasi.includes("tenantId")) {
    throw new Error(
      "ASSERTION GAGAL: QrisKonfirmasiManual harus punya kolom tenantId sendiri (ADR-019 Keputusan 8) - sebelumnya hanya punya pembayaranId tunggal tanpa jaminan tenant-safety.",
    );
  }
  assertContains(
    konfirmasiBody,
    "pembayaran Pembayaran @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
    "QrisKonfirmasiManual.pembayaran harus composite-FK (tenantId, pembayaranId) -> Pembayaran(tenantId, id) di bawah model alokasi baru.",
  );
  assertContains(
    konfirmasiBody,
    "diverifikasiOlehId String",
    "QrisKonfirmasiManual.diverifikasiOlehId harus WAJIB (non-nullable) - baris ini adalah bukti bahwa SEORANG KASIR memverifikasi dana masuk; tanpa aktor, tidak ada yang diverifikasi (ADR-020 Keputusan 2).",
  );

  // ===================================================================
  // Larangan integrasi (ALT-QRS-010, ADR-021 Keputusan 4)
  // ===================================================================
  // Tidak boleh ada model/kolom apa pun di seluruh skema yang menyiratkan
  // webhook/gateway/e-wallet. Dicek atas SELURUH schema, bukan satu model -
  // sebuah integrasi bisa masuk lewat model baru mana pun.
  const schemaTanpaKomentar = schema
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("//"))
    .join("\n");
  for (const jejak of ["PaymentGateway", "paymentGateway", "webhookUrl", "WebhookPembayaran", "EwalletAkun", "midtrans", "xendit"]) {
    if (schemaTanpaKomentar.includes(jejak)) {
      throw new Error(
        `ASSERTION GAGAL: schema.prisma memuat "${jejak}" - integrasi payment gateway/webhook/e-wallet DILARANG eksplisit oleh ALT-QRS-010 dan ADR-021 Keputusan 4. Ini batasan arsitektur permanen, bukan "belum diimplementasikan".`,
      );
    }
  }

  // ===================================================================
  // Katalog izin: kode qris.* (ALT-DEF-015)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  for (const kode of ["qris.konfigurasi.kelola", "qris.validasi", "qris.generate", "qris.audit.lihat"]) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" (ALT-DEF-015; MASTER-CHECKLIST.md ALT-QRS-001 s.d. ALT-QRS-008 sudah mereferensikannya).`,
    );
  }
  // Nama lama `qris.kelola` harus benar-benar hilang - dua kode untuk satu
  // izin yang sama adalah defect ALT-DEF-034 yang diperbaiki di batch ini.
  if (izinSeed.includes('kode: "qris.kelola"')) {
    throw new Error(
      'ASSERTION GAGAL: izin.seed.ts masih memuat kode lama "qris.kelola" - ia sudah diganti nama menjadi "qris.konfigurasi.kelola" (nama yang dipakai MASTER-CHECKLIST.md ALT-QRS-001/002/005). Dua kode untuk satu izin yang sama adalah defect ALT-DEF-034.',
    );
  }
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest.
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-015 (QRIS) lulus.");
