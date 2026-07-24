# Peta Rute - Altora Resto

Status dokumen: **DRAF AWAL** (belum diimplementasikan). Semua rute dilayani oleh
`apps/web` (Next.js App Router) - `apps/mobile` dan `apps/desktop` membungkus rute
yang sama lewat WebView/WebView2 (lihat `docs/arsitektur/ARSITEKTUR-SISTEM.md`).

## 1. Prinsip umum

- Rute internal staf berada di bawah `/resto/{outletSlug}/...` dan wajib login.
- Rute publik untuk tamu berada di bawah `/pesan/{token}` (token sesi meja QR, lihat
  `SesiMejaQr` di `docs/database/06-meja-reservasi.md`) - tidak butuh akun pengguna.
- Rute diberi label peran minimum yang boleh mengakses (lihat
  `docs/keamanan/PERMISSION-MATRIX.md`); rute tidak menampilkan aksi yang permission-nya
  tidak dimiliki pengguna, tapi enforcement sesungguhnya tetap di layer API.

## 2. Rute publik (tamu, tanpa login)

| Rute | Deskripsi | Contoh teks UI |
|---|---|---|
| `/pesan/{token}` | Halaman pesan mandiri dari meja (scan QR). | "Selamat datang di Altora Resto, silakan pilih menu Anda." |
| `/pesan/{token}/menu` | Katalog menu untuk sesi meja tsb. | "Menu Favorit", "Tambah ke Pesanan" |
| `/pesan/{token}/keranjang` | Keranjang pesanan sebelum dikirim ke dapur. | "Pesanan Anda", "Kirim Pesanan ke Dapur" |
| `/pesan/{token}/status` | Status pesanan real-time (BARU -> DIBAYAR). | "Pesanan sedang diproses dapur" |
| `/reservasi/{outletSlug}` | Form reservasi meja publik. | "Reservasi Meja", "Pilih Tanggal & Jam" |

## 3. Autentikasi

| Rute | Deskripsi |
|---|---|
| `/masuk` | Login email + kata sandi (kantor/manajer). |
| `/masuk-pin` | Login PIN cepat (kasir/pelayan/dapur di perangkat outlet). |
| `/pilih-outlet` | Pemilihan outlet aktif setelah login (jika bertugas di >1 outlet). |

## 4. Dasbor & navigasi utama (`/resto/{outletSlug}`)

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}` | semua staf | Dasbor ringkasan (pesanan aktif, meja, notifikasi). |

## 5. Pesanan & Kasir (`packages/pesanan`, `packages/kasir`, `packages/pelayan`)

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/pesanan` | PELAYAN | Daftar pesanan aktif (papan status). |
| `/resto/{outletSlug}/pesanan/baru` | PELAYAN | Buat pesanan baru (pilih meja/take-away). |
| `/resto/{outletSlug}/pesanan/{id}` | PELAYAN | Detail pesanan, tambah item, kirim ke dapur. |
| `/resto/{outletSlug}/kasir` | KASIR | Layar kasir - pilih pesanan untuk dibayar. |
| `/resto/{outletSlug}/kasir/{pesananId}/bayar` | KASIR | Proses pembayaran (tunai/QRIS manual/kartu/split bill). |
| `/resto/{outletSlug}/kasir/giliran` | KASIR | Buka/tutup giliran kasir, rekap kas. |

## 6. Dapur / KDS (`packages/dapur`)

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/dapur` | DAPUR | Papan tiket dapur (KDS), per stasiun. |
| `/resto/{outletSlug}/dapur/stasiun/{stasiunId}` | DAPUR | Tiket khusus satu stasiun (mis. Stasiun Panas). |

## 7. Meja & Reservasi

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/meja` | PELAYAN | Peta meja (status TERSEDIA/TERPAKAI/dst). |
| `/resto/{outletSlug}/meja/{id}/qr` | PELAYAN | Tampilkan/cetak ulang QR sesi meja. |
| `/resto/{outletSlug}/reservasi` | PELAYAN | Daftar reservasi hari ini & mendatang. |
| `/resto/{outletSlug}/reservasi/{id}` | PELAYAN | Detail & konfirmasi reservasi. |

## 8. Menu, Resep & Persediaan

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/menu` | MANAJER | Kelola kategori & item menu. |
| `/resto/{outletSlug}/menu/{id}/resep` | MANAJER | Kelola resep/BOM item menu. |
| `/resto/{outletSlug}/persediaan` | GUDANG | Saldo stok bahan per gudang. |
| `/resto/{outletSlug}/persediaan/mutasi` | GUDANG | Riwayat mutasi stok. |
| `/resto/{outletSlug}/persediaan/opname` | GUDANG | Kelola sesi stok opname. |
| `/resto/{outletSlug}/pembelian` | PEMBELIAN | Daftar purchase order. |
| `/resto/{outletSlug}/pembelian/{id}` | PEMBELIAN | Detail PO, penerimaan barang, retur. |
| `/resto/{outletSlug}/supplier` | PEMBELIAN | Kelola data supplier. |

## 9. Promo & Pelanggan

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/promo` | MANAJER | Kelola promo & kupon. |
| `/resto/{outletSlug}/pelanggan` | PELAYAN | Cari/daftarkan pelanggan, lihat membership. |

## 10. Karyawan & Absensi

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/karyawan` | HRD | Daftar karyawan & jabatan. |
| `/resto/{outletSlug}/karyawan/shift` | HRD | Jadwal & penugasan shift. |
| `/resto/{outletSlug}/absensi` | HRD | Rekap absensi & koreksi manual. |
| `/absensi/mandiri` | semua staf | Presensi mandiri (QR/PIN/GPS) dari perangkat pribadi/outlet. |
| `/resto/{outletSlug}/cuti-izin` | HRD | Kelola pengajuan cuti/izin. |

## 11. Keuangan & Analitik

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/resto/{outletSlug}/keuangan/rekap-kas` | MANAJER | Rekap kas harian. |
| `/resto/{outletSlug}/keuangan/biaya` | MANAJER | Kelola biaya operasional. |
| `/resto/{outletSlug}/analitik` | MANAJER | Dashboard penjualan, item terlaris, stok kritis. |
| `/analitik/multi-outlet` | OWNER | Dashboard lintas semua outlet tenant. |

## 12. Pengaturan

| Rute | Peran minimum | Deskripsi |
|---|---|---|
| `/pengaturan/tenant` | OWNER | Pengaturan tenant (nama, slug, kebijakan umum). |
| `/pengaturan/outlet/{outletSlug}` | MANAJER | Pengaturan outlet (zona waktu, jam operasional). |
| `/pengaturan/pengguna` | OWNER | Kelola pengguna & peran. |
| `/pengaturan/perangkat` | MANAJER | Kelola & aktivasi perangkat (KASIR/KDS/PRINTER/TABLET_PELAYAN). |

## 13. Status implementasi

Semua rute berstatus **BELUM DIKERJAKAN** kecuali dicatat lain di
`docs/engineering/UI-REFERENCE-MAP.md` dan `docs/engineering/MASTER-CHECKLIST.md`.
