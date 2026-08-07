// Test database-integration untuk ADR-041 (audit) + ADR-042 (fix) - batch
// konsolidasi audit cakupan konkurensi, melengkapi skenario "dua koneksi
// nyata" yang DIMINTA instruksi correction-loop asli tapi BELUM ADA test
// khususnya di 13 file database-integration sebelumnya (lihat audit lengkap
// di docs/engineering/AUDIT-CONCURRENCY-COVERAGE.md).
//
// Menyambung ke Postgres NYATA lewat DUA/TIGA koneksi `pg` fisik terpisah
// (bukan simulasi/satu transaksi), mengikuti pola CRUX di
// optimistic-locking-version-invariants.test.ts (ADR-035).
//
// ENAM skenario, tiga kategori:
//
//   PROTEKSI SUDAH ADA (dibuktikan ulang lewat dua koneksi NYATA, bukan
//   diasumsikan generalisasi dari test lain):
//     1. Dua konfirmasi Pembayaran bersamaan pada BARIS YANG SAMA -> version
//        conflict (trigger optimistic_lock_bump_version, ADR-035) menolak
//        yang kalah, sama seperti pola Pesanan tapi dibuktikan LANGSUNG di
//        tabel pembayaran.
//     2. Dua posting StokOpname bersamaan pada BARIS YANG SAMA -> version
//        conflict, dibuktikan LANGSUNG di tabel stok_opname (bukan hanya
//        existence trigger).
//     3. Dua percobaan reversal ledger CONCURRENT (bukan sekadar sekuensial)
//        untuk baris mutasi_stok asal yang SAMA -> unique index
//        membalikMutasiId (ADR-032) menolak yang kalah walau keduanya
//        di-INSERT dari transaksi yang OVERLAP secara nyata.
//
//   GAP DITEMUKAN batch ADR-041, SEKARANG DIPERBAIKI batch ADR-042 (lihat
//   migrasi `20260726180000_tegakkan_kuota_promo_ketersediaan_stok_alokasi_pembayaran`,
//   DEFECT-LEDGER.md ALT-DEF-051/052/053 DITUTUP) - skenario 4/5/6 di bawah
//   TADINYA membuktikan KEDUA sisi race berhasil commit (bug); SEKARANG
//   dibuktikan bahwa trigger BARU menolak sisi yang KALAH. Pola dua-koneksi
//   di bawah SENGAJA BUKAN `Promise.all` sebelum commit (seperti versi lama)
//   - trigger baru mengunci baris parent (`Promo`/`StokBahan`/`Pesanan`)
//   lewat `SELECT ... FOR UPDATE` DI DALAM transaksi yang sama, sehingga
//   koneksi kedua benar-benar BLOK menunggu koneksi pertama COMMIT/ROLLBACK
//   sebelum trigger-nya sendiri bisa jalan - persis pola overlap-lalu-commit
//   di skenario #3 di atas (bukan self-inflicted deadlock level-test kalau
//   keduanya menunggu tanpa ada yang commit lebih dulu).
//     4. Dua PromoPemakaian berbeda pesanan pada promo dengan usageQuota=1
//        (kuota total 1 lintas SEMUA pelanggan) -> koneksi PERTAMA berhasil,
//        koneksi KEDUA DITOLAK trigger `trg_promo_pemakaian_cek_kuota_total`
//        (ALT-DEF-051, DITUTUP).
//     5. Dua ReservasiStok untuk item BERBEDA yang sama-sama menghabiskan
//        SISA stok terakhir (StokBahan.kuantitas=1) -> koneksi PERTAMA
//        berhasil, koneksi KEDUA DITOLAK trigger
//        `trg_reservasi_stok_cek_ketersediaan` (ALT-DEF-052, DITUTUP).
//     6. Dua Pembayaran BERBEDA yang alokasinya ke SATU Pesanan yang sama
//        melebihi Pesanan.totalAkhir (over-alokasi) -> koneksi PERTAMA
//        berhasil, koneksi KEDUA DITOLAK trigger
//        `trg_alokasi_pembayaran_cek_batas_pesanan` (ALT-DEF-053, DITUTUP).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/konkurensi-dua-koneksi-lanjutan.test.ts

import { assertTrue, fixtureId, createPesananFixture, createReservasiFixture, DATABASE_URL } from "./_pg-helper"
import pg from "pg";

async function withCleanupPool<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// (1) PROTEKSI ADA: dua koneksi nyata, konflik version pada SATU baris
// pembayaran (bukan Pesanan seperti ADR-035, tabel BERBEDA - membuktikan
// generic bump-version trigger benar-benar protektif di tabel ini juga, bukan
// hanya diasumsikan dari test Pesanan).
// ---------------------------------------------------------------------------
async function testDuaKonfirmasiPembayaranBersamaanVersionConflict(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const fx = await createPesananFixture(setupPool as unknown as pg.PoolClient, { status: "DIKONFIRMASI" });
    const pembayaranId = fixtureId("pembayaran_concurrent");
    await setupPool.query(
      `INSERT INTO pembayaran (id, "tenantId", "outletId", jumlah, "totalDiterima", kembalian, status, "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 20000, 20000, 0, 'DRAF', now(), now(), 1)`,
      [pembayaranId, fx.tenantId, fx.outletId],
    );

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    try {
      await connA.connect();
      await connB.connect();

      const readA = await connA.query(`SELECT version FROM pembayaran WHERE id = $1`, [pembayaranId]);
      const readB = await connB.query(`SELECT version FROM pembayaran WHERE id = $1`, [pembayaranId]);
      assertTrue(readA.rows[0].version === 1 && readB.rows[0].version === 1, "Kedua koneksi harus membaca version=1.");

      // Kasir B "menang" duluan: konfirmasi pembayaran (DRAF -> DIBAYAR).
      const updB = await connB.query(
        `UPDATE pembayaran SET status = 'DIBAYAR', "dikonfirmasiPada" = now() WHERE id = $1 AND version = $2`,
        [pembayaranId, readB.rows[0].version],
      );
      assertTrue(updB.rowCount === 1, "Koneksi B (menang) harus berhasil mengonfirmasi 1 baris.");

      // Kasir A mencoba mengonfirmasi baris YANG SAMA dengan version basi (1).
      const updA = await connA.query(
        `UPDATE pembayaran SET status = 'DIBAYAR', "dikonfirmasiPada" = now() WHERE id = $1 AND version = $2`,
        [pembayaranId, readA.rows[0].version],
      );
      assertTrue(
        updA.rowCount === 0,
        `CRUX: Kasir A (kalah, version basi) HARUS mempengaruhi 0 baris karena B sudah menang duluan pada BARIS PEMBAYARAN YANG SAMA, dapat ${updA.rowCount}.`,
      );

      const akhir = await setupPool.query(`SELECT status, version FROM pembayaran WHERE id = $1`, [pembayaranId]);
      assertTrue(
        akhir.rows[0].status === "DIBAYAR" && akhir.rows[0].version === 2,
        `Baris akhir harus mencerminkan tulisan B (status=DIBAYAR, version=2), dapat ${JSON.stringify(akhir.rows[0])}`,
      );
      // eslint-disable-next-line no-console
      console.log(
        "  -> (1) Dua konfirmasi Pembayaran bersamaan pada baris SAMA: version conflict TERDETEKSI (dua koneksi pg nyata) - PROTEKSI SUDAH ADA.",
      );
    } finally {
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      await setupPool.query(`DELETE FROM pembayaran WHERE id = $1`, [pembayaranId]);
      await setupPool.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM item_menu WHERE id = $1`, [fx.itemMenuId]);
      await setupPool.query(`DELETE FROM kategori_menu WHERE id = $1`, [fx.kategoriMenuId]);
      await setupPool.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [fx.keanggotaanOutletId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [fx.keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [fx.penggunaId]);
      await setupPool.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [fx.tenantId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [fx.tenantId]);
    }
  });
}

// ---------------------------------------------------------------------------
// (2) PROTEKSI ADA: dua koneksi nyata, konflik version pada SATU baris
// stok_opname (posting ganda) - dibuktikan LANGSUNG, bukan hanya existence
// trigger generik yang sudah diuji di optimistic-locking-version-invariants.
// ---------------------------------------------------------------------------
async function testDuaPostingOpnameBersamaanVersionConflict(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const tenantId = fixtureId("tenant");
    const outletId = fixtureId("outlet");
    const gudangId = fixtureId("gudang");
    await setupPool.query(
      `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
      [tenantId, `Tenant ${tenantId}`, tenantId],
    );
    await setupPool.query(
      `INSERT INTO outlet (id, "tenantId", nama, kode, "zonaWaktu", status, "createdAt")
       VALUES ($1, $2, $3, $4, 'Asia/Jakarta', 'AKTIF', now())`,
      [outletId, tenantId, `Outlet ${outletId}`, outletId.slice(0, 10)],
    );
    await setupPool.query(
      `INSERT INTO gudang (id, "tenantId", "outletId", nama, status) VALUES ($1, $2, $3, $4, 'AKTIF')`,
      [gudangId, tenantId, outletId, `Gudang ${gudangId}`],
    );
    const penggunaId = fixtureId("pengguna");
    const keanggotaanTenantId = fixtureId("kt");
    await setupPool.query(
      `INSERT INTO pengguna (id, "namaLengkap", email, status, "jumlahPercobaanGagal", "createdAt", "updatedAt")
       VALUES ($1, 'Aktor Uji', $2, 'AKTIF', 0, now(), now())`,
      [penggunaId, `${penggunaId}@example.test`],
    );
    await setupPool.query(
      `INSERT INTO keanggotaan_tenant (id, "penggunaId", "tenantId", status, "isOwner", "bergabungPada", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'AKTIF', false, now(), now(), now())`,
      [keanggotaanTenantId, penggunaId, tenantId],
    );

    const opnameId = fixtureId("opname_concurrent");
    await setupPool.query(
      `INSERT INTO stok_opname (id, "tenantId", "gudangId", status, "dijadwalkanPada", "dibuatOlehId", "updatedAt", version)
       VALUES ($1, $2, $3, 'DISETUJUI', now(), $4, now(), 1)`,
      [opnameId, tenantId, gudangId, keanggotaanTenantId],
    );

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    try {
      await connA.connect();
      await connB.connect();

      const readA = await connA.query(`SELECT version FROM stok_opname WHERE id = $1`, [opnameId]);
      const readB = await connB.query(`SELECT version FROM stok_opname WHERE id = $1`, [opnameId]);
      assertTrue(readA.rows[0].version === 1 && readB.rows[0].version === 1, "Kedua koneksi harus membaca version=1.");

      const updB = await connB.query(
        `UPDATE stok_opname SET status = 'DIPOSTING', "dipostingPada" = now() WHERE id = $1 AND version = $2`,
        [opnameId, readB.rows[0].version],
      );
      assertTrue(updB.rowCount === 1, "Koneksi B (menang) harus berhasil memposting 1 baris.");

      const updA = await connA.query(
        `UPDATE stok_opname SET status = 'DIPOSTING', "dipostingPada" = now() WHERE id = $1 AND version = $2`,
        [opnameId, readA.rows[0].version],
      );
      assertTrue(
        updA.rowCount === 0,
        `CRUX: Koneksi A (kalah, version basi) HARUS mempengaruhi 0 baris pada percobaan posting KEDUA StokOpname yang SAMA, dapat ${updA.rowCount}.`,
      );

      const akhir = await setupPool.query(`SELECT status, version FROM stok_opname WHERE id = $1`, [opnameId]);
      assertTrue(
        akhir.rows[0].status === "DIPOSTING" && akhir.rows[0].version === 2,
        `Baris akhir harus mencerminkan posting B (status=DIPOSTING, version=2), dapat ${JSON.stringify(akhir.rows[0])}`,
      );
      // eslint-disable-next-line no-console
      console.log(
        "  -> (2) Dua posting StokOpname bersamaan pada baris SAMA: version conflict TERDETEKSI (dua koneksi pg nyata) - PROTEKSI SUDAH ADA.",
      );
    } finally {
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      await setupPool.query(`DELETE FROM stok_opname WHERE id = $1`, [opnameId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [penggunaId]);
      await setupPool.query(`DELETE FROM gudang WHERE id = $1`, [gudangId]);
      await setupPool.query(`DELETE FROM outlet WHERE id = $1`, [outletId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [tenantId]);
    }
  });
}

// ---------------------------------------------------------------------------
// (3) PROTEKSI ADA: dua reversal ledger CONCURRENT nyata (bukan sekuensial
// seperti ledger-reversal-membalik-invariants.test.ts) menunjuk baris asal
// mutasi_stok yang SAMA - unique index membalikMutasiId (ADR-032) harus tetap
// menolak yang kalah walau kedua transaksi benar-benar OVERLAP.
// ---------------------------------------------------------------------------
async function testDuaReversalLedgerConcurrentUniqueIndex(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const tenantId = fixtureId("tenant");
    const outletId = fixtureId("outlet");
    const gudangId = fixtureId("gudang");
    const satuanId = fixtureId("satuan");
    const bahanId = fixtureId("bahan");
    const penggunaId = fixtureId("pengguna");
    const keanggotaanTenantId = fixtureId("kt");
    const keanggotaanOutletId = fixtureId("ko");
    await setupPool.query(
      `INSERT INTO tenant (id, nama, slug, status, "createdAt") VALUES ($1, $2, $3, 'AKTIF', now())`,
      [tenantId, `Tenant ${tenantId}`, tenantId],
    );
    await setupPool.query(
      `INSERT INTO outlet (id, "tenantId", nama, kode, "zonaWaktu", status, "createdAt")
       VALUES ($1, $2, $3, $4, 'Asia/Jakarta', 'AKTIF', now())`,
      [outletId, tenantId, `Outlet ${outletId}`, outletId.slice(0, 10)],
    );
    await setupPool.query(
      `INSERT INTO gudang (id, "tenantId", "outletId", nama, status) VALUES ($1, $2, $3, $4, 'AKTIF')`,
      [gudangId, tenantId, outletId, `Gudang ${gudangId}`],
    );
    await setupPool.query(
      `INSERT INTO satuan (id, "tenantId", nama, simbol) VALUES ($1, $2, 'Kilogram', 'kg')`,
      [satuanId, tenantId],
    );
    await setupPool.query(
      `INSERT INTO bahan (id, "tenantId", nama, "kodeSku", "satuanDasarId", jenis, "stokMinimum", status)
       VALUES ($1, $2, $3, $4, $5, 'BAHAN_BAKU', 0, 'AKTIF')`,
      [bahanId, tenantId, `Bahan ${bahanId}`, bahanId.slice(0, 10), satuanId],
    );
    await setupPool.query(
      `INSERT INTO pengguna (id, "namaLengkap", email, status, "jumlahPercobaanGagal", "createdAt", "updatedAt")
       VALUES ($1, 'Aktor Uji', $2, 'AKTIF', 0, now(), now())`,
      [penggunaId, `${penggunaId}@example.test`],
    );
    await setupPool.query(
      `INSERT INTO keanggotaan_tenant (id, "penggunaId", "tenantId", status, "isOwner", "bergabungPada", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'AKTIF', false, now(), now(), now())`,
      [keanggotaanTenantId, penggunaId, tenantId],
    );
    await setupPool.query(
      `INSERT INTO keanggotaan_outlet (id, "keanggotaanTenantId", "tenantId", "outletId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'AKTIF', now(), now())`,
      [keanggotaanOutletId, keanggotaanTenantId, tenantId, outletId],
    );

    const mutasiAsalId = fixtureId("mutasi_asal");
    await setupPool.query(
      `INSERT INTO mutasi_stok
         (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', 10, 'PENYESUAIAN', $6, 'asal untuk uji konkurensi', $7, now())`,
      [mutasiAsalId, tenantId, outletId, gudangId, bahanId, fixtureId("ref"), keanggotaanOutletId],
    );

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    const pembalikAId = fixtureId("mutasi_pembalik_a");
    const pembalikBId = fixtureId("mutasi_pembalik_b");
    try {
      await connA.connect();
      await connB.connect();
      await connA.query("BEGIN");
      await connB.query("BEGIN");

      // Kedua transaksi benar-benar OVERLAP (keduanya sudah BEGIN sebelum
      // salah satu INSERT/COMMIT terjadi). A meng-INSERT lebih dulu dan
      // BERHASIL (tapi belum di-commit) - baris unique-nya baru "terlihat
      // pasti" oleh transaksi lain setelah A commit/rollback. B kemudian
      // meng-INSERT baris pembalik untuk ASAL YANG SAMA SAAT A MASIH BELUM
      // COMMIT - secara fisik ini membuat B BLOK menunggu (row-lock index
      // unik dari INSERT A yang belum diputuskan), PERSIS perilaku Postgres
      // nyata untuk unique-constraint check di bawah concurrency (bukan
      // deadlock - B hanya menunggu keputusan A). Baru setelah A di-COMMIT,
      // B "bangun" dan mendapati pelanggaran unique index yang sesungguhnya.
      // Pola ini (bukan Promise.all menunggu keduanya SEBELUM commit apa pun)
      // yang benar untuk menguji INSERT concurrent ke unique index - dua
      // Promise.all tanpa commit sela akan saling menunggu SELAMANYA karena
      // keduanya menunggu keputusan pihak lain (self-inflicted deadlock pada
      // level test, bukan pada level Postgres).
      await connA.query(
        `INSERT INTO mutasi_stok
           (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "membalikMutasiId", "dibuatOlehId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', -10, 'PENYESUAIAN', $6, 'pembalik dari koneksi A', $7, $8, now())`,
        [pembalikAId, tenantId, outletId, gudangId, bahanId, fixtureId("ref"), mutasiAsalId, keanggotaanOutletId],
      );

      const insertBPromise = connB.query(
        `INSERT INTO mutasi_stok
           (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "membalikMutasiId", "dibuatOlehId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', -10, 'PENYESUAIAN', $6, 'pembalik dari koneksi B', $7, $8, now())`,
        [pembalikBId, tenantId, outletId, gudangId, bahanId, fixtureId("ref"), mutasiAsalId, keanggotaanOutletId],
      );
      // Beri jeda singkat supaya insert B benar-benar sempat terkirim dan
      // masuk status "menunggu lock" di server SEBELUM A di-commit - inilah
      // yang membuktikan overlap nyata (bukan sekuensial A selesai total
      // duluan baru B mulai).
      await new Promise((resolve) => setTimeout(resolve, 200));

      await connA.query("COMMIT");

      let pesanGagalB = "";
      try {
        await insertBPromise;
        throw new Error("SEHARUSNYA_TIDAK_TERCAPAI: INSERT B seharusnya ditolak unique index setelah A commit.");
      } catch (err) {
        pesanGagalB = err instanceof Error ? err.message : String(err);
      }
      assertTrue(
        /duplicate key|unique constraint|membalikMutasiId_key/i.test(pesanGagalB),
        `Kegagalan INSERT B (setelah A commit duluan) harus dari unique index membalikMutasiId, dapat: ${pesanGagalB}`,
      );
      await connB.query("ROLLBACK").catch(() => undefined);

      const cek = await setupPool.query(`SELECT count(*)::int AS n FROM mutasi_stok WHERE "membalikMutasiId" = $1`, [
        mutasiAsalId,
      ]);
      assertTrue(
        cek.rows[0].n === 1,
        `Setelah kedua koneksi selesai, HARUS ada TEPAT SATU baris pembalik untuk mutasiAsalId, dapat ${cek.rows[0].n}.`,
      );
      // eslint-disable-next-line no-console
      console.log(
        "  -> (3) Dua reversal ledger CONCURRENT (bukan sekuensial) ke baris asal SAMA: unique index membalikMutasiId TETAP menolak yang kalah - PROTEKSI SUDAH ADA.",
      );
    } finally {
      await connA.query("ROLLBACK").catch(() => undefined);
      await connB.query("ROLLBACK").catch(() => undefined);
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      // TIDAK ADA cleanup DELETE di sini secara SENGAJA: mutasi_stok
      // append-only MENOLAK DELETE apa pun (itulah inti ADR-032 yang sedang
      // diuji) - baris "asal" dan "pembalikA" yang barusan di-COMMIT (bukan
      // ROLLBACK, satu-satunya cara memaksa dua koneksi FISIK berbeda saling
      // melihat commit yang sama) bersifat PERMANEN di altora_resto_dev,
      // sama seperti ledger produksi nyata - dan ini VALID/KONSISTEN (satu
      // pasang asal+pembalik yang benar, bukan baris yatim), bukan debris
      // rusak. Baris parent (tenant/outlet/gudang/bahan/aktor) TIDAK BISA
      // dihapus juga karena masih direferensikan FK oleh kedua baris
      // mutasi_stok permanen tsb. Ini adalah biaya yang melekat pada
      // pengujian NYATA (bukan simulasi) atas tabel append-only lintas dua
      // koneksi fisik - lihat AUDIT-CONCURRENCY-COVERAGE.md untuk catatan
      // lengkap keputusan ini.
    }
  });
}

// ---------------------------------------------------------------------------
// (4) FIXED (ALT-DEF-051/ADR-042): dua PromoPemakaian pada promo dengan
// usageQuota=1 (kuota TOTAL lintas semua pelanggan), masing-masing pesanan
// BERBEDA - trigger BARU trg_promo_pemakaian_cek_kuota_total mengunci baris
// Promo (SELECT ... FOR UPDATE) SEBELUM menghitung SUM(jumlahPenerapan)
// lintas PromoPemakaian - koneksi kedua HARUS menunggu koneksi pertama
// commit, lalu ditolak karena kuota sudah habis.
// ---------------------------------------------------------------------------
async function testDuaPromoKuotaTerakhirDitolakSetelahFix(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const pesanan1 = await createPesananFixture(setupPool as unknown as pg.PoolClient);
    // Promo.usageQuota adalah kuota TOTAL lintas SEMUA pesanan tenant yang
    // sama (bukan per-pesanan) - kedua percobaan HARUS memakai promo yang
    // SAMA di TENANT YANG SAMA (composite-FK ADR-013 (tenantId, promoId)
    // mewajibkan ini). createPesananFixture() SELALU membuat tenant baru
    // sendiri-sendiri, jadi pesanan KEDUA di sini dibuat manual (bukan lewat
    // createPesananFixture lagi) di tenant/outlet pesanan1 yang SAMA -
    // menyalin kategoriMenuId/itemMenuId yang sudah ada.
    const pesanan3TenantSama = {
      tenantId: pesanan1.tenantId,
      outletId: pesanan1.outletId,
      pesananId: fixtureId("pesanan2"),
    };
    await setupPool.query(
      `INSERT INTO pesanan (id, "tenantId", "outletId", kanal, "nomorPesanan", status, "dibuatOlehId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, 'KASIR', $4, 'DRAF', $5, now(), now(), 1)`,
      [
        pesanan3TenantSama.pesananId,
        pesanan1.tenantId,
        pesanan1.outletId,
        pesanan3TenantSama.pesananId.slice(0, 12),
        pesanan1.keanggotaanOutletId,
      ],
    );

    const promoId = fixtureId("promo_kuota_terakhir");
    await setupPool.query(
      `INSERT INTO promo (id, "tenantId", nama, "berlakuSejak", "berlakuSampai", status, "usageQuota", "createdAt", "updatedAt", version)
       VALUES ($1, $2, 'Promo Kuota Terakhir', now() - interval '1 day', now() + interval '30 day', 'AKTIF', 1, now(), now(), 1)`,
      [promoId, pesanan1.tenantId],
    );

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    const pemakaianAId = fixtureId("promopemakaian_a");
    const pemakaianBId = fixtureId("promopemakaian_b");
    try {
      await connA.connect();
      await connB.connect();
      await connA.query("BEGIN");
      await connB.query("BEGIN");

      // Koneksi A meng-INSERT lebih dulu dan BERHASIL (trigger mengunci
      // baris Promo FOR UPDATE, menghitung SUM=0 lain + 1 baru = 1, tidak
      // melebihi usageQuota=1, lolos) - tapi belum COMMIT, jadi lock baris
      // Promo masih dipegang A.
      await connA.query(
        `INSERT INTO promo_pemakaian (id, "tenantId", "promoId", "pesananId", status, "jumlahPenerapan", "totalDiskon", "createdAt")
         VALUES ($1, $2, $3, $4, 'DITERAPKAN', 1, 0, now())`,
        [pemakaianAId, pesanan1.tenantId, promoId, pesanan1.pesananId],
      );

      // Koneksi B mencoba INSERT KONKUREN (promise belum di-await) - trigger-nya
      // mencoba SELECT ... FOR UPDATE pada baris Promo yang SAMA dan BLOK
      // (bukan deadlock - B hanya menunggu keputusan A), PERSIS pola overlap
      // nyata di skenario #3 di atas.
      const insBPromise = connB.query(
        `INSERT INTO promo_pemakaian (id, "tenantId", "promoId", "pesananId", status, "jumlahPenerapan", "totalDiskon", "createdAt")
         VALUES ($1, $2, $3, $4, 'DITERAPKAN', 1, 0, now())`,
        [pemakaianBId, pesanan3TenantSama.tenantId, promoId, pesanan3TenantSama.pesananId],
      );
      // Jeda singkat supaya INSERT B benar-benar terkirim dan masuk status
      // "menunggu lock" SEBELUM A commit - membuktikan overlap nyata.
      await new Promise((resolve) => setTimeout(resolve, 200));

      await connA.query("COMMIT");

      let pesanGagalB = "";
      try {
        await insBPromise;
        throw new Error("SEHARUSNYA_TIDAK_TERCAPAI: INSERT B seharusnya ditolak trigger kuota setelah A commit.");
      } catch (err) {
        pesanGagalB = err instanceof Error ? err.message : String(err);
      }
      assertTrue(
        /usageQuota|ALT-DEF-051/i.test(pesanGagalB),
        `Kegagalan INSERT B (setelah A commit duluan) harus dari trigger trg_promo_pemakaian_cek_kuota_total, dapat: ${pesanGagalB}`,
      );
      await connB.query("ROLLBACK").catch(() => undefined);

      const totalPemakaian = await setupPool.query(
        `SELECT count(*)::int AS n FROM promo_pemakaian WHERE "promoId" = $1`,
        [promoId],
      );
      assertTrue(
        totalPemakaian.rows[0].n === 1,
        `FIX (ALT-DEF-051): dengan usageQuota=1, HARUS ada TEPAT SATU baris PromoPemakaian yang berhasil (koneksi A), dapat ${totalPemakaian.rows[0].n}.`,
      );
      // eslint-disable-next-line no-console
      console.log(
        "  -> (4) FIXED (ALT-DEF-051): dua PromoPemakaian pesanan berbeda pada promo usageQuota=1 - koneksi KEDUA DITOLAK trg_promo_pemakaian_cek_kuota_total (kuota tetap 1/1).",
      );
    } finally {
      await connA.query("ROLLBACK").catch(() => undefined);
      await connB.query("ROLLBACK").catch(() => undefined);
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      await setupPool.query(`DELETE FROM promo_pemakaian WHERE "promoId" = $1`, [promoId]);
      await setupPool.query(`DELETE FROM promo WHERE id = $1`, [promoId]);
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [pesanan3TenantSama.pesananId]);
      await setupPool.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [pesanan1.pesananId]);
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [pesanan1.pesananId]);
      await setupPool.query(`DELETE FROM item_menu WHERE id = $1`, [pesanan1.itemMenuId]);
      await setupPool.query(`DELETE FROM kategori_menu WHERE id = $1`, [pesanan1.kategoriMenuId]);
      await setupPool.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [pesanan1.keanggotaanOutletId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [pesanan1.keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [pesanan1.penggunaId]);
      await setupPool.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [pesanan1.tenantId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [pesanan1.tenantId]);
    }
  });
}

// ---------------------------------------------------------------------------
// (5) FIXED (ALT-DEF-052/ADR-042): dua ReservasiStok untuk ItemPesanan
// BERBEDA yang sama-sama mengklaim SISA stok terakhir (StokBahan.kuantitas=1,
// kuantitasDireservasi=0) - trigger BARU trg_reservasi_stok_cek_ketersediaan
// mengunci baris StokBahan agregat (SELECT ... FOR UPDATE) SEBELUM
// menghitung SUM(jumlah) reservasi AKTIF lain - koneksi kedua HARUS
// menunggu koneksi pertama commit, lalu ditolak karena saldo sudah habis.
// ---------------------------------------------------------------------------
async function testDuaReservasiStokTerakhirDitolakSetelahFix(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const fx = await createReservasiFixture(setupPool as unknown as pg.PoolClient, { jumlahItem: 2 });
    const [itemA, itemB] = fx.itemPesananIds;

    const stokBahanId = fixtureId("stokbahan_terakhir");
    await setupPool.query(
      `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
       VALUES ($1, $2, $3, $4, NULL, 1, 0, now())`,
      [stokBahanId, fx.tenantId, fx.gudangId, fx.bahanId],
    );

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    const reservasiAId = fixtureId("reservasi_a");
    const reservasiBId = fixtureId("reservasi_b");
    try {
      await connA.connect();
      await connB.connect();
      await connA.query("BEGIN");
      await connB.query("BEGIN");

      // Koneksi A meng-INSERT lebih dulu dan BERHASIL (trigger mengunci
      // baris StokBahan FOR UPDATE, menghitung SUM=0 aktif lain + 1 baru = 1,
      // tidak melebihi saldo tersedia=1, lolos) - belum COMMIT, lock baris
      // StokBahan masih dipegang A. ItemPesanan BERBEDA -> unique index
      // reservasi_stok_itemPesananId_key TIDAK relevan di sini (itu hanya
      // mencegah dua reservasi untuk ITEM yang SAMA).
      await connA.query(
        `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1, $6, 'AKTIF', now())`,
        [reservasiAId, fx.tenantId, fx.outletId, itemA, fx.bahanId, fx.satuanId],
      );

      // Koneksi B mencoba INSERT KONKUREN - trigger-nya mencoba SELECT ...
      // FOR UPDATE pada baris StokBahan yang SAMA dan BLOK sampai A memutus
      // (commit/rollback), PERSIS pola overlap nyata skenario #3.
      const insBPromise = connB.query(
        `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1, $6, 'AKTIF', now())`,
        [reservasiBId, fx.tenantId, fx.outletId, itemB, fx.bahanId, fx.satuanId],
      );
      await new Promise((resolve) => setTimeout(resolve, 200));

      await connA.query("COMMIT");

      let pesanGagalB = "";
      try {
        await insBPromise;
        throw new Error("SEHARUSNYA_TIDAK_TERCAPAI: INSERT B seharusnya ditolak trigger ketersediaan setelah A commit.");
      } catch (err) {
        pesanGagalB = err instanceof Error ? err.message : String(err);
      }
      assertTrue(
        /saldo tersedia|ALT-DEF-052/i.test(pesanGagalB),
        `Kegagalan INSERT B (setelah A commit duluan) harus dari trigger trg_reservasi_stok_cek_ketersediaan, dapat: ${pesanGagalB}`,
      );
      await connB.query("ROLLBACK").catch(() => undefined);

      const totalDireservasi = await setupPool.query(
        `SELECT COALESCE(SUM(jumlah), 0)::int AS total FROM reservasi_stok WHERE id IN ($1, $2) AND status = 'AKTIF'`,
        [reservasiAId, reservasiBId],
      );
      assertTrue(
        Number(totalDireservasi.rows[0].total) === 1,
        `FIX (ALT-DEF-052): terhadap stok fisik 1 unit, HARUS ada TEPAT SATU reservasi yang berhasil (koneksi A), dapat total=${totalDireservasi.rows[0].total}.`,
      );
      // eslint-disable-next-line no-console
      console.log(
        "  -> (5) FIXED (ALT-DEF-052): dua ReservasiStok item berbeda mengklaim unit stok terakhir yang SAMA - koneksi KEDUA DITOLAK trg_reservasi_stok_cek_ketersediaan (direservasi tetap 1/1).",
      );
    } finally {
      await connA.query("ROLLBACK").catch(() => undefined);
      await connB.query("ROLLBACK").catch(() => undefined);
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      await setupPool.query(`DELETE FROM reservasi_stok WHERE id IN ($1, $2)`, [reservasiAId, reservasiBId]);
      await setupPool.query(`DELETE FROM stok_bahan WHERE id = $1`, [stokBahanId]);
      await setupPool.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM item_menu WHERE id = $1`, [fx.itemMenuId]);
      await setupPool.query(`DELETE FROM kategori_menu WHERE id = $1`, [fx.kategoriMenuId]);
      await setupPool.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [fx.keanggotaanOutletId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [fx.keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [fx.penggunaId]);
      await setupPool.query(`DELETE FROM bahan WHERE id = $1`, [fx.bahanId]);
      await setupPool.query(`DELETE FROM satuan WHERE id = $1`, [fx.satuanId]);
      await setupPool.query(`DELETE FROM gudang WHERE id = $1`, [fx.gudangId]);
      await setupPool.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [fx.tenantId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [fx.tenantId]);
    }
  });
}

// ---------------------------------------------------------------------------
// (6) FIXED (ALT-DEF-053/ADR-042): dua Pembayaran BERBEDA, masing-masing
// mencoba mengalokasikan ke Pesanan yang SAMA sedemikian sehingga
// SUM(alokasi) > Pesanan.totalAkhir - trigger BARU
// trg_alokasi_pembayaran_cek_batas_pesanan mengunci baris Pesanan (SELECT
// ... FOR UPDATE) SEBELUM menghitung SUM(AlokasiPembayaran.jumlah) lintas
// Pembayaran lain - koneksi kedua HARUS menunggu koneksi pertama commit,
// lalu ditolak karena tagihan sudah lunas. CATATAN: race ini terjadi PERSIS
// pada momen INSERT alokasi_pembayaran itu sendiri (bukan pada UPDATE status
// Pembayaran belakangan seperti versi test lama) - lihat rasional "status
// mana yang dihitung" di ADR-042 Keputusan 3 (SEMUA status ikut dihitung
// kecuali GAGAL/DIBATALKAN/DIKEMBALIKAN, termasuk DRAF, karena race asli
// justru terjadi saat kedua Pembayaran masih DRAF).
// ---------------------------------------------------------------------------
async function testDuaPembayaranOverAlokasiDitolakSetelahFix(): Promise<void> {
  await withCleanupPool(async (setupPool) => {
    const fx = await createPesananFixture(setupPool as unknown as pg.PoolClient, { status: "DIKONFIRMASI" });
    // totalAkhir default fixture = 0 (tidak pernah di-set createPesananFixture) -
    // set eksplisit ke nilai kecil supaya jelas dilampaui oleh 2x20000.
    await setupPool.query(`UPDATE pesanan SET "totalAkhir" = 20000 WHERE id = $1`, [fx.pesananId]);

    const pembayaranAId = fixtureId("pembayaran_a");
    const pembayaranBId = fixtureId("pembayaran_b");
    const alokasiAId = fixtureId("alokasi_a");
    const alokasiBId = fixtureId("alokasi_b");

    for (const pembayaranId of [pembayaranAId, pembayaranBId]) {
      await setupPool.query(
        `INSERT INTO pembayaran (id, "tenantId", "outletId", jumlah, "totalDiterima", kembalian, status, "createdAt", "updatedAt", version)
         VALUES ($1, $2, $3, 20000, 20000, 0, 'DRAF', now(), now(), 1)`,
        [pembayaranId, fx.tenantId, fx.outletId],
      );
    }
    // Bila KEDUA alokasi 20000 berhasil, total ke Pesanan yang sama = 40000,
    // DUA KALI LIPAT Pesanan.totalAkhir=20000 - inilah over-alokasi yang
    // harus dicegah SAAT INSERT alokasi_pembayaran KEDUA.

    const connA = new pg.Client({ connectionString: DATABASE_URL });
    const connB = new pg.Client({ connectionString: DATABASE_URL });
    try {
      await connA.connect();
      await connB.connect();
      await connA.query("BEGIN");
      await connB.query("BEGIN");

      // Koneksi A meng-INSERT alokasi lebih dulu dan BERHASIL (trigger
      // mengunci baris Pesanan FOR UPDATE, menghitung SUM=0 lain + 20000
      // baru = 20000, tidak melebihi totalAkhir=20000, lolos) - belum
      // COMMIT, lock baris Pesanan masih dipegang A.
      await connA.query(
        `INSERT INTO alokasi_pembayaran (id, "tenantId", "pembayaranId", "pesananId", jumlah, "createdAt")
         VALUES ($1, $2, $3, $4, 20000, now())`,
        [alokasiAId, fx.tenantId, pembayaranAId, fx.pesananId],
      );

      // Koneksi B mencoba INSERT alokasi KONKUREN untuk Pembayaran BERBEDA
      // ke Pesanan yang SAMA - trigger-nya mencoba SELECT ... FOR UPDATE
      // pada baris Pesanan yang SAMA dan BLOK sampai A memutus, PERSIS pola
      // overlap nyata skenario #3.
      const insBPromise = connB.query(
        `INSERT INTO alokasi_pembayaran (id, "tenantId", "pembayaranId", "pesananId", jumlah, "createdAt")
         VALUES ($1, $2, $3, $4, 20000, now())`,
        [alokasiBId, fx.tenantId, pembayaranBId, fx.pesananId],
      );
      await new Promise((resolve) => setTimeout(resolve, 200));

      await connA.query("COMMIT");

      let pesanGagalB = "";
      try {
        await insBPromise;
        throw new Error("SEHARUSNYA_TIDAK_TERCAPAI: INSERT B seharusnya ditolak trigger batas pesanan setelah A commit.");
      } catch (err) {
        pesanGagalB = err instanceof Error ? err.message : String(err);
      }
      assertTrue(
        /totalAkhir|ALT-DEF-053/i.test(pesanGagalB),
        `Kegagalan INSERT B (setelah A commit duluan) harus dari trigger trg_alokasi_pembayaran_cek_batas_pesanan, dapat: ${pesanGagalB}`,
      );
      await connB.query("ROLLBACK").catch(() => undefined);

      const cek = await setupPool.query(
        `SELECT
           (SELECT COALESCE(SUM(jumlah), 0) FROM alokasi_pembayaran WHERE "pesananId" = $1) AS total_alokasi,
           (SELECT "totalAkhir" FROM pesanan WHERE id = $1) AS total_akhir`,
        [fx.pesananId],
      );
      assertTrue(
        BigInt(cek.rows[0].total_alokasi) === BigInt(cek.rows[0].total_akhir),
        `FIX (ALT-DEF-053): total alokasi (${cek.rows[0].total_alokasi}) HARUS PERSIS SAMA dengan Pesanan.totalAkhir (${cek.rows[0].total_akhir}) - hanya alokasi A yang berhasil.`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `  -> (6) FIXED (ALT-DEF-053): dua Pembayaran berbeda ke SATU Pesanan - koneksi KEDUA DITOLAK trg_alokasi_pembayaran_cek_batas_pesanan (total alokasi tetap ${cek.rows[0].total_alokasi}, sama dengan totalAkhir).`,
      );
    } finally {
      await connA.query("ROLLBACK").catch(() => undefined);
      await connB.query("ROLLBACK").catch(() => undefined);
      await connA.end().catch(() => undefined);
      await connB.end().catch(() => undefined);
      await setupPool.query(`DELETE FROM alokasi_pembayaran WHERE "pesananId" = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM pembayaran WHERE id IN ($1, $2)`, [pembayaranAId, pembayaranBId]);
      await setupPool.query(`DELETE FROM item_pesanan WHERE "pesananId" = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM pesanan WHERE id = $1`, [fx.pesananId]);
      await setupPool.query(`DELETE FROM item_menu WHERE id = $1`, [fx.itemMenuId]);
      await setupPool.query(`DELETE FROM kategori_menu WHERE id = $1`, [fx.kategoriMenuId]);
      await setupPool.query(`DELETE FROM keanggotaan_outlet WHERE id = $1`, [fx.keanggotaanOutletId]);
      await setupPool.query(`DELETE FROM keanggotaan_tenant WHERE id = $1`, [fx.keanggotaanTenantId]);
      await setupPool.query(`DELETE FROM pengguna WHERE id = $1`, [fx.penggunaId]);
      await setupPool.query(`DELETE FROM outlet WHERE "tenantId" = $1`, [fx.tenantId]);
      await setupPool.query(`DELETE FROM tenant WHERE id = $1`, [fx.tenantId]);
    }
  });
}

async function main(): Promise<void> {
  await testDuaKonfirmasiPembayaranBersamaanVersionConflict();
  await testDuaPostingOpnameBersamaanVersionConflict();
  await testDuaReversalLedgerConcurrentUniqueIndex();
  await testDuaPromoKuotaTerakhirDitolakSetelahFix();
  await testDuaReservasiStokTerakhirDitolakSetelahFix();
  await testDuaPembayaranOverAlokasiDitolakSetelahFix();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-041/ADR-042 (konsolidasi audit konkurensi - 3 proteksi terverifikasi ulang lewat dua-koneksi nyata + 3 race ALT-DEF-051/052/053 kini DITOLAK trigger DB) lulus.",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
