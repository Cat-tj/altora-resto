// Test compile-time untuk ALT-DEF-001/ALT-DEF-002: memverifikasi bahwa
// `@prisma/client` yang di-generate dari prisma/schema/schema.prisma benar-benar
// mengekspos tipe input untuk model-model baru (KeanggotaanTenant,
// KeanggotaanOutlet, Izin, PeranIzin, KeanggotaanPeran, BatasIzin,
// IzinSementara, PermintaanPersetujuan) dengan bentuk field yang sesuai
// spesifikasi - bukan hanya bahwa schema.prisma valid secara teks.
//
// Status eksekusi nyata: `npx prisma generate --schema=prisma/schema/schema.prisma`
// BERHASIL dijalankan tanpa koneksi database (lihat RELEASE-EVIDENCE.md untuk
// output aktual) setelah @prisma/client+prisma diinstal manual lewat
// `npm install --no-save` (workaround karena pnpm tidak tersedia di
// environment ini - lihat catatan di RELEASE-EVIDENCE.md). File ini
// di-type-check dengan `tsc --noEmit` mengarah ke instalasi tsc lokal.
//
// Jika @prisma/client TIDAK bisa di-generate di suatu environment (mis. tidak
// ada akses network untuk mengunduh engine), file ini akan gagal type-check
// dengan error "Cannot find module '@prisma/client'" - itu tanda DIBLOKIR
// yang jujur, bukan kegagalan assertion.

import type { Prisma } from "@prisma/client";

// --- ALT-DEF-001 ---

const contohPengguna = {
  id: "01J...PENGGUNA",
  namaLengkap: "Contoh Pengguna",
  email: "contoh@altora-resto.test",
  status: "AKTIF",
} satisfies Prisma.PenggunaCreateInput;

const contohKeanggotaanTenant = {
  id: "01J...KT",
  isOwner: true,
  pengguna: { connect: { id: contohPengguna.id } },
  tenant: { connect: { id: "01J...TENANT" } },
} satisfies Prisma.KeanggotaanTenantCreateInput;

// Memakai UncheckedCreateInput (bukan CreateInput biasa) karena `tenantId`
// pada KeanggotaanOutlet dimiliki penuh oleh DUA relasi composite-FK
// sekaligus (KeanggotaanOutletOutlet dan KeanggotaanOutletTenantScoped) -
// Prisma secara otomatis TIDAK mengekspos `tenantId` sebagai scalar biasa di
// KeanggotaanOutletCreateInput (bentuk "connect"), hanya di bentuk
// "Unchecked" yang menulis FK langsung. Ini justru bukti konkret bahwa
// composite-FK ganda di ADR-011 benar-benar ditegakkan oleh tipe yang
// di-generate, bukan cuma diklaim di komentar schema.
const contohKeanggotaanOutlet = {
  id: "01J...KO",
  tenantId: "01J...TENANT",
  keanggotaanTenantId: contohKeanggotaanTenant.id,
  outletId: "01J...OUTLET",
} satisfies Prisma.KeanggotaanOutletUncheckedCreateInput;

// --- ALT-DEF-002 ---

const contohIzin = {
  id: "01J...IZIN",
  kode: "transaksi.diskon",
  nama: "Berikan diskon transaksi",
  domain: "transaksi",
} satisfies Prisma.IzinCreateInput;

const contohPeran = {
  id: "01J...PERAN",
  kode: "KASIR",
  nama: "Kasir",
  isSystem: true,
  tenant: { connect: { id: "01J...TENANT" } },
} satisfies Prisma.PeranCreateInput;

const contohPeranIzin = {
  id: "01J...PI",
  peran: { connect: { id: contohPeran.id } },
  izin: { connect: { id: contohIzin.id } },
} satisfies Prisma.PeranIzinCreateInput;

const contohKeanggotaanPeran = {
  id: "01J...KP",
  keanggotaanTenant: { connect: { id: contohKeanggotaanTenant.id } },
  peran: { connect: { id: contohPeran.id } },
} satisfies Prisma.KeanggotaanPeranCreateInput;

const contohBatasIzin = {
  id: "01J...BI",
  maksimumDiskonPersen: 10,
  wajibPersetujuanManajer: true,
  peran: { connect: { id: contohPeran.id } },
} satisfies Prisma.BatasIzinCreateInput;

const contohIzinSementara = {
  id: "01J...IS",
  alasan: "Supervisor cuti, delegasi sementara satu shift",
  berlakuSejak: new Date(),
  berlakuSampai: new Date(),
  keanggotaanTenant: { connect: { id: contohKeanggotaanTenant.id } },
  izin: { connect: { id: contohIzin.id } },
  diberikanOleh: { connect: { id: contohPengguna.id } },
} satisfies Prisma.IzinSementaraCreateInput;

const contohPermintaanPersetujuan = {
  id: "01J...PP",
  jenisAksi: "DISKON_MANUAL",
  referensiJenis: "Pesanan",
  referensiId: "01J...PESANAN",
  tenant: { connect: { id: "01J...TENANT" } },
  keanggotaanTenantPemohon: { connect: { id: contohKeanggotaanTenant.id } },
} satisfies Prisma.PermintaanPersetujuanCreateInput;

// Ekspor no-op supaya file ini dianggap modul (isolatedModules) dan supaya
// eslint/tsc tidak menganggap konstanta di atas "unused" pada build strict.
export const contohObjekAssertionTipe = {
  contohPengguna,
  contohKeanggotaanTenant,
  contohKeanggotaanOutlet,
  contohIzin,
  contohPeran,
  contohPeranIzin,
  contohKeanggotaanPeran,
  contohBatasIzin,
  contohIzinSementara,
  contohPermintaanPersetujuan,
};
