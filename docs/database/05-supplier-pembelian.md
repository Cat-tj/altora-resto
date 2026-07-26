# ERD - Supplier & Pembelian

```mermaid
erDiagram
    TENANT ||--o{ SUPPLIER : bekerja_sama
    SUPPLIER ||--o{ PURCHASE_ORDER : menerima
    OUTLET ||--o{ PURCHASE_ORDER : membuat
    PURCHASE_ORDER ||--o{ PURCHASE_ORDER_BARIS : berisi
    BAHAN ||--o{ PURCHASE_ORDER_BARIS : dipesan
    PURCHASE_ORDER ||--o{ PENERIMAAN_BARANG : direalisasikan
    PENERIMAAN_BARANG ||--o{ PENERIMAAN_BARANG_BARIS : berisi
    BAHAN ||--o{ PENERIMAAN_BARANG_BARIS : diterima
    PENERIMAAN_BARANG ||--o{ RETUR_PEMBELIAN : dapat_diretur

    SUPPLIER {
        string id PK
        string tenantId FK
        string nama
        string kontak
        string status "AKTIF|NONAKTIF"
    }
    PURCHASE_ORDER {
        string id PK
        string tenantId FK
        string outletId FK
        string supplierId FK
        string nomorPo UK
        string status "DRAFT|DIAJUKAN|DISETUJUI|DIKIRIM_SUPPLIER|DITERIMA_SEBAGIAN|DITERIMA_PENUH|DIBATALKAN"
        int totalEstimasi "rupiah"
        string dibuatOlehId FK
        datetime createdAt
    }
    PURCHASE_ORDER_BARIS {
        string id PK
        string purchaseOrderId FK
        string bahanId FK
        decimal jumlahDipesan
        int hargaSatuan "rupiah"
    }
    PENERIMAAN_BARANG {
        string id PK
        string purchaseOrderId FK
        string gudangId FK
        string nomorPenerimaan UK
        datetime diterimaPada
        string diterimaOlehId FK
    }
    PENERIMAAN_BARANG_BARIS {
        string id PK
        string penerimaanBarangId FK
        string bahanId FK
        decimal jumlahDiterima
        int hargaSatuanAktual "rupiah"
    }
    RETUR_PEMBELIAN {
        string id PK
        string tenantId FK
        string penerimaanBarangId FK
        string alasan
        string status "DIAJUKAN|DISETUJUI|DITOLAK|SELESAI"
        datetime createdAt
    }
```

Catatan:

- Alur status `PURCHASE_ORDER` mengikuti state machine "Pembelian" di `docs/arsitektur/STATE-MACHINES.md`.
- `PENERIMAAN_BARANG_BARIS` yang diterima memicu baris baru di `MUTASI_STOK` (jenis `MASUK_PEMBELIAN`) - lihat `04-persediaan.md`.
- Pembatalan PO tidak menghapus baris - hanya mengubah `status` menjadi `DIBATALKAN`.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PURCHASE_ORDER.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`, dan `PURCHASE_ORDER.supplierId` kini composite-FK `(tenantId, supplierId) -> Supplier(tenantId, id)` - menjamin PO tidak bisa merujuk supplier milik tenant lain. `PENERIMAAN_BARANG` sebelumnya TIDAK punya `tenantId` sama sekali (gap ditemukan saat audit) - kini ditambahkan `tenantId` + DUA composite-FK sekaligus ke `PurchaseOrder(tenantId, id)` dan `Gudang(tenantId, id)`.
- **ADR-033:** `PurchaseOrder.dibuatOlehId` dipindah ke composite-FK OUTLET-LEVEL `(tenantId, outletId, dibuatOlehId) -> KeanggotaanOutlet(tenantId, outletId, id)`; `PenerimaanBarang.diterimaOlehId` dipindah ke composite-FK TENANT-LEVEL `(tenantId, diterimaOlehId) -> KeanggotaanTenant(tenantId, id)` - keduanya sebelumnya FK langsung ke `Pengguna`. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
