-- ADR-036 (sub-problem A): pengaman DB-level untuk transisi atomik pembayaran->pesanan.
--
-- MASALAH (lihat ADR-036/DECISION-LOG.md dan DEFECT-LEDGER.md ALT-DEF-047 untuk
-- diskusi lengkap): flow yang benar adalah
--   validasi pembayaran -> ubah Pembayaran jadi DIBAYAR -> hitung alokasi ->
--   bila memenuhi guard, ubah Pesanan -> tulis audit/outbox -> commit
-- SELURUHNYA dalam SATU transaksi database. Ini FUNDAMENTAL adalah tanggung jawab
-- APLIKASI/SERVICE-LAYER (belum ada kode handler sama sekali di repo ini - lihat
-- DEFECT-LEDGER.md ALT-DEF-047 untuk pencatatan defect yang TIDAK BISA ditutup
-- sampai kode itu ada). TAPI skema/database BISA dan HARUS menyediakan pengaman
-- supaya, SEANDAINYA aplikasi salah urutan/lupa membungkus dalam satu transaksi,
-- state akhir yang tersimpan permanen (ter-commit) tidak akan pernah menjadi
-- inkonsisten: Pembayaran berstatus DIBAYAR padahal Pesanan yang dialokasikannya
-- masih di status yang tidak konsisten dengan "sudah dibayar" (mis. DRAF, DIKIRIM,
-- MENUNGGU_PERSETUJUAN, DITOLAK, MENUNGGU_PEMBAYARAN, atau malah DIBATALKAN).
--
-- KENAPA CONSTRAINT TRIGGER DEFERRED (bukan trigger BEFORE/AFTER biasa, dan bukan
-- CHECK constraint polos):
--   - Flow yang diminta MEMANG mengubah Pembayaran ke DIBAYAR DULU, baru
--     mengubah Pesanan setelahnya, MASIH DALAM TRANSAKSI YANG SAMA. Trigger
--     AFTER UPDATE biasa (non-deferred) akan fire IMMEDIATELY setelah statement
--     UPDATE pembayaran itu sendiri - pada titik itu Pesanan BELUM diupdate sama
--     sekali (statement berikutnya dalam transaksi yang sama belum jalan), jadi
--     trigger non-deferred akan SELALU salah menolak flow yang justru benar.
--   - `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` menunda evaluasi
--     sampai TEPAT SEBELUM COMMIT - persis semantik yang dibutuhkan: aplikasi
--     bebas mengubah Pembayaran dan Pesanan dalam urutan apa pun ASALKAN pada
--     titik COMMIT keduanya sudah konsisten. Kalau TIDAK konsisten pada saat itu
--     (mis. aplikasi lupa mengubah Pesanan sama sekali, atau crash di antara -
--     tapi crash berarti transaksi tidak pernah commit sama sekali, jadi kasus
--     itu otomatis aman oleh atomicity transaksi bawaan Postgres), COMMIT GAGAL
--     KERAS dengan pesan error yang jelas - bukan silent inconsistency.
--
-- CAKUPAN deteksi (dipasang di TIGA tabel supaya dicek dari sisi mana pun
-- perubahan terjadi dalam transaksi yang sama):
--   1. INSERT/UPDATE pada `pembayaran` (mis. status berubah jadi DIBAYAR).
--   2. INSERT/UPDATE pada `alokasi_pembayaran` (mis. alokasi baru ditambah ke
--      pembayaran yang SUDAH DIBAYAR, menghubungkannya ke pesanan baru).
--   3. UPDATE pada `pesanan` yang mengubah `status` (mis. bug meregresikan
--      status pesanan padahal pembayarannya sudah DIBAYAR).
-- Fungsi pemeriksa BERSIFAT SET-BASED (scan ulang join lengkap, bukan hanya
-- baris NEW/OLD) - trade-off yang disengaja: constraint trigger deferred hanya
-- fire per pernyataan SET OF ROWS yang berubah dalam transaksi (bukan per baris
-- per baris berulang), jadi biaya nyatanya adalah SATU query terhadap potongan
-- baris yang benar-benar berubah di transaksi itu, dieksekusi sekali per commit -
-- BUKAN full-table-scan pada seluruh tabel pembayaran/pesanan. Didokumentasikan
-- sebagai keputusan sadar, bukan dianggap gratis - lihat catatan performa di
-- ADR-036 dan INVARIAN-BELUM-DITEGAKKAN.md.
--
-- RECONCILIATION QUERY (untuk audit ad-hoc / dijalankan manual kapan saja tanpa
-- menunggu trigger, mis. sebelum trigger ini dipasang di lingkungan lain, atau
-- sebagai jaring pengaman kedua dari luar transaksi):
--   SELECT pb.id AS pembayaran_id, p.id AS pesanan_id, p.status AS status_pesanan
--   FROM alokasi_pembayaran ap
--   JOIN pembayaran pb ON pb.id = ap."pembayaranId" AND pb."tenantId" = ap."tenantId"
--   JOIN pesanan p ON p.id = ap."pesananId" AND p."tenantId" = ap."tenantId"
--   WHERE pb.status = 'DIBAYAR'
--     AND p.status IN ('DRAF','DIKIRIM','MENUNGGU_PERSETUJUAN','DITOLAK',
--                       'MENUNGGU_PEMBAYARAN','DIBATALKAN');
-- Baris apa pun yang dikembalikan query ini adalah pelanggaran nyata - dengan
-- trigger di bawah TERPASANG, query ini SEHARUSNYA SELALU kosong pada database
-- mana pun yang sudah commit (trigger menolak commit yang akan menghasilkan
-- baris ini).
-- =====================================================================================

CREATE FUNCTION cek_konsistensi_pembayaran_pesanan()
RETURNS TRIGGER AS $$
DECLARE
  v_pelanggaran RECORD;
BEGIN
  SELECT pb.id AS pembayaran_id, p.id AS pesanan_id, p.status AS status_pesanan
  INTO v_pelanggaran
  FROM alokasi_pembayaran ap
  JOIN pembayaran pb ON pb.id = ap."pembayaranId" AND pb."tenantId" = ap."tenantId"
  JOIN pesanan p ON p.id = ap."pesananId" AND p."tenantId" = ap."tenantId"
  WHERE pb.status = 'DIBAYAR'
    AND p.status IN ('DRAF', 'DIKIRIM', 'MENUNGGU_PERSETUJUAN', 'DITOLAK', 'MENUNGGU_PEMBAYARAN', 'DIBATALKAN')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Inkonsistensi pembayaran-pesanan: pembayaran % berstatus DIBAYAR tapi pesanan % (dialokasikan lewat alokasi_pembayaran) berstatus %, yang tidak konsisten dengan pesanan yang sudah dibayar. Lihat ADR-036 sub-problem A untuk kontrak transaksi yang benar.',
      v_pelanggaran.pembayaran_id, v_pelanggaran.pesanan_id, v_pelanggaran.status_pesanan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_cek_konsistensi_pada_pembayaran
    AFTER INSERT OR UPDATE ON pembayaran
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    WHEN (NEW.status = 'DIBAYAR')
    EXECUTE FUNCTION cek_konsistensi_pembayaran_pesanan();

CREATE CONSTRAINT TRIGGER trg_cek_konsistensi_pada_alokasi
    AFTER INSERT OR UPDATE ON alokasi_pembayaran
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION cek_konsistensi_pembayaran_pesanan();

CREATE CONSTRAINT TRIGGER trg_cek_konsistensi_pada_pesanan
    AFTER UPDATE ON pesanan
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION cek_konsistensi_pembayaran_pesanan();
