-- ALT-DEF-044 - Fold prisma/migrations/manual/001..005 ke riwayat migrasi resmi Prisma.
--
-- Sumber: kelima file di prisma/migrations/manual/ (ADR-021 s.d. ADR-024), diaudit dan
-- dijalankan langsung terhadap altora_resto_dev sebelum migrasi ini ditulis. Satu bug
-- LOGIKA ditemukan dan diperbaiki di sini (lihat bagian D di bawah) - didokumentasikan
-- penuh di DECISION-LOG.md ADR-031.
--
-- PERUBAHAN DIBANDING FILE manual/ ASLI (per instruksi "Jangan menggunakan
-- `IF NOT EXISTS` untuk menyembunyikan drift produksi" dan "migrasi harus gagal bila
-- object dengan nama sama memiliki definisi berbeda"):
--   - `CREATE UNIQUE INDEX IF NOT EXISTS` -> `CREATE UNIQUE INDEX` (empat index di bawah).
--   - `CREATE OR REPLACE FUNCTION` -> `CREATE FUNCTION` (dua fungsi trigger di bawah).
--   - `DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...` -> `CREATE TRIGGER` polos (dua
--     trigger di bawah).
-- Migrasi resmi Prisma HANYA PERNAH dijalankan SEKALI per database (dilacak di tabel
-- `_prisma_migrations`) - defensiveness ala "IF NOT EXISTS"/"OR REPLACE" di sini tidak
-- pernah dibutuhkan untuk idempotency yang sah, dan justru bisa MENDIAMKAN drift nyata
-- (mis. bila object dengan nama sama sudah ada dengan definisi BERBEDA karena seseorang
-- membuatnya manual di luar Prisma). Dengan bentuk polos, migrasi ini GAGAL KERAS pada
-- konflik nama alih-alih diam-diam menimpa/mengabaikannya.

-- =====================================================================================
-- (A) ALT-QRS-001 (ADR-021 Keputusan 3): tepat satu KonfigurasiQris AKTIF per outlet.
-- Sumber: manual/001_konfigurasi_qris_partial_unique.sql. TIDAK ADA bug ditemukan pada
-- audit - nama tabel (konfigurasi_qris) dan kolom ("tenantId","outletId") cocok persis
-- dengan DDL yang dihasilkan `prisma migrate dev` pada migrasi baseline.
-- =====================================================================================

CREATE UNIQUE INDEX konfigurasi_qris_satu_aktif_per_outlet
    ON konfigurasi_qris ("tenantId", "outletId")
    WHERE status = 'AKTIF';

-- =====================================================================================
-- (B) ALT-RSP-001/003/005 (ADR-022 Keputusan 2): Resep menargetkan TEPAT SATU dari
-- itemMenuId / varianMenuId / bahanHasilId (invariant XOR).
-- Sumber: manual/002_resep_target_xor_check.sql. TIDAK ADA bug ditemukan pada audit -
-- nama tabel (resep) dan kolom cocok persis dengan DDL baseline.
-- =====================================================================================

ALTER TABLE resep
    ADD CONSTRAINT resep_sasaran_xor CHECK (
        (
            (CASE WHEN "itemMenuId"   IS NULL THEN 0 ELSE 1 END)
          + (CASE WHEN "varianMenuId" IS NULL THEN 0 ELSE 1 END)
          + (CASE WHEN "bahanHasilId" IS NULL THEN 0 ELSE 1 END)
        ) = 1
    );

-- =====================================================================================
-- (C) ALT-RSP-002 (ADR-022 Keputusan 3): tepat satu VersiResep AKTIF per Resep.
-- Sumber: manual/003_versi_resep_satu_aktif.sql. TIDAK ADA bug ditemukan pada audit -
-- nama tabel (versi_resep) dan kolom ("resepId") cocok persis dengan DDL baseline.
-- =====================================================================================

CREATE UNIQUE INDEX versi_resep_satu_aktif_per_resep
    ON versi_resep ("resepId")
    WHERE status = 'AKTIF';

-- =====================================================================================
-- (D) ALT-PSD-004/007 (ADR-023 Keputusan 3): tepat satu baris agregat level-gudang
-- (lokasiStokId IS NULL) per pasangan (gudangId, bahanId), pada StokBahan DAN pada
-- StokOpnameBaris.
-- Sumber: manual/004_stok_bahan_agregat_gudang_unik.sql. TIDAK ADA bug ditemukan pada
-- audit - nama tabel (stok_bahan, stok_opname_baris) dan kolom cocok persis dengan DDL
-- baseline.
-- =====================================================================================

CREATE UNIQUE INDEX stok_bahan_agregat_gudang_unik
    ON stok_bahan ("gudangId", "bahanId")
    WHERE "lokasiStokId" IS NULL;

CREATE UNIQUE INDEX stok_opname_baris_agregat_gudang_unik
    ON stok_opname_baris ("stokOpnameId", "bahanId")
    WHERE "lokasiStokId" IS NULL;

-- =====================================================================================
-- (E) ALT-PSD-005/006 (ADR-023 Keputusan 1 dan 5): mutasi_stok APPEND-ONLY, dan
-- kesepadanan mutasi PEMBALIK (tanda berlawanan, tenant/gudang/bahan sama, dan larangan
-- rantai pembalik-dari-pembalik).
-- Sumber: manual/005_mutasi_stok_append_only_dan_pembalik.sql.
--
-- BUG DITEMUKAN DAN DIPERBAIKI PADA AUDIT (lihat ADR-031 untuk detail lengkap):
-- Fungsi `mutasi_stok_validasi_pembalik()` di file manual/005 ASLI TIDAK PERNAH
-- benar-benar memeriksa apakah baris yang SEDANG ditandai sebagai "sudah dibalik"
-- (NEW, mis. mutasi B) itu sendiri SUDAH merupakan pembalik dari mutasi lain (mis. B
-- membalik A). Yang diperiksa file asli hanyalah apakah CALON PEMBALIK BARU (p, mis.
-- mutasi C) sudah pernah dibalik sebelumnya (p."dibalikOlehId" IS NOT NULL) - sebuah
-- kondisi yang BERBEDA dan tidak menangkap kasus rantai A<-B<-C sama sekali. Dibuktikan
-- dengan skrip probe manual (INSERT A, INSERT B yang membalik A, lalu UPDATE B untuk
-- ditandai dibalik oleh C): UPDATE tersebut BERHASIL tanpa exception pada kode asli,
-- padahal komentar/dokumentasi file itu sendiri secara eksplisit menyatakan rantai
-- semacam ini "ditolak". Diperbaiki di bawah dengan pemeriksaan baru: sebelum mengizinkan
-- NEW."dibalikOlehId" diisi, cek apakah NEW.id SUDAH menjadi pembalik bagi baris lain
-- (EXISTS baris lain dengan "dibalikOlehId" = NEW.id) - bila ya, tolak.
-- =====================================================================================

-- --- (E.1) APPEND-ONLY ---------------------------------------------------------------
-- UPDATE hanya diizinkan untuk MENGISI "dibalikOlehId" dari NULL menjadi non-NULL.
-- Semua kolom lain harus tetap identik. DELETE ditolak tanpa pengecualian (ADR-006).

CREATE FUNCTION mutasi_stok_tolak_ubah()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'mutasi_stok bersifat append-only: DELETE ditolak (id=%). Koreksi WAJIB berupa baris pembalik baru (ADR-006/ADR-023).',
            OLD.id;
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW."tenantId"       IS DISTINCT FROM OLD."tenantId"
       OR NEW."outletId"       IS DISTINCT FROM OLD."outletId"
       OR NEW."gudangId"       IS DISTINCT FROM OLD."gudangId"
       OR NEW."bahanId"        IS DISTINCT FROM OLD."bahanId"
       OR NEW.jenis            IS DISTINCT FROM OLD.jenis
       OR NEW.jumlah           IS DISTINCT FROM OLD.jumlah
       OR NEW."satuanId"       IS DISTINCT FROM OLD."satuanId"
       OR NEW."referensiJenis" IS DISTINCT FROM OLD."referensiJenis"
       OR NEW."referensiId"    IS DISTINCT FROM OLD."referensiId"
       OR NEW."lokasiSumberId" IS DISTINCT FROM OLD."lokasiSumberId"
       OR NEW."lokasiTujuanId" IS DISTINCT FROM OLD."lokasiTujuanId"
       OR NEW."batchStokId"    IS DISTINCT FROM OLD."batchStokId"
       OR NEW."hargaPerolehan" IS DISTINCT FROM OLD."hargaPerolehan"
       OR NEW."dibuatOlehId"   IS DISTINCT FROM OLD."dibuatOlehId"
       OR NEW."createdAt"      IS DISTINCT FROM OLD."createdAt"
    THEN
        RAISE EXCEPTION
            'mutasi_stok bersifat append-only: UPDATE atas kolom selain "dibalikOlehId" ditolak (id=%).',
            OLD.id;
    END IF;

    IF OLD."dibalikOlehId" IS NOT NULL AND NEW."dibalikOlehId" IS DISTINCT FROM OLD."dibalikOlehId" THEN
        RAISE EXCEPTION
            'mutasi_stok id=% sudah pernah dibalik oleh %; satu mutasi tidak boleh dibalik dua kali.',
            OLD.id, OLD."dibalikOlehId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mutasi_stok_append_only
    BEFORE UPDATE OR DELETE ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION mutasi_stok_tolak_ubah();

-- --- (E.2) KESEPADANAN MUTASI PEMBALIK ------------------------------------------------
-- Dijalankan saat "dibalikOlehId" diisi. Menjamin baris pembalik benar-benar MEMBALIK:
-- tenant/gudang/bahan sama dan jumlah berlawanan tanda tepat, DAN menolak rantai
-- pembalik-dari-pembalik pada KEDUA arah (baris yang sedang ditandai dibalik tidak boleh
-- sudah menjadi pembalik bagi baris lain - BUG FIX, lihat catatan bagian (E) di atas).

CREATE FUNCTION mutasi_stok_validasi_pembalik()
RETURNS TRIGGER AS $$
DECLARE
    p RECORD;
BEGIN
    IF NEW."dibalikOlehId" IS NULL THEN
        RETURN NEW;
    END IF;

    -- BUG FIX (lihat ADR-031): baris yang SEDANG ditandai sebagai "sudah dibalik"
    -- (NEW) tidak boleh SENDIRI sudah menjadi pembalik bagi mutasi lain - itulah
    -- rantai pembalik-dari-pembalik (A <- B <- C) yang komentar asli SEHARUSNYA
    -- mencegah tapi TIDAK PERNAH benar-benar memeriksanya.
    IF EXISTS (SELECT 1 FROM mutasi_stok WHERE "dibalikOlehId" = NEW.id) THEN
        RAISE EXCEPTION
            'Mutasi % adalah pembalik dari mutasi lain; rantai pembalik-dari-pembalik ditolak (mutasi ini tidak boleh dibalik lagi, buat mutasi baru dengan alasannya sendiri).',
            NEW.id;
    END IF;

    SELECT * INTO p FROM mutasi_stok WHERE id = NEW."dibalikOlehId";
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mutasi pembalik % tidak ditemukan.', NEW."dibalikOlehId";
    END IF;

    IF p."tenantId" <> NEW."tenantId"
       OR p."gudangId" <> NEW."gudangId"
       OR p."bahanId" <> NEW."bahanId" THEN
        RAISE EXCEPTION
            'Mutasi pembalik % tidak sepadan dengan mutasi asal % (tenant/gudang/bahan berbeda).',
            NEW."dibalikOlehId", NEW.id;
    END IF;

    IF p.jumlah <> -NEW.jumlah THEN
        RAISE EXCEPTION
            'Mutasi pembalik % harus berjumlah % (berlawanan tanda dengan mutasi asal %), bukan %.',
            NEW."dibalikOlehId", -NEW.jumlah, NEW.id, p.jumlah;
    END IF;

    IF p."dibalikOlehId" IS NOT NULL THEN
        RAISE EXCEPTION
            'Mutasi pembalik % sudah pernah dibalik oleh mutasi lain; tidak boleh dipakai lagi sebagai pembalik.',
            NEW."dibalikOlehId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mutasi_stok_validasi_pembalik
    BEFORE INSERT OR UPDATE ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION mutasi_stok_validasi_pembalik();
