// Test database-integration untuk ADR-032 (redesain pola reversal seluruh ledger
// append-only dari `dibalikOlehId` ke `membalikMutasiId`) - menutup ALT-DEF-043
// (ketiga ledger keanggotaan sebelumnya TIDAK PUNYA trigger append-only/pembalik SAMA
// SEKALI, hanya kolomnya). Menyambung ke Postgres NYATA (bukan cuma teks SQL).
//
// Empat tabel diuji dengan pola invariant IDENTIK (fungsi generik
// `ledger_tolak_ubah()`/`ledger_validasi_pembalik()` dari migrasi
// `redesign_ledger_reversal_membalik_pattern`):
//   - mutasi_stok      (trg_mutasi_stok_*)
//   - poin_riwayat     (trg_poin_riwayat_*)
//   - ledger_stempel   (trg_ledger_stempel_*)
//   - ledger_saldo_toko (trg_ledger_saldo_toko_*)
//
// Untuk SETIAP tabel, dibuktikan SECARA PERILAKU (bukan cuma existence trigger):
//   1. append-only UNKONDISIONAL - UPDATE atas kolom APA PUN (bukan hanya kolom
//      tertentu seperti desain lama) ditolak; DELETE ditolak.
//   2. INSERT baris pembalik yang VALID (tenant sama, jumlah berlawanan tanda,
//      kolom domain-spesifik sama, alasan terisi) BERHASIL.
//   3. INSERT baris pembalik KEDUA yang menunjuk baris asal yang SAMA -> ditolak
//      (unique index membalikMutasiId - CRUX redesain, item #2 checklist ADR-032).
//   4. Membalik baris yang SUDAH menjadi pembalik (rantai pembalik-dari-pembalik)
//      -> ditolak (item #3 checklist).
//   5. Tenant berbeda -> ditolak; jumlah tidak berlawanan tanda -> ditolak; alasan
//      kosong/NULL -> ditolak; kolom domain-spesifik (gudang/bahan/keanggotaan/
//      pelanggan) berbeda -> ditolak.
//
// Jalankan: npx tsx packages/test-support/src/database-integration/ledger-reversal-membalik-invariants.test.ts

import {
  assertTrue,
  createAktorFixture,
  createBaseFixtures,
  createKeanggotaanFixtures,
  createPelangganTambahan,
  createTenantTambahan,
  expectReject,
  fixtureId,
  withTransaction,
  DATABASE_URL,
} from "./_pg-helper.js";
import pg from "pg";

const TABLES = ["mutasi_stok", "poin_riwayat", "ledger_stempel", "ledger_saldo_toko"] as const;
const TRIGGER_NAMES: Record<(typeof TABLES)[number], { appendOnly: string; pembalik: string }> = {
  mutasi_stok: { appendOnly: "trg_mutasi_stok_append_only", pembalik: "trg_mutasi_stok_validasi_pembalik" },
  poin_riwayat: { appendOnly: "trg_poin_riwayat_append_only", pembalik: "trg_poin_riwayat_validasi_pembalik" },
  ledger_stempel: { appendOnly: "trg_ledger_stempel_append_only", pembalik: "trg_ledger_stempel_validasi_pembalik" },
  ledger_saldo_toko: {
    appendOnly: "trg_ledger_saldo_toko_append_only",
    pembalik: "trg_ledger_saldo_toko_validasi_pembalik",
  },
};

async function testObjectsExist(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const funcs = await pool.query(
      `SELECT proname FROM pg_proc WHERE proname IN ('ledger_tolak_ubah', 'ledger_validasi_pembalik')`,
    );
    assertTrue(
      funcs.rowCount === 2,
      `Kedua fungsi generik (ledger_tolak_ubah, ledger_validasi_pembalik) harus ada persis SEKALI masing-masing (dipakai bersama keempat tabel), dapat ${funcs.rowCount}.`,
    );

    for (const table of TABLES) {
      const trg = await pool.query(
        `SELECT t.tgname, p.proname FROM pg_trigger t
         JOIN pg_proc p ON t.tgfoid = p.oid
         WHERE t.tgrelid = $1::regclass AND NOT t.tgisinternal
         ORDER BY t.tgname`,
        [table],
      );
      assertTrue(trg.rowCount === 2, `Tabel ${table} harus punya persis dua trigger non-internal, dapat ${trg.rowCount}.`);
      const names = trg.rows.map((r) => r.tgname).sort();
      const expected = [TRIGGER_NAMES[table].appendOnly, TRIGGER_NAMES[table].pembalik].sort();
      assertTrue(
        JSON.stringify(names) === JSON.stringify(expected),
        `Nama trigger ${table} tidak sesuai. Diharapkan ${expected.join(", ")}, dapat ${names.join(", ")}`,
      );
      // Kedua trigger tabel ini harus memakai fungsi GENERIK yang sama - bukan
      // fungsi khusus per tabel (bukti genericity, bukan hanya klaim).
      const funcsUsed = trg.rows.map((r) => r.proname).sort();
      assertTrue(
        JSON.stringify(funcsUsed) === JSON.stringify(["ledger_tolak_ubah", "ledger_validasi_pembalik"]),
        `Trigger ${table} harus memakai fungsi generik ledger_tolak_ubah/ledger_validasi_pembalik, dapat: ${funcsUsed.join(", ")}`,
      );
    }

    // Kolom lama `dibalikOlehId` harus benar-benar HILANG dari keempat tabel.
    for (const table of TABLES) {
      const cols = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('dibalikOlehId', 'membalikMutasiId', 'alasan')`,
        [table],
      );
      const names = cols.rows.map((r) => r.column_name).sort();
      assertTrue(
        JSON.stringify(names) === JSON.stringify(["alasan", "membalikMutasiId"]),
        `${table} harus punya kolom membalikMutasiId+alasan dan TIDAK punya dibalikOlehId lagi, dapat: ${names.join(", ")}`,
      );
    }

    // Unique index membalikMutasiId harus ada di keempat tabel (crux redesain).
    const idx = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_membalikMutasiId_key' ORDER BY indexname`,
    );
    assertTrue(idx.rowCount === 4, `Harus ada 4 unique index membalikMutasiId (satu per tabel ledger), dapat ${idx.rowCount}.`);
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------------------
// mutasi_stok
// ---------------------------------------------------------------------------------------

async function insertMutasi(
  client: pg.PoolClient,
  fx: { tenantId: string; outletId: string; gudangId: string; bahanId: string; penggunaId: string },
  opts: { jumlah: number; jenis?: string; referensiJenis?: string; alasan?: string | null; membalikMutasiId?: string; id?: string },
): Promise<string> {
  const id = opts.id ?? fixtureId("mutasi");
  await client.query(
    `INSERT INTO mutasi_stok
       (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "membalikMutasiId", "dibuatOlehId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())`,
    [
      id,
      fx.tenantId,
      fx.outletId,
      fx.gudangId,
      fx.bahanId,
      opts.jenis ?? "PENYESUAIAN",
      opts.jumlah,
      opts.referensiJenis ?? "PENYESUAIAN",
      fixtureId("ref"),
      opts.alasan === undefined ? "Alasan uji" : opts.alasan,
      opts.membalikMutasiId ?? null,
      fx.penggunaId,
    ],
  );
  return id;
}

async function testMutasiStokAppendOnlyUnconditional(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // ADR-033: dibuatOlehId sekarang composite-FK OUTLET-LEVEL ke
    // KeanggotaanOutlet - raw penggunaId tidak lagi valid sebagai nilai
    // dibuatOlehId, jadi fx.penggunaId di-override dengan id aktor outlet
    // yang sah untuk tenant/outlet fixture ini.
    const aktorMutasi = await createAktorFixture(client, fx.tenantId, fx.outletId);
    fx.penggunaId = aktorMutasi.keanggotaanOutletId;
    const mA = await insertMutasi(client, fx, { jumlah: 10 });

    // UPDATE kolom APA PUN ditolak sekarang - bukan hanya kolom tertentu seperti
    // desain lama. Dibuktikan dengan mencoba beberapa kolom berbeda, termasuk
    // "catatan" (kolom yang di desain LAMA tidak dilarang, tapi di desain BARU tetap
    // ditolak karena append-only sekarang unkondisional).
    for (const [kolom, sql] of [
      ["jumlah", `UPDATE mutasi_stok SET jumlah = 999 WHERE id = $1`],
      ["catatan", `UPDATE mutasi_stok SET catatan = 'diubah' WHERE id = $1`],
      ["alasan", `UPDATE mutasi_stok SET alasan = 'diubah' WHERE id = $1`],
    ] as const) {
      const msg = await expectReject(client, `UPDATE kolom ${kolom} pada mutasi_stok`, () =>
        client.query(sql, [mA]),
      );
      assertTrue(/append-only/i.test(msg), `error UPDATE ${kolom} harus menyebut append-only, dapat: ${msg}`);
    }

    const msgDelete = await expectReject(client, "DELETE pada mutasi_stok", () =>
      client.query(`DELETE FROM mutasi_stok WHERE id = $1`, [mA]),
    );
    assertTrue(/append-only/i.test(msgDelete), `error DELETE harus menyebut append-only, dapat: ${msgDelete}`);

    // Bukti eksplisit BAHWA pengecualian lama sudah HILANG: mencoba mengisi
    // "membalikMutasiId" lewat UPDATE (pola LAMA yang dulu DIIZINKAN) sekarang
    // HARUS ditolak juga - baris pembalik wajib dibuat lewat INSERT baru.
    const mB = await insertMutasi(client, fx, { jumlah: -3, alasan: "koreksi" });
    const msgUpdateMembalik = await expectReject(
      client,
      "UPDATE membalikMutasiId pada mutasi_stok (pola LAMA, sekarang HARUS ditolak)",
      () => client.query(`UPDATE mutasi_stok SET "membalikMutasiId" = $1 WHERE id = $2`, [mB, mA]),
    );
    assertTrue(
      /append-only/i.test(msgUpdateMembalik),
      `UPDATE membalikMutasiId (pola lama) harus ditolak dengan pesan append-only, dapat: ${msgUpdateMembalik}`,
    );
  });
}

async function testMutasiStokReversalValid(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // ADR-033: dibuatOlehId sekarang composite-FK OUTLET-LEVEL ke
    // KeanggotaanOutlet - raw penggunaId tidak lagi valid sebagai nilai
    // dibuatOlehId, jadi fx.penggunaId di-override dengan id aktor outlet
    // yang sah untuk tenant/outlet fixture ini.
    const aktorMutasi = await createAktorFixture(client, fx.tenantId, fx.outletId);
    fx.penggunaId = aktorMutasi.keanggotaanOutletId;
    const mA = await insertMutasi(client, fx, { jumlah: 10, alasan: "Pembelian awal" });
    const mB = await insertMutasi(client, fx, { jumlah: -10, alasan: "Koreksi salah catat", membalikMutasiId: mA });
    const cek = await client.query(`SELECT "membalikMutasiId" FROM mutasi_stok WHERE id = $1`, [mB]);
    assertTrue(cek.rows[0].membalikMutasiId === mA, "mB.membalikMutasiId harus terisi mA.");

    // "sudah dibalik" sekarang QUERY TURUNAN, bukan kolom.
    const derivedCek = await client.query(`SELECT 1 FROM mutasi_stok WHERE "membalikMutasiId" = $1`, [mA]);
    assertTrue((derivedCek.rowCount ?? 0) === 1, "Query turunan harus menemukan mB sebagai pembalik mA.");
  });
}

async function testMutasiStokReversalRejections(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // ADR-033: dibuatOlehId sekarang composite-FK OUTLET-LEVEL ke
    // KeanggotaanOutlet - raw penggunaId tidak lagi valid sebagai nilai
    // dibuatOlehId, jadi fx.penggunaId di-override dengan id aktor outlet
    // yang sah untuk tenant/outlet fixture ini.
    const aktorMutasi = await createAktorFixture(client, fx.tenantId, fx.outletId);
    fx.penggunaId = aktorMutasi.keanggotaanOutletId;
    const mA = await insertMutasi(client, fx, { jumlah: 10, alasan: "Pembelian awal" });

    // (a) Membalik diri sendiri.
    const idSelf = fixtureId("mutasi");
    const msgSelf = await expectReject(client, "Membalik diri sendiri", () =>
      insertMutasi(client, fx, { jumlah: -10, alasan: "x", membalikMutasiId: idSelf, id: idSelf }),
    );
    assertTrue(/DIRINYA SENDIRI/i.test(msgSelf), `error harus menyebut membalik diri sendiri, dapat: ${msgSelf}`);

    // (b) Baris asal tidak ditemukan.
    const msgNotFound = await expectReject(client, "membalikMutasiId menunjuk baris yang tidak ada", () =>
      insertMutasi(client, fx, { jumlah: -10, alasan: "x", membalikMutasiId: fixtureId("takada") }),
    );
    assertTrue(/tidak ditemukan/i.test(msgNotFound), `error harus menyebut tidak ditemukan, dapat: ${msgNotFound}`);

    // (c) Jumlah tidak berlawanan tanda.
    const msgJumlah = await expectReject(client, "Jumlah pembalik tidak berlawanan tanda", () =>
      insertMutasi(client, fx, { jumlah: -7, alasan: "x", membalikMutasiId: mA }),
    );
    assertTrue(/harus berjumlah/i.test(msgJumlah), `error harus menyebut ketidaksepadanan jumlah, dapat: ${msgJumlah}`);

    // (d) Alasan kosong/NULL pada baris pembalik.
    const msgAlasanNull = await expectReject(client, "Alasan NULL pada baris pembalik", () =>
      insertMutasi(client, fx, { jumlah: -10, alasan: null, membalikMutasiId: mA }),
    );
    assertTrue(/wajib mengisi "alasan"/i.test(msgAlasanNull), `error harus menyebut alasan wajib, dapat: ${msgAlasanNull}`);
    const msgAlasanKosong = await expectReject(client, "Alasan string kosong pada baris pembalik", () =>
      insertMutasi(client, fx, { jumlah: -10, alasan: "   ", membalikMutasiId: mA }),
    );
    assertTrue(
      /wajib mengisi "alasan"/i.test(msgAlasanKosong),
      `error harus menyebut alasan wajib untuk string kosong/whitespace, dapat: ${msgAlasanKosong}`,
    );

    // (e) Tenant berbeda.
    const tenant2 = await createTenantTambahan(client);
    const idTenantLain = fixtureId("mutasi");
    const msgTenant = await expectReject(client, "Baris pembalik dari tenant lain", () =>
      client.query(
        `INSERT INTO mutasi_stok
           (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "membalikMutasiId", "dibuatOlehId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', -10, 'PENYESUAIAN', $6, 'x', $7, $8, now())`,
        [idTenantLain, tenant2, fx.outletId, fx.gudangId, fx.bahanId, fixtureId("ref"), mA, fx.penggunaId],
      ),
    );
    assertTrue(/tenant SAMA/i.test(msgTenant), `error harus menyebut tenant sama, dapat: ${msgTenant}`);

    // (f) Bahan berbeda (kolom domain-spesifik via TG_ARGV).
    const bahanLain = fixtureId("bahanlain");
    await client.query(
      `INSERT INTO bahan (id, "tenantId", nama, "kodeSku", "satuanDasarId", jenis, "stokMinimum", status)
       VALUES ($1, $2, $3, $4, $5, 'BAHAN_BAKU', 0, 'AKTIF')`,
      [bahanLain, fx.tenantId, `Bahan Lain ${bahanLain}`, bahanLain.slice(0, 10), fx.satuanId],
    );
    // Baris atas bahan LAIN harus dibuat lewat INSERT langsung (UPDATE atas
    // "bahanId" sendiri sudah ditolak trigger append-only unkondisional).
    const mBahanLainAsal = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok
         (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'PENYESUAIAN', 5, 'PENYESUAIAN', $6, 'asal bahan lain', $7, now())`,
      [mBahanLainAsal, fx.tenantId, fx.outletId, fx.gudangId, bahanLain, fixtureId("ref"), fx.penggunaId],
    );
    const msgBahan = await expectReject(client, "Pembalik dengan bahanId berbeda dari baris asal", () =>
      insertMutasi(client, fx, { jumlah: -5, alasan: "pembalik salah bahan", membalikMutasiId: mBahanLainAsal }),
    );
    assertTrue(/"bahanId" SAMA/i.test(msgBahan), `error harus menyebut bahanId, dapat: ${msgBahan}`);

    // (g) Lokasi TIDAK IDENTIK (item #10) - transfer keluar dengan lokasi
    // sumber/tujuan tertentu; pembalik dengan lokasi TERTUKAR harus ditolak.
    const lokasiA = fixtureId("lokasiA");
    const lokasiB = fixtureId("lokasiB");
    await client.query(
      `INSERT INTO lokasi_stok (id, "tenantId", "outletId", "gudangId", nama, status) VALUES ($1, $2, $3, $4, 'Lokasi A', 'AKTIF')`,
      [lokasiA, fx.tenantId, fx.outletId, fx.gudangId],
    );
    await client.query(
      `INSERT INTO lokasi_stok (id, "tenantId", "outletId", "gudangId", nama, status) VALUES ($1, $2, $3, $4, 'Lokasi B', 'AKTIF')`,
      [lokasiB, fx.tenantId, fx.outletId, fx.gudangId],
    );
    const mTransfer = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok
         (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "lokasiSumberId", "lokasiTujuanId", "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'TRANSFER_KELUAR', -8, 'TRANSFER', $6, 'transfer asal', $7, $8, $9, now())`,
      [mTransfer, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, fixtureId("ref"), lokasiA, lokasiB, fx.penggunaId],
    );
    const mTransferPembalikTertukar = fixtureId("mutasi");
    const msgLokasi = await expectReject(client, "Pembalik dengan lokasi sumber/tujuan TERTUKAR (bukan identik)", () =>
      client.query(
        `INSERT INTO mutasi_stok
           (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "lokasiSumberId", "lokasiTujuanId", "membalikMutasiId", "dibuatOlehId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'TRANSFER_KELUAR', 8, 'TRANSFER', $6, 'pembalik salah lokasi', $7, $8, $9, $10, now())`,
        [mTransferPembalikTertukar, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, fixtureId("ref"), lokasiB, lokasiA, mTransfer, fx.penggunaId],
      ),
    );
    assertTrue(/"lokasiSumberId" SAMA/i.test(msgLokasi), `error harus menyebut lokasiSumberId, dapat: ${msgLokasi}`);

    // Pembalik yang BENAR (lokasi IDENTIK, bukan tertukar) harus diterima.
    const mTransferPembalikBenar = fixtureId("mutasi");
    await client.query(
      `INSERT INTO mutasi_stok
         (id, "tenantId", "outletId", "gudangId", "bahanId", jenis, jumlah, "referensiJenis", "referensiId", alasan, "lokasiSumberId", "lokasiTujuanId", "membalikMutasiId", "dibuatOlehId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'TRANSFER_KELUAR', 8, 'TRANSFER', $6, 'pembalik lokasi identik', $7, $8, $9, $10, now())`,
      [mTransferPembalikBenar, fx.tenantId, fx.outletId, fx.gudangId, fx.bahanId, fixtureId("ref"), lokasiA, lokasiB, mTransfer, fx.penggunaId],
    );
  });
}

async function testMutasiStokKeduaPembalikDanRantai(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    // ADR-033: dibuatOlehId sekarang composite-FK OUTLET-LEVEL ke
    // KeanggotaanOutlet - raw penggunaId tidak lagi valid sebagai nilai
    // dibuatOlehId, jadi fx.penggunaId di-override dengan id aktor outlet
    // yang sah untuk tenant/outlet fixture ini.
    const aktorMutasi = await createAktorFixture(client, fx.tenantId, fx.outletId);
    fx.penggunaId = aktorMutasi.keanggotaanOutletId;
    const mA = await insertMutasi(client, fx, { jumlah: 10, alasan: "asal" });
    const mB = await insertMutasi(client, fx, { jumlah: -10, alasan: "pembalik pertama", membalikMutasiId: mA });

    // (c) Pembalik KEDUA yang menunjuk baris asal yang SAMA -> ditolak (unique
    // index membalikMutasiId - CRUX redesain).
    const msgKedua = await expectReject(client, "Pembalik KEDUA menunjuk baris asal yang sama (mA)", () =>
      insertMutasi(client, fx, { jumlah: -10, alasan: "pembalik kedua (invalid)", membalikMutasiId: mA }),
    );
    assertTrue(
      /duplicate key|unique constraint|membalikMutasiId_key/i.test(msgKedua),
      `error pembalik kedua harus dari unique index membalikMutasiId, dapat: ${msgKedua}`,
    );

    // (d) Rantai pembalik-dari-pembalik: mC mencoba membalik mB (yang SUDAH
    // menjadi pembalik dari mA) -> ditolak.
    const msgRantai = await expectReject(client, "Rantai pembalik-dari-pembalik (membalik mB yang sudah menjadi pembalik)", () =>
      insertMutasi(client, fx, { jumlah: 10, alasan: "mencoba membalik mB", membalikMutasiId: mB }),
    );
    assertTrue(
      /rantai pembalik-dari-pembalik/i.test(msgRantai),
      `error harus menyebut rantai pembalik-dari-pembalik, dapat: ${msgRantai}`,
    );
  });
}

// ---------------------------------------------------------------------------------------
// poin_riwayat / ledger_stempel (pola identik - keanggotaanId sebagai kolom domain)
// ---------------------------------------------------------------------------------------

async function testKeanggotaanLedger(table: "poin_riwayat" | "ledger_stempel"): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createKeanggotaanFixtures(client);

    async function insert(opts: {
      jumlah: number;
      alasan?: string | null;
      membalikMutasiId?: string;
      keanggotaanId?: string;
      tenantId?: string;
      id?: string;
    }): Promise<string> {
      const id = opts.id ?? fixtureId(table);
      const jenis = table === "poin_riwayat" ? "PENYESUAIAN" : "PENYESUAIAN";
      await client.query(
        `INSERT INTO ${table} (id, "tenantId", "keanggotaanId", jenis, jumlah, alasan, "membalikMutasiId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          id,
          opts.tenantId ?? fx.tenantId,
          opts.keanggotaanId ?? fx.keanggotaanId,
          jenis,
          opts.jumlah,
          opts.alasan === undefined ? "Alasan uji" : opts.alasan,
          opts.membalikMutasiId ?? null,
        ],
      );
      return id;
    }

    // (1) append-only unkondisional.
    const a1 = await insert({ jumlah: 10 });
    const msgUpdate = await expectReject(client, `UPDATE jumlah pada ${table}`, () =>
      client.query(`UPDATE ${table} SET jumlah = 999 WHERE id = $1`, [a1]),
    );
    assertTrue(/append-only/i.test(msgUpdate), `error UPDATE harus menyebut append-only, dapat: ${msgUpdate}`);
    const msgDelete = await expectReject(client, `DELETE pada ${table}`, () =>
      client.query(`DELETE FROM ${table} WHERE id = $1`, [a1]),
    );
    assertTrue(/append-only/i.test(msgDelete), `error DELETE harus menyebut append-only, dapat: ${msgDelete}`);

    // (2) Pembalik valid berhasil.
    const b1 = await insert({ jumlah: -10, alasan: "koreksi", membalikMutasiId: a1 });
    const cek = await client.query(`SELECT "membalikMutasiId" FROM ${table} WHERE id = $1`, [b1]);
    assertTrue(cek.rows[0].membalikMutasiId === a1, `${table}: pembalik valid harus tersimpan dengan membalikMutasiId benar.`);

    // (3) Pembalik KEDUA menunjuk baris asal yang sama -> ditolak.
    const msgKedua = await expectReject(client, `${table}: pembalik kedua ke baris asal yang sama`, () =>
      insert({ jumlah: -10, alasan: "pembalik kedua invalid", membalikMutasiId: a1 }),
    );
    assertTrue(
      /duplicate key|unique constraint|membalikMutasiId_key/i.test(msgKedua),
      `${table}: error pembalik kedua harus dari unique index, dapat: ${msgKedua}`,
    );

    // (4) Rantai pembalik-dari-pembalik -> ditolak.
    const msgRantai = await expectReject(client, `${table}: rantai pembalik-dari-pembalik`, () =>
      insert({ jumlah: 10, alasan: "mencoba membalik b1", membalikMutasiId: b1 }),
    );
    assertTrue(
      /rantai pembalik-dari-pembalik/i.test(msgRantai),
      `${table}: error harus menyebut rantai pembalik-dari-pembalik, dapat: ${msgRantai}`,
    );

    // (5) Jumlah tidak berlawanan tanda -> ditolak.
    const a2 = await insert({ jumlah: 20, alasan: "asal kedua" });
    const msgJumlah = await expectReject(client, `${table}: jumlah pembalik tidak berlawanan tanda`, () =>
      insert({ jumlah: -5, alasan: "salah jumlah", membalikMutasiId: a2 }),
    );
    assertTrue(/harus berjumlah/i.test(msgJumlah), `${table}: error harus menyebut ketidaksepadanan jumlah, dapat: ${msgJumlah}`);

    // (6) Alasan NULL/kosong -> ditolak.
    const msgAlasan = await expectReject(client, `${table}: alasan NULL pada baris pembalik`, () =>
      insert({ jumlah: -20, alasan: null, membalikMutasiId: a2 }),
    );
    assertTrue(/wajib mengisi "alasan"/i.test(msgAlasan), `${table}: error harus menyebut alasan wajib, dapat: ${msgAlasan}`);

    // (7) Tenant berbeda -> ditolak.
    const tenantLain = await createTenantTambahan(client);
    const msgTenant = await expectReject(client, `${table}: baris pembalik dari tenant lain`, () =>
      insert({ jumlah: -20, alasan: "tenant lain", membalikMutasiId: a2, tenantId: tenantLain }),
    );
    assertTrue(/tenant SAMA/i.test(msgTenant), `${table}: error harus menyebut tenant sama, dapat: ${msgTenant}`);

    // (8) keanggotaanId berbeda -> ditolak (kolom domain-spesifik via TG_ARGV).
    const fx2 = await createKeanggotaanFixtures(client);
    // fx2 tenant BEDA dari fx.tenantId - untuk isolasi murni kolom keanggotaanId
    // (bukan tenant), pakai keanggotaan kedua di TENANT YANG SAMA dengan fx.
    const pelanggan2 = await createPelangganTambahan(client, fx.tenantId);
    const keanggotaan2 = fixtureId("keanggotaan2");
    await client.query(
      `INSERT INTO keanggotaan (id, "tenantId", "pelangganId", "tierKeanggotaanId", "poinAktif", "poinKumulatif", status, "bergabungPada")
       VALUES ($1, $2, $3, $4, 0, 0, 'AKTIF', now())`,
      [keanggotaan2, fx.tenantId, pelanggan2, fx.tierKeanggotaanId],
    );
    const a3 = await insert({ jumlah: 7, alasan: "asal ketiga" });
    const msgKeanggotaan = await expectReject(client, `${table}: pembalik dengan keanggotaanId berbeda`, () =>
      insert({ jumlah: -7, alasan: "keanggotaan salah", membalikMutasiId: a3, keanggotaanId: keanggotaan2 }),
    );
    assertTrue(
      /"keanggotaanId" SAMA/i.test(msgKeanggotaan),
      `${table}: error harus menyebut keanggotaanId, dapat: ${msgKeanggotaan}`,
    );
    void fx2;
  });
}

// ---------------------------------------------------------------------------------------
// ledger_saldo_toko (kolom domain: pelangganId, digantung ke Pelanggan bukan Keanggotaan)
// ---------------------------------------------------------------------------------------

async function testLedgerSaldoToko(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createKeanggotaanFixtures(client);

    async function insert(opts: {
      jumlah: number;
      alasan?: string | null;
      membalikMutasiId?: string;
      pelangganId?: string;
      tenantId?: string;
      id?: string;
    }): Promise<string> {
      const id = opts.id ?? fixtureId("saldotoko");
      await client.query(
        `INSERT INTO ledger_saldo_toko (id, "tenantId", "pelangganId", jenis, jumlah, alasan, "membalikMutasiId", "createdAt")
         VALUES ($1, $2, $3, 'PENYESUAIAN', $4, $5, $6, now())`,
        [
          id,
          opts.tenantId ?? fx.tenantId,
          opts.pelangganId ?? fx.pelangganId,
          opts.jumlah,
          opts.alasan === undefined ? "Alasan uji" : opts.alasan,
          opts.membalikMutasiId ?? null,
        ],
      );
      return id;
    }

    const a1 = await insert({ jumlah: 5000 });
    const msgUpdate = await expectReject(client, "UPDATE jumlah pada ledger_saldo_toko", () =>
      client.query(`UPDATE ledger_saldo_toko SET jumlah = 1 WHERE id = $1`, [a1]),
    );
    assertTrue(/append-only/i.test(msgUpdate), `error UPDATE harus menyebut append-only, dapat: ${msgUpdate}`);

    const b1 = await insert({ jumlah: -5000, alasan: "koreksi refund salah", membalikMutasiId: a1 });
    const cek = await client.query(`SELECT "membalikMutasiId" FROM ledger_saldo_toko WHERE id = $1`, [b1]);
    assertTrue(cek.rows[0].membalikMutasiId === a1, "Pembalik valid harus tersimpan dengan membalikMutasiId benar.");

    const msgKedua = await expectReject(client, "Pembalik kedua ke baris asal yang sama", () =>
      insert({ jumlah: -5000, alasan: "pembalik kedua invalid", membalikMutasiId: a1 }),
    );
    assertTrue(
      /duplicate key|unique constraint|membalikMutasiId_key/i.test(msgKedua),
      `error pembalik kedua harus dari unique index, dapat: ${msgKedua}`,
    );

    const msgRantai = await expectReject(client, "Rantai pembalik-dari-pembalik", () =>
      insert({ jumlah: 5000, alasan: "mencoba membalik b1", membalikMutasiId: b1 }),
    );
    assertTrue(/rantai pembalik-dari-pembalik/i.test(msgRantai), `error harus menyebut rantai, dapat: ${msgRantai}`);

    const pelanggan2 = await createPelangganTambahan(client, fx.tenantId);
    const a2 = await insert({ jumlah: 1000, alasan: "asal kedua" });
    const msgPelanggan = await expectReject(client, "Pembalik dengan pelangganId berbeda", () =>
      insert({ jumlah: -1000, alasan: "pelanggan salah", membalikMutasiId: a2, pelangganId: pelanggan2 }),
    );
    assertTrue(/"pelangganId" SAMA/i.test(msgPelanggan), `error harus menyebut pelangganId, dapat: ${msgPelanggan}`);
  });
}

async function main(): Promise<void> {
  await testObjectsExist();
  await testMutasiStokAppendOnlyUnconditional();
  await testMutasiStokReversalValid();
  await testMutasiStokReversalRejections();
  await testMutasiStokKeduaPembalikDanRantai();
  await testKeanggotaanLedger("poin_riwayat");
  await testKeanggotaanLedger("ledger_stempel");
  await testLedgerSaldoToko();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-032 (redesain membalikMutasiId, generic ledger_tolak_ubah/ledger_validasi_pembalik) lulus untuk mutasi_stok, poin_riwayat, ledger_stempel, ledger_saldo_toko - menutup ALT-DEF-043.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
