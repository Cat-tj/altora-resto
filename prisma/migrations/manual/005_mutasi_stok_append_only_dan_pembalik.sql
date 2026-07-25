-- ALT-DEF-008 / ALT-PSD-005 / ALT-PSD-006 / ADR-023 Keputusan 1 dan 5
--
-- DUA penegak yang tidak dapat diekspresikan DSL Prisma sama sekali:
--   (A) `mutasi_stok` bersifat APPEND-ONLY (hanya INSERT; UPDATE/DELETE
--       ditolak), kecuali satu kolom penunjuk pembalik.
--   (B) Sebuah mutasi PEMBALIK wajib berlawanan tanda dan sepadan dengan
--       mutasi asalnya (tenant/gudang/bahan sama, jumlah = -jumlah asal).
--
-- MENGAPA TIDAK BISA DI schema.prisma:
-- (A) tidak punya bentuk deklaratif apa pun di Prisma maupun di DDL Postgres -
--     "tabel hanya menerima INSERT" adalah kebijakan hak akses + trigger,
--     bukan constraint.
-- (B) adalah invariant LINTAS-BARIS (membandingkan baris pembalik dengan baris
--     yang dirujuknya). CHECK constraint Postgres TIDAK BOLEH membaca baris
--     lain - karena itu satu-satunya penegak level-data adalah trigger.
--     `@unique` pada `dibalikOlehId` di schema.prisma HANYA menjamin
--     kardinalitas (satu mutasi dibalik paling banyak sekali, dan satu
--     pembalik membalik paling banyak satu asal); ia TIDAK mengatakan apa pun
--     tentang TANDA maupun BESARAN. Menganggapnya menjamin "reversal benar"
--     adalah kesalahan baca yang file ini ada untuk mencegahnya.
--
-- STATUS EKSEKUSI: BELUM PERNAH DIJALANKAN terhadap Postgres mana pun
-- (ALT-DEF-029). Sampai trigger di bawah benar-benar terpasang:
--   - append-only adalah DISIPLIN LEVEL-APLIKASI semata (service layer tidak
--     pernah memanggil update/delete pada tabel ini). Sebuah bug - atau akses
--     langsung lewat psql - dapat menulis ulang sejarah stok tanpa jejak.
--   - kesepadanan pembalik HANYA dijaga guard level-aplikasi.
--
-- CATATAN NAMA KOLOM: nama kolom nyata di Postgres camelCase dan HARUS
-- dikutip ganda.

-- ---------------------------------------------------------------------------
-- (A) APPEND-ONLY
-- ---------------------------------------------------------------------------
-- UPDATE hanya diizinkan untuk MENGISI `dibalikOlehId` dari NULL menjadi
-- non-NULL (menandai bahwa mutasi ini sudah dibalik). Semua kolom lain harus
-- tetap identik. DELETE ditolak tanpa pengecualian (ADR-006, no hard-delete).

CREATE OR REPLACE FUNCTION mutasi_stok_tolak_ubah()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'mutasi_stok bersifat append-only: DELETE ditolak (id=%). Koreksi WAJIB berupa baris pembalik baru (ADR-006/ADR-023).',
            OLD.id;
    END IF;

    -- Satu-satunya perubahan yang sah: menandai mutasi ini sudah dibalik.
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

DROP TRIGGER IF EXISTS trg_mutasi_stok_append_only ON mutasi_stok;
CREATE TRIGGER trg_mutasi_stok_append_only
    BEFORE UPDATE OR DELETE ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION mutasi_stok_tolak_ubah();

-- ---------------------------------------------------------------------------
-- (B) KESEPADANAN MUTASI PEMBALIK
-- ---------------------------------------------------------------------------
-- Dijalankan saat `dibalikOlehId` diisi. Menjamin baris pembalik benar-benar
-- MEMBALIK: tenant/gudang/bahan sama dan jumlah berlawanan tanda tepat.
-- Rantai pembalik-dari-pembalik juga ditolak - membalik sebuah pembalikan
-- adalah operasi yang harus ditulis sebagai mutasi baru dengan alasannya
-- sendiri, bukan sebagai rantai yang saldo bersihnya sulit ditelusuri.

CREATE OR REPLACE FUNCTION mutasi_stok_validasi_pembalik()
RETURNS TRIGGER AS $$
DECLARE
    p RECORD;
BEGIN
    IF NEW."dibalikOlehId" IS NULL THEN
        RETURN NEW;
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
            'Mutasi % adalah pembalik dari mutasi lain; rantai pembalik-dari-pembalik ditolak.',
            NEW."dibalikOlehId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mutasi_stok_validasi_pembalik ON mutasi_stok;
CREATE TRIGGER trg_mutasi_stok_validasi_pembalik
    BEFORE INSERT OR UPDATE ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION mutasi_stok_validasi_pembalik();
