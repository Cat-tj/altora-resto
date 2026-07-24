// Test struktur/arsitektur untuk ALT-DEF-003 dan ALT-DEF-013.
//
// KONTEKS: Sama seperti `keanggotaan-outlet-constraints.test.ts` (batch
// ALT-DEF-001/002) dan `tenant-outlet-composite-constraints.test.ts` (batch
// ALT-DEF-010/014), tidak ada Postgres nyata di environment correction-loop
// ini (lihat ALT-DEF-029), sehingga integration test sungguhan terhadap
// database belum bisa dijalankan pada pass ini. File ini adalah
// "architecture test" berbasis pembacaan teks skema Prisma - memverifikasi
// bahwa model/field pengerasan autentikasi/sesi/PIN yang diklaim di ADR-014/
// ADR-015 (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR sama seperti kedua file
// architecture test sebelumnya (tidak ada pnpm/node_modules workspace nyata
// di environment ini). Yang SUDAH dijalankan secara nyata adalah
// `tsc --noEmit` atas file ini dan `node --experimental-strip-types` untuk
// mengeksekusi assertion di bawah - lihat RELEASE-EVIDENCE.md untuk output
// aktual.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../../prisma/schema/schema.prisma");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

function assertContains(haystack: string, needle: string, pesan: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nTidak ditemukan: ${JSON.stringify(needle)}`);
  }
}

function assertNotContains(haystack: string, needle: string, pesan: string): void {
  if (haystack.includes(needle)) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nSeharusnya tidak ada tapi ditemukan: ${JSON.stringify(needle)}`);
  }
}

function getModelBody(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));
  if (!match) {
    throw new Error(`ASSERTION GAGAL: model ${modelName} tidak ditemukan di schema.prisma`);
  }
  return match[0];
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // --- ALT-DEF-003: lockout eksplisit di Pengguna ---
  const penggunaBody = getModelBody(schema, "Pengguna");
  assertContains(
    penggunaBody,
    "terkunciSampai",
    "Pengguna harus punya field terkunciSampai (lockout sementara, ADR-014).",
  );
  assertContains(
    penggunaBody,
    "jumlahPercobaanGagal",
    "Pengguna harus punya field jumlahPercobaanGagal (ADR-014).",
  );
  assertContains(
    penggunaBody,
    "passwordHash",
    "Pengguna harus tetap punya passwordHash (dari batch ALT-DEF-001, tidak boleh regresi).",
  );

  // --- ALT-DEF-003: TokenResetKataSandi ---
  assertContains(schema, "model TokenResetKataSandi {", "Model TokenResetKataSandi harus ada.");
  const tokenResetBody = getModelBody(schema, "TokenResetKataSandi");
  assertContains(
    tokenResetBody,
    "tokenHash      String    @unique",
    "TokenResetKataSandi.tokenHash harus unik (never simpan token mentah).",
  );
  assertNotContains(
    tokenResetBody,
    "tokenMentah",
    "TokenResetKataSandi tidak boleh menyimpan token mentah dalam bentuk apa pun.",
  );
  assertContains(
    tokenResetBody,
    "digunakanPada  DateTime?",
    "TokenResetKataSandi.digunakanPada harus nullable (conditional uniqueness ditangani service-layer, ADR-014).",
  );
  assertContains(
    tokenResetBody,
    "penggunaId     String",
    "TokenResetKataSandi harus di-FK ke Pengguna lewat penggunaId.",
  );

  // --- ALT-DEF-003: PercobaanLogin - append-only, TIDAK di-FK ke Pengguna ---
  assertContains(schema, "model PercobaanLogin {", "Model PercobaanLogin harus ada.");
  const percobaanLoginBody = getModelBody(schema, "PercobaanLogin");
  assertContains(
    percobaanLoginBody,
    "email     String",
    "PercobaanLogin.email harus teks bebas (bukan FK) - mencatat percobaan meski email tak terdaftar.",
  );
  assertContains(
    percobaanLoginBody,
    "berhasil  Boolean",
    "PercobaanLogin harus punya field berhasil.",
  );
  assertNotContains(
    percobaanLoginBody,
    "Pengguna",
    "PercobaanLogin TIDAK boleh di-FK ke Pengguna (harus tetap mencatat percobaan email tak terdaftar, ADR-014).",
  );

  // --- ALT-DEF-003: Sesi diperkeras ---
  const sesiBody = getModelBody(schema, "Sesi");
  assertContains(
    sesiBody,
    "tokenHash           String    @unique",
    "Sesi.tokenHash harus unik (lookup sesi lewat hash token, bukan id, ADR-014).",
  );
  assertContains(
    sesiBody,
    "keanggotaanTenantId String?",
    "Sesi.keanggotaanTenantId harus nullable (konteks tenant aktif, ADR-014).",
  );
  assertContains(
    sesiBody,
    "terakhirAktifPada   DateTime  @default(now())",
    "Sesi.terakhirAktifPada harus ada (deteksi sesi idle, ADR-014).",
  );
  assertContains(
    sesiBody,
    "dicabutPada         DateTime?",
    "Sesi.dicabutPada harus tetap ada (regresi dari skema sebelumnya).",
  );
  assertContains(
    sesiBody,
    "alasanPencabutan    String?",
    "Sesi.alasanPencabutan harus ada (ADR-014).",
  );
  assertContains(sesiBody, "ipHash              String?", "Sesi.ipHash harus ada (ADR-014).");
  assertContains(sesiBody, "userAgent           String?", "Sesi.userAgent harus ada (ADR-014).");

  // --- ALT-DEF-013: PinOutlet - composite-FK ganda seperti KeanggotaanOutlet ---
  assertContains(schema, "model PinOutlet {", "Model PinOutlet harus ada.");
  const pinOutletBody = getModelBody(schema, "PinOutlet");
  assertContains(
    pinOutletBody,
    'outlet                        Outlet            @relation("PinOutletOutlet", fields: [tenantId, outletId], references: [tenantId, id])',
    "PinOutlet.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    pinOutletBody,
    'keanggotaanTenantTenantScoped KeanggotaanTenant @relation("PinOutletTenantScoped", fields: [tenantId, keanggotaanTenantId], references: [tenantId, id])',
    "PinOutlet.keanggotaanTenantTenantScoped harus berupa composite FK (tenantId, keanggotaanTenantId) -> KeanggotaanTenant(tenantId, id).",
  );
  assertContains(
    pinOutletBody,
    "@@unique([keanggotaanTenantId, outletId, perangkatId])",
    "PinOutlet harus unik per (keanggotaanTenantId, outletId, perangkatId).",
  );
  assertContains(
    pinOutletBody,
    "pinHash             String",
    "PinOutlet.pinHash harus ada (PIN tidak pernah disimpan plaintext).",
  );

  // Pengguna tidak boleh regresi pinHash global lama (verifikasi ulang ALT-DEF-001/013).
  assertNotContains(
    penggunaBody,
    "pinHash",
    "model Pengguna tidak boleh punya pinHash lagi - PIN sekarang di PinOutlet per outlet (ALT-DEF-013).",
  );

  // --- ALT-DEF-013: RiwayatPerangkat - append-only, FK ke Pengguna DAN Perangkat ---
  assertContains(schema, "model RiwayatPerangkat {", "Model RiwayatPerangkat harus ada.");
  const riwayatPerangkatBody = getModelBody(schema, "RiwayatPerangkat");
  assertContains(
    riwayatPerangkatBody,
    "aksi        AksiRiwayatPerangkat",
    "RiwayatPerangkat.aksi harus memakai enum AksiRiwayatPerangkat.",
  );
  assertContains(
    riwayatPerangkatBody,
    "perangkat Perangkat @relation(fields: [perangkatId], references: [id])",
    "RiwayatPerangkat.perangkat harus di-FK ke Perangkat (beda dengan PinOutlet.perangkatId yang sengaja bukan FK, ADR-015).",
  );
  assertContains(schema, "enum AksiRiwayatPerangkat {", "Enum AksiRiwayatPerangkat harus ada.");
  assertContains(schema, "DIDAFTARKAN", "AksiRiwayatPerangkat harus punya varian DIDAFTARKAN.");
  assertContains(schema, "DIGUNAKAN", "AksiRiwayatPerangkat harus punya varian DIGUNAKAN.");
  assertContains(schema, "DICABUT", "AksiRiwayatPerangkat harus punya varian DICABUT.");

  // --- Regresi: KeanggotaanOutlet (ALT-DEF-001/010) harus tetap utuh ---
  assertContains(
    schema,
    '@relation("KeanggotaanOutletOutlet", fields: [tenantId, outletId], references: [tenantId, id])',
    "KeanggotaanOutlet.outlet harus tetap berupa composite FK (regresi ALT-DEF-001).",
  );
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-003/ALT-DEF-013 lulus.");
