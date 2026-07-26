-- ADR-035: optimistic locking (kolom `version`/`updatedAt`) untuk aggregate
-- root, plus trigger generik yang menjamin `version` bertambah TEPAT 1 pada
-- SETIAP UPDATE - tidak pernah dilewati, tidak pernah dilompat sembarangan
-- oleh kode aplikasi.
--
-- SCOPE (13 tabel): 10 model minimum instruksi batch ini (Pesanan,
-- Pembayaran, GiliranKasir, TransferStok, StokOpname, PurchaseOrder, Promo,
-- Keanggotaan, JadwalKerja, Reservasi) + 3 aggregate root TAMBAHAN dengan
-- skenario concurrent-write konkret yang TIDAK dicakup daftar minimum (lihat
-- ADR-035 untuk rasional lengkap per model):
--   - Absensi (check-in/check-out device vs koreksi manual supervisor)
--   - StokBahan (baca-lalu-tulis konkuren pada baris cache saldo, INV-016)
--   - PermintaanPersetujuan (dua supervisor approve/reject bersamaan)
--
-- SENGAJA TIDAK ditambah (lihat ADR-035 untuk rasional lengkap):
--   - KonfigurasiQris: race "aktifkan konfigurasi baru" SUDAH dijamin
--     struktural oleh partial unique index `konfigurasi_qris_satu_aktif_per_outlet`
--     (INV-001) - version akan jadi proteksi berlapis tanpa skenario konkret
--     baru yang belum tercakup.
--   - mutasi_stok/poin_riwayat/ledger_stempel/ledger_saldo_toko: APPEND-ONLY
--     (INV-006/007/012/013/014, ADR-032) - baris tidak PERNAH di-UPDATE sama
--     sekali (trigger `ledger_tolak_ubah` menolak SEMUA UPDATE), jadi konsep
--     "version yang bertambah saat UPDATE" tidak berlaku untuk tabel ini.
--
-- =====================================================================================
-- (A) SCHEMA: tambah `version`/`updatedAt` (dihasilkan dari `prisma migrate
-- diff --from-schema-datasource --to-schema-datamodel --script` terhadap
-- altora_resto_dev; seluruh 13 tabel dikonfirmasi 0 baris sebelum migrasi ini
-- ditulis - lihat RELEASE-EVIDENCE.md - sehingga ADD COLUMN NOT NULL tanpa
-- DEFAULT untuk `updatedAt` aman tanpa backfill).
-- =====================================================================================

-- AlterTable
ALTER TABLE "absensi" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "giliran_kasir" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "jadwal_kerja" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "keanggotaan" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "pembayaran" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "permintaan_persetujuan" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "pesanan" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "promo" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "purchase_order" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "reservasi" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "stok_bahan" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "stok_opname" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "transfer_stok" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- =====================================================================================
-- (B) FUNGSI GENERIK: auto-increment version, TANPA PENGECUALIAN.
--
-- DESAIN (mengikuti filosofi "satu fungsi generik dipakai ulang lintas
-- tabel" dari ADR-032/ledger_tolak_ubah): fungsi ini TIDAK PEDULI apa pun
-- yang dikirim aplikasi sebagai NEW.version - ia SELALU meng-override
-- menjadi OLD.version + 1. Ini BUKAN validasi yang bisa gagal (tidak ada
-- RAISE EXCEPTION di sini) - ini PENGAMBILALIHAN PENUH atas kolom version
-- oleh database. Konsekuensi konkret:
--   - Aplikasi yang lupa menaikkan version sendiri: TIDAK masalah, trigger
--     tetap menaikkan dengan benar.
--   - Aplikasi (atau operator lewat psql) yang mencoba `UPDATE ... SET
--     version = 999`: nilai 999 DIABAIKAN SEPENUHNYA, hasil akhir tetap
--     OLD.version + 1 (bukan gagal dengan error, bukan menerima 999).
--     Dipilih "override diam-diam" dibanding "REJECT keras" karena appliksi
--     TIDAK PERNAH punya alasan sah untuk men-set version secara manual -
--     override membuat perilaku itu aman-secara-default (fail-safe) tanpa
--     butuh aplikasi menghindari SET version sama sekali; REJECT keras akan
--     memaksa SETIAP caller (termasuk yang tidak menyentuh version sama
--     sekali tapi kebetulan melakukan `UPDATE table SET ... , version =
--     version` lewat ORM yang menulis ulang seluruh kolom) untuk berhati-hati
--     menghindari klausa itu - override lebih aman untuk permukaan
--     kesalahan yang lebih luas.
--   - Deteksi konflik konkurensi TETAP terjadi di klausa `WHERE version =
--     expectedVersion` pada UPDATE aplikasi itu sendiri (lihat Step 3 di
--     API-CONTRACT.md) - trigger ini SAMA SEKALI TIDAK menggantikan
--     tanggung jawab itu, ia hanya menjamin bahwa version yang dibaca
--     berikutnya benar-benar mencerminkan "berapa kali baris ini sudah
--     di-UPDATE", bukan angka yang bisa dipalsukan aplikasi.
-- =====================================================================================

CREATE FUNCTION optimistic_lock_bump_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW."version" := OLD."version" + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pesanan_bump_version
    BEFORE UPDATE ON pesanan
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_pembayaran_bump_version
    BEFORE UPDATE ON pembayaran
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_giliran_kasir_bump_version
    BEFORE UPDATE ON giliran_kasir
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_transfer_stok_bump_version
    BEFORE UPDATE ON transfer_stok
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_stok_opname_bump_version
    BEFORE UPDATE ON stok_opname
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_purchase_order_bump_version
    BEFORE UPDATE ON purchase_order
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_promo_bump_version
    BEFORE UPDATE ON promo
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_keanggotaan_bump_version
    BEFORE UPDATE ON keanggotaan
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_jadwal_kerja_bump_version
    BEFORE UPDATE ON jadwal_kerja
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_reservasi_bump_version
    BEFORE UPDATE ON reservasi
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_absensi_bump_version
    BEFORE UPDATE ON absensi
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_stok_bahan_bump_version
    BEFORE UPDATE ON stok_bahan
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();

CREATE TRIGGER trg_permintaan_persetujuan_bump_version
    BEFORE UPDATE ON permintaan_persetujuan
    FOR EACH ROW EXECUTE FUNCTION optimistic_lock_bump_version();
