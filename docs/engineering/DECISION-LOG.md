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

## Status ringkas

Semua ADR di atas berstatus **DITERIMA sebagai keputusan desain**, tetapi
implementasinya di kode berstatus **BELUM DIKERJAKAN** kecuali skema Prisma awal
(ADR-002, ADR-004, ADR-005, ADR-011, ADR-012, ADR-013 sudah tercermin di
`prisma/schema/schema.prisma`).
