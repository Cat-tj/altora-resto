// Test database-integration untuk ALT-PSD-004/005/006/007 / ADR-023 Keputusan
// 1, 3, 5 / ALT-DEF-044. Menyambung ke Postgres nyata.
//
//   1. EXISTENCE: partial unique index `stok_bahan_agregat_gudang_unik` dan
//      `stok_opname_baris_agregat_gudang_unik` di pg_indexes; kedua trigger
//      (`trg_mutasi_stok_append_only`, `trg_mutasi_stok_validasi_pembalik`)
//      dan kedua trigger function-nya di pg_trigger/pg_proc.
//   2. BEHAVIORAL:
//      - Dua baris StokBahan agregat level-gudang (lokasiStokId NULL) untuk
//        pasangan (gudangId, bahanId) yang sama -> ditolak.
//      - UPDATE kolom `jumlah` pada mutasi_stok -> ditolak (append-only).
//      - DELETE pada mutasi_stok -> ditolak (append-only).
//      - UPDATE yang HANYA mengisi "dibalikOlehId" dari NULL -> DITERIMA.
//      - Mutasi pembalik dengan jumlah TIDAK berlawanan tanda -> ditolak.
//      - Rantai pembalik-dari-pembalik (A<-B, lalu B<-C) -> ditolak - ini
//        BUG FIX dari audit ALT-DEF-044 (lihat ADR-031); sebelum perbaikan,
//        kasus ini LOLOS tanpa error.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/persediaan-stok-invariants.test.ts

import {
  assertTrue,
  createBaseFixtures,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
  type Fixtures,
} from "./_pg-helper.js";
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

    const trg = await pool.query(
      `SELECT t.tgname, p.proname FROM pg_trigger t
       JOIN pg_proc p ON t.tgfoid = p.oid
       WHERE t.tgrelid = 'mutasi_stok'::regclass AND NOT t.tgisinternal
       ORDER BY t.tgname`,
    );
    assertTrue(trg.rowCount === 2, `Harus ada persis dua trigger non-internal di mutasi_stok, dapat ${trg.rowCount}.`);
    const names = trg.rows.map((r) => r.tgname).sort();
    assertTrue(
      JSON.stringify(names) === JSON.stringify(["trg_mutasi_stok_append_only", "trg_mutasi_stok_validasi_pembalik"]),
      `Nama trigger tidak sesuai, dapat: ${names.join(", ")}`,
    );
    const funcs = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname IN ('mutasi_stok_tolak_ubah', 'mutasi_stok_validasi_pembalik')`,
    );
    assertTrue(funcs.rowCount === 2, `Kedua trigger function harus ada, dapat ${funcs.rowCount}.`);
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

async function insertMutasi(
  client: pg.PoolClient,
  fx: Fixtures,
  opts: { jumlah: number; jenis: string; referensiJenis: string; id?: string },
): Promise<string> {
  const id = opts.id ?? fixtureId("mutasi");
  await client.query(
    `INSERT INTO mutasi_stok
       (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", "dibuatOlehId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
    [id, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, opts.jenis, opts.jumlah, opts.referensiJenis, fixtureId("ref"), fx.penggunaId],
  );
  return id;
}

async function testAppendOnly(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const mA = await insertMutasi(client, fx, { jumlah: 10, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });

    const msgUpdate = await expectReject(client, "UPDATE kolom jumlah pada mutasi_stok", () =>
      client.query(`UPDATE mutasi_stok SET jumlah = 999 WHERE id = $1`, [mA]),
    );
    assertTrue(
      /append-only/i.test(msgUpdate),
      `error UPDATE harus menyebut append-only, dapat: ${msgUpdate}`,
    );

    const msgDelete = await expectReject(client, "DELETE pada mutasi_stok", () =>
      client.query(`DELETE FROM mutasi_stok WHERE id = $1`, [mA]),
    );
    assertTrue(
      /append-only/i.test(msgDelete),
      `error DELETE harus menyebut append-only, dapat: ${msgDelete}`,
    );
  });
}

async function testPembalikKesepadanan(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const mA = await insertMutasi(client, fx, { jumlah: 10, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });

    // Pembalik dengan jumlah SALAH (bukan -10) harus ditolak.
    const mSalah = await insertMutasi(client, fx, { jumlah: -7, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });
    const msgSalah = await expectReject(client, "Mutasi pembalik dengan jumlah tidak berlawanan tanda", () =>
      client.query(`UPDATE mutasi_stok SET "dibalikOlehId" = $1 WHERE id = $2`, [mSalah, mA]),
    );
    assertTrue(
      /harus berjumlah/i.test(msgSalah),
      `error harus menyebut ketidaksepadanan jumlah, dapat: ${msgSalah}`,
    );

    // Pembalik yang BENAR (-10) harus diterima.
    const mB = await insertMutasi(client, fx, { jumlah: -10, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });
    await client.query(`UPDATE mutasi_stok SET "dibalikOlehId" = $1 WHERE id = $2`, [mB, mA]);
    const cekA = await client.query(`SELECT "dibalikOlehId" FROM mutasi_stok WHERE id = $1`, [mA]);
    assertTrue(cekA.rows[0].dibalikOlehId === mB, "mA.dibalikOlehId harus terisi mB setelah UPDATE yang sah.");

    // Rantai pembalik-dari-pembalik: mB (yang membalik mA) dicoba dibalik lagi
    // oleh mC. INI BUG FIX ALT-DEF-044/ADR-031 - sebelum perbaikan trigger,
    // UPDATE ini LOLOS tanpa error; sekarang HARUS ditolak.
    const mC = await insertMutasi(client, fx, { jumlah: 10, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });
    const msgRantai = await expectReject(client, "Rantai pembalik-dari-pembalik (membalik mutasi yang sudah menjadi pembalik)", () =>
      client.query(`UPDATE mutasi_stok SET "dibalikOlehId" = $1 WHERE id = $2`, [mC, mB]),
    );
    assertTrue(
      /rantai pembalik-dari-pembalik/i.test(msgRantai),
      `error harus menyebut rantai pembalik-dari-pembalik, dapat: ${msgRantai}`,
    );

    // Mismatch bahan: mutasi asal (mDx) atas fx.bahanId, calon pembalik
    // (mBahanLain) sengaja dibuat atas bahan LAIN sejak INSERT (bukan lewat
    // UPDATE, karena UPDATE atas "bahanId" sendiri sudah ditolak trigger
    // append-only) - harus ditolak sebagai "tidak sepadan".
    const mDx = await insertMutasi(client, fx, { jumlah: -5, jenis: "PENYESUAIAN", referensiJenis: "PENYESUAIAN" });
    const bahanLain = fixtureId("bahanlain");
    await client.query(
      `INSERT INTO bahan (id, "tenantId", nama, "kodeSku", "satuanDasarId", jenis, "stokMinimum", status)
       VALUES ($1, $2, $3, $4, $5, 'BAHAN_BAKU', 0, 'AKTIF')`,
      [bahanLain, fx.tenantId, `Bahan Lain ${bahanLain}`, bahanLain.slice(0, 10), fx.satuanId],
    );
    const mBahanLainId = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok
         (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', 5, 'PENYESUAIAN', $6, $7, now())`,
      [mBahanLainId, fx.tenantId, fx.outletId, fx.gudangId, bahanLain, fixtureId("ref"), fx.penggunaId],
    );

    const msgMismatch = await expectReject(client, "Mutasi pembalik dengan bahanId berbeda dari mutasi asal", () =>
      client.query(`UPDATE mutasi_stok SET "dibalikOlehId" = $1 WHERE id = $2`, [mBahanLainId, mDx]),
    );
    assertTrue(
      /tidak sepadan/i.test(msgMismatch),
      `error harus menyebut ketidaksepadanan tenant/gudang/bahan, dapat: ${msgMismatch}`,
    );
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testStokBahanAgregatUnik();
  await testAppendOnly();
  await testPembalikKesepadanan();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ALT-PSD-004/005/006/007 (stok agregat unik + mutasi_stok append-only/pembalik, termasuk bug-fix rantai pembalik-dari-pembalik) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
