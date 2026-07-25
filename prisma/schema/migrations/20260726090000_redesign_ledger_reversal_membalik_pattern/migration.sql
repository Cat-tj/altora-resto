-- ADR-032: redesain pola reversal seluruh ledger append-only dari
-- `dibalikOlehId` (baris ASAL menunjuk MAJU ke pembaliknya, ADR-023/ADR-027)
-- menjadi `membalikMutasiId` (baris PEMBALIK menunjuk MUNDUR ke baris ASAL).
--
-- KENAPA: dengan `dibalikOlehId`, menandai sebuah baris "sudah dibalik"
-- berarti meng-UPDATE baris ASAL (mengisi dibalikOlehId dari NULL) - trigger
-- append-only lama (`mutasi_stok_tolak_ubah`) harus punya SATU pengecualian
-- eksplisit untuk mengizinkan UPDATE itu. Dengan `membalikMutasiId`, baris
-- ASAL TIDAK PERNAH disentuh - baris PEMBALIK dibuat lewat INSERT baru yang
-- SUDAH membawa pointer ke baris asalnya sejak awal. "Sudah dibalik atau
-- belum" menjadi QUERY TURUNAN (`SELECT 1 FROM <table> WHERE
-- "membalikMutasiId" = <id>`), bukan kolom yang di-UPDATE. Konsekuensi:
-- trigger append-only menjadi REJECT-ALL-UPDATES TANPA PENGECUALIAN - lebih
-- sederhana DAN lebih kuat sekaligus (nol permukaan untuk bug "pengecualian
-- yang dieksploitasi", persis kelas bug yang diperbaiki ADR-031 Keputusan 3
-- untuk rantai pembalik-dari-pembalik).
--
-- SCOPE: MutasiStok (redesain dari ADR-023 Keputusan 5), PoinRiwayat/
-- LedgerStempel/LedgerSaldoToko (redesain dari ADR-027, SEKALIGUS menutup
-- ALT-DEF-043 - trigger append-only/pembalik ketiga ledger keanggotaan ini
-- SEBELUMNYA TIDAK ADA SAMA SEKALI, hanya kolomnya). PembayaranRefund/
-- KoreksiPembayaran SENGAJA TIDAK disentuh - lihat ADR-032 Keputusan 3 untuk
-- rasional lengkap kenapa keduanya BUKAN kandidat pola ini.
--
-- Ditambah juga: kolom `alasan` WAJIB (NOT NULL) di keempat tabel - lihat
-- ADR-032 Keputusan 4.
--
-- =====================================================================================
-- (A) SCHEMA: rename dibalikOlehId -> membalikMutasiId, tambah kolom alasan wajib.
-- Dihasilkan dari `prisma migrate diff --from-schema-datasource --to-schema-datamodel`
-- terhadap altora_resto_dev (Prisma tidak mengenali ini sebagai RENAME kolom murni
-- karena arah relasi berbalik - Prisma melihatnya sebagai DROP+ADD, yang aman di sini
-- karena keempat tabel 100% kosong di altora_resto_dev pada titik migrasi ini
-- dijalankan, diverifikasi eksplisit sebelum migrasi ditulis: SELECT count(*) = 0 pada
-- keempatnya).
-- =====================================================================================

-- --- (A.1) Hapus FK/index/kolom lama --------------------------------------------------

ALTER TABLE "ledger_saldo_toko" DROP CONSTRAINT "ledger_saldo_toko_dibalikOlehId_fkey";
ALTER TABLE "ledger_stempel" DROP CONSTRAINT "ledger_stempel_dibalikOlehId_fkey";
ALTER TABLE "mutasi_stok" DROP CONSTRAINT "mutasi_stok_dibalikOlehId_fkey";
ALTER TABLE "poin_riwayat" DROP CONSTRAINT "poin_riwayat_dibalikOlehId_fkey";

DROP INDEX "ledger_saldo_toko_dibalikOlehId_key";
DROP INDEX "ledger_stempel_dibalikOlehId_key";
DROP INDEX "mutasi_stok_dibalikOlehId_key";
DROP INDEX "poin_riwayat_dibalikOlehId_key";

-- --- (A.2) Tambah kolom baru (membalikMutasiId + alasan WAJIB) ------------------------
-- `alasan` ditambah sebagai NOT NULL langsung (bukan ADD nullable lalu SET NOT NULL)
-- karena keempat tabel dikonfirmasi kosong - tidak ada baris existing yang butuh
-- backfill.

ALTER TABLE "ledger_saldo_toko" DROP COLUMN "dibalikOlehId",
ADD COLUMN     "alasan" TEXT NOT NULL,
ADD COLUMN     "membalikMutasiId" TEXT;

ALTER TABLE "ledger_stempel" DROP COLUMN "dibalikOlehId",
ADD COLUMN     "alasan" TEXT NOT NULL,
ADD COLUMN     "membalikMutasiId" TEXT;

ALTER TABLE "mutasi_stok" DROP COLUMN "dibalikOlehId",
ADD COLUMN     "alasan" TEXT NOT NULL,
ADD COLUMN     "membalikMutasiId" TEXT;

ALTER TABLE "poin_riwayat" DROP COLUMN "dibalikOlehId",
ADD COLUMN     "alasan" TEXT NOT NULL,
ADD COLUMN     "membalikMutasiId" TEXT;

-- --- (A.3) Unique index baru -----------------------------------------------------------
-- Ini adalah CRUX redesain (ADR-032 Keputusan 1): @unique di sini, pada kolom di sisi
-- PEMBALIK, menegakkan "paling banyak SATU baris pembalik per baris asal" (dua baris
-- pembalik BERBEDA tidak boleh membawa nilai membalikMutasiId yang SAMA). Ini BUKAN
-- constraint "trivially true" seperti unique pada FK sembarang - constraint ini secara
-- aktif menolak INSERT baris pembalik KEDUA yang menunjuk baris asal yang SAMA, yang
-- dibuktikan test database-integration `ledger-reversal-membalik-invariants.test.ts`.

CREATE UNIQUE INDEX "ledger_saldo_toko_membalikMutasiId_key" ON "ledger_saldo_toko"("membalikMutasiId");
CREATE UNIQUE INDEX "ledger_stempel_membalikMutasiId_key" ON "ledger_stempel"("membalikMutasiId");
CREATE UNIQUE INDEX "mutasi_stok_membalikMutasiId_key" ON "mutasi_stok"("membalikMutasiId");
CREATE UNIQUE INDEX "poin_riwayat_membalikMutasiId_key" ON "poin_riwayat"("membalikMutasiId");

-- --- (A.4) FK sungguhan (bukan sekadar kolom string) -----------------------------------

ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_membalikMutasiId_fkey" FOREIGN KEY ("membalikMutasiId") REFERENCES "mutasi_stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_membalikMutasiId_fkey" FOREIGN KEY ("membalikMutasiId") REFERENCES "poin_riwayat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_membalikMutasiId_fkey" FOREIGN KEY ("membalikMutasiId") REFERENCES "ledger_stempel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_membalikMutasiId_fkey" FOREIGN KEY ("membalikMutasiId") REFERENCES "ledger_saldo_toko"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================================
-- (B) Hapus trigger/fungsi LAMA khusus mutasi_stok (ADR-023 Keputusan 5, ditulis di
-- migrasi harden_manual_invariants) - digantikan fungsi GENERIK di bagian (C)/(D).
-- Ketiga ledger keanggotaan TIDAK PERNAH punya trigger sama sekali (itulah
-- ALT-DEF-043) jadi tidak ada yang perlu di-DROP untuk mereka.
-- =====================================================================================

DROP TRIGGER "trg_mutasi_stok_validasi_pembalik" ON "mutasi_stok";
DROP TRIGGER "trg_mutasi_stok_append_only" ON "mutasi_stok";
DROP FUNCTION "mutasi_stok_validasi_pembalik"();
DROP FUNCTION "mutasi_stok_tolak_ubah"();

-- =====================================================================================
-- (C) FUNGSI GENERIK #1: append-only, REJECT-ALL tanpa pengecualian.
--
-- DESAIN "GENERIK" (per instruksi "buat trigger append-only generik atau fungsi
-- reusable untuk seluruh ledger"): dengan desain baru, UPDATE tidak pernah lagi sah
-- untuk ALASAN APA PUN (beda dari versi lama yang punya SATU pengecualian untuk mengisi
-- dibalikOlehId) - artinya genericity di sini TRIVIAL SEKALIGUS SEMPURNA: fungsi ini
-- tidak perlu tahu APA PUN tentang kolom tabel manapun, karena ia menolak SEMUA UPDATE
-- dan SEMUA DELETE tanpa syarat, apapun tabelnya. SATU fungsi, dipasang sebagai trigger
-- di KEEMPAT tabel ledger tanpa modifikasi maupun parameter - nol duplikasi logika.
-- `TG_TABLE_NAME`/`OLD.id` dipakai untuk pesan error yang tetap spesifik per tabel.
-- =====================================================================================

CREATE FUNCTION ledger_tolak_ubah()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            '% bersifat append-only: DELETE ditolak (id=%). Koreksi WAJIB berupa baris baru yang membalik (membalikMutasiId), tidak pernah UPDATE/DELETE (ADR-006/ADR-032).',
            TG_TABLE_NAME, OLD.id;
    END IF;

    RAISE EXCEPTION
        '% bersifat append-only: UPDATE ditolak TANPA PENGECUALIAN (id=%). Berbeda dari desain lama (ADR-023/ADR-027) yang mengizinkan satu UPDATE untuk menandai "sudah dibalik" - desain baru (ADR-032) TIDAK PUNYA pengecualian sama sekali; baris pembalik dibuat lewat INSERT baru yang membawa membalikMutasiId sejak awal.',
        TG_TABLE_NAME, OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mutasi_stok_append_only
    BEFORE UPDATE OR DELETE ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION ledger_tolak_ubah();

CREATE TRIGGER trg_poin_riwayat_append_only
    BEFORE UPDATE OR DELETE ON poin_riwayat
    FOR EACH ROW EXECUTE FUNCTION ledger_tolak_ubah();

CREATE TRIGGER trg_ledger_stempel_append_only
    BEFORE UPDATE OR DELETE ON ledger_stempel
    FOR EACH ROW EXECUTE FUNCTION ledger_tolak_ubah();

CREATE TRIGGER trg_ledger_saldo_toko_append_only
    BEFORE UPDATE OR DELETE ON ledger_saldo_toko
    FOR EACH ROW EXECUTE FUNCTION ledger_tolak_ubah();

-- =====================================================================================
-- (D) FUNGSI GENERIK #2: validasi baris PEMBALIK saat INSERT.
--
-- DESAIN: karena trigger (C) di atas menolak SEMUA UPDATE tanpa syarat, baris pembalik
-- SELALU dibuat lewat INSERT (tidak pernah lewat UPDATE seperti desain lama) - fungsi
-- ini karena itu HANYA dipasang BEFORE INSERT (bukan lagi BEFORE INSERT OR UPDATE
-- seperti versi lama `mutasi_stok_validasi_pembalik`).
--
-- GENERIK lewat kombinasi:
--   1. `TG_TABLE_NAME` + `to_jsonb(NEW)`/dynamic SQL (`EXECUTE format(...)`) untuk
--      membaca baris ASAL tanpa hardcode nama tabel per fungsi - satu fungsi melayani
--      keempat tabel.
--   2. Pemeriksaan yang SELALU sama di semua ledger (tenant sama, baris asal bukan
--      pembalik itu sendiri/larangan rantai, tanda jumlah berlawanan, `alasan` wajib)
--      di-hardcode SEKALI di badan fungsi karena nama kolomnya ("tenantId", "jumlah",
--      "alasan", "membalikMutasiId") SAMA PERSIS di keempat tabel (bukan kebetulan -
--      keempatnya sengaja mengikuti pola kolom yang identik sejak ADR-023/ADR-027).
--   3. Pemeriksaan yang BEDA per domain (mis. MutasiStok butuh gudang/bahan/satuan/
--      batch/harga/lokasi sama; ledger keanggotaan hanya butuh keanggotaanId/pelangganId
--      sama) diteruskan sebagai DAFTAR NAMA KOLOM lewat `TG_ARGV` saat trigger dipasang
--      per tabel (lihat CREATE TRIGGER di bawah) - fungsi men-generic-kan "bandingkan
--      kolom X antara baris asal dan baris pembalik" lewat loop `TG_ARGV`, TANPA
--      hardcode nama kolom domain-spesifik di badan fungsi.
--
-- KENAPA TIDAK 100% dynamic (opsi lain yang dipertimbangkan dan DITOLAK): membandingkan
-- SELURUH kolom secara otomatis (mis. lewat hstore diff) akan salah secara semantik -
-- `id`/`createdAt`/`dicatatOlehId`/`catatan` MEMANG BOLEH beda antara baris asal dan
-- pembalik (itulah maksudnya dua baris berbeda), jadi "kolom mana yang WAJIB sama" tetap
-- domain knowledge yang harus dinyatakan eksplisit per tabel - TG_ARGV adalah cara paling
-- jelas menyatakannya tanpa duplikasi LOGIKA (badan fungsi/loop-nya tetap satu).
--
-- LOKASI (item #10 checklist ADR-032/instruksi): untuk MutasiStok, `lokasiSumberId`/
-- `lokasiTujuanId` masuk daftar TG_ARGV sebagai kolom yang harus IDENTIK (bukan
-- tertukar) antara baris asal dan baris pembalik. Rasional: baris pembalik adalah
-- KOREKSI atas baris asal yang SALAH/perlu dibatalkan - baris pembalik menyatakan "baris
-- asal ini, dengan lokasi PERSIS SAMA, sebenarnya TIDAK terjadi (atau perlu dikurangi)
-- sebesar `jumlah` yang berlawanan tanda". Ini BEDA dari "transfer balik" (mis. barang
-- yang sudah dipindah ke outlet B dikirim balik ke outlet A) - transfer balik yang sah
-- adalah PERISTIWA BARU dengan `jenis=TRANSFER_KELUAR/TRANSFER_MASUK` dan referensi
-- dokumen TransferStok baru, BUKAN baris "membalikMutasiId" dari transfer sebelumnya.
-- Menukar source<->dest pada baris pembalik akan salah menggambarkan baris ini sebagai
-- "transfer fisik baru ke arah berlawanan" padahal sebenarnya ia hanya MEMBATALKAN
-- CATATAN transfer yang salah - dua peristiwa yang berbeda secara bisnis (yang kedua tidak
-- selalu melibatkan barang berpindah secara fisik lagi, mis. koreksi salah-catat vs
-- transfer fisik sungguhan yang perlu dibalik). Karena itu equality (identik), BUKAN swap,
-- adalah yang benar di sini - dan itu sudah tercakup otomatis oleh loop equality generik
-- di atas tanpa special-case tambahan.
-- =====================================================================================

CREATE FUNCTION ledger_validasi_pembalik()
RETURNS TRIGGER AS $$
DECLARE
    asal   JSONB;
    baru   JSONB;
    kolom  TEXT;
    i      INT;
BEGIN
    -- Baris ini bukan pembalik (mis. baris ledger biasa/perolehan) - tidak ada yang
    -- perlu divalidasi terkait reversal.
    IF NEW."membalikMutasiId" IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW."membalikMutasiId" = NEW.id THEN
        RAISE EXCEPTION
            'Baris % di % tidak boleh membalik DIRINYA SENDIRI (membalikMutasiId = id).',
            NEW.id, TG_TABLE_NAME;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE id = $1', TG_TABLE_NAME)
        INTO asal
        USING NEW."membalikMutasiId";

    IF asal IS NULL THEN
        RAISE EXCEPTION
            'Baris asal % (membalikMutasiId) tidak ditemukan di %.',
            NEW."membalikMutasiId", TG_TABLE_NAME;
    END IF;

    -- Larangan rantai pembalik-dari-pembalik (bug-fix ADR-031, item #3 checklist
    -- ADR-032): baris ASAL yang ditunjuk TIDAK BOLEH sendiri sudah menjadi baris
    -- pembalik (yaitu "membalikMutasiId" milik baris asal itu sendiri harus NULL).
    -- Catatan: "baris asal sudah pernah dibalik oleh baris LAIN" (larangan membalik dua
    -- kali) TIDAK perlu dicek manual di sini - itu sudah ditegakkan langsung oleh unique
    -- index `..._membalikMutasiId_key` (bagian A.3) pada level constraint, sebelum
    -- fungsi ini sempat dieksekusi.
    IF asal->>'membalikMutasiId' IS NOT NULL THEN
        RAISE EXCEPTION
            'Baris asal % di % adalah baris PEMBALIK itu sendiri (rantai pembalik-dari-pembalik ditolak, ADR-031/ADR-032): baris yang sudah membalik baris lain tidak boleh dibalik lagi - buat baris baru dengan alasannya sendiri.',
            NEW."membalikMutasiId", TG_TABLE_NAME;
    END IF;

    baru := to_jsonb(NEW);

    IF (asal->>'tenantId') IS DISTINCT FROM (baru->>'tenantId') THEN
        RAISE EXCEPTION
            'Baris pembalik % di % harus tenant SAMA dengan baris asal % (asal tenantId=%, pembalik tenantId=%).',
            NEW.id, TG_TABLE_NAME, NEW."membalikMutasiId", asal->>'tenantId', baru->>'tenantId';
    END IF;

    IF (asal->>'jumlah')::numeric IS DISTINCT FROM (-(baru->>'jumlah')::numeric) THEN
        RAISE EXCEPTION
            'Baris pembalik % di % harus berjumlah % (berlawanan tanda dengan baris asal %), dapat %.',
            NEW.id, TG_TABLE_NAME, (-(asal->>'jumlah')::numeric), NEW."membalikMutasiId", baru->>'jumlah';
    END IF;

    IF (baru->>'alasan') IS NULL OR btrim(baru->>'alasan') = '' THEN
        RAISE EXCEPTION
            'Baris pembalik % di % wajib mengisi "alasan" (referensi & alasan wajib untuk baris pembalik, ADR-032).',
            NEW.id, TG_TABLE_NAME;
    END IF;

    -- Kolom domain-spesifik (diteruskan via TG_ARGV saat CREATE TRIGGER per tabel) -
    -- WAJIB identik (IS NOT DISTINCT FROM menangani NULL=NULL dengan benar, mis.
    -- satuanId/batchStokId/lokasi yang memang boleh NULL pada jenis mutasi tertentu).
    IF TG_NARGS > 0 THEN
        FOR i IN 0 .. TG_NARGS - 1 LOOP
            kolom := TG_ARGV[i];
            IF (asal->>kolom) IS DISTINCT FROM (baru->>kolom) THEN
                RAISE EXCEPTION
                    'Baris pembalik % di % harus punya "%" SAMA dengan baris asal % (asal %=%, pembalik %=%).',
                    NEW.id, TG_TABLE_NAME, kolom, NEW."membalikMutasiId", kolom, asal->>kolom, kolom, baru->>kolom;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- MutasiStok: kolom domain-spesifik yang wajib identik antara asal dan pembalik -
-- gudang, bahan, satuan, batch, harga perolehan, DAN lokasi sumber/tujuan (lihat
-- catatan lokasi di atas - identik, bukan tertukar).
CREATE TRIGGER trg_mutasi_stok_validasi_pembalik
    BEFORE INSERT ON mutasi_stok
    FOR EACH ROW EXECUTE FUNCTION ledger_validasi_pembalik(
        'gudangId', 'bahanId', 'satuanId', 'batchStokId', 'hargaPerolehan',
        'lokasiSumberId', 'lokasiTujuanId'
    );

-- PoinRiwayat: keanggotaanId wajib sama (poin milik keanggotaan yang sama).
CREATE TRIGGER trg_poin_riwayat_validasi_pembalik
    BEFORE INSERT ON poin_riwayat
    FOR EACH ROW EXECUTE FUNCTION ledger_validasi_pembalik('keanggotaanId');

-- LedgerStempel: keanggotaanId wajib sama.
CREATE TRIGGER trg_ledger_stempel_validasi_pembalik
    BEFORE INSERT ON ledger_stempel
    FOR EACH ROW EXECUTE FUNCTION ledger_validasi_pembalik('keanggotaanId');

-- LedgerSaldoToko: pelangganId wajib sama (digantung ke Pelanggan, bukan
-- Keanggotaan - ADR-027 Keputusan 3).
CREATE TRIGGER trg_ledger_saldo_toko_validasi_pembalik
    BEFORE INSERT ON ledger_saldo_toko
    FOR EACH ROW EXECUTE FUNCTION ledger_validasi_pembalik('pelangganId');
