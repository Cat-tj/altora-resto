# Matriks Traceability - Altora Resto

Status dokumen: **DRAF AWAL**. Menghubungkan setiap requirement
(`docs/engineering/MASTER-CHECKLIST.md`) ke artefak konkret: entitas ERD, endpoint API,
rute UI, permission, dan bukti uji. Kolom "Bukti Uji" merujuk ke
`docs/engineering/RELEASE-EVIDENCE.md`; kosong berarti belum ada bukti karena belum
diimplementasikan.

| Requirement ID | Entitas ERD | Endpoint API | Rute UI | Permission | Status | Bukti Uji |
|---|---|---|---|---|---|---|
| ALT-PLT-001 | `Tenant`, `Pengguna` | `POST /api/v1/tenant` (belum ada di kontrak v1, TODO tambah) | `/register` (belum ada di ROUTE-MAP, TODO tambah) | OWNER (pembuat) | BELUM DIKERJAKAN | - |
| ALT-PLT-002 | `Outlet` | `GET/POST /api/v1/outlet` | `/pengaturan/outlet/{outletSlug}` | OWNER/MANAJER | BELUM DIKERJAKAN | - |
| ALT-PLT-003 | `Pengguna`, `Sesi` | `POST /api/v1/auth/masuk` | `/masuk` | publik (pra-autentikasi) | BELUM DIKERJAKAN | - |
| ALT-PLT-004 | `Pengguna`, `Sesi`, `Perangkat` | `POST /api/v1/auth/masuk-pin` | `/masuk-pin` | publik (perangkat outlet) | BELUM DIKERJAKAN | - |
| ALT-PLT-005 | `Perangkat` | `GET /api/v1/perangkat`, `POST /api/v1/auth/perangkat/aktivasi` | `/pengaturan/perangkat` | MANAJER | BELUM DIKERJAKAN | - |
| ALT-PLT-006 | `AuditLog` | `GET /api/v1/audit-log` | (belum ada rute dedicated, TODO tambah ke ROUTE-MAP) | OWNER (lihat), MANAJER (lihat, L) | BELUM DIKERJAKAN | - |
| ALT-PLT-007 | `PengaturanTenant`, `PengaturanOutlet` | `PATCH /api/v1/tenant/saya` | `/pengaturan/tenant`, `/pengaturan/outlet/{outletSlug}` | OWNER/MANAJER | BELUM DIKERJAKAN | - |
| ALT-OTR-001 | `Peran`, `PenggunaPeran` | `GET/POST /api/v1/peran` | `/pengaturan/pengguna` | OWNER | BELUM DIKERJAKAN | - |
| ALT-OTR-002 | - (lintas domain, middleware) | seluruh endpoint `/api/v1/*` | - | semua | BELUM DIKERJAKAN | - |
| ALT-OTR-003 | - (lintas domain) | endpoint approval (refund, batal PO, dst) | - | SUPERVISOR/MANAJER | BELUM DIKERJAKAN | - |
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
| ALT-PSN-001 | `Pesanan` | `POST /api/v1/pesanan` | `/resto/{outletSlug}/pesanan/baru`, `/pesan/{token}` | PELAYAN/KASIR, publik (QR) | BELUM DIKERJAKAN | - |
| ALT-PSN-002 | `Pesanan.status` | `POST /api/v1/pesanan/{id}/konfirmasi` dst | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-PSN-003 | `ItemPesanan.hargaSatuan`, `ItemPesananModifier.hargaTambahan` | `POST /api/v1/pesanan/{id}/item` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN | BELUM DIKERJAKAN | - |
| ALT-PSN-004 | `PesananRiwayatStatus` | tercatat otomatis di setiap transisi | `/resto/{outletSlug}/pesanan/{id}` | - (read-only) | BELUM DIKERJAKAN | - |
| ALT-PSN-005 | `Pesanan.status = DIBATALKAN`, `dibatalkanPada` | `POST /api/v1/pesanan/{id}/batalkan` | `/resto/{outletSlug}/pesanan/{id}` | PELAYAN/SUPERVISOR (approval) | BELUM DIKERJAKAN | - |
| ALT-DPR-001 | `TiketDapur`, `TiketDapurBaris` | dipicu internal saat `POST .../konfirmasi` | `/resto/{outletSlug}/dapur` | sistem | BELUM DIKERJAKAN | - |
| ALT-DPR-002 | `TiketDapur.status` | `POST /api/v1/dapur/tiket/{id}/*` | `/resto/{outletSlug}/dapur`, `.../stasiun/{id}` | DAPUR | BELUM DIKERJAKAN | - |
| ALT-DPR-003 | read-contract `kontrak-dapur` | `GET /api/v1/dapur/tiket` | `/resto/{outletSlug}/dapur` | DAPUR | BELUM DIKERJAKAN | - |
| ALT-KSR-001 | `GiliranKasir` | `POST /api/v1/giliran-kasir/buka`, `/{id}/tutup` | `/resto/{outletSlug}/kasir/giliran` | KASIR | BELUM DIKERJAKAN | - |
| ALT-KSR-002 | `GiliranKasir.status`, `RekapKasHarian` | `POST /api/v1/giliran-kasir/{id}/verifikasi` | `/resto/{outletSlug}/kasir/giliran` | SUPERVISOR | BELUM DIKERJAKAN | - |
| ALT-PBY-001 | `Pembayaran`, `MetodeBayar` | `POST /api/v1/pembayaran` | `/resto/{outletSlug}/kasir/{pesananId}/bayar` | KASIR | BELUM DIKERJAKAN | - |
| ALT-PBY-002 | `PembayaranMetodeBaris` | `POST /api/v1/pembayaran` (multi baris) | `/resto/{outletSlug}/kasir/{pesananId}/bayar` | KASIR | BELUM DIKERJAKAN | - |
| ALT-PBY-003 | `QrisKonfirmasiManual` | `POST /api/v1/pembayaran/{id}/konfirmasi-qris-manual` | `/resto/{outletSlug}/kasir/{pesananId}/bayar` | KASIR | BELUM DIKERJAKAN | - |
| ALT-PBY-004 | `PembayaranRefund` | `POST /api/v1/pembayaran/{id}/refund` | `/resto/{outletSlug}/kasir` | SUPERVISOR | BELUM DIKERJAKAN | - |
| ALT-PBY-005 | `Struk` | `POST /api/v1/pembayaran/{id}/struk/cetak-ulang` | `/resto/{outletSlug}/kasir/{pesananId}/bayar` | KASIR | BELUM DIKERJAKAN | - |
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

## Catatan gap yang ditemukan saat menyusun matriks ini

- `ALT-PLT-001` (registrasi tenant baru) dan `ALT-PLT-006` (halaman audit log) belum
  punya endpoint/rute eksplisit di `docs/api/API-CONTRACT.md` / `docs/ui-ux/ROUTE-MAP.md` -
  ditandai TODO di atas, perlu ditambahkan saat implementasi dimulai.
- Semua baris berstatus `BELUM DIKERJAKAN` dan kolom "Bukti Uji" kosong secara jujur -
  tidak ada requirement yang sudah diimplementasikan/diuji pada titik penulisan dokumen
  ini.
