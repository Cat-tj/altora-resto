# Rencana Loop Engineering - Altora Resto

Status dokumen: **DRAF AWAL**. Menjelaskan siklus kerja berulang (loop) yang dipakai
untuk membawa tiap requirement di `docs/engineering/MASTER-CHECKLIST.md` dari
`BELUM DIKERJAKAN` sampai `LULUS`, dan bagaimana dokumen-dokumen engineering saling
memberi makan (feed) satu sama lain.

## 1. Tujuan loop

Menjamin setiap fitur yang dibangun:

1. Tertelusuri ke requirement ID yang jelas (tidak ada kode "liar" tanpa ID).
2. Konsisten dengan ERD (`docs/database/`), kontrak API (`docs/api/`), permission
   (`docs/keamanan/`), dan rute/token UI (`docs/ui-ux/`) yang sudah disepakati -
   bukan diimprovisasi ulang per fitur.
3. Tidak pernah diklaim selesai tanpa bukti uji nyata (lihat
   `docs/engineering/RELEASE-EVIDENCE.md`).

## 2. Tahapan satu iterasi loop

```
1. PILIH requirement dari MASTER-CHECKLIST.md (status BELUM DIKERJAKAN)
       |
2. VERIFIKASI KONTRAK - baca entitas ERD terkait, endpoint API, permission,
   rute UI dari TRACEABILITY-MATRIX.md. Jika ada gap/ketidakcocokan, catat
   dulu di DECISION-LOG.md (ADR baru) atau perbaiki dokumen sumber - jangan
   diam-diam menyimpang dari dokumen yang sudah disepakati.
       |
3. IMPLEMENTASI - migrasi Prisma (jika ada perubahan skema) -> service
   domain (packages/*) -> handler API (apps/web) -> UI (apps/web + packages/ui)
       |
4. UJI - unit test service, test integrasi endpoint, test manual skenario
   utama & tepi. Defect yang ditemukan WAJIB masuk DEFECT-LEDGER.md sebelum
   diperbaiki.
       |
5. PERBARUI STATUS - ubah status requirement di MASTER-CHECKLIST.md dan
   TRACEABILITY-MATRIX.md (BELUM DIKERJAKAN -> DIKERJAKAN -> SELESAI DEV ->
   DIUJI -> LULUS/GAGAL), dengan bukti nyata dicatat di RELEASE-EVIDENCE.md
       |
6. RETRO SINGKAT - jika iterasi ini memunculkan risiko baru atau keputusan
   arsitektur baru, tambahkan ke RISK-REGISTER.md / DECISION-LOG.md sebelum
   lanjut ke requirement berikutnya
       |
   (kembali ke langkah 1)
```

## 3. Aturan tegas selama loop

- **Tidak boleh menandai `LULUS`** tanpa command/log yang bisa ditelusuri (lihat
  aturan integritas bukti di `RELEASE-EVIDENCE.md`).
- **Tidak boleh mengubah bentuk data** (skema Prisma) tanpa memperbarui
  `docs/database/*.md` yang relevan terlebih dahulu, supaya ERD naratif dan skema
  teknis tidak pernah menyimpang diam-diam.
- **Tidak boleh menambah endpoint** yang tidak ada di `docs/api/API-CONTRACT.md` -
  jika perlu endpoint baru, dokumen itu diperbarui dulu (sebagai bagian dari langkah
  2), lalu br diimplementasikan.
- **Tidak boleh melewati enforcement permission** hanya karena UI menyembunyikan
  tombol - lihat RISK-008 di `RISK-REGISTER.md`.
- Setiap keterbatasan lingkungan (mis. tidak ada toolchain mobile) dicatat apa
  adanya di `PLATFORM-BUILD-MATRIX.md`, tidak disamarkan sebagai "selesai".

## 4. Urutan domain yang disarankan (loop pertama end-to-end)

Disarankan mulai dari domain dengan dependensi paling sedikit, membangun ke atas:

1. Platform & Otorisasi (`ALT-PLT-*`, `ALT-OTR-*`) - fondasi tenant/outlet/auth.
2. Menu & Katalog (`ALT-MNU-*`), Resep (`ALT-RSP-*`).
3. Persediaan (`ALT-PSD-*`) - butuh Bahan/Resep dari langkah 2.
4. Meja & Reservasi (`ALT-MJA-*`, `ALT-RSV-*`).
5. Pesanan (`ALT-PSN-*`) - domain inti, butuh Menu + Meja.
6. Dapur (`ALT-DPR-*`) - read-contract dari Pesanan.
7. Kasir & Pembayaran (`ALT-KSR-*`, `ALT-PBY-*`) - butuh Pesanan selesai.
8. Promo (`ALT-PRM-*`), Pelanggan/Keanggotaan (`ALT-PLG-*`).
9. Supplier & Pembelian (`ALT-PMB-*`) - bisa paralel dengan langkah 3-8.
10. Karyawan & Absensi (`ALT-KRY-*`, `ALT-ABS-*`) - relatif independen, bisa paralel.
11. Keuangan (`ALT-KEU-*`) - butuh data dari Kasir/Pembayaran.
12. Analitik (`ALT-ANL-*`) - paling akhir, butuh data transaksional dari semua
    domain di atas untuk read-model bermakna.
13. UI lintas platform (`ALT-UIX-*`) - shell native bisa disiapkan paralel begitu
    `apps/web` punya rute yang stabil untuk dibungkus.

## 5. Status loop saat ini

Loop belum pernah dijalankan penuh - repo baru berisi scaffold, ERD, permission
matrix, kontrak API, route map, token desain, dan skema Prisma awal (semua dokumen
desain/kontrak, tanpa implementasi kode domain). Iterasi pertama yang sesungguhnya
(langkah 1-6 di atas) belum dimulai.
