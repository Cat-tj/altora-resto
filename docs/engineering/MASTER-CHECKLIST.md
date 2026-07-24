# Master Checklist - Altora Resto

Status dokumen: **DRAF AWAL**. Daftar requirement per domain dengan ID unik, dipakai
sebagai sumber kebenaran untuk `TRACEABILITY-MATRIX.md`. Semua requirement diberi
status siklus hidup: `BELUM DIKERJAKAN` -> `DIKERJAKAN` -> `SELESAI DEV` ->
`DIUJI` -> `LULUS`/`GAGAL`. **Tidak ada requirement di dokumen ini yang sudah
diverifikasi lulus** - semua masih `BELUM DIKERJAKAN` per penulisan dokumen ini
(2026-07-24).

Format ID: `ALT-{DOMAIN}-{urut 3 digit}`.

Kode domain: `PLT` Platform, `OTR` Otorisasi, `MNU` Menu, `RSP` Resep, `PSD` Persediaan,
`PMB` Pembelian, `MJA` Meja, `RSV` Reservasi, `PSN` Pesanan, `DPR` Dapur, `KSR` Kasir,
`PBY` Pembayaran, `PRM` Promo, `PLG` Pelanggan/Keanggotaan, `KRY` Karyawan, `ABS`
Absensi, `KEU` Keuangan, `ANL` Analitik, `UIX` UI/UX lintas platform.

## Platform & Otorisasi

| ID | Requirement | Status |
|---|---|---|
| ALT-PLT-001 | Registrasi tenant baru + akun Owner pertama | BELUM DIKERJAKAN |
| ALT-PLT-002 | CRUD outlet dalam satu tenant | BELUM DIKERJAKAN |
| ALT-PLT-003 | Login email + kata sandi | BELUM DIKERJAKAN |
| ALT-PLT-004 | Login PIN cepat di perangkat outlet | BELUM DIKERJAKAN |
| ALT-PLT-005 | Aktivasi & manajemen perangkat (KASIR/KDS/PRINTER/TABLET_PELAYAN) | BELUM DIKERJAKAN |
| ALT-PLT-006 | Audit log append-only untuk semua domain | BELUM DIKERJAKAN |
| ALT-PLT-007 | Pengaturan tenant & outlet (key-value) | BELUM DIKERJAKAN |
| ALT-OTR-001 | Definisi peran dasar & matriks permission (lihat PERMISSION-MATRIX.md) | BELUM DIKERJAKAN |
| ALT-OTR-002 | Enforcement permission di middleware API | BELUM DIKERJAKAN |
| ALT-OTR-003 | Approval bertingkat (supervisor/manajer) untuk aksi sensitif | BELUM DIKERJAKAN |

## Menu, Resep & Persediaan

| ID | Requirement | Status |
|---|---|---|
| ALT-MNU-001 | CRUD kategori & item menu | BELUM DIKERJAKAN |
| ALT-MNU-002 | Varian menu dengan harga tambahan | BELUM DIKERJAKAN |
| ALT-MNU-003 | Grup modifier & opsi modifier | BELUM DIKERJAKAN |
| ALT-MNU-004 | Harga item per outlet | BELUM DIKERJAKAN |
| ALT-RSP-001 | CRUD resep/BOM per item menu | BELUM DIKERJAKAN |
| ALT-RSP-002 | Pemotongan stok otomatis dari resep saat pesanan selesai | BELUM DIKERJAKAN |
| ALT-PSD-001 | Saldo stok bahan per gudang (derived dari mutasi) | BELUM DIKERJAKAN |
| ALT-PSD-002 | Mutasi stok append-only + mutasi pembalik (no hard-delete) | BELUM DIKERJAKAN |
| ALT-PSD-003 | Alur stok opname (rencana -> berlangsung -> selesai) | BELUM DIKERJAKAN |
| ALT-PSD-004 | Peringatan stok di bawah ambang minimum | BELUM DIKERJAKAN |

## Supplier & Pembelian

| ID | Requirement | Status |
|---|---|---|
| ALT-PMB-001 | CRUD supplier | BELUM DIKERJAKAN |
| ALT-PMB-002 | Alur status purchase order (Draft -> Diterima Penuh) | BELUM DIKERJAKAN |
| ALT-PMB-003 | Penerimaan barang (sebagian/penuh) + trigger mutasi stok | BELUM DIKERJAKAN |
| ALT-PMB-004 | Retur pembelian | BELUM DIKERJAKAN |

## Meja, Reservasi & Pesanan

| ID | Requirement | Status |
|---|---|---|
| ALT-MJA-001 | CRUD area meja & meja + status meja | BELUM DIKERJAKAN |
| ALT-MJA-002 | Sesi QR meja (buat, pakai, tutup) | BELUM DIKERJAKAN |
| ALT-RSV-001 | Alur reservasi (diajukan -> tiba/tidak hadir) | BELUM DIKERJAKAN |
| ALT-PSN-001 | Buat pesanan dari 3 kanal (kasir/pelayan/QR pelanggan) | BELUM DIKERJAKAN |
| ALT-PSN-002 | Alur status pesanan sesuai state machine | BELUM DIKERJAKAN |
| ALT-PSN-003 | Snapshot harga pada item pesanan (tidak berubah walau harga menu berubah) | BELUM DIKERJAKAN |
| ALT-PSN-004 | Riwayat status pesanan (append-only) | BELUM DIKERJAKAN |
| ALT-PSN-005 | Pembatalan pesanan dengan approval bertingkat | BELUM DIKERJAKAN |

## Dapur (KDS)

| ID | Requirement | Status |
|---|---|---|
| ALT-DPR-001 | Tiket dapur dibuat otomatis saat pesanan dikonfirmasi | BELUM DIKERJAKAN |
| ALT-DPR-002 | Papan KDS per stasiun dengan alur status | BELUM DIKERJAKAN |
| ALT-DPR-003 | Dapur hanya membaca read-contract pesanan (tidak menulis domain pesanan) | BELUM DIKERJAKAN |

## Kasir & Pembayaran

| ID | Requirement | Status |
|---|---|---|
| ALT-KSR-001 | Buka/tutup giliran kasir dengan modal awal & rekonsiliasi | BELUM DIKERJAKAN |
| ALT-KSR-002 | Verifikasi selisih kas oleh supervisor | BELUM DIKERJAKAN |
| ALT-PBY-001 | Proses pembayaran multi-metode (tunai/QRIS manual/kartu/e-wallet) | BELUM DIKERJAKAN |
| ALT-PBY-002 | Split bill (satu pesanan, banyak baris metode bayar) | BELUM DIKERJAKAN |
| ALT-PBY-003 | Konfirmasi QRIS manual (rilis awal, sebelum integrasi gateway) | BELUM DIKERJAKAN |
| ALT-PBY-004 | Refund dengan approval supervisor (no hard-delete) | BELUM DIKERJAKAN |
| ALT-PBY-005 | Cetak & cetak ulang struk | BELUM DIKERJAKAN |

## Promo & Pelanggan/Keanggotaan

| ID | Requirement | Status |
|---|---|---|
| ALT-PRM-001 | CRUD promo + aturan syarat | BELUM DIKERJAKAN |
| ALT-PRM-002 | Kupon (umum/personal) dengan kuota pemakaian | BELUM DIKERJAKAN |
| ALT-PRM-003 | Validasi & penerapan promo ke pesanan (dry-run + commit) | BELUM DIKERJAKAN |
| ALT-PLG-001 | CRUD data pelanggan | BELUM DIKERJAKAN |
| ALT-PLG-002 | Program membership & tier | BELUM DIKERJAKAN |
| ALT-PLG-003 | Perolehan & penukaran poin (append-only) | BELUM DIKERJAKAN |

## Karyawan, Absensi & Keuangan

| ID | Requirement | Status |
|---|---|---|
| ALT-KRY-001 | CRUD karyawan & jabatan | BELUM DIKERJAKAN |
| ALT-KRY-002 | Jadwal shift & penugasan | BELUM DIKERJAKAN |
| ALT-ABS-001 | Presensi masuk/pulang (QR/PIN/GPS) | BELUM DIKERJAKAN |
| ALT-ABS-002 | Koreksi absensi manual supervisor (baris baru, bukan edit) | BELUM DIKERJAKAN |
| ALT-ABS-003 | Alur cuti/izin (ajukan -> setujui/tolak) | BELUM DIKERJAKAN |
| ALT-KEU-001 | Rekap kas harian per outlet | BELUM DIKERJAKAN |
| ALT-KEU-002 | Biaya operasional dengan alur approval | BELUM DIKERJAKAN |

## Analitik & UI Lintas Platform

| ID | Requirement | Status |
|---|---|---|
| ALT-ANL-001 | Read-model penjualan harian & per item | BELUM DIKERJAKAN |
| ALT-ANL-002 | Read-model stok kritis | BELUM DIKERJAKAN |
| ALT-ANL-003 | Read-model kinerja karyawan harian | BELUM DIKERJAKAN |
| ALT-ANL-004 | Job agregasi terjadwal/event-driven ke tabel RM_* | BELUM DIKERJAKAN |
| ALT-UIX-001 | Token desain terpakai konsisten di `packages/ui` | BELUM DIKERJAKAN |
| ALT-UIX-002 | Shell Capacitor (Android/iOS) membungkus apps/web | BELUM DIKERJAKAN |
| ALT-UIX-003 | Shell Tauri (Windows/macOS/Linux) membungkus apps/web | BELUM DIKERJAKAN |
| ALT-UIX-004 | Bridge native printer/laci kas/scanner (`packages/perangkat`) | BELUM DIKERJAKAN |

## Ringkasan

- Total requirement terdaftar: 55.
- Status `BELUM DIKERJAKAN`: 55 (100%).
- Status `DIKERJAKAN`/`SELESAI DEV`/`DIUJI`/`LULUS`: 0.

Dokumen ini wajib diperbarui setiap requirement berpindah status - lihat proses di
`docs/engineering/ENGINEERING-LOOP-PLAN.md`.
