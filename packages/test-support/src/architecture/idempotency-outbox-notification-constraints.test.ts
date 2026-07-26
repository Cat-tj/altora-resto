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
    "aggregateType    String",
    "DomainOutboxEvent harus punya aggregateType.",
  );
  assertContains(
    outboxBody,
    "aggregateId      String",
    "DomainOutboxEvent harus punya aggregateId.",
  );
  // ADR-039: aggregateVersion - versi aggregate root SAAT event ditulis.
  assertContains(
    outboxBody,
    "aggregateVersion Int",
    "DomainOutboxEvent harus punya aggregateVersion (versi aggregate saat event ditulis, ADR-039).",
  );
  assertContains(
    outboxBody,
    "eventType        String",
    "DomainOutboxEvent harus punya eventType.",
  );
  // ADR-039: eventVersion (skema payload per eventType) vs schemaVersion
  // (skema envelope keseluruhan) - dua kolom berbeda, lihat dokumentasi di
  // schema.prisma dan DECISION-LOG.md ADR-039.
  assertContains(
    outboxBody,
    "eventVersion     Int               @default(1)",
    "DomainOutboxEvent harus punya eventVersion default 1 (versi skema payload per eventType, ADR-039).",
  );
  assertContains(
    outboxBody,
    'schemaVersion    String            @default("1.0")',
    'DomainOutboxEvent harus punya schemaVersion default "1.0" (versi envelope outbox, ADR-039).',
  );
  // ADR-039: correlationId (grup satu operasi akar) vs causationId (rantai
  // kausal langsung) - dua kolom berbeda.
  assertContains(
    outboxBody,
    "correlationId    String",
    "DomainOutboxEvent harus punya correlationId (ADR-039).",
  );
  assertContains(
    outboxBody,
    "causationId      String?",
    "DomainOutboxEvent.causationId harus nullable (event akar tidak disebabkan event lain, ADR-039).",
  );
  assertContains(
    outboxBody,
    "deduplicationKey String",
    "DomainOutboxEvent harus punya deduplicationKey (consumer idempotency, ADR-039).",
  );
  assertContains(
    outboxBody,
    "payload          Json",
    "DomainOutboxEvent harus punya payload Json.",
  );
  assertContains(
    outboxBody,
    "status           StatusOutboxEvent @default(TERTUNDA)",
    "DomainOutboxEvent.status harus enum StatusOutboxEvent dengan default TERTUNDA.",
  );
  assertContains(
    outboxBody,
    "attemptCount     Int               @default(0)",
    "DomainOutboxEvent harus punya attemptCount default 0.",
  );
  assertContains(
    outboxBody,
    "availableAt      DateTime",
    "DomainOutboxEvent harus punya availableAt (retry backoff scheduling).",
  );
  // ADR-039: occurredAt (waktu bisnis nyata) vs createdAt (waktu tulis baris).
  assertContains(
    outboxBody,
    "occurredAt       DateTime",
    "DomainOutboxEvent harus punya occurredAt (waktu peristiwa bisnis nyata, ADR-039).",
  );
  // ADR-039: publishedAt (sukses publish, sekali isi) vs processedAt
  // (setiap upaya, sukses maupun gagal) - dua kolom berbeda, tidak redundan.
  assertContains(
    outboxBody,
    "publishedAt      DateTime?",
    "DomainOutboxEvent harus punya publishedAt (kapan relay worker sukses publish, ADR-039).",
  );
  assertContains(
    outboxBody,
    "@@unique([aggregateType, aggregateId, aggregateVersion, eventType])",
    "DomainOutboxEvent harus punya unique constraint write-side dedup #1 (aggregate+versi+eventType, ADR-039).",
  );
  assertContains(
    outboxBody,
    "@@unique([deduplicationKey])",
    "DomainOutboxEvent harus punya unique constraint write-side dedup #2 (deduplicationKey, ADR-039, terpisah dari dedup #1).",
  );
  assertContains(
    outboxBody,
    "@@index([status, availableAt])",
    "DomainOutboxEvent harus punya index (status, availableAt) untuk polling/dispatch relay worker.",
  );
  assertContains(schema, "enum StatusOutboxEvent {", "Enum StatusOutboxEvent harus ada.");
  for (const varian of ["TERTUNDA", "DIPROSES", "TERKIRIM", "GAGAL", "DEAD_LETTER"]) {
    assertContains(schema, varian, `StatusOutboxEvent harus punya varian ${varian}.`);
  }
  // Daftar eventType lengkap harus terdokumentasi di komentar model (ADR-016,
  // diperluas ADR-039/ALT-DEF-042).
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
    "order.split",
    "order.reopened",
    "order.merged",
    "payment.refunded",
    "membership.point_redeemed",
    "membership.stamp_redeemed",
    "promo.applied",
    "promo.repeat_applied",
  ]) {
    assertContains(
      schema,
      eventType,
      `Daftar eventType DomainOutboxEvent harus mendokumentasikan "${eventType}" (master spec + ALT-DEF-042).`,
    );
  }

  // --- Notification (ALT-PLT-020) ---
  assertContains(schema, "model Notification {", "Model Notification harus ada.");
  const notificationBody = getModelBody(schema, "Notification");
  // ADR-033: penggunaId (FK langsung ke Pengguna) diganti keanggotaanTenantId
  // (composite-FK ke KeanggotaanTenant(tenantId, id)) - tetap nullable karena
  // hanya wajib diisi saat lingkupTarget = PENGGUNA_SPESIFIK (ADR-040 -
  // redesain targeting yang menutup deferral ADR-033 Keputusan 4).
  assertContains(
    notificationBody,
    "keanggotaanTenantId String?",
    "Notification.keanggotaanTenantId harus nullable (hanya wajib untuk lingkupTarget PENGGUNA_SPESIFIK, ADR-040).",
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

  // --- ADR-040: redesain targeting (peranId, lingkupTarget, outlet FK) ---
  assertContains(
    notificationBody,
    "peranId             String?",
    "Notification.peranId harus ada dan nullable (ADR-040).",
  );
  assertContains(
    notificationBody,
    "lingkupTarget       LingkupTargetNotifikasi",
    "Notification.lingkupTarget harus ada dan wajib diisi (ADR-040) - bukan nullable, supaya niat targeting selalu eksplisit.",
  );
  assertContains(
    notificationBody,
    'outlet            Outlet?            @relation("NotificationOutlet", fields: [tenantId, outletId], references: [tenantId, id])',
    "Notification.outlet harus composite-FK opsional ke Outlet (ADR-040) - outletId dipromosikan dari informational-only menjadi FK tervalidasi.",
  );
  assertContains(
    notificationBody,
    'peran             Peran?             @relation("NotificationPeran", fields: [tenantId, peranId], references: [tenantId, id])',
    "Notification.peran harus composite-FK opsional ke Peran (ADR-040).",
  );
  assertContains(
    notificationBody,
    "@@index([tenantId, outletId, peranId])",
    "Notification harus punya index (tenantId, outletId, peranId) untuk mendukung predikat query pembaca tenant/outlet/peran-scoped (ADR-040).",
  );
  assertContains(schema, "enum LingkupTargetNotifikasi {", "Enum LingkupTargetNotifikasi harus ada (ADR-040).");
  for (const lingkup of [
    "PENGGUNA_SPESIFIK",
    "OUTLET",
    "PERAN_DI_TENANT",
    "PERAN_DI_OUTLET",
    "SELURUH_TENANT",
  ]) {
    assertContains(schema, lingkup, `LingkupTargetNotifikasi harus punya varian ${lingkup}.`);
  }
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
