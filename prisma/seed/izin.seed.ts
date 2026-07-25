// Seed data literal untuk katalog Izin (ALT-DEF-002, ALT-PLT-009).
//
// Status: struktur data referensi untuk model `Izin` di
// prisma/schema/schema.prisma - BELUM dijalankan terhadap database nyata
// (tidak ada Postgres di environment koreksi ini, lihat ALT-DEF-029 di
// docs/engineering/DEFECT-LEDGER.md). File ini valid secara struktural/TS dan
// dimaksudkan untuk dikonsumsi oleh sebuah script `prisma db seed` nyata
// begitu ada database untuk dimigrasikan - lihat docs/keamanan/PERMISSION-MATRIX.md
// bagian 1a untuk daftar yang sama dalam bentuk tabel naratif.
//
// Bentuk data sengaja polos (array of object) tanpa dependency ke
// @prisma/client supaya file ini tetap type-check bersih meskipun
// `prisma generate` belum/tidak bisa dijalankan di suatu environment (lihat
// packages/test-support/src/keanggotaan-izin.test.ts untuk catatan DIBLOKIR
// terkait ini).

export interface IzinSeedEntry {
  kode: string;
  nama: string;
  domain: string;
  deskripsi: string;
}

// Daftar kode Izin starter, mengikuti docs/keamanan/PERMISSION-MATRIX.md
// bagian 1a. Kode memakai format `domain.aksi` (titik), unik global
// (@@unique([kode]) di model Izin).
export const IZIN_SEED: readonly IzinSeedEntry[] = [
  // transaksi
  { kode: "transaksi.buat", nama: "Buat transaksi", domain: "transaksi", deskripsi: "Membuat transaksi/pesanan baru di kasir." },
  { kode: "transaksi.ubah-harga", nama: "Ubah harga transaksi", domain: "transaksi", deskripsi: "Mengubah harga satuan item dalam transaksi berjalan." },
  { kode: "transaksi.diskon", nama: "Berikan diskon transaksi", domain: "transaksi", deskripsi: "Menerapkan diskon manual pada transaksi/pesanan." },
  { kode: "transaksi.batalkan-item", nama: "Batalkan item transaksi", domain: "transaksi", deskripsi: "Membatalkan satu item dalam transaksi yang belum lunas." },
  { kode: "transaksi.batalkan", nama: "Batalkan transaksi", domain: "transaksi", deskripsi: "Membatalkan keseluruhan transaksi/pesanan." },
  { kode: "transaksi.retur", nama: "Retur transaksi", domain: "transaksi", deskripsi: "Memproses retur/pengembalian barang atas transaksi selesai." },
  { kode: "transaksi.koreksi-pembayaran", nama: "Koreksi pembayaran", domain: "transaksi", deskripsi: "Mengoreksi catatan pembayaran yang salah input." },

  // giliran
  { kode: "giliran.buka", nama: "Buka giliran kasir", domain: "giliran", deskripsi: "Membuka giliran kasir dengan modal awal." },
  { kode: "giliran.tutup", nama: "Tutup giliran kasir", domain: "giliran", deskripsi: "Menutup giliran kasir milik sendiri." },
  { kode: "giliran.tutup-paksa", nama: "Tutup paksa giliran kasir", domain: "giliran", deskripsi: "Menutup giliran kasir milik pengguna lain (supervisor)." },

  // persediaan
  // ALT-DEF-008: empat kode KOARSE lama (`persediaan.lihat`,
  // `persediaan.sesuaikan`, `persediaan.opname`, `persediaan.transfer`)
  // DIGANTI 17 kode granular yang SUDAH DIREFERENSIKAN MASTER-CHECKLIST.md
  // (ALT-PSD-001 s.d. ALT-PSD-018). Kode lama tidak dipertahankan
  // berdampingan: dua nama untuk satu keputusan otorisasi yang sama adalah
  // persis drift yang dicatat ALT-DEF-034. Belum ada satu baris PeranIzin pun
  // (belum ada migrasi yang pernah dijalankan, ALT-DEF-029), sehingga
  // penggantian ini tidak memutus grant yang sudah ada.
  { kode: "persediaan.bahan.kelola", nama: "Kelola bahan baku", domain: "persediaan", deskripsi: "Mendaftarkan/mengubah bahan baku tenant (ALT-PSD-001)." },
  { kode: "persediaan.satuan.kelola", nama: "Kelola satuan", domain: "persediaan", deskripsi: "Mendefinisikan satuan dasar bahan (ALT-PSD-002)." },
  { kode: "persediaan.gudang.kelola", nama: "Kelola gudang", domain: "persediaan", deskripsi: "Mendefinisikan gudang penyimpanan per outlet (ALT-PSD-003)." },
  { kode: "persediaan.lokasi.kelola", nama: "Kelola lokasi penyimpanan", domain: "persediaan", deskripsi: "Mengelola sub-lokasi (rak/chiller/freezer) di dalam gudang (ALT-PSD-004)." },
  { kode: "persediaan.mutasi.lihat", nama: "Lihat mutasi stok", domain: "persediaan", deskripsi: "Membaca ledger mutasi stok append-only (ALT-PSD-005)." },
  { kode: "persediaan.mutasi.balik", nama: "Balik mutasi stok", domain: "persediaan", deskripsi: "Membuat mutasi pembalik atas mutasi yang salah/dibatalkan (ALT-PSD-006)." },
  { kode: "persediaan.saldo.lihat", nama: "Lihat saldo stok", domain: "persediaan", deskripsi: "Membaca read-model saldo stok per gudang/lokasi (ALT-PSD-007)." },
  { kode: "persediaan.reservasi.kelola", nama: "Kelola reservasi stok", domain: "persediaan", deskripsi: "Mengunci stok untuk pesanan yang sedang diproses (ALT-PSD-008)." },
  { kode: "persediaan.reservasi.lepas", nama: "Lepas reservasi stok", domain: "persediaan", deskripsi: "Melepas reservasi secara manual sebagai koreksi (ALT-PSD-009). Pelepasan NORMAL terjadi otomatis lewat event pesanan dan tidak melewati kode izin ini." },
  { kode: "persediaan.batch.kelola", nama: "Kelola batch stok", domain: "persediaan", deskripsi: "Mencatat batch penerimaan beserta tanggal kedaluwarsa untuk FEFO (ALT-PSD-010)." },
  { kode: "persediaan.transfer.kelola", nama: "Kelola transfer stok", domain: "persediaan", deskripsi: "Membuat, mengajukan, dan mengirim transfer stok antar gudang/outlet (ALT-PSD-012)." },
  { kode: "persediaan.transfer.setujui", nama: "Setujui transfer stok", domain: "persediaan", deskripsi: "Menyetujui/membatalkan transfer stok (approval manajer/owner)." },
  { kode: "persediaan.transfer.terima", nama: "Terima transfer stok", domain: "persediaan", deskripsi: "Mengonfirmasi penerimaan transfer di gudang tujuan (ALT-PSD-013)." },
  { kode: "persediaan.waste.kelola", nama: "Catat waste", domain: "persediaan", deskripsi: "Mencatat waste/spoilage dengan alasan baku (ALT-PSD-014)." },
  { kode: "persediaan.alasan-waste.kelola", nama: "Kelola alasan waste", domain: "persediaan", deskripsi: "CRUD daftar alasan waste standar tenant (ALT-PSD-015)." },
  { kode: "persediaan.opname.kelola", nama: "Kelola stok opname", domain: "persediaan", deskripsi: "Menjadwalkan, menghitung, mengunci, dan memposting sesi stok opname (ALT-PSD-016)." },
  { kode: "persediaan.opname.setujui", nama: "Setujui hasil stok opname", domain: "persediaan", deskripsi: "Menyetujui selisih opname signifikan sebelum posting mutasi (ALT-PSD-017)." },
  { kode: "persediaan.reorder.kelola", nama: "Kelola kebijakan pemesanan ulang", domain: "persediaan", deskripsi: "Menetapkan ambang minimum dan kuantitas reorder per bahan per outlet (ALT-PSD-018)." },
  // `persediaan.alokasi.otomatis` (ALT-PSD-011) SENGAJA TIDAK ADA. Kolom
  // Aktor requirement itu adalah pemicu internal (pemakaian resep/penjualan)
  // dan tidak punya endpoint sama sekali - pemilihan batch FEFO/FIFO adalah
  // algoritma, bukan keputusan otorisasi yang dipegang siapa pun. Menjadikannya
  // kode izin justru menyiratkan ada peran yang boleh memakai stok TANPA
  // alokasi batch. Kelas yang sama dengan `keamanan.qris.enkripsi` dan
  // `resep.pemakaian.otomatis` - lihat ALT-DEF-034 dan PERMISSION-MATRIX 1a.

  // pembelian
  { kode: "pembelian.buat", nama: "Buat pembelian", domain: "pembelian", deskripsi: "Membuat purchase order draft." },
  { kode: "pembelian.setujui", nama: "Setujui pembelian", domain: "pembelian", deskripsi: "Menyetujui purchase order sebelum dikirim ke supplier." },
  { kode: "pembelian.terima", nama: "Terima pembelian", domain: "pembelian", deskripsi: "Mencatat penerimaan barang dari purchase order." },

  // promo
  { kode: "promo.lihat", nama: "Lihat promo", domain: "promo", deskripsi: "Melihat daftar promo/kupon aktif." },
  { kode: "promo.kelola", nama: "Kelola promo", domain: "promo", deskripsi: "Membuat/mengubah promo, aturan, dan kupon." },

  // anggota
  { kode: "anggota.lihat", nama: "Lihat data anggota", domain: "anggota", deskripsi: "Melihat profil dan riwayat pelanggan/anggota." },
  { kode: "anggota.kelola", nama: "Kelola data anggota", domain: "anggota", deskripsi: "Mendaftarkan/mengubah data pelanggan dan keanggotaan." },
  { kode: "anggota.tukar-poin", nama: "Tukar poin anggota", domain: "anggota", deskripsi: "Memproses penukaran poin loyalitas pelanggan." },

  // karyawan
  { kode: "karyawan.lihat", nama: "Lihat data karyawan", domain: "karyawan", deskripsi: "Melihat profil dan jabatan karyawan." },
  { kode: "karyawan.kelola", nama: "Kelola data karyawan", domain: "karyawan", deskripsi: "Menambah/mengubah data karyawan dan jabatan." },

  // absensi
  { kode: "absensi.koreksi", nama: "Koreksi absensi", domain: "absensi", deskripsi: "Mengoreksi catatan absensi karyawan secara manual." },
  { kode: "absensi.setujui", nama: "Setujui cuti/izin", domain: "absensi", deskripsi: "Menyetujui/menolak pengajuan cuti atau izin karyawan." },

  // laporan
  { kode: "laporan.operasional", nama: "Lihat laporan operasional", domain: "laporan", deskripsi: "Mengakses laporan penjualan/operasional harian." },
  { kode: "laporan.keuangan", nama: "Lihat laporan keuangan", domain: "laporan", deskripsi: "Mengakses laporan keuangan internal (kas, biaya operasional)." },

  // qris (ALT-DEF-015 - lihat catatan penggantian nama di bawah)
  //
  // CATATAN: kode lama `qris.kelola` DIGANTI NAMA menjadi `qris.konfigurasi.kelola`.
  // MASTER-CHECKLIST.md (ALT-QRS-001/002/005) konsisten mereferensikan
  // `qris.konfigurasi.kelola`, sedangkan seed ini dan PERMISSION-MATRIX.md
  // memakai `qris.kelola` - dua nama untuk satu izin yang sama. Nama checklist
  // yang dipertahankan (ia yang dirujuk requirement); tidak ada data produksi
  // yang terdampak karena seed ini belum pernah dijalankan.
  { kode: "qris.konfigurasi.kelola", nama: "Kelola konfigurasi QRIS", domain: "qris", deskripsi: "Membuat/mengubah/mengaktifkan/memverifikasi KonfigurasiQris statis per outlet (ALT-QRS-001/002/005). Payload disimpan terenkripsi AES-256-GCM, tidak pernah plaintext (ADR-021 Keputusan 2)." },
  { kode: "qris.validasi", nama: "Validasi payload QRIS", domain: "qris", deskripsi: "Menjalankan parser EMV dan validator CRC16 atas payload QRIS sebelum disimpan (ALT-QRS-003/ALT-QRS-004). Umumnya dipakai internal saat unggah, bukan aksi manusia terpisah." },
  { kode: "qris.generate", nama: "Hasilkan QRIS bernominal", domain: "qris", deskripsi: "Menyisipkan nominal tagihan ke payload QRIS statis outlet saat runtime (ALT-QRS-006). Nominal SELALU dihitung server-side dari alokasi pesanan - klien tidak pernah mengirimkannya (ADR-021 Keputusan 4)." },
  { kode: "qris.audit.lihat", nama: "Lihat riwayat konfigurasi QRIS", domain: "qris", deskripsi: "Membaca RiwayatKonfigurasiQris (append-only) untuk menelusuri siapa mengubah konfigurasi QRIS outlet, kapan, dari nilai apa ke apa (ALT-QRS-008)." },

  // pembayaran (baru, ALT-DEF-004/ALT-DEF-014 - lihat docs/keamanan/PERMISSION-MATRIX.md
  // bagian 1a dan tabel transisi lengkap di docs/arsitektur/STATE-MACHINES.md
  // bagian "Pembayaran". MASTER-CHECKLIST.md sudah mereferensikan kode-kode ini
  // sejak sebelumnya (ALT-KSR-002 s.d. ALT-KSR-009, ALT-QRS-007/ALT-QRS-009)
  // tetapi belum pernah ditambahkan ke seed literal ini - genuinely hilang.
  // Kode koreksi/pembatalan pembayaran SENGAJA memakai `transaksi.koreksi-pembayaran`
  // dan `transaksi.batalkan` yang SUDAH ADA di atas, bukan kode `pembayaran.*` baru.
  { kode: "pembayaran.buat", nama: "Buat pembayaran", domain: "pembayaran", deskripsi: "Membuat Pembayaran (DRAF) beserta baris AlokasiPembayaran/PembayaranMetodeBaris, mengajukannya (DRAF -> MENUNGGU), dan mengonfirmasi pembayaran TUNAI/SALDO_TOKO (ALT-KSR-002/ALT-KSR-005)." },
  { kode: "pembayaran.tahan", nama: "Tahan transaksi pembayaran", domain: "pembayaran", deskripsi: "Menahan/memarkir transaksi kasir yang sedang berjalan untuk dilanjutkan nanti (ALT-KSR-003)." },
  { kode: "pembayaran.alokasi.kelola", nama: "Kelola alokasi pembayaran", domain: "pembayaran", deskripsi: "Mengatur baris AlokasiPembayaran - berapa dari satu pembayaran diterapkan ke pesanan mana (split bill/group bill, ALT-KSR-004). Hanya berlaku saat Pembayaran masih DRAF; setelah DIBAYAR perubahan alokasi wajib lewat jalur koreksi berapproval (ADR-019)." },
  { kode: "pembayaran.qris.konfirmasi-manual", nama: "Konfirmasi manual pembayaran QRIS", domain: "pembayaran", deskripsi: "MENUNGGU_KONFIRMASI -> DIBAYAR setelah kasir memverifikasi dana masuk di aplikasi merchant (ALT-QRS-007). Izin ini adalah GUARD FINANSIAL UTAMA: tombol 'Sudah Membayar' milik pelanggan TIDAK memilikinya dan karena itu tidak pernah bisa menghasilkan DIBAYAR (ADR-020 Keputusan 2)." },
  { kode: "pembayaran.qris.koreksi", nama: "Koreksi konfirmasi QRIS", domain: "pembayaran", deskripsi: "Mengoreksi konfirmasi manual QRIS yang keliru (ALT-QRS-009) - tercatat sebagai baris KoreksiPembayaran baru, tidak menghapus QrisKonfirmasiManual asal. Butuh approval supervisor." },
  { kode: "pembayaran.refund", nama: "Refund pembayaran", domain: "pembayaran", deskripsi: "Mengembalikan dana ke pelanggan (ALT-KSR-007), wajib approval SUPERVISOR ke atas. Menulis PembayaranRefund; status menjadi DIKEMBALIKAN_SEBAGIAN/DIKEMBALIKAN sesuai agregat (ADR-020 Keputusan 4)." },
  { kode: "pembayaran.struk.cetak", nama: "Cetak struk pembayaran", domain: "pembayaran", deskripsi: "Mencetak struk setelah pembayaran DIBAYAR (ALT-KSR-008). Struk adalah bukti per PERISTIWA PEMBAYARAN, bukan per pesanan (ADR-019 Keputusan 5)." },
  { kode: "pembayaran.struk.cetak-ulang", nama: "Cetak ulang struk pembayaran", domain: "pembayaran", deskripsi: "Mencetak ulang struk transaksi lampau (ALT-KSR-009) - jumlahCetakUlang bertambah dan tercatat di audit log." },

  // kasir / giliran (baru, ALT-DEF-004/ALT-DEF-014). Kode `giliran.*` lama di
  // atas TETAP DIPERTAHANKAN (dipakai PERMISSION-MATRIX untuk buka/tutup/tutup
  // paksa); kode `kasir.*` di bawah adalah yang direferensikan MASTER-CHECKLIST
  // ALT-KSR-001/010/011/012/013 untuk alur rekonsiliasi & verifikasi kas.
  { kode: "kasir.giliran.kelola", nama: "Kelola giliran kasir", domain: "kasir", deskripsi: "Membuka giliran kasir dengan modal awal dan menutupnya dengan perhitungan kas fisik (ALT-KSR-001/ALT-KSR-010)." },
  { kode: "kasir.rekonsiliasi.lihat", nama: "Lihat rekonsiliasi kas giliran", domain: "kasir", deskripsi: "Membandingkan kas sistem vs kas fisik yang dihitung kasir saat tutup giliran (ALT-KSR-011); selisih wajib diberi catatan alasan." },
  { kode: "kasir.giliran.verifikasi", nama: "Verifikasi selisih kas giliran", domain: "kasir", deskripsi: "Supervisor memverifikasi/menandatangani selisih kas sebelum giliran final (ALT-KSR-012)." },
  { kode: "kasir.giliran.buka-kembali", nama: "Buka ulang giliran kasir", domain: "kasir", deskripsi: "Membuka kembali giliran yang sudah ditutup untuk koreksi (ALT-KSR-013) - wajib approval SUPERVISOR ke atas dan tercatat di audit log." },

  // resep & produksi (baru, ALT-DEF-007 - lihat ADR-022 di
  // docs/engineering/DECISION-LOG.md dan docs/keamanan/PERMISSION-MATRIX.md
  // bagian 1a. MASTER-CHECKLIST.md sudah mereferensikan SELURUH kode di bawah
  // sejak sebelumnya (ALT-RSP-001 s.d. ALT-RSP-013) tetapi tidak satu pun
  // pernah ada di seed literal ini - genuinely hilang, bukan spekulatif.
  //
  // SENGAJA TIDAK DITAMBAHKAN: `resep.pemakaian.otomatis` (ALT-RSP-011).
  // Kolom Aktor requirement itu adalah "sistem" dan pemicunya event internal
  // pesanan-selesai; tidak ada aktor manusia yang bisa diberi/dicabut izinnya.
  // Menjadikannya kode izin justru menyiratkan ada peran yang boleh
  // menyelesaikan pesanan TANPA memotong stok - jalur penyimpangan yang tidak
  // boleh ada. Alasan yang sama dengan `keamanan.qris.enkripsi` pada batch
  // ALT-DEF-015. Diusulkan kolom Permission ALT-RSP-011 diubah jadi `-`;
  // dicatat sebagai tambahan ALT-DEF-034.
  { kode: "resep.kelola", nama: "Kelola resep", domain: "resep", deskripsi: "Membuat/mengubah kontainer Resep beserta sasarannya - tepat satu dari ItemMenu, VarianMenu, atau Bahan setengah jadi (ALT-RSP-001, invariant XOR ADR-022 Keputusan 2)." },
  { kode: "resep.versi.kelola", nama: "Kelola versi resep", domain: "resep", deskripsi: "Membuat VersiResep baru beserta KomponenResep-nya dan MENGAKTIFKAN satu versi (ALT-RSP-002). Komposisi versi AKTIF/NONAKTIF/ARSIP tidak pernah bisa ditimpa - ia dirujuk ItemPesanan historis lewat ItemPesanan.resepVersiId (ADR-022 Keputusan 7)." },
  { kode: "resep.varian.kelola", nama: "Kelola resep per varian", domain: "resep", deskripsi: "Mengatur resep khusus satu VarianMenu, mis. porsi jumbo memakai bahan lebih banyak (ALT-RSP-003). CATATAN: MASTER-CHECKLIST menyebut entitas `ResepVarian`; ADR-022 Keputusan 2 memodelkannya sebagai Resep dengan sasaran varianMenuId - aksinya sama, entitas penyimpannya berbeda (ALT-DEF-034)." },
  { kode: "resep.modifier.kelola", nama: "Kelola efek modifier pada resep", domain: "resep", deskripsi: "Mengatur KomponenResepModifier: aksi TAMBAH/KURANGI/GANTI satu ModifierOpsi terhadap komposisi bahan sebuah versi resep, mis. 'extra cheese' +20g atau 'tanpa bawang' (ALT-RSP-004, ADR-022 Keputusan 5)." },
  { kode: "resep.subresep.kelola", nama: "Kelola subresep", domain: "resep", deskripsi: "Mengatur resep yang menghasilkan Bahan berjenis BAHAN_SETENGAH_JADI beserta yield-nya (ALT-RSP-005/ALT-RSP-006). CATATAN: MASTER-CHECKLIST menyebut entitas `Subresep`; ADR-022 Keputusan 1 memodelkannya sebagai Bahan ber-jenis + Resep.bahanHasilId (ALT-DEF-034)." },
  { kode: "resep.penyusutan.kelola", nama: "Kelola faktor penyusutan", domain: "resep", deskripsi: "Menetapkan persentase susut wajar produksi, mis. sayur dikupas berkurang 10% (ALT-RSP-007). CATATAN: MASTER-CHECKLIST menyebut entitas `FaktorPenyusutan`; kini kolom VersiResep.penyusutanPersen sehingga ikut ter-versi bersama resepnya (ALT-DEF-034)." },
  { kode: "resep.konversi.kelola", nama: "Kelola konversi satuan", domain: "resep", deskripsi: "Mengatur KonversiSatuan antar satuan per tenant, mis. kg->gram = 1000 (ALT-RSP-008). Disimpan per tenant, bukan per bahan - lihat ADR-022 Keputusan 6." },
  { kode: "resep.produksi.kelola", nama: "Kelola proses produksi", domain: "resep", deskripsi: "Membuat/memulai/menyelesaikan/membatalkan ProsesProduksi beserta BatchProduksi hasilnya (ALT-RSP-009/ALT-RSP-010). Penyelesaian produksi wajib Idempotency-Key - ia (kelak) memposting mutasi stok ganda PRODUKSI_KELUAR + PRODUKSI_MASUK." },
  { kode: "resep.hpp.lihat", nama: "Lihat HPP resep", domain: "resep", deskripsi: "Membaca estimasi harga pokok penjualan sebuah resep dari harga bahan terbaru (ALT-RSP-012). Nilai yang TERSIMPAN di VersiResep.snapshotBiaya adalah HPP saat versi diaktifkan dan tidak pernah dihitung ulang." },
  { kode: "resep.pemakaian.reversal", nama: "Balik pemakaian bahan resep", domain: "resep", deskripsi: "Membalik pemotongan stok resep saat pesanan/item dibatalkan setelah diproses (ALT-RSP-013). Selalu berupa mutasi PEMBALIK baru (ADR-006), dan besarannya dihitung dari ItemPesanan.resepVersiId - versi yang TERCATAT di baris pesanan, bukan versi aktif saat ini (ADR-022 Keputusan 8). Implementasi mutasinya adalah scope ALT-DEF-008." },

  // pengaturan
  { kode: "pengaturan.kelola", nama: "Kelola pengaturan", domain: "pengaturan", deskripsi: "Mengubah pengaturan tenant/outlet." },

  // izin
  { kode: "izin.kelola", nama: "Kelola izin & peran", domain: "izin", deskripsi: "Mengelola peran, katalog izin, dan batas izin." },

  // audit
  { kode: "audit.lihat", nama: "Lihat audit log", domain: "audit", deskripsi: "Membaca jejak audit tenant/outlet." },

  // data
  { kode: "data.ekspor", nama: "Ekspor data", domain: "data", deskripsi: "Mengekspor data tenant (laporan, backup) ke file eksternal." },

  // akun (baru, ALT-DEF-003/ALT-DEF-013 - lihat docs/keamanan/PERMISSION-MATRIX.md bagian 1a)
  { kode: "akun.reset-pin", nama: "Reset PIN karyawan lain", domain: "akun", deskripsi: "Mereset PinOutlet milik KeanggotaanTenant lain (mis. oleh pemilik/manajer outlet saat staf lupa PIN)." },

  // pesanan (baru, ALT-DEF-005/ALT-DEF-016 - lihat docs/keamanan/PERMISSION-MATRIX.md
  // bagian 1a dan tabel transisi lengkap di docs/arsitektur/STATE-MACHINES.md
  // bagian "Pesanan". MASTER-CHECKLIST.md sudah mereferensikan kode-kode ini
  // sejak sebelumnya (ALT-PES-001 s.d. ALT-PES-018) tetapi belum pernah
  // ditambahkan ke seed literal ini - genuinely hilang, bukan duplikat.
  { kode: "pesanan.buat", nama: "Buat pesanan", domain: "pesanan", deskripsi: "Membuat pesanan baru (kanal KASIR/PELAYAN) atau mengirim ulang pesanan yang ditolak (DITOLAK -> DIKIRIM)." },
  { kode: "pesanan.item.tambah", nama: "Tambah item pesanan", domain: "pesanan", deskripsi: "Menambahkan item/varian/modifier ke pesanan yang sedang berjalan." },
  { kode: "pesanan.ubah", nama: "Ubah pesanan pasca-konfirmasi", domain: "pesanan", deskripsi: "Mengubah kuantitas/item pesanan yang sudah DIKONFIRMASI - tercatat sebagai baris PesananPerubahan, bukan overwrite." },
  { kode: "pesanan.terima", nama: "Terima pesanan QR pelanggan", domain: "pesanan", deskripsi: "Menyetujui pesanan kanal QR_PELANGGAN yang berstatus MENUNGGU_PERSETUJUAN (MENUNGGU_PERSETUJUAN -> DITERIMA)." },
  { kode: "pesanan.tolak", nama: "Tolak pesanan QR pelanggan", domain: "pesanan", deskripsi: "Menolak pesanan kanal QR_PELANGGAN yang berstatus MENUNGGU_PERSETUJUAN, wajib mengisi alasan (MENUNGGU_PERSETUJUAN -> DITOLAK)." },
  { kode: "pesanan.status.ubah", nama: "Ubah status pesanan (generik)", domain: "pesanan", deskripsi: "Menjalankan transisi status pesanan generik (konfirmasi, kirim ke dapur, tandai disajikan, selesaikan) di luar transisi yang punya izin khusus (terima/tolak/batalkan)." },
  { kode: "pesanan.batalkan", nama: "Batalkan pesanan", domain: "pesanan", deskripsi: "Membatalkan seluruh pesanan (menulis PesananPembatalan); butuh approval supervisor bila status sudah DIKONFIRMASI/DIKIRIM_KE_DAPUR/SEDANG_DISIAPKAN." },
  { kode: "pesanan.retur.kelola", nama: "Kelola retur pesanan", domain: "pesanan", deskripsi: "Memproses retur pesanan yang sudah SELESAI (SELESAI -> DIRETUR); model detail retur adalah scope ALT-PES-018 batch berikutnya." },
  { kode: "pesanan.riwayat.lihat", nama: "Lihat riwayat pesanan", domain: "pesanan", deskripsi: "Membaca daftar pesanan, riwayat status, dan riwayat perubahan (PesananRiwayatStatus/PesananPerubahan)." },

  // dapur / KDS (baru, ALT-DEF-006 - lihat docs/keamanan/PERMISSION-MATRIX.md
  // bagian 1a dan tabel transisi lengkap di docs/arsitektur/STATE-MACHINES.md
  // bagian "Dapur (Tiket Dapur)". MASTER-CHECKLIST.md sudah mereferensikan
  // kode-kode ini sejak sebelumnya (ALT-DPR-001 s.d. ALT-DPR-015) tetapi belum
  // pernah ditambahkan ke seed literal ini - genuinely hilang, bukan duplikat.
  { kode: "dapur.stasiun.kelola", nama: "Kelola stasiun dapur", domain: "dapur", deskripsi: "CRUD stasiun kerja dapur (Dapur Panas, Bar, Dessert) per outlet (ALT-DPR-001)." },
  { kode: "dapur.routing.kelola", nama: "Kelola routing item ke stasiun", domain: "dapur", deskripsi: "Mengelola AturanRoutingDapur - menentukan item menu/kategori menu diarahkan ke stasiun dapur mana (ALT-DPR-002). Tepat satu dari itemMenuId/kategoriMenuId wajib diisi (invariant XOR level-aplikasi, ADR-018 Keputusan 4)." },
  { kode: "dapur.tiket.buat-otomatis", nama: "Buat tiket dapur otomatis (internal)", domain: "dapur", deskripsi: "Izin INTERNAL yang dipakai event konfirmasi pesanan saat membuat TiketDapur per stasiun tujuan (ALT-DPR-003) - bukan izin yang diberikan ke peran manusia." },
  { kode: "dapur.tiket.lihat", nama: "Lihat papan tiket dapur", domain: "dapur", deskripsi: "Membaca antrian/detail TiketDapur beserta barisnya di layar KDS, termasuk menerima (BARU -> DITERIMA) dan memulai (DITERIMA -> SEDANG_DISIAPKAN) tiket." },
  { kode: "dapur.tiket.prioritas", nama: "Ubah prioritas tiket dapur", domain: "dapur", deskripsi: "Menandai/melepas prioritas tinggi pada tiket agar tampil di atas antrian KDS (ALT-DPR-006) - tidak mengubah status tiket." },
  { kode: "dapur.tiket.tahan", nama: "Tahan/lepas-tahan tiket dapur", domain: "dapur", deskripsi: "Menahan sementara tiket (-> DITAHAN, alasan wajib) dan melepasnya kembali (ALT-DPR-007). Dipisah dari dapur.tiket.lihat karena hold menghentikan timer SLA waktu masak." },
  { kode: "dapur.baris.siap", nama: "Tandai baris tiket siap", domain: "dapur", deskripsi: "Menandai satu TiketDapurBaris berstatus SIAP (StatusMasakBaris), membuat tiket menjadi SELESAI_SEBAGIAN bila masih ada baris tersisa (ALT-DPR-008)." },
  { kode: "dapur.tiket.siap", nama: "Tandai tiket dapur siap", domain: "dapur", deskripsi: "Menandai keseluruhan tiket SIAP setelah SELURUH barisnya SIAP (ALT-DPR-009) - memicu notifikasi ke pelayan." },
  { kode: "dapur.tiket.ambil", nama: "Tandai tiket diambil/disajikan", domain: "dapur", deskripsi: "Transisi SIAP -> DISAJIKAN saat pelayan mengambil tiket dari pass (ALT-DPR-010). Pesanan induk baru DISAJIKAN bila SELURUH tiketnya DISAJIKAN." },
  { kode: "dapur.cetak", nama: "Cetak tiket dapur", domain: "dapur", deskripsi: "Mencetak tiket fisik ke printer stasiun terkait saat tiket dibuat (ALT-DPR-011) - gagal cetak tidak menghambat alur data." },
  { kode: "dapur.cetak-ulang", nama: "Cetak ulang tiket dapur", domain: "dapur", deskripsi: "Mencetak ulang tiket bila kertas macet/hilang (ALT-DPR-012) - jumlah cetak ulang tercatat untuk audit." },
] as const;

// Sanity check struktural sederhana - dipakai oleh
// packages/test-support/src/keanggotaan-izin.test.ts untuk memastikan tidak
// ada kode Izin yang duplikat di seed literal ini (Izin.kode unik global).
export function cariKodeDuplikat(daftar: readonly IzinSeedEntry[] = IZIN_SEED): string[] {
  const terlihat = new Set<string>();
  const duplikat = new Set<string>();
  for (const entry of daftar) {
    if (terlihat.has(entry.kode)) {
      duplikat.add(entry.kode);
    }
    terlihat.add(entry.kode);
  }
  return [...duplikat];
}
