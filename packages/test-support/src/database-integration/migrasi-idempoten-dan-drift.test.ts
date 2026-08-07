// Test database-integration untuk ADR-041 (batch konsolidasi audit cakupan
// konkurensi) - melengkapi DUA skenario Migrasi yang DIMINTA instruksi
// correction-loop asli tapi sebelumnya HANYA diverifikasi manual dan dicatat
// naratif di RELEASE-EVIDENCE.md (tidak pernah ada test otomatis untuk
// keduanya) - lihat audit lengkap di
// docs/engineering/AUDIT-CONCURRENCY-COVERAGE.md:
//
//   1. "Migrasi kedua tidak mengubah schema diam-diam" - menjalankan
//      `prisma migrate deploy` terhadap database yang SUDAH bermigrasi penuh
//      (altora_resto_dev, bukan database kosong - itu skenario BEDA yang
//      sudah dicek manual tiap batch lewat DROP+CREATE+deploy) HARUS no-op:
//      exit code 0, output eksplisit "No pending migrations to apply.", DAN
//      hash migration terapan yang tercatat di tabel `_prisma_migrations`
//      TIDAK berubah sama sekali sebelum/sesudah dijalankan dua kali.
//   2. "Prisma drift detection bersih" - `prisma migrate diff` antara skema
//      live (`--from-schema-datasource`) dan datamodel resmi
//      (`--to-schema-datamodel`) HARUS menghasilkan skrip migrasi KOSONG
//      ("This is an empty migration.") - membuktikan tidak ada drift antara
//      apa yang benar-benar ada di Postgres vs apa yang schema.prisma
//      klaim. Ini CEK BERBEDA dari #1 (migrate deploy sukses TIDAK
//      membuktikan tidak ada drift - migrate deploy hanya melihat migration
//      history yang SUDAH diterapkan, bukan membandingkan struktur nyata
//      lawan datamodel saat ini).
//
// Menjalankan proses `prisma` NYATA lewat child_process (bukan hanya membaca
// dokumentasi/RELEASE-EVIDENCE.md) - membutuhkan DATABASE_URL yang sama
// dengan seluruh test database-integration lain (altora_resto_dev yang
// SUDAH bermigrasi penuh, BUKAN database kosong).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/migrasi-idempoten-dan-drift.test.ts

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertTrue, DATABASE_URL, ROOT } from "./_pg-helper"
import pg from "pg";

const PRISMA_BIN = resolve(ROOT, "node_modules/.bin/prisma");
const SCHEMA_PATH = resolve(ROOT, "prisma/schema/schema.prisma");

function runPrisma(args: string[]): { stdout: string; code: number } {
  try {
    const stdout = execFileSync(PRISMA_BIN, args, {
      cwd: ROOT,
      encoding: "utf-8",
      env: { ...process.env, DATABASE_URL },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; status?: number };
    return { stdout: String(e.stdout ?? ""), code: e.status ?? 1 };
  }
}

async function getMigrationHashes(): Promise<Array<{ migration_name: string; checksum: string; finished_at: unknown }>> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const res = await pool.query(
      `SELECT migration_name, checksum, finished_at FROM _prisma_migrations ORDER BY migration_name`,
    );
    return res.rows as Array<{ migration_name: string; checksum: string; finished_at: unknown }>;
  } finally {
    await pool.end();
  }
}

async function testMigrateDeployKeduaTidakMengubahApaPun(): Promise<void> {
  assertTrue(existsSync(PRISMA_BIN), `Binary prisma harus ada di ${PRISMA_BIN}.`);

  const hashSebelum = await getMigrationHashes();
  assertTrue(
    hashSebelum.length >= 14,
    `Database harus sudah punya minimal 14 migrasi resmi TERCATAT sebelum test ini (ALT-DEF ledger menyebut ~14), dapat ${hashSebelum.length}.`,
  );

  // Jalankan `migrate deploy` DUA KALI berturut-turut terhadap database yang
  // SUDAH bermigrasi penuh - keduanya harus sama-sama no-op (bukan hanya
  // yang kedua).
  const run1 = runPrisma(["migrate", "deploy", `--schema=${SCHEMA_PATH}`]);
  assertTrue(run1.code === 0, `Deploy pertama (kontrol - DB sudah bermigrasi) harus exit 0, dapat ${run1.code}. Output: ${run1.stdout}`);
  assertTrue(
    /No pending migrations to apply/i.test(run1.stdout),
    `Deploy pertama harus melaporkan "No pending migrations to apply", dapat: ${run1.stdout}`,
  );

  const hashSetelahRun1 = await getMigrationHashes();

  const run2 = runPrisma(["migrate", "deploy", `--schema=${SCHEMA_PATH}`]);
  assertTrue(run2.code === 0, `Deploy KEDUA harus exit 0 (no-op), dapat ${run2.code}. Output: ${run2.stdout}`);
  assertTrue(
    /No pending migrations to apply/i.test(run2.stdout),
    `Deploy KEDUA harus SECARA EKSPLISIT melaporkan "No pending migrations to apply" (bukti idempotency, bukan hanya exit 0), dapat: ${run2.stdout}`,
  );

  const hashSetelahRun2 = await getMigrationHashes();

  assertTrue(
    hashSetelahRun1.length === hashSebelum.length && hashSetelahRun2.length === hashSebelum.length,
    `Jumlah baris _prisma_migrations TIDAK BOLEH berubah oleh deploy kedua/ketiga (no migrasi baru diam-diam ditambahkan), dapat sebelum=${hashSebelum.length} setelah1=${hashSetelahRun1.length} setelah2=${hashSetelahRun2.length}.`,
  );
  assertTrue(
    JSON.stringify(hashSebelum) === JSON.stringify(hashSetelahRun1) &&
      JSON.stringify(hashSetelahRun1) === JSON.stringify(hashSetelahRun2),
    `CRUX: checksum/migration_name/finished_at SETIAP baris _prisma_migrations HARUS identik persis sebelum dan sesudah dua kali "migrate deploy" berturut-turut ke database yang sudah bermigrasi - deploy kedua TIDAK BOLEH mengubah schema secara diam-diam (tidak ada re-apply, tidak ada checksum baru, tidak ada baris hilang/bertambah).`,
  );

  // eslint-disable-next-line no-console
  console.log(
    `  -> (1) "migrate deploy" dijalankan DUA KALI ke database yang sudah bermigrasi penuh (${hashSebelum.length} migrasi): KEDUANYA no-op, _prisma_migrations TIDAK BERUBAH sama sekali - MIGRASI KEDUA TIDAK MENGUBAH SCHEMA DIAM-DIAM.`,
  );
}

async function testDriftDetectionBersih(): Promise<void> {
  // `migrate diff` antara skema LIVE (live altora_resto_dev, sudah
  // bermigrasi penuh) dan datamodel resmi (schema.prisma) - kalau ADA drift
  // (kolom/index/trigger yang ada di DB tapi tidak diklaim schema.prisma
  // atau sebaliknya), --script akan mencetak statement ALTER/DROP/CREATE
  // NYATA. Skrip KOSONG ("This is an empty migration.") adalah bukti
  // TIDAK ADA drift sama sekali.
  const diff = runPrisma([
    "migrate",
    "diff",
    `--from-schema-datasource=${SCHEMA_PATH}`,
    `--to-schema-datamodel=${SCHEMA_PATH}`,
    "--script",
  ]);
  assertTrue(diff.code === 0, `\`prisma migrate diff\` harus exit 0, dapat ${diff.code}. Output: ${diff.stdout}`);
  assertTrue(
    /This is an empty migration/i.test(diff.stdout),
    `CRUX: drift detection HARUS bersih - \`prisma migrate diff\` dari live database ke schema.prisma HARUS menghasilkan "This is an empty migration." (tidak ada statement ALTER/DROP/CREATE), dapat: ${diff.stdout}`,
  );
  assertTrue(
    !/^(ALTER|DROP|CREATE)\s/im.test(diff.stdout.replace(/^--.*$/gm, "").trim()),
    `Skrip diff (setelah baris komentar dibuang) TIDAK BOLEH memuat statement DDL apa pun, dapat: ${diff.stdout}`,
  );

  // eslint-disable-next-line no-console
  console.log(
    "  -> (2) `prisma migrate diff` (live database <-> schema.prisma): KOSONG, tidak ada drift - PRISMA DRIFT DETECTION BERSIH.",
  );
}

async function testMigrateStatusJugaMelaporkanUpToDate(): Promise<void> {
  const status = runPrisma(["migrate", "status", `--schema=${SCHEMA_PATH}`]);
  assertTrue(status.code === 0, `\`prisma migrate status\` harus exit 0, dapat ${status.code}. Output: ${status.stdout}`);
  assertTrue(
    /Database schema is up to date/i.test(status.stdout),
    `\`prisma migrate status\` harus melaporkan "Database schema is up to date!", dapat: ${status.stdout}`,
  );
  // eslint-disable-next-line no-console
  console.log("  -> (bonus) `prisma migrate status`: up to date - konsisten dengan (1) dan (2) di atas.");
}

async function main(): Promise<void> {
  await testMigrateDeployKeduaTidakMengubahApaPun();
  await testDriftDetectionBersih();
  await testMigrateStatusJugaMelaporkanUpToDate();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-041 (migrate deploy kedua no-op verified via _prisma_migrations checksum stability + prisma migrate diff drift-detection bersih) lulus.",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
