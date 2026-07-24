# Review ShadyERP - Referensi untuk Altora Resto

Status dokumen: **DRAF AWAL, berbasis riset nyata**. Repo yang direview:
`Cat-tj/ShadyERP` (publik di GitHub), ditemukan lewat `gh search repos ShadyERP` dan
dibaca lewat `gh repo view Cat-tj/ShadyERP` pada 2026-07-24. Nama produknya sendiri
di README adalah **"Altora - Kasir & Manajemen Toko untuk UMKM"** (repo GitHub-nya
bernama ShadyERP, tapi produknya menyebut diri "Altora" juga - kemungkinan nama kode
lama/berbeda dari nama repo). Isi di bawah ini dirangkum dari README repo tersebut
(`docs/ARSITEKTUR.md` dan `docs/SKEMA-DATABASE.md` di dalam repo itu sendiri TIDAK
dibaca penuh dalam sesi ini - hanya README tingkat atas yang diambil lewat `gh repo
view`). Jangan menganggap ringkasan ini lengkap sampai dokumen internal repo tersebut
turut dibaca.

## 1. Ringkasan produk ShadyERP

SaaS multi-tenant untuk UMKM Indonesia (coffee shop, restoran, barbershop, toko
kecil) dengan konsep **Hub & Modul**: setelah login, user memilih salah satu dari 4
hub (Kasir & Operasional, Tim, Finance, Admin) alih-alih langsung masuk dashboard
tunggal. Modul non-inti (Booking, Pemesanan Digital, Member, HR, Keuangan, Promo)
bisa dinyalakan/dimatikan per tenant.

**Stack teknis:** Next.js 16 (App Router, Server Components + Server Actions),
TypeScript, Tailwind CSS v4, Prisma ORM 7 dengan `@prisma/adapter-pg`, PostgreSQL,
Auth.js (NextAuth v5). Bahasa dominan menurut GitHub: TypeScript (~93%), CSS, sedikit
JavaScript dan Shell.

**Peran:** Owner, Manager, Staff (3 peran flat, tanpa peran granular seperti
Kasir/Pelayan/Dapur/Gudang terpisah).

**Fitur utama yang relevan untuk dibandingkan dengan Altora Resto:**

- Kasir (POS): buka/tutup shift, grid produk + varian/topping, multi metode bayar
  (Tunai, QRIS, Transfer, E-Wallet, Saldo Deposit member), retur sebagian item
  (berbeda dari void total), struk digital.
- Produk & stok: riwayat perubahan stok manual (audit trail), **transfer stok antar
  outlet** (fitur yang tidak ada secara eksplisit di rancangan Altora Resto saat
  ini).
- Pembelian: Supplier dengan kontrak harga khusus per produk + MOQ, alur PO
  (Draft -> Disetujui/Dikirim -> Dikonfirmasi supplier -> Diterima), **Barang Masuk
  dengan Quality Control** (jumlah lolos QC vs rusak dicatat terpisah, stok baru
  bertambah setelah QC selesai) - lebih detail dari rancangan Altora Resto yang saat
  ini hanya punya `PenerimaanBarang`/`PenerimaanBarangBaris` tanpa kolom QC eksplisit.
  Opname stok dengan verifikasi Owner/Manager.
- Member & loyalitas: kartu QR/ULID, halaman publik `/q/[uid]` tanpa login untuk
  member melihat profil/poin/saldo sendiri, saldo deposit sebagai metode bayar.
- Pemesanan mandiri QR meja: **stok direservasi atomik saat pesanan dibuat** (bukan
  saat dibayar) untuk mencegah race condition pada stok terbatas - ini konsisten
  dengan RISK-002 yang sudah dicatat di `docs/engineering/RISK-REGISTER.md`, dan
  layak dijadikan referensi pola mitigasi konkret.
  Open bill per meja (gabung beberapa pesanan QR jadi satu tagihan sebelum bayar) +
  kalkulator patungan.
- Kitchen Display sederhana (`/dapur`) dengan alur baru -> dimasak -> siap.
- Promo terjadwal berbasis hari/jam (happy hour), aktif otomatis tanpa input manual,
  diskon terbesar dipakai (tidak ditumpuk).
- Booking/appointment generik (potong rambut, dsb) - relevan untuk model bisnis lain,
  kurang relevan langsung untuk restoran murni.
- Mode offline POS: transaksi disimpan di IndexedDB saat offline, disinkronkan ulang
  saat online kembali; transaksi gagal sinkron mengantre dengan pesan error alih-alih
  dipaksa sukses.
- Cetak struk lewat ESC/POS + RawBT (Android) ke printer thermal, selain print
  dialog browser.
- Log audit untuk aksi sensitif + rate limiting endpoint publik/sensitif.
- Ekspor CSV (ber-BOM UTF-8, supaya terbaca benar di Excel).
- Dokumen & tanda tangan digital (E-Sign) dengan urutan tanda tangan bertahap -
  fitur standalone, di luar cakupan domain restoran Altora Resto saat ini.
- Panel super-admin terpisah untuk memantau semua tenant & langganan/paket.
- PWA dengan service worker cache-first untuk aset statis, network-first untuk data;
  endpoint `GET /api/health` untuk keep-warm mengatasi cold start serverless.

## 2. Prinsip teknis ShadyERP yang relevan untuk Altora Resto

- **Isolasi multi-tenant wajib eksplisit**: setiap fungsi service menerima `tenantId`
  sebagai parameter pertama, setiap query Prisma wajib `where: { tenantId }`, dan
  `tenantId` tidak pernah diambil dari input klien - selalu dari sesi
  (`requireSession()`) kecuali dua endpoint publik yang didokumentasikan eksplisit
  (kartu member via `uid`, meja via `qrToken`) yang menurunkan `tenantId` dari record
  yang diresolusi lewat token unik. **Ini sangat sejalan dengan RISK-001 dan ADR-009
  di dokumen Altora Resto** - pola "helper query terpusat yang menyuntik filter
  tenant" yang direncanakan Altora Resto punya preseden konkret di sini.
- **Uang selalu Int rupiah**, diformat lewat satu fungsi `formatRupiah()` terpusat -
  sama persis dengan ADR-005 Altora Resto.
- Pola satu fitur baru: migrasi Prisma (dengan file migration, bukan cuma edit
  schema) -> service -> Server Action -> Server Component (fetch awal) -> Client
  Component (interaktivitas). Pola ini bisa diadopsi langsung untuk
  `ENGINEERING-LOOP-PLAN.md` tahap "IMPLEMENTASI" Altora Resto.
- Model data disebut "60+ model" di `prisma/schema.prisma` mereka - skala yang
  sebanding dengan skema Altora Resto (~70 model di `prisma/schema/schema.prisma`).

## 3. Perbedaan desain yang disengaja dari Altora Resto

- ShadyERP memakai 3 peran flat (Owner/Manager/Staff); Altora Resto memakai 9 peran
  granular (lihat `docs/keamanan/PERMISSION-MATRIX.md`) karena target Altora Resto
  adalah restoran dengan pembagian kerja lebih tegas (kasir/pelayan/dapur/gudang
  berbeda orang, berbeda layar) - bukan toko kecil dengan staf serba bisa.
- ShadyERP tidak memisahkan domain "Dapur" sebagai read-contract formal dari
  Pesanan/Sale secara eksplisit di level arsitektur (setahu dari README); Altora
  Resto menegakkannya lewat `.dependency-cruiser.cjs` (ADR-007) - lebih ketat karena
  KDS adalah kebutuhan inti restoran, bukan fitur tambahan.
- ShadyERP punya modul E-Sign dan Booking generik lintas jenis usaha (barbershop,
  dsb); Altora Resto sengaja tidak mencakup ini karena fokus spesifik ke operasional
  restoran.
- ShadyERP: QRIS sebagai satu dari beberapa metode bayar standar tanpa penjelasan
  eksplisit "manual vs otomatis" di README; Altora Resto secara eksplisit mendesain
  QRIS mode manual sebagai keputusan sementara (ADR-003) dengan rencana migrasi.

## 4. Rekomendasi konkret untuk Altora Resto berdasarkan review ini

1. Pertimbangkan menambahkan **reservasi stok atomik saat pesanan QR dibuat**
   (bukan saat dibayar) sebagai mitigasi RISK-002, meniru pola ShadyERP - ini butuh
   diskusi ADR baru sebelum diimplementasikan karena mengubah alur `ALT-PSN-001`.
2. Pertimbangkan menambah kolom **Quality Control** (jumlah lolos vs rusak) di
   `PenerimaanBarangBaris` bila kebutuhan bisnis restoran target memang butuh QC
   granular saat terima barang - saat ini `docs/database/05-supplier-pembelian.md`
   dan skema Prisma Altora Resto belum punya kolom ini; perlu keputusan produk
   eksplisit dulu, jangan ditambahkan diam-diam ke skema.
3. Pola isolasi tenant ShadyERP (parameter `tenantId` wajib pertama di setiap fungsi
   service, dua pengecualian didokumentasikan eksplisit) layak dijadikan konvensi
   kode tertulis untuk `packages/tenant` Altora Resto saat implementasi dimulai.
4. Mode offline POS (IndexedDB + retry) adalah fitur yang belum ada di rancangan
   Altora Resto sama sekali - layak dicatat sebagai kandidat requirement masa depan
   di `docs/engineering/MASTER-CHECKLIST.md` jika target pengguna (restoran dengan
   koneksi internet tidak stabil) membutuhkannya, tapi TIDAK ditambahkan ke checklist
   dalam dokumen ini karena belum ada keputusan produk eksplisit.

## 5. Keterbatasan review ini

- Hanya README tingkat atas repo yang dibaca (`gh repo view`); `docs/ARSITEKTUR.md`
  dan `docs/SKEMA-DATABASE.md` di dalam repo ShadyERP sendiri **tidak** dibuka baris
  per baris dalam sesi ini - detail model data & alur status yang lebih presisi ada
  di sana, belum diverifikasi di sini.
- Kode sumber ShadyERP (isi `src/server/services/*`, dsb.) tidak dibaca - review ini
  murni berdasarkan deskripsi README, bukan audit kode nyata.
- Tidak ada klaim bahwa ShadyERP "lebih baik" atau "lebih buruk" dari Altora Resto -
  keduanya target pasar yang tumpang tindih sebagian (F&B) tapi skop berbeda (ShadyERP
  lebih luas ke ritel umum/UMKM lintas jenis usaha, Altora Resto fokus spesifik
  restoran multi-outlet dengan alur dapur formal).
