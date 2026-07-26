# ERD - Pelanggan & Keanggotaan

```mermaid
erDiagram
    TENANT ||--o{ PELANGGAN : mendaftar
    PELANGGAN ||--o| KEANGGOTAAN : punya
    KEANGGOTAAN }o--|| TIER_KEANGGOTAAN : berada_di
    KEANGGOTAAN ||--o{ POIN_RIWAYAT : mencatat
    KEANGGOTAAN ||--o{ LEDGER_STEMPEL : mencatat
    HADIAH_STEMPEL ||--o{ LEDGER_STEMPEL : ditukar_sebagai
    PELANGGAN ||--o{ LEDGER_SALDO_TOKO : mencatat
    PELANGGAN ||--o{ PERSETUJUAN_PELANGGAN : menyatakan
    PELANGGAN ||--o{ RIWAYAT_GABUNG_PELANGGAN : "penyintas (utama)"
    PELANGGAN ||--o| RIWAYAT_GABUNG_PELANGGAN : "korban (gabungan)"
    PELANGGAN ||--o{ PESANAN : memesan
    PELANGGAN ||--o{ RESERVASI : memesan_meja
    PELANGGAN ||--o{ KUPON : memiliki
    PESANAN ||--o{ POIN_RIWAYAT : memicu
    PESANAN ||--o{ LEDGER_STEMPEL : memicu
    PESANAN ||--o{ LEDGER_SALDO_TOKO : memicu
    PEMBAYARAN ||--o{ LEDGER_SALDO_TOKO : "menghasilkan (metode SALDO_TOKO)"

    PELANGGAN {
        string id PK
        string tenantId FK
        string namaLengkap
        string nomorTelepon UK "unik per tenant"
        string email "nullable"
        string status "AKTIF|DIGABUNGKAN"
        int saldoTokoCache "CACHE, bukan sumber kebenaran - lihat LEDGER_SALDO_TOKO"
        datetime createdAt
    }
    TIER_KEANGGOTAAN {
        string id PK
        string tenantId FK
        string nama "mis. Silver, Gold, Platinum"
        int minPoinKumulatif
        json benefit
    }
    KEANGGOTAAN {
        string id PK
        string tenantId FK "ALT-DEF-018: sebelumnya TIDAK ADA sama sekali"
        string pelangganId FK UK
        string tierKeanggotaanId FK
        int poinAktif "CACHE, bukan sumber kebenaran - lihat POIN_RIWAYAT"
        int poinKumulatif "CACHE, sepanjang masa, untuk penentuan tier"
        string status "AKTIF|NONAKTIF"
        datetime bergabungPada
    }
    POIN_RIWAYAT {
        string id PK
        string tenantId FK "ALT-DEF-018: sebelumnya TIDAK ADA sama sekali"
        string keanggotaanId FK
        string pesananId FK "nullable"
        string jenis "PEROLEHAN|PENUKARAN|PENYESUAIAN|PEMBALIKAN|KADALUARSA"
        int jumlah "positif=masuk, negatif=keluar"
        datetime kadaluarsaPada "nullable, hanya baris PEROLEHAN"
        string alasan "WAJIB (ADR-032)"
        string membalikMutasiId FK "nullable UK - di baris PEMBALIK, ADR-032 (dulu dibalikOlehId)"
        string dicatatOlehId FK "nullable - null untuk baris sistem"
        string catatan "nullable"
        datetime createdAt
    }
    HADIAH_STEMPEL {
        string id PK
        string tenantId FK
        int jumlahStempelDibutuhkan
        string deskripsi
        string itemGratisId FK "nullable, -> ItemMenu"
        boolean aktif
        datetime createdAt
    }
    LEDGER_STEMPEL {
        string id PK
        string tenantId FK
        string keanggotaanId FK
        string jenis "PEROLEHAN|PENUKARAN|PEMBALIKAN|PENYESUAIAN"
        int jumlah
        string pesananId FK "nullable"
        string hadiahStempelId FK "nullable, hanya baris PENUKARAN"
        string alasan "WAJIB (ADR-032)"
        string membalikMutasiId FK "nullable UK - di baris PEMBALIK, ADR-032"
        string dicatatOlehId FK "nullable"
        string catatan "nullable"
        datetime createdAt
    }
    LEDGER_SALDO_TOKO {
        string id PK
        string tenantId FK
        string pelangganId FK "digantung ke Pelanggan, BUKAN Keanggotaan - lihat catatan"
        string jenis "PENAMBAHAN|PEMAKAIAN|REFUND|PENYESUAIAN|PEMBALIKAN"
        int jumlah "rupiah, positif=masuk, negatif=keluar"
        string pesananId FK "nullable"
        string pembayaranId FK "nullable - terisi bila dihasilkan oleh Pembayaran metode SALDO_TOKO"
        string alasan "WAJIB (ADR-032)"
        string membalikMutasiId FK "nullable UK - di baris PEMBALIK, ADR-032"
        string dicatatOlehId FK "nullable"
        string catatan "nullable"
        datetime createdAt
    }
    PERSETUJUAN_PELANGGAN {
        string id PK
        string tenantId FK
        string pelangganId FK
        string jenisPersetujuan "PEMASARAN|DATA_PRIBADI|WHATSAPP_NOTIFIKASI (aspirasional)"
        boolean disetujui
        datetime disetujuiPada
        datetime dicabutPada "nullable"
        datetime createdAt
    }
    RIWAYAT_GABUNG_PELANGGAN {
        string id PK
        string tenantId FK
        string pelangganUtamaId FK "penyintas"
        string pelangganGabunganId FK UK "korban, paling banyak sekali jadi korban"
        string digabungOlehId FK
        string alasan "nullable"
        datetime createdAt
    }
```

Catatan:

- **Aturan emas (ADR-027):** seluruh saldo pelanggan (poin, stempel, saldo
  toko) WAJIB bersumber dari ledger append-only masing-masing (`POIN_RIWAYAT`,
  `LEDGER_STEMPEL`, `LEDGER_SALDO_TOKO`). `KEANGGOTAAN.poinAktif`/
  `poinKumulatif` dan `PELANGGAN.saldoTokoCache` adalah **cache terdokumentasi**,
  bukan sumber kebenaran - pola identik `StokBahan`/`MutasiStok` (ADR-023).
  Bila cache dan ledger berbeda, ledger yang benar.
- `POIN_RIWAYAT`/`LEDGER_STEMPEL`/`LEDGER_SALDO_TOKO` bersifat append-only,
  UNKONDISIONAL (no hard-delete, ADR-006); koreksi selalu berupa baris
  **PEMBALIK** baru (dibuat lewat INSERT, tidak pernah UPDATE) yang
  mereferensikan baris asal lewat `membalikMutasiId` (kolom di sisi
  PEMBALIK, arah TERBALIK dari desain lama `dibalikOlehId` - lihat ADR-032,
  redesain dari ADR-023 Keputusan 5/ADR-027). **DITEGAKKAN DATABASE dan
  DIUJI NYATA** sejak batch ADR-032 (menutup ALT-DEF-043 - trigger
  `ledger_tolak_ubah()`/`ledger_validasi_pembalik()`, fungsi GENERIK yang
  sama dipakai `MutasiStok` juga, dipasang ke ketiga tabel ini di migrasi
  `redesign_ledger_reversal_membalik_pattern` dan diverifikasi lewat
  `ledger-reversal-membalik-invariants.test.ts`) - bukan lagi disiplin
  level-aplikasi semata.
- Kenaikan tier dievaluasi dari `poinKumulatif` terhadap
  `TIER_KEANGGOTAAN.minPoinKumulatif`, dijalankan sebagai proses terpisah
  (bukan trigger DB implisit) agar bisa diaudit.
- **`TIER_MEMBERSHIP` -> `TIER_KEANGGOTAAN` (rename, ADR-027 Keputusan 1):**
  `MASTER-CHECKLIST.md` (`ALT-MBR-005`) sudah memakai nama `TierKeanggotaan`
  sejak awal - schema di-rename untuk selaras dengan dokumen. `PoinRiwayat`
  SENGAJA **dipertahankan** namanya (bukan `LedgerPoin`) meski model BARU
  memakai konvensi `Ledger*` - lihat ADR-027 Keputusan 1 untuk rasional
  asimetri penamaan ini.
- **`LEDGER_SALDO_TOKO` digantung ke `PELANGGAN`, BUKAN `KEANGGOTAAN`**
  (ADR-027 Keputusan 3): pelanggan bisa punya saldo toko (mis. dari
  refund-ke-saldo) tanpa pernah mendaftar program loyalitas/tier - keduanya
  independen. Mensyaratkan `Keanggotaan` sebagai prasyarat akan menolak kasus
  pakai yang sah.
- **Program stempel (`HADIAH_STEMPEL`/`LEDGER_STEMPEL`, ALT-DEF-039):**
  requirement yang sebelumnya hilang total dari `MASTER-CHECKLIST.md` (Step 0
  audit correction-loop menemukan master spec bagian "FITUR KEANGGOTAAN"
  eksplisit mencantumkan "Stempel"/"Hadiah"). Enum `JenisLedgerStempel`
  SENGAJA terpisah dari `JenisPoinRiwayat` (dua program loyalitas independen,
  ADR-027 Keputusan 5) dan **sengaja tanpa nilai kedaluwarsa** - kebijakan
  kedaluwarsa stempel belum punya dasar keputusan produk.
- **Consent (`PERSETUJUAN_PELANGGAN`) dan merge (`RIWAYAT_GABUNG_PELANGGAN`,
  ALT-DEF-023):** profil pelanggan yang digabung (`pelangganGabunganId`)
  **tidak pernah dihapus** - hanya ditandai `Pelanggan.status = DIGABUNGKAN`
  (no hard-delete, ADR-006) agar histori `Pesanan`/`Reservasi`/ledger lama
  tetap punya referential integrity. Transfer saldo saat merge dilakukan lewat
  **pasangan entri ledger baru** (`PENYESUAIAN` negatif di ledger korban,
  `PENYESUAIAN` positif di ledger penyintas, direferensikan lewat `catatan`
  tekstual), **bukan** repointing FK baris ledger lama - lihat ADR-027
  Keputusan 4 untuk rasional lengkap (repointing FK akan merusak riwayat: baris
  lama akan terlihat seolah terjadi di keanggotaan yang salah).
- `WHATSAPP_NOTIFIKASI` pada `JenisPersetujuanPelanggan` bersifat
  **aspirasional** - mencatat consent untuk kanal tersebut sah dimodelkan
  sekarang, tetapi TIDAK membatalkan keputusan `ALT-DEF-017` bahwa notifikasi
  sistem HANYA in-app/internal.
- **ALT-DEF-010 (lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):**
  `PELANGGAN` mendapat `@@unique([tenantId, id])` tambahan agar
  `Pesanan`/`Reservasi`/`LedgerSaldoToko`/`PersetujuanPelanggan`/
  `RiwayatGabungPelanggan` bisa memakai composite-FK
  `(tenantId, pelangganId) -> Pelanggan(tenantId, id)` saat merujuk pelanggan.
  `KEANGGOTAAN` dan `TIER_KEANGGOTAAN` mendapat perlakuan yang sama
  (`@@unique([tenantId, id])`) sebagai bagian penutupan `ALT-DEF-018`.
- **ADR-033:** `PoinRiwayat.dicatatOlehId`/`LedgerStempel.dicatatOlehId`/`LedgerSaldoToko.dicatatOlehId` (semuanya nullable untuk baris sistem) dan `RiwayatGabungPelanggan.digabungOlehId` dipindah dari FK langsung ke `Pengguna` menjadi composite-FK TENANT-LEVEL `(tenantId, xxxOlehId) -> KeanggotaanTenant(tenantId, id)`. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
