// Test database-integration untuk ALT-QRS-001 / ADR-021 Keputusan 3 / ALT-DEF-044.
//
// Menyambung ke Postgres NYATA (bukan membaca teks SQL seperti
// ../architecture/qris-konfigurasi-constraints.test.ts) dan memverifikasi:
//   1. EXISTENCE: partial unique index `konfigurasi_qris_satu_aktif_per_outlet`
//      benar-benar ada di pg_indexes dengan WHERE clause yang benar.
//   2. BEHAVIORAL: dua baris KonfigurasiQris berstatus AKTIF untuk outlet yang
//      sama BENAR-BENAR ditolak Postgres; berstatus NONAKTIF/DRAF boleh
//      menumpuk tanpa batas (riwayat).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/qris-konfigurasi-invariant.test.ts

import {
  assertTrue,
  createAktorFixture,
  createBaseFixtures,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper"
import pg from "pg";

async function testIndexExists(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const res = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'konfigurasi_qris_satu_aktif_per_outlet'`,
    );
    assertTrue(
      res.rowCount === 1,
      "index konfigurasi_qris_satu_aktif_per_outlet harus ada persis satu kali di pg_indexes.",
    );
    const def = res.rows[0].indexdef as string;
    assertTrue(
      def.includes('"tenantId"') && def.includes('"outletId"'),
      `indexdef harus memuat kolom "tenantId" dan "outletId", dapat: ${def}`,
    );
    assertTrue(
      def.includes("WHERE") && def.includes("'AKTIF'"),
      `indexdef harus berupa partial index WHERE status = 'AKTIF', dapat: ${def}`,
    );
    assertTrue(
      def.toUpperCase().includes("UNIQUE"),
      `index harus UNIQUE, dapat: ${def}`,
    );
  } finally {
    await pool.end();
  }
}

async function testDuplikatAktifDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // ADR-033: dibuatOlehId sekarang composite-FK OUTLET-LEVEL ke
    // KeanggotaanOutlet - raw penggunaId tidak lagi valid.
    const aktor = await createAktorFixture(client, fx.tenantId, fx.outletId);
    fx.penggunaId = aktor.keanggotaanOutletId;

    const konfig1 = fixtureId("qris");
    await client.query(
      `INSERT INTO konfigurasi_qris
         (id, "tenantId", "outletId", "payloadTerenkripsi", fingerprint, "namaMerchant", "kotaMerchant", status, "dibuatOlehId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'ciphertext-1', 'fp-1', 'Merchant A', 'Jakarta', 'AKTIF', $4, now(), now())`,
      [konfig1, fx.tenantId, fx.outletId, fx.penggunaId],
    );

    const konfig2 = fixtureId("qris");
    const msg = await expectReject(client, "INSERT konfigurasi_qris AKTIF kedua di outlet yang sama", () =>
      client.query(
        `INSERT INTO konfigurasi_qris
           (id, "tenantId", "outletId", "payloadTerenkripsi", fingerprint, "namaMerchant", "kotaMerchant", status, "dibuatOlehId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'ciphertext-2', 'fp-2', 'Merchant B', 'Jakarta', 'AKTIF', $4, now(), now())`,
        [konfig2, fx.tenantId, fx.outletId, fx.penggunaId],
      ),
    );
    assertTrue(
      /duplicate key|unique constraint|konfigurasi_qris_satu_aktif_per_outlet/i.test(msg),
      `Pesan error harus berasal dari pelanggaran unique index, dapat: ${msg}`,
    );

    // Sebagai kontrol negatif: banyak baris NONAKTIF untuk outlet yang sama
    // HARUS boleh menumpuk (riwayat konfigurasi lama, ADR-006 no hard-delete).
    for (let i = 0; i < 3; i++) {
      await client.query(
        `INSERT INTO konfigurasi_qris
           (id, "tenantId", "outletId", "payloadTerenkripsi", fingerprint, "namaMerchant", "kotaMerchant", status, "dibuatOlehId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'Merchant Lama', 'Jakarta', 'NONAKTIF', $6, now(), now())`,
        [fixtureId("qris"), fx.tenantId, fx.outletId, `ciphertext-lama-${i}`, `fp-lama-${i}`, fx.penggunaId],
      );
    }
    const cek = await client.query(
      `SELECT count(*)::int AS n FROM konfigurasi_qris WHERE "outletId" = $1 AND status = 'NONAKTIF'`,
      [fx.outletId],
    );
    assertTrue(
      cek.rows[0].n === 3,
      `Tiga baris NONAKTIF harus boleh menumpuk tanpa ditolak, dapat n=${cek.rows[0].n}.`,
    );
  });
}

async function main(): Promise<void> {
  await testIndexExists();
  await testDuplikatAktifDitolak();
  // eslint-disable-next-line no-console
  console.log("OK: database-integration ALT-QRS-001/ADR-021 (konfigurasi QRIS satu aktif per outlet) lulus.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
