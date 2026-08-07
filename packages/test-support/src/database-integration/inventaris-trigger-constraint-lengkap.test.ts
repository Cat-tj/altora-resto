// Test database-integration untuk ADR-041 (batch konsolidasi audit cakupan
// konkurensi) - "Semua index/trigger/check tersedia" (lihat
// docs/engineering/AUDIT-CONCURRENCY-COVERAGE.md).
//
// Ke-13 file database-integration SEBELUM batch ini masing-masing menguji
// trigger/constraint DOMAIN-nya sendiri secara tersebar (mis. file ledger
// hanya cek trigger ledger, file promo hanya cek trigger promo). Itu SUDAH
// benar dan tidak diduplikasi di sini. TAPI kalau migrasi MASA DEPAN secara
// tidak sengaja menghapus satu trigger/CHECK/index bisnis-kritis, test
// domain yang relevan HANYA akan menangkapnya bila file itu DIJALANKAN -
// tidak ada SATU test yang menjamin SELURUH object hasil audit manual
// terhadap migrations/*.sql benar-benar ada, sekaligus, di satu tempat.
//
// File ini adalah TRIPWIRE REGRESI TUNGGAL: daftar LENGKAP (bukan sampel)
// dari setiap trigger non-internal buatan-tangan, setiap CHECK constraint
// bernama, dan setiap partial/business unique index "spesial" yang muncul di
// prisma/schema/migrations/*.sql (diekstrak manual lewat grep atas seluruh
// migration.sql, dicatat di sini sebagai daftar TETAP) - lalu memverifikasi
// SETIAP SATU benar-benar ada di pg_catalog database live. Bila migrasi masa
// depan menghapus SATU SAJA tanpa sengaja, test ini gagal walau test domain
// terkait kebetulan tidak ikut dijalankan/di-update.
//
// TIDAK termasuk: ~139 unique index generik hasil `@@unique`/`@@id` Prisma
// biasa (FK-support, dsb) - itu sudah dijaga oleh
// migrasi-idempoten-dan-drift.test.ts (drift detection membandingkan
// SELURUH schema, termasuk index generik, terhadap schema.prisma - lebih
// murah dan lebih lengkap daripada mendaftar 139 nama index generik satu per
// satu di sini).
//
// Jalankan: npx tsx packages/test-support/src/database-integration/inventaris-trigger-constraint-lengkap.test.ts

import { assertTrue, DATABASE_URL } from "./_pg-helper"
import pg from "pg";

// Diekstrak lewat:
//   grep -rhoE "CREATE (CONSTRAINT )?TRIGGER [a-zA-Z0-9_]+" prisma/schema/migrations/ | awk '{print $NF}' | sort -u
// pada seluruh 15 migrasi resmi (2026-07-25/26/27 correction loop, ADR-006
// s.d. ADR-042).
const EXPECTED_TRIGGERS: ReadonlyArray<{ tgname: string; table: string }> = [
  { tgname: "trg_absensi_bump_version", table: "absensi" },
  { tgname: "trg_alokasi_pembayaran_cek_batas_pesanan", table: "alokasi_pembayaran" },
  { tgname: "trg_cek_konsistensi_pada_alokasi", table: "alokasi_pembayaran" },
  { tgname: "trg_cek_konsistensi_pada_pembayaran", table: "pembayaran" },
  { tgname: "trg_cek_konsistensi_pada_pesanan", table: "pesanan" },
  { tgname: "trg_domain_outbox_event_partial_mutability", table: "domain_outbox_event" },
  { tgname: "trg_giliran_kasir_bump_version", table: "giliran_kasir" },
  { tgname: "trg_jadwal_kerja_bump_version", table: "jadwal_kerja" },
  { tgname: "trg_keanggotaan_bump_version", table: "keanggotaan" },
  { tgname: "trg_ledger_saldo_toko_append_only", table: "ledger_saldo_toko" },
  { tgname: "trg_ledger_saldo_toko_validasi_pembalik", table: "ledger_saldo_toko" },
  { tgname: "trg_ledger_stempel_append_only", table: "ledger_stempel" },
  { tgname: "trg_ledger_stempel_validasi_pembalik", table: "ledger_stempel" },
  { tgname: "trg_mutasi_stok_append_only", table: "mutasi_stok" },
  { tgname: "trg_mutasi_stok_validasi_pembalik", table: "mutasi_stok" },
  { tgname: "trg_pembayaran_bump_version", table: "pembayaran" },
  { tgname: "trg_permintaan_persetujuan_bump_version", table: "permintaan_persetujuan" },
  { tgname: "trg_pesanan_bump_version", table: "pesanan" },
  { tgname: "trg_poin_riwayat_append_only", table: "poin_riwayat" },
  { tgname: "trg_poin_riwayat_validasi_pembalik", table: "poin_riwayat" },
  { tgname: "trg_promo_bump_version", table: "promo" },
  { tgname: "trg_promo_pemakaian_cek_batas_penerapan", table: "promo_pemakaian" },
  { tgname: "trg_promo_pemakaian_cek_kuota_total", table: "promo_pemakaian" },
  { tgname: "trg_purchase_order_bump_version", table: "purchase_order" },
  { tgname: "trg_recompute_status_retur_pesanan", table: "pesanan_retur" },
  { tgname: "trg_reservasi_bump_version", table: "reservasi" },
  { tgname: "trg_reservasi_stok_cek_ketersediaan", table: "reservasi_stok" },
  { tgname: "trg_reservasi_stok_kunci_konsumsi", table: "reservasi_stok" },
  { tgname: "trg_stok_bahan_bump_version", table: "stok_bahan" },
  { tgname: "trg_stok_bahan_cek_negatif", table: "stok_bahan" },
  { tgname: "trg_stok_opname_bump_version", table: "stok_opname" },
  { tgname: "trg_transfer_stok_bump_version", table: "transfer_stok" },
];

// Diekstrak lewat:
//   grep -rhoE "ADD CONSTRAINT \"?[a-zA-Z0-9_]+\"?" prisma/schema/migrations/ |
//     sed -E 's/ADD CONSTRAINT "?([a-zA-Z0-9_]+)"?/\1/' | sort -u | grep -iv fkey | grep -iv pkey
const EXPECTED_CHECK_CONSTRAINTS: readonly string[] = [
  "notification_lingkup_target_kombinasi_check",
  "pesanan_pembatalan_approval_wajib_setelah_produksi",
  "resep_sasaran_xor",
  "tiket_dapur_alasan_wajib_saat_dibatalkan",
];

// Index unique/partial "bisnis-kritis" (bukan @@unique generik biasa) -
// masing-masing sudah diuji BEHAVIORAL di file domain terkait; di sini hanya
// existence-tripwire konsolidasi.
const EXPECTED_SPECIAL_INDEXES: readonly string[] = [
  "stok_bahan_agregat_gudang_unik",
  "stok_opname_baris_agregat_gudang_unik",
  "konfigurasi_qris_satu_aktif_per_outlet",
  "versi_resep_satu_aktif_per_resep",
  "promo_pemakaian_pesananId_promoId_key",
  "reservasi_stok_itemPesananId_key",
  "reservasi_stok_mutasiStokId_key",
  "reservasi_stok_tenantId_mutasiStokId_key",
  "mutasi_stok_membalikMutasiId_key",
  "poin_riwayat_membalikMutasiId_key",
  "ledger_stempel_membalikMutasiId_key",
  "ledger_saldo_toko_membalikMutasiId_key",
  "domain_outbox_event_deduplicationKey_key",
  "domain_outbox_event_aggregateType_aggregateId_aggregateVers_key",
];

async function testSeluruhTriggerBisnisAda(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    for (const { tgname, table } of EXPECTED_TRIGGERS) {
      const res = await pool.query(
        `SELECT 1 FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         WHERE t.tgname = $1 AND c.relname = $2 AND NOT t.tgisinternal`,
        [tgname, table],
      );
      assertTrue(
        (res.rowCount ?? 0) === 1,
        `INVENTARIS: trigger "${tgname}" pada tabel "${table}" HARUS ada persis satu kali di pg_trigger, dapat ${res.rowCount}. Kalau ini gagal, migrasi berikutnya kemungkinan menghapus/mengubah nama trigger ini tanpa sengaja.`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  -> Seluruh ${EXPECTED_TRIGGERS.length} trigger bisnis buatan-tangan TERVERIFIKASI ada.`);
  } finally {
    await pool.end();
  }
}

async function testSeluruhCheckConstraintAda(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    for (const conname of EXPECTED_CHECK_CONSTRAINTS) {
      const res = await pool.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1 AND contype = 'c'`,
        [conname],
      );
      assertTrue(
        (res.rowCount ?? 0) === 1,
        `INVENTARIS: CHECK constraint "${conname}" HARUS ada persis satu kali di pg_constraint, dapat ${res.rowCount}.`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  -> Seluruh ${EXPECTED_CHECK_CONSTRAINTS.length} CHECK constraint bernama TERVERIFIKASI ada.`);
  } finally {
    await pool.end();
  }
}

async function testSeluruhIndexSpesialAda(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    for (const indexname of EXPECTED_SPECIAL_INDEXES) {
      const res = await pool.query(`SELECT 1 FROM pg_indexes WHERE indexname = $1`, [indexname]);
      assertTrue(
        (res.rowCount ?? 0) === 1,
        `INVENTARIS: index "${indexname}" HARUS ada persis satu kali di pg_indexes, dapat ${res.rowCount}.`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  -> Seluruh ${EXPECTED_SPECIAL_INDEXES.length} index unique/partial bisnis-kritis TERVERIFIKASI ada.`);
  } finally {
    await pool.end();
  }
}

async function testTidakAdaTriggerBisnisTakTerdaftar(): Promise<void> {
  // Bukti tambahan bahwa daftar EXPECTED_TRIGGERS di atas benar-benar
  // LENGKAP (bukan sekadar subset yang kebetulan cocok): jumlah trigger
  // non-internal yang namanya berawalan "trg_" di seluruh database harus
  // PERSIS sama dengan panjang daftar - bila migrasi masa depan MENAMBAH
  // trigger baru tanpa mendaftarkannya di sini, test ini yang menangkapnya
  // (bukan hanya kehilangan trigger, tapi juga trigger tak terdokumentasi).
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const res = await pool.query(
      `SELECT t.tgname FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE NOT t.tgisinternal AND n.nspname = 'public' AND t.tgname LIKE 'trg_%'`,
    );
    assertTrue(
      res.rowCount === EXPECTED_TRIGGERS.length,
      `Jumlah trigger "trg_*" non-internal di schema public HARUS PERSIS ${EXPECTED_TRIGGERS.length} (sesuai daftar EXPECTED_TRIGGERS), dapat ${res.rowCount}. Bila lebih banyak: ada trigger baru yang belum didaftarkan ke inventaris ini (tambahkan ke EXPECTED_TRIGGERS). Bila lebih sedikit: satu trigger hilang (regresi).`,
    );
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  await testSeluruhTriggerBisnisAda();
  await testSeluruhCheckConstraintAda();
  await testSeluruhIndexSpesialAda();
  await testTidakAdaTriggerBisnisTakTerdaftar();
  // eslint-disable-next-line no-console
  console.log(
    `OK: database-integration ADR-041/ADR-042 (inventaris konsolidasi ${EXPECTED_TRIGGERS.length} trigger + ${EXPECTED_CHECK_CONSTRAINTS.length} CHECK constraint + ${EXPECTED_SPECIAL_INDEXES.length} index bisnis-kritis - tripwire regresi tunggal) lulus.`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
