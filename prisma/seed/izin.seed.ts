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
  { kode: "persediaan.lihat", nama: "Lihat stok bahan", domain: "persediaan", deskripsi: "Melihat saldo dan riwayat stok bahan." },
  { kode: "persediaan.sesuaikan", nama: "Sesuaikan stok", domain: "persediaan", deskripsi: "Membuat mutasi penyesuaian stok manual." },
  { kode: "persediaan.opname", nama: "Kelola stok opname", domain: "persediaan", deskripsi: "Menjadwalkan dan menjalankan sesi stok opname." },
  { kode: "persediaan.transfer", nama: "Transfer stok", domain: "persediaan", deskripsi: "Membuat/menerima transfer stok antar gudang/outlet." },

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

  // qris
  { kode: "qris.kelola", nama: "Kelola konfigurasi QRIS", domain: "qris", deskripsi: "Mengelola konfigurasi QRIS statis outlet." },

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
