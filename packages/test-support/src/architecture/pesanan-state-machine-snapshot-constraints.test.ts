// Test struktur/arsitektur untuk ALT-DEF-005 (state machine Pesanan 14-status
// penuh) dan ALT-DEF-016 (snapshot ItemPesanan/ItemPesananModifier).
//
// KONTEKS: Sama seperti test arsitektur batch-batch sebelumnya (lihat
// tenant-outlet-composite-constraints.test.ts, sesi-auth-pin-constraints.test.ts,
// idempotency-outbox-notification-constraints.test.ts), tidak ada Postgres
// nyata di environment correction-loop ini (lihat ALT-DEF-029), sehingga
// integration test sungguhan terhadap database belum bisa dijalankan pada
// pass ini. File ini adalah "architecture test" berbasis pembacaan teks
// skema Prisma - memverifikasi bahwa 14-status penuh, enum riwayat status,
// model baru (PesananPerubahan/PesananPenolakan/PesananPembatalan), dan
// kolom snapshot yang diklaim di ADR-017 (docs/engineering/DECISION-LOG.md)
// benar-benar ada di prisma/schema/schema.prisma, bukan sekadar diklaim di
// dokumentasi.
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini, eksekusi lewat vitest DIBLOKIR sama seperti file-file
// architecture test lain (tidak ada pnpm/node_modules workspace nyata di
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
    throw new Error(`ASSERTION GAGAL: ${pesan}\nSeharusnya tidak ditemukan tetapi ada: ${JSON.stringify(needle)}`);
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

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // --- ALT-DEF-005: StatusPesanan 14-status penuh ---
  const statusPesananBody = getEnumBody(schema, "StatusPesanan");
  const STATUS_PESANAN_14 = [
    "DRAF",
    "DIKIRIM",
    "MENUNGGU_PERSETUJUAN",
    "DITERIMA",
    "DITOLAK",
    "MENUNGGU_PEMBAYARAN",
    "DIKONFIRMASI",
    "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
    "SELESAI",
    "DIBATALKAN",
    "DIRETUR",
  ];
  for (const nilai of STATUS_PESANAN_14) {
    assertContains(
      statusPesananBody,
      nilai,
      `StatusPesanan harus memuat nilai enum ${nilai} (14-status penuh, ALT-DEF-005).`,
    );
  }
  // Status lama yang seharusnya sudah tidak ada lagi (digantikan state machine baru).
  for (const nilaiLama of ["BARU", "DIPROSES_DAPUR", "SIAP_DISAJIKAN", "DIBAYAR"]) {
    assertNotContains(
      statusPesananBody,
      `  ${nilaiLama}\n`,
      `StatusPesanan seharusnya sudah tidak memuat nilai lama ${nilaiLama} (digantikan 14-status ALT-DEF-005).`,
    );
  }

  // --- ALT-DEF-016: StatusItemPesanan diselaraskan ke daftar penuh ---
  const statusItemPesananBody = getEnumBody(schema, "StatusItemPesanan");
  for (const nilai of [
    "DRAF",
    "DITERIMA",
    "DIKIRIM_KE_DAPUR",
    "DITAHAN",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
    "DIBATALKAN",
    "DIRETUR",
  ]) {
    assertContains(
      statusItemPesananBody,
      nilai,
      `StatusItemPesanan harus memuat nilai enum ${nilai} (diselaraskan ALT-DEF-016).`,
    );
  }

  // --- ALT-PES-010: JenisPerubahanPesanan ---
  const jenisPerubahanBody = getEnumBody(schema, "JenisPerubahanPesanan");
  for (const nilai of ["TAMBAH_ITEM", "UBAH_KUANTITAS", "HAPUS_ITEM", "PINDAH_MEJA", "SPLIT", "MERGE", "LAINNYA"]) {
    assertContains(jenisPerubahanBody, nilai, `JenisPerubahanPesanan harus memuat nilai enum ${nilai}.`);
  }

  // --- ALT-DEF-005/ALT-PES-009: PesananRiwayatStatus bertipe enum, bukan String ---
  const riwayatStatusBody = getModelBody(schema, "PesananRiwayatStatus");
  assertContains(
    riwayatStatusBody,
    "statusSebelumnya StatusPesanan",
    "PesananRiwayatStatus.statusSebelumnya harus bertipe enum StatusPesanan, bukan String bebas.",
  );
  assertContains(
    riwayatStatusBody,
    "statusBaru       StatusPesanan",
    "PesananRiwayatStatus.statusBaru harus bertipe enum StatusPesanan, bukan String bebas.",
  );
  assertNotContains(
    riwayatStatusBody,
    "statusSebelumnya String\n",
    "PesananRiwayatStatus.statusSebelumnya seharusnya sudah tidak bertipe String bebas lagi.",
  );

  // --- ALT-DEF-016: ItemPesanan snapshot fields ---
  const itemPesananBody = getModelBody(schema, "ItemPesanan");
  for (const kolom of [
    "namaItemSnapshot",
    "namaVarianSnapshot",
    "hargaDasarSnapshot",
    "hargaVarianSnapshot",
    "hargaModifierSnapshot",
    "diskonSnapshot",
    "pajakSnapshot",
    "serviceChargeSnapshot",
    "totalBarisSnapshot",
    "resepVersiId",
  ]) {
    assertContains(itemPesananBody, kolom, `ItemPesanan harus punya kolom snapshot ${kolom} (ALT-DEF-016).`);
  }
  // resepVersiId harus scalar polos String? (forward-ref tanpa FK, ADR-017 Keputusan 8) -
  // dicek sebagai deklarasi FIELD sungguhan (awal baris, bukan sekadar disebut di komentar).
  assertContains(
    itemPesananBody,
    "\n  resepVersiId          String?",
    "ItemPesanan.resepVersiId harus dideklarasikan sebagai scalar String? polos (forward-ref tanpa FK, ADR-017 Keputusan 8).",
  );
  assertNotContains(
    itemPesananBody,
    "\n  resepVersi VersiResep",
    "ItemPesanan TIDAK boleh punya field relasi Prisma sungguhan bernama resepVersi pada batch ini (model VersiResep belum ada, ADR-017 Keputusan 8).",
  );

  // --- ALT-DEF-016: ItemPesananModifier snapshot fields ---
  const itemPesananModifierBody = getModelBody(schema, "ItemPesananModifier");
  for (const kolom of ["namaModifierSnapshot", "hargaSnapshot", "jumlah", "totalSnapshot"]) {
    assertContains(
      itemPesananModifierBody,
      kolom,
      `ItemPesananModifier harus punya kolom snapshot ${kolom} (ALT-DEF-016).`,
    );
  }
  // modifierOpsiId (traceability) tetap dipertahankan, bukan dihapus.
  assertContains(
    itemPesananModifierBody,
    "modifierOpsiId String",
    "ItemPesananModifier.modifierOpsiId (traceability ke definisi modifier terkini) harus tetap dipertahankan.",
  );

  // --- ALT-PES-010: PesananPerubahan ---
  const pesananPerubahanBody = getModelBody(schema, "PesananPerubahan");
  for (const kolom of ["tenantId", "pesananId", "jenisPerubahan", "sebelum", "sesudah", "diubahOlehId", "createdAt"]) {
    assertContains(pesananPerubahanBody, kolom, `PesananPerubahan harus punya kolom ${kolom}.`);
  }
  assertContains(
    pesananPerubahanBody,
    "jenisPerubahan JenisPerubahanPesanan",
    "PesananPerubahan.jenisPerubahan harus bertipe enum JenisPerubahanPesanan.",
  );

  // --- ALT-PES-011/ADR-017: PesananPenolakan (pesananId @unique - lihat Keputusan 3) ---
  const pesananPenolakanBody = getModelBody(schema, "PesananPenolakan");
  for (const kolom of ["tenantId", "pesananId", "alasan", "ditolakOlehId", "createdAt"]) {
    assertContains(pesananPenolakanBody, kolom, `PesananPenolakan harus punya kolom ${kolom}.`);
  }
  assertContains(
    pesananPenolakanBody,
    "pesananId     String   @unique",
    "PesananPenolakan.pesananId harus @unique (satu baris per pesanan, lihat ADR-017 Keputusan 3).",
  );

  // --- ALT-PES-011/ADR-017: PesananPembatalan (pesananId @unique - status terminal, Keputusan 4) ---
  const pesananPembatalanBody = getModelBody(schema, "PesananPembatalan");
  for (const kolom of ["tenantId", "pesananId", "alasan", "dibatalkanOlehId", "createdAt"]) {
    assertContains(pesananPembatalanBody, kolom, `PesananPembatalan harus punya kolom ${kolom}.`);
  }
  assertContains(
    pesananPembatalanBody,
    "pesananId        String   @unique",
    "PesananPembatalan.pesananId harus @unique (satu baris per pesanan - DIBATALKAN status terminal, ADR-017 Keputusan 4).",
  );

  // --- Regresi: Pesanan<->Outlet composite-FK (ALT-DEF-010) TIDAK boleh berubah pada batch ini ---
  const pesananBody = getModelBody(schema, "Pesanan");
  assertContains(
    pesananBody,
    "outlet     Outlet     @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "Pesanan.outlet harus TETAP composite FK (tenantId, outletId) -> Outlet(tenantId, id) - regresi ALT-DEF-010, TIDAK disentuh batch ini.",
  );
  assertContains(
    pesananBody,
    "perubahan      PesananPerubahan[]",
    "Pesanan harus punya relasi list ke PesananPerubahan.",
  );
  assertContains(
    pesananBody,
    "penolakan      PesananPenolakan?",
    "Pesanan harus punya relasi opsional (nol-atau-satu) ke PesananPenolakan.",
  );
  assertContains(
    pesananBody,
    "pembatalan     PesananPembatalan?",
    "Pesanan harus punya relasi opsional (nol-atau-satu) ke PesananPembatalan.",
  );

  // --- Regresi: TiketDapur.pesananId TETAP @unique (kardinalitas 1:1 - scope ALT-DEF-006, BUKAN batch ini) ---
  const tiketDapurBody = getModelBody(schema, "TiketDapur");
  assertContains(
    tiketDapurBody,
    "pesananId         String           @unique",
    "TiketDapur.pesananId harus TETAP @unique pada batch ini - mengubah kardinalitas 1:1 adalah scope ALT-DEF-006 (batch berikutnya), BUKAN batch ALT-DEF-005/ALT-DEF-016 ini.",
  );
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-005/ALT-DEF-016 lulus.");
