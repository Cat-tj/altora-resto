# Release Evidence - Altora Resto

Status dokumen: **DRAF AWAL - BELUM ADA RILIS**.

Dokumen ini akan memuat bukti konkret (log hasil test, screenshot, output CI) untuk
setiap rilis. Pada titik penulisan dokumen ini, **belum ada satu pun rilis, build,
atau proses test yang dijalankan** - repo baru berisi scaffold monorepo, ERD, skema
Prisma awal, dan dokumen desain. Tidak ada klaim `LULUS` yang dibuat di dokumen ini
karena tidak ada yang benar-benar diuji.

## Bukti yang benar-benar tersedia sampai saat ini

| Item | Perintah | Hasil aktual | Tanggal |
|---|---|---|---|
| Validasi skema Prisma | `npx prisma@5.20.0 format --schema prisma/schema/schema.prisma` lalu `npx prisma@5.20.0 validate --schema prisma/schema/schema.prisma` (dengan `DATABASE_URL` dummy lokal, tanpa koneksi database nyata) | `Formatted prisma/schema/schema.prisma in 56ms` dan `The schema at prisma/schema/schema.prisma is valid` | 2026-07-24 |
| Typecheck token desain | `tsc --noEmit --strict` atas `packages/desain/src/tokens.ts` + `index.ts` | Tidak ada error output (bersih) | 2026-07-24 |

Kedua item di atas adalah **pemeriksaan statis** (validasi sintaks skema & tipe), BUKAN
bukti bahwa aplikasi berjalan, bahwa migrasi benar-benar diterapkan ke database nyata,
atau bahwa fitur apa pun berfungsi end-to-end.

## Format entri rilis (dipakai mulai rilis pertama yang sesungguhnya)

```
## Rilis vX.Y.Z - {tanggal}

### Cakupan
- Requirement ID yang termasuk: ALT-XXX-###, ...

### Bukti test otomatis
- Unit test: {jumlah lulus}/{jumlah total}, command: `pnpm test`, log: {tautan/lampiran}
- Test e2e: {jumlah lulus}/{jumlah total}, command: `pnpm test:e2e`, log: {tautan/lampiran}

### Bukti test manual
- Skenario: {deskripsi}, dilakukan oleh: {nama/peran}, hasil: {LULUS/GAGAL}, screenshot: {tautan}

### Bukti build per platform
- Web: {status build, tautan deploy preview}
- Android/iOS (Capacitor): {status build, lihat PLATFORM-BUILD-MATRIX.md}
- Windows/macOS/Linux (Tauri): {status build, lihat PLATFORM-BUILD-MATRIX.md}

### Defect terbuka saat rilis
- Rujuk ke docs/engineering/DEFECT-LEDGER.md
```

## Aturan integritas bukti

1. Tidak boleh ada baris berstatus `LULUS` tanpa log/output nyata yang bisa
   ditelusuri (command yang dijalankan + hasil aktual, bukan ringkasan yang
   diasumsikan).
2. Jika suatu pemeriksaan tidak bisa dijalankan pada suatu sesi kerja (mis. tidak
   ada akses Xcode/Android SDK), itu dicatat sebagai **keterbatasan lingkungan**,
   bukan sebagai "LULUS" atau dilewati diam-diam - lihat
   `docs/engineering/PLATFORM-BUILD-MATRIX.md`.
3. Setiap defect yang ditemukan selama verifikasi rilis wajib masuk
   `docs/engineering/DEFECT-LEDGER.md` sebelum rilis dianggap selesai.
