// Test database-integration untuk ADR-039 (pengerasan transactional outbox -
// versioning/dedup/ordering), migrasi
// prisma/schema/migrations/20260726160000_harden_transactional_outbox/migration.sql.
// Menyambung ke Postgres NYATA (altora_resto_dev) - lihat _pg-helper.ts.
//
// YANG DIBUKTIKAN SECARA PERILAKU (bukan hanya "kolom/constraint ada"):
//   1. @@unique([aggregateType, aggregateId, aggregateVersion, eventType])
//      MENOLAK baris kedua yang genuinely duplikat (aggregate+versi+event
//      type sama persis), TAPI mengizinkan eventType BERBEDA untuk
//      aggregate+versi yang sama.
//   2. @@unique([deduplicationKey]) MENOLAK deduplicationKey yang sama
//      dipakai ulang, BAHKAN ketika (aggregateType, aggregateId,
//      aggregateVersion, eventType) BERBEDA - membuktikan constraint ini
//      benar-benar independen/lebih luas dari constraint #1, bukan hanya
//      duplikat tekstual.
//   3. Trigger partial-mutability: UPDATE kolom state pemrosesan
//      (status/attemptCount/publishedAt/processedAt/lastError/availableAt)
//      BERHASIL; UPDATE kolom konten bisnis (payload/eventType/
//      aggregateVersion/correlationId/deduplicationKey/occurredAt) DITOLAK.
//   4. Index ordering-support: unique index
//      (aggregateType, aggregateId, aggregateVersion, eventType) BENAR-BENAR
//      ada di pg_indexes dengan prefix kolom yang sesuai kontrak "urutkan
//      event per aggregate" (bukan hanya diklaim di schema.prisma).
//   5. Status DEAD_LETTER ada di enum dan benar-benar bisa dipakai (INSERT
//      sukses dengan status DEAD_LETTER).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/outbox-versioning-dedup-invariants.test.ts

import { assertTrue, fixtureId, createBaseFixtures, withTransaction, expectReject } from "./_pg-helper"
import pg from "pg";

async function insertOutboxEvent(
  client: pg.PoolClient,
  tenantId: string,
  overrides: Partial<{
    id: string;
    aggregateType: string;
    aggregateId: string;
    aggregateVersion: number;
    eventType: string;
    correlationId: string;
    deduplicationKey: string;
    status: string;
  }> = {},
): Promise<string> {
  const id = overrides.id ?? fixtureId("outbox");
  await client.query(
    `INSERT INTO domain_outbox_event
       (id, "tenantId", "aggregateType", "aggregateId", "aggregateVersion", "eventType",
        "eventVersion", "schemaVersion", "correlationId", "causationId", "deduplicationKey",
        payload, status, "attemptCount", "availableAt", "occurredAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, 1, '1.0', $7, NULL, $8, $9::jsonb, $10, 0, now(), now(), now())`,
    [
      id,
      tenantId,
      overrides.aggregateType ?? "Pesanan",
      overrides.aggregateId ?? fixtureId("agg"),
      overrides.aggregateVersion ?? 1,
      overrides.eventType ?? "order.submitted",
      overrides.correlationId ?? fixtureId("corr"),
      overrides.deduplicationKey ?? fixtureId("dedup"),
      JSON.stringify({ contoh: true }),
      overrides.status ?? "TERTUNDA",
    ],
  );
  return id;
}

async function testUniqueAggregateVersiEventTypeMenolakDuplikat(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const aggregateId = fixtureId("pesanan_agg");

    await insertOutboxEvent(client, fx.tenantId, {
      aggregateType: "Pesanan",
      aggregateId,
      aggregateVersion: 5,
      eventType: "order.accepted",
    });

    const pesanErr = await expectReject(client, "duplikat aggregate+versi+eventType sama persis", async () => {
      await insertOutboxEvent(client, fx.tenantId, {
        aggregateType: "Pesanan",
        aggregateId,
        aggregateVersion: 5,
        eventType: "order.accepted",
      });
    });
    assertTrue(
      pesanErr.includes("domain_outbox_event_aggregateType_aggregateId_aggregateVers_key"),
      `Error harus menyebut unique constraint aggregateType+aggregateId+aggregateVersion+eventType, dapat: ${pesanErr}`,
    );

    // eventType BERBEDA untuk aggregate+versi yang SAMA harus tetap BERHASIL -
    // constraint ini tidak boleh menolak lebih dari yang seharusnya.
    await insertOutboxEvent(client, fx.tenantId, {
      aggregateType: "Pesanan",
      aggregateId,
      aggregateVersion: 5,
      eventType: "kitchen.started",
    });
  });
}

async function testUniqueDeduplicationKeyMenolakDuplikatLintasAggregate(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const dedupKey = fixtureId("dedup_bersama");

    await insertOutboxEvent(client, fx.tenantId, {
      aggregateType: "Pesanan",
      aggregateId: fixtureId("agg1"),
      aggregateVersion: 1,
      eventType: "order.accepted",
      deduplicationKey: dedupKey,
    });

    // Baris KEDUA dengan aggregateType/aggregateId/aggregateVersion/eventType
    // SEMUANYA BERBEDA dari baris pertama (jadi TIDAK melanggar constraint
    // #1 sama sekali) tapi deduplicationKey SAMA - harus TETAP ditolak oleh
    // constraint #2, membuktikan constraint ini benar-benar independen.
    const pesanErr = await expectReject(
      client,
      "deduplicationKey sama dipakai ulang lintas aggregate berbeda",
      async () => {
        await insertOutboxEvent(client, fx.tenantId, {
          aggregateType: "TiketDapur",
          aggregateId: fixtureId("agg2"),
          aggregateVersion: 9,
          eventType: "kitchen.ready",
          deduplicationKey: dedupKey,
        });
      },
    );
    assertTrue(
      pesanErr.includes("domain_outbox_event_deduplicationKey_key"),
      `Error harus menyebut unique constraint deduplicationKey, dapat: ${pesanErr}`,
    );
  });
}

async function testTriggerPartialMutabilityMengizinkanKolomStatePemrosesan(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const id = await insertOutboxEvent(client, fx.tenantId, { aggregateVersion: 1 });

    // Kolom state pemrosesan HARUS bisa berubah - inilah yang membuat trigger
    // ini BEDA dari ledger_tolak_ubah() (reject-all).
    await client.query(
      `UPDATE domain_outbox_event
         SET status = 'TERKIRIM', "attemptCount" = 1, "publishedAt" = now(), "processedAt" = now(), "lastError" = NULL, "availableAt" = now()
       WHERE id = $1`,
      [id],
    );
    const setelah = await client.query(
      `SELECT status, "attemptCount", "publishedAt" IS NOT NULL AS "punyaPublishedAt" FROM domain_outbox_event WHERE id = $1`,
      [id],
    );
    assertTrue(setelah.rows[0]["status"] === "TERKIRIM", "status harus berhasil berubah ke TERKIRIM.");
    assertTrue(setelah.rows[0]["attemptCount"] === 1, "attemptCount harus berhasil naik ke 1.");
    assertTrue(setelah.rows[0]["punyaPublishedAt"] === true, "publishedAt harus berhasil terisi.");
  });
}

async function testTriggerPartialMutabilityMenolakKolomKontenBisnis(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const id = await insertOutboxEvent(client, fx.tenantId, { aggregateVersion: 3 });

    const kasusTolak: Array<{ label: string; sql: string; params: unknown[] }> = [
      {
        label: "payload",
        sql: `UPDATE domain_outbox_event SET payload = '{"berubah": true}'::jsonb WHERE id = $1`,
        params: [id],
      },
      {
        label: "eventType",
        sql: `UPDATE domain_outbox_event SET "eventType" = 'order.cancelled' WHERE id = $1`,
        params: [id],
      },
      {
        label: "aggregateVersion",
        sql: `UPDATE domain_outbox_event SET "aggregateVersion" = 999 WHERE id = $1`,
        params: [id],
      },
      {
        label: "aggregateType",
        sql: `UPDATE domain_outbox_event SET "aggregateType" = 'Pembayaran' WHERE id = $1`,
        params: [id],
      },
      {
        label: "aggregateId",
        sql: `UPDATE domain_outbox_event SET "aggregateId" = 'lain' WHERE id = $1`,
        params: [id],
      },
      {
        label: "eventVersion",
        sql: `UPDATE domain_outbox_event SET "eventVersion" = 2 WHERE id = $1`,
        params: [id],
      },
      {
        label: "correlationId",
        sql: `UPDATE domain_outbox_event SET "correlationId" = 'lain' WHERE id = $1`,
        params: [id],
      },
      {
        label: "deduplicationKey",
        sql: `UPDATE domain_outbox_event SET "deduplicationKey" = 'lain' WHERE id = $1`,
        params: [id],
      },
      {
        label: "occurredAt",
        sql: `UPDATE domain_outbox_event SET "occurredAt" = now() - interval '1 day' WHERE id = $1`,
        params: [id],
      },
    ];

    for (const kasus of kasusTolak) {
      const pesanErr = await expectReject(client, `UPDATE kolom bisnis: ${kasus.label}`, async () => {
        await client.query(kasus.sql, kasus.params);
      });
      assertTrue(
        pesanErr.includes("partial-mutable") && pesanErr.includes("bersifat partial-mutable"),
        `Error UPDATE ${kasus.label} harus menyebut "bersifat partial-mutable", dapat: ${pesanErr}`,
      );
    }
  });
}

async function testOrderingIndexAdaDiPgIndexes(): Promise<void> {
  await withTransaction(async (client) => {
    const hasil = await client.query(
      `SELECT indexdef FROM pg_indexes
       WHERE tablename = 'domain_outbox_event'
         AND indexname = 'domain_outbox_event_aggregateType_aggregateId_aggregateVers_key'`,
    );
    assertTrue(hasil.rowCount === 1, "Index unique aggregateType+aggregateId+aggregateVersion+eventType harus ada di pg_indexes.");
    const def = hasil.rows[0]["indexdef"] as string;
    assertTrue(
      def.includes('"aggregateType"') && def.includes('"aggregateId"') && def.includes('"aggregateVersion"'),
      `Indexdef harus memuat prefix (aggregateType, aggregateId, aggregateVersion) untuk query ordering per-aggregate, dapat: ${def}`,
    );
  });
}

async function testStatusDeadLetterBisaDipakai(): Promise<void> {
  await withTransaction(async (client) => {
    const fx = await createBaseFixtures(client);
    const id = await insertOutboxEvent(client, fx.tenantId, { status: "GAGAL", aggregateVersion: 1 });

    // Simulasikan kebijakan relay worker (app-level, bukan trigger DB): setelah
    // attemptCount melewati ambang, baris dipindah GAGAL -> DEAD_LETTER.
    await client.query(
      `UPDATE domain_outbox_event SET status = 'DEAD_LETTER', "attemptCount" = 11, "lastError" = 'menyerah setelah 11 percobaan' WHERE id = $1`,
      [id],
    );
    const hasil = await client.query(`SELECT status FROM domain_outbox_event WHERE id = $1`, [id]);
    assertTrue(hasil.rows[0]["status"] === "DEAD_LETTER", "status harus berhasil berubah ke DEAD_LETTER.");
  });
}

async function main(): Promise<void> {
  await testUniqueAggregateVersiEventTypeMenolakDuplikat();
  await testUniqueDeduplicationKeyMenolakDuplikatLintasAggregate();
  await testTriggerPartialMutabilityMengizinkanKolomStatePemrosesan();
  await testTriggerPartialMutabilityMenolakKolomKontenBisnis();
  await testOrderingIndexAdaDiPgIndexes();
  await testStatusDeadLetterBisaDipakai();
  // eslint-disable-next-line no-console
  console.log(
    "OK: database-integration ADR-039 (outbox versioning/dedup/ordering/partial-mutability/dead-letter) lulus.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
