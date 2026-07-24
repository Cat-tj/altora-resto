// Test struktur/arsitektur untuk ALT-DEF-001 dan ALT-DEF-002.
//
// KONTEKS: Tidak ada Postgres di environment koreksi ini (lihat ALT-DEF-029 di
// docs/engineering/DEFECT-LEDGER.md), sehingga integration test nyata
// terhadap database (test isolasi tenant sungguhan, lihat ALT-DEF-027) belum
// bisa dijalankan pada pass ini. Sebagai gantinya, file ini adalah
// "architecture test" berbasis pembacaan teks skema Prisma - memverifikasi
// bahwa constraint yang jadi jaring pengaman level-database (composite unique
// yang menopang composite-FK tenant-outlet, dan unique constraint
// normalisasi Izin/Peran) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR: `vitest` belum terinstal
// (tidak ada pnpm/node_modules workspace di environment ini). Yang SUDAH
// dijalankan secara nyata adalah `tsc --noEmit` atas file ini (lihat
// RELEASE-EVIDENCE.md untuk output aktual) untuk memverifikasi assertion di
// bawah type-check bersih dan `node --experimental-strip-types` sebagai
// pengganti sementara untuk menjalankan isi assertion tanpa vitest.

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

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // --- ALT-DEF-001: composite-FK tenant-outlet ---
  assertContains(
    schema,
    "@@unique([tenantId, id])",
    "Outlet dan KeanggotaanTenant harus punya @@unique([tenantId, id]) tambahan " +
      "agar KeanggotaanOutlet bisa memakai composite FK (ADR-011).",
  );
  assertContains(
    schema,
    '@relation("KeanggotaanOutletOutlet", fields: [tenantId, outletId], references: [tenantId, id])',
    "KeanggotaanOutlet.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    schema,
    '@relation("KeanggotaanOutletTenantScoped", fields: [tenantId, keanggotaanTenantId], references: [tenantId, id])',
    "KeanggotaanOutlet.keanggotaanTenantTenantScoped harus berupa composite FK " +
      "(tenantId, keanggotaanTenantId) -> KeanggotaanTenant(tenantId, id).",
  );
  assertContains(
    schema,
    "@@unique([keanggotaanTenantId, outletId])",
    "KeanggotaanOutlet harus unik per (keanggotaanTenantId, outletId).",
  );
  assertContains(
    schema,
    "@@unique([penggunaId, tenantId])",
    "KeanggotaanTenant harus unik per (penggunaId, tenantId).",
  );

  // Pengguna harus TIDAK lagi punya tenantId langsung maupun pinHash lama.
  const penggunaModelMatch = schema.match(/model Pengguna \{[\s\S]*?\n\}/);
  if (!penggunaModelMatch) {
    throw new Error("ASSERTION GAGAL: model Pengguna tidak ditemukan di schema.prisma");
  }
  const penggunaModelBody = penggunaModelMatch[0];
  assertNotContains(
    penggunaModelBody,
    "tenantId",
    "model Pengguna tidak boleh lagi punya field tenantId langsung (ALT-DEF-001) - " +
      "harus lewat KeanggotaanTenant.",
  );
  assertNotContains(
    penggunaModelBody,
    "pinHash",
    "model Pengguna tidak boleh lagi punya pinHash (PIN global lama dihapus, " +
      "lihat ALT-DEF-013 untuk PIN-per-outlet di batch berikutnya).",
  );
  assertContains(
    penggunaModelBody,
    "email                  String         @unique",
    "Pengguna.email harus unik GLOBAL (bukan @@unique([tenantId, email]) lagi).",
  );

  // --- ALT-DEF-002: normalisasi Peran/Izin ---
  const peranModelMatch = schema.match(/model Peran \{[\s\S]*?\n\}/);
  if (!peranModelMatch) {
    throw new Error("ASSERTION GAGAL: model Peran tidak ditemukan di schema.prisma");
  }
  assertNotContains(
    peranModelMatch[0],
    "permissions Json",
    "model Peran tidak boleh lagi punya field permissions Json (ALT-DEF-002).",
  );
  assertContains(schema, "model Izin {", "Model Izin (katalog kode izin) harus ada.");
  assertContains(schema, "model PeranIzin {", "Model PeranIzin (many-to-many Peran x Izin) harus ada.");
  assertContains(schema, "model KeanggotaanPeran {", "Model KeanggotaanPeran harus ada (menggantikan PenggunaPeran).");
  assertContains(schema, "model BatasIzin {", "Model BatasIzin harus ada.");
  assertContains(schema, "model IzinSementara {", "Model IzinSementara harus ada.");
  assertContains(schema, "model PermintaanPersetujuan {", "Model PermintaanPersetujuan harus ada.");
  assertNotContains(schema, "model PenggunaPeran {", "Model PenggunaPeran lama harus sudah dihapus.");
  assertNotContains(schema, "model PenggunaOutlet {", "Model PenggunaOutlet lama harus sudah dihapus.");
  assertContains(schema, "@@unique([kode])", "Izin.kode harus unik global.");
  assertContains(schema, "@@unique([peranId, izinId])", "PeranIzin harus unik per (peranId, izinId).");
  assertContains(
    schema,
    "@@unique([keanggotaanTenantId, peranId])",
    "KeanggotaanPeran harus unik per (keanggotaanTenantId, peranId).",
  );
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.");
