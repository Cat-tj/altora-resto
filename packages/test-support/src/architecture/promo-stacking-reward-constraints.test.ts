// Test struktur/arsitektur untuk ALT-DEF-009 (stacking promo, PromoReward,
// PromoJadwal, PromoPemakaianBaris, PromoSnapshot, PromoSimulasi) dan
// ALT-DEF-030 (PromoOutlet - cakupan outlet promo).
//
// KONTEKS: Sama seperti architecture test batch-batch sebelumnya (lihat
// pembayaran-alokasi-metode-constraints.test.ts, resep-versi-produksi-
// constraints.test.ts), tidak ada Postgres nyata di environment
// correction-loop ini (ALT-DEF-029), sehingga integration test sungguhan
// terhadap database belum bisa dijalankan pada pass ini. File ini
// memverifikasi bahwa desain yang diklaim ADR-026
// (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF paling penting di file ini:
//   1. `PromoPemakaian.pesananId` benar-benar TIDAK unik lagi - inilah inti
//      defect ALT-DEF-009. Diverifikasi lewat DUA cara: (a) baris field
//      `pesananId String` TANPA `@unique` di belakangnya, dan (b) TIDAK ada
//      `@@unique([...])` model-level apa pun yang menyertakan `pesananId`
//      sendirian atau berpasangan dengan `promoId` - constraint seperti itu
//      akan tetap membatasi satu promo per pesanan lewat jalur lain.
//   2. `Promo.jenis`/enum `JenisPromo` benar-benar HILANG - digantikan
//      `PromoReward.jenis` (enum `JenisRewardPromo`), bukan sekadar
//      ditambah di sampingnya (yang akan membuat dua sumber kebenaran).
//   3. `JenisSyaratPromo.OUTLET_TERTENTU` benar-benar HILANG - `PromoOutlet`
//      adalah SATU-SATUNYA mekanisme cakupan outlet (ADR-026 Keputusan 3).
//   4. `Pesanan.promoPemakaian` bukan lagi relasi tunggal (`PromoPemakaian?`)
//      - harus jadi list (`PromoPemakaian[]`), konsisten dengan stacking.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini eksekusi lewat vitest DIBLOKIR sama seperti architecture
// test lain. Yang SUDAH dijalankan nyata: `tsc --noEmit --strict` atas file
// ini dan `node --experimental-strip-types` untuk mengeksekusi assertion di
// bawah - lihat RELEASE-EVIDENCE.md untuk output aktual, termasuk mutation
// test yang membuktikan assertion #1 benar-benar GAGAL jika `@unique`
// dikembalikan ke `pesananId`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../../prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(__dirname, "../../../../prisma/seed/izin.seed.ts");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

// ALT-DEF-033: normalisasi runs spasi/tab horizontal sebelum mencocokkan -
// lihat penjelasan lengkap di pembayaran-alokasi-metode-constraints.test.ts.
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
    throw new Error(`ASSERTION GAGAL: ${pesan}\nSeharusnya tidak ditemukan tapi ada: ${JSON.stringify(needle)}`);
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

// Daftar baris field mentah (untuk mencocokkan `pesananId String` TANPA
// atribut `@unique`, bukan hanya keberadaan nama kolom).
function getBarisField(schema: string, modelName: string): string[] {
  const body = getModelBody(schema, modelName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

function getNamaField(schema: string, modelName: string): string[] {
  const nama: string[] = [];
  for (const baris of getBarisField(schema, modelName)) {
    if (baris.startsWith("@@")) continue;
    const cocok = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(baris);
    if (cocok && cocok[1] !== undefined) {
      nama.push(cocok[1]);
    }
  }
  return nama;
}

// Daftar seluruh baris `@@unique([...])`/`@@index([...])` model-level.
function getAtributBlok(schema: string, modelName: string, nama: "@@unique" | "@@index"): string[] {
  return getBarisField(schema, modelName).filter((baris) => baris.startsWith(nama));
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ALT-DEF-009 INTI: PromoPemakaian.pesananId TIDAK LAGI unique
  // ===================================================================
  const promoPemakaianFields = getBarisField(schema, "PromoPemakaian");
  const barisPesananId = promoPemakaianFields.find((b) => b.startsWith("pesananId"));
  if (!barisPesananId) {
    throw new Error("ASSERTION GAGAL: PromoPemakaian harus punya kolom pesananId.");
  }
  if (barisPesananId.includes("@unique")) {
    throw new Error(
      `ASSERTION GAGAL: PromoPemakaian.pesananId TIDAK boleh lagi punya @unique - inilah inti defect ALT-DEF-009 (ADR-026). Baris aktual: ${JSON.stringify(barisPesananId)}`,
    );
  }
  // Assertion negatif kedua - tidak boleh ada @@unique model-level apa pun
  // yang MEMBATASI pesananId sendirian atau bersama promoId (itu akan
  // membatasi kembali "satu promo per pesanan" lewat jalur lain).
  const uniqueBlocksPemakaian = getAtributBlok(schema, "PromoPemakaian", "@@unique");
  for (const blok of uniqueBlocksPemakaian) {
    if (/\bpesananId\b/.test(blok) && !/\btenantId,\s*id\b/.test(blok)) {
      throw new Error(
        `ASSERTION GAGAL: PromoPemakaian TIDAK boleh punya @@unique yang menyertakan pesananId (selain @@unique([tenantId, id]) untuk composite-FK anak) - itu diam-diam mengembalikan defect ALT-DEF-009. Blok: ${blok}`,
      );
    }
  }
  assertContains(
    getModelBody(schema, "PromoPemakaian"),
    "@@unique([tenantId, id])",
    "PromoPemakaian harus punya @@unique([tenantId, id]) - dibutuhkan composite-FK PromoPemakaianBaris/PromoSnapshot (ADR-013/ADR-026).",
  );
  assertContains(
    getModelBody(schema, "PromoPemakaian"),
    "promo Promo @relation(fields: [tenantId, promoId], references: [tenantId, id])",
    "PromoPemakaian.promo harus composite-FK (tenantId, promoId) -> Promo(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    getModelBody(schema, "PromoPemakaian"),
    "pesanan Pesanan @relation(fields: [tenantId, pesananId], references: [tenantId, id])",
    "PromoPemakaian.pesanan harus composite-FK (tenantId, pesananId) -> Pesanan(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    getModelBody(schema, "PromoPemakaian"),
    "baris PromoPemakaianBaris[]",
    "PromoPemakaian harus punya relasi list ke PromoPemakaianBaris (ADR-026).",
  );
  assertContains(
    getModelBody(schema, "PromoPemakaian"),
    "status StatusPemakaianPromo @default(DITERAPKAN)",
    "PromoPemakaian harus punya kolom status (DITERAPKAN/DIBATALKAN/DIRETUR) berdefault DITERAPKAN (ADR-026).",
  );
  const statusPemakaian = getNilaiEnum(schema, "StatusPemakaianPromo");
  assertEqual(statusPemakaian.length, 3, `StatusPemakaianPromo harus punya PERSIS 3 nilai. Aktual: [${statusPemakaian.join(", ")}]`);
  for (const nilai of ["DITERAPKAN", "DIBATALKAN", "DIRETUR"]) {
    if (!statusPemakaian.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StatusPemakaianPromo harus memuat ${nilai}.`);
    }
  }

  // ===================================================================
  // Pesanan.promoPemakaian: 1:1 -> 1:N
  // ===================================================================
  const pesananFields = getBarisField(schema, "Pesanan");
  const barisPromoPemakaian = pesananFields.find((b) => b.startsWith("promoPemakaian"));
  if (!barisPromoPemakaian) {
    throw new Error("ASSERTION GAGAL: Pesanan harus punya relasi promoPemakaian.");
  }
  if (!barisPromoPemakaian.includes("PromoPemakaian[]")) {
    throw new Error(
      `ASSERTION GAGAL: Pesanan.promoPemakaian harus jadi relasi LIST (PromoPemakaian[]), bukan 1:1 - satu pesanan kini bisa memakai lebih dari satu promo (ALT-DEF-009). Baris aktual: ${JSON.stringify(barisPromoPemakaian)}`,
    );
  }

  // ===================================================================
  // ADR-026 Keputusan 2: Promo.jenis/JenisPromo HILANG, diganti PromoReward
  // ===================================================================
  const promoFields = getNamaField(schema, "Promo");
  if (promoFields.includes("jenis")) {
    throw new Error(
      "ASSERTION GAGAL: Promo TIDAK boleh lagi punya kolom jenis - digantikan PromoReward.jenis (ADR-026 Keputusan 2), mencampur 'kapan promo berlaku' dengan 'bagaimana diskon dihitung' dalam satu enum adalah bagian dari defect ALT-DEF-009.",
    );
  }
  if (promoFields.includes("bisaDigabung")) {
    throw new Error(
      "ASSERTION GAGAL: Promo TIDAK boleh lagi punya kolom bisaDigabung (Boolean) - digantikan stackingPolicy+conflictGroup+prioritas (ADR-026 Keputusan 1).",
    );
  }
  if (schema.includes("enum JenisPromo ")) {
    throw new Error("ASSERTION GAGAL: enum JenisPromo TIDAK boleh ada lagi di schema.prisma - digantikan JenisRewardPromo pada PromoReward.");
  }
  for (const kolom of [
    "stackingPolicy",
    "conflictGroup",
    "prioritas",
    "maximumDiscount",
    "usageQuota",
    "usageLimitPerCustomer",
    "usageLimitPerOrder",
    "repeatable",
  ]) {
    if (!promoFields.includes(kolom)) {
      throw new Error(`ASSERTION GAGAL: Promo harus punya kolom ${kolom} (ADR-026 Keputusan 1).`);
    }
  }
  assertContains(
    getModelBody(schema, "Promo"),
    "stackingPolicy StackingPolicyPromo @default(TIDAK_BOLEH_DIGABUNG)",
    "Promo.stackingPolicy harus berdefault TIDAK_BOLEH_DIGABUNG (perilaku paling aman/setara bisaDigabung=false lama) (ADR-026 Keputusan 1).",
  );
  const stackingPolicy = getNilaiEnum(schema, "StackingPolicyPromo");
  assertEqual(stackingPolicy.length, 4, `StackingPolicyPromo harus punya PERSIS 4 nilai. Aktual: [${stackingPolicy.join(", ")}]`);
  for (const nilai of ["TIDAK_BOLEH_DIGABUNG", "BOLEH_DIGABUNG", "AMBIL_DISKON_TERBAIK", "BERDASARKAN_PRIORITAS"]) {
    if (!stackingPolicy.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: StackingPolicyPromo harus memuat ${nilai}.`);
    }
  }
  assertContains(
    getModelBody(schema, "Promo"),
    "@@unique([tenantId, id])",
    "Promo harus punya @@unique([tenantId, id]) - dibutuhkan composite-FK PromoReward/PromoJadwal/PromoOutlet/PromoPemakaian/PromoSimulasi (ADR-013/ADR-026).",
  );

  // ===================================================================
  // PromoReward - BARU
  // ===================================================================
  const rewardBody = getModelBody(schema, "PromoReward");
  const rewardFields = getNamaField(schema, "PromoReward");
  for (const kolom of [
    "id",
    "tenantId",
    "promoId",
    "jenis",
    "nilaiPersen",
    "nilaiNominal",
    "itemGratisId",
    "jumlahGratis",
    "hargaPaket",
    "syaratJumlahBeliX",
    "bayarJumlahY",
    "berlakuKelipatan",
    "modifierIkutGratis",
    "batasHadiahPerOrder",
  ]) {
    if (!rewardFields.includes(kolom)) {
      throw new Error(`ASSERTION GAGAL: PromoReward harus punya kolom ${kolom} (ALT-DEF-009/ADR-026 Keputusan 2).`);
    }
  }
  assertContains(
    rewardBody,
    "promo Promo @relation(fields: [tenantId, promoId], references: [tenantId, id])",
    "PromoReward.promo harus composite-FK (tenantId, promoId) -> Promo(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    rewardBody,
    "itemGratis ItemMenu? @relation(fields: [tenantId, itemGratisId], references: [tenantId, id])",
    "PromoReward.itemGratis harus composite-FK NULLABLE (tenantId, itemGratisId) -> ItemMenu(tenantId, id) (ADR-013/ADR-026).",
  );
  const jenisReward = getNilaiEnum(schema, "JenisRewardPromo");
  assertEqual(jenisReward.length, 5, `JenisRewardPromo harus punya PERSIS 5 nilai. Aktual: [${jenisReward.join(", ")}]`);
  for (const nilai of ["DISKON_PERSEN", "DISKON_NOMINAL", "ITEM_GRATIS", "HARGA_PAKET", "BELI_X_BAYAR_Y"]) {
    if (!jenisReward.includes(nilai)) {
      throw new Error(`ASSERTION GAGAL: JenisRewardPromo harus memuat ${nilai}.`);
    }
  }

  // ===================================================================
  // PromoJadwal - BARU
  // ===================================================================
  const jadwalBody = getModelBody(schema, "PromoJadwal");
  for (const kolom of ["id", "tenantId", "promoId", "hariDalamMinggu", "jamMulai", "jamSelesai"]) {
    assertContains(jadwalBody, kolom, `PromoJadwal harus punya kolom ${kolom} (ALT-DEF-009).`);
  }
  assertContains(jadwalBody, "hariDalamMinggu Int[]", "PromoJadwal.hariDalamMinggu harus bertipe Int[] (native Postgres array, ADR-026).");
  assertContains(
    jadwalBody,
    "promo Promo @relation(fields: [tenantId, promoId], references: [tenantId, id])",
    "PromoJadwal.promo harus composite-FK (tenantId, promoId) -> Promo(tenantId, id) (ADR-013/ADR-026).",
  );

  // ===================================================================
  // PromoOutlet - BARU, menutup ALT-DEF-030
  // ===================================================================
  const outletBody = getModelBody(schema, "PromoOutlet");
  for (const kolom of ["id", "tenantId", "promoId", "outletId"]) {
    assertContains(outletBody, kolom, `PromoOutlet harus punya kolom ${kolom} (ALT-DEF-030).`);
  }
  assertContains(
    outletBody,
    "promo Promo @relation(fields: [tenantId, promoId], references: [tenantId, id])",
    "PromoOutlet.promo harus composite-FK (tenantId, promoId) -> Promo(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    outletBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "PromoOutlet.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id) - inilah yang menutup ALT-DEF-030.",
  );
  assertContains(outletBody, "@@unique([promoId, outletId])", "PromoOutlet harus punya @@unique([promoId, outletId]) - satu baris cakupan per pasangan promo/outlet.");

  // Assertion negatif - OUTLET_TERTENTU harus benar-benar hilang dari
  // JenisSyaratPromo (PromoOutlet adalah satu-satunya mekanisme, ADR-026
  // Keputusan 3), supaya tidak ada dua sumber kebenaran untuk cakupan outlet.
  const jenisSyarat = getNilaiEnum(schema, "JenisSyaratPromo");
  if (jenisSyarat.includes("OUTLET_TERTENTU")) {
    throw new Error(
      "ASSERTION GAGAL: JenisSyaratPromo TIDAK boleh lagi memuat OUTLET_TERTENTU - PromoOutlet adalah satu-satunya mekanisme cakupan outlet (ADR-026 Keputusan 3), dua mekanisme akan bisa saling menyimpang (pola defect yang sama seperti ALT-DEF-034).",
    );
  }
  for (const nilaiBaru of ["HARI_TERTENTU", "KANAL_TERTENTU", "PELANGGAN_ANGGOTA", "PELANGGAN_BARU", "ULANG_TAHUN"]) {
    if (!jenisSyarat.includes(nilaiBaru)) {
      throw new Error(`ASSERTION GAGAL: JenisSyaratPromo harus memuat ${nilaiBaru} (dijanjikan MASTER-CHECKLIST.md ALT-PRM-004/006/014 dan docs/database/10-promo.md).`);
    }
  }

  // ===================================================================
  // PromoKondisi - rename bersih dari PromoAturan
  // ===================================================================
  assertNotContains(schema, "model PromoAturan ", "PromoAturan seharusnya sudah di-rename bersih menjadi PromoKondisi (ADR-026 Keputusan 4) - model lama tidak boleh tertinggal.");
  const kondisiBody = getModelBody(schema, "PromoKondisi");
  for (const kolom of ["id", "promoId", "jenisSyarat", "nilaiSyarat"]) {
    assertContains(kondisiBody, kolom, `PromoKondisi harus punya kolom ${kolom} (rename dari PromoAturan, ADR-026 Keputusan 4).`);
  }

  // ===================================================================
  // PromoPemakaianBaris - BARU
  // ===================================================================
  const barisBody = getModelBody(schema, "PromoPemakaianBaris");
  for (const kolom of ["id", "tenantId", "promoPemakaianId", "itemPesananId", "nilaiDiskon", "createdAt"]) {
    assertContains(barisBody, kolom, `PromoPemakaianBaris harus punya kolom ${kolom} (ALT-DEF-009).`);
  }
  assertContains(
    barisBody,
    "promoPemakaian PromoPemakaian @relation(fields: [tenantId, promoPemakaianId], references: [tenantId, id])",
    "PromoPemakaianBaris.promoPemakaian harus composite-FK (tenantId, promoPemakaianId) -> PromoPemakaian(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    barisBody,
    "itemPesanan ItemPesanan? @relation(fields: [itemPesananId], references: [id])",
    "PromoPemakaianBaris.itemPesanan harus FK nullable ID tunggal (bukan composite) - ItemPesanan tidak membawa tenantId sendiri, konsisten dengan pola ItemPesananModifier.itemPesanan (ADR-013).",
  );

  // ===================================================================
  // PromoSnapshot - BARU
  // ===================================================================
  const snapshotBody = getModelBody(schema, "PromoSnapshot");
  for (const kolom of ["id", "tenantId", "promoPemakaianId", "definisiPromo", "createdAt"]) {
    assertContains(snapshotBody, kolom, `PromoSnapshot harus punya kolom ${kolom} (ALT-DEF-009).`);
  }
  assertContains(snapshotBody, "promoPemakaianId String @unique", "PromoSnapshot.promoPemakaianId harus @unique - satu penerapan promo paling banyak satu snapshot (1:1).");
  assertContains(
    snapshotBody,
    "promoPemakaian PromoPemakaian @relation(fields: [tenantId, promoPemakaianId], references: [tenantId, id])",
    "PromoSnapshot.promoPemakaian harus composite-FK (tenantId, promoPemakaianId) -> PromoPemakaian(tenantId, id) (ADR-013/ADR-026).",
  );

  // ===================================================================
  // PromoSimulasi - BARU, sengaja TIDAK terhubung ke Pesanan
  // ===================================================================
  const simulasiBody = getModelBody(schema, "PromoSimulasi");
  const simulasiFields = getNamaField(schema, "PromoSimulasi");
  for (const kolom of ["id", "tenantId", "promoId", "inputKeranjang", "hasilSimulasi", "disimulasikanOlehId", "createdAt"]) {
    assertContains(simulasiBody, kolom, `PromoSimulasi harus punya kolom ${kolom} (ALT-DEF-009/ALT-PRM-015).`);
  }
  if (simulasiFields.includes("pesananId") || simulasiFields.includes("pesanan")) {
    throw new Error("ASSERTION GAGAL: PromoSimulasi TIDAK boleh punya kolom/relasi ke Pesanan - simulasi adalah dry-run tanpa pesanan nyata (ALT-PRM-015), sengaja terpisah.");
  }
  assertContains(
    simulasiBody,
    "promo Promo? @relation(fields: [tenantId, promoId], references: [tenantId, id])",
    "PromoSimulasi.promo harus composite-FK NULLABLE (tenantId, promoId) -> Promo(tenantId, id) (ADR-013/ADR-026).",
  );
  assertContains(
    simulasiBody,
    'disimulasikanOleh Pengguna @relation("PromoSimulasiDijalankanOleh", fields: [disimulasikanOlehId], references: [id])',
    "PromoSimulasi.disimulasikanOleh harus FK ke Pengguna (aktor yang menjalankan dry-run).",
  );

  // ===================================================================
  // Back-relation Tenant/Pengguna untuk model baru
  // ===================================================================
  const tenantBody = getModelBody(schema, "Tenant");
  for (const relasi of ["promoReward PromoReward[]", "promoJadwal PromoJadwal[]", "promoOutlet PromoOutlet[]", "promoPemakaianBaris PromoPemakaianBaris[]", "promoSnapshot PromoSnapshot[]", "promoSimulasi PromoSimulasi[]"]) {
    assertContains(tenantBody, relasi, `Tenant harus punya back-relation "${relasi}" untuk model baru domain promo ALT-DEF-009.`);
  }
  assertContains(
    getModelBody(schema, "Pengguna"),
    "promoSimulasiDijalankan         PromoSimulasi[]           @relation(\"PromoSimulasiDijalankanOleh\")",
    "Pengguna harus punya back-relation ke PromoSimulasi (aktor yang menjalankan dry-run).",
  );
  assertContains(
    getModelBody(schema, "ItemMenu"),
    "promoRewardItemGratis PromoReward[]",
    "ItemMenu harus punya back-relation ke PromoReward (item yang dijadikan hadiah gratis).",
  );

  // ===================================================================
  // Katalog izin: kode promo.* (dijanjikan MASTER-CHECKLIST.md ALT-PRM-*)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  const KODE_DIREFERENSIKAN_CHECKLIST = [
    "promo.lihat",
    "promo.kelola",
    "promo.kondisi.kelola",
    "promo.reward.kelola",
    "promo.jadwal.kelola",
    "promo.outlet.kelola",
    "promo.kanal.kelola",
    "promo.prioritas.kelola",
    "promo.terapkan",
    "promo.validasi",
    "promo.kuota.kelola",
    "promo.batas-pelanggan.kelola",
  ];
  for (const kode of KODE_DIREFERENSIKAN_CHECKLIST) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" - direferensikan MASTER-CHECKLIST.md domain Promo & BOGO (ALT-PRM-*).`,
    );
  }
  // ALT-DEF-034 (pola sama): promo.retur.sinkron SENGAJA TIDAK ditambahkan
  // ke seed - aktornya "sistem" (event retur pesanan), bukan keputusan
  // otorisasi yang dipegang aktor manusia.
  if (izinSeed.includes('kode: "promo.retur.sinkron"')) {
    throw new Error(
      "ASSERTION GAGAL: izin.seed.ts TIDAK boleh memuat \"promo.retur.sinkron\" - ALT-PRM-017 dipicu event sistem (retur pesanan), bukan aksi aktor manusia, sama seperti kasus resep.pemakaian.otomatis (ALT-DEF-034).",
    );
  }
  // Tidak boleh ada kode duplikat setelah penambahan di atas.
  const semuaKode = [...izinSeed.matchAll(/kode: "([^"]+)"/g)].map((m) => m[1]).filter((k): k is string => k !== undefined);
  const terlihat = new Set<string>();
  const duplikat: string[] = [];
  for (const kode of semuaKode) {
    if (terlihat.has(kode)) duplikat.push(kode);
    terlihat.add(kode);
  }
  assertEqual(duplikat.length, 0, `izin.seed.ts tidak boleh punya kode duplikat. Duplikat: [${duplikat.join(", ")}]`);
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-009/ALT-DEF-030 lulus.");
