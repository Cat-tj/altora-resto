// Test database-integration untuk ADR-034 (migrasi field uang dari `Int` ke
// `BigInt`, mengamandemen ADR-005 lama) / migrasi
// prisma/schema/migrations/20260726084007_migrasi_uang_int_ke_bigint.
//
// Memverifikasi TIGA hal secara NYATA lewat Postgres, bukan diasumsikan:
//   1. FAKTA PERILAKU int4: Postgres `integer` (int4) MENOLAK (raise error)
//      nilai di luar jangkauan -2147483648..2147483647, baik lewat literal
//      INSERT maupun lewat aritmetika (`n + 1` yang melewati batas atas) -
//      BUKAN silent wraparound seperti anggapan awal batch ini. Diverifikasi
//      di tabel int4 buang-pakai (`_probe_int4_overflow`, dibuat+dihapus di
//      dalam transaksi test, tidak pernah nyangkut di skema nyata).
//   2. KONTROL NEGATIF: nilai yang SAMA (2_200_000_000, > INT4 max) yang
//      gagal di tabel int4 kontrol, BERHASIL disisipkan ke kolom asli yang
//      sudah dimigrasi ke BigInt (`rm_penjualan_harian.totalPenjualan`,
//      `pelanggan.saldoTokoCache`) - bukti langsung bahwa migrasi ini
//      menyelesaikan overflow yang SEBELUMNYA (saat kolom itu masih `Int`)
//      pasti akan gagal dengan cara yang identik dengan kontrol int4 di atas.
//   3. Nilai BigInt yang disisipkan terbaca kembali PERSIS sama (exact,
//      tidak ada presisi hilang) - properti yang tidak dijamin `Decimal`
//      float atau `number` JS di atas 2^53.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/uang-bigint-overflow.test.ts

import {
  assertTrue,
  createBaseFixtures,
  createKeanggotaanFixtures,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper.js";
import pg from "pg";

const INT4_MAX = 2147483647n;
const OVERFLOW_VALUE = 2200000000n; // > INT4_MAX, rupiah senilai ~2.2 miliar

/**
 * (1) Fakta perilaku int4 murni - tabel buang-pakai, TIDAK terkait skema
 * aplikasi, hanya menetapkan fakta Postgres yang jadi dasar justifikasi
 * ADR-034. Dijalankan di pool terpisah (bukan withTransaction helper) karena
 * butuh membuat/menghapus tabel sendiri secara eksplisit.
 */
async function testInt4OverflowBerarti_Error_BukanWraparound(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("DROP TABLE IF EXISTS _probe_int4_overflow");
    await client.query("CREATE TABLE _probe_int4_overflow (n int4)");
    await client.query("INSERT INTO _probe_int4_overflow VALUES (2147483647)");

    // (a) Aritmetika yang melewati batas atas HARUS melempar error, bukan
    // wrap ke negatif.
    let arithErr: string | null = null;
    try {
      await client.query("UPDATE _probe_int4_overflow SET n = n + 1");
    } catch (err) {
      arithErr = err instanceof Error ? err.message : String(err);
    }
    assertTrue(
      arithErr !== null && /out of range/i.test(arithErr),
      `Aritmetika int4 melewati batas atas HARUS melempar error "out of range", dapat: ${arithErr}`,
    );
    const cek = await client.query("SELECT n FROM _probe_int4_overflow");
    assertTrue(
      cek.rows[0].n === 2147483647,
      `Setelah UPDATE gagal, nilai kolom int4 HARUS tetap 2147483647 (transaksi statement Postgres membatalkan efek statement yang error), dapat: ${cek.rows[0].n}`,
    );

    // (b) Literal INSERT di luar jangkauan HARUS ditolak.
    let insertErr: string | null = null;
    try {
      await client.query("INSERT INTO _probe_int4_overflow VALUES (2200000000)");
    } catch (err) {
      insertErr = err instanceof Error ? err.message : String(err);
    }
    assertTrue(
      insertErr !== null && /out of range/i.test(insertErr),
      `INSERT literal di luar jangkauan int4 HARUS ditolak, dapat: ${insertErr}`,
    );
  } finally {
    await client.query("DROP TABLE IF EXISTS _probe_int4_overflow").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

/**
 * (2) Kontrol negatif + bukti positif dalam satu test: tabel int4 kontrol
 * (identik skenario di atas, dibuat ulang di sini untuk keterbacaan test
 * yang independen) menolak OVERFLOW_VALUE, sedangkan kolom BigInt asli yang
 * baru dimigrasi (rm_penjualan_harian.totalPenjualan, pelanggan.saldoTokoCache)
 * menerimanya dengan sukses DAN membaca kembali nilai exact yang sama.
 */
async function testKolomBigIntMenerimaNilaiYangGagalDiInt4(): Promise<void> {
  await withTransaction(async (client) => {
    // --- Kontrol: tabel int4 buang-pakai di dalam transaksi test yang sama ---
    await client.query("CREATE TEMP TABLE _probe_int4_kontrol (n int4) ON COMMIT DROP");
    const kontrolMsg = await expectReject(
      client,
      "INSERT nilai > INT4_MAX ke tabel kontrol int4",
      () => client.query("INSERT INTO _probe_int4_kontrol VALUES ($1)", [OVERFLOW_VALUE.toString()]),
    );
    assertTrue(
      /out of range/i.test(kontrolMsg),
      `Kontrol int4 harus gagal dengan "out of range", dapat: ${kontrolMsg}`,
    );

    // --- Bukti positif #1: rm_penjualan_harian.totalPenjualan (BigInt, agregat harian per outlet) ---
    const fx = await createBaseFixtures(client);
    const rmId = fixtureId("rm_penjualan");
    await client.query(
      `INSERT INTO rm_penjualan_harian
         (id, "tenantId", "outletId", tanggal, "totalTransaksi", "totalPenjualan", "totalDiskon", "totalRefund", "dihitungPada")
       VALUES ($1, $2, $3, CURRENT_DATE, 1, $4, 0, 0, now())`,
      [rmId, fx.tenantId, fx.outletId, OVERFLOW_VALUE.toString()],
    );
    const rmRes = await client.query(
      `SELECT "totalPenjualan" FROM rm_penjualan_harian WHERE id = $1`,
      [rmId],
    );
    assertTrue(
      BigInt(rmRes.rows[0].totalPenjualan) === OVERFLOW_VALUE,
      `rm_penjualan_harian.totalPenjualan harus menyimpan+membaca kembali ${OVERFLOW_VALUE} persis (BigInt exact), dapat: ${rmRes.rows[0].totalPenjualan}`,
    );
    assertTrue(
      OVERFLOW_VALUE > INT4_MAX,
      "sanity: OVERFLOW_VALUE harus benar-benar melebihi INT4_MAX supaya test ini bermakna",
    );

    // --- Bukti positif #2: pelanggan.saldoTokoCache (BigInt, saldo kumulatif) ---
    const kfx = await createKeanggotaanFixtures(client);
    await client.query(
      `UPDATE pelanggan SET "saldoTokoCache" = $1 WHERE id = $2`,
      [OVERFLOW_VALUE.toString(), kfx.pelangganId],
    );
    const plRes = await client.query(
      `SELECT "saldoTokoCache" FROM pelanggan WHERE id = $1`,
      [kfx.pelangganId],
    );
    assertTrue(
      BigInt(plRes.rows[0].saldoTokoCache) === OVERFLOW_VALUE,
      `pelanggan.saldoTokoCache harus menyimpan+membaca kembali ${OVERFLOW_VALUE} persis, dapat: ${plRes.rows[0].saldoTokoCache}`,
    );

    // --- Bukti tambahan: aritmetika BigInt di atas INT4_MAX tidak error ---
    const tambahRes = await client.query(
      `SELECT ("totalPenjualan" + 1)::bigint AS n FROM rm_penjualan_harian WHERE id = $1`,
      [rmId],
    );
    assertTrue(
      BigInt(tambahRes.rows[0].n) === OVERFLOW_VALUE + 1n,
      `Aritmetika BigInt melewati INT4_MAX harus sukses tanpa error, dapat: ${tambahRes.rows[0].n}`,
    );
  });
}

/**
 * (3) Verifikasi kolom yang SENGAJA TIDAK dimigrasi (ADR-034 Keputusan 2:
 * `poin_riwayat.jumlah`/`keanggotaan.poinAktif` adalah POIN loyalitas, bukan
 * rupiah - dikecualikan dari migrasi ini) TETAP `Int` biasa dan karena itu
 * TETAP menolak nilai di luar jangkauan int4 - kontrol bahwa pengecualian
 * yang didokumentasikan benar-benar disengaja dan konsisten, bukan celah
 * yang terlewat.
 */
async function testKolomYangSengajaDikecualikanTetapInt4(): Promise<void> {
  await withTransaction(async (client) => {
    const kfx = await createKeanggotaanFixtures(client);
    const msg = await expectReject(
      client,
      "UPDATE keanggotaan.poinAktif dengan nilai > INT4_MAX (kolom ini SENGAJA tetap Int, bukan rupiah)",
      () =>
        client.query(`UPDATE keanggotaan SET "poinAktif" = $1 WHERE id = $2`, [
          OVERFLOW_VALUE.toString(),
          kfx.keanggotaanId,
        ]),
    );
    assertTrue(
      /out of range/i.test(msg),
      `keanggotaan.poinAktif harus tetap int4 dan menolak nilai di luar jangkauan, dapat: ${msg}`,
    );
  });
}

async function main(): Promise<void> {
  await testInt4OverflowBerarti_Error_BukanWraparound();
  await testKolomBigIntMenerimaNilaiYangGagalDiInt4();
  await testKolomYangSengajaDikecualikanTetapInt4();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-034 (migrasi uang Int->BigInt, int4 overflow = error bukan wraparound) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
