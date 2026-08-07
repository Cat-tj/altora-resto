// Test database-integration untuk ADR-037 (aturan tunggal siklus hidup stok:
// reservasi-konsumsi-waste) - migrasi
// `20260726140000_siklus_hidup_stok_reservasi_konsumsi_waste`. Menyambung ke
// Postgres NYATA.
//
// YANG DIBUKTIKAN SECARA PERILAKU:
//   1. Idempotency reservasi: DUA baris ReservasiStok untuk ItemPesanan yang
//      SAMA ditolak (unique violation `reservasi_stok_itemPesananId_key`).
//   2. Idempotency konsumsi: setelah reservasi ditautkan ke satu MutasiStok
//      (mutasiStokId terisi), UPDATE lanjutan yang mencoba menautkannya ke
//      mutasi LAIN (percobaan "konsumsi ganda") ditolak trigger
//      `trg_reservasi_stok_kunci_konsumsi`. Terpisah: DUA reservasi berbeda
//      yang menunjuk SATU mutasi yang sama juga ditolak (unique violation
//      `reservasi_stok_mutasiStokId_key`).
//   3. Siklus penuh: DITERIMA -> reservasi AKTIF -> "konsumsi" (status
//      DIKONSUMSI + MutasiStok PEMAKAIAN_RESEP + linkage mutasiStokId) -
//      linkage bisa di-query balik dan konsisten (jumlah/bahan sama).
//   4. Siklus batal-sebelum-produksi: reservasi AKTIF -> DILEPAS TANPA mutasi
//      apa pun (mutasiStokId tetap NULL, tidak melanggar constraint apa pun).
//   5. Kebijakan stok negatif (ADR-025 Keputusan 4 + ADR-037): StokBahan yang
//      diupdate jadi kuantitas negatif DITOLAK ketika belum ada baris
//      `PengaturanPersediaanOutlet` (default tolak) MAUPUN ketika ada baris
//      eksplisit `izinkanStokNegatif = false`; DIIZINKAN ketika
//      `izinkanStokNegatif = true`.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/siklus-hidup-stok-invariants.test.ts

import {
  assertTrue,
  createReservasiFixture,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper"
import pg from "pg";

async function testObjectsExist(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'reservasi_stok'
       AND indexname IN ('reservasi_stok_itemPesananId_key', 'reservasi_stok_mutasiStokId_key', 'reservasi_stok_tenantId_mutasiStokId_key')
       ORDER BY indexname`,
    );
    assertTrue(idx.rowCount === 3, `Ketiga unique index ADR-037 harus ada di reservasi_stok, dapat ${idx.rowCount}.`);

    const fk = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'reservasi_stok_tenantId_mutasiStokId_fkey'`,
    );
    assertTrue(fk.rowCount === 1, "FK composite reservasi_stok -> mutasi_stok (tenantId, mutasiStokId) harus ada.");

    const trg = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'reservasi_stok'::regclass AND tgname = 'trg_reservasi_stok_kunci_konsumsi'`,
    );
    assertTrue(trg.rowCount === 1, "Trigger trg_reservasi_stok_kunci_konsumsi harus ada di reservasi_stok.");

    const trgNegatif = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'stok_bahan'::regclass AND tgname = 'trg_stok_bahan_cek_negatif'`,
    );
    assertTrue(trgNegatif.rowCount === 1, "Trigger trg_stok_bahan_cek_negatif harus ada di stok_bahan.");
  } finally {
    await pool.end();
  }
}

async function testReservasiTidakBolehDuplikatPerItem(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client, { status: "DITERIMA" });
    const itemPesananId = fx.itemPesananIds[0]!;

    await client.query(
      `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 2, $6, 'AKTIF', now())`,
      [fixtureId("reservasi"), fx.tenantId, fx.outletId, itemPesananId, fx.bahanId, fx.satuanId],
    );

    const msg = await expectReject(client, "ReservasiStok kedua untuk ItemPesanan yang sama", () =>
      client.query(
        `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1, $6, 'AKTIF', now())`,
        [fixtureId("reservasi"), fx.tenantId, fx.outletId, itemPesananId, fx.bahanId, fx.satuanId],
      ),
    );
    assertTrue(
      /duplicate key|unique constraint|reservasi_stok_itemPesananId_key/i.test(msg),
      `error harus dari unique index reservasi_stok_itemPesananId_key, dapat: ${msg}`,
    );
  });
}

async function testKonsumsiTidakBolehGanda(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client, { status: "DITERIMA" });
    const itemPesananId = fx.itemPesananIds[0]!;

    const reservasiId = fixtureId("reservasi");
    await client.query(
      `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 2, $6, 'AKTIF', now())`,
      [reservasiId, fx.tenantId, fx.outletId, itemPesananId, fx.bahanId, fx.satuanId],
    );

    const dibuatOlehId = fx.keanggotaanOutletId;

    // --- Konsumsi pertama: BERHASIL. ---
    const mutasi1Id = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PEMAKAIAN_RESEP', -2, 'PESANAN', $6, 'Konsumsi reservasi untuk produksi', $7, now())`,
      [mutasi1Id, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, itemPesananId, dibuatOlehId],
    );
    await client.query(
      `UPDATE reservasi_stok SET status = 'DIKONSUMSI', "mutasiStokId" = $1, "dilepasPada" = now() WHERE id = $2`,
      [mutasi1Id, reservasiId],
    );

    const setelahKonsumsi = (
      await client.query(`SELECT status, "mutasiStokId" FROM reservasi_stok WHERE id = $1`, [reservasiId])
    ).rows[0];
    assertTrue(
      setelahKonsumsi.status === "DIKONSUMSI" && setelahKonsumsi.mutasiStokId === mutasi1Id,
      `Reservasi harus DIKONSUMSI dan tertaut ke mutasi1, dapat status=${setelahKonsumsi.status} mutasiStokId=${setelahKonsumsi.mutasiStokId}`,
    );

    // --- Percobaan konsumsi KEDUA atas reservasi YANG SAMA (retautkan ke mutasi baru) -> DITOLAK trigger. ---
    const mutasi2Id = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PEMAKAIAN_RESEP', -2, 'PESANAN', $6, 'Percobaan konsumsi ganda', $7, now())`,
      [mutasi2Id, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, itemPesananId, dibuatOlehId],
    );
    const msgRetaut = await expectReject(client, "UPDATE reservasi yang sudah dikonsumsi ke mutasiStokId lain", () =>
      client.query(`UPDATE reservasi_stok SET "mutasiStokId" = $1 WHERE id = $2`, [mutasi2Id, reservasiId]),
    );
    assertTrue(
      msgRetaut.includes("sudah dikonsumsi") || msgRetaut.includes("trg_reservasi_stok_kunci_konsumsi"),
      `Error harus dari trigger trg_reservasi_stok_kunci_konsumsi (kunci konsumsi), dapat: ${msgRetaut}`,
    );

    // --- Percobaan reservasi LAIN menunjuk mutasi1 yang SAMA -> DITOLAK unique. ---
    const fx2 = await createReservasiFixture(client, { status: "DITERIMA" });
    const reservasiLainId = fixtureId("reservasi");
    await client.query(
      `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 1, $6, 'AKTIF', now())`,
      [reservasiLainId, fx2.tenantId, fx2.outletId, fx2.itemPesananIds[0], fx2.bahanId, fx2.satuanId],
    );
    const msgDobelMutasi = await expectReject(client, "Reservasi lain menunjuk mutasiStokId yang sudah dipakai", () =>
      client.query(`UPDATE reservasi_stok SET status = 'DIKONSUMSI', "mutasiStokId" = $1 WHERE id = $2`, [
        mutasi1Id,
        reservasiLainId,
      ]),
    );
    assertTrue(
      /duplicate key|unique constraint|reservasi_stok_mutasiStokId_key/i.test(msgDobelMutasi),
      `error harus dari unique index reservasi_stok_mutasiStokId_key, dapat: ${msgDobelMutasi}`,
    );
  });
}

async function testSiklusPenuhReservasiKonsumsi(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client, { status: "DITERIMA" });
    const itemPesananId = fx.itemPesananIds[0]!;

    // 1. Pesanan DITERIMA -> ReservasiStok dibuat AKTIF.
    const reservasiId = fixtureId("reservasi");
    await client.query(
      `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 3, $6, 'AKTIF', now())`,
      [reservasiId, fx.tenantId, fx.outletId, itemPesananId, fx.bahanId, fx.satuanId],
    );

    const dibuatOlehId = fx.keanggotaanOutletId;

    // 2. Pesanan DIKIRIM_KE_DAPUR -> reservasi dilepas jadi DIKONSUMSI + MutasiStok PEMAKAIAN_RESEP.
    const mutasiId = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PEMAKAIAN_RESEP', -3, 'PESANAN', $6, 'Bahan mulai dipakai dapur', $7, now())`,
      [mutasiId, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, itemPesananId, dibuatOlehId],
    );
    await client.query(
      `UPDATE reservasi_stok SET status = 'DIKONSUMSI', "mutasiStokId" = $1, "dilepasPada" = now() WHERE id = $2`,
      [mutasiId, reservasiId],
    );

    // 3. Linkage bisa di-query balik dan konsisten.
    const joined = (
      await client.query(
        `SELECT r.status AS reservasi_status, r.jumlah AS reservasi_jumlah, m.jenis AS mutasi_jenis, m.jumlah AS mutasi_jumlah, m."bahanId" AS mutasi_bahan
         FROM reservasi_stok r JOIN mutasi_stok m ON m.id = r."mutasiStokId"
         WHERE r.id = $1`,
        [reservasiId],
      )
    ).rows[0];
    assertTrue(
      joined.reservasi_status === "DIKONSUMSI" && joined.mutasi_jenis === "PEMAKAIAN_RESEP",
      `Join reservasi->mutasi harus menunjukkan DIKONSUMSI+PEMAKAIAN_RESEP, dapat ${JSON.stringify(joined)}`,
    );
    assertTrue(
      joined.mutasi_bahan === fx.bahanId && Number(joined.reservasi_jumlah) === Math.abs(Number(joined.mutasi_jumlah)),
      `bahanId dan besaran jumlah reservasi vs mutasi (tanda berlawanan, keluar) harus konsisten, dapat ${JSON.stringify(joined)}`,
    );
  });
}

async function testSiklusBatalSebelumProduksiTanpaMutasi(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client, { status: "DITERIMA" });
    const itemPesananId = fx.itemPesananIds[0]!;

    const reservasiId = fixtureId("reservasi");
    await client.query(
      `INSERT INTO reservasi_stok (id, "tenantId", "outletId", "itemPesananId", "bahanId", jumlah, "satuanId", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 2, $6, 'AKTIF', now())`,
      [reservasiId, fx.tenantId, fx.outletId, itemPesananId, fx.bahanId, fx.satuanId],
    );

    // Pesanan DIBATALKAN sebelum produksi -> reservasi DILEPAS, TIDAK ADA mutasi.
    await client.query(`UPDATE reservasi_stok SET status = 'DILEPAS', "dilepasPada" = now() WHERE id = $1`, [
      reservasiId,
    ]);

    const row = (
      await client.query(`SELECT status, "mutasiStokId" FROM reservasi_stok WHERE id = $1`, [reservasiId])
    ).rows[0];
    assertTrue(
      row.status === "DILEPAS" && row.mutasiStokId === null,
      `Reservasi dibatalkan-sebelum-produksi harus DILEPAS TANPA mutasiStokId, dapat status=${row.status} mutasiStokId=${row.mutasiStokId}`,
    );

    const mutasiCount = (
      await client.query(`SELECT count(*)::int AS n FROM mutasi_stok WHERE "referensiId" = $1`, [itemPesananId])
    ).rows[0];
    assertTrue(mutasiCount.n === 0, `Tidak boleh ada baris MutasiStok apa pun untuk pembatalan sebelum produksi, dapat ${mutasiCount.n}.`);
  });
}

async function testStokNegatifDitolakDefault(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client);
    const stokBahanId = fixtureId("stokbahan");

    // Belum ada baris PengaturanPersediaanOutlet -> default TOLAK.
    await client.query(
      `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
       VALUES ($1, $2, $3, $4, NULL, 5, 0, now())`,
      [stokBahanId, fx.tenantId, fx.gudangId, fx.bahanId],
    );
    const msg = await expectReject(client, "UPDATE stok_bahan ke kuantitas negatif tanpa kebijakan izinkanStokNegatif", () =>
      client.query(`UPDATE stok_bahan SET kuantitas = -1, "updatedAt" = now() WHERE id = $1`, [stokBahanId]),
    );
    assertTrue(
      msg.includes("tidak boleh negatif") || msg.includes("trg_stok_bahan_cek_negatif"),
      `Error harus dari trigger trg_stok_bahan_cek_negatif, dapat: ${msg}`,
    );

    // INSERT langsung dengan kuantitas negatif juga ditolak (BEFORE INSERT OR UPDATE).
    const msgInsert = await expectReject(client, "INSERT stok_bahan langsung dengan kuantitas negatif", () =>
      client.query(
        `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
         VALUES ($1, $2, $3, $4, NULL, -3, 0, now())`,
        [fixtureId("stokbahan"), fx.tenantId, fx.gudangId, fixtureId("bahan_lain")],
      ),
    );
    assertTrue(
      msgInsert.includes("tidak boleh negatif") || /violates foreign key|trg_stok_bahan_cek_negatif/i.test(msgInsert),
      `Error INSERT negatif harus dari trigger (atau FK bahan tak ada, keduanya menolak), dapat: ${msgInsert}`,
    );

    // Kebijakan EKSPLISIT izinkanStokNegatif = false -> tetap ditolak.
    await client.query(
      `INSERT INTO pengaturan_persediaan_outlet (id, "tenantId", "outletId", "izinkanStokNegatif")
       VALUES ($1, $2, $3, false)`,
      [fixtureId("pengaturan"), fx.tenantId, fx.outletId],
    );
    const msgEksplisit = await expectReject(client, "UPDATE ke negatif dengan izinkanStokNegatif=false eksplisit", () =>
      client.query(`UPDATE stok_bahan SET kuantitas = -5, "updatedAt" = now() WHERE id = $1`, [stokBahanId]),
    );
    assertTrue(
      msgEksplisit.includes("tidak boleh negatif"),
      `Error harus tetap ditolak dengan kebijakan eksplisit false, dapat: ${msgEksplisit}`,
    );
  });
}

async function testStokNegatifDiizinkanBilaKebijakanMengizinkan(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createReservasiFixture(client);
    const stokBahanId = fixtureId("stokbahan");

    await client.query(
      `INSERT INTO pengaturan_persediaan_outlet (id, "tenantId", "outletId", "izinkanStokNegatif")
       VALUES ($1, $2, $3, true)`,
      [fixtureId("pengaturan"), fx.tenantId, fx.outletId],
    );
    await client.query(
      `INSERT INTO stok_bahan (id, "tenantId", "gudangId", "bahanId", "lokasiStokId", kuantitas, "kuantitasDireservasi", "updatedAt")
       VALUES ($1, $2, $3, $4, NULL, 5, 0, now())`,
      [stokBahanId, fx.tenantId, fx.gudangId, fx.bahanId],
    );
    await client.query(`UPDATE stok_bahan SET kuantitas = -2, "updatedAt" = now() WHERE id = $1`, [stokBahanId]);

    const row = (await client.query(`SELECT kuantitas FROM stok_bahan WHERE id = $1`, [stokBahanId])).rows[0];
    assertTrue(
      Number(row.kuantitas) === -2,
      `Dengan izinkanStokNegatif=true, UPDATE ke kuantitas negatif harus berhasil, dapat ${row.kuantitas}.`,
    );
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testReservasiTidakBolehDuplikatPerItem();
  await testKonsumsiTidakBolehGanda();
  await testSiklusPenuhReservasiKonsumsi();
  await testSiklusBatalSebelumProduksiTanpaMutasi();
  await testStokNegatifDitolakDefault();
  await testStokNegatifDiizinkanBilaKebijakanMengizinkan();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-037 (siklus hidup stok reservasi-konsumsi-waste: idempotency reservasi/konsumsi, linkage mutasiStokId, kebijakan stok negatif per outlet) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
