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
`prisma/seed/izin.seed.ts` (33 kode dasar + `akun.reset-pin` pada batch
ALT-DEF-003/ALT-DEF-013 + 9 kode `pesanan.*` baru pada batch ALT-DEF-005/
ALT-DEF-016 + 11 kode `dapur.*` baru pada batch ALT-DEF-006 + 8 kode
`pembayaran.*` dan 4 kode `kasir.*` baru serta 3 kode `qris.*` tambahan pada
batch ALT-DEF-004/ALT-DEF-014/ALT-DEF-015 = **69 kode** - lihat catatan di bawah
tabel), dikelompokkan per `domain`:

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
| qris | `qris.konfigurasi.kelola`, `qris.validasi`, `qris.generate`, `qris.audit.lihat` |
| pengaturan | `pengaturan.kelola` |
| izin | `izin.kelola` |
| audit | `audit.lihat` |
| data | `data.ekspor` |
| akun | `akun.reset-pin` |
| pesanan | `pesanan.buat`, `pesanan.item.tambah`, `pesanan.ubah`, `pesanan.terima`, `pesanan.tolak`, `pesanan.status.ubah`, `pesanan.batalkan`, `pesanan.retur.kelola`, `pesanan.riwayat.lihat` |
| dapur | `dapur.stasiun.kelola`, `dapur.routing.kelola`, `dapur.tiket.buat-otomatis`, `dapur.tiket.lihat`, `dapur.tiket.prioritas`, `dapur.tiket.tahan`, `dapur.baris.siap`, `dapur.tiket.siap`, `dapur.tiket.ambil`, `dapur.cetak`, `dapur.cetak-ulang` |
| pembayaran | `pembayaran.buat`, `pembayaran.tahan`, `pembayaran.alokasi.kelola`, `pembayaran.qris.konfirmasi-manual`, `pembayaran.qris.koreksi`, `pembayaran.refund`, `pembayaran.struk.cetak`, `pembayaran.struk.cetak-ulang` |
| kasir | `kasir.giliran.kelola`, `kasir.rekonsiliasi.lihat`, `kasir.giliran.verifikasi`, `kasir.giliran.buka-kembali` |
| resep | `resep.kelola`, `resep.versi.kelola`, `resep.varian.kelola`, `resep.modifier.kelola`, `resep.subresep.kelola`, `resep.penyusutan.kelola`, `resep.konversi.kelola`, `resep.produksi.kelola`, `resep.hpp.lihat`, `resep.pemakaian.reversal` |

**Kode baru batch ALT-DEF-004/ALT-DEF-014/ALT-DEF-015 (`domain pembayaran`,
`kasir`, `qris`):** diperiksa dulu terhadap katalog yang sudah ada sebelum
ditambahkan, mengikuti disiplin batch-batch sebelumnya.

- **8 kode `pembayaran.*`** dan **4 kode `kasir.*`** genuinely hilang -
  `MASTER-CHECKLIST.md` sudah mereferensikan seluruhnya sejak sebelumnya
  (`ALT-KSR-001` s.d. `ALT-KSR-013`, `ALT-QRS-007`, `ALT-QRS-009`) tetapi tidak
  satu pun pernah ada di seed literal.
- **`qris.kelola` DIGANTI NAMA menjadi `qris.konfigurasi.kelola`** - bukan kode
  baru. Ditemukan bahwa seed/matriks memakai `qris.kelola` sementara
  `MASTER-CHECKLIST.md` (`ALT-QRS-001`/`002`/`005`) konsisten memakai
  `qris.konfigurasi.kelola`: dua nama untuk satu izin yang sama. Nama versi
  checklist yang dipertahankan karena ia yang dirujuk requirement. Tidak ada
  data produksi terdampak (seed belum pernah dijalankan). Dicatat sebagai
  defect baru **ALT-DEF-034**.
- **3 kode `qris.*` tambahan** (`qris.validasi`, `qris.generate`,
  `qris.audit.lihat`) direferensikan langsung oleh `ALT-QRS-003`/`004`,
  `ALT-QRS-006`, dan `ALT-QRS-008`.
- **Koreksi/pembatalan pembayaran SENGAJA TIDAK mendapat kode baru** - dipakai
  `transaksi.koreksi-pembayaran` dan `transaksi.batalkan` yang **sudah ada**.
  Menambahkan `pembayaran.koreksi`/`pembayaran.batalkan` akan menduplikasi
  makna izin yang sama persis dengan nama berbeda - persis kesalahan yang baru
  saja ditemukan pada `qris.kelola` di atas.
- **`keamanan.qris.enkripsi` SENGAJA TIDAK ditambahkan** meskipun
  `MASTER-CHECKLIST.md` `ALT-SEC-007` mencantumkannya di kolom Permission.
  Enkripsi payload at rest bukan keputusan otorisasi yang dipegang seorang
  aktor - ia properti penyimpanan yang selalu berlaku untuk semua penulisan,
  tanpa pengecualian dan tanpa "aktor yang boleh melewatinya". Menjadikannya
  kode izin justru menyiratkan ada peran yang boleh menyimpan payload tanpa
  enkripsi. Diusulkan agar kolom Permission `ALT-SEC-007` di
  `MASTER-CHECKLIST.md` diubah menjadi `-`; dicatat sebagai bagian dari
  **ALT-DEF-034**.

**Kode baru batch ALT-DEF-007 (`domain resep`):** diperiksa dulu terhadap
katalog yang sudah ada - **tidak satu pun** kode `resep.*` pernah ada di seed
literal (`grep 'resep' prisma/seed/izin.seed.ts` sebelum perubahan hanya
menemukan kata "resep" di dalam sebuah komentar, bukan sebagai `kode:`).
Seluruh 10 kode di atas **genuinely direferensikan** `MASTER-CHECKLIST.md`
`ALT-RSP-001` s.d. `ALT-RSP-013` - tidak ada satu pun yang diciptakan
spekulatif untuk batch ini.

- **`resep.pemakaian.otomatis` (`ALT-RSP-011`) SENGAJA TIDAK ditambahkan**
  meskipun `MASTER-CHECKLIST.md` mencantumkannya di kolom Permission. Kolom
  Aktor requirement tersebut adalah **"sistem"** dan endpoint-nya "internal
  (event pesanan selesai)": pemotongan stok otomatis tidak pernah dipegang
  seorang aktor manusia yang bisa diberi/dicabut izinnya. Menjadikannya kode
  izin justru menyiratkan ada peran yang boleh menyelesaikan pesanan **tanpa**
  memotong stok - yaitu jalur penyimpangan yang tidak boleh ada. Alasan yang
  sama persis dengan `keamanan.qris.enkripsi` pada batch sebelumnya. Diusulkan
  kolom Permission `ALT-RSP-011` diubah menjadi `-` (sistem); dicatat sebagai
  tambahan **ALT-DEF-034**, bukan defect baru.
- **`resep.pemakaian.reversal` (`ALT-RSP-013`) TETAP ditambahkan** meskipun
  requirement-nya juga "internal (event pesanan dibatalkan)" - berbeda dari
  poin di atas, membalik pemotongan stok adalah aksi yang di praktik memang
  bisa dipicu manusia (pembatalan pesanan yang sudah diproses) dan yang wajib
  dibatasi. Perbedaan ini disengaja, bukan inkonsistensi.
- **Drift penamaan tambahan (masuk ALT-DEF-034, bukan defect baru):** tiga kode
  yang direferensikan checklist mengasumsikan model yang **tidak dibuat**
  batch ini - `resep.varian.kelola` (checklist mengasumsikan model
  `ResepVarian`; ADR-022 Keputusan 2 memodelkannya sebagai `Resep` dengan
  sasaran `varianMenuId`), `resep.subresep.kelola` (mengasumsikan model
  `Subresep`; ADR-022 Keputusan 1 memodelkannya sebagai `Bahan` berjenis
  `BAHAN_SETENGAH_JADI`), dan `resep.penyusutan.kelola` (mengasumsikan model
  `FaktorPenyusutan`; kini kolom `VersiResep.penyusutanPersen`). Ketiganya
  **tetap ditambahkan dengan nama checklist** karena requirement yang
  merujuknya nyata dan aksinya nyata - hanya entitas penyimpannya yang
  berbeda dari asumsi checklist. Kolom "Entitas" `ALT-RSP-003`/`005`/`007`
  di `MASTER-CHECKLIST.md` yang perlu dikoreksi, bukan kode izinnya.

**Kode baru batch ALT-DEF-006 (`domain dapur`):** diperiksa dulu terhadap
katalog yang sudah ada - **tidak satu pun** kode `dapur.*` pernah ada di seed
literal ini (`grep dapur prisma/seed/izin.seed.ts` sebelum perubahan hanya
menemukan kata "dapur" di dalam *deskripsi* `pesanan.status.ubah`, bukan
sebagai `kode`), sementara `MASTER-CHECKLIST.md` sudah mereferensikan seluruh
11 kode ini sejak sebelumnya (`ALT-DPR-001` s.d. `ALT-DPR-015`) - jadi
genuinely hilang, bukan duplikat. Pola persis sama dengan lubang `pesanan.*`
yang ditemukan pada batch ALT-DEF-005/ALT-DEF-016. `dapur.routing.kelola`
adalah kode yang secara langsung dibutuhkan oleh model baru
`AturanRoutingDapur` pada batch ini (`ALT-DPR-002`);
`dapur.tiket.buat-otomatis` adalah izin **internal** (dipakai oleh event
konfirmasi pesanan yang membuat tiket, bukan oleh peran manusia mana pun -
karena itu ia TIDAK muncul sebagai baris di matriks bagian 2).
`dapur.tiket.tahan` dipisah dari `dapur.tiket.lihat` karena hold menghentikan
timer SLA (`ALT-DPR-007`) dan karenanya dibatasi lebih ketat daripada aksi
KDS harian biasa - lihat tabel transisi lengkap di
`docs/arsitektur/STATE-MACHINES.md` bagian "Dapur (Tiket Dapur)" dan ADR-018
di `docs/engineering/DECISION-LOG.md`.

**Kode baru batch ALT-DEF-005/ALT-DEF-016 (`domain pesanan`):** `MASTER-CHECKLIST.md`
sudah mereferensikan seluruh kode `pesanan.*` ini sejak sebelumnya
(`ALT-PES-001` s.d. `ALT-PES-018`), tetapi belum pernah ditambahkan ke katalog
`Izin`/seed literal - diperiksa dan dipastikan genuinely belum ada (tidak ada
kode `transaksi.*`/lainnya yang sudah menaungi transisi status pesanan) sebelum
ditambahkan sebagai 9 kode baru. `pesanan.terima`/`pesanan.tolak` sengaja
dipisah dari `pesanan.status.ubah` (generik) karena keduanya adalah keputusan
approval/rejection eksplisit atas pesanan pelanggan (kanal QR) yang secara
bisnis berbeda dari transisi status internal biasa (kirim-dapur, tandai
disajikan) - lihat tabel transisi lengkap di `docs/arsitektur/STATE-MACHINES.md`
bagian "Pesanan" dan ADR-017 di `docs/engineering/DECISION-LOG.md`.

**Kode baru batch ALT-DEF-003/ALT-DEF-013 (`domain akun`):** diperiksa dulu
terhadap katalog yang sudah ada sebelum menambah - `karyawan.kelola` HANYA
mencakup data kepegawaian (jabatan, nomor induk, tanggal bergabung, lihat
`docs/database/12-karyawan-absensi.md`), BUKAN kredensial autentikasi (PIN),
sehingga genuinely tidak ada kode izin yang sudah menaungi "reset PIN
karyawan lain". Satu kode baru ditambahkan:

- `akun.reset-pin` - mereset `PinOutlet` milik `KeanggotaanTenant` lain (mis.
  oleh pemilik/manajer outlet saat staf lupa PIN), dipakai oleh
  `POST /api/v1/karyawan/{keanggotaanTenantId}/pin/reset` (lihat
  `docs/api/API-CONTRACT.md`). Ganti PIN milik sendiri (self-service, `POST
  /api/v1/auth/pin/ganti`) TIDAK butuh izin ini - itu selalu boleh dilakukan
  pengguna terhadap `PinOutlet` miliknya sendiri.

Mencabut satu/seluruh sesi (`POST /api/v1/auth/sesi/{id}/cabut`, `.../sesi/
cabut-semua`) di batch ini SENGAJA dibatasi ke sesi MILIK SENDIRI (lihat
`docs/api/API-CONTRACT.md` bagian 2) - tidak butuh izin baru karena setiap
pengguna terautentikasi selalu boleh mencabut sesinya sendiri. Endpoint
"cabut sesi milik pengguna lain" (butuh izin terpisah) tidak diminta di
batch ini dan tidak ditambahkan di sini.

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
| Reset PIN karyawan lain (`akun.reset-pin`) | M | B | - | - | - | - | - | - | - |
| Kelola outlet | M | B | - | - | - | - | - | - | - |
| Kelola pengguna & peran | M | B | - | - | - | - | - | - | - |
| Lihat audit log | M | L | - | - | - | - | - | - | - |
| **Menu & Katalog** |
| Kelola kategori/item menu | M | M | L | L | L | L | - | - | - |
| Kelola harga per outlet | M | B | - | - | - | - | - | - | - |
| Kelola resep (BOM) | M | M | L | - | - | L | L | - | - |
| Kelola versi resep & aktivasi (ALT-DEF-007) | M | M | - | - | - | L | - | - | - |
| Jalankan proses produksi & batch (ALT-DEF-007) | M | M | L | - | - | L | L | - | - |
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
| Buat pesanan (`pesanan.buat`) | M | M | M | M | M | - | - | - | - |
| Tambah/ubah item pesanan (`pesanan.item.tambah`, `pesanan.ubah`) | M | M | M | M | M | - | - | - | - |
| Terima/tolak pesanan QR pelanggan (`pesanan.terima`, `pesanan.tolak`) | M | M | M | M | M | - | - | - | - |
| Transisi status generik: konfirmasi/kirim-dapur/disajikan/selesai (`pesanan.status.ubah`) | M | M | M | M | M | - | - | - | - |
| Batalkan pesanan (status DRAF s.d. MENUNGGU_PEMBAYARAN) | M | M | M | M | M | - | - | - | - |
| Batalkan pesanan (status DIKONFIRMASI/DIKIRIM_KE_DAPUR/SEDANG_DISIAPKAN) | M | B | B | - | - | - | - | - | - |
| Retur pesanan (SELESAI -> DIRETUR, `pesanan.retur.kelola`) | M | B | B | - | - | - | - | - | - |
| **Dapur (KDS)** |
| Lihat papan/antrian tiket dapur (`dapur.tiket.lihat`) | M | M | L | - | L | M | - | - | - |
| Terima/mulai tiket, tandai baris & tiket siap (`dapur.baris.siap`, `dapur.tiket.siap`) | M | M | L | - | L | M | - | - | - |
| Tahan/lepas-tahan tiket (`dapur.tiket.tahan`) | M | M | M | - | - | M | - | - | - |
| Tandai tiket diambil/disajikan (`dapur.tiket.ambil`) | M | M | M | - | M | M | - | - | - |
| Kelola stasiun dapur (`dapur.stasiun.kelola`) | M | M | L | - | - | L | - | - | - |
| Kelola aturan routing item -> stasiun (`dapur.routing.kelola`) | M | M | L | - | - | L | - | - | - |
| **Kasir & Pembayaran** |
| Buka/tutup giliran kasir (`kasir.giliran.kelola`) | M | B | B | M | - | - | - | - | - |
| Lihat rekonsiliasi kas giliran (`kasir.rekonsiliasi.lihat`) | M | M | M | M | - | - | - | - | - |
| Verifikasi selisih kas (`kasir.giliran.verifikasi`) | M | M | M | - | - | - | - | - | - |
| Buka ulang giliran kasir (`kasir.giliran.buka-kembali`) | M | M | B | - | - | - | - | - | - |
| Proses pembayaran tunai/saldo toko (`pembayaran.buat`) | M | M | M | M | - | - | - | - | - |
| Tahan/parkir transaksi (`pembayaran.tahan`) | M | M | M | M | - | - | - | - | - |
| Kelola alokasi pembayaran / split bill (`pembayaran.alokasi.kelola`) | M | M | M | M | - | - | - | - | - |
| **Konfirmasi manual pembayaran QRIS** (`pembayaran.qris.konfirmasi-manual`) | M | M | M | M | - | - | - | - | - |
| Koreksi konfirmasi QRIS (`pembayaran.qris.koreksi`) | M | B | B | - | - | - | - | - | - |
| Koreksi nominal pembayaran (`transaksi.koreksi-pembayaran`) | M | B | B | - | - | - | - | - | - |
| Refund pembayaran (`pembayaran.refund`) | M | B | B | - | - | - | - | - | - |
| Cetak struk / cetak ulang (`pembayaran.struk.cetak`, `pembayaran.struk.cetak-ulang`) | M | M | M | M | - | - | - | - | - |
| **QRIS (konfigurasi outlet)** |
| Kelola konfigurasi QRIS outlet (`qris.konfigurasi.kelola`) | M | B | - | - | - | - | - | - | - |
| Hasilkan QR bernominal saat pembayaran (`qris.generate`) | M | M | M | M | - | - | - | - | - |
| Lihat riwayat perubahan konfigurasi QRIS (`qris.audit.lihat`) | M | M | L | - | - | - | - | - | - |
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

## 2b. Guard finansial: tombol pelanggan tidak pernah melunasi (ALT-DEF-014)

Transisi `Pembayaran.MENUNGGU_KONFIRMASI -> DIBAYAR` **hanya** boleh dilakukan
aktor yang memegang `pembayaran.qris.konfirmasi-manual`
(`OWNER`/`MANAJER`/`SUPERVISOR`/`KASIR`). Pelanggan yang mengakses sistem lewat
token QR meja **tidak memegang izin apa pun** (`izin.kode` kosong) dan hanya
dapat memicu `MENUNGGU -> MENUNGGU_KONFIRMASI` lewat tombol "Sudah Membayar".

Tidak boleh ada jalur kode apa pun dari endpoint yang dapat diakses pelanggan
menuju status `DIBAYAR`. Tanpa guard ini, siapa pun yang memegang link QR meja
dapat menandai tagihannya sendiri lunas. Lihat ADR-020 Keputusan 2 dan tabel
transisi di `docs/arsitektur/STATE-MACHINES.md` bagian 2.

## 3. Aturan approval bertingkat (kolom `B`)

- **Buka ulang giliran kasir** setelah `DITUTUP_MENUNGGU_VERIFIKASI`: wajib approval
  `SUPERVISOR` ke atas (lihat `docs/arsitektur/STATE-MACHINES.md` #3).
- **Batalkan pesanan** yang statusnya sudah `DIKONFIRMASI`/`DIKIRIM_KE_DAPUR`/
  `SEDANG_DISIAPKAN` (ALT-DEF-005 - state machine 14-status): wajib approval
  `SUPERVISOR` ke atas - lihat tabel transisi lengkap di
  `docs/arsitektur/STATE-MACHINES.md` bagian "Pesanan". Tidak dapat dibatalkan
  sama sekali (butuh `DIRETUR` sebagai gantinya) begitu status mencapai
  `SIAP`/`DISAJIKAN`/`SELESAI`.
- **Refund pembayaran**: wajib approval `SUPERVISOR` ke atas, dicatat di
  `PembayaranRefund.disetujuiOlehId`. Status pembayaran menjadi
  `DIKEMBALIKAN_SEBAGIAN`/`DIKEMBALIKAN` sesuai agregat `SUM(refund.jumlah)`
  (ALT-DEF-014/ADR-020 Keputusan 4).
- **Koreksi pembayaran** (`transaksi.koreksi-pembayaran`) dan **koreksi
  konfirmasi QRIS** (`pembayaran.qris.koreksi`): wajib approval `SUPERVISOR` ke
  atas; append-only lewat `KoreksiPembayaran` (`jumlahSebelum`/`jumlahSesudah`),
  tidak pernah menimpa baris `Pembayaran` asal (ALT-DEF-014/ADR-019 Keputusan 6).
- **Perubahan alokasi pembayaran setelah `DIBAYAR`**: TIDAK boleh lewat
  `pembayaran.alokasi.kelola` biasa - wajib melalui jalur koreksi berapproval di
  atas. `pembayaran.alokasi.kelola` hanya berlaku selama `Pembayaran` masih
  `DRAF`. Tanpa aturan ini, uang dapat dipindahkan antar pesanan diam-diam.
- **Konfigurasi QRIS outlet** (`qris.konfigurasi.kelola`): `MANAJER` ditandai `B`
  karena ini konfigurasi yang menentukan ke rekening siapa uang pelanggan
  mengalir - perubahannya wajib diverifikasi pihak kedua
  (`KonfigurasiQris.diverifikasiOlehId`) sebelum diaktifkan, dan setiap
  perubahan tercatat append-only di `RiwayatKonfigurasiQris` (`ALT-QRS-008`).
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
