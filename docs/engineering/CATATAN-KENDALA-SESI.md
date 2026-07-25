# Catatan Kendala — Sesi Correction Loop Altora Resto

Dokumen ini mencatat kendala teknis dan proses nyata yang terjadi selama sesi
Architecture Correction Loop (bukan kendala hipotetis). Tujuannya: agar sesi
berikutnya tidak mengulang asumsi yang sama, dan agar pemilik produk tahu
bagian mana dari hasil kerja yang perlu diverifikasi ulang secara khusus.

Status dokumen: **CATATAN PROSES — bukan defect ledger.** Temuan yang sudah
berdampak pada schema/dokumen sudah dicatat sebagai entri resmi di
`DEFECT-LEDGER.md` (dirujuk di bawah bila relevan). Dokumen ini menjelaskan
*bagaimana* kendala itu terjadi dan bagaimana ditangani, bukan mengulang isi
ledger.

---

## 1. Interupsi sesi berulang (rate limit / connection error)

**Kejadian:** proses correction loop terputus paksa di tengah pekerjaan agent
sebanyak **4 kali**:

| # | Batch yang sedang berjalan | Jenis error |
|---|---|---|
| 1 | Scaffold awal repo (dokumen wajib section 48) | `API Error: Connection closed mid-response` |
| 2 | KDS multi-stasiun (ALT-DEF-006) | Session limit (reset ~2:50 waktu lokal) |
| 3 | Ledger persediaan (ALT-DEF-008) | Session limit (reset ~2:40 waktu lokal) |
| 4 | Sinkronisasi traceability matrix penuh | Session limit (reset ~10:30 waktu lokal) |

**Dampak:** pada tiap kejadian, sebagian pekerjaan sempat berupa perubahan
file yang **belum ter-commit** — risiko kehilangan kerja jika tidak ditangani
dengan benar.

**Penanganan yang dipakai:**
1. Setelah setiap interupsi, jalankan `git log --oneline` + `git status
   --short` dahulu untuk memastikan commit terakhir yang benar-benar
   tersimpan, dan file mana yang masih "modified" tanpa commit.
2. Baca ulang diff yang belum ter-commit (`git diff <file>`) untuk
   merekonstruksi seberapa jauh pekerjaan sudah berjalan — **tidak** langsung
   percaya laporan agent sebelum cutoff, karena laporan itu sendiri terpotong.
3. Kirim ulang instruksi ke agent yang sama (via `SendMessage`/resume) dengan
   ringkasan eksplisit "ini yang sudah commit, ini yang belum, lanjutkan dari
   sini" — bukan mengulang seluruh instruksi dari nol.
4. Setelah kejadian ke-2, seluruh instruksi batch berikutnya ditambah aturan
   eksplisit: **"commit as you go, jangan simpan semua sampai akhir"** —
   supaya interupsi berikutnya kehilangan pekerjaan sekecil mungkin.

**Pelajaran untuk sesi berikutnya:** jangan asumsikan satu batch besar akan
selesai dalam satu pemanggilan agent tanpa gangguan. Batch yang menyentuh
banyak file (schema + banyak dokumen + test) sebaiknya sudah dirancang untuk
commit bertahap sejak awal, bukan ditambahkan setelah kejadian pertama.

---

## 2. Lingkungan tidak punya `pnpm`

**Kejadian:** perintah `npx prisma generate` awalnya gagal dengan
`spawn pnpm ENOENT` karena `pnpm` (yang didefinisikan di `package.json` root)
tidak terpasang di environment eksekusi.

**Penanganan:** workaround environment-only —
`npm install --no-save --no-package-lock @prisma/client@5.20.0 prisma@5.20.0`
— tanpa mengubah `package.json` repo. Prisma versi 5.20.0 dipakai konsisten
di seluruh sesi setelah itu.

**Catatan:** ini bukan defect repo, murni keterbatasan environment eksekusi
agent. Perlu diverifikasi ulang di environment developer/CI yang sebenarnya
punya `pnpm` terpasang sesuai `pnpm-workspace.yaml`.

---

## 3. Test arsitektur rentan *false positive* akibat `prisma format`

**Kejadian (dicatat resmi sebagai `ALT-DEF-033`):** test arsitektur di
`packages/test-support/src/architecture/*.test.ts` awalnya mencocokkan teks
schema secara ketat (termasuk spasi/indentasi). Setiap kali `prisma format`
merapikan ulang kolom yang tidak disentuh batch tersebut (karena field baru
di model lain membuat kolom alignment melebar), test lama yang sebenarnya
masih valid ikut gagal — bukan karena regresi nyata.

**Contoh kejadian nyata:** minimal 2 kali (batch pembayaran/QRIS, batch
karyawan/absensi) sebuah test lama gagal setelah `prisma format`, dan harus
diverifikasi manual apakah ini regresi asli atau sekadar pergeseran kolom.

**Penanganan:**
- Ditambahkan helper `normalisasiSpasiHorizontal()` yang dipakai ulang di
  test-test berikutnya agar pencocokan tahan terhadap perubahan whitespace.
- Aturan proses ditambahkan ke setiap instruksi batch selanjutnya: **selalu
  jalankan ulang SEMUA test lama setelah `prisma format`, dan bedakan
  regresi asli dari false-positive sebelum mengubah assertion apa pun** —
  jangan refleks mengubah "needle" pencocokan.

**Risiko yang masih terbuka:** 10 file test lama (di luar 2 yang sempat
diperbaiki) masih memakai pencocokan teks yang sama rentannya — belum semua
dipindahkan ke pendekatan yang lebih tahan (mis. berbasis Prisma DMMF).
Ini tercatat sebagai bagian dari `ALT-DEF-033` yang masih terbuka sebagian.

---

## 4. Mutation test yang ternyata tidak benar-benar memutasi (no-op)

**Kejadian:** pada batch ledger persediaan, salah satu mutation test (test
yang sengaja merusak schema untuk membuktikan assertion tidak vakum) awalnya
"berhasil gagal dengan benar" — tapi setelah diperiksa, `str.replace` yang
dipakai untuk memutasi file **tidak benar-benar menemukan teks targetnya**
(karena perbedaan alignment akibat `prisma format`), sehingga schema tidak
pernah benar-benar diubah. Test yang "gagal dengan benar" itu sebenarnya
gagal karena alasan lain yang kebetulan sama.

**Penanganan:** batch tersebut mengubah cara verifikasi — setiap mutation
test sekarang **wajib di-diff dulu** (`diff` sebelum vs sesudah mutasi) untuk
membuktikan mutasi benar-benar terjadi, baru hasil "test gagal" itu dianggap
valid. Pola ini lalu diwajibkan di semua instruksi batch berikutnya.

**Pelajaran:** sebuah mutation test yang "lulus" (gagal dengan benar) tidak
otomatis membuktikan apa-apa jika mutasinya sendiri tidak pernah tervalidasi
benar-benar terjadi. Ini kelas kesalahan yang mudah lolos tanpa disadari.

---

## 5. Constraint ganda yang nyaris membuat perbaikan jadi *no-op*

**Kejadian (bagian dari `ALT-DEF-006`, KDS multi-stasiun):** `TiketDapur`
awalnya punya **dua** constraint unique yang sama-sama memaksa relasi 1:1
dengan `Pesanan`: `pesananId @unique` (constraint asli yang memang jadi
target perbaikan) **dan** `@@unique([tenantId, pesananId])` (ditambahkan
belakangan di batch isolasi tenant, hanya untuk keperluan composite-FK
pattern). Menghapus constraint pertama saja **tidak akan mengubah apa pun**
secara fungsional — constraint kedua tetap memaksa satu tiket per pesanan.

**Penanganan:** ditemukan dan diperbaiki dalam batch yang sama (kedua
constraint dihapus, diganti `@@unique([pesananId, stasiunDapurId,
nomorGelombang])`), dengan catatan eksplisit di laporan bahwa constraint
kedua "kalau dibiarkan akan membuat fix ini no-op".

**Pelajaran:** saat sebuah field yang sama muncul di lebih dari satu
constraint (karena alasan yang berbeda-beda dari batch yang berbeda-beda),
memperbaiki satu defect tanpa mengaudit *seluruh* constraint yang menyentuh
field tersebut berisiko menghasilkan perbaikan yang terlihat benar di kode
tapi tidak benar-benar mengubah perilaku.

---

## 6. Rencana perbaikan di `DEFECT-LEDGER.md` sendiri ternyata salah

Dua kali dalam sesi ini, rencana koreksi yang **sudah tertulis di ledger**
(baik dari prompt awal maupun dari batch sebelumnya) ternyata secara teknis
keliru, dan harus dikoreksi saat dikerjakan, bukan diikuti mentah-mentah:

- **`ALT-DEF-004`** (metode pembayaran) — rencana awal mengusulkan
  pembayaran campuran dimodelkan lewat banyak baris `AlokasiPembayaran`.
  Ini keliru secara konsep: `AlokasiPembayaran` memetakan uang ke *pesanan*,
  sedangkan pembayaran campuran (tunai + QRIS dalam satu transaksi) adalah
  soal memetakan uang ke *instrumen pembayaran* — itu peran
  `PembayaranMetodeBaris`, yang justru dipertahankan.
- **`ALT-DEF-007`** (versi resep) — rencana remediasi yang tertulis
  menyebut `ResepVarian`, `Subresep`, `RencanaProduksiHarian`, tapi **sama
  sekali tidak menyebut `KomponenResep`** — padahal itu model paling penting
  (tanpa itu, `VersiResep` cuma tabel metadata dekoratif, bukan perbaikan
  substansial).

**Penanganan:** kedua kasus dikoreksi saat pengerjaan, dengan penyimpangan
dari rencana tertulis di ledger didokumentasikan secara eksplisit (di ADR
terkait dan di sel ledger itu sendiri), bukan diikuti diam-diam maupun
disimpangi diam-diam.

**Pelajaran:** dokumen perencanaan (termasuk ledger dan checklist) bisa
salah, dan proses correction loop yang baik harus memvalidasi rencana itu
sendiri saat implementasi, bukan menganggapnya sebagai kebenaran mutlak.

---

## 7. `MASTER-CHECKLIST.md` berulang kali ditemukan punya kesalahan konten

Sepanjang 14 batch domain, ditemukan berulang kali (bukan sekali) bahwa
`MASTER-CHECKLIST.md` — dokumen yang seharusnya jadi sumber kebenaran
requirement — punya kesalahan konten nyata:

- Acceptance criteria yang salah secara substansi (`ALT-KSR-004`,
  `ALT-ANL-010` — sama-sama mencampur konsep alokasi pembayaran dengan
  baris metode pembayaran).
- Kolom "Ketergantungan" yang rusak: requirement yang bergantung pada
  dirinya sendiri, atau bergantung pada requirement yang tidak ada
  (`ALT-DEF-036`, lalu diperluas dan diperbaiki di `ALT-DEF-041` — 18 baris
  total ditemukan bermasalah).
- Referensi ke nama model yang **tidak pernah benar-benar dibangun**
  (`PolaShift`, `PenilaianKaryawan`, `ResepVarian`, dll — ditemukan di
  batch resep, dapur, promo, dan HR).
- Kode permission yang direferensikan di checklist tapi tidak pernah di-seed,
  dan sebaliknya kode di seed yang tidak pernah direferensikan checklist
  (`ALT-DEF-034`, `ALT-DEF-040`).

**Penanganan:** setiap kesalahan yang ditemukan dikoreksi langsung di batch
yang menemukannya (dengan catatan eksplisit di laporan), dan pola berulang
ini akhirnya membuat instruksi setiap batch baru secara eksplisit meminta
agent untuk **tidak mempercayai buta** isi `MASTER-CHECKLIST.md`/
`DEFECT-LEDGER.md`, melainkan memverifikasi silang terhadap schema/dokumen
nyata sebelum bertindak.

**Risiko yang masih terbuka:** karena polanya berulang di hampir setiap
batch, kemungkinan besar **masih ada** baris checklist yang belum diaudit
(terutama di 7 domain yang belum pernah dapat batch koreksi khusus — lihat
`CORRECTION-LOOP-STATUS.md`).

---

## 8. Constraint yang secara teknis tidak bisa diekspresikan murni oleh Prisma

Beberapa aturan bisnis krusial ternyata **tidak bisa** dijamin murni lewat
Prisma schema DSL, dan harus didokumentasikan jujur sebagai keterbatasan,
bukan dipalsukan dengan constraint yang terlihat benar tapi sebenarnya salah:

- **Satu QRIS aktif per outlet** (`KonfigurasiQris`) dan **satu versi resep
  aktif per resep** (`VersiResep`) — butuh *partial unique index* Postgres
  (`WHERE status = 'AKTIF'`), yang tidak bisa ditulis di Prisma DSL. SQL
  mentah dibuat di `prisma/migrations/manual/` tapi **belum pernah
  dieksekusi** di database nyata sampai laporan terakhir batch persediaan.
- **XOR pada target resep** (`Resep` harus terikat ke tepat satu dari
  ItemMenu/VarianMenu/Bahan) — sama, butuh CHECK constraint SQL mentah.
- **Promo `repeatable`** (`ALT-DEF-038`, masih terbuka) — kombinasi
  "promo yang sama boleh berulang di satu pesanan JIKA `repeatable=true`,
  tapi tidak boleh jika `false`" ternyata **tidak bisa** diekspresikan
  bahkan dengan partial unique index (butuh trigger, karena predikatnya
  perlu join ke tabel lain) — dicatat jujur sebagai defect terbuka, bukan
  dipaksakan dengan constraint yang salah.

**Pelajaran:** ada kelas aturan bisnis yang secara struktural berada di luar
kemampuan Prisma schema DSL. Constraint yang "terlihat mendekati benar"
(mis. `@@unique([tenantId, outletId, status])` untuk "satu aktif per
outlet") justru **salah secara diam-diam** — akan menolak kombinasi valid
lain (mis. dua konfigurasi NONAKTIF) sambil terlihat seperti sudah aman.

---

## 9. Ditemukan terlambat: environment sebenarnya punya PostgreSQL lokal

**Kejadian paling signifikan:** sepanjang seluruh correction loop (14 batch
domain + sync traceability), setiap upaya `prisma migrate dev` selalu
diasumsikan gagal karena "tidak ada PostgreSQL di environment ini"
(`ALT-DEF-029`), berdasarkan kegagalan `P1010` di batch-batch awal. Baru di
**batch verifikasi akhir**, ditemukan bahwa environment ini ternyata punya
**instance PostgreSQL lokal aktif** (`lsof -i :5432` menunjukkan proses
nyata, trust-auth, user `icat`).

Setelah ditemukan, agent membuat database kosong sekali pakai, menjalankan
migration penuh dari schema final — **berhasil, 134 tabel terbentuk** — lalu
menghapus database dan file migration percobaan tersebut (tidak ada artefak
tersisa di repo).

**Dampak:** status `DIBLOKIR` yang dipakai konsisten di 41 dari 42 defect
sepanjang sesi **ternyata berdasarkan asumsi yang tidak lengkap** — bukan
salah (migration terhadap database kosong belum pernah benar-benar
diverifikasi sebelumnya, jadi tidak fair menutup defect atas dasar itu),
tapi seharusnya bisa diverifikasi jauh lebih awal jika environment dicek
ulang setelah kegagalan pertama, bukan diasumsikan tetap sama sepanjang sesi.

**Yang TIDAK berubah meski migration berhasil:** 5 file SQL manual (partial
unique index, CHECK constraint) tetap belum pernah dieksekusi; tidak ada
integration test nyata yang jalan terhadap database ini; temuan ini tidak
otomatis berlaku di environment CI/developer lain. Status `DIBLOKIR` untuk
keperluan penutupan defect **tetap dipertahankan** — tapi asumsi dasarnya
sekarang lebih akurat.

**Pelajaran untuk sesi berikutnya:** jangan asumsikan hasil pengecekan
environment di awal sesi tetap berlaku sepanjang sesi yang panjang —
terutama setelah banyak interupsi/resume, environment eksekusi bisa berubah
atau asumsi awal bisa saja keliru sejak awal. Cek ulang secara berkala,
terutama sebelum menutup sebuah defect yang bergantung pada keterbatasan
environment.

---

## Ringkasan cepat

| Kendala | Kelas masalah | Status |
|---|---|---|
| Interupsi sesi 4x | Operasional/proses | Ditangani via commit-as-you-go |
| Tidak ada `pnpm` | Environment | Workaround `npm install` |
| Test brittle whitespace | Kualitas test (`ALT-DEF-033`) | Sebagian diperbaiki, sebagian terbuka |
| Mutation test no-op | Kualitas test | Ditemukan & diperbaiki |
| Constraint ganda TiketDapur | Nyaris jadi fix palsu | Ditemukan & diperbaiki dalam batch sama |
| Rencana ledger keliru (2x) | Kualitas dokumen perencanaan | Dikoreksi saat implementasi |
| MASTER-CHECKLIST keliru (berulang) | Kualitas dokumen requirement | Dikoreksi bertahap, kemungkinan belum tuntas |
| Constraint di luar kemampuan Prisma (3 kasus) | Keterbatasan teknis nyata | Didokumentasikan jujur, 1 masih terbuka (`ALT-DEF-038`) |
| Asumsi "tidak ada Postgres" ternyata tidak lengkap | Asumsi environment | Ditemukan di batch akhir, didokumentasikan |
