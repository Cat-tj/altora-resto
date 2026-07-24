# Defect Ledger - Altora Resto

Status dokumen: **DRAF AWAL - LEDGER KOSONG**.

Karena belum ada kode aplikasi yang diimplementasikan atau diuji pada titik penulisan
dokumen ini (hanya skema Prisma + dokumen desain), **belum ada defect yang tercatat**.
Tabel di bawah adalah struktur/format yang akan dipakai begitu implementasi dan
pengujian dimulai - jangan mengisi baris dengan defect fiktif.

## Format pencatatan defect

| ID | Requirement terkait | Deskripsi | Severity | Ditemukan pada | Status | Ditutup pada |
|---|---|---|---|---|---|---|
| _(belum ada entri)_ | | | | | | |

Kolom:

- **ID**: `ALT-DEF-{urut 3 digit}`.
- **Requirement terkait**: ID dari `docs/engineering/MASTER-CHECKLIST.md`
  (mis. `ALT-PBY-003`).
- **Severity**: `BLOKIR`, `MAYOR`, `MINOR`, `KOSMETIK`.
- **Status**: `BARU`, `DIKONFIRMASI`, `SEDANG_DIPERBAIKI`, `SIAP_VERIFIKASI`,
  `DITUTUP`, `TIDAK_DAPAT_DIREPRODUKSI`.

## Aturan pengisian

1. Setiap defect yang ditemukan lewat pengujian manual/otomatis WAJIB dicatat di
   sini sebelum diperbaiki, dengan requirement ID terkait dari MASTER-CHECKLIST.
2. Status `DITUTUP` hanya boleh diberikan setelah ada bukti verifikasi ulang -
   dicatat sebagai referensi ke `docs/engineering/RELEASE-EVIDENCE.md`.
3. Dokumen ini tidak boleh diisi dengan status `LULUS`/`DITUTUP` tanpa bukti uji
   nyata (lihat instruksi kerja: dilarang memfabrikasi hasil tes atau status LULUS).
