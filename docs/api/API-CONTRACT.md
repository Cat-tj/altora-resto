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

| Metode | Path | Deskripsi |
|---|---|---|
| POST | `/api/v1/auth/masuk` | Login email + kata sandi (staf kantor/manajer). |
| POST | `/api/v1/auth/masuk-pin` | Login PIN cepat di perangkat kasir (kasir/pelayan). |
| POST | `/api/v1/auth/keluar` | Mencabut sesi aktif (`Sesi.dicabutPada`). |
| GET | `/api/v1/auth/sesi-saya` | Info sesi & pengguna yang sedang login. |
| POST | `/api/v1/auth/perangkat/aktivasi` | Aktivasi perangkat KDS/kasir/printer via `kodeAktivasi`. |

Contoh request `POST /api/v1/auth/masuk-pin`:

```json
{ "outletId": "01J9...OUTLET", "perangkatId": "01J9...PRK", "pin": "482913" }
```

## 3. Platform (Tenant, Outlet, Pengguna, Peran)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/tenant/saya` | Info tenant aktif. |
| PATCH | `/api/v1/tenant/saya` | Ubah pengaturan tenant. |
| GET | `/api/v1/outlet` | Daftar outlet milik tenant. |
| POST | `/api/v1/outlet` | Buat outlet baru. |
| GET | `/api/v1/outlet/{outletId}` | Detail outlet. |
| PATCH | `/api/v1/outlet/{outletId}` | Ubah outlet (nama, status, zona waktu). |
| GET | `/api/v1/pengguna` | Daftar pengguna (staf). |
| POST | `/api/v1/pengguna` | Undang/buat pengguna baru. |
| PATCH | `/api/v1/pengguna/{penggunaId}` | Ubah data pengguna / status aktif-nonaktif. |
| POST | `/api/v1/pengguna/{penggunaId}/peran` | Tetapkan peran ke pengguna. |
| GET | `/api/v1/peran` | Daftar peran & permission (lihat PERMISSION-MATRIX). |
| POST | `/api/v1/peran` | Buat peran kustom. |
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

## 5. Resep & Bahan (`packages/resep`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/bahan` | Daftar bahan baku. |
| POST | `/api/v1/bahan` | Buat bahan baku baru. |
| GET | `/api/v1/satuan` | Daftar satuan (gram, ml, pcs, dst). |
| GET | `/api/v1/resep/{itemMenuId}` | Ambil resep aktif untuk item menu. |
| PUT | `/api/v1/resep/{itemMenuId}` | Set/ubah resep (daftar bahan + jumlah per porsi). |

## 6. Persediaan (`packages/persediaan`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/gudang` | Daftar gudang per outlet. |
| GET | `/api/v1/stok-bahan` | Saldo stok bahan per gudang (derived dari mutasi). |
| GET | `/api/v1/mutasi-stok` | Riwayat mutasi stok (append-only, filter jenis/tanggal). |
| POST | `/api/v1/mutasi-stok/penyesuaian` | Catat mutasi penyesuaian manual (butuh alasan). |
| POST | `/api/v1/mutasi-stok/{mutasiId}/balik` | Buat mutasi pembalik (koreksi, no hard-delete). |
| GET | `/api/v1/stok-opname` | Daftar sesi stok opname. |
| POST | `/api/v1/stok-opname` | Jadwalkan opname baru. |
| POST | `/api/v1/stok-opname/{id}/mulai` | Mulai perhitungan fisik (DIRENCANAKAN -> BERLANGSUNG). |
| POST | `/api/v1/stok-opname/{id}/baris` | Input hasil hitung fisik per bahan. |
| POST | `/api/v1/stok-opname/{id}/selesaikan` | Selesaikan opname, hasilkan mutasi penyesuaian. |

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
| POST | `/api/v1/purchase-order/{id}/penerimaan` | Catat penerimaan barang (sebagian/penuh). |
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

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/pesanan` | Daftar pesanan (filter status/outlet/tanggal/meja). |
| POST | `/api/v1/pesanan` | Buat pesanan baru (kanal KASIR/PELAYAN/QR_PELANGGAN). |
| GET | `/api/v1/pesanan/{id}` | Detail pesanan + item + riwayat status. |
| POST | `/api/v1/pesanan/{id}/item` | Tambah item ke pesanan. |
| PATCH | `/api/v1/pesanan/{id}/item/{itemPesananId}` | Ubah kuantitas/catatan item (sebelum dikirim dapur). |
| POST | `/api/v1/pesanan/{id}/konfirmasi` | BARU -> DIKONFIRMASI (memicu pembuatan tiket dapur). |
| POST | `/api/v1/pesanan/{id}/tandai-disajikan` | SIAP_DISAJIKAN -> DISAJIKAN. |
| POST | `/api/v1/pesanan/{id}/batalkan` | Batalkan pesanan (butuh approval supervisor jika sudah DIPROSES_DAPUR). |
| POST | `/api/v1/pesanan/{id}/promo` | Terapkan kode promo/kupon ke pesanan. |

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

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/dapur/tiket` | Antrian tiket dapur aktif (real-time, polling/SSE). |
| GET | `/api/v1/dapur/tiket/{id}` | Detail tiket dapur + baris (read-only ref ke item pesanan). |
| POST | `/api/v1/dapur/tiket/{id}/mulai` | MASUK_ANTRIAN -> DIPROSES. |
| POST | `/api/v1/dapur/tiket/{id}/baris/{barisId}/siap` | Tandai satu baris SIAP. |
| POST | `/api/v1/dapur/tiket/{id}/siap` | Semua baris selesai -> tiket SIAP. |
| POST | `/api/v1/dapur/tiket/{id}/ambil` | SIAP -> DIAMBIL_PELAYAN. |
| GET | `/api/v1/dapur/stasiun` | Daftar stasiun dapur per outlet. |

## 11. Pembayaran & Kasir (`packages/kasir`, `packages/pembayaran`, `packages/qris`)

| Metode | Path | Deskripsi |
|---|---|---|
| POST | `/api/v1/giliran-kasir/buka` | Buka giliran kasir dengan modal awal. |
| POST | `/api/v1/giliran-kasir/{id}/tutup` | Tutup giliran, hitung kas fisik. |
| POST | `/api/v1/giliran-kasir/{id}/verifikasi` | Supervisor verifikasi selisih kas. |
| GET | `/api/v1/metode-bayar` | Daftar metode pembayaran aktif. |
| POST | `/api/v1/pembayaran` | Inisiasi pembayaran untuk pesanan (mendukung split bill). |
| POST | `/api/v1/pembayaran/{id}/konfirmasi-qris-manual` | Kasir konfirmasi QRIS manual (lihat catatan mode manual). |
| POST | `/api/v1/pembayaran/{id}/konfirmasi` | Tandai pembayaran DIKONFIRMASI (tunai/kartu). |
| POST | `/api/v1/pembayaran/{id}/batalkan` | Batalkan pembayaran sebelum selesai. |
| POST | `/api/v1/pembayaran/{id}/refund` | Ajukan/proses refund (butuh approval supervisor). |
| POST | `/api/v1/pembayaran/{id}/struk/cetak-ulang` | Cetak ulang struk (increment `jumlahCetakUlang`). |

Catatan QRIS: rilis awal memakai **mode manual** - kasir memverifikasi notifikasi masuk
di aplikasi bank/QRIS lalu menandai pembayaran lunas lewat
`/pembayaran/{id}/konfirmasi-qris-manual`. Endpoint ini dirancang agar mudah diganti
dengan callback otomatis dari payment gateway QRIS pada rilis berikutnya tanpa
mengubah bentuk resource `Pembayaran`.

## 12. Promo (`packages/promo`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/promo` | Daftar promo (filter status/tanggal). |
| POST | `/api/v1/promo` | Buat promo baru + aturan. |
| POST | `/api/v1/promo/{id}/kupon` | Terbitkan kupon untuk promo. |
| POST | `/api/v1/promo/validasi` | Validasi kode promo/kupon terhadap isi pesanan (dry-run, tanpa efek samping). |

## 13. Pelanggan & Keanggotaan (`packages/keanggotaan`)

| Metode | Path | Deskripsi |
|---|---|---|
| GET | `/api/v1/pelanggan` | Cari pelanggan (nomor telepon/nama). |
| POST | `/api/v1/pelanggan` | Daftarkan pelanggan baru. |
| GET | `/api/v1/pelanggan/{id}/keanggotaan` | Info tier & poin aktif. |
| POST | `/api/v1/pelanggan/{id}/keanggotaan` | Daftarkan ke program membership. |
| GET | `/api/v1/pelanggan/{id}/poin-riwayat` | Riwayat perolehan/penukaran poin. |
| POST | `/api/v1/keanggotaan/{id}/tukar-poin` | Tukar poin (jenis PENUKARAN). |

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

## 17. Status implementasi

Semua endpoint pada dokumen ini berstatus **BELUM DIKERJAKAN** kecuali dicatat lain
di `docs/engineering/TRACEABILITY-MATRIX.md` dan `docs/engineering/MASTER-CHECKLIST.md`.
