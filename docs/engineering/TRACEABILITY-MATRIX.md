# Matriks Traceability - Altora Resto

Status dokumen: **DRAF AWAL — DIKETAHUI TIDAK SINKRON (lihat DEFECT-LEDGER.md
ALT-DEF-020)**. Menghubungkan setiap requirement (`docs/engineering/MASTER-CHECKLIST.md`)
ke artefak konkret: entitas ERD, endpoint API, rute UI, permission, dan bukti uji.
Kolom "Bukti Uji" merujuk ke `docs/engineering/RELEASE-EVIDENCE.md`; kosong berarti
belum ada bukti karena belum diimplementasikan.

**Peringatan sinkronisasi:** dokumen ini ditulis sebelum `MASTER-CHECKLIST.md`
diperluas ke 249 requirement (commit `b3559c3` + `ALT-PLT-026`). Baris di bawah
hanya mencakup sebagian kecil requirement (~64 referensi `ALT-`) dan sebagian
memakai prefix domain yang **sudah tidak ada** (`ALT-OTR-xxx` — lihat tabel
rekonsiliasi ID di `docs/engineering/DEFECT-LEDGER.md`, prefix yang benar adalah
`ALT-PLT-008` s.d. `ALT-PLT-012` untuk Otorisasi). Sinkronisasi penuh untuk 249
requirement adalah pekerjaan terpisah yang lebih besar dari pass ini (dicatat
sebagai `ALT-DEF-020`, status `DIKONFIRMASI`, belum `DITUTUP`) — jangan menganggap
baris manapun di bawah ini sebagai representasi lengkap/akurat dari scope saat
ini sampai pekerjaan sinkronisasi tersebut selesai.

**Diperbaiki pada batch ALT-DEF-004/ALT-DEF-014/ALT-DEF-015:** lima baris yang
memakai prefix phantom `ALT-PBY-001` s.d. `ALT-PBY-005` (tidak ada di
`MASTER-CHECKLIST.md` sama sekali - lihat tabel rekonsiliasi ID di
`DEFECT-LEDGER.md`) DIHAPUS, dan baris `ALT-KSR-002` yang **salah petakan** ke
verifikasi selisih kas (itu `ALT-KSR-012`) DIKOREKSI. Domain Kasir
(`ALT-KSR-001` s.d. `ALT-KSR-013`) dan QRIS (`ALT-QRS-001` s.d. `ALT-QRS-010`)
kini lengkap dan terverifikasi baris-per-baris terhadap `MASTER-CHECKLIST.md`.
Domain lain masih belum disinkronkan (`ALT-DEF-020`).

**Diperbaiki pada batch ALT-DEF-007 (Resep & Produksi):** baris `ALT-RSP-002`
sebelumnya **salah petakan** — ia diisi `MutasiStok` (jenis `KELUAR_PENJUALAN`)
dengan aktor "sistem", padahal `ALT-RSP-002` di `MASTER-CHECKLIST.md` adalah
**"Versi resep (VersiResep)"**; isi yang tercantum sesungguhnya milik
`ALT-RSP-011` (pemotongan stok otomatis). Dikoreksi, dan seluruh 13 requirement
`ALT-RSP-001` s.d. `ALT-RSP-013` kini lengkap serta terverifikasi baris-per-baris
terhadap `MASTER-CHECKLIST.md`. Kolom "Entitas ERD" beberapa baris **sengaja
berbeda** dari kolom Entitas di `MASTER-CHECKLIST.md` (`ResepVarian`,
`Subresep`, `FaktorPenyusutan`, `RencanaProduksiHarian` — model yang ADR-022
putuskan untuk TIDAK dibuat); yang perlu dikoreksi adalah checklist-nya, dicatat
sebagai bagian `ALT-DEF-034`.

| Requirement ID | Entitas ERD | Endpoint API | Rute UI | Permission | Status | Bukti Uji |
|---|---|---|---|---|---|---|
| ALT-PLT-001 | `Tenant`, `Pengguna`, `KeanggotaanTenant` | `POST /api/v1/tenant` (belum ada di kontrak v1, TODO tambah) | `/register` (belum ada di ROUTE-MAP, TODO tambah) | OWNER (pembuat) | BELUM DIKERJAKAN | - |
| ALT-PLT-002 | `Pengguna`, `KeanggotaanTenant` (diperbarui ALT-DEF-001: `Pengguna` global, `KeanggotaanTenant.isOwner=true` dibuat saat registrasi, bukan lagi `Pengguna.tenantId`) | `POST /api/v1/tenant/registrasi` | `/daftar` | OWNER (pembuat) | BELUM DIKERJAKAN | - |
| ALT-PLT-003 | `KeanggotaanTenant` (diperbarui ALT-DEF-001: satu `Pengguna` bisa punya banyak baris `KeanggotaanTenant` aktif) | `GET /api/v1/tenant-saya` | `/pilih-tenant` | platform.keanggotaan.lihat | BELUM DIKERJAKAN | - |
| ALT-PLT-004 | `Pengguna`, `Sesi`, `Perangkat`, `PinOutlet` (diperbarui ALT-DEF-013: PIN sekarang model `PinOutlet` scoped `KeanggotaanTenant`+`Outlet`, bukan lagi field di `Pengguna`) | `POST /api/v1/auth/masuk-pin` | `/masuk-pin` | publik (perangkat outlet) | BELUM DIKERJAKAN | - |
| ALT-PLT-005 | `Perangkat` | `GET /api/v1/perangkat`, `POST /api/v1/auth/perangkat/aktivasi` | `/pengaturan/perangkat` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-PLT-006 | `AuditLog` | `GET /api/v1/audit-log` | (belum ada rute dedicated, TODO tambah ke ROUTE-MAP) | OWNER (lihat), MANAJER (lihat, L) | BELUM DIKERJAKAN | - |
| ALT-PLT-007 | `KeanggotaanOutlet` (diperbarui ALT-DEF-001: menggantikan `PenggunaOutlet`, sekarang scoped ke `KeanggotaanTenant` dengan composite-FK tenant-outlet - lihat ADR-011) | `GET /api/v1/pengguna/{id}/akses-outlet` | `/pengaturan/tim` | platform.akses-outlet.kelola | BELUM DIKERJAKAN | - |
| ALT-PLT-008 | `Peran` (diperbarui ALT-DEF-002: `permissions Json` dihapus, ditambah `isSystem`/`deskripsi`) | `GET/POST /api/v1/peran` | `/pengaturan/peran` | platform.peran.kelola | BELUM DIKERJAKAN | - |
| ALT-PLT-009 | `Izin` (baru, ALT-DEF-002: katalog kode izin atomik, unik global) | `GET /api/v1/izin` | `/pengaturan/peran` | platform.izin.lihat | BELUM DIKERJAKAN | - |
| ALT-PLT-010 | `PeranIzin` (baru, ALT-DEF-002: menggantikan `Peran.permissions` Json) | `PUT /api/v1/peran/{id}/izin` | `/pengaturan/peran` | platform.peran.kelola | BELUM DIKERJAKAN | - |
| ALT-PLT-011 | `BatasIzin` (baru, ALT-DEF-002) | `PUT /api/v1/peran/{id}/batas-izin` | `/pengaturan/peran` | platform.izin.kelola | BELUM DIKERJAKAN | - |
| ALT-PLT-012 | `PermintaanPersetujuan` (baru, ALT-DEF-002) | `POST /api/v1/persetujuan/{id}/putuskan` | `/persetujuan` | platform.persetujuan.putuskan | BELUM DIKERJAKAN | - |
| ALT-MNU-001 | `KategoriMenu`, `ItemMenu` | `GET/POST /api/v1/kategori-menu`, `/item-menu` | `/resto/{outletSlug}/menu` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-MNU-002 | `VarianMenu` | `POST /api/v1/item-menu/{id}/varian` | `/resto/{outletSlug}/menu` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-MNU-003 | `ModifierGrup`, `ModifierOpsi`, `ItemModifierGrup` | `GET/POST /api/v1/modifier-grup` | `/resto/{outletSlug}/menu` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-MNU-004 | `HargaItemOutlet` | `POST /api/v1/item-menu/{id}/harga-outlet` | `/resto/{outletSlug}/menu` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-RSP-001 | `Resep` (kontainer bersasaran XOR), `VersiResep`, `KomponenResep`, `Bahan`, `Satuan` | `GET/POST /api/v1/resep`, `GET /api/v1/resep/{resepId}` | `/resto/{outletSlug}/menu/{id}/resep` | `resep.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-002 | `VersiResep`, `ItemPesanan.resepVersiId` (FK sungguhan sejak ALT-DEF-007) | `GET/POST /api/v1/resep/{resepId}/versi`, `POST /api/v1/resep/{resepId}/aktifkan-versi` | `/resto/{outletSlug}/menu/{id}/resep` | `resep.versi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-003 | `Resep` dengan sasaran `varianMenuId` (BUKAN model `ResepVarian` - lihat ADR-022 Keputusan 2) | `POST /api/v1/resep` (body `varianMenuId`) | `/resto/{outletSlug}/menu/{id}/resep` | `resep.varian.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-004 | `KomponenResepModifier`, enum `AksiKomponenModifier` | `PUT /api/v1/versi-resep/{versiResepId}/modifier` | `/resto/{outletSlug}/menu/{id}/resep` | `resep.modifier.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-005 | `Bahan.jenis = BAHAN_SETENGAH_JADI` + `Resep.bahanHasilId` (BUKAN model `Subresep` - lihat ADR-022 Keputusan 1) | `POST /api/v1/resep` (body `bahanHasilId`), `GET /api/v1/bahan?jenis=` | `/resto/{outletSlug}/resep/subresep` | `resep.subresep.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-006 | `VersiResep.jumlahHasil`, `VersiResep.satuanHasilId` | `POST /api/v1/resep/{resepId}/versi` | `/resto/{outletSlug}/resep/subresep` | `resep.subresep.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-007 | `VersiResep.penyusutanPersen` (BUKAN model `FaktorPenyusutan`; ikut ter-versi bersama resepnya) | `POST /api/v1/resep/{resepId}/versi` | `/resto/{outletSlug}/resep/subresep` | `resep.penyusutan.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-008 | `KonversiSatuan` | `GET/POST /api/v1/konversi-satuan` | `/resto/{outletSlug}/resep/satuan` | `resep.konversi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-009 | `ProsesProduksi` (rencana+realisasi dalam SATU baris ber-state-machine, menggantikan `RencanaProduksiHarian`) | `GET/POST /api/v1/produksi`, `POST /api/v1/produksi/{id}/mulai` | `/resto/{outletSlug}/resep/produksi` | `resep.produksi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-010 | `ProsesProduksiBaris`, `BatchProduksi` | `POST /api/v1/produksi/{id}/selesaikan` (wajib `Idempotency-Key`), `GET /api/v1/batch-produksi` | `/resto/{outletSlug}/resep/produksi` | `resep.produksi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-007) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-007) |
| ALT-RSP-011 | `MutasiStok` jenis `PEMAKAIAN_RESEP` (nama enum ditetapkan ADR-023 K2) dihitung dari `KomponenResep` versi yang tercatat di `ItemPesanan.resepVersiId` | internal (event pesanan selesai) | - | sistem (SENGAJA tanpa kode izin - lihat PERMISSION-MATRIX 1a) | BELUM DIKERJAKAN - scope `ALT-DEF-008` (persediaan), seam didokumentasikan ADR-022 Keputusan 8 | - |
| ALT-RSP-012 | `VersiResep.snapshotBiaya` (Int rupiah, snapshot saat versi diaktifkan) | `GET /api/v1/resep/{resepId}/hpp` | `/resto/{outletSlug}/menu/{id}/resep` | `resep.hpp.lihat` | BELUM DIKERJAKAN - kolom sudah ada, perhitungannya butuh model harga bahan terbaru yang BELUM ADA | - |
| ALT-RSP-013 | `MutasiStok` pembalik (ADR-006), besaran dihitung dari `ItemPesanan.resepVersiId` | internal (event pesanan dibatalkan) | - | `resep.pemakaian.reversal` | BELUM DIKERJAKAN - scope `ALT-DEF-008`, seam didokumentasikan ADR-022 Keputusan 8 | - |
| ALT-PSD-001 | `Bahan` (`@@unique([tenantId, kodeSku])`) | `GET/POST /api/v1/bahan` | `/resto/{outletSlug}/persediaan/bahan` | `persediaan.bahan.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-002 | `Satuan`, `KonversiSatuan` | `GET/POST /api/v1/satuan` | `/resto/{outletSlug}/persediaan/satuan` | `persediaan.satuan.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-003 | `Gudang` (composite-FK outlet, `@@unique([outletId, id])` BARU) | `GET/POST /api/v1/gudang` | `/resto/{outletSlug}/persediaan/gudang` | `persediaan.gudang.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-004 | `LokasiStok` (BARU), `StokBahan.lokasiStokId` (BARU) | `GET/POST /api/v1/gudang/{gudangId}/lokasi` | `/resto/{outletSlug}/persediaan/gudang` | `persediaan.lokasi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-005 | `MutasiStok` sebagai ledger append-only (tanpa `updatedAt`/status/soft-delete; enum diperluas 12 nilai) | `GET /api/v1/mutasi-stok`, `GET /api/v1/mutasi-stok/{id}` | `/resto/{outletSlug}/persediaan/mutasi` | `persediaan.mutasi.lihat` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-006 | `MutasiStok.dibalikOlehId` (self-relasi `@unique`) | `POST /api/v1/mutasi-stok/{id}/balik` (wajib `Idempotency-Key`) | `/resto/{outletSlug}/persediaan/mutasi` | `persediaan.mutasi.balik` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-007 | `StokBahan` (alias spec `SaldoStok`, ADR-023 K3) + `direkonsiliasiPada`/`kuantitasDireservasi` | `GET /api/v1/stok-bahan`, `POST /api/v1/persediaan/rekonsiliasi` | `/resto/{outletSlug}/persediaan/stok` | `persediaan.saldo.lihat` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-008 | `ReservasiStok` (BARU), enum `StatusReservasiStok` | `POST /api/v1/reservasi-stok` (wajib `Idempotency-Key`) | - | `persediaan.reservasi.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-009 | `ReservasiStok.status = DILEPAS`, `dilepasPada` | internal (event pesanan) + `POST /api/v1/reservasi-stok/{id}/lepas` untuk koreksi manual | - | `persediaan.reservasi.lepas` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-010 | `BatchStok` (BARU) + seam FK 1:1 ke `BatchProduksi` (ADR-024 K3) | `GET/POST /api/v1/batch-stok` | `/resto/{outletSlug}/persediaan/batch` | `persediaan.batch.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-011 | `BatchStok.tanggalKedaluwarsa`/`createdAt` + indeks FEFO/FIFO; `PengaturanPersediaanOutlet.metodeAlokasiBatch` | internal (pemakaian resep/penjualan) | - | sistem (SENGAJA tanpa kode izin - alokasi batch adalah algoritma, bukan keputusan otorisasi; lihat PERMISSION-MATRIX 1a dan ALT-DEF-034) | BELUM DIKERJAKAN - skema membawa seluruh kolom yang dibutuhkan (diverifikasi kolom per kolom, ADR-025 K3); algoritmanya adalah kode | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-012 | `TransferStok` + `TransferStokBaris` (BARU), composite-FK outlet-level ke `Gudang(outletId, id)` | `POST /api/v1/transfer-stok`, `/ajukan`, `/setujui`, `/kirim` (wajib `Idempotency-Key`) | `/resto/{outletSlug}/persediaan/transfer` | `persediaan.transfer.kelola`, `persediaan.transfer.setujui` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) - MENUTUP ALT-DEF-032 | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-013 | `TransferStokBaris.jumlahDiterima`/`mutasiMasukId`, status `DITERIMA_SEBAGIAN`/`DITERIMA` | `POST /api/v1/transfer-stok/{id}/terima` (wajib `Idempotency-Key`) | `/resto/{outletSlug}/persediaan/transfer` | `persediaan.transfer.terima` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-014 | `CatatanWaste` (BARU, `alasanWasteId` WAJIB + `mutasiStokId` WAJIB `@unique`) | `GET/POST /api/v1/waste` (wajib `Idempotency-Key`) | `/resto/{outletSlug}/persediaan/waste` | `persediaan.waste.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-015 | `AlasanWaste` (BARU, `@@unique([tenantId, kode])`, nonaktif lewat `status`) | `GET/POST/PUT /api/v1/alasan-waste` | `/resto/{outletSlug}/persediaan/waste` | `persediaan.alasan-waste.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-016 | `StokOpname` state machine 7 status + `snapshotPada`; `StokOpnameBaris.kuantitasFisik` kini NULLABLE | `POST /api/v1/stok-opname`, `/mulai`, `PUT /baris`, `/kunci`, `/posting` (wajib `Idempotency-Key`) | `/resto/{outletSlug}/persediaan/opname` | `persediaan.opname.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-017 | `StokOpname.penyetujuId`/`disetujuiPada`, status `MENUNGGU_PERSETUJUAN`/`DISETUJUI`; ambang `PengaturanPersediaanOutlet.ambangSelisihOpname` | `POST /api/v1/stok-opname/{id}/setujui` | `/resto/{outletSlug}/persediaan/opname` | `persediaan.opname.setujui` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
| ALT-PSD-018 | `KebijakanPemesananUlang` (BARU, per OUTLET, `stokMinimum` Decimal) | `GET/PUT /api/v1/bahan/{bahanId}/reorder-policy` | `/resto/{outletSlug}/persediaan/bahan/{id}` | `persediaan.reorder.kelola` | BELUM DIKERJAKAN (schema+ADR SIAP, ALT-DEF-008) | `docs/engineering/RELEASE-EVIDENCE.md` (batch ALT-DEF-008) |
**Diperbaiki pada batch ALT-DEF-008 (Persediaan):** keempat baris `ALT-PSD-001`
s.d. `ALT-PSD-004` yang ada sebelumnya **seluruhnya salah petakan** — verifikasi
baris-per-baris terhadap `MASTER-CHECKLIST.md` menunjukkan isinya adalah baris
ringkasan domain generik (`StokBahan`/`MutasiStok`/`StokOpname`/`RmStokKritis`),
bukan keempat requirement yang sesungguhnya (`ALT-PSD-001` = bahan baku,
`ALT-PSD-002` = satuan dasar, `ALT-PSD-003` = gudang outlet, `ALT-PSD-004` =
lokasi penyimpanan). Kolom Permission keempatnya juga berisi **nama PERAN**
(`GUDANG`, `MANAJER`) alih-alih kode izin, tidak seperti seluruh baris domain
lain. Keempatnya diganti, dan 14 requirement `ALT-PSD-005` s.d. `ALT-PSD-018`
yang **tidak pernah punya baris sama sekali** ditambahkan — domain `ALT-PSD`
kini lengkap 18 baris dan terverifikasi baris-per-baris.

| ALT-PMB-001 | `Supplier` | `GET/POST /api/v1/supplier` | `/resto/{outletSlug}/supplier` | PEMBELIAN | BELUM DIKERJAKAN | - |
| ALT-PMB-002 | `PurchaseOrder` | `POST /api/v1/purchase-order/*` | `/resto/{outletSlug}/pembelian` | PEMBELIAN/MANAJER (approval) | BELUM DIKERJAKAN | - |
| ALT-PMB-003 | `PenerimaanBarang`, `PenerimaanBarangBaris` | `POST /api/v1/purchase-order/{id}/penerimaan` | `/resto/{outletSlug}/pembelian/{id}` | PEMBELIAN/GUDANG | BELUM DIKERJAKAN | - |
| ALT-PMB-004 | `ReturPembelian` | `POST /api/v1/penerimaan-barang/{id}/retur` | `/resto/{outletSlug}/pembelian/{id}` | PEMBELIAN | BELUM DIKERJAKAN | - |
| ALT-MJA-001 | `AreaMeja`, `Meja` | `GET /api/v1/area-meja`, `/meja` | `/resto/{outletSlug}/meja` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-MJA-002 | `SesiMejaQr` | `POST /api/v1/meja/{id}/sesi-qr` | `/resto/{outletSlug}/meja/{id}/qr` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-RSV-001 | `Reservasi` | `POST /api/v1/reservasi/*` | `/resto/{outletSlug}/reservasi`, `/reservasi/{outletSlug}` | PELAYAN (staf), publik (buat) | BELUM DIKERJAKAN | - |
| ALT-PSN-001 (baca `ALT-PES-001`/`ALT-PES-002`/`ALT-PES-003` - lihat catatan prefix ALT-DEF-020) | `Pesanan` (14-status penuh, `ALT-DEF-005`) | `POST /api/v1/pesanan` | `/resto/{outletSlug}/pesanan/baru`, `/pesan/{token}` | PELAYAN/KASIR (`pesanan.buat`), publik (QR) | BELUM DIKERJAKAN | - |
| ALT-PSN-002 (baca `ALT-PES-008`) | `Pesanan.status` (enum `StatusPesanan` 14 nilai) | `POST /api/v1/pesanan/{id}/terima`, `/tolak`, `/konfirmasi`, `/kirim-dapur`, `/tandai-disajikan`, `/selesaikan`, `/retur` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN/KASIR/SUPERVISOR (`pesanan.terima`/`pesanan.tolak`/`pesanan.status.ubah`, lihat `STATE-MACHINES.md`) | BELUM DIKERJAKAN | - |
| ALT-PSN-003 (baca `ALT-PES-006`/`ALT-PES-007`) | `ItemPesanan.*Snapshot`, `ItemPesananModifier.*Snapshot` (`ALT-DEF-016`, menggantikan `hargaSatuan`/`hargaTambahan` sebagai sumber kebenaran histori) | `POST /api/v1/pesanan/{id}/item` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN (`pesanan.item.tambah`) | BELUM DIKERJAKAN | - |
| ALT-PSN-004 (baca `ALT-PES-009`/`ALT-PES-010`) | `PesananRiwayatStatus` (kolom enum `StatusPesanan`, `ALT-DEF-005`), `PesananPerubahan` (baru, `ALT-PES-010`) | tercatat otomatis di setiap transisi/perubahan | `/resto/{outletSlug}/pesanan/{id}` | - (read-only, `pesanan.riwayat.lihat`) | BELUM DIKERJAKAN | - |
| ALT-PSN-005 (baca `ALT-PES-011`) | `PesananPembatalan` (baru, `ALT-PES-011`), `Pesanan.status = DIBATALKAN`, `dibatalkanPada` | `POST /api/v1/pesanan/{id}/batalkan` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN/KASIR (`pesanan.batalkan`), SUPERVISOR (approval jika `DIKONFIRMASI`/`DIKIRIM_KE_DAPUR`/`SEDANG_DISIAPKAN`) | BELUM DIKERJAKAN | - |
| ALT-PSN-006 (baca `ALT-PES-011`, penolakan) | `PesananPenolakan` (baru, `ALT-PES-011`-adjacent, lihat ADR-017) | `POST /api/v1/pesanan/{id}/tolak`, `POST /api/v1/pesanan/{id}/kirim-ulang` | `/resto/{outletSlug}/pesanan/{id}` | KASIR/PELAYAN (`pesanan.tolak`), pemesan asli (kirim ulang) | BELUM DIKERJAKAN | - |
| ALT-DPR-001 | `StasiunDapur` (composite-FK `(tenantId, outletId)`, `ALT-DEF-010`) | `GET/POST /api/v1/dapur/stasiun` | `/resto/{outletSlug}/dapur/pengaturan` | `dapur.stasiun.kelola` | BELUM DIKERJAKAN | - |
| ALT-DPR-002 | `AturanRoutingDapur` (BARU, `ALT-DEF-006`/ADR-018 Keputusan 4 - `itemMenuId`/`kategoriMenuId` XOR sebagai invariant level-aplikasi) | `GET/PUT /api/v1/dapur/routing` | `/resto/{outletSlug}/dapur/pengaturan` | `dapur.routing.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-003 | `TiketDapur` (`pesananId` TIDAK LAGI `@unique`; `@@unique([pesananId, stasiunDapurId, nomorGelombang])`; `Pesanan.tiketDapur` kini `TiketDapur[]` - `ALT-DEF-006`/ADR-018 Keputusan 1) | internal saat `POST /api/v1/pesanan/{id}/kirim-dapur` (membaca `AturanRoutingDapur`) | `/resto/{outletSlug}/dapur` | `dapur.tiket.buat-otomatis` (internal) | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-004 | `TiketDapurBaris` (`itemPesananId` TETAP `@unique` - ADR-018 Keputusan 2) | `GET /api/v1/dapur/tiket/{id}` | `/resto/{outletSlug}/dapur` | `dapur.tiket.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-005 | `TiketDapur.masukPada`/`mulaiDiprosesPada`/`siapPada` | `GET /api/v1/dapur/tiket` | `/resto/{outletSlug}/dapur` | `dapur.tiket.lihat` | BELUM DIKERJAKAN | - |
| ALT-DPR-006 | `TiketDapur` (field prioritas belum ada di skema - TODO batch berikutnya) | `PATCH /api/v1/dapur/tiket/{id}/prioritas` | `/resto/{outletSlug}/dapur` | `dapur.tiket.prioritas` | BELUM DIKERJAKAN | - |
| ALT-DPR-007 | `StatusTiketDapur.DITAHAN` (BARU, `ALT-DEF-006`/ADR-018 Keputusan 5) | `POST /api/v1/dapur/tiket/{id}/tahan`, `/lepas-tahan` | `/resto/{outletSlug}/dapur` | `dapur.tiket.tahan` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-008 | `StatusMasakBaris` + `StatusTiketDapur.SELESAI_SEBAGIAN` (BARU, ADR-018 Keputusan 5/6 - dua enum terpisah yang berelasi) | `POST /api/v1/dapur/tiket/{id}/baris/{barisId}/siap` | `/resto/{outletSlug}/dapur` | `dapur.baris.siap` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-009 | `StatusTiketDapur.SIAP`, `TiketDapur.siapPada` | `POST /api/v1/dapur/tiket/{id}/siap` | `/resto/{outletSlug}/dapur` | `dapur.tiket.siap` | BELUM DIKERJAKAN | - |
| ALT-DPR-010 | `StatusTiketDapur.DISAJIKAN` (menggantikan `DIAMBIL_PELAYAN`, ADR-018 Keputusan 5); `Pesanan.status` berubah hanya bila SELURUH tiket `DISAJIKAN` | `POST /api/v1/dapur/tiket/{id}/ambil` | `/resto/{outletSlug}/dapur` | `dapur.tiket.ambil` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-DPR-011 | `TiketDapur` (cetak saat status `BARU`, bukan lagi `MASUK_ANTRIAN`) | `POST /api/v1/dapur/tiket/{id}/cetak` | `/resto/{outletSlug}/dapur` | `dapur.cetak` | BELUM DIKERJAKAN | - |
| ALT-DPR-012 | `TiketDapur` (penghitung cetak ulang belum ada di skema - TODO batch berikutnya) | `POST /api/v1/dapur/tiket/{id}/cetak-ulang` | `/resto/{outletSlug}/dapur` | `dapur.cetak-ulang` | BELUM DIKERJAKAN | - |
| ALT-DPR-014 | `TiketDapur` (papan KDS per stasiun difilter `?stasiunDapurId=`; N tiket per pesanan) | `GET /api/v1/dapur/tiket` (SSE/polling) | `/resto/{outletSlug}/dapur` | `dapur.tiket.lihat` | BELUM DIKERJAKAN | - |
| ALT-DEF-006 (defect) | `RiwayatStatusTiketDapur` (BARU, enum-typed history mengikuti pola `PesananRiwayatStatus`), `GelombangDapur` (BARU, ADR-018 Keputusan 3) | `GET /api/v1/dapur/tiket/{id}/riwayat` | `/resto/{outletSlug}/dapur` | `dapur.tiket.lihat` | SIAP_DIVERIFIKASI (skema + kontrak; handler di luar scope) | `RELEASE-EVIDENCE.md` - pass ALT-DEF-006 (`dapur-kds-multi-stasiun.test.ts`) |
| ALT-KSR-001 | `GiliranKasir` | `POST /api/v1/giliran-kasir/buka` | `/resto/{outletSlug}/kasir/giliran` | `kasir.giliran.kelola` | BELUM DIKERJAKAN | - |
| ALT-KSR-002 | `Pembayaran` (BARU: tanpa `pesananId`), `MetodeBayar`, `AlokasiPembayaran` | `POST /api/v1/pembayaran`, `/{id}/ajukan`, `/{id}/konfirmasi` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.buat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`pembayaran-alokasi-metode-constraints.test.ts`) |
| ALT-KSR-003 | `Pembayaran.status = DRAF` (transaksi ditahan/diparkir) | `POST /api/v1/pembayaran/{id}/tahan` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.tahan` | BELUM DIKERJAKAN | - |
| ALT-KSR-004 | `AlokasiPembayaran` (BARU, `@@unique([pembayaranId, pesananId])` - ADR-019) | `PUT /api/v1/pembayaran/{id}/alokasi` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.alokasi.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`pembayaran-alokasi-metode-constraints.test.ts`) |
| ALT-KSR-005 | `AlokasiPembayaran` (satu pesanan -> banyak `Pembayaran`; pelunasan = agregat alokasi berstatus `DIBAYAR`) | `POST /api/v1/pembayaran` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.buat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`pembayaran-alokasi-metode-constraints.test.ts`) |
| ALT-KSR-006 | `PesananRetur` (BELUM ADA di skema - scope `ALT-PES-018`, batch berikutnya) | `POST /api/v1/pesanan/{id}/retur` | `/resto/{outletSlug}/kasir/retur` | `pesanan.retur.kelola` | BELUM DIKERJAKAN | - |
| ALT-KSR-007 | `PembayaranRefund` (kini `tenantId` + composite-FK ke `Pembayaran`) | `POST /api/v1/pembayaran/{id}/refund` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.refund` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-KSR-008 | `Struk` (per PERISTIWA PEMBAYARAN, bukan per pesanan - ADR-019 Keputusan 5) | `POST /api/v1/pembayaran/{id}/struk/cetak` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.struk.cetak` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-KSR-009 | `Struk.jumlahCetakUlang` | `POST /api/v1/pembayaran/{id}/struk/cetak-ulang` | `/resto/{outletSlug}/kasir/riwayat` | `pembayaran.struk.cetak-ulang` | BELUM DIKERJAKAN | - |
| ALT-KSR-010 | `GiliranKasir.status = DITUTUP_MENUNGGU_VERIFIKASI` | `POST /api/v1/giliran-kasir/{id}/tutup` | `/resto/{outletSlug}/kasir/giliran` | `kasir.giliran.kelola` | BELUM DIKERJAKAN | - |
| ALT-KSR-011 | `GiliranKasir.modalAkhirDihitung`/`modalAkhirSistem`, `RekapKasHarian` | `GET /api/v1/giliran-kasir/{id}/rekonsiliasi` | `/resto/{outletSlug}/kasir/giliran` | `kasir.rekonsiliasi.lihat` | BELUM DIKERJAKAN | - |
| ALT-KSR-012 | `GiliranKasir.status = DITUTUP_SELESAI`, `RekapKasHarian.diverifikasiOlehId` | `POST /api/v1/giliran-kasir/{id}/verifikasi` | `/resto/{outletSlug}/kasir/giliran` | `kasir.giliran.verifikasi` | BELUM DIKERJAKAN | - |
| ALT-KSR-013 | `GiliranKasir` (reopen, wajib approval) | `POST /api/v1/giliran-kasir/{id}/buka-kembali` | `/resto/{outletSlug}/kasir/giliran` | `kasir.giliran.buka-kembali` | BELUM DIKERJAKAN | - |
| ALT-QRS-001 | `KonfigurasiQris` (BARU, ADR-021). Aturan "satu AKTIF per outlet" = partial unique index Postgres di `prisma/migrations/manual/001_...sql`, BUKAN constraint Prisma | `GET/PUT /api/v1/outlet/{id}/qris`, `POST /{konfigurasiId}/aktifkan` | `/pengaturan/qris` | `qris.konfigurasi.kelola` | SKEMA SELESAI, INDEX & HANDLER BELUM DIJALANKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`qris-konfigurasi-constraints.test.ts`) |
| ALT-QRS-002 | `KonfigurasiQris.payloadTerenkripsi` (gambar QR di-decode jadi payload, tidak disimpan sebagai blob - ADR-021) | `POST /api/v1/outlet/{id}/qris/unggah` | `/pengaturan/qris` | `qris.konfigurasi.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-QRS-003 | `KonfigurasiQris` (parser EMV adalah KODE, bukan skema - belum dikerjakan) | internal (parser saat unggah) | - | `qris.validasi` | BELUM DIKERJAKAN | - |
| ALT-QRS-004 | `KonfigurasiQris` (validator CRC16 adalah KODE, bukan skema - belum dikerjakan) | internal (validator CRC) | - | `qris.validasi` | BELUM DIKERJAKAN | - |
| ALT-QRS-005 | `KonfigurasiQris.payloadTerenkripsi` + `fingerprint` (AES-256-GCM level-aplikasi, kunci dari env/KMS - ADR-021 Keputusan 2) | internal (enkripsi at rest) | - | `qris.konfigurasi.kelola` | SKEMA SELESAI, ENKRIPSI NYATA BELUM DIIMPLEMENTASIKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`qris-konfigurasi-constraints.test.ts`) |
| ALT-QRS-006 | `KonfigurasiQris` (nominal disisipkan runtime, SELALU dihitung server-side; klien tidak pernah mengirimkannya) | `GET /api/v1/pembayaran/{id}/qris-nominal` | `/resto/{outletSlug}/kasir/pembayaran` | `qris.generate` | BELUM DIKERJAKAN | - |
| ALT-QRS-007 | `QrisKonfirmasiManual` (kini `tenantId` + composite-FK ke `Pembayaran`); `StatusPembayaran.MENUNGGU_KONFIRMASI -> DIBAYAR` | `POST /api/v1/pembayaran/{id}/konfirmasi-qris-manual` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.qris.konfirmasi-manual` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-QRS-008 | `RiwayatKonfigurasiQris` (BARU, append-only; `sebelum`/`sesudah` METADATA saja - tidak pernah payload) | `GET /api/v1/outlet/{id}/qris/riwayat` | `/pengaturan/qris` | `qris.audit.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`qris-konfigurasi-constraints.test.ts`) |
| ALT-QRS-009 | `KoreksiPembayaran` (BARU, append-only - tidak menghapus `QrisKonfirmasiManual` asal) | `POST /api/v1/pembayaran/{id}/koreksi` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.qris.koreksi`, `transaksi.koreksi-pembayaran` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-QRS-010 | - (larangan integrasi: TIDAK ADA webhook/gateway/bank API/e-wallet di skema maupun kontrak) | - (tidak ada endpoint, dan itu justru kriteria terimanya) | - | - | SKEMA & KONTRAK SELESAI | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 (`pembayaran-alokasi-metode-constraints.test.ts` - assertion NEGATIF bahwa `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET`/`CAMPURAN` hilang) |
| ALT-SEC-007 | `KonfigurasiQris.payloadTerenkripsi` | - | - | - (bukan izin - lihat catatan ALT-DEF-034 di `PERMISSION-MATRIX.md`) | SKEMA SELESAI, ENKRIPSI NYATA BELUM DIIMPLEMENTASIKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-DEF-004 (defect) | enum `KodeMetodeBayar` = PERSIS `TUNAI`/`TRANSFER_MANUAL`/`QRIS_MANUAL`/`SALDO_TOKO` | - | - | - | SIAP_DIVERIFIKASI (skema + dokumen + test) | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-DEF-014 (defect) | `AlokasiPembayaran` + `KoreksiPembayaran` (BARU); `Pembayaran.pesananId` DIHAPUS | `POST /api/v1/pembayaran`, `PUT /{id}/alokasi`, `POST /{id}/koreksi` | `/resto/{outletSlug}/kasir/pembayaran` | `pembayaran.buat`, `pembayaran.alokasi.kelola` | SIAP_DIVERIFIKASI (komponen alokasi; `PesananSplit` masih terbuka) | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
| ALT-DEF-015 (defect) | `KonfigurasiQris` + `RiwayatKonfigurasiQris` (BARU) | `GET/PUT /api/v1/outlet/{id}/qris` | `/pengaturan/qris` | `qris.konfigurasi.kelola` | SIAP_DIVERIFIKASI (skema + dokumen + test; partial index belum dijalankan) | `RELEASE-EVIDENCE.md` - pass ALT-DEF-004/014/015 |
Baris `ALT-PRM-*` di bawah DITULIS ULANG pada batch `ALT-DEF-009` (ADR-026) -
versi sebelumnya hanya punya 3 baris (`ALT-PRM-001`-`ALT-PRM-003`) yang sudah
tidak sinkron dengan 17 baris `ALT-PRM-001`-`ALT-PRM-017` yang sebenarnya ada
di `MASTER-CHECKLIST.md`, dan kolom Entitas-nya merujuk `PromoAturan` (nama
lama, sudah di-rename `PromoKondisi`) serta melewatkan `PromoReward`/
`PromoJadwal`/`PromoOutlet`/`PromoPemakaianBaris`/`PromoSnapshot`/
`PromoSimulasi` sama sekali - correction yang sama seperti pola
`ALT-DEF-036`. `PromoKanal` (nama entitas yang disebut `MASTER-CHECKLIST.md`
`ALT-PRM-006`) TIDAK dibuat sebagai model tersendiri di skema - cakupan
kanal diimplementasikan sebagai `PromoKondisi.jenisSyarat = KANAL_TERTENTU`
(ADR-026 Keputusan 3), jadi kolom Entitas di bawah dikoreksi ke
`PromoKondisi` untuk baris itu.

| ALT-PRM-001 | `Promo` | `GET/POST /api/v1/promo` | `/resto/{outletSlug}/promo` | promo.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-002 | `PromoKondisi` | `PUT /api/v1/promo/{id}/kondisi` | `/resto/{outletSlug}/promo/{id}` | promo.kondisi.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-003 | `PromoReward` | `PUT /api/v1/promo/{id}/reward` | `/resto/{outletSlug}/promo/{id}` | promo.reward.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-004 | `PromoJadwal` | `PUT /api/v1/promo/{id}/jadwal` | `/resto/{outletSlug}/promo/{id}` | promo.jadwal.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-005 | `PromoOutlet` | `PUT /api/v1/promo/{id}/outlet` | `/resto/{outletSlug}/promo/{id}` | promo.outlet.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-006 | `PromoKondisi` (dikoreksi dari `PromoKanal` - kanal diimplementasikan sebagai `jenisSyarat = KANAL_TERTENTU`, bukan model terpisah, lihat ADR-026 Keputusan 3) | `PUT /api/v1/promo/{id}/kanal` | `/resto/{outletSlug}/promo/{id}` | promo.kanal.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-007 | `Promo` (`prioritas`) | `PUT /api/v1/promo/{id}/prioritas` | `/resto/{outletSlug}/promo/{id}` | promo.prioritas.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-008 | `PromoPemakaian` (`pesananId` tidak lagi unik) | `POST /api/v1/pesanan/{id}/promo` | `/kasir/pesanan/{id}` | promo.terapkan | BELUM DIKERJAKAN | - |
| ALT-PRM-009 | `Promo` (`stackingPolicy = AMBIL_DISKON_TERBAIK`) | `POST /api/v1/promo/validasi` | `/kasir/pesanan/{id}` | promo.validasi | BELUM DIKERJAKAN | - |
| ALT-PRM-010 | `PromoReward` (`berlakuKelipatan`), `Promo` (`repeatable`) | `POST /api/v1/promo/validasi` | `/kasir/pesanan/{id}` | promo.validasi | BELUM DIKERJAKAN | - |
| ALT-PRM-011 | `PromoReward` | `POST /api/v1/promo/validasi` | `/kasir/pesanan/{id}` | promo.validasi | BELUM DIKERJAKAN | - |
| ALT-PRM-012 | `PromoReward` (`modifierIkutGratis`) | `PUT /api/v1/promo/{id}/reward` | `/resto/{outletSlug}/promo/{id}` | promo.reward.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-013 | `Promo` (`usageQuota`), `PromoPemakaian` | `PUT /api/v1/promo/{id}/kuota` | `/resto/{outletSlug}/promo/{id}` | promo.kuota.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-014 | `Promo` (`usageLimitPerCustomer`), `PromoPemakaian` | `PUT /api/v1/promo/{id}/batas-pelanggan` | `/resto/{outletSlug}/promo/{id}` | promo.batas-pelanggan.kelola | BELUM DIKERJAKAN | - |
| ALT-PRM-015 | `PromoSimulasi` | `POST /api/v1/promo/simulasi` | `/kasir/pesanan/{id}` | promo.validasi | BELUM DIKERJAKAN | - |
| ALT-PRM-016 | `PromoPemakaian`, `PromoSnapshot` | `POST /api/v1/pesanan/{id}/promo` | `/kasir/pesanan/{id}` | promo.terapkan | BELUM DIKERJAKAN | - |
| ALT-PRM-017 | `PromoPemakaian` (`status = DIRETUR`) | internal (event retur pesanan) | - | - (aktor sistem, ALT-DEF-034) | BELUM DIKERJAKAN | - |
**Diperbaiki pada batch keanggotaan (ALT-DEF-018/ALT-DEF-023/ALT-DEF-039,
ADR-027):** tiga baris `ALT-PLG-001` s.d. `ALT-PLG-003` yang ada sebelumnya
DIHAPUS - prefix domain `ALT-PLG` **tidak pernah ada** di `MASTER-CHECKLIST.md`
(prefix nyata untuk domain Pelanggan & Keanggotaan adalah `ALT-MBR`, sama pola
`ALT-DEF-020`/tabel rekonsiliasi ID di `DEFECT-LEDGER.md`); ketiga baris itu
juga hanya mencakup 3 dari 13 requirement lama, memakai kolom Permission
berisi **nama PERAN** (`PELAYAN`) alih-alih kode izin (pola sama masalah yang
ditemukan `ALT-DEF-008` pada `ALT-PSD-001` s.d. `004`), dan mengacu model
`TierMembership` yang sudah di-rename `TierKeanggotaan` (ADR-027 Keputusan 1).
Domain `ALT-MBR` kini lengkap 19 baris dan terverifikasi baris-per-baris
terhadap `MASTER-CHECKLIST.md`.

| ALT-MBR-001 | `Pelanggan` (`status`/`saldoTokoCache` baru, ADR-027) | `GET/POST /api/v1/pelanggan` | `/pelanggan` | `pelanggan.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 (`keanggotaan-ledger-constraints.test.ts`) |
| ALT-MBR-002 | `Pelanggan` (dedup - kandidat duplikat adalah QUERY, bukan tabel `KandidatDuplikatPelanggan` tersendiri pada batch ini) | `GET /api/v1/pelanggan/duplikat` | `/pelanggan/duplikat` | `pelanggan.duplikat.lihat` | BELUM DIKERJAKAN | - |
| ALT-MBR-003 | `RiwayatGabungPelanggan` (BARU), `Pelanggan.status = DIGABUNGKAN` (BUKAN hard-delete, ADR-006/ADR-027 Keputusan 4) | `POST /api/v1/pelanggan/merge` (wajib `Idempotency-Key`) | `/pelanggan/duplikat` | `pelanggan.merge` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-004 | `PersetujuanPelanggan` (BARU, bukan `ConsentPelanggan` - lihat ADR-027 Keputusan 6) | `PUT /api/v1/pelanggan/{id}/consent` | `/pelanggan/{id}` | `pelanggan.consent.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-005 | `TierKeanggotaan` (rename dari `TierMembership`, ADR-027 Keputusan 1) | `GET/POST /api/v1/tier-keanggotaan` | `/pengaturan/membership` | `keanggotaan.tier.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-006 | `Keanggotaan` (`tenantId` BARU - sebelumnya TIDAK ADA sama sekali, `@@unique([tenantId, pelangganId])`) | `POST /api/v1/pelanggan/{id}/keanggotaan` | `/pelanggan/{id}` | `keanggotaan.daftar` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-007 | `PoinRiwayat` (diperkeras: `tenantId` BARU, `dibalikOlehId`, `kadaluarsaPada`, `dicatatOlehId` - ADR-027 Keputusan 2) | `GET /api/v1/pelanggan/{id}/poin-riwayat` | `/pelanggan/{id}` | `keanggotaan.poin.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-008 | `Keanggotaan.poinAktif`/`poinKumulatif` (komentar CACHE eksplisit di schema, pola `StokBahan`/ADR-023) | internal (job rekonsiliasi) | - | `keanggotaan.saldo.rekonsiliasi` | SKEMA SELESAI (komentar), JOB BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-009 | `PoinRiwayat.kadaluarsaPada` (BARU) + baris ledger `jenis = KADALUARSA` | internal (job kedaluwarsa poin terjadwal) | - | `keanggotaan.poin.kedaluwarsa` | SKEMA SELESAI, JOB BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-010 | `PoinRiwayat` (`jenis = PENUKARAN`) | `POST /api/v1/keanggotaan/{id}/tukar-poin` (wajib `Idempotency-Key`) | `/kasir/pembayaran` | `keanggotaan.poin.tukar` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-011 | `LedgerSaldoToko` (BARU, digantung ke `Pelanggan` BUKAN `Keanggotaan` - ADR-027 Keputusan 3) | `GET /api/v1/pelanggan/{id}/saldo-toko` | `/pelanggan/{id}` | `keanggotaan.saldo-toko.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-012 | `LedgerSaldoToko` (append-only, `dibalikOlehId` self-relasi `@unique`, `pembayaranId` -> integrasi metode `SALDO_TOKO`) | `GET /api/v1/pelanggan/{id}/saldo-toko/riwayat` | `/pelanggan/{id}` | `keanggotaan.saldo-toko.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-013 | - (rule engine, concern service-layer - lihat ADR-027 catatan anti-abuse: `dicatatOlehId` vs `Pesanan.dibuatOlehId`/`pelangganId`) | internal (rule engine) | - | `keanggotaan.anti-fraud` | BELUM DIKERJAKAN | - |
| ALT-MBR-014 | `HadiahStempel` (BARU, `ALT-DEF-039`) | `GET/POST /api/v1/hadiah-stempel` | `/pengaturan/membership` | `keanggotaan.stempel.kelola` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 (`keanggotaan-ledger-constraints.test.ts`) |
| ALT-MBR-015 | `LedgerStempel` (`jenis = PEROLEHAN`, BARU) | internal (event pesanan selesai) | - | `-` (aktor sistem, pola `resep.pemakaian.otomatis`) | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-016 | `LedgerStempel` (`jenis = PENUKARAN`, `hadiahStempelId`) | `POST /api/v1/keanggotaan/{id}/tukar-stempel` (wajib `Idempotency-Key`) | `/kasir/pembayaran` | `keanggotaan.stempel.tukar` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-017 | `LedgerStempel.dibalikOlehId` (self-relasi `@unique`, pola `MutasiStok`/ADR-023) | `POST /api/v1/ledger-stempel/{id}/balik` (wajib `Idempotency-Key`) | `/pelanggan/{id}` | `keanggotaan.stempel.balik` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-018 | `LedgerStempel` (append-only) | `GET /api/v1/pelanggan/{id}/stempel-riwayat` | `/pelanggan/{id}` | `keanggotaan.stempel.lihat` | SKEMA SELESAI, HANDLER BELUM DIKERJAKAN | `RELEASE-EVIDENCE.md` - pass ALT-DEF-018/023/039 |
| ALT-MBR-019 | `Keanggotaan` (SENGAJA belum ada kolom cache stempel pada batch ini - saldo dihitung on-the-fly dari `LedgerStempel`, lihat `MASTER-CHECKLIST.md`) | internal (job rekonsiliasi, bila kolom cache ditambahkan kelak) | - | `keanggotaan.stempel.lihat` | BELUM DIKERJAKAN (sengaja, lihat catatan) | - |
| ALT-KRY-001 | `Karyawan`, `Jabatan` | `GET/POST /api/v1/karyawan` | `/resto/{outletSlug}/karyawan` | HRD | BELUM DIKERJAKAN | - |
| ALT-KRY-002 | `JadwalShift`, `PenugasanShift` | `GET /api/v1/jadwal-shift`, `POST .../penugasan` | `/resto/{outletSlug}/karyawan/shift` | HRD | BELUM DIKERJAKAN | - |
| ALT-ABS-001 | `Absensi` | `POST /api/v1/absensi/masuk`, `/{id}/pulang` | `/absensi/mandiri` | semua staf | BELUM DIKERJAKAN | - |
| ALT-ABS-002 | `Absensi` (baris `MANUAL_SUPERVISOR`) | `POST /api/v1/absensi/koreksi` | `/resto/{outletSlug}/absensi` | HRD/SUPERVISOR | BELUM DIKERJAKAN | - |
| ALT-ABS-003 | `CutiIzin` | `POST /api/v1/cuti-izin`, `/{id}/setujui` | `/resto/{outletSlug}/cuti-izin` | HRD | BELUM DIKERJAKAN | - |
| ALT-KEU-001 | `RekapKasHarian` | `GET /api/v1/rekap-kas-harian` | `/resto/{outletSlug}/keuangan/rekap-kas` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-KEU-002 | `BiayaOperasional`, `KategoriBiaya` | `POST /api/v1/biaya-operasional/*` | `/resto/{outletSlug}/keuangan/biaya` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-ANL-001 | `RmPenjualanHarian`, `RmPenjualanItemHarian` | `GET /api/v1/analitik/penjualan-harian` | `/resto/{outletSlug}/analitik` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-ANL-002 | `RmStokKritis` | `GET /api/v1/analitik/stok-kritis` | `/resto/{outletSlug}/analitik` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-ANL-003 | `RmKinerjaKaryawanHarian` | `GET /api/v1/analitik/kinerja-karyawan-harian` | `/resto/{outletSlug}/analitik` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-ANL-004 | seluruh `RM_*` | (worker terjadwal, bukan endpoint publik) | - | sistem | BELUM DIKERJAKAN | - |
| ALT-UIX-001 | - | - | seluruh rute `apps/web` | - | BELUM DIKERJAKAN | - |
| ALT-UIX-002 | - | - | `apps/mobile` | - | BELUM DIKERJAKAN | - |
| ALT-UIX-003 | - | - | `apps/desktop` | - | BELUM DIKERJAKAN | - |
| ALT-UIX-004 | `Perangkat` | - | - | - | BELUM DIKERJAKAN | - |

## Security (`ALT-SEC`) - baris ditambahkan pass correction-loop ALT-DEF-010/ALT-DEF-014

Baris berikut ditambahkan pada pass ini (bukan bagian dari draf awal 64-referensi di atas)
karena requirement `ALT-SEC-001`/`ALT-SEC-002`/`ALT-SEC-003` langsung tersentuh oleh
perbaikan composite-FK tenant/outlet - lihat `docs/engineering/DECISION-LOG.md` ADR-013 dan
`docs/engineering/RELEASE-EVIDENCE.md`. Hanya baris yang langsung tersentuh oleh defect
ini yang ditambahkan, bukan sinkronisasi penuh 249-requirement (tetap `ALT-DEF-020`).

| Requirement ID | Entitas ERD | Endpoint API | Rute UI | Permission | Status | Bukti Uji |
|---|---|---|---|---|---|---|
| ALT-SEC-001 | Semua model tenant-scoped di `prisma/schema/schema.prisma` (lihat ADR-013 untuk daftar lengkap) | middleware semua endpoint (belum diimplementasikan sebagai kode - lihat `ALT-DEF-027`) | - | keamanan.tenant.isolasi | SEBAGIAN (jaminan level-skema selesai, middleware aplikasi BELUM DIKERJAKAN) | `prisma format`/`validate`/`generate` + `tenant-outlet-composite-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-SEC-002 | `Outlet`, `Gudang`, `Meja`, `AreaMeja`, `StasiunDapur`, `Pesanan`, `TiketDapur`, `GiliranKasir`, `Pembayaran`, `Karyawan`, `PurchaseOrder`, `PenerimaanBarang`, `MutasiStok`, `StokBahan`, `HargaItemOutlet`, `RekapKasHarian`, `BiayaOperasional`, `RmPenjualanHarian`, `RmPenjualanItemHarian`, `RmStokKritis`, `RmKinerjaKaryawanHarian` (composite-FK tenant/outlet ditambahkan pass ini, ALT-DEF-010) | - | - | keamanan.tenant.isolasi | SIAP_DIVERIFIKASI (constraint level-database ada dan tervalidasi; migrasi Postgres nyata + test integrasi sungguhan DIBLOKIR, lihat ALT-DEF-029) | `tenant-outlet-composite-constraints.test.ts`, `prisma-client-shape-tenant-outlet.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-SEC-003 | `KeanggotaanOutlet` (composite-FK verifikasi ulang, ALT-DEF-001, tidak berubah pass ini) | middleware semua endpoint outlet-scoped (BELUM DIKERJAKAN sebagai kode) | - | keamanan.outlet.isolasi | SEBAGIAN (jaminan level-skema dari ALT-DEF-001 sudah ada; enforcement runtime BELUM DIKERJAKAN) | `keanggotaan-outlet-constraints.test.ts` (regresi diverifikasi ulang, lihat RELEASE-EVIDENCE.md) |

## Autentikasi/Sesi/PIN (`ALT-DEF-003`, `ALT-DEF-013`) - baris ditambahkan pass correction-loop auth/sesi/PIN

Baris berikut ditambahkan pada pass ini untuk requirement `ALT-PLT-013`,
`ALT-PLT-014`, `ALT-PLT-016`, `ALT-SEC-005`, `ALT-SEC-010` yang langsung
tersentuh oleh pengerasan skema autentikasi/sesi/PIN - lihat
`docs/engineering/DECISION-LOG.md` ADR-014/ADR-015 dan
`docs/engineering/RELEASE-EVIDENCE.md`. Hanya baris yang langsung tersentuh
yang ditambahkan, bukan sinkronisasi penuh 249-requirement (tetap
`ALT-DEF-020`).

| Requirement ID | Entitas ERD | Endpoint API | Rute UI | Permission | Status | Bukti Uji |
|---|---|---|---|---|---|---|
| ALT-PLT-013 | `Pengguna.passwordHash`/`terkunciSampai`/`jumlahPercobaanGagal`, `TokenResetKataSandi`, `PercobaanLogin` (baru, ALT-DEF-003) | `POST /api/v1/auth/masuk`, `/auth/lupa-kata-sandi`, `/auth/reset-kata-sandi` | `/masuk`, `/lupa-kata-sandi`, `/reset-kata-sandi` (belum ada di ROUTE-MAP, TODO tambah) | publik (login), pemilik akun (reset) | SIAP_DIVERIFIKASI (schema) | `sesi-auth-pin-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-PLT-014 | `Sesi` (diperbarui ALT-DEF-003: `tokenHash`, `keanggotaanTenantId`, `terakhirAktifPada`, `alasanPencabutan`, `ipHash`, `userAgent`) | `GET /api/v1/auth/sesi-saya`, `POST /auth/sesi/{id}/cabut`, `/auth/sesi/cabut-semua` | `/pengaturan/keamanan/sesi` (belum ada di ROUTE-MAP, TODO tambah) | pemilik akun | SIAP_DIVERIFIKASI (schema) | `sesi-auth-pin-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-PLT-016 | `PinOutlet`, `RiwayatPerangkat` (baru, ALT-DEF-013) | `POST /api/v1/auth/masuk-pin`, `/auth/pin/ganti`, `/karyawan/{keanggotaanTenantId}/pin/reset` | `/masuk-pin`, `/pengaturan/keamanan/pin` (belum ada di ROUTE-MAP, TODO tambah) | pemilik PIN (ganti), `akun.reset-pin` (reset karyawan lain) | SIAP_DIVERIFIKASI (schema) | `sesi-auth-pin-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-SEC-005 | `PercobaanLogin`, `Pengguna.terkunciSampai`/`jumlahPercobaanGagal` (baru/diperbarui, ALT-DEF-003) | dipicu internal di `POST /api/v1/auth/masuk` | - | sistem | SIAP_DIVERIFIKASI (schema) | `sesi-auth-pin-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-SEC-010 | `Sesi.tokenHash`, `TokenResetKataSandi.tokenHash` (hash-only, never raw token, ALT-DEF-003) | seluruh endpoint auth di atas | - | sistem | SIAP_DIVERIFIKASI (schema) | `sesi-auth-pin-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |

## Idempotency/Outbox/Notifikasi (`ALT-DEF-017`) - baris ditambahkan pass correction-loop infrastruktur platform

Baris berikut ditambahkan pada pass ini untuk requirement `ALT-PLT-018`,
`ALT-PLT-019`, `ALT-PLT-020` yang langsung tersentuh oleh penambahan model
`IdempotencyKey`/`DomainOutboxEvent`/`Notification` - lihat
`docs/engineering/DECISION-LOG.md` ADR-016 dan
`docs/engineering/RELEASE-EVIDENCE.md`. Hanya baris yang langsung tersentuh
yang ditambahkan, bukan sinkronisasi penuh 249-requirement (tetap
`ALT-DEF-020`).

| Requirement ID | Entitas ERD | Endpoint API | Rute UI | Permission | Status | Bukti Uji |
|---|---|---|---|---|---|---|
| ALT-PLT-018 | `IdempotencyKey` (baru, ALT-DEF-017) | header `Idempotency-Key` pada endpoint kritis (lihat `API-CONTRACT.md` bagian 17.1 untuk daftar lengkap) | - | sistem (middleware) | SIAP_DIVERIFIKASI (schema) | `idempotency-outbox-notification-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-PLT-019 | `DomainOutboxEvent` (baru, ALT-DEF-017) | internal (relay worker, belum diimplementasikan) | - | sistem | SIAP_DIVERIFIKASI (schema) | `idempotency-outbox-notification-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |
| ALT-PLT-020 | `Notification` (baru, ALT-DEF-017) | `GET /api/v1/notifikasi`, `POST /api/v1/notifikasi/{id}/read` | `/notifikasi` (belum ada di ROUTE-MAP, TODO tambah) | platform.notifikasi.lihat | SIAP_DIVERIFIKASI (schema) | `idempotency-outbox-notification-constraints.test.ts` (lihat RELEASE-EVIDENCE.md) |

## Catatan gap yang ditemukan saat menyusun matriks ini

- `ALT-PLT-001` (registrasi tenant baru) dan `ALT-PLT-006` (halaman audit log) belum
  punya endpoint/rute eksplisit di `docs/api/API-CONTRACT.md` / `docs/ui-ux/ROUTE-MAP.md` -
  ditandai TODO di atas, perlu ditambahkan saat implementasi dimulai.
- Semua baris berstatus `BELUM DIKERJAKAN` dan kolom "Bukti Uji" kosong secara jujur -
  tidak ada requirement yang sudah diimplementasikan/diuji pada titik penulisan dokumen
  ini.
