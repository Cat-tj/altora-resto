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

## Status ringkas

Semua ADR di atas berstatus **DITERIMA sebagai keputusan desain**, tetapi
implementasinya di kode berstatus **BELUM DIKERJAKAN** kecuali skema Prisma awal
(ADR-002, ADR-004, ADR-005 sudah tercermin di `prisma/schema/schema.prisma`).
