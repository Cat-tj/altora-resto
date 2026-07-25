# ERD - Karyawan & Absensi

Status: **DIROMBAK (ALT-DEF-019/ALT-DEF-024/ALT-DEF-025, ADR-028)** - lihat
`docs/engineering/DECISION-LOG.md` ADR-028 untuk rasional lengkap setiap
keputusan desain di bawah.

```mermaid
erDiagram
    TENANT ||--o{ KARYAWAN : mempekerjakan
    TENANT ||--o{ DEPARTEMEN : punya
    KARYAWAN }o--|| PENGGUNA : terhubung_ke_akun
    KARYAWAN ||--o{ KARYAWAN_OUTLET : bekerja_di
    OUTLET ||--o{ KARYAWAN_OUTLET : mempekerjakan
    KARYAWAN ||--o{ HUBUNGAN_KERJA : riwayat_employment
    JABATAN ||--o{ HUBUNGAN_KERJA : diisi_oleh
    DEPARTEMEN ||--o{ HUBUNGAN_KERJA : menaungi
    OUTLET ||--o{ TEMPLATE_SHIFT : punya
    KARYAWAN ||--o{ JADWAL_KERJA : ditugaskan
    TEMPLATE_SHIFT ||--o{ JADWAL_KERJA : dijadwalkan
    POLA_JADWAL_BERULANG ||--o{ JADWAL_KERJA : menghasilkan
    JADWAL_KERJA ||--o{ PERMINTAAN_TUKAR_SHIFT : diajukan_tukar
    KARYAWAN ||--o{ ABSENSI : mencatat
    PERANGKAT |o--o{ ABSENSI : merekam
    ABSENSI ||--o{ KOREKSI_ABSENSI : dikoreksi
    ABSENSI ||--o{ ISTIRAHAT_ABSENSI : diselingi
    KARYAWAN ||--o{ CUTI_IZIN : mengajukan
    KARYAWAN ||--o{ PERMINTAAN_LEMBUR : mengajukan
    KARYAWAN ||--o{ TARGET_KINERJA : ditetapkan
    KARYAWAN ||--o{ PENILAIAN_KINERJA : dinilai

    JABATAN {
        string id PK
        string tenantId FK
        string nama "mis. Kasir, Kepala Dapur, Manajer Outlet"
    }
    DEPARTEMEN {
        string id PK
        string tenantId FK
        string nama "mis. Dapur, FOH, Gudang, Admin"
        string status "AKTIF|NONAKTIF"
    }
    KARYAWAN {
        string id PK
        string tenantId FK
        string penggunaId FK UK "nullable, tidak semua karyawan punya akun login"
        string nomorInduk UK
        string status "AKTIF|CUTI|NONAKTIF"
        datetime tanggalBergabung
    }
    KARYAWAN_OUTLET {
        string id PK
        string tenantId FK
        string karyawanId FK
        string outletId FK
        bool isUtama "menandai SATU outlet default penjadwalan/pelaporan"
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    HUBUNGAN_KERJA {
        string id PK
        string tenantId FK
        string karyawanId FK
        string jabatanId FK
        string departemenId FK "nullable"
        string tipeHubungan "TETAP|KONTRAK|PARUH_WAKTU|MAGANG"
        datetime mulaiPada
        datetime berakhirPada "nullable"
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    TEMPLATE_SHIFT {
        string id PK
        string tenantId FK
        string outletId FK
        string nama "mis. Pagi, Siang, Malam"
        string jamMulai "HH:mm, String (lihat catatan)"
        string jamSelesai "HH:mm, String (lihat catatan)"
        bool lintasTengahMalam "true jika jamSelesai jatuh di hari berikutnya"
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    JADWAL_KERJA {
        string id PK
        string tenantId FK
        string outletId FK
        string karyawanId FK
        string templateShiftId FK
        string polaBerulangId FK "nullable, jejak asal-usul saja"
        date tanggal
        string status "DIJADWALKAN|DIKONFIRMASI|DIBATALKAN|SELESAI"
        datetime createdAt
    }
    POLA_JADWAL_BERULANG {
        string id PK
        string tenantId FK
        string outletId FK
        string karyawanId FK
        string templateShiftId FK
        int[] hariDalamMinggu "0=Minggu..6=Sabtu"
        date tanggalMulai
        date tanggalSelesai "nullable"
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    PERMINTAAN_TUKAR_SHIFT {
        string id PK
        string tenantId FK
        string jadwalKerjaAsalId FK
        string karyawanPemohonId FK
        string karyawanPenggantiId FK "nullable"
        string disetujuiOlehId FK "nullable, -> Pengguna"
        string status "DIAJUKAN|DISETUJUI_REKAN|DISETUJUI_MANAJER|DITOLAK|DIBATALKAN"
        datetime createdAt
    }
    ABSENSI {
        string id PK
        string tenantId FK
        string outletId FK
        string karyawanId FK
        string perangkatId FK "nullable, ALT-HR-017"
        datetime jamMasuk "IMMUTABLE - bukti presensi apa adanya"
        datetime jamPulang "nullable, IMMUTABLE"
        datetime jamMasukEfektif "nullable, CACHE - hanya ditulis via KoreksiAbsensi disetujui"
        datetime jamPulangEfektif "nullable, CACHE"
        string metode "QR|PIN|GPS|MANUAL_SUPERVISOR"
        string status "TEPAT_WAKTU|TERLAMBAT|PULANG_AWAL|LEMBUR"
        decimal lokasiLat "nullable, ALT-HR-016 geofence"
        decimal lokasiLng "nullable"
        decimal jarakDariOutletMeter "nullable"
    }
    KOREKSI_ABSENSI {
        string id PK
        string tenantId FK
        string absensiId FK
        string diajukanOlehId FK "-> Pengguna"
        string disetujuiOlehId FK "nullable, -> Pengguna"
        datetime jamMasukSebelum "snapshot saat pengajuan"
        datetime jamMasukSesudah "nullable, nilai diusulkan"
        datetime jamPulangSebelum "nullable, snapshot"
        datetime jamPulangSesudah "nullable, nilai diusulkan"
        string alasan
        string status "DIAJUKAN|DISETUJUI|DITOLAK"
        datetime createdAt
    }
    ISTIRAHAT_ABSENSI {
        string id PK
        string tenantId FK
        string absensiId FK
        datetime mulaiPada
        datetime selesaiPada "nullable"
        string jenis "nullable"
        datetime createdAt
    }
    CUTI_IZIN {
        string id PK
        string tenantId FK
        string karyawanId FK
        string jenis "CUTI_TAHUNAN|SAKIT|IZIN"
        date tanggalMulai
        date tanggalSelesai
        string status "DIAJUKAN|DISETUJUI|DITOLAK"
        string disetujuiOlehId FK "nullable"
    }
    PERMINTAAN_LEMBUR {
        string id PK
        string tenantId FK
        string karyawanId FK
        date tanggal
        datetime jamMulai
        datetime jamSelesai
        string alasan
        string status "DIAJUKAN|DISETUJUI|DITOLAK"
        string disetujuiOlehId FK "nullable"
        datetime createdAt
    }
    TARGET_KINERJA {
        string id PK
        string tenantId FK
        string karyawanId FK
        string periode "mis. 2026-Q1"
        string deskripsi
        decimal targetNilai "nullable"
        datetime createdAt
    }
    PENILAIAN_KINERJA {
        string id PK
        string tenantId FK
        string karyawanId FK
        string dinilaiOlehId FK "-> Pengguna"
        string periode
        decimal skor "nullable"
        string catatan "nullable"
        datetime createdAt
    }
```

Catatan:

- **ALT-DEF-019 (ADR-028 Keputusan 1) - Historisasi jabatan.**
  `KARYAWAN.jabatanId` DIHAPUS - jabatan/departemen kini melekat pada
  `HUBUNGAN_KERJA` (riwayat employment), bukan identitas statis karyawan.
  Jabatan AKTIF didapat lewat query `HubunganKerja` dengan `status = AKTIF`
  dan `berakhirPada` null/di masa depan, urut `mulaiPada DESC`, ambil satu -
  pola sama seperti versi resep aktif pada `VersiResep`.
- **ALT-DEF-019 (ADR-028 Keputusan 2) - Multi-outlet.**
  `KARYAWAN.outletUtamaId` (FK tunggal) DIHAPUS SEPENUHNYA - digantikan
  `KARYAWAN_OUTLET` many-to-many. `isUtama` menandai outlet default untuk
  penjadwalan/pelaporan. Ini perubahan BREAKING TAPI BENAR - satu-satunya
  sumber kebenaran sekarang `KaryawanOutlet.isUtama`, bukan dua sumber yang
  berpotensi tidak sinkron. Disiplin "paling banyak satu `isUtama=true` per
  karyawan" adalah level aplikasi pada batch ini (Prisma tidak bisa
  menyatakan conditional-uniqueness lintas baris, lihat ALT-DEF-029).
- **ALT-DEF-024 - Shift lintas tengah malam.** `TEMPLATE_SHIFT` (rename dari
  `JADWAL_SHIFT`) menyimpan `jamMulai`/`jamSelesai` TETAP sebagai `String`
  "HH:mm" (bukan `DateTime @db.Time` - lihat ADR-028 Keputusan 3 untuk
  alasan penolakan `@db.Time` tanpa Postgres nyata untuk memvalidasinya),
  ditambah `lintasTengahMalam Boolean` EKSPLISIT: bila `true`, aplikasi
  wajib memperlakukan `jamSelesai` sebagai jatuh di TANGGAL BERIKUTNYA saat
  menghitung durasi/overlap.
- **ALT-DEF-024 - Jadwal berulang.** `POLA_JADWAL_BERULANG` (BARU)
  MENGHASILKAN baris `JADWAL_KERJA` individual per tanggal yang cocok
  (service-layer/job, di luar cakupan skema) - setiap hari tetap baris
  sendiri yang bisa di-query/edit/batalkan independen. `JadwalKerja.
  polaBerulangId` hanya jejak asal-usul, tidak pernah dipakai untuk logika
  baca jadwal.
- **ALT-DEF-024 - Tukar shift.** `PERMINTAAN_TUKAR_SHIFT` (BARU, ALT-HR-008)
  - jadwal asal TIDAK berubah sampai `DISETUJUI_MANAJER`.
- **ALT-DEF-019/ALT-DEF-025 (ADR-028 Keputusan 5, CRUX) - Koreksi absensi
  append-only.** `ABSENSI.jamMasuk`/`jamPulang` IMMUTABLE selamanya (bukti
  presensi apa adanya). Koreksi diajukan sebagai baris `KOREKSI_ABSENSI`
  BARU (menyalin nilai `*Sebelum` sebagai snapshot, mengusulkan `*Sesudah`);
  begitu `status = DISETUJUI`, service-layer menulis
  `jamMasukEfektif`/`jamPulangEfektif` pada baris `Absensi` ASLI - nilai
  `jamMasuk`/`jamPulang` asli TIDAK PERNAH ditimpa. `*Efektif` adalah kolom
  CACHE eksplisit (disiplin sama `Pelanggan.saldoTokoCache`, ADR-027).
  Relasi `Absensi -> KoreksiAbsensi` one-to-many: pengajuan yang ditolak
  lalu diajukan ulang membuat baris baru, riwayat lama tetap ada (ADR-006
  no-hard-delete).
- **ALT-DEF-025 - Istirahat.** `ISTIRAHAT_ABSENSI` (BARU) append-only,
  banyak baris per `Absensi` (mis. istirahat makan siang + sore).
- **ALT-HR-016/ALT-HR-017 - Geofence & pembatasan perangkat.** `Absensi`
  mendapat `lokasiLat`/`lokasiLng`/`jarakDariOutletMeter` (dihitung dan
  disimpan service-layer saat presensi) dan `perangkatId` nullable
  (composite-FK ke `Perangkat`). Validasi radius/registrasi perangkat
  sesungguhnya adalah feature work service-layer, di luar cakupan skema
  batch ini.
- **ADR-028 Keputusan 8 - `CutiIzin` dipertahankan, bukan di-rename.**
  Satu-satunya perubahan struktural: `tenantId` ditambahkan (SEBELUMNYA
  TIDAK ADA sama sekali) dan `karyawanId` menjadi composite-FK, menutup gap
  tenant-safety yang terlewat batch `ALT-DEF-010`/ADR-013 sebelumnya.
- **ADR-028 Keputusan 9 - `TargetKinerja`/`PenilaianKinerja` (BARU,
  ALT-HR-018)** dimodelkan MINIMAL secara sengaja - bukan full payroll/HR
  suite, di luar cakupan master spec.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, ADR-013, dipertahankan
  dan diperluas ADR-028):** seluruh model baru di atas yang membawa
  `tenantId` DAN FK ke model tenant-owned lain memakai composite-FK
  `(tenantId, xId) -> Model(tenantId, id)` - lihat ADR-028 di
  `docs/engineering/DECISION-LOG.md` untuk daftar lengkap per model.
- `KARYAWAN.penggunaId` terhubung ke `PENGGUNA` (bagian Platform) hanya jika
  karyawan tersebut memiliki akses login sistem; peran/permission tetap
  diatur lewat `packages/otorisasi`.
