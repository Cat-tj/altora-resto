# Kontrak API v1 - Altora Resto

Status dokumen: **DRAF AWAL** (belum diimplementasikan). Semua endpoint di bawah ini
adalah rancangan kontrak, bukan API yang sudah berjalan. Lihat
`docs/engineering/TRACEABILITY-MATRIX.md` untuk status implementasi per endpoint.

## 1. Prinsip umum

- Base path: `/api/v1`.
- Format: JSON (`Content-Type: application/json`), UTF-8.
- Semua request/response divalidasi dengan skema Zod yang sama antara handler API dan
  klien (lihat `docs/arsitektur/ARSITEKTUR-SISTEM.md` bagian "Shared API Contract").
- Autentikasi: Bearer token (session token dari `packages/autentikasi`) di header
  `Authorization: Bearer <token>`, kecuali endpoint publik yang ditandai eksplisit.
- Semua endpoint tenant-scoped mewajibkan resolusi tenant (lewat subdomain/slug atau
  klaim token) - tidak ada query yang boleh melewati filter `tenantId`/`outletId`
  (lihat `docs/arsitektur/ARSITEKTUR-SISTEM.md` bagian 3).
- Uang selalu dalam **rupiah, integer**, tidak ada desimal di response JSON (mis.
  `"totalAkhir": 125000`, bukan `125000.00`).
- Waktu dalam ISO-8601 UTC (mis. `"createdAt": "2026-07-24T09:30:00Z"`).
- ID entitas berupa string ULID (mis. `"01J9Z8Q5F5J1K3ZP9E1QK3F0YV"`).
- Paginasi list: query `?halaman=1&ukuran=20`, response membawa `meta.totalData`,
  `meta.totalHalaman`.
- Error format seragam:

```json
{
  "error": {
    "kode": "STOK_TIDAK_CUKUP",
    "pesan": "Stok bahan 'Ayam Fillet' tidak mencukupi untuk memproses pesanan ini.",
    "detail": { "bahanId": "01J9...", "kuantitasTersedia": "2.5", "kuantitasDiminta": "5" }
  }
}
```

- Kode status HTTP: `200` OK, `201` Created, `400` validasi gagal, `401` tidak
  terautentikasi, `403` tidak punya permission (lihat
  `docs/keamanan/PERMISSION-MATRIX.md`), `404` tidak ditemukan, `409` konflik state
  (mis. transisi status tidak valid), `422` bisnis-rule gagal, `500` galat server.

## 2. Autentikasi & Sesi (`packages/autentikasi`)

Status: **DIPERBARUI (ALT-DEF-001)** - `Pengguna` sekarang identitas global,
tidak lagi membawa `tenantId` langsung. Login tidak lagi otomatis "milik satu
tenant"; setelah autentikasi berhasil, klien harus memilih/mendapatkan
`KeanggotaanTenant` aktif untuk melanjutkan ke konteks tenant tertentu (lihat
`ALT-PLT-003`, endpoint `GET /api/v1/tenant-saya` di bawah).

| Metode | Path | Deskripsi |
|---|---|---|
| POST | `/api/v1/auth/masuk` | Login email + kata sandi (`Pengguna.passwordHash`) - mengembalikan `Sesi` global, BUKAN sesi ter-scope tenant. Response menyertakan daftar `KeanggotaanTenant` aktif milik pengguna untuk dipilih klien. Setiap upaya (berhasil/gagal) dicatat ke `PercobaanLogin`; gagal beruntun memicu `Pengguna.terkunciSampai` (lihat `ALT-DEF-003`, ADR-014). |
| GET | `/api/v1/tenant-saya` | Daftar `KeanggotaanTenant` aktif milik pengguna yang sedang login (`ALT-PLT-003`) - dipakai klien untuk memilih tenant konteks setelah login; memilih salah satu mengisi `Sesi.keanggotaanTenantId`. |
| POST | `/api/v1/auth/masuk-pin` | Login PIN cepat di perangkat kasir (kasir/pelayan) - PIN scoped ke `KeanggotaanTenant`+`Outlet` (+ perangkat opsional) lewat model `PinOutlet` (`ALT-DEF-013`, ADR-015). |
| POST | `/api/v1/auth/keluar` | Mencabut sesi aktif (`Sesi.dicabutPada`, `Sesi.alasanPencabutan = "logout"`). |
| GET | `/api/v1/auth/sesi-saya` | Info sesi & pengguna yang sedang login, termasuk `keanggotaanTenantAktif` bila klien sudah memilih konteks tenant. |
| POST | `/api/v1/auth/perangkat/aktivasi` | Aktivasi perangkat KDS/kasir/printer via `kodeAktivasi`. |
| POST | `/api/v1/auth/lupa-kata-sandi` | Minta reset kata sandi (`ALT-DEF-003`). Membuat baris `TokenResetKataSandi`, mengirim token MENTAH lewat email (token mentah tidak pernah disimpan, hanya `tokenHash`). **Idempotent/aman-enumerasi:** response HARUS sama persis (mis. `200 { "pesan": "Jika email terdaftar, tautan reset telah dikirim." }`) baik email terdaftar maupun tidak - lihat catatan keamanan di bawah. |
| POST | `/api/v1/auth/reset-kata-sandi` | Konsumsi token reset (`ALT-DEF-003`) - body `{ "token": "...", "kataSandiBaru": "..." }`. Wajib validasi `TokenResetKataSandi.digunakanPada IS NULL AND kadaluarsaPada > now()` sebelum menerima (conditional uniqueness didokumentasikan sebagai keterbatasan Prisma di ADR-014, enforcement di service-layer, bukan skema). |
| POST | `/api/v1/auth/sesi/{id}/cabut` | Cabut SATU sesi milik pengguna yang sedang login (`ALT-DEF-003`) - mengisi `Sesi.dicabutPada` + `alasanPencabutan`. |
| POST | `/api/v1/auth/sesi/cabut-semua` | Cabut SELURUH sesi aktif milik pengguna yang sedang login (`ALT-DEF-003`), mis. saat mendeteksi kompromi akun atau setelah ganti kata sandi - opsional mengecualikan sesi yang sedang dipakai untuk memanggil endpoint ini. |
| POST | `/api/v1/auth/pin/ganti` | Ganti PIN self-service (`ALT-DEF-013`) - pengguna yang sedang login mengganti `PinOutlet.pinHash` miliknya sendiri di outlet yang sedang aktif; wajib verifikasi PIN lama atau kata sandi akun. |
| POST | `/api/v1/karyawan/{keanggotaanTenantId}/pin/reset` | Reset PIN karyawan lain (`ALT-DEF-013`), dipanggil oleh pemilik/manajer outlet - membuat `pinHash` baru untuk `PinOutlet` milik `keanggotaanTenantId` target di outlet yang dikelola pemanggil. Permission: `akun.reset-pin` (lihat `docs/keamanan/PERMISSION-MATRIX.md`). |

Contoh request `POST /api/v1/auth/masuk-pin`:

```json
{ "outletId": "01J9...OUTLET", "perangkatId": "01J9...PRK", "pin": "482913" }
```

**Catatan keamanan - anti-enumerasi email pada `lupa-kata-sandi`:** endpoint
ini HARUS mengembalikan response identik (status code, bentuk body, dan
kira-kira waktu respons) baik untuk email yang terdaftar maupun tidak, agar
penyerang tidak bisa memakai endpoint ini untuk memverifikasi email mana
saja yang punya akun di platform (email enumeration). Detail apakah token
benar-benar dibuat/dikirim tidak boleh bocor lewat perbedaan response.

**Catatan idempotency:** `lupa-kata-sandi` aman dipanggil berulang untuk
email yang sama (setiap panggilan membuat baris `TokenResetKataSandi` baru,
token lama tetap valid sampai dipakai/kadaluarsa - tidak ada efek samping
merusak dari pemanggilan ganda). `reset-kata-sandi` TIDAK idempotent by
design - token hanya bisa dikonsumsi sekali (`digunakanPada`); pemanggilan
kedua dengan token yang sama HARUS ditolak.

## 3. Platform (Tenant, Outlet, Pengguna, KeanggotaanTenant/Outlet, Peran, Izin)

Status: **DIPERBARUI (ALT-DEF-001, ALT-DEF-002)** - endpoint pengguna/peran di
bawah sekarang beroperasi pada `KeanggotaanTenant`/`KeanggotaanOutlet` (bukan
`Pengguna.tenantId`/`PenggunaOutlet` langsung) dan `Izin`/`PeranIzin` (bukan
`Peran.permissions` Json).

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/tenant/saya` | Info tenant aktif. |
| PATCH | `/api/v1/tenant/saya` | Ubah pengaturan tenant. |
| GET | `/api/v1/outlet` | Daftar outlet milik tenant. |
| POST | `/api/v1/outlet` | Buat outlet baru. |
| GET | `/api/v1/outlet/{outletId}` | Detail outlet. |
| PATCH | `/api/v1/outlet/{outletId}` | Ubah outlet (nama, status, zona waktu). |
| GET | `/api/v1/pengguna` | Daftar pengguna (staf) - hasil join `KeanggotaanTenant` milik tenant aktif, bukan lagi filter `Pengguna.tenantId`. |
| POST | `/api/v1/pengguna` | Undang/buat pengguna baru - membuat/menautkan `Pengguna` global lalu membuat baris `KeanggotaanTenant` baru untuk tenant aktif. |
| PATCH | `/api/v1/pengguna/{penggunaId}` | Ubah data pengguna / status aktif-nonaktif pada `KeanggotaanTenant` (bukan menonaktifkan identitas global `Pengguna`). |
| POST | `/api/v1/pengguna/{penggunaId}/akses-outlet` | Tetapkan/ubah `KeanggotaanOutlet` (outlet mana yang boleh diakses) untuk `KeanggotaanTenant` pengguna tsb (`ALT-PLT-007`). |
| POST | `/api/v1/pengguna/{penggunaId}/peran` | Tetapkan `Peran` ke `KeanggotaanTenant` pengguna (menulis baris `KeanggotaanPeran`, menggantikan `PenggunaPeran` lama). |
| GET | `/api/v1/peran` | Daftar peran tenant beserta izin terkait (join `PeranIzin`/`Izin`, bukan lagi parsing `permissions` Json). |
| POST | `/api/v1/peran` | Buat peran kustom (`isSystem=false`). |
| GET | `/api/v1/izin` | Daftar katalog izin global (`Izin`) - lihat `docs/keamanan/PERMISSION-MATRIX.md`. |
| PUT | `/api/v1/peran/{id}/izin` | Set daftar `Izin` yang dikaitkan ke `Peran` (menulis ulang baris `PeranIzin`). |
| PUT | `/api/v1/peran/{id}/batas-izin` | Set/ubah `BatasIzin` (limit numerik) untuk `Peran`. |
| POST | `/api/v1/persetujuan/{id}/putuskan` | Setujui/tolak `PermintaanPersetujuan` yang tertahan menunggu approval supervisor/manajer. |
| GET | `/api/v1/perangkat` | Daftar perangkat terdaftar per outlet. |
| GET | `/api/v1/audit-log` | Query jejak audit (filter tenant/outlet/entitas/tanggal). |

## 4. Menu & Katalog (`packages/menu`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/kategori-menu` | Daftar kategori menu. |
| POST | `/api/v1/kategori-menu` | Buat kategori menu. |
| GET | `/api/v1/item-menu` | Daftar item menu (filter kategori, status, outlet). |
| POST | `/api/v1/item-menu` | Buat item menu baru. |
| GET | `/api/v1/item-menu/{itemMenuId}` | Detail item menu (termasuk varian & modifier). |
| PATCH | `/api/v1/item-menu/{itemMenuId}` | Ubah item menu. |
| POST | `/api/v1/item-menu/{itemMenuId}/varian` | Tambah varian (mis. Kecil/Sedang/Besar). |
| POST | `/api/v1/item-menu/{itemMenuId}/harga-outlet` | Set harga per outlet. |
| GET | `/api/v1/modifier-grup` | Daftar grup modifier (mis. Level Pedas, Topping). |
| POST | `/api/v1/modifier-grup` | Buat grup modifier + opsi. |
| POST | `/api/v1/item-menu/{itemMenuId}/modifier-grup` | Kaitkan grup modifier ke item menu. |

Contoh response `GET /api/v1/item-menu/{itemMenuId}`:

```json
{
  "id": "01J9...MENU",
  "nama": "Nasi Goreng Spesial",
  "deskripsi": "Nasi goreng dengan telur mata sapi dan ayam suwir",
  "status": "AKTIF",
  "varian": [
    { "id": "01J9...V1", "nama": "Porsi Biasa", "hargaTambahan": 0 },
    { "id": "01J9...V2", "nama": "Porsi Jumbo", "hargaTambahan": 8000 }
  ],
  "modifierGrup": [
    { "id": "01J9...MG1", "nama": "Level Pedas", "wajibPilih": true, "minPilihan": 1, "maxPilihan": 1 }
  ]
}
```

## 5. Resep, Versi Resep & Produksi (`packages/resep`)

> **DIPERBARUI PADA BATCH ALT-DEF-007 (ADR-022).** Kontrak lama
> `GET/PUT /api/v1/resep/{itemMenuId}` **DIHAPUS** dan diganti. Ia mengasumsikan
> satu resep per item menu (`Resep.itemMenuId @unique`), constraint yang sudah
> tidak ada lagi; `itemMenuId` bukan lagi identitas sebuah resep dan tidak bisa
> dipakai sebagai path parameter. `PUT` yang menimpa komposisi juga bertentangan
> langsung dengan seluruh tujuan versioning — mengubah resep sekarang berarti
> **membuat versi baru**, bukan menimpa.
>
> **KOREKSI CATATAN SCOPE:** instruksi batch ini menyatakan endpoint
> `/recipes`, `/recipes/{id}/versions`, `/recipes/{id}/activate-version`,
> `/production-runs`, `/production-runs/{id}/complete` "sudah di-scaffold di
> kontrak API awal". Itu **tidak benar** — verifikasi langsung atas file ini
> sebelum batch: yang ada hanya lima baris di atas, seluruhnya berbahasa
> Indonesia (`/api/v1/resep/...`), tidak ada satu pun endpoint versi/produksi.
> Endpoint di bawah adalah **penambahan baru**, bukan pembaruan atas scaffold
> yang sudah ada, dan memakai penamaan bahasa Indonesia agar konsisten dengan
> seluruh kontrak ini (bukan `/recipes`/`/production-runs` berbahasa Inggris).

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/bahan` | Daftar bahan baku. Filter `?jenis=` (`BAHAN_BAKU`/`BAHAN_SETENGAH_JADI`/`PRODUK_JADI`/`KEMASAN`/`BARANG_OPERASIONAL`). |
| POST | `/api/v1/bahan` | Buat bahan baru. `jenis` wajib; `BAHAN_SETENGAH_JADI` adalah yang boleh menjadi `bahanHasil` sebuah subresep. |
| GET | `/api/v1/satuan` | Daftar satuan (gram, ml, pcs, dst). |
| GET | `/api/v1/konversi-satuan` | Daftar konversi satuan per tenant (`ALT-RSP-008`). |
| POST | `/api/v1/konversi-satuan` | Tambah konversi `satuanDari -> satuanKe` dengan `faktor` (Decimal). |
| GET | `/api/v1/resep` | Daftar kontainer resep. Filter `?itemMenuId=` / `?varianMenuId=` / `?bahanHasilId=` — **bukan lagi** path parameter, karena satu item menu boleh punya lebih dari satu resep. |
| POST | `/api/v1/resep` | Buat kontainer resep. Body wajib memuat **tepat satu** dari `itemMenuId`/`varianMenuId`/`bahanHasilId` (invariant XOR, ADR-022 Keputusan 2). Melanggarnya -> `422 RESEP_SASARAN_TIDAK_VALID`. |
| GET | `/api/v1/resep/{resepId}` | Detail satu resep beserta ringkasan seluruh versinya. |
| GET | `/api/v1/resep/{resepId}/versi` | Daftar `VersiResep` (`ALT-RSP-002`), termasuk versi `NONAKTIF`/`ARSIP` — riwayat tidak pernah disembunyikan. |
| POST | `/api/v1/resep/{resepId}/versi` | Buat versi BARU (status `DRAF`) beserta `KomponenResep`-nya. **Menggantikan `PUT /resep/{itemMenuId}` yang lama** — komposisi tidak pernah ditimpa. `nomorVersi` ditentukan server (`@@unique([resepId, nomorVersi])`). |
| PUT | `/api/v1/versi-resep/{versiResepId}/komponen` | Ubah komponen versi. **Hanya sah saat versi berstatus `DRAF`.** Versi `AKTIF`/`NONAKTIF`/`ARSIP` -> `409 VERSI_RESEP_TERKUNCI`; ia sudah/mungkin dirujuk `ItemPesanan` historis. |
| PUT | `/api/v1/versi-resep/{versiResepId}/modifier` | Atur `KomponenResepModifier` (`TAMBAH`/`KURANGI`/`GANTI`, `ALT-RSP-004`). Sama: hanya saat `DRAF`. |
| POST | `/api/v1/resep/{resepId}/aktifkan-versi` | Aktifkan satu versi: nonaktifkan versi `AKTIF` lama + set versi target `AKTIF` + isi `snapshotBiaya` (HPP saat itu) **dalam satu transaksi**. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) — retry klien tidak boleh menghasilkan dua kali pergantian versi. Lihat catatan race condition di bawah. |
| GET | `/api/v1/resep/{resepId}/hpp` | HPP terhitung dari versi `AKTIF` + harga bahan terbaru (`ALT-RSP-012`). **Belum diimplementasikan** — model harga bahan terbaru belum ada. |
| GET | `/api/v1/produksi` | Daftar `ProsesProduksi` per outlet (`ALT-RSP-009`). Filter `?status=`, `?tanggal=`. |
| POST | `/api/v1/produksi` | Buat proses produksi (status `DRAF`) atas satu `versiResepId` dengan `jumlahTarget`. |
| POST | `/api/v1/produksi/{id}/mulai` | `DRAF -> BERJALAN`, mengisi `dimulaiPada`. |
| POST | `/api/v1/produksi/{id}/selesaikan` | `BERJALAN -> SELESAI`: mengisi `jumlahAktual`, `diselesaikanPada`, baris `ProsesProduksiBaris` (konsumsi aktual), dan membuat `BatchProduksi`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) — ini operasi yang (kelak) memposting mutasi stok ganda (`PRODUKSI_KELUAR` + `PRODUKSI_MASUK`); retry tanpa idempotency akan menggandakan stok. Pola sama dengan `POST /mutasi-stok/penyesuaian` dan `POST /stok-opname/{id}/selesaikan`. |
| POST | `/api/v1/produksi/{id}/batalkan` | `DRAF|BERJALAN -> DIBATALKAN`, wajib alasan. Tidak menghapus baris apa pun (ADR-006). |
| GET | `/api/v1/batch-produksi` | Daftar batch bahan setengah jadi. Filter `?bahanHasilId=`, `?status=`, `?kedaluwarsaSebelum=` (dasar FEFO batch berikutnya). |

**Catatan invariant yang BELUM ditegakkan di level data.** Dua aturan di bawah
saat ini HANYA dijaga guard level-aplikasi karena file SQL penegaknya **belum
pernah dieksekusi** terhadap Postgres mana pun (`ALT-DEF-029`):

1. XOR sasaran `Resep` — `prisma/migrations/manual/002_resep_target_xor_check.sql`.
2. Satu `VersiResep` `AKTIF` per `Resep` —
   `prisma/migrations/manual/003_versi_resep_satu_aktif.sql`.

Konsekuensi konkret: dua request `POST /resep/{id}/aktifkan-versi` yang tiba
bersamaan **dapat** menghasilkan dua versi `AKTIF` sekaligus. `Idempotency-Key`
melindungi dari retry klien yang sama, **bukan** dari dua aktor berbeda yang
bersamaan. Jangan menganggap aturan ini terjamin sebelum kedua file SQL benar-
benar dijalankan.

**Catatan gap - pemotongan & reversal stok (`ALT-RSP-011`/`ALT-RSP-013`):**
tidak ada endpoint untuk keduanya di kontrak ini secara sengaja — pemotongan
stok dipicu event internal saat pesanan selesai, dan reversal dipicu event
pembatalan; keduanya adalah teritori batch `ALT-DEF-008` (persediaan). Yang
sudah disiapkan batch ini adalah FK `ItemPesanan.resepVersiId -> VersiResep`,
sehingga pemotongan/reversal wajib dihitung dari versi **yang tercatat di baris
pesanan**, bukan dari versi aktif saat ini (ADR-022 Keputusan 8).

## 6. Persediaan (`packages/persediaan`)

> **DIPERBARUI PADA BATCH ALT-DEF-008** (ADR-023/ADR-024/ADR-025). Bagian ini
> sebelumnya hanya memuat 9 endpoint (gudang, saldo, mutasi, penyesuaian,
> pembalikan, dan opname 4-langkah). **Catatan gap `ALT-DEF-032` yang dulu ada
> di sini DIHAPUS karena gap-nya DITUTUP** - endpoint transfer stok lengkap
> beserta anotasi `Idempotency-Key` kini ada di bawah, persis seperti yang
> dituntut baris remediasi `ALT-DEF-032`.
>
> **Aturan yang berlaku untuk SELURUH endpoint di bagian ini (ADR-023
> Keputusan 1):** `MutasiStok` adalah ledger append-only dan satu-satunya
> sumber kebenaran saldo. Tidak ada satu pun endpoint di sini yang menulis
> `StokBahan` secara langsung; saldo berubah HANYA sebagai konsekuensi baris
> mutasi. Tidak ada endpoint `PUT`/`DELETE` atas `/mutasi-stok/{id}` dan tidak
> akan pernah ada - koreksi selalu lewat `/balik` (ADR-006).

### 6.1 Master data

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/gudang` | Daftar gudang per outlet. |
| POST | `/api/v1/gudang` | Buat gudang baru (`ALT-PSD-003`). |
| GET | `/api/v1/gudang/{gudangId}/lokasi` | Daftar `LokasiStok` (rak/chiller/freezer) di satu gudang (`ALT-PSD-004`). |
| POST | `/api/v1/gudang/{gudangId}/lokasi` | Buat sub-lokasi. `nama` unik per gudang; `jenis` opsional. |
| GET | `/api/v1/alasan-waste` | Daftar taksonomi alasan waste tenant (`ALT-PSD-015`). |
| POST | `/api/v1/alasan-waste` | Tambah alasan waste. `kode` unik per tenant. |
| PUT | `/api/v1/alasan-waste/{id}` | Ubah nama/status. **Tidak ada DELETE** - dinonaktifkan lewat `status` agar histori `CatatanWaste` tetap terbaca (ADR-006). |
| GET | `/api/v1/outlet/{outletId}/pengaturan-persediaan` | Baca `PengaturanPersediaanOutlet` (kebijakan pemotongan, FEFO/FIFO, stok negatif, ambang opname). |
| PUT | `/api/v1/outlet/{outletId}/pengaturan-persediaan` | Ubah pengaturan persediaan outlet. Mengubah `kebijakanPemotongan` **tidak** berlaku surut atas pesanan yang sedang berjalan. |
| GET | `/api/v1/bahan/{bahanId}/reorder-policy` | Baca `KebijakanPemesananUlang` per outlet (`ALT-PSD-018`). |
| PUT | `/api/v1/bahan/{bahanId}/reorder-policy` | Set ambang minimum/maksimum & kuantitas reorder per outlet. |

### 6.2 Saldo dan ledger

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/stok-bahan` | Saldo stok (`StokBahan`, alias spec `SaldoStok`) per gudang. Filter `?gudangId=`, `?bahanId=`, `?lokasiStokId=`. **Read-model turunan** - respons menyertakan `direkonsiliasiPada` agar klien tahu seberapa segar cache-nya, dan `kuantitasTersedia = kuantitas - kuantitasDireservasi`. |
| GET | `/api/v1/mutasi-stok` | Riwayat ledger (append-only). Filter `?jenis=`, `?gudangId=`, `?bahanId=`, `?dari=`/`?sampai=`, `?referensiJenis=`/`?referensiId=`. |
| GET | `/api/v1/mutasi-stok/{mutasiId}` | Detail satu baris mutasi, termasuk `dibalikOlehId` bila sudah dibalik. |
| POST | `/api/v1/mutasi-stok/penyesuaian` | Catat `PenyesuaianStok` manual (`alasan` **wajib**), menghasilkan TEPAT SATU `MutasiStok` `PENYESUAIAN`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "posting mutasi stok"). |
| POST | `/api/v1/mutasi-stok/{mutasiId}/balik` | Buat mutasi pembalik (koreksi, no hard-delete). **Wajib header `Idempotency-Key`** - retry akan membuat pembalik ganda dan menggandakan koreksi saldo. Menolak `409 MUTASI_SUDAH_DIBALIK` bila `dibalikOlehId` sudah terisi. |
| POST | `/api/v1/persediaan/rekonsiliasi` | Jalankan rekonsiliasi cache dari ledger untuk satu gudang (`?gudangId=`): hitung ulang `SUM(MutasiStok.jumlah)` dan **timpa** `StokBahan.kuantitas`, isi `direkonsiliasiPada`. Arah penulisan SATU ARAH; ledger tidak pernah disesuaikan ke cache. **Wajib header `Idempotency-Key`**. |
| GET | `/api/v1/batch-stok` | Daftar `BatchStok`. Filter `?bahanId=`, `?status=`, `?kedaluwarsaSebelum=`, `?lokasiStokId=`. Urutan default FEFO (`tanggalKedaluwarsa` menaik, NULL terakhir lalu `createdAt`). |
| POST | `/api/v1/batch-stok` | Catat batch (mis. dari penerimaan barang). `nomorBatch` unik per `(tenant, bahan)`. |

### 6.3 Reservasi stok

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/reservasi-stok` | Daftar reservasi. Filter `?itemPesananId=`, `?bahanId=`, `?status=`. |
| POST | `/api/v1/reservasi-stok` | Buat reservasi untuk satu `itemPesananId` (`ALT-PSD-008`). Umumnya dipicu **event internal** saat `Pesanan -> DITERIMA`; endpoint eksplisit disediakan untuk koreksi manual. **Wajib header `Idempotency-Key`**. Menolak `409 STOK_TIDAK_CUKUP` bila `SUM(reservasi AKTIF) + jumlah` melebihi saldo fisik dan `izinkanStokNegatif = false`. |
| POST | `/api/v1/reservasi-stok/{id}/lepas` | `AKTIF -> DILEPAS` (`ALT-PSD-009`). **Tidak menghasilkan mutasi apa pun** - reservasi tidak pernah menyentuh stok fisik. |

**Catatan reservasi:** reservasi mengurangi stok **TERSEDIA**, tidak pernah
stok **FISIK**, dan SENGAJA bukan baris ledger (ADR-024 Keputusan 2).
Transisi `AKTIF -> DIKONSUMSI` **tidak punya endpoint sendiri**: ia terjadi
sebagai efek samping pemotongan stok sesuai
`PengaturanPersediaanOutlet.kebijakanPemotongan` (default saat pesanan masuk
dapur). Menyediakan endpoint terpisah untuknya akan membuka jalur konsumsi
reservasi tanpa mutasi pendamping - pelanggaran ADR-023 Keputusan 1.

### 6.4 Transfer stok (`ALT-PSD-012`/`ALT-PSD-013`, menutup `ALT-DEF-032`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/transfer-stok` | Daftar transfer. Filter `?status=`, `?outletAsalId=`, `?outletTujuanId=`. |
| GET | `/api/v1/transfer-stok/{id}` | Detail transfer beserta baris dan jejak mutasi keluar/masuk. |
| POST | `/api/v1/transfer-stok` | Buat transfer status `DRAF` + baris (`jumlahDiminta`). Menolak `422 TRANSFER_GUDANG_SAMA` bila `gudangAsalId == gudangTujuanId`. |
| PUT | `/api/v1/transfer-stok/{id}/baris` | Ubah baris. **Hanya sah saat `DRAF`** -> selain itu `409 TRANSFER_TERKUNCI`. |
| POST | `/api/v1/transfer-stok/{id}/ajukan` | `DRAF -> DIAJUKAN`. |
| POST | `/api/v1/transfer-stok/{id}/setujui` | `DIAJUKAN -> DISETUJUI` (approval manajer/owner). **Belum ada mutasi apa pun** - barang belum bergerak. |
| POST | `/api/v1/transfer-stok/{id}/kirim` | `DISETUJUI -> DIKIRIM`: memposting `MutasiStok` `TRANSFER_KELUAR` per baris di gudang asal. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "transfer stok" - disertakan **sejak perancangan awal** sesuai remediasi `ALT-DEF-032`). |
| POST | `/api/v1/transfer-stok/{id}/terima` | `DIKIRIM|DITERIMA_SEBAGIAN -> DITERIMA_SEBAGIAN|DITERIMA`: memposting `TRANSFER_MASUK` **hanya untuk baris yang belum punya `mutasiMasukId`**. **Wajib header `Idempotency-Key`**. |
| POST | `/api/v1/transfer-stok/{id}/batalkan` | Batalkan. Ditolak `409 TRANSFER_SUDAH_DIKIRIM` dari status `DIKIRIM` - jalur yang benar adalah terima apa adanya lalu batalkan sisa dari `DITERIMA_SEBAGIAN`, sehingga selisih tercatat sebagai `WASTE`/`PENYESUAIAN` beralasan dan tidak menghilang. |

**Mengapa `kirim` dan `terima` memposting mutasi pada waktu BERBEDA:** menulis
`TRANSFER_KELUAR` dan `TRANSFER_MASUK` sekaligus akan membuat barang yang
sedang di jalan tampak sudah menjadi saldo gudang tujuan, sehingga gudang
tujuan bisa "memakai" barang yang belum tiba. Lihat state machine bagian 8 di
`docs/arsitektur/STATE-MACHINES.md`.

### 6.5 Waste (`ALT-PSD-014`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/waste` | Daftar `CatatanWaste`. Filter `?bahanId=`, `?alasanWasteId=`, `?dari=`/`?sampai=`. |
| POST | `/api/v1/waste` | Catat waste. `alasanWasteId` **wajib** (bukan teks bebas - bunyi harfiah `ALT-PSD-014`); `catatan` opsional dan MELENGKAPI, bukan menggantikan. Menghasilkan TEPAT SATU `MutasiStok` `WASTE` (`jumlah` negatif). **Wajib header `Idempotency-Key`** - ini posting mutasi stok. |

### 6.6 Stok opname (`ALT-PSD-016`/`ALT-PSD-017`)

State machine penuh: `docs/arsitektur/STATE-MACHINES.md` bagian 7.

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/stok-opname` | Daftar sesi opname. Filter `?gudangId=`, `?status=`. |
| POST | `/api/v1/stok-opname` | Buat sesi opname status `DRAF`. |
| POST | `/api/v1/stok-opname/{id}/mulai` | `DRAF -> SEDANG_DIHITUNG`: **membekukan `snapshotPada`** dan membuat baris `StokOpnameBaris` dengan `kuantitasSistem` = saldo saat itu, `kuantitasFisik = NULL`. |
| PUT | `/api/v1/stok-opname/{id}/baris` | Input hasil hitung fisik per `(bahan, lokasi)`. Hanya sah saat `SEDANG_DIHITUNG`. |
| POST | `/api/v1/stok-opname/{id}/kunci` | `SEDANG_DIHITUNG -> DIKUNCI`. Menolak `422 OPNAME_BARIS_BELUM_LENGKAP` bila ada baris ber-`kuantitasFisik` NULL. Sistem lalu otomatis memilih `MENUNGGU_PERSETUJUAN` atau `DISETUJUI` berdasarkan `ambangSelisihOpname`. |
| POST | `/api/v1/stok-opname/{id}/buka-ulang` | `DIKUNCI|MENUNGGU_PERSETUJUAN -> SEDANG_DIHITUNG` (approval supervisor, `alasan` wajib). `snapshotPada` **tidak** di-reset. |
| POST | `/api/v1/stok-opname/{id}/setujui` | `MENUNGGU_PERSETUJUAN -> DISETUJUI` (`ALT-PSD-017`). Menolak `403 PENYETUJU_TIDAK_BOLEH_PENGHITUNG` bila `penyetujuId == penghitungId`. |
| POST | `/api/v1/stok-opname/{id}/posting` | `DISETUJUI -> DIPOSTING`: memposting `MutasiStok` `KOREKSI_OPNAME` untuk tiap baris ber-`selisih != 0`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "posting opname"). **TERMINAL** - tidak dapat dibatalkan; koreksi lewat `/mutasi-stok/{id}/balik` atau opname baru. |
| POST | `/api/v1/stok-opname/{id}/batalkan` | Batalkan sesi (`alasan` wajib). Ditolak dari `DIPOSTING`. |

**CATATAN PENTING - endpoint lama yang DIHAPUS:**
`POST /api/v1/stok-opname/{id}/selesaikan` **tidak ada lagi**. Ia mengasumsikan
opname punya satu langkah "selesaikan" yang sekaligus mengunci, menyetujui, dan
memposting - persis penggabungan yang membuat `ALT-PSD-017` (approval selisih
signifikan) mustahil. Penggantinya adalah rangkaian
`/kunci` -> (`/setujui`) -> `/posting`.

**Catatan invariant yang BELUM ditegakkan di level data** (ADR-025, `ALT-DEF-029`):
sifat append-only `mutasi_stok`, kesepadanan mutasi pembalik, dan keunikan baris
saldo/opname agregat level-gudang seluruhnya bergantung pada
`prisma/migrations/manual/004_*.sql` dan `005_*.sql` yang **belum pernah
dieksekusi**. Larangan stok negatif, batas reservasi terhadap saldo fisik, dan
kesamaan `StokBahan.kuantitas` dengan `SUM(MutasiStok.jumlah)` adalah invariant
agregat yang **tidak akan pernah** menjadi DB-enforced meski migrasi dijalankan
- ketiganya guard transaksi level-aplikasi. Jangan menganggap aturan-aturan ini
terjamin.

## 7. Supplier & Pembelian (`packages/pembelian`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/supplier` | Daftar supplier. |
| POST | `/api/v1/supplier` | Buat supplier baru. |
| GET | `/api/v1/purchase-order` | Daftar PO (filter status/supplier/outlet). |
| POST | `/api/v1/purchase-order` | Buat PO draft. |
| POST | `/api/v1/purchase-order/{id}/ajukan` | DRAFT -> DIAJUKAN. |
| POST | `/api/v1/purchase-order/{id}/setujui` | DIAJUKAN -> DISETUJUI (approval manajer/owner). |
| POST | `/api/v1/purchase-order/{id}/kirim` | DISETUJUI -> DIKIRIM_SUPPLIER. |
| POST | `/api/v1/purchase-order/{id}/batalkan` | Batalkan PO (status DIBATALKAN, no hard-delete). |
| POST | `/api/v1/purchase-order/{id}/penerimaan` | Catat penerimaan barang (sebagian/penuh). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "penerimaan barang" di master spec). |
| POST | `/api/v1/penerimaan-barang/{id}/retur` | Ajukan retur pembelian. |

## 8. Meja & Reservasi (`packages/meja`, `packages/reservasi`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/area-meja` | Daftar area meja (Lantai 1, Outdoor, dst). |
| GET | `/api/v1/meja` | Daftar meja + status terkini. |
| PATCH | `/api/v1/meja/{mejaId}/status` | Ubah status meja (mis. PERLU_DIBERSIHKAN -> TERSEDIA). |
| POST | `/api/v1/meja/{mejaId}/sesi-qr` | Buat sesi QR baru untuk meja (`SESI_MEJA_QR`). |
| POST | `/api/v1/meja/{mejaId}/sesi-qr/{sesiId}/tutup` | Tutup sesi QR setelah tamu selesai. |
| GET | `/api/v1/reservasi` | Daftar reservasi (filter tanggal/status). |
| POST | `/api/v1/reservasi` | Buat reservasi baru. |
| POST | `/api/v1/reservasi/{id}/konfirmasi` | DIAJUKAN -> DIKONFIRMASI. |
| POST | `/api/v1/reservasi/{id}/tandai-tiba` | DIKONFIRMASI -> TIBA. |
| POST | `/api/v1/reservasi/{id}/batalkan` | Batalkan reservasi. |

## 9. Pesanan (`packages/pesanan`, `packages/kasir`, `packages/pelayan`)

**ALT-DEF-005 (correction-loop lanjutan):** endpoint di bawah diperbarui
mengikuti state machine 14-status penuh - lihat tabel transisi lengkap di
`docs/arsitektur/STATE-MACHINES.md` bagian "Pesanan" untuk aktor/guard/
side-effect/audit-event setiap transisi. `izin.kode` per baris mengacu ke
`prisma/seed/izin.seed.ts`/`docs/keamanan/PERMISSION-MATRIX.md`.

| Metode | Path | Deskripsi | izin.kode |
|---|---|---|---|
| GET | `/api/v1/pesanan` | Daftar pesanan (filter status/outlet/tanggal/meja). | `pesanan.riwayat.lihat` |
| POST | `/api/v1/pesanan` | Buat pesanan baru sebagai `DRAF` lalu langsung `DIKIRIM` (kanal KASIR/PELAYAN/QR_PELANGGAN). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) - mencakup dua kasus kritis dari master spec sekaligus: "checkout" (kanal KASIR/PELAYAN, transisi `DRAF -> DIKIRIM -> DITERIMA` otomatis) dan "submit pesanan QR" (kanal QR_PELANGGAN, transisi `DRAF -> DIKIRIM -> MENUNGGU_PERSETUJUAN` otomatis), karena keduanya memakai endpoint pembuatan pesanan yang sama - lihat guard per kanal di `STATE-MACHINES.md`. | `pesanan.buat` |
| GET | `/api/v1/pesanan/{id}` | Detail pesanan + item (dengan kolom `*Snapshot`, `ALT-DEF-016`) + riwayat status (enum, `ALT-DEF-005`). | `pesanan.riwayat.lihat` |
| POST | `/api/v1/pesanan/{id}/item` | Tambah item ke pesanan (mengisi seluruh kolom `*Snapshot` pada `ItemPesanan`/`ItemPesananModifier` saat itu juga, `ALT-DEF-016`). | `pesanan.item.tambah` |
| PATCH | `/api/v1/pesanan/{id}/item/{itemPesananId}` | Ubah kuantitas/catatan item. Sebelum `DIKONFIRMASI`: mengubah baris langsung. Sesudah `DIKONFIRMASI`: WAJIB tercatat sebagai baris baru `PesananPerubahan` (`jenisPerubahan = UBAH_KUANTITAS`), tidak menimpa `ItemPesanan` secara diam-diam (`ALT-PES-010`). | `pesanan.ubah` |
| POST | `/api/v1/pesanan/{id}/terima` | `MENUNGGU_PERSETUJUAN -> DITERIMA` (approval staf atas pesanan QR pelanggan). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "accept pesanan" di master spec). | `pesanan.terima` |
| POST | `/api/v1/pesanan/{id}/tolak` | `MENUNGGU_PERSETUJUAN -> DITOLAK`, body wajib `{ "alasan": string }` - menulis 1 baris `PesananPenolakan`. Pesanan yang ditolak boleh diedit lalu dikirim ulang lewat `POST /api/v1/pesanan/{id}/kirim-ulang` (`DITOLAK -> DIKIRIM`, lihat ADR-017 Keputusan 2). | `pesanan.tolak` |
| POST | `/api/v1/pesanan/{id}/kirim-ulang` | `DITOLAK -> DIKIRIM` - mengirim ulang pesanan yang sama (BUKAN pesanan baru) setelah dikoreksi. | `pesanan.buat` atau publik via token QR meja |
| POST | `/api/v1/pesanan/{id}/konfirmasi` | `DITERIMA -> DIKONFIRMASI` (langsung) atau `MENUNGGU_PEMBAYARAN -> DIKONFIRMASI` (setelah verifikasi pembayaran dimuka) - memicu pembuatan tiket dapur di transisi berikutnya. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "accept pesanan" di master spec). | `pesanan.status.ubah` |
| POST | `/api/v1/pesanan/{id}/kirim-dapur` | `DIKONFIRMASI -> DIKIRIM_KE_DAPUR` - membuat **satu atau lebih** `TiketDapur` - satu per stasiun tujuan per gelombang, ditentukan dengan membaca `AturanRoutingDapur` (kardinalitas 1:N sejak `ALT-DEF-006`/ADR-018, lihat bagian 10). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) - retry tanpa idempotensi akan membuat tiket dapur ganda di setiap stasiun. | `pesanan.status.ubah` |
| POST | `/api/v1/pesanan/{id}/tandai-disajikan` | `SIAP -> DISAJIKAN`. | `pesanan.status.ubah` |
| POST | `/api/v1/pesanan/{id}/selesaikan` | `DISAJIKAN -> SELESAI`, guard: total `Pembayaran` yang `DIKONFIRMASI` `>= totalAkhir`. | `pesanan.status.ubah` |
| POST | `/api/v1/pesanan/{id}/batalkan` | Batalkan pesanan - menulis 1 baris `PesananPembatalan` (`alasan` wajib). TIDAK BISA dipanggil dari status `SIAP`/`DISAJIKAN`/`SELESAI`/`DIBATALKAN`/`DIRETUR` (409 jika dicoba). Butuh approval supervisor jika status saat ini `DIKONFIRMASI`/`DIKIRIM_KE_DAPUR`/`SEDANG_DISIAPKAN` (lihat `PERMISSION-MATRIX.md`). | `pesanan.batalkan` |
| POST | `/api/v1/pesanan/{id}/retur` | `SELESAI -> DIRETUR`. **Model detail retur (`PesananRetur`, alokasi refund) adalah scope `ALT-PES-018`/`ALT-DEF-014`, BELUM DIKERJAKAN pada batch ini** - endpoint didokumentasikan di sini hanya untuk melengkapi kontrak transisi status. | `pesanan.retur.kelola` |
| GET | `/api/v1/pesanan/{id}/riwayat-status` | Riwayat transisi status (`PesananRiwayatStatus`, enum `StatusPesanan` di kedua kolom, `ALT-DEF-005`/`ALT-PES-009`). | `pesanan.riwayat.lihat` |
| GET | `/api/v1/pesanan/{id}/perubahan` | Riwayat perubahan pasca-konfirmasi (`PesananPerubahan`, `ALT-PES-010`). | `pesanan.riwayat.lihat` |
| POST | `/api/v1/pesanan/{id}/promo` | Terapkan kode promo/kupon ke pesanan - menulis `PromoPemakaian` + `PromoPemakaianBaris` + `PromoSnapshot` (ALT-DEF-009/ADR-026). Boleh dipanggil berkali-kali untuk promo berbeda (stacking) selama lolos resolusi konflik `stackingPolicy`/`conflictGroup`/`prioritas` (lihat ADR-026 Keputusan 1). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "penerapan promo" di master spec). | `promo.terapkan` (KASIR/PELAYAN, lihat `PERMISSION-MATRIX.md`) - ALT-DEF-034: kode ini menggantikan `promo.kelola` yang dipakai sebelum ADR-026 untuk aksi ini, `promo.kelola` sekarang HANYA untuk CRUD definisi promo (ALT-PRM-001). |

Contoh request `POST /api/v1/pesanan`:

```json
{
  "outletId": "01J9...OUTLET",
  "mejaId": "01J9...MEJA",
  "kanal": "PELAYAN",
  "item": [
    {
      "itemMenuId": "01J9...MENU",
      "varianMenuId": "01J9...V2",
      "kuantitas": 2,
      "catatan": "Tanpa bawang, pedas sedang",
      "modifierOpsiId": ["01J9...MOD1"]
    }
  ]
}
```

## 10. Dapur / KDS (`packages/dapur`)

Domain ini hanya membaca **read-contract** dari Pesanan (`@altora/pesanan/kontrak-dapur`);
endpoint di bawah hanya mengelola tiket dapur miliknya sendiri.

**ALT-DEF-006 (correction-loop lanjutan, lihat ADR-018):** seluruh endpoint di
bawah beroperasi **per-TIKET**, BUKAN per-pesanan. Satu `Pesanan` kini
menghasilkan **banyak** `TiketDapur` (satu per stasiun tujuan per gelombang),
sehingga:

- `{id}` pada path `/api/v1/dapur/tiket/{id}/...` adalah **`TiketDapur.id`**,
  bukan `Pesanan.id` - klien KDS TIDAK boleh mengasumsikan pemetaan 1:1 dan
  tidak boleh memakai `pesananId` sebagai kunci tiket.
- `GET /api/v1/dapur/tiket` dapat mengembalikan **lebih dari satu tiket dengan
  `pesananId` yang sama** (satu per stasiun/gelombang). Papan KDS per stasiun
  memfilter dengan `?stasiunDapurId=`; UI yang mengelompokkan per pesanan wajib
  menangani N tiket per pesanan (`ALT-DPR-003`).
- Menandai satu tiket `SIAP` **tidak** membuat `Pesanan` menjadi `SIAP` -
  `Pesanan.status` baru berubah setelah SELURUH tiket pesanan tsb `SIAP`/
  `DISAJIKAN` (guard agregat, lihat `STATE-MACHINES.md` bagian 5).
- Status tiket kini 8 nilai (`BARU`/`DITERIMA`/`DITAHAN`/`SEDANG_DISIAPKAN`/
  `SELESAI_SEBAGIAN`/`SIAP`/`DISAJIKAN`/`DIBATALKAN`) menggantikan 4 nilai lama.

| Metode | Path | Deskripsi | izin.kode |
|---|---|---|---|
| GET | `/api/v1/dapur/tiket` | Antrian tiket dapur aktif (real-time, polling/SSE). Query opsional: `stasiunDapurId` (papan KDS per stasiun, `ALT-DPR-014`), `pesananId`, `nomorGelombang`, `status`. **Dapat mengembalikan banyak tiket untuk satu `pesananId`.** | `dapur.tiket.lihat` |
| GET | `/api/v1/dapur/tiket/{id}` | Detail satu tiket dapur + barisnya (`{id}` = `TiketDapur.id`; baris adalah ref read-only ke `ItemPesanan`, `ALT-DPR-004`). | `dapur.tiket.lihat` |
| POST | `/api/v1/dapur/tiket/{id}/terima` | `BARU -> DITERIMA` (staf stasiun acknowledge tiket, belum mulai masak). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) - layar KDS multi-perangkat (`ALT-DPR-014`) dan reconnect (`ALT-DPR-015`) dapat mengirim ulang aksi yang sama. | `dapur.tiket.lihat` |
| POST | `/api/v1/dapur/tiket/{id}/mulai` | `DITERIMA -> SEDANG_DISIAPKAN` (atau `DITAHAN -> SEDANG_DISIAPKAN`) - set `mulaiDiprosesPada`, start timer `ALT-DPR-005`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) - mencegah `mulaiDiprosesPada` tertimpa oleh retry/duplikat dari layar KDS lain. | `dapur.tiket.lihat` |
| POST | `/api/v1/dapur/tiket/{id}/tahan` | `DITERIMA/SEDANG_DISIAPKAN -> DITAHAN` (`ALT-DPR-007`, `alasan` wajib; timer SLA berhenti). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `dapur.tiket.tahan` |
| POST | `/api/v1/dapur/tiket/{id}/lepas-tahan` | `DITAHAN -> DITERIMA` (belum masak) atau `DITAHAN -> SEDANG_DISIAPKAN` (langsung masak) - timer SLA dilanjutkan. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `dapur.tiket.tahan` |
| PATCH | `/api/v1/dapur/tiket/{id}/prioritas` | Tandai/lepas prioritas tiket agar tampil di atas antrian (`ALT-DPR-006`). Tidak mengubah `status`. | `dapur.tiket.prioritas` |
| POST | `/api/v1/dapur/tiket/{id}/baris/{barisId}/siap` | Tandai satu `TiketDapurBaris` `SIAP` (`ALT-DPR-008`) - tiket menjadi `SELESAI_SEBAGIAN` bila masih ada baris tersisa. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `dapur.baris.siap` |
| POST | `/api/v1/dapur/tiket/{id}/siap` | `SEDANG_DISIAPKAN/SELESAI_SEBAGIAN -> SIAP` (`ALT-DPR-009`) - guard: SELURUH baris tiket ini `SIAP`; set `siapPada`, notifikasi pelayan. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`) - mencegah notifikasi "pesanan siap" terkirim dobel. | `dapur.tiket.siap` |
| POST | `/api/v1/dapur/tiket/{id}/ambil` | `SIAP -> DISAJIKAN` (`ALT-DPR-010`) - `Pesanan` baru ikut `DISAJIKAN` bila SELURUH tiketnya `DISAJIKAN`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `dapur.tiket.ambil` |
| POST | `/api/v1/dapur/tiket/{id}/cetak-ulang` | Cetak ulang tiket fisik bila kertas macet/hilang (`ALT-DPR-012`); jumlah cetak ulang tercatat untuk audit. | `dapur.cetak-ulang` |
| GET | `/api/v1/dapur/stasiun` | Daftar stasiun dapur per outlet (`ALT-DPR-001`). | `dapur.tiket.lihat` |
| POST | `/api/v1/dapur/stasiun` | Buat stasiun dapur baru untuk outlet. | `dapur.stasiun.kelola` |
| GET | `/api/v1/dapur/routing` | Daftar `AturanRoutingDapur` per outlet (`ALT-DPR-002`) - aturan "item menu / kategori menu -> stasiun dapur". | `dapur.routing.kelola` |
| PUT | `/api/v1/dapur/routing` | Buat/ubah aturan routing. Body wajib memenuhi invariant **XOR**: tepat satu dari `itemMenuId`/`kategoriMenuId` diisi (validasi service-layer, lihat ADR-018 Keputusan 4) - pelanggaran mengembalikan `422 VALIDASI_GAGAL`. | `dapur.routing.kelola` |
| GET | `/api/v1/dapur/tiket/{id}/riwayat` | Riwayat transisi status tiket (`RiwayatStatusTiketDapur`, enum-typed `statusSebelumnya`/`statusBaru`). | `dapur.tiket.lihat` |

**Catatan cakupan:** endpoint pembuatan tiket TIDAK ada di daftar ini secara
sengaja - `TiketDapur` dibuat **internal** oleh event konfirmasi pesanan
(`POST /api/v1/pesanan/{id}/kirim-dapur`) yang membaca `AturanRoutingDapur`
untuk menentukan stasiun tujuan tiap baris (`ALT-DPR-003`, izin internal
`dapur.tiket.buat-otomatis`). Handler nyatanya adalah feature work di luar
scope batch ALT-DEF-006 - batch ini hanya memodelkan skema + kontrak.

## 11. Pembayaran & Kasir (`packages/kasir`, `packages/pembayaran`, `packages/qris`)

| Metode | Path | Deskripsi | Izin |
|---|---|---|---|
| POST | `/api/v1/giliran-kasir/buka` | Buka giliran kasir dengan modal awal (`ALT-KSR-001`). | `kasir.giliran.kelola` |
| POST | `/api/v1/giliran-kasir/{id}/tutup` | Tutup giliran, hitung kas fisik (`ALT-KSR-010`). | `kasir.giliran.kelola` |
| GET | `/api/v1/giliran-kasir/{id}/rekonsiliasi` | Bandingkan kas sistem vs kas fisik (`ALT-KSR-011`). | `kasir.rekonsiliasi.lihat` |
| POST | `/api/v1/giliran-kasir/{id}/verifikasi` | Supervisor verifikasi selisih kas (`ALT-KSR-012`). | `kasir.giliran.verifikasi` |
| POST | `/api/v1/giliran-kasir/{id}/buka-kembali` | Buka ulang giliran yang sudah ditutup untuk koreksi (`ALT-KSR-013`, wajib approval). | `kasir.giliran.buka-kembali` |
| GET | `/api/v1/metode-bayar` | Daftar metode pembayaran aktif. Scope final dan tertutup: `TUNAI`, `TRANSFER_MANUAL`, `QRIS_MANUAL`, `SALDO_TOKO` (`ALT-DEF-004`/ADR-019). | - |
| POST | `/api/v1/pembayaran` | Buat `Pembayaran` (`status = DRAF`) beserta baris `AlokasiPembayaran` dan `PembayaranMetodeBaris`-nya dalam **satu transaksi**. Body memuat `alokasi[] {pesananId, jumlah}` dan `metode[] {metodeBayarId, jumlah}`. Server MENOLAK (`422`) bila salah satu invariant jumlah tidak terpenuhi (lihat 11.1). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "pembayaran" di master spec). | `pembayaran.buat` |
| POST | `/api/v1/pembayaran/{id}/ajukan` | `DRAF -> MENUNGGU`. Untuk metode `QRIS_MANUAL`, respons memuat payload QRIS bernominal yang dihasilkan server dari konfigurasi AKTIF outlet (lihat 11.2). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `pembayaran.buat` |
| PUT | `/api/v1/pembayaran/{id}/alokasi` | Ganti seluruh set `AlokasiPembayaran` untuk pembayaran ini (`ALT-KSR-004`). **Hanya berlaku saat `status = DRAF`** - setelah `DIBAYAR`, perubahan alokasi HANYA lewat `/koreksi`. Invariant jumlah divalidasi ulang. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `pembayaran.alokasi.kelola` |
| POST | `/api/v1/pembayaran/{id}/tahan` | Tahan/parkir transaksi kasir untuk dilanjutkan nanti (`ALT-KSR-003`). | `pembayaran.tahan` |
| POST | `/api/v1/pembayaran/{id}/konfirmasi` | `MENUNGGU -> DIBAYAR` untuk metode `TUNAI`/`SALDO_TOKO` saja. Server MENOLAK bila pembayaran memuat baris metode `QRIS_MANUAL`/`TRANSFER_MANUAL` - keduanya wajib lewat `/konfirmasi-qris-manual`. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `pembayaran.buat` |
| POST | `/api/v1/pembayaran/{id}/klaim-sudah-bayar` | **Endpoint pelanggan** (token QR meja, tanpa `izin.kode`): `MENUNGGU -> MENUNGGU_KONFIRMASI`. Tombol "Sudah Membayar". **Endpoint ini TIDAK PERNAH menghasilkan `DIBAYAR`** dan tidak menulis `QrisKonfirmasiManual` - lihat 11.2. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | publik via token QR meja aktif |
| POST | `/api/v1/pembayaran/{id}/konfirmasi-qris-manual` | **Endpoint kasir**: `MENUNGGU_KONFIRMASI -> DIBAYAR` setelah kasir memverifikasi dana masuk di aplikasi merchant. Menulis `QrisKonfirmasiManual` dalam transaksi yang sama. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "konfirmasi QRIS" di master spec). | `pembayaran.qris.konfirmasi-manual` |
| POST | `/api/v1/pembayaran/{id}/koreksi` | Koreksi nominal salah input (`ALT-QRS-009`): menulis `KoreksiPembayaran` (`jumlahSebelum`/`jumlahSesudah`/`alasan`), status `DIBAYAR -> DIKOREKSI -> DIBAYAR`. Butuh approval supervisor. Append-only - tidak menimpa baris asal. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `transaksi.koreksi-pembayaran` |
| POST | `/api/v1/pembayaran/{id}/batalkan` | Batalkan pembayaran sebelum uang diterima (`DRAF`/`MENUNGGU`/`MENUNGGU_KONFIRMASI` saja). Ditolak bila `status = DIBAYAR`. | `transaksi.batalkan` |
| POST | `/api/v1/pembayaran/{id}/refund` | Ajukan/proses refund (butuh approval supervisor, `ALT-KSR-007`). Status menjadi `DIKEMBALIKAN_SEBAGIAN`/`DIKEMBALIKAN` sesuai agregat. **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "refund" di master spec). | `pembayaran.refund` |
| POST | `/api/v1/pembayaran/{id}/struk/cetak` | Cetak struk pembayaran (`ALT-KSR-008`). | `pembayaran.struk.cetak` |
| POST | `/api/v1/pembayaran/{id}/struk/cetak-ulang` | Cetak ulang struk (increment `jumlahCetakUlang`, `ALT-KSR-009`). | `pembayaran.struk.cetak-ulang` |

### 11.1 Invariant jumlah (`ALT-DEF-014`, ADR-019 Keputusan 4)

Setiap penulisan `Pembayaran` beserta barisnya WAJIB memenuhi, di dalam **satu
transaksi database**:

1. `SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah`
2. `SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah`

Prisma/Postgres tidak menegakkan agregat lintas-baris secara deklaratif -
validasi ini murni server-side dan tidak boleh dilewati jalur penulisan mana pun.
Pelanggaran menghasilkan `422 Unprocessable Entity` dan **membatalkan seluruh
transaksi** (tidak ada penulisan parsial).

**`Pembayaran` tidak lagi punya `pesananId`.** Relasi ke pesanan selalu lewat
`AlokasiPembayaran`, yang memungkinkan satu pembayaran melunasi beberapa pesanan
(group bill, `ALT-KSR-004`) DAN satu pesanan dilunasi beberapa pembayaran
(bayar bertahap, `ALT-KSR-005`). Endpoint yang dulu mengharapkan
`pembayaran.pesananId` harus membaca `pembayaran.alokasi[]`.

**Pembayaran campuran** (mis. tunai 50.000 + QRIS 30.000) adalah SATU
`Pembayaran` dengan DUA baris `metode[]` - **tidak ada** metode bernama
`CAMPURAN`, dan `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET` sudah dihapus seluruhnya
dari kontrak ini (`ALT-DEF-004`).

### 11.2 Alur QRIS manual dan guard tombol pelanggan (`ALT-QRS-006`/`ALT-QRS-007`, ADR-020 Keputusan 2)

1. Server menghitung total tagihan **server-side** dari pesanan yang dialokasikan.
   **Klien TIDAK PERNAH mengirimkan nominal final** - kalau boleh, pelanggan dapat
   membayar 1.000 untuk tagihan 100.000 dan QR yang dipajang akan "benar" menurut
   sistem.
2. Server menyisipkan nominal tsb ke payload QRIS statis outlet yang berstatus
   `AKTIF` (didekripsi runtime, lihat bagian 18) dan mengembalikan QR bernominal.
3. Pelanggan membayar lewat aplikasi banknya - **di luar sistem ini**.
4. Pelanggan menekan "Sudah Membayar" -> `POST /pembayaran/{id}/klaim-sudah-bayar`
   -> status **`MENUNGGU_KONFIRMASI` saja**.
5. Kasir memeriksa notifikasi masuk di aplikasi merchant.
6. Kasir mengonfirmasi -> `POST /pembayaran/{id}/konfirmasi-qris-manual` ->
   `QrisKonfirmasiManual` ditulis DAN status menjadi `DIBAYAR`.

> **Guard wajib:** endpoint langkah 4 dapat diakses pelanggan lewat token QR meja
> dan **tidak boleh punya jalur kode apa pun menuju `DIBAYAR`**. Hanya endpoint
> langkah 6, dengan izin `pembayaran.qris.konfirmasi-manual`, yang boleh
> menghasilkan `DIBAYAR`. Tanpa guard ini siapa pun yang memegang link QR meja
> dapat menandai tagihannya sendiri lunas.

### 11.3 Larangan integrasi (`ALT-QRS-010`, ADR-021 Keputusan 4)

**TIDAK ADA** dan tidak akan pernah ada di kontrak API ini:

- endpoint webhook/callback masuk dari payment gateway, bank, atau e-wallet;
- dependency SDK payment gateway apa pun;
- jalur kode yang mengubah `StatusPembayaran` menjadi `DIBAYAR` tanpa aktor
  manusia berizin;
- metode bayar kartu debit/kredit/e-wallet.

Ini **batasan arsitektur permanen**, bukan "belum diimplementasikan". Catatan pada
versi lama dokumen ini yang menyebut endpoint konfirmasi manual "dirancang agar
mudah diganti callback otomatis payment gateway pada rilis berikutnya" DIHAPUS
karena bertentangan langsung dengan `ALT-QRS-010`.

## 11b. Konfigurasi QRIS Outlet (`packages/qris`, `ALT-DEF-015`)

| Metode | Path | Deskripsi | Izin |
|---|---|---|---|
| GET | `/api/v1/outlet/{id}/qris` | Konfigurasi QRIS outlet (metadata + status). **Tidak pernah mengembalikan payload**, terenkripsi maupun plaintext - hanya `fingerprint`, `namaMerchant`, `kotaMerchant`, `status` (`ALT-SEC-007`). | `qris.konfigurasi.kelola` |
| PUT | `/api/v1/outlet/{id}/qris` | Buat/ubah konfigurasi QRIS (`ALT-QRS-001`). Server memvalidasi struktur EMV (`ALT-QRS-003`) dan CRC16 (`ALT-QRS-004`) sebelum menyimpan, lalu mengenkripsi payload (AES-256-GCM, kunci dari env/KMS) - payload mentah tidak pernah ditulis. Menulis `RiwayatKonfigurasiQris` (`DIBUAT`/`DIUBAH`). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `qris.konfigurasi.kelola` |
| POST | `/api/v1/outlet/{id}/qris/unggah` | Unggah gambar QR resmi bank/PJSP, payload di-decode dari gambar lalu divalidasi seperti di atas (`ALT-QRS-002`). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `qris.konfigurasi.kelola` |
| POST | `/api/v1/outlet/{id}/qris/{konfigurasiId}/aktifkan` | `-> AKTIF`. Menonaktifkan konfigurasi AKTIF sebelumnya **dalam transaksi yang sama** (satu AKTIF per outlet, lihat catatan constraint di bawah). Menulis `RiwayatKonfigurasiQris` (`DIAKTIFKAN` + `DINONAKTIFKAN`). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`). | `qris.konfigurasi.kelola` |
| POST | `/api/v1/outlet/{id}/qris/{konfigurasiId}/verifikasi` | Verifikasi konfigurasi oleh pihak kedua sebelum diaktifkan (`diverifikasiOlehId`/`diverifikasiPada`). Menulis `RiwayatKonfigurasiQris` (`DIVERIFIKASI`). | `qris.konfigurasi.kelola` |
| GET | `/api/v1/outlet/{id}/qris/riwayat` | Riwayat perubahan konfigurasi QRIS (`ALT-QRS-008`), append-only. `sebelum`/`sesudah` hanya memuat metadata - tidak pernah payload. | `qris.audit.lihat` |
| GET | `/api/v1/pembayaran/{id}/qris-nominal` | Hasilkan QR bernominal untuk pembayaran ini (`ALT-QRS-006`). Nominal SELALU dihitung server-side dari alokasi pesanan; **tidak ada parameter nominal yang diterima dari klien**. | `qris.generate` |

**Constraint "satu konfigurasi AKTIF per outlet" (`ALT-QRS-001`, ADR-021
Keputusan 3):** ini **partial unique index Postgres**
(`CREATE UNIQUE INDEX ... ON konfigurasi_qris ("tenantId", "outletId") WHERE
status = 'AKTIF'`) yang tidak dapat diekspresikan di DSL Prisma. SQL-nya ada di
`prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql`. **Index
tersebut BELUM PERNAH dijalankan** (tidak ada Postgres di environment ini,
`ALT-DEF-029`) - sampai saat itu aturan ini hanya dijaga guard level-aplikasi
dan **tidak aman terhadap race condition**. Jangan menganggapnya sudah terjamin.

## 12. Promo (`packages/promo`)

ALT-DEF-009/ALT-DEF-030 (ADR-026): domain promo dirancang ulang untuk
stacking, reward terpisah dari kondisi, jadwal, dan cakupan outlet. Endpoint
di bawah memetakan `PromoKondisi`/`PromoReward`/`PromoJadwal`/`PromoOutlet`
sebagai sub-resource `Promo`, dan membedakan **simulasi** (dry-run murni,
tidak menulis apa pun, boleh tanpa pesanan nyata) dari **evaluasi/penerapan**
(menulis `PromoPemakaian`, terikat pesanan nyata).

| Metode | Path | Deskripsi | Permission |
|---|---|---|---|
| GET | `/api/v1/promo` | Daftar promo (filter status/tanggal/outlet). | `promo.lihat` |
| POST | `/api/v1/promo` | Buat promo dasar (nama, periode berlaku). `ALT-PRM-001`. | `promo.kelola` |
| GET | `/api/v1/promo/{id}` | Detail satu promo (termasuk kondisi/reward/jadwal/outlet). | `promo.lihat` |
| PUT | `/api/v1/promo/{id}` | Ubah data dasar promo (nama, periode, status AKTIF/NONAKTIF). | `promo.kelola` |
| POST | `/api/v1/promo/{id}/aktifkan` | `NONAKTIF -> AKTIF`. | `promo.kelola` |
| POST | `/api/v1/promo/{id}/nonaktifkan` | `AKTIF -> NONAKTIF` (bukan hapus - promo yang sudah pernah dipakai tidak boleh dihapus, hanya dinonaktifkan, demi integritas `PromoSnapshot`/riwayat). | `promo.kelola` |
| PUT | `/api/v1/promo/{id}/kondisi` | Ganti seluruh baris `PromoKondisi` promo ini. `ALT-PRM-002`. | `promo.kondisi.kelola` |
| PUT | `/api/v1/promo/{id}/reward` | Ganti seluruh baris `PromoReward` promo ini. `ALT-PRM-003`. | `promo.reward.kelola` |
| PUT | `/api/v1/promo/{id}/jadwal` | Ganti seluruh baris `PromoJadwal` (hari/jam berlaku). `ALT-PRM-004`. | `promo.jadwal.kelola` |
| PUT | `/api/v1/promo/{id}/outlet` | Ganti cakupan outlet (`PromoOutlet`) - kosongkan array = berlaku semua outlet (lihat konvensi di `10-promo.md`). `ALT-PRM-005`. | `promo.outlet.kelola` |
| PUT | `/api/v1/promo/{id}/prioritas` | Ubah `stackingPolicy`/`conflictGroup`/`prioritas`. `ALT-PRM-007`/`ALT-PRM-008`. | `promo.prioritas.kelola` |
| PUT | `/api/v1/promo/{id}/kuota` | Ubah `maximumDiscount`/`usageQuota`/`usageLimitPerOrder`. `ALT-PRM-013`. | `promo.kuota.kelola` |
| PUT | `/api/v1/promo/{id}/batas-pelanggan` | Ubah `usageLimitPerCustomer`. `ALT-PRM-014`. | `promo.batas-pelanggan.kelola` |
| POST | `/api/v1/promo/{id}/kupon` | Terbitkan kupon untuk promo. | `promo.kelola` |
| POST | `/api/v1/promo/simulasi` | **Simulasi/dry-run** (`ALT-PRM-015`): hitung efek promo pada `inputKeranjang` bebas bentuk TANPA pesanan nyata dan TANPA efek samping - menulis `PromoSimulasi` (jejak audit hasil hitung), TIDAK menulis `PromoPemakaian`, TIDAK mengurangi kuota. `promoId` opsional (kosong = "promo mana saja yang berlaku"). | `promo.validasi` |
| POST | `/api/v1/promo/validasi` | **Evaluasi terhadap pesanan nyata** (`ALT-PRM-009`): validasi kode promo/kupon + jalankan resolusi konflik (ADR-026 Keputusan 1) terhadap isi `Pesanan` yang sudah ada. Sama seperti `/promo/simulasi`, TIDAK menulis `PromoPemakaian` - hanya mengembalikan hasil (promo mana yang lolos, kombinasi mana yang menang, estimasi potongan). Beda dari `/promo/simulasi`: WAJIB `pesananId` nyata (bukan keranjang bebas bentuk), dan mempertimbangkan kuota/batas-pelanggan pesanan itu sendiri. | `promo.validasi` |
| POST | `/api/v1/pesanan/{id}/promo` | **Penerapan/commit** - lihat bagian 7 (Pesanan) di atas untuk detail lengkap (Idempotency-Key wajib, menulis `PromoPemakaian`+`PromoPemakaianBaris`+`PromoSnapshot`). | `promo.terapkan` |

## 13. Pelanggan & Keanggotaan (`packages/keanggotaan`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/pelanggan` | Cari pelanggan (nomor telepon/nama). |
| POST | `/api/v1/pelanggan` | Daftarkan pelanggan baru. |
| GET | `/api/v1/pelanggan/{id}/keanggotaan` | Info tier & poin aktif. |
| POST | `/api/v1/pelanggan/{id}/keanggotaan` | Daftarkan ke program membership. |
| GET | `/api/v1/pelanggan/{id}/poin-riwayat` | Riwayat perolehan/penukaran poin. |
| POST | `/api/v1/keanggotaan/{id}/tukar-poin` | Tukar poin (jenis PENUKARAN). **Wajib header `Idempotency-Key`** (`ALT-PLT-018`, kasus "penukaran poin" di master spec). |

## 14. Karyawan & Absensi (`packages/karyawan`, `packages/absensi`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/karyawan` | Daftar karyawan. |
| POST | `/api/v1/karyawan` | Tambah karyawan baru. |
| GET | `/api/v1/jabatan` | Daftar jabatan. |
| GET | `/api/v1/jadwal-shift` | Daftar shift per outlet. |
| POST | `/api/v1/jadwal-shift/{id}/penugasan` | Tugaskan karyawan ke shift pada tanggal tertentu. |
| POST | `/api/v1/absensi/masuk` | Presensi masuk (QR/PIN/GPS). |
| POST | `/api/v1/absensi/{id}/pulang` | Presensi pulang. |
| POST | `/api/v1/absensi/koreksi` | Koreksi manual oleh supervisor (baris absensi baru, `MANUAL_SUPERVISOR`). |
| POST | `/api/v1/cuti-izin` | Ajukan cuti/izin. |
| POST | `/api/v1/cuti-izin/{id}/setujui` | Setujui/tolak pengajuan cuti. |

## 15. Keuangan Internal (`packages/keuangan`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/rekap-kas-harian` | Rekap kas per outlet per hari. |
| POST | `/api/v1/rekap-kas-harian/{id}/verifikasi` | DRAF -> DIVERIFIKASI. |
| GET | `/api/v1/kategori-biaya` | Daftar kategori biaya operasional. |
| GET | `/api/v1/biaya-operasional` | Daftar biaya operasional (filter status/kategori). |
| POST | `/api/v1/biaya-operasional` | Ajukan biaya operasional. |
| POST | `/api/v1/biaya-operasional/{id}/setujui` | DIAJUKAN -> DISETUJUI. |
| POST | `/api/v1/biaya-operasional/{id}/bayar` | DISETUJUI -> DIBAYAR. |

## 16. Analitik (`packages/analitik`, read-model saja)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/analitik/penjualan-harian` | `RM_PENJUALAN_HARIAN` per outlet/rentang tanggal. |
| GET | `/api/v1/analitik/penjualan-item-harian` | `RM_PENJUALAN_ITEM_HARIAN`, item terlaris. |
| GET | `/api/v1/analitik/stok-kritis` | `RM_STOK_KRITIS`, bahan mendekati/di bawah ambang minimum. |
| GET | `/api/v1/analitik/kinerja-karyawan-harian` | `RM_KINERJA_KARYAWAN_HARIAN`. |

Endpoint di atas **tidak pernah** mengagregasi langsung dari tabel transaksional saat
request masuk - semua dibaca dari tabel `RM_*` yang sudah pre-agregasi (lihat
`docs/database/14-analitik-read-model.md`).

## 17. Idempotency-Key, Outbox, dan Notifikasi (Infrastruktur Platform, `ALT-DEF-017`)

Status: **BARU (ALT-DEF-017)** - lihat `docs/engineering/DECISION-LOG.md` ADR-016
dan `docs/database/15-platform-infra.md` untuk model `IdempotencyKey`/
`DomainOutboxEvent`/`Notification`.

### 17.1 Header `Idempotency-Key` (`ALT-PLT-018`)

Endpoint kritis berikut **WAJIB** menerima dan menghormati header
`Idempotency-Key: <string>` yang disodorkan klien (lihat catatan inline di
setiap baris tabel endpoint pada dokumen ini untuk detail per-endpoint):

| Kasus (master spec) | Endpoint |
|---|---|
| checkout | `POST /api/v1/pesanan` (kanal KASIR/PELAYAN) |
| submit pesanan QR | `POST /api/v1/pesanan` (kanal QR_PELANGGAN) |
| accept pesanan | `POST /api/v1/pesanan/{id}/terima` (`MENUNGGU_PERSETUJUAN -> DITERIMA`, ALT-DEF-005) dan `POST /api/v1/pesanan/{id}/konfirmasi` (`DITERIMA`/`MENUNGGU_PEMBAYARAN -> DIKONFIRMASI`) |
| pembayaran | `POST /api/v1/pembayaran`, `POST /api/v1/pembayaran/{id}/ajukan`, `POST /api/v1/pembayaran/{id}/konfirmasi` |
| alokasi pembayaran (ALT-DEF-014) | `PUT /api/v1/pembayaran/{id}/alokasi` |
| klaim bayar oleh pelanggan (ALT-DEF-014) | `POST /api/v1/pembayaran/{id}/klaim-sudah-bayar` - retry dari perangkat pelanggan sangat mungkin (jaringan seluler); tanpa idempotensi akan menghasilkan notifikasi kasir ganda |
| konfirmasi QRIS | `POST /api/v1/pembayaran/{id}/konfirmasi-qris-manual` |
| koreksi pembayaran (ALT-DEF-014) | `POST /api/v1/pembayaran/{id}/koreksi` - retry tanpa idempotensi akan menulis baris `KoreksiPembayaran` ganda untuk satu koreksi yang sama |
| refund | `POST /api/v1/pembayaran/{id}/refund` |
| konfigurasi QRIS (ALT-DEF-015) | `PUT /api/v1/outlet/{id}/qris`, `POST /api/v1/outlet/{id}/qris/unggah`, `POST /api/v1/outlet/{id}/qris/{konfigurasiId}/aktifkan` - retry tanpa idempotensi dapat menghasilkan dua konfigurasi AKTIF sebelum partial index ADR-021 terpasang |
| penerimaan barang | `POST /api/v1/purchase-order/{id}/penerimaan` |
| posting mutasi stok | `POST /api/v1/mutasi-stok/penyesuaian` |
| posting opname | `POST /api/v1/stok-opname/{id}/posting` (menggantikan `/selesaikan` yang dihapus, `ALT-DEF-008`) |
| transfer stok (`ALT-DEF-032` DITUTUP) | `POST /api/v1/transfer-stok/{id}/kirim` (posting `TRANSFER_KELUAR`) dan `POST /api/v1/transfer-stok/{id}/terima` (posting `TRANSFER_MASUK`) - lihat bagian 6.4. Keduanya membawa requirement ini **sejak perancangan awal**, bukan ditambahkan belakangan |
| posting waste (`ALT-DEF-008`) | `POST /api/v1/waste` - retry tanpa idempotensi menggandakan mutasi `WASTE` dan nilai kerugian di laporan |
| pembalikan mutasi stok (`ALT-DEF-008`) | `POST /api/v1/mutasi-stok/{id}/balik` - retry akan membuat pembalik ganda dan menggandakan koreksi saldo |
| rekonsiliasi saldo (`ALT-DEF-008`) | `POST /api/v1/persediaan/rekonsiliasi` |
| reservasi stok (`ALT-DEF-008`) | `POST /api/v1/reservasi-stok` |
| penukaran poin | `POST /api/v1/keanggotaan/{id}/tukar-poin` |
| penerapan promo | `POST /api/v1/pesanan/{id}/promo` |

Perilaku wajib (lihat `docs/database/15-platform-infra.md` bagian
`IdempotencyKey` untuk alur lengkap): key yang sama + payload sama (hash
sama) selama permintaan pertama belum kadaluarsa -> kembalikan response
tersimpan tanpa efek ganda; key sama + payload BERBEDA (`requestHash`
berbeda) -> tolak `409 Conflict`; key sama + permintaan pertama masih
`MEMPROSES` -> tolak/tunda, jangan proses paralel. Tidak menyertakan header
ini pada endpoint di atas adalah kesalahan implementasi klien - server
TETAP wajib menegakkan keamanan (validasi bisnis, dsb) meski header tidak
ada, tetapi tanpa header ini klien kehilangan jaminan anti-duplikasi.

### 17.2 Notifikasi in-app (`ALT-PLT-020`)

Status: **internal Altora SAJA - TIDAK ADA WhatsApp/SMS/push eksternal**
(lihat ADR-016 Keputusan 4). Endpoint berikut belum ada scaffold sebelumnya di
dokumen ini (bukan duplikat dari pass sebelumnya).

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/notifikasi` | Daftar `Notification` milik pengguna yang sedang login (join implisit penggunaId = pengguna aktif ATAU broadcast sesuai `outletId`+peran, lihat catatan targeting `penggunaId` nullable di `docs/database/15-platform-infra.md`), diurutkan terbaru dulu, filter opsional `?belumDibaca=true` (`dibacaPada IS NULL`). |
| POST | `/api/v1/notifikasi/{id}/read` | Tandai satu `Notification` sebagai dibaca (`dibacaPada = now()`). Idempotent secara alami - memanggil ulang pada notifikasi yang sudah dibaca tidak mengubah apa pun selain kemungkinan `dibacaPada` (kebijakan: pertahankan waktu baca PERTAMA, jangan timpa dengan `now()` pada panggilan kedua). |

### 17.3 Transactional outbox (`ALT-PLT-019`)

`DomainOutboxEvent` adalah infrastruktur **internal** (tidak diekspos sebagai
endpoint publik) - relay worker (proses terpisah, belum diimplementasikan di
batch ini) yang membaca baris `TERTUNDA`/`GAGAL` dan mem-publish ke
konsumen. Lihat daftar `eventType` lengkap dan rasional pola outbox di
`docs/database/15-platform-infra.md` bagian `DomainOutboxEvent` dan
`docs/engineering/DECISION-LOG.md` ADR-016 Keputusan 3.

## 18. Status implementasi

Semua endpoint pada dokumen ini berstatus **BELUM DIKERJAKAN** kecuali dicatat lain
di `docs/engineering/TRACEABILITY-MATRIX.md` dan `docs/engineering/MASTER-CHECKLIST.md`.
