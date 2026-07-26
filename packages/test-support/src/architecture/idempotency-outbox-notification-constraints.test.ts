// Test struktur/arsitektur untuk ALT-DEF-017.
//
// KONTEKS: Sama seperti ketiga architecture test sebelumnya
// (keanggotaan-outlet-constraints/tenant-outlet-composite-constraints/
// sesi-auth-pin-constraints), tidak ada Postgres nyata di environment
// correction-loop ini (lihat ALT-DEF-029), sehingga integration test
// sungguhan terhadap database belum bisa dijalankan pada pass ini. File ini
// adalah "architecture test" berbasis pembacaan teks skema Prisma -
// memverifikasi bahwa model infrastruktur idempotency/outbox/notifikasi yang
// diklaim di ADR-016 (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR sama seperti architecture
// test sebelumnya (tidak ada pnpm/node_modules workspace nyata di
// environment ini). Yang SUDAH dijalankan secara nyata adalah
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

  // --- IdempotencyKey (ALT-PLT-018) ---
  assertContains(schema, "model IdempotencyKey {", "Model IdempotencyKey harus ada.");
  const idempotencyKeyBody = getModelBody(schema, "IdempotencyKey");
  assertContains(
    idempotencyKeyBody,
    "tenantId       String",
    "IdempotencyKey harus punya tenantId.",
  );
  assertContains(
    idempotencyKeyBody,
    "outletId       String?",
    "IdempotencyKey.outletId harus nullable (tenant-level vs outlet-level, ADR-016).",
  );
  assertContains(
    idempotencyKeyBody,
    "key            String",
    "IdempotencyKey harus punya field key (idempotency key dari klien).",
  );
  assertContains(
    idempotencyKeyBody,
    "scope          String",
    "IdempotencyKey harus punya field scope (identifikasi command).",
  );
  assertContains(
    idempotencyKeyBody,
    "requestHash    String",
    "IdempotencyKey harus punya requestHash (deteksi key dipakai ulang dengan payload berbeda).",
  );
  assertContains(
    idempotencyKeyBody,
    "status         StatusIdempotencyKey @default(MEMPROSES)",
    "IdempotencyKey.status harus enum StatusIdempotencyKey dengan default MEMPROSES.",
  );
  assertContains(
    idempotencyKeyBody,
    "tenant Tenant @relation(fields: [tenantId], references: [id])",
    "IdempotencyKey.tenant harus berupa FK biasa ke Tenant (BUKAN composite-FK ganda - " +
      "lihat ADR-016 Keputusan 2: tidak ada relasi tenant-owned kedua yang independen untuk dijamin).",
  );
  assertContains(
    idempotencyKeyBody,
    "@@unique([tenantId, scope, key])",
    "IdempotencyKey harus unik per (tenantId, scope, key).",
  );
  assertContains(schema, "enum StatusIdempotencyKey {", "Enum StatusIdempotencyKey harus ada.");
  assertContains(schema, "MEMPROSES", "StatusIdempotencyKey harus punya varian MEMPROSES.");
  assertContains(schema, "SELESAI", "StatusIdempotencyKey harus punya varian SELESAI.");

  // --- DomainOutboxEvent (ALT-PLT-019) ---
  assertContains(schema, "model DomainOutboxEvent {", "Model DomainOutboxEvent harus ada.");
  const outboxBody = getModelBody(schema, "DomainOutboxEvent");
  assertContains(
    outboxBody,
    "aggregateType String",
    "DomainOutboxEvent harus punya aggregateType.",
  );
  assertContains(
    outboxBody,
    "aggregateId   String",
    "DomainOutboxEvent harus punya aggregateId.",
  );
  assertContains(
    outboxBody,
    "eventType     String",
    "DomainOutboxEvent harus punya eventType.",
  );
  assertContains(
    outboxBody,
    "payload       Json",
    "DomainOutboxEvent harus punya payload Json.",
  );
  assertContains(
    outboxBody,
    "status        StatusOutboxEvent @default(TERTUNDA)",
    "DomainOutboxEvent.status harus enum StatusOutboxEvent dengan default TERTUNDA.",
  );
  assertContains(
    outboxBody,
    "attemptCount  Int               @default(0)",
    "DomainOutboxEvent harus punya attemptCount default 0.",
  );
  assertContains(
    outboxBody,
    "availableAt   DateTime",
    "DomainOutboxEvent harus punya availableAt (retry backoff scheduling).",
  );
  assertContains(
    outboxBody,
    "@@index([status, availableAt])",
    "DomainOutboxEvent harus punya index (status, availableAt) untuk polling/dispatch relay worker.",
  );
  assertContains(schema, "enum StatusOutboxEvent {", "Enum StatusOutboxEvent harus ada.");
  for (const varian of ["TERTUNDA", "DIPROSES", "TERKIRIM", "GAGAL"]) {
    assertContains(schema, varian, `StatusOutboxEvent harus punya varian ${varian}.`);
  }
  // Daftar eventType lengkap harus terdokumentasi di komentar model (ADR-016).
  for (const eventType of [
    "order.submitted",
    "order.accepted",
    "order.rejected",
    "order.updated",
    "order.cancelled",
    "order.sent_to_kitchen",
    "kitchen.started",
    "kitchen.ready",
    "order.served",
    "payment.awaiting_confirmation",
    "payment.confirmed",
    "stock.low",
    "stock.adjusted",
    "shift.opened",
    "shift.closed",
    "attendance.created",
  ]) {
    assertContains(
      schema,
      eventType,
      `Daftar eventType DomainOutboxEvent harus mendokumentasikan "${eventType}" (master spec).`,
    );
  }

  // --- Notification (ALT-PLT-020) ---
  assertContains(schema, "model Notification {", "Model Notification harus ada.");
  const notificationBody = getModelBody(schema, "Notification");
  // ADR-033: penggunaId (FK langsung ke Pengguna) diganti keanggotaanTenantId
  // (composite-FK ke KeanggotaanTenant(tenantId, id)) - tetap nullable untuk
  // broadcast (ADR-016 Keputusan 5). Redesain targeting lebih dalam
  // (keanggotaanOutletId/peranId) TETAP belum dikerjakan - lihat ADR-033.
  assertContains(
    notificationBody,
    "keanggotaanTenantId String?",
    "Notification.keanggotaanTenantId harus nullable (broadcast ke role/outlet, ADR-016 Keputusan 5).",
  );
  assertContains(
    notificationBody,
    "tipe                TipeNotifikasi",
    "Notification.tipe harus enum TipeNotifikasi.",
  );
  assertContains(
    notificationBody,
    "judul               String",
    "Notification harus punya judul.",
  );
  assertContains(
    notificationBody,
    "pesan               String",
    "Notification harus punya pesan.",
  );
  assertContains(
    notificationBody,
    "data                Json?",
    "Notification.data harus nullable Json (payload deep-link).",
  );
  assertContains(
    notificationBody,
    "dibacaPada          DateTime?",
    "Notification.dibacaPada harus nullable DateTime.",
  );
  // ADR-033: FK opsional sekarang composite ke KeanggotaanTenant, bukan lagi
  // langsung ke Pengguna (identitas global) - lihat catatan cakupan di atas
  // model Notification.
  assertContains(
    notificationBody,
    'keanggotaanTenant KeanggotaanTenant? @relation("NotificationKeanggotaan", fields: [tenantId, keanggotaanTenantId], references: [tenantId, id])',
    "Notification.keanggotaanTenant harus composite-FK opsional ke KeanggotaanTenant (ADR-033).",
  );
  assertContains(
    notificationBody,
    "@@index([keanggotaanTenantId, dibacaPada])",
    "Notification harus punya index (keanggotaanTenantId, dibacaPada) untuk query unread.",
  );
  assertContains(schema, "enum TipeNotifikasi {", "Enum TipeNotifikasi harus ada.");
  for (const tipe of [
    "PESANAN_QR_MASUK",
    "PESANAN_BERUBAH",
    "PESANAN_SIAP",
    "PEMBAYARAN_MENUNGGU_KONFIRMASI",
    "STOK_KRITIS",
    "SELISIH_KAS",
    "PERSETUJUAN_DIBUTUHKAN",
    "KARYAWAN_TERLAMBAT",
  ]) {
    assertContains(schema, tipe, `TipeNotifikasi harus punya varian ${tipe}.`);
  }

  // --- Tidak boleh ada model WhatsApp/SMS/push eksternal (ADR-016 Keputusan 4) ---
  assertNotContains(
    schema,
    "model WhatsApp",
    "Tidak boleh ada model integrasi WhatsApp - notifikasi batch ini internal Altora saja (ADR-016).",
  );
  assertNotContains(
    schema,
    "model SmsGateway",
    "Tidak boleh ada model integrasi SMS gateway - notifikasi batch ini internal Altora saja (ADR-016).",
  );

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
console.log("OK: seluruh assertion arsitektur ALT-DEF-017 lulus.");
