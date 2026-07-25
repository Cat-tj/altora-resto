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
    composite-FK):** `Promo` belum punya relasi/kolom outlet sama sekali
    meskipun `JenisSyaratPromo.OUTLET_TERTENTU` menyiratkan promo seharusnya
    bisa dibatasi per outlet - **sengaja TIDAK** ditambahkan `PromoOutlet` di
    batch ini (di luar scope `ALT-DEF-010`/`ALT-DEF-014`, akan ditangani di
    batch domain promo berikutnya per instruksi correction-loop).
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

## Status ringkas

Semua ADR di atas berstatus **DITERIMA sebagai keputusan desain**, tetapi
implementasinya di kode berstatus **BELUM DIKERJAKAN** kecuali skema Prisma awal
(ADR-002, ADR-004, ADR-005, ADR-011, ADR-012, ADR-013, ADR-014, ADR-015, ADR-016,
ADR-017, ADR-018, ADR-019, ADR-020, ADR-021, ADR-022 sudah tercermin di
`prisma/schema/schema.prisma`).
