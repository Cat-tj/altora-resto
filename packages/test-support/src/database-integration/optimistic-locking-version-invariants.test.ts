// Test database-integration untuk ADR-035 (optimistic locking - kolom
// `version`/`updatedAt` + trigger generik `optimistic_lock_bump_version` di
// migrasi `20260726110000_optimistic_locking_version`). Menyambung ke
// Postgres NYATA (bukan cuma teks SQL).
//
// Batch ADR-035 menambahkan `version Int @default(1)` ke 13 tabel aggregate
// root (10 dari daftar minimum instruksi + 3 tambahan - lihat ADR-035 di
// DECISION-LOG.md untuk rasional lengkap tiap penambahan/pengecualian). Demi
// menjaga runtime test tetap wajar, file ini HANYA menguji perilaku penuh
// pada TIGA tabel representatif lintas domain berbeda (Pesanan, GiliranKasir,
// Promo) - existence trigger diuji di SELURUH 13 tabel (murah, tidak perlu
// insert data).
//
// Untuk setiap tabel representatif, dibuktikan SECARA PERILAKU:
//   1. UPDATE normal (`SET someField = x WHERE id = ? AND version = ?` yang
//      COCOK) berhasil DAN version otomatis naik TEPAT 1 - terlepas dari
//      apa yang app coba SET pada kolom version itu sendiri.
//   2. UPDATE dengan `WHERE version = <stale>` yang TIDAK cocok -> 0 baris
//      ter-UPDATE (deteksi konflik alami dari conditional UPDATE, BUKAN
//      trigger - ini murni perilaku SQL WHERE yang tidak match).
//   3. Percobaan langsung `SET version = 999` (lompatan sembarang) DIABAIKAN
//      trigger - hasil akhir tetap OLD.version + 1, BUKAN 999.
//   4. CRUX PROOF konkurensi nyata: DUA koneksi `pg` terpisah (bukan
//      simulasi) - koneksi A dan B sama-sama "membaca" version=1, koneksi B
//      UPDATE lebih dulu dan berhasil (version jadi 2), koneksi A lalu
//      mencoba UPDATE dengan `WHERE version = 1` (versi basi yang sudah
//      dibacanya) dan terbukti mempengaruhi NOL baris - inilah pembuktian
//      optimistic-concurrency-detection yang sesungguhnya, dijalankan lewat
//      dua koneksi Postgres fisik yang berbeda, BUKAN dua transaksi di
//      client yang sama.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/optimistic-locking-version-invariants.test.ts

import { assertTrue, fixtureId, withTransaction, DATABASE_URL } from "./_pg-helper.js";
import pg from "pg";

const ALL_TABLES = [
  "pesanan",
  "pembayaran",
  "giliran_kasir",
  "transfer_stok",
  "stok_opname",
  "purchase_order",
  "promo",
  "keanggotaan",
  "jadwal_kerja",
  "reservasi",
  "absensi",
  "stok_bahan",
  "permintaan_persetujuan",
] as const;

async function testTriggerExistsOnAll13Tables(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const func = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname = 'optimistic_lock_bump_version'`,
    );
    assertTrue(
      func.rowCount === 1,
      `Fungsi generik optimistic_lock_bump_version harus ada persis satu kali (dipakai bersama ${ALL_TABLES.length} tabel), dapat ${func.rowCount}.`,
    );

    for (const table of ALL_TABLES) {
      const trg = await pool.query(
        `SELECT t.tgname, p.proname FROM pg_trigger t
         JOIN pg_proc p ON t.tgfoid = p.oid
         WHERE t.tgrelid = $1::regclass AND NOT t.tgisinternal`,
        [table],
      );
      assertTrue(
        trg.rowCount === 1,
        `Tabel ${table} harus punya persis satu trigger bump-version, dapat ${trg.rowCount}.`,
      );
      assertTrue(
        trg.rows[0].proname === "optimistic_lock_bump_version",
        `Trigger tabel ${table} harus memakai fungsi generik optimistic_lock_bump_version, dapat ${trg.rows[0].proname}.`,
      );
      const col = await pool.query(
        `SELECT column_name, is_nullable, column_default FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'version'`,
        [table],
      );
      assertTrue(col.rowCount === 1, `Tabel ${table} harus punya kolom version.`);
      assertTrue(
        col.rows[0].is_nullable === "NO" && col.rows[0].column_default === "1",
        `Kolom version tabel ${table} harus NOT NULL DEFAULT 1, dapat is_nullable=${col.rows[0].is_nullable} default=${col.rows[0].column_default}.`,
      );
    }
  } finally {
    await pool.end();
  }
}

async function createTenant(client: pg.PoolClient): Promise<string> {
  const tenantId = fixtureId("tenant");
  await client.query(
    `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
    [tenantId, `Tenant ${tenantId}`, tenantId],
  );
  return tenantId;
}

async function createOutlet(client: pg.PoolClient, tenantId: string): Promise<string> {
  const outletId = fixtureId("outlet");
  await client.query(
    `INSERT INTO outlet (id, "tenantId", nama, kode, "zonaWaktu", status, "createdAt")
     VALUES ($1, $2, $3, $4, 'Asia/Jakarta', 'AKTIF', now())`,
    [outletId, tenantId, `Outlet ${outletId}`, outletId.slice(0, 10)],
  );
  return outletId;
}

interface AktorIds {
  penggunaId: string;
  keanggotaanTenantId: string;
  keanggotaanOutletId: string;
}

async function createAktorOutletFull(
  client: pg.PoolClient,
  tenantId: string,
  outletId: string,
): Promise<AktorIds> {
  const penggunaId = fixtureId("pengguna");
  const keanggotaanTenantId = fixtureId("kt");
  const keanggotaanOutletId = fixtureId("ko");
  await client.query(
    `INSERT INTO pengguna (id, "namaLengkap", email, status, "jumlahPercobaanGagal", "createdAt", "updatedAt")
     VALUES ($1, 'Aktor Uji', $2, 'AKTIF', 0, now(), now())`,
    [penggunaId, `${penggunaId}@example.test`],
  );
  await client.query(
    `INSERT INTO keanggotaan_tenant (id, "penggunaId", "tenantId", status, "isOwner", "bergabungPada", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'AKTIF', false, now(), now(), now())`,
    [keanggotaanTenantId, penggunaId, tenantId],
  );
  await client.query(
    `INSERT INTO keanggotaan_outlet (id, "keanggotaanTenantId", "tenantId", "outletId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'AKTIF', now(), now())`,
    [keanggotaanOutletId, keanggotaanTenantId, tenantId, outletId],
  );
  return { penggunaId, keanggotaanTenantId, keanggotaanOutletId };
}

async function createAktorOutlet(
  client: pg.PoolClient,
  tenantId: string,
  outletId: string,
): Promise<string> {
  const aktor = await createAktorOutletFull(client, tenantId, outletId);
  return aktor.keanggotaanOutletId;
}

// ---------------------------------------------------------------------------------
// (1) Pesanan - behavioral penuh dalam SATU transaksi (auto-increment,
// override lompatan sembarang, conditional-update stale ditolak).
// ---------------------------------------------------------------------------------
async function testPesananAutoIncrementDanOverride(): Promise<void> {
  await withTransaction(async (client) => {
    const tenantId = await createTenant(client);
    const outletId = await createOutlet(client, tenantId);
    const aktorId = await createAktorOutlet(client, tenantId, outletId);

    const pesananId = fixtureId("pesanan");
    await client.query(
      `INSERT INTO pesanan (id, "tenantId", "outletId", kanal, "nomorPesanan", status, "dibuatOlehId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 'KASIR', $4, 'DRAF', $5, now(), now(), 1)`,
      [pesananId, tenantId, outletId, pesananId.slice(0, 12), aktorId],
    );

    // (a) UPDATE normal, WHERE version cocok -> berhasil, version naik TEPAT 1.
    const upd1 = await client.query(
      `UPDATE pesanan SET status = 'DIKIRIM' WHERE id = $1 AND version = 1`,
      [pesananId],
    );
    assertTrue(upd1.rowCount === 1, `UPDATE pertama (version=1 cocok) harus mempengaruhi 1 baris, dapat ${upd1.rowCount}.`);
    const after1 = await client.query(`SELECT version FROM pesanan WHERE id = $1`, [pesananId]);
    assertTrue(
      after1.rows[0].version === 2,
      `Setelah UPDATE pertama, version harus tepat 2 (naik 1 dari 1), dapat ${after1.rows[0].version}.`,
    );

    // (b) UPDATE dengan WHERE version STALE (masih 1, padahal sudah 2) -> 0 baris.
    const updStale = await client.query(
      `UPDATE pesanan SET status = 'DITERIMA' WHERE id = $1 AND version = 1`,
      [pesananId],
    );
    assertTrue(
      updStale.rowCount === 0,
      `UPDATE dengan version basi (1, padahal sudah 2) harus mempengaruhi 0 baris, dapat ${updStale.rowCount}.`,
    );
    const afterStaleAttempt = await client.query(`SELECT status, version FROM pesanan WHERE id = $1`, [pesananId]);
    assertTrue(
      afterStaleAttempt.rows[0].status === "DIKIRIM" && afterStaleAttempt.rows[0].version === 2,
      `Baris TIDAK BOLEH berubah oleh UPDATE yang gagal match version, dapat status=${afterStaleAttempt.rows[0].status} version=${afterStaleAttempt.rows[0].version}.`,
    );

    // (c) Percobaan SET version = 999 secara langsung (lompatan sembarang) ->
    // trigger meng-override, hasil akhir tetap OLD.version + 1 = 3, BUKAN 999.
    const updJump = await client.query(
      `UPDATE pesanan SET status = 'DITERIMA', version = 999 WHERE id = $1 AND version = 2`,
      [pesananId],
    );
    assertTrue(updJump.rowCount === 1, "UPDATE dengan version=2 yang cocok (walau mencoba SET version=999) harus berhasil 1 baris.");
    const after3 = await client.query(`SELECT status, version FROM pesanan WHERE id = $1`, [pesananId]);
    assertTrue(
      after3.rows[0].version === 3,
      `Trigger harus meng-override SET version=999 kembali ke OLD.version+1=3, dapat ${after3.rows[0].version} (999 SEHARUSNYA tidak pernah tersimpan).`,
    );
    assertTrue(after3.rows[0].status === "DITERIMA", "Kolom lain (status) tetap ter-UPDATE normal walau version di-override.");
  });
}

// ---------------------------------------------------------------------------------
// (2) GiliranKasir - hanya proof auto-increment + override (ringkas, pola sama).
// ---------------------------------------------------------------------------------
async function testGiliranKasirAutoIncrement(): Promise<void> {
  await withTransaction(async (client) => {
    const tenantId = await createTenant(client);
    const outletId = await createOutlet(client, tenantId);
    const aktorId = await createAktorOutlet(client, tenantId, outletId);

    const giliranId = fixtureId("giliran");
    await client.query(
      `INSERT INTO giliran_kasir (id, "tenantId", "outletId", "penggunaId", "modalAwal", status, "dibukaPada", "updatedAt", version)
       VALUES ($1, $2, $3, $4, 100000, 'DIBUKA', now(), now(), 1)`,
      [giliranId, tenantId, outletId, aktorId],
    );

    const upd = await client.query(
      `UPDATE giliran_kasir SET "modalAkhirDihitung" = 150000, version = 12345 WHERE id = $1 AND version = 1`,
      [giliranId],
    );
    assertTrue(upd.rowCount === 1, "UPDATE giliran_kasir dengan version cocok harus berhasil.");
    const after = await client.query(`SELECT version FROM giliran_kasir WHERE id = $1`, [giliranId]);
    assertTrue(
      after.rows[0].version === 2,
      `version giliran_kasir harus 2 (bukan 12345 yang dicoba di-SET), dapat ${after.rows[0].version}.`,
    );

    const stale = await client.query(
      `UPDATE giliran_kasir SET "modalAkhirDihitung" = 999999 WHERE id = $1 AND version = 1`,
      [giliranId],
    );
    assertTrue(stale.rowCount === 0, "UPDATE giliran_kasir dengan version basi (1) harus 0 baris.");
  });
}

// ---------------------------------------------------------------------------------
// (3) Promo - hanya proof auto-increment + override (ringkas, pola sama).
// ---------------------------------------------------------------------------------
async function testPromoAutoIncrement(): Promise<void> {
  await withTransaction(async (client) => {
    const tenantId = await createTenant(client);

    const promoId = fixtureId("promo");
    await client.query(
      `INSERT INTO promo (id, "tenantId", nama, "berlakuSejak", "berlakuSampai", status, "createdAt", "updatedAt", version)
       VALUES ($1, $2, 'Promo Uji', now(), now() + interval '30 days', 'AKTIF', now(), now(), 1)`,
      [promoId, tenantId],
    );

    const upd = await client.query(
      `UPDATE promo SET status = 'NONAKTIF', version = -1 WHERE id = $1 AND version = 1`,
      [promoId],
    );
    assertTrue(upd.rowCount === 1, "UPDATE promo dengan version cocok harus berhasil.");
    const after = await client.query(`SELECT version FROM promo WHERE id = $1`, [promoId]);
    assertTrue(
      after.rows[0].version === 2,
      `version promo harus 2 (bukan -1 yang dicoba di-SET), dapat ${after.rows[0].version}.`,
    );

    const stale = await client.query(
      `UPDATE promo SET status = 'KADALUARSA' WHERE id = $1 AND version = 1`,
      [promoId],
    );
    assertTrue(stale.rowCount === 0, "UPDATE promo dengan version basi (1) harus 0 baris.");
  });
}

// ---------------------------------------------------------------------------------
// (4) CRUX: konflik konkurensi NYATA lewat DUA KONEKSI pg TERPISAH pada Pesanan.
//
// Baris fixture di-COMMIT (bukan withTransaction/ROLLBACK) sebentar supaya
// terlihat oleh KEDUA koneksi fisik yang berbeda, lalu dibersihkan manual di
// akhir (DELETE eksplisit) - satu-satunya test di file ini yang tidak
// memakai pola ROLLBACK karena esensi pembuktian ini justru butuh dua
// koneksi Postgres independen melihat commit yang sama, sesuatu yang tidak
// mungkin diuji lewat satu transaksi tunggal.
// ---------------------------------------------------------------------------------
async function testDuaKoneksiNyataKonflikTerdeteksi(): Promise<void> {
  const setupPool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const connA = new pg.Client({ connectionString: DATABASE_URL });
  const connB = new pg.Client({ connectionString: DATABASE_URL });

  let tenantId = "";
  let pesananId = "";
  let aktor: AktorIds | null = null;

  try {
    // --- setup: satu baris pesanan ter-COMMIT (bukan di dalam transaksi test). ---
    tenantId = await createTenant(setupPool as unknown as pg.PoolClient);
    const outletId = await createOutlet(setupPool as unknown as pg.PoolClient, tenantId);
    aktor = await createAktorOutletFull(setupPool as unknown as pg.PoolClient, tenantId, outletId);
    pesananId = fixtureId("pesanan_concurrent");
    await setupPool.query(
      `INSERT INTO pesanan (id, "tenantId", "outletId", kanal, "nomorPesanan", status, "dibuatOlehId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 'KASIR', $4, 'DRAF', $5, now(), now(), 1)`,
      [pesananId, tenantId, outletId, pesananId.slice(0, 12), aktor.keanggotaanOutletId],
    );

    await connA.connect();
    await connB.connect();

    // --- koneksi A "membaca" baris: version = 1. ---
    const readA = await connA.query(`SELECT version FROM pesanan WHERE id = $1`, [pesananId]);
    const versionDibacaA: number = readA.rows[0].version;
    assertTrue(versionDibacaA === 1, `Koneksi A harus membaca version=1 di awal, dapat ${versionDibacaA}.`);

    // --- koneksi B "membaca" baris yang SAMA: version = 1 juga (belum tahu A/B akan bentrok). ---
    const readB = await connB.query(`SELECT version FROM pesanan WHERE id = $1`, [pesananId]);
    const versionDibacaB: number = readB.rows[0].version;
    assertTrue(versionDibacaB === 1, `Koneksi B harus membaca version=1 juga (baca konkuren sebelum siapa pun menulis), dapat ${versionDibacaB}.`);

    // --- koneksi B menang duluan: UPDATE dengan WHERE version = 1 (yang dibacanya) -> berhasil. ---
    const updB = await connB.query(
      `UPDATE pesanan SET status = 'DIKIRIM' WHERE id = $1 AND version = $2`,
      [pesananId, versionDibacaB],
    );
    assertTrue(updB.rowCount === 1, `Koneksi B (menang duluan) harus berhasil UPDATE 1 baris, dapat ${updB.rowCount}.`);

    const cekSetelahB = await setupPool.query(`SELECT status, version FROM pesanan WHERE id = $1`, [pesananId]);
    assertTrue(
      cekSetelahB.rows[0].version === 2 && cekSetelahB.rows[0].status === "DIKIRIM",
      `Setelah koneksi B commit, version harus 2 dan status DIKIRIM, dapat version=${cekSetelahB.rows[0].version} status=${cekSetelahB.rows[0].status}.`,
    );

    // --- koneksi A mencoba UPDATE-nya sendiri dengan version basi (1, yang
    // dibacanya SEBELUM koneksi B menang) -> INILAH CRUX: harus 0 baris. ---
    const updA = await connA.query(
      `UPDATE pesanan SET status = 'DITERIMA' WHERE id = $1 AND version = $2`,
      [pesananId, versionDibacaA],
    );
    assertTrue(
      updA.rowCount === 0,
      `CRUX: koneksi A (kalah, version basi=${versionDibacaA}) HARUS mempengaruhi 0 baris karena koneksi B sudah menaikkan version ke 2 duluan, dapat ${updA.rowCount}.`,
    );

    // --- Bukti tambahan: baris TETAP mencerminkan tulisan B, bukan A (A benar-benar tidak menyentuh apa pun). ---
    const cekAkhir = await setupPool.query(`SELECT status, version FROM pesanan WHERE id = $1`, [pesananId]);
    assertTrue(
      cekAkhir.rows[0].status === "DIKIRIM" && cekAkhir.rows[0].version === 2,
      `Baris akhir harus TETAP status=DIKIRIM/version=2 (tulisan B) - percobaan A yang gagal tidak boleh mengubah apa pun, dapat status=${cekAkhir.rows[0].status} version=${cekAkhir.rows[0].version}.`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `  -> CRUX two-connection proof: A dan B sama-sama baca version=1; B menang (UPDATE berhasil, version->2); A mencoba UPDATE WHERE version=1 (stale) -> rowCount=0 (KONFLIK_DATA terdeteksi, dua koneksi pg NYATA).`,
    );
  } finally {
    try {
      await connA.end();
    } catch {
      // ignore
    }
    try {
      await connB.end();
    } catch {
      // ignore
    }
    // Bersihkan data yang di-COMMIT (bukan ROLLBACK) di test ini - urutan
    // DELETE mengikuti arah FK (anak dulu, baru induk).
    if (pesananId) {
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [pesananId]);
    }
    if (aktor) {
      await setupPool.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [aktor.keanggotaanOutletId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [aktor.keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [aktor.penggunaId]);
    }
    if (tenantId) {
      await setupPool.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [tenantId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [tenantId]);
    }
    await setupPool.end();
  }
}

async function main(): Promise<void> {
  await testTriggerExistsOnAll13Tables();
  await testPesananAutoIncrementDanOverride();
  await testGiliranKasirAutoIncrement();
  await testPromoAutoIncrement();
  await testDuaKoneksiNyataKonflikTerdeteksi();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-035 (optimistic locking version, 13 tabel, proof konflik dua-koneksi nyata) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
