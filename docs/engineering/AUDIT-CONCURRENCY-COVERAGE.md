# Audit Cakupan Konkurensi - Batch Konsolidasi (ADR-041)

Status dokumen: **AUDIT SELESAI, batch konsolidasi (bukan from-scratch)**.
Ditulis 2026-07-26 sebagai output wajib batch ADR-041 (lihat instruksi batch
di commit terkait). Tujuan: mengaudit SELURUH skenario yang diminta instruksi
correction-loop asli (section 14, 5 kategori: Migrasi, Tenant, Concurrency,
Ledger, State machine) terhadap 13 file `database-integration` yang SUDAH ADA
sebelum batch ini, menandai tiap skenario ✅/⚠️/❌, lalu mengisi HANYA gap
yang genuine dengan test baru (bukan menduplikasi cakupan yang sudah baik).

Metodologi: setiap file di
`packages/test-support/src/database-integration/*.test.ts` DIBACA PENUH
(bukan ditebak dari nama file), lalu dicocokkan baris-per-baris terhadap
setiap skenario di bawah. Kutipan test/fungsi disertakan sebagai bukti.

---

## 1. Migrasi

| Skenario | Status | Bukti / catatan |
|---|---|---|
| Database kosong dapat dimigrasikan | ✅ **SUDAH TERBUKTI (manual, per-batch)** | Setiap satu dari 9 batch sebelumnya (dan batch ini) menjalankan `DROP DATABASE altora_resto_dev` + `CREATE DATABASE` + `prisma migrate deploy` dari nol lalu menjalankan ULANG seluruh suite test - didokumentasikan di `RELEASE-EVIDENCE.md` (lihat baris `DROP DATABASE`/`migrate deploy` berulang di seluruh file, terbaru di bagian ADR-041 di bawah). Batch ini MENGULANG cek ini secara nyata: `DROP DATABASE` + `CREATE DATABASE` + `migrate deploy` -> "All migrations have been successfully applied." (14 migrasi), lalu 39/39 test (22 architecture + 17 database-integration) lulus dari database yang baru saja kosong. Ini adalah pengecekan MANUAL berulang (bukan test otomatis tunggal), tapi sudah dijalankan NYATA setiap batch tanpa kecuali sejak batch pertama correction-loop. |
| Semua index/trigger/check tersedia | ⚠️ **SEBELUMNYA tersebar per-domain -> SEKARANG ada tripwire konsolidasi (BARU batch ini)** | 13 file lama masing-masing menguji trigger/constraint/index DOMAIN-nya sendiri (mis. `ledger-reversal-membalik-invariants.test.ts` hanya cek 2 fungsi + trigger ledger; `optimistic-locking-version-invariants.test.ts` hanya cek trigger bump-version di 13 tabel). Ini SUDAH BENAR untuk domain masing-masing, tapi TIDAK ADA satu test pun yang mengenumerasi SELURUH object hasil audit migrasi (29 trigger bisnis, 4 CHECK constraint bernama, index unique/partial bisnis-kritis) di SATU tempat sebagai tripwire regresi tunggal - kalau migrasi masa depan menghapus satu trigger secara tidak sengaja DAN domain test terkait kebetulan tidak ikut di-update/dijalankan, gap itu bisa lolos. **BARU**: `inventaris-trigger-constraint-lengkap.test.ts` - mendaftar LENGKAP (diekstrak lewat `grep` atas seluruh `prisma/schema/migrations/*.sql`) 29 trigger + 4 CHECK constraint + 14 index unique/partial bisnis-kritis, memverifikasi SETIAP SATU ada di `pg_catalog`, DAN memverifikasi jumlah trigger `trg_*` di schema public PERSIS 29 (bukan sekadar subset) - kalau ada trigger baru yang lupa didaftarkan, test ini gagal. Sengaja TIDAK mendaftar ~139 unique index generik `@@unique` Prisma biasa (FK-support) satu per satu - itu sudah dijaga lebih murah dan lebih lengkap oleh drift detection (skenario berikutnya). |
| Migrasi kedua tidak mengubah schema diam-diam | ❌ **TIDAK PERNAH DIUJI OTOMATIS -> BARU batch ini** | Tidak ada satu pun dari 13 file lama yang menjalankan `prisma migrate deploy` LEBIH DARI SEKALI terhadap database yang sudah bermigrasi. **BARU**: `migrasi-idempoten-dan-drift.test.ts` fungsi `testMigrateDeployKeduaTidakMengubahApaPun()` - menjalankan `prisma migrate deploy` DUA KALI berturut-turut ke `altora_resto_dev` (sudah bermigrasi penuh), memverifikasi KEDUANYA melaporkan `"No pending migrations to apply."` DAN membandingkan checksum/migration_name/finished_at SETIAP baris `_prisma_migrations` byte-per-byte sebelum vs sesudah - harus identik persis. |
| Prisma drift detection bersih | ❌ **TIDAK PERNAH DIUJI OTOMATIS -> BARU batch ini** | `prisma migrate status` dijalankan manual tiap batch (lihat `RELEASE-EVIDENCE.md`), tapi `prisma migrate diff` (live DB <-> schema.prisma, deteksi drift STRUKTURAL bukan hanya "migration history sudah diterapkan") TIDAK PERNAH dijalankan sebagai bagian test otomatis manapun sebelum batch ini. **BARU**: `migrasi-idempoten-dan-drift.test.ts` fungsi `testDriftDetectionBersih()` - menjalankan `prisma migrate diff --from-schema-datasource=schema.prisma --to-schema-datamodel=schema.prisma --script` (live database dibandingkan datamodel resmi) dan memverifikasi output PERSIS `"This is an empty migration."` (tidak ada statement DDL apa pun) - berbeda dari `migrate status` yang hanya melihat migration HISTORY, bukan STRUKTUR aktual. |

---

## 2. Tenant

| Skenario | Status | Bukti / catatan |
|---|---|---|
| Actor tenant lain ditolak | ✅ **SUDAH TERBUKTI, cakupan luas** | `actor-keanggotaan-tenant-outlet-invariants.test.ts` (ADR-033): `testMutasiStokAktorLintasTenantDitolak`, `testMutasiStokAktorTenantBenarOutletSalahDitolak` (kasus LEBIH HALUS: anggota tenant BENAR tapi outlet SALAH), `testStokOpnameAktorLintasTenantDitolak`, `testKaryawanKeanggotaanLintasTenantDitolak`, `testNotificationKeanggotaanLintasTenantDitolak` - 5 model actor field berbeda (outlet-level DAN tenant-level), masing-masing dengan kasus POSITIF (aktor sah diterima) sebagai kontrol. |
| Outlet tenant lain ditolak | ✅ **SUDAH TERBUKTI** | Sama seperti di atas - `testMutasiStokAktorTenantBenarOutletSalahDitolak` SECARA KHUSUS menguji outlet-mismatch (bukan hanya tenant-mismatch): aktor anggota tenant yang BENAR tapi `KeanggotaanOutlet`-nya untuk outlet LAIN dalam tenant yang sama ditolak composite-FK. Composite-FK `(tenantId, outletId)` -> `Outlet(tenantId, id)` (ALT-DEF-010) dipakai luas di seluruh schema (lihat `tenant-outlet-composite-constraints.test.ts` di `architecture/` untuk audit struktur lengkap lintas model). |
| Notification tenant lain ditolak | ✅ **SUDAH TERBUKTI, kasus ADVERSARIAL** | `notification-target-lintas-tenant-invariants.test.ts` (ADR-040) - bukan hanya cek constraint, tapi kasus ADVERSARIAL eksplisit: predikat query yang SENGAJA DIBUAT SALAH (tanpa guard `tenantId` di level terluar) TERBUKTI membocorkan notifikasi broadcast tenant lain; predikat yang BENAR TERBUKTI tidak bocor, bahkan dengan dua `Peran` di tenant berbeda yang sengaja diberi `kode` identik ("KASIR") untuk membuktikan kemiripan nama tidak membingungkan predikat. |
| Relasi child multi-parent tenant lain ditolak | ⚠️ **Diverifikasi utuh pada BEBERAPA relasi representatif, bukan ratusan model composite-FK; dinilai CUKUP (proof-by-construction), tidak ditambah test baru** | `actor-keanggotaan-tenant-outlet-invariants.test.ts` menguji 5 relasi multi-parent (mutasi_stok, stok_opname, karyawan, notification x2). `tenant-outlet-composite-constraints.test.ts` (`architecture/`, dibaca sebagai referensi silang) mengaudit STRUKTUR composite-FK `(tenantId, X)` di SELURUH model yang relevan, memverifikasi pola generik ADR-013 diterapkan konsisten. Keputusan: karena SETIAP composite-FK di schema ini mengikuti SATU pola generik yang identik (`@@unique([tenantId, id])` pada parent + `fields: [tenantId, xId], references: [tenantId, id]` pada child - Postgres menegakkannya sebagai FK biasa, mekanismenya TIDAK bervariasi per model), 5 relasi yang sudah diverifikasi BEHAVIORAL (bukan hanya struktur) sudah representatif secara mekanisme - menambah lebih banyak model dengan pola IDENTIK murni menambah runtime test tanpa menambah cakupan RISIKO baru. **Tidak ditambah test baru pada batch ini** - keputusan sadar, bukan kelalaian. |

---

## 3. Concurrency (inti batch ini)

| Skenario | Status | Bukti / catatan |
|---|---|---|
| **Dua kasir mengubah order bersamaan** | ✅ **SUDAH TERBUKTI persis pada `Pesanan`** | `optimistic-locking-version-invariants.test.ts` fungsi `testDuaKoneksiNyataKonflikTerdeteksi()` (ADR-035) - CRUX proof: dua koneksi `pg` FISIK terpisah (`connA`/`connB`, bukan simulasi), keduanya baca `version=1` pada SATU baris `Pesanan`, B menang (UPDATE berhasil, version->2), A mencoba UPDATE dengan version basi -> rowCount=0. Persis skenario yang diminta, sudah pakai tabel `Pesanan` yang benar. |
| **Dua pembayaran dikonfirmasi bersamaan** | ⚠️ **Trigger existence sudah dicek di 13 tabel (termasuk `pembayaran`), tapi TIDAK ADA proof dua-koneksi KHUSUS tabel `Pembayaran` -> BARU batch ini** | `optimistic-locking-version-invariants.test.ts` hanya menjalankan proof dua-koneksi PENUH pada `Pesanan` (dan existence-only untuk 12 tabel lain termasuk `pembayaran`). **BARU**: `konkurensi-dua-koneksi-lanjutan.test.ts` test (1) `testDuaKonfirmasiPembayaranBersamaanVersionConflict` - proof dua-koneksi LANGSUNG pada `Pembayaran` (bukan generalisasi dari Pesanan): dua kasir konkuren mengonfirmasi SATU baris `Pembayaran` yang sama, version conflict terdeteksi persis. **DITEMUKAN SEKALIGUS gap TERKAIT LEBIH DALAM** (bukan versi row yang sama, tapi DUA `Pembayaran` BERBEDA yang over-alokasi ke satu `Pesanan`): test (6) `testDuaPembayaranOverAlokasiGapNyata` MEMBUKTIKAN tidak ada proteksi jumlah sama sekali - lihat `ALT-DEF-053`. |
| **Dua promo memakai kuota terakhir** | ❌ **TIDAK PERNAH DIUJI -> BARU batch ini, GAP NYATA DITEMUKAN** | Tidak ada satu pun dari 13 file lama yang menyentuh `Promo.usageQuota`. `promo-pemakaian-penerapan-invariants.test.ts` (ALT-DEF-038) HANYA menguji batas PER-PESANAN (`usageLimitPerOrder`/`repeatable`), tidak pernah menyentuh kuota TOTAL lintas pelanggan. **BARU**: `konkurensi-dua-koneksi-lanjutan.test.ts` test (4) `testDuaPromoKuotaTerakhirRaceGapNyata` - MEMBUKTIKAN SECARA JUJUR bahwa race ini terjadi NYATA hari ini: promo `usageQuota=1`, dua `PromoPemakaian` pesanan berbeda konkuren, KEDUANYA commit, kuota over-consumed 2/1. **Tidak ada mekanisme DB apa pun yang mencegahnya** - dicatat sebagai defect baru `ALT-DEF-051` (bukan diam-diam dilewati). |
| **Dua reservasi mengambil stok terakhir** | ❌ **Hanya kasus "reservasi sudah dikonsumsi" yang diuji, bukan race saat INSERT -> BARU batch ini, GAP NYATA DITEMUKAN** | `siklus-hidup-stok-invariants.test.ts` (ADR-037) menguji idempotency (`reservasi_stok_itemPesananId_key`: dua reservasi untuk ITEM YANG SAMA ditolak) dan larangan konsumsi-ganda - KEDUANYA BUKAN skenario "dua item BERBEDA berebut bahan yang sama". **BARU**: `konkurensi-dua-koneksi-lanjutan.test.ts` test (5) `testDuaReservasiStokTerakhirRaceGapNyata` - MEMBUKTIKAN: `StokBahan.kuantitas=1` (unit terakhir), dua `ReservasiStok` item berbeda (jumlah=1 masing-masing) konkuren, KEDUANYA commit, over-reserved 2/1. `ReservasiStok` TIDAK PERNAH divalidasi terhadap saldo tersedia saat INSERT - konflik baru terdeteksi belakangan saat KONSUMSI menyentuh `StokBahan.kuantitas` langsung (trigger `trg_stok_bahan_cek_negatif`), bukan saat reservasi dibuat. Dicatat sebagai defect baru `ALT-DEF-052` - juga MANIFESTASI KONKRET dari `INV-015` yang sudah dikenal sejak lama sebagai risiko teoretis, sekarang punya bukti nyata. |
| **Dua posting opname** | ⚠️ **Existence trigger sudah dicek, tapi TIDAK ADA proof dua-koneksi KHUSUS `stok_opname` -> BARU batch ini** | `optimistic-locking-version-invariants.test.ts` hanya menguji proof PENUH pada `Pesanan`/`GiliranKasir`/`Promo` (existence-only untuk `stok_opname`, salah satu dari 13 tabel). **BARU**: `konkurensi-dua-koneksi-lanjutan.test.ts` test (2) `testDuaPostingOpnameBersamaanVersionConflict` - proof dua-koneksi LANGSUNG pada `stok_opname`: dua percobaan posting konkuren pada SATU `StokOpname`, version conflict terdeteksi (B menang, A rowCount=0), persis pola CRUX ADR-035 tapi dibuktikan di tabel ini secara spesifik. |
| **Dua reversal ledger** | ⚠️ **Kasus SEKUENSIAL (kedua gagal setelah pertama COMMIT) sudah teruji menyeluruh; kasus CONCURRENT (dua transaksi overlap NYATA) belum -> BARU batch ini** | `ledger-reversal-membalik-invariants.test.ts` (ADR-032) menguji "pembalik kedua ditolak" di SEMUA 4 tabel ledger, tapi SELALU dalam SATU transaksi sekuensial (`withTransaction`, INSERT pertama lalu INSERT kedua di client yang SAMA) - membuktikan unique constraint menolak duplikat, TAPI TIDAK membuktikan constraint itu tetap benar saat DUA TRANSAKSI FISIK BERBEDA benar-benar overlap (satu BELUM commit saat yang lain mencoba INSERT). **BARU**: `konkurensi-dua-koneksi-lanjutan.test.ts` test (3) `testDuaReversalLedgerConcurrentUniqueIndex` - dua koneksi FISIK (`connA`/`connB`) BEGIN sebelum salah satu commit, A INSERT (uncommitted), B INSERT (blok menunggu keputusan A - PERSIS perilaku Postgres nyata di bawah unique index concurrency, bukan simulasi), A COMMIT, B kemudian mendapat `duplicate key` - membuktikan unique index tetap protektif SECARA GENUINE CONCURRENT, bukan hanya sekuensial. **Catatan metodologi penting**: karena `mutasi_stok` bersifat append-only (tidak bisa di-DELETE, itulah ADR-032), test ini TIDAK bisa membersihkan baris fixture-nya setelah COMMIT sungguhan (satu-satunya cara membuat dua koneksi fisik melihat commit yang sama) - baris asal+pembalik yang di-COMMIT test ini bersifat PERMANEN di `altora_resto_dev`, sama seperti ledger produksi nyata (bukan debris rusak, tapi satu pasang reversal yang VALID dan konsisten). Ini biaya yang melekat pada pengujian NYATA lintas-koneksi atas tabel append-only. |

---

## 4. Ledger

Audit ulang `ledger-reversal-membalik-invariants.test.ts` (ADR-032) baris per
baris - SEMUANYA sudah teruji menyeluruh di 4 tabel ledger (`mutasi_stok`,
`poin_riwayat`, `ledger_stempel`, `ledger_saldo_toko`):

| Skenario | Status | Bukti |
|---|---|---|
| UPDATE ditolak | ✅ | `testMutasiStokAppendOnlyUnconditional`, `testKeanggotaanLedger`, `testLedgerSaldoToko` - UPDATE kolom APA PUN (termasuk kolom yang di desain LAMA tidak dilarang) ditolak trigger `ledger_tolak_ubah`. |
| DELETE ditolak | ✅ | Sama seperti di atas - DELETE ditolak trigger yang sama. |
| Pembalik salah jumlah ditolak | ✅ | `testMutasiStokReversalRejections` (c), `testKeanggotaanLedger` (5) - jumlah pembalik tidak berlawanan tanda ditolak. |
| Pembalik salah batch/lokasi ditolak | ✅ | `testMutasiStokReversalRejections` (f)+(g) - `bahanId` berbeda DAN `lokasiSumberId`/`lokasiTujuanId` TERTUKAR (bukan identik) pada transfer keluar/masuk keduanya ditolak; pembalik dengan lokasi IDENTIK diterima sebagai kontrol positif. |
| Double reversal ditolak | ✅ | `testMutasiStokKeduaPembalikDanRantai` (c), `testKeanggotaanLedger` (3), `testLedgerSaldoToko` - unique index `membalikMutasiId` menolak pembalik kedua ke baris asal yang sama, SEKUENSIAL. **Dilengkapi batch ini** dengan kasus CONCURRENT nyata (lihat tabel Concurrency #6 di atas). |
| Pembalik dari pembalik ditolak | ✅ | `testMutasiStokKeduaPembalikDanRantai` (d), `testKeanggotaanLedger` (4) - rantai pembalik-dari-pembalik ditolak eksplisit. |

Tidak ada test baru ditambahkan untuk kategori Ledger murni (kasus sekuensial)
- sudah lengkap. Satu tambahan test CONCURRENT (bukan sekuensial) untuk
"double reversal" ditambahkan di kategori Concurrency di atas.

---

## 5. State machine

| Skenario | Status | Bukti / catatan |
|---|---|---|
| Transisi valid berhasil / invalid ditolak | ⚠️ **Legitimately UNTESTABLE di layer DB hari ini, DIKONFIRMASI (bukan diasumsikan)** | Diperiksa: apakah ADA trigger DB yang menegakkan aturan transisi status Pesanan/Pembayaran/TiketDapur (mis. menolak `UPDATE pesanan SET status='DIBATALKAN' WHERE status='SELESAI'`)? Grep menyeluruh atas seluruh migrasi (`prisma/schema/migrations/*.sql`) untuk trigger BEFORE UPDATE pada kolom `status` dengan validasi transisi eksplisit: TIDAK DITEMUKAN SATU PUN. Trigger yang ADA pada `pesanan`/`pembayaran`/`tiket_dapur` (`trg_*_bump_version`, `trg_cek_konsistensi_pada_*`, `trg_recompute_status_retur_pesanan`, CHECK `tiket_dapur_alasan_wajib_saat_dibatalkan`) semuanya menegakkan invariant LAIN (versioning, konsistensi status pembayaran-pesanan, cache retur, alasan wajib) - BUKAN tabel transisi state-machine itu sendiri. `STATE-MACHINES.md` mendokumentasikan tabel transisi lengkap sebagai KONTRAK, tapi eksplisit menyebut penegakannya "SERVICE-LAYER (rencana, belum ada kode)" untuk hampir semua baris. KESIMPULAN JUJUR: karena TIDAK ADA handler/command code SAMA SEKALI di repo ini (dikonfirmasi berulang kali di ADR-036/037/039 sebelumnya) DAN tidak ada trigger transisi-spesifik, sebuah `UPDATE` SQL mentah bisa menyetel `status` ke NILAI ENUM APA PUN yang valid tanpa ditolak - Postgres sendiri tidak tahu aturan state-machine kecuali trigger dibangun untuk itu, dan belum ada satu pun. **Tidak dibuat test palsu yang "lulus" untuk sesuatu yang sebenarnya tidak ditegakkan** - didokumentasikan sebagai gap legitimate, cross-ref `INV-031` s.d. `INV-042` (kategori E, "state machine guard (service-layer)") yang SUDAH mencatat ini sebagai `DIKONFIRMASI` bukan `DITUTUP`. |
| Payment dan order berubah atomik | ✅ | `atomik-pembayaran-pesanan-invariants.test.ts` (ADR-036 sub-problem A) - deferred constraint trigger `cek_konsistensi_pembayaran_pesanan`: urutan salah (Pembayaran DIBAYAR, Pesanan tidak diubah) ditolak KERAS saat COMMIT; urutan benar (keduanya diubah dalam transaksi sama) berhasil; regresi Pesanan SETELAH dibayar (transaksi terpisah) ditolak; query rekonsiliasi mengembalikan nol baris. |
| Void setelah produksi membuat waste | ✅ | `retur-void-produksi-invariants.test.ts` (ADR-036 sub-problem C) - CHECK `pesanan_pembatalan_approval_wajib_setelah_produksi`: `jenisPembatalan=SETELAH_PRODUKSI` tanpa `disetujuiOlehId` ditolak, dengan `disetujuiOlehId` diterima; `SEBELUM_PRODUKSI` (default) tidak butuh approval - regresi diuji eksplisit. |
| Tiket batal tidak membuat order macet | ⚠️ **HANYA didokumentasikan (STATE-MACHINES.md), tidak pernah dijalankan terhadap data nyata -> BARU batch ini** | Predikat "order ready" (`NOT EXISTS (SELECT 1 FROM tiket_dapur WHERE "pesananId"=? AND status NOT IN ('SIAP','DISAJIKAN','DIBATALKAN'))`) didokumentasikan PERSIS di `STATE-MACHINES.md` sejak ADR-036, dan `INV-055` mencatatnya sebagai "kontrak query, murni app-level, belum ada handler". TIDAK ADA test database-integration yang pernah menjalankan predikat ini terhadap data `TiketDapur` NYATA (dengan kombinasi status termasuk `DIBATALKAN`). **BARU**: `tiket-dapur-order-ready-predikat.test.ts` - 6 skenario: seluruh tiket SIAP (true), satu tiket belum siap (false), CRUX satu tiket DIBATALKAN + sisanya SIAP (TETAP true - tiket batal tidak menahan), kombinasi satu batal + satu belum siap (false, karena yang belum siap), CHECK constraint alasan wajib sebagai prasyarat predikat tetap auditable, DAN vacuous-truth (pesanan tanpa tiket sama sekali -> true, didokumentasikan eksplisit sebagai jebakan yang WAJIB digabung guard `Pesanan.status >= DIKIRIM_KE_DAPUR` di aplikasi). |
| Retur sebagian tidak mengubah seluruh order menjadi retur penuh | ✅ | `retur-void-produksi-invariants.test.ts` `testReturSebagianLaluPenuh` - retur SELESAI 1 dari 2 qty item A (item B belum diretur) -> `statusRetur=RETUR_SEBAGIAN` (BUKAN penuh); retur kedua menutup SISA seluruh item -> `RETUR_PENUH`; PesananRetur `DIAJUKAN` (belum SELESAI) tidak memicu recompute; efek samping version bump ADR-035 diverifikasi; `Pesanan.status` (lifecycle) tetap ORTOGONAL terhadap `statusRetur`. KEDUA kasus (sebagian DAN penuh) diuji, bukan hanya salah satu. |

---

## Ringkasan perubahan batch ini

**File test BARU (4 file, packages/test-support/src/database-integration/):**

1. `konkurensi-dua-koneksi-lanjutan.test.ts` - 6 skenario (3 proteksi
   diverifikasi ulang via dua-koneksi nyata + 3 gap nyata didokumentasikan
   sebagai defect baru).
2. `migrasi-idempoten-dan-drift.test.ts` - migrate deploy kedua no-op +
   drift detection bersih (2 skenario Migrasi yang sebelumnya hanya manual).
3. `inventaris-trigger-constraint-lengkap.test.ts` - tripwire regresi
   tunggal untuk 29 trigger + 4 CHECK constraint + 14 index bisnis-kritis.
4. `tiket-dapur-order-ready-predikat.test.ts` - predikat order-ready
   dijalankan terhadap data TiketDapur nyata (6 skenario).

**Defect baru dicatat:** `ALT-DEF-051` (Promo.usageQuota tidak ditegakkan),
`ALT-DEF-052` (ReservasiStok tidak divalidasi terhadap saldo tersedia saat
INSERT), `ALT-DEF-053` (SUM AlokasiPembayaran lintas-Pembayaran tidak
dibandingkan totalAkhir) - lihat `DEFECT-LEDGER.md`.

**Invariant baru dicatat:** `INV-062`, `INV-063`, `INV-064` (kategori C,
`INVARIAN-BELUM-DITEGAKKAN.md`) - masing-masing cross-ref satu defect di
atas, DIBEDAKAN dari baris invariant lama karena SEKARANG punya bukti test
nyata, bukan hanya risiko teoretis.

**Tidak ada fix schema pada batch ini** - scope batch ini adalah audit+test;
ketiga gap yang ditemukan (`ALT-DEF-051/052/053`) membutuhkan desain
lebih lanjut (lihat kolom "Rencana koreksi" masing-masing di
`DEFECT-LEDGER.md`) dan didorong ke batch implementasi mendatang.

**Jumlah file test database-integration: 13 -> 17** (13 lama + 4 baru).
Total suite: 22 architecture + 17 database-integration = **39 file**,
39/39 lulus (sebelum dan sesudah fresh-database redeploy - lihat
`RELEASE-EVIDENCE.md` bagian ADR-041 untuk bukti lengkap).
