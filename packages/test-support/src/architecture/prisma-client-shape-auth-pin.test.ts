// Test compile-time untuk ALT-DEF-003/ALT-DEF-013: memverifikasi bahwa
// `@prisma/client` yang di-generate dari prisma/schema/schema.prisma benar-benar
// mengekspos tipe input `Unchecked...CreateInput` yang sesuai untuk model-model
// baru pada batch pengerasan autentikasi/sesi/PIN - bukan hanya bahwa
// schema.prisma valid secara teks (lihat sesi-auth-pin-constraints.test.ts
// untuk assertion berbasis teks).
//
// Sama seperti prisma-client-shape-tenant-outlet.test.ts (ALT-DEF-010/014):
// PinOutlet dipakai dalam bentuk UncheckedCreateInput karena tenantId di
// model ini dipakai ganda sebagai bagian composite-FK (dua relasi sekaligus
// memakai tenantId yang sama, pola ADR-011/ADR-013/ADR-015) - Prisma tidak
// mengekspos `tenantId` sebagai scalar biasa di bentuk "connect" (CreateInput
// biasa), hanya di bentuk "Unchecked". Ini bukti konkret bahwa composite-FK
// ganda PinOutlet benar-benar ditegakkan oleh tipe yang di-generate, sama
// seperti KeanggotaanOutlet/HargaItemOutlet/StokBahan/PenerimaanBarang
// sebelumnya.
//
// Status eksekusi nyata: lihat RELEASE-EVIDENCE.md bagian pass ALT-DEF-003/
// ALT-DEF-013 untuk output `prisma generate` dan `tsc --noEmit` aktual.

import type { Prisma } from "@prisma/client";

const contohPinOutlet = {
  id: "01J...PIN",
  keanggotaanTenantId: "01J...KT",
  tenantId: "01J...TENANT",
  outletId: "01J...OUTLET",
  pinHash: "$argon2id$...",
} satisfies Prisma.PinOutletUncheckedCreateInput;

const contohTokenResetKataSandi = {
  id: "01J...TRK",
  penggunaId: "01J...PENGGUNA",
  tokenHash: "sha256:...",
  kadaluarsaPada: new Date(),
} satisfies Prisma.TokenResetKataSandiUncheckedCreateInput;

const contohPercobaanLogin = {
  id: "01J...PL",
  email: "pengguna@contoh.test",
  berhasil: false,
} satisfies Prisma.PercobaanLoginUncheckedCreateInput;

const contohRiwayatPerangkat = {
  id: "01J...RP",
  penggunaId: "01J...PENGGUNA",
  perangkatId: "01J...PRK",
  aksi: "DIGUNAKAN",
} satisfies Prisma.RiwayatPerangkatUncheckedCreateInput;

const contohSesi = {
  id: "01J...SESI",
  penggunaId: "01J...PENGGUNA",
  tokenHash: "sha256:...",
  kadaluarsaPada: new Date(),
} satisfies Prisma.SesiUncheckedCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipeAuthPin = {
  contohPinOutlet,
  contohTokenResetKataSandi,
  contohPercobaanLogin,
  contohRiwayatPerangkat,
  contohSesi,
};
