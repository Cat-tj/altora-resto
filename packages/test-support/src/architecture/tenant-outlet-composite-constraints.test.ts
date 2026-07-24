// Test struktur/arsitektur untuk ALT-DEF-010 dan ALT-DEF-014.
//
// KONTEKS: Sama seperti `keanggotaan-outlet-constraints.test.ts` (batch
// sebelumnya, ALT-DEF-001/ALT-DEF-002), tidak ada Postgres nyata di
// environment correction-loop ini (lihat ALT-DEF-029), sehingga integration
// test sungguhan terhadap database belum bisa dijalankan pada pass ini. File
// ini adalah "architecture test" berbasis pembacaan teks skema Prisma -
// memverifikasi bahwa composite-FK tenant/outlet yang diklaim di ADR-013
// (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR sama seperti file
// keanggotaan-outlet-constraints.test.ts (tidak ada pnpm/node_modules
// workspace nyata di environment ini). Yang SUDAH dijalankan secara nyata
// adalah `tsc --noEmit` atas file ini dan `node --experimental-strip-types`
// untuk mengeksekusi assertion di bawah - lihat RELEASE-EVIDENCE.md untuk
// output aktual.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../../prisma/schema/schema.prisma");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

// ALT-DEF-033: needle assertion di file ini semula dicocokkan secara
// whitespace-EXACT terhadap teks schema.prisma. Itu rapuh: `prisma format`
// menyelaraskan lebar kolom antar-field, sehingga MENAMBAH field baru ke
// sebuah model (mis. `TiketDapur.nomorGelombang` pada ALT-DEF-006) menggeser
// spasi pada baris-baris LAIN yang tidak disentuh sama sekali dan membuat
// assertion gagal PALSU - constraint yang diuji (composite-FK ALT-DEF-010)
// sebenarnya masih utuh. Runs spasi/tab horizontal kini dinormalisasi di
// kedua sisi sebelum dibandingkan; newline TIDAK dinormalisasi supaya needle
// yang sengaja memakai "\n" (penanda awal deklarasi field) tetap bermakna.
// Normalisasi ini murni lebih permisif - seluruh assertion yang sebelumnya
// lulus tetap lulus.
function normalisasiSpasiHorizontal(teks: string): string {
  return teks.replace(/[ \t]+/g, " ");
}

function assertContains(haystack: string, needle: string, pesan: string): void {
  if (!normalisasiSpasiHorizontal(haystack).includes(normalisasiSpasiHorizontal(needle))) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nTidak ditemukan: ${JSON.stringify(needle)}`);
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

  // --- Pesanan <-> Outlet (ALT-DEF-010) ---
  const pesananBody = getModelBody(schema, "Pesanan");
  assertContains(
    pesananBody,
    "outlet     Outlet     @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "Pesanan.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    pesananBody,
    "@@unique([tenantId, id])",
    "Pesanan harus punya @@unique([tenantId, id]) agar TiketDapur/Pembayaran bisa memakai composite FK ke Pesanan.",
  );

  // --- Meja <-> Outlet (ALT-DEF-010) ---
  const mejaBody = getModelBody(schema, "Meja");
  assertContains(
    mejaBody,
    "outlet    Outlet       @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "Meja.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    mejaBody,
    "@@unique([outletId, id])",
    "Meja harus punya @@unique([outletId, id]) agar Pesanan/Reservasi/AreaMeja bisa memakai composite FK level-outlet ke Meja.",
  );

  // --- TiketDapur <-> StasiunDapur/Outlet (ALT-DEF-010) ---
  const tiketDapurBody = getModelBody(schema, "TiketDapur");
  assertContains(
    tiketDapurBody,
    "outlet       Outlet            @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "TiketDapur.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    tiketDapurBody,
    "stasiunDapur StasiunDapur?     @relation(fields: [outletId, stasiunDapurId], references: [outletId, id])",
    "TiketDapur.stasiunDapur harus berupa composite FK (outletId, stasiunDapurId) -> StasiunDapur(outletId, id).",
  );
  assertContains(
    tiketDapurBody,
    "pesanan      Pesanan           @relation(fields: [tenantId, pesananId], references: [tenantId, id])",
    "TiketDapur.pesanan harus berupa composite FK (tenantId, pesananId) -> Pesanan(tenantId, id).",
  );
  const stasiunDapurBody = getModelBody(schema, "StasiunDapur");
  assertContains(
    stasiunDapurBody,
    "@@unique([outletId, id])",
    "StasiunDapur harus punya @@unique([outletId, id]) agar TiketDapur bisa memakai composite FK level-outlet.",
  );

  // --- GiliranKasir <-> Outlet (ALT-DEF-010) ---
  const giliranKasirBody = getModelBody(schema, "GiliranKasir");
  assertContains(
    giliranKasirBody,
    "outlet         Outlet           @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "GiliranKasir.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(
    giliranKasirBody,
    "@@unique([tenantId, id])",
    "GiliranKasir harus punya @@unique([tenantId, id]) agar RekapKasHarian bisa memakai composite FK ke GiliranKasir.",
  );

  // --- Karyawan <-> Outlet (ALT-DEF-010) ---
  const karyawanBody = getModelBody(schema, "Karyawan");
  assertContains(
    karyawanBody,
    'outletUtama             Outlet                    @relation("KaryawanOutletUtama", fields: [tenantId, outletUtamaId], references: [tenantId, id])',
    "Karyawan.outletUtama harus berupa composite FK (tenantId, outletUtamaId) -> Outlet(tenantId, id).",
  );

  // --- PurchaseOrder <-> Supplier (ALT-DEF-010) ---
  const purchaseOrderBody = getModelBody(schema, "PurchaseOrder");
  assertContains(
    purchaseOrderBody,
    "supplier   Supplier             @relation(fields: [tenantId, supplierId], references: [tenantId, id])",
    "PurchaseOrder.supplier harus berupa composite FK (tenantId, supplierId) -> Supplier(tenantId, id) - PO tidak boleh bisa lintas tenant ke supplier tenant lain.",
  );
  const supplierBody = getModelBody(schema, "Supplier");
  assertContains(
    supplierBody,
    "@@unique([tenantId, id])",
    "Supplier harus punya @@unique([tenantId, id]) agar PurchaseOrder bisa memakai composite FK ke Supplier.",
  );

  // --- MutasiStok <-> Gudang (ALT-DEF-010) ---
  const mutasiStokBody = getModelBody(schema, "MutasiStok");
  assertContains(
    mutasiStokBody,
    "gudang Gudang @relation(fields: [tenantId, gudangId], references: [tenantId, id])",
    "MutasiStok.gudang harus berupa composite FK (tenantId, gudangId) -> Gudang(tenantId, id) - sebelumnya gudangId tidak punya relasi FK sama sekali.",
  );
  const gudangBody = getModelBody(schema, "Gudang");
  assertContains(
    gudangBody,
    "@@unique([tenantId, id])",
    "Gudang harus punya @@unique([tenantId, id]) agar MutasiStok/StokBahan/StokOpname/PenerimaanBarang bisa memakai composite FK ke Gudang.",
  );

  // --- HargaItemOutlet: gap tenantId yang ditemukan saat audit, sekarang diperbaiki ---
  const hargaItemOutletBody = getModelBody(schema, "HargaItemOutlet");
  assertContains(
    hargaItemOutletBody,
    "tenantId     String",
    "HargaItemOutlet sebelumnya tidak punya tenantId sama sekali - harus ditambahkan.",
  );
  assertContains(
    hargaItemOutletBody,
    '@relation("HargaItemOutletItemMenu", fields: [tenantId, itemMenuId], references: [tenantId, id])',
    "HargaItemOutlet.itemMenu harus berupa composite FK (tenantId, itemMenuId) -> ItemMenu(tenantId, id).",
  );
  assertContains(
    hargaItemOutletBody,
    '@relation("HargaItemOutletOutlet", fields: [tenantId, outletId], references: [tenantId, id])',
    "HargaItemOutlet.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );

  // --- PenerimaanBarang: gap tenantId yang ditemukan saat audit, sekarang diperbaiki ---
  const penerimaanBarangBody = getModelBody(schema, "PenerimaanBarang");
  assertContains(
    penerimaanBarangBody,
    "tenantId        String",
    "PenerimaanBarang sebelumnya tidak punya tenantId sama sekali - harus ditambahkan.",
  );
  assertContains(
    penerimaanBarangBody,
    '@relation("PenerimaanBarangPo", fields: [tenantId, purchaseOrderId], references: [tenantId, id])',
    "PenerimaanBarang.purchaseOrder harus berupa composite FK (tenantId, purchaseOrderId) -> PurchaseOrder(tenantId, id).",
  );
  assertContains(
    penerimaanBarangBody,
    '@relation("PenerimaanBarangGudang", fields: [tenantId, gudangId], references: [tenantId, id])',
    "PenerimaanBarang.gudang harus berupa composite FK (tenantId, gudangId) -> Gudang(tenantId, id).",
  );

  // --- StokBahan: gap tenantId yang ditemukan saat audit, sekarang diperbaiki ---
  const stokBahanBody = getModelBody(schema, "StokBahan");
  assertContains(
    stokBahanBody,
    "tenantId  String",
    "StokBahan sebelumnya tidak punya tenantId sama sekali - harus ditambahkan.",
  );
  assertContains(
    stokBahanBody,
    '@relation("StokBahanGudang", fields: [tenantId, gudangId], references: [tenantId, id])',
    "StokBahan.gudang harus berupa composite FK (tenantId, gudangId) -> Gudang(tenantId, id).",
  );
  assertContains(
    stokBahanBody,
    '@relation("StokBahanBahan", fields: [tenantId, bahanId], references: [tenantId, id])',
    "StokBahan.bahan harus berupa composite FK (tenantId, bahanId) -> Bahan(tenantId, id).",
  );
  const bahanBody = getModelBody(schema, "Bahan");
  assertContains(
    bahanBody,
    "@@unique([tenantId, id])",
    "Bahan harus punya @@unique([tenantId, id]) agar StokBahan/MutasiStok/RmStokKritis bisa memakai composite FK ke Bahan.",
  );

  // --- KeanggotaanOutlet (ALT-DEF-001, verifikasi ulang - tidak boleh regresi) ---
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
console.log("OK: seluruh assertion arsitektur ALT-DEF-010/ALT-DEF-014 lulus.");
