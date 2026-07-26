-- ADR-042 (menutup ALT-DEF-051/052/053): tiga trigger BEFORE INSERT baru
-- yang menegakkan tiga invariant SUM/agregat lintas-baris yang sebelumnya
-- TIDAK ditegakkan sama sekali (INV-062/063/064, dibuktikan race NYATA lewat
-- dua koneksi `pg` fisik di `konkurensi-dua-koneksi-lanjutan.test.ts` batch
-- ADR-041). TIDAK ADA perubahan kolom/tabel apa pun (diff
-- `prisma migrate diff --from-schema-datasource --to-schema-datamodel`
-- kosong, schema.prisma tidak berubah struktural) - migrasi ini SELURUHNYA
-- SQL trigger manual, mengikuti pola trigger-only murni yang sama seperti
-- bagian akhir migrasi `20260726140000_siklus_hidup_stok_reservasi_konsumsi_waste`
-- (`trg_stok_bahan_cek_negatif`) dan `20260726150000_promo_pemakaian_satu_baris_per_pasangan_penghitung`
-- (`trg_promo_pemakaian_cek_batas_penerapan`).
--
-- POLA RACE-SAFETY YANG SAMA DI KETIGANYA (lihat ADR-042 untuk pembahasan
-- penuh): trigger BEFORE INSERT melakukan `SELECT ... FOR UPDATE` pada baris
-- PARENT yang relevan TERLEBIH DAHULU, baru menghitung agregat SUM dan
-- membandingkannya ke batas. Karena SEMUA transaksi konkuren yang menyentuh
-- parent yang SAMA wajib menunggu giliran mengunci baris itu (row-lock
-- Postgres implisit dari FOR UPDATE), pemeriksaan "hitung dulu, lalu insert"
-- di dalam SATU trigger/SATU transaksi ini otomatis terserialisasi - transaksi
-- kedua baru mulai menghitung SETELAH transaksi pertama commit/rollback,
-- sehingga ia melihat hasil akhir yang benar (bukan snapshot basi seperti
-- pola check-then-act aplikasi yang naif). Ini PERSIS pola yang diminta
-- instruksi batch ini, dan konsisten dengan precedent ADR-037
-- (`cek_stok_bahan_negatif`)/ADR-038 (`promo_pemakaian_cek_batas_penerapan`).

-- ============================================================================
-- Fix 1 (ALT-DEF-051/INV-062): Promo.usageQuota (kuota TOTAL lintas SEMUA
-- pelanggan/pesanan) ditegakkan lintas baris PromoPemakaian.
-- ============================================================================
--
-- KEPUTUSAN "row count vs SUM(jumlahPenerapan)" (lihat ADR-042 Keputusan 1
-- untuk pembahasan penuh): `usageQuota` DIINTERPRETASIKAN sebagai kuota TOTAL
-- PENERAPAN (bukan kuota jumlah PESANAN/baris PromoPemakaian) - "usageQuota
-- 100" berarti promo boleh EFEKTIF TERAPKAN maksimal 100 kali secara total,
-- konsisten dengan makna `jumlahPenerapan` sebagai "berapa kali promo ini
-- secara efektif berlaku" (ADR-038) pada SATU pesanan - kuota lintas-pesanan
-- adalah generalisasi natural dari hal yang sama, cukup dijumlahkan lintas
-- SEMUA baris PromoPemakaian untuk promoId yang sama. Trigger ini karena itu
-- membandingkan SUM("jumlahPenerapan"), BUKAN COUNT(*) baris PromoPemakaian -
-- promo repeatable yang terpicu 3x dalam SATU pesanan (jumlahPenerapan=3)
-- mengonsumsi 3 dari kuota total, bukan 1.
--
-- LOCK TARGET: baris `Promo` itu sendiri (tenantId, id) - SELALU tepat SATU
-- baris per promo (bukan per pasangan), sehingga mengunci baris ini
-- menyerialkan SEMUA transaksi konkuren yang mencoba menambah/mengubah
-- PromoPemakaian untuk PROMO YANG SAMA, dari PESANAN mana pun - persis yang
-- dibutuhkan untuk kuota LINTAS-pesanan (berbeda dari trigger ADR-038 yang
-- hanya perlu membaca kolom Promo, tidak perlu mengunci apa pun, karena
-- batasnya PER-PESANAN yang sudah diserialisasi secara alami oleh unique
-- index `pesananId+promoId`).
CREATE FUNCTION promo_pemakaian_cek_kuota_total() RETURNS trigger AS $$
DECLARE
  v_usage_quota INTEGER;
  v_total_lain BIGINT;
BEGIN
  -- Kunci baris Promo induk. Transaksi konkuren lain yang mencoba INSERT/UPDATE
  -- PromoPemakaian untuk promoId yang SAMA (dari pesanan mana pun) akan
  -- BLOK di sini sampai transaksi ini COMMIT/ROLLBACK - inilah yang mencegah
  -- race "keduanya baca hitungan lama, keduanya lolos".
  SELECT p."usageQuota" INTO v_usage_quota
    FROM "promo" p
    WHERE p."tenantId" = NEW."tenantId" AND p.id = NEW."promoId"
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PromoPemakaian %: promoId % tidak ditemukan di tenant %', NEW.id, NEW."promoId", NEW."tenantId";
  END IF;

  IF v_usage_quota IS NULL THEN
    RETURN NEW; -- NULL = tak terbatas (semantik existing Promo.usageQuota).
  END IF;

  SELECT COALESCE(SUM(pp."jumlahPenerapan"), 0) INTO v_total_lain
    FROM "promo_pemakaian" pp
    WHERE pp."tenantId" = NEW."tenantId" AND pp."promoId" = NEW."promoId" AND pp.id <> NEW.id;

  IF v_total_lain + NEW."jumlahPenerapan" > v_usage_quota THEN
    RAISE EXCEPTION 'PromoPemakaian %: promo % usageQuota=% dilampaui (total penerapan lain=%, penerapan baris ini=%, total akan jadi %) - ALT-DEF-051/INV-062', NEW.id, NEW."promoId", v_usage_quota, v_total_lain, NEW."jumlahPenerapan", v_total_lain + NEW."jumlahPenerapan";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promo_pemakaian_cek_kuota_total
  BEFORE INSERT OR UPDATE ON "promo_pemakaian"
  FOR EACH ROW
  EXECUTE FUNCTION promo_pemakaian_cek_kuota_total();

-- ============================================================================
-- Fix 2 (ALT-DEF-052/INV-063): ReservasiStok divalidasi terhadap saldo
-- TERSEDIA StokBahan (kuantitas - kuantitasDireservasi) SAAT INSERT.
-- ============================================================================
--
-- LOCK TARGET: baris `StokBahan` AGREGAT (lokasiStokId IS NULL) untuk
-- pasangan (gudangId, bahanId) yang relevan - unique key
-- (gudangId, bahanId, lokasiStokId) dari ALT-DEF-008/migrasi
-- 20260726140000 dipakai PERSIS untuk menunjuk baris ini. Mengunci baris ini
-- menyerialkan dua ReservasiStok konkuren untuk ITEM PESANAN BERBEDA yang
-- berebut BAHAN YANG SAMA di GUDANG YANG SAMA - kasus yang TIDAK disentuh
-- unique index `reservasi_stok_itemPesananId_key` (ADR-037, itu hanya
-- mencegah dua reservasi untuk ITEM yang SAMA).
--
-- KETERBATASAN JUJUR (didokumentasikan penuh di ADR-042 Keputusan 2):
-- `ReservasiStok` TIDAK punya kolom `gudangId` sendiri (hanya `outletId` +
-- `bahanId`) - trigger ini me-resolve ke SATU `Gudang` milik outlet tsb
-- (`ORDER BY id LIMIT 1`, asumsi satu-gudang-per-outlet yang berlaku di
-- seluruh fixture/skenario produk hari ini). Bila outlet suatu hari
-- berkembang jadi multi-gudang, `ReservasiStok` butuh kolom `gudangId`
-- sendiri (perubahan skema TERPISAH, di luar scope batch ini) - trigger ini
-- TIDAK memperburuk keadaan (gap "reservasi lintas-gudang" itu sudah ada
-- sejak ADR-037, tidak diciptakan batch ini). SUM baris `ReservasiStok`
-- AKTIF lain SENGAJA di-agregasi per (tenantId, bahanId) TANPA penyaringan
-- ulang per-gudang tambahan (baris lain juga tidak membawa gudangId) - ini
-- SEDIKIT LEBIH KONSERVATIF dari kebenaran sempurna (bisa saja
-- menjumlahkan reservasi dari gudang LAIN untuk bahan yang sama bila outlet
-- itu multi-gudang), tapi arahnya AMAN (lebih mungkin menolak berlebihan
-- daripada meloloskan over-reservasi) - trade-off yang sadar, bukan bug.
--
-- Baris StokBahan yang TIDAK ADA sama sekali (banyak fixture/test tidak
-- pernah menginisialisasi cache StokBahan) TIDAK ditolak - saldo TAK DIKETAHUI
-- bukan saldo negatif; trigger hanya menolak ketika ADA baris StokBahan yang
-- BISA dibandingkan dan perbandingannya gagal.
CREATE FUNCTION reservasi_stok_cek_ketersediaan() RETURNS trigger AS $$
DECLARE
  v_gudang_id TEXT;
  v_kuantitas DECIMAL;
  v_direservasi DECIMAL;
  v_total_aktif_lain DECIMAL;
BEGIN
  IF NEW.status <> 'AKTIF' THEN
    RETURN NEW; -- hanya baris AKTIF yang mengklaim stok tersedia.
  END IF;

  SELECT g.id INTO v_gudang_id
    FROM "gudang" g
    WHERE g."tenantId" = NEW."tenantId" AND g."outletId" = NEW."outletId"
    ORDER BY g.id
    LIMIT 1;

  IF v_gudang_id IS NULL THEN
    RETURN NEW; -- outlet ini tidak punya Gudang terdaftar - tidak ada yang bisa dicek.
  END IF;

  -- Kunci baris agregat StokBahan (lokasiStokId IS NULL) memakai unique key
  -- (gudangId, bahanId, lokasiStokId) - inilah row-lock yang menyerialkan
  -- reservasi konkuren untuk bahan yang sama.
  SELECT sb.kuantitas, sb."kuantitasDireservasi" INTO v_kuantitas, v_direservasi
    FROM "stok_bahan" sb
    WHERE sb."tenantId" = NEW."tenantId" AND sb."gudangId" = v_gudang_id
      AND sb."bahanId" = NEW."bahanId" AND sb."lokasiStokId" IS NULL
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW; -- belum ada cache StokBahan untuk bahan ini - saldo tak diketahui, tidak ditolak.
  END IF;

  SELECT COALESCE(SUM(r.jumlah), 0) INTO v_total_aktif_lain
    FROM "reservasi_stok" r
    WHERE r."tenantId" = NEW."tenantId" AND r."bahanId" = NEW."bahanId"
      AND r.status = 'AKTIF' AND r.id <> NEW.id;

  IF v_total_aktif_lain + NEW.jumlah > v_kuantitas - v_direservasi THEN
    RAISE EXCEPTION 'ReservasiStok %: bahan % (gudang %) - saldo tersedia=% dilampaui (reservasi aktif lain=%, reservasi baru=%) - ALT-DEF-052/INV-063', NEW.id, NEW."bahanId", v_gudang_id, v_kuantitas - v_direservasi, v_total_aktif_lain, NEW.jumlah;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservasi_stok_cek_ketersediaan
  BEFORE INSERT ON "reservasi_stok"
  FOR EACH ROW
  EXECUTE FUNCTION reservasi_stok_cek_ketersediaan();

-- ============================================================================
-- Fix 3 (ALT-DEF-053/INV-064): SUM(AlokasiPembayaran.jumlah) lintas
-- Pembayaran BERBEDA dibandingkan Pesanan.totalAkhir SAAT INSERT.
-- ============================================================================
--
-- KEPUTUSAN "status Pembayaran mana yang ikut dihitung" (lihat ADR-042
-- Keputusan 3 untuk pembahasan penuh): SEMUA status IKUT DIHITUNG KECUALI
-- status TERMINAL-NEGATIF yang berarti uangnya tidak lagi (atau tidak
-- pernah) benar-benar mengklaim tagihan ini: `GAGAL`, `DIBATALKAN`,
-- `DIKEMBALIKAN`. Ini SENGAJA LEBIH LUAS dari sekadar "DIBAYAR +
-- MENUNGGU_KONFIRMASI" - alasan: baris `AlokasiPembayaran` MASIH BERSTATUS
-- `DRAF` pun sudah merepresentasikan KLAIM/NIAT MENGALOKASIKAN sejumlah
-- rupiah ke pesanan ini (unique constraint `(pembayaranId, pesananId)`
-- sudah menegaskan baris ini adalah SATU alokasi yang berarti), dan race asli
-- yang dibuktikan `konkurensi-dua-koneksi-lanjutan.test.ts` (test lama #6,
-- ALT-DEF-053) terjadi PERSIS pada momen INSERT dua baris AlokasiPembayaran
-- untuk Pembayaran DRAF yang berbeda, SEBELUM salah satu pun mencapai status
-- DIBAYAR - membatasi hitungan hanya ke DIBAYAR/MENUNGGU_KONFIRMASI tidak
-- akan menutup race itu sama sekali (trigger baru akan diam saja saat
-- kedua alokasi DRAF itu di-INSERT, gagal menangkap race yang sama persis
-- yang jadi motivasi perbaikan ini). `DIKEMBALIKAN_SEBAGIAN` SENGAJA TETAP
-- DIHITUNG PENUH (bukan dikurangi proporsional) - granularitas "berapa dari
-- alokasi ini yang sudah direfund" tidak ada di skema hari ini; menghitung
-- penuh adalah arah AMAN (bisa menolak realokasi yang sebenarnya valid
-- setelah refund sebagian, tapi TIDAK PERNAH meloloskan over-alokasi) -
-- didokumentasikan sebagai keterbatasan jujur, follow-on terpisah.
--
-- LOCK TARGET: baris `Pesanan` (tenantId, id) - SATU baris per pesanan,
-- menyerialkan SEMUA AlokasiPembayaran konkuren (dari Pembayaran mana pun)
-- yang menunjuk pesanan yang SAMA. Ini KOMPLEMENTER (bukan bertentangan)
-- dengan optimistic lock `version` (ADR-035) pada `Pesanan` - lock eksplisit
-- di sini menyerialkan AKSES ke agregat SUM, `version` tetap menjaga
-- integritas UPDATE langsung ke baris Pesanan itu sendiri (dua mekanisme
-- berbeda, tujuan berbeda, tidak saling menggantikan).
CREATE FUNCTION alokasi_pembayaran_cek_batas_pesanan() RETURNS trigger AS $$
DECLARE
  v_total_akhir BIGINT;
  v_total_lain BIGINT;
BEGIN
  SELECT ps."totalAkhir" INTO v_total_akhir
    FROM "pesanan" ps
    WHERE ps."tenantId" = NEW."tenantId" AND ps.id = NEW."pesananId"
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AlokasiPembayaran %: pesananId % tidak ditemukan di tenant %', NEW.id, NEW."pesananId", NEW."tenantId";
  END IF;

  SELECT COALESCE(SUM(ap.jumlah), 0) INTO v_total_lain
    FROM "alokasi_pembayaran" ap
    JOIN "pembayaran" pb ON pb."tenantId" = ap."tenantId" AND pb.id = ap."pembayaranId"
    WHERE ap."tenantId" = NEW."tenantId" AND ap."pesananId" = NEW."pesananId" AND ap.id <> NEW.id
      AND pb.status NOT IN ('GAGAL', 'DIBATALKAN', 'DIKEMBALIKAN');

  IF v_total_lain + NEW.jumlah > v_total_akhir THEN
    RAISE EXCEPTION 'AlokasiPembayaran %: pesanan % totalAkhir=% dilampaui (alokasi lain yang masih berlaku=%, alokasi baru=%, total akan jadi %) - ALT-DEF-053/INV-064', NEW.id, NEW."pesananId", v_total_akhir, v_total_lain, NEW.jumlah, v_total_lain + NEW.jumlah;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alokasi_pembayaran_cek_batas_pesanan
  BEFORE INSERT ON "alokasi_pembayaran"
  FOR EACH ROW
  EXECUTE FUNCTION alokasi_pembayaran_cek_batas_pesanan();
