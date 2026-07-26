// Test database-integration untuk ADR-033 (audit dan perbaikan actor field
// tenant-scoped: dari FK langsung ke Pengguna menjadi composite-FK ke
// KeanggotaanTenant/KeanggotaanOutlet). Menyambung ke Postgres nyata
// (altora_resto_dev).
//
// Membuktikan (bukan hanya mengklaim) bahwa:
//   1. Composite-FK OUTLET-LEVEL (MutasiStok.dibuatOlehId -> KeanggotaanOutlet)
//      MENOLAK aktor yang KeanggotaanOutlet-nya berasal dari tenant lain, DAN
//      MENOLAK aktor yang merupakan anggota tenant yang BENAR tapi outlet yang
//      SALAH (anggota tenant, tapi tidak punya akses outlet ini).
//   2. Composite-FK TENANT-LEVEL (StokOpname.dibuatOlehId -> KeanggotaanTenant)
//      MENOLAK aktor yang KeanggotaanTenant-nya berasal dari tenant lain.
//   3. Karyawan.keanggotaanTenantId (identitas HR) MENOLAK keanggotaan dari
//      tenant lain.
//   4. Notification.keanggotaanTenantId MENOLAK keanggotaan dari tenant lain.
//   5. Kasus POSITIF: aktor yang benar-benar anggota tenant/outlet yang sama
//      DITERIMA tanpa error di seluruh kasus di atas.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/actor-keanggotaan-tenant-outlet-invariants.test.ts

import {
  assertTrue,
  createAktorFixture,
  createBaseFixtures,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper.js";
import pg from "pg";

async function testConstraintsExist(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const rows = await pool.query(
      `SELECT conname, conrelid::regclass::text AS tbl, confrelid::regclass::text AS ref
       FROM pg_constraint
       WHERE conname IN (
         'mutasi_stok_tenantId_outletId_dibuatOlehId_fkey',
         'stok_opname_tenantId_dibuatOlehId_fkey',
         'karyawan_tenantId_keanggotaanTenantId_fkey',
         'notification_tenantId_keanggotaanTenantId_fkey',
         'audit_log_tenantId_keanggotaanTenantId_fkey'
       )`,
    );
    assertTrue(rows.rowCount === 5, `Kelima composite-FK ADR-033 harus ada, dapat ${rows.rowCount} baris: ${JSON.stringify(rows.rows)}`);
    const byName = Object.fromEntries(rows.rows.map((r) => [r.conname as string, r]));
    assertTrue(
      byName["mutasi_stok_tenantId_outletId_dibuatOlehId_fkey"]?.ref === "keanggotaan_outlet",
      "mutasi_stok.dibuatOlehId harus FK ke keanggotaan_outlet (OUTLET-LEVEL).",
    );
    assertTrue(
      byName["stok_opname_tenantId_dibuatOlehId_fkey"]?.ref === "keanggotaan_tenant",
      "stok_opname.dibuatOlehId harus FK ke keanggotaan_tenant (TENANT-LEVEL).",
    );
    assertTrue(
      byName["karyawan_tenantId_keanggotaanTenantId_fkey"]?.ref === "keanggotaan_tenant",
      "karyawan.keanggotaanTenantId harus FK ke keanggotaan_tenant.",
    );
    assertTrue(
      byName["notification_tenantId_keanggotaanTenantId_fkey"]?.ref === "keanggotaan_tenant",
      "notification.keanggotaanTenantId harus FK ke keanggotaan_tenant.",
    );
    assertTrue(
      byName["audit_log_tenantId_keanggotaanTenantId_fkey"]?.ref === "keanggotaan_tenant",
      "audit_log.keanggotaanTenantId harus FK ke keanggotaan_tenant.",
    );
  } finally {
    await pool.end();
  }
}

/** MutasiStok.dibuatOlehId (OUTLET-LEVEL): aktor dari tenant LAIN sama sekali -> ditolak. */
async function testMutasiStokAktorLintasTenantDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const fxTenantLain = await createBaseFixtures(client);
    const aktorLintasTenant = await createAktorFixture(client, fxTenantLain.tenantId, fxTenantLain.outletId);

    const msg = await expectReject(
      client,
      "MutasiStok.dibuatOlehId menunjuk KeanggotaanOutlet milik tenant LAIN",
      () =>
        client.query(
          `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah,
             "referensiJenis", "referensiId", "lokasiTujuanId", "hargaPerolehan", alasan, "dibuatOlehId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 'PEMBELIAN_MASUK', 10, 'PEMBELIAN', $6, NULL, 1000, 'uji', $7, now())`,
          [
            fixtureId("mutasi"),
            fx.tenantId,
            fx.outletId,
            fx.gudangId,
            fx.bahanId,
            fixtureId("ref"),
            aktorLintasTenant.keanggotaanOutletId,
          ],
        ),
    );
    assertTrue(
      /foreign key|violates|mutasi_stok_tenantId_outletId_dibuatOlehId_fkey/i.test(msg),
      `error harus dari composite-FK dibuatOlehId, dapat: ${msg}`,
    );
  });
}

/** MutasiStok.dibuatOlehId (OUTLET-LEVEL): aktor anggota TENANT yang benar,
 * tapi keanggotaan outletnya untuk OUTLET LAIN dalam tenant yang sama -> ditolak. */
async function testMutasiStokAktorTenantBenarOutletSalahDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // Outlet kedua di TENANT YANG SAMA.
    const outletLainId = fixtureId("outlet2");
    await client.query(
      `INSERT INTO outlet (id, "tenantId", nama, kode, "zonaWaktu", status, "createdAt")
       VALUES ($1, $2, $3, $4, 'Asia/Jakarta', 'AKTIF', now())`,
      [outletLainId, fx.tenantId, `Outlet Lain ${outletLainId}`, outletLainId.slice(0, 10)],
    );
    const aktorOutletLain = await createAktorFixture(client, fx.tenantId, outletLainId);

    const msg = await expectReject(
      client,
      "MutasiStok.dibuatOlehId menunjuk KeanggotaanOutlet di outlet LAIN (tenant sama)",
      () =>
        client.query(
          `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah,
             "referensiJenis", "referensiId", "lokasiTujuanId", "hargaPerolehan", alasan, "dibuatOlehId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 'PEMBELIAN_MASUK', 10, 'PEMBELIAN', $6, NULL, 1000, 'uji', $7, now())`,
          [
            fixtureId("mutasi"),
            fx.tenantId,
            fx.outletId,
            fx.gudangId,
            fx.bahanId,
            fixtureId("ref"),
            aktorOutletLain.keanggotaanOutletId,
          ],
        ),
    );
    assertTrue(
      /foreign key|violates|mutasi_stok_tenantId_outletId_dibuatOlehId_fkey/i.test(msg),
      `error harus dari composite-FK dibuatOlehId (outlet mismatch), dapat: ${msg}`,
    );
  });
}

/** MutasiStok.dibuatOlehId (OUTLET-LEVEL): aktor SAH (tenant+outlet sama) -> diterima. */
async function testMutasiStokAktorValidDiterima(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const aktor = await createAktorFixture(client, fx.tenantId, fx.outletId);

    await client.query(
      `INSERT INTO mutasi_stok (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah,
         "referensiJenis", "referensiId", "lokasiTujuanId", "hargaPerolehan", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PEMBELIAN_MASUK', 10, 'PEMBELIAN', $6, NULL, 1000, 'uji', $7, now())`,
      [
        fixtureId("mutasi"),
        fx.tenantId,
        fx.outletId,
        fx.gudangId,
        fx.bahanId,
        fixtureId("ref"),
        aktor.keanggotaanOutletId,
      ],
    );
    const check = await client.query(`SELECT count(*)::int AS n FROM mutasi_stok WHERE "dibuatOlehId" = $1`, [
      aktor.keanggotaanOutletId,
    ]);
    assertTrue(check.rows[0].n === 1, "MutasiStok dengan aktor outlet yang sah harus berhasil di-INSERT.");
  });
}

/** StokOpname.dibuatOlehId (TENANT-LEVEL): aktor dari tenant LAIN -> ditolak. */
async function testStokOpnameAktorLintasTenantDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const fxTenantLain = await createBaseFixtures(client);
    const aktorLintasTenant = await createAktorFixture(client, fxTenantLain.tenantId, fxTenantLain.outletId);

    const msg = await expectReject(client, "StokOpname.dibuatOlehId menunjuk KeanggotaanTenant milik tenant LAIN", () =>
      client.query(
        `INSERT INTO stok_opname (id, "tenantId", "gudangId", status, "dijadwalkanPada", "dibuatOlehId", "updatedAt")
         VALUES ($1, $2, $3, 'DRAF', now(), $4, now())`,
        [fixtureId("opname"), fx.tenantId, fx.gudangId, aktorLintasTenant.keanggotaanTenantId],
      ),
    );
    assertTrue(
      /foreign key|violates|stok_opname_tenantId_dibuatOlehId_fkey/i.test(msg),
      `error harus dari composite-FK dibuatOlehId, dapat: ${msg}`,
    );
  });
}

/** StokOpname.dibuatOlehId (TENANT-LEVEL): aktor SAH (anggota tenant yang sama) -> diterima. */
async function testStokOpnameAktorValidDiterima(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const aktor = await createAktorFixture(client, fx.tenantId, fx.outletId);

    await client.query(
      `INSERT INTO stok_opname (id, "tenantId", "gudangId", status, "dijadwalkanPada", "dibuatOlehId", "updatedAt")
       VALUES ($1, $2, $3, 'DRAF', now(), $4, now())`,
      [fixtureId("opname"), fx.tenantId, fx.gudangId, aktor.keanggotaanTenantId],
    );
    const check = await client.query(`SELECT count(*)::int AS n FROM stok_opname WHERE "dibuatOlehId" = $1`, [
      aktor.keanggotaanTenantId,
    ]);
    assertTrue(check.rows[0].n === 1, "StokOpname dengan aktor tenant yang sah harus berhasil di-INSERT.");
  });
}

/** Karyawan.keanggotaanTenantId: keanggotaan dari tenant LAIN -> ditolak. */
async function testKaryawanKeanggotaanLintasTenantDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const fxTenantLain = await createBaseFixtures(client);
    const aktorLintasTenant = await createAktorFixture(client, fxTenantLain.tenantId, fxTenantLain.outletId);

    const msg = await expectReject(client, "Karyawan.keanggotaanTenantId menunjuk KeanggotaanTenant milik tenant LAIN", () =>
      client.query(
        `INSERT INTO karyawan (id, "tenantId", "keanggotaanTenantId", "nomorInduk", status, "tanggalBergabung")
         VALUES ($1, $2, $3, $4, 'AKTIF', now())`,
        [fixtureId("karyawan"), fx.tenantId, aktorLintasTenant.keanggotaanTenantId, fixtureId("nik")],
      ),
    );
    assertTrue(
      /foreign key|violates|karyawan_tenantId_keanggotaanTenantId_fkey/i.test(msg),
      `error harus dari composite-FK keanggotaanTenantId, dapat: ${msg}`,
    );
  });
}

/** Notification.keanggotaanTenantId: keanggotaan dari tenant LAIN -> ditolak. */
async function testNotificationKeanggotaanLintasTenantDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const fxTenantLain = await createBaseFixtures(client);
    const aktorLintasTenant = await createAktorFixture(client, fxTenantLain.tenantId, fxTenantLain.outletId);

    const msg = await expectReject(
      client,
      "Notification.keanggotaanTenantId menunjuk KeanggotaanTenant milik tenant LAIN",
      () =>
        client.query(
          `INSERT INTO notification (id, "tenantId", "keanggotaanTenantId", "lingkupTarget", tipe, judul, pesan, "createdAt")
           VALUES ($1, $2, $3, 'PENGGUNA_SPESIFIK', 'STOK_KRITIS', 'Uji', 'Uji lintas tenant', now())`,
          [fixtureId("notif"), fx.tenantId, aktorLintasTenant.keanggotaanTenantId],
        ),
    );
    assertTrue(
      /foreign key|violates|notification_tenantId_keanggotaanTenantId_fkey/i.test(msg),
      `error harus dari composite-FK keanggotaanTenantId, dapat: ${msg}`,
    );
  });
}

async function main(): Promise<void> {
  await testConstraintsExist();
  await testMutasiStokAktorLintasTenantDitolak();
  await testMutasiStokAktorTenantBenarOutletSalahDitolak();
  await testMutasiStokAktorValidDiterima();
  await testStokOpnameAktorLintasTenantDitolak();
  await testStokOpnameAktorValidDiterima();
  await testKaryawanKeanggotaanLintasTenantDitolak();
  await testNotificationKeanggotaanLintasTenantDitolak();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-033 (composite-FK actor tenant/outlet-scoped) - lintas-tenant/outlet ditolak, aktor sah diterima.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
