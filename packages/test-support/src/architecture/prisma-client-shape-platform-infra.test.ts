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
  eventType: "order.submitted",
  payload: { pesananId: "01J...PESANAN" },
  status: "TERTUNDA",
  availableAt: new Date(),
} satisfies Prisma.DomainOutboxEventUncheckedCreateInput;

const contohNotification = {
  id: "01J...NOTIFIKASI",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  // ADR-033: penggunaId (FK langsung ke Pengguna) diganti keanggotaanTenantId
  // (composite-FK ke KeanggotaanTenant).
  keanggotaanTenantId: "01J...KEANGGOTAAN_TENANT",
  tipe: "PESANAN_SIAP",
  judul: "Pesanan siap disajikan",
  pesan: "Pesanan #123 sudah siap diambil dari dapur.",
  data: { orderId: "01J...PESANAN" },
} satisfies Prisma.NotificationUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipePlatformInfra = {
  contohIdempotencyKey,
  contohDomainOutboxEvent,
  contohNotification,
};
