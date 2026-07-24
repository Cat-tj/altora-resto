# ERD - Pesanan

```mermaid
erDiagram
    OUTLET ||--o{ PESANAN : menerima
    MEJA ||--o{ PESANAN : untuk
    PELANGGAN ||--o{ PESANAN : memesan
    PESANAN ||--o{ ITEM_PESANAN : berisi
    ITEM_MENU ||--o{ ITEM_PESANAN : dipesan_sebagai
    VARIAN_MENU ||--o{ ITEM_PESANAN : dipilih
    ITEM_PESANAN ||--o{ ITEM_PESANAN_MODIFIER : punya
    MODIFIER_OPSI ||--o{ ITEM_PESANAN_MODIFIER : dipilih
    PESANAN ||--o{ PESANAN_RIWAYAT_STATUS : mencatat
    PESANAN ||--o{ PESANAN_PERUBAHAN : mencatat
    PESANAN ||--o| PESANAN_PENOLAKAN : bisa_ditolak
    PESANAN ||--o| PESANAN_PEMBATALAN : bisa_dibatalkan
    PESANAN ||--o{ PEMBAYARAN : dilunasi_oleh
    PESANAN ||--o| PROMO_PEMAKAIAN : memakai

    PESANAN {
        string id PK
        string tenantId FK
        string outletId FK
        string mejaId FK "nullable, mis. take-away"
        string pelangganId FK "nullable"
        string kanal "KASIR|PELAYAN|QR_PELANGGAN"
        string nomorPesanan UK "unik per outlet per hari"
        string status "DRAF|DIKIRIM|MENUNGGU_PERSETUJUAN|DITERIMA|DITOLAK|MENUNGGU_PEMBAYARAN|DIKONFIRMASI|DIKIRIM_KE_DAPUR|SEDANG_DISIAPKAN|SIAP|DISAJIKAN|SELESAI|DIBATALKAN|DIRETUR"
        int subtotal "rupiah"
        int totalDiskon "rupiah"
        int totalPajak "rupiah"
        int totalServiceCharge "rupiah"
        int totalAkhir "rupiah"
        string dibuatOlehId FK
        datetime createdAt
        datetime dibatalkanPada "nullable"
    }
    ITEM_PESANAN {
        string id PK
        string pesananId FK
        string itemMenuId FK
        string varianMenuId FK "nullable"
        int kuantitas
        int hargaSatuan "rupiah, snapshot saat pemesanan (legacy - lihat kolom *Snapshot di bawah)"
        string catatan "nullable, mis. tanpa es"
        string status "DRAF|DITERIMA|DIKIRIM_KE_DAPUR|DITAHAN|SEDANG_DISIAPKAN|SIAP|DISAJIKAN|DIBATALKAN|DIRETUR"
        string namaItemSnapshot "ALT-DEF-016, diisi sekali, tidak pernah diperbarui"
        string namaVarianSnapshot "nullable, ALT-DEF-016"
        int hargaDasarSnapshot "rupiah, ALT-DEF-016"
        int hargaVarianSnapshot "rupiah, default 0, ALT-DEF-016"
        int hargaModifierSnapshot "rupiah, sum(ItemPesananModifier.totalSnapshot), ALT-DEF-016"
        int diskonSnapshot "rupiah, default 0, ALT-DEF-016"
        int pajakSnapshot "rupiah, default 0, ALT-DEF-016"
        int serviceChargeSnapshot "rupiah, default 0, ALT-DEF-016"
        int totalBarisSnapshot "rupiah, ALT-DEF-016"
        string resepVersiId "nullable, forward-ref TANPA FK ke VersiResep (belum ada model, scope ALT-DEF-008/007), ALT-DEF-016"
    }
    ITEM_PESANAN_MODIFIER {
        string id PK
        string itemPesananId FK
        string modifierOpsiId FK
        int hargaTambahan "rupiah, snapshot (legacy - lihat kolom *Snapshot di bawah)"
        string namaModifierSnapshot "ALT-DEF-016"
        int hargaSnapshot "rupiah, ALT-DEF-016"
        int jumlah "default 1, kuantitas modifier ini (mis. extra cheese x2), ALT-DEF-016"
        int totalSnapshot "rupiah, hargaSnapshot * jumlah, ALT-DEF-016"
    }
    PESANAN_RIWAYAT_STATUS {
        string id PK
        string pesananId FK
        string statusSebelumnya "enum StatusPesanan (ALT-DEF-005, sebelumnya String bebas)"
        string statusBaru "enum StatusPesanan (ALT-DEF-005, sebelumnya String bebas)"
        string diubahOlehId FK
        datetime createdAt
    }
    PESANAN_PERUBAHAN {
        string id PK
        string tenantId FK
        string pesananId FK
        string jenisPerubahan "enum JenisPerubahanPesanan: TAMBAH_ITEM|UBAH_KUANTITAS|HAPUS_ITEM|PINDAH_MEJA|SPLIT|MERGE|LAINNYA"
        json sebelum "nullable, snapshot bagian yang berubah"
        json sesudah "nullable, snapshot bagian yang berubah"
        string diubahOlehId FK
        datetime createdAt
    }
    PESANAN_PENOLAKAN {
        string id PK
        string tenantId FK
        string pesananId FK UK "satu baris per pesanan, lihat ADR-017 Keputusan 3"
        string alasan
        string ditolakOlehId FK
        datetime createdAt
    }
    PESANAN_PEMBATALAN {
        string id PK
        string tenantId FK
        string pesananId FK UK "satu baris per pesanan - DIBATALKAN status terminal, ADR-017 Keputusan 4"
        string alasan
        string dibatalkanOlehId FK
        datetime createdAt
    }
```

Catatan:

- Alur `PESANAN.status` mengikuti state machine "Pesanan" (14 status penuh) di `docs/arsitektur/STATE-MACHINES.md`; setiap transisi dicatat di `PESANAN_RIWAYAT_STATUS` (append-only, untuk audit & analitik) - kolom `statusSebelumnya`/`statusBaru` sekarang bertipe enum `StatusPesanan`, BUKAN `String` bebas seperti sebelumnya (`ALT-DEF-005`).
- **Snapshot (`ALT-DEF-016`):** `ItemPesanan`/`ItemPesananModifier` menyimpan salinan LENGKAP nama item/varian/modifier + rincian harga (dasar/varian/modifier/diskon/pajak/service charge/total baris) pada saat pemesanan dalam kolom `*Snapshot` - diisi SEKALI saat item ditambahkan, TIDAK PERNAH diperbarui setelahnya. Relasi `itemMenuId`/`varianMenuId`/`modifierOpsiId` tetap dipertahankan untuk traceability ke definisi menu terkini, tetapi bukan lagi sumber tampilan histori - perubahan nama/harga menu di kemudian hari tidak mengubah tampilan pesanan lama. Kolom `hargaSatuan`/`hargaTambahan` lama dipertahankan apa adanya untuk kompatibilitas, kolom `*Snapshot` adalah sumber kebenaran baru.
- `ItemPesanan.resepVersiId` adalah forward-reference (scalar `String?` polos, TANPA relasi FK) ke model `VersiResep` yang BELUM ADA di skema ini (scope `ALT-DEF-007`/`ALT-DEF-008`, batch resep-versioning berikutnya) - lihat ADR-017 Keputusan 8.
- **Perubahan pesanan pasca-konfirmasi** dicatat sebagai baris baru APPEND-ONLY di `PESANAN_PERUBAHAN` (`ALT-PES-010`) - tidak pernah menimpa `ItemPesanan` secara diam-diam.
- **Penolakan** (`PESANAN_PENOLAKAN`) hanya relevan untuk pesanan kanal `QR_PELANGGAN` yang melalui `MENUNGGU_PERSETUJUAN -> DITOLAK`; pesanan yang ditolak BOLEH diedit dan dikirim ulang (`DITOLAK -> DIKIRIM`, lihat ADR-017 Keputusan 2) tanpa membuat baris `Pesanan` baru.
- **Pembatalan seluruh pesanan** (`PESANAN_PEMBATALAN`) berbeda dari pembatalan SATU item (`ItemPesanan.status = DIBATALKAN`, yang tidak membatalkan pesanan induk) - lihat ADR-017 Keputusan 4. `DIBATALKAN` adalah status terminal: tidak dapat dicapai lagi dari `SIAP`/`DISAJIKAN`/`SELESAI` (lihat tabel transisi di `STATE-MACHINES.md`).
- `DIRETUR` hanya dapat dicapai dari `SELESAI`; model detail retur (`PesananRetur`, alokasi refund proporsional) adalah scope `ALT-PES-018`/`ALT-DEF-014`, batch domain kasir berikutnya - batch ini hanya menambahkan nilai enum dan baris transisi.
- `packages/dapur` membaca domain ini HANYA lewat read-contract `kontrak-dapur` (subset field: id pesanan, item, catatan, status dapur, meja/nomor) - lihat `08-dapur.md`. Kardinalitas `TiketDapur.pesananId` (masih 1:1) TIDAK diubah pada batch ini - itu scope `ALT-DEF-006`.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PESANAN.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`; `PESANAN.mejaId` (nullable) kini composite-FK level-outlet `(outletId, mejaId) -> Meja(outletId, id)` - menjamin meja yang dirujuk berada di outlet yang sama dengan pesanan; `PESANAN.pelangganId` (nullable) kini composite-FK `(tenantId, pelangganId) -> Pelanggan(tenantId, id)`.
