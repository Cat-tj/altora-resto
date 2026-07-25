// Test database-integration untuk ALT-RSP-001/002/003/005 / ADR-022 Keputusan 2
// dan 3 / ALT-DEF-044. Menyambung ke Postgres nyata.
//
//   1. EXISTENCE: CHECK constraint `resep_sasaran_xor` ada di pg_constraint
//      dengan ekspresi yang benar; partial unique index
//      `versi_resep_satu_aktif_per_resep` ada di pg_indexes.
//   2. BEHAVIORAL:
//      - Resep dengan NOL sasaran terisi -> ditolak (XOR gagal, jumlah=0).
//      - Resep dengan DUA sasaran terisi -> ditolak (XOR gagal, jumlah=2).
//      - Resep dengan TEPAT SATU sasaran terisi -> diterima.
//      - Dua VersiResep berstatus AKTIF untuk Resep yang sama -> ditolak.
//      - Banyak VersiResep berstatus NONAKTIF/ARSIP untuk Resep yang sama ->
//        boleh menumpuk (riwayat, ADR-006).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/resep-versi-invariants.test.ts

import {
  assertTrue,
  createBaseFixtures,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper.js";
import pg from "pg";

async function testObjectsExist(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const con = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'resep_sasaran_xor'`,
    );
    assertTrue(con.rowCount === 1, "constraint resep_sasaran_xor harus ada persis satu kali.");
    const def = (con.rows[0].def as string).replace(/\s+/g, " ");
    for (const kol of ['"itemMenuId"', '"varianMenuId"', '"bahanHasilId"']) {
      assertTrue(def.includes(kol), `resep_sasaran_xor harus menyebut kolom ${kol}, dapat: ${def}`);
    }
    assertTrue(def.includes("= 1"), `resep_sasaran_xor harus membandingkan jumlah dengan 1, dapat: ${def}`);

    const idx = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'versi_resep_satu_aktif_per_resep'`,
    );
    assertTrue(idx.rowCount === 1, "index versi_resep_satu_aktif_per_resep harus ada persis satu kali.");
    const idxdef = idx.rows[0].indexdef as string;
    assertTrue(idxdef.includes('"resepId"'), `harus memuat kolom "resepId", dapat: ${idxdef}`);
    assertTrue(idxdef.includes("'AKTIF'"), `harus partial WHERE status = 'AKTIF', dapat: ${idxdef}`);
  } finally {
    await pool.end();
  }
}

async function insertResep(
  client: pg.PoolClient,
  tenantId: string,
  cols: { itemMenuId?: string | null; varianMenuId?: string | null; bahanHasilId?: string | null },
): Promise<string> {
  const id = fixtureId("resep");
  await client.query(
    `INSERT INTO resep (id, "tenantId", nama, "itemMenuId", "varianMenuId", "bahanHasilId", status, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'AKTIF', now())`,
    [id, tenantId, `Resep ${id}`, cols.itemMenuId ?? null, cols.varianMenuId ?? null, cols.bahanHasilId ?? null],
  );
  return id;
}

async function testXorCheck(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);

    const msgNol = await expectReject(client, "Resep dengan NOL sasaran", () =>
      insertResep(client, fx.tenantId, {}),
    );
    assertTrue(/resep_sasaran_xor|check constraint/i.test(msgNol), `error harus dari CHECK resep_sasaran_xor, dapat: ${msgNol}`);

    // Kasus DUA sasaran terisi: bahanHasilId VALID (fx.bahanId) + itemMenuId
    // SENGAJA menunjuk id yang TIDAK ADA. Ini aman untuk membuktikan XOR
    // spesifik karena CHECK constraint dievaluasi immediate saat baris
    // ditulis, SEBELUM FK (tenantId,itemMenuId)->ItemMenu dicek (FK adalah
    // constraint trigger yang berjalan setelah baris ada) - jadi kegagalan
    // yang terlihat lebih dulu WAJIB berasal dari CHECK XOR, bukan FK. Sudah
    // diverifikasi empiris (lihat RELEASE-EVIDENCE.md) bahwa Postgres memang
    // melaporkan resep_sasaran_xor di sini, bukan foreign key violation.
    const msgDua = await expectReject(
      client,
      "Resep dengan DUA sasaran (itemMenuId tak-eksis + bahanHasilId valid) sekaligus",
      () => insertResep(client, fx.tenantId, { bahanHasilId: fx.bahanId, itemMenuId: fixtureId("itemmenu-taknyata") }),
    );
    assertTrue(
      /resep_sasaran_xor|check constraint/i.test(msgDua),
      `error harus dari CHECK resep_sasaran_xor (bukan FK), dapat: ${msgDua}`,
    );

    // Tepat SATU sasaran (bahanHasilId) -> harus DITERIMA.
    const resepValid = await insertResep(client, fx.tenantId, { bahanHasilId: fx.bahanId });
    const cek = await client.query(`SELECT id FROM resep WHERE id = $1`, [resepValid]);
    assertTrue(cek.rowCount === 1, "Resep dengan tepat satu sasaran terisi harus berhasil disimpan.");
  });
}

async function testVersiResepSatuAktif(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const resepId = await insertResep(client, fx.tenantId, { bahanHasilId: fx.bahanId });

    async function insertVersi(nomorVersi: number, status: string): Promise<string> {
      const id = fixtureId("versi");
      await client.query(
        `INSERT INTO versi_resep
           (id, "tenantId", "resepId", "nomorVersi", "berlakuSejak", "jumlahHasil", "satuanHasilId", "penyusutanPersen", status, "createdAt")
         VALUES ($1, $2, $3, $4, now(), 1, $5, 0, $6, now())`,
        [id, fx.tenantId, resepId, nomorVersi, fx.satuanId, status],
      );
      return id;
    }

    await insertVersi(1, "AKTIF");

    const msg = await expectReject(client, "VersiResep AKTIF kedua untuk Resep yang sama", () =>
      insertVersi(2, "AKTIF"),
    );
    assertTrue(
      /duplicate key|unique constraint|versi_resep_satu_aktif_per_resep/i.test(msg),
      `error harus dari unique index versi_resep_satu_aktif_per_resep, dapat: ${msg}`,
    );

    // Kontrol negatif: banyak versi NONAKTIF/ARSIP untuk resep yang sama harus
    // boleh menumpuk (riwayat versi lama, seluruh alasan model ini ada).
    await insertVersi(3, "NONAKTIF");
    await insertVersi(4, "ARSIP");
    await insertVersi(5, "ARSIP");
    const riwayat = await client.query(
      `SELECT count(*)::int AS n FROM versi_resep WHERE "resepId" = $1 AND status IN ('NONAKTIF','ARSIP')`,
      [resepId],
    );
    assertTrue(riwayat.rows[0].n === 3, `Tiga versi riwayat harus boleh menumpuk, dapat n=${riwayat.rows[0].n}.`);
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testXorCheck();
  await testVersiResepSatuAktif();
  // eslint-disable-next-line no-console
  console.log("OK: database-integration ALT-RSP-001/002/003/005 (resep XOR + versi_resep satu aktif) lulus.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
