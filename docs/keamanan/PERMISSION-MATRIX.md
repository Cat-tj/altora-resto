# Matriks Permission - Altora Resto

Status dokumen: **DRAF AWAL, DIPERBARUI (ALT-DEF-002)** (belum diimplementasikan
di `packages/otorisasi`). Peran dasar mengacu ke `docs/database/01-platform.md`
(`PERAN.kode`).

**Perubahan model (ALT-DEF-002):** `Peran.permissions` yang sebelumnya
disimpan sebagai `Json` (daftar string bebas `domain:aksi`) sekarang
digantikan model relasional ternormalisasi:

- `Izin` - katalog kode izin atomik, **unik global** (`@@unique([kode])`,
  bukan Json bebas). Kode memakai format `domain.aksi` (titik, bukan titik
  dua) - lihat daftar starter di bagian 1a di bawah dan seed literalnya di
  `prisma/seed/izin.seed.ts`.
- `PeranIzin` - tabel penghubung many-to-many `Peran` <-> `Izin`
  (`@@unique([peranId, izinId])`) - mapping Peran x Izin sekarang bisa
  divalidasi via foreign key (kode izin typo gagal di level DB) dan diquery
  lewat join, bukan parsing Json.
- `KeanggotaanPeran` - menetapkan `Peran` ke `KeanggotaanTenant` (bukan ke
  `Pengguna` global secara langsung - lihat ALT-DEF-001), sehingga satu
  pengguna bisa memiliki peran berbeda di tenant berbeda.
- `BatasIzin` - limit numerik per `Peran` (mis. maksimum diskon tanpa
  approval).
- `IzinSementara` - delegasi izin darurat/sementara per `KeanggotaanTenant`.
- `PermintaanPersetujuan` - rekaman generik permintaan approval supervisor
  saat `BatasIzin.wajibPersetujuanManajer`/`wajibPinSupervisor` terlampaui.

Tabel naratif di bagian 2 di bawah tetap menjadi sumber kebenaran *desain*
(siapa boleh apa), tetapi implementasinya sekarang adalah baris `PeranIzin`
konkret per tenant, bukan payload Json.

## 1a. Katalog kode Izin starter (seed)

Daftar kode `Izin.kode` berikut adalah starter set yang di-seed lewat
`prisma/seed/izin.seed.ts` (32 kode), dikelompokkan per `domain`:

| Domain | Kode Izin |
|---|---|
| transaksi | `transaksi.buat`, `transaksi.ubah-harga`, `transaksi.diskon`, `transaksi.batalkan-item`, `transaksi.batalkan`, `transaksi.retur`, `transaksi.koreksi-pembayaran` |
| giliran | `giliran.buka`, `giliran.tutup`, `giliran.tutup-paksa` |
| persediaan | `persediaan.lihat`, `persediaan.sesuaikan`, `persediaan.opname`, `persediaan.transfer` |
| pembelian | `pembelian.buat`, `pembelian.setujui`, `pembelian.terima` |
| promo | `promo.lihat`, `promo.kelola` |
| anggota | `anggota.lihat`, `anggota.kelola`, `anggota.tukar-poin` |
| karyawan | `karyawan.lihat`, `karyawan.kelola` |
| absensi | `absensi.koreksi`, `absensi.setujui` |
| laporan | `laporan.operasional`, `laporan.keuangan` |
| qris | `qris.kelola` |
| pengaturan | `pengaturan.kelola` |
| izin | `izin.kelola` |
| audit | `audit.lihat` |
| data | `data.ekspor` |

## 1. Peran dasar

| Kode Peran | Nama | Cakupan |
|---|---|---|
| `OWNER` | Pemilik | Seluruh tenant, semua outlet, semua fitur (termasuk keuangan & pengaturan tenant). |
| `MANAJER` | Manajer Outlet | Satu/lebih outlet yang ditugaskan (`PENGGUNA_OUTLET`); operasional penuh, approval, laporan. |
| `SUPERVISOR` | Supervisor Shift | Approval level shift (buka ulang giliran kasir, refund, batal pesanan lanjut). |
| `KASIR` | Kasir | Transaksi pembayaran & giliran kasir di outlet tempat bertugas. |
| `PELAYAN` | Pelayan | Buat/kelola pesanan, kelola meja, tidak menyentuh pembayaran/keuangan. |
| `DAPUR` | Staf Dapur | Hanya KDS (tiket dapur), read-contract pesanan. |
| `GUDANG` | Staf Gudang | Persediaan, stok opname, penerimaan barang. |
| `PEMBELIAN` | Staf Pembelian | Purchase order & supplier. |
| `HRD` | Staf Kepegawaian | Karyawan, shift, absensi, cuti/izin. |
| `PELANGGAN` | Pelanggan (portal publik) | Hanya endpoint publik `/pesan/{token}` & profil membership sendiri. |

Permission sekarang disimpan sebagai baris `PeranIzin` (join `Peran` <-> `Izin`),
BUKAN lagi `Json` di `Peran.permissions` (lihat perubahan model ALT-DEF-002 di
atas). Tabel di bawah adalah sumber kebenaran naratif; implementasi konkret
adalah baris `PeranIzin` per tenant yang mengaitkan `Peran.id` ke `Izin.kode`
pada bagian 1a.

Legenda: `M` = boleh (Miliki akses penuh), `B` = boleh dengan approval Bertingkat
(butuh supervisor/manajer ke atas), `L` = hanya Lihat (read-only), `-` = tidak boleh.

## 2. Matriks domain x peran

| Domain / Aksi | OWNER | MANAJER | SUPERVISOR | KASIR | PELAYAN | DAPUR | GUDANG | PEMBELIAN | HRD |
|---|---|---|---|---|---|---|---|---|---|
| **Platform** |
| Kelola tenant & pengaturan | M | - | - | - | - | - | - | - | - |
| Kelola outlet | M | B | - | - | - | - | - | - | - |
| Kelola pengguna & peran | M | B | - | - | - | - | - | - | - |
| Lihat audit log | M | L | - | - | - | - | - | - | - |
| **Menu & Katalog** |
| Kelola kategori/item menu | M | M | L | L | L | L | - | - | - |
| Kelola harga per outlet | M | B | - | - | - | - | - | - | - |
| Kelola resep (BOM) | M | M | L | - | - | L | L | - | - |
| **Persediaan** |
| Lihat stok bahan | M | M | M | - | - | L | M | M | - |
| Catat mutasi stok manual | M | M | B | - | - | - | M | - | - |
| Kelola stok opname | M | M | B | - | - | - | M | - | - |
| **Supplier & Pembelian** |
| Kelola supplier | M | M | - | - | - | - | - | M | - |
| Buat/ajukan PO | M | M | - | - | - | - | L | M | - |
| Setujui PO | M | M | - | - | - | - | - | - | - |
| Catat penerimaan barang | M | M | - | - | - | - | M | M | - |
| **Meja & Reservasi** |
| Kelola meja & area | M | M | B | L | M | - | - | - | - |
| Kelola reservasi | M | M | M | L | M | - | - | - | - |
| **Pesanan** |
| Buat pesanan | M | M | M | M | M | - | - | - | - |
| Ubah/batalkan pesanan (belum diproses dapur) | M | M | M | M | M | - | - | - | - |
| Batalkan pesanan (sudah diproses dapur) | M | B | B | - | - | - | - | - | - |
| **Dapur (KDS)** |
| Kelola tiket dapur | M | M | L | - | L | M | - | - | - |
| **Kasir & Pembayaran** |
| Buka/tutup giliran kasir | M | B | B | M | - | - | - | - | - |
| Verifikasi selisih kas | M | M | M | - | - | - | - | - | - |
| Proses pembayaran (tunai/QRIS manual/kartu) | M | M | M | M | - | - | - | - | - |
| Refund pembayaran | M | B | B | - | - | - | - | - | - |
| Cetak ulang struk | M | M | M | M | - | - | - | - | - |
| **Promo** |
| Kelola promo & kupon | M | B | - | - | - | - | - | - | - |
| Terapkan promo ke pesanan | M | M | M | M | M | - | - | - | - |
| **Pelanggan & Keanggotaan** |
| Kelola data pelanggan | M | M | M | M | M | - | - | - | - |
| Kelola tier & poin manual | M | B | - | - | - | - | - | - | - |
| **Karyawan & Absensi** |
| Kelola data karyawan & jabatan | M | B | - | - | - | - | - | - | M |
| Kelola jadwal shift | M | M | L | - | - | - | - | - | M |
| Presensi diri sendiri | M | M | M | M | M | M | M | M | M |
| Koreksi absensi (manual supervisor) | M | M | M | - | - | - | - | - | M |
| Setujui cuti/izin | M | M | B | - | - | - | - | - | M |
| **Keuangan Internal** |
| Lihat rekap kas harian | M | M | L | L | - | - | - | - | - |
| Verifikasi rekap kas | M | M | B | - | - | - | - | - | - |
| Kelola biaya operasional | M | B | - | - | - | - | - | - | - |
| Setujui biaya operasional | M | M | - | - | - | - | - | - | - |
| **Analitik** |
| Lihat dashboard analitik outlet sendiri | M | M | M | L | - | - | L | L | L |
| Lihat dashboard analitik semua outlet | M | - | - | - | - | - | - | - | - |

## 3. Aturan approval bertingkat (kolom `B`)

- **Buka ulang giliran kasir** setelah `DITUTUP_MENUNGGU_VERIFIKASI`: wajib approval
  `SUPERVISOR` ke atas (lihat `docs/arsitektur/STATE-MACHINES.md` #3).
- **Batalkan pesanan** yang statusnya sudah `DIPROSES_DAPUR`: wajib approval
  `SUPERVISOR` ke atas (state machine Pesanan).
- **Refund pembayaran**: wajib approval `SUPERVISOR` ke atas, dicatat di
  `PembayaranRefund.disetujuiOlehId`.
- **Batalkan sisa PO** setelah `DITERIMA_SEBAGIAN`: wajib approval `MANAJER` ke atas.
- **Verifikasi rekap kas harian**: wajib `SUPERVISOR` ke atas, dicatat di
  `RekapKasHarian.diverifikasiOlehId`.
- Peran `MANAJER` yang ditandai `B` pada baris "kelola X" berarti manajer boleh
  melakukannya untuk outlet yang ditugaskan padanya saja (`PENGGUNA_OUTLET`), bukan
  lintas outlet tanpa penugasan eksplisit.

## 4. Batasan cakupan (scoping)

- Semua permission di atas implisit di-scope ke `tenantId` pengguna yang login; tidak
  ada permission yang berlaku lintas tenant.
- Untuk peran selain `OWNER`, permission juga di-scope ke daftar `outletId` pada
  `PENGGUNA_OUTLET` milik pengguna tersebut.
- Endpoint publik `/pesan/{token}` (pemesanan lewat QR meja) tidak memakai peran di
  atas - ia memakai token sesi meja (`SesiMejaQr.token`), bukan akun pengguna berperan.

## 5. Status implementasi

Matriks ini adalah rancangan; enforcement teknis (middleware permission check di
`packages/otorisasi`, guard di setiap endpoint API) berstatus **BELUM DIKERJAKAN** -
lihat `docs/engineering/MASTER-CHECKLIST.md` dan `docs/engineering/TRACEABILITY-MATRIX.md`.

Model data ternormalisasi (`Izin`/`Peran`/`PeranIzin`/`KeanggotaanPeran`/
`BatasIzin`/`IzinSementara`/`PermintaanPersetujuan`) sudah ada di
`prisma/schema/schema.prisma` sejak ALT-DEF-002 (lihat
`docs/engineering/DECISION-LOG.md` ADR-012), berstatus `SIAP_DIVERIFIKASI` di
`docs/engineering/DEFECT-LEDGER.md` - skema dan seed literal sudah ada, tetapi
belum ada migrasi nyata ke database (`ALT-DEF-029`) dan belum ada middleware
enforcement (`packages/otorisasi` masih scaffold kosong).
