-- ALT-DEF-015 / ALT-QRS-001 / ADR-021 Keputusan 3
--
-- Partial unique index: "tepat satu konfigurasi QRIS AKTIF per outlet".
--
-- MENGAPA FILE SQL TERPISAH, BUKAN DI schema.prisma:
-- DSL Prisma (v5.x) tidak dapat mengekspresikan partial/filtered unique index
-- (`WHERE ...`) sama sekali. Alternatif yang SEMPAT dipertimbangkan dan DITOLAK
-- adalah `@@unique([tenantId, outletId, status])` di model KonfigurasiQris -
-- constraint itu TIDAK menegakkan aturan yang dimaksud dan justru salah: ia
-- akan melarang satu outlet punya lebih dari satu konfigurasi berstatus
-- NONAKTIF, padahal riwayat konfigurasi lama justru HARUS boleh menumpuk
-- sebagai NONAKTIF (tidak ada hard-delete, ADR-006). Menuliskan constraint
-- palsu yang terlihat menegakkan aturan padahal tidak, lebih buruk daripada
-- tidak ada constraint sama sekali.
--
-- STATUS EKSEKUSI: BELUM PERNAH DIJALANKAN terhadap Postgres nyata. Tidak ada
-- database di environment correction-loop ini (lihat ALT-DEF-029 di
-- docs/engineering/DEFECT-LEDGER.md). File ini WAJIB disertakan pada migrasi
-- pertama yang benar-benar dijalankan; sampai saat itu, aturan "satu konfigurasi
-- AKTIF per outlet" HANYA dijaga di level aplikasi (guard service-layer di
-- dalam transaksi yang sama dengan UPDATE status), yang TIDAK aman terhadap
-- race condition dua request bersamaan. Jangan menganggap aturan ini sudah
-- terjamin sebelum index di bawah benar-benar ada di database.

-- CATATAN NAMA KOLOM: skema ini memakai `@@map` di level MODEL (nama tabel
-- snake_case) tetapi TIDAK memakai `@map` di level field - sehingga nama kolom
-- nyata di Postgres tetap camelCase dan HARUS dikutip ganda.

CREATE UNIQUE INDEX IF NOT EXISTS konfigurasi_qris_satu_aktif_per_outlet
    ON konfigurasi_qris ("tenantId", "outletId")
    WHERE status = 'AKTIF';
