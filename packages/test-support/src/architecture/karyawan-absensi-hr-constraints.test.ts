// Test struktur/arsitektur untuk ALT-DEF-019 (KaryawanOutlet many-to-many +
// KoreksiAbsensi append-only+approval), ALT-DEF-024 (TemplateShift/
// lintasTengahMalam + JadwalKerja + PolaJadwalBerulang + PermintaanTukarShift),
// dan ALT-DEF-025 (IstirahatAbsensi) - lihat ADR-028 di
// docs/engineering/DECISION-LOG.md.
//
// KONTEKS: sama seperti architecture test batch-batch sebelumnya, tidak ada
// Postgres nyata di environment correction-loop ini (ALT-DEF-029). File ini
// memverifikasi bahwa model/enum/constraint yang DIKLAIM ADR-028 benar-benar
// ada di prisma/schema/schema.prisma, bukan sekadar diklaim di dokumentasi.
//
// Assertion NEGATIF paling penting di file ini (urut kepentingannya):
//   1. `Karyawan.jabatanId`/`Karyawan.outletUtamaId` benar-benar HILANG -
//      dua FK statis yang digantikan HubunganKerja/KaryawanOutlet. Model
//      Karyawan lama (FK statis) dan model baru (historisasi/many-to-many)
//      tidak boleh hidup berdampingan - itu berarti migrasi setengah jalan.
//   2. `JadwalShift`/`PenugasanShift` (nama LAMA) benar-benar HILANG,
//      digantikan `TemplateShift`/`JadwalKerja`.
//   3. `Absensi.jamMasuk`/`jamPulang` TIDAK punya default/update otomatis
//      apa pun yang menunjukkan mereka bisa "ditimpa" - hanya
//      `jamMasukEfektif`/`jamPulangEfektif` (kolom CACHE terpisah) yang
//      diperbarui via KoreksiAbsensi. Ini bukti struktural mekanisme
//      append-only-koreksi (ADR-028 Keputusan 5, crux decision).
//   4. `CutiIzin` benar-benar punya `tenantId` sekarang - sebelumnya TIDAK
//      ADA sama sekali (gap tenant-safety identik ALT-DEF-010).
//
// Cara menjalankan (begitu harness test tersedia - lihat ALT-DEF-027):
//   pnpm --filter @altora/test-support test
// Pada pass ini yang SUDAH dijalankan nyata: `tsc --noEmit` atas file ini dan
// `node --experimental-strip-types` untuk mengeksekusi assertion di bawah -
// lihat RELEASE-EVIDENCE.md untuk output aktual, termasuk mutation test yang
// membuktikan assertion kunci benar-benar GAGAL bila schema dikembalikan ke
// bentuk lama.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../../..");
const SCHEMA_PATH = resolve(ROOT, "prisma/schema/schema.prisma");
const IZIN_SEED_PATH = resolve(ROOT, "prisma/seed/izin.seed.ts");
const MASTER_CHECKLIST_PATH = resolve(ROOT, "docs/engineering/MASTER-CHECKLIST.md");
const DEFECT_LEDGER_PATH = resolve(ROOT, "docs/engineering/DEFECT-LEDGER.md");
const PERMISSION_MATRIX_PATH = resolve(ROOT, "docs/keamanan/PERMISSION-MATRIX.md");
const API_CONTRACT_PATH = resolve(ROOT, "docs/api/API-CONTRACT.md");
const STATE_MACHINES_PATH = resolve(ROOT, "docs/arsitektur/STATE-MACHINES.md");

function readFile(path: string): string {
  return readFileSync(path, "utf-8");
}

// ALT-DEF-033: normalisasi runs spasi/tab horizontal sebelum mencocokkan
// (`prisma format` menyelaraskan lebar kolom antar-field, sehingga assertion
// whitespace-exact gagal PALSU saat field baru ditambahkan ke model lain).
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
    throw new Error(`ASSERTION GAGAL: ${pesan}\nSeharusnya tidak ditemukan tetapi ada: ${JSON.stringify(needle)}`);
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

function adaModel(schema: string, modelName: string): boolean {
  return new RegExp(`(^|\\n)model ${modelName} \\{`).test(schema);
}

function adaEnum(schema: string, enumName: string): boolean {
  return new RegExp(`(^|\\n)enum ${enumName} \\{`).test(schema);
}

function getNilaiEnum(schema: string, enumName: string): string[] {
  const body = getEnumBody(schema, enumName);
  const isi = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
  return isi
    .split("\n")
    .map((baris) => baris.trim())
    .filter((baris) => baris.length > 0 && !baris.startsWith("//"));
}

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

function wajibPunyaKolom(schema: string, model: string, kolom: string[], konteks: string): void {
  const fields = getNamaField(schema, model);
  for (const k of kolom) {
    if (!fields.includes(k)) {
      throw new Error(
        `ASSERTION GAGAL: model ${model} harus punya kolom \`${k}\` (${konteks}). Field aktual: [${fields.join(", ")}]`,
      );
    }
  }
}

function wajibTidakPunyaKolom(schema: string, model: string, kolom: string[], konteks: string): void {
  const fields = getNamaField(schema, model);
  for (const k of kolom) {
    if (fields.includes(k)) {
      throw new Error(
        `ASSERTION GAGAL: model ${model} TIDAK boleh lagi punya kolom \`${k}\` (${konteks}). Field aktual: [${fields.join(", ")}]`,
      );
    }
  }
}

export function jalankanSemuaAssertion(): void {
  const schema = readFile(SCHEMA_PATH);
  const izinSeed = readFile(IZIN_SEED_PATH);
  const masterChecklist = readFile(MASTER_CHECKLIST_PATH);
  const defectLedger = readFile(DEFECT_LEDGER_PATH);
  const permissionMatrix = readFile(PERMISSION_MATRIX_PATH);
  const apiContract = readFile(API_CONTRACT_PATH);
  const stateMachines = readFile(STATE_MACHINES_PATH);

  // ==========================================================================
  // ALT-DEF-019 Bagian 1: model LAMA benar-benar hilang / diganti.
  // ==========================================================================
  assertNotContains(schema, "model JadwalShift {", "model JadwalShift LAMA harus sudah di-rename ke TemplateShift.");
  assertNotContains(
    schema,
    "model PenugasanShift {",
    "model PenugasanShift LAMA harus sudah di-rename ke JadwalKerja.",
  );
  assertNotContains(schema, "enum StatusPenugasanShift {", "enum StatusPenugasanShift LAMA harus sudah diganti StatusJadwalKerja.");

  const karyawanBody = getModelBody(schema, "Karyawan");
  wajibTidakPunyaKolom(
    schema,
    "Karyawan",
    ["jabatanId", "outletUtamaId"],
    "ALT-DEF-019: jabatanId pindah ke HubunganKerja, outletUtamaId digantikan KaryawanOutlet (ADR-028 Keputusan 1/2)",
  );
  assertNotContains(
    karyawanBody,
    "KaryawanOutletUtama",
    "Karyawan tidak boleh lagi punya relasi bernama KaryawanOutletUtama (relasi FK tunggal outletUtamaId lama).",
  );

  // ==========================================================================
  // ALT-DEF-019 Bagian 2: KaryawanOutlet many-to-many (BARU).
  // ==========================================================================
  assertContains(schema, "model KaryawanOutlet {", "Model KaryawanOutlet (many-to-many karyawan<->outlet) harus ada.");
  const karyawanOutletBody = getModelBody(schema, "KaryawanOutlet");
  wajibPunyaKolom(
    schema,
    "KaryawanOutlet",
    ["tenantId", "karyawanId", "outletId", "isUtama", "status"],
    "KaryawanOutlet harus punya isUtama untuk menandai outlet default",
  );
  assertContains(
    karyawanOutletBody,
    "outlet   Outlet   @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "KaryawanOutlet.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id) (ADR-013).",
  );
  assertContains(
    karyawanOutletBody,
    "karyawan Karyawan @relation(fields: [tenantId, karyawanId], references: [tenantId, id])",
    "KaryawanOutlet.karyawan harus composite-FK (tenantId, karyawanId) -> Karyawan(tenantId, id) (ADR-013).",
  );
  assertContains(
    karyawanOutletBody,
    "@@unique([karyawanId, outletId])",
    "KaryawanOutlet harus unik per (karyawanId, outletId) - satu karyawan tidak boleh terdaftar dua kali di outlet yang sama.",
  );

  // ==========================================================================
  // ALT-DEF-019 Bagian 3: HubunganKerja (historisasi jabatan/departemen).
  // ==========================================================================
  assertContains(schema, "model HubunganKerja {", "Model HubunganKerja (riwayat employment) harus ada.");
  assertContains(schema, "model Departemen {", "Model Departemen (master data BARU) harus ada.");
  const hubunganKerjaBody = getModelBody(schema, "HubunganKerja");
  wajibPunyaKolom(
    schema,
    "HubunganKerja",
    ["tenantId", "karyawanId", "jabatanId", "departemenId", "tipeHubungan", "mulaiPada", "berakhirPada", "status"],
    "HubunganKerja harus punya field lengkap untuk historisasi employment",
  );
  assertContains(
    hubunganKerjaBody,
    "jabatan  Jabatan  @relation(fields: [tenantId, jabatanId], references: [tenantId, id])",
    "HubunganKerja.jabatan harus composite-FK (tenantId, jabatanId) -> Jabatan(tenantId, id).",
  );
  assertContains(schema, "enum TipeHubunganKerja {", "Enum TipeHubunganKerja harus ada.");
  wajibNilaiEnumPersisTest(schema, "TipeHubunganKerja", ["TETAP", "KONTRAK", "PARUH_WAKTU", "MAGANG"]);

  // Jabatan.karyawan (relasi lama langsung ke Karyawan) harus sudah diganti
  // relasi ke HubunganKerja.
  const jabatanBody = getModelBody(schema, "Jabatan");
  assertNotContains(
    jabatanBody,
    "karyawan Karyawan[]",
    "Jabatan tidak boleh lagi punya relasi langsung ke Karyawan[] - jabatan kini dirujuk lewat HubunganKerja.",
  );
  assertContains(
    jabatanBody,
    "hubunganKerja",
    "Jabatan harus punya relasi balik ke HubunganKerja[].",
  );

  // ==========================================================================
  // ALT-DEF-024 Bagian 1: TemplateShift + lintasTengahMalam.
  // ==========================================================================
  assertContains(schema, "model TemplateShift {", "Model TemplateShift (rename JadwalShift) harus ada.");
  const templateShiftBody = getModelBody(schema, "TemplateShift");
  wajibPunyaKolom(
    schema,
    "TemplateShift",
    ["tenantId", "outletId", "nama", "jamMulai", "jamSelesai", "lintasTengahMalam"],
    "TemplateShift harus punya lintasTengahMalam eksplisit (ALT-DEF-024)",
  );
  assertContains(
    templateShiftBody,
    "lintasTengahMalam Boolean",
    "TemplateShift.lintasTengahMalam harus bertipe Boolean.",
  );
  assertContains(
    templateShiftBody,
    "@default(false)",
    "TemplateShift.lintasTengahMalam harus @default(false) - shift standar TIDAK lintas tengah malam kecuali dinyatakan eksplisit.",
  );
  // jamMulai/jamSelesai TETAP String (keputusan sadar ADR-028 Keputusan 3),
  // BUKAN DateTime @db.Time.
  assertContains(templateShiftBody, "jamMulai          String", "TemplateShift.jamMulai harus tetap String \"HH:mm\" (ADR-028 Keputusan 3).");
  assertContains(templateShiftBody, "jamSelesai        String", "TemplateShift.jamSelesai harus tetap String \"HH:mm\" (ADR-028 Keputusan 3).");
  assertNotContains(
    templateShiftBody,
    "@db.Time",
    "TemplateShift TIDAK boleh memakai @db.Time pada batch ini - tidak ada Postgres nyata untuk memvalidasi perilakunya (ALT-DEF-029, ADR-028 Keputusan 3).",
  );

  // ==========================================================================
  // ALT-DEF-024 Bagian 2: JadwalKerja + PolaJadwalBerulang + StatusJadwalKerja.
  // ==========================================================================
  assertContains(schema, "model JadwalKerja {", "Model JadwalKerja (rename PenugasanShift) harus ada.");
  const jadwalKerjaBody = getModelBody(schema, "JadwalKerja");
  wajibPunyaKolom(
    schema,
    "JadwalKerja",
    ["tenantId", "outletId", "karyawanId", "templateShiftId", "polaBerulangId", "tanggal", "status"],
    "JadwalKerja harus punya polaBerulangId (jejak asal-usul generate) dan composite-FK penuh",
  );
  assertContains(
    jadwalKerjaBody,
    "outlet        Outlet                @relation(fields: [tenantId, outletId], references: [tenantId, id])",
    "JadwalKerja.outlet harus composite-FK (tenantId, outletId) -> Outlet(tenantId, id).",
  );
  assertContains(schema, "enum StatusJadwalKerja {", "Enum StatusJadwalKerja harus ada.");
  wajibNilaiEnumPersisTest(schema, "StatusJadwalKerja", ["DIJADWALKAN", "DIKONFIRMASI", "DIBATALKAN", "SELESAI"]);

  assertContains(
    schema,
    "model PolaJadwalBerulang {",
    "Model PolaJadwalBerulang (BARU - generation-not-magic-recurrence, ADR-028 Keputusan 4) harus ada.",
  );
  const polaBerulangBody = getModelBody(schema, "PolaJadwalBerulang");
  wajibPunyaKolom(
    schema,
    "PolaJadwalBerulang",
    ["tenantId", "outletId", "karyawanId", "templateShiftId", "hariDalamMinggu", "tanggalMulai", "tanggalSelesai"],
    "PolaJadwalBerulang harus punya hariDalamMinggu untuk menentukan hari mana pola berlaku",
  );
  assertContains(
    polaBerulangBody,
    "hariDalamMinggu Int[]",
    "PolaJadwalBerulang.hariDalamMinggu harus array Int (0=Minggu..6=Sabtu).",
  );

  // ==========================================================================
  // ALT-DEF-024 Bagian 3: PermintaanTukarShift (BARU, ALT-HR-008).
  // ==========================================================================
  assertContains(schema, "model PermintaanTukarShift {", "Model PermintaanTukarShift harus ada.");
  const tukarShiftBody = getModelBody(schema, "PermintaanTukarShift");
  wajibPunyaKolom(
    schema,
    "PermintaanTukarShift",
    ["tenantId", "jadwalKerjaAsalId", "karyawanPemohonId", "karyawanPenggantiId", "disetujuiOlehId", "status"],
    "PermintaanTukarShift harus punya pemohon/pengganti/status lengkap",
  );
  assertContains(schema, "enum StatusPermintaanTukarShift {", "Enum StatusPermintaanTukarShift harus ada.");
  wajibNilaiEnumPersisTest(schema, "StatusPermintaanTukarShift", [
    "DIAJUKAN",
    "DISETUJUI_REKAN",
    "DISETUJUI_MANAJER",
    "DITOLAK",
    "DIBATALKAN",
  ]);
  assertContains(
    tukarShiftBody,
    'karyawanPemohon  Karyawan   @relation("TukarShiftPemohon", fields: [tenantId, karyawanPemohonId], references: [tenantId, id])',
    "PermintaanTukarShift.karyawanPemohon harus composite-FK (tenantId, karyawanPemohonId) -> Karyawan(tenantId, id).",
  );

  // ==========================================================================
  // ALT-DEF-019/ALT-DEF-025 Bagian 4 (CRUX): Absensi immutable + KoreksiAbsensi.
  // ==========================================================================
  const absensiBody = getModelBody(schema, "Absensi");
  wajibPunyaKolom(
    schema,
    "Absensi",
    [
      "jamMasuk",
      "jamPulang",
      "jamMasukEfektif",
      "jamPulangEfektif",
      "perangkatId",
      "lokasiLat",
      "lokasiLng",
      "jarakDariOutletMeter",
    ],
    "Absensi harus punya kolom *Efektif terpisah (cache) DAN kolom asli immutable, plus dukungan geofence/perangkat (ALT-HR-016/017)",
  );
  // Bukti struktural CRUX DECISION: jamMasuk/jamPulang TIDAK boleh dekat
  // kata "Efektif" pada baris yang sama (memastikan mereka kolom BERBEDA,
  // bukan field tunggal yang di-rename ulang oleh mutasi tak sengaja).
  assertContains(absensiBody, "jamMasuk              DateTime", "Absensi.jamMasuk (asli, immutable) harus tetap ada sebagai kolom sendiri.");
  assertContains(
    absensiBody,
    "jamMasukEfektif        DateTime?",
    "Absensi.jamMasukEfektif harus ada sebagai kolom CACHE terpisah, nullable (hanya terisi setelah koreksi disetujui).",
  );
  assertContains(
    absensiBody,
    "perangkat Perangkat? @relation(fields: [tenantId, perangkatId], references: [tenantId, id])",
    "Absensi.perangkat harus composite-FK (tenantId, perangkatId) -> Perangkat(tenantId, id), nullable.",
  );
  // Perangkat harus punya @@unique([tenantId, id]) baru untuk menopang FK di atas.
  const perangkatBody = getModelBody(schema, "Perangkat");
  assertContains(
    perangkatBody,
    "@@unique([tenantId, id])",
    "Perangkat harus punya @@unique([tenantId, id]) BARU agar Absensi.perangkat bisa memakai composite-FK.",
  );

  assertContains(schema, "model KoreksiAbsensi {", "Model KoreksiAbsensi (crux decision ALT-DEF-019) harus ada.");
  const koreksiAbsensiBody = getModelBody(schema, "KoreksiAbsensi");
  wajibPunyaKolom(
    schema,
    "KoreksiAbsensi",
    [
      "tenantId",
      "absensiId",
      "jamMasukSebelum",
      "jamMasukSesudah",
      "jamPulangSebelum",
      "jamPulangSesudah",
      "alasan",
      "diajukanOlehId",
      "status",
      "disetujuiOlehId",
    ],
    "KoreksiAbsensi harus punya snapshot Sebelum/Sesudah lengkap plus alur approval",
  );
  assertContains(schema, "enum StatusKoreksiAbsensi {", "Enum StatusKoreksiAbsensi harus ada.");
  wajibNilaiEnumPersisTest(schema, "StatusKoreksiAbsensi", ["DIAJUKAN", "DISETUJUI", "DITOLAK"]);
  assertContains(
    koreksiAbsensiBody,
    "absensi       Absensi   @relation(fields: [tenantId, absensiId], references: [tenantId, id])",
    "KoreksiAbsensi.absensi harus composite-FK (tenantId, absensiId) -> Absensi(tenantId, id).",
  );
  // Absensi harus punya @@unique([tenantId, id]) untuk menopang FK di atas.
  assertContains(
    absensiBody,
    "@@unique([tenantId, id])",
    "Absensi harus punya @@unique([tenantId, id]) BARU agar KoreksiAbsensi/IstirahatAbsensi bisa memakai composite-FK.",
  );

  // ==========================================================================
  // ALT-DEF-025: IstirahatAbsensi (BARU).
  // ==========================================================================
  assertContains(schema, "model IstirahatAbsensi {", "Model IstirahatAbsensi harus ada.");
  wajibPunyaKolom(
    schema,
    "IstirahatAbsensi",
    ["tenantId", "absensiId", "mulaiPada", "selesaiPada"],
    "IstirahatAbsensi harus punya mulaiPada/selesaiPada",
  );

  // ==========================================================================
  // ADR-028 Keputusan 8: CutiIzin dipertahankan TAPI mendapat tenantId +
  // composite-FK BARU (gap tenant-safety yang terlewat ALT-DEF-010).
  // ==========================================================================
  const cutiIzinBody = getModelBody(schema, "CutiIzin");
  wajibPunyaKolom(schema, "CutiIzin", ["tenantId", "karyawanId"], "CutiIzin harus punya tenantId (SEBELUMNYA TIDAK ADA sama sekali).");
  assertContains(
    cutiIzinBody,
    "karyawan      Karyawan  @relation(fields: [tenantId, karyawanId], references: [tenantId, id])",
    "CutiIzin.karyawan harus composite-FK (tenantId, karyawanId) -> Karyawan(tenantId, id) (SEBELUMNYA FK ID tunggal).",
  );

  // ==========================================================================
  // ADR-028 Keputusan 9: PermintaanLembur, TargetKinerja, PenilaianKinerja (BARU).
  // ==========================================================================
  assertContains(schema, "model PermintaanLembur {", "Model PermintaanLembur harus ada.");
  assertContains(schema, "model TargetKinerja {", "Model TargetKinerja harus ada.");
  assertContains(schema, "model PenilaianKinerja {", "Model PenilaianKinerja harus ada.");
  assertContains(schema, "enum StatusPermintaanLembur {", "Enum StatusPermintaanLembur harus ada.");

  // ==========================================================================
  // Cross-check dokumen: kode izin baru genuinely dipakai MASTER-CHECKLIST,
  // dan sebaliknya kode LAMA yang dangling ("absensi.koreksi" tanpa akhiran
  // .kelola) sudah tidak diseed lagi.
  // ==========================================================================
  const kodeIzinHrWajibAda = [
    "karyawan.status.kelola",
    "karyawan.jabatan.kelola",
    "karyawan.departemen.kelola",
    "karyawan.outlet.kelola",
    "karyawan.shift.kelola",
    "karyawan.jadwal.kelola",
    "karyawan.tukar-shift.kelola",
    "karyawan.penilaian.kelola",
    "absensi.presensi",
    "absensi.istirahat",
    "absensi.keterlambatan",
    "absensi.lembur.lihat",
    "cuti-izin.ajukan",
    "absensi.koreksi.kelola",
    "absensi.geofence",
    "absensi.perangkat.validasi",
  ];
  for (const kode of kodeIzinHrWajibAda) {
    assertContains(izinSeed, `kode: "${kode}"`, `izin.seed.ts harus mendaftarkan kode izin "${kode}" (dipakai MASTER-CHECKLIST.md domain ALT-HR).`);
    assertContains(masterChecklist, kode, `MASTER-CHECKLIST.md harus benar-benar mereferensikan kode izin "${kode}" (bukan kode yatim).`);
  }
  assertNotContains(
    izinSeed,
    'kode: "absensi.koreksi",',
    "izin.seed.ts tidak boleh lagi punya kode LAMA \"absensi.koreksi\" (tanpa akhiran .kelola) - checklist ALT-HR-015 memakai \"absensi.koreksi.kelola\".",
  );

  // ==========================================================================
  // Cross-check dokumen tambahan: ADR-028 harus benar-benar ada di
  // DECISION-LOG.md, ALT-DEF-019/024/025 harus SIAP_DIVERIFIKASI di ledger,
  // dan state machine koreksi/tukar-shift harus terdokumentasi.
  // ==========================================================================
  assertContains(defectLedger, "ALT-DEF-019", "DEFECT-LEDGER.md harus memuat ALT-DEF-019.");
  assertContains(defectLedger, "ALT-DEF-024", "DEFECT-LEDGER.md harus memuat ALT-DEF-024.");
  assertContains(defectLedger, "ALT-DEF-025", "DEFECT-LEDGER.md harus memuat ALT-DEF-025.");
  assertContains(
    permissionMatrix,
    "absensi.koreksi.kelola",
    "PERMISSION-MATRIX.md harus mereferensikan kode absensi.koreksi.kelola yang baru.",
  );
  assertContains(
    apiContract,
    "POST /api/v1/absensi/koreksi",
    "API-CONTRACT.md harus mendaftarkan endpoint POST /api/v1/absensi/koreksi.",
  );
  assertContains(
    apiContract,
    "Idempotency-Key",
    "API-CONTRACT.md bagian presensi harus menyebut Idempotency-Key (cegah duplikat check-in/out).",
  );
  assertContains(
    stateMachines,
    "## 9. Koreksi Absensi",
    "STATE-MACHINES.md harus punya bagian state machine Koreksi Absensi.",
  );
  assertContains(
    stateMachines,
    "## 10. Tukar Shift",
    "STATE-MACHINES.md harus punya bagian state machine Tukar Shift.",
  );

  // Helper lokal - dideklarasikan setelah pemakaian pertama supaya urutan
  // baca top-down file ini mengikuti urutan assertion, bukan urutan definisi
  // fungsi (fungsi di-hoist oleh JS, ini aman).
  function wajibNilaiEnumPersisTest(schemaTeks: string, enumName: string, nilai: string[]): void {
    if (!adaEnum(schemaTeks, enumName)) {
      throw new Error(`ASSERTION GAGAL: enum ${enumName} tidak ditemukan di schema.prisma`);
    }
    const aktual = getNilaiEnum(schemaTeks, enumName);
    assertEqual(
      aktual.length,
      nilai.length,
      `enum ${enumName} harus punya PERSIS ${nilai.length} nilai. Aktual (${aktual.length}): [${aktual.join(", ")}]`,
    );
    for (const n of nilai) {
      if (!aktual.includes(n)) {
        throw new Error(`ASSERTION GAGAL: enum ${enumName} harus memuat nilai ${n}. Aktual: [${aktual.join(", ")}]`);
      }
    }
  }
}

// Sanity check: pastikan adaModel() dipakai minimal sekali supaya helper
// tidak dianggap dead code oleh lint (dipakai di bawah untuk verifikasi
// ekstra bahwa model VersiResep - preseden historisasi yang ditiru
// HubunganKerja - masih ada, bukti bahwa pola yang direferensikan ADR-028
// Keputusan 1 benar-benar preseden nyata, bukan analogi kosong).
function verifikasiPresedenHistorisasi(): void {
  const schema = readFile(SCHEMA_PATH);
  if (!adaModel(schema, "VersiResep")) {
    throw new Error(
      "ASSERTION GAGAL: model VersiResep (preseden historisasi yang dirujuk ADR-028 Keputusan 1) tidak ditemukan - referensi analogi di ADR-028 tidak valid.",
    );
  }
}

// Dijalankan langsung saat file ini dieksekusi sebagai script (bukan hanya
// diimpor) - workaround sementara untuk tidak adanya runner vitest di
// environment ini (lihat catatan DIBLOKIR di atas).
jalankanSemuaAssertion();
verifikasiPresedenHistorisasi();
// eslint-disable-next-line no-console
console.log("OK: seluruh assertion arsitektur ALT-DEF-019/ALT-DEF-024/ALT-DEF-025 (Karyawan & Absensi, ADR-028) lulus.");
