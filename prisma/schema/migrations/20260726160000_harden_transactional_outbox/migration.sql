-- ADR-039 (pengerasan transactional outbox - versioning/dedup/ordering,
-- ALT-DEF-042 partial): menambah 9 kolom, 2 unique constraint (satu baru,
-- satu sudah ada dari @@index lama tidak berubah), 1 nilai enum baru
-- (DEAD_LETTER), dan 1 trigger partial-mutability BARU ke `domain_outbox_event`.
-- Lihat docs/engineering/DECISION-LOG.md ADR-039 untuk rasional lengkap per
-- kolom, dan komentar di model DomainOutboxEvent di prisma/schema/schema.prisma.
--
-- Bagian AlterEnum/AlterTable/CreateIndex di bawah dihasilkan
-- `prisma migrate diff --from-schema-datasource --to-schema-datamodel`
-- (lihat catatan proses migrasi manual di CLAUDE.md) lalu ditinjau manual;
-- bagian trigger partial-mutability (D) ditulis tangan karena Prisma DSL
-- tidak punya cara menyatakan trigger.
--
-- CATATAN AMAN-TANPA-BACKFILL: `domain_outbox_event` KOSONG (0 baris) di
-- database dev saat migrasi ini ditulis (tidak ada publisher/handler nyata
-- yang menulis ke tabel ini sampai batch ini - lihat ALT-DEF-017) - kolom
-- NOT NULL TANPA DEFAULT (aggregateVersion, correlationId, deduplicationKey)
-- aman ditambahkan langsung tanpa backfill di lingkungan ini. Bila tabel ini
-- SUDAH berisi baris di lingkungan lain sebelum migrasi ini dijalankan,
-- migrasi ini AKAN GAGAL KERAS pada baris ADD COLUMN NOT NULL - itu perilaku
-- yang DIINGINKAN (mencegah kolom penting diam-diam terisi nilai sampah),
-- bukan bug; backfill eksplisit harus ditulis terpisah untuk kasus itu.

-- =====================================================================================
-- (A) AlterEnum: tambah status terminal DEAD_LETTER (beda dari GAGAL yang
-- masih retriable - lihat komentar StatusOutboxEvent di schema.prisma).
-- =====================================================================================
ALTER TYPE "StatusOutboxEvent" ADD VALUE 'DEAD_LETTER';

-- =====================================================================================
-- (B) AlterTable: 9 kolom baru.
-- =====================================================================================
ALTER TABLE "domain_outbox_event"
    ADD COLUMN     "aggregateVersion" INTEGER NOT NULL,
    ADD COLUMN     "eventVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN     "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    ADD COLUMN     "correlationId" TEXT NOT NULL,
    ADD COLUMN     "causationId" TEXT,
    ADD COLUMN     "deduplicationKey" TEXT NOT NULL,
    ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL,
    ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- =====================================================================================
-- (C) CreateIndex: dua unique constraint (lihat rasional "kenapa keduanya
-- dibutuhkan" di komentar model schema.prisma - dua mode kegagalan berbeda).
-- Index ordering-support TERPISAH SENGAJA TIDAK dibuat - lihat catatan di
-- schema.prisma: prefix (aggregateType, aggregateId, aggregateVersion) dari
-- unique index di bawah sudah menjadi B-tree yang bisa dipakai efisien untuk
-- query "urutkan event aggregate ini per versi" tanpa index kedua duplikatif.
-- =====================================================================================
CREATE UNIQUE INDEX "domain_outbox_event_aggregateType_aggregateId_aggregateVers_key"
    ON "domain_outbox_event"("aggregateType", "aggregateId", "aggregateVersion", "eventType");

CREATE UNIQUE INDEX "domain_outbox_event_deduplicationKey_key"
    ON "domain_outbox_event"("deduplicationKey");

-- =====================================================================================
-- (D) TRIGGER PARTIAL-MUTABILITY (pola BARU, BUKAN pure append-only seperti
-- `ledger_tolak_ubah()` dari ADR-032/migrasi
-- 20260726090000_redesign_ledger_reversal_membalik_pattern).
--
-- KENAPA BEDA dari ledger_tolak_ubah(): ledger_tolak_ubah() menolak SEMUA
-- UPDATE tanpa pengecualian karena tabel ledger (mutasi_stok, poin_riwayat,
-- dst.) TIDAK PERNAH punya kolom "status pemrosesan" yang sah berubah -
-- setiap baris ledger, begitu ditulis, adalah fakta historis permanen.
-- `domain_outbox_event` BERBEDA SECARA STRUKTURAL: baris ini punya siklus
-- hidup pemrosesan yang SAH (TERTUNDA -> DIPROSES -> TERKIRIM/GAGAL/
-- DEAD_LETTER, attemptCount naik per percobaan, lastError diisi saat gagal,
-- publishedAt diisi saat sukses) - trigger reject-all akan MEMATIKAN fungsi
-- inti relay worker itu sendiri. Maka fungsi baru di bawah adalah versi
-- LEBIH PERMISIF: ia membedakan dua kelompok kolom -
--   - "konten bisnis" (payload, eventType, aggregateType, aggregateId,
--     aggregateVersion, eventVersion, schemaVersion, correlationId,
--     causationId, deduplicationKey, occurredAt, tenantId, outletId) -
--     TIDAK BOLEH berubah sekali ditulis, ini yang menegakkan instruksi
--     "retry tidak mengubah payload" secara DB-level, bukan hanya konvensi.
--   - "state pemrosesan" (status, attemptCount, availableAt, processedAt,
--     publishedAt, lastError) - BOLEH berubah, karena inilah yang memang
--     harus berubah saat relay worker memproses/retry baris ini.
-- createdAt/id sengaja TIDAK bisa berubah (PK dan waktu tulis awal) - masuk
-- kelompok konten bisnis secara implisit lewat urutan pengecekan di bawah.
-- =====================================================================================

CREATE FUNCTION outbox_tolak_ubah_kolom_bisnis()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id"
        OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
        OR NEW."outletId" IS DISTINCT FROM OLD."outletId"
        OR NEW."aggregateType" IS DISTINCT FROM OLD."aggregateType"
        OR NEW."aggregateId" IS DISTINCT FROM OLD."aggregateId"
        OR NEW."aggregateVersion" IS DISTINCT FROM OLD."aggregateVersion"
        OR NEW."eventType" IS DISTINCT FROM OLD."eventType"
        OR NEW."eventVersion" IS DISTINCT FROM OLD."eventVersion"
        OR NEW."schemaVersion" IS DISTINCT FROM OLD."schemaVersion"
        OR NEW."correlationId" IS DISTINCT FROM OLD."correlationId"
        OR NEW."causationId" IS DISTINCT FROM OLD."causationId"
        OR NEW."deduplicationKey" IS DISTINCT FROM OLD."deduplicationKey"
        OR NEW."payload" IS DISTINCT FROM OLD."payload"
        OR NEW."occurredAt" IS DISTINCT FROM OLD."occurredAt"
        OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    THEN
        RAISE EXCEPTION
            'domain_outbox_event bersifat partial-mutable (ADR-039): kolom konten bisnis (id/tenantId/outletId/aggregateType/aggregateId/aggregateVersion/eventType/eventVersion/schemaVersion/correlationId/causationId/deduplicationKey/payload/occurredAt/createdAt) TIDAK BOLEH berubah setelah ditulis - retry TIDAK BOLEH mengubah payload (id=%). Hanya kolom state pemrosesan (status/attemptCount/availableAt/processedAt/publishedAt/lastError) yang boleh diubah.',
            OLD."id";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_domain_outbox_event_partial_mutability
    BEFORE UPDATE ON "domain_outbox_event"
    FOR EACH ROW EXECUTE FUNCTION outbox_tolak_ubah_kolom_bisnis();
