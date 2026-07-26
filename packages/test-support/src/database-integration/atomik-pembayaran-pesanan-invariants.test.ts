// Test database-integration untuk ADR-036 sub-problem A (pengaman DB-level untuk
// transisi atomik pembayaran->pesanan) - migrasi
// `20260726130000_pengaman_atomik_pembayaran_pesanan`. Menyambung ke Postgres NYATA.
//
// YANG DIBUKTIKAN SECARA PERILAKU (bukan hanya "trigger ada"):
//   1. Urutan SALAH (Pembayaran jadi DIBAYAR, Pesanan TIDAK PERNAH diubah ke
//      status yang konsisten, lalu COMMIT) -> COMMIT DITOLAK KERAS.
//   2. Urutan BENAR (Pembayaran jadi DIBAYAR DULU, Pesanan diubah ke status
//      konsisten SETELAHNYA, MASIH DALAM TRANSAKSI YANG SAMA, lalu COMMIT) ->
//      COMMIT BERHASIL - membuktikan CONSTRAINT TRIGGER DEFERRED tidak menolak
//      urutan yang justru diminta oleh kontrak (validasi -> ubah Pembayaran ->
//      ubah Pesanan -> commit), BUKAN trigger BEFORE/AFTER biasa yang akan
//      salah menolak urutan ini.
//   3. Regresi Pesanan.status (mis. balik ke DRAF) SETELAH Pembayaran-nya sudah
//      DIBAYAR, dalam transaksi terpisah -> COMMIT DITOLAK (trigger pada tabel
//      pesanan sendiri, bukan hanya pembayaran/alokasi).
//   4. Reconciliation query (didokumentasikan di komentar migrasi) benar-benar
//      mengembalikan NOL baris pada database yang hanya berisi commit yang
//      lolos trigger - dijalankan sebagai bukti tambahan.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/atomik-pembayaran-pesanan-invariants.test.ts

import { assertTrue, fixtureId, createPesananFixture, DATABASE_URL } from "./_pg-helper.js";
import pg from "pg";

async function testUrutanSalahDitolakSaatCommit(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fx = await createPesananFixture(client, { status: "DRAF" });
    // ADR-042 (trg_alokasi_pembayaran_cek_batas_pesanan): totalAkhir default
    // fixture = 0 - harus di-set ke nilai >= alokasi (20000) di bawah,
    // supaya INSERT alokasi_pembayaran tidak ditolak sebelum sempat menguji
    // invariant konsistensi status yang jadi fokus test ini.
    await client.query(`UPDATE pesanan SET "totalAkhir" = 20000 WHERE id = $1`, [fx.pesananId]);
    const pembayaranId = fixtureId("pembayaran");
    const alokasiId = fixtureId("alokasi");
    await client.query(
      `INSERT INTO pembayaran (id, "tenantId", "outletId", jumlah, "totalDiterima", kembalian, status, "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 20000, 20000, 0, 'DRAF', now(), now(), 1)`,
      [pembayaranId, fx.tenantId, fx.outletId],
    );
    await client.query(
      `INSERT INTO alokasi_pembayaran (id, "tenantId", "pembayaranId", "pesananId", jumlah, "createdAt")
       VALUES ($1, $2, $3, $4, 20000, now())`,
      [alokasiId, fx.tenantId, pembayaranId, fx.pesananId],
    );
    // Pembayaran jadi DIBAYAR, tapi Pesanan SENGAJA TIDAK PERNAH diubah -
    // inilah bug yang harus dicegah trigger deferred.
    await client.query(`UPDATE pembayaran SET status = 'DIBAYAR' WHERE id = $1`, [pembayaranId]);

    let commitGagal = false;
    let pesanErr = "";
    try {
      await client.query("COMMIT");
    } catch (err) {
      commitGagal = true;
      pesanErr = err instanceof Error ? err.message : String(err);
    }
    assertTrue(
      commitGagal,
      "COMMIT harus GAGAL ketika Pembayaran DIBAYAR tapi Pesanan yang dialokasikan masih berstatus tidak konsisten (DRAF).",
    );
    assertTrue(
      pesanErr.includes("Inkonsistensi pembayaran-pesanan"),
      `Pesan error COMMIT harus menyebut "Inkonsistensi pembayaran-pesanan", dapat: ${pesanErr}`,
    );
  } finally {
    // Transaksi sudah gagal/rollback otomatis oleh Postgres setelah COMMIT error -
    // pastikan koneksi bersih untuk test berikutnya.
    try {
      await client.query("ROLLBACK");
    } catch {
      // no-op - mungkin sudah di-rollback otomatis oleh server.
    }
    client.release();
    await pool.end();
  }
}

async function testUrutanBenarBerhasilCommit(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();
  let fx: Awaited<ReturnType<typeof createPesananFixture>> | undefined;
  let pembayaranId = "";
  try {
    await client.query("BEGIN");
    fx = await createPesananFixture(client, { status: "DIKONFIRMASI" });
    // ADR-042: lihat catatan totalAkhir di testUrutanSalahDitolakSaatCommit.
    await client.query(`UPDATE pesanan SET "totalAkhir" = 20000 WHERE id = $1`, [fx.pesananId]);
    pembayaranId = fixtureId("pembayaran");
    const alokasiId = fixtureId("alokasi");
    await client.query(
      `INSERT INTO pembayaran (id, "tenantId", "outletId", jumlah, "totalDiterima", kembalian, status, "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 20000, 20000, 0, 'DRAF', now(), now(), 1)`,
      [pembayaranId, fx.tenantId, fx.outletId],
    );
    await client.query(
      `INSERT INTO alokasi_pembayaran (id, "tenantId", "pembayaranId", "pesananId", jumlah, "createdAt")
       VALUES ($1, $2, $3, $4, 20000, now())`,
      [alokasiId, fx.tenantId, pembayaranId, fx.pesananId],
    );
    // Kontrak yang benar: ubah Pembayaran DULU, baru Pesanan - keduanya dalam
    // SATU transaksi yang sama.
    await client.query(`UPDATE pembayaran SET status = 'DIBAYAR' WHERE id = $1`, [pembayaranId]);
    await client.query(`UPDATE pesanan SET status = 'SELESAI' WHERE id = $1`, [fx.pesananId]);

    let commitBerhasil = true;
    try {
      await client.query("COMMIT");
    } catch {
      commitBerhasil = false;
    }
    assertTrue(
      commitBerhasil,
      "COMMIT harus BERHASIL ketika Pembayaran DIBAYAR dan Pesanan diubah ke status konsisten (SELESAI) dalam transaksi yang sama - trigger DEFERRED tidak boleh menolak urutan yang benar.",
    );
  } finally {
    // Bersihkan data yang barusan benar-benar ter-commit (tidak dilindungi ROLLBACK) -
    // dihapus lewat koneksi baru (koneksi lama mungkin dalam state error/idle).
    if (fx && pembayaranId) {
      const cleanup = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
      try {
        await cleanup.query(`DELETE FROM alokasi_pembayaran WHERE "pembayaranId" = $1`, [pembayaranId]);
        await cleanup.query(`DELETE FROM pembayaran WHERE id = $1`, [pembayaranId]);
        await cleanup.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [fx.pesananId]);
        await cleanup.query(`DELETE FROM pesanan WHERE id = $1`, [fx.pesananId]);
        await cleanup.query(`DELETE FROM item_menu WHERE id = $1`, [fx.itemMenuId]);
        await cleanup.query(`DELETE FROM kategori_menu WHERE id = $1`, [fx.kategoriMenuId]);
        await cleanup.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [fx.keanggotaanOutletId]);
        await cleanup.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [fx.keanggotaanTenantId]);
        await cleanup.query(`DELETE FROM pengguna WHERE id = $1`, [fx.penggunaId]);
        await cleanup.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [fx.tenantId]);
        await cleanup.query(`DELETE FROM tenant WHERE id = $1`, [fx.tenantId]);
      } finally {
        await cleanup.end();
      }
    }
    client.release();
    await pool.end();
  }
}

async function testRegresiPesananSetelahDibayarDitolak(): Promise<void> {
  const setupPool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const setupClient = await setupPool.connect();
  let fx: Awaited<ReturnType<typeof createPesananFixture>> | undefined;
  let pembayaranId = "";
  try {
    await setupClient.query("BEGIN");
    fx = await createPesananFixture(setupClient, { status: "DIKONFIRMASI" });
    // ADR-042: lihat catatan totalAkhir di testUrutanSalahDitolakSaatCommit.
    await setupClient.query(`UPDATE pesanan SET "totalAkhir" = 20000 WHERE id = $1`, [fx.pesananId]);
    pembayaranId = fixtureId("pembayaran");
    const alokasiId = fixtureId("alokasi");
    await setupClient.query(
      `INSERT INTO pembayaran (id, "tenantId", "outletId", jumlah, "totalDiterima", kembalian, status, "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 20000, 20000, 0, 'DRAF', now(), now(), 1)`,
      [pembayaranId, fx.tenantId, fx.outletId],
    );
    await setupClient.query(
      `INSERT INTO alokasi_pembayaran (id, "tenantId", "pembayaranId", "pesananId", jumlah, "createdAt")
       VALUES ($1, $2, $3, $4, 20000, now())`,
      [alokasiId, fx.tenantId, pembayaranId, fx.pesananId],
    );
    await setupClient.query(`UPDATE pembayaran SET status = 'DIBAYAR' WHERE id = $1`, [pembayaranId]);
    await setupClient.query(`UPDATE pesanan SET status = 'SELESAI' WHERE id = $1`, [fx.pesananId]);
    await setupClient.query("COMMIT");

    // Transaksi TERPISAH (simulasi bug lain / edit manual keliru): coba
    // regresikan Pesanan.status kembali ke DRAF padahal Pembayaran-nya sudah
    // DIBAYAR sejak transaksi sebelumnya.
    await setupClient.query("BEGIN");
    await setupClient.query(`UPDATE pesanan SET status = 'DRAF' WHERE id = $1`, [fx.pesananId]);
    let commitGagal = false;
    try {
      await setupClient.query("COMMIT");
    } catch {
      commitGagal = true;
      try {
        await setupClient.query("ROLLBACK");
      } catch {
        // no-op
      }
    }
    assertTrue(
      commitGagal,
      "COMMIT harus GAGAL ketika Pesanan yang pembayarannya SUDAH DIBAYAR diregresikan ke status tidak konsisten (DRAF) - trigger pada tabel pesanan sendiri harus menangkap ini.",
    );
  } finally {
    if (fx && pembayaranId) {
      // PENTING: pakai setupClient (koneksi yang SAMA, masih checked-out),
      // BUKAN setupPool.query() - pool ini dibuat dengan max:1, jadi
      // setupPool.query() akan menunggu SELAMANYA untuk koneksi yang tidak
      // akan pernah tersedia selama setupClient belum di-release() (deadlock
      // self-inflicted yang ditemukan saat menulis test ini).
      await setupClient.query(`DELETE FROM alokasi_pembayaran WHERE "pembayaranId" = $1`, [pembayaranId]);
      await setupClient.query(`DELETE FROM pembayaran WHERE id = $1`, [pembayaranId]);
      await setupClient.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [fx.pesananId]);
      await setupClient.query(`DELETE FROM pesanan WHERE id = $1`, [fx.pesananId]);
      await setupClient.query(`DELETE FROM item_menu WHERE id = $1`, [fx.itemMenuId]);
      await setupClient.query(`DELETE FROM kategori_menu WHERE id = $1`, [fx.kategoriMenuId]);
      await setupClient.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [fx.keanggotaanOutletId]);
      await setupClient.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [fx.keanggotaanTenantId]);
      await setupClient.query(`DELETE FROM pengguna WHERE id = $1`, [fx.penggunaId]);
      await setupClient.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [fx.tenantId]);
      await setupClient.query(`DELETE FROM tenant WHERE id = $1`, [fx.tenantId]);
    }
    setupClient.release();
    await setupPool.end();
  }
}

async function testReconciliationQueryKosong(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const res = await pool.query(`
      SELECT pb.id AS pembayaran_id, p.id AS pesanan_id, p.status AS status_pesanan
      FROM alokasi_pembayaran ap
      JOIN pembayaran pb ON pb.id = ap."pembayaranId" AND pb."tenantId" = ap."tenantId"
      JOIN pesanan p ON p.id = ap."pesananId" AND p."tenantId" = ap."tenantId"
      WHERE pb.status = 'DIBAYAR'
        AND p.status IN ('DRAF', 'DIKIRIM', 'MENUNGGU_PERSETUJUAN', 'DITOLAK', 'MENUNGGU_PEMBAYARAN', 'DIBATALKAN')
    `);
    assertTrue(
      res.rowCount === 0,
      `Query rekonsiliasi pembayaran-pesanan harus mengembalikan NOL baris pada database yang hanya berisi commit yang lolos trigger, dapat ${res.rowCount}.`,
    );
  } finally {
    await pool.end();
  }
}

async function testTriggerDanFungsiAda(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const func = await pool.query(`SELECT proname FROM pg_proc WHERE proname = 'cek_konsistensi_pembayaran_pesanan'`);
    assertTrue(func.rowCount === 1, "Fungsi cek_konsistensi_pembayaran_pesanan harus ada persis satu kali.");

    for (const [table, trigName] of [
      ["pembayaran", "trg_cek_konsistensi_pada_pembayaran"],
      ["alokasi_pembayaran", "trg_cek_konsistensi_pada_alokasi"],
      ["pesanan", "trg_cek_konsistensi_pada_pesanan"],
    ] as const) {
      const trg = await pool.query(
        `SELECT tgname, tgdeferrable, tginitdeferred FROM pg_trigger WHERE tgrelid = $1::regclass AND tgname = $2`,
        [table, trigName],
      );
      assertTrue(trg.rowCount === 1, `Tabel ${table} harus punya trigger ${trigName}.`);
      assertTrue(
        trg.rows[0].tgdeferrable === true && trg.rows[0].tginitdeferred === true,
        `Trigger ${trigName} harus DEFERRABLE INITIALLY DEFERRED (evaluasi di titik COMMIT, bukan langsung per statement).`,
      );
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  await testTriggerDanFungsiAda();
  await testUrutanSalahDitolakSaatCommit();
  await testUrutanBenarBerhasilCommit();
  await testRegresiPesananSetelahDibayarDitolak();
  await testReconciliationQueryKosong();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-036 sub-problem A (pengaman deferred-constraint-trigger konsistensi pembayaran-pesanan) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
