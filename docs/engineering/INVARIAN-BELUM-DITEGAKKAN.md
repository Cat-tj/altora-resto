# Invarian yang Belum Ditegakkan di Level Database

Dokumen ini adalah **daftar tunggal dan lengkap** semua aturan bisnis yang
sudah didesain/didokumentasikan sepanjang correction loop, tapi **belum
benar-benar dijamin oleh database** — baik karena SQL manual belum pernah
dijalankan, atau karena aturannya secara struktural tidak bisa diekspresikan
sebagai constraint database sama sekali. Dibuat karena permintaan eksplisit:
tidak boleh ada satu detail pun yang hilang dari status QRIS-style
"app-level only" di seluruh schema.

Setiap baris: **status ADA-TAPI-BELUM-DIJALANKAN** (SQL sudah ditulis,
tinggal dieksekusi) vs **BELUM-DITULIS-SAMA-SEKALI** (bahkan draf SQL-nya
belum ada) vs **TIDAK-MUNGKIN-DB-ENFORCED** (secara struktural di luar
jangkauan constraint deklaratif, perlu trigger/job aplikasi selamanya).

---

## A. SQL manual sudah ditulis, belum pernah dijalankan (`prisma/migrations/manual/`)

Kelima file ini akan menegakkan aturannya **begitu dijalankan** ke database
nyata — sampai saat itu, aturan hanya dijaga guard level-aplikasi yang **tidak
aman terhadap race condition** dua request bersamaan.

| # | File | Aturan yang ditegakkan | Domain |
|---|---|---|---|
| 1 | `001_konfigurasi_qris_partial_unique.sql` | Tepat satu `KonfigurasiQris` berstatus AKTIF per outlet | QRIS (ALT-DEF-015) |
| 2 | `002_resep_target_xor_check.sql` | `Resep` menargetkan tepat satu dari (ItemMenu / VarianMenu / Bahan) | Resep (ALT-DEF-007) |
| 3 | `003_versi_resep_satu_aktif.sql` | Tepat satu `VersiResep` berstatus AKTIF per resep | Resep (ALT-DEF-007) |
| 4 | `004_stok_bahan_agregat_gudang_unik.sql` | Tepat satu baris `StokBahan` agregat (lokasiStokId NULL) per (gudang, bahan) — **dan** kasus identik pada `StokOpnameBaris` (2 index dalam 1 file) | Persediaan (ALT-DEF-008) |
| 5 | `005_mutasi_stok_append_only_dan_pembalik.sql` | (a) `mutasi_stok` append-only (UPDATE/DELETE ditolak trigger, kecuali mengisi `dibalikOlehId`); (b) mutasi pembalik wajib berlawanan tanda & sepadan dengan mutasi asal | Persediaan (ALT-DEF-008) |

**Kenapa tidak bisa ditulis langsung di `schema.prisma`:** Prisma DSL (v5.x)
tidak punya cara menyatakan partial/filtered unique index (`WHERE ...`),
CHECK constraint, atau trigger — sama sekali, di versi manapun.
`@@unique([...])` biasa yang terlihat mirip (mis. `@@unique([tenantId,
outletId, status])`) sengaja **ditolak** di setiap ADR terkait karena
constraint itu salah secara diam-diam (akan menolak kombinasi valid lain,
mis. dua baris NONAKTIF), bukan cuma "kurang lengkap".

---

## B. Belum ditulis SQL-nya sama sekali (baru diketahui butuh trigger/CHECK, desainnya sendiri belum dibuat)

| # | Aturan | Domain | ID rujukan | Kenapa belum ditulis |
|---|---|---|---|---|
| 6 | Promo `repeatable=false` tidak boleh diterapkan >1x ke pesanan yang sama, tapi `repeatable=true` boleh | Promo | `ALT-DEF-038` (SEDANG, `DIKONFIRMASI` — terbuka) | Predikatnya butuh baca kolom `Promo.repeatable` di tabel LAIN (join) — kategori constraint bersyarat-lintas-tabel yang belum pernah muncul sebelumnya di correction loop ini. Butuh trigger `BEFORE INSERT`, desain kapan-dieksekusi/retry-nya sengaja belum diputuskan. |
| 7 | `TransferStok`: `gudangAsal != gudangTujuan`; `diterima <= dikirim <= diminta` | Persediaan | ADR-024/025 (tabel invariant baris 10) | Dicatat eksplisit sebagai "UTANG CHECK constraint" — file SQL-nya sendiri belum dibuat, beda dari file 001-005 yang sudah ada drafnya. |
| 8 | `StokOpname`: `penghitungId != penyetujuId` (segregasi tugas — penghitung tidak boleh menyetujui hitungannya sendiri) | Persediaan | ADR-024/025 (tabel invariant baris 11) | Sama — "UTANG CHECK constraint", belum ada draf SQL. |
| 9 | **[Ditemukan saat menjawab pertanyaan ini — lihat `ALT-DEF-043` di bawah]** `PoinRiwayat`, `LedgerStempel`, `LedgerSaldoToko` — append-only + pembalik-berlawanan-tanda, POLA IDENTIK dengan `MutasiStok` | Keanggotaan | *baru* | `dibalikOlehId String? @unique` ada di keempat model (MutasiStok, PoinRiwayat, LedgerStempel, LedgerSaldoToko) — tapi trigger append-only+kesepadanan-pembalik (SQL 005) **hanya ditulis untuk `MutasiStok`**. Tiga ledger keanggotaan lainnya tidak punya draf trigger sama sekali — cakupan tidak konsisten antar-batch. |

---

## C. Secara struktural TIDAK MUNGKIN jadi constraint database — perlu job/guard aplikasi permanen

Baris-baris ini **tidak akan pernah** jadi DB-enforced murni lewat
constraint deklaratif, bahkan setelah semua file SQL di atas dijalankan.
Ini bukan "belum sempat", tapi "secara kategori di luar jangkauan" —
butuh reconciliation job terjadwal atau guard transaksi (`SELECT ... FOR
UPDATE`) di kode aplikasi selamanya.

| # | Invariant | Domain | Penegak yang direncanakan |
|---|---|---|---|
| 10 | `StokBahan.kuantitas == SUM(MutasiStok.jumlah)` per (gudang, bahan, lokasi) | Persediaan | Job rekonsiliasi periodik (kodenya belum ditulis) |
| 11 | `SUM(ReservasiStok status=AKTIF) <= saldo fisik` | Persediaan | Guard transaksi + `FOR UPDATE` |
| 12 | Stok tidak boleh negatif (bila `izinkanStokNegatif = false`) | Persediaan | Guard transaksi + `FOR UPDATE` |
| 13 | Setiap `BatchProduksi` bahan-setengah-jadi harus melahirkan tepat satu `BatchStok` | Persediaan | Guard transaksi produksi |
| 14 | `lokasiSumber`/`lokasiTujuan` pada `MutasiStok` wajib sesuai jenis mutasi (mis. transfer wajib isi keduanya, pembelian cuma tujuan) | Persediaan | Validasi service-layer |
| 15 | `SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah` (validasi pembayaran campuran) | Pembayaran | Validasi service-layer dalam satu transaksi |
| 16 | `SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah` (validasi split-bill) | Pembayaran | Validasi service-layer dalam satu transaksi |
| 17 | Agregat `SUM(PembayaranRefund.jumlah) <=` jumlah yang sah direfund | Pembayaran | Dievaluasi server-side setelah baca |
| 18 | `PinOutlet`: hanya satu PIN "berlaku di semua perangkat" (`perangkatId IS NULL`) per kombinasi keanggotaan-tenant+outlet | Autentikasi | Service-layer — Postgres memperlakukan dua NULL sebagai *berbeda* di unique index, jadi index biasa **tidak bisa** menutup kasus ini |
| 19 | `TokenResetKataSandi`: token hanya valid dipakai **satu kali** (`digunakanPada IS NULL AND kadaluarsaPada > now()`) | Autentikasi | `UPDATE ... WHERE digunakanPada IS NULL` atomik di service-layer — conditional-uniqueness tidak didukung Prisma |
| 20 | Tidak ada hard-delete pada data finansial/stok/audit (ADR-006, prinsip di seluruh schema) | Lintas-domain | **Murni konvensi kode** — tidak ada `REVOKE DELETE` atau trigger penolak DELETE yang benar-benar terpasang di database manapun KECUALI `mutasi_stok` (via file 005 di atas, dan itu pun belum dijalankan). Akses langsung lewat `psql` bisa menghapus baris finansial/audit tanpa ditolak apa pun hari ini. |

---

## Ringkasan angka

- **5 file SQL siap jalan, 0 yang pernah dieksekusi** (kategori A).
- **3 aturan sudah diketahui butuh trigger/CHECK tapi belum ditulis** (kategori B) — termasuk 1 kesenjangan baru yang ditemukan saat menyusun dokumen ini (asimetri trigger ledger keanggotaan).
- **11 invariant yang secara struktural tidak akan pernah murni DB-enforced**, perlu job/guard aplikasi permanen (kategori C).
- **Total: 20 invariant bisnis nyata yang saat ini hanya hidup di level aplikasi (yang belum ditulis) atau di kode yang belum pernah ada.**

Tidak satupun dari ini membatalkan status `SIAP_DIVERIFIKASI` yang sudah
diberikan ke masing-masing defect — status itu memang sengaja bukan
`DITUTUP` justru karena hal-hal inilah yang belum diverifikasi. Dokumen ini
hanya mengumpulkannya di satu tempat supaya tidak ada yang terlewat saat
audit berikutnya.
