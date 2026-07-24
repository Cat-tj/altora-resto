# Defect Ledger - Altora Resto

Status dokumen: **DRAF AUDIT ARSITEKTUR (correction loop)**.

Ledger ini berisi temuan audit arsitektur terhadap `prisma/schema/schema.prisma` dan
dokumen desain terkait (`docs/database/*.md`, `docs/api/API-CONTRACT.md`,
`docs/keamanan/PERMISSION-MATRIX.md`, `docs/engineering/MASTER-CHECKLIST.md`,
`docs/engineering/TRACEABILITY-MATRIX.md`). Belum ada kode aplikasi yang
diimplementasikan atau diuji pada titik penulisan dokumen ini - seluruh temuan di bawah
adalah defect desain/skema, bukan hasil pengujian runtime. Status semua defect masih
`PERLU_DIPERBAIKI`; perbaikan akan dilakukan pada correction pass berikutnya dan status
akan diperbarui setelah perbaikan disertai bukti (referensi ke
`docs/engineering/RELEASE-EVIDENCE.md`), bukan diklaim selesai di sini.

## Format pencatatan defect

| ID | Severity | Requirement ID | Deskripsi | Status | Resolusi |
|---|---|---|---|---|---|
| DEF-001 | KRITIS | ALT-PLT-001, ALT-SEC-001 | `Pengguna.tenantId` langsung di model, tidak ada `KeanggotaanTenant`/`KeanggotaanOutlet` - satu pengguna terkunci ke satu tenant, tidak bisa jadi anggota banyak tenant. File: `prisma/schema/schema.prisma` (model `Pengguna`, `PenggunaOutlet`). | PERLU_DIPERBAIKI | - |
| DEF-002 | KRITIS | ALT-PLT-009, ALT-PLT-010 | `Peran.permissions Json` sebagai sumber kebenaran, bukan tabel `Izin`/`PeranIzin` ternormalisasi - permission tidak bisa diquery/constraint dengan baik. File: schema (`Peran`). | PERLU_DIPERBAIKI | - |
| DEF-003 | TINGGI | ALT-PLT-013 | `Pengguna.pinHash` adalah satu PIN global per pengguna, bukan PIN per outlet/perangkat. File: schema (`Pengguna`). | PERLU_DIPERBAIKI | - |
| DEF-004 | KRITIS | ALT-QRS-001, ALT-QRS-010 | Enum `KodeMetodeBayar` memuat `KARTU_DEBIT`, `KARTU_KREDIT`, `EWALLET` yang di luar scope produk (Altora tidak terhubung ke payment gateway/bank/e-wallet). File: schema (`KodeMetodeBayar`), `docs/api/API-CONTRACT.md`, `docs/database/09-pembayaran-kasir.md`. | PERLU_DIPERBAIKI | - |
| DEF-005 | TINGGI | ALT-KSR-002, ALT-KSR-004 | `Pembayaran` tidak dipisah dari konsep `AlokasiPembayaran` - tidak bisa memodelkan split bill / satu pesanan banyak pembayaran / pembayaran sebagian dengan bersih. File: schema (`Pembayaran`). | PERLU_DIPERBAIKI | - |
| DEF-006 | KRITIS | ALT-DPR-003 | `TiketDapur.pesananId @unique` membatasi satu pesanan hanya bisa punya satu tiket dapur - KDS multi-stasiun (kopi ke bar, nasi ke dapur, dessert ke stasiun lain) tidak mungkin. File: schema (`TiketDapur`). | PERLU_DIPERBAIKI | - |
| DEF-007 | KRITIS | ALT-PRM-008 | `PromoPemakaian.pesananId @unique` - satu pesanan tidak bisa memakai lebih dari satu promo, stacking promo tidak mungkin. File: schema (`PromoPemakaian`). | PERLU_DIPERBAIKI | - |
| DEF-008 | TINGGI | ALT-RSP-001, ALT-RSP-002, ALT-RSP-003, ALT-RSP-005 | `Resep` 1:1 dengan `ItemMenu` (`itemMenuId @unique`), tidak ada versi resep (`VersiResep`), tidak ada resep per varian, tidak ada subresep/bahan setengah jadi. File: schema (`Resep`, `ResepBahan`). | PERLU_DIPERBAIKI | - |
| DEF-009 | TINGGI | ALT-PLT-013, ALT-PLT-014, ALT-SEC-005 | Model autentikasi/sesi minim: tidak ada reset password/token reset, tidak ada percobaan login & lockout, tidak ada rotasi/pencabutan sesi granular per perangkat, tidak ada audit login eksplisit. File: schema (`Sesi`). | PERLU_DIPERBAIKI | - |
| DEF-010 | KRITIS | ALT-QRS-001 | Tidak ada model `KonfigurasiQris` sama sekali di schema - hanya ada `QrisKonfirmasiManual` (konfirmasi), tidak ada konfigurasi QRIS statis per outlet (payload terenkripsi, nama merchant, dsb). File: schema. | PERLU_DIPERBAIKI | - |
| DEF-011 | TINGGI | ALT-PES-010, ALT-PES-011, ALT-PES-013, ALT-PES-014 | State machine `Pesanan` dangkal (7 status: BARU, DIKONFIRMASI, DIPROSES_DAPUR, SIAP_DISAJIKAN, DISAJIKAN, DIBAYAR, DIBATALKAN) - tidak sesuai spec (14 status termasuk DRAF/DIKIRIM/MENUNGGU_PERSETUJUAN/DITOLAK/MENUNGGU_PEMBAYARAN/DIRETUR dst). `PesananRiwayatStatus.statusSebelumnya/statusBaru` bertipe String bebas, bukan enum. Tidak ada `PesananPerubahan`/`PesananAlasanPenolakan`/`PesananPembatalan`. File: schema (`Pesanan`, `PesananRiwayatStatus`). | PERLU_DIPERBAIKI | - |
| DEF-012 | TINGGI | ALT-PES-008, ALT-PES-009 | `ItemPesanan` tidak menyimpan snapshot nama item/varian (hanya `hargaSatuan`) - jika nama menu/varian diubah di kemudian hari, histori transaksi lama bisa menampilkan nama yang salah/berubah. File: schema (`ItemPesanan`). | PERLU_DIPERBAIKI | - |
| DEF-013 | TINGGI | ALT-PSD-005, ALT-PSD-008, ALT-PSD-010, ALT-PSD-012, ALT-PSD-016, ALT-PSD-020 | Domain persediaan tidak lengkap: tidak ada `LokasiStok`, `BatchStok`, `ReservasiStok`, `TransferStok`/baris, `CatatanWaste`/`AlasanWaste`, `KebijakanPemesananUlang`. Enum `JenisMutasiStok` tidak mencakup WASTE/PRODUKSI_KELUAR/PRODUKSI_MASUK/PEMAKAIAN_INTERNAL/PEMAKAIAN_RESEP secara eksplisit (memakai `KELUAR_PENJUALAN` generik). File: schema (domain persediaan). | PERLU_DIPERBAIKI | - |
| DEF-014 | KRITIS | ALT-SEC-002 | Hampir semua model yang punya `tenantId`+`outletId` (atau child-of-outlet) tidak punya composite constraint yang menjamin outlet tsb benar-benar milik tenant yang sama - risiko data tenant tercampur (mis. `Pesanan.tenantId` beda dengan `Pesanan.outlet.tenantId`). File: schema (lintas domain - audit semua model). | PERLU_DIPERBAIKI | - |
| DEF-015 | KRITIS | ALT-PLT-018, ALT-PLT-019, ALT-PLT-020 | Tidak ada model `IdempotencyKey`, `DomainOutboxEvent`, atau `Notification` - padahal endpoint kritis (checkout, pembayaran, refund, dsb) wajib idempotent dan realtime event butuh outbox pattern. File: schema. | PERLU_DIPERBAIKI | - |
| DEF-016 | TINGGI | ALT-MJ-008, ALT-MJ-010, ALT-SEC-006 | `SesiMejaQr` mencampur konsep token QR meja (semi-permanen sampai dicabut) dengan sesi kunjungan pelanggan (per kedatangan tamu); token disimpan mentah (`token String @unique`) bukan hash. File: schema (`SesiMejaQr`). | PERLU_DIPERBAIKI | - |
| DEF-017 | SEDANG | ALT-MBR-007, ALT-MBR-011 | Poin/saldo pelanggan (`Keanggotaan.poinAktif`/`poinKumulatif`) tidak jelas didokumentasikan sebagai cache dari ledger; tidak ada `LedgerSaldoToko` (saldo toko) sama sekali di schema. File: schema (`Keanggotaan`, `PoinRiwayat`). | PERLU_DIPERBAIKI | - |
| DEF-018 | SEDANG | ALT-HR-005, ALT-HR-014 | `Karyawan` hanya terikat ke satu outlet (`outletUtamaId`), tidak ada relasi many-to-many `KaryawanOutlet`; tidak ada model koreksi absensi sebagai record baru dengan approval (perubahan absensi langsung menimpa data asli). File: schema (`Karyawan`, `Absensi`). | PERLU_DIPERBAIKI | - |
| DEF-019 | KRITIS | - | `docs/engineering/MASTER-CHECKLIST.md` hanya berisi sekitar 55 requirement, banyak yang granularitasnya terlalu besar (satu requirement mencakup "seluruh sistem X"), tidak memenuhi target minimal 180 requirement dari master prompt. File: `docs/engineering/MASTER-CHECKLIST.md`. | PERLU_DIPERBAIKI | - |
| DEF-020 | TINGGI | - | `docs/engineering/TRACEABILITY-MATRIX.md` tidak sinkron dengan schema/API/permission saat ini (hanya ~82 baris, sebagian besar placeholder). File: `docs/engineering/TRACEABILITY-MATRIX.md`. | PERLU_DIPERBAIKI | - |
| DEF-021 | SEDANG | ALT-MJ-001, ALT-MJ-013 | Tidak ada model `Lantai` (floor) di atas `AreaMeja` (spec: Outlet -> Lantai -> Area -> Meja), tidak ada `WaitingListEntry` (daftar tunggu) di domain meja/reservasi. File: schema (domain meja). | PERLU_DIPERBAIKI | - |
| DEF-022 | SEDANG | - | `docs/api/API-CONTRACT.md` tidak menyebutkan requirement `Idempotency-Key` untuk endpoint kritis (checkout, pembayaran, konfirmasi QRIS, refund, penerimaan barang, posting stok, posting opname, transfer stok, penukaran poin, penerapan promo). File: `docs/api/API-CONTRACT.md`. | PERLU_DIPERBAIKI | - |

## Aturan pengisian

1. Setiap defect yang ditemukan lewat audit/pengujian manual/otomatis WAJIB dicatat di
   sini sebelum diperbaiki, dengan Requirement ID terkait dari `MASTER-CHECKLIST.md`
   bila relevan (beberapa temuan bersifat lintas-dokumen dan tidak memiliki satu
   Requirement ID tunggal - ditandai `-`).
2. Status `SELESAI`/`DITUTUP` hanya boleh diberikan setelah ada bukti verifikasi ulang -
   dicatat sebagai referensi ke `docs/engineering/RELEASE-EVIDENCE.md`. Dokumen ini
   tidak boleh diisi dengan status selesai tanpa bukti uji nyata (dilarang memfabrikasi
   hasil tes atau status lulus).
3. Severity memakai skala: `KRITIS`, `TINGGI`, `SEDANG`, `RENDAH`.
4. Status memakai nilai: `PERLU_DIPERBAIKI`, `SEDANG_DIPERBAIKI`, `SIAP_VERIFIKASI`,
   `SELESAI`, `TIDAK_DAPAT_DIREPRODUKSI`. Seluruh 22 defect di atas berstatus
   `PERLU_DIPERBAIKI` karena perbaikan belum dilakukan pada correction pass ini -
   perbaikan dan pembaruan status akan dilakukan pada pass berikutnya.
