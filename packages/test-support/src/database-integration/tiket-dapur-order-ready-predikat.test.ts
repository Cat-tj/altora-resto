// Test database-integration untuk ADR-041 (batch konsolidasi audit cakupan
// konkurensi) - "Tiket batal tidak membuat order macet" (lihat
// docs/engineering/AUDIT-CONCURRENCY-COVERAGE.md dan predikat "order ready"
// di docs/arsitektur/STATE-MACHINES.md, didokumentasikan sejak ADR-036 tapi
// SEBELUMNYA HANYA didokumentasikan, tidak pernah dijalankan lewat data
// nyata).
//
// Predikat "order ready" (kontrak QUERY, bukan constraint database - butuh
// JOIN, belum ada handler yang menghitungnya):
//
//   SELECT NOT EXISTS (
//     SELECT 1 FROM tiket_dapur
//     WHERE "pesananId" = :pesananId
//       AND status NOT IN ('SIAP', 'DISAJIKAN', 'DIBATALKAN')
//   ) AS order_ready;
//
// YANG DIBUKTIKAN SECARA PERILAKU dengan data TiketDapur nyata:
//   1. Seluruh tiket SIAP -> order_ready = true.
//   2. Satu tiket masih BARU/DITERIMA/SEDANG_DISIAPKAN (belum SIAP) -> order_ready = false.
//   3. CRUX: satu tiket DIBATALKAN (dengan alasanPembatalan wajib terisi,
//      ditegakkan CHECK tiket_dapur_alasan_wajib_saat_dibatalkan) + SISANYA
//      SIAP -> order_ready = TETAP true - tiket batal TIDAK membuat order
//      macet (predikat mengecualikan DIBATALKAN dari guard).
//   4. Kombinasi: satu tiket DIBATALKAN + satu tiket masih DITERIMA -> tetap
//      false (tiket yang belum siap itu sendiri yang menahan, bukan yang batal).
//   5. Vacuous truth: Pesanan tanpa TiketDapur sama sekali -> order_ready
//      bernilai true "secara vakum" (dibuktikan, BUKAN diasumsikan) -
//      mendokumentasikan bahwa pemanggil WAJIB menggabungkan predikat ini
//      dengan guard Pesanan.status >= DIKIRIM_KE_DAPUR di level aplikasi.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/tiket-dapur-order-ready-predikat.test.ts

import { assertTrue, fixtureId, createPesananFixture, withTransaction } from "./_pg-helper"
import pg from "pg";

const ORDER_READY_SQL = `
  SELECT NOT EXISTS (
    SELECT 1 FROM tiket_dapur
    WHERE "pesananId" = $1
      AND status NOT IN ('SIAP', 'DISAJIKAN', 'DIBATALKAN')
  ) AS order_ready
`;

async function orderReady(client: pg.PoolClient, pesananId: string): Promise<boolean> {
  const res = await client.query(ORDER_READY_SQL, [pesananId]);
  return res.rows[0]["order_ready"] === true;
}

async function insertTiket(
  client: pg.PoolClient,
  fx: { tenantId: string; outletId: string; pesananId: string },
  opts: { status: string; alasanPembatalan?: string; nomorGelombang?: number },
): Promise<string> {
  const id = fixtureId("tiket");
  await client.query(
    `INSERT INTO tiket_dapur (id, "tenantId", "outletId", "pesananId", status, "masukPada", "nomorGelombang", "alasanPembatalan")
     VALUES ($1, $2, $3, $4, $5, now(), $6, $7)`,
    [id, fx.tenantId, fx.outletId, fx.pesananId, opts.status, opts.nomorGelombang ?? 1, opts.alasanPembatalan ?? null],
  );
  return id;
}

async function testSeluruhTiketSiapOrderReadyTrue(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    await insertTiket(client, fx, { status: "SIAP" });
    await insertTiket(client, fx, { status: "DISAJIKAN", nomorGelombang: 2 });

    assertTrue(
      await orderReady(client, fx.pesananId),
      "Seluruh TiketDapur SIAP/DISAJIKAN -> order_ready harus true.",
    );
  });
}

async function testSatuTiketBelumSiapOrderReadyFalse(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    await insertTiket(client, fx, { status: "SIAP" });
    await insertTiket(client, fx, { status: "SEDANG_DISIAPKAN", nomorGelombang: 2 });

    assertTrue(
      (await orderReady(client, fx.pesananId)) === false,
      "Satu TiketDapur masih DIMASAK (belum SIAP/DISAJIKAN/DIBATALKAN) -> order_ready harus false.",
    );
  });
}

async function testTiketDibatalkanTidakMembuatOrderMacet(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    await insertTiket(client, fx, { status: "SIAP" });
    await insertTiket(client, fx, {
      status: "DIBATALKAN",
      alasanPembatalan: "Stok bahan gelombang 2 habis mendadak",
      nomorGelombang: 2,
    });

    assertTrue(
      await orderReady(client, fx.pesananId),
      "CRUX: satu TiketDapur DIBATALKAN (sisanya SIAP) HARUS TETAP order_ready=true - tiket batal TIDAK BOLEH membuat order macet (dikecualikan dari guard predikat).",
    );
  });
}

async function testTiketDibatalkanTanpaAlasanDitolakSebelumBisaMasukPredikat(): Promise<void> {
  // Prasyarat yang didokumentasikan STATE-MACHINES.md: predikat order-ready
  // BISA mengecualikan DIBATALKAN dari guard TANPA kehilangan jejak audit
  // KARENA CHECK tiket_dapur_alasan_wajib_saat_dibatalkan MEWAJIBKAN
  // alasanPembatalan terisi - buktikan CHECK ini benar-benar menolak upaya
  // membuat tiket DIBATALKAN tanpa jejak sebelum predikat sempat dievaluasi.
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    let gagal = false;
    let pesanErr = "";
    try {
      await insertTiket(client, fx, { status: "DIBATALKAN" });
    } catch (err) {
      gagal = true;
      pesanErr = err instanceof Error ? err.message : String(err);
    }
    assertTrue(
      gagal && pesanErr.includes("tiket_dapur_alasan_wajib_saat_dibatalkan"),
      `INSERT tiket DIBATALKAN tanpa alasanPembatalan harus ditolak CHECK constraint (prasyarat predikat order-ready tetap auditable), dapat gagal=${gagal} pesan=${pesanErr}`,
    );
  });
}

async function testKombinasiSatuBatalSatuBelumSiapTetapFalse(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "SEDANG_DISIAPKAN" });
    await insertTiket(client, fx, {
      status: "DIBATALKAN",
      alasanPembatalan: "Pelanggan komplain gelombang 1",
    });
    await insertTiket(client, fx, { status: "DITERIMA", nomorGelombang: 2 });

    assertTrue(
      (await orderReady(client, fx.pesananId)) === false,
      "Kombinasi satu tiket DIBATALKAN (dikecualikan) + satu tiket MENUNGGU (belum siap) -> order_ready harus TETAP false karena tiket MENUNGGU-nya, bukan yang batal.",
    );
  });
}

async function testVacuousTruthTanpaTiketSamaSekali(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createPesananFixture(client, { status: "DRAF" });
    // TIDAK ADA TiketDapur sama sekali dibuat untuk pesanan ini (belum pernah
    // DIKIRIM_KE_DAPUR).
    const hasil = await orderReady(client, fx.pesananId);
    assertTrue(
      hasil === true,
      `Pesanan TANPA TiketDapur sama sekali -> predikat NOT EXISTS bernilai true SECARA VAKUM (dibuktikan, sesuai dokumentasi STATE-MACHINES.md) - pemanggil WAJIB menggabungkan dengan guard Pesanan.status >= DIKIRIM_KE_DAPUR di level aplikasi supaya tidak salah menganggap pesanan yang belum dikirim ke dapur sebagai "siap". Dapat ${hasil}.`,
    );
  });
}

async function main(): Promise<void> {
  await testSeluruhTiketSiapOrderReadyTrue();
  await testSatuTiketBelumSiapOrderReadyFalse();
  await testTiketDibatalkanTidakMembuatOrderMacet();
  await testTiketDibatalkanTanpaAlasanDitolakSebelumBisaMasukPredikat();
  await testKombinasiSatuBatalSatuBelumSiapTetapFalse();
  await testVacuousTruthTanpaTiketSamaSekali();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-041 (predikat order-ready STATE-MACHINES.md dijalankan terhadap data TiketDapur nyata - tiket batal tidak membuat order macet, vacuous-truth terdokumentasi) lulus.",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
