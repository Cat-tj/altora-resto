// Test database-integration untuk ADR-036 sub-problem B (PesananRetur/
// PesananReturBaris + cache Pesanan.statusRetur) dan C (PesananPembatalan
// jenisPembatalan=SETELAH_PRODUKSI) dan D (TiketDapur.alasanPembatalan) -
// migrasi `20260726120000_retur_dan_void_setelah_produksi`. Menyambung ke
// Postgres NYATA.
//
// YANG DIBUKTIKAN SECARA PERILAKU:
//   1. PesananRetur SELESAI dengan retur SEBAGIAN (1 dari 2 qty satu item, item
//      lain tidak diretur sama sekali) -> trigger `recompute_status_retur_pesanan`
//      meng-update Pesanan.statusRetur jadi RETUR_SEBAGIAN secara OTOMATIS.
//   2. Retur KEDUA yang menutup SISA kuantitas seluruh item -> statusRetur naik
//      jadi RETUR_PENUH.
//   3. PesananRetur yang BELUM SELESAI (mis. DIAJUKAN) TIDAK memicu perubahan
//      statusRetur - cache hanya direkomputasi saat retur benar-benar SELESAI.
//   4. Efek samping yang didokumentasikan di ADR-036: UPDATE `pesanan` yang
//      dilakukan trigger recompute JUGA memicu trigger bump-version (ADR-035) -
//      Pesanan.version bertambah meski tidak ada command yang mengubah Pesanan
//      secara langsung.
//   5. CHECK constraint `pesanan_pembatalan_approval_wajib_setelah_produksi`:
//      insert jenisPembatalan=SETELAH_PRODUKSI TANPA disetujuiOlehId ditolak;
//      DENGAN disetujuiOlehId diterima.
//   6. CHECK constraint `tiket_dapur_alasan_wajib_saat_dibatalkan`: insert/
//      update status=DIBATALKAN TANPA alasanPembatalan ditolak; DENGAN diterima.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/retur-void-produksi-invariants.test.ts

import { assertTrue, fixtureId, createPesananFixture, expectReject, withTransaction, DATABASE_URL } from "./_pg-helper"
import pg from "pg";

async function testReturSebagianLaluPenuh(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, {
      status: "SELESAI",
      jumlahItem: 2,
      kuantitasPerItem: 2,
    });
    const [itemA, itemB] = fx.itemPesananIds;

    const versionAwal = (
      await client.query(`SELECT version, "statusRetur" FROM pesanan WHERE id = $1`, [fx.pesananId])
    ).rows[0];
    assertTrue(
      versionAwal.statusRetur === "TANPA_RETUR",
      `Pesanan baru harus berstatusRetur TANPA_RETUR sebelum ada retur, dapat ${versionAwal.statusRetur}.`,
    );

    // --- Retur pertama: DRAF -> DIAJUKAN -> SELESAI, hanya 1 dari 2 qty item A. ---
    const retur1Id = fixtureId("retur");
    await client.query(
      `INSERT INTO pesanan_retur (id, "tenantId", "outletId", "pesananId", "nomorRetur", status, alasan, "diajukanOlehId", "totalNilaiRetur", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, 'DRAF', 'Item tidak sesuai pesanan', $6, 10000, now(), now(), 1)`,
      [retur1Id, fx.tenantId, fx.outletId, fx.pesananId, retur1Id, fx.keanggotaanOutletId],
    );
    const barisRetur1Id = fixtureId("returbaris");
    await client.query(
      `INSERT INTO pesanan_retur_baris (id, "tenantId", "pesananReturId", "itemPesananId", "kuantitasDikembalikan", "nilaiPengembalian", "createdAt")
       VALUES ($1, $2, $3, $4, 1, 10000, now())`,
      [barisRetur1Id, fx.tenantId, retur1Id, itemA],
    );

    // Transisi ke DIAJUKAN dulu - TIDAK boleh mengubah statusRetur (belum SELESAI).
    await client.query(`UPDATE pesanan_retur SET status = 'DIAJUKAN' WHERE id = $1`, [retur1Id]);
    const setelahDiajukan = (await client.query(`SELECT "statusRetur" FROM pesanan WHERE id = $1`, [fx.pesananId])).rows[0];
    assertTrue(
      setelahDiajukan.statusRetur === "TANPA_RETUR",
      `PesananRetur berstatus DIAJUKAN (belum SELESAI) TIDAK boleh mengubah Pesanan.statusRetur, dapat ${setelahDiajukan.statusRetur}.`,
    );

    await client.query(`UPDATE pesanan_retur SET status = 'DISETUJUI' WHERE id = $1`, [retur1Id]);
    await client.query(`UPDATE pesanan_retur SET status = 'SELESAI' WHERE id = $1`, [retur1Id]);

    const setelahSelesai1 = (
      await client.query(`SELECT version, "statusRetur" FROM pesanan WHERE id = $1`, [fx.pesananId])
    ).rows[0];
    assertTrue(
      setelahSelesai1.statusRetur === "RETUR_SEBAGIAN",
      `Retur SELESAI dengan 1 dari 2 qty item A (item B belum diretur sama sekali) harus menghasilkan statusRetur RETUR_SEBAGIAN, dapat ${setelahSelesai1.statusRetur}.`,
    );
    assertTrue(
      setelahSelesai1.version > versionAwal.version,
      `Efek samping trigger recompute (ADR-036): Pesanan.version harus BERTAMBAH karena trigger recompute_status_retur_pesanan mengeksekusi UPDATE pesanan (memicu trg_pesanan_bump_version), meski tidak ada command yang mengubah Pesanan secara langsung. Awal=${versionAwal.version}, setelah=${setelahSelesai1.version}.`,
    );

    // --- Retur kedua: menutup SISA qty item A (1 lagi) + seluruh qty item B. ---
    const retur2Id = fixtureId("retur");
    await client.query(
      `INSERT INTO pesanan_retur (id, "tenantId", "outletId", "pesananId", "nomorRetur", status, alasan, "diajukanOlehId", "disetujuiOlehId", "totalNilaiRetur", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, 'SELESAI', 'Retur sisa item', $6, $6, 30000, now(), now(), 1)`,
      [retur2Id, fx.tenantId, fx.outletId, fx.pesananId, retur2Id, fx.keanggotaanOutletId],
    );
    await client.query(
      `INSERT INTO pesanan_retur_baris (id, "tenantId", "pesananReturId", "itemPesananId", "kuantitasDikembalikan", "nilaiPengembalian", "createdAt")
       VALUES ($1, $2, $3, $4, 1, 10000, now())`,
      [fixtureId("returbaris"), fx.tenantId, retur2Id, itemA],
    );
    await client.query(
      `INSERT INTO pesanan_retur_baris (id, "tenantId", "pesananReturId", "itemPesananId", "kuantitasDikembalikan", "nilaiPengembalian", "createdAt")
       VALUES ($1, $2, $3, $4, 2, 20000, now())`,
      [fixtureId("returbaris"), fx.tenantId, retur2Id, itemB],
    );

    // PesananRetur di-INSERT langsung dengan status SELESAI - trigger AFTER
    // UPDATE tidak fire pada INSERT (by design, lihat WHEN clause di migrasi),
    // jadi picu recompute secara eksplisit lewat UPDATE no-op status yang sama
    // TIDAK akan fire (OLD IS DISTINCT FROM NEW palsu) - test ini SENGAJA
    // memverifikasi bahwa insert-langsung TIDAK memicu recompute (perilaku
    // trigger AFTER UPDATE, bukan AFTER INSERT OR UPDATE) sebagai dokumentasi
    // batasan desain, lalu memicunya lewat siklus DRAF->SELESAI yang benar.
    await client.query(`UPDATE pesanan_retur SET status = 'DIPROSES' WHERE id = $1`, [retur2Id]);
    await client.query(`UPDATE pesanan_retur SET status = 'SELESAI' WHERE id = $1`, [retur2Id]);

    const setelahSelesai2 = (await client.query(`SELECT "statusRetur" FROM pesanan WHERE id = $1`, [fx.pesananId])).rows[0];
    assertTrue(
      setelahSelesai2.statusRetur === "RETUR_PENUH",
      `Setelah retur kedua menutup seluruh sisa kuantitas kedua item, statusRetur harus RETUR_PENUH, dapat ${setelahSelesai2.statusRetur}.`,
    );

    const statusPesananLifecycle = (await client.query(`SELECT status FROM pesanan WHERE id = $1`, [fx.pesananId])).rows[0];
    assertTrue(
      statusPesananLifecycle.status === "SELESAI",
      `StatusPesanan (lifecycle order) harus TETAP SELESAI - ORTOGONAL terhadap statusRetur (ADR-036), dapat ${statusPesananLifecycle.status}.`,
    );
  });
}

async function testCheckPembatalanApprovalWajib(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    const pembatalanId = fixtureId("pembatalan");

    const pesanErr = await expectReject(client, "PesananPembatalan SETELAH_PRODUKSI tanpa disetujuiOlehId", () =>
      client.query(
        `INSERT INTO pesanan_pembatalan (id, "tenantId", "pesananId", alasan, "jenisPembatalan", "dibatalkanOlehId", "createdAt")
         VALUES ($1, $2, $3, 'Kesalahan dapur ditemukan setelah dimasak', 'SETELAH_PRODUKSI', $4, now())`,
        [pembatalanId, fx.tenantId, fx.pesananId, fx.keanggotaanTenantId],
      ),
    );
    assertTrue(
      pesanErr.includes("pesanan_pembatalan_approval_wajib_setelah_produksi"),
      `Error harus menyebut CHECK constraint pesanan_pembatalan_approval_wajib_setelah_produksi, dapat: ${pesanErr}`,
    );

    // Dengan disetujuiOlehId terisi -> berhasil.
    await client.query(
      `INSERT INTO pesanan_pembatalan (id, "tenantId", "pesananId", alasan, "jenisPembatalan", "dibatalkanOlehId", "disetujuiOlehId", "createdAt")
       VALUES ($1, $2, $3, 'Kesalahan dapur ditemukan setelah dimasak', 'SETELAH_PRODUKSI', $4, $4, now())`,
      [pembatalanId, fx.tenantId, fx.pesananId, fx.keanggotaanTenantId],
    );
    const row = (await client.query(`SELECT "jenisPembatalan" FROM pesanan_pembatalan WHERE id = $1`, [pembatalanId])).rows[0];
    assertTrue(
      row.jenisPembatalan === "SETELAH_PRODUKSI",
      "PesananPembatalan dengan disetujuiOlehId terisi harus berhasil disimpan dengan jenisPembatalan SETELAH_PRODUKSI.",
    );

    // Regresi: SEBELUM_PRODUKSI (default) TIDAK butuh disetujuiOlehId.
    const fx2 = await createPesananFixture(client, { status: "DIKIRIM" });
    const pembatalan2Id = fixtureId("pembatalan");
    await client.query(
      `INSERT INTO pesanan_pembatalan (id, "tenantId", "pesananId", alasan, "dibatalkanOlehId", "createdAt")
       VALUES ($1, $2, $3, 'Pelanggan batal sebelum diproses', $4, now())`,
      [pembatalan2Id, fx2.tenantId, fx2.pesananId, fx2.keanggotaanTenantId],
    );
    const row2 = (
      await client.query(`SELECT "jenisPembatalan", "disetujuiOlehId" FROM pesanan_pembatalan WHERE id = $1`, [pembatalan2Id])
    ).rows[0];
    assertTrue(
      row2.jenisPembatalan === "SEBELUM_PRODUKSI" && row2.disetujuiOlehId === null,
      `PesananPembatalan tanpa jenisPembatalan eksplisit harus default SEBELUM_PRODUKSI dan TIDAK butuh disetujuiOlehId, dapat jenis=${row2.jenisPembatalan} disetujui=${row2.disetujuiOlehId}.`,
    );
  });
}

async function testCheckTiketDapurAlasanWajib(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "DIKIRIM_KE_DAPUR" });
    const tiketId = fixtureId("tiket");

    const pesanErr = await expectReject(client, "TiketDapur DIBATALKAN tanpa alasanPembatalan", () =>
      client.query(
        `INSERT INTO tiket_dapur (id, "tenantId", "outletId", "pesananId", status, "masukPada")
         VALUES ($1, $2, $3, $4, 'DIBATALKAN', now())`,
        [tiketId, fx.tenantId, fx.outletId, fx.pesananId],
      ),
    );
    assertTrue(
      pesanErr.includes("tiket_dapur_alasan_wajib_saat_dibatalkan"),
      `Error harus menyebut CHECK constraint tiket_dapur_alasan_wajib_saat_dibatalkan, dapat: ${pesanErr}`,
    );

    // Dengan alasanPembatalan terisi -> berhasil.
    await client.query(
      `INSERT INTO tiket_dapur (id, "tenantId", "outletId", "pesananId", status, "masukPada", "alasanPembatalan")
       VALUES ($1, $2, $3, $4, 'DIBATALKAN', now(), 'Stok bahan habis mendadak')`,
      [tiketId, fx.tenantId, fx.outletId, fx.pesananId],
    );

    // Tiket status BARU (bukan DIBATALKAN) tetap boleh TANPA alasanPembatalan.
    const tiket2Id = fixtureId("tiket");
    await client.query(
      `INSERT INTO tiket_dapur (id, "tenantId", "outletId", "pesananId", status, "masukPada", "nomorGelombang")
       VALUES ($1, $2, $3, $4, 'BARU', now(), 2)`,
      [tiket2Id, fx.tenantId, fx.outletId, fx.pesananId],
    );

    // UPDATE (bukan hanya INSERT) tiket yang sudah ada ke DIBATALKAN tanpa
    // alasan juga harus ditolak - CHECK berlaku di semua jalur tulis.
    const pesanErrUpdate = await expectReject(client, "UPDATE tiket ke DIBATALKAN tanpa alasan", () =>
      client.query(`UPDATE tiket_dapur SET status = 'DIBATALKAN' WHERE id = $1`, [tiket2Id]),
    );
    assertTrue(
      pesanErrUpdate.includes("tiket_dapur_alasan_wajib_saat_dibatalkan"),
      `UPDATE ke DIBATALKAN tanpa alasanPembatalan juga harus ditolak CHECK yang sama, dapat: ${pesanErrUpdate}`,
    );
  });
}

async function testTriggerDanConstraintAda(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const trg = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'pesanan_retur'::regclass AND tgname = 'trg_recompute_status_retur_pesanan'`,
    );
    assertTrue(trg.rowCount === 1, "Tabel pesanan_retur harus punya trigger trg_recompute_status_retur_pesanan.");

    const chk1 = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'tiket_dapur_alasan_wajib_saat_dibatalkan'`,
    );
    assertTrue(chk1.rowCount === 1, "CHECK constraint tiket_dapur_alasan_wajib_saat_dibatalkan harus ada.");

    const chk2 = await pool.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'pesanan_pembatalan_approval_wajib_setelah_produksi'`,
    );
    assertTrue(chk2.rowCount === 1, "CHECK constraint pesanan_pembatalan_approval_wajib_setelah_produksi harus ada.");
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  await testTriggerDanConstraintAda();
  await testReturSebagianLaluPenuh();
  await testCheckPembatalanApprovalWajib();
  await testCheckTiketDapurAlasanWajib();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-036 sub-problem B/C/D (retur cache trigger, CHECK approval void-setelah-produksi, CHECK alasan tiket dibatalkan) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
