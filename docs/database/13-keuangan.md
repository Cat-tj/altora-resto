# ERD - Keuangan Internal

```mermaid
erDiagram
    OUTLET ||--o{ REKAP_KAS_HARIAN : menghasilkan
    GILIRAN_KASIR ||--o| REKAP_KAS_HARIAN : merangkum
    OUTLET ||--o{ BIAYA_OPERASIONAL : mencatat
    KATEGORI_BIAYA ||--o{ BIAYA_OPERASIONAL : mengelompokkan

    KATEGORI_BIAYA {
        string id PK
        string tenantId FK
        string nama "mis. Listrik, Sewa, Gaji, Bahan Baku Non-Resep"
    }
    REKAP_KAS_HARIAN {
        string id PK
        string tenantId FK
        string outletId FK
        string giliranKasirId FK "nullable, bisa merangkum >1 giliran"
        date tanggal
        int totalPenjualan "rupiah"
        int totalRefund "rupiah"
        int totalDiskon "rupiah"
        int selisihKas "rupiah, modalAkhirDihitung - modalAkhirSistem"
        string status "DRAF|DIVERIFIKASI"
        string diverifikasiOlehId FK "nullable"
    }
    BIAYA_OPERASIONAL {
        string id PK
        string tenantId FK
        string outletId FK
        string kategoriBiayaId FK
        int jumlah "rupiah"
        string keterangan
        string status "DIAJUKAN|DISETUJUI|DIBAYAR|DIBATALKAN"
        string dicatatOlehId FK
        datetime createdAt
    }
```

Catatan:

- Tidak ada hard-delete pada data keuangan - pembatalan biaya operasional memakai `status = DIBATALKAN`, bukan penghapusan baris.
- `REKAP_KAS_HARIAN` adalah agregat harian yang dihasilkan dari `GILIRAN_KASIR`, `PEMBAYARAN`, dan `PEMBAYARAN_REFUND` (domain Pembayaran/Kasir) - lihat `09-pembayaran-kasir.md`.
- Modul Keuangan pada rilis awal bersifat "keuangan internal restoran" (rekap kas & biaya operasional), belum termasuk akuntansi/pembukuan penuh (neraca, buku besar berpasangan) - itu di luar cakupan bagian 12 spec untuk fase ini.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `REKAP_KAS_HARIAN.outletId` kini composite-FK ke `Outlet(tenantId, id)`, dan `REKAP_KAS_HARIAN.giliranKasirId` (nullable) kini composite-FK `(tenantId, giliranKasirId) -> GiliranKasir(tenantId, id)`. `BIAYA_OPERASIONAL.outletId` kini composite-FK ke `Outlet(tenantId, id)`, dan `BIAYA_OPERASIONAL.kategoriBiayaId` kini composite-FK `(tenantId, kategoriBiayaId) -> KategoriBiaya(tenantId, id)`.
