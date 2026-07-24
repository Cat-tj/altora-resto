# Peta Referensi UI - Altora Resto

Status dokumen: **DRAF AWAL**. Menghubungkan tiap rute di
`docs/ui-ux/ROUTE-MAP.md` ke komponen `packages/ui` yang (akan) dipakai dan token
`packages/desain` yang relevan. Berguna sebagai referensi tunggal saat membangun
layar agar konsisten dengan `docs/ui-ux/DESIGN-TOKENS.md`.

Karena `packages/ui` saat ini hanya berisi scaffold kosong (`export {}` sebelum
komponen ditambahkan), kolom "Komponen" di bawah adalah **rencana penamaan**, bukan
komponen yang sudah ada.

| Rute | Komponen `packages/ui` (rencana) | Aksen app | Catatan |
|---|---|---|---|
| `/pesan/{token}` | `KartuSambutanQr`, `TombolUtama` | `warna.aksen.web` (dilayani `apps/web` walau diakses dari HP tamu) | Halaman publik, harus tetap ramah tanpa akun. |
| `/pesan/{token}/menu` | `GridItemMenu`, `KartuItemMenu`, `PemilihVarian`, `PemilihModifier` | `warna.aksen.web` | Grid responsif, harus nyaman di layar HP kecil. |
| `/pesan/{token}/keranjang` | `DaftarKeranjang`, `RingkasanTotal`, `TombolKirimPesanan` | `warna.aksen.web` | Tampilkan snapshot harga sesuai `ItemPesanan`. |
| `/pesan/{token}/status` | `BadgeStatusPesanan`, `TimelineStatus` | `warna.aksen.web` | Polling/SSE status real-time. |
| `/masuk`, `/masuk-pin` | `FormMasuk`, `KeypadPin` | sesuai app pemanggil (web/mobile/desktop) | `KeypadPin` dioptimalkan untuk sentuh (tablet kasir). |
| `/resto/{outletSlug}/pesanan` | `PapanStatusPesanan`, `KartuPesanan` | `warna.aksen.web` (dasbor) / `warna.aksen.mobile` (app pelayan) | Papan kanban per status pesanan. |
| `/resto/{outletSlug}/kasir` | `GridProduk`, `Keranjang`, `PanelPembayaran` | `warna.aksen.mobile` (tablet kasir) / `warna.aksen.desktop` (kasir desktop) | Kepadatan tinggi, aksi cepat. |
| `/resto/{outletSlug}/kasir/{pesananId}/bayar` | `PemilihMetodeBayar`, `KalkulatorKembalian`, `PanelSplitBill` | sama seperti di atas | Perlu mode "tunai besar" untuk kembalian cepat. |
| `/resto/{outletSlug}/dapur` | `KartuTiketDapur`, `PenandaWaktuTunggu` | `warna.aksen.mobile` (tablet dapur) | Kontras tinggi, terbaca dari jarak dapur. |
| `/resto/{outletSlug}/meja` | `PetaMeja`, `IndikatorStatusMeja` | `warna.aksen.mobile` | Warna status memakai `warna.sukses`/`warna.peringatan`/`warna.bahaya`. |
| `/resto/{outletSlug}/reservasi` | `KalenderReservasi`, `KartuReservasi` | `warna.aksen.web` | |
| `/resto/{outletSlug}/menu` | `TabelItemMenu`, `FormItemMenu`, `PengelolaVarian` | `warna.aksen.web` | Layar admin, kepadatan informasi tinggi. |
| `/resto/{outletSlug}/persediaan` | `TabelStokBahan`, `BadgeStokKritis` | `warna.aksen.web` / `warna.aksen.desktop` (back-office) | `BadgeStokKritis` memakai `warna.bahaya`. |
| `/resto/{outletSlug}/pembelian` | `TabelPurchaseOrder`, `AlurStatusPo` | `warna.aksen.web` | |
| `/resto/{outletSlug}/promo` | `FormPromo`, `TabelKupon` | `warna.aksen.web` | |
| `/resto/{outletSlug}/pelanggan` | `PencarianPelanggan`, `KartuKeanggotaan` | `warna.aksen.web` / `warna.aksen.mobile` | |
| `/resto/{outletSlug}/karyawan`, `.../shift` | `TabelKaryawan`, `KalenderShift` | `warna.aksen.web` | |
| `/absensi/mandiri` | `KameraSelfie`, `TombolPresensi` | `warna.aksen.mobile` | Butuh akses kamera/GPS - lihat `packages/perangkat`. |
| `/resto/{outletSlug}/keuangan/*` | `TabelRekapKas`, `FormBiayaOperasional` | `warna.aksen.web` | |
| `/resto/{outletSlug}/analitik`, `/analitik/multi-outlet` | `KartuMetrik`, `GrafikTren`, `TabelPerbandinganOutlet` | `warna.aksen.web` | Sumber data selalu tabel `RM_*` (lihat ADR-008). |
| `/pengaturan/*` | `FormPengaturanTenant`, `FormPengaturanOutlet`, `TabelPengguna` | `warna.aksen.web` | |

## Status implementasi

Seluruh baris di atas berstatus **BELUM DIKERJAKAN** - `packages/ui` belum memiliki
komponen nyata; tabel ini adalah rencana penamaan agar penamaan komponen konsisten
sejak awal implementasi.
