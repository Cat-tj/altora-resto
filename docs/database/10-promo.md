# ERD - Promo

ALT-DEF-009/ALT-DEF-030 (lihat ADR-026 di `docs/engineering/DECISION-LOG.md`):
domain promo dirancang ulang penuh untuk mendukung stacking (>1 promo per
pesanan), reward terpisah dari kondisi, penjadwalan hari/jam, cakupan outlet
ternormalisasi, dan simulasi/dry-run.

```mermaid
erDiagram
    TENANT ||--o{ PROMO : membuat
    PROMO ||--o{ PROMO_KONDISI : punya
    PROMO ||--o{ PROMO_REWARD : punya
    PROMO ||--o{ PROMO_JADWAL : punya
    PROMO ||--o{ PROMO_OUTLET : dibatasi_ke
    OUTLET ||--o{ PROMO_OUTLET : dicakup_oleh
    PROMO ||--o{ KUPON : dapat_punya
    PROMO ||--o{ PROMO_PEMAKAIAN : dipakai_di
    PROMO ||--o{ PROMO_SIMULASI : disimulasikan_untuk
    PESANAN ||--o{ PROMO_PEMAKAIAN : memakai
    KUPON ||--o{ PROMO_PEMAKAIAN : dipakai_lewat
    PELANGGAN ||--o{ KUPON : memiliki
    PROMO_PEMAKAIAN ||--o{ PROMO_PEMAKAIAN_BARIS : punya_rincian
    PROMO_PEMAKAIAN ||--o| PROMO_SNAPSHOT : punya_snapshot
    ITEM_PESANAN ||--o{ PROMO_PEMAKAIAN_BARIS : didiskon_di
    ITEM_MENU ||--o{ PROMO_REWARD : jadi_hadiah_gratis

    PROMO {
        string id PK
        string tenantId FK
        string nama
        datetime berlakuSejak
        datetime berlakuSampai
        string status "AKTIF|NONAKTIF|KADALUARSA"
        string stackingPolicy "TIDAK_BOLEH_DIGABUNG|BOLEH_DIGABUNG|AMBIL_DISKON_TERBAIK|BERDASARKAN_PRIORITAS"
        string conflictGroup "nullable, promo se-grup saling eksklusif"
        int prioritas "default 0, tie-breaker BERDASARKAN_PRIORITAS"
        bigint maximumDiscount "nullable, batas potongan rupiah"
        int usageQuota "nullable, kuota total lintas pelanggan"
        int usageLimitPerCustomer "nullable"
        int usageLimitPerOrder "nullable, default 1"
        boolean repeatable "default false, BOGO berulang dalam 1 pesanan"
        datetime createdAt
    }
    PROMO_KONDISI {
        string id PK
        string promoId FK
        string jenisSyarat "MIN_BELANJA|ITEM_TERTENTU|KATEGORI_TERTENTU|JAM_TERTENTU|HARI_TERTENTU|KANAL_TERTENTU|PELANGGAN_ANGGOTA|PELANGGAN_BARU|ULANG_TAHUN"
        json nilaiSyarat
    }
    PROMO_REWARD {
        string id PK
        string tenantId FK
        string promoId FK
        string jenis "DISKON_PERSEN|DISKON_NOMINAL|ITEM_GRATIS|HARGA_PAKET|BELI_X_BAYAR_Y"
        decimal nilaiPersen "nullable"
        int nilaiNominal "nullable"
        string itemGratisId FK "nullable, -> ItemMenu"
        int jumlahGratis "nullable"
        int hargaPaket "nullable"
        int syaratJumlahBeliX "nullable"
        int bayarJumlahY "nullable"
        boolean berlakuKelipatan "default false"
        boolean modifierIkutGratis "default false"
        int batasHadiahPerOrder "nullable"
    }
    PROMO_JADWAL {
        string id PK
        string tenantId FK
        string promoId FK
        int[] hariDalamMinggu "0=Minggu..6=Sabtu, [] = semua hari"
        string jamMulai
        string jamSelesai
    }
    PROMO_OUTLET {
        string id PK
        string tenantId FK
        string promoId FK
        string outletId FK
    }
    KUPON {
        string id PK
        string tenantId FK
        string promoId FK
        string kode UK
        string pelangganId FK "nullable, null = kupon umum"
        int kuotaPemakaian "nullable = tak terbatas"
        int jumlahDipakai "default 0"
        string status "AKTIF|NONAKTIF|HABIS"
    }
    PROMO_PEMAKAIAN {
        string id PK
        string tenantId FK
        string promoId FK
        string kuponId FK "nullable"
        string pesananId FK "TIDAK unik lagi - ALT-DEF-009"
        string status "DITERAPKAN|DIBATALKAN|DIRETUR"
        datetime createdAt
    }
    PROMO_PEMAKAIAN_BARIS {
        string id PK
        string tenantId FK
        string promoPemakaianId FK
        string itemPesananId FK "nullable, null = diskon level-order"
        bigint nilaiDiskon "rupiah"
        datetime createdAt
    }
    PROMO_SNAPSHOT {
        string id PK
        string tenantId FK
        string promoPemakaianId FK UK "1:1"
        json definisiPromo "salinan kondisi+reward+jadwal saat diterapkan"
        datetime createdAt
    }
    PROMO_SIMULASI {
        string id PK
        string tenantId FK
        string promoId FK "nullable"
        json inputKeranjang
        json hasilSimulasi
        string disimulasikanOlehId FK
        datetime createdAt
    }
```

Catatan:

- **ALT-DEF-009 (defect utama, lihat ADR-026):** `PROMO_PEMAKAIAN.pesananId`
  dulu `@unique`, sehingga satu pesanan hanya bisa memakai satu promo.
  Sekarang TIDAK unik - satu pesanan bisa punya banyak baris
  `PROMO_PEMAKAIAN` (satu per promo yang diterapkan, atau lebih dari satu
  untuk promo yang sama bila `Promo.repeatable = true`). Kombinasi mana yang
  boleh digabung ditentukan `Promo.stackingPolicy` + `Promo.conflictGroup` +
  `Promo.prioritas` - algoritma resolusi konflik lengkap didokumentasikan di
  ADR-026, BUKAN diimplementasikan di batch ini (itu business-logic
  `packages/promo`, di luar cakupan perubahan skema).
- **`Promo.jenis` (lama) digantikan `PromoReward.jenis`:** satu promo kini
  bisa punya lebih dari satu baris reward (mis. diskon persen + item
  gratis sekaligus). `Promo` murni mendefinisikan KAPAN/UNTUK SIAPA berlaku
  (kondisi + jadwal + outlet + stacking); `PromoReward` mendefinisikan
  BAGAIMANA diskon dihitung.
- **`PROMO_OUTLET` menutup ALT-DEF-030:** satu-satunya mekanisme cakupan
  outlet untuk promo (menggantikan nilai enum `OUTLET_TERTENTU` yang sudah
  dihapus dari `PROMO_KONDISI.jenisSyarat`). **Konvensi "kosong berarti
  semua":** promo TANPA baris `PROMO_OUTLET` berlaku di SELURUH outlet
  tenant tersebut; menambahkan baris mempersempit ke outlet yang disebut
  saja. Konvensi yang sama berlaku untuk `PROMO_JADWAL.hariDalamMinggu`
  kosong = semua hari.
- **`PROMO_PEMAKAIAN_BARIS` memisahkan header dari rincian:** satu
  `PROMO_PEMAKAIAN` (header "promo X diterapkan ke pesanan Y") bisa punya
  banyak baris (mis. BOGO yang menggratiskan 2 item = 2 baris). `nilaiDiskon`
  yang dulu ada langsung di `PROMO_PEMAKAIAN` pindah ke sini per baris; total
  potongan promo tersebut = SUM baris-barisnya.
- **`PROMO_SNAPSHOT` (1:1 dengan `PROMO_PEMAKAIAN`):** salinan definisi promo
  (kondisi+reward+jadwal) PERSIS saat diterapkan, prinsip sama dengan kolom
  `*Snapshot` di `ItemPesanan` (ALT-DEF-005/ADR-017). Perubahan `Promo` di
  kemudian hari tidak pernah menulis ulang histori pesanan lama.
- **`PROMO_SIMULASI` sengaja TIDAK terhubung ke `Pesanan`:** dry-run
  "apa efek promo ini pada keranjang ini" (ALT-PRM-015) bisa terjadi sebelum
  pesanan dibuat sama sekali; tidak menulis `PROMO_PEMAKAIAN` dan tidak
  mengurangi kuota.
- **Keterbatasan yang diketahui, TIDAK diimplementasikan di batch ini
  (dicatat sebagai ALT-DEF-038):** "promo non-repeatable paling banyak
  diterapkan sekali per pesanan" TIDAK bisa dijamin database sebagai
  constraint statis karena bergantung pada nilai `Promo.repeatable` di
  tabel LAIN (bukan predicate yang bisa diekspresikan partial unique index
  Postgres biasa) - hanya trigger yang bisa menjaminnya di level data,
  di luar scope "SQL manual terdokumentasi" batch ini. Aturan ditegakkan
  murni application-level untuk saat ini.
- Kombinasi promo dan urutan evaluasi divalidasi/dihitung di `packages/promo`
  saat kalkulasi total pesanan; `PROMO_PEMAKAIAN`/`PROMO_PEMAKAIAN_BARIS`
  menyimpan hasil akhir sebagai jejak audit, bukan hanya referensi promo.
- **ALT-DEF-010 (lihat ADR-013):** relasi `PROMO.tenant` tetap FK tunggal ke
  `TENANT` - itu aman tanpa composite-FK karena `Tenant.id` sudah menjadi
  identitas tenant itu sendiri. Seluruh model anak baru (`PROMO_REWARD`,
  `PROMO_JADWAL`, `PROMO_OUTLET`, `PROMO_PEMAKAIAN_BARIS`, `PROMO_SNAPSHOT`,
  `PROMO_SIMULASI`) memakai composite-FK `(tenantId, xId) -> X(tenantId, id)`
  mengikuti pola ADR-013.
- **ADR-033:** `PromoSimulasi.disimulasikanOlehId` dipindah dari FK langsung ke `Pengguna` menjadi composite-FK TENANT-LEVEL `(tenantId, disimulasikanOlehId) -> KeanggotaanTenant(tenantId, id)`. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
