# Skema Database Altora Resto - Indeks ERD

ERD dipecah per domain agar mudah dibaca. Semua entitas mengikuti aturan umum (lihat `prisma/schema/`):

- ID memakai **ULID** (kolom `id String @id`).
- Setiap tabel transaksional/tenant-scoped membawa `tenantId` dan (jika relevan) `outletId`.
- Uang disimpan sebagai **Int** dalam rupiah (bukan Decimal/Float), no floating point.
- Timestamp disimpan **UTC** (`createdAt`, `updatedAt`, dan timestamp event spesifik seperti `paidAt`, `voidedAt`).
- **Tidak ada hard-delete** pada data finansial, stok, dan audit - penghapusan dimodelkan lewat kolom status (`status`, `dibatalkanPada`, `dibalikOlehId`, dsb), bukan `DELETE` fisik.

## Daftar dokumen ERD per domain

| Dokumen | Domain |
|---|---|
| [01-platform.md](./01-platform.md) | Tenant, Outlet, Pengguna, Perangkat, Sesi |
| [02-menu-katalog.md](./02-menu-katalog.md) | Kategori, Menu/Item, Varian, Modifier |
| [03-resep-bahan.md](./03-resep-bahan.md) | Resep, Bill of Materials, Bahan |
| [04-persediaan.md](./04-persediaan.md) | Gudang, Stok, Mutasi Stok, Stok Opname |
| [05-supplier-pembelian.md](./05-supplier-pembelian.md) | Supplier, Purchase Order, Penerimaan, Retur |
| [06-meja-reservasi.md](./06-meja-reservasi.md) | Area, Meja, Reservasi |
| [07-pesanan.md](./07-pesanan.md) | Pesanan, Item Pesanan, Riwayat Status |
| [08-dapur.md](./08-dapur.md) | Tiket Dapur, Antrian Dapur (read-contract dari Pesanan) |
| [09-pembayaran-kasir.md](./09-pembayaran-kasir.md) | Giliran Kasir, Transaksi, Pembayaran, QRIS Manual, Struk |
| [10-promo.md](./10-promo.md) | Promo, Aturan Promo, Kupon, Pemakaian Promo |
| [11-pelanggan-keanggotaan.md](./11-pelanggan-keanggotaan.md) | Pelanggan, Membership, Tier, Poin |
| [12-karyawan-absensi.md](./12-karyawan-absensi.md) | Karyawan, Jabatan, Shift, Absensi, Cuti |
| [13-keuangan.md](./13-keuangan.md) | Rekap Kas, Biaya Operasional, Jurnal Sederhana |
| [14-analitik-read-model.md](./14-analitik-read-model.md) | Read model harian/agregat untuk dashboard analitik |

Skema Prisma yang mengimplementasikan ERD ini ada di `prisma/schema/`.
