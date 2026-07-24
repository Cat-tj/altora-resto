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
| ALT-RSP-001 | `Resep`, `ResepBahan`, `Bahan`, `Satuan` | `GET/PUT /api/v1/resep/{itemMenuId}` | `/resto/{outletSlug}/menu/{id}/resep` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-RSP-002 | `MutasiStok` (jenis `KELUAR_PENJUALAN`) | dipicu internal saat `PATCH` status pesanan | - | sistem | BELUM DIKERJAKAN | - |
| ALT-PSD-001 | `StokBahan` | `GET /api/v1/stok-bahan` | `/resto/{outletSlug}/persediaan` | GUDANG | BELUM DIKERJAKAN | - |
| ALT-PSD-002 | `MutasiStok` | `GET /api/v1/mutasi-stok`, `POST .../balik` | `/resto/{outletSlug}/persediaan/mutasi` | GUDANG | BELUM DIKERJAKAN | - |
| ALT-PSD-003 | `StokOpname`, `StokOpnameBaris` | `POST /api/v1/stok-opname/*` | `/resto/{outletSlug}/persediaan/opname` | GUDANG | BELUM DIKERJAKAN | - |
| ALT-PSD-004 | `Bahan.stokMinimum`, `RmStokKritis` | `GET /api/v1/analitik/stok-kritis` | `/resto/{outletSlug}/analitik` | GUDANG (L)/MANAJER | BELUM DIKERJAKAN | - |
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
| ALT-PRM-001 | `Promo`, `PromoAturan` | `GET/POST /api/v1/promo` | `/resto/{outletSlug}/promo` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-PRM-002 | `Kupon` | `POST /api/v1/promo/{id}/kupon` | `/resto/{outletSlug}/promo` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-PRM-003 | `PromoPemakaian` | `POST /api/v1/promo/validasi`, `/pesanan/{id}/promo` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN/KASIR | BELUM DIKERJAKAN | - |
| ALT-PLG-001 | `Pelanggan` | `GET/POST /api/v1/pelanggan` | `/resto/{outletSlug}/pelanggan` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-PLG-002 | `Keanggotaan`, `TierMembership` | `POST /api/v1/pelanggan/{id}/keanggotaan` | `/resto/{outletSlug}/pelanggan` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-PLG-003 | `PoinRiwayat` | `GET .../poin-riwayat`, `POST .../tukar-poin` | `/resto/{outletSlug}/pelanggan` | PELAYAN | BELUM DIKERJAKAN | - |
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
