# ERD - Karyawan & Absensi

```mermaid
erDiagram
    TENANT ||--o{ KARYAWAN : mempekerjakan
    KARYAWAN }o--|| PENGGUNA : terhubung_ke_akun
    KARYAWAN }o--|| JABATAN : menjabat
    OUTLET ||--o{ JADWAL_SHIFT : punya
    KARYAWAN ||--o{ PENUGASAN_SHIFT : ditugaskan
    JADWAL_SHIFT ||--o{ PENUGASAN_SHIFT : dijadwalkan
    KARYAWAN ||--o{ ABSENSI : mencatat
    KARYAWAN ||--o{ CUTI_IZIN : mengajukan

    JABATAN {
        string id PK
        string tenantId FK
        string nama "mis. Kasir, Kepala Dapur, Manajer Outlet"
    }
    KARYAWAN {
        string id PK
        string tenantId FK
        string penggunaId FK UK "nullable, tidak semua karyawan punya akun login"
        string jabatanId FK
        string outletUtamaId FK
        string nomorInduk UK
        string status "AKTIF|CUTI|NONAKTIF"
        datetime tanggalBergabung
    }
    JADWAL_SHIFT {
        string id PK
        string tenantId FK
        string outletId FK
        string nama "mis. Pagi, Siang, Malam"
        string jamMulai
        string jamSelesai
    }
    PENUGASAN_SHIFT {
        string id PK
        string karyawanId FK
        string jadwalShiftId FK
        date tanggal
        string status "DIJADWALKAN|DIBATALKAN"
    }
    ABSENSI {
        string id PK
        string tenantId FK
        string outletId FK
        string karyawanId FK
        datetime jamMasuk
        datetime jamPulang "nullable"
        string metode "QR|PIN|GPS|MANUAL_SUPERVISOR"
        string status "TEPAT_WAKTU|TERLAMBAT|PULANG_AWAL|LEMBUR"
    }
    CUTI_IZIN {
        string id PK
        string karyawanId FK
        string jenis "CUTI_TAHUNAN|SAKIT|IZIN"
        date tanggalMulai
        date tanggalSelesai
        string status "DIAJUKAN|DISETUJUI|DITOLAK"
        string disetujuiOlehId FK "nullable"
    }
```

Catatan:

- `KARYAWAN.penggunaId` terhubung ke `PENGGUNA` (bagian Platform) hanya jika karyawan tersebut memiliki akses login sistem; peran/permission tetap diatur lewat `packages/otorisasi`.
- Semua koreksi absensi (mis. lupa presensi) dicatat sebagai baris `ABSENSI` baru dengan `metode = MANUAL_SUPERVISOR`, bukan mengedit baris asli.
