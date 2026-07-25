// Test database-integration untuk ALT-PSD-004 / ADR-023 Keputusan 3 / ALT-DEF-044.
// Menyambung ke Postgres nyata.
//
//   EXISTENCE + BEHAVIORAL: partial unique index `stok_bahan_agregat_gudang_unik`
//   dan `stok_opname_baris_agregat_gudang_unik` di pg_indexes - dua baris StokBahan
//   agregat level-gudang (lokasiStokId NULL) untuk pasangan (gudangId, bahanId) yang
//   sama -> ditolak.
//
// CATATAN ADR-032: seluruh assertion append-only/pembalik `mutasi_stok` yang
// SEBELUMNYA ada di file ini (trigger `trg_mutasi_stok_append_only`/
// `trg_mutasi_stok_validasi_pembalik`, fungsi `mutasi_stok_tolak_ubah`/
// `mutasi_stok_validasi_pembalik`, kolom `dibalikOlehId`) DIPINDAHKAN dan
// DIPERLUAS ke `ledger-reversal-membalik-invariants.test.ts` sebagai bagian
// redesain pola reversal (kolom `membalikMutasiId` + fungsi generik
// `ledger_tolak_ubah`/`ledger_validasi_pembalik` yang dipakai bersama SELURUH
// ledger, bukan lagi khusus mutasi_stok) - lihat ADR-032. File ini TIDAK LAGI
// menguji mutasi_stok append-only/pembalik untuk menghindari duplikasi test
// terhadap desain yang sudah tidak ada.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/persediaan-stok-invariants.test.ts

import { assertTrue, createBaseFixtures, expectReject, fixtureId, withTransaction, DATABASE_URL } from "./_pg-helper.js";
import pg from "pg";

async function testObjectsExist(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const idx = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE indexname IN ('stok_bahan_agregat_gudang_unik', 'stok_opname_baris_agregat_gudang_unik')
       ORDER BY indexname`,
    );
    assertTrue(idx.rowCount === 2, `Kedua partial unique index harus ada, dapat ${idx.rowCount} baris.`);
    for (const row of idx.rows) {
      assertTrue(
        (row.indexdef as string).includes('"lokasiStokId" IS NULL'),
        `${row.indexname} harus partial WHERE "lokasiStokId" IS NULL, dapat: ${row.indexdef}`,
      );
    }
    // Trigger append-only/pembalik mutasi_stok kini diuji di
    // ledger-reversal-membalik-invariants.test.ts (ADR-032) - lihat catatan file.
  } finally {
    await pool.end();
  }
}

async function testStokBahanAgregatUnik(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    await client.query(
      `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
       VALUES ($1, $2, $3, $4, NULL, 10, 0, now())`,
      [fixtureId("stokbahan"), fx.tenantId, fx.gudangId, fx.bahanId],
    );
    const msg = await expectReject(client, "Baris StokBahan agregat kedua (lokasiStokId NULL) untuk gudang+bahan yang sama", () =>
      client.query(
        `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
         VALUES ($1, $2, $3, $4, NULL, 5, 0, now())`,
        [fixtureId("stokbahan"), fx.tenantId, fx.gudangId, fx.bahanId],
      ),
    );
    assertTrue(
      /duplicate key|unique constraint|stok_bahan_agregat_gudang_unik/i.test(msg),
      `error harus dari unique index stok_bahan_agregat_gudang_unik, dapat: ${msg}`,
    );
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testStokBahanAgregatUnik();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ALT-PSD-004 (stok agregat unik per gudang). Append-only/pembalik mutasi_stok kini diuji di ledger-reversal-membalik-invariants.test.ts (ADR-032).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
