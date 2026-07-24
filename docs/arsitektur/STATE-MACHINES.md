# State Machine Inti Altora Resto

Tujuh state machine inti yang menjadi tulang punggung alur operasional restoran.

## 1. Pesanan

```mermaid
stateDiagram-v2
    [*] --> BARU: pesanan dibuat (kasir/pelayan/QR)
    BARU --> DIKONFIRMASI: dikonfirmasi staf/sistem
    BARU --> DIBATALKAN: dibatalkan sebelum konfirmasi
    DIKONFIRMASI --> DIPROSES_DAPUR: tiket dapur dibuat
    DIPROSES_DAPUR --> SIAP_DISAJIKAN: semua item selesai dimasak
    SIAP_DISAJIKAN --> DISAJIKAN: pelayan mengantar ke meja
    DISAJIKAN --> DIBAYAR: pembayaran dikonfirmasi lunas
    DIKONFIRMASI --> DIBATALKAN: dibatalkan (mis. stok habis)
    DIPROSES_DAPUR --> DIBATALKAN: dibatalkan dgn approval supervisor
    DIBAYAR --> [*]
    DIBATALKAN --> [*]
```

## 2. Pembayaran

```mermaid
stateDiagram-v2
    [*] --> MENUNGGU: pembayaran diinisiasi
    MENUNGGU --> DIKONFIRMASI: tunai diterima / QRIS diverifikasi manual / kartu approved
    MENUNGGU --> GAGAL: metode ditolak/timeout
    MENUNGGU --> DIBATALKAN: dibatalkan sebelum selesai
    DIKONFIRMASI --> DIREFUND: refund disetujui supervisor
    GAGAL --> MENUNGGU: dicoba ulang dgn metode lain
    DIKONFIRMASI --> [*]
    DIREFUND --> [*]
    DIBATALKAN --> [*]
```

## 3. Giliran Kasir (Shift)

```mermaid
stateDiagram-v2
    [*] --> DIBUKA: kasir membuka giliran + modal awal
    DIBUKA --> DITUTUP_MENUNGGU_VERIFIKASI: kasir menutup, hitung kas fisik
    DITUTUP_MENUNGGU_VERIFIKASI --> DITUTUP_SELESAI: supervisor verifikasi selisih kas
    DITUTUP_MENUNGGU_VERIFIKASI --> DIBUKA: dibuka kembali jika ada koreksi (approval supervisor)
    DITUTUP_SELESAI --> [*]
```

## 4. Meja

```mermaid
stateDiagram-v2
    [*] --> TERSEDIA
    TERSEDIA --> DIPESAN: reservasi dikonfirmasi
    TERSEDIA --> TERPAKAI: tamu duduk / pesanan dibuat
    DIPESAN --> TERPAKAI: tamu tiba
    DIPESAN --> TERSEDIA: reservasi dibatalkan/tidak hadir
    TERPAKAI --> PERLU_DIBERSIHKAN: pesanan lunas & tamu selesai
    PERLU_DIBERSIHKAN --> TERSEDIA: staf menandai meja bersih
    TERSEDIA --> NONAKTIF: meja ditutup sementara (maintenance)
    NONAKTIF --> TERSEDIA: meja dibuka kembali
```

## 5. Dapur (Tiket Dapur)

```mermaid
stateDiagram-v2
    [*] --> MASUK_ANTRIAN: tiket dibuat dari pesanan dikonfirmasi
    MASUK_ANTRIAN --> DIPROSES: staf dapur mulai masak
    DIPROSES --> SIAP: seluruh baris tiket selesai
    SIAP --> DIAMBIL_PELAYAN: pelayan mengambil dari pass
    DIAMBIL_PELAYAN --> [*]
```

## 6. Pembelian (Purchase Order)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: PO dibuat
    DRAFT --> DIAJUKAN: diajukan untuk approval
    DIAJUKAN --> DISETUJUI: disetujui manajer/owner
    DIAJUKAN --> DIBATALKAN: ditolak/dibatalkan
    DISETUJUI --> DIKIRIM_SUPPLIER: dikirim ke supplier
    DIKIRIM_SUPPLIER --> DITERIMA_SEBAGIAN: sebagian barang diterima
    DIKIRIM_SUPPLIER --> DITERIMA_PENUH: seluruh barang diterima
    DITERIMA_SEBAGIAN --> DITERIMA_PENUH: sisa barang diterima
    DITERIMA_SEBAGIAN --> DIBATALKAN: sisa PO dibatalkan (approval)
    DITERIMA_PENUH --> [*]
    DIBATALKAN --> [*]
```

## 7. Opname (Stok Opname)

```mermaid
stateDiagram-v2
    [*] --> DIRENCANAKAN: opname dijadwalkan
    DIRENCANAKAN --> BERLANGSUNG: perhitungan fisik dimulai
    BERLANGSUNG --> SELESAI: semua baris dihitung & selisih dicatat
    DIRENCANAKAN --> DIBATALKAN
    BERLANGSUNG --> DIBATALKAN: dibatalkan sebelum selesai
    SELESAI --> [*]
    DIBATALKAN --> [*]
```

## Catatan umum

- Semua transisi status wajib dicatat di tabel riwayat/audit terkait (`PESANAN_RIWAYAT_STATUS`, `AUDIT_LOG`, dsb) - lihat `docs/database/`.
- Transisi yang melibatkan pembatalan/koreksi finansial atau stok tidak pernah menghapus data - selalu lewat status baru atau entri pembalik, sesuai aturan no-hard-delete.
- Transisi yang memerlukan approval supervisor (mis. buka ulang giliran kasir, batalkan PO yang sudah diterima sebagian) tunduk pada limit di `docs/keamanan/PERMISSION-MATRIX.md`.
