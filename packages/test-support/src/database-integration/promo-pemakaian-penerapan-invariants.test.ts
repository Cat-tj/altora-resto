// Test database-integration untuk ALT-DEF-038 (menutup) - redesain
// PromoPemakaian: SELALU tepat satu baris per pasangan (pesananId, promoId),
// dengan `jumlahPenerapan` sebagai penghitung repeatable, BUKAN lagi banyak
// baris untuk promo yang sama - migrasi
// `20260726150000_promo_pemakaian_satu_baris_per_pasangan_penghitung`.
// Menyambung ke Postgres NYATA (bukan cuma teks SQL/schema.prisma).
//
// YANG DIBUKTIKAN SECARA PERILAKU:
//   1. Object DB benar-benar ada: unique index `promo_pemakaian_pesananId_promoId_key`,
//      trigger `trg_promo_pemakaian_cek_batas_penerapan`.
//   2. `@@unique([pesananId, promoId])` MENOLAK baris KEDUA untuk pasangan
//      yang SAMA (inilah inti perbaikan - constraint statis, bukan lagi
//      celah app-level ALT-DEF-038).
//   3. Promo BERBEDA pada pesanan yang SAMA tetap BERHASIL (stacking
//      ALT-DEF-009 tidak ikut terkunci oleh constraint baru ini).
//   4. Trigger `trg_promo_pemakaian_cek_batas_penerapan`:
//      a. `jumlahPenerapan > 1` pada promo `repeatable=false` DITOLAK.
//      b. `jumlahPenerapan` melebihi `Promo.usageLimitPerOrder` DITOLAK.
//      c. `jumlahPenerapan` dalam batas (repeatable=true, <= usageLimitPerOrder) BERHASIL.
//      d. `jumlahPenerapan < 1` DITOLAK.
//   5. `PromoPemakaianBaris`: banyak baris (mengelompokkan lewat
//      `nomorPenerapan`) bisa ditambahkan di bawah SATU header tanpa
//      masalah, mensimulasikan BOGO yang terpicu 3x.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/promo-pemakaian-penerapan-invariants.test.ts

import {
  assertTrue,
  createPesananFixture,
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
      `SELECT indexname FROM pg_indexes WHERE tablename = 'promo_pemakaian'
       AND indexname = 'promo_pemakaian_pesananId_promoId_key'`,
    );
    assertTrue(
      idx.rowCount === 1,
      `Unique index promo_pemakaian_pesananId_promoId_key harus ada, dapat ${idx.rowCount}.`,
    );

    const trg = await pool.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'promo_pemakaian'::regclass
       AND tgname = 'trg_promo_pemakaian_cek_batas_penerapan'`,
    );
    assertTrue(trg.rowCount === 1, "Trigger trg_promo_pemakaian_cek_batas_penerapan harus ada di promo_pemakaian.");
  } finally {
    await pool.end();
  }
}

interface PromoOpts {
  repeatable?: boolean;
  usageLimitPerOrder?: number | null;
}

async function insertPromo(client: pg.PoolClient, tenantId: string, opts: PromoOpts = {}): Promise<string> {
  const promoId = fixtureId("promo");
  await client.query(
    `INSERT INTO promo (id, "tenantId", nama, "berlakuSejak", "berlakuSampai", status, "stackingPolicy",
       "usageLimitPerOrder", repeatable, "createdAt", "updatedAt", version)
     VALUES ($1, $2, 'Promo Uji', now() - interval '1 day', now() + interval '30 day', 'AKTIF',
       'BOLEH_DIGABUNG', $3, $4, now(), now(), 1)`,
    [promoId, tenantId, opts.usageLimitPerOrder ?? null, opts.repeatable ?? false],
  );
  return promoId;
}

async function insertPemakaian(
  client: pg.PoolClient,
  args: { tenantId: string; promoId: string; pesananId: string; jumlahPenerapan?: number },
): Promise<string> {
  const id = fixtureId("promopemakaian");
  await client.query(
    `INSERT INTO promo_pemakaian (id, "tenantId", "promoId", "pesananId", status, "jumlahPenerapan", "totalDiskon", "createdAt")
     VALUES ($1, $2, $3, $4, 'DITERAPKAN', $5, 0, now())`,
    [id, args.tenantId, args.promoId, args.pesananId, args.jumlahPenerapan ?? 1],
  );
  return id;
}

async function testUniqueSatuBarisPerPasangan(): Promise<void> {
  await withTransaction(async (client) => {
    const pesanan = await createPesananFixture(client);
    const promoId = await insertPromo(client, pesanan.tenantId, { repeatable: true, usageLimitPerOrder: 5 });

    await insertPemakaian(client, { tenantId: pesanan.tenantId, promoId, pesananId: pesanan.pesananId });

    const msg = await expectReject(client, "Baris PromoPemakaian kedua untuk pasangan (pesananId, promoId) yang sama", () =>
      insertPemakaian(client, { tenantId: pesanan.tenantId, promoId, pesananId: pesanan.pesananId }),
    );
    assertTrue(
      /duplicate key|unique constraint|pesananId_promoId_key/i.test(msg),
      `Error harus dari unique index (pesananId, promoId), dapat: ${msg}`,
    );
  });
}

async function testPromoBerbedaTetapBerhasil(): Promise<void> {
  await withTransaction(async (client) => {
    const pesanan = await createPesananFixture(client);
    const promoA = await insertPromo(client, pesanan.tenantId);
    const promoB = await insertPromo(client, pesanan.tenantId);

    // Dua PROMO BERBEDA pada SATU pesanan yang sama - stacking ALT-DEF-009
    // TIDAK BOLEH terkunci oleh constraint (pesananId, promoId) yang baru.
    await insertPemakaian(client, { tenantId: pesanan.tenantId, promoId: promoA, pesananId: pesanan.pesananId });
    await insertPemakaian(client, { tenantId: pesanan.tenantId, promoId: promoB, pesananId: pesanan.pesananId });

    const rows = await client.query(`SELECT "promoId" FROM promo_pemakaian WHERE "pesananId" = $1 ORDER BY "promoId"`, [
      pesanan.pesananId,
    ]);
    assertTrue(rows.rowCount === 2, `Harus ada 2 baris PromoPemakaian (dua promo berbeda), dapat ${rows.rowCount}.`);
  });
}

async function testTriggerBatasPenerapan(): Promise<void> {
  await withTransaction(async (client) => {
    // (a) repeatable=false, jumlahPenerapan > 1 -> ditolak
    const pesanan1 = await createPesananFixture(client);
    const promoNonRepeatable = await insertPromo(client, pesanan1.tenantId, { repeatable: false });
    const msgNonRepeatable = await expectReject(
      client,
      "jumlahPenerapan > 1 pada promo repeatable=false",
      () => insertPemakaian(client, { tenantId: pesanan1.tenantId, promoId: promoNonRepeatable, pesananId: pesanan1.pesananId, jumlahPenerapan: 2 }),
    );
    assertTrue(
      /repeatable=false tidak boleh jumlahPenerapan/i.test(msgNonRepeatable),
      `Error harus menyebut repeatable=false, dapat: ${msgNonRepeatable}`,
    );

    // (b) repeatable=true, usageLimitPerOrder=3, jumlahPenerapan=4 -> ditolak
    const pesanan2 = await createPesananFixture(client);
    const promoLimit3 = await insertPromo(client, pesanan2.tenantId, { repeatable: true, usageLimitPerOrder: 3 });
    const msgLimit = await expectReject(
      client,
      "jumlahPenerapan melebihi usageLimitPerOrder",
      () => insertPemakaian(client, { tenantId: pesanan2.tenantId, promoId: promoLimit3, pesananId: pesanan2.pesananId, jumlahPenerapan: 4 }),
    );
    assertTrue(
      /usageLimitPerOrder=3 dilampaui/i.test(msgLimit),
      `Error harus menyebut usageLimitPerOrder dilampaui, dapat: ${msgLimit}`,
    );

    // (c) repeatable=true, usageLimitPerOrder=3, jumlahPenerapan=3 -> berhasil
    const pesanan3 = await createPesananFixture(client);
    const promoLimit3b = await insertPromo(client, pesanan3.tenantId, { repeatable: true, usageLimitPerOrder: 3 });
    const idBerhasil = await insertPemakaian(client, {
      tenantId: pesanan3.tenantId,
      promoId: promoLimit3b,
      pesananId: pesanan3.pesananId,
      jumlahPenerapan: 3,
    });
    const cek = await client.query(`SELECT "jumlahPenerapan" FROM promo_pemakaian WHERE id = $1`, [idBerhasil]);
    assertTrue(cek.rows[0]["jumlahPenerapan"] === 3, "jumlahPenerapan=3 dalam batas usageLimitPerOrder=3 harus berhasil tersimpan.");

    // Increment lanjutan (UPDATE) melebihi batas juga harus ditolak trigger
    // (trigger BEFORE INSERT OR UPDATE, bukan hanya BEFORE INSERT).
    const msgUpdateLewatBatas = await expectReject(
      client,
      "UPDATE jumlahPenerapan melebihi usageLimitPerOrder",
      () => client.query(`UPDATE promo_pemakaian SET "jumlahPenerapan" = 4 WHERE id = $1`, [idBerhasil]),
    );
    assertTrue(
      /usageLimitPerOrder=3 dilampaui/i.test(msgUpdateLewatBatas),
      `Error UPDATE harus menyebut usageLimitPerOrder dilampaui, dapat: ${msgUpdateLewatBatas}`,
    );

    // (d) jumlahPenerapan < 1 -> ditolak
    const pesanan4 = await createPesananFixture(client);
    const promoBebas = await insertPromo(client, pesanan4.tenantId, { repeatable: true });
    const msgKurangSatu = await expectReject(
      client,
      "jumlahPenerapan < 1",
      () => insertPemakaian(client, { tenantId: pesanan4.tenantId, promoId: promoBebas, pesananId: pesanan4.pesananId, jumlahPenerapan: 0 }),
    );
    assertTrue(/jumlahPenerapan harus >= 1/i.test(msgKurangSatu), `Error harus menyebut jumlahPenerapan >= 1, dapat: ${msgKurangSatu}`);

    // repeatable=true TANPA usageLimitPerOrder (null = tak terbatas) -> jumlah besar tetap berhasil
    const pesanan5 = await createPesananFixture(client);
    const promoTakTerbatas = await insertPromo(client, pesanan5.tenantId, { repeatable: true, usageLimitPerOrder: null });
    const idTakTerbatas = await insertPemakaian(client, {
      tenantId: pesanan5.tenantId,
      promoId: promoTakTerbatas,
      pesananId: pesanan5.pesananId,
      jumlahPenerapan: 50,
    });
    const cekTakTerbatas = await client.query(`SELECT "jumlahPenerapan" FROM promo_pemakaian WHERE id = $1`, [idTakTerbatas]);
    assertTrue(
      cekTakTerbatas.rows[0]["jumlahPenerapan"] === 50,
      "usageLimitPerOrder NULL harus berarti tak terbatas - jumlahPenerapan=50 harus berhasil.",
    );
  });
}

async function testBanyakBarisPerHeaderBogoTigaKali(): Promise<void> {
  await withTransaction(async (client) => {
    // Simulasi BOGO "beli 2 gratis 1" yang terpicu 3x dalam SATU pesanan
    // besar - 3 aktivasi, masing-masing menggratiskan 1 item -> 3 baris
    // PromoPemakaianBaris di bawah SATU header PromoPemakaian, BUKAN 3
    // header terpisah (inilah inti redesain ALT-DEF-038).
    const pesanan = await createPesananFixture(client, { jumlahItem: 3 });
    const promoBogo = await insertPromo(client, pesanan.tenantId, { repeatable: true, usageLimitPerOrder: 3 });
    const headerId = await insertPemakaian(client, {
      tenantId: pesanan.tenantId,
      promoId: promoBogo,
      pesananId: pesanan.pesananId,
      jumlahPenerapan: 3,
    });

    for (let nomorPenerapan = 1; nomorPenerapan <= 3; nomorPenerapan += 1) {
      const barisId = fixtureId("promopemakaianbaris");
      await client.query(
        `INSERT INTO promo_pemakaian_baris (id, "tenantId", "promoPemakaianId", "itemPesananId", "nilaiDiskon", "nomorPenerapan", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [barisId, pesanan.tenantId, headerId, pesanan.itemPesananIds[0], 10000, nomorPenerapan],
      );
    }

    const baris = await client.query(
      `SELECT "nomorPenerapan" FROM promo_pemakaian_baris WHERE "promoPemakaianId" = $1 ORDER BY "nomorPenerapan"`,
      [headerId],
    );
    assertTrue(baris.rowCount === 3, `Harus ada 3 baris PromoPemakaianBaris di bawah 1 header, dapat ${baris.rowCount}.`);
    assertTrue(
      baris.rows.map((r) => r["nomorPenerapan"]).join(",") === "1,2,3",
      `nomorPenerapan harus 1,2,3, dapat ${baris.rows.map((r) => r["nomorPenerapan"]).join(",")}`,
    );

    await client.query(
      `UPDATE promo_pemakaian SET "totalDiskon" = (SELECT COALESCE(SUM("nilaiDiskon"), 0) FROM promo_pemakaian_baris WHERE "promoPemakaianId" = $1) WHERE id = $1`,
      [headerId],
    );
    const header = await client.query(`SELECT "totalDiskon" FROM promo_pemakaian WHERE id = $1`, [headerId]);
    assertTrue(
      header.rows[0]["totalDiskon"] === "30000",
      `totalDiskon harus agregat 3x10000=30000, dapat ${header.rows[0]["totalDiskon"]}`,
    );
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testUniqueSatuBarisPerPasangan();
  await testPromoBerbedaTetapBerhasil();
  await testTriggerBatasPenerapan();
  await testBanyakBarisPerHeaderBogoTigaKali();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ALT-DEF-038 (satu baris PromoPemakaian per pasangan pesananId+promoId, penghitung jumlahPenerapan, trigger batas repeatable/usageLimitPerOrder, banyak PromoPemakaianBaris per header) lulus - menutup ALT-DEF-038.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
