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
    PESANAN ||--o{ PESANAN_RETUR : bisa_diretur
    PESANAN_RETUR ||--o{ PESANAN_RETUR_BARIS : berisi
    ITEM_PESANAN ||--o{ PESANAN_RETUR_BARIS : diretur_sebagian

    PESANAN {
        string id PK
        string tenantId FK
        string outletId FK
        string mejaId FK "nullable, mis. take-away"
        string pelangganId FK "nullable"
        string kanal "KASIR|PELAYAN|QR_PELANGGAN"
        string nomorPesanan UK "unik per outlet per hari"
        string status "DRAF|DIKIRIM|MENUNGGU_PERSETUJUAN|DITERIMA|DITOLAK|MENUNGGU_PEMBAYARAN|DIKONFIRMASI|DIKIRIM_KE_DAPUR|SEDANG_DISIAPKAN|SIAP|DISAJIKAN|SELESAI|DIBATALKAN - DIRETUR DIHAPUS ADR-036, lihat statusRetur"
        string statusRetur "ADR-036, cache turunan: TANPA_RETUR|RETUR_SEBAGIAN|RETUR_PENUH, ORTOGONAL thd status di atas"
        bigint subtotal "rupiah"
        bigint totalDiskon "rupiah"
        bigint totalPajak "rupiah"
        bigint totalServiceCharge "rupiah"
        bigint totalAkhir "rupiah"
        string dibuatOlehId FK
        datetime createdAt
        datetime dibatalkanPada "nullable"
        int version "ADR-035, optimistic locking"
    }
    PESANAN_RETUR {
        string id PK
        string tenantId FK
        string outletId FK
        string pesananId FK
        string nomorRetur UK "unik per tenant+outlet"
        string status "DRAF|DIAJUKAN|DISETUJUI|DITOLAK|DIPROSES|SELESAI|DIBATALKAN, ADR-036"
        string alasan
        string diajukanOlehId FK "KeanggotaanOutlet"
        string disetujuiOlehId FK "nullable, KeanggotaanOutlet"
        bigint totalNilaiRetur "rupiah"
        datetime createdAt
        datetime updatedAt
        int version "ADR-035, optimistic locking - aggregate root tambahan"
    }
    PESANAN_RETUR_BARIS {
        string id PK
        string tenantId FK
        string pesananReturId FK
        string itemPesananId FK
        int kuantitasDikembalikan
        bigint nilaiPengembalian "rupiah"
        string alasanBaris "nullable"
        datetime createdAt
    }
    ITEM_PESANAN {
        string id PK
        string pesananId FK
        string itemMenuId FK
        string varianMenuId FK "nullable"
        int kuantitas
        bigint hargaSatuan "rupiah, snapshot saat pemesanan (legacy - lihat kolom *Snapshot di bawah)"
        string catatan "nullable, mis. tanpa es"
        string status "DRAF|DITERIMA|DIKIRIM_KE_DAPUR|DITAHAN|SEDANG_DISIAPKAN|SIAP|DISAJIKAN|DIBATALKAN|DIRETUR"
        string namaItemSnapshot "ALT-DEF-016, diisi sekali, tidak pernah diperbarui"
        string namaVarianSnapshot "nullable, ALT-DEF-016"
        bigint hargaDasarSnapshot "rupiah, ALT-DEF-016"
        bigint hargaVarianSnapshot "rupiah, default 0, ALT-DEF-016"
        bigint hargaModifierSnapshot "rupiah, sum(ItemPesananModifier.totalSnapshot), ALT-DEF-016"
        bigint diskonSnapshot "rupiah, default 0, ALT-DEF-016"
        bigint pajakSnapshot "rupiah, default 0, ALT-DEF-016"
        bigint serviceChargeSnapshot "rupiah, default 0, ALT-DEF-016"
        bigint totalBarisSnapshot "rupiah, ALT-DEF-016"
        string resepVersiId "nullable, forward-ref TANPA FK ke VersiResep (belum ada model, scope ALT-DEF-008/007), ALT-DEF-016"
    }
    ITEM_PESANAN_MODIFIER {
        string id PK
        string itemPesananId FK
        string modifierOpsiId FK
        bigint hargaTambahan "rupiah, snapshot (legacy - lihat kolom *Snapshot di bawah)"
        string namaModifierSnapshot "ALT-DEF-016"
        bigint hargaSnapshot "rupiah, ALT-DEF-016"
        int jumlah "default 1, kuantitas modifier ini (mis. extra cheese x2), ALT-DEF-016"
        bigint totalSnapshot "rupiah, hargaSnapshot * jumlah, ALT-DEF-016"
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
        string jenisPembatalan "SEBELUM_PRODUKSI (default)|SETELAH_PRODUKSI, ADR-036"
        string dibatalkanOlehId FK
        string disetujuiOlehId FK "nullable - WAJIB jika jenisPembatalan=SETELAH_PRODUKSI (CHECK constraint DB, ADR-036)"
        datetime createdAt
    }
```

Catatan:

- Alur `PESANAN.status` mengikuti state machine "Pesanan" (14 status penuh) di `docs/arsitektur/STATE-MACHINES.md`; setiap transisi dicatat di `PESANAN_RIWAYAT_STATUS` (append-only, untuk audit & analitik) - kolom `statusSebelumnya`/`statusBaru` sekarang bertipe enum `StatusPesanan`, BUKAN `String` bebas seperti sebelumnya (`ALT-DEF-005`).
- **Snapshot (`ALT-DEF-016`):** `ItemPesanan`/`ItemPesananModifier` menyimpan salinan LENGKAP nama item/varian/modifier + rincian harga (dasar/varian/modifier/diskon/pajak/service charge/total baris) pada saat pemesanan dalam kolom `*Snapshot` - diisi SEKALI saat item ditambahkan, TIDAK PERNAH diperbarui setelahnya. Relasi `itemMenuId`/`varianMenuId`/`modifierOpsiId` tetap dipertahankan untuk traceability ke definisi menu terkini, tetapi bukan lagi sumber tampilan histori - perubahan nama/harga menu di kemudian hari tidak mengubah tampilan pesanan lama. Kolom `hargaSatuan`/`hargaTambahan` lama dipertahankan apa adanya untuk kompatibilitas, kolom `*Snapshot` adalah sumber kebenaran baru.
- `ItemPesanan.resepVersiId` adalah forward-reference (scalar `String?` polos, TANPA relasi FK) ke model `VersiResep` yang BELUM ADA di skema ini (scope `ALT-DEF-007`/`ALT-DEF-008`, batch resep-versioning berikutnya) - lihat ADR-017 Keputusan 8.
- **Perubahan pesanan pasca-konfirmasi** dicatat sebagai baris baru APPEND-ONLY di `PESANAN_PERUBAHAN` (`ALT-PES-010`) - tidak pernah menimpa `ItemPesanan` secara diam-diam.
- **Penolakan** (`PESANAN_PENOLAKAN`) hanya relevan untuk pesanan kanal `QR_PELANGGAN` yang melalui `MENUNGGU_PERSETUJUAN -> DITOLAK`; pesanan yang ditolak BOLEH diedit dan dikirim ulang (`DITOLAK -> DIKIRIM`, lihat ADR-017 Keputusan 2) tanpa membuat baris `Pesanan` baru.
- **Pembatalan seluruh pesanan** (`PESANAN_PEMBATALAN`) berbeda dari pembatalan SATU item (`ItemPesanan.status = DIBATALKAN`, yang tidak membatalkan pesanan induk) - lihat ADR-017 Keputusan 4. `DIBATALKAN` adalah status terminal: tidak dapat dicapai lagi dari `SIAP`/`DISAJIKAN`/`SELESAI` **KECUALI** lewat jalur `VOID_SETELAH_PRODUKSI` (`jenisPembatalan = SETELAH_PRODUKSI`, ADR-036 - lihat `STATE-MACHINES.md` bagian 1a).
- **ADR-036 (retur, menggantikan `DIRETUR`):** `StatusPesanan.DIRETUR` DIHAPUS - retur kini model penuh `PESANAN_RETUR`/`PESANAN_RETUR_BARIS` (state machine `StatusRetur` sendiri, lihat `STATE-MACHINES.md` bagian 11) yang mendukung retur SEBAGIAN per item, BUKAN flag order-level tunggal. `Pesanan.statusRetur` adalah cache turunan (ORTOGONAL terhadap `status`) yang direkomputasi OTOMATIS oleh trigger database `recompute_status_retur_pesanan` setiap `PesananRetur` mencapai `SELESAI` - efek samping: `Pesanan.version` ikut bertambah (lihat ADR-036 Keputusan 2, ADR-035). `PesananRetur.nomorRetur` unik per (`tenantId`, `outletId`); aktor (`diajukanOlehId`/`disetujuiOlehId`) memakai composite-FK `KeanggotaanOutlet` mengikuti pola `Pesanan.dibuatOleh` (ADR-033).
- **ADR-036 (void setelah produksi):** `PesananPembatalan.jenisPembatalan` (`SEBELUM_PRODUKSI` default/`SETELAH_PRODUKSI`) membedakan pembatalan yang hanya melepas reservasi stok dari pembatalan setelah bahan SUDAH terpakai (side-effect harus `CatatanWaste`/`MutasiStok(WASTE)`, BUKAN reversal). `disetujuiOlehId` (composite-FK `KeanggotaanTenant`, sama seperti `dibatalkanOlehId`) WAJIB diisi ketika `jenisPembatalan = SETELAH_PRODUKSI` - ditegakkan CHECK constraint database `pesanan_pembatalan_approval_wajib_setelah_produksi`, bukan hanya validasi aplikasi.
- `packages/dapur` membaca domain ini HANYA lewat read-contract `kontrak-dapur` (subset field: id pesanan, item, catatan, status dapur, meja/nomor) - lihat `08-dapur.md`. Kardinalitas `TiketDapur.pesananId` (masih 1:1) TIDAK diubah pada batch ini - itu scope `ALT-DEF-006`.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PESANAN.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`; `PESANAN.mejaId` (nullable) kini composite-FK level-outlet `(outletId, mejaId) -> Meja(outletId, id)` - menjamin meja yang dirujuk berada di outlet yang sama dengan pesanan; `PESANAN.pelangganId` (nullable) kini composite-FK `(tenantId, pelangganId) -> Pelanggan(tenantId, id)`.
- **ADR-033:** `Pesanan.dibuatOlehId` dipindah ke composite-FK OUTLET-LEVEL `(tenantId, outletId, dibuatOlehId) -> KeanggotaanOutlet(tenantId, outletId, id)`; `PesananPerubahan.diubahOlehId`/`PesananPenolakan.ditolakOlehId`/`PesananPembatalan.dibatalkanOlehId` dipindah ke composite-FK TENANT-LEVEL `(tenantId, xxxOlehId) -> KeanggotaanTenant(tenantId, id)` - seluruhnya sebelumnya FK langsung ke `Pengguna`. **Gap diketahui, TIDAK diubah batch ini:** `PesananRiwayatStatus.diubahOlehId` TIDAK punya kolom `tenantId` sendiri sehingga tidak bisa memakai composite-FK tanpa menambah kolom tersebut - dicatat eksplisit di `docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md`, bukan dilewati diam-diam. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
