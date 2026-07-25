# Invarian yang Belum Ditegakkan di Level Database

Status dokumen: **DAFTAR TERPUSAT SEMENTARA** invariant yang belum ditegakkan
secara nyata (bukan "daftar tunggal dan lengkap" — klaim itu sengaja dicabut
pada revisi ini). Alasan pencabutan: dokumen ini ditulis pertama kali sebelum
fase **DEEP CORRECTION LOOP** dimulai, dan fase itu — dengan Postgres 16 nyata
kini tersedia (`altora_resto_dev`, lihat ALT-DEF-029) — akan menyelesaikan
sebagian besar baris di bawah secara nyata (migrasi resmi + trigger terpasang
+ test integrasi) dalam batch-batch berikutnya, bukan menyisakannya sebagai
janji desain selamanya. Dokumen ini adalah **snapshot per 2026-07-25**, bukan
kebenaran permanen — setiap baris di bawah wajib dipindah kategori (atau
ditutup) begitu batch yang relevan benar-benar dijalankan, bukan dibiarkan
diam-diam menjadi stale.

Dibuat karena permintaan eksplisit correction loop sebelumnya: tidak boleh
ada satu detail pun yang hilang dari status QRIS-style "app-level only" di
seluruh schema. Restrukturisasi pada revisi ini membagi isi lama (yang
sebelumnya 3 seksi A/B/C bergaya ad-hoc) menjadi **5 kategori berjenjang**
berdasarkan *jenis* penegakan yang mungkin, bukan sekadar "sudah/belum ada
SQL", supaya jelas mana yang benar-benar tinggal dieksekusi (dekat dengan
`DITUTUP`) vs mana yang butuh pekerjaan desain besar (jauh dari `DITUTUP`).

**Skema ID:** setiap baris punya ID stabil `INV-NNN` (ruang ID terpisah dari
`ALT-DEF-NNN` — invariant bukan defect; satu invariant boleh menjadi sumber
atau rujukan dari satu atau lebih baris `ALT-DEF-NNN`, dan sebaliknya). Field
umum wajib pada SETIAP baris di seluruh 5 kategori: **ID | Domain | Severity
| Sumber requirement | Model terkait | Layer penegak | SQL/service yang
menegakkan | Test ID | Failure behavior | Status**. Kategori A memakai kolom
tambahan `Migration` (path migrasi resmi) sesuai definisinya sendiri; kategori
lain memakai field umum di atas plus catatan sub-state bila relevan.

---

## A. DB constraint sudah ditulis DAN sudah masuk migrasi resmi

**DIPERBARUI pada batch kedua deep-correction-loop (ALT-DEF-044, lihat
ADR-031):** kategori ini TIDAK LAGI kosong. `prisma migrate dev`/`deploy`
sudah benar-benar dijalankan terhadap `altora_resto_dev` (dua migrasi resmi:
`20260725154045_baseline_correction_loop` lalu
`20260725154310_harden_manual_invariants`, keduanya di
`prisma/schema/migrations/` — lihat ADR-031 Keputusan 1 soal koreksi lokasi
path). `prisma/migrations/manual/001`-`005` sudah di-fold (dengan satu bug
logika diperbaiki, lihat INV-007 di bawah) ke migrasi kedua tersebut dan
sudah TIDAK lagi jadi jalur deployment paralel yang diam-diam terlewat.

`INV-001` s.d. `INV-007` DIPINDAH dari kategori B1 (di bawah) ke sini karena
kelimanya sekarang: (a) SQL-nya benar-benar ada di migrasi resmi yang
tercatat di `_prisma_migrations`, (b) diverifikasi ada lewat query
`pg_indexes`/`pg_constraint`/`pg_trigger`/`pg_proc` langsung terhadap
`altora_resto_dev`, dan (c) diverifikasi MENOLAK pelanggaran nyata lewat
test integrasi Postgres yang benar-benar dijalankan (bukan hanya "diklaim
menegakkan").

| Invariant | Migration | Tipe penegak | Test integrasi | Status |
|---|---|---|---|---|
| INV-001 — satu `KonfigurasiQris` AKTIF per outlet | `prisma/schema/migrations/20260725154310_harden_manual_invariants/migration.sql` bagian (A) | Partial unique index `konfigurasi_qris_satu_aktif_per_outlet` | `packages/test-support/src/database-integration/qris-konfigurasi-invariant.test.ts` (existence pg_indexes + behavioral: duplikat AKTIF ditolak, NONAKTIF boleh menumpuk) | DITUTUP — terpasang dan teruji |
| INV-002 — `Resep` XOR tepat satu sasaran | migrasi sama, bagian (B) | CHECK constraint `resep_sasaran_xor` | `packages/test-support/src/database-integration/resep-versi-invariants.test.ts` (existence pg_constraint + behavioral: nol/dua sasaran ditolak, satu sasaran diterima) | DITUTUP — terpasang dan teruji |
| INV-003 — satu `VersiResep` AKTIF per resep | migrasi sama, bagian (C) | Partial unique index `versi_resep_satu_aktif_per_resep` | `resep-versi-invariants.test.ts` (existence + behavioral: dua AKTIF ditolak, riwayat NONAKTIF/ARSIP boleh menumpuk) | DITUTUP — terpasang dan teruji |
| INV-004 — satu baris `StokBahan` agregat level-gudang per (gudang, bahan) | migrasi sama, bagian (D) | Partial unique index `stok_bahan_agregat_gudang_unik` | `packages/test-support/src/database-integration/persediaan-stok-invariants.test.ts` (existence + behavioral: duplikat ditolak) | DITUTUP — terpasang dan teruji |
| INV-005 — satu baris `StokOpnameBaris` agregat level-gudang per (opname, bahan) | migrasi sama, bagian (D) | Partial unique index `stok_opname_baris_agregat_gudang_unik` | `persediaan-stok-invariants.test.ts` (existence via pg_indexes) | DITUTUP — terpasang; belum ada assertion behavioral khusus baris opname pada batch ini (lihat catatan di bawah) |
| INV-006 — `mutasi_stok` append-only (UPDATE/DELETE ditolak kecuali `dibalikOlehId`) | migrasi sama, bagian (E.1) | Trigger `trg_mutasi_stok_append_only` + fungsi `mutasi_stok_tolak_ubah()` | `persediaan-stok-invariants.test.ts` (existence pg_trigger/pg_proc + behavioral: UPDATE kolom lain ditolak, DELETE ditolak, UPDATE `dibalikOlehId` dari NULL diterima) | DITUTUP — terpasang dan teruji |
| INV-007 — kesepadanan mutasi pembalik (tanda berlawanan, tenant/gudang/bahan sama, larangan rantai pembalik-dari-pembalik) | migrasi sama, bagian (E.2) | Trigger `trg_mutasi_stok_validasi_pembalik` + fungsi `mutasi_stok_validasi_pembalik()` | `persediaan-stok-invariants.test.ts` (existence + behavioral: jumlah salah ditolak, bahan berbeda ditolak, **rantai pembalik-dari-pembalik ditolak** — assertion ini secara langsung menguji bug-fix ALT-DEF-044/ADR-031) | DITUTUP — terpasang dan teruji; **satu bug logika ditemukan dan diperbaiki selama audit batch ini, lihat ADR-031 Keputusan 3** (fungsi asli di `manual/005` TIDAK PERNAH benar-benar menolak rantai pembalik-dari-pembalik meski komentarnya bilang begitu) |

**Catatan INV-005:** test behavioral eksplisit (INSERT dua baris opname
agregat untuk pasangan bahan yang sama) belum ditulis terpisah pada batch
ini — hanya existence index yang diverifikasi langsung. Index-nya identik
strukturnya dengan INV-004 (partial unique `WHERE "lokasiStokId" IS NULL`)
yang SUDAH diuji behavioral, jadi risiko index ini tidak berfungsi dinilai
rendah, tapi ini dicatat jujur sebagai gap test coverage, bukan diam-diam
dianggap setara INV-004.

**Belum tercakup kategori A** (masih di kategori B/C/D/E di bawah): 3
trigger ledger keanggotaan dari ALT-DEF-043, CHECK `TransferStok`/
`StokOpname`, dan seluruh baris lain — scope batch ini murni `INV-001`
s.d. `INV-007` (lima file `manual/001`-`005`), bukan seluruh kategori B1
lama.

---

## B. Dapat ditegakkan database tetapi SQL belum ditulis (atau sudah ditulis tapi belum resmi)

**DIPERBARUI pada batch kedua deep-correction-loop:** sub-kategori B1 lama
(`INV-001` s.d. `INV-007`, "sudah didraf di `manual/001`-`005`") sudah
DIPINDAH SELURUHNYA ke kategori A di atas — kelimanya sudah di-fold ke
migrasi resmi dan diverifikasi teruji. Yang tersisa di kategori B hanyalah
B2 (belum ada draf SQL sama sekali), diberi nomor ulang mulai `INV-008`
seperti semula (nomor ID TIDAK digeser supaya riwayat commit/dokumen lama
tetap valid).

### B2. Belum ada draf SQL sama sekali — butuh desain dulu

| ID | Domain | Severity | Sumber requirement | Model terkait | Layer penegak | SQL/service yang menegakkan | Test ID | Failure behavior | Status |
|---|---|---|---|---|---|---|---|---|---|
| INV-008 | Promo | SEDANG | ALT-PRM-008, ALT-PRM-010 (lihat ALT-DEF-038, DESAIN DIPERBARUI batch ini) | `PromoPemakaian`, `Promo` | Unique constraint + service-layer counter (BUKAN LAGI trigger — lihat pembaruan ALT-DEF-038 di DEFECT-LEDGER.md) | Belum ada — rencana baru: `@@unique([pesananId, promoId])` pada `PromoPemakaian` + kolom `jumlahPenerapan Int` yang di-increment atomik, predicate `repeatable` tetap dibaca app-level sebelum increment (lihat INV-023 untuk separuh guard app-level-nya) | Belum ada | Promo `repeatable=false` diterapkan >1x ke pesanan yang sama — diskon ganda tidak sah, risiko finansial langsung | DIKONFIRMASI — rencana lama (trigger `BEFORE INSERT` lintas-tabel) DIGANTI rencana baru yang lebih sederhana pada batch ini |
| INV-009 | Persediaan | TINGGI | ADR-024 Keputusan 4 | `TransferStok` | CHECK constraint Postgres (belum didraf) | Belum ada — utang CHECK constraint `gudangAsalId != gudangTujuanId` | Belum ada | Transfer stok dari gudang ke gudang yang sama bisa tersimpan — transaksi tidak bermakna, bisa dipakai untuk memalsukan pergerakan stok | DIKONFIRMASI, belum ada draf |
| INV-010 | Persediaan | TINGGI | ADR-024 Keputusan 4 | `TransferStokBaris` | CHECK constraint Postgres (belum didraf) | Belum ada — utang CHECK constraint `jumlahDiterima <= jumlahDikirim <= jumlahDiminta` | Belum ada | Baris transfer bisa mencatat diterima > dikirim (barang muncul dari udara) atau dikirim > diminta tanpa ditolak database | DIKONFIRMASI, belum ada draf |
| INV-011 | Persediaan | SEDANG | ADR-025 ringkasan invariant | `StokOpname` | CHECK constraint Postgres (belum didraf) | Belum ada — utang CHECK constraint `penghitungId != penyetujuId` | Belum ada | Penghitung stok bisa menyetujui hitungannya sendiri — segregasi tugas (kontrol internal opname) gagal; lihat juga INV-039 (guard state-machine yang sama, kategori E) | DIKONFIRMASI, belum ada draf |
| INV-012 | Keanggotaan | SEDANG | ALT-MBR-009, ALT-MBR-014 (lihat ALT-DEF-043, baru) | `PoinRiwayat` | Trigger Postgres (belum didraf, pola sama `mutasi_stok_tolak_ubah()`) | Belum ada — rencana: `006_poin_riwayat_append_only_dan_pembalik.sql` | Belum ada | Baris `PoinRiwayat` bisa di-UPDATE/DELETE langsung, entri pembalik poin bisa dibuat dengan jumlah tidak berlawanan tanda — saldo poin pelanggan bisa dimanipulasi tanpa jejak | DIKONFIRMASI, belum ada draf (ditemukan saat audit ini, lihat ALT-DEF-043) |
| INV-013 | Keanggotaan | SEDANG | ALT-MBR-010, ALT-MBR-015 (lihat ALT-DEF-043, baru) | `LedgerStempel` | Trigger Postgres (belum didraf, pola sama `mutasi_stok_tolak_ubah()`) | Belum ada — rencana: `007_ledger_stempel_append_only_dan_pembalik.sql` | Belum ada | Baris `LedgerStempel` bisa di-UPDATE/DELETE langsung, entri pembalik stempel bisa dibuat dengan jumlah tidak berlawanan tanda — saldo stempel loyalitas bisa dimanipulasi tanpa jejak | DIKONFIRMASI, belum ada draf (ditemukan saat audit ini, lihat ALT-DEF-043) |
| INV-014 | Keanggotaan | TINGGI | ALT-MBR-016, ALT-MBR-017 (lihat ALT-DEF-043, baru) | `LedgerSaldoToko` | Trigger Postgres (belum didraf, pola sama `mutasi_stok_tolak_ubah()`) | Belum ada — rencana: `008_ledger_saldo_toko_append_only_dan_pembalik.sql` | Belum ada | Baris `LedgerSaldoToko` bisa di-UPDATE/DELETE langsung, entri pembalik saldo toko bisa dibuat dengan jumlah tidak berlawanan tanda — saldo toko adalah UANG riil pelanggan, manipulasi di sini setara pencurian tanpa jejak | DIKONFIRMASI, belum ada draf (ditemukan saat audit ini, lihat ALT-DEF-043) — severity lebih tinggi dari INV-012/013 karena saldo toko setara uang tunai, bukan poin loyalitas |

---

## C. Dijaga transaksi aplikasi (row lock, optimistic concurrency, atomic command, aggregate validation, idempotency)

**Catatan kejujuran wajib:** optimistic concurrency (mis. kolom `version`/
`updatedAt` dengan `WHERE version = @old`) **belum ada di schema sama sekali**
per hari ini — itu scope batch deep-correction-loop **berikutnya**, bukan
batch ini. Artinya SETIAP baris di kategori ini hari ini benar-benar
**tanpa locking apa pun** (bukan "locking optimistik", bukan "locking
lemah") kecuali secara eksplisit disebutkan `SELECT ... FOR UPDATE` sudah
menjadi rencana desain (yang juga belum diimplementasikan sebagai kode).

| ID | Domain | Severity | Sumber requirement | Model terkait | Layer penegak | SQL/service yang menegakkan | Test ID | Failure behavior | Status |
|---|---|---|---|---|---|---|---|---|---|
| INV-015 | Persediaan | TINGGI | ADR-025 ringkasan invariant | `ReservasiStok`, `StokBahan` | Guard transaksi + `SELECT ... FOR UPDATE` (rencana, belum ada kode) | Belum ada implementasi service | Belum ada | `SUM(ReservasiStok status=AKTIF) > saldo fisik` — item terjual melebihi stok tersedia saat dua pesanan bersamaan memesan item terakhir (race condition) | DIKONFIRMASI, tanpa locking apa pun hari ini |
| INV-016 | Persediaan | TINGGI | ADR-025 ringkasan invariant | `StokBahan` | Guard transaksi + `SELECT ... FOR UPDATE` (rencana, belum ada kode) | Belum ada implementasi service | Belum ada | Stok jadi negatif meski `izinkanStokNegatif = false` — dua mutasi keluar bersamaan lolos validasi karena baca-lalu-tulis tanpa lock | DIKONFIRMASI, tanpa locking apa pun hari ini |
| INV-017 | Persediaan | SEDANG | ALT-PSD (produksi bahan setengah jadi) | `BatchProduksi`, `BatchStok` | Guard transaksi produksi (rencana, belum ada kode) | Belum ada implementasi service | Belum ada | `BatchProduksi` selesai tanpa `BatchStok` yang lahir (atau lahir >1), batch produksi hilang/duplikat di ledger | DIKONFIRMASI |
| INV-018 | Persediaan | SEDANG | ADR-023 | `MutasiStok` | Validasi service-layer (rencana, belum ada kode) | Belum ada implementasi service | Belum ada | `lokasiSumber`/`lokasiTujuan` tidak sesuai `jenis` mutasi (mis. transfer tanpa lokasi tujuan) — mutasi tidak bisa direkonsiliasi ke pergerakan fisik | DIKONFIRMASI |
| INV-019 | Pembayaran | KRITIS | ADR-019 Keputusan 4 | `Pembayaran`, `PembayaranMetodeBaris` | Validasi service-layer dalam satu transaksi DB (rencana, belum ada kode) | Belum ada implementasi service | `pembayaran-alokasi-metode-constraints.test.ts` (struktur saja) | `SUM(PembayaranMetodeBaris.jumlah) != Pembayaran.jumlah` — uang yang tercatat masuk tidak sama dengan yang seharusnya diterima | DIKONFIRMASI, validasi belum diimplementasikan sebagai kode berjalan |
| INV-020 | Pembayaran | KRITIS | ADR-019 Keputusan 4 | `Pembayaran`, `AlokasiPembayaran` | Validasi service-layer dalam satu transaksi DB (rencana, belum ada kode) | Belum ada implementasi service | `pembayaran-alokasi-metode-constraints.test.ts` (struktur saja) | `SUM(AlokasiPembayaran.jumlah) != Pembayaran.jumlah` — split-bill tidak sinkron, sebagian pesanan dianggap lunas padahal alokasinya tidak menutup jumlah pembayaran | DIKONFIRMASI, validasi belum diimplementasikan sebagai kode berjalan |
| INV-021 | Autentikasi | SEDANG | ALT-PLT (PIN outlet) | `PinOutlet` | Guard service-layer (Postgres memperlakukan dua NULL berbeda di unique index — index biasa TIDAK BISA menutup kasus ini) | Belum ada implementasi service | `sesi-auth-pin-constraints.test.ts` (struktur saja) | Dua PIN "berlaku di semua perangkat" (`perangkatId IS NULL`) tersimpan untuk kombinasi keanggotaan-tenant+outlet yang sama — ambigu PIN mana yang valid | DIKONFIRMASI |
| INV-022 | Autentikasi | TINGGI | ALT-PLT (reset kata sandi) | `TokenResetKataSandi` | Atomic command: `UPDATE ... WHERE digunakanPada IS NULL` (conditional-uniqueness tidak didukung Prisma, rencana, belum ada kode) | Belum ada implementasi service | Belum ada | Token reset password dipakai lebih dari sekali (mis. dua request paralel dengan token sama lolos keduanya) — celah keamanan akun | DIKONFIRMASI |
| INV-023 | Promo | SEDANG | ALT-PRM-008, ALT-PRM-010 (lihat ALT-DEF-038, cross-ref INV-008) | `PromoPemakaian`, `Promo` | Atomic command: increment `jumlahPenerapan` + baca `Promo.repeatable` dalam satu transaksi (rencana baru pengganti trigger, belum ada kode) | Belum ada implementasi service | Belum ada | Separuh app-level dari INV-008: increment counter race condition antar-request bisa membuat `jumlahPenerapan` melebihi limit sebelum constraint DB (INV-008) terpasang | DIKONFIRMASI — bagian dari rencana baru ALT-DEF-038 |
| INV-024 | Lintas-domain | TINGGI | ADR-006 (prinsip no-hard-delete) | Seluruh model finansial/stok/audit | Konvensi kode (BUKAN mekanisme DB, KECUALI `mutasi_stok` lewat INV-006/007 yang pun belum dijalankan) | Tidak ada `REVOKE DELETE` atau trigger penolak DELETE yang terpasang di database manapun hari ini | Belum ada | Akses langsung lewat `psql` (atau bug service) bisa hard-delete baris finansial/stok/audit tanpa ditolak apa pun — pelanggaran prinsip append-only tanpa jejak | DIKONFIRMASI, murni konvensi, tidak ada penegakan teknis di luar INV-006/007 |

---

## D. Invarian rekonsiliasi/cache (saldo vs ledger, read model vs sumber, data freshness)

| ID | Domain | Severity | Sumber requirement | Model terkait | Layer penegak | SQL/service yang menegakkan | Test ID | Failure behavior | Status |
|---|---|---|---|---|---|---|---|---|---|
| INV-025 | Persediaan | TINGGI | ADR-023 | `StokBahan` vs `MutasiStok` | Job rekonsiliasi periodik (belum ditulis) | Belum ada | Belum ada | `StokBahan.kuantitas != SUM(MutasiStok.jumlah)` per (gudang, bahan, lokasi) — cache saldo menyimpang dari ledger sumber kebenaran, drift terakumulasi tanpa terdeteksi sampai opname manual | DIKONFIRMASI, job belum ditulis |
| INV-026 | Pembayaran | TINGGI | ADR-020 Keputusan 4 | `Pembayaran`, `PembayaranRefund` | Dievaluasi server-side setelah baca (aggregate check, belum ada kode) | Belum ada implementasi service | Belum ada | `SUM(PembayaranRefund.jumlah) >` jumlah yang sah direfund — refund melebihi yang pernah diterima, kerugian finansial langsung | DIKONFIRMASI |
| INV-027 | Keanggotaan | SEDANG | ALT-MBR-009 (cross-ref INV-012, ALT-DEF-043) | Saldo poin agregat (mis. `Pelanggan.totalPoin` bila ada) vs `PoinRiwayat` | Job rekonsiliasi periodik (belum ditulis) | Belum ada | Belum ada | Saldo poin yang ditampilkan ke pelanggan menyimpang dari `SUM(PoinRiwayat.jumlah)` — pelanggan melihat poin yang tidak benar-benar didukung ledger | DIKONFIRMASI, job belum ditulis; bergantung pada INV-012 (append-only) untuk ledger sumbernya dulu benar |
| INV-028 | Keanggotaan | SEDANG | ALT-MBR-010 (cross-ref INV-013, ALT-DEF-043) | Saldo stempel agregat vs `LedgerStempel` | Job rekonsiliasi periodik (belum ditulis) | Belum ada | Belum ada | Saldo stempel yang ditampilkan menyimpang dari `SUM(LedgerStempel.jumlah)` — hadiah stempel bisa diklaim salah jumlah | DIKONFIRMASI, job belum ditulis; bergantung pada INV-013 |
| INV-029 | Keanggotaan | TINGGI | ALT-MBR-016 (cross-ref INV-014, ALT-DEF-043) | Saldo toko agregat vs `LedgerSaldoToko` | Job rekonsiliasi periodik (belum ditulis) | Belum ada | Belum ada | Saldo toko (UANG riil) yang ditampilkan menyimpang dari `SUM(LedgerSaldoToko.jumlah)` — pelanggan bisa membelanjakan saldo yang tidak benar-benar ada, atau kehilangan saldo yang sah | DIKONFIRMASI, job belum ditulis; bergantung pada INV-014, severity TINGGI karena setara uang tunai |
| INV-030 | Analitik | SEDANG | RISK-007 | Tabel `RM_*` (read model) vs tabel transaksi sumber | Job agregasi terjadwal + kolom `dihitungPada` (rencana, belum diimplementasikan penuh) | Belum ada | Belum ada | Dashboard analitik menampilkan data basi tanpa indikasi eksplisit bila job agregasi gagal/terlambat >1 siklus | DIKONFIRMASI, lihat RISK-007 di RISK-REGISTER.md |

---

## E. State machine dan workflow guards

Kategori baru pada revisi ini: guard status yang didokumentasikan penuh di
`docs/arsitektur/STATE-MACHINES.md` tapi **tidak** punya penegakan database
apa pun (tidak CHECK constraint, tidak trigger) — murni logika service-layer
yang memutuskan transisi mana yang sah. Baris di bawah **mengutip** guard
kritis dari `STATE-MACHINES.md`, bukan menggantikannya — lihat dokumen
tersebut untuk tabel transisi lengkap per domain.

| ID | Domain | Severity | Sumber requirement | Model terkait | Layer penegak | SQL/service yang menegakkan | Test ID | Failure behavior | Status |
|---|---|---|---|---|---|---|---|---|---|
| INV-031 | Pesanan | KRITIS | ALT-PES (lihat STATE-MACHINES.md §1) | `Pesanan` | State machine guard (service-layer) | Rencana: transisi `DIKIRIM -> DITERIMA` untuk kanal `QR_PELANGGAN` WAJIB lewat `MENUNGGU_PERSETUJUAN`, tidak boleh auto-accept | `pesanan-state-machine-snapshot-constraints.test.ts` (struktur) | Pesanan dari kanal QR pelanggan langsung `DITERIMA` tanpa persetujuan staf — pelanggan bisa memicu alur dapur/stok tanpa pengawasan | DIKONFIRMASI |
| INV-032 | Pesanan | SEDANG | ALT-PES (lihat STATE-MACHINES.md §1) | `Pesanan` | State machine guard (service-layer) | Rencana: `DIBATALKAN` TIDAK boleh dicapai dari `SIAP`/`DISAJIKAN`/`SELESAI` — wajib lewat `DIRETUR` atau pembatalan level-item | `pesanan-state-machine-snapshot-constraints.test.ts` (struktur) | Pesanan yang makanannya sudah disajikan bisa "dibatalkan" begitu saja, menghilangkan jejak bahwa makanan sudah keluar dan bahan sudah terpakai | DIKONFIRMASI |
| INV-033 | Pembayaran | KRITIS | ADR-020 Keputusan 2, ADR-021 Keputusan 4 (lihat STATE-MACHINES.md §2) | `Pembayaran` | State machine guard (service-layer) — **guard keamanan finansial paling penting di domain ini** | Rencana: transisi `MENUNGGU_KONFIRMASI -> DIBAYAR` HANYA boleh dilakukan aktor KASIR/SUPERVISOR; tidak ada jalur dari endpoint yang diakses token QR pelanggan menuju `DIBAYAR` | `pembayaran-alokasi-metode-constraints.test.ts` (struktur) | Siapa pun yang memegang link QR meja bisa menandai tagihannya sendiri lunas tanpa uang benar-benar diterima — pencurian langsung | DIKONFIRMASI |
| INV-034 | Pembayaran | KRITIS | ADR-020 (lihat STATE-MACHINES.md §2) | `Pembayaran` | State machine guard (service-layer) | Rencana: `DIBATALKAN` TIDAK dapat dicapai dari `DIBAYAR` — wajib lewat `DIKOREKSI` atau `DIKEMBALIKAN(_SEBAGIAN)`, keduanya append-only | Belum ada | Uang yang sudah diterima "dibatalkan" begitu saja tanpa jejak refund/koreksi — rekonsiliasi kas tidak mungkin dilakukan | DIKONFIRMASI |
| INV-035 | Dapur | SEDANG | ADR-018 (lihat STATE-MACHINES.md §5) | `TiketDapur` | State machine guard (service-layer) | Rencana: `DIBATALKAN` TIDAK dapat dicapai dari `SELESAI_SEBAGIAN`/`SIAP`/`DISAJIKAN` — begitu ada baris matang, wajib pembatalan level-baris atau retur di level Pesanan | `dapur-kds-multi-stasiun.test.ts` (struktur) | Tiket dapur yang sebagian sudah matang dibatalkan penuh — bahan yang sudah dimasak hilang dari pencatatan tanpa mutasi pembalik yang benar | DIKONFIRMASI |
| INV-036 | Dapur | SEDANG | ADR-018 Keputusan 6 (lihat STATE-MACHINES.md §5) | `TiketDapur`, `Pesanan` | State machine guard (service-layer), agregat lintas-tiket | Rencana: `Pesanan.status` menjadi `SIAP` HANYA bila SELURUH `TiketDapur` milik pesanan tsb berstatus `SIAP`/`DISAJIKAN` | `dapur-kds-multi-stasiun.test.ts` (struktur) | Pesanan ditandai siap/disajikan padahal masih ada stasiun dapur yang belum selesai memasak sebagian item | DIKONFIRMASI |
| INV-037 | Giliran Kasir | TINGGI | (lihat STATE-MACHINES.md §3) | `GiliranKasir`/`Shift` | State machine guard + approval (service-layer) | Rencana: `DITUTUP_MENUNGGU_VERIFIKASI -> DIBUKA` (buka ulang shift) wajib approval supervisor | Belum ada | Kasir bisa membuka ulang shift yang sudah ditutup tanpa pengawasan, memungkinkan modifikasi kas setelah rekonsiliasi awal | DIKONFIRMASI |
| INV-038 | Persediaan (Opname) | TINGGI | ADR-006, ADR-025 Keputusan 5 (lihat STATE-MACHINES.md §7) | `StokOpname` | State machine guard (service-layer) | Rencana: `DIPOSTING` adalah status TERMINAL — TIDAK dapat dibatalkan; koreksi wajib lewat mutasi PEMBALIK, bukan mengubah riwayat | `persediaan-ledger-reservasi-constraints.test.ts` (struktur) | Opname yang sudah memposting mutasi `KOREKSI_OPNAME` ke ledger dibatalkan/diubah, merusak sejarah stok yang seharusnya immutable | DIKONFIRMASI |
| INV-039 | Persediaan (Opname) | SEDANG | ADR-025 ringkasan invariant (cross-ref INV-011) (lihat STATE-MACHINES.md §7) | `StokOpname` | State machine guard (service-layer) — DUPLIKAT app-level dari CHECK constraint yang diutangkan di INV-011 | Belum ada — invariant level-aplikasi murni sampai INV-011 (CHECK constraint) ditulis dan dijalankan | Belum ada | `penghitungId == penyetujuId` — penghitung menyetujui hitungannya sendiri, kontrol internal opname gagal total | DIKONFIRMASI, lihat INV-011 untuk jalur penegakan DB yang direncanakan |
| INV-040 | Persediaan (Transfer) | TINGGI | ADR-024 Keputusan 4 (lihat STATE-MACHINES.md §8) | `TransferStok` | State machine guard (service-layer) | Rencana: `TRANSFER_KELUAR` diposting HANYA saat `DIKIRIM`; `TRANSFER_MASUK` HANYA saat `DITERIMA`/`DITERIMA_SEBAGIAN` — tidak pernah keduanya sekaligus | Belum ada | Kedua mutasi diposting bersamaan membuat barang yang sedang di jalan tampak sudah menjadi saldo gudang tujuan — gudang tujuan bisa "memakai" barang yang belum tiba secara fisik | DIKONFIRMASI |
| INV-041 | Persediaan (Transfer) | TINGGI | ADR-024 (lihat STATE-MACHINES.md §8) | `TransferStok` | State machine guard (service-layer) | Rencana: `DIKIRIM` TIDAK dapat dibatalkan langsung — wajib lewat `DITERIMA_SEBAGIAN` lalu membatalkan sisa dengan approval, selisih tercatat sebagai `WASTE`/`PENYESUAIAN` | Belum ada | Barang yang sudah keluar dari gudang asal secara pencatatan (`TRANSFER_KELUAR` terposting) "hilang" dari sistem tanpa jejak waste/penyesuaian saat transfer dibatalkan begitu saja | DIKONFIRMASI |
| INV-042 | Karyawan (Absensi) | SEDANG | ADR-028 Keputusan 5 (lihat STATE-MACHINES.md §9) | `KoreksiAbsensi` | State machine guard (service-layer) | Rencana: `disetujuiOlehId != diajukanOlehId` — cegah self-approval koreksi absensi | Belum ada | Karyawan yang mengajukan koreksi jam kerjanya sendiri bisa menyetujui pengajuannya sendiri — kontrol internal absensi/payroll gagal | DIKONFIRMASI |
| INV-043 | Reservasi / Promo / Cuti | TINGGI | Diminta eksplisit oleh instruksi restrukturisasi batch ini | `Reservasi`(§4 Meja, sebagian), `Promo`, `PengajuanCuti`/`Cuti` | **GAP DOKUMENTASI** — bukan penegakan yang hilang, tapi state machine yang belum pernah ditulis | Tidak ada — `docs/arsitektur/STATE-MACHINES.md` HANYA punya 10 state machine bernomor (Pesanan, Pembayaran, Giliran Kasir, Meja, Dapur, Pembelian, Opname, Transfer Stok, Koreksi Absensi, Tukar Shift). Bagian 4 (Meja) menyentuh reservasi secara IMPLISIT lewat transisi `TERSEDIA <-> DIPESAN` tanpa tabel transisi/guard terpisah untuk entitas `Reservasi` itu sendiri (mis. batas waktu no-show, siapa yang boleh membatalkan reservasi vs meja). **Promo dan Cuti TIDAK PUNYA state machine terdokumentasi sama sekali** di file ini — siklus hidup `Promo` (DRAF/AKTIF/NONAKTIF?) dan alur persetujuan `Cuti`/`PengajuanCuti` tidak dimodelkan sebagai diagram/tabel transisi di mana pun yang ditemukan pada audit ini | Belum ada | Tanpa state machine terdokumentasi, tidak ada cara sistematis memverifikasi guard mana yang seharusnya ada untuk transisi Reservasi/Promo/Cuti — risiko transisi ilegal (mis. reservasi dibatalkan setelah tamu check-in, promo diaktifkan tanpa validasi periode, cuti disetujui oleh pengaju sendiri) tidak dapat diverifikasi karena tidak ada spesifikasi guard untuk dibandingkan | **BARU (ditemukan pada audit restrukturisasi ini)** — direkomendasikan menjadi defect baru terpisah di batch berikutnya (lihat catatan Task 2 di commit ini); TIDAK dicatat sebagai ALT-DEF-NNN pada batch ini karena scope eksplisit batch ini adalah restrukturisasi dokumen invariant, bukan membuka defect baru di luar ALT-DEF-044 |

---

## Ringkasan angka

- **Kategori A (migrasi resmi): 7 baris** (INV-001 s.d. INV-007) — **DIPERBARUI batch kedua deep-correction-loop.** `prisma/schema/migrations/` sekarang berisi dua migrasi resmi (`baseline_correction_loop`, `harden_manual_invariants`) yang benar-benar diterapkan ke `altora_resto_dev` dan diverifikasi lewat test database-integration nyata. Lihat ADR-031.
- **Kategori B (dapat ditegakkan DB, SQL belum resmi): 7 baris** — sub-kategori B1 lama (INV-001 s.d. INV-007) sudah pindah seluruhnya ke kategori A. Yang tersisa hanyalah B2 (belum ada draf sama sekali): **7 baris** (INV-008 s.d. INV-014, termasuk 3 baris baru dari ALT-DEF-043 dan 1 baris yang desainnya diperbarui dari ALT-DEF-038).
- **Kategori C (dijaga transaksi aplikasi): 10 baris** (INV-015 s.d. INV-024). Tidak satu pun memakai optimistic concurrency (kolom versi belum ada di schema) — seluruhnya benar-benar tanpa locking apa pun hari ini kecuali rencana `SELECT ... FOR UPDATE`/atomic `UPDATE ... WHERE` yang juga belum berupa kode.
- **Kategori D (rekonsiliasi/cache): 6 baris** (INV-025 s.d. INV-030), termasuk 3 baris baru untuk ledger keanggotaan (poin/stempel/saldo toko) yang sebelumnya tidak eksplisit di dokumen versi lama.
- **Kategori E (state machine & workflow guards): 13 baris** (INV-031 s.d. INV-043), kategori BARU pada revisi ini. Termasuk 1 baris (INV-043) yang menangkap gap dokumentasi murni: `STATE-MACHINES.md` tidak memodelkan Reservasi/Promo/Cuti sebagai state machine mandiri.
- **Total: 43 baris invariant** (naik dari 20 baris pada versi dokumen sebelumnya) — kenaikan berasal dari (a) pemecahan baris gabungan lama menjadi baris per-model/per-arah yang lebih presisi (mis. append-only vs pembalik-berlawanan-tanda pada `MutasiStok` dulu 1 baris, sekarang INV-006/INV-007), (b) 3 baris baru dari ALT-DEF-043 (ledger keanggotaan) dikalikan kemunculannya di kategori B DAN D (drafting DB + rekonsiliasi cache adalah dua sisi berbeda dari invariant yang sama), dan (c) kategori E yang seluruhnya baru (13 baris) diekstrak dari `STATE-MACHINES.md`, yang sebelumnya hanya dirujuk secara umum tanpa baris invariant eksplisit.

Tidak satu pun dari baris di atas membatalkan status `SIAP_DIVERIFIKASI` yang
sudah diberikan ke masing-masing defect terkait di `DEFECT-LEDGER.md` — status
itu memang sengaja bukan `DITUTUP` justru karena baris-baris inilah yang belum
diverifikasi nyata. Perbedaan dengan sebelumnya: fase **DEEP CORRECTION LOOP**
yang dimulai pada batch ini punya Postgres nyata untuk benar-benar
menyelesaikan sebagian besar kategori B (fold ke migrasi resmi) dan
memverifikasi sebagian kategori C/D/E lewat test integrasi nyata — bukan
sekadar mendokumentasikan rencana selamanya. Dokumen ini akan direvisi lagi
setiap kali sebuah baris pindah kategori atau ditutup; jangan biarkan revisi
berikutnya menjadi stale seperti versi sebelum ini.
