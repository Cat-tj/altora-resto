# Log Keputusan Arsitektur (ADR) - Altora Resto

Status dokumen: **DRAF AWAL**. Format ringkas: Konteks -> Keputusan -> Konsekuensi.
Setiap ADR diberi status `DIUSULKAN`, `DITERIMA`, `DIGANTI` (superseded), atau
`DITOLAK`.

## ADR-001: Monorepo satu basis kode untuk semua platform

- **Status:** DITERIMA
- **Konteks:** Altora Resto harus berjalan di web, Android, iOS, Windows, macOS, Linux
  tanpa duplikasi logika bisnis maupun UI.
- **Keputusan:** Satu monorepo (`pnpm` workspace + `turbo`) dengan `apps/web` sebagai
  satu-satunya implementasi UI+API; `apps/mobile` (Capacitor) dan `apps/desktop`
  (Tauri) membungkus `apps/web` lewat WebView, hanya menambah bridge native lewat
  `packages/perangkat`.
- **Konsekuensi:** Update fitur otomatis konsisten di semua platform; risikonya
  performa WebView di perangkat lama harus dipantau (lihat RISK-REGISTER.md).

## ADR-002: Prisma schema single-file

- **Status:** DITERIMA
- **Konteks:** Prisma mendukung multi-file schema (preview feature) maupun satu file.
- **Keputusan:** Memakai satu file `prisma/schema/schema.prisma` (bukan dipecah per
  domain) untuk menghindari ketergantungan preview feature dan mempermudah `prisma
  validate`/`prisma format` tanpa konfigurasi tambahan.
- **Konsekuensi:** File akan besar (~1500 baris) - dimitigasi dengan komentar
  section per domain yang mengacu ke `docs/database/*.md`.

## ADR-003: QRIS mode manual di rilis awal

- **Status:** DITERIMA
- **Konteks:** Integrasi payment gateway QRIS otomatis butuh kontrak merchant &
  waktu integrasi lebih lama dari target rilis awal.
- **Keputusan:** Rilis awal memakai konfirmasi QRIS manual (`QrisKonfirmasiManual`) -
  kasir memverifikasi notifikasi masuk di aplikasi bank/QRIS lalu menandai lunas.
- **Konsekuensi:** Bentuk tabel `Pembayaran` dirancang agar migrasi ke gateway
  otomatis di rilis berikutnya tidak mengubah skema inti, hanya menambah tabel
  callback baru.

## ADR-004: ULID untuk seluruh primary key

- **Status:** DITERIMA
- **Konteks:** Butuh ID yang bisa dibuat di klien (offline-first di masa depan),
  terurut secara waktu (mempermudah indexing), dan tidak menebak-nebak volume data
  (berbeda dari auto-increment integer).
- **Keputusan:** Semua `id` bertipe `String` berisi ULID, dibuat di application layer
  (bukan `uuid()`/`autoincrement()` bawaan Prisma).
- **Konsekuensi:** Butuh library ULID di setiap tempat pembuatan entity; validasi
  format ULID perlu ditambahkan ke skema Zod bersama.

## ADR-005: Uang sebagai Int rupiah, bukan Decimal/Float

- **Status:** DITERIMA
- **Konteks:** Kalkulasi uang dengan floating point rawan galat pembulatan.
- **Keputusan:** Semua nilai uang di database dan API disimpan sebagai `Int` dalam
  satuan rupiah penuh (tidak ada sen/desimal karena Rupiah tidak punya subunit yang
  dipakai luas).
- **Konsekuensi:** Kalkulasi diskon persen harus membulatkan ke Int secara eksplisit
  dan konsisten (aturan pembulatan didokumentasikan terpisah saat implementasi
  `packages/promo`/`packages/pembayaran`).
- **CATATAN (2026-07-26): SEBAGIAN DIAMANDEMEN oleh ADR-034.** Keputusan inti
  "uang rupiah bulat, bukan Decimal/Float" TETAP BENAR dan tidak dicabut.
  Yang diamandemen HANYA bagian tipe penyimpanan: seluruh field uang rupiah
  dipindah dari Prisma `Int` (Postgres `int4`, ceiling ~2,1 miliar) ke
  `BigInt` (Postgres `int8`, ceiling ~9,2×10^18) karena field AGREGAT/
  kumulatif (total penjualan harian per outlet, saldo toko kumulatif, dst)
  bisa realistis mendekati ceiling `int4` pada skala bisnis multi-outlet
  besar. Lihat ADR-034 untuk audit lengkap, rasional, dan bukti verifikasi.
  Baris ADR-005 ini dipertahankan apa adanya sebagai jejak sejarah keputusan
  awal, sesuai konvensi log ini.

## ADR-006: Tidak ada hard-delete pada data finansial, stok, dan audit

- **Status:** DITERIMA
- **Konteks:** Restoran butuh jejak audit penuh untuk rekonsiliasi kas, stok, dan
  kepatuhan pajak.
- **Keputusan:** Penghapusan/koreksi selalu lewat kolom status (`status`,
  `dibatalkanPada`) atau baris pembalik (`dibalikOlehId`, `PembayaranRefund`,
  `RETUR_PEMBELIAN`) - tidak ada `DELETE` fisik di jalur aplikasi normal untuk
  domain-domain tersebut.
- **Konsekuensi:** Query "data aktif" wajib memfilter status; volume tabel mutasi
  akan terus bertambah - butuh strategi partisi/arsip jangka panjang (dicatat sebagai
  risiko, lihat RISK-REGISTER.md RISK-010).

## ADR-007: Dapur hanya membaca read-contract dari domain Pesanan

- **Status:** DITERIMA
- **Konteks:** Menghindari duplikasi sumber kebenaran status item pesanan antara
  domain Pesanan dan Dapur.
- **Keputusan:** `packages/dapur` tidak memiliki tabel item pesanan sendiri; ia hanya
  boleh membaca `@altora/pesanan/kontrak-dapur` dan menulis status masaknya sendiri
  (`TiketDapur`, `TiketDapurBaris`). Ditegakkan otomatis lewat `.dependency-cruiser.cjs`.
- **Konsekuensi:** Perubahan status dapur harus dipropagasikan ke Pesanan lewat
  event/kontrak, bukan write langsung lintas domain - menambah kompleksitas
  orkestrasi tapi menjaga batas domain tetap jelas.

## ADR-008: Analitik hanya membaca read-model, tidak pernah tabel transaksional

- **Status:** DITERIMA
- **Konteks:** Query analitik berat (agregasi lintas tabel) berisiko membebani jalur
  transaksi utama jika dijalankan langsung terhadap tabel transaksional.
- **Keputusan:** `packages/analitik` hanya membaca tabel `RM_*` (read-model), diisi
  oleh proses agregasi terjadwal/event-driven terpisah. Ditegakkan lewat
  `.dependency-cruiser.cjs`.
- **Konsekuensi:** Ada latensi antara transaksi terjadi dan muncul di dashboard
  (tergantung jadwal job agregasi) - dianggap dapat diterima untuk laporan
  operasional, didokumentasikan sebagai batasan produk.

## ADR-009: Satu backend/database per deployment, multi-tenant di level data

- **Status:** DITERIMA
- **Konteks:** Alternatifnya adalah deployment terpisah per tenant (lebih mahal
  dioperasikan untuk skala UMKM/restoran kecil-menengah).
- **Keputusan:** Semua tenant berbagi satu database; isolasi dilakukan lewat kolom
  `tenantId`/`outletId` wajib di setiap tabel tenant-scoped, diresolusi di
  `packages/tenant` dan diteruskan sebagai konteks request.
- **Konsekuensi:** Bug filter tenant/outlet berisiko tinggi (kebocoran data lintas
  tenant) - butuh test wajib untuk setiap query baru (lihat RISK-REGISTER.md RISK-001).

## ADR-010: Correction-loop kedua — audit ulang defect ledger sebelum implementasi kode

- **Status:** DITERIMA
- **Konteks:** Correction-loop pertama (commit `f955a61`) sudah mencatat 22 defect
  arsitektur dalam format lama (kolom ID/Severity/Requirement ID/Deskripsi/
  Status/Resolusi). `MASTER-CHECKLIST.md` sejak itu diperluas ke 248 requirement
  (commit `b3559c3`), tetapi ledger defect belum diperbarui mengikuti taksonomi
  severity/status baru (KRITIS/TINGGI/SEDANG/RENDAH dan
  DIKONFIRMASI/SEDANG_DIPERBAIKI/SIAP_DIVERIFIKASI/DITUTUP/DITUNDA_DENGAN_ALASAN/
  TIDAK_VALID) maupun mereferensikan Requirement ID yang benar setelah checklist
  diperluas.
- **Keputusan:** Jalankan correction-loop audit pass kedua yang: (1) menulis ulang
  `docs/engineering/DEFECT-LEDGER.md` dengan format kolom baru dan melebur 22
  defect lama menjadi `ALT-DEF-001` s.d. `ALT-DEF-022` tanpa kehilangan satu
  temuan pun; (2) menambahkan 7 defect baru hasil audit langsung terhadap
  `prisma/schema/schema.prisma` (`ALT-DEF-023` s.d. `ALT-DEF-029`) — mencakup
  consent/merge pelanggan, shift lintas tengah malam, istirahat absensi, antrian
  cetak, ketiadaan test/CI, dan migrasi yang belum pernah dijalankan dari database
  kosong; (3) menyinkronkan `RISK-REGISTER.md` dengan risiko-risiko KRITIS yang
  baru terformalkan; (4) menambahkan satu requirement baru (`ALT-PLT-026`, antrian
  cetak) ke `MASTER-CHECKLIST.md` karena genuinely belum tercakup di mana pun.
- **Konsekuensi:** Tidak ada defect yang ditutup pada pass ini (belum ada
  implementasi kode yang memperbaikinya) — pass ini murni membuat correction loop
  bisa dilacak dengan jujur. Implementasi kode untuk domain Platform/Otorisasi
  (ALT-DEF-001, ALT-DEF-002, ALT-DEF-010) harus diprioritaskan lebih dulu karena
  domain lain (Pesanan, Dapur, Promo, Kasir) bergantung pada fondasi
  tenant/otorisasi yang benar sebelum bisa diimplementasikan dengan aman — lihat
  urutan rekomendasi di `docs/engineering/DEFECT-LEDGER.md`.

## ADR-011: Pisahkan identitas pengguna global dari keanggotaan tenant/outlet (ALT-DEF-001)

- **Status:** DITERIMA
- **Konteks:** `Pengguna.tenantId` langsung di model (skema lama) mengunci satu
  identitas pengguna ke satu tenant, mencampur konsep identitas (autentikasi)
  dengan keanggotaan/scope (otorisasi). Ini mencegah satu pengguna menjadi
  anggota lebih dari satu tenant (mis. konsultan yang mengelola beberapa
  resto), memaksa duplikasi akun per tenant, dan tidak sesuai dengan
  requirement `ALT-PLT-002`/`ALT-PLT-003`/`ALT-PLT-007` di
  `MASTER-CHECKLIST.md` yang sudah mengasumsikan `KeanggotaanTenant`. Lihat
  `ALT-DEF-001` di `DEFECT-LEDGER.md`.
- **Keputusan:**
  1. `Pengguna` menjadi identitas GLOBAL: tidak ada `tenantId`/`outletId`/peran
     langsung di model ini lagi. `email` menjadi unik GLOBAL (bukan
     `@@unique([tenantId, email])` seperti sebelumnya) - kebijakan produk:
     satu alamat email selalu memetakan ke satu identitas pengguna di seluruh
     platform, konsisten dengan pola login email+password lintas tenant.
  2. `KeanggotaanTenant` menghubungkan `Pengguna` <-> `Tenant`
     (`@@unique([penggunaId, tenantId])`), membawa `isOwner` dan `status`.
     Satu `Pengguna` bisa punya banyak baris `KeanggotaanTenant` aktif.
  3. `KeanggotaanOutlet` menggantikan `PenggunaOutlet` lama, sekarang scoped ke
     `KeanggotaanTenant` (bukan langsung ke `Pengguna`), menjamin bahwa akses
     outlet selalu melalui keanggotaan tenant yang valid.
  4. **Composite-FK ganda untuk integritas tenant-outlet (CRITICAL, ALT-DEF-010
     terkait):** `Outlet` dan `KeanggotaanTenant` masing-masing diberi
     `@@unique([tenantId, id])` tambahan (selain `@id` biasa). `KeanggotaanOutlet`
     membawa kolom `tenantId` yang didenormalisasi dan dua relasi composite:
     `@relation("KeanggotaanOutletOutlet", fields: [tenantId, outletId], references: [tenantId, id])`
     ke `Outlet`, dan
     `@relation("KeanggotaanOutletTenantScoped", fields: [tenantId, keanggotaanTenantId], references: [tenantId, id])`
     ke `KeanggotaanTenant`. Karena kedua relasi memakai kolom `tenantId` yang
     SAMA, database secara struktural tidak mengizinkan `KeanggotaanOutlet`
     mereferensikan `Outlet` dan `KeanggotaanTenant` dari tenant yang berbeda -
     ini bukan sekadar komentar/guard aplikasi, melainkan constraint level-DB
     nyata. **Pendekatan ini DICOBA langsung dan BERHASIL** - `prisma format` +
     `prisma validate` lulus tanpa fallback ke scalar+guard (lihat
     `RELEASE-EVIDENCE.md` untuk output aktual).
  5. `Pengguna.pinHash` (PIN global lama) **dihapus**, bukan dipindahkan pada
     pass ini. PIN-per-outlet (`ALT-DEF-013`) didesain sebagai model terpisah
     (mis. `PinOutlet`/kolom pada `KeanggotaanOutlet`) yang akan dibangun pada
     batch auth/session berikutnya (`ALT-DEF-003`/`ALT-DEF-013`) - tidak
     dibangun setengah jadi di pass ini untuk menghindari model dangling.
  6. `passwordHash` ditambahkan sebagai `String?` (nullable) pada `Pengguna` -
     nullable karena data seed/existing mungkin belum punya kredensial
     password; begitu alur auth email+password (`ALT-DEF-003`) dibangun,
     field ini semestinya menjadi wajib untuk pengguna yang aktif login.
  7. Field aktor (`*_by`/`dibuatOlehId`, `disetujuiOlehId`, dst. — mis.
     `GiliranKasir.penggunaId`, `PurchaseOrder.dibuatOlehId`,
     `Pesanan.dibuatOlehId`, `AuditLog.penggunaId`, dst.) TETAP menunjuk
     langsung ke `Pengguna.id` (bukan diubah ke `KeanggotaanTenant.id`) -
     identitas global tetap valid untuk mencatat "siapa melakukan aksi ini"
     karena `Pengguna.id` stabil dan unik secara global; mengaitkannya ke
     `KeanggotaanTenant` tidak menambah informasi yang relevan untuk kolom
     audit ini.
- **Konsekuensi:** Model registrasi/login harus resolve `KeanggotaanTenant`
  aktif pengguna setelah autentikasi (bukan langsung baca `tenantId` dari
  `Pengguna`) - `docs/api/API-CONTRACT.md` diperbarui untuk mencerminkan ini.
  Data existing (belum ada karena belum ada implementasi kode/migrasi nyata -
  lihat `ALT-DEF-029`) akan perlu skrip migrasi data `Pengguna.tenantId` ->
  baris `KeanggotaanTenant` begitu ada database nyata untuk dimigrasikan.

## ADR-012: Normalisasi Peran/Izin menggantikan `Peran.permissions` Json (ALT-DEF-002)

- **Status:** DITERIMA
- **Konteks:** `Peran.permissions Json` tidak memiliki referential integrity -
  kode permission bisa typo tanpa error database, sulit diquery/diaudit, dan
  tidak mendukung batas izin numerik (`ALT-PLT-011`) maupun alur approval
  (`ALT-PLT-012`). Lihat `ALT-DEF-002` di `DEFECT-LEDGER.md`.
- **Keputusan:**
  1. `Izin` - katalog kode izin atomik, **GLOBAL** (bukan per-tenant) dengan
     `@@unique([kode])`; `domain` dipilih sebagai `String` bebas (bukan enum)
     karena daftar domain produk masih bisa bertambah tanpa migrasi skema
     setiap kali ada domain baru.
  2. `Peran` tetap tenant-scoped (`@@unique([tenantId, kode])`), field
     `permissions Json` dihapus, ditambah `isSystem Boolean` untuk membedakan
     peran bawaan (di-seed otomatis, mis. OWNER/KASIR/DAPUR) dari peran
     kustom buatan tenant.
  3. `PeranIzin` - tabel penghubung many-to-many `Peran` <-> `Izin`
     (`@@unique([peranId, izinId])`) - permission sekarang divalidasi lewat FK
     dan diquery lewat join, bukan parsing Json.
  4. `KeanggotaanPeran` menggantikan `PenggunaPeran` lama - penetapan peran
     sekarang per `KeanggotaanTenant` (bukan per `Pengguna` global), sehingga
     satu pengguna secara benar bisa memiliki peran berbeda di tenant berbeda.
  5. `BatasIzin` - limit numerik per `Peran` (1:1, `@@unique` pada `peranId`)
     untuk `maksimumDiskonPersen`/`maksimumDiskonNominal`/`maksimumRefund`/
     `maksimumPenyesuaianStok`/`wajibPinSupervisor`/`wajibPersetujuanManajer`.
  6. `IzinSementara` - pemberian izin darurat/sementara per `KeanggotaanTenant`
     dengan jangka waktu (`berlakuSejak`/`berlakuSampai`) dan alasan.
  7. `PermintaanPersetujuan` - rekaman generik permintaan approval supervisor
     (dipicu saat `BatasIzin.wajibPersetujuanManajer`/`wajibPinSupervisor`
     terlampaui), dengan `jenisAksi`/`referensiJenis`/`referensiId` sebagai
     String bebas agar domain lain (kasir/persediaan/pesanan) bisa menambah
     jenis aksi baru tanpa migrasi skema di package otorisasi.
  8. Seed starter kode `Izin` (32 kode, mengikuti
     `docs/keamanan/PERMISSION-MATRIX.md`) ditulis di
     `prisma/seed/izin.seed.ts` sebagai referensi struktural (tidak dijalankan
     terhadap database nyata pada pass ini - lihat `ALT-DEF-029`).
- **Konsekuensi:** `docs/keamanan/PERMISSION-MATRIX.md` diperbarui untuk
  mencerminkan mapping Peran x Izin ternormalisasi (bukan lagi menyiratkan
  blob Json). Endpoint role/permission (`/api/v1/peran`,
  `/api/v1/peran/{id}/izin`, `/api/v1/peran/{id}/batas-izin`,
  `/api/v1/persetujuan/{id}/putuskan`) diperbarui di `API-CONTRACT.md`.

## ADR-013: Composite-FK tenant/outlet lintas skema (ALT-DEF-010, ALT-DEF-014)

- **Status:** DITERIMA
- **Konteks:** ADR-011 memperkenalkan pola composite-FK ganda untuk
  `KeanggotaanOutlet` (dua relasi memakai kolom `tenantId` yang sama menuju
  `Outlet(tenantId, id)` dan `KeanggotaanTenant(tenantId, id)`) sebagai
  jaminan level-database bahwa entitas anak tidak bisa merujuk parent milik
  tenant lain. `ALT-DEF-010` di `DEFECT-LEDGER.md` mencatat bahwa pola ini
  BELUM diterapkan di hampir seluruh model lain di skema - setiap model yang
  membawa `tenantId` sekaligus FK ke `Outlet`/model tenant-owned lain hanya
  memakai FK ID tunggal, sehingga tidak ada jaminan level-data bahwa FK
  tersebut benar-benar milik tenant yang sama. Ini adalah risiko keamanan
  tertinggi di RISK-REGISTER.md (RISK-001). `ALT-DEF-014` (split
  bill/`AlokasiPembayaran`) TIDAK dikerjakan business-logic-nya di batch ini
  (lihat catatan cakupan di bawah) - hanya bagian tenant/outlet-safety pada
  model `Pembayaran` yang sudah ada yang disentuh.
- **Keputusan - pola umum:** Untuk setiap model anak yang membawa `tenantId`
  DAN sebuah FK ke model tenant-owned (langsung `Outlet`, atau model lain yang
  sendiri membawa `tenantId`/`outletId`, mis. `Gudang`, `Meja`,
  `StasiunDapur`, `KategoriMenu`, `ItemMenu`, `Karyawan`, `Supplier`,
  `Bahan`, `PurchaseOrder`, `Pesanan`, `GiliranKasir`, `Jabatan`,
  `KategoriBiaya`, `Pelanggan`):
  1. Parent mendapat `@@unique([tenantId, id])` tambahan (atau
     `@@unique([outletId, id])` bila komposit yang dipakai adalah level
     outlet, lihat poin 3).
  2. Child mengganti relasi FK tunggal `@relation(fields: [xId], references: [id])`
     menjadi composite `@relation(fields: [tenantId, xId], references: [tenantId, id])`.
     `tenantId` pada child TIDAK pernah dihapus/diganti - ia tetap kolom
     sendiri milik child, hanya sekarang dipakai ganda sebagai bagian
     composite-FK yang membuat Postgres MENOLAK insert/update bila `xId` yang
     dirujuk ternyata milik tenant lain.
  3. **Varian outlet-level** dipakai ketika DUA entitas anak sama-sama sudah
     membawa `outletId` sendiri dan risiko nyatanya adalah pencampuran
     **outlet** (bukan cuma tenant) dalam tenant yang sama - dipakai untuk
     `Meja`↔`AreaMeja`, `Pesanan`/`Reservasi`↔`Meja`, `TiketDapur`↔`StasiunDapur`.
     Di sini parent mendapat `@@unique([outletId, id])` dan child memakai
     `@relation(fields: [outletId, xId], references: [outletId, id])`.
  4. Relasi ke `Tenant` ITU SENDIRI (fields: `[tenantId]`, references:
     `Tenant.id`) **tidak pernah** diubah menjadi composite - `Tenant.id`
     sudah menjadi identitas tenant itu sendiri, tidak ada perantara yang bisa
     menyimpang. Composite hanya diperlukan ketika parent BUKAN `Tenant`
     langsung.
  5. Relasi ke `Pengguna` (identitas global, ADR-011) **tidak pernah**
     di-composite-kan ke tenant - `Pengguna` sengaja lintas-tenant.
- **Model yang mendapat composite-FK (relation name di kode di
  `prisma/schema/schema.prisma`):** `Perangkat` (`outlet`), `KategoriMenu`
  (`outlet`, opsional), `ItemMenu` (`kategori`), `HargaItemOutlet` (BARU:
  `tenantId` ditambahkan - `HargaItemOutletItemMenu` + `HargaItemOutletOutlet`,
  pola ganda seperti `KeanggotaanOutlet`), `Gudang` (`outlet`), `StokBahan`
  (BARU: `tenantId` ditambahkan - `StokBahanGudang` + `StokBahanBahan`),
  `MutasiStok` (`outlet`; `gudang` - relasi FK yang SEBELUMNYA tidak ada sama
  sekali untuk kolom `gudangId`, kini ditambahkan langsung sebagai composite;
  `bahan`), `StokOpname` (`gudang`), `PurchaseOrder` (`outlet`; `supplier`),
  `PenerimaanBarang` (BARU: `tenantId` ditambahkan - `PenerimaanBarangPo` +
  `PenerimaanBarangGudang`), `AreaMeja` (`outlet`), `Meja` (`outlet`;
  `areaMeja` via outlet-level), `Reservasi` (`outlet`; `meja` via
  outlet-level, opsional; `pelanggan`), `Pesanan` (`outlet`; `meja` via
  outlet-level, opsional; `pelanggan`, opsional), `StasiunDapur` (`outlet`),
  `TiketDapur` (`outlet`; `pesanan`; `stasiunDapur` via outlet-level,
  opsional), `GiliranKasir` (`outlet`), `Pembayaran` (`outlet`; `pesanan`),
  `Karyawan` (`jabatan`; `outletUtama`), `Absensi` (`outlet`; `karyawan`),
  `RekapKasHarian` (`outlet`; `giliranKasir`, opsional), `BiayaOperasional`
  (`outlet`; `kategoriBiaya`), `RmPenjualanHarian` (`outlet`),
  `RmPenjualanItemHarian` (`outlet`; `itemMenu`), `RmStokKritis` (`outlet`;
  `bahan`), `RmKinerjaKaryawanHarian` (`outlet`; `karyawan`).
  Parent yang mendapat `@@unique([tenantId, id])` baru untuk mendukung di
  atas: `KategoriMenu`, `ItemMenu`, `Bahan`, `Gudang`, `Supplier`,
  `PurchaseOrder`, `Pesanan`, `GiliranKasir`, `Karyawan`, `Jabatan`,
  `KategoriBiaya`, `Pelanggan`. Parent yang mendapat `@@unique([outletId, id])`
  baru: `AreaMeja`, `Meja`, `StasiunDapur`.
- **Model yang DIJUDGE AMAN tanpa composite-FK (dan alasannya):**
  - `PengaturanOutlet` - hanya punya SATU relasi (`outletId -> Outlet`), tidak
    ada FK kedua yang bisa menyimpang darinya; FK tunggal sudah cukup
    men-scope baris ke satu outlet. Tidak membawa `tenantId` dan sengaja tidak
    ditambahkan satu di sini karena tidak ada jaminan tambahan yang didapat.
  - `SesiMejaQr` - hanya punya SATU relasi (`mejaId -> Meja`, yang sekarang
    sudah tenant/outlet-safe lewat composite `Meja.outlet`). Sama seperti
    `PengaturanOutlet`, tidak ada FK kedua untuk dibandingkan.
  - `Promo` - hanya punya relasi ke `Tenant` langsung (lihat poin 4 di atas),
    otomatis aman tanpa composite. **CATATAN GAP terpisah (bukan defect
    composite-FK) - DITUTUP oleh ADR-026/`ALT-DEF-030`:** pada batch ini
    (ADR-013), `Promo` belum punya relasi/kolom outlet sama sekali meskipun
    `JenisSyaratPromo.OUTLET_TERTENTU` menyiratkan promo seharusnya bisa
    dibatasi per outlet - **sengaja TIDAK** ditambahkan `PromoOutlet` di
    batch ini (di luar scope `ALT-DEF-010`/`ALT-DEF-014`). Model
    `PromoOutlet` (composite-FK `(tenantId, outletId) -> Outlet(tenantId,
    id)`, konvensi "kosong berarti semua outlet") kemudian ditambahkan di
    batch domain promo (`ALT-DEF-009`/`ALT-DEF-030`, lihat ADR-026), dan
    `OUTLET_TERTENTU` DIHAPUS dari `JenisSyaratPromo` karena `PromoOutlet`
    menjadi satu-satunya mekanisme cakupan outlet.
  - Semua tabel baris/junction murni (mis. `ResepBahan`, `ItemPesanan`,
    `ItemPesananModifier`, `PurchaseOrderBaris`, `PenerimaanBarangBaris`,
    `StokOpnameBaris`, `TiketDapurBaris`, `PembayaranMetodeBaris`,
    `PromoAturan`, `PesananRiwayatStatus`, dll.) - **tidak termasuk daftar
    audit eksplisit batch ini** (lihat instruksi cakupan correction-loop) dan
    tidak memiliki kolom `tenantId` sendiri; selalu diakses lewat parent
    transaksionalnya yang sudah/akan menjadi tenant-safe. Menambahkan
    `tenantId` + composite ke setiap tabel baris akan membebani skema secara
    signifikan tanpa jalur akses independen yang nyata untuk dilindungi -
    dicatat di sini sebagai keputusan sadar untuk TIDAK memaksimalkan
    composite-FK di mana-mana, bukan kelalaian.
  - `TransaksiKasir`, `ReturPembelian`, `QrisKonfirmasiManual`, `Struk`,
    `PembayaranRefund`, `Kupon`, `PromoPemakaian`, `Keanggotaan`,
    `PoinRiwayat`, `JadwalShift`, `PenugasanShift`, `CutiIzin` - eksplisit
    **di luar daftar model yang diaudit batch ini** (lihat instruksi
    cakupan); domain-domain ini (kasir/promo/membership/HR) akan mendapat
    rework lebih dalam di batch domain masing-masing per rencana
    correction-loop, dan tenant-safety-nya akan disentuh di batch tersebut,
    bukan diam-diam dilewati di sini.
- **Keterbatasan struktural Prisma yang ditemukan:** TIDAK ADA. Setiap
  composite-FK yang dicoba di batch ini **berhasil** divalidasi oleh
  `prisma format`/`prisma validate`/`prisma generate` (lihat
  `RELEASE-EVIDENCE.md` bagian "Pass correction-loop 2026-07-25 (lanjutan
  ALT-DEF-010/014)") - tidak ada fallback ke scalar+guard aplikasi yang
  diperlukan di batch ini. Satu-satunya penyesuaian teknis yang dibutuhkan
  (bukan keterbatasan, sekadar aturan Prisma) adalah menambahkan
  `@@unique([tenantId, pesananId])` pada `TiketDapur` dan
  `@@unique([tenantId, giliranKasirId])` pada `RekapKasHarian` - Prisma
  mewajibkan composite-FK pada relasi one-to-one memakai unique constraint
  yang mencakup seluruh field composite tersebut, bukan hanya field FK
  tunggal yang sudah `@unique`.
- **Konsekuensi:** Ini adalah perubahan skema terluas dalam satu pass
  correction-loop (menyentuh lebih dari 25 model). `docs/database/*.md`
  untuk setiap domain yang tersentuh diberi anotasi bahwa FK terkait kini
  composite tenant/outlet-scoped. Status kedua defect di `DEFECT-LEDGER.md`
  diset `SIAP_DIVERIFIKASI` (bukan `DITUTUP`) - migrasi nyata ke Postgres dan
  test integrasi isolasi-tenant sungguhan tetap `DIBLOKIR` (`ALT-DEF-029`),
  konsisten dengan status ADR-011/ADR-012 sebelumnya.

## ADR-014: Pengerasan kredensial/sesi - reset kata sandi, lockout, session-tenant-scoping (ALT-DEF-003)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-003` di `DEFECT-LEDGER.md` mencatat bahwa model
  autentikasi sebelum batch ini (`Pengguna.passwordHash` nullable dari
  ALT-DEF-001, model `Sesi` sederhana) tidak punya fondasi untuk: (a) alur
  lupa/reset kata sandi, (b) deteksi brute-force dan penguncian sementara
  akun, (c) lifecycle sesi yang aman (token bearer tidak boleh disimpan
  mentah, sesi tidak menyatakan konteks tenant mana yang sedang aktif,
  tidak ada jejak IP/user-agent/alasan pencabutan).
- **Keputusan 1 - Lockout: field eksplisit di `Pengguna`, bukan dihitung
  ulang dari `PercobaanLogin` tiap request.** Dua pendekatan dipertimbangkan:
  (a) computed lockout - service login melakukan `COUNT` baris
  `PercobaanLogin` gagal dalam jendela waktu tertentu setiap kali ada upaya
  login; (b) field eksplisit `Pengguna.terkunciSampai` (`DateTime?`) +
  `Pengguna.jumlahPercobaanGagal` (`Int @default(0)`), diperbarui oleh
  service-layer setiap kali login gagal/berhasil. **Dipilih (b)** karena:
  - Jalur login yang benar butuh SATU baris lookup (`Pengguna` sudah
    di-fetch untuk verifikasi password) untuk tahu status kunci, bukan query
    agregasi `COUNT` terpisah ke `PercobaanLogin` setiap request login -
    lebih murah dan lebih sederhana untuk diimplementasikan sebagai guard.
  - `PercobaanLogin` tetap ada dan tetap dipertahankan APPEND-ONLY (lihat
    Keputusan 3) sebagai jejak audit brute-force yang lebih kaya (per-IP,
    per-user-agent) - kedua mekanisme tidak saling meniadakan, field di
    `Pengguna` adalah "state kunci saat ini", `PercobaanLogin` adalah
    "riwayat lengkap" untuk investigasi/analitik keamanan.
  - Trade-off yang diterima: field eksplisit bisa "basi" bila diperbarui
    lewat lebih dari satu jalur tanpa transaksi yang konsisten - ini adalah
    tanggung jawab implementasi service-layer di batch fitur berikutnya
    (di luar scope batch ini, yang hanya schema), bukan sesuatu yang bisa
    dijamin skema Prisma semata.
- **Keputusan 2 - Reset kata sandi: `TokenResetKataSandi` terpisah, hash-only,
  conditional-uniqueness didokumentasikan sebagai keterbatasan Prisma.**
  Token MENTAH dikirim ke pengguna (email) dan TIDAK PERNAH disimpan - hanya
  `tokenHash` (mis. SHA-256 dari token mentah) yang disimpan, `@unique`,
  sama pola dengan `Sesi.tokenHash` (lihat Keputusan 3). `digunakanPada`
  (`DateTime?`) menandai token sudah dikonsumsi. **Keterbatasan Prisma yang
  didokumentasikan secara eksplisit:** tidak ada cara menyatakan "sebuah
  token hanya valid dipakai SATU kali, dan dianggap tidak valid lagi begitu
  `digunakanPada` terisi ATAU `kadaluarsaPada` terlampaui" sebagai
  constraint level-database di Prisma (ini butuh conditional/partial unique
  index atau check constraint dengan klausa waktu, tidak didukung Prisma
  schema language) - enforcement wajib dilakukan di service-layer:
  endpoint konsumsi token HARUS memvalidasi
  `digunakanPada IS NULL AND kadaluarsaPada > now()` sebelum menerima reset,
  lalu menulis `digunakanPada = now()` di baris yang sama secara atomik
  (transaksi/`UPDATE ... WHERE digunakanPada IS NULL`).
- **Keputusan 3 - Session hardening: `tokenHash` wajib, `keanggotaanTenantId`
  nullable sebagai konteks tenant aktif.** `Sesi.tokenHash` (`String @unique`)
  ditambahkan eksplisit - lookup sesi dari header/cookie klien HARUS lewat
  hash token yang disodorkan, bukan lewat `Sesi.id` (yang bisa dienumerasi/
  ditebak bila dipakai sebagai bearer). `Sesi.keanggotaanTenantId` ditambahkan
  sebagai **nullable** (bukan wajib) FK skalar (bukan composite) ke
  `KeanggotaanTenant.id` - alasan nullable: alur login di `API-CONTRACT.md`
  (`POST /api/v1/auth/masuk`) menghasilkan `Sesi` GLOBAL dulu (identitas
  `Pengguna`, ALT-DEF-001) SEBELUM klien memilih konteks tenant lewat
  `GET /api/v1/tenant-saya` - sesi yang belum memilih tenant adalah state
  valid, bukan error. Field ini TIDAK di-composite-kan ke tenant (pola
  ADR-013) karena `Sesi` sendiri tidak membawa kolom `tenantId` - relasi ini
  murni menyatakan "konteks operasional yang sedang dipakai sesi ini", bukan
  kepemilikan data tenant-scoped yang butuh jaminan anti-lintas-tenant di
  level database. Field tambahan lain: `terakhirAktifPada` (dipakai deteksi
  sesi idle terlepas dari `kadaluarsaPada`), `alasanPencabutan` (teks bebas,
  mis. "logout"/"ganti kata sandi"/"dicabut manual oleh admin"), `ipHash`,
  `userAgent`. `dicabutPada`, `perangkatId`, `dibuatPada`, `kadaluarsaPada`
  dipertahankan dari skema sebelumnya.
- **Keputusan 4 - `PercobaanLogin`: append-only, TIDAK di-FK ke `Pengguna`.**
  `email` disimpan sebagai teks bebas (identifier yang dicoba), bukan
  referensi ke `Pengguna.email` - percobaan login dengan email yang tidak
  terdaftar/salah ketik HARUS tetap tercatat (justru inilah sinyal brute-force/
  enumerasi email yang paling relevan untuk dideteksi), dan FK wajib ke
  `Pengguna` akan MENOLAK baris semacam itu di level database. Tidak ada
  update/delete yang diasumsikan pada model ini (append-only), diverifikasi
  di test arsitektur (lihat `packages/test-support`).
- **Cakupan yang SENGAJA TIDAK dikerjakan di batch ini:** implementasi
  handler auth nyata (endpoint login/reset/lockout), pengiriman email reset,
  algoritma hashing konkret (bcrypt/argon2 - dipilih di implementasi, bukan
  skema), migrasi Postgres nyata, dan test integrasi login sungguhan -
  semuanya `BELUM DIKERJAKAN`/`DIBLOKIR` (`ALT-DEF-029`), konsisten dengan
  pass-pass correction-loop sebelumnya. Batch ini murni schema + dokumentasi
  kontrak API + traceability, sesuai instruksi cakupan correction-loop.

## ADR-015: PIN per outlet (`PinOutlet`) dan riwayat perangkat (ALT-DEF-013)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-013` mencatat bahwa `Pengguna.pinHash` lama (PIN
  global per pengguna) sudah dihapus sejak ALT-DEF-001 tanpa pengganti - PIN
  seharusnya scoped ke kombinasi pengguna+outlet (bahkan +perangkat), bukan
  atribut identitas global, agar kebocoran PIN di satu outlet/perangkat tidak
  memaksa rotasi PIN pengguna tersebut di semua outlet lain tempat ia
  bertugas.
- **Keputusan 1 - `PinOutlet` di-scope ke `KeanggotaanTenant`, bukan langsung
  ke `Pengguna`.** Mengikuti pola ALT-DEF-001: akses/kredensial operasional
  scoped-tenant selalu digantung ke `KeanggotaanTenant` (representasi "satu
  Pengguna sebagai anggota satu Tenant tertentu"), bukan ke `Pengguna` global
  langsung - konsisten dengan `KeanggotaanOutlet`, `KeanggotaanPeran`,
  `IzinSementara`.
- **Keputusan 2 - Composite-FK ganda, pola identik `KeanggotaanOutlet`
  (ADR-011/ADR-013).** `PinOutlet` membawa `tenantId` denormalisasi yang
  dipakai bersama oleh DUA relasi composite: `(tenantId, outletId) ->
  Outlet(tenantId, id)` (relasi `outlet`, nama relasi `PinOutletOutlet`) dan
  `(tenantId, keanggotaanTenantId) -> KeanggotaanTenant(tenantId, id)` (relasi
  `keanggotaanTenantTenantScoped`, nama relasi `PinOutletTenantScoped`) - ini
  menjamin level-database bahwa PIN outlet tidak bisa dibuat untuk kombinasi
  outlet dan keanggotaan-tenant yang berasal dari tenant berbeda, sama
  seperti jaminan `KeanggotaanOutlet`. Divalidasi nyata oleh `prisma
  validate`/`generate` (lihat `RELEASE-EVIDENCE.md`).
- **Keputusan 3 - Uniqueness dengan NULL pada `perangkatId`: didokumentasikan
  sebagai keterbatasan, enforcement di service-layer.**
  `@@unique([keanggotaanTenantId, outletId, perangkatId])` dipakai sesuai
  spesifikasi, TETAPI Postgres (dan karenanya Prisma, yang menerjemahkan
  constraint ini langsung ke unique index Postgres) menganggap **NULL tidak
  pernah sama dengan NULL** pada evaluasi unique constraint. Konsekuensi
  konkret: dua baris `PinOutlet` dengan `keanggotaanTenantId`+`outletId` yang
  sama dan `perangkatId` NULL pada KEDUANYA (PIN "berlaku di semua
  perangkat") **tidak akan ditolak** oleh constraint ini - keduanya dianggap
  baris yang berbeda oleh Postgres. Dua alternatif dipertimbangkan untuk
  menutup celah ini: (a) memaksa `perangkatId` non-null dengan nilai
  sentinel (mis. string kosong `""` merepresentasikan "tanpa perangkat
  spesifik") sehingga constraint database murni mencegahnya; (b) membiarkan
  `perangkatId` nullable apa adanya dan memindahkan enforcement "hanya satu
  PIN tanpa-perangkat-spesifik per keanggotaan-tenant+outlet" ke
  service-layer (cek baris `perangkatId IS NULL` yang sudah ada sebelum
  insert baru). **Dipilih (b)** karena sentinel string kosong mengaburkan
  makna "tidak ada perangkat" vs "perangkat dengan id kosong" di seluruh
  query/laporan yang membaca `perangkatId` (query harus tahu untuk
  memperlakukan `""` secara khusus, alih-alih memakai `IS NULL` yang jauh
  lebih eksplisit) - trade-off yang diterima: constraint database SENDIRI
  TIDAK cukup untuk kasus PIN tanpa-perangkat-spesifik, harus dibantu guard
  aplikasi saat implementasi endpoint "ganti PIN"/"reset PIN" di batch
  fitur berikutnya (di luar scope batch ini).
- **Keputusan 4 - `PinOutlet.perangkatId` SENGAJA bukan FK ke model
  `Perangkat`.** Berbeda dari `RiwayatPerangkat.perangkatId` (Keputusan 5) -
  `Perangkat` men-scope perangkat FISIK/infrastruktur outlet yang sudah
  teregistrasi lewat `kodeAktivasi` (KASIR/KDS/PRINTER/TABLET_PELAYAN, lihat
  `JenisPerangkat`). PIN staf pada praktiknya sering dipakai dari perangkat
  yang TIDAK selalu punya baris `Perangkat` sendiri (mis. tablet pribadi
  pelayan untuk absensi mandiri) - mewajibkan FK ke `Perangkat` akan
  menghalangi kasus valid tersebut. `perangkatId` di sini tetap `String?`
  bebas (identifier perangkat apa pun, mis. device fingerprint), bukan
  referensi berkendala FK.
- **Keputusan 5 - `RiwayatPerangkat` terpisah dari `Perangkat`, DAN
  `RiwayatPerangkat.perangkatId` di-FK ke `Perangkat`.** `Perangkat`
  (skema sebelumnya) hanya menyimpan state TERKINI satu perangkat fisik
  (`status`, `lastSeenAt`) - tidak ada jejak historis siapa saja yang pernah
  diasosiasikan dengannya. `RiwayatPerangkat` adalah tabel APPEND-ONLY baru
  yang mencatat setiap kali seorang `Pengguna` didaftarkan
  (`DIDAFTARKAN`)/memakai (`DIGUNAKAN`)/dicabut aksesnya (`DICABUT`) dari
  suatu `Perangkat` - di sini FK ke `Perangkat` DIWAJIBKAN (bukan seperti
  Keputusan 4) karena konteksnya secara eksplisit adalah "riwayat asosiasi
  dengan perangkat yang sudah teregistrasi sebagai infrastruktur outlet",
  bukan PIN yang bisa dipakai dari perangkat pribadi mana pun.
- **Cakupan yang SENGAJA TIDAK dikerjakan di batch ini:** endpoint nyata
  "ganti PIN"/"reset PIN oleh manajer", algoritma hashing PIN konkret,
  migrasi Postgres nyata, dan test integrasi PIN sungguhan - semuanya
  `BELUM DIKERJAKAN`/`DIBLOKIR` (`ALT-DEF-029`), konsisten dengan pass-pass
  correction-loop sebelumnya.

## ADR-016: Infrastruktur idempotency-key, transactional outbox, dan notifikasi in-app (ALT-DEF-017)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-017` di `DEFECT-LEDGER.md` mencatat bahwa schema tidak
  punya model apa pun untuk tiga kebutuhan cross-cutting yang sudah eksplisit
  di `MASTER-CHECKLIST.md` (`ALT-PLT-018` idempotency, `ALT-PLT-019` outbox,
  `ALT-PLT-020` notifikasi in-app): (a) endpoint kritis (checkout, pembayaran,
  refund, dsb) yang di-retry klien (mis. timeout koneksi) berisiko membuat
  efek ganda (pesanan/pembayaran duplikat); (b) event domain (pesanan siap,
  approval diminta) bisa hilang jika publish ke message broker/consumer gagal
  sementara, karena tidak ada jaminan atomicity antara perubahan data dan
  emisi event; (c) tidak ada cara memberi tahu pengguna di dalam aplikasi
  (pesanan siap, approval dibutuhkan, stok kritis, dsb) tanpa saluran
  eksternal. `ALT-DEF-022` (API-CONTRACT.md belum menyebut requirement header
  `Idempotency-Key`) juga tersentuh langsung oleh keputusan berikut.
- **Keputusan 1 - `IdempotencyKey`: `requestHash` sebagai pembeda "retry aman"
  vs "konflik", `status` mendeteksi duplikat YANG SEDANG BERLANGSUNG.**
  Setiap baris menyimpan `key` (idempotency key yang disodorkan klien lewat
  header `Idempotency-Key`), `scope` (command mana, mis. `"checkout"`,
  `"pembayaran.konfirmasi"`, `"promo.terapkan"` - String bebas seperti
  `Izin.domain`/`PermintaanPersetujuan.jenisAksi`, karena daftar scope akan
  terus bertambah), dan `requestHash` (hash payload request, mis. SHA-256).
  **Kenapa `requestHash` penting:** tanpanya, endpoint hanya bisa menjamin
  "key yang sama = kembalikan response tersimpan", TANPA memverifikasi bahwa
  request KEDUA benar-benar request YANG SAMA. Klien yang (secara bug atau
  jahat) memakai ulang key yang sama dengan payload BERBEDA (mis. jumlah
  refund berbeda) akan diam-diam menerima response dari request PERTAMA yang
  tidak sesuai dengan apa yang baru saja ia kirim - berbahaya khusus untuk
  endpoint finansial (checkout, pembayaran, refund). Dengan `requestHash`,
  service-layer WAJIB membandingkan hash payload baru dengan `requestHash`
  tersimpan; bila berbeda, endpoint HARUS menolak dengan `409 Conflict`
  eksplisit (bukan mengembalikan response basi atau memproses ulang secara
  diam-diam). `status` (`MEMPROSES`/`SELESAI`/`GAGAL`) menutup celah race
  condition yang tidak bisa ditangani `responseBody` semata: dua request
  konkuren dengan key yang sama yang TIBA BERSAMAAN (request kedua tiba
  SEBELUM request pertama selesai, jadi `responseBody` belum terisi) harus
  tetap terdeteksi sebagai duplikat-in-flight (`status = MEMPROSES`) dan
  ditolak/ditunda, bukan diam-diam diizinkan berjalan paralel sampai
  keduanya menyelesaikan efek yang sama.
- **Keputusan 2 - `IdempotencyKey.tenantId` FK biasa ke `Tenant`, BUKAN
  composite-FK ganda seperti `KeanggotaanOutlet`/`PinOutlet`.** Pola
  composite-FK ganda (ADR-011/ADR-013/ADR-015) dipakai KHUSUS ketika sebuah
  baris anak membawa DUA relasi ke entitas tenant-owned yang independen (mis.
  `Outlet` DAN `KeanggotaanTenant` sekaligus) yang secara teori bisa berasal
  dari tenant berbeda tanpa jaminan tambahan. `IdempotencyKey` TIDAK bernaung
  di bawah kondisi ini - ia hanya punya SATU relasi tenant-owned langsung
  (`Tenant` itu sendiri, yang menurut ADR-013 poin 4 tidak pernah perlu
  composite karena `Tenant.id` sudah jadi identitas tenant itu sendiri).
  `outletId` sengaja TIDAK diberi relasi FK apa pun (bahkan bukan FK tunggal
  ke `Outlet`) - ia kolom informational nullable murni ("operasi ini
  tenant-level atau outlet-level"), pola yang identik dengan
  `AuditLog.outletId` yang sudah ada di skema ini sejak awal.
  `@@unique([tenantId, scope, key])` menjamin satu kombinasi
  tenant+scope+key hanya punya satu baris aktif.
- **Keputusan 3 - `DomainOutboxEvent`: transactional outbox, bukan publish
  langsung di transaksi yang sama.** Alternatif yang dipertimbangkan: (a)
  publish event langsung ke message broker/WebSocket di titik yang sama saat
  transaksi database business-state di-commit; (b) tulis event sebagai baris
  di tabel yang sama (`DomainOutboxEvent`) DALAM TRANSAKSI DATABASE YANG SAMA
  dengan perubahan business-state, lalu relay worker terpisah membaca baris
  `TERTUNDA` dan mem-publish secara asinkron. **Dipilih (b)** karena inti
  masalah yang mau dipecahkan adalah ATOMICITY: publish langsung (a) berarti
  ada DUA operasi terpisah (commit database + publish ke sistem lain) yang
  tidak bisa dijamin sukses/gagal BERSAMA-SAMA oleh satu transaksi -
  kegagalan publish setelah commit database berhasil (mis. broker down
  sesaat) berarti event HILANG PERMANEN meski data bisnis sudah berubah,
  padahal konsumen event (worker agregasi analitik ADR-008, notifikasi
  real-time, KDS) butuh jaminan bahwa setiap perubahan state PASTI
  menghasilkan event yang PASTI sampai (eventually). Dengan outbox (b), event
  ditulis sebagai baris database biasa dalam transaksi yang SAMA - artinya
  event tidak akan pernah hilang selama transaksi database itu sendiri
  sukses; relay worker yang mem-publish ke broker/consumer bisa retry
  sepuasnya (`attemptCount`, `availableAt` untuk backoff, `lastError`) tanpa
  risiko kehilangan data sumber. Trade-off yang diterima: ada latensi antara
  commit dan publish nyata (worker polling/dispatch terjadwal), konsisten
  dengan latensi read-model yang sudah diterima di ADR-008.
  - **Daftar `eventType`** didokumentasikan penuh di komentar model
    `DomainOutboxEvent` (`prisma/schema/schema.prisma`) dan
    `docs/api/API-CONTRACT.md`: `order.submitted`, `order.accepted`,
    `order.rejected`, `order.updated`, `order.cancelled`,
    `order.sent_to_kitchen`, `kitchen.started`, `kitchen.ready`,
    `order.served`, `payment.awaiting_confirmation`, `payment.confirmed`,
    `stock.low`, `stock.adjusted`, `shift.opened`, `shift.closed`,
    `attendance.created`. **Publisher NYATA setiap event ini adalah pekerjaan
    domain terkait (Pesanan/Dapur/Pembayaran/Persediaan/Karyawan) di batch
    fitur berikutnya - SENGAJA TIDAK diimplementasikan di batch ini**, sesuai
    batas cakupan `ALT-DEF-017` (infrastruktur saja, bukan business logic
    domain manapun).
  - `@@index([status, availableAt])` mendukung query polling/dispatch relay
    worker yang efisien (`WHERE status IN ('TERTUNDA','GAGAL') AND
    availableAt <= now() ORDER BY availableAt`).
- **Keputusan 4 - `Notification`: internal Altora SAJA, TIDAK ADA
  WhatsApp/SMS/push eksternal.** Model ini murni merepresentasikan baris yang
  dibaca klien Altora sendiri (in-app, lewat polling atau realtime) - TIDAK
  ADA integrasi WhatsApp Business API, SMS gateway, push notification native
  (FCM/APNs), atau saluran eksternal apa pun di batch ini maupun yang
  didesain untuk menggantikan model ini nantinya. Bila kebutuhan saluran
  eksternal muncul di masa depan, itu akan menjadi model TERPISAH (mis.
  `PengirimanEksternal` yang mereferensikan `Notification` sebagai sumber
  konten), bukan perluasan field pada model ini - keputusan ini didorong
  oleh scope produk rilis awal (WhatsApp/SMS butuh kontrak provider dan biaya
  per pesan yang di luar cakupan correction-loop ini, sama seperti alasan
  `QrisKonfirmasiManual` di ADR-003 memilih mode manual dulu).
- **Keputusan 5 - `Notification.penggunaId` nullable: trade-off yang
  didokumentasikan, bukan `NotificationTarget` terpisah.** Notifikasi bisa
  berupa broadcast ke SEMUA pengguna dengan role/akses tertentu di suatu
  outlet (mis. `STOK_KRITIS` ditujukan ke siapa pun berperan GUDANG di outlet
  itu, bukan satu `Pengguna` spesifik), bukan selalu satu penerima
  individual. Dua pendekatan dipertimbangkan: (a) tambahkan model
  `NotificationTarget` (many-to-many `Notification` <-> penerima, baik
  `Pengguna` maupun `Peran`/`Outlet`) yang secara ternormalisasi memodelkan
  banyak-penerima-per-notifikasi; (b) biarkan `penggunaId` nullable, dan
  ketika `NULL` targeting nyata (siapa yang berhak melihat baris ini)
  ditentukan oleh service-layer query (mis. filter berdasarkan `outletId` +
  peran pemanggil) saat endpoint `GET /api/v1/notifikasi` dipanggil, bukan
  dijamin di level skema. **Dipilih (b) untuk batch ini** karena (a)
  menambah kompleksitas skema signifikan (tabel junction + query join
  tambahan di jalur baca notifikasi yang butuh performa cepat/real-time)
  untuk kebutuhan yang belum ada implementasi endpoint nyatanya sama sekali
  di batch ini - **dicatat secara eksplisit sebagai simplifikasi yang
  DIKETAHUI/DISENGAJA untuk sekarang**, bukan kelalaian; bila volume
  broadcast-per-role ternyata signifikan di implementasi nyata,
  `NotificationTarget` harus ditambahkan di batch fitur notifikasi
  berikutnya. `penggunaId` TIDAK di-composite-kan ke tenant (sama seperti
  seluruh relasi `Pengguna` lain di skema ini, ADR-011/ADR-013 poin 5) karena
  `Pengguna` adalah identitas global.
- **Cakupan yang SENGAJA TIDAK dikerjakan di batch ini:** middleware
  idempotency nyata (intersepsi header `Idempotency-Key` di jalur HTTP),
  relay worker outbox nyata (proses yang benar-benar membaca `TERTUNDA` dan
  publish ke broker/WebSocket), publisher event nyata di domain manapun
  (Pesanan/Dapur/Pembayaran/dst. TIDAK diubah untuk menulis
  `DomainOutboxEvent` pada batch ini), endpoint notifikasi nyata (skema
  kontrak `GET /api/v1/notifikasi`/`POST /api/v1/notifikasi/{id}/read` sudah
  didokumentasikan di `API-CONTRACT.md`, tetapi implementasi handler BELUM
  DIKERJAKAN), migrasi Postgres nyata, dan test integrasi sungguhan -
  semuanya `BELUM DIKERJAKAN`/`DIBLOKIR` (`ALT-DEF-029`), konsisten dengan
  pass-pass correction-loop sebelumnya. Status `ALT-DEF-017` diset
  `SIAP_DIVERIFIKASI` (bukan `DITUTUP`) karena alasan yang sama.

## ADR-017: State machine Pesanan 14-status penuh dan snapshot ItemPesanan (ALT-DEF-005, ALT-DEF-016)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-005` mencatat bahwa `StatusPesanan` lama (7 status:
  BARU/DIKONFIRMASI/DIPROSES_DAPUR/SIAP_DISAJIKAN/DISAJIKAN/DIBAYAR/
  DIBATALKAN) tidak bisa merepresentasikan alur multi-kanal (kasir langsung
  vs pelayan vs QR pelanggan yang butuh approval kasir sebelum masuk dapur),
  dan `PesananRiwayatStatus.statusSebelumnya/statusBaru` bertipe `String`
  bebas (bukan type-safe). `ALT-DEF-016` mencatat `ItemPesanan`/
  `ItemPesananModifier` tidak menyimpan snapshot nama/harga lengkap saat
  pemesanan, sehingga histori transaksi bisa berubah tampilannya diam-diam
  saat menu di-rename/harga modifier diubah di kemudian hari. Kedua defect
  digabung dalam satu batch koreksi karena sama-sama berada di domain
  Pesanan dan saling terkait (baris riwayat status yang lebih type-safe
  butuh state machine yang benar dulu). **Cakupan yang SENGAJA TIDAK
  disentuh:** kardinalitas `TiketDapur.pesananId` (masih 1:1 lewat
  `@unique`) - itu scope `ALT-DEF-006`, batch routing dapur multi-stasiun
  berikutnya; payment/promo/inventory/resep/membership/HR TIDAK disentuh.
- **Keputusan 1 - 14 status penuh sesuai spesifikasi korektif, dengan guard
  bercabang per `kanal` di titik-titik tertentu.** Alih-alih satu jalur
  linear tunggal, transisi `DIKIRIM -> MENUNGGU_PERSETUJUAN` (butuh approval
  kasir) HANYA berlaku untuk `kanal = QR_PELANGGAN`; untuk `kanal` KASIR/
  PELAYAN, staf sendiri yang membuat pesanan sehingga `DIKIRIM -> DITERIMA`
  terjadi otomatis (auto-accept, tanpa approval berlapis untuk aksi staf
  sendiri). Serupa, `DITERIMA -> MENUNGGU_PEMBAYARAN` hanya berlaku bila
  kebijakan tenant mewajibkan pembayaran-dimuka (umum untuk QR self-order
  tanpa staf yang mengawasi); kanal KASIR/PELAYAN yang lazimnya membayar di
  akhir (setelah makan) langsung `DITERIMA -> DIKONFIRMASI`. Tabel transisi
  penuh (kolom `statusAsal`/`statusTujuan`/`aktorDiizinkan`/`guard`/
  `sideEffect`/`auditEvent`/`testRequired`) ada di
  `docs/arsitektur/STATE-MACHINES.md` bagian "Pesanan" (menggantikan
  bagian lama).
- **Keputusan 2 - `DITOLAK -> DIKIRIM` DIIZINKAN sebagai jalur retry, BUKAN
  terminal.** Dipertimbangkan dua opsi: (a) `DITOLAK` adalah status
  terminal (pesanan yang ditolak harus dibuat ulang sebagai pesanan baru);
  (b) `DITOLAK -> DIKIRIM` diizinkan (pelanggan/pelayan mengedit pesanan
  yang sama lalu mengirim ulang untuk approval kedua). **Dipilih (b)**
  karena alasan penolakan QR self-order pada praktiknya sering bersifat
  koreksi ringan (mis. "meja salah", "item X sedang habis, pilih lain") yang
  wajar diperbaiki tanpa memaksa pelanggan mengulang seluruh sesi pemesanan
  dari nol - membuat pesanan BARU untuk kasus ini akan mengaburkan
  identitas pesanan (nomor pesanan berubah, riwayat terpecah dua baris
  `Pesanan`) padahal secara bisnis ini masih "pesanan yang sama, coba lagi".
  **Konsekuensi langsung ke desain `PesananPenolakan` (lihat Keputusan 3).**
- **Keputusan 3 - `PesananPenolakan.pesananId` tetap `@unique` (SATU baris
  per pesanan), MESKIPUN retry diizinkan (Keputusan 2).** Ini adalah
  simplifikasi yang DIKETAHUI/DISENGAJA, bukan kelalaian: pada batch
  schema-only ini (belum ada service-layer), skenario "pesanan yang sama
  ditolak DUA KALI berturut-turut" butuh keputusan implementasi (hapus baris
  penolakan lama sebelum menulis yang baru, ATAU ubah `PesananPenolakan`
  jadi riwayat many-per-pesanan seperti `PesananPerubahan`) yang lebih tepat
  diputuskan bersamaan dengan implementasi endpoint tolak/kirim-ulang nyata
  di batch fitur berikutnya - BUKAN diputuskan secara spekulatif di batch
  desain skema ini. **Ditandai eksplisit sebagai TODO batch berikutnya**,
  didokumentasikan di komentar model `PesananPenolakan` di skema.
- **Keputusan 4 - `PesananPembatalan.pesananId` @unique (SATU baris per
  pesanan) karena `DIBATALKAN` adalah status TERMINAL.** Berbeda dari
  `PesananPenolakan` (Keputusan 3), tidak ada jalur transisi APA PUN keluar
  dari `DIBATALKAN` pada tabel transisi (lihat STATE-MACHINES.md) - satu
  pesanan hanya bisa "dibatalkan seluruhnya" tepat sekali sepanjang
  hidupnya, sehingga `@unique` di sini bukan simplifikasi melainkan
  cerminan langsung aturan bisnis. **Dibedakan tegas dari pembatalan level
  ITEM** (`ItemPesanan.status = DIBATALKAN`, yang sudah ada sejak awal dan
  bisa terjadi berkali-kali untuk item berbeda dalam satu pesanan yang
  MASIH AKTIF, tanpa membatalkan pesanan itu sendiri) - `PesananPembatalan`
  HANYA untuk pembatalan seluruh order.
- **Keputusan 5 - `DIBATALKAN` TIDAK bisa dicapai dari `SIAP`/`DISAJIKAN`/
  `SELESAI`; `DIRETUR` HANYA bisa dicapai dari `SELESAI`.** Begitu makanan
  sudah SIAP/DISAJIKAN, "membatalkan" seluruh pesanan bukan lagi operasi
  yang masuk akal secara bisnis (bahan sudah dipakai/disajikan) - jalur
  yang benar adalah `DIRETUR` (setelah `SELESAI`, lunas) atau pembatalan
  ITEM tunggal (`ItemPesanan.status = DIBATALKAN`) untuk kasus mis. satu
  piring cacat. Model detail retur (`PesananRetur`, alokasi refund
  proporsional) adalah scope `ALT-PES-018`/`ALT-DEF-014` (batch domain
  kasir berikutnya) - batch ini HANYA menambahkan nilai enum `DIRETUR` pada
  `StatusPesanan` dan baris transisi di tabel state machine, TIDAK
  membangun model `PesananRetur`.
- **Keputusan 6 - `JenisPerubahanPesanan` sebagai ENUM (bukan String
  bebas seperti `Izin.domain`/`PermintaanPersetujuan.jenisAksi`).**
  Dipertimbangkan mengikuti pola String-bebas yang dipakai domain lain untuk
  taksonomi yang "akan terus bertambah" - tetapi starter list
  (`TAMBAH_ITEM`/`UBAH_KUANTITAS`/`HAPUS_ITEM`/`PINDAH_MEJA`/`SPLIT`/
  `MERGE`/`LAINNYA`) dinilai cukup stabil untuk kebutuhan perubahan pesanan
  (berbeda dari `Izin.domain` yang benar-benar terbuka untuk domain produk
  baru apa pun). Nilai `LAINNYA` disediakan sebagai katup pelepas
  (escape hatch) untuk kasus yang belum tercakup starter list, sehingga
  enum tidak memblokir kebutuhan baru sebelum migrasi berikutnya sempat
  dijalankan. Bila taksonomi ternyata tumbuh cepat pada implementasi nyata,
  migrasi ke String bebas + dokumentasi naratif (pola `Izin.domain`) tetap
  bisa dilakukan di batch berikutnya.
- **Keputusan 7 - `hargaModifierSnapshot` dihitung dari
  `sum(ItemPesananModifier.totalSnapshot)` pada saat item dibuat, disimpan
  sebagai nilai TETAP di `ItemPesanan` (bukan dihitung ulang via agregasi
  tiap kali baris `ItemPesanan` dibaca).** Konsisten dengan pola snapshot
  lain di model ini (`hargaDasarSnapshot`, `hargaVarianSnapshot`, dst.) -
  tujuannya sama: histori tidak boleh berubah nilai meski data master
  berubah, DAN query baca cepat (baca satu kolom, bukan JOIN+SUM setiap
  kali menampilkan struk). Trade-off yang diterima: bila ada bug penulisan
  `ItemPesananModifier` setelah `ItemPesanan` dibuat (seharusnya tidak
  pernah terjadi - modifier hanya ditulis sekali bersamaan dengan item
  induknya), `hargaModifierSnapshot` bisa menyimpang dari SUM baris
  modifier aktual; mitigasi ini adalah tanggung jawab service-layer
  (transaksi tunggal saat membuat `ItemPesanan` + `ItemPesananModifier`
  sekaligus), bukan constraint skema.
- **Keputusan 8 - `ItemPesanan.resepVersiId` ditambahkan sebagai scalar
  `String?` POLOS, TANPA relasi FK apa pun, pada batch ini.** Model
  `VersiResep` (resep versioning, `ALT-DEF-007`/scope `ALT-RSP-002` dst.)
  BELUM ADA di skema pada titik penulisan batch ini - itu scope
  `ALT-DEF-008`-territory (batch resep-versioning terpisah). Membuat model
  `VersiResep` placeholder hanya untuk menggantung FK ini akan mendahului
  desain resep-versioning yang sebenarnya (yang punya keputusan sendiri
  soal `ResepVarian`/`Subresep`/dst., lihat `ALT-DEF-007`) - berisiko FK
  yang dibuat tergesa-gesa harus dirombak ulang begitu `VersiResep` nyata
  dirancang. **Kolom ditambahkan SEKARANG (agar bentuk data `ItemPesanan`
  tidak perlu migrasi tambahan lagi saat `VersiResep` akhirnya ada) tetapi
  relasi FK-nya SENGAJA ditunda** - lihat TODO eksplisit di komentar model
  `ItemPesanan` pada skema.
- **Cakupan yang SENGAJA TIDAK dikerjakan di batch ini:** endpoint/handler
  transisi status nyata, middleware guard kanal/kebijakan-prepaid nyata,
  model `PesananRetur` (ALT-PES-018), perubahan kardinalitas `TiketDapur`
  (ALT-DEF-006), publisher `DomainOutboxEvent` nyata di domain Pesanan,
  migrasi Postgres nyata, dan test integrasi sungguhan - semuanya `BELUM
  DIKERJAKAN`/`DIBLOKIR` (`ALT-DEF-029`), konsisten dengan pass-pass
  correction-loop sebelumnya. Status `ALT-DEF-005` dan `ALT-DEF-016` diset
  `SIAP_DIVERIFIKASI` (bukan `DITUTUP`) karena alasan yang sama.

## ADR-018: KDS multi-stasiun - kardinalitas TiketDapur, gelombang, dan routing (ALT-DEF-006)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-006` mencatat `TiketDapur.pesananId @unique` memaksa
  kardinalitas 1:1 antara `Pesanan` dan `TiketDapur`, sehingga satu pesanan
  tidak bisa dibagi ke lebih dari satu stasiun dapur (Bar/Dapur/Grill/
  Dessert) sekaligus - routing item dapur (`ALT-DPR-002`) dan banyak tiket
  per pesanan (`ALT-DPR-003`/`ALT-DPR-004`) tidak mungkin diimplementasikan.
  ADR-017 (batch sebelumnya) secara eksplisit menunda perubahan ini sebagai
  scope batch berikutnya - batch inilah yang mengerjakannya. **Cakupan yang
  SENGAJA TIDAK disentuh:** payment/promo/inventory/resep/membership/HR;
  handler/endpoint pembuatan tiket nyata (yang MEMBACA `AturanRoutingDapur`
  untuk memutuskan stasiun tujuan tiap baris saat pesanan dikonfirmasi) -
  itu feature work terpisah, batch ini hanya memodelkan tabel aturan.
- **Keputusan 1 - Ganti `TiketDapur.pesananId @unique` (1:1) dengan
  `@@unique([pesananId, stasiunDapurId, nomorGelombang])` (komposit).**
  Alternatif yang dipertimbangkan: (a) tetap 1:1 tapi tambahkan
  `TiketDapurBaris.stasiunDapurId` per baris (routing di level baris, tiket
  tetap satu per pesanan); (b) hapus `@unique` sepenuhnya tanpa constraint
  pengganti (bebas berapa pun tiket per pesanan per stasiun). **Dipilih**
  constraint komposit `[pesananId, stasiunDapurId, nomorGelombang]` sesuai
  spesifikasi koreksi eksplisit, karena ini adalah titik tengah yang benar:
  tetap menjamin "SATU tiket per stasiun per gelombang" (mencegah duplikasi
  tiket yang tidak sengaja untuk kombinasi yang sama), sambil mengizinkan
  banyak tiket lintas stasiun DAN lintas gelombang untuk satu pesanan.
  Opsi (a) ditolak karena kehilangan properti "satu tiket = satu antrian
  kerja di satu layar KDS stasiun" yang menjadi dasar seluruh `ALT-DPR-*`
  (timer/prioritas/hold per tiket, `ALT-DPR-005`-`ALT-DPR-007`, akan jadi
  ambigu jika satu tiket berisi baris dari lebih dari satu stasiun).
  Relasi `Pesanan.tiketDapur` berubah dari `TiketDapur?` menjadi
  `TiketDapur[]`; `@@unique([tenantId, pesananId])` lama di `TiketDapur`
  DIHAPUS (itu hanya ada untuk memenuhi syarat relasi one-to-one yang tidak
  lagi berlaku - composite-FK `(tenantId, pesananId) -> Pesanan(tenantId,
  id)` tetap valid sebagai relasi many-to-one biasa tanpa constraint unik
  tambahan di sisi `TiketDapur`).
- **Keputusan 2 - `TiketDapurBaris.itemPesananId` TETAP `@unique`.**
  Dipertimbangkan apakah `GelombangDapur` (banyak gelombang per pesanan,
  mis. re-fire course kedua) berarti satu `ItemPesanan` yang sama perlu
  muncul di lebih dari satu baris tiket. **Diputuskan TIDAK** - granularitas
  "banyak gelombang" dimodelkan sebagai banyak `TiketDapur` (satu per
  gelombang, dibedakan oleh `nomorGelombang` dalam constraint komposit di
  Keputusan 1), masing-masing dengan barisnya sendiri. Jika kelak
  re-fire/repeat-course membutuhkan `ItemPesanan` yang sama dikirim ulang,
  itu akan menjadi baris BARU di `TiketDapurBaris` milik `TiketDapur`
  gelombang-berikutnya yang BERBEDA - bukan baris kedua di tiket gelombang
  yang sama. Selama satu `ItemPesanan` tidak pernah dikirim dua kali ke
  TIKET YANG SAMA, `@unique` tetap benar dan berguna sebagai jaring pengaman
  terhadap bug pengiriman-dobel-ke-tiket-sama. Didokumentasikan sebagai
  keputusan eksplisit, bukan default yang tidak diperiksa.
- **Keputusan 3 - `GelombangDapur` diimplementasikan sebagai model NYATA
  (bukan hanya field `TiketDapur.nomorGelombang`).** Spesifikasi koreksi
  section 12 menyebut `GelombangDapur` sebagai model bernama eksplisit di
  samping `AturanRoutingDapur`/`RiwayatStatusTiketDapur`. Dipertimbangkan
  untuk MELEWATI model ini (field `nomorGelombang` polos di `TiketDapur`
  sudah cukup untuk sekadar membedakan gelombang dalam constraint komposit)
  - tapi ada metadata level-gelombang NYATA yang tidak dimiliki satu
  `TiketDapur` individual: kapan gelombang secara eksplisit "dipicu" oleh
  staf (`dipicuPada`/`dipicuOlehId` - mis. pelayan menekan "kirim course
  kedua sekarang" setelah tamu selesai course pertama), dan status AGREGAT
  gelombang (`MENUNGGU`/`DIPICU`/`SELESAI`) yang mencakup SEMUA `TiketDapur`
  lintas stasiun dalam gelombang tsb sekaligus - satu gelombang bisa berisi
  tiket di Dapur DAN Bar secara bersamaan, dan "gelombang ini sudah selesai"
  adalah pertanyaan agregat lintas-tiket yang tidak punya rumah natural di
  `TiketDapur` per-baris. **Dipilih mengimplementasikan model nyata** dengan
  `@@unique([pesananId, nomorGelombang])` (satu baris gelombang per nomor
  gelombang per pesanan), composite-FK `(tenantId, pesananId) ->
  Pesanan(tenantId, id)` mengikuti pola ADR-013. Relasi
  `TiketDapur.nomorGelombang` TIDAK dibuat sebagai FK relasional ke
  `GelombangDapur` (tetap `Int` polos) karena `GelombangDapur` bersifat
  opsional secara bisnis (gelombang tunggal/default tidak wajib punya baris
  eksplisit di sini - hanya dibuat saat ada pemicuan bertahap sungguhan);
  memaksa FK wajib akan mengharuskan setiap tiket gelombang-1 default juga
  menulis baris `GelombangDapur` yang sebagian besar waktu tidak membawa
  informasi tambahan apa pun.
- **Keputusan 4 - `AturanRoutingDapur.itemMenuId`/`kategoriMenuId` sebagai
  invariant XOR level-APLIKASI, bukan constraint database.** Prisma/SQL
  murni tidak punya cara deklaratif untuk memaksa "tepat satu dari dua kolom
  nullable harus diisi" tanpa CHECK constraint raw SQL (di luar kemampuan
  schema.prisma pada versi Prisma yang dipakai project ini) - opsi yang
  dipertimbangkan adalah menambahkan migrasi SQL manual dengan `CHECK
  ((itemMenuId IS NOT NULL)::int + (kategoriMenuId IS NOT NULL)::int = 1)`,
  tetapi ini ditunda karena batch ini adalah batch schema-Prisma-murni
  (tidak ada migrasi Postgres nyata yang dijalankan sama sekali pada
  environment ini, lihat `ALT-DEF-029`) - menulis SQL migrasi manual untuk
  satu constraint sebelum ada migrasi lain yang benar-benar berjalan akan
  mendahului keputusan migrasi lain yang lebih besar. **Didokumentasikan
  eksplisit sebagai invariant WAJIB di komentar model** dan wajib
  divalidasi di service-layer sebelum insert/update; TODO eksplisit untuk
  menambahkan CHECK constraint SQL begitu migrasi Postgres nyata mulai
  dijalankan.
- **Keputusan 5 - `StatusTiketDapur` diperluas dari 4 menjadi 8 nilai
  (`BARU`/`DITERIMA`/`DITAHAN`/`SEDANG_DISIAPKAN`/`SELESAI_SEBAGIAN`/`SIAP`/
  `DISAJIKAN`/`DIBATALKAN`), menggantikan `MASUK_ANTRIAN`/`DIPROSES`/`SIAP`/
  `DIAMBIL_PELAYAN` lama.** Nilai lama tidak cukup granular untuk
  membedakan "tiket sudah diterima staf dapur tapi belum mulai dimasak"
  (`DITERIMA`) dari "sedang dimasak" (`SEDANG_DISIAPKAN`), tidak punya jalur
  untuk menahan tiket sementara (`DITAHAN`, `ALT-DPR-007`) atau
  membatalkan tiket individual (`DIBATALKAN`, mis. item habis setelah
  tiket dibuat), dan tidak membedakan "sebagian baris selesai, sisanya
  masih diproses" (`SELESAI_SEBAGIAN`, `ALT-DPR-008`) dari "seluruh baris
  selesai" (`SIAP`). Nama `DIAMBIL_PELAYAN` lama diganti `DISAJIKAN` agar
  konsisten dengan istilah yang sama persis dipakai `StatusPesanan`
  (ADR-017) dan `StatusItemPesanan`. Tabel transisi lengkap ada di
  `docs/arsitektur/STATE-MACHINES.md` bagian "Dapur (Tiket Dapur)".
- **Keputusan 6 - `StatusMasakBaris` (`MENUNGGU`/`DIMASAK`/`SIAP`) TETAP
  terpisah dari `StatusTiketDapur`, TIDAK digabung.** `StatusMasakBaris`
  adalah status PER BARIS ITEM (granularitas lebih halus), sedangkan
  `StatusTiketDapur` adalah status AGREGAT tiket (mencakup nilai seperti
  `DITAHAN`/`DIBATALKAN`/`DISAJIKAN` yang tidak relevan pada level satu
  baris item tunggal - baris item tidak "disajikan" atau "ditahan" sendiri,
  hanya tiketnya). Menggabungkan keduanya akan memaksa nilai enum yang
  tidak masuk akal di salah satu level. Guard `SEDANG_DISIAPKAN -> SIAP`
  (tiket) secara eksplisit bergantung pada "SELURUH `TiketDapurBaris`
  berstatus `SIAP`" - dua enum yang berbeda namun berelasi, bukan satu enum
  yang sama.
- **Cakupan yang SENGAJA TIDAK dikerjakan di batch ini:** handler/endpoint
  pembuatan `TiketDapur` nyata yang membaca `AturanRoutingDapur` saat
  `Pesanan` dikonfirmasi, middleware guard transisi status `TiketDapur`
  nyata, CHECK constraint SQL untuk invariant XOR (Keputusan 4), migrasi
  Postgres nyata (`ALT-DEF-029`), izin baru selain `dapur.routing.kelola`
  (lihat catatan cakupan di `PERMISSION-MATRIX.md`/`izin.seed.ts`). Status
  `ALT-DEF-006` diset `SIAP_DIVERIFIKASI` (bukan `DITUTUP`) karena alasan
  yang sama seperti batch-batch sebelumnya.

## ADR-019: Pembayaran sebagai peristiwa + `AlokasiPembayaran`, dan penyempitan scope metode bayar (ALT-DEF-004, ALT-DEF-014)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-014` mencatat `Pembayaran` terikat 1:1 ke satu `Pesanan`
  lewat kolom `pesananId` (bahkan sudah composite-FK sejak ADR-013), sehingga
  dua kebutuhan bisnis nyata tidak dapat dimodelkan sama sekali: (a) satu
  pesanan dilunasi bertahap oleh beberapa pembayaran (`ALT-KSR-005`), dan (b)
  satu pembayaran melunasi beberapa pesanan sekaligus (group/patungan bill,
  `ALT-KSR-004`). `ALT-DEF-004` mencatat enum `KodeMetodeBayar` masih memuat
  `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET` - sisa scope lama yang bertentangan
  langsung dengan `ALT-QRS-010` (larangan integrasi payment gateway/bank/
  e-wallet) dan ADR-003. Batch ADR-013 sebelumnya secara eksplisit MENUNDA
  business-logic split bill dan hanya mengerjakan tenant-safety-nya; batch
  inilah yang mengerjakannya.
- **Keputusan 1 - Hapus `Pembayaran.pesananId` (beserta composite-FK-nya),
  ganti dengan model baru `AlokasiPembayaran`.** `Pembayaran` kini murni
  merepresentasikan PERISTIWA "sejumlah uang diterima dalam satu tindakan
  kasir": `jumlah` (total peristiwa), `totalDiterima`/`kembalian` (khusus alur
  tunai), `status`, `dikonfirmasiOlehId`. `AlokasiPembayaran(id, tenantId,
  pembayaranId, pesananId, jumlah, createdAt)` yang menjawab "uang ini melunasi
  tagihan yang mana, berapa". Kardinalitas menjadi N:M lewat tabel alokasi,
  yang memenuhi (a) dan (b) sekaligus dengan satu model, bukan dua.
  Alternatif yang dipertimbangkan: (i) mempertahankan `pesananId` sebagai
  kolom nullable "pesanan utama" di samping tabel alokasi - DITOLAK karena
  menciptakan dua sumber kebenaran untuk pertanyaan yang sama dan pasti akan
  menyimpang (kode lama akan terus membaca `pesananId`); (ii) menambah
  `PesananPembayaran` join-table tanpa kolom `jumlah` - DITOLAK karena tanpa
  nominal per pasangan, "berapa yang sudah dibayar untuk pesanan X" tidak
  terjawab pada group bill.
  Kolom `totalDibayar` lama DIGANTI NAMA menjadi `jumlah` - nama lama
  menyiratkan "total tagihan pesanan", padahal satu `Pembayaran` kini bisa
  bernilai lebih kecil dari total pesanan (bayar sebagian) maupun lebih besar
  (group bill).
- **Keputusan 2 - `@@unique([pembayaranId, pesananId])` pada
  `AlokasiPembayaran`.** Paling banyak satu baris alokasi per pasangan
  (pembayaran, pesanan). Bila nilai alokasi untuk pasangan yang sama perlu
  berubah, baris yang ada DIPERBARUI dan perubahannya dicatat lewat
  `KoreksiPembayaran` - bukan ditambah baris kedua. Alternatif "tanpa
  constraint, boleh banyak baris per pasangan" DITOLAK karena membuat
  pertanyaan sesederhana "berapa yang pembayaran Y bayarkan untuk pesanan X"
  menjadi agregasi, tanpa manfaat ekspresif apa pun.
- **Keputusan 3 - `PembayaranMetodeBaris` DIPERTAHANKAN sebagai mekanisme
  pembayaran campuran, dan enum `CAMPURAN` TIDAK PERNAH ditambahkan.**
  Pembayaran campuran (tunai 50.000 + QRIS manual 30.000) = SATU `Pembayaran`
  dengan DUA baris `PembayaranMetodeBaris`. "Campuran" adalah properti
  kardinalitas tabel baris metode, bukan sebuah nilai metode bayar. Menambahkan
  `CAMPURAN` ke `KodeMetodeBayar` akan membuat nilai enum yang tidak pernah
  bisa dijawab pertanyaan "berapa rupiah masuk lewat metode ini" - persis
  kerusakan yang dihindari desain ini. Perlu dicatat bahwa
  `AlokasiPembayaran` dan `PembayaranMetodeBaris` menjawab pertanyaan yang
  BERBEDA dan keduanya diperlukan: alokasi = "uang keluar ke tagihan mana",
  baris metode = "uang masuk lewat instrumen apa". Rencana koreksi lama di
  `DEFECT-LEDGER.md` ALT-DEF-004 yang menyebut campuran dimodelkan sebagai
  "beberapa baris `AlokasiPembayaran`" adalah KELIRU dan dikoreksi di sini.
- **Keputusan 4 - Invariant jumlah adalah invariant LEVEL-APLIKASI, bukan
  constraint database.** Dua invariant wajib, untuk setiap `Pembayaran`:
  1. `SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah`
  2. `SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah`
  Prisma maupun Postgres tidak dapat menegakkan agregat lintas-baris secara
  deklaratif (butuh trigger atau materialized constraint - keduanya di luar
  DSL Prisma dan menambah kompleksitas operasional besar). **Keputusan:**
  validasi WAJIB dilakukan server-side di dalam SATU transaksi database yang
  sama dengan penulisan `Pembayaran` + seluruh barisnya - bukan sebagai
  pemeriksaan terpisah setelah commit. Tidak ada jalur penulisan `Pembayaran`
  yang boleh melewati validator ini. Integration test yang WAJIB ada (batch
  berikutnya, belum ditulis pada batch ini):
  `pembayaran_invariant_sum_metode_sama_dengan_jumlah`,
  `pembayaran_invariant_sum_alokasi_sama_dengan_jumlah`,
  `pembayaran_invariant_gagal_membatalkan_seluruh_transaksi`.
  Yang DIKERJAKAN pada batch ini hanyalah pemodelannya + architecture test
  bahwa model/constraint-nya ada - BUKAN penegakan runtime-nya.
- **Keputusan 5 - `Struk` tetap 1:1 dengan `Pembayaran` (bukan dengan
  `Pesanan`).** Setelah `Pembayaran` tidak lagi 1:1 dengan `Pesanan`,
  konsekuensinya: pada pembayaran bertahap satu pesanan dapat menghasilkan
  BEBERAPA struk (satu per pembayaran - ini benar secara akuntansi, tiap
  penerimaan uang punya buktinya sendiri), dan pada group bill satu struk
  mencakup BEBERAPA pesanan (isinya dirender dari `AlokasiPembayaran`
  pembayaran tsb). Alternatif "struk per pesanan" DITOLAK: struk adalah bukti
  penerimaan uang, dan uang diterima per peristiwa pembayaran.
- **Keputusan 6 - `KoreksiPembayaran` sebagai model baru, append-only.**
  `id, tenantId, pembayaranId, alasan, jumlahSebelum, jumlahSesudah,
  dikoreksiOlehId, createdAt`. Mengikuti ADR-006 (no hard-delete finansial):
  kesalahan input nominal tidak menimpa baris `Pembayaran` secara diam-diam -
  status pembayaran menjadi `DIKOREKSI` dan nilai sebelum/sesudah tercatat.
- **Keputusan 7 - Metode bayar dipersempit menjadi PERSIS empat nilai:**
  `TUNAI`, `TRANSFER_MANUAL`, `QRIS_MANUAL`, `SALDO_TOKO`.
  `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET` DIHAPUS seluruhnya (schema + seluruh
  dokumen). `TRANSFER_MANUAL` (transfer bank yang diverifikasi kasir dari
  mutasi rekening) dan `SALDO_TOKO` (store credit, lihat `ALT-DEF-018`) BARU
  ditambahkan - keduanya ada di scope produk tetapi belum pernah masuk enum.
  Catatan cakupan: `SALDO_TOKO` di sini hanya berupa nilai enum metode bayar;
  model ledger saldo toko (`LedgerSaldoToko`) adalah scope `ALT-DEF-018` dan
  SENGAJA tidak dikerjakan di batch ini.
- **Keputusan 8 - Tenant-safety menyusul ADR-013 untuk seluruh anak
  `Pembayaran`.** `Pembayaran` mendapat `@@unique([tenantId, id])`;
  `AlokasiPembayaran`, `PembayaranMetodeBaris`, `KoreksiPembayaran`,
  `QrisKonfirmasiManual`, `Struk`, dan `PembayaranRefund` semuanya mendapat
  kolom `tenantId` sendiri + composite-FK `(tenantId, pembayaranId) ->
  Pembayaran(tenantId, id)`. `PembayaranMetodeBaris` memakai pola composite-FK
  GANDA (seperti `KeanggotaanOutlet`, ADR-011): satu kolom `tenantId` dipakai
  dua kali, menuju `Pembayaran(tenantId, id)` DAN `MetodeBayar(tenantId, id)` -
  sehingga baris metode tidak mungkin merujuk pembayaran tenant A sekaligus
  katalog metode tenant B. `MetodeBayar` juga mendapat `@@unique([tenantId,
  kode])` (satu baris katalog per kode per tenant).
- **Cakupan yang SENGAJA TIDAK dikerjakan:** `PesananSplit` (split bill PER
  ITEM, `ALT-PES-014`) - itu memecah TAGIHAN sebelum ada pembayaran, masalah
  yang berbeda dari mengalokasikan UANG yang sudah diterima; `PesananRetur`
  (`ALT-PES-018`); `LedgerSaldoToko` (`ALT-DEF-018`); `TransaksiKasir.tenantId`
  (`ALT-DEF-031`); handler/service nyata; migrasi Postgres nyata
  (`ALT-DEF-029`). `ALT-DEF-014` karena itu diset `SIAP_DIVERIFIKASI`, bukan
  `DITUTUP`, dan komponen `PesananSplit`-nya tetap terbuka.

## ADR-020: State machine `Pembayaran` 9-status dan alur konfirmasi QRIS manual (ALT-DEF-004, ALT-DEF-014)

- **Status:** DITERIMA
- **Konteks:** `StatusPembayaran` lama hanya punya 5 nilai (`MENUNGGU`,
  `DIKONFIRMASI`, `GAGAL`, `DIBATALKAN`, `DIREFUND`) dan diagramnya di
  `STATE-MACHINES.md` bahkan menyebut "kartu approved" - jalur yang tidak ada
  dalam produk ini. Tidak ada status untuk: pembayaran yang masih disusun
  kasir (`DRAF`), pelanggan sudah mengklaim membayar tapi kasir belum
  memverifikasi (`MENUNGGU_KONFIRMASI` - inti alur QRIS manual), koreksi salah
  input (`DIKOREKSI`), dan refund sebagian (`DIKEMBALIKAN_SEBAGIAN`, yang
  wajib ada karena `PembayaranRefund` adalah 1:N).
- **Keputusan 1 - Sembilan nilai:** `DRAF`, `MENUNGGU`, `MENUNGGU_KONFIRMASI`,
  `DIBAYAR`, `GAGAL`, `DIBATALKAN`, `DIKOREKSI`, `DIKEMBALIKAN_SEBAGIAN`,
  `DIKEMBALIKAN`. `DIKONFIRMASI` lama diganti `DIBAYAR` (menghindari tabrakan
  istilah dengan `StatusPesanan.DIKONFIRMASI` yang artinya berbeda total);
  `DIREFUND` lama diganti `DIKEMBALIKAN` (konsisten bahasa Indonesia dengan
  nilai enum lain). Default `Pembayaran.status` berubah dari `MENUNGGU` ke
  `DRAF`: kasir menyusun baris metode dan alokasi dulu, dan invariant jumlah
  ADR-019 Keputusan 4 baru wajib terpenuhi saat KELUAR dari `DRAF` - bukan
  saat baris pertama dibuat.
- **Keputusan 2 - Tombol pelanggan TIDAK PERNAH menghasilkan `DIBAYAR`.**
  Ini guard keamanan finansial paling penting di domain ini dan ditulis
  eksplisit sebagai keputusan, bukan sebagai detail implementasi. Alur QRIS
  manual: total dihitung SERVER-SIDE dari pesanan -> server menghasilkan
  payload QRIS bernominal -> pelanggan membayar lewat aplikasi banknya ->
  pelanggan menekan "Sudah Membayar" -> status HANYA boleh menjadi
  `MENUNGGU_KONFIRMASI` -> kasir memeriksa notifikasi masuk di aplikasi
  merchant -> kasir mengonfirmasi -> `DIBAYAR`. Transisi
  `MENUNGGU_KONFIRMASI -> DIBAYAR` mensyaratkan aktor dengan izin
  `pembayaran.qris.konfirmasi-manual` DAN penulisan baris
  `QrisKonfirmasiManual` dalam transaksi yang sama; endpoint yang dapat
  diakses pelanggan (token QR meja, tanpa `izin.kode`) tidak boleh punya jalur
  kode apa pun menuju `DIBAYAR`. Tanpa guard ini, siapa pun yang memegang link
  meja dapat menandai tagihannya sendiri lunas.
- **Keputusan 3 - `GAGAL -> MENUNGGU` (retry) dipertahankan, tetapi
  `DIBATALKAN`/`DIKEMBALIKAN` bersifat terminal.** Pembayaran yang gagal
  (mis. pelanggan salah transfer, saldo toko tidak cukup) boleh dicoba ulang
  pada baris `Pembayaran` yang sama; pembayaran yang sudah dibatalkan atau
  dikembalikan penuh tidak pernah "hidup kembali" - pembayaran baru adalah
  baris baru.
- **Keputusan 4 - `DIKEMBALIKAN_SEBAGIAN` vs `DIKEMBALIKAN` ditentukan oleh
  agregat `SUM(PembayaranRefund.jumlah)`,** dievaluasi server-side setelah
  setiap refund disetujui: `< Pembayaran.jumlah` -> `DIKEMBALIKAN_SEBAGIAN`
  (dan masih boleh menerima refund berikutnya), `== Pembayaran.jumlah` ->
  `DIKEMBALIKAN` (terminal). `> Pembayaran.jumlah` harus DITOLAK. Sama seperti
  ADR-019 Keputusan 4, ini invariant level-aplikasi - database tidak
  menegakkannya.
- Tabel transisi lengkap (statusAsal/statusTujuan/aktorDiizinkan/guard/
  sideEffect/auditEvent/testRequired) ada di `docs/arsitektur/STATE-MACHINES.md`
  bagian 2 "Pembayaran", dalam format yang sama persis dengan tabel Pesanan
  (ADR-017) dan Dapur (ADR-018).

## ADR-021: Konfigurasi QRIS statis per outlet - enkripsi, partial unique index, dan larangan integrasi (ALT-DEF-015)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-015` mencatat tidak ada model `KonfigurasiQris` sama
  sekali - hanya `QrisKonfirmasiManual` (sisi konfirmasi transaksi). Akibatnya
  `ALT-QRS-001` s.d. `ALT-QRS-005` dan `ALT-SEC-007` (enkripsi payload at
  rest) tidak punya kolom untuk diterapkan sama sekali.
- **Keputusan 1 - Model `KonfigurasiQris` + `RiwayatKonfigurasiQris`.**
  `KonfigurasiQris(id, tenantId, outletId, payloadTerenkripsi, fingerprint,
  namaMerchant, kotaMerchant, status, dibuatOlehId, diverifikasiOlehId?,
  diverifikasiPada?, createdAt, updatedAt)`, composite-FK ke `Outlet` per
  ADR-013, enum `StatusKonfigurasiQris` (`DRAF`/`MENUNGGU_VERIFIKASI`/`AKTIF`/
  `NONAKTIF`). `RiwayatKonfigurasiQris(id, tenantId, outletId,
  konfigurasiQrisId, aksi, sebelum Json?, sesudah Json?, dilakukanOlehId,
  createdAt)` dengan enum `AksiKonfigurasiQris` (`DIBUAT`/`DIUBAH`/
  `DIAKTIFKAN`/`DINONAKTIFKAN`/`DIVERIFIKASI`) - append-only, memenuhi
  `ALT-QRS-008`. Audit terpisah (bukan sekadar `AuditLog` generik) dipilih
  karena ini konfigurasi yang menentukan KE REKENING SIAPA uang pelanggan
  mengalir; ia butuh riwayat bertipe kuat yang bisa diquery per outlet, bukan
  baris audit generik bertipe `String`.
  `sebelum`/`sesudah` SENGAJA hanya memuat metadata (nama/kota merchant,
  status, fingerprint) dan TIDAK PERNAH memuat payload (terenkripsi maupun
  plaintext) - kalau tidak, tabel audit menjadi jalur kebocoran yang melewati
  ALT-SEC-007.
- **Keputusan 2 - Enkripsi payload: AES-256-GCM level-aplikasi, kunci dari
  env/KMS.** Kolom `payloadTerenkripsi` menyimpan `nonce || tag || ciphertext`
  (base64). Payload EMV mentah TIDAK PERNAH ditulis ke kolom mana pun.
  Alternatif yang dipertimbangkan: (a) `pgcrypto` di sisi Postgres - DITOLAK
  karena kuncinya akhirnya ikut berada di/dekat database, sehingga dump
  database bersama kunci tetap membocorkan payload dan kriteria terima
  ALT-SEC-007 ("dump database tidak menampilkan payload terbaca") tidak
  benar-benar terpenuhi; (b) enkripsi disk/at-rest bawaan cloud provider -
  DITOLAK karena transparan terhadap query, jadi siapa pun dengan akses baca
  database tetap melihat plaintext. AES-GCM dipilih di atas AES-CBC karena
  authenticated encryption (payload yang diubah/rusak terdeteksi saat dekripsi,
  bukan menghasilkan QR sampah yang dipajang ke pelanggan).
  `fingerprint` = SHA-256 atas payload PLAINTEXT, bukan atas ciphertext -
  ciphertext berubah tiap enkripsi karena nonce acak sehingga tidak berguna
  untuk deteksi perubahan/dedup. Konsekuensi yang diterima secara sadar:
  fingerprint memungkinkan konfirmasi "apakah payload X sudah pernah
  didaftarkan" bagi penyerang yang sudah menebak X - risiko yang dinilai
  dapat diabaikan karena payload QRIS statis outlet memang dicetak dan
  dipajang di meja/kasir untuk umum; nilai rahasianya rendah, yang dilindungi
  adalah integritas dan kemudahan penyalahgunaan massal lewat dump database.
  Rotasi kunci: `updatedAt` + re-enkripsi seluruh baris; belum dirancang
  detailnya di batch ini (TODO batch keamanan).
- **Keputusan 3 - "Satu konfigurasi AKTIF per outlet" diwujudkan sebagai
  PARTIAL UNIQUE INDEX Postgres di file SQL manual, BUKAN constraint Prisma
  palsu.** DSL Prisma tidak dapat mengekspresikan filtered index. Alternatif
  `@@unique([tenantId, outletId, status])` DITOLAK TEGAS: constraint itu tidak
  menegakkan aturan yang dimaksud dan justru salah - ia akan melarang satu
  outlet memiliki lebih dari satu konfigurasi `NONAKTIF`, padahal riwayat
  konfigurasi lama HARUS boleh menumpuk sebagai `NONAKTIF` (ADR-006, no
  hard-delete). Constraint yang tampak menegakkan aturan padahal tidak lebih
  berbahaya daripada tidak ada constraint sama sekali, karena ia mematikan
  kewaspadaan reviewer berikutnya. **Dipilih:** SQL nyata di
  `prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql`
  (`CREATE UNIQUE INDEX ... ON konfigurasi_qris ("tenantId", "outletId") WHERE
  status = 'AKTIF'`) yang WAJIB disertakan pada migrasi pertama, PLUS guard
  level-aplikasi (nonaktifkan konfigurasi lama dan aktifkan yang baru dalam
  satu transaksi). **Sampai index tersebut benar-benar dijalankan terhadap
  Postgres nyata (DIBLOKIR, `ALT-DEF-029`), aturan ini HANYA dijaga di level
  aplikasi dan TIDAK aman terhadap race condition dua request bersamaan** -
  ini dinyatakan eksplisit, bukan diklaim sudah terjamin. Yang benar-benar
  ADA di schema adalah `@@unique([tenantId, outletId, fingerprint])` (payload
  yang sama tidak didaftarkan dua kali di outlet yang sama) - constraint yang
  berbeda dan tidak menggantikan aturan satu-aktif.
- **Keputusan 4 - NO webhook, NO payment gateway, NO bank API, NO e-wallet
  API, NO konfirmasi otomatis - dinyatakan sebagai batasan arsitektur, bukan
  sekadar "belum diimplementasikan".** Tidak boleh ada endpoint callback/
  webhook masuk dari pihak ketiga di seluruh domain pembayaran, tidak ada
  dependency SDK payment gateway, dan tidak ada jalur kode yang mengubah
  `StatusPembayaran` menjadi `DIBAYAR` tanpa aktor manusia berizin
  (`ALT-QRS-010`). Nominal final SELALU dihitung server-side dari total
  pesanan dan disisipkan ke payload QRIS statis outlet saat runtime
  (`ALT-QRS-006`); klien TIDAK PERNAH mengirimkan nominal - kalau klien boleh
  mengirim nominal, pelanggan dapat membayar 1.000 untuk tagihan 100.000 dan
  QR yang dipajang akan "benar" menurut sistem. Digabung dengan ADR-020
  Keputusan 2 (tombol pelanggan tidak pernah menghasilkan `DIBAYAR`), dua
  guard ini yang menjaga seluruh alur QRIS manual.
- **Cakupan yang SENGAJA TIDAK dikerjakan:** parser EMV & validator CRC16
  (`ALT-QRS-003`/`ALT-QRS-004`) - itu kode, bukan skema; implementasi
  enkripsi/dekripsi nyata; penyimpanan file gambar QR (`ALT-QRS-002` -
  gambar diturunkan dari payload saat runtime, tidak disimpan sebagai blob
  terpisah pada desain ini); rotasi kunci; eksekusi SQL partial index; migrasi
  Postgres nyata (`ALT-DEF-029`).

## ADR-022: Versi resep, subresep, modifier-yang-mengubah-resep, dan proses produksi (ALT-DEF-007)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-007` mencatat bahwa `Resep` adalah 1:1 sederhana dengan
  `ItemMenu` (`itemMenuId String @unique`) dengan satu kolom `versi String`
  bebas dan satu tabel baris `ResepBahan(resepId, bahanId, jumlah, satuanId)`.
  Akibatnya empat kebutuhan nyata TIDAK MUNGKIN diimplementasikan sama sekali:
  (a) `ALT-RSP-002` versi resep — mengubah komposisi menimpa satu-satunya baris
  yang ada, sehingga HPP seluruh transaksi lampau ikut berubah surut;
  (b) `ALT-RSP-003` resep per varian — tidak ada tempat menaruh komposisi
  berbeda untuk "porsi jumbo"; (c) `ALT-RSP-005`/`ALT-RSP-006` subresep dan
  yield — `Resep` hanya bisa menargetkan `ItemMenu`, tidak pernah sebuah bahan
  setengah jadi; (d) `ALT-RSP-004` modifier yang mengubah komposisi bahan —
  tidak ada model apa pun. Kolom `versi String` yang ada bersifat kosmetik:
  ia label, bukan entitas, dan tidak ada satu pun baris data yang menggantung
  padanya.

- **Keputusan 1 — `Bahan.jenis` sebagai diskriminator (`JenisBahan`).**
  `BAHAN_BAKU` / `BAHAN_SETENGAH_JADI` / `PRODUK_JADI` / `KEMASAN` /
  `BARANG_OPERASIONAL`, `@default(BAHAN_BAKU)` (seluruh baris yang ada sebelum
  batch ini adalah bahan baku beli). **Inilah yang membuat subresep mungkin
  tanpa model `Subresep` terpisah:** sebuah `BAHAN_SETENGAH_JADI` adalah HASIL
  satu resep (`Resep.bahanHasilId`) sekaligus INPUT resep lain
  (`KomponenResep.bahanId`) — dua peran atas satu baris `Bahan` yang sama, jadi
  tidak ada tabel jembatan yang perlu ditambahkan.
  Alternatif model `Subresep` terpisah (yang disebut rencana koreksi asli di
  `DEFECT-LEDGER.md`) DITOLAK: ia akan menduplikasi seluruh permukaan `Bahan`
  (SKU, satuan dasar, stok minimum, stok, mutasi, opname) untuk entitas yang
  secara persediaan berperilaku identik dengan bahan biasa, dan memaksa
  `KomponenResep` bercabang dua (`bahanId?` XOR `subresepId?`) — memindahkan
  masalah XOR ke tabel yang jauh lebih ramai, bukan menghilangkannya.

- **Keputusan 2 — `Resep` menjadi kontainer bernama dengan sasaran XOR tiga
  arah; penegakan CHECK constraint, bukan constraint Prisma palsu.**
  `itemMenuId String @unique` dan `versi String` DIHAPUS. `Resep` kini
  `(id, tenantId, nama, itemMenuId?, varianMenuId?, bahanHasilId?, status,
  createdAt)` dan menargetkan TEPAT SATU dari ketiganya.
  Prisma tidak dapat mengekspresikan XOR di DSL sama sekali. Penegak
  sebenarnya adalah CHECK constraint Postgres di
  `prisma/migrations/manual/002_resep_target_xor_check.sql`.
  **Yang ditolak dan alasannya:**
  - Tiga model terpisah (`ResepItemMenu`/`ResepVarian`/`ResepSubresep`) —
    XOR menjadi terjamin struktural, TAPI `VersiResep`, `KomponenResep`,
    `ProsesProduksi`, dan `ItemPesanan.resepVersiId` semuanya harus bercabang
    tiga kali. XOR-nya cuma pindah satu lapis ke bawah dan menjadi tiga kali
    lebih banyak.
  - Diskriminator `jenisSasaran` + satu kolom `sasaranId` polimorfik — DITOLAK
    karena membuang FK sungguhan (tidak ada referential integrity ke tabel mana
    pun sama sekali), pelanggaran yang lebih berat daripada XOR tak tertegakkan.
  - Meniru pola `@@unique` apa pun untuk "memalsukan" XOR — tidak ada bentuk
    `@@unique` yang mengekspresikan "tepat satu dari tiga kolom non-null";
    menuliskan sesuatu yang tampak menegakkannya lebih berbahaya daripada tidak
    ada (prinsip yang sama dengan ADR-021 Keputusan 3).
  - **KEJUJURAN YANG WAJIB DINYATAKAN:** file SQL manual di repo ini **belum
    pernah dieksekusi terhadap Postgres mana pun** — tidak ada database di
    environment correction-loop (`ALT-DEF-029`), sama seperti
    `001_konfigurasi_qris_partial_unique.sql` yang sudah ada sejak batch QRIS.
    Sampai migrasi nyata dijalankan, invariant XOR **HANYA** dijaga guard
    level-aplikasi dan TIDAK terjamin di level data.

- **Keputusan 3 — `VersiResep` sebagai entitas, dan "satu versi AKTIF per
  resep" ditegakkan partial unique index, bukan `@@unique([resepId, status])`.**
  `VersiResep(id, tenantId, resepId, nomorVersi, berlakuSejak, berlakuSampai?,
  jumlahHasil, satuanHasilId, penyusutanPersen, snapshotBiaya?, status,
  createdAt)` dengan `@@unique([resepId, nomorVersi])` dan enum
  `StatusVersiResep` (`DRAF`/`AKTIF`/`NONAKTIF`/`ARSIP`).
  - `jumlahHasil` + `satuanHasilId` = yield satu batch (`ALT-RSP-006`).
  - `penyusutanPersen` = susut wajar produksi (`ALT-RSP-007`), `Decimal` karena
    persen pecahan.
  - `snapshotBiaya` = HPP terhitung saat versi DIAKTIFKAN (`ALT-RSP-012`),
    `Int` rupiah bulat per ADR-005, nullable karena versi `DRAF` belum pernah
    diaktifkan sehingga belum punya biaya terhitung. Ia SNAPSHOT, bukan
    kolom turunan yang dihitung ulang tiap baca — kalau dihitung ulang, harga
    bahan hari ini akan menulis ulang HPP transaksi tahun lalu, yaitu persis
    defect yang sedang diperbaiki.
  - **Satu versi AKTIF per resep:** persoalan yang IDENTIK dengan "satu
    `KonfigurasiQris` AKTIF per outlet" (ADR-021 Keputusan 3) dan ditangani
    dengan cara yang sama persis: partial unique index Postgres di
    `prisma/migrations/manual/003_versi_resep_satu_aktif.sql`
    (`... ON versi_resep ("resepId") WHERE status = 'AKTIF'`), PLUS guard
    transaksi level-aplikasi. `@@unique([resepId, status])` DITOLAK TEGAS: ia
    akan melarang satu resep punya lebih dari satu versi `NONAKTIF`/`ARSIP`,
    padahal riwayat versi lama yang menumpuk **adalah seluruh alasan
    keberadaan model ini**. Constraint yang tampak menegakkan aturan padahal
    tidak, mematikan kewaspadaan reviewer berikutnya.
  - **Keterbatasan jujur:** file SQL tersebut, sekali lagi, **belum pernah
    dijalankan**. Aturan satu-AKTIF saat ini tidak aman terhadap race condition
    dua request `activate-version` bersamaan.
  - `berlakuSejak`/`berlakuSampai` SENGAJA tidak dipakai sebagai penentu versi
    aktif (itu tugas `status` + index parsial); ia dipakai untuk audit dan
    untuk menjawab "resep mana yang berlaku pada tanggal X" secara historis.
    Dua sumber kebenaran untuk "aktif" akan saling bertentangan.

- **Keputusan 4 — `KomponenResep` menggantikan `ResepBahan` SEPENUHNYA, dan
  menggantung pada `versiResepId` BUKAN `resepId`.**
  `KomponenResep(id, tenantId, versiResepId, bahanId, jumlah, satuanId,
  opsional, createdAt)`, `@@unique([versiResepId, bahanId])` (dua baris untuk
  bahan yang sama membuat HPP dan pemotongan stok ambigu).
  **`versiResepId`, bukan `resepId`, adalah seluruh inti perbaikan defect ini.**
  Kalau komposisi tetap menggantung pada `Resep`, membuat `VersiResep` tidak
  mengubah apa pun secara fungsional: mengubah komposisi tetap akan menulis
  ulang HPP seluruh transaksi lampau, dan `VersiResep` hanya menjadi tabel
  metadata dekoratif. Versioning yang komponennya tidak ikut ter-versi adalah
  versioning palsu.
  `opsional` menandai komponen yang boleh dilewati (garnish) tanpa membuat
  resep dianggap tidak lengkap.
  **`ResepBahan` DIHAPUS, bukan di-deprecate.** Tidak ada satu pun model lain
  di skema yang merujuknya (dicek: hanya `Bahan`, `Satuan`, `Resep` yang punya
  back-relation ke sana, ketiganya diperbarui di batch ini), belum ada kode
  aplikasi, belum ada migrasi yang pernah dijalankan, dan karena itu belum ada
  satu baris data pun. Membiarkannya berdampingan dengan `KomponenResep` akan
  menciptakan dua sumber kebenaran untuk komposisi resep — persis kelas defect
  yang sedang diperbaiki. `docs/database/03-resep-bahan.md` diperbarui.

- **Keputusan 5 — modifier mengubah resep lewat `KomponenResepModifier` dengan
  aksi TAMBAH/KURANGI/GANTI, menggantung pada versi.**
  `KomponenResepModifier(id, tenantId, versiResepId, modifierOpsiId, aksi,
  bahanId, bahanPenggantiId?, jumlah, satuanId, createdAt)` +
  enum `AksiKomponenModifier`, `@@unique([versiResepId, modifierOpsiId, bahanId])`.
  Menggantung pada `versiResepId` dengan alasan yang sama seperti Keputusan 4:
  efek modifier ikut ter-snapshot bersama versinya, sehingga "extra cheese"
  yang dulu +20g dan sekarang +30g tidak menulis ulang pesanan lampau.
  - **Mengapa tidak ada nilai enum `HAPUS` terpisah:** "no onion" dimodelkan
    sebagai `KURANGI` dengan `jumlah` sebesar jumlah komponen tersebut. Nilai
    `HAPUS` terpisah akan menciptakan dua jalur kode untuk operasi aritmetika
    yang sama (kurangi sebagian vs kurangi seluruhnya) dan membuat kolom
    `jumlah` bermakna-ganda/diabaikan pada satu nilai enum saja. Konsekuensi
    yang diterima sadar: menghapus komponen memerlukan aplikasi membaca jumlah
    komponen dasar terlebih dulu; ini dinilai lebih murah daripada percabangan
    enum permanen.
  - `bahanPenggantiId` nullable dan HANYA bermakna saat `aksi = GANTI`. Ini
    invariant level-aplikasi lain yang tidak bisa diekspresikan Prisma; TIDAK
    ditambahkan CHECK constraint terpisah untuknya pada batch ini karena
    konsekuensi pelanggarannya adalah kolom yang diabaikan, bukan data
    finansial yang salah — dicatat di sini agar tidak terlihat sebagai
    kelalaian.
  - Alternatif "resep terpisah per kombinasi modifier" DITOLAK: jumlah
    kombinasi tumbuh kombinatorial (n opsi -> 2^n resep) untuk informasi yang
    sepenuhnya turunan.

- **Keputusan 6 — `ProsesProduksi`/`ProsesProduksiBaris`/`BatchProduksi` dan
  `KonversiSatuan`.**
  - `ProsesProduksi(id, tenantId, outletId, versiResepId, jumlahTarget,
    jumlahAktual?, status, dimulaiPada?, diselesaikanPada?, dibuatOlehId,
    createdAt)` + enum `StatusProsesProduksi`
    (`DRAF`/`BERJALAN`/`SELESAI`/`DIBATALKAN`). Composite-FK ke `Outlet` dan
    `VersiResep` per ADR-013; relasi ke `Pengguna` sengaja TIDAK di-composite
    (ADR-013 poin 5). `jumlahAktual` nullable karena hanya terisi saat SELESAI
    — selisih target vs aktual adalah realisasi vs rencana (`ALT-RSP-009`).
    Ini menggantikan `RencanaProduksiHarian` yang disebut rencana koreksi asli:
    rencana dan realisasi digabung dalam SATU baris ber-state-machine, bukan
    dua tabel yang harus direkonsiliasi (dan yang tanpa FK di antara keduanya
    akan menjadi sumber ketidakcocokan diam-diam).
  - `ProsesProduksiBaris(id, tenantId, prosesProduksiId, bahanId,
    jumlahDipakai, satuanId)` — konsumsi AKTUAL, sengaja terpisah dari
    `KomponenResep` (yang hanya rencana per satuan hasil). Tanpa baris aktual,
    susut nyata tidak pernah bisa dibandingkan dengan `penyusutanPersen` yang
    diasumsikan, dan `ALT-RSP-007` menjadi angka yang tidak pernah divalidasi.
  - `BatchProduksi(id, tenantId, outletId, prosesProduksiId, bahanHasilId,
    nomorBatch, jumlah, satuanId, tanggalProduksi, tanggalKedaluwarsa?, status,
    createdAt)` + enum `StatusBatchProduksi`
    (`TERSEDIA`/`HABIS`/`KEDALUWARSA`/`DIBUANG`), `@@unique([tenantId, nomorBatch])`
    dan `@@unique([tenantId, id])` (yang terakhir disiapkan agar model
    persediaan/FEFO batch berikutnya bisa memakai composite-FK ke sini).
    `KEDALUWARSA` dipisahkan dari `DIBUANG` karena berbeda konsekuensi
    akuntansi: yang satu konsekuensi tanggal, yang satu keputusan manusia
    beralasan.
  - `KonversiSatuan(id, tenantId, satuanDariId, satuanKeId, faktor, createdAt)`,
    `@@unique([tenantId, satuanDariId, satuanKeId])` (`ALT-RSP-008`). `faktor`
    `Decimal` karena ADR-005 mewajibkan `Int` HANYA untuk nilai uang rupiah;
    faktor konversi butuh pecahan (ons -> gram = 28.3495). Konversi disimpan
    per TENANT, bukan per bahan seperti bunyi `ALT-RSP-008` ("per bahan"):
    gram->kg bernilai 1000 untuk semua bahan, sehingga menyimpannya per bahan
    berarti menduplikasi baris yang identik sebanyak jumlah bahan dan
    mengundang inkonsistensi antar-baris. Konversi khusus-bahan (mis. 1 butir
    telur = 55 gram, yang memang bergantung bahan) TIDAK dimodelkan di batch
    ini — dicatat sebagai keterbatasan sadar, bukan kelalaian.
  - `Satuan` mendapat `@@unique([tenantId, id])` baru agar seluruh model di
    atas dapat memakai composite-FK `(tenantId, satuanId)` per ADR-013.

- **Keputusan 7 — `ItemPesanan.resepVersiId` disambungkan menjadi FK
  sungguhan (utang ADR-017 Keputusan 8 dilunasi).**
  ADR-017 Keputusan 8 menambahkan kolom `resepVersiId String?` sebagai scalar
  POLOS tanpa relasi apa pun, dengan alasan eksplisit bahwa `VersiResep` belum
  ada, dan mencatat TODO untuk menyambungkannya. Batch ini membuat model
  tersebut dan menambahkan
  `resepVersi VersiResep? @relation(fields: [resepVersiId], references: [id])`.
  Inilah yang membuat satu baris pesanan permanen menunjuk versi resep PERSIS
  yang dipakai saat transaksi — melengkapi kolom `*Snapshot` dari ALT-DEF-016
  (yang menjaga tampilan struk) dengan penjagaan sisi BIAYA (HPP). Tetap
  nullable: item menu tanpa resep (mis. minuman botol) sah tidak punya versi
  resep. FK ID tunggal, bukan composite — `ItemPesanan` tidak membawa
  `tenantId` sendiri (baris di bawah `Pesanan`, lihat ADR-013), konsisten
  dengan relasi `itemMenu`/`varianMenu` di model yang sama.
  Assertion negatif di
  `packages/test-support/src/architecture/pesanan-state-machine-snapshot-constraints.test.ts`
  yang melarang relasi `resepVersi` DIBALIK menjadi assertion positif yang
  mewajibkannya — ini pemenuhan follow-up, bukan pelonggaran.

- **Keputusan 8 — SEAM ke ALT-DEF-008 (persediaan): batch ini TIDAK menulis
  mutasi stok apa pun.** Reversal pemakaian bahan (`ALT-RSP-013`) dan
  pemotongan stok otomatis (`ALT-RSP-011`) adalah teritori batch berikutnya.
  Yang disiapkan di sini dan menjadi kontrak serah-terima:
  1. `ProsesProduksiBaris` akan menjadi sumber `MutasiStok` `PRODUKSI_KELUAR`
     (bahan terpakai) dan `BatchProduksi` sumber `PRODUKSI_MASUK` (hasil).
  2. `KomponenResep` (lewat `ItemPesanan.resepVersi`) akan menjadi sumber
     `KELUAR_PEMAKAIAN_RESEP` saat pesanan selesai. Karena `resepVersiId` kini
     FK sungguhan, pemotongan itu dihitung dari versi YANG TERCATAT di baris
     pesanan, bukan dari versi aktif saat ini — perbedaan yang menentukan
     apakah reversal pesanan lama membalik jumlah yang benar.
  3. Reversal WAJIB berupa baris mutasi PEMBALIK baru (ADR-006, no
     hard-delete), tidak pernah menghapus/mengubah mutasi asal, dan besarannya
     dihitung dari `resepVersiId` baris pesanan tersebut — bukan dari resep
     aktif. Ini satu-satunya cara reversal pesanan berumur dua minggu
     mengembalikan jumlah bahan yang benar setelah resep berubah.
  4. `BatchProduksi.tanggalKedaluwarsa` dan `@@unique([tenantId, id])` sudah
     tersedia untuk FEFO batch berikutnya.
  Tidak ada model persediaan yang disentuh di batch ini.

- **Cakupan yang SENGAJA TIDAK dikerjakan:** perhitungan HPP nyata
  (`ALT-RSP-012` — itu kode, dan butuh model harga bahan terbaru yang belum
  ada; `snapshotBiaya` hanya menyediakan kolomnya), pemotongan/reversal stok
  (`ALT-RSP-011`/`ALT-RSP-013`, ALT-DEF-008), eksekusi kedua file SQL manual,
  migrasi Postgres nyata (`ALT-DEF-029`), konversi satuan khusus-per-bahan,
  service/handler resep & produksi, dan tenant-safety `VarianMenu`/
  `ModifierOpsi` (dicatat sebagai `ALT-DEF-035`, bukan diperbaiki diam-diam di
  sini karena itu domain menu).

## ADR-023: Ledger stok sebagai sumber kebenaran tunggal, `StokBahan` sebagai cache turunan (ALT-DEF-008)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-008` mencatat domain persediaan hanya punya `Gudang`,
  `StokBahan` (saldo), `MutasiStok`, `StokOpname`, `StokOpnameBaris`. Yang
  jauh lebih berbahaya daripada daftar model yang hilang adalah bahwa
  **tidak ada satu pun dokumen yang pernah menyatakan mana di antara
  `StokBahan` dan `MutasiStok` yang otoritatif.** `docs/database/04-persediaan.md`
  menulis `kuantitas "saldo berjalan, hasil agregasi mutasi"` di satu tempat,
  tetapi kontrak API menyediakan endpoint yang membaca saldo langsung dan
  tidak ada aturan yang melarang penulisan langsung ke `StokBahan`. Selama
  ambiguitas itu bertahan, implementasi yang wajar akan menulis ke KEDUANYA
  dan saldo akan menyimpang diam-diam - kelas defect yang tidak pernah
  terdeteksi sampai stok opname pertama.

- **Keputusan 1 - `MutasiStok` adalah LEDGER APPEND-ONLY dan SATU-SATUNYA
  sumber kebenaran; `StokBahan` adalah CACHE TURUNAN yang boleh dibuang.**
  Aturan keras yang berlaku di seluruh domain:
  1. Setiap peristiwa stok WAJIB menulis satu (atau lebih) baris `MutasiStok`.
     Tidak ada satu pun jalur kode yang boleh mengubah `StokBahan.kuantitas`
     tanpa baris mutasi pendampingnya dalam transaksi yang sama.
  2. `StokBahan.kuantitas` WAJIB selalu sama dengan
     `SUM(MutasiStok.jumlah)` untuk `(gudangId, bahanId, lokasiStokId)` yang
     sama. Bila keduanya berbeda, **yang benar adalah ledger** dan baris cache
     yang salah.
  3. Koreksi SELALU berupa baris PEMBALIK baru (ADR-006). `MutasiStok` tidak
     pernah di-UPDATE maupun di-DELETE.
  4. Model `MutasiStok` karena itu SENGAJA tidak punya `updatedAt`, tidak
     punya kolom status, dan tidak punya kolom soft-delete - kehadiran salah
     satunya akan menyiratkan baris mutasi punya siklus hidup, padahal ia
     peristiwa yang sudah terjadi.
  - **Seam job rekonsiliasi (FITUR BERIKUTNYA, bukan batch ini).** Kolom
    `StokBahan.direkonsiliasiPada` ditambahkan sebagai tempat berpijak: job
    rekonsiliasi periodik menghitung ulang `SUM(MutasiStok.jumlah)` per
    `(gudangId, bahanId, lokasiStokId)`, MENIMPA `StokBahan.kuantitas`, dan
    mengisi `direkonsiliasiPada`. Arah penulisan itu SATU ARAH dan tidak
    pernah sebaliknya. Job-nya sendiri adalah kode dan tidak ditulis di batch
    ini; yang ditulis adalah kolomnya dan aturannya.
  - **KEJUJURAN YANG WAJIB DINYATAKAN:** "append-only" **TIDAK ditegakkan
    database** pada batch ini. Postgres tidak punya bentuk deklaratif untuk
    "tabel ini hanya menerima INSERT"; penegak sebenarnya (revoke UPDATE/DELETE
    + trigger penolak) ada di
    `prisma/migrations/manual/005_mutasi_stok_append_only_dan_pembalik.sql`
    yang **BELUM PERNAH DIJALANKAN** (`ALT-DEF-029`). Sampai saat itu,
    append-only adalah **disiplin level-aplikasi semata**: satu bug service
    layer - atau satu `UPDATE` lewat `psql` - dapat menulis ulang sejarah stok
    tanpa jejak apa pun.

- **Keputusan 2 - `JenisMutasiStok` diperluas menjadi 12 nilai; nilai lama
  DIGANTI, bukan dipertahankan berdampingan.**
  Nilai baru: `PEMBELIAN_MASUK`, `RETUR_PENJUALAN`, `TRANSFER_MASUK`,
  `PRODUKSI_MASUK`, `PEMAKAIAN_RESEP`, `RETUR_SUPPLIER`, `TRANSFER_KELUAR`,
  `PRODUKSI_KELUAR`, `WASTE`, `PEMAKAIAN_INTERNAL`, `PENYESUAIAN`,
  `KOREKSI_OPNAME`.
  **Pemetaan nilai lama -> baru:**

  | Lama | Baru | Catatan |
  |---|---|---|
  | `MASUK_PEMBELIAN` | `PEMBELIAN_MASUK` | Perubahan urutan kata saja; semantik identik. |
  | `KELUAR_PENJUALAN` | `PEMAKAIAN_RESEP` | Nama lama SALAH secara konseptual: yang berkurang bukan "penjualan" melainkan BAHAN yang dipakai resep. Satu penjualan bisa menghasilkan nol mutasi (item tanpa resep) atau belasan (satu per komponen). |
  | `OPNAME_PENYESUAIAN` | `KOREKSI_OPNAME` | Dipisahkan dari `PENYESUAIAN` manual - keduanya punya jalur otorisasi berbeda (opname butuh approval berjenjang, ALT-PSD-017). |
  | `TRANSFER_MASUK` | `TRANSFER_MASUK` | Tidak berubah. |
  | `TRANSFER_KELUAR` | `TRANSFER_KELUAR` | Tidak berubah. |
  | `RETUR` | `RETUR_PENJUALAN` **atau** `RETUR_SUPPLIER` | **AMBIGU** - lihat di bawah. |

  `RETUR` adalah satu-satunya pemetaan yang tidak deterministik: nilai lama
  itu menutupi DUA peristiwa dengan arah berlawanan (retur pelanggan =
  bahan/produk MASUK kembali; retur ke supplier = barang KELUAR). Pembeda yang
  tersedia adalah `referensiJenis`: `PESANAN` -> `RETUR_PENJUALAN`,
  `PEMBELIAN` -> `RETUR_SUPPLIER`. Karena belum ada satu baris data pun
  (`ALT-DEF-029`), pemetaan ini adalah instruksi untuk migrasi kelak, bukan
  transformasi yang dijalankan sekarang.
  - **Ketidakcocokan nama yang DIPUTUSKAN secara sadar:** ADR-022 Keputusan 8
    poin 2 menyebut nilai enum `KELUAR_PEMAKAIAN_RESEP`, sedangkan master spec
    `ALT-DEF-008` menyebut `PEMAKAIAN_RESEP`. Dipakai **`PEMAKAIAN_RESEP`**
    (bunyi master spec). Awalan `KELUAR_`/`MASUK_` sengaja TIDAK dipakai
    sebagai konvensi umum karena arah sudah dibawa TANDA `jumlah` - dua sumber
    kebenaran untuk arah adalah persis pola yang ADR ini hindari di tempat
    lain. `PEMBELIAN_MASUK`/`TRANSFER_MASUK`/`PRODUKSI_MASUK` mempertahankan
    sufiks arah hanya karena pasangannya (`TRANSFER_KELUAR`/`PRODUKSI_KELUAR`)
    memang perlu dibedakan sebagai peristiwa, bukan sebagai arah.
  - `ReferensiJenisMutasi` ikut diperluas (`PRODUKSI`, `WASTE`, `PENYESUAIAN`,
    `RETUR_PEMBELIAN`, `PEMAKAIAN_INTERNAL`) agar setiap jenis mutasi punya
    jenis dokumen sumber yang benar-benar ada sebagai model.
  - `docs/arsitektur/STATE-MACHINES.md` memuat tiga baris yang merujuk
    `MutasiStok.jenis = RETUR`; ketiganya diperbarui menjadi `RETUR_PENJUALAN`
    di batch ini. Membiarkan referensi ke nilai enum yang tidak ada lagi akan
    membuat dokumen state machine menjadi salah secara diam-diam.

- **Keputusan 3 - `StokBahan` DIPERTAHANKAN NAMANYA; `SaldoStok` adalah alias
  dokumentasi, bukan model baru.**
  `MASTER-CHECKLIST.md` `ALT-PSD-007` menyebut entitas `SaldoStok`. Model
  `StokBahan` yang sudah ada melakukan **persis** tugas itu, sudah dirujuk
  composite-FK yang divalidasi (ADR-013), sudah punya `@@map("stok_bahan")`,
  dan sudah dirujuk `RmStokKritis`. Mengganti namanya adalah churn murni tanpa
  satu pun jaminan tambahan, dan akan memaksa perubahan di test arsitektur
  serta dokumen ERD yang tidak salah. **Yang berubah bukan namanya melainkan
  STATUSNYA:** ia kini dinyatakan secara eksplisit sebagai cache turunan
  (Keputusan 1), yang sebelumnya tidak pernah dinyatakan di mana pun.
  - `StokBahan` mendapat `lokasiStokId String?` dan
    `@@unique([gudangId, bahanId, lokasiStokId])` (menggantikan
    `@@unique([gudangId, bahanId])`) sehingga saldo per sub-lokasi mungkin
    (`ALT-PSD-004`). `NULL` = baris agregat level-gudang.
  - **JEBAKAN NULL-SEMANTICS yang WAJIB dicatat:** Postgres memperlakukan NULL
    sebagai nilai yang selalu BERBEDA di unique index, sehingga
    `@@unique([gudangId, bahanId, lokasiStokId])` **TIDAK** mencegah dua baris
    agregat level-gudang untuk pasangan bahan yang sama. Penegaknya adalah
    partial unique index di
    `prisma/migrations/manual/004_stok_bahan_agregat_gudang_unik.sql`
    (`WHERE "lokasiStokId" IS NULL`) - **BELUM PERNAH DIJALANKAN**
    (`ALT-DEF-029`). Alternatif yang ditolak (lokasi wajib + entitas "DEFAULT"
    boneka; kolom sentinel yang mematikan FK) didokumentasikan di file SQL
    tersebut.
  - `kuantitasDireservasi Decimal @default(0)` ditambahkan: stok **TERSEDIA** =
    `kuantitas - kuantitasDireservasi`. Ini juga cache (kebenarannya
    `SUM(ReservasiStok.jumlah WHERE status = AKTIF)`).

- **Keputusan 4 - `PenyesuaianStok` dan `CatatanWaste` WAJIB punya
  `mutasiStokId` non-null dan `@unique`.**
  Sebuah dokumen penyesuaian/waste yang tidak menulis baris ledger berarti
  saldo berubah tanpa jejak - pelanggaran langsung Keputusan 1. `@unique`
  mencegah dua dokumen mengklaim satu baris mutasi yang sama (yang akan
  membuat nilai kerugian terhitung ganda di laporan waste). Kolom
  `disetujuiOlehId` nullable pada keduanya: ambang nilai yang membutuhkan
  persetujuan adalah kebijakan service-layer
  (`PengaturanPersediaanOutlet.ambangSelisihOpname` untuk opname), bukan
  bagian skema.

- **Keputusan 5 - integritas reversal: apa yang SUDAH dan BELUM dijamin.**
  Kolom `dibalikOlehId String? @unique` yang sudah ada **diverifikasi ulang**
  di batch ini, bukan diasumsikan benar. Yang benar-benar ia jamin:
  1. Satu mutasi dibalik **paling banyak sekali** - dijamin secara struktural
     karena `dibalikOlehId` adalah kolom TUNGGAL (bukan tabel relasi), jadi
     tidak ada tempat untuk menaruh pembalik kedua. **DIJAMIN DB.**
  2. Satu mutasi pembalik membalik **paling banyak satu** mutasi asal -
     dijamin `@unique`. **DIJAMIN DB.**
  Yang **TIDAK** ia jamin sama sekali, dan karenanya HANYA level-aplikasi
  sampai file SQL 005 dijalankan:
  3. `jumlah` pembalik berlawanan tanda tepat dengan mutasi asal.
  4. Pembalik berada di tenant/gudang/bahan yang sama.
  5. Larangan rantai pembalik-dari-pembalik.
  Ketiganya adalah invariant **LINTAS-BARIS** (membandingkan satu baris dengan
  baris lain), dan CHECK constraint Postgres dilarang membaca baris lain -
  satu-satunya penegak level-data yang mungkin adalah trigger, yang ditulis di
  file SQL 005 dan **belum pernah dijalankan**. Menganggap `@unique` menjamin
  "reversal benar" adalah kesalahan baca yang ADR ini ada untuk mencegahnya.

## ADR-024: `LokasiStok`, `BatchStok`, seam `BatchProduksi`, reservasi, dan transfer (ALT-DEF-008)

- **Status:** DITERIMA

- **Keputusan 1 - `LokasiStok` sebagai sub-lokasi di dalam `Gudang`, dan
  `MutasiStok` membawa lokasi SUMBER dan TUJUAN yang keduanya nullable.**
  `LokasiStok(id, tenantId, outletId, gudangId, nama, jenis?, status)` dengan
  composite-FK **outlet-level** ke `Gudang(outletId, id)` (ADR-013 poin 3) -
  varian outlet-level dipilih, bukan tenant-level, karena risiko nyatanya
  adalah lokasi outlet A menunjuk gudang outlet B dalam tenant yang sama.
  `Gudang` karena itu mendapat `@@unique([outletId, id])` baru.
  `MutasiStok` mendapat `lokasiSumberId String?` + `lokasiTujuanId String?`.
  **Keduanya nullable dengan sengaja** karena ketiga bentuk berikut sama-sama
  sah: transfer (dua-duanya terisi), pembelian (hanya tujuan), pemakaian
  (hanya sumber). **Aturan "mana yang wajib untuk jenis mutasi apa" adalah
  invariant LEVEL-APLIKASI** - ia kondisional per-nilai-enum, yang tidak dapat
  diekspresikan DSL Prisma. **SENGAJA TIDAK** ditambahkan CHECK constraint
  untuknya di batch ini: bentuknya akan menjadi rantai `CASE` sepanjang 12
  cabang yang harus disunting setiap kali satu nilai enum ditambahkan, dan
  konsekuensi pelanggarannya adalah kolom kosong yang terdeteksi laporan, bukan
  saldo yang salah (saldo tetap benar karena ia dihitung dari `jumlah` +
  `gudangId`). Dicatat di sini agar tidak terlihat sebagai kelalaian.

- **Keputusan 2 - `ReservasiStok` mengurangi stok TERSEDIA, tidak pernah stok
  FISIK, dan SENGAJA bukan baris ledger.**
  `ReservasiStok(id, tenantId, outletId, itemPesananId, bahanId, jumlah,
  satuanId, status, kedaluwarsaPada?, createdAt, dilepasPada?)` + enum
  `StatusReservasiStok` (`AKTIF`/`DILEPAS`/`DIKONSUMSI`/`KEDALUWARSA`).
  - **Mengapa BUKAN baris `MutasiStok`:** reservasi tidak memindahkan barang
    apa pun. Menuliskannya sebagai mutasi akan membuat `SUM(jumlah)` -
    definisi saldo fisik menurut ADR-023 Keputusan 1 - melaporkan stok yang
    lebih kecil daripada yang benar-benar ada di rak, sehingga opname fisik
    akan selalu menunjukkan "kelebihan" palsu sebesar total reservasi aktif.
  - `DILEPAS` vs `DIKONSUMSI` **wajib dibedakan**: hanya yang kedua yang punya
    baris `MutasiStok` pendamping. Menggabungkan keduanya menjadi satu status
    terminal membuat pertanyaan "apakah reservasi ini pernah menjadi
    pemakaian?" tidak terjawab dari data.
  - Digantung pada `itemPesananId`, **bukan** `pesananId`: membatalkan satu
    baris pesanan tidak boleh melepas reservasi baris lain di pesanan yang
    sama. FK ID tunggal ke `ItemPesanan` (yang tidak membawa `tenantId`
    sendiri) - konsisten dengan `ItemPesanan.resepVersi`, ADR-022 Keputusan 7.
  - **INVARIANT LEVEL-APLIKASI:** `SUM(jumlah)` reservasi `AKTIF` untuk satu
    bahan di satu gudang tidak boleh melebihi saldo fisiknya. Ini invariant
    **SUM lintas-baris** - Prisma tidak dapat mengekspresikannya dan Postgres
    hanya bisa lewat trigger/exclusion constraint yang mahal. Penegakannya
    adalah guard transaksi + `SELECT ... FOR UPDATE` pada baris `StokBahan`.
    **Tidak ada penegak level-data untuk ini, sekarang maupun setelah kelima
    file SQL manual dijalankan.**

- **Keputusan 3 - `BatchStok` DAN `BatchProduksi` dipertahankan dan
  DISAMBUNGKAN FK; TIDAK disatukan (menebus seam ADR-022 Keputusan 8 poin 4).**
  `BatchStok(id, tenantId, outletId, bahanId, nomorBatch, tanggalProduksi?,
  tanggalKedaluwarsa?, kuantitasAwal, hargaPerolehan, lokasiStokId?,
  batchProduksiId?, status, createdAt)` dengan
  `@@unique([tenantId, bahanId, nomorBatch])`.
  ADR-022 Keputusan 6 sudah menyiapkan `BatchProduksi.@@unique([tenantId, id])`
  **secara eksplisit** "agar model persediaan/FEFO batch berikutnya bisa
  memakai composite-FK ke sini" - handoff itu dihormati apa adanya:
  `BatchStok.batchProduksiId` + composite-FK
  `(tenantId, batchProduksiId) -> BatchProduksi(tenantId, id)` +
  `@@unique([tenantId, batchProduksiId])` yang menjadikan relasi ini **1:1
  opsional**.
  - **Mengapa TIDAK disatukan** (yang merupakan alternatif nyata, bukan straw
    man): batch hasil **PEMBELIAN** tidak punya `prosesProduksiId`,
    `versiResepId`, maupun proses apa pun. Menyatukan berarti membuat seluruh
    kolom produksi nullable untuk mayoritas baris, DAN menaruh kolom
    persediaan (`hargaPerolehan`, `lokasiStokId`) di tabel milik domain
    produksi. Pemisahan ini adalah pemisahan DOMAIN, bukan duplikasi:
    `BatchProduksi` menjawab "apa yang DIBUAT dan dari proses mana",
    `BatchStok` menjawab "apa yang ADA di rak, berapa harga perolehannya, di
    lokasi mana, kapan kedaluwarsa".
  - **Bahaya "dua konsep batch yang terputus" ditutup dengan tiga hal:**
    (a) FK yang benar-benar ada, (b) `@@unique` yang membuatnya 1:1,
    (c) invariant tertulis: **setiap `BatchProduksi` atas bahan
    `BAHAN_SETENGAH_JADI` WAJIB melahirkan tepat satu `BatchStok` dalam
    transaksi yang sama dengan mutasi `PRODUKSI_MASUK`.** Poin (c) adalah
    **invariant LEVEL-APLIKASI** - Prisma tidak dapat mewajibkan sisi itu,
    karena kolomnya ada di `BatchStok` dan harus nullable untuk batch
    pembelian. Ini keterbatasan yang diterima sadar dan dinyatakan, bukan
    dilewati.
  - `nomorBatch` unik per `(tenantId, bahanId)`, **bukan** per `tenantId` saja
    seperti `BatchProduksi`. Nomor batch dalam praktik diberikan supplier dan
    hanya bermakna dalam konteks satu bahan; menuntutnya unik lintas-bahan
    akan menolak data supplier yang sah.

- **Keputusan 4 - `TransferStok` + `TransferStokBaris` dengan state machine
  tujuh status, dan pasangan mutasi yang TIDAK ditulis bersamaan.**
  Enum `StatusTransferStok`: `DRAF`/`DIAJUKAN`/`DISETUJUI`/`DIKIRIM`/
  `DITERIMA_SEBAGIAN`/`DITERIMA`/`DIBATALKAN`. Tabel transisi penuh ada di
  `docs/arsitektur/STATE-MACHINES.md` bagian 8.
  - **`TRANSFER_KELUAR` ditulis saat `DIKIRIM`; `TRANSFER_MASUK` ditulis saat
    `DITERIMA`/`DITERIMA_SEBAGIAN` - BUKAN keduanya sekaligus.** Menulis
    keduanya pada satu titik akan membuat barang yang sedang di jalan tampak
    sudah menjadi saldo gudang tujuan, sehingga gudang tujuan bisa "memakai"
    barang yang belum tiba. Jeda di antara keduanya adalah barang dalam
    perjalanan, dan ia memang bukan saldo gudang mana pun.
  - `jumlahDiminta`/`jumlahDikirim?`/`jumlahDiterima?` adalah **tiga kolom
    terpisah**, bukan satu kolom yang ditimpa. Selisih di antara ketiganya
    adalah seluruh alasan `DITERIMA_SEBAGIAN` ada; menimpanya menghapus
    informasi susut/kehilangan dalam perjalanan.
  - Composite-FK **outlet-level** dipakai untuk kedua gudang
    (`gudangAsal` via `(outletAsalId, gudangAsalId) -> Gudang(outletId, id)`).
    Ini yang menjamin di level database bahwa gudang asal benar-benar milik
    outlet asal - jaminan yang TIDAK didapat dari composite `(tenantId,
    gudangId)` saja pada tenant multi-outlet, dan transfer justru operasi yang
    menyeberangi outlet.
  - **INVARIANT LEVEL-APLIKASI:** `gudangAsalId != gudangTujuanId` (transfer ke
    diri sendiri tidak bermakna) dan `jumlahDiterima <= jumlahDikirim <=
    jumlahDiminta`. Keduanya CHECK constraint sederhana yang **sengaja tidak
    ditulis** di batch ini karena `prisma/migrations/manual/` sudah memuat lima
    file yang belum satu pun pernah dijalankan; menambah file keenam yang juga
    tidak dijalankan menambah klaim, bukan jaminan. Dicatat sebagai utang
    eksplisit yang dilunasi bersamaan dengan eksekusi migrasi nyata
    (`ALT-DEF-029`).
  - **Menutup `ALT-DEF-032`:** endpoint `POST /api/v1/transfer-stok` beserta
    `/ajukan`, `/setujui`, `/kirim`, `/terima`, `/batalkan` ditambahkan ke
    `docs/api/API-CONTRACT.md` bagian 6, seluruh operasi posting membawa
    anotasi `Idempotency-Key` **sejak perancangan awal** persis seperti yang
    dituntut baris remediasi `ALT-DEF-032`.

- **Keputusan 5 - `CatatanWaste` + `AlasanWaste`, dan `KebijakanPemesananUlang`
  per OUTLET.**
  - `AlasanWaste(id, tenantId, kode, nama, status)`,
    `@@unique([tenantId, kode])`. `CatatanWaste.alasanWasteId` **non-null** -
    itulah bunyi harfiah acceptance `ALT-PSD-014` ("memilih dari daftar
    standar, bukan teks bebas"). Kolom `catatan String?` tetap ada untuk
    keterangan tambahan, dan ia **melengkapi**, tidak menggantikan, alasan
    berkode.
  - `KebijakanPemesananUlang(id, tenantId, outletId, bahanId, stokMinimum,
    stokMaksimum?, jumlahPemesananUlang?, metode, status)`,
    `@@unique([outletId, bahanId])`. **Per OUTLET**, bukan per tenant: ambang
    reorder outlet bandara dan outlet perumahan berbeda jauh untuk bahan yang
    sama.
  - `stokMinimum` di sini bertipe `Decimal`, sedangkan `Bahan.stokMinimum` yang
    lama bertipe `Int`. Keduanya **berdampingan** setelah batch ini, dan itu
    adalah dua sumber kebenaran - dicatat sebagai defect baru `ALT-DEF-036`
    (bukan diperbaiki diam-diam, karena `RmStokKritis`/`ALT-ANL-005` merujuk
    kolom lama dan perbaikannya menyentuh domain analitik).

## ADR-025: Kebijakan pemotongan stok, FEFO/FIFO, stok negatif, dan state machine opname (ALT-DEF-008)

- **Status:** DITERIMA

- **Keputusan 1 - kebijakan pemotongan stok sebagai KOLOM BERTIPE di model
  `PengaturanPersediaanOutlet` baru, BUKAN baris key-value di
  `PengaturanOutlet`.**
  Enum `KebijakanPemotonganStok`: `SAAT_PESANAN_DITERIMA`/`SAAT_MASUK_DAPUR`/
  `SAAT_SELESAI`/`SAAT_PEMBAYARAN`, `@default(SAAT_MASUK_DAPUR)` sesuai
  rekomendasi master spec - saat itulah bahan secara fisik mulai dipakai,
  sehingga saldo ledger paling dekat dengan kenyataan rak.
  **Mengapa `PengaturanOutlet` (Json key-value) DITOLAK** meski ia sudah ada
  dan "lebih murah": keempat pengaturan di model baru dibaca di **jalur panas
  setiap pemotongan stok**, dan tiga di antaranya adalah enum tertutup. Json
  key-value tidak memberi validasi enum, tidak memberi default, dan **salah
  ketik kunci akan diam-diam jatuh ke nilai default** - artinya mengubah
  perilaku potong-stok (konsekuensi finansial langsung) tanpa error apa pun.
  Untuk pengaturan yang salahnya hanya berakibat kosmetik, `PengaturanOutlet`
  tetap tempat yang benar dan **dipertahankan**; ia tidak digantikan.
  Model: `PengaturanPersediaanOutlet(id, tenantId, outletId @unique,
  kebijakanPemotongan, reservasiSaatPesananDiterima, kedaluwarsaReservasiMenit?,
  metodeAlokasiBatch, izinkanStokNegatif, ambangSelisihOpname?)`.

- **Keputusan 2 - reservasi dibuat saat pesanan DITERIMA, dikonsumsi saat
  masuk dapur.**
  `reservasiSaatPesananDiterima Boolean @default(true)`. Alurnya:
  `Pesanan -> DITERIMA` membuat baris `ReservasiStok` `AKTIF` per komponen
  resep (dihitung dari `ItemPesanan.resepVersiId`, **bukan** dari versi aktif
  saat ini - ADR-022 Keputusan 8 poin 2); `Pesanan -> DIKIRIM_KE_DAPUR`
  mengubahnya menjadi `DIKONSUMSI` dan menulis mutasi `PEMAKAIAN_RESEP`;
  pembatalan/penolakan mengubahnya menjadi `DILEPAS` tanpa mutasi apa pun.
  `kedaluwarsaReservasiMenit` menyediakan jaring pengaman untuk reservasi yang
  tidak pernah mendapat keputusan (job penyapu -> `KEDALUWARSA`); nullable =
  tanpa batas waktu.

- **Keputusan 3 - FEFO default, FIFO fallback; ini logika SERVICE-LAYER dan
  skema hanya wajib membawa cukup kolom untuknya.**
  Enum `MetodeAlokasiBatch` (`FEFO`/`FIFO`), `@default(FEFO)`.
  - **FEFO** mengurutkan `BatchStok` berstatus `TERSEDIA` menaik menurut
    `tanggalKedaluwarsa`. Batch dengan `tanggalKedaluwarsa IS NULL` (bahan tak
    kedaluwarsa) diurutkan **terakhir**, lalu di antara sesamanya menurut
    `createdAt` - inilah FIFO fallback, dan ia berlaku otomatis tanpa
    konfigurasi terpisah.
  - **FIFO** mengurutkan murni menurut `createdAt` menaik, mengabaikan
    kedaluwarsa. Dipakai untuk bahan non-perishable yang penilaiannya
    berbasis biaya perolehan.
  - **Verifikasi bahwa skema benar-benar cukup:** alokasi butuh (1) urutan
    kedaluwarsa -> `BatchStok.tanggalKedaluwarsa`, (2) urutan penerimaan ->
    `BatchStok.createdAt`, (3) umur produksi -> `BatchStok.tanggalProduksi`,
    (4) sisa yang bisa dialokasikan -> `kuantitasAwal` dikurangi
    `SUM(MutasiStok.jumlah WHERE batchStokId = ...)`, (5) penyaring batch mati
    -> `status`, (6) nilai persediaan -> `hargaPerolehan`. **Keenamnya ada.**
    Dua indeks pendukung ditambahkan:
    `@@index([tenantId, bahanId, status, tanggalKedaluwarsa])` (FEFO) dan
    `@@index([tenantId, bahanId, status, createdAt])` (FIFO).
  - **Sisa batch SENGAJA tidak disimpan sebagai kolom.** Menyimpannya akan
    menciptakan cache turunan KEDUA di samping `StokBahan`, dengan aturan
    rekonsiliasi sendiri - persis kelas defect yang ADR-023 Keputusan 1 ada
    untuk mencegahnya. Sisa dihitung dari ledger.

- **Keputusan 4 - kebijakan stok negatif: DITOLAK secara default, dapat
  diizinkan per outlet, tidak pernah senyap.**
  `izinkanStokNegatif Boolean @default(false)`.
  - `false` (default): operasi yang akan membuat stok **TERSEDIA** turun di
    bawah nol **DITOLAK** dengan `409 STOK_TIDAK_CUKUP`. Pesanan tidak dapat
    diterima; pemakaian resep tidak dapat diposting.
  - `true`: operasi tetap diposting, saldo boleh negatif, DAN baris mutasinya
    wajib memicu notifikasi ke peran GUDANG/MANAJER. Nilainya untuk operasi
    resto nyata: bahan yang penerimaan barangnya belum sempat diinput tidak
    boleh menghentikan layanan meja.
  - **INVARIANT LEVEL-APLIKASI SEPENUHNYA.** Ini invariant **SUM lintas-baris**
    atas ledger; ia tidak dapat diekspresikan sebagai CHECK constraint (yang
    hanya melihat satu baris) maupun sebagai apa pun di DSL Prisma. Tidak ada
    penegak level-data untuk ini, sekarang maupun setelah kelima file SQL
    manual dijalankan. Penegakannya adalah guard transaksi yang membaca saldo
    dengan `SELECT ... FOR UPDATE` sebelum menulis mutasi.

- **Keputusan 5 - state machine `StokOpname` tujuh status, dan opname TIDAK
  PERNAH menyentuh saldo secara langsung.**
  Enum lama (`DIRENCANAKAN`/`BERLANGSUNG`/`SELESAI`/`DIBATALKAN`) diganti
  `DRAF`/`SEDANG_DIHITUNG`/`DIKUNCI`/`MENUNGGU_PERSETUJUAN`/`DISETUJUI`/
  `DIPOSTING`/`DIBATALKAN`. Pemetaan: `DIRENCANAKAN -> DRAF`,
  `BERLANGSUNG -> SEDANG_DIHITUNG`, `SELESAI -> DIPOSTING`,
  `DIBATALKAN -> DIBATALKAN`. `DIKUNCI` dan `MENUNGGU_PERSETUJUAN` adalah
  status **baru yang sebelumnya tidak punya padanan sama sekali** - tanpa
  keduanya, `ALT-PSD-017` (approval selisih signifikan) tidak punya tempat
  untuk berdiri.
  - **Opname memposting mutasi `KOREKSI_OPNAME`, tidak pernah menulis
    `StokBahan`.** Konsekuensi langsung ADR-023 Keputusan 1: kalau opname
    menulis saldo langsung, ledger dan cache berpisah pada saat yang justru
    paling penting untuk cocok.
  - Kolom aktor baru: `dibuatOlehId` (sudah ada), `penghitungId?`,
    `pengunciId?`, `penyetujuId?`. **Empat peran terpisah, bukan satu kolom
    `diubahOlehId`** - pemisahan penghitung dari penyetuju adalah inti kontrol
    internal opname (orang yang menghitung tidak boleh menyetujui hitungannya
    sendiri). **Aturan `penghitungId != penyetujuId` adalah invariant
    LEVEL-APLIKASI** - ia CHECK constraint sederhana yang bisa ditulis, tetapi
    lihat catatan utang di ADR-024 Keputusan 4 tentang menambah file SQL yang
    tidak dijalankan.
  - `snapshotPada DateTime?` - waktu kuantitas sistem dibekukan (transisi
    `DRAF -> SEDANG_DIHITUNG`). **Tanpa kolom ini, "selisih" membandingkan
    hitungan fisik pukul 22:00 dengan saldo yang sudah bergerak sampai pukul
    23:00, dan angkanya tidak bermakna sama sekali** - defect diam-diam yang
    ada di model lama.
  - `StokOpnameBaris.kuantitasFisik` dan `selisih` **DIJADIKAN NULLABLE**
    (sebelumnya non-null). Ini perbaikan defect, bukan pelonggaran: baris yang
    belum dihitung tidak boleh berpura-pura fisiknya `0`, karena `0` membuat
    `selisih` sebesar seluruh saldo dan memposting koreksi yang **menghapus
    stok nyata**. `mutasiKoreksiId String? @unique` adalah jejak ledger baris
    ini setelah `DIPOSTING`.
  - `StokOpnameBaris` mendapat `@@unique([stokOpnameId, bahanId, lokasiStokId])`
    - dua baris hitung untuk bahan yang sama menghasilkan koreksi ganda saat
    posting. Jebakan NULL-semantics yang sama seperti ADR-023 Keputusan 3
    berlaku dan ditutup index kedua di file SQL manual 004
    (**belum pernah dijalankan**, `ALT-DEF-029`).

- **Ringkasan invariant LEVEL-APLIKASI domain ini (tidak ada satu pun yang
  dijamin database pada saat ADR ini ditulis):**

  | # | Invariant | Penegak yang direncanakan | Status |
  |---|---|---|---|
  | 1 | `mutasi_stok` append-only | trigger, SQL manual 005 | BELUM DIJALANKAN |
  | 2 | Pembalik berlawanan tanda & sepadan | trigger, SQL manual 005 | BELUM DIJALANKAN |
  | 3 | Satu baris `StokBahan` agregat per (gudang, bahan) | partial unique index, SQL manual 004 | BELUM DIJALANKAN |
  | 4 | Satu baris opname agregat per (opname, bahan) | partial unique index, SQL manual 004 | BELUM DIJALANKAN |
  | 5 | `StokBahan.kuantitas == SUM(MutasiStok.jumlah)` | job rekonsiliasi (kode, belum ditulis) | TIDAK PERNAH DB-ENFORCED |
  | 6 | `SUM(ReservasiStok AKTIF) <= saldo fisik` | guard transaksi + `FOR UPDATE` | TIDAK PERNAH DB-ENFORCED |
  | 7 | Stok tidak negatif (bila `izinkanStokNegatif = false`) | guard transaksi + `FOR UPDATE` | TIDAK PERNAH DB-ENFORCED |
  | 8 | Setiap `BatchProduksi` bahan setengah jadi melahirkan satu `BatchStok` | guard transaksi produksi | TIDAK PERNAH DB-ENFORCED |
  | 9 | `lokasiSumber`/`lokasiTujuan` wajib sesuai jenis mutasi | validasi service-layer | TIDAK DITEGAKKAN |
  | 10 | `gudangAsal != gudangTujuan`; `diterima <= dikirim <= diminta` | validasi service-layer | UTANG CHECK constraint |
  | 11 | `penghitungId != penyetujuId` pada opname | validasi service-layer | UTANG CHECK constraint |

  Baris 5-9 **tidak akan menjadi DB-enforced meski seluruh file SQL manual
  dijalankan** - ia invariant agregat/kondisional yang memang berada di luar
  jangkauan constraint deklaratif. Ini dinyatakan agar pembaca berikutnya tidak
  menganggap "jalankan migrasi" sebagai penutup seluruh daftar ini.

## ADR-026: Domain Promo - stacking, PromoReward vs Promo.jenis, PromoOutlet, dan resolusi konflik (ALT-DEF-009, ALT-DEF-030)

- **Status:** DITERIMA
- **Konteks:** `ALT-DEF-009` di `DEFECT-LEDGER.md` mencatat bahwa
  `PromoPemakaian.pesananId` dulu `@unique`, membuat satu pesanan hanya bisa
  memakai SATU promo - stacking (mis. diskon anggota + BOGO sekaligus) tidak
  mungkin secara struktural, padahal `ALT-PRM-007` s.d. `ALT-PRM-010` di
  `MASTER-CHECKLIST.md` secara eksplisit menjanjikan prioritas, stacking, best
  discount, dan BOGO berulang. `ALT-DEF-030` mencatat gap terpisah: `Promo`
  tidak punya relasi/kolom outlet sama sekali meski enum `JenisSyaratPromo`
  sudah punya nilai `OUTLET_TERTENTU` yang menyiratkan sebaliknya (ditemukan
  saat audit composite-FK ADR-013, sengaja TIDAK dikerjakan di batch itu
  karena murni business-logic domain promo). Domain promo lama juga hanya
  punya EMPAT model (`Promo`, `PromoAturan`, `Kupon`, `PromoPemakaian`) tanpa
  cara memisahkan "kapan promo berlaku" dari "bagaimana diskon dihitung",
  tanpa penjadwalan hari/jam, dan tanpa cara menyimpan >1 baris hasil diskon
  per pesanan.

- **Keputusan 1 - `stackingPolicy`+`conflictGroup`+`prioritas` menggantikan
  `bisaDigabung Boolean`:** Boolean lama hanya menjawab ya/tidak untuk "boleh
  digabung dengan promo LAIN apa pun". Itu tidak cukup untuk memenuhi
  `ALT-PRM-007`/`ALT-PRM-009`. Diganti (bukan ditambah di samping - satu
  sumber kebenaran) dengan:
  - `stackingPolicy` (enum `StackingPolicyPromo`): `TIDAK_BOLEH_DIGABUNG`
    (promo ini mengeksklusi SEMUA promo lain pada pesanan yang sama -
    setara `bisaDigabung = false` lama, dan dijadikan `@default` supaya
    perilaku default tetap sama amannya dengan sebelumnya),
    `BOLEH_DIGABUNG` (boleh digabung dengan promo lain, tunduk pada
    `conflictGroup`), `AMBIL_DISKON_TERBAIK` (bila beberapa promo kandidat
    lolos, engine memilih SATU kombinasi bernilai diskon tertinggi -
    `ALT-PRM-009`), `BERDASARKAN_PRIORITAS` (promo `prioritas` tertinggi
    dievaluasi dan diterapkan lebih dulu, sisanya dievaluasi lagi terhadap
    keranjang yang sudah dipotong - `ALT-PRM-007`).
  - `conflictGroup` (`String?`): promo yang BERBAGI grup yang sama saling
    eksklusif WALAU keduanya sendiri-sendiri `stackingPolicy =
    BOLEH_DIGABUNG` (mis. dua promo "diskon dasar" yang berbeda kondisi
    tapi tidak boleh dobel). `null` = promo tidak ikut grup konflik apa pun.
  - `prioritas` (`Int`, default 0): tie-breaker untuk `BERDASARKAN_PRIORITAS`
    dan input pengurutan evaluasi untuk semua strategi lain.
  - **Algoritma resolusi konflik (didokumentasikan, TIDAK diimplementasikan
    business-logic-nya di batch ini - itu `packages/promo`):**
    1. Kumpulkan seluruh promo yang LOLOS kondisi (`PromoKondisi`, jadwal
       `PromoJadwal`, outlet `PromoOutlet`) untuk pesanan ini - disebut
       "kandidat".
    2. Bila ADA kandidat dengan `stackingPolicy = TIDAK_BOLEH_DIGABUNG`:
       kandidat tersebut MENGEKSKLUSI seluruh kandidat lain sepenuhnya. Bila
       ada LEBIH DARI SATU kandidat `TIDAK_BOLEH_DIGABUNG` yang lolos
       bersamaan (mis. dua promo Header sama-sama eksklusif), keduanya
       saling eksklusif juga - pilih SATU berdasarkan `prioritas` tertinggi
       (fallback dari definisi "tidak boleh gabung dengan APA PUN").
    3. Kandidat sisa (semuanya `BOLEH_DIGABUNG`/`AMBIL_DISKON_TERBAIK`/
       `BERDASARKAN_PRIORITAS`) dikelompokkan per `conflictGroup` (grup
       `null` dianggap masing-masing grup sendiri berisi satu promo, tidak
       saling mengeksklusi promo `null` lain). Dalam SATU grup yang sama,
       hanya SATU promo yang menang.
    4. Pemenang dalam satu grup ditentukan oleh `stackingPolicy` milik
       promo-promo di grup itu: bila ada yang `BERDASARKAN_PRIORITAS`,
       menangkan `prioritas` tertinggi; bila `AMBIL_DISKON_TERBAIK`, hitung
       hasil diskon tiap kandidat dan menangkan nilai rupiah tertinggi;
       campuran strategi dalam satu grup adalah kesalahan konfigurasi yang
       divalidasi saat `Promo` dibuat/diubah (application-level), bukan
       kasus runtime normal.
    5. Seluruh pemenang lintas grup (yang tidak saling mengeksklusi) BOLEH
       diterapkan bersamaan - masing-masing menghasilkan satu baris
       `PromoPemakaian` pada pesanan yang sama.
    6. `usageLimitPerOrder`/`repeatable` (Keputusan 4 di bawah) mengatur
       berapa kali PROMO YANG SAMA (bukan promo berbeda) boleh menghasilkan
       baris `PromoPemakaian` pada satu pesanan.
  - `maximumDiscount`/`usageQuota`/`usageLimitPerCustomer` adalah batas
    tambahan yang independen dari algoritma di atas (dicek terpisah saat
    validasi/penerapan, bukan bagian dari resolusi konflik antar-promo).

- **Keputusan 2 - `PromoReward` menggantikan `Promo.jenis`:** `Promo.jenis`
  (enum `JenisPromo`) lama mencampur identitas promo dengan mekanisme
  hitung diskon, dan hanya mengizinkan SATU jenis reward per promo. `Promo`
  sekarang murni "kapan/untuk siapa" (kondisi+jadwal+outlet+stacking);
  `PromoReward` (model baru, relasi 1:N dari `Promo`) adalah "bagaimana
  diskon dihitung", dengan enum `JenisRewardPromo` (`DISKON_PERSEN`,
  `DISKON_NOMINAL`, `ITEM_GRATIS`, `HARGA_PAKET`, `BELI_X_BAYAR_Y` -
  `BELI_X_BAYAR_Y` ditambahkan karena `HARGA_PAKET`/`BELI_X_GRATIS_Y` lama
  tidak cukup umum untuk kasus "beli 3 bayar 2" yang levelnya harga per unit,
  bukan paket tetap maupun gratis penuh). Satu promo BOLEH punya lebih dari
  satu baris `PromoReward` (reward-stacking DI DALAM satu promo, mis. promo
  ulang tahun = diskon persen + satu item gratis sekaligus) - ini BERBEDA
  dari promo-stacking ANTAR promo yang diatur Keputusan 1. `Promo.jenis` dan
  enum `JenisPromo` DIHAPUS SEPENUHNYA (tidak dipertahankan sebagai kolom
  usang di samping `PromoReward`) - mempertahankan keduanya akan menciptakan
  dua sumber kebenaran yang bisa saling menyimpang, persis pola kesalahan
  yang sudah dikoreksi di domain lain (lihat `ALT-DEF-034`).

- **Keputusan 3 - `PromoOutlet` menutup `ALT-DEF-030`, `OUTLET_TERTENTU`
  dihapus dari `JenisSyaratPromo`:** Model baru `PromoOutlet` (junction
  `Promo` <-> `Outlet`, composite-FK tenant-safe mengikuti ADR-013) adalah
  SATU-SATUNYA mekanisme cakupan outlet. Nilai enum
  `JenisSyaratPromo.OUTLET_TERTENTU` yang lama DIHAPUS (bukan dipertahankan
  di samping `PromoOutlet`) - alasan sama seperti Keputusan 2: dua mekanisme
  untuk makna yang sama akan menyimpang, dan `nilaiSyarat Json` bebas pada
  `PromoAturan`/`PromoKondisi` lama sama sekali tidak bisa divalidasi di
  level database bahwa outlet yang disebut benar-benar milik tenant yang
  sama - `PromoOutlet` bisa. **Konvensi "kosong berarti semua"** (footgun
  umum, didokumentasikan eksplisit di skema dan `10-promo.md`): promo TANPA
  baris `PromoOutlet` berlaku di SELURUH outlet tenant; menambahkan baris
  MEMPERSEMPIT cakupan. Nilai baru `HARI_TERTENTU`/`KANAL_TERTENTU`/
  `PELANGGAN_ANGGOTA`/`PELANGGAN_BARU`/`ULANG_TAHUN` ditambahkan ke
  `JenisSyaratPromo` karena dijanjikan eksplisit oleh `MASTER-CHECKLIST.md`
  (`ALT-PRM-004`, `ALT-PRM-006`, `ALT-PRM-014`) dan `10-promo.md` versi
  sebelum batch ini. `HARI_TERTENTU` SENGAJA tetap ada meski `PromoJadwal`
  (Keputusan 5) juga membawa hari - pembagian tanggung jawab: `PromoJadwal`
  adalah jendela AKTIF/NONAKTIF promo (di luar jendela, promo tidak berlaku
  sama sekali); `PromoKondisi.HARI_TERTENTU` adalah SYARAT yang bisa
  dikombinasikan dengan syarat lain (mis. "MIN_BELANJA 100rb HANYA hari
  Jumat", tanpa mengaktifkan/menonaktifkan promo secara keseluruhan pada
  hari lain).

- **Keputusan 4 - constraint `PromoPemakaian` dan tension `repeatable`:**
  Draft awal berencana `@@unique([promoId, pesananId])` ("promo yang sama
  tidak boleh dipakai dua kali di pesanan yang sama, KECUALI
  `Promo.repeatable = true`"). Ini TIDAK BISA diekspresikan sebagai
  constraint database dengan cara APA PUN yang tersedia: Prisma `@@unique`
  statis tidak bisa bersyarat, dan partial unique index Postgres (precedent
  `prisma/migrations/manual/001`/`002`/`003`) hanya boleh memakai predicate
  atas KOLOM PADA TABEL YANG SAMA - predicate di sini butuh membaca
  `Promo.repeatable` di tabel LAIN (join), yang tidak didukung partial index
  standar. Ini kategori keterbatasan BARU, lebih dalam dari precedent
  XOR/partial-unique sebelumnya (keduanya predicate statis dalam satu
  tabel) - satu-satunya cara menjaminnya di level database adalah TRIGGER,
  di luar scope "SQL manual terdokumentasi" yang dipakai batch-batch
  sebelumnya. **Keputusan: TIDAK ADA unique constraint database pada
  `(promoId, pesananId)` sama sekali.** `PromoPemakaian` hanya mendapat
  `@@index([promoId, pesananId])` (non-unique, untuk performa query) dan
  `@@unique([tenantId, id])` (untuk composite-FK anak). Aturan
  "paling banyak `usageLimitPerOrder` baris `PromoPemakaian` per (promo,
  pesanan), kecuali `repeatable`" ditegakkan MURNI application-level. Gap
  ini dicatat sebagai `ALT-DEF-038` (lihat `DEFECT-LEDGER.md`) - dicatat
  sebagai defect terbuka, bukan sekadar catatan komentar, karena berbeda
  kategori dari precedent yang sudah pernah "ditutup" dengan SQL manual
  (precedent itu MASIH bisa dijalankan sebagai unique index sungguhan kalau
  Postgres tersedia; solusi untuk kasus ini butuh trigger yang belum
  ditulis sama sekali).

- **Keputusan 5 - `PromoJadwal` konsisten dengan pola `JadwalShift`:**
  `jamMulai`/`jamSelesai` memakai `String` (bukan `DateTime`/tipe waktu
  native), mengikuti presisi yang SAMA dengan `JadwalShift.jamMulai`/
  `jamSelesai` yang sudah ada di domain HR. Pola string waktu itu sendiri
  sudah dicatat sebagai keterbatasan/defect-era (`ALT-DEF-018`), tapi
  memperbaikinya di luar cakupan batch domain promo ini - konsistensi
  dengan precedent yang ada dipilih di atas memperkenalkan pola waktu
  KETIGA yang berbeda ke skema. `hariDalamMinggu Int[]` memakai native
  Postgres array (didukung Prisma untuk provider `postgresql`, diverifikasi
  lewat `prisma validate`/`prisma generate` sungguhan - lihat
  `RELEASE-EVIDENCE.md`); array TIDAK BISA dibuat opsional di Prisma
  (scalar list selalu non-null, default kosong), jadi array kosong dipakai
  sebagai representasi "semua hari", konvensi yang sama dengan
  `PromoOutlet` kosong.

- **Keputusan 6 - `PromoKondisi` adalah rename bersih dari `PromoAturan`:**
  Tidak ada kode lain yang bergantung pada nama `PromoAturan` (diverifikasi
  lewat grep sebelum rename), sehingga dipilih rename bersih (bukan
  menambah `PromoKondisi` di samping `PromoAturan` lama yang di-deprecate).
  Bentuk `jenisSyarat`+`nilaiSyarat Json` DIPERTAHANKAN apa adanya (tidak
  diformalkan menjadi kolom per jenis syarat) - masih cukup fleksibel untuk
  syarat heterogen tanpa banyak kolom nullable; trade-off yang disadari:
  tidak ada validasi bentuk `nilaiSyarat` di level database.

- **Keputusan 7 - `PromoPemakaian` menjadi header, `PromoPemakaianBaris`
  menjadi rincian:** `nilaiDiskon` yang dulu langsung di `PromoPemakaian`
  pindah ke `PromoPemakaianBaris` (relasi 1:N) supaya satu penerapan promo
  bisa punya banyak baris hasil (mis. BOGO yang menggratiskan 2 item = 2
  baris, bukan satu baris kuantitas 2) - penting untuk retur parsial per
  item (`ALT-PRM-017`) mengoreksi promo secara presisi. `PromoPemakaian`
  mendapat kolom `status` (`DITERAPKAN`/`DIBATALKAN`/`DIRETUR`) untuk
  melacak siklus hidup penerapan tanpa menghapus baris (audit trail).

- **Keputusan 8 - `PromoSnapshot` (1:1) dan `PromoSimulasi` (independen):**
  `PromoSnapshot.definisiPromo Json` menyalin definisi promo LENGKAP saat
  diterapkan, prinsip sama dengan kolom `*Snapshot` `ItemPesanan`
  (`ALT-DEF-005`/ADR-017 Keputusan 2) - `Json` dipilih (bukan kolom per
  field) karena bentuknya harus menampung struktur
  kondisi+reward+jadwal yang bervariasi per jenis promo. `PromoSimulasi`
  SENGAJA TIDAK terhubung ke `Pesanan` sama sekali - `inputKeranjang Json`
  adalah representasi keranjang bebas bentuk, karena simulasi (`ALT-PRM-015`)
  bisa terjadi SEBELUM pesanan dibuat (mis. kalkulator promo di halaman menu
  publik) dan sengaja TIDAK menulis `PromoPemakaian`/mengurangi kuota.

- **Model yang mendapat composite-FK (mengikuti ADR-013):** `PromoReward`
  (`promo`; `itemGratis` nullable -> `ItemMenu`), `PromoJadwal` (`promo`),
  `PromoOutlet` (`promo`; `outlet` - inilah yang menutup `ALT-DEF-030`),
  `PromoPemakaian` (`promo`; `pesanan`), `PromoPemakaianBaris`
  (`promoPemakaian`; `itemPesanan` TETAP FK ID tunggal karena `ItemPesanan`
  sendiri tidak membawa `tenantId`, konsisten `ItemPesananModifier`),
  `PromoSnapshot` (`promoPemakaian`), `PromoSimulasi` (`promo` nullable).
  `Kupon`/`PromoKondisi` TIDAK disentuh pola FK-nya di batch ini (di luar
  cakupan `ALT-DEF-009`/`ALT-DEF-030` - `PromoKondisi` memang tidak punya
  `tenantId` sendiri per Keputusan 6, dan `Kupon` sudah punya `tenantId` +
  FK `promoId`/`pelangganId` tunggal dari batch sebelumnya, tidak
  diaudit ulang di sini).

## Status ringkas

Semua ADR di atas berstatus **DITERIMA sebagai keputusan desain**, tetapi
implementasinya di kode berstatus **BELUM DIKERJAKAN** kecuali skema Prisma awal
(ADR-002, ADR-004, ADR-005, ADR-011, ADR-012, ADR-013, ADR-014, ADR-015, ADR-016,
ADR-017, ADR-018, ADR-019, ADR-020, ADR-021, ADR-022, ADR-023, ADR-024, ADR-025,
ADR-026, ADR-027 sudah tercermin di
`prisma/schema/schema.prisma`).

## ADR-027: Ledger keanggotaan lengkap - stempel, saldo toko, consent, merge (ALT-DEF-018, ALT-DEF-023, ALT-DEF-039)

- **Status:** DITERIMA
- **Konteks:** Batch correction-loop domain Pelanggan & Keanggotaan menutup tiga
  defect sekaligus karena saling terkait erat pada model yang sama:
  `ALT-DEF-018` (poin/saldo tidak didokumentasikan sebagai cache, tidak ada
  `LedgerSaldoToko`), `ALT-DEF-023` (tidak ada consent maupun merge history),
  dan `ALT-DEF-039` (Step 0 audit: program stempel/punch-card - "Stempel"/
  "Hadiah" pada Fitur Keanggotaan master spec - hilang total dari checklist
  DAN schema). Model `Keanggotaan`/`PoinRiwayat` sebelum batch ini bahkan
  TIDAK PUNYA `tenantId` sama sekali - gap tenant-safety yang sama seperti
  `ALT-DEF-010` di domain lain, ditemukan saat mendesain composite-FK untuk
  ledger baru.

- **Keputusan 1 - Rename `TierMembership` -> `TierKeanggotaan`; `PoinRiwayat`
  DIPERTAHANKAN (bukan `LedgerPoin`).** `MASTER-CHECKLIST.md` (`ALT-MBR-005`)
  sudah memakai nama `TierKeanggotaan` sejak checklist pertama kali
  digranularkan - schema di-rename untuk selaras dengan dokumen yang sudah
  settled (bukan sebaliknya), churn minimal karena satu-satunya dependent
  adalah `Keanggotaan.tierKeanggotaanId`. Sebaliknya, checklist (`ALT-MBR-007`
  dst.) KONSISTEN memakai nama `PoinRiwayat` di kolom Model Data - rename ke
  `LedgerPoin` (mengikuti konvensi penamaan model BARU `LedgerStempel`/
  `LedgerSaldoToko`) akan membuat schema dan checklist berbeda nama untuk
  model yang SAMA, kebalikan dari tujuan rename `TierMembership`. Asimetri
  penamaan ini SENGAJA: `Ledger*` adalah konvensi untuk model BARU pada batch
  ini, bukan aturan wajib untuk model LAMA yang sudah punya nama mapan di
  dokumen lain.

- **Keputusan 2 - `PoinRiwayat` diperkeras mengikuti pola persis
  `MutasiStok`/ADR-023.** Ditambahkan: `tenantId` (sebelumnya TIDAK ADA sama
  sekali), `dibalikOlehId String? @unique` + self-relation `PoinRiwayatPembalik`
  (reversal - kolom tunggal + `@unique` = satu baris dibalik paling banyak
  sekali, satu pembalik membalik paling banyak satu baris asal, identik
  `MutasiStok.dibalikOlehId`), `kadaluarsaPada DateTime?` (hanya terisi pada
  baris PEROLEHAN, dibaca job kedaluwarsa terjadwal `ALT-MBR-009`),
  `dicatatOlehId String?` (nullable - baris sistem seperti perolehan otomatis
  saat pesanan selesai tidak punya aktor manusia), `catatan String?`. Enum
  `JenisPoinRiwayat` mendapat nilai baru `PEMBALIKAN` (sebelumnya reversal
  hanya bisa lewat `PENYESUAIAN` generik yang kehilangan jejak "ini pembalik
  dari baris mana"). Sama seperti `MutasiStok`, "append-only" TIDAK
  ditegakkan database pada batch ini (ALT-DEF-029) - disiplin level-aplikasi
  semata sampai migrasi manual + trigger ditulis dan dijalankan.

- **Keputusan 3 - `LedgerSaldoToko` digantung ke `Pelanggan` LANGSUNG, BUKAN
  `Keanggotaan`.** Dipertimbangkan dua opsi: (a) `Keanggotaan.id` sebagai FK
  saldo toko (mensyaratkan pelanggan sudah jadi anggota program loyalitas
  tier), atau (b) `Pelanggan.id` langsung. **Dipilih (b).** Rasional: saldo
  toko (store credit) adalah kewajiban finansial tenant ke pelanggan (mis.
  dari refund pesanan yang tidak dikembalikan tunai) - ini TIDAK bergantung
  pada apakah pelanggan tersebut terdaftar sebagai anggota program tier/poin.
  Mensyaratkan `Keanggotaan` sebagai prasyarat akan MENOLAK kasus pakai yang
  sah: pelanggan yang belum pernah daftar membership tapi pernah komplain dan
  di-refund ke saldo toko. Konsekuensi: `Pelanggan` mendapat kolom cache
  `saldoTokoCache Int @default(0)` (didokumentasikan sebagai cache, bukan
  sumber kebenaran, pola sama `Keanggotaan.poinAktif`) - TIDAK ditaruh di
  `Keanggotaan` karena `Keanggotaan` sendiri opsional per pelanggan.
  `LedgerSaldoToko.pembayaranId` (nullable) menutup jalur "dihasilkan OLEH
  satu peristiwa `Pembayaran` metode `SALDO_TOKO`" - saat pelanggan BAYAR
  pakai saldo toko (bukan menambah saldo), baris `PEMAKAIAN` di ledger ini
  menunjuk balik ke `Pembayaran` yang memicunya, menutup jalur yang
  disinggung `ALT-MBR-011` ("terhubung ke pembayaran SALDO_TOKO").

- **Keputusan 4 - Merge pelanggan: profil korban TIDAK dihapus; transfer
  saldo lewat ENTRI LEDGER baru, bukan repointing FK.** `RiwayatGabungPelanggan`
  mencatat `pelangganUtamaId` (penyintas) dan `pelangganGabunganId` (korban,
  `@@unique` - satu profil hanya bisa jadi korban SEKALI). Profil korban
  ditandai `Pelanggan.status = DIGABUNGKAN`, baris TIDAK PERNAH dihapus (ADR-006
  no-hard-delete) - `Pesanan`/`Reservasi`/ledger LAMA yang menunjuk profil
  tersebut tetap punya referential integrity dan tetap merepresentasikan
  histori APA ADANYA (siapa yang benar-benar bertransaksi saat itu).
  **Dipertimbangkan dua pendekatan untuk memindahkan SALDO (poin/stempel/saldo
  toko) korban ke penyintas:** (a) repoint FK `keanggotaanId`/`pelangganId`
  pada baris ledger lama milik korban ke penyintas secara langsung, atau (b)
  tulis PASANGAN entri ledger baru (`PENYESUAIAN` negatif di ledger korban,
  `PENYESUAIAN` positif di ledger penyintas) yang merepresentasikan
  "transfer akibat merge". **Direkomendasikan dan didokumentasikan (b),
  BUKAN diterapkan sebagai constraint schema** (ini keputusan PROSES/service-
  layer, bukan sesuatu yang bisa dipaksakan Prisma) karena repointing FK
  (a) MERUSAK riwayat: baris ledger PEROLEHAN lama akan terlihat seolah-olah
  terjadi di keanggotaan penyintas padahal sebenarnya terjadi di korban -
  persis kelas masalah yang prinsip "ledger sebagai catatan peristiwa yang
  sudah terjadi" (ADR-023) ada untuk mencegah. Field bebas `catatan String?`
  yang ditambahkan ke `PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` (bukan
  FK terstruktur ke `RiwayatGabungPelanggan`) dipakai untuk mereferensikan ID
  baris `RiwayatGabungPelanggan` terkait secara tekstual - trade-off desain
  sadar: FK terstruktur akan mensyaratkan SETIAP baris ledger (mayoritas yang
  tidak pernah tersentuh merge) membawa kolom nullable ekstra hanya untuk
  kasus langka ini.

- **Keputusan 5 - `LedgerStempel`/`HadiahStempel` (program stempel, ALT-DEF-039)
  didesain MINIMAL tapi lengkap, enum TERPISAH dari poin, TANPA kedaluwarsa.**
  `HadiahStempel` hanya memodelkan "hadiah = deskripsi bebas + item gratis
  opsional" (bentuk paling umum kartu stempel), BUKAN katalog reward kompleks
  (voucher/diskon persen) - itu scope creep di luar apa yang master spec
  minta. `JenisLedgerStempel` adalah enum SENDIRI (PEROLEHAN/PENUKARAN/
  PEMBALIKAN/PENYESUAIAN), bukan reuse `JenisPoinRiwayat`, karena stempel dan
  poin adalah DUA program loyalitas independen dengan siklus hidup berbeda -
  menyatukan enum akan memaksa satu model ledger melayani dua konsep
  berbeda dengan aturan bisnis berbeda (poin dan stempel bisa dikonversi
  dengan rasio berbeda, dsb). **Sengaja TIDAK ada nilai `KADALUARSA` pada
  stempel** (beda dari poin, `ALT-MBR-009`) - master spec TIDAK menyebutkan
  kebijakan kedaluwarsa stempel secara eksplisit; menambahkannya akan
  menjadi keputusan produk yang belum ada dasarnya, sama seperti alasan
  batch `ALT-DEF-004` melarang menambah metode bayar tanpa dasar. Bila
  kebutuhan kedaluwarsa stempel muncul di kemudian hari, ini requirement
  produk baru yang butuh keputusan tersendiri, dicatat sebagai `ALT-MBR-019`
  (placeholder "bila kolom cache/kedaluwarsa ditambahkan" di
  `MASTER-CHECKLIST.md`).

- **Keputusan 6 - `PersetujuanPelanggan` (bukan `ConsentPelanggan`), dan
  `WHATSAPP_NOTIFIKASI` sebagai nilai enum ASPIRASIONAL.** Nama model
  Indonesia dipilih konsisten dengan seluruh model lain di domain ini
  (`Pelanggan`, `Keanggotaan`, `RiwayatGabungPelanggan`), bukan
  `ConsentPelanggan` seperti yang disebut rencana korektif awal/kolom Model
  Data `ALT-MBR-004` (nama itu adalah label ringkas requirement, bukan
  keharusan literal nama model - pola sama dengan `TierMembership` yang
  diperbaiki KE arah dokumen pada Keputusan 1, di sini schema memakai
  penamaan yang lebih konsisten daripada mengikuti literal checklist).
  `JenisPersetujuanPelanggan` memuat nilai `WHATSAPP_NOTIFIKASI` - PENTING:
  ini HANYA mencatat bahwa pelanggan *menyetujui* dihubungi lewat kanal
  tersebut BILA kanal itu kelak dibangun; ini TIDAK membatalkan keputusan
  `ALT-DEF-017` bahwa notifikasi sistem HANYA in-app/internal pada batch ini.
  Consent bersifat pernyataan status yang berlaku sampai dicabut (`dicabutPada`
  diisi pada baris YANG SAMA), berbeda pola dari ledger keuangan
  (`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko`) yang tidak pernah
  di-UPDATE - consent BARU (mencabut lalu menyetujui lagi) tetap menjadi
  baris BARU, bukan menghidupkan kembali baris lama.

- **Model yang mendapat composite-FK (mengikuti ADR-013):** `Keanggotaan`
  (ke `Pelanggan`, ke `TierKeanggotaan` - keduanya BARU, model ini sebelumnya
  tidak punya `tenantId` sama sekali), `PoinRiwayat` (ke `Keanggotaan`, ke
  `Pesanan` - BARU), `LedgerStempel` (ke `Keanggotaan`, `Pesanan`,
  `HadiahStempel` - seluruhnya BARU), `LedgerSaldoToko` (ke `Pelanggan`,
  `Pesanan`, `Pembayaran` - seluruhnya BARU), `PersetujuanPelanggan` (ke
  `Pelanggan` - BARU), `RiwayatGabungPelanggan` (ke `Pelanggan` DUA KALI
  dengan nama relasi berbeda `RiwayatGabungUtama`/`RiwayatGabungGabungan` -
  BARU), `HadiahStempel` (ke `ItemMenu` - BARU). Relasi ke `Pengguna`
  (`dicatatOlehId`/`digabungOlehId`) TETAP FK ID TUNGGAL, tidak pernah
  di-composite-kan (ADR-013 poin 5, identitas global).

- **Cakupan batch ini vs. yang BELUM dikerjakan:** schema, dokumen
  (`docs/database/11-pelanggan-keanggotaan.md`, `docs/api/API-CONTRACT.md`,
  `docs/keamanan/PERMISSION-MATRIX.md`, `prisma/seed/izin.seed.ts`,
  `docs/engineering/TRACEABILITY-MATRIX.md`), dan test struktur arsitektur.
  **BELUM dikerjakan (di luar scope batch ini):** handler/endpoint nyata
  (perolehan poin/stempel otomatis saat pesanan selesai, job rekonsiliasi
  cache, job kedaluwarsa poin, endpoint merge/consent), migrasi Postgres
  nyata dan trigger append-only untuk `PoinRiwayat`/`LedgerStempel`/
  `LedgerSaldoToko` (DIBLOKIR, ALT-DEF-029 - tidak ada file SQL manual baru
  ditulis pada batch ini karena pola triggernya identik `MutasiStok`/file 005
  yang sudah ada sebagai precedent, menulis salinannya tanpa Postgres nyata
  untuk mengujinya dinilai tidak menambah nilai verifikasi).

## ADR-028: Rombak domain Karyawan & Absensi - multi-outlet, historisasi jabatan, shift lintas-tengah-malam, koreksi absensi append-only (ALT-DEF-019, ALT-DEF-024, ALT-DEF-025)

- **Status:** DITERIMA
- **Konteks:** Batch correction-loop domain terakhir (Karyawan & Absensi)
  menutup tiga defect terkait erat: `ALT-DEF-019` (`Karyawan` hanya terikat
  satu outlet via `outletUtamaId`; tidak ada model koreksi absensi
  append-only+approval), `ALT-DEF-024` (`JadwalShift.jamMulai`/`jamSelesai`
  bertipe `String` bebas tanpa penanda shift lintas-tengah-malam), dan
  `ALT-DEF-025` (`Absensi` tidak punya pencatatan istirahat). Model lama:
  `Jabatan`, `Karyawan` (`jabatanId`, `outletUtamaId` statis), `JadwalShift`
  (`jamMulai`/`jamSelesai String`), `PenugasanShift`, `Absensi`, `CutiIzin`.

- **Keputusan 1 - `HubunganKerja` BARU memisahkan identitas karyawan dari
  riwayat employment; `jabatanId` pindah dari `Karyawan` ke
  `HubunganKerja`.** `Karyawan.jabatanId` adalah FK statis - jabatan
  karyawan (promosi, mutasi departemen) tidak bisa berubah tanpa kehilangan
  histori peran lama. Prinsip sama seperti `VersiResep` (ADR sebelumnya):
  entitas identitas (`Karyawan`, mis. `Resep`) dipisah dari entitas
  ber-versi/periode (`HubunganKerja`, mis. `VersiResep`). "Jabatan aktif"
  karyawan didapat lewat query eksplisit - `HubunganKerja` dengan
  `status = AKTIF` dan (`berakhirPada IS NULL` atau `berakhirPada >=
  sekarang`), diurutkan `mulaiPada DESC`, ambil satu - BUKAN field statis
  yang bisa langsung dibaca. `Departemen` (BARU, master data tenant-scoped)
  digantung ke `HubunganKerja` juga (opsional), rasional sama: departemen
  adalah properti SATU periode kerja, bukan identitas permanen karyawan.
  `tipeHubungan` (`TETAP`/`KONTRAK`/`PARUH_WAKTU`/`MAGANG`) ditambahkan
  karena master spec menyinggung jenis employment yang sebelumnya tidak
  terwakili sama sekali di schema.

- **Keputusan 2 - `KaryawanOutlet` many-to-many menggantikan
  `Karyawan.outletUtamaId` SEPENUHNYA (dihapus, bukan dipertahankan
  paralel).** Dipertimbangkan dua opsi: (a) hapus `outletUtamaId`, ganti
  total dengan `KaryawanOutlet.isUtama = true` sebagai satu-satunya sumber
  "outlet utama", atau (b) pertahankan `outletUtamaId` sebagai pointer cepat
  yang disinkronkan manual dengan `KaryawanOutlet`. **Dipilih (a).**
  Rasional: (b) menciptakan DUA sumber kebenaran yang bisa menyimpang (mis.
  `KaryawanOutlet` diubah tapi `outletUtamaId` lupa disinkronkan) - kelas
  masalah yang sama persis yang mendorong `ALT-DEF-001` menghapus
  `Pengguna.tenantId` demi model `KeanggotaanTenant`/`KeanggotaanOutlet`
  murni. Ini perubahan BREAKING TAPI BENAR (didokumentasikan secara sadar,
  bukan diam-diam) - setiap query/handler yang sebelumnya membaca
  `karyawan.outletUtamaId` langsung harus diganti query
  `karyawanOutlet.findFirst({ where: { karyawanId, isUtama: true } })`.
  Disiplin "paling banyak satu `isUtama=true` per karyawan" adalah level
  aplikasi pada batch ini (Prisma tidak bisa menyatakan conditional-
  uniqueness lintas baris, ALT-DEF-029 - identik keterbatasan yang sudah
  dicatat untuk domain lain), didokumentasikan sebagai gap yang perlu
  partial unique index nyata begitu Postgres tersedia.

- **Keputusan 3 - Rename `JadwalShift` -> `TemplateShift`, `PenugasanShift`
  -> `JadwalKerja`; `jamMulai`/`jamSelesai` TETAP `String` "HH:mm", BUKAN
  `DateTime @db.Time`.** Instruksi batch meminta mencoba `@db.Time` bila
  bisa dipakai bersih. **Dipertimbangkan dan DITOLAK** karena tidak ada
  Postgres nyata di environment ini (`ALT-DEF-029`) untuk memvalidasi
  perilaku sesungguhnya tipe `TIME` lewat driver Prisma - risiko konkret:
  `@db.Time` di PostgreSQL tidak membawa komponen tanggal/zona waktu sama
  sekali (berbeda dari `TIMESTAMP`), dan perilaku serialisasi driver
  (apakah dikembalikan sebagai `Date` dengan tanggal epoch 1970-01-01, atau
  string) tidak bisa dipastikan tanpa `prisma generate` + query nyata
  terhadap database yang benar-benar berjalan - mengklaim "sudah dicoba dan
  bekerja" tanpa bisa membuktikannya adalah persis kelas kesalahan yang
  proses koreksi ini berulang kali memperbaiki di batch lain. String
  "HH:mm" dipertahankan sebagai simplifikasi SADAR yang didokumentasikan,
  dengan `lintasTengahMalam Boolean @default(false)` (BARU) melakukan
  pekerjaan sesungguhnya untuk `ALT-DEF-024`: bila `true`, aplikasi WAJIB
  memperlakukan `jamSelesai` sebagai terjadi di TANGGAL BERIKUTNYA saat
  menghitung durasi/deteksi overlap - flag EKSPLISIT, bukan disimpulkan
  secara implisit dari `jamSelesai < jamMulai` (rapuh: gagal untuk shift
  tepat 24 jam, dan tidak membedakan "data salah entri" dari "memang lintas
  tengah malam").

- **Keputusan 4 - Jadwal berulang: `PolaJadwalBerulang` (BARU) MENGHASILKAN
  baris `JadwalKerja` individual, bukan recurrence-rule yang dievaluasi
  lazy.** Dipertimbangkan: (a) field recurrence-rule (mis. RRULE-style) pada
  `JadwalKerja` itu sendiri yang dievaluasi saat baca, atau (b) model
  `PolaJadwalBerulang` terpisah yang menjadi SUMBER bagi service-layer untuk
  men-generate baris `JadwalKerja` konkret per tanggal yang cocok. **Dipilih
  (b).** Rasional: (a) membuat pertanyaan sesederhana "jadwal karyawan X
  hari Selasa depan" butuh evaluasi rule di setiap query (lambat, sulit
  di-index, sulit menangani pengecualian satu hari seperti "Selasa depan
  libur nasional, batalkan"); (b) menjaga SETIAP hari sebagai baris
  `JadwalKerja` independen yang bisa langsung di-`SELECT`/edit/batalkan satu
  per satu tanpa menyentuh pola induknya - `JadwalKerja.polaBerulangId`
  (nullable) hanya jejak asal-usul, TIDAK PERNAH dipakai untuk logika baca
  jadwal. Proses generate baris dari pola adalah service-layer/job
  terjadwal, di luar cakupan schema batch ini.

- **Keputusan 5 - `KoreksiAbsensi` (CRUX DECISION, `ALT-HR-015`):
  `Absensi.jamMasuk`/`jamPulang` immutable; approval menulis
  `jamMasukEfektif`/`jamPulangEfektif` pada baris ASLI, bukan membuat baris
  `Absensi` baru.** Dua opsi diberikan oleh spesifikasi koreksi: (a) app
  membuat baris `Absensi` BARU dan menandai baris lama "superseded" saat
  koreksi disetujui, atau (b) `Absensi` mendapat kolom `jamMasukEfektif`/
  `jamPulangEfektif` yang HANYA di-update lewat `KoreksiAbsensi` yang
  disetujui, sementara `jamMasuk`/`jamPulang` asli tetap immutable selamanya
  sebagai bukti presensi apa-adanya. **Dipilih (b).** Rasional: `Absensi`
  adalah entitas dengan identitas SATU-PER-PERISTIWA-PRESENSI yang dirujuk
  luas oleh domain lain dengan asumsi itu (mis.
  `RmKinerjaKaryawanHarian.karyawanId` + `tanggal`, laporan lembur
  `ALT-HR-013`, deteksi keterlambatan `ALT-HR-012`) - opsi (a) memaksa
  SETIAP consumer tersebut menambah logika "ikuti rantai supersede sampai
  baris terbaru" untuk setiap baca, kelas bug yang sama seperti FK yang
  menunjuk baris usang. Opsi (b) menjaga SATU baris = SATU identitas
  presensi permanen, dengan pemisahan eksplisit "apa yang sungguh terjadi
  di lapangan" (`jamMasuk`/`jamPulang`, TIDAK PERNAH ditulis ulang - bukti
  audit) vs "apa yang harus dipakai untuk perhitungan/laporan setelah
  koreksi disetujui" (`*Efektif`, kolom CACHE eksplisit yang hanya
  diperbarui oleh service-layer SETELAH approval - disiplin identik
  `Pelanggan.saldoTokoCache`, ADR-027). Mekanisme lengkap: `KoreksiAbsensi`
  menyalin nilai `*Sebelum` sebagai SNAPSHOT saat pengajuan (bukan referensi
  hidup ke `Absensi` - kalau `Absensi` berubah lagi sebelum koreksi ini
  diproses, `*Sebelum` tetap merepresentasikan apa yang dilihat pengaju saat
  itu), mengusulkan nilai `*Sesudah`, dan baru menulis `*Efektif` pada
  `Absensi` setelah `disetujuiOlehId` + `status = DISETUJUI` terisi. Relasi
  `Absensi` -> `KoreksiAbsensi` SENGAJA one-to-many (bukan one-to-one) -
  pengajuan yang ditolak lalu diajukan ulang membuat baris `KoreksiAbsensi`
  baru, riwayat pengajuan lama tetap ada sebagai jejak audit (ADR-006
  no-hard-delete).

- **Keputusan 6 - `IstirahatAbsensi` (BARU, `ALT-DEF-025`/`ALT-HR-011`)
  append-only, banyak baris per `Absensi`.** Sejalan pola ledger domain lain
  - satu sesi kerja bisa punya lebih dari satu periode istirahat (makan
  siang + sore), masing-masing baris sendiri dengan `mulaiPada`/
  `selesaiPada` independen, bukan agregat tunggal di `Absensi`.

- **Keputusan 7 - Geofence/pembatasan perangkat (`ALT-HR-016`/`ALT-HR-017`):
  dukungan level-skema saja.** `Absensi` mendapat `lokasiLat`/`lokasiLng`
  (`Decimal @db.Decimal(9,6)`, presisi ~11cm - cukup untuk radius geofence
  outlet), `jarakDariOutletMeter` (`Decimal @db.Decimal(8,2)`, dihitung dan
  disimpan oleh service-layer saat presensi, bukan dihitung ulang tiap baca
  laporan), dan `perangkatId` nullable dengan composite-FK
  `(tenantId, perangkatId) -> Perangkat(tenantId, id)` (menambah
  `@@unique([tenantId, id])` baru pada `Perangkat`, konsisten ADR-013).
  Validasi radius/registrasi perangkat sesungguhnya (menolak presensi di
  luar radius, atau dari perangkat tak terdaftar) adalah LOGIKA service-
  layer, feature work eksplisit di luar cakupan schema batch ini - kolom di
  atas hanya menyediakan tempat menyimpan data yang dibutuhkan logika
  tersebut nanti.

- **Keputusan 8 - `CutiIzin` DIPERTAHANKAN (bukan rename ke
  `PermintaanCuti`); ditambahkan `tenantId` + composite-FK yang SEBELUMNYA
  tidak ada sama sekali.** `CutiIzin` (`CUTI_TAHUNAN`/`SAKIT`/`IZIN`) sudah
  memetakan wajar ke cakupan "cuti" master spec, dan `MASTER-CHECKLIST.md`
  (`ALT-HR-014`) sudah memakai nama `CutiIzin` - rename akan menciptakan
  ketidaksesuaian nama yang sama seperti yang dihindari `TierKeanggotaan`
  (ADR-027 Keputusan 1: schema mengikuti dokumen yang sudah settled).
  **Ditemukan saat audit ulang model ini untuk batch ini:** `CutiIzin`
  TIDAK PERNAH punya `tenantId` sama sekali dan `karyawanId` adalah FK ID
  TUNGGAL (bukan composite) - gap tenant-safety identik `ALT-DEF-010` yang
  terlewat pada batch composite-FK sebelumnya karena `CutiIzin` sendiri
  tidak disebut eksplisit di daftar model ADR-013. Diperbaiki di batch ini:
  `tenantId` ditambahkan, `karyawan` diganti jadi composite-FK
  `(tenantId, karyawanId) -> Karyawan(tenantId, id)`.

- **Keputusan 9 - `TargetKinerja`/`PenilaianKinerja` (BARU, `ALT-HR-018`)
  dimodelkan MINIMAL secara sengaja.** Master spec eksplisit TIDAK meminta
  full payroll/HR suite - kedua model ini hanya cukup untuk mencatat
  target/penilaian periodik (`periode String`, mis. `"2026-Q1"`) tanpa
  struktur skala penilaian, siklus approval multi-tahap, atau kalkulasi
  bonus/kompensasi yang di luar cakupan.

- **Model yang mendapat composite-FK (mengikuti ADR-013):** `HubunganKerja`
  (ke `Karyawan`, `Jabatan`, `Departemen` opsional - seluruhnya BARU),
  `KaryawanOutlet` (ke `Karyawan`, `Outlet` - BARU), `TemplateShift` (ke
  `Outlet`), `JadwalKerja` (ke `Outlet`, `Karyawan`, `TemplateShift`),
  `PolaJadwalBerulang` (ke `Outlet`, `Karyawan`, `TemplateShift` - BARU),
  `PermintaanTukarShift` (ke `JadwalKerja`, `Karyawan` dua kali dengan nama
  relasi berbeda `TukarShiftPemohon`/`TukarShiftPengganti` - BARU),
  `Absensi` (ke `Outlet`, `Karyawan` - dipertahankan dari ADR-013; ke
  `Perangkat` - BARU, nullable), `KoreksiAbsensi` (ke `Absensi` - BARU),
  `IstirahatAbsensi` (ke `Absensi` - BARU), `CutiIzin` (ke `Karyawan` -
  BARU, lihat Keputusan 8), `PermintaanLembur` (ke `Karyawan` - BARU),
  `TargetKinerja`/`PenilaianKinerja` (ke `Karyawan` - BARU). Relasi ke
  `Pengguna` (`diajukanOlehId`/`disetujuiOlehId`/`dinilaiOlehId`, dst) TETAP
  FK ID TUNGGAL (ADR-013 poin 5, identitas global). Parent baru yang
  mendapat `@@unique([tenantId, id])`: `Departemen`, `KaryawanOutlet`
  (implisit lewat `@@unique([karyawanId, outletId])` sudah cukup, TIDAK
  ditambah `@@unique([tenantId, id])` karena tidak ada child yang perlu
  merujuknya), `TemplateShift`, `JadwalKerja`, `Absensi` (sudah ada dari
  ADR-013, dipertahankan), `Perangkat` (BARU - sebelumnya tidak perlu
  sampai `Absensi.perangkatId` ditambahkan batch ini).

- **Cakupan batch ini vs. yang BELUM dikerjakan:** schema
  (`prisma/schema/schema.prisma`), dokumen
  (`docs/database/12-karyawan-absensi.md`, `docs/api/API-CONTRACT.md`,
  `docs/arsitektur/STATE-MACHINES.md`, `docs/keamanan/PERMISSION-MATRIX.md`,
  `prisma/seed/izin.seed.ts`, `docs/engineering/TRACEABILITY-MATRIX.md`),
  dan test struktur arsitektur. **BELUM dikerjakan (di luar scope batch
  ini):** handler/endpoint nyata (presensi masuk/pulang, approval koreksi/
  tukar-shift/cuti/lembur, job generate `JadwalKerja` dari
  `PolaJadwalBerulang`, validasi geofence/perangkat sesungguhnya), migrasi
  Postgres nyata dan partial unique index untuk "satu `isUtama=true` per
  karyawan" (DIBLOKIR, ALT-DEF-029).

## ADR-029: Sinkronisasi penuh TRACEABILITY-MATRIX.md ke 255 requirement (ALT-DEF-020, ALT-DEF-039, ALT-DEF-041, ALT-DEF-042)

**Konteks.** `TRACEABILITY-MATRIX.md` sebelumnya hanya mencakup ~64 dari 249
requirement (`ALT-DEF-020`), dan checklist sudah tumbuh lagi ke 255
requirement sejak audit stempel keanggotaan (`ALT-DEF-039`). Ini adalah pass
**dokumentasi-saja** (tidak menyentuh `prisma/schema/schema.prisma`) untuk
menutup gap tersebut secara menyeluruh, bukan batch fitur/schema baru.

**Keputusan 1 - Matriks ditulis ulang penuh, bukan ditambal.** Setiap satu
dari 255 baris `MASTER-CHECKLIST.md` (17 domain, `ALT-PLT` s.d. `ALT-SEC`,
verifikasi ulang lewat `grep` pola `^\| ALT-[A-Z]{2,3}-[0-9]{3} `) sekarang
punya baris yang sesuai di `TRACEABILITY-MATRIX.md`, dikelompokkan per
domain dengan urutan yang sama. Kolom Model database diverifikasi lewat
grep langsung terhadap `prisma/schema/schema.prisma` (133 model), bukan
diasumsikan dari nama di checklist - 56 requirement ditemukan TANPA model
yang bisa diverifikasi langsung (36 di antaranya domain scaffold yang
memang belum disentuh correction loop, sisanya checklist yang masih
menyebut nama model lama sebelum rename ADR).

**Keputusan 2 - Tidak ada requirement yang ditandai LULUS/SELESAI.**
Correction-loop sejauh ini hanya memperbaiki fondasi data model
(schema+dokumen+architecture test), bukan membangun fitur nyata - tidak ada
handler/endpoint yang benar-benar berjalan, tidak ada test runner
(vitest/Jest/Playwright) yang wired up di repo selain
`packages/test-support/src/architecture/*.test.ts` (22 file). Kolom
Unit/Integration/E2E/Security test di matriks mencatat status ini apa
adanya ("belum ada, menunggu implementasi fitur") alih-alih menyalin klaim
optimis dari checklist lama.

**Keputusan 3 - Gap ditemukan dicatat sebagai defect baru, bukan diperbaiki
diam-diam.** Dua defect baru dibuka pada pass ini: `ALT-DEF-041` (18 baris
kolom Ketergantungan `MASTER-CHECKLIST.md` yang self-reference atau
dangling - termasuk 4 baris yang sudah direncanakan `ALT-DEF-036` tapi
perbaikannya belum pernah benar-benar diterapkan ke file; SELURUH 18 baris
diperbaiki langsung pada pass ini, bukan hanya direncanakan) dan
`ALT-DEF-042` (3 model platform - `UndanganTenant`, `BackupJob`,
`AntrianCetak` - yang direferensikan requirement checklist sejak
granularisasi awal tapi tidak pernah dibuat di schema meski domain Platform
sudah melalui 6 batch correction-loop dedicated; juga daftar `eventType`
`DomainOutboxEvent` yang tidak mencakup retur/split/reopen/merge pesanan,
refund kasir, atau tukar poin/stempel). Model/schema untuk `ALT-DEF-042`
SENGAJA TIDAK dibuat pada pass ini - pass ini murni dokumentasi, bukan batch
fitur.

**Keputusan 4 - Domain yang belum tersentuh correction loop didaftar
eksplisit.** 7 dari 17 domain (`ALT-MNU`, `ALT-BEL`, `ALT-MJ` di luar
composite-FK generik, `ALT-PLY`, `ALT-ANL`, `ALT-UX`, dan sebagian besar
`ALT-SEC`) belum pernah mendapat batch correction-loop dedicated - total 88
dari 255 requirement (34,5%). Ini didaftar di bagian "Gap Analysis"
`TRACEABILITY-MATRIX.md` sebagai peta prioritas untuk batch berikutnya,
bukan diperbaiki pada pass ini.

**Keterbatasan yang jujur dicatat:** Endpoint/Permission/Route UI TIDAK
diverifikasi string-per-string terhadap
`API-CONTRACT.md`/`PERMISSION-MATRIX.md`/`ROUTE-MAP.md` untuk seluruh 255
baris (hanya domain dengan precedent dari batch sebelumnya) - verifikasi
penuh 255×3 dokumen adalah pekerjaan terpisah dari kapasitas satu pass
sinkronisasi. Lihat `docs/engineering/TRACEABILITY-MATRIX.md` bagian "Gap
Analysis" untuk rincian lengkap.

**Cakupan batch ini vs. BELUM dikerjakan:** dokumen
(`docs/engineering/TRACEABILITY-MATRIX.md` ditulis ulang penuh,
`docs/engineering/DEFECT-LEDGER.md` +2 baris, `docs/engineering/
MASTER-CHECKLIST.md` 18 baris kolom Ketergantungan diperbaiki). **TIDAK
disentuh (sesuai instruksi pass ini):** `prisma/schema/schema.prisma` sama
sekali - `ALT-DEF-042` mendokumentasikan gap model tapi tidak membuat
modelnya; itu pekerjaan batch domain Platform berikutnya.

## ADR-030: Dimulainya fase DEEP CORRECTION LOOP - Postgres nyata tersedia, restrukturisasi INVARIAN-BELUM-DITEGAKKAN.md (ALT-DEF-029 diperbarui, ALT-DEF-044 baru)

**Konteks.** Sepanjang 14+ batch correction-loop sebelumnya (ADR-001 s.d.
ADR-029), satu premis lingkungan dianggap tetap: tidak ada instance Postgres
nyata yang bisa diakses untuk menjalankan migrasi atau test integrasi -
seluruh verifikasi berhenti di `prisma validate`/`format` (pemeriksaan
sintaksis statis) dan test struktur (`node --experimental-strip-types` atas
`packages/test-support/src/architecture/*.test.ts`, yang memeriksa BENTUK
`PrismaClient` yang dihasilkan, bukan perilaku terhadap database nyata).
Akibatnya, **tidak ada satu defect pun** di `DEFECT-LEDGER.md` yang pernah
mencapai status `DITUTUP` - seluruhnya berhenti di `SIAP_DIVERIFIKASI`,
dengan `ALT-DEF-029` sebagai umbrella blocker yang dirujuk hampir di semua
baris lain.

Pada sesi kerja ini, ditemukan (dan diverifikasi ulang secara eksplisit)
bahwa lingkungan kerja SEKARANG punya PostgreSQL 16 nyata terpasang lewat
Homebrew dengan trust-auth untuk user `icat`, dan sebuah database
persisten, `altora_resto_dev`, sudah dibuat khusus untuk pekerjaan
berkelanjutan - bukan sekadar koneksi transien yang hilang begitu sesi
berakhir. `.env` di root repo (gitignored) sudah berisi `DATABASE_URL` yang
mengarah ke database tersebut. Ini mengubah kalkulus correction-loop secara
fundamental: migrasi, trigger, dan test integrasi yang sebelumnya HANYA bisa
didesain di atas kertas sekarang BISA dan HARUS benar-benar dijalankan.

**Keputusan 1 - Buka fase baru "DEEP CORRECTION LOOP", terpisah dari 14
batch correction-loop sebelumnya.** Fase ini punya bar verifikasi yang
secara eksplisit lebih ketat: klaim `SIAP_DIVERIFIKASI` yang cukup untuk fase
lama (validasi sintaksis + test struktur) TIDAK lagi cukup untuk klaim
`DITUTUP` di fase baru - `DITUTUP` sekarang butuh migrasi resmi yang benar-benar
diterapkan (`prisma migrate deploy` sukses dari database kosong) DAN test
integrasi yang benar-benar dijalankan terhadap `altora_resto_dev` (bukan
`--experimental-strip-types` struktur semata). Lihat `RISK-015` di
`docs/engineering/RISK-REGISTER.md` untuk risiko yang dicatat atas
perubahan bar ini.

**Keputusan 2 - Batch pertama fase ini adalah preflight audit + restrukturisasi
dokumen, BUKAN eksekusi migrasi.** Menjalankan `prisma migrate dev` untuk
memfoldkan `prisma/migrations/manual/001`-`005` (dan kandidat SQL baru) ke
riwayat migrasi resmi adalah pekerjaan substansial tersendiri (per file:
`migrate dev --create-only`, verifikasi isi, jalankan, verifikasi hasil di
`altora_resto_dev`) yang sengaja DITUNDA ke batch kedua. Batch ini (batch
pertama) secara eksplisit dibatasi ke: (a) audit `ALT-DEF-NNN` untuk
memastikan ID berikutnya yang benar (`ALT-DEF-044`, diverifikasi langsung
dari `DEFECT-LEDGER.md`, bukan dipercaya dari asumsi draft instruksi), (b)
mencatat defect baru yang ditangkap audit ini (`ALT-DEF-044` - gap
`manual/` sebagai jalur deployment paralel yang tidak pernah dijalankan
`prisma migrate deploy`), (c) memperbarui defect lama yang preminya sudah
usang (`ALT-DEF-029` - Postgres kini tersedia, tapi status TETAP
`DIKONFIRMASI`, TIDAK `DITUTUP`, karena migrasi/trigger/test integrasi masih
belum terpasang) atau yang rencananya sudah digantikan solusi lebih baik
(`ALT-DEF-038` - trigger `BEFORE INSERT` lintas-tabel untuk promo repeatable
diganti desain `@@unique([pesananId, promoId])` + counter `jumlahPenerapan`,
constraint statis dalam satu tabel yang jauh lebih sederhana dan sudah punya
precedent), dan (d) merestrukturisasi `docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md`.
Skema Prisma (`prisma/schema/schema.prisma`) SENGAJA TIDAK disentuh pada
batch ini.

**Keputusan 3 - Restrukturisasi `INVARIAN-BELUM-DITEGAKKAN.md` dari 3 seksi
ad-hoc menjadi 5 kategori berjenjang.** Versi sebelumnya (seksi A/B/C:
"SQL ditulis belum dijalankan" / "SQL belum ditulis" / "tidak mungkin DB
enforced") mencampur dua sumbu klasifikasi yang berbeda: *jenis penegakan
yang mungkin* (DB constraint vs guard transaksi vs job rekonsiliasi vs state
machine) dan *seberapa dekat sebuah baris ke status DITUTUP*. Revisi ADR ini
memisahkan keduanya secara eksplisit ke 5 kategori (A: migrasi resmi - saat
ini KOSONG, diverifikasi lewat `ls prisma/migrations/`; B: DB-enforceable
tapi belum resmi, dipecah B1-sudah-didraf/B2-belum-didraf; C: transaksi
aplikasi, dengan catatan jujur bahwa optimistic concurrency belum ada di
schema sama sekali hari ini; D: rekonsiliasi/cache; E: state machine guards,
kategori BARU yang diekstrak dari `docs/arsitektur/STATE-MACHINES.md` dan
sebelumnya tidak pernah punya baris invariant eksplisit). Skema ID `INV-NNN`
diperkenalkan sebagai ruang ID terpisah dari `ALT-DEF-NNN` - satu invariant
bisa dirujuk oleh nol atau lebih defect, dan sebaliknya, tanpa memaksakan
1:1 antara kedua ruang ID tersebut. 20 baris lama dipecah menjadi 43 baris
baru (rincian pemecahan ada di "Ringkasan angka" dokumen tersebut), termasuk
kategori E yang seluruhnya baru (13 baris) dan satu baris (INV-043) yang
secara eksplisit menangkap gap: `STATE-MACHINES.md` tidak pernah memodelkan
Reservasi/Promo/Cuti sebagai state machine mandiri - direkomendasikan
menjadi calon defect baru pada batch berikutnya, TIDAK dibuka sebagai
`ALT-DEF-NNN` pada batch ini karena di luar scope eksplisit (restrukturisasi
dokumen invariant, bukan pembukaan defect baru di luar `ALT-DEF-044`).

**Keputusan 4 - Klaim "daftar tunggal dan lengkap" pada dokumen invariant
dicabut, diganti "daftar terpusat SEMENTARA".** Klaim lama menyiratkan
kelengkapan permanen yang tidak lagi akurat begitu fase deep-correction-loop
dimulai: dokumen itu sendiri akan menjadi stale secepat baris-barisnya mulai
berpindah kategori (fold ke migrasi resmi, trigger terpasang, test
integrasi lulus) pada batch-batch berikutnya. Kejujuran status "provisional,
snapshot per tanggal tertentu" dinilai lebih penting daripada kesan
kelengkapan yang salah.

**Cakupan batch ini vs. BELUM dikerjakan:** dokumen saja
(`docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md` ditulis ulang penuh,
`docs/engineering/DEFECT-LEDGER.md` +1 baris baru + 2 baris diperbarui,
`docs/engineering/RISK-REGISTER.md` +1 baris, `docs/engineering/
RELEASE-EVIDENCE.md` +1 bagian bukti, `docs/engineering/DECISION-LOG.md`
ADR ini). **TIDAK disentuh (sesuai instruksi eksplisit batch ini):**
`prisma/schema/schema.prisma` sama sekali; tidak ada `prisma migrate`
apa pun yang dijalankan terhadap `altora_resto_dev` meski koneksinya
tersedia dan terverifikasi bekerja - itu pekerjaan batch kedua fase
deep-correction-loop.

---

## ADR-031: Migrasi resmi pertama dijalankan nyata, fold manual/001-005 ke migrasi, satu bug logika ditemukan dan diperbaiki (ALT-DEF-044)

**Konteks.** ADR-030 (batch pertama fase deep-correction-loop) murni
restrukturisasi dokumen - `ALT-DEF-044` dicatat sebagai master-defect yang
menangkap fakta bahwa `prisma/migrations/manual/001` s.d. `005` adalah jalur
deployment paralel yang TIDAK PERNAH dibaca `prisma migrate deploy`. Batch
ini (batch kedua) mengerjakan penutupannya secara nyata: menjalankan migrasi
resmi Prisma pertama kali terhadap `altora_resto_dev`, mengaudit kelima file
manual dengan benar-benar menjalankannya lewat `psql`, memfoldnya ke migrasi
resmi, dan menulis test integrasi Postgres nyata.

**Keputusan 1 - Lokasi migrasi resmi adalah `prisma/schema/migrations/`,
BUKAN `prisma/migrations/` seperti asumsi awal batch ini.** Prisma CLI
menaruh folder `migrations/` sebagai SIBLING dari file schema yang dirujuk
`--schema`. Karena `schema.prisma` proyek ini berada di `prisma/schema/
schema.prisma` (bukan `prisma/schema.prisma`), `prisma migrate dev`/`deploy`
SELALU membaca dan menulis `prisma/schema/migrations/`, tidak ada opsi
konfigurasi di Prisma 5.x untuk mengarahkannya ke path lain. Ini
diverifikasi empiris: `npx prisma migrate dev --name baseline_correction_loop`
menghasilkan `prisma/schema/migrations/20260725154045_baseline_correction_loop/`,
bukan `prisma/migrations/20260725...`. `prisma/migrations/manual/` (folder
lama, sudah ada sebelum batch ini) tetap berada di lokasi terpisah dan tidak
pernah otomatis dibaca tooling apa pun - koreksi lokasi ini TIDAK mengubah
kesimpulan `ALT-DEF-044` (manual/ tetap bukan jalur deployment yang dibaca
Prisma), hanya mengoreksi asumsi path yang salah di deskripsi tugas awal.

**Keputusan 2 - Migrasi baseline dibuat dari `schema.prisma` apa adanya,
tanpa perubahan model.** `npx prisma migrate dev --name
baseline_correction_loop --schema prisma/schema/schema.prisma` dijalankan
terhadap `altora_resto_dev` yang kosong total (0 tabel sebelumnya) dan
menghasilkan 134 tabel (bukan ~133 seperti estimasi awal - `\dt` menghitung
134 baris persis; angka pasti tidak pernah dicatat presisi di dokumen
sebelumnya, jadi ini bukan penyimpangan, hanya konfirmasi pertama kalinya
dihitung nyata). Migrasi ini BERHASIL tanpa error - tidak ada constraint
yang saling bertentangan atau tipe kolom yang tidak didukung provider,
membuktikan risiko yang dicatat `ALT-DEF-029` ("belum ada bukti bahwa
schema saat ini benar-benar bisa diterapkan ke database nyata") tidak
terwujud pada schema versi ini.

**Keputusan 3 - Audit kelima file `manual/001` s.d. `005`: NOL bug pada
empat file, SATU bug logika nyata pada file kelima.** Setiap file dijalankan
langsung lewat `psql -f prisma/migrations/manual/00X_*.sql -v
ON_ERROR_STOP=1` terhadap `altora_resto_dev` (setelah migrasi baseline
diterapkan), lalu objek yang dihasilkan dibandingkan terhadap DDL nyata yang
dihasilkan Prisma pada Keputusan 2.

- `001_konfigurasi_qris_partial_unique.sql`: berjalan sukses tanpa error.
  Nama tabel (`konfigurasi_qris`) dan kolom (`"tenantId"`, `"outletId"`,
  `status`) cocok persis dengan DDL baseline. **Nol bug.**
- `002_resep_target_xor_check.sql`: berjalan sukses tanpa error. Nama tabel
  (`resep`) dan kolom (`"itemMenuId"`, `"varianMenuId"`, `"bahanHasilId"`)
  cocok persis. **Nol bug.**
- `003_versi_resep_satu_aktif.sql`: berjalan sukses tanpa error. Nama tabel
  (`versi_resep`) dan kolom (`"resepId"`, `status`) cocok persis. **Nol bug.**
- `004_stok_bahan_agregat_gudang_unik.sql`: kedua index berjalan sukses
  tanpa error. Nama tabel (`stok_bahan`, `stok_opname_baris`) dan kolom
  (`"gudangId"`, `"bahanId"`, `"lokasiStokId"`, `"stokOpnameId"`) cocok
  persis. **Nol bug.**
- `005_mutasi_stok_append_only_dan_pembalik.sql`: kedua fungsi dan kedua
  trigger berjalan sukses tanpa error SINTAKSIS - TAPI audit LOGIKA (bukan
  cuma menjalankannya) menemukan satu bug nyata di fungsi
  `mutasi_stok_validasi_pembalik()`:

  **Bug: rantai pembalik-dari-pembalik LOLOS, bertentangan dengan komentar
  file itu sendiri.** Komentar file (baris 87-93 versi asli) menyatakan
  eksplisit: "Rantai pembalik-dari-pembalik juga ditolak - membalik sebuah
  pembalikan adalah operasi yang harus ditulis sebagai mutasi baru dengan
  alasannya sendiri". Kode ASLI TIDAK PERNAH memeriksa hal itu. Satu-satunya
  pemeriksaan "rantai" yang ada adalah `IF p."dibalikOlehId" IS NOT NULL`,
  di mana `p` adalah CALON PEMBALIK BARU (mis. mutasi C) - pemeriksaan itu
  hanya mendeteksi "apakah C sendiri sudah pernah dibalik oleh mutasi lain",
  BUKAN "apakah baris yang sedang ditandai dibalik (mis. mutasi B) itu
  sendiri sudah menjadi pembalik bagi mutasi lain (mis. B membalik A)".
  Dibuktikan dengan skrip probe manual sebelum perbaikan (lihat riwayat git
  batch ini): INSERT mutasi A (+10), INSERT mutasi B (-10) yang membalik A
  (`UPDATE mutasi_stok SET "dibalikOlehId" = B WHERE id = A`, berhasil sah),
  lalu INSERT mutasi C (+10) dan `UPDATE mutasi_stok SET "dibalikOlehId" = C
  WHERE id = B` - UPDATE ini SEHARUSNYA ditolak (B adalah pembalik, tidak
  boleh dibalik lagi) tapi pada kode asli **BERHASIL tanpa exception**.
  **Dampak bila tidak diperbaiki:** rantai A<-B<-C<-D<-... bisa terbentuk
  tanpa batas, membuat saldo bersih satu bahan di satu gudang sulit
  ditelusuri persis skenario yang komentar file itu sendiri bilang harus
  dicegah - kelas bug "constraint yang tampak menegakkan aturan padahal
  tidak", yang beberapa keputusan lain di ADR-021/022/023 secara eksplisit
  bilang lebih berbahaya daripada tidak ada constraint sama sekali.
  **Perbaikan** (di migrasi resmi, lihat Keputusan 4): tambahkan pemeriksaan
  baru di awal fungsi - sebelum `NEW."dibalikOlehId"` diizinkan terisi, cek
  `EXISTS (SELECT 1 FROM mutasi_stok WHERE "dibalikOlehId" = NEW.id)`; bila
  true (artinya `NEW` sudah menjadi pembalik bagi baris lain), tolak dengan
  pesan yang eksplisit menyebut "rantai pembalik-dari-pembalik ditolak".
  Diverifikasi ulang dengan skrip probe yang sama setelah perbaikan: UPDATE
  yang sama sekarang gagal dengan pesan yang benar (lihat
  `RELEASE-EVIDENCE.md`). Pemeriksaan lama (`p."dibalikOlehId" IS NOT NULL`)
  DIPERTAHANKAN sebagai guard tambahan (mencegah C yang sudah dipakai
  membalik sesuatu dipakai lagi) - pesan errornya diperjelas supaya tidak
  disalahartikan sebagai pemeriksaan rantai yang benar.

**Keputusan 4 - Kelima file di-fold ke SATU migrasi resmi
`harden_manual_invariants`, dibuat lewat `prisma migrate dev
--create-only`.** File `migration.sql` yang dihasilkan Prisma kosong
(diharapkan - partial index/CHECK/trigger tidak bisa direpresentasikan di
`schema.prisma`, jadi diffing Prisma tidak menghasilkan apa pun secara
otomatis). Isinya ditulis tangan berisi SQL terkoreksi dari kelima file
manual (dengan bug Keputusan 3 sudah diperbaiki), dikelompokkan per bagian
(A) s.d. (E) dengan komentar yang merujuk balik ke `ALT-XXX`/ADR asal
masing-masing. Diterapkan lewat `prisma migrate dev` (masih fase iterasi
dev) - lihat `RELEASE-EVIDENCE.md` untuk output lengkap.

**Keputusan 5 - `IF NOT EXISTS`/`CREATE OR REPLACE`/`DROP TRIGGER IF EXISTS`
DIHAPUS dari migrasi resmi.** File manual asli memakainya sebagai
defensiveness karena ditulis untuk dijalankan manual berulang kali lewat
`psql` tanpa pelacakan status (developer bisa saja menjalankannya dua kali
tanpa sengaja). Migrasi resmi Prisma TIDAK PERNAH punya masalah itu - setiap
migrasi hanya diterapkan SEKALI per database, dilacak permanen di tabel
`_prisma_migrations`, dan `prisma migrate deploy` menolak menerapkan ulang
migrasi yang sudah tercatat sukses. Dengan begitu, defensiveness itu tidak
pernah dibutuhkan untuk idempotency yang sah - dan berbahaya karena bisa
MENDIAMKAN drift produksi nyata: bila suatu saat ada object dengan nama
sama tapi definisi BERBEDA (mis. seseorang membuat index/trigger manual di
luar Prisma dengan nama kebetulan sama), `CREATE ... IF NOT EXISTS` akan
diam-diam SKIP (meninggalkan definisi lama yang salah) dan `CREATE OR
REPLACE FUNCTION` akan diam-diam MENIMPA (mengganti definisi tanpa
peringatan) - keduanya membuat migrasi "sukses" secara laporan padahal
keadaan database berbeda dari yang dimaksud. Bentuk polos (`CREATE UNIQUE
INDEX`, `CREATE FUNCTION`, `CREATE TRIGGER` tanpa modifier apa pun) membuat
konflik nama GAGAL KERAS - sesuai instruksi eksplisit batch ini ("migrasi
harus gagal bila object dengan nama sama memiliki definisi berbeda").

**Keputusan 6 - `prisma/migrations/manual/` DIPERTAHANKAN (bukan dihapus),
dengan header arsip eksplisit di setiap file + `README.md` baru.** Sebelum
memutuskan, dilakukan `grep -rl "migrations/manual"` ke seluruh
`docs/`+`packages/`+`apps/` - ditemukan TIGA test arsitektur yang masih
membaca file-file ini sebagai teks by path
(`packages/test-support/src/architecture/qris-konfigurasi-constraints.test.ts`,
`resep-versi-produksi-constraints.test.ts`,
`persediaan-ledger-reservasi-constraints.test.ts`), plus banyak referensi
dokumentasi historis (`docs/database/*.md`, `DEFECT-LEDGER.md`, dst).
Menghapus folder akan mematahkan test-test itu (`readFileSync` akan
melempar `ENOENT`). Opsi (b) dipilih: setiap file diberi header
"ARSIP HISTORIS - TIDAK DIJALANKAN OLEH TOOLING APA PUN" yang menunjuk ke
migrasi resmi, plus `prisma/migrations/manual/README.md` baru dengan
penjelasan lengkap. Diverifikasi setelah perubahan: ketiga test arsitektur
di atas tetap lulus (`npx tsx <file>.test.ts` masing-masing mencetak "OK").

**Keputusan 7 - Verifikasi determinisme migrasi: `DROP DATABASE` +
`CREATE DATABASE` + `prisma migrate deploy` dari nol menghasilkan struktur
IDENTIK.** `altora_resto_dev` di-drop dan dibuat ulang kosong, lalu `npx
prisma migrate deploy` dijalankan (bukan `migrate dev` - mensimulasikan
jalur deployment CI/CD nyata). Kedua migrasi (`baseline_correction_loop`,
`harden_manual_invariants`) diterapkan berurutan sesuai prefix timestamp,
sukses tanpa error, menghasilkan 134 tabel yang sama. Ketiga file test
database-integration (lihat Keputusan 8) dijalankan ulang terhadap database
yang baru di-deploy ini dan LULUS 3/3 - membuktikan migrasi resmi
reproducible dari kondisi kosong, bukan hanya "kebetulan berhasil" di
database yang sempat diaudit manual sebelumnya (yang objeknya sempat dibuat
lalu di-DROP lagi sebelum migrasi resmi ditulis, persis untuk menghindari
kontaminasi ini).

**Keputusan 8 - Test database-integration BARU ditulis di
`packages/test-support/src/database-integration/`, kategori terpisah dari
`src/architecture/`.** Berbeda dari test arsitektur (membaca teks
`schema.prisma`/file SQL manual, tidak butuh Postgres), test-test ini konek
ke Postgres nyata lewat driver `pg` (`DATABASE_URL` dari `.env`), memverifikasi
EXISTENCE lewat `pg_indexes`/`pg_constraint`/`pg_trigger`/`pg_proc`, DAN
BEHAVIORAL lewat INSERT/UPDATE yang seharusnya ditolak. Kebersihan data:
setiap test dibungkus `withTransaction()` yang SELALU `ROLLBACK` di akhir
(bukan `DELETE` eksplisit) - dipilih karena lebih aman terhadap exception di
tengah jalan dan karena trigger `mutasi_stok` butuh diuji dalam urutan
INSERT/UPDATE yang realistis dalam satu transaksi. `expectReject()` memakai
`SAVEPOINT` supaya statement yang sengaja gagal tidak membatalkan seluruh
transaksi test. Hasil nyata (lihat `RELEASE-EVIDENCE.md` untuk transkrip
lengkap): **3 file, 3 PASS**, termasuk assertion eksplisit yang membuktikan
bug-fix Keputusan 3 (rantai pembalik-dari-pembalik sekarang benar-benar
ditolak).

**Status ALT-DEF-044 setelah batch ini:** lihat penjelasan lengkap di
`DEFECT-LEDGER.md` - ringkasnya, invariant individual `INV-001` s.d.
`INV-007` (yang sebelumnya kategori B1 di
`INVARIAN-BELUM-DITEGAKKAN.md`) dipindah ke kategori A (tertegakkan +
teruji), tapi defect umbrella `ALT-DEF-044` sendiri TETAP TIDAK DITUTUP -
checklist penutupan defect eksplisit meminta "concurrency test lulus" yang
BELUM ditulis pada batch ini (scope batch berikutnya).

## ADR-032: Redesain pola reversal ledger dari `dibalikOlehId` ke `membalikMutasiId`, trigger append-only generik, penutupan ALT-DEF-043

**Konteks.** ADR-023 Keputusan 5 (dan ADR-027 yang mereplikasi bentuknya ke
ledger keanggotaan) mendesain reversal lewat `dibalikOlehId String? @unique`
di baris ASAL, menunjuk MAJU ke baris pembaliknya. Menandai "sudah dibalik"
berarti meng-UPDATE baris asal - trigger append-only (`mutasi_stok_tolak_ubah`,
ADR-031) karena itu harus punya SATU pengecualian eksplisit ("UPDATE hanya
sah untuk mengisi `dibalikOlehId` dari NULL"). Instruksi batch ini eksplisit:
desain ulang supaya baris asal **tidak pernah** di-UPDATE untuk alasan apa
pun - append-only nol pengecualian. Sekaligus menutup `ALT-DEF-043`
(`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` punya kolom `dibalikOlehId`
tapi TIDAK PERNAH punya trigger yang menegakkannya - gap desain, bukan cuma
"belum dijalankan").

**Keputusan 1 - Pointer dipindah ke baris PEMBALIK (`membalikMutasiId`),
menunjuk MUNDUR ke baris asal; `@unique` tetap di kolom ini, tapi maknanya
berpindah sisi.** Dengan `dibalikOlehId` (lama), `@unique` ada di baris ASAL
dan menjamin "satu baris asal dibalik paling banyak sekali" (baris asal
adalah sisi tunggal). Dengan `membalikMutasiId` (baru), kolom - dan
`@unique`-nya - pindah ke baris PEMBALIK. Ini BUKAN sekadar rename kosmetik:
constraint `@unique` pada FK di sisi anak (baris pembalik) menegakkan aturan
yang secara struktural BERBEDA dari "unique pada FK sembarang trivially
true" - constraint ini secara aktif menolak INSERT baris pembalik KEDUA yang
membawa nilai `membalikMutasiId` SAMA dengan baris pembalik pertama, yaitu
"paling banyak SATU baris pembalik per baris asal". Dibuktikan bukan hanya
diklaim: test `ledger-reversal-membalik-invariants.test.ts` meng-INSERT dua
baris pembalik berbeda yang sama-sama menunjuk baris asal yang sama dan
memverifikasi INSERT kedua gagal dengan error unique index, untuk KEEMPAT
tabel ledger. "Sudah dibalik atau belum" untuk sebuah baris asal kini QUERY
TURUNAN (`SELECT 1 FROM <table> WHERE "membalikMutasiId" = <id>`), bukan lagi
kolom yang dibaca langsung - trade-off yang disengaja: satu index lookup
tambahan saat query, ditukar dengan baris asal yang benar-benar tidak pernah
tersentuh sejak dibuat.

**Keputusan 2 - Trigger append-only menjadi REJECT-ALL tanpa pengecualian,
dan menjadi SATU fungsi generik (`ledger_tolak_ubah()`) dipakai ULANG di
KEEMPAT tabel ledger, bukan satu fungsi per tabel.** Ini konsekuensi
langsung Keputusan 1: karena baris pembalik sekarang selalu dibuat lewat
INSERT (bukan lagi UPDATE terhadap baris asal), tidak ada lagi UPDATE yang
SAH untuk alasan apa pun - trigger append-only tidak perlu tahu APA PUN
tentang daftar kolom tabel manapun (beda dari `mutasi_stok_tolak_ubah()`
lama yang harus men-diff SETIAP kolom untuk mendeteksi "apakah ini UPDATE
yang dikecualikan atau bukan"). Genericity di sini karena itu TRIVIAL DAN
SEMPURNA sekaligus: fungsi menolak SEMUA UPDATE dan SEMUA DELETE tanpa
syarat, apapun nama tabelnya (`TG_TABLE_NAME`/`OLD.id` dipakai murni untuk
pesan error yang tetap spesifik per tabel). Satu fungsi, dipasang sebagai
trigger `BEFORE UPDATE OR DELETE` di `mutasi_stok`, `poin_riwayat`,
`ledger_stempel`, `ledger_saldo_toko` tanpa modifikasi maupun parameter -
nol duplikasi logika, sekaligus desain yang secara struktural LEBIH KUAT
(nol permukaan untuk kelas bug "pengecualian yang salah diperiksa", persis
kelas bug yang diperbaiki ADR-031 Keputusan 3 untuk rantai
pembalik-dari-pembalik pada versi lama).

**Keputusan 3 - Trigger validasi-pembalik JUGA generik, lewat kombinasi
`to_jsonb`/dynamic SQL untuk bagian yang sama di semua ledger + `TG_ARGV`
untuk bagian domain-spesifik per tabel - opsi "100% dynamic diff seluruh
kolom" DIPERTIMBANGKAN dan DITOLAK.** Desain (fungsi `ledger_validasi_pembalik()`,
lihat migrasi untuk isi lengkap):
- Bagian yang SELALU sama di keempat ledger (baris asal ditemukan, baris
  asal bukan pembalik itu sendiri/larangan rantai, tenant sama, tanda
  `jumlah` berlawanan, `alasan` wajib) di-hardcode SEKALI di badan fungsi -
  ini aman digeneralisasi karena nama kolomnya (`tenantId`, `jumlah`,
  `alasan`, `membalikMutasiId`) SAMA PERSIS di keempat tabel, bukan
  kebetulan (mengikuti pola kolom yang sudah identik sejak ADR-023/ADR-027).
  Dibaca lewat `to_jsonb(NEW)`/`to_jsonb(<baris asal>)` + `EXECUTE
  format('SELECT to_jsonb(t) FROM %I t WHERE id = $1', TG_TABLE_NAME)` -
  satu fungsi, tidak hardcode nama tabel.
- Bagian yang BEDA per domain (`MutasiStok` butuh gudang/bahan/satuan/batch/
  hargaPerolehan/lokasiSumber/lokasiTujuan sama; ledger keanggotaan hanya
  butuh keanggotaanId atau pelangganId sama) diteruskan sebagai DAFTAR NAMA
  KOLOM lewat `TG_ARGV` saat `CREATE TRIGGER` per tabel, dibandingkan dalam
  satu loop generik di badan fungsi (`IS NOT DISTINCT FROM`, menangani
  NULL=NULL dengan benar untuk kolom seperti `satuanId`/`batchStokId`/lokasi
  yang memang boleh NULL pada jenis mutasi tertentu).

  Opsi lain yang dipertimbangkan: mendiff SELURUH kolom secara otomatis
  (mis. lewat `hstore`/`jsonb` diff tanpa daftar eksplisit) - DITOLAK karena
  SALAH secara semantik, bukan cuma lebih rumit. Kolom seperti `id`,
  `createdAt`, `dicatatOlehId`/`dibuatOlehId`, `catatan` MEMANG BOLEH (dan
  HARUS) berbeda antara baris asal dan baris pembaliknya - itulah maksudnya
  dua baris yang berbeda. "Kolom mana yang WAJIB sama untuk sebuah baris
  dianggap pembalik yang valid" tetap domain knowledge yang harus dinyatakan
  eksplisit per tabel; `TG_ARGV` adalah cara paling jelas menyatakannya
  tanpa menduplikasi LOGIKA perbandingannya (badan fungsi/loop tetap satu,
  hanya daftar argumennya yang beda per `CREATE TRIGGER`).

**Keputusan 4 - Item #10 checklist (lokasi dibalik dengan benar): lokasi
harus IDENTIK antara baris asal dan pembalik, BUKAN tertukar sumber<->tujuan.**
Dipertimbangkan eksplisit: bila `MutasiStok` asal adalah `TRANSFER_KELUAR`
dari lokasi A ke B, apakah baris pembalik yang benar punya
`lokasiSumberId=B, lokasiTujuanId=A` (tertukar - "mengembalikan barang balik
jalan") atau `lokasiSumberId=A, lokasiTujuanId=B` (identik - "membatalkan
CATATAN transfer yang salah")? **Keputusan: IDENTIK.** Rasional: baris
pembalik dalam desain ini adalah KOREKSI atas baris asal yang salah/perlu
dibatalkan - ia menyatakan "baris asal ini, dengan lokasi PERSIS SAMA,
sebenarnya tidak semestinya terjadi (atau perlu dikurangi) sebesar `jumlah`
yang berlawanan tanda". ini BEDA secara bisnis dari "transfer balik" yang
SAH (mis. barang yang sudah dipindah ke outlet B benar-benar dikirim balik
secara fisik ke outlet A) - transfer balik yang sah adalah PERISTIWA BARU
dengan `jenis=TRANSFER_KELUAR/TRANSFER_MASUK` dan dokumen `TransferStok` baru
sendiri, BUKAN baris `membalikMutasiId` dari transfer sebelumnya. Menukar
source<->dest pada baris pembalik akan salah menggambarkannya sebagai
"pergerakan fisik baru ke arah berlawanan", padahal semantiknya adalah
"catatan ini dibatalkan/dikoreksi", peristiwa yang tidak selalu melibatkan
barang berpindah secara fisik lagi. Konsekuensi teknis: keputusan ini
otomatis tercakup oleh loop equality generik Keputusan 3 (`lokasiSumberId`,
`lokasiTujuanId` masuk daftar `TG_ARGV` untuk `mutasi_stok` sebagai kolom
yang harus SAMA) - tidak butuh special-case terpisah. Dibuktikan dengan test
eksplisit (`testMutasiStokReversalRejections`, kasus "Pembalik dengan lokasi
sumber/tujuan TERTUKAR") yang meng-INSERT baris pembalik dengan lokasi
tertukar dan memverifikasi DITOLAK, plus kasus positif dengan lokasi identik
yang DITERIMA.

**Keputusan 5 - `alasan String` (WAJIB, bukan nullable) ditambahkan ke
KEEMPAT tabel ledger, untuk SETIAP baris (bukan hanya baris pembalik).**
Instruksi eksplisit "reference dan alasan wajib" difokuskan pada baris
pembalik, tapi diputuskan diperluas ke SEMUA baris ledger (termasuk baris
"asal"/perolehan pertama) untuk konsistensi auditabilitas - tidak masuk akal
mewajibkan justifikasi tertulis hanya untuk koreksi tapi tidak untuk
transaksi normal, dan skema dua-tingkat (`alasan` wajib di satu jenis baris,
opsional di jenis lain) akan menambah cabang validasi tanpa manfaat jelas.
`catatan` (sudah ada sebelumnya, tetap opsional) DIPERTAHANKAN terpisah
sebagai catatan bebas TAMBAHAN - `alasan` adalah justifikasi wajib
ringkas/terstruktur, `catatan` adalah ruang bebas opsional untuk detail
lain. Ditegakkan di dua level: kolom `NOT NULL` (mencegah NULL) DAN
pemeriksaan `btrim(alasan) = ''` di trigger `ledger_validasi_pembalik` untuk
baris pembalik SECARA SPESIFIK (mencegah string kosong/whitespace-only lolos
lewat NOT NULL polos) - baris NON-pembalik hanya ditegakkan oleh `NOT NULL`
kolom (trigger pembalik tidak dieksekusi untuk baris yang `membalikMutasiId`-nya
NULL).

Item "referensi wajib" (bagian lain dari instruksi yang sama) SENGAJA TIDAK
diperluas menjadi kolom `referensiJenis`/`referensiId` generik baru di
`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` - ketiganya sudah punya
referensi domain-spesifik opsional (`pesananId`, `hadiahStempelId`,
`pembayaranId`) yang TIDAK selalu terisi (mis. penyesuaian manual tanpa
pesanan), dan mendesain sistem referensi generik baru untuk ketiganya adalah
redesain struktural domain keanggotaan/pembayaran yang di luar scope batch
ini (schema+trigger reversal murni, bukan redesain referensi ledger). Untuk
`MutasiStok`, `referensiJenis`/`referensiId` SUDAH `NOT NULL` sejak ADR-023
Keputusan 2 - "referensi wajib" untuk model itu sudah tertegakkan struktural
sebelum batch ini, tidak butuh perubahan. Dicatat eksplisit sebagai gap
diketahui (bukan diselesaikan diam-diam) - lihat `INVARIAN-BELUM-DITEGAKKAN.md`.

**Keputusan 6 - `PembayaranRefund`/`KoreksiPembayaran` TIDAK diberi pola
`membalikMutasiId`.** Dievaluasi eksplisit per instruksi ("evaluasi dan
putuskan, jangan diterapkan membabi-buta"). Kedua model ini STRUKTURAL
BERBEDA dari keempat ledger di atas: keduanya TIDAK PERNAH punya kolom
`dibalikOlehId`/pola self-relation reversal sama sekali sejak awal (bukan
"lupa ditambahkan" - lihat definisi model, keduanya sudah lengkap sebagai
catatan SATU ARAH yang menunjuk KE `Pembayaran`, bukan sesama baris di tabel
yang sama). `PembayaranRefund` ITU SENDIRI sudah berperan sebagai "baris
koreksi" terhadap `Pembayaran` (bukan ledger simetris yang perlu dibalik
lagi) - refund tidak pernah "dibalik" dalam desain saat ini, ia SATU
PERISTIWA per approval supervisor (ALT-KSR-007), dan pembatalan sebuah
refund yang salah dicatat adalah keputusan proses bisnis (mis.
"refund-kedua-untuk-membatalkan-refund-pertama") yang di luar scope
schema-only batch ini. `KoreksiPembayaran` bahkan secara desain SUDAH
menyimpan `jumlahSebelum`/`jumlahSesudah` sebagai representasi eksplisit
"apa yang berubah", pola yang secara struktural BEDA dari ledger
signed-amount append-only (`jumlah` tunggal bertanda) - memaksakan
`membalikMutasiId` ke sini berarti mendesain ulang bentuk datanya, bukan
menambah satu kolom. **Kesimpulan: TIDAK disentuh** - didokumentasikan di
sini secara eksplisit sebagai keputusan sadar (dievaluasi, bukan diabaikan),
bukan cakupan "diam-diam dilewati".

**Keputusan 7 - Migrasi dibuat manual (folder + `migration.sql` ditulis
tangan) karena `prisma migrate dev --create-only` diblokir non-interaktif di
lingkungan ini, BUKAN lewat alur normal seperti ADR-031.** `prisma migrate
dev` (dengan atau tanpa `--create-only`) mengembalikan "Prisma Migrate has
detected that the environment is non-interactive" secara keras di sesi ini
(beda dari batch ADR-031 yang berhasil menjalankannya). Jalan keluar: bagian
ALTER TABLE/index/FK murni dihasilkan lewat `prisma migrate diff
--from-schema-datasource --to-schema-datamodel --script` (perintah
non-interaktif, membandingkan `altora_resto_dev` LIVE terhadap
`schema.prisma` target) - aman karena hasil diff dikonfirmasi HANYA berisi
DROP+ADD kolom (bukan destructive lain) DAN keempat tabel ledger dikonfirmasi
kosong (`SELECT count(*) = 0`) sebelum migrasi ditulis, jadi tidak ada
DROP+ADD yang benar-benar membuang data. Folder migrasi
(`20260726090000_redesign_ledger_reversal_membalik_pattern/`) dibuat manual
dengan timestamp setelah migrasi terakhir, isi digabung dari hasil diff
tsb + trigger SQL tulisan tangan (bagian generik Keputusan 2/3), diterapkan
langsung lewat `psql -f ... -v ON_ERROR_STOP=1`, lalu dicatat resmi ke
riwayat Prisma lewat `prisma migrate resolve --applied` (perintah ini
non-interaktif, tidak diblokir). Diverifikasi identik dengan alur normal:
`prisma migrate status` melaporkan "Database schema is up to date!" dan
`prisma migrate deploy` dari `DROP DATABASE`+`CREATE DATABASE` kosong
menerapkan ketiga migrasi (baseline, harden_manual_invariants, migrasi baru
ini) berurutan tanpa error, menghasilkan 134 tabel yang sama seperti
sebelumnya (lihat `RELEASE-EVIDENCE.md` untuk transkrip lengkap).

**Status ALT-DEF-043 setelah batch ini: DITUTUP.** Ketiga ledger keanggotaan
(`PoinRiwayat`, `LedgerStempel`, `LedgerSaldoToko`) sekarang punya trigger
append-only + validasi-pembalik SETARA `MutasiStok` (fungsi generik yang
SAMA, `ledger_tolak_ubah`/`ledger_validasi_pembalik`, bukan cuma "setara
desainnya" tapi LITERAL fungsi yang sama dipakai ulang) - asimetri yang
dicatat ALT-DEF-043 (kolom ada, trigger tidak ada) sudah tidak ada lagi.
Dibuktikan test database-integration nyata (bukan cuma klaim desain) untuk
KEEMPAT tabel, lihat `DEFECT-LEDGER.md` untuk detail closure-checklist
lengkap.

## ADR-033: Audit dan perbaikan validasi actor tenant-scoped - `*OlehId`/`penggunaId` dipindah dari FK langsung ke `Pengguna` menjadi composite-FK ke `KeanggotaanTenant`/`KeanggotaanOutlet`

**Konteks.** ADR-013 poin 5 (dan setiap ADR sesudahnya yang menambah field
aktor baru) menegaskan sebagai prinsip tetap: relasi ke `Pengguna` "TIDAK
PERNAH di-composite-kan ke tenant" karena `Pengguna` adalah identitas GLOBAL
(satu akun bisa menjadi anggota banyak tenant lewat `KeanggotaanTenant`).
Prinsip itu benar untuk relasi IDENTITAS (sesi, token reset, riwayat
perangkat) - tapi audit batch ini menemukan bahwa prinsip yang sama SALAH
DITERAPKAN ke field AKTOR (`dibuatOlehId`, `disetujuiOlehId`,
`diverifikasiOlehId`, dst.): field-field ini merekam "siapa YANG BERTINDAK
atas nama tenant/outlet tertentu", bukan "siapa pemilik akun ini secara
global". FK langsung ke `Pengguna` untuk field aktor berarti composite-FK
`(tenantId, dibuatOlehId)` **tidak pernah bisa dibentuk** - tidak ada jaminan
level-database bahwa `Pengguna` yang direferensikan benar-benar anggota
tenant (apalagi outlet) yang sama dengan baris yang ia buat/setujui. Seorang
`Pengguna` yang TIDAK PERNAH menjadi anggota tenant manapun bisa dicatat
sebagai `dibuatOlehId` sebuah `MutasiStok` milik tenant lain, lolos tanpa
error apa pun. Ini gap keamanan tenant-isolation yang identik bentuknya
dengan gap-gap `ALT-DEF-010` (composite-FK non-aktor) yang sudah diperbaiki
batch-batch sebelumnya - hanya belum pernah diterapkan ke field AKTOR karena
prinsip ADR-013 poin 5 secara keliru digeneralisasi dari "relasi identitas"
ke "seluruh relasi Pengguna tanpa kecuali". Batch ini membalikkan sebagian
ADR-013 poin 5 (bukan mencabut - lihat Keputusan 4 di bawah).

**Langkah 1 - Audit lengkap seluruh field `*OlehId`/`penggunaId`.** Tabel di
bawah mencakup SELURUH relasi ke `Pengguna` yang ditemukan di
`schema.prisma` sebelum batch ini, diklasifikasikan menjadi tiga kelompok:
(A) aktor tenant-level, (B) aktor outlet-level, (C) BUKAN aktor / dikecualikan
dengan sengaja.

**(A) Aktor TENANT-LEVEL** (composite-FK `(tenantId, xxxOlehId)` ->
`KeanggotaanTenant(tenantId, id)`) - dipilih tenant-level (bukan outlet-level)
karena modelnya sendiri TIDAK punya `outletId` sendiri, atau operasinya
secara semantik lintas-outlet dalam satu tenant (mis. transfer stok antar
outlet, approval level-tenant):

| Model.field | Nullable? |
|---|---|
| `IzinSementara.diberikanOlehId` | tidak |
| `PermintaanPersetujuan.disetujuiOlehId` | ya |
| `TransferStok.dibuatOlehId` | tidak |
| `TransferStok.disetujuiOlehId` | ya |
| `TransferStok.dikirimOlehId` | ya |
| `TransferStok.diterimaOlehId` | ya |
| `StokOpname.dibuatOlehId` | tidak |
| `StokOpname.penghitungId` | ya |
| `StokOpname.pengunciId` | ya |
| `StokOpname.penyetujuId` | ya |
| `PenerimaanBarang.diterimaOlehId` | tidak |
| `PesananPerubahan.diubahOlehId` | tidak |
| `PesananPenolakan.ditolakOlehId` | tidak |
| `PesananPembatalan.dibatalkanOlehId` | tidak |
| `RiwayatStatusTiketDapur.diubahOlehId` | ya (event sistem/timer) |
| `GelombangDapur.dipicuOlehId` | ya (event sistem/timer) |
| `KoreksiPembayaran.dikoreksiOlehId` | tidak |
| `QrisKonfirmasiManual.diverifikasiOlehId` | tidak |
| `PembayaranRefund.disetujuiOlehId` | tidak |
| `PromoSimulasi.disimulasikanOlehId` | tidak |
| `PoinRiwayat.dicatatOlehId` | ya (baris sistem) |
| `LedgerStempel.dicatatOlehId` | ya (baris sistem) |
| `LedgerSaldoToko.dicatatOlehId` | ya (baris sistem) |
| `RiwayatGabungPelanggan.digabungOlehId` | tidak |
| `Karyawan.keanggotaanTenantId` (rename dari `penggunaId`) | ya |
| `PermintaanTukarShift.disetujuiOlehId` | ya |
| `KoreksiAbsensi.diajukanOlehId` | tidak |
| `KoreksiAbsensi.disetujuiOlehId` | ya |
| `CutiIzin.disetujuiOlehId` | ya |
| `PermintaanLembur.disetujuiOlehId` | ya |
| `PenilaianKinerja.dinilaiOlehId` | tidak |
| `Notification.keanggotaanTenantId` (rename dari `penggunaId`) | ya (broadcast) |

**(B) Aktor OUTLET-LEVEL** (composite-FK `(tenantId, outletId, xxxOlehId)` ->
`KeanggotaanOutlet(tenantId, outletId, id)`, memerlukan `@@unique([tenantId,
outletId, id])` baru di `KeanggotaanOutlet`) - dipilih outlet-level karena
baris yang direferensikan SENDIRI sudah `outletId`-scoped dan operasinya
secara fisik terikat SATU outlet (kasir, dapur, produksi, konfigurasi alat
di lokasi tertentu):

| Model.field | Nullable? |
|---|---|
| `ProsesProduksi.dibuatOlehId` | tidak |
| `MutasiStok.dibuatOlehId` | tidak |
| `PenyesuaianStok.dicatatOlehId` | tidak |
| `PenyesuaianStok.disetujuiOlehId` | ya |
| `CatatanWaste.dicatatOlehId` | tidak |
| `CatatanWaste.disetujuiOlehId` | ya |
| `PurchaseOrder.dibuatOlehId` | tidak |
| `Pesanan.dibuatOlehId` | tidak |
| `Pembayaran.dikonfirmasiOlehId` | ya |
| `KonfigurasiQris.dibuatOlehId` | tidak |
| `KonfigurasiQris.diverifikasiOlehId` | ya |
| `RiwayatKonfigurasiQris.dilakukanOlehId` | tidak |
| `GiliranKasir.penggunaId` | tidak |
| `RekapKasHarian.diverifikasiOlehId` | ya |
| `BiayaOperasional.dicatatOlehId` | tidak |

Total **32 field tenant-level + 15 field outlet-level = 47 field** dipindah
dari FK langsung `Pengguna` menjadi composite-FK.

**(C) BUKAN aktor / dikecualikan dengan sengaja** (TETAP FK langsung ke
`Pengguna`, atau tidak disentuh sama sekali):

- `Pengguna.sesi`/`tokenResetKataSandi`/`riwayatPerangkat`/
  `KeanggotaanTenant.pengguna` - relasi IDENTITAS murni (siapa PEMILIK akun
  ini), bukan "siapa BERTINDAK sebagai apa" - prinsip ADR-013 poin 5 tetap
  berlaku UTUH di sini, TIDAK dibalikkan.
- `AuditLog.penggunaId` - lihat Keputusan 2.
- `PesananRiwayatStatus.diubahOlehId` - lihat Keputusan 3 (gap diketahui,
  BUKAN dievaluasi-dan-ditolak).

**Keputusan 2 - `AuditLog` dapat KEDUANYA: `penggunaId` (FK langsung,
DIPERTAHANKAN) DAN `keanggotaanTenantId` (composite-FK BARU, nullable),
bukan salah satu.** `AuditLog` adalah snapshot historis-immutable - baris
yang sudah ditulis TIDAK BOLEH "kehilangan" siapa pelakunya hanya karena
keanggotaan tenant orang itu belakangan berubah (dinonaktifkan/dikeluarkan/
dihapus keanggotaannya). Bila `penggunaId` diganti total menjadi composite-FK
ke `KeanggotaanTenant`, maka `ON DELETE`/perubahan status keanggotaan bisa
membuat baris audit lama merujuk ke keanggotaan yang sudah tidak ada -
bertentangan langsung dengan tujuan AuditLog itu sendiri (bukti forensik
yang harus tetap terbaca). Solusi: PERTAHANKAN `penggunaId` (jawaban atas
"siapa secara fisik" - tidak pernah hilang), TAMBAH `keanggotaanTenantId`
nullable (jawaban atas "tercatat sebagai anggota tenant apa SAAT baris ini
ditulis" - validasi actor TAMBAHAN, bukan pengganti). Nullable karena baris
audit yang dihasilkan proses SISTEM (job terjadwal, bukan aksi pengguna
spesifik) tidak selalu punya keanggotaan untuk dirujuk.

**Keputusan 3 - `PesananRiwayatStatus.diubahOlehId` TIDAK diubah pada batch
ini - dicatat eksplisit sebagai gap diketahui, bukan dilewati diam-diam.**
Model ini TIDAK punya kolom `tenantId` sendiri (baris riwayat murni di bawah
`Pesanan`, pola yang sama seperti tabel baris/junction lain di seluruh skema
ini - lihat ADR-013). Composite-FK `(tenantId, diubahOlehId) ->
KeanggotaanTenant(tenantId, id)` MEMERLUKAN kolom `tenantId` ada di tabel
tsb terlebih dahulu; menambahkannya adalah perubahan skema TAMBAHAN yang
tidak diminta ("stay in scope: schema/FK-shape fix only" untuk field yang
SUDAH ada strukturnya). Dicatat di `INVARIAN-BELUM-DITEGAKKAN.md` (lihat di
bawah) sebagai gap yang menunggu batch terpisah yang mendenormalisasi
`tenantId` ke tabel ini.

**Keputusan 4 - `Notification.penggunaId` -> `keanggotaanTenantId`: HANYA
perbaikan TRIVIAL (validasi actor), BUKAN redesain targeting.** Sesuai batas
scope eksplisit instruksi batch ini: `Notification` sudah punya `tenantId`
sendiri, jadi mengganti `penggunaId` (FK langsung) menjadi
`keanggotaanTenantId` (composite-FK) adalah penerapan pola yang SAMA seperti
seluruh field lain di batch ini - tidak butuh keputusan desain baru.
Redesain targeting yang lebih dalam (`keanggotaanOutletId` untuk notifikasi
outlet-scoped, `peranId` untuk broadcast-per-peran, model
`NotificationTarget` terpisah untuk banyak penerima sekaligus) SENGAJA
TIDAK dikerjakan di sini - itu masalah TARGETING (siapa SEHARUSNYA menerima
notifikasi ini), kategori masalah yang BERBEDA dari VALIDASI ACTOR (apakah
kolom aktor yang ADA mengarah ke record yang sah). Dicadangkan untuk batch
"perbaiki notification targeting" terpisah di masa depan (lihat ADR-016
untuk keputusan desain lama yang batch tsb akan revisit).

**Keputusan 5 - `KeanggotaanOutlet` butuh `@@unique([tenantId, outletId,
id])` baru (di samping `@@unique([keanggotaanTenantId, outletId])` yang
sudah ada) supaya composite-FK 3-kolom `(tenantId, outletId, xxxOlehId)`
valid sebagai target FK Postgres.** Pola yang identik dengan
`@@unique([penggunaId, tenantId])` di `KeanggotaanTenant` yang sudah ada
sejak ADR-011 untuk mendukung composite-FK `(tenantId, penggunaId)` di
tempat lain - bukan pola baru, hanya diterapkan ke kombinasi kolom yang
berbeda.

**Keputusan 6 - Migrasi dibuat dengan cara yang SAMA seperti ADR-032
Keputusan 7** (`prisma migrate dev` diblokir non-interaktif di lingkungan
ini): `prisma migrate diff --from-schema-datasource --to-schema-datamodel
--script` menghasilkan isi migrasi murni DROP+ADD constraint/kolom (tidak
ada data yang hilang - tabel `karyawan`/`notification` dikonfirmasi kolom
lama `penggunaId` sepenuhnya NULL sebelum migrasi ditulis karena database
dev masih kosong dari data domain), diterapkan lewat `psql`, dicatat resmi
lewat `prisma migrate resolve --applied`. Diverifikasi identik dengan alur
normal: `prisma migrate status` melaporkan "up to date", dan redeploy dari
`DROP DATABASE`+`CREATE DATABASE` kosong menerapkan seluruh 4 migrasi
berurutan tanpa error menghasilkan 134 tabel yang sama (lihat
`RELEASE-EVIDENCE.md`).

**Status setelah batch ini.** Composite-FK yang baru dipasang membuktikan di
level database bahwa aktor sebuah record adalah baris `KeanggotaanTenant`/
`KeanggotaanOutlet` yang ADA dan tenant/outlet-nya COCOK dengan record yang
direferensikan - satu dari empat sub-syarat yang idealnya dijamin untuk
"aktor yang sah" (anggota tenant/outlet - FK-enforceable, SUDAH). Tiga
sub-syarat lain (aktif SAAT command dijalankan, akses outlet untuk field
tenant-level yang record-nya sebenarnya outlet-scoped, izin/permission yang
sesuai SAAT command dijalankan) secara STRUKTURAL tidak bisa dijamin FK
statis - dicatat sebagai `ALT-DEF-045` di `DEFECT-LEDGER.md` dan sebagai
baris kategori C baru `INV-045`/`INV-046` di
`INVARIAN-BELUM-DITEGAKKAN.md`, menunggu batch implementasi handler/
service-layer terpisah (di luar scope batch schema-only ini).

## ADR-034: Migrasi seluruh field uang rupiah dari `Int` ke `BigInt` (amandemen ADR-005, ALT-DEF-046)

**Konteks.** ADR-005 (halaman ini, di atas) memutuskan uang disimpan sebagai
`Int` rupiah bulat murni untuk menghindari galat floating-point - keputusan
itu TETAP BENAR dan TIDAK dicabut ("rupiah bulat, bukan Decimal/Float"
masih berlaku). Yang TIDAK dipertimbangkan ADR-005 saat itu adalah JANGKAUAN
`Int` (Postgres `int4`, signed 32-bit, maksimum 2.147.483.647): field
uang PER-TRANSAKSI (harga satuan item, nominal diskon satu baris) hampir
tidak mungkin mendekati batas itu, tapi field AGREGAT/KUMULATIF (total
penjualan harian per outlet, saldo toko kumulatif pelanggan, estimasi total
purchase order) genuinely bisa mendekatinya begitu skala bisnis tenant
membesar (lihat perhitungan skala di Keputusan 4 di bawah).

**Klarifikasi fakta PENTING sebelum keputusan (Keputusan 0).** Batch ini
awalnya berangkat dari premis "Postgres `int4` overflow diam-diam wraparound
ke nilai negatif tanpa error" - premis itu **SALAH** dan sengaja diverifikasi
langsung dengan probe nyata sebelum menulis satu baris kode migrasi pun (supaya
justifikasi ADR ini tidak berdiri di atas asumsi keliru):

```sql
CREATE TABLE _probe_int4_overflow (n int4);
INSERT INTO _probe_int4_overflow VALUES (2147483647);
UPDATE _probe_int4_overflow SET n = n + 1;      -- ERROR:  integer out of range
INSERT INTO _probe_int4_overflow VALUES (2200000000);  -- ERROR:  integer out of range
```

**Temuan faktual: Postgres `int4` MENOLAK (raise error keras) nilai/aritmetika
di luar jangkauan -2.147.483.648..2.147.483.647, baik lewat literal INSERT
maupun aritmetika UPDATE - BUKAN silent wraparound.** Ini mengubah framing
risiko: bahaya `Int` untuk field agregat bukan "korupsi data diam-diam
menjadi angka negatif yang salah", melainkan **kegagalan keras (hard
failure)** pada operasi bisnis normal (tutup kasir, rekap penjualan harian,
update saldo toko) begitu satu baris agregat melewati ceiling - downtime/error
pada command yang seharusnya sukses, bukan data yang diam-diam salah. Kedua
risiko itu sama-sama harus dicegah, tapi framing yang benar penting untuk
prioritisasi dan pesan error yang akan ditulis nanti di lapisan aplikasi.
Bukti lengkap (termasuk output psql asli) ada di `RELEASE-EVIDENCE.md`.

**Keputusan 1 - Audit lapangan (Step 1), dua putaran.** Putaran pertama
memakai grep kata kunci nama field (`harga*`, `subtotal`, `diskon*`,
`pajak*`, `*biayaLayanan*`/`serviceCharge`, `total*`, `*refund*`,
`saldoToko*`, `hpp`/`hargaPokok`/`hargaPerolehan`, `nilaiPersediaan`,
`penjualan*`, `pengeluaran`, `hutang*`, `jumlah` (diperiksa manual satu-satu
karena ambigu - banyak `jumlah` adalah KUANTITAS stok/produksi yang sudah
`Decimal`, bukan uang)) dan menemukan 46 field lintas ~24 model. Putaran
KEDUA dipicu bukan oleh grep tambahan melainkan oleh **kegagalan 3 test
arsitektur** (`keanggotaan-ledger-constraints.test.ts`,
`pembayaran-alokasi-metode-constraints.test.ts`,
`persediaan-ledger-reservasi-constraints.test.ts`) yang menegaskan bunyi
literal tipe `Int` lama - kegagalan itu diharapkan (test itu memang perlu
diperbarui ke `BigInt`), tapi memicu pemeriksaan ulang menyeluruh yang
menemukan **5 field TERLEWAT** oleh kata kunci putaran pertama:
`VersiResep.snapshotBiaya` (HPP snapshot - kata "biaya" generik tidak ada di
daftar kata kunci awal), `GiliranKasir.modalAwal`/`modalAkhirDihitung`/
`modalAkhirSistem` (modal kas fisik shift kasir, rupiah - kata "modal" tidak
ada di daftar), dan `Promo.maximumDiscount` (dikomentari eksplisit "Batas
potongan dalam rupiah" di schema, tapi nama field tidak memuat kata kunci
uang generik apa pun).

Putaran KETIGA ditemukan saat memperbarui dokumen ERD `docs/database/*.md`
(Step "dokumentasi" batch ini, BUKAN test lagi) - saat menyalin komentar
`"rupiah"` dari `schema.prisma` ke diagram Mermaid, satu field lagi
ditemukan TERLEWAT kedua putaran sebelumnya:
`PengaturanPersediaanOutlet.ambangSelisihOpname` (ambang selisih stok opname
dalam rupiah yang memicu status `MENUNGGU_PERSETUJUAN`, ALT-PSD-017 -
komentar schema-nya eksplisit menyebut "rupiah bulat (ADR-005)" tapi nama
field mengandung kata "ambang"/"Selisih", tidak ada di kata kunci grep
awal). **Total akhir: 52 field lintas 28 model.** Seluruh 3 field yang
terlewat (ditemukan lintas 3 putaran berbeda: regresi test test arsitektur
untuk 5 field, lalu cross-check dokumen ERD untuk 1 field lagi) dicatat
sebagai `ALT-DEF-046` di `DEFECT-LEDGER.md` - pelajaran prosesnya: audit
berbasis kata kunci nama field TIDAK CUKUP sendirian sebagai satu-satunya
metode, harus dikombinasikan DENGAN (1) pembacaan komentar schema
baris-per-baris, (2) regresi test arsitektur sebagai jaring pengaman, DAN
(3) cross-check dokumen ERD yang sudah ada - kombinasi ketiganya yang
akhirnya menangkap seluruh 52 field, bukan satu metode saja.

**Tabel audit lengkap (ringkas per model, field per baris):**

| Model | Field | Klasifikasi | Risiko ceiling |
|---|---|---|---|
| BatasIzin | maksimumDiskonNominal, maksimumRefund | Per-transaksi (batas) | Rendah |
| VarianMenu | hargaTambahan | Per-transaksi | Rendah |
| ModifierOpsi | hargaTambahan | Per-transaksi | Rendah |
| HargaItemOutlet | harga | Per-transaksi | Rendah |
| VersiResep | snapshotBiaya | Per-transaksi (HPP snapshot) | Rendah |
| MutasiStok | hargaPerolehan | Per-transaksi | Rendah |
| BatchStok | hargaPerolehan | Per-transaksi | Rendah |
| CatatanWaste | nilaiKerugian | Per-transaksi | Rendah |
| PurchaseOrder | totalEstimasi | **Agregat** (per PO) | Sedang |
| PurchaseOrderBaris | hargaSatuan | Per-transaksi | Rendah |
| PenerimaanBarangBaris | hargaSatuanAktual | Per-transaksi | Rendah |
| ItemPesanan | hargaSatuan, hargaDasarSnapshot, hargaVarianSnapshot, hargaModifierSnapshot, diskonSnapshot, pajakSnapshot, serviceChargeSnapshot, totalBarisSnapshot | Per-transaksi (per baris item) | Rendah |
| ItemPesananModifier | hargaTambahan, hargaSnapshot, totalSnapshot | Per-transaksi | Rendah |
| TransaksiKasir | jumlah | Per-transaksi (kas masuk/keluar) | Rendah |
| GiliranKasir | modalAwal, modalAkhirDihitung, modalAkhirSistem | Per-transaksi (modal shift) | Rendah |
| Pembayaran | jumlah, totalDiterima, kembalian | Per-transaksi | Rendah-Sedang |
| AlokasiPembayaran | jumlah | Per-transaksi | Rendah |
| PembayaranMetodeBaris | jumlah | Per-transaksi | Rendah |
| KoreksiPembayaran | jumlahSebelum, jumlahSesudah | Per-transaksi | Rendah |
| PembayaranRefund | jumlah | Per-transaksi | Rendah |
| Promo | maximumDiscount | Per-transaksi (batas) | Rendah |
| PromoReward | nilaiNominal, hargaPaket | Per-transaksi | Rendah |
| PromoPemakaianBaris | nilaiDiskon | Per-transaksi | Rendah |
| LedgerSaldoToko | jumlah | Per-baris ledger (SUM = agregat) | Sedang |
| BiayaOperasional | jumlah | Per-transaksi | Rendah |
| Pesanan | subtotal, totalDiskon, totalPajak, totalServiceCharge, totalAkhir | **Agregat** (per pesanan) | Rendah-Sedang |
| Pelanggan | saldoTokoCache | **Agregat kumulatif** (cache SUM lifetime) | **Tinggi** |
| RekapKasHarian | totalPenjualan, totalRefund, totalDiskon, selisihKas | **Agregat harian per outlet** | **Tinggi** |
| RmPenjualanHarian | totalPenjualan, totalDiskon, totalRefund | **Agregat harian per outlet** | **Tinggi** |
| RmPenjualanItemHarian | totalPenjualan | **Agregat harian** | Sedang |
| RmKinerjaKaryawanHarian | totalPenjualanDitangani | **Agregat harian per karyawan** | Sedang |
| PengaturanPersediaanOutlet | ambangSelisihOpname | Per-transaksi (ambang/threshold) | Rendah |

Ringkasan: 52 field, 28 model (termasuk `PengaturanPersediaanOutlet.ambangSelisihOpname`
yang ditemukan di putaran audit ketiga), 34 field per-transaksi (risiko rendah)
vs 18 field agregat/kumulatif (risiko sedang-tinggi) - lihat `RmPenjualanHarian`/
`RekapKasHarian`/`Pelanggan.saldoTokoCache` sebagai kandidat risiko tertinggi.

**Field yang SENGAJA DIKECUALIKAN (bukan uang, walau nama/pola mirip
ledger uang):** `PoinRiwayat.jumlah` dan `Keanggotaan.poinAktif`/
`poinKumulatif`/`TierKeanggotaan.minPoinKumulatif` adalah **POIN loyalitas**
(unit terpisah dari rupiah, dikonfirmasi lewat `JenisPoinRiwayat` enum dan
`kadaluarsaPada` - poin tidak identik nilai tukar rupiah 1:1 kecuali
didefinisikan terpisah di layer aplikasi); `LedgerStempel.jumlah` dan
`HadiahStempel.jumlahStempelDibutuhkan` adalah **jumlah STEMPEL** (punch
card fisik/digital, bukan rupiah). Ketiganya BERBEDA dari `LedgerSaldoToko`
yang komentarnya eksplisit menyebut "Rupiah bulat (ADR-005)" - `LedgerSaldoToko`
DIMIGRASI, poin/stempel TIDAK. Test `uang-bigint-overflow.test.ts` memuat
kontrol negatif eksplisit yang membuktikan `Keanggotaan.poinAktif` TETAP
`Int` dan tetap menolak nilai di luar jangkauan int4, supaya pengecualian
ini dinyatakan sengaja dan tidak diam-diam menjadi celah. Field ambigu
lain, `TargetKinerja.targetNilai`, dibiarkan `Decimal(10,2)` apa adanya -
tidak dikonfirmasi murni rupiah (bisa berupa target non-uang seperti jumlah
pesanan) dan sudah aman dari ceiling `Int` karena tipe `Decimal`.

**Keputusan 2 - `BigInt` seragam untuk SEMUA 52 field, bukan migrasi
surgical hanya field agregat.** Instruksi eksplisit hanya mewajibkan field
AGREGAT dimigrasi; opsi (b) migrasi surgical (hanya 18 field agregat/
kumulatif di atas) dipertimbangkan tapi DITOLAK karena akan menghasilkan DUA
konvensi tipe uang berdampingan di schema yang sama (`Int` untuk
per-transaksi, `BigInt` untuk agregat) - beban kognitif permanen bagi
developer masa depan yang harus mengingat mana yang mana per field, DAN
rawan salah sewaktu sebuah field per-transaksi "naik level" menjadi bagian
agregat baru (mis. field baru yang men-SUM beberapa `ItemPesanan.hargaSatuan`)
tanpa disadari perlu tipe lebih besar. Opsi (a) - **BigInt seragam, "uang
adalah BigInt, titik"** - dipilih karena: (1) satu aturan, tidak ada
percabangan yang perlu diingat; (2) migrasi widening `int4`→`int8` selalu
lossless (tidak ada nilai `int4` valid yang tidak muat di `int8`), jadi
biaya penerapan hampir nol; (3) instruksi Step 3 (serialisasi uang sebagai
string di API) SUDAH mewajibkan setiap konsumen memperlakukan SEMUA field
uang secara seragam sebagai string tidak peduli agregat atau bukan, jadi
tidak ada API-level benefit dari mempertahankan sebagian sebagai `Int`
number-native.

**Keputusan 3 - `BigInt`, bukan `Decimal(20,0)`.** Postgres `int8`
(`BigInt` Prisma) presisi, tidak ada floating point, maksimum
~9,2×10^18 - jauh lebih dari cukup untuk rupiah bahkan skala ekonomi
nasional. Tipe JS native `bigint` (bukan wrapper `decimal.js` yang dipakai
tipe `Decimal` Prisma) berarti lebih sedikit permukaan kesalahan aritmetika
(operator native `+`/`-`/`*` bekerja langsung, bukan lewat method call
`.plus()`/`.minus()` yang mudah lupa dipakai konsisten). Tidak ditemukan
alasan konkret `Decimal(20,0)` lebih unggul untuk domain ini (tidak ada
kebutuhan pecahan desimal untuk rupiah - ADR-005 sudah menetapkan itu).

**Keputusan 4 - Sanity-check skala nyata (bukan hipotetis).** Instruksi
meminta pengecekan terhadap "asumsi dataset performance-test dari dokumen
scaffold master (10 tenant, 500rb pesanan, dst)" - **dokumen semacam itu
TIDAK DITEMUKAN** di `docs/` repo ini setelah grep menyeluruh (`grep -rniE
"[0-9][0-9,.]* (tenant|outlet|pesanan|order|transaksi)" docs/` tidak
menghasilkan dokumen scaffold performa dengan angka skala eksplisit) -
dicatat jujur di sini alih-alih berpura-pura menemukannya. Sanity-check
karena itu dilakukan langsung dari asumsi bisnis wajar: `RmPenjualanHarian`
adalah agregat PER-OUTLET PER-HARI (bukan per-tenant) - satu outlet ramai
volume tinggi (mis. food court/kafetaria korporat/restoran cepat saji
lokasi flagship) yang memproses ~4.200-10.500 transaksi pada satu hari
puncak dengan rata-rata Rp200rb-500rb per transaksi SUDAH cukup untuk
`totalPenjualan` harian outlet itu mendekati atau melewati 2,1 miliar rupiah
- ini SKALA REALISTIS untuk satu lokasi ramai pada hari puncak (bukan
skenario ekstrem), apalagi mengingat platform ini multi-tenant dan
beberapa tenant bisa jadi jaringan besar. Kesimpulan: risiko ceiling `Int`
untuk field agregat harian/kumulatif BUKAN risiko teoretis murni, dicatat
sebagai bagian `ALT-DEF-046`.

**Keputusan 5 - Migrasi dijalankan 3 batch kecil (bukan satu, karena field
tambahan ditemukan SETELAH batch-batch sebelumnya diterapkan+diresolve).**
Batch pertama (`20260726084007_migrasi_uang_int_ke_bigint`, 46 field/24
tabel), batch kedua (`20260726084323_migrasi_uang_int_ke_bigint_lanjutan`, 5
field tambahan/3 tabel: `versi_resep.snapshotBiaya`,
`giliran_kasir.modalAwal/modalAkhirDihitung/modalAkhirSistem`,
`promo.maximumDiscount`), dan batch ketiga
(`20260726085206_migrasi_uang_int_ke_bigint_ambang_opname`, 1 field/1 tabel:
`pengaturan_persediaan_outlet.ambangSelisihOpname`, ditemukan saat
memperbarui dokumen ERD) - ketiganya dibuat dengan cara yang SAMA seperti
ADR-031/032/033 (`prisma migrate dev --create-only` diblokir
non-interaktif di lingkungan ini): `prisma migrate diff
--from-schema-datasource --to-schema-datamodel --script` menghasilkan SQL
`ALTER COLUMN ... SET DATA TYPE BIGINT` murni (widening lossless, DIKONFIRMASI
seluruh tabel target 0 baris sebelum migrasi lewat `SELECT count(*)`),
diterapkan lewat `psql`, dicatat resmi lewat `prisma migrate resolve
--applied`. Diverifikasi: `prisma migrate status` melaporkan "up to date",
dan redeploy dari `DROP DATABASE`+`CREATE DATABASE` kosong menerapkan
seluruh 7 migrasi berurutan tanpa error - lihat `RELEASE-EVIDENCE.md`.

**Keputusan 6 - Test overflow nyata ditulis
(`uang-bigint-overflow.test.ts`)** membuktikan TIGA hal lewat Postgres
sungguhan: (a) fakta `int4` MENOLAK overflow (bukan wraparound) lewat tabel
buang-pakai; (b) nilai 2.200.000.000 (> `INT4_MAX`) yang GAGAL di tabel
kontrol int4 BERHASIL disisipkan + dibaca kembali EXACT di
`rm_penjualan_harian.totalPenjualan` dan `pelanggan.saldoTokoCache` (kolom
asli yang sudah dimigrasi); (c) kontrol negatif bahwa
`keanggotaan.poinAktif` (SENGAJA dikecualikan, lihat Keputusan 1) TETAP
`Int` dan tetap menolak nilai itu - membuktikan pengecualian yang
didokumentasikan konsisten dengan perilaku database nyata, bukan celah
yang terlewat.

**Status API/serialisasi.** Lihat `docs/api/API-CONTRACT.md` bagian "Uang
sebagai string di JSON" - kontrak ini didokumentasikan di batch ini TAPI
TIDAK ADA kode handler API yang ditulis (belum ada handler API sama sekali
di repo ini), murni dokumentasi kontrak untuk diikuti batch implementasi
API mendatang.

**Hubungan dengan ADR-005.** ADR-005 TIDAK dihapus/direvisi teksnya -
keputusan intinya ("rupiah bulat, bukan Decimal/Float") tetap berlaku penuh.
ADR-034 ini murni MENGAMANDEMEN bagian "disimpan sebagai `Int`" menjadi
"disimpan sebagai `BigInt`" untuk field yang teridentifikasi di atas -
keduanya dipertahankan di log ini untuk jejak sejarah keputusan sesuai
konvensi ADR/DECISION-LOG proyek ini.

## ADR-035: Optimistic locking (`version`/`updatedAt`) pada aggregate root + trigger auto-increment generik

**Konteks.** Sebelum batch ini, TIDAK SATU PUN model di schema ini punya
mekanisme deteksi konflik konkurensi apa pun - dua penulis konkuren ke baris
yang sama akan silently last-write-wins saling menimpa tanpa terdeteksi.
Kategori C `INVARIAN-BELUM-DITEGAKKAN.md` sudah mencatat ini eksplisit sejak
awal ("optimistic concurrency ... belum ada di schema sama sekali ... scope
batch deep-correction-loop berikutnya"). Batch ini adalah batch tersebut.
Instruksi eksplisit: tambahkan `version`/`updatedAt` ke 10 model minimum,
lalu rancang penegakan DB-level yang REAL (bukan sekadar kolom dekoratif
yang aplikasi "diharapkan" memakainya dengan benar).

**Keputusan 1 - Daftar model: 10 minimum + 3 tambahan, dengan rasional
konkret per penambahan (bukan stempel mekanis).**

10 model minimum (persis seperti instruksi): `Pesanan`, `Pembayaran`,
`GiliranKasir`, `TransferStok`, `StokOpname`, `PurchaseOrder`, `Promo`,
`Keanggotaan`, `JadwalKerja`, `Reservasi`.

3 model TAMBAHAN, masing-masing dengan skenario concurrent-write konkret
yang TIDAK dicakup daftar minimum:
- **`Absensi`** - baris presensi bisa diedit KONKUREN oleh dua jalur
  berbeda: device presensi karyawan yang menulis `jamPulang`/
  `jamPulangEfektif` saat checkout, DAN supervisor yang melakukan koreksi
  manual (`KoreksiAbsensi` disetujui, menulis balik ke
  `jamMasukEfektif`/`jamPulangEfektif` baris `Absensi` yang SAMA) - dua
  penulis yang secara wajar terjadi berdekatan waktu pada baris yang sama.
- **`StokBahan`** - baris cache saldo gudang ini SECARA EKSPLISIT sudah
  diidentifikasi (`INV-016` di `INVARIAN-BELUM-DITEGAKKAN.md`) sebagai
  korban race condition baca-lalu-tulis dari mutasi stok konkuren ("dua
  mutasi keluar bersamaan lolos validasi karena baca-lalu-tulis tanpa
  lock"). `version` di sini adalah lapisan TAMBAHAN yang MELENGKAPI
  (bukan menggantikan) rencana `SELECT ... FOR UPDATE` yang sudah dicatat
  di baris invariant tersebut.
- **`PermintaanPersetujuan`** - dua supervisor bisa menyetujui/menolak
  permintaan approval yang SAMA secara bersamaan ("double-approval race")
  - tanpa version, keduanya bisa "berhasil" menulis keputusan berbeda pada
  baris yang sama tanpa satu pun terdeteksi menimpa yang lain.

**Model yang SENGAJA TIDAK ditambah, dengan rasional eksplisit (bukan
kelalaian):**
- **`KonfigurasiQris`** - race "aktifkan konfigurasi QRIS baru" SUDAH
  dijamin STRUKTURAL oleh partial unique index
  `konfigurasi_qris_satu_aktif_per_outlet` (`INV-001`, `DITUTUP`) - dua
  request "aktifkan konfigurasi X" konkuren akan salah satunya ditolak
  Postgres pada level constraint, terlepas dari version apa pun.
  Menambahkan `version` di sini adalah proteksi berlapis TANPA skenario
  konkret baru yang belum tercakup - persis kasus yang instruksi minta
  untuk TIDAK dilakukan mekanis.
- **`MutasiStok`/`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` (keempat
  ledger append-only, ADR-032)** - baris di keempat tabel ini TIDAK PERNAH
  di-`UPDATE` sama sekali (trigger `ledger_tolak_ubah` menolak SEMUA
  `UPDATE` tanpa pengecualian). Konsep "version yang naik saat `UPDATE`"
  tidak bermakna untuk tabel yang baris-barisnya immutable sejak
  di-`INSERT` - append-only dan optimistic locking menyelesaikan masalah
  yang berbeda (yang pertama mencegah PERUBAHAN sejarah, yang kedua
  mencegah PENIMPAAN diam-diam antar penulis konkuren pada baris yang
  MEMANG boleh berubah).

Total: **13 model** (`Pesanan`, `Pembayaran`, `GiliranKasir`, `TransferStok`,
`StokOpname`, `PurchaseOrder`, `Promo`, `Keanggotaan`, `JadwalKerja`,
`Reservasi`, `Absensi`, `StokBahan`, `PermintaanPersetujuan`) - dalam rentang
"2-4 tambahan" yang diminta instruksi (3 ditambahkan).

**Keputusan 2 - Trigger generik `optimistic_lock_bump_version()`, dipasang
SEBAGAI SATU FUNGSI di seluruh 13 tabel (mengikuti filosofi "fungsi generik
dipakai ulang lintas tabel" dari `ledger_tolak_ubah`/`ledger_validasi_pembalik`,
ADR-032).**

Desain fungsi (`BEFORE UPDATE ... FOR EACH ROW`):

```sql
CREATE FUNCTION optimistic_lock_bump_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW."version" := OLD."version" + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Mekanisme dan pembagian tanggung jawab (INI BAGIAN PALING PENTING untuk
dipahami dengan benar):
- **Trigger MENGAMBIL ALIH PENUH kolom `version`** - apa pun yang dikirim
  aplikasi sebagai `NEW.version` (termasuk bila TIDAK dikirim sama sekali,
  atau dikirim sebagai lompatan sembarang seperti `999`, atau bahkan
  `-1`) DIABAIKAN SEPENUHNYA dan di-override menjadi `OLD.version + 1`.
  Ini BUKAN validasi yang bisa gagal (tidak ada `RAISE EXCEPTION` di
  fungsi ini) - override diam-diam dipilih dibanding REJECT keras karena
  aplikasi TIDAK PERNAH punya alasan sah untuk men-set `version` secara
  manual; override membuat perilaku itu aman-secara-default tanpa
  memaksa SETIAP caller (termasuk ORM yang menulis ulang seluruh kolom,
  atau operator lewat `psql`) untuk secara sadar menghindari klausa
  `SET version = ...`.
- **Deteksi konflik konkurensi TETAP SEPENUHNYA di klausa `WHERE version =
  expectedVersion` pada `UPDATE` aplikasi itu sendiri** - trigger ini SAMA
  SEKALI TIDAK menggantikan tanggung jawab itu. `WHERE version =
  expectedVersion` yang tidak match secara alami menghasilkan `0` baris
  ter-`UPDATE` di SQL standar (tidak butuh logika trigger APA PUN untuk
  ini - ini murni bagaimana `WHERE` bekerja). Yang dijamin trigger HANYA:
  angka `version` yang dibaca aplikasi berikutnya benar-benar jujur
  mencerminkan "berapa kali baris ini sudah pernah di-`UPDATE`", bukan
  angka yang bisa dipalsukan/dilewati oleh kode caller yang lupa atau
  sengaja menaikkannya secara salah.
- Konsekuensi gabungan: `command` app-level TIDAK PERNAH perlu (dan TIDAK
  BOLEH) menyertakan logika "naikkan version" sendiri - cukup baca
  `version` saat ini, kirim balik sebagai `expectedVersion` di command,
  dan tulis dengan `WHERE id = ? AND version = expectedVersion`. Trigger
  menjamin sisi "version selalu benar", aplikasi menjamin sisi "tulis
  hanya bila version masih seperti yang dibaca".

**Keputusan 3 - `KONFLIK_DATA` sebagai kode error API baru, dan
`Idempotency-Key` TIDAK menggantikan optimistic locking.** Didokumentasikan
penuh di `docs/api/API-CONTRACT.md` bagian 1b (kontrak lintas-endpoint,
bukan per-endpoint) - ringkasan keputusan intinya: idempotency menjawab
"request YANG SAMA yang diulang tidak boleh diterapkan dua kali" (kunci:
identitas request), optimistic locking menjawab "dua request BERBEDA yang
sama-sama membaca versi lama tidak boleh saling menimpa diam-diam" (kunci:
versi data yang dibaca) - keduanya independen, bisa dan seharusnya
digunakan BERSAMAAN pada endpoint yang sama, bukan salah satu dianggap
cukup menggantikan yang lain.

**Keputusan 4 - Migrasi `20260726110000_optimistic_locking_version`
diterapkan dengan cara yang SAMA seperti batch-batch sebelumnya**
(`prisma migrate dev` diblokir non-interaktif di lingkungan ini): `prisma
migrate diff --from-schema-datasource --to-schema-datamodel --script`
menghasilkan `ALTER TABLE ... ADD COLUMN` murni (seluruh 13 tabel
dikonfirmasi 0 baris di `altora_resto_dev` sebelum migrasi ditulis, jadi
`updatedAt TIMESTAMP(3) NOT NULL` tanpa default aman tanpa backfill),
ditambah bagian trigger generik yang ditulis manual mengikuti migrasi SQL
yang sudah dihasilkan Prisma, diterapkan lewat `psql`, dicatat resmi lewat
`prisma migrate resolve --applied`. Diverifikasi: `prisma migrate status`
melaporkan "up to date", dan redeploy dari `DROP DATABASE`+`CREATE DATABASE`
kosong menerapkan seluruh 8 migrasi berurutan tanpa error menghasilkan 134
tabel yang sama dan 13 trigger `trg_*_bump_version` - lihat
`RELEASE-EVIDENCE.md`.

**Keputusan 5 - Regresi ditemukan dan diperbaiki saat menjalankan ulang
SELURUH suite test-support setelah migrasi diterapkan (bukan hanya test
baru).** Tiga file fixture lama (`_pg-helper.ts` fungsi
`createKeanggotaanFixtures`, `actor-keanggotaan-tenant-outlet-invariants.test.ts`
untuk `stok_opname`, `ledger-reversal-membalik-invariants.test.ts` untuk
`keanggotaan`) melakukan `INSERT` mentah ke tabel yang SEKARANG mewajibkan
kolom `updatedAt` (`NOT NULL`, tanpa default di level SQL - `@updatedAt`
Prisma murni ditegakkan oleh Prisma Client, bukan oleh Postgres) tanpa
menyertakannya - `INSERT` itu gagal dengan
`null value in column "updatedAt" violates not-null constraint`. Diperbaiki
dengan menambahkan `"updatedAt"` eksplisit (`now()`) ke ketiga `INSERT`
tersebut, mengikuti konvensi yang SUDAH dipakai test lain (mis.
`qris-konfigurasi-invariant.test.ts`) yang selalu menyertakan
`createdAt`/`updatedAt` eksplisit di fixture raw-SQL. Pelajaran proses:
menambah kolom `NOT NULL` tanpa default ke tabel yang SUDAH punya banyak
fixture raw-SQL di test lain WAJIB diverifikasi dengan menjalankan ULANG
SELURUH suite (bukan hanya test baru) sebelum migrasi dianggap aman -
persis yang dilakukan di sini, ditemukan 3 file terdampak, seluruhnya
diperbaiki, seluruh 29 file (naik dari 28) lulus setelahnya.

**Status.** Kategori C `INVARIAN-BELUM-DITEGAKKAN.md` diperbarui dengan
`INV-048` (kategori A - migrasi resmi, trigger generik terpasang dan
teruji) untuk mekanisme version itu sendiri; catatan "belum ada optimistic
concurrency di schema sama sekali" pada baris `INV-015` s.d. `INV-024`/
`INV-045`/`INV-046` TIDAK dicabut - baris-baris itu tetap butuh guard
transaksi/`SELECT FOR UPDATE` app-level TERPISAH untuk domain masing-masing
(version melengkapi, bukan menggantikan, guard-guard tersebut sesuai
Keputusan 1 di atas untuk `StokBahan`). Tidak ada kode handler command yang
ditulis pada batch ini - murni schema, trigger, dan dokumentasi kontrak
untuk diikuti batch implementasi mendatang.

## ADR-036: Retur (sub-model penuh), void setelah produksi, dan pengaman atomicity pembayaran-pesanan

**Konteks.** Tiga sub-problem terkait dari instruksi deep-loop section 9,
seluruhnya menyentuh domain Pesanan/Pembayaran/Dapur:

- **(A) Atomic payment->order transition.** Risiko desain: guard yang naif
  memeriksa `if (Pembayaran.status === DIBAYAR) { jalankan side-effect
  konfirmasi Pesanan }` sebagai DUA langkah terpisah yang bisa terinterupsi
  di antaranya (crash setelah Pembayaran DIBAYAR tapi sebelum Pesanan
  dikonfirmasi = state permanen yang inkonsisten).
- **(B) Retur** - `StatusPesanan.DIRETUR` lama hanya flag order-level,
  tidak bisa merepresentasikan retur SEBAGIAN ("3 dari 5 item").
- **(C) Void setelah produksi** - pembatalan pra-produksi (lepas reservasi
  stok) BERBEDA secara fundamental dari pembatalan pasca-produksi (bahan
  SUDAH terpakai, tidak bisa di-"un-consume", side-effect harus WASTE).
- **(D) Tiket batal tidak boleh memblokir order-ready** - status
  `DIBATALKAN` pada `TiketDapur` harus dikecualikan dari guard "seluruh
  tiket AKTIF sudah SIAP/DISAJIKAN", TAPI hanya setelah alasan dipenuhi.

**Keputusan 1 (sub-problem A) - Pengaman DB-level: constraint trigger
DEFERRED, bukan CHECK constraint biasa, bukan trigger BEFORE/AFTER biasa.**
"Satu transaksi atomik" itu sendiri adalah tanggung jawab
APPLICATION/service-layer murni - TIDAK ADA kode handler sama sekali di
repo ini (dicatat sebagai defect terpisah yang MEMANG deferred,
`ALT-DEF-047` di `DEFECT-LEDGER.md`, karena secara fundamental tidak bisa
ditutup sampai kode itu ada). Yang BISA dikerjakan skema: jaring pengaman
yang membuat state akhir yang TER-COMMIT tidak akan pernah inkonsisten,
meski proses menuju ke sana (urutan statement dalam satu transaksi) bebas
diatur aplikasi. Dipertimbangkan tiga opsi:
  1. **CHECK constraint polos** - TIDAK BISA, CHECK constraint Postgres
     hanya bisa memeriksa kolom-kolom dalam SATU baris/SATU tabel, tidak
     bisa melakukan JOIN lintas `pembayaran`/`alokasi_pembayaran`/`pesanan`.
  2. **Trigger BEFORE/AFTER biasa (non-deferred)** - DITOLAK. Trigger biasa
     fire IMMEDIATELY setelah statement `UPDATE pembayaran ... SET status =
     'DIBAYAR'` itu sendiri - pada titik itu, statement berikutnya dalam
     transaksi yang sama (`UPDATE pesanan ...`) BELUM berjalan, sehingga
     trigger non-deferred akan SELALU salah menolak urutan yang justru
     diminta kontrak (ubah Pembayaran dulu, baru Pesanan).
  3. **`CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`** - DIPILIH.
     Evaluasi ditunda sampai TEPAT SEBELUM COMMIT, sehingga aplikasi bebas
     mengubah Pembayaran dan Pesanan dalam urutan apa pun ASALKAN pada titik
     commit keduanya konsisten. Bila TIDAK konsisten pada titik itu, COMMIT
     GAGAL KERAS dengan pesan eksplisit - bukan silent inconsistency, dan
     bukan false-positive-reject terhadap urutan yang benar.
Dipasang di TIGA tabel (`pembayaran`, `alokasi_pembayaran`, `pesanan`)
sekaligus lewat SATU fungsi bersama `cek_konsistensi_pembayaran_pesanan` -
supaya inkonsistensi tertangkap dari sisi mana pun perubahan terjadi
(Pembayaran diubah DIBAYAR, alokasi baru ditambah ke pembayaran yang sudah
DIBAYAR, atau Pesanan diregresikan setelah pembayarannya DIBAYAR). Migrasi
`20260726130000_pengaman_atomik_pembayaran_pesanan`. Query rekonsiliasi
ad-hoc didokumentasikan di komentar migrasi dan di `API-CONTRACT.md` untuk
audit manual independen dari trigger.

**Keputusan 2 (sub-problem B) - Model penuh `PesananRetur`/
`PesananReturBaris`, `DIRETUR` DIHAPUS dari `StatusPesanan`.** Audit grep
sebelum menghapus (`grep -rln "DIRETUR"` di seluruh repo) menemukan 12 file
menyebut `DIRETUR`: `schema.prisma` (enum `StatusPesanan` DAN
`StatusItemPesanan` - keduanya, TIDAK sama), `izin.seed.ts`,
`docs/database/07-pesanan.md`, `docs/database/10-promo.md` (BERBEDA -
merujuk `PromoPemakaian.status`, enum `StatusPemakaianPromo` yang TERPISAH
sama sekali, tidak tersentuh), `STATE-MACHINES.md`, `API-CONTRACT.md`,
`DECISION-LOG.md` (baris ADR-017 lama), `DEFECT-LEDGER.md`,
`INVARIAN-BELUM-DITEGAKKAN.md`, `MASTER-CHECKLIST.md`,
`PERMISSION-MATRIX.md`, dan DUA test arsitektur
(`pesanan-state-machine-snapshot-constraints.test.ts` -
`StatusPesanan`/`StatusItemPesanan` keduanya; `promo-stacking-reward-constraints.test.ts`
- `StatusPemakaianPromo`, TIDAK terkait). Kesimpulan: `StatusPesanan.DIRETUR`
memang melakukan DOUBLE DUTY - sekaligus "status lifecycle order terminal"
DAN "penanda sudah diretur", padahal keduanya ORTOGONAL (pesanan bisa
`SELESAI` di level lifecycle SEKALIGUS `RETUR_SEBAGIAN` di level retur).
Nilai dihapus dari `StatusPesanan` (order-level, granularitas ORDER),
`StatusItemPesanan.DIRETUR` (granularitas ITEM) SENGAJA TIDAK dihapus -
tetap sah menandai satu baris item langsung diretur tanpa lewat
`PesananRetur` untuk kasus trivial, meski pola yang direkomendasikan tetap
lewat `PesananReturBaris` untuk audit penuh. Model baru:
  - `PesananRetur` (id, tenantId, outletId, pesananId, `nomorRetur` unik
    per tenant+outlet - pola sama seperti `Pesanan.nomorPesanan`, `status`
    `StatusRetur`, `alasan` wajib, `diajukanOlehId`/`disetujuiOlehId` via
    composite-FK `KeanggotaanOutlet` - retur adalah operasi fisik outlet
    tertentu, pola sama dengan `Pesanan.dibuatOleh`/`CatatanWaste.dicatatOleh`,
    `totalNilaiRetur` `BigInt` mengikuti konvensi migrasi uang ADR-034,
    `version` optimistic-locking ADR-035 - PesananRetur adalah aggregate
    root TAMBAHAN, race approve/reject ganda oleh dua supervisor sekaligus
    adalah skenario konkret yang sama seperti `PermintaanPersetujuan`).
  - `PesananReturBaris` (per `ItemPesanan`, `kuantitasDikembalikan Int`
    mengikuti tipe `ItemPesanan.kuantitas`, `nilaiPengembalian BigInt`) -
    inilah yang membuat retur SEBAGIAN representable.
  - `Pesanan.statusRetur` (`StatusRingkasanRetur`: `TANPA_RETUR`/
    `RETUR_SEBAGIAN`/`RETUR_PENUH`) - cache/ringkasan TURUNAN, sumber
    kebenaran tetap baris `PesananRetur`/`PesananReturBaris` SELESAI,
    mengikuti pola ledger-vs-cache yang sama dengan `StokBahan`/saldo
    (ADR-023/ADR-027). **Diputuskan: trigger DB (`recompute_status_retur_pesanan`)
    yang merawat cache ini, BUKAN app-computed murni** - konsisten dengan
    preseden proyek ini (cache stok/saldo juga dirawat trigger, bukan
    dipercaya ke aplikasi) dan lebih murah untuk diuji (satu jalur
    kebenaran, bukan N jalur command berbeda yang semuanya harus ingat
    merekomputasi). **Efek samping yang HARUS diketahui pemanggil** (dicatat
    juga di `INVARIAN-BELUM-DITEGAKKAN.md`): `UPDATE pesanan` yang dilakukan
    trigger ini SENDIRI memicu `trg_pesanan_bump_version` (ADR-035) -
    `Pesanan.version` bertambah sebagai efek samping penyelesaian retur,
    BUKAN hanya karena command yang secara eksplisit mengubah Pesanan.
    Command layer yang membawa `expectedVersion` dari SEBELUM retur selesai
    akan gagal optimistic-lock check pada percobaan berikutnya - PERILAKU
    YANG BENAR (mencegah command lama menimpa efek retur), tapi mengejutkan
    bila tidak didokumentasikan eksplisit seperti ini.

**Keputusan 3 (sub-problem C) - `PesananPembatalan` DIPERLUAS (bukan model
baru).** Model `PesananPembatalan` yang ada (ALT-DEF-005/ADR-017) sudah
punya `alasan` wajib dan aktor (`dibatalkanOlehId`) - cukup diperluas
dengan `jenisPembatalan` (`JenisPembatalan`: `SEBELUM_PRODUKSI` default,
`SETELAH_PRODUKSI`) dan `disetujuiOlehId` (nullable). Menambah model baru
terpisah akan menduplikasi kolom yang sudah ada (`alasan`, aktor, `pesananId
@unique`) tanpa alasan struktural - `jenisPembatalan` sudah cukup
membedakan guard/side-effect yang berbeda per nilai. **Approval supervisor**
memakai `PermintaanPersetujuan` yang SUDAH ADA (`jenisAksi` string bebas -
`"PEMBATALAN_SETELAH_PRODUKSI"`, `referensiJenis` = `"PesananPembatalan"`,
`referensiId` = id baris) - TIDAK perlu FK baru, pola generik ini sudah
dipakai domain lain. **CHECK constraint DB nyata**
(`pesanan_pembatalan_approval_wajib_setelah_produksi`): `disetujuiOlehId`
WAJIB diisi HANYA ketika `jenisPembatalan = SETELAH_PRODUKSI` - kondisional
per-nilai-enum yang tidak bisa dinyatakan Prisma DSL, ditegakkan CHECK
manual mengikuti pola yang sama seperti Keputusan 4 di bawah. **Side-effect
WASTE, bukan reversal**: ingredients yang sudah dimasak TIDAK BISA
"di-un-consume" - flow yang benar memakai `CatatanWaste`/
`MutasiStok(jenis=WASTE)` yang SUDAH ADA (model persediaan, batch
sebelumnya) dengan `referensiJenis = WASTE`, `referensiId = CatatanWaste.id`
- TIDAK perlu perubahan skema persediaan, hanya dokumentasi flow di
`STATE-MACHINES.md`. Event outbox baru `order.voided_after_production`
ditambahkan ke katalog `eventType` di `docs/database/15-platform-infra.md`
(satu baris tabel, BUKAN redesain outbox penuh - itu batch lain).

**Keputusan 4 (sub-problem D) - CHECK constraint DB untuk alasan wajib
tiket dibatalkan, predikat "order ready" didokumentasikan sebagai kontrak
query, bukan constraint.** `TiketDapur.alasanPembatalan` (nullable di
Prisma) + CHECK Postgres `tiket_dapur_alasan_wajib_saat_dibatalkan`:
`status <> 'DIBATALKAN' OR "alasanPembatalan" IS NOT NULL` - kondisional
per-nilai-enum yang sama tidak bisa dinyatakan Prisma DSL non-null biasa,
DB-enforced nyata (diuji `retur-void-produksi-invariants.test.ts`, insert
DAN update ke DIBATALKAN tanpa alasan sama-sama ditolak). Predikat "order
ready" itu sendiri (`NOT EXISTS` tiket aktif yang bukan
SIAP/DISAJIKAN/DIBATALKAN) TIDAK bisa jadi CHECK constraint (butuh join
antar baris tiket dalam satu pesanan) - didokumentasikan sebagai kontrak
query eksplisit di `STATE-MACHINES.md` bagian "Dapur", bukan ditegakkan
struktural, karena belum ada kode handler yang menghitungnya.

**Migrasi.** `20260726120000_retur_dan_void_setelah_produksi` (enum baru
StatusRetur/StatusRingkasanRetur/JenisPembatalan, kolom
Pesanan.statusRetur/PesananPembatalan.jenisPembatalan+disetujuiOlehId/
TiketDapur.alasanPembatalan, tabel pesanan_retur/pesanan_retur_baris, DUA
CHECK constraint, trigger recompute_status_retur_pesanan) dan
`20260726130000_pengaman_atomik_pembayaran_pesanan` (trigger deferred
konsistensi pembayaran-pesanan) - keduanya diterapkan ke `altora_resto_dev`
via `psql` + `prisma migrate resolve --applied` (tidak ada baris `pesanan`
berstatus `DIRETUR` dikonfirmasi 0 sebelum migrasi ditulis, aman tanpa
backfill). Fresh-database redeploy (`DROP DATABASE`+`CREATE DATABASE`+
`prisma migrate deploy` dari nol) dan hasil test lengkap ada di
`RELEASE-EVIDENCE.md`.

**Status.** Defect baru `ALT-DEF-047` dicatat di `DEFECT-LEDGER.md` untuk
bagian "satu transaksi atomik" sub-problem A yang FUNDAMENTAL belum bisa
ditutup sampai kode handler/service-layer nyata ada - dicatat eksplisit
sebagai deferred yang SAH, bukan gap eksekusi batch ini.
`INVARIAN-BELUM-DITEGAKKAN.md` diperbarui: baris kategori A baru untuk
kedua CHECK constraint dan trigger deferred (DB-enforced, teruji), baris
kategori C baru untuk "predikat order-ready" dan "satu transaksi atomik
penuh" (app-level, didokumentasikan sebagai kontrak).

## ADR-037: Aturan tunggal siklus hidup stok (reservasi-konsumsi-waste) dan linkage `mutasiStokId`

**Konteks.** Master spec dan beberapa batch koreksi sebelumnya (ADR-023/024/
025) memakai frasa ambigu "reservasi/pengurangan stok bahan sesuai resep
bila berlaku" di `STATE-MACHINES.md` (baris transisi
`DIKONFIRMASI -> DIKIRIM_KE_DAPUR`) tanpa pernah menegaskan SATU transisi
state persis mana yang memicu peristiwa stok mana. Batch ini menutup
ambiguitas itu dengan SATU aturan tegas dan menegakkan bagian yang genuinely
bisa ditegakkan di level database.

**Keputusan 1 - Aturan tunggal (otoritatif, MENGGANTIKAN seluruh bunyi
ambigu "reservasi/pengurangan stok" di dokumen lain):**

```
Pesanan DITERIMA
  -> ReservasiStok dibuat AKTIF (satu per ItemPesanan yang berbahan)

Pesanan DIKIRIM_KE_DAPUR (TiketDapur dibuat/masuk antrian dapur)
  -> ReservasiStok terkait: AKTIF -> DIKONSUMSI
  -> MutasiStok jenis PEMAKAIAN_RESEP ditulis
  -> ReservasiStok.mutasiStokId ditautkan ke baris MutasiStok itu

Pesanan DIBATALKAN SEBELUM produksi (status masih DITERIMA/
MENUNGGU_PEMBAYARAN/DIKONFIRMASI/DIKIRIM_KE_DAPUR-belum-mulai-masak)
  -> ReservasiStok terkait: AKTIF -> DILEPAS
  -> TIDAK ADA MutasiStok

Pesanan batal SETELAH produksi (jenisPembatalan = SETELAH_PRODUKSI, ADR-036)
  -> CatatanWaste dibuat + MutasiStok jenis WASTE (linkage mutasiStokId
     CatatanWaste SUDAH ADA sejak ALT-DEF-008, TIDAK berubah batch ini)
```

**Catatan rekonsiliasi teks "TiketDapur DITERIMA" vs `STATE-MACHINES.md`.**
Draft awal batch ini memakai frasa "DIKIRIM_KE_DAPUR / TiketDapur DITERIMA"
sebagai padanan satu sama lain. Setelah dicek ulang terhadap
`STATE-MACHINES.md` bagian "Dapur (Tiket Dapur)", KEDUANYA BUKAN peristiwa
yang identik: `TiketDapur.DITERIMA` (dari `BARU`) hanya berarti staf
stasiun MENERIMA/ACKNOWLEDGE tiket di layar KDS (`mulaiDiprosesPada` masih
`null`); bahan secara fisik BARU mulai dipakai saat `TiketDapur` masuk
`SEDANG_DISIAPKAN` (baris pertama benar-benar mulai dimasak,
`mulaiDiprosesPada = now()`). **Keputusan final**: titik picu konsumsi
adalah `Pesanan.DIKIRIM_KE_DAPUR` (saat `TiketDapur` PERTAMA KALI dibuat
untuk pesanan tsb) - BUKAN `TiketDapur.DITERIMA` maupun
`TiketDapur.SEDANG_DISIAPKAN`. Alasan: (a) `ReservasiStok` digantung per
`ItemPesanan`/pesanan, bukan per tiket dapur granular, sehingga titik picu
paling alami adalah level Pesanan; (b) menunda konsumsi sampai
`SEDANG_DISIAPKAN` per-baris berarti satu pesanan dengan banyak tiket lintas
stasiun akan mengonsumsi reservasinya secara BERTAHAP dan tidak atomik,
menambah kompleksitas tanpa manfaat nyata pada batch ini (tidak ada kode
handler yang menghitungnya hari ini); (c) `DIKIRIM_KE_DAPUR` sudah menjadi
titik yang didokumentasikan API-CONTRACT.md untuk "reservasi mulai
terpakai". **Defect baru `ALT-DEF-048`** dicatat untuk memastikan pilihan
ini diverifikasi ulang saat kode handler dapur/produksi benar-benar ditulis
(batch mendatang), karena ADR-022/024 sebelumnya tidak eksplisit membahas
granularitas per-tiket vs per-pesanan untuk momen konsumsi.

**Keputusan 2 - `ReservasiStok.status` (4 nilai) TIDAK BERUBAH, hanya
ditegaskan ulang maknanya:** `AKTIF` (reserved, belum diklaim), `DIKONSUMSI`
(dilepas KARENA produksi dimulai - SATU-SATUNYA nilai yang punya baris
`MutasiStok` pendamping), `DILEPAS` (dilepas KARENA batal sebelum produksi -
TIDAK PERNAH punya `MutasiStok` pendamping), `KEDALUWARSA` (job penyapu,
reservasi lewat batas waktu tanpa klaim). Keempatnya sudah dirancang benar
sejak ADR-024 Keputusan 2 - batch ini TIDAK mengubah enum, hanya menegaskan
pemetaannya ke aturan Keputusan 1 di atas secara eksplisit.

**Keputusan 3 - Linkage `ReservasiStok.mutasiStokId` (kolom baru, nullable,
`@unique`, FK composite `(tenantId, mutasiStokId) -> MutasiStok(tenantId,
id)`).** Sebelum batch ini, hubungan "reservasi mana menjadi mutasi stok
yang mana" HANYA bisa di-infer tidak langsung lewat
`MutasiStok.referensiJenis = PESANAN` + `referensiId = ItemPesanan.id`, yang
tidak membedakan SATU reservasi dari reservasi lain pada baris pesanan yang
sama (mis. bila kelak reservasi bisa dipecah per-batch). Kolom eksplisit ini
membuat traceability auditable dan bisa di-JOIN langsung, bukan
diverifikasi manual lintas kolom `referensiJenis/referensiId`. Pola FK
composite mengikuti konvensi yang sama persis dengan
`PenyesuaianStok.mutasiStokId`/`CatatanWaste.mutasiStokId` yang sudah ada
sejak ALT-DEF-008.

**Keputusan 4 - Idempotency `@@unique([itemPesananId])` pada
`ReservasiStok`.** Menegakkan "SATU ItemPesanan paling banyak PERNAH punya
SATU baris reservasi sepanjang hidupnya" - command "buat reservasi saat
DITERIMA" yang dijalankan ulang (retry, double-submit, replay event) akan
memicu unique violation, bukan diam-diam membuat reservasi kedua yang
membuat `kuantitasDireservasi` di `StokBahan` dihitung dua kali. Efek
samping SADAR dari desain ini: satu `ItemPesanan` yang reservasinya sudah
`DILEPAS`/`KEDALUWARSA` TIDAK BISA direservasi ulang atas baris yang sama -
"pesan ulang" harus membuat `ItemPesanan` baru (baris pesanan/pesanan baru),
bukan mendaur ulang baris lama. Ini konsisten dengan sifat `ItemPesanan`
sebagai baris append-mostly dalam siklus hidup satu pesanan.

**Keputusan 5 - Idempotency konsumsi: trigger
`trg_reservasi_stok_kunci_konsumsi`.** `mutasiStokId String? @unique` SAJA
hanya mencegah DUA reservasi menunjuk SATU mutasi yang sama - ia TIDAK
mencegah SATU reservasi yang SAMA dipindah-tunjuk dari mutasi A ke mutasi B
lewat UPDATE kedua (skenario: command "konsumsi reservasi" dijalankan
ulang secara keliru dan menulis mutasi kedua). Trigger `BEFORE UPDATE`
menolak perubahan `mutasiStokId` begitu kolom itu SUDAH terisi (state
`DIKONSUMSI` bersifat TERMINAL untuk kolom ini) - diuji perilaku di
`siklus-hidup-stok-invariants.test.ts`.

**Keputusan 6 - Row-locking vs optimistic locking untuk reservasi stok
kontensi tinggi.** `StokBahan` sudah punya `version`+trigger auto-increment
(ADR-035) sebagai lapisan optimistic-concurrency UMUM. Untuk kasus SPESIFIK
"N kasir bersamaan mencoba merebut unit TERAKHIR item populer", optimistic
locking BUKAN pilihan yang tepat: dengan retry optimistic, seluruh N
transaksi membaca `version` yang sama, HANYA SATU yang menang tiap putaran,
dan N-1 sisanya harus retry - pada kontensi tinggi ini menjadi thundering
herd (setiap retry gagal lagi karena pemenang putaran sebelumnya sudah
mengubah version, dan yang kalah harus re-read+retry berulang-ulang,
membebani database justru saat beban SEDANG TINGGI). **Keputusan**: untuk
jalur SPESIFIK "cek ketersediaan lalu buat ReservasiStok", service layer
WAJIB memakai `SELECT ... FOR UPDATE` PESIMISTIK pada baris `StokBahan`
terkait SEBELUM memutuskan boleh/tidaknya reservasi baru dibuat - request
yang datang belakangan menunggu di lock queue (bukan retry-dari-nol), dan
begitu lock didapat baca datanya sudah pasti terbaru (tidak perlu
membandingkan `version` sama sekali untuk jalur ini). `version` (ADR-035)
TETAP dipertahankan untuk jalur update StokBahan LAIN yang BUKAN
kontensi-tinggi (mis. job rekonsiliasi, penyesuaian manual jarang) - kedua
mekanisme melengkapi, bukan saling menggantikan, tergantung karakteristik
jalur baca-tulisnya. **INI TIDAK BISA diimplementasikan di batch skema ini**
- `SELECT ... FOR UPDATE` adalah pola query di dalam transaksi
service-layer, tidak ada bentuk skema/DDL untuknya. Didokumentasikan sebagai
kontrak WAJIB untuk handler command "buat reservasi" mendatang, dicatat di
`INVARIAN-BELUM-DITEGAKKAN.md` kategori C (INV-015, tidak berubah statusnya
- TETAP app-level, batch ini hanya memperjelas MENGAPA optimistic locking
saja tidak cukup untuk jalur ini).

**Keputusan 7 - Kebijakan stok negatif: trigger, bukan CHECK statis.**
`PengaturanPersediaanOutlet.izinkanStokNegatif` (Boolean, default `false`)
SUDAH ADA sejak ADR-025 Keputusan 4 - batch ini TIDAK menambah kolom
kebijakan baru, hanya menambah PENEGAKAN NYATA di level database yang
sebelumnya belum ada sama sekali (murni app-level). CHECK constraint statis
(`kuantitas >= 0`) TIDAK BISA membaca kolom kebijakan di tabel LAIN
(`pengaturan_persediaan_outlet`, per-outlet) - Postgres CHECK hanya boleh
merujuk kolom dalam baris yang sama. Solusi: trigger `BEFORE INSERT OR
UPDATE ON stok_bahan` (`trg_stok_bahan_cek_negatif`) yang, HANYA ketika
`NEW.kuantitas < 0`, mencari `outletId` lewat `Gudang` lalu membaca
`izinkanStokNegatif` dari `PengaturanPersediaanOutlet` SAAT TULIS (bukan
snapshot lama) - default TOLAK bila belum ada baris pengaturan sama sekali
(konsisten dengan default kolom Prisma). **Kejujuran soal konkurensi**:
trigger ini SECARA NYATA mencegah komit APA PUN yang membuat saldo negatif
tanpa izin, TERLEPAS dari race - justru karena `UPDATE ... SET kuantitas =
kuantitas - $1 WHERE id = $2` (pola atomik, bukan baca-lalu-tulis di
aplikasi) SECARA OTOMATIS diserialkan Postgres lewat row-lock implisit pada
baris yang di-`UPDATE`: transaksi kedua yang mencoba meng-update baris yang
sama HARUS menunggu transaksi pertama commit/rollback dulu, sehingga nilai
yang dibaca trigger SELALU yang terbaru. Trigger TIDAK BISA menyelamatkan
pola BACA-LALU-TULIS yang salah di level aplikasi (`SELECT kuantitas` lalu
`UPDATE ... SET kuantitas = <nilai literal terhitung di kode>`) - itu tetap
murni tanggung jawab disiplin service-layer (lihat Keputusan 6). Trigger ini
adalah lapisan KEDUA (defense-in-depth) yang menjamin invariant STRUKTURAL
"tidak pernah ada baris StokBahan negatif tanpa izin eksplisit", terlepas
dari SEBERAPA BENAR kode aplikasi yang menulisnya - garansi yang murni
app-level TIDAK PERNAH bisa berikan (bug di satu jalur command tidak akan
pernah menembus lapisan ini). **DB-vs-app split final**: kebijakan
"tidak boleh negatif" -> DB-ENFORCED NYATA (trigger, diuji). Invariant SUM
lintas-baris "SUM(ReservasiStok AKTIF) <= saldo fisik" (INV-015) DAN pola
check-then-act pemilihan `SELECT ... FOR UPDATE` -> TETAP app-level, tidak
ada perubahan status di batch ini.

**Keputusan 8 - Recipe-version-snapshot dan unit-conversion: verifikasi,
BUKAN perubahan skema.** Digrep ulang: `ItemPesanan.resepVersiId` (nullable,
FK ke `VersiResep`) MASIH ADA dan TIDAK rusak oleh batch mana pun sejak
ADR-022 Keputusan 7. Kontrak (didokumentasikan, bukan kode - belum ada
handler): perhitungan `MutasiStok(PEMAKAIAN_RESEP).jumlah` masa depan WAJIB
membaca komponen resep dari `VersiResep` yang ditunjuk `resepVersiId`
snapshot pada `ItemPesanan` TERSEBUT, BUKAN versi resep aktif SAAT INI (yang
mungkin sudah berubah sejak pesanan dibuat) - ini SUDAH menjadi alasan
`resepVersiId` ada sejak awal (ADR-022 K7), batch ini hanya menegaskannya
eksplisit sebagai bagian kontrak siklus hidup stok. `KonversiSatuan`
(`faktor` per pasangan satuan per tenant) MASIH ADA dan queryable - kontrak:
sebelum menulis `MutasiStok.jumlah`, nilai HARUS dikonversi dari satuan yang
dipakai `KomponenResep`/`VersiResep` ke `Bahan.satuanDasarId` lewat
`KonversiSatuan`, karena `MutasiStok.jumlah` SELALU dalam satuan dasar bahan
(konvensi yang sudah tersirat dari `StokBahan.kuantitas` yang juga satuan
dasar).

**Migrasi.** `20260726140000_siklus_hidup_stok_reservasi_konsumsi_waste`
(kolom `ReservasiStok.mutasiStokId` + 3 unique index + FK composite, trigger
`trg_reservasi_stok_kunci_konsumsi` di `reservasi_stok`, trigger
`trg_stok_bahan_cek_negatif` di `stok_bahan`) - diterapkan ke
`altora_resto_dev` via `psql` + `prisma migrate resolve --applied`. Diff
`prisma migrate diff --from-schema-datasource --to-schema-datamodel`
ditinjau sebelum diterapkan (hanya `ALTER TABLE`/`CREATE INDEX`/
`ADD CONSTRAINT` untuk bagian kolom+FK; kedua trigger ditulis manual di
bagian sama migrasi karena `migrate diff` tidak menghasilkan trigger
prosedural). Fresh-database redeploy (`CREATE DATABASE
altora_resto_dev_freshtest` + `prisma migrate deploy` dari kosong,
dibandingkan `prisma migrate diff --from-url ... --to-url ...` terhadap
`altora_resto_dev` menghasilkan "empty migration" = struktur IDENTIK,
database sementara di-`DROP` setelah verifikasi) dan hasil test lengkap ada
di `RELEASE-EVIDENCE.md`.

**Status.** Seluruh 22 test arsitektur + 11 test database-integration
(termasuk `siklus-hidup-stok-invariants.test.ts` baru) lulus, termasuk dari
fresh-database redeploy. `INVARIAN-BELUM-DITEGAKKAN.md` diperbarui: baris
kategori A baru untuk kedua trigger baru (DB-enforced, teruji); baris
kategori C (INV-015/INV-016) diperbarui catatannya (INV-016 sebagian
menyempit - "stok negatif tanpa kebijakan" kini DB-enforced untuk pola tulis
atomik, TETAP app-level untuk pola baca-lalu-tulis yang salah; INV-015 SUM
lintas-baris tetap penuh app-level). Defect baru `ALT-DEF-048` dicatat di
`DEFECT-LEDGER.md` untuk titik picu konsumsi (`DIKIRIM_KE_DAPUR` vs
`TiketDapur.SEDANG_DISIAPKAN`) yang perlu diverifikasi ulang saat kode
handler dapur/produksi ditulis.

## ADR-038: Redesain `PromoPemakaian` - satu baris per pasangan (pesananId, promoId) + penghitung `jumlahPenerapan`, menutup ALT-DEF-038

**Konteks.** `ALT-DEF-038` (dicatat sejak batch `ALT-DEF-009`/ADR-026)
mencatat bahwa aturan "promo yang sama paling banyak diterapkan
`usageLimitPerOrder` kali per pesanan, KECUALI `Promo.repeatable = true`"
tidak bisa diekspresikan sebagai constraint database dengan cara apa pun
yang tersedia saat itu - baik `@@unique` Prisma (statis) maupun partial
unique index Postgres (predicate hanya boleh membaca kolom PADA TABEL YANG
SAMA, bukan JOIN ke `Promo.repeatable`). Rencana asli adalah trigger
`BEFORE INSERT` lintas-tabel yang membaca `Promo.repeatable` saat setiap
baris `PromoPemakaian` baru ditulis untuk memutuskan apakah baris ke-N untuk
pasangan (promo, pesanan) yang sama boleh ada - trigger itu DIDEFER dua kali
karena butuh keputusan desain retry/concurrent-insert tersendiri (bagaimana
service-layer tahu ini "percobaan ke berapa" sebelum insert terjadi, apa
yang terjadi saat dua request bersamaan mencoba insert baris ke-N yang
sama).

**Keputusan 1 - insight desain: restrukturisasi data, bukan pertajam
trigger.** Masalah sebenarnya bukan triggernya sulit ditulis - masalahnya
BENTUK DATA salah. Model lama membiarkan BANYAK baris `PromoPemakaian`
untuk pasangan (promo, pesanan) yang SAMA ketika `repeatable=true`, yang
membuat "berapa kali boleh berulang" jadi pertanyaan KARDINALITAS baris
(butuh JOIN ke tabel lain untuk tahu batasnya) - persis kategori masalah
yang partial unique index/CHECK constraint statis tidak bisa jawab.
Redesain: `PromoPemakaian` SELALU tepat SATU baris per pasangan
(`pesananId`, `promoId`), TANPA pengecualian, ditegakkan
`@@unique([pesananId, promoId])` - constraint STATIS murni dalam satu
tabel, kategori yang SAMA seperti precedent XOR resep/partial-unique QRIS
yang sudah diberlakukan sebagai SQL manual resmi. Promo yang repeatable dan
terpicu berkali-kali (mis. "beli 2 gratis 1" x3 pada pesanan besar) tetap
SATU baris header ini; field BARU `jumlahPenerapan Int @default(1)` adalah
PENGHITUNG naik (bukan penyebab pengulangan) yang di-increment ATOMIK oleh
service-layer setiap kali promo yang sama terpicu ulang pada pesanan yang
sama (`UPDATE promo_pemakaian SET "jumlahPenerapan" = "jumlahPenerapan" + 1
WHERE id = $1` - satu pernyataan atomik, bukan baca-lalu-tulis, konsisten
dengan pola row-locking ADR-037). Tiga kelipatan hadiah dari BOGO x3
direpresentasikan sebagai TIGA baris `PromoPemakaianBaris` di bawah SATU
header ini (model relasi ini SUDAH benar sejak ADR-026 - diverifikasi ulang,
tidak ada perubahan struktural yang dibutuhkan di sana selain field baru
di Keputusan 3).

Promo BERBEDA pada pesanan yang sama TIDAK terpengaruh - stacking ADR-026
tetap bebas karena constraint hanya melarang PASANGAN (pesananId, promoId)
yang SAMA muncul dua kali, bukan melarang lebih dari satu promo per
pesanan (dibuktikan test `testPromoBerbedaTetapBerhasil`).

**Keputusan 2 - `totalDiskon` BARU, bukan rename `nilaiDiskon`.** Field
rupiah per-BARIS `PromoPemakaianBaris.nilaiDiskon` (sudah `BigInt` sejak
ADR-034) TIDAK diubah/di-rename - field itu tetap benar sebagai nilai
DISKON SATU BARIS. `PromoPemakaian.totalDiskon BigInt @default(0)` adalah
field BARU TERPISAH di level HEADER: agregat `SUM(PromoPemakaianBaris.
nilaiDiskon)` di bawah header itu, denormalisasi sengaja (konsisten dengan
pola cache lain di skema ini, mis. `Pelanggan.saldoTokoCache`) supaya
"berapa total diskon promo ini di pesanan ini" adalah baca satu kolom,
bukan JOIN+SUM setiap query. Ditulis ulang oleh service-layer setiap kali
baris `PromoPemakaianBaris` baru ditambahkan/diretur di bawah header
tersebut (bukan trigger - agregasi lintas-baris murni MENJUMLAHKAN, bukan
MENOLAK, jadi tidak butuh penegakan constraint, konsisten dengan keputusan
INV-015 di `INVARIAN-BELUM-DITEGAKKAN.md` bahwa agregasi SUM lintas-baris
tetap app-level).

**Keputusan 3 - `snapshotAturan` TIDAK ditambahkan; `PromoSnapshot` SUDAH
memenuhi kebutuhan itu.** Rencana redesain awalnya menyebut kolom
`snapshotAturan Json` langsung di `PromoPemakaian`. Diverifikasi lebih
dulu: model `PromoSnapshot` (dibuat sejak ADR-026, 1:1 lewat
`@@unique([tenantId, promoPemakaianId])`) SUDAH PERSIS mekanisme yang
dimaksud - `PromoSnapshot.definisiPromo Json` adalah salinan definisi promo
(kondisi+reward+jadwal) PERSIS saat diterapkan, immutable, prinsip yang
sama dengan kolom `*Snapshot` di `ItemPesanan` (ADR-017). Menambah
`snapshotAturan Json` langsung di `PromoPemakaian` akan menduplikasi
mekanisme snapshot yang SAMA pada tabel yang SAMA (dua kolom Json berbeda
nama menyimpan hal yang konsepnya identik) - dua sumber kebenaran untuk
satu konsep adalah pola yang berulang kali ditolak di correction-loop ini
(lihat mis. ADR-026 Keputusan 2 soal `Promo.jenis` vs `PromoReward.jenis`).
Keputusan: TIDAK ada field baru; didokumentasikan di sini dan di
schema.prisma bahwa `PromoSnapshot.definisiPromo` ADALAH `snapshotAturan`
yang dimaksud rencana redesain.

**Keputusan 4 - `nomorPenerapan` BARU pada `PromoPemakaianBaris`.**
Ditambahkan `nomorPenerapan Int @default(1)` untuk mengelompokkan baris
per KALI promo repeatable terpicu (mis. BOGO x3 dengan 2 baris hadiah per
aktivasi = 6 baris, `nomorPenerapan` 1/1/2/2/3/3 mengelompokkannya per
instance). Dipertimbangkan TIDAK menambahkannya (YAGNI - `createdAt` sudah
bisa dipakai untuk urutan kasar), tapi diputuskan CUKUP BERGUNA untuk
auditabilitas/retur-per-instance (ALT-PRM-017 sudah menjadikan retur
presisi-per-baris sebagai kebutuhan eksplisit untuk `itemPesananId`; hal
yang sama berlaku untuk "penerapan ke berapa" ketika repeatable) dan
BIAYA-nya kecil (satu kolom `Int @default(1)`, tidak butuh migrasi
data/backfill kompleks karena default 1 valid untuk seluruh baris lama).
Bukan nullable karena SELALU bermakna (instance ke-1 untuk penerapan
tunggal, bukan hanya untuk kasus repeatable).

**Keputusan 5 - trigger `usageLimitPerOrder` DITULIS (bukan didefer lagi).**
Setelah restrukturisasi Keputusan 1, sisa masalah lintas-tabel yang TERSISA
jauh lebih kecil: memastikan `jumlahPenerapan` pada SATU baris yang sudah
pasti ada tidak melebihi batas yang berasal dari `Promo.repeatable`/
`Promo.usageLimitPerOrder`. Ini BUKAN lagi "apakah insert ini secara
konseptual insert ke-N dari baris yang berulang" (masalah kardinalitas yang
menjebak versi lama) - ini murni "bandingkan satu integer terhadap batas
yang dibaca dari tabel lain", kategori masalah yang PERSIS sama dengan
`cek_stok_bahan_negatif` (ADR-037, trigger yang membaca
`pengaturan_persediaan_outlet` dari `stok_bahan`) yang SUDAH terbukti bisa
ditulis dan diuji nyata di batch sebelumnya. Trigger
`trg_promo_pemakaian_cek_batas_penerapan` (`BEFORE INSERT OR UPDATE` pada
`promo_pemakaian`) ditulis dan menegakkan: (a) `repeatable=false` ->
`jumlahPenerapan` tidak boleh > 1; (b) `usageLimitPerOrder` (nullable = tak
terbatas) terisi -> `jumlahPenerapan` tidak boleh melebihinya; (c)
`jumlahPenerapan` tidak boleh < 1. Sama seperti `cek_stok_bahan_negatif`,
trigger ini adalah lapisan KEDUA (defense-in-depth) atas disiplin transaksi
service-layer (INV-023: baca `Promo.repeatable` SEBELUM increment) -
bukan pengganti row-locking yang benar untuk pola increment atomik.

**Migrasi.**
`20260726150000_promo_pemakaian_satu_baris_per_pasangan_penghitung`
(`ALTER TABLE promo_pemakaian ADD jumlahPenerapan/totalDiskon`,
`ALTER TABLE promo_pemakaian_baris ADD nomorPenerapan`, `DROP INDEX`
non-unik lama `(promoId, pesananId)` diganti `CREATE UNIQUE INDEX
promo_pemakaian_pesananId_promoId_key`, trigger
`trg_promo_pemakaian_cek_batas_penerapan`) - diterapkan ke
`altora_resto_dev` via `psql` + `prisma migrate resolve --applied`. Bagian
`ALTER TABLE`/`CREATE INDEX` dihasilkan `prisma migrate diff
--from-schema-datasource --to-schema-datamodel` dan ditinjau sebelum
diterapkan; trigger ditulis manual di bagian sama migrasi (`migrate diff`
tidak menghasilkan trigger prosedural, sama seperti precedent ADR-035/037).
Fresh-database redeploy (`DROP DATABASE`+`CREATE DATABASE` +
`prisma migrate deploy` dari kosong, 12 migrasi resmi diterapkan bersih)
dijalankan dan struktur (`\d promo_pemakaian`, daftar trigger) diverifikasi
identik dengan sebelum drop.

**Status.** Test arsitektur `promo-stacking-reward-constraints.test.ts`
diperbarui: assertion negatif lama yang melarang SEGALA `@@unique` berisi
`pesananId` (termasuk berpasangan dengan `promoId`) DILONGGARKAN - assertion
sekarang membedakan "pesananId SENDIRIAN tanpa promoId" (TETAP dilarang,
itu defect ALT-DEF-009 asli) dari "`(pesananId, promoId)` berpasangan"
(SEKARANG WAJIB ada, itu perbaikan ALT-DEF-038); assertion positif baru
untuk `jumlahPenerapan`/`totalDiskon`/`nomorPenerapan`. Test
database-integration BARU `promo-pemakaian-penerapan-invariants.test.ts`
membuktikan lima perilaku: unique constraint menolak baris kedua per
pasangan, promo berbeda pada pesanan sama tetap berhasil (stacking utuh),
trigger menolak `jumlahPenerapan > 1` pada non-repeatable, trigger menolak
`jumlahPenerapan` melebihi `usageLimitPerOrder` (termasuk lewat `UPDATE`,
bukan hanya `INSERT`), dan banyak `PromoPemakaianBaris` (6 baris/3 instance)
berhasil ditambahkan di bawah satu header. Seluruh 22 test arsitektur + 11
test database-integration (naik dari 10 - file promo baru) lulus, termasuk
dari fresh-database redeploy (12 migrasi dari kosong, 33/33 file lulus).
`docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md` INV-008 dipindah ke
kategori A (DB-enforced penuh untuk (pesananId, promoId) DAN untuk batas
`jumlahPenerapan`); INV-023 (separuh app-level: baca `repeatable` sebelum
increment) TETAP kategori C - trigger adalah defense-in-depth, bukan
pengganti disiplin transaksi service-layer, jadi separuh app-level itu
belum benar-benar "diverifikasi ada kodenya" (belum ada command-handler
yang ditulis, di luar scope batch ini). `ALT-DEF-038` ditutup (`DITUTUP`) di
`DEFECT-LEDGER.md` - lihat entri untuk checklist penutupan lengkap.
