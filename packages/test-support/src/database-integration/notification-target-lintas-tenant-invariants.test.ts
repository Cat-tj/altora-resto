// Test database-integration untuk ADR-040 (redesain target Notification -
// menutup deferral eksplisit ADR-033 Keputusan 4 dan instruksi batch:
// "Jangan gunakan kombinasi longgar tenantId/outletId/penggunaId global -
// gunakan target keanggotaanTenantId/keanggotaanOutletId opsional/peranId
// opsional - bila broadcast, simpan aturan target eksplisit - query pembaca
// harus tenant/outlet-scoped - tambahkan test pengguna tenant lain tidak
// dapat membaca notifikasi").
//
// Menyambung ke Postgres nyata (altora_resto_dev). Membuktikan (bukan hanya
// mengklaim):
//
//   1. CHECK constraint `notification_lingkup_target_kombinasi_check`
//      menegakkan SELURUH baris matriks kombinasi lingkupTarget <-> field
//      targeting di docs/engineering/DECISION-LOG.md ADR-040 - kombinasi
//      SAH diterima, kombinasi TIDAK SAH (mis. lingkupTarget salah untuk
//      field yang diisi) ditolak.
//   2. Predikat query pembaca EKSPLISIT yang didokumentasikan di
//      docs/api/API-CONTRACT.md (WAJIB diawali `tenantId = :callerTenantId`)
//      mengembalikan HANYA notifikasi milik tenant caller sendiri, untuk
//      SETIAP lingkupTarget.
//   3. KASUS ADVERSARIAL (bukti "kenapa guard tenantId penting", bukan
//      rubber-stamp): dua tenant BERBEDA masing-masing punya notifikasi
//      SELURUH_TENANT (lingkupTarget yang TIDAK PUNYA kolom penyaring lain -
//      keanggotaanTenantId/outletId/peranId semuanya NULL). Predikat yang
//      SENGAJA DIBUAT SALAH (tanpa AND tenantId = :callerTenantId di
//      level TERLUAR) TERBUKTI membocorkan notifikasi broadcast tenant LAIN
//      ke caller tenant A - lalu predikat yang BENAR (dengan guard) TERBUKTI
//      tidak membocorkannya. Dua Peran di tenant berbeda sengaja diberi
//      `kode` yang SAMA ("KASIR") untuk membuktikan bahwa kemiripan nama
//      peran lintas tenant tidak pernah membingungkan predikat (peranId
//      tetap dua nilai berbeda, guard tenantId tetap wajib).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/notification-target-lintas-tenant-invariants.test.ts

import {
  assertTrue,
  createAktorFixture,
  createBaseFixtures,
  expectReject,
  fixtureId,
  withTransaction,
} from "./_pg-helper"
import type pg from "pg";

interface PeranFixture {
  peranId: string;
}

async function createPeranFixture(
  client: pg.PoolClient,
  tenantId: string,
  kode: string,
): Promise<PeranFixture> {
  const peranId = fixtureId("peran");
  await client.query(
    `INSERT INTO peran (id, "tenantId", kode, nama, "isSystem", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, false, 'AKTIF', now(), now())`,
    [peranId, tenantId, kode, `Peran ${kode}`],
  );
  return { peranId };
}

async function assignKeanggotaanPeran(
  client: pg.PoolClient,
  keanggotaanTenantId: string,
  peranId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO keanggotaan_peran (id, "keanggotaanTenantId", "peranId", "createdAt")
     VALUES ($1, $2, $3, now())`,
    [fixtureId("kp"), keanggotaanTenantId, peranId],
  );
}

async function insertNotification(
  client: pg.PoolClient,
  opts: {
    tenantId: string;
    lingkupTarget: string;
    outletId?: string | null;
    keanggotaanTenantId?: string | null;
    peranId?: string | null;
  },
): Promise<string> {
  const id = fixtureId("notif");
  await client.query(
    `INSERT INTO notification (id, "tenantId", "outletId", "keanggotaanTenantId", "peranId", "lingkupTarget", tipe, judul, pesan, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'PESANAN_BERUBAH', 'Uji', 'Uji ADR-040', now())`,
    [
      id,
      opts.tenantId,
      opts.outletId ?? null,
      opts.keanggotaanTenantId ?? null,
      opts.peranId ?? null,
      opts.lingkupTarget,
    ],
  );
  return id;
}

// --- (1) CHECK constraint: kombinasi valid per baris matriks ADR-040 ---

async function testKombinasiValidDiterimaSemuaLingkup(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const aktor = await createAktorFixture(client, fx.tenantId, fx.outletId);
    const peran = await createPeranFixture(client, fx.tenantId, "KASIR");

    // PENGGUNA_SPESIFIK: keanggotaanTenantId wajib, sisanya null.
    await insertNotification(client, {
      tenantId: fx.tenantId,
      lingkupTarget: "PENGGUNA_SPESIFIK",
      keanggotaanTenantId: aktor.keanggotaanTenantId,
    });
    // OUTLET: outletId wajib, sisanya null.
    await insertNotification(client, {
      tenantId: fx.tenantId,
      lingkupTarget: "OUTLET",
      outletId: fx.outletId,
    });
    // PERAN_DI_TENANT: peranId wajib, sisanya null.
    await insertNotification(client, {
      tenantId: fx.tenantId,
      lingkupTarget: "PERAN_DI_TENANT",
      peranId: peran.peranId,
    });
    // PERAN_DI_OUTLET: outletId+peranId wajib, keanggotaanTenantId null.
    await insertNotification(client, {
      tenantId: fx.tenantId,
      lingkupTarget: "PERAN_DI_OUTLET",
      outletId: fx.outletId,
      peranId: peran.peranId,
    });
    // SELURUH_TENANT: ketiganya null.
    await insertNotification(client, {
      tenantId: fx.tenantId,
      lingkupTarget: "SELURUH_TENANT",
    });

    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM notification WHERE "tenantId" = $1`,
      [fx.tenantId],
    );
    assertTrue(rows[0].n === 5, `Kelima kombinasi valid harus ter-INSERT, dapat ${rows[0].n}.`);
  });
}

async function testKombinasiTidakValidDitolak(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const aktor = await createAktorFixture(client, fx.tenantId, fx.outletId);
    const peran = await createPeranFixture(client, fx.tenantId, "KASIR");

    // PENGGUNA_SPESIFIK tapi peranId JUGA diisi -> kontradiktif, harus ditolak.
    const msg1 = await expectReject(
      client,
      "PENGGUNA_SPESIFIK dengan peranId terisi (kontradiktif)",
      () =>
        insertNotification(client, {
          tenantId: fx.tenantId,
          lingkupTarget: "PENGGUNA_SPESIFIK",
          keanggotaanTenantId: aktor.keanggotaanTenantId,
          peranId: peran.peranId,
        }),
    );
    assertTrue(
      /violates check constraint|notification_lingkup_target_kombinasi_check/i.test(msg1),
      `error harus dari CHECK constraint kombinasi, dapat: ${msg1}`,
    );

    // OUTLET tapi keanggotaanTenantId JUGA diisi -> tidak sesuai matriks, ditolak.
    const msg2 = await expectReject(
      client,
      "OUTLET dengan keanggotaanTenantId terisi",
      () =>
        insertNotification(client, {
          tenantId: fx.tenantId,
          lingkupTarget: "OUTLET",
          outletId: fx.outletId,
          keanggotaanTenantId: aktor.keanggotaanTenantId,
        }),
    );
    assertTrue(
      /violates check constraint|notification_lingkup_target_kombinasi_check/i.test(msg2),
      `error harus dari CHECK constraint kombinasi, dapat: ${msg2}`,
    );

    // PERAN_DI_TENANT tapi outletId JUGA diisi -> itu sebenarnya PERAN_DI_OUTLET, ditolak.
    const msg3 = await expectReject(
      client,
      "PERAN_DI_TENANT dengan outletId terisi (seharusnya PERAN_DI_OUTLET)",
      () =>
        insertNotification(client, {
          tenantId: fx.tenantId,
          lingkupTarget: "PERAN_DI_TENANT",
          outletId: fx.outletId,
          peranId: peran.peranId,
        }),
    );
    assertTrue(
      /violates check constraint|notification_lingkup_target_kombinasi_check/i.test(msg3),
      `error harus dari CHECK constraint kombinasi, dapat: ${msg3}`,
    );

    // SELURUH_TENANT tapi salah satu field targeting diisi -> ditolak.
    const msg4 = await expectReject(
      client,
      "SELURUH_TENANT dengan outletId terisi",
      () =>
        insertNotification(client, {
          tenantId: fx.tenantId,
          lingkupTarget: "SELURUH_TENANT",
          outletId: fx.outletId,
        }),
    );
    assertTrue(
      /violates check constraint|notification_lingkup_target_kombinasi_check/i.test(msg4),
      `error harus dari CHECK constraint kombinasi, dapat: ${msg4}`,
    );

    // PENGGUNA_SPESIFIK tapi keanggotaanTenantId NULL -> ditolak (wajib ada).
    const msg5 = await expectReject(
      client,
      "PENGGUNA_SPESIFIK tanpa keanggotaanTenantId",
      () =>
        insertNotification(client, {
          tenantId: fx.tenantId,
          lingkupTarget: "PENGGUNA_SPESIFIK",
        }),
    );
    assertTrue(
      /violates check constraint|notification_lingkup_target_kombinasi_check/i.test(msg5),
      `error harus dari CHECK constraint kombinasi, dapat: ${msg5}`,
    );
  });
}

// --- (2)+(3) predikat query pembaca + kasus adversarial lintas tenant ---

/** Predikat yang BENAR - persis kontrak API-CONTRACT.md (ADR-040): SELALU
 * diawali `tenantId = :callerTenantId` di level TERLUAR sebelum OR apa pun. */
function predikatBenarSql(): string {
  return `
    SELECT id FROM notification
    WHERE "tenantId" = $1
      AND (
        ("lingkupTarget" = 'PENGGUNA_SPESIFIK' AND "keanggotaanTenantId" = $2)
        OR ("lingkupTarget" = 'OUTLET' AND "outletId" = ANY($3::text[]))
        OR ("lingkupTarget" = 'PERAN_DI_TENANT' AND "peranId" = ANY($4::text[]))
        OR ("lingkupTarget" = 'PERAN_DI_OUTLET' AND "peranId" = ANY($4::text[]) AND "outletId" = ANY($3::text[]))
        OR ("lingkupTarget" = 'SELURUH_TENANT')
      )
    ORDER BY id
  `;
}

/** Predikat yang SENGAJA DIBUAT SALAH (vulnerable) - IDENTIK dengan predikat
 * benar KECUALI guard `tenantId = :callerTenantId` di level terluar DIHAPUS.
 * Dipakai HANYA untuk membuktikan kenapa guard itu penting (kasus
 * adversarial), TIDAK PERNAH dimaksudkan sebagai kontrak nyata. */
function predikatRentanSql(): string {
  return `
    SELECT id, "tenantId" FROM notification
    -- "$1::text IS NOT NULL" HANYA supaya Postgres bisa infer tipe parameter
    -- $1 (tidak dipakai untuk filtering) - INI PERSIS INTI kerentanannya:
    -- callerTenantId diterima tapi TIDAK PERNAH dipakai menyaring tenantId.
    WHERE ($1::text IS NOT NULL) AND (
        ("lingkupTarget" = 'PENGGUNA_SPESIFIK' AND "keanggotaanTenantId" = $2)
        OR ("lingkupTarget" = 'OUTLET' AND "outletId" = ANY($3::text[]))
        OR ("lingkupTarget" = 'PERAN_DI_TENANT' AND "peranId" = ANY($4::text[]))
        OR ("lingkupTarget" = 'PERAN_DI_OUTLET' AND "peranId" = ANY($4::text[]) AND "outletId" = ANY($3::text[]))
        OR ("lingkupTarget" = 'SELURUH_TENANT')
      )
    ORDER BY id
  `;
}

async function testAdversarialLintasTenant(): Promise<void> {
  await withTransaction(async (client) => {
    // --- Tenant A ---
    const fxA = await createBaseFixtures(client);
    const aktorA = await createAktorFixture(client, fxA.tenantId, fxA.outletId);
    // Sengaja SAMA kode ("KASIR") dengan peran tenant B di bawah - membuktikan
    // kemiripan NAMA peran lintas tenant tidak pernah membingungkan predikat.
    const peranA = await createPeranFixture(client, fxA.tenantId, "KASIR");
    await assignKeanggotaanPeran(client, aktorA.keanggotaanTenantId, peranA.peranId);

    // --- Tenant B (independen sepenuhnya) ---
    const fxB = await createBaseFixtures(client);
    const aktorB = await createAktorFixture(client, fxB.tenantId, fxB.outletId);
    const peranB = await createPeranFixture(client, fxB.tenantId, "KASIR");
    await assignKeanggotaanPeran(client, aktorB.keanggotaanTenantId, peranB.peranId);

    // Notifikasi milik A (harus terlihat OLEH caller A, TIDAK OLEH caller B).
    const notifA_spesifik = await insertNotification(client, {
      tenantId: fxA.tenantId,
      lingkupTarget: "PENGGUNA_SPESIFIK",
      keanggotaanTenantId: aktorA.keanggotaanTenantId,
    });
    const notifA_outlet = await insertNotification(client, {
      tenantId: fxA.tenantId,
      lingkupTarget: "OUTLET",
      outletId: fxA.outletId,
    });
    const notifA_peranTenant = await insertNotification(client, {
      tenantId: fxA.tenantId,
      lingkupTarget: "PERAN_DI_TENANT",
      peranId: peranA.peranId,
    });
    const notifA_peranOutlet = await insertNotification(client, {
      tenantId: fxA.tenantId,
      lingkupTarget: "PERAN_DI_OUTLET",
      outletId: fxA.outletId,
      peranId: peranA.peranId,
    });
    const notifA_broadcast = await insertNotification(client, {
      tenantId: fxA.tenantId,
      lingkupTarget: "SELURUH_TENANT",
    });

    // Notifikasi milik B (harus terlihat OLEH caller B, TIDAK OLEH caller A) -
    // termasuk broadcast SELURUH_TENANT B yang jadi inti kasus adversarial.
    const notifB_broadcast = await insertNotification(client, {
      tenantId: fxB.tenantId,
      lingkupTarget: "SELURUH_TENANT",
    });
    const notifB_peranTenant = await insertNotification(client, {
      tenantId: fxB.tenantId,
      lingkupTarget: "PERAN_DI_TENANT",
      peranId: peranB.peranId,
    });

    // Konteks caller A: tenantId A, keanggotaanTenantId A, outlet A, role A.
    const callerA = [fxA.tenantId, aktorA.keanggotaanTenantId, [fxA.outletId], [peranA.peranId]] as const;

    // --- KASUS ADVERSARIAL: predikat RENTAN (tanpa guard tenantId) dipanggil
    // sebagai caller A -> HARUS membocorkan notifB_broadcast (bukti bahwa
    // tanpa guard tenantId, lingkupTarget SELURUH_TENANT tenant LAIN pun ikut
    // cocok karena baris itu memang tidak punya kolom penyaring lain). ---
    const rentan = await client.query(predikatRentanSql(), callerA as unknown as any[]);
    const idsRentan = rentan.rows.map((r) => r.id as string);
    assertTrue(
      idsRentan.includes(notifB_broadcast),
      "KASUS ADVERSARIAL GAGAL DIBUKTIKAN: predikat rentan (tanpa guard tenantId) SEHARUSNYA membocorkan notifikasi SELURUH_TENANT milik tenant LAIN ke caller A - kalau tidak, kasus adversarial ini tidak membuktikan apa-apa.",
    );
    assertTrue(
      idsRentan.includes(notifA_broadcast),
      "Predikat rentan tetap harus mengembalikan notifikasi broadcast A sendiri (baseline).",
    );

    // --- Predikat BENAR (dengan guard tenantId) dipanggil sebagai caller A -
    // HARUS mengembalikan TEPAT kelima notifikasi A, TIDAK SATU PUN milik B,
    // walau peranId A dan peranId B punya `kode` yang identik ("KASIR"). ---
    const benarA = await client.query(predikatBenarSql(), callerA as unknown as any[]);
    const idsBenarA = benarA.rows.map((r) => r.id as string);
    assertTrue(
      idsBenarA.length === 5 &&
        [notifA_spesifik, notifA_outlet, notifA_peranTenant, notifA_peranOutlet, notifA_broadcast].every((id) =>
          idsBenarA.includes(id),
        ),
      `Predikat benar (caller A) harus mengembalikan TEPAT 5 notifikasi milik A, dapat: ${JSON.stringify(idsBenarA)}`,
    );
    assertTrue(
      !idsBenarA.includes(notifB_broadcast) && !idsBenarA.includes(notifB_peranTenant),
      "Predikat benar (caller A) TIDAK BOLEH mengembalikan notifikasi milik tenant B mana pun - termasuk broadcast SELURUH_TENANT B dan PERAN_DI_TENANT B walau kode perannya sama ('KASIR').",
    );

    // --- Simetri: caller B juga tidak boleh melihat notifikasi A. ---
    const callerB = [fxB.tenantId, aktorB.keanggotaanTenantId, [fxB.outletId], [peranB.peranId]] as const;
    const benarB = await client.query(predikatBenarSql(), callerB as unknown as any[]);
    const idsBenarB = benarB.rows.map((r) => r.id as string);
    assertTrue(
      idsBenarB.length === 2 && idsBenarB.includes(notifB_broadcast) && idsBenarB.includes(notifB_peranTenant),
      `Predikat benar (caller B) harus mengembalikan TEPAT 2 notifikasi milik B, dapat: ${JSON.stringify(idsBenarB)}`,
    );
    assertTrue(
      ![notifA_spesifik, notifA_outlet, notifA_peranTenant, notifA_peranOutlet, notifA_broadcast].some((id) =>
        idsBenarB.includes(id),
      ),
      "Predikat benar (caller B) TIDAK BOLEH mengembalikan notifikasi milik tenant A mana pun.",
    );
  });
}

async function main(): Promise<void> {
  await testKombinasiValidDiterimaSemuaLingkup();
  await testKombinasiTidakValidDitolak();
  await testAdversarialLintasTenant();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-040 (redesain target notifikasi - CHECK constraint kombinasi + predikat query tenant-safe + kasus adversarial lintas tenant) lulus.",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
