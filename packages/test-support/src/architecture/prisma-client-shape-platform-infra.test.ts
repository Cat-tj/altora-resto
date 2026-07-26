// Test compile-time untuk ALT-DEF-017: memverifikasi bahwa `@prisma/client`
// yang di-generate dari prisma/schema/schema.prisma benar-benar mengekspos
// tipe input `Unchecked...CreateInput` yang sesuai untuk model-model baru
// pada batch infrastruktur idempotency/outbox/notifikasi - bukan hanya bahwa
// schema.prisma valid secara teks (lihat
// idempotency-outbox-notification-constraints.test.ts untuk assertion
// berbasis teks).
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian pass ALT-DEF-017
// untuk output `prisma generate` dan `tsc --noEmit` aktual.

import type { Prisma } from "@prisma/client";

const contohIdempotencyKey = {
  id: "01J...IDEMPOTENCY",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  key: "checkout-01J9Z8Q5F5J1K3ZP9E1QK3F0YV",
  scope: "checkout",
  requestHash: "sha256:...",
  status: "MEMPROSES",
  expiresAt: new Date(),
} satisfies Prisma.IdempotencyKeyUncheckedCreateInput;

const contohDomainOutboxEvent = {
  id: "01J...OUTBOX",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  aggregateType: "Pesanan",
  aggregateId: "01J...PESANAN",
  // ADR-039: versi Pesanan SAAT event ini ditulis.
  aggregateVersion: 1,
  eventType: "order.submitted",
  // ADR-039: correlationId wajib (root operasi), deduplicationKey wajib
  // (consumer-side idempotency), occurredAt wajib (waktu bisnis nyata).
  correlationId: "01J...CORRELATION",
  deduplicationKey: "01J...DEDUP",
  occurredAt: new Date(),
  payload: { pesananId: "01J...PESANAN" },
  status: "TERTUNDA",
  availableAt: new Date(),
} satisfies Prisma.DomainOutboxEventUncheckedCreateInput;

const contohNotification = {
  id: "01J...NOTIFIKASI",
  tenantId: "01J...TENANT",
  // ADR-040: lingkupTarget PENGGUNA_SPESIFIK -> outletId+peranId WAJIB null
  // (lihat matriks kombinasi di komentar model Notification/ADR-040), hanya
  // keanggotaanTenantId yang diisi.
  outletId: null,
  peranId: null,
  lingkupTarget: "PENGGUNA_SPESIFIK",
  // ADR-033: penggunaId (FK langsung ke Pengguna) diganti keanggotaanTenantId
  // (composite-FK ke KeanggotaanTenant).
  keanggotaanTenantId: "01J...KEANGGOTAAN_TENANT",
  tipe: "PESANAN_SIAP",
  judul: "Pesanan siap disajikan",
  pesan: "Pesanan #123 sudah siap diambil dari dapur.",
  data: { orderId: "01J...PESANAN" },
} satisfies Prisma.NotificationUncheckedCreateInput;

// ADR-040: fixture tambahan membuktikan kombinasi OUTLET/PERAN_DI_TENANT/
// PERAN_DI_OUTLET/SELURUH_TENANT juga type-check terhadap tipe Prisma yang
// digenerate - bukan cuma PENGGUNA_SPESIFIK.
const contohNotificationBroadcastOutlet = {
  id: "01J...NOTIFIKASI_OUTLET",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  keanggotaanTenantId: null,
  peranId: null,
  lingkupTarget: "OUTLET",
  tipe: "STOK_KRITIS",
  judul: "Stok kritis",
  pesan: "Beberapa bahan di outlet ini sudah di bawah ambang minimum.",
} satisfies Prisma.NotificationUncheckedCreateInput;

const contohNotificationBroadcastPeranDiOutlet = {
  id: "01J...NOTIFIKASI_PERAN_OUTLET",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  keanggotaanTenantId: null,
  peranId: "01J...PERAN",
  lingkupTarget: "PERAN_DI_OUTLET",
  tipe: "PERSETUJUAN_DIBUTUHKAN",
  judul: "Persetujuan dibutuhkan",
  pesan: "Ada permintaan yang menunggu persetujuan supervisor outlet ini.",
} satisfies Prisma.NotificationUncheckedCreateInput;

const contohNotificationSeluruhTenant = {
  id: "01J...NOTIFIKASI_TENANT",
  tenantId: "01J...TENANT",
  outletId: null,
  keanggotaanTenantId: null,
  peranId: null,
  lingkupTarget: "SELURUH_TENANT",
  tipe: "PESANAN_BERUBAH",
  judul: "Pengumuman tenant",
  pesan: "Pengumuman untuk seluruh anggota tenant.",
} satisfies Prisma.NotificationUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipePlatformInfra = {
  contohIdempotencyKey,
  contohDomainOutboxEvent,
  contohNotification,
  contohNotificationBroadcastOutlet,
  contohNotificationBroadcastPeranDiOutlet,
  contohNotificationSeluruhTenant,
};
