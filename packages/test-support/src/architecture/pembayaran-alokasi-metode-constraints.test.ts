// Test struktur/arsitektur untuk ALT-DEF-004 (scope metode bayar) dan
// ALT-DEF-014 (alokasi pembayaran / split bill / pembayaran sebagian).
//
// KONTEKS: Sama seperti architecture test batch-batch sebelumnya (lihat
// dapur-kds-multi-stasiun.test.ts, tenant-outlet-composite-constraints.test.ts),
// tidak ada Postgres nyata di environment correction-loop ini (ALT-DEF-029),
// sehingga integration test sungguhan terhadap database belum bisa dijalankan.
// File ini memverifikasi bahwa perubahan yang diklaim ADR-019/ADR-020
// (docs/engineering/DECISION-LOG.md) benar-benar ada di
// prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF yang paling penting di file ini:
//   1. `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET` benar-benar HILANG dari enum
//      `KodeMetodeBayar` - inilah inti defect ALT-DEF-004. Menguji hanya
//      keberadaan `TRANSFER_MANUAL`/`SALDO_TOKO` tidak cukup, karena enum bisa
//      saja memuat KEDUANYA sekaligus dan pelanggaran scope produk tetap ada.
//   2. Nilai `CAMPURAN` TIDAK PERNAH muncul di enum tersebut - pembayaran
//      campuran adalah kardinalitas `PembayaranMetodeBaris`, bukan metode
//      (ADR-019 Keputusan 3).
//   3. `Pembayaran` benar-benar TIDAK PUNYA LAGI kolom/relasi `pesananId` -
//      inilah inti defect ALT-DEF-014. Kalau kolom lama tertinggal, kode akan
//      terus membacanya dan `AlokasiPembayaran` menjadi sumber kebenaran kedua
//      yang pasti menyimpang (ADR-019 Keputusan 1).
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini eksekusi lewat vitest DIBLOKIR sama seperti architecture test
// lain. Yang SUDAH dijalankan nyata: `tsc --noEmit --strict` atas file ini dan
// `node --experimental-strip-types` untuk mengeksekusi assertion di bawah -
// lihat RELEASE-EVIDENCE.md untuk output aktual.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../../prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(__dirname, "../../../../prisma/seed/izin.seed.ts");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

// ALT-DEF-033: normalisasi runs spasi/tab horizontal sebelum mencocokkan.
// `prisma format` menyelaraskan lebar kolom antar-field, sehingga menambah satu
// field baru ke sebuah model menggeser spasi pada baris LAIN yang tidak
// disentuh - assertion whitespace-exact akan gagal PALSU. Newline TIDAK
// dinormalisasi supaya needle yang memakai "\n" tetap bermakna.
function normalisasiSpasiHorizontal(teks: string): string {
  return teks.replace(/[ \t]+/g, " ");
}

function assertContains(haystack: string, needle: string, pesan: string): void {
  if (!normalisasiSpasiHorizontal(haystack).includes(normalisasiSpasiHorizontal(needle))) {
    throw new Error(`ASSERTION GAGAL: ${pesan}\nTidak ditemukan: ${JSON.stringify(needle)}`);
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

// Daftar nilai enum sebagai array, mengabaikan komentar & baris kosong -
// dipakai untuk memastikan JUMLAH nilai persis, bukan sekadar "memuat X"
// (yang tidak akan menangkap nilai lama yang tertinggal).
function getNilaiEnum(schema: string, enumName: string): string[] {
  const body = getEnumBody(schema, enumName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

// Daftar nama field (bukan komentar/atribut blok) dari sebuah model - dipakai
// untuk assertion NEGATIF "kolom X tidak ada lagi" yang tahan terhadap
// penyebutan nama kolom tsb di dalam komentar dokumentasi model.
function getNamaField(schema: string, modelName: string): string[] {
  const body = getModelBody(schema, modelName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  const nama: string[] = [];
  for (const barisMentah of isi.split("\n")) {
    const baris = barisMentah.trim();
    if (baris.length === 0 || baris.startsWith("//") || baris.startsWith("@@")) {
      continue;
    }
    const cocok = /^([A-Za-z_][A-Za-z0-9_]*)\s+\S/.exec(baris);
    if (cocok && cocok[1] !== undefined) {
      nama.push(cocok[1]);
    }
  }
  return nama;
}

export function jalankanSemuaAssertion(): void {
  const schema = readSchema();

  // ===================================================================
  // ALT-DEF-004 / ADR-019 Keputusan 7: scope KodeMetodeBayar
  // ===================================================================
  const METODE_DIIZINKAN = ["TUNAI", "TRANSFER_MANUAL", "QRIS_MANUAL", "SALDO_TOKO"];
  const nilaiMetode = getNilaiEnum(schema, "KodeMetodeBayar");

  assertEqual(
    nilaiMetode.length,
    4,
    `KodeMetodeBayar harus punya PERSIS 4 nilai (ALT-DEF-004/ADR-019 Keputusan 7). Aktual: [${nilaiMetode.join(", ")}]`,
  );
  for (const nilai of METODE_DIIZINKAN) {
    if (!nilaiMetode.includes(nilai)) {
      throw new Error(
        `ASSERTION GAGAL: KodeMetodeBayar harus memuat nilai ${nilai}. Aktual: [${nilaiMetode.join(", ")}]`,
      );
    }
  }
  // Assertion NEGATIF - inti defect ALT-DEF-004. Ketiga nilai ini mengandaikan
  // integrasi payment gateway/EDC/e-wallet yang DILARANG ALT-QRS-010.
  for (const nilaiTerlarang of ["KARTU_DEBIT", "KARTU_KREDIT", "EWALLET"]) {
    if (nilaiMetode.includes(nilaiTerlarang)) {
      throw new Error(
        `ASSERTION GAGAL: KodeMetodeBayar TIDAK boleh lagi memuat ${nilaiTerlarang} - metode di luar scope produk yang dilarang eksplisit oleh ALT-QRS-010/ADR-003 (inti defect ALT-DEF-004).`,
      );
    }
  }
  // Assertion NEGATIF - CAMPURAN tidak boleh pernah ada (ADR-019 Keputusan 3).
  if (nilaiMetode.includes("CAMPURAN")) {
    throw new Error(
      "ASSERTION GAGAL: KodeMetodeBayar TIDAK boleh memuat CAMPURAN - pembayaran campuran dimodelkan sebagai SATU Pembayaran dengan BEBERAPA baris PembayaranMetodeBaris, bukan sebagai metode tersendiri (ADR-019 Keputusan 3).",
    );
  }

  // MetodeBayar: satu baris katalog per kode per tenant + composite-FK target.
  const metodeBayarBody = getModelBody(schema, "MetodeBayar");
  assertContains(
    metodeBayarBody,
    "@@unique([tenantId, kode])",
    "MetodeBayar harus punya @@unique([tenantId, kode]) - satu baris katalog per kode metode bayar per tenant (mencegah agregasi analitik ALT-ANL-010 jadi ambigu).",
  );
  assertContains(
    metodeBayarBody,
    "@@unique([tenantId, id])",
    "MetodeBayar harus punya @@unique([tenantId, id]) - dibutuhkan composite-FK PembayaranMetodeBaris.metodeBayar (ADR-019 Keputusan 8).",
  );

  // ===================================================================
  // ALT-DEF-014 / ADR-019 Keputusan 1: Pembayaran TIDAK lagi punya pesananId
  // ===================================================================
  const pembayaranBody = getModelBody(schema, "Pembayaran");
  const fieldPembayaran = getNamaField(schema, "Pembayaran");

  // Assertion NEGATIF - inti defect ALT-DEF-014. Dicek terhadap daftar FIELD
  // yang sudah diparse (bukan teks blok mentah) supaya penyebutan "pesananId"
  // di dalam komentar dokumentasi model TIDAK menghasilkan false positive.
  if (fieldPembayaran.includes("pesananId")) {
    throw new Error(
      `ASSERTION GAGAL: Pembayaran TIDAK boleh lagi punya kolom pesananId - inilah inti defect ALT-DEF-014 (ADR-019 Keputusan 1). Bila kolom lama tertinggal, ia menjadi sumber kebenaran KEDUA di samping AlokasiPembayaran dan pasti menyimpang. Field aktual: [${fieldPembayaran.join(", ")}]`,
    );
  }
  if (fieldPembayaran.includes("pesanan")) {
    throw new Error(
      "ASSERTION GAGAL: Pembayaran TIDAK boleh lagi punya relasi `pesanan` - relasi ke Pesanan sekarang SELALU lewat AlokasiPembayaran (ADR-019 Keputusan 1).",
    );
  }
  // Nama kolom lama `totalDibayar` diganti `jumlah` (ADR-019 Keputusan 1).
  if (fieldPembayaran.includes("totalDibayar")) {
    throw new Error(
      "ASSERTION GAGAL: Pembayaran.totalDibayar sudah diganti nama menjadi `jumlah` - nama lama menyiratkan 'total tagihan pesanan', padahal satu Pembayaran kini bisa lebih kecil (bayar sebagian) maupun lebih besar (group bill) dari total satu pesanan (ADR-019 Keputusan 1).",
    );
  }
  for (const kolom of ["id", "tenantId", "outletId", "jumlah", "totalDiterima", "kembalian", "status", "dikonfirmasiOlehId", "createdAt", "dikonfirmasiPada"]) {
    if (!fieldPembayaran.includes(kolom)) {
      throw new Error(`ASSERTION GAGAL: Pembayaran harus punya kolom ${kolom} (ADR-019 Keputusan 1).`);
    }
  }
  assertContains(
    pembayaranBody,
    "@@unique([tenantId, id])",
    "Pembayaran harus punya @@unique([tenantId, id]) - seluruh model anak (AlokasiPembayaran/KoreksiPembayaran/PembayaranMetodeBaris/QrisKonfirmasiManual/Struk/PembayaranRefund) bergantung padanya untuk composite-FK (ADR-019 Keputusan 8).",
  );
  // REGRESI ALT-DEF-010: composite-FK outlet TIDAK boleh rusak oleh batch ini.
  assertContains(
    pembayaranBody,
    "outlet Outlet @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "REGRESI ALT-DEF-010: Pembayaran.outlet harus TETAP composite-FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(pembayaranBody, "alokasi AlokasiPembayaran[]", "Pembayaran harus punya relasi list ke AlokasiPembayaran.");
  assertContains(pembayaranBody, "koreksi KoreksiPembayaran[]", "Pembayaran harus punya relasi list ke KoreksiPembayaran.");

  // Sisi Pesanan: relasi lama ke Pembayaran harus hilang, diganti alokasi.
  const fieldPesanan = getNamaField(schema, "Pesanan");
  if (fieldPesanan.includes("pembayaran")) {
    throw new Error(
      "ASSERTION GAGAL: Pesanan TIDAK boleh lagi punya relasi langsung `pembayaran Pembayaran[]` - pelunasan pesanan kini agregat dari AlokasiPembayaran (ADR-019 Keputusan 1).",
    );
  }
  assertContains(
    getModelBody(schema, "Pesanan"),
    "alokasiPembayaran AlokasiPembayaran[]",
    "Pesanan harus punya relasi list ke AlokasiPembayaran (ADR-019 Keputusan 1).",
  );
  // Composite-FK AlokasiPembayaran.pesanan bergantung pada @@unique ini.
  assertContains(
    getModelBody(schema, "Pesanan"),
    "@@unique([tenantId, id])",
    "REGRESI ALT-DEF-010: Pesanan harus TETAP punya @@unique([tenantId, id]) - composite-FK AlokasiPembayaran.pesanan bergantung padanya.",
  );

  // ===================================================================
  // ALT-DEF-014 / ADR-019 Keputusan 2: model AlokasiPembayaran
  // ===================================================================
  const alokasiBody = getModelBody(schema, "AlokasiPembayaran");
  for (const kolom of ["id", "tenantId", "pembayaranId", "pesananId", "jumlah"]) {
    assertContains(alokasiBody, kolom, `AlokasiPembayaran harus punya kolom ${kolom} (ALT-KSR-004/ALT-KSR-005).`);
  }
  assertContains(
    alokasiBody,
    "jumlah BigInt",
    "AlokasiPembayaran.jumlah harus bertipe BigInt (rupiah, ADR-034 mengamandemen ADR-005) - tanpa nominal per pasangan, 'berapa yang sudah dibayar untuk pesanan X' tidak terjawab pada group bill.",
  );
  assertContains(
    alokasiBody,
    "@@unique([pembayaranId, pesananId])",
    "AlokasiPembayaran harus punya @@unique([pembayaranId, pesananId]) - paling banyak SATU baris alokasi per pasangan (pembayaran, pesanan) (ADR-019 Keputusan 2).",
  );
  assertContains(
    alokasiBody,
    "pembayaran Pembayaran @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
    "AlokasiPembayaran.pembayaran harus composite-FK (tenantId, pembayaranId) -> Pembayaran(tenantId, id) mengikuti ADR-013.",
  );
  assertContains(
    alokasiBody,
    "pesanan Pesanan @relation(fields: [tenantId, pesananId], references: [tenantId, id])",
    "AlokasiPembayaran.pesanan harus composite-FK (tenantId, pesananId) -> Pesanan(tenantId, id) - menggantikan composite-FK yang dulu ada langsung di Pembayaran.pesanan (ADR-013/ADR-019).",
  );

  // ===================================================================
  // ADR-019 Keputusan 3: PembayaranMetodeBaris = mekanisme campuran
  // ===================================================================
  const metodeBarisBody = getModelBody(schema, "PembayaranMetodeBaris");
  for (const kolom of ["id", "tenantId", "pembayaranId", "metodeBayarId", "jumlah"]) {
    assertContains(metodeBarisBody, kolom, `PembayaranMetodeBaris harus punya kolom ${kolom} (ADR-019 Keputusan 3).`);
  }
  // Composite-FK GANDA (pola KeanggotaanOutlet, ADR-011/ADR-013): satu kolom
  // tenantId dipakai dua kali menuju dua parent berbeda.
  assertContains(
    metodeBarisBody,
    "pembayaran Pembayaran @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
    "PembayaranMetodeBaris.pembayaran harus composite-FK (tenantId, pembayaranId) -> Pembayaran(tenantId, id) (ADR-019 Keputusan 8).",
  );
  assertContains(
    metodeBarisBody,
    "metodeBayar MetodeBayar @relation(fields: [tenantId, metodeBayarId], references: [tenantId, id])",
    "PembayaranMetodeBaris.metodeBayar harus composite-FK (tenantId, metodeBayarId) -> MetodeBayar(tenantId, id) - pola composite-FK GANDA agar baris metode tidak mungkin merujuk pembayaran tenant A sekaligus katalog metode tenant B (ADR-019 Keputusan 8).",
  );

  // ===================================================================
  // ADR-019 Keputusan 6: KoreksiPembayaran (append-only)
  // ===================================================================
  const koreksiBody = getModelBody(schema, "KoreksiPembayaran");
  for (const kolom of ["id", "tenantId", "pembayaranId", "alasan", "jumlahSebelum", "jumlahSesudah", "dikoreksiOlehId", "createdAt"]) {
    assertContains(koreksiBody, kolom, `KoreksiPembayaran harus punya kolom ${kolom} (ADR-019 Keputusan 6).`);
  }
  assertContains(
    koreksiBody,
    "pembayaran Pembayaran @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
    "KoreksiPembayaran.pembayaran harus composite-FK (tenantId, pembayaranId) -> Pembayaran(tenantId, id).",
  );

  // ===================================================================
  // ADR-019 Keputusan 8: tenant-safety seluruh anak Pembayaran
  // ===================================================================
  for (const modelAnak of ["PembayaranRefund", "QrisKonfirmasiManual", "Struk"]) {
    const body = getModelBody(schema, modelAnak);
    const fields = getNamaField(schema, modelAnak);
    if (!fields.includes("tenantId")) {
      throw new Error(
        `ASSERTION GAGAL: ${modelAnak} harus punya kolom tenantId sendiri (ADR-019 Keputusan 8) - sebelumnya hanya punya pembayaranId tunggal tanpa jaminan tenant-safety apa pun.`,
      );
    }
    assertContains(
      body,
      "pembayaran Pembayaran @relation(fields: [tenantId, pembayaranId], references: [tenantId, id])",
      `${modelAnak}.pembayaran harus composite-FK (tenantId, pembayaranId) -> Pembayaran(tenantId, id) (ADR-019 Keputusan 8).`,
    );
  }
  // Struk & QrisKonfirmasiManual tetap 1:1 dengan Pembayaran (ADR-019 Keputusan 5).
  assertContains(
    getModelBody(schema, "Struk"),
    "pembayaranId String @unique",
    "Struk.pembayaranId harus TETAP @unique - struk adalah bukti per PERISTIWA PEMBAYARAN, keputusan eksplisit ADR-019 Keputusan 5 (bukan kelalaian).",
  );
  assertContains(
    getModelBody(schema, "QrisKonfirmasiManual"),
    "pembayaranId String @unique",
    "QrisKonfirmasiManual.pembayaranId harus TETAP @unique - satu pembayaran QRIS dikonfirmasi manual paling banyak sekali.",
  );

  // ===================================================================
  // ALT-DEF-014 / ADR-020: StatusPembayaran 9 nilai
  // ===================================================================
  const STATUS_9 = [
    "DRAF",
    "MENUNGGU",
    "MENUNGGU_KONFIRMASI",
    "DIBAYAR",
    "GAGAL",
    "DIBATALKAN",
    "DIKOREKSI",
    "DIKEMBALIKAN_SEBAGIAN",
    "DIKEMBALIKAN",
  ];
  const nilaiStatus = getNilaiEnum(schema, "StatusPembayaran");
  assertEqual(
    nilaiStatus.length,
    9,
    `StatusPembayaran harus punya PERSIS 9 nilai (ADR-020 Keputusan 1). Aktual: [${nilaiStatus.join(", ")}]`,
  );
  for (const nilai of STATUS_9) {
    if (!nilaiStatus.includes(nilai)) {
      throw new Error(
        `ASSERTION GAGAL: StatusPembayaran harus memuat nilai ${nilai} (ADR-020 Keputusan 1). Aktual: [${nilaiStatus.join(", ")}]`,
      );
    }
  }
  // Nilai lama harus benar-benar hilang - dicek terhadap daftar nilai terparse.
  for (const nilaiLama of ["DIKONFIRMASI", "DIREFUND"]) {
    if (nilaiStatus.includes(nilaiLama)) {
      throw new Error(
        `ASSERTION GAGAL: StatusPembayaran seharusnya sudah TIDAK memuat nilai lama ${nilaiLama} (diganti DIBAYAR/DIKEMBALIKAN, ADR-020 Keputusan 1).`,
      );
    }
  }
  assertContains(
    pembayaranBody,
    "status StatusPembayaran @default(DRAF)",
    "Pembayaran.status harus @default(DRAF) - kasir menyusun baris metode & alokasi dulu; invariant jumlah baru wajib terpenuhi saat KELUAR dari DRAF (ADR-020 Keputusan 1).",
  );

  // ===================================================================
  // Back-relation Tenant/Pengguna untuk model baru
  // ===================================================================
  const tenantBody = getModelBody(schema, "Tenant");
  for (const relasi of [
    "alokasiPembayaran AlokasiPembayaran[]",
    "pembayaranMetodeBaris PembayaranMetodeBaris[]",
    "koreksiPembayaran KoreksiPembayaran[]",
    "struk Struk[]",
    "pembayaranRefund PembayaranRefund[]",
  ]) {
    assertContains(tenantBody, relasi, `Tenant harus punya back-relation "${relasi}" untuk model pembayaran ALT-DEF-014.`);
  }
  // ADR-033: dikoreksiOlehId sekarang composite-FK tenant-scoped ke
  // KeanggotaanTenant (bukan lagi FK langsung ke Pengguna).
  assertContains(
    getModelBody(schema, "KeanggotaanTenant"),
    'koreksiPembayaranDikoreksi      KoreksiPembayaran[]       @relation("KoreksiPembayaranDikoreksiOleh")',
    "KeanggotaanTenant harus punya back-relation ke KoreksiPembayaran (aktor yang mengoreksi pembayaran, ADR-033).",
  );

  // ===================================================================
  // Katalog izin: kode pembayaran.* / kasir.* (ALT-DEF-004/ALT-DEF-014)
  // ===================================================================
  const izinSeed = readFileSync(IZIN_SEED_PATH, "utf-8");
  const KODE_BARU = [
    "pembayaran.buat",
    "pembayaran.tahan",
    "pembayaran.alokasi.kelola",
    "pembayaran.qris.konfirmasi-manual",
    "pembayaran.qris.koreksi",
    "pembayaran.refund",
    "pembayaran.struk.cetak",
    "pembayaran.struk.cetak-ulang",
    "kasir.giliran.kelola",
    "kasir.rekonsiliasi.lihat",
    "kasir.giliran.verifikasi",
    "kasir.giliran.buka-kembali",
  ];
  for (const kode of KODE_BARU) {
    assertContains(
      izinSeed,
      `kode: "${kode}"`,
      `prisma/seed/izin.seed.ts harus memuat kode izin "${kode}" (ALT-DEF-004/ALT-DEF-014, sudah direferensikan MASTER-CHECKLIST.md ALT-KSR-*/ALT-QRS-*).`,
    );
  }
  // Kode koreksi/pembatalan SENGAJA memakai kode `transaksi.*` yang sudah ada -
  // menambah `pembayaran.koreksi`/`pembayaran.batalkan` akan menduplikasi makna
  // izin yang sama persis dengan nama berbeda (lihat catatan ALT-DEF-034).
  for (const kodeDuplikatif of ["pembayaran.koreksi", "pembayaran.batalkan"]) {
    if (izinSeed.includes(`kode: "${kodeDuplikatif}"`)) {
      throw new Error(
        `ASSERTION GAGAL: izin.seed.ts TIDAK boleh memuat "${kodeDuplikatif}" - makna itu sudah dinaungi kode yang sudah ada ("transaksi.koreksi-pembayaran"/"transaksi.batalkan"). Dua kode untuk satu makna adalah persis defect ALT-DEF-034.`,
      );
    }
  }
  // Tidak boleh ada kode duplikat setelah penambahan di atas (Izin.kode unik global).
  const semuaKode = [...izinSeed.matchAll(/kode: "([^"]+)"/g)]
    .map((m) => m[1])
    .filter((kode): kode is string => kode !== undefined);
  const terlihat = new Set<string>();
  const duplikat: string[] = [];
  for (const kode of semuaKode) {
    if (terlihat.has(kode)) {
      duplikat.push(kode);
    }
    terlihat.add(kode);
  }
  assertEqual(duplikat.length, 0, `izin.seed.ts tidak boleh punya kode duplikat. Duplikat: [${duplikat.join(", ")}]`);
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-004/ALT-DEF-014 lulus.");
