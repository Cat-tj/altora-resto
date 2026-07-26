# Skema Database Altora Resto - Indeks ERD

ERD dipecah per domain agar mudah dibaca. Semua entitas mengikuti aturan umum (lihat `prisma/schema/`):

- ID memakai **ULID** (kolom `id String @id`).
- Setiap tabel transaksional/tenant-scoped membawa `tenantId` dan (jika relevan) `outletId`.
- Uang disimpan sebagai **BigInt** dalam rupiah (bukan Decimal/Float), no floating point (ADR-034, mengamandemen ADR-005 yang semula `Int` - dipindah ke `BigInt` karena field agregat/kumulatif seperti total penjualan harian per outlet dan saldo toko kumulatif berisiko realistis mendekati ceiling `Int`/int4 ~2,1 miliar pada skala bisnis multi-outlet besar; ceiling `BigInt`/int8 ~9,2×10^18). Field POIN loyalitas (`PoinRiwayat.jumlah`, `Keanggotaan.poinAktif`/`poinKumulatif`) dan jumlah STEMPEL (`LedgerStempel.jumlah`) TETAP `Int` karena bukan rupiah - lihat ADR-034 untuk daftar lengkap.
- Timestamp disimpan **UTC** (`createdAt`, `updatedAt`, dan timestamp event spesifik seperti `paidAt`, `voidedAt`).
- **Tidak ada hard-delete** pada data finansial, stok, dan audit - penghapusan dimodelkan lewat kolom status (`status`, `dibatalkanPada`, `membalikMutasiId`, dsb), bukan `DELETE` fisik. Pola reversal ledger (`MutasiStok`/`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko`) memakai `membalikMutasiId` di baris PEMBALIK menunjuk mundur ke baris asal (ADR-032) - baris asal tidak pernah di-UPDATE.

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
| [09-pembayaran-kasir.md](./09-pembayaran-kasir.md) | Giliran Kasir, Transaksi, Pembayaran, Alokasi Pembayaran, Koreksi, Refund, Struk |
| [10-promo.md](./10-promo.md) | Promo, Aturan Promo, Kupon, Pemakaian Promo |
| [11-pelanggan-keanggotaan.md](./11-pelanggan-keanggotaan.md) | Pelanggan, Membership, Tier, Poin |
| [12-karyawan-absensi.md](./12-karyawan-absensi.md) | Karyawan, Jabatan, Shift, Absensi, Cuti |
| [13-keuangan.md](./13-keuangan.md) | Rekap Kas, Biaya Operasional, Jurnal Sederhana |
| [14-analitik-read-model.md](./14-analitik-read-model.md) | Read model harian/agregat untuk dashboard analitik |
| [15-platform-infra.md](./15-platform-infra.md) | Idempotency Key, Domain Outbox Event, Notification (in-app) |
| [16-qris.md](./16-qris.md) | Konfigurasi QRIS statis per outlet, riwayat perubahan, konfirmasi manual |

Skema Prisma yang mengimplementasikan ERD ini ada di `prisma/schema/`.
