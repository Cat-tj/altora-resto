# Risk Register - Altora Resto

Status dokumen: **DRAF AWAL**. Skala Likelihood/Impact: `RENDAH`, `SEDANG`, `TINGGI`.
Skor prioritas = kombinasi keduanya (`TINGGI x TINGGI` = prioritas tertinggi).

| ID | Risiko | Domain | Kemungkinan | Dampak | Mitigasi | Status |
|---|---|---|---|---|---|---|
| RISK-001 | Query lolos tanpa filter `tenantId`/`outletId`, bocor data lintas tenant | Platform/lintas domain | SEDANG | TINGGI | Wajib helper query terpusat di `packages/tenant` yang menyuntikkan filter tenant; test integrasi wajib untuk setiap service baru | TERBUKA |
| RISK-002 | Race condition pemotongan stok saat banyak pesanan bersamaan untuk item dengan stok terbatas | Persediaan/Pesanan | SEDANG | TINGGI | Transaksi DB dengan row lock saat menulis `MutasiStok`/`StokBahan`; alternatif reservasi stok atomik saat pesanan dibuat (bukan saat dibayar) | TERBUKA |
| RISK-003 | Pembulatan diskon/pajak Int menyebabkan selisih 1 rupiah antar baris pada split bill | Pembayaran/Promo | TINGGI | SEDANG | Tentukan aturan pembulatan tunggal (mis. baris terakhir menyerap sisa) dan uji dengan kasus tepi | TERBUKA |
| RISK-004 | QRIS mode manual rawan human error (kasir salah tandai lunas padahal belum masuk) | Pembayaran | SEDANG | TINGGI | Wajib catatan referensi (`catatanKasir`) + audit log setiap konfirmasi manual; rencana migrasi ke gateway otomatis (ADR-003) | TERBUKA |
| RISK-005 | Performa WebView (Capacitor/Tauri) lebih lambat dari native murni, terutama di perangkat kasir lama | UI lintas platform | SEDANG | SEDANG | Uji perangkat kelas bawah sebelum rilis; batasi animasi berat di layar kasir/KDS | TERBUKA |
| RISK-006 | Dependency-cruiser rule (dapur read-contract, analitik read-model) dilanggar tanpa sadar saat refactor besar | Dapur/Analitik | RENDAH | SEDANG | `pnpm depcheck` wajib lolos di CI sebelum merge | TERBUKA |
| RISK-007 | Job agregasi read-model gagal/terlambat, dashboard analitik menampilkan data basi tanpa indikasi | Analitik | SEDANG | SEDANG | Simpan `dihitungPada` di setiap tabel `RM_*` dan tampilkan "data per {waktu}" di UI; alert jika job gagal >1 siklus | TERBUKA |
| RISK-008 | Approval bertingkat bisa dilewati lewat panggilan API langsung (bukan lewat UI) jika enforcement hanya di UI | Otorisasi | RENDAH | TINGGI | Semua approval WAJIB divalidasi di layer API/service, bukan hanya disembunyikan di UI | TERBUKA |
| RISK-009 | Multi-outlet: karyawan ditugaskan ke outlet yang salah menyebabkan data lintas outlet tercampur di laporan | Karyawan/Analitik | RENDAH | SEDANG | Validasi `PENGGUNA_OUTLET`/`outletUtamaId` konsisten sebelum agregasi laporan kinerja karyawan | TERBUKA |
| RISK-010 | Tabel append-only (mutasi stok, riwayat status, audit log) tumbuh tanpa batas, memperlambat query seiring waktu | Persediaan/Pesanan/Platform | TINGGI | SEDANG | Rencanakan strategi partisi/arsip periodik sejak awal (belum didesain - lihat MASTER-CHECKLIST) | TERBUKA |
| RISK-011 | Belum ada akses lingkungan Xcode/Android SDK untuk build & uji `apps/mobile` di sesi kerja ini | UI lintas platform | TINGGI (terjadi) | SEDANG | Build/uji mobile perlu dijalankan di mesin/CI yang memiliki toolchain terkait; dicatat sebagai keterbatasan lingkungan, bukan risiko produk | TERBUKA - KETERBATASAN LINGKUNGAN |
| RISK-012 | Model `Pengguna`/`Peran` saat ini (tenantId langsung, permission Json) membuat kebocoran data lintas tenant dan bypass permission jauh lebih mudah terjadi begitu implementasi dimulai (lihat DEFECT-LEDGER.md ALT-DEF-001, ALT-DEF-002, ALT-DEF-010) | Platform/Otorisasi/Multi-tenant | TINGGI | TINGGI | Perbaiki model `KeanggotaanTenant`/`KeanggotaanOutlet` dan normalisasi `Izin`/`PeranIzin` SEBELUM implementasi endpoint apa pun dimulai; tambahkan composite tenant-outlet constraint (ALT-DEF-010) dan test isolasi tenant wajib (ALT-DEF-027) sebagai gate sebelum merge domain pertama | TERBUKA |
| RISK-013 | Data transaksi (Pembayaran, Pesanan, TiketDapur, PromoPemakaian) berisiko korup/tidak bisa direkonstruksi karena state machine pesanan dangkal, TiketDapur/PromoPemakaian dibatasi unik per pesanan, dan tidak ada idempotency/outbox (lihat ALT-DEF-005, ALT-DEF-006, ALT-DEF-009, ALT-DEF-017) | Pesanan/Dapur/Promo/Platform | TINGGI | TINGGI | Perbaiki state machine 14-status, hapus constraint unik yang salah, tambahkan `IdempotencyKey`/`DomainOutboxEvent` sebelum endpoint checkout/pembayaran/dapur diimplementasikan | TERBUKA |
| RISK-014 | Alur QR ordering (menunggu persetujuan kasir), KDS multi-stasiun, dan promo stacking/BOGO tidak mungkin diimplementasikan dengan benar selama schema masih membatasi satu tiket dapur dan satu promo per pesanan serta state machine pesanan belum mendukung status menunggu-persetujuan (lihat ALT-DEF-005, ALT-DEF-006, ALT-DEF-009) | Pesanan/Dapur/Promo | TINGGI | TINGGI | Jadikan perbaikan ALT-DEF-005/006/009 sebagai prasyarat wajib sebelum sprint implementasi domain QR/Dapur/Promo dimulai, bukan dikerjakan paralel dengan asumsi schema saat ini sudah benar | TERBUKA |

## Catatan

- Semua entri di atas adalah risiko yang teridentifikasi pada tahap desain (belum ada
  kode produksi) - probabilitas/dampak akan dikalibrasi ulang begitu implementasi
  berjalan dan data nyata (mis. hasil load test) tersedia.
- Tidak ada risiko di atas yang berstatus `DIMITIGASI`/`DITUTUP` pada penulisan
  dokumen ini - status jujur mencerminkan bahwa mitigasi masih berupa rencana.
