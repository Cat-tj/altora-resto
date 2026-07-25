// Helper bersama untuk test database-integration (ALT-DEF-044 batch 6).
//
// BERBEDA dari test di ../architecture/: file-file di sini KONEK ke Postgres
// NYATA (DATABASE_URL dari .env / process.env) dan memverifikasi bahwa object
// database (partial unique index, CHECK constraint, trigger function) yang
// difold ke migrasi resmi
// prisma/schema/migrations/20260725154310_harden_manual_invariants/migration.sql
// BENAR-BENAR ada dan BENAR-BENAR menegakkan aturannya - bukan hanya
// "diklaim ada" di teks SQL (itu tugas test arsitektur).
//
// KEBERSIHAN DATA: setiap test membungkus fixture + assertion dalam SATU
// transaksi Postgres (BEGIN ... ROLLBACK) lewat withTransaction() di bawah -
// TIDAK ADA baris fixture yang pernah benar-benar di-COMMIT ke
// altora_resto_dev. Ini dipilih dibanding DELETE eksplisit di finally karena:
//   (a) lebih aman terhadap sisa data bila assertion melempar exception di
//       tengah jalan (ROLLBACK selalu membersihkan semuanya, DELETE manual
//       bisa terlewat kalau urutan FK salah / exception sebelum DELETE),
//   (b) trigger append-only/pembalik di mutasi_stok justru butuh diuji dari
//       DALAM transaksi yang sama supaya urutan INSERT/UPDATE terlihat oleh
//       trigger persis seperti yang akan terjadi di service layer nyata.
// Pakai SAVEPOINT (lewat expectReject()) untuk menguji statement yang
// SEHARUSNYA gagal tanpa membatalkan seluruh transaksi test.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "../../../..");

function loadDatabaseUrl(): string {
  if (process.env["DATABASE_URL"]) {
    return process.env["DATABASE_URL"];
  }
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) {
    throw new Error(
      `DATABASE_URL tidak ada di process.env dan ${envPath} tidak ditemukan. ` +
        "Test database-integration butuh Postgres nyata (lihat .env.example).",
    );
  }
  const raw = readFileSync(envPath, "utf-8");
  const match = raw.match(/^DATABASE_URL\s*=\s*"([^"]+)"/m);
  if (!match || !match[1]) {
    throw new Error(`DATABASE_URL tidak ditemukan di ${envPath}.`);
  }
  return match[1];
}

export const DATABASE_URL = loadDatabaseUrl();

let idCounter = 0;
/** ID unik ringan untuk fixture (bukan ULID asli - test tidak butuh format ULID nyata). */
export function fixtureId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export class Assertion extends Error {}

export function assertTrue(cond: boolean, message: string): void {
  if (!cond) {
    throw new Assertion(`ASSERTION GAGAL: ${message}`);
  }
}

/**
 * Menjalankan `fn` di dalam satu transaksi yang SELALU di-ROLLBACK di akhir
 * (baik sukses maupun gagal) - lihat catatan kebersihan data di atas.
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      return await fn(client);
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Menjalankan `fn` (statement yang DIHARAPKAN gagal) di dalam SAVEPOINT, lalu
 * ROLLBACK TO SAVEPOINT supaya transaksi test bisa lanjut. Melempar Assertion
 * bila `fn` justru BERHASIL (tidak melempar). Mengembalikan pesan error asli
 * Postgres untuk pengecekan tambahan (mis. memastikan pesan menyebut nama
 * trigger/constraint yang benar, bukan gagal karena alasan lain).
 */
export async function expectReject(
  client: pg.PoolClient,
  label: string,
  fn: () => Promise<unknown>,
): Promise<string> {
  await client.query("SAVEPOINT sp_expect_reject");
  try {
    await fn();
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT sp_expect_reject");
    return err instanceof Error ? err.message : String(err);
  }
  await client.query("ROLLBACK TO SAVEPOINT sp_expect_reject");
  throw new Assertion(
    `ASSERTION GAGAL: "${label}" SEHARUSNYA ditolak Postgres tapi berhasil tanpa error.`,
  );
}

/** Fixture minimal: tenant, outlet, gudang, satuan, bahan, pengguna. */
export interface Fixtures {
  tenantId: string;
  outletId: string;
  gudangId: string;
  satuanId: string;
  bahanId: string;
  penggunaId: string;
}

/** Fixture keanggotaan: tenant, pelanggan, tier, keanggotaan - untuk test ledger
 * PoinRiwayat/LedgerStempel. Independen dari `createBaseFixtures` (domain persediaan)
 * karena keduanya butuh master data yang berbeda sama sekali.
 */
export interface KeanggotaanFixtures {
  tenantId: string;
  pelangganId: string;
  tierKeanggotaanId: string;
  keanggotaanId: string;
}

export async function createKeanggotaanFixtures(client: pg.PoolClient): Promise<KeanggotaanFixtures> {
  const tenantId = fixtureId("tenant");
  const pelangganId = fixtureId("pelanggan");
  const tierKeanggotaanId = fixtureId("tier");
  const keanggotaanId = fixtureId("keanggotaan");

  await client.query(
    `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
    [tenantId, `Tenant ${tenantId}`, tenantId],
  );
  await client.query(
    `INSERT INTO pelanggan (id, "tenantId", "namaLengkap", "nomorTelepon", status, "saldoTokoCache", "createdAt")
     VALUES ($1, $2, 'Pelanggan Uji', $3, 'AKTIF', 0, now())`,
    [pelangganId, tenantId, pelangganId.slice(0, 12)],
  );
  await client.query(
    `INSERT INTO tier_keanggotaan (id, "tenantId", nama, "minPoinKumulatif", benefit)
     VALUES ($1, $2, 'Tier Uji', 0, '{}'::jsonb)`,
    [tierKeanggotaanId, tenantId],
  );
  await client.query(
    `INSERT INTO keanggotaan (id, "tenantId", "pelangganId", "tierKeanggotaanId", "poinAktif", "poinKumulatif", status, "bergabungPada")
     VALUES ($1, $2, $3, $4, 0, 0, 'AKTIF', now())`,
    [keanggotaanId, tenantId, pelangganId, tierKeanggotaanId],
  );

  return { tenantId, pelangganId, tierKeanggotaanId, keanggotaanId };
}

/** Pelanggan tambahan di tenant yang SAMA - untuk test mismatch pelangganId (LedgerSaldoToko). */
export async function createPelangganTambahan(client: pg.PoolClient, tenantId: string): Promise<string> {
  const pelangganId = fixtureId("pelanggan2");
  await client.query(
    `INSERT INTO pelanggan (id, "tenantId", "namaLengkap", "nomorTelepon", status, "saldoTokoCache", "createdAt")
     VALUES ($1, $2, 'Pelanggan Uji 2', $3, 'AKTIF', 0, now())`,
    [pelangganId, tenantId, pelangganId.slice(0, 12)],
  );
  return pelangganId;
}

/** Tenant kedua (independen) - untuk test mismatch tenantId lintas ledger. */
export async function createTenantTambahan(client: pg.PoolClient): Promise<string> {
  const tenantId = fixtureId("tenant2");
  await client.query(
    `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
    [tenantId, `Tenant ${tenantId}`, tenantId],
  );
  return tenantId;
}

export async function createBaseFixtures(client: pg.PoolClient): Promise<Fixtures> {
  const tenantId = fixtureId("tenant");
  const outletId = fixtureId("outlet");
  const gudangId = fixtureId("gudang");
  const satuanId = fixtureId("satuan");
  const bahanId = fixtureId("bahan");
  const penggunaId = fixtureId("pengguna");

  await client.query(
    `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
    [tenantId, `Tenant ${tenantId}`, tenantId],
  );
  await client.query(
    `INSERT INTO outlet (id, "tenantId", nama, kode, "zonaWaktu", status, "createdAt")
     VALUES ($1, $2, $3, $4, 'Asia/Jakarta', 'AKTIF', now())`,
    [outletId, tenantId, `Outlet ${outletId}`, outletId.slice(0, 10)],
  );
  await client.query(
    `INSERT INTO gudang (id, "tenantId", "outletId", nama, status) VALUES ($1, $2, $3, $4, 'AKTIF')`,
    [gudangId, tenantId, outletId, `Gudang ${gudangId}`],
  );
  await client.query(
    `INSERT INTO satuan (id, "tenantId", nama, simbol) VALUES ($1, $2, 'Kilogram', 'kg')`,
    [satuanId, tenantId],
  );
  await client.query(
    `INSERT INTO bahan (id, "tenantId", nama, "kodeSku", "satuanDasarId", jenis, "stokMinimum", status)
     VALUES ($1, $2, $3, $4, $5, 'BAHAN_BAKU', 0, 'AKTIF')`,
    [bahanId, tenantId, `Bahan ${bahanId}`, bahanId.slice(0, 10), satuanId],
  );
  await client.query(
    `INSERT INTO pengguna (id, "namaLengkap", email, status, "jumlahPercobaanGagal", "createdAt", "updatedAt")
     VALUES ($1, 'Pengguna Uji', $2, 'AKTIF', 0, now(), now())`,
    [penggunaId, `${penggunaId}@example.test`],
  );

  return { tenantId, outletId, gudangId, satuanId, bahanId, penggunaId };
}
