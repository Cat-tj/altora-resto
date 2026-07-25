-- CreateEnum
CREATE TYPE "StatusTenant" AS ENUM ('AKTIF', 'NONAKTIF', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StatusOutlet" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusPengguna" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusKeanggotaanTenant" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusKeanggotaanOutlet" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "JenisPerangkat" AS ENUM ('KASIR', 'KDS', 'PRINTER', 'TABLET_PELAYAN');

-- CreateEnum
CREATE TYPE "StatusPerangkat" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "AksiRiwayatPerangkat" AS ENUM ('DIDAFTARKAN', 'DIGUNAKAN', 'DICABUT');

-- CreateEnum
CREATE TYPE "StatusPermintaanPersetujuan" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusAktifNonaktif" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusItemMenu" AS ENUM ('AKTIF', 'NONAKTIF', 'HABIS');

-- CreateEnum
CREATE TYPE "JenisBahan" AS ENUM ('BAHAN_BAKU', 'BAHAN_SETENGAH_JADI', 'PRODUK_JADI', 'KEMASAN', 'BARANG_OPERASIONAL');

-- CreateEnum
CREATE TYPE "StatusResep" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusVersiResep" AS ENUM ('DRAF', 'AKTIF', 'NONAKTIF', 'ARSIP');

-- CreateEnum
CREATE TYPE "AksiKomponenModifier" AS ENUM ('TAMBAH', 'KURANGI', 'GANTI');

-- CreateEnum
CREATE TYPE "StatusProsesProduksi" AS ENUM ('DRAF', 'BERJALAN', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusBatchProduksi" AS ENUM ('TERSEDIA', 'HABIS', 'KEDALUWARSA', 'DIBUANG');

-- CreateEnum
CREATE TYPE "JenisMutasiStok" AS ENUM ('PEMBELIAN_MASUK', 'RETUR_PENJUALAN', 'TRANSFER_MASUK', 'PRODUKSI_MASUK', 'PEMAKAIAN_RESEP', 'RETUR_SUPPLIER', 'TRANSFER_KELUAR', 'PRODUKSI_KELUAR', 'WASTE', 'PEMAKAIAN_INTERNAL', 'PENYESUAIAN', 'KOREKSI_OPNAME');

-- CreateEnum
CREATE TYPE "ReferensiJenisMutasi" AS ENUM ('PEMBELIAN', 'PESANAN', 'OPNAME', 'TRANSFER', 'PRODUKSI', 'WASTE', 'PENYESUAIAN', 'RETUR_PEMBELIAN', 'PEMAKAIAN_INTERNAL');

-- CreateEnum
CREATE TYPE "StatusStokOpname" AS ENUM ('DRAF', 'SEDANG_DIHITUNG', 'DIKUNCI', 'MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DIPOSTING', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusTransferStok" AS ENUM ('DRAF', 'DIAJUKAN', 'DISETUJUI', 'DIKIRIM', 'DITERIMA_SEBAGIAN', 'DITERIMA', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "JenisLokasiStok" AS ENUM ('RAK', 'CHILLER', 'FREEZER', 'GUDANG_KERING', 'AREA_PERSIAPAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusBatchStok" AS ENUM ('TERSEDIA', 'HABIS', 'KEDALUWARSA', 'DIBUANG');

-- CreateEnum
CREATE TYPE "StatusReservasiStok" AS ENUM ('AKTIF', 'DILEPAS', 'DIKONSUMSI', 'KEDALUWARSA');

-- CreateEnum
CREATE TYPE "MetodePemesananUlang" AS ENUM ('MIN_MAX', 'FIXED');

-- CreateEnum
CREATE TYPE "KebijakanPemotonganStok" AS ENUM ('SAAT_PESANAN_DITERIMA', 'SAAT_MASUK_DAPUR', 'SAAT_SELESAI', 'SAAT_PEMBAYARAN');

-- CreateEnum
CREATE TYPE "MetodeAlokasiBatch" AS ENUM ('FEFO', 'FIFO');

-- CreateEnum
CREATE TYPE "StatusPurchaseOrder" AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DIKIRIM_SUPPLIER', 'DITERIMA_SEBAGIAN', 'DITERIMA_PENUH', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusReturPembelian" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusMeja" AS ENUM ('TERSEDIA', 'TERPAKAI', 'DIPESAN', 'PERLU_DIBERSIHKAN', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusReservasi" AS ENUM ('DIAJUKAN', 'DIKONFIRMASI', 'TIBA', 'SELESAI', 'TIDAK_HADIR', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "KanalPesanan" AS ENUM ('KASIR', 'PELAYAN', 'QR_PELANGGAN');

-- CreateEnum
CREATE TYPE "StatusPesanan" AS ENUM ('DRAF', 'DIKIRIM', 'MENUNGGU_PERSETUJUAN', 'DITERIMA', 'DITOLAK', 'MENUNGGU_PEMBAYARAN', 'DIKONFIRMASI', 'DIKIRIM_KE_DAPUR', 'SEDANG_DISIAPKAN', 'SIAP', 'DISAJIKAN', 'SELESAI', 'DIBATALKAN', 'DIRETUR');

-- CreateEnum
CREATE TYPE "StatusItemPesanan" AS ENUM ('DRAF', 'DITERIMA', 'DIKIRIM_KE_DAPUR', 'DITAHAN', 'SEDANG_DISIAPKAN', 'SIAP', 'DISAJIKAN', 'DIBATALKAN', 'DIRETUR');

-- CreateEnum
CREATE TYPE "JenisPerubahanPesanan" AS ENUM ('TAMBAH_ITEM', 'UBAH_KUANTITAS', 'HAPUS_ITEM', 'PINDAH_MEJA', 'SPLIT', 'MERGE', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusTiketDapur" AS ENUM ('BARU', 'DITERIMA', 'DITAHAN', 'SEDANG_DISIAPKAN', 'SELESAI_SEBAGIAN', 'SIAP', 'DISAJIKAN', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusMasakBaris" AS ENUM ('MENUNGGU', 'DIMASAK', 'SIAP');

-- CreateEnum
CREATE TYPE "StatusGelombangDapur" AS ENUM ('MENUNGGU', 'DIPICU', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusGiliranKasir" AS ENUM ('DIBUKA', 'DITUTUP_MENUNGGU_VERIFIKASI', 'DITUTUP_SELESAI');

-- CreateEnum
CREATE TYPE "JenisTransaksiKasir" AS ENUM ('PENJUALAN', 'REFUND', 'KOREKSI');

-- CreateEnum
CREATE TYPE "KodeMetodeBayar" AS ENUM ('TUNAI', 'TRANSFER_MANUAL', 'QRIS_MANUAL', 'SALDO_TOKO');

-- CreateEnum
CREATE TYPE "StatusPembayaran" AS ENUM ('DRAF', 'MENUNGGU', 'MENUNGGU_KONFIRMASI', 'DIBAYAR', 'GAGAL', 'DIBATALKAN', 'DIKOREKSI', 'DIKEMBALIKAN_SEBAGIAN', 'DIKEMBALIKAN');

-- CreateEnum
CREATE TYPE "StatusKonfigurasiQris" AS ENUM ('DRAF', 'MENUNGGU_VERIFIKASI', 'AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "AksiKonfigurasiQris" AS ENUM ('DIBUAT', 'DIUBAH', 'DIAKTIFKAN', 'DINONAKTIFKAN', 'DIVERIFIKASI');

-- CreateEnum
CREATE TYPE "StatusPromo" AS ENUM ('AKTIF', 'NONAKTIF', 'KADALUARSA');

-- CreateEnum
CREATE TYPE "JenisSyaratPromo" AS ENUM ('MIN_BELANJA', 'ITEM_TERTENTU', 'KATEGORI_TERTENTU', 'JAM_TERTENTU', 'HARI_TERTENTU', 'KANAL_TERTENTU', 'PELANGGAN_ANGGOTA', 'PELANGGAN_BARU', 'ULANG_TAHUN');

-- CreateEnum
CREATE TYPE "StatusKupon" AS ENUM ('AKTIF', 'NONAKTIF', 'HABIS');

-- CreateEnum
CREATE TYPE "StackingPolicyPromo" AS ENUM ('TIDAK_BOLEH_DIGABUNG', 'BOLEH_DIGABUNG', 'AMBIL_DISKON_TERBAIK', 'BERDASARKAN_PRIORITAS');

-- CreateEnum
CREATE TYPE "JenisRewardPromo" AS ENUM ('DISKON_PERSEN', 'DISKON_NOMINAL', 'ITEM_GRATIS', 'HARGA_PAKET', 'BELI_X_BAYAR_Y');

-- CreateEnum
CREATE TYPE "StatusPemakaianPromo" AS ENUM ('DITERAPKAN', 'DIBATALKAN', 'DIRETUR');

-- CreateEnum
CREATE TYPE "StatusKeanggotaan" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusPelanggan" AS ENUM ('AKTIF', 'DIGABUNGKAN');

-- CreateEnum
CREATE TYPE "JenisPoinRiwayat" AS ENUM ('PEROLEHAN', 'PENUKARAN', 'PENYESUAIAN', 'PEMBALIKAN', 'KADALUARSA');

-- CreateEnum
CREATE TYPE "JenisLedgerStempel" AS ENUM ('PEROLEHAN', 'PENUKARAN', 'PEMBALIKAN', 'PENYESUAIAN');

-- CreateEnum
CREATE TYPE "JenisLedgerSaldoToko" AS ENUM ('PENAMBAHAN', 'PEMAKAIAN', 'REFUND', 'PENYESUAIAN', 'PEMBALIKAN');

-- CreateEnum
CREATE TYPE "JenisPersetujuanPelanggan" AS ENUM ('PEMASARAN', 'DATA_PRIBADI', 'WHATSAPP_NOTIFIKASI');

-- CreateEnum
CREATE TYPE "StatusKaryawan" AS ENUM ('AKTIF', 'CUTI', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "TipeHubunganKerja" AS ENUM ('TETAP', 'KONTRAK', 'PARUH_WAKTU', 'MAGANG');

-- CreateEnum
CREATE TYPE "StatusJadwalKerja" AS ENUM ('DIJADWALKAN', 'DIKONFIRMASI', 'DIBATALKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusPermintaanTukarShift" AS ENUM ('DIAJUKAN', 'DISETUJUI_REKAN', 'DISETUJUI_MANAJER', 'DITOLAK', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "MetodeAbsensi" AS ENUM ('QR', 'PIN', 'GPS', 'MANUAL_SUPERVISOR');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('TEPAT_WAKTU', 'TERLAMBAT', 'PULANG_AWAL', 'LEMBUR');

-- CreateEnum
CREATE TYPE "StatusKoreksiAbsensi" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisCutiIzin" AS ENUM ('CUTI_TAHUNAN', 'SAKIT', 'IZIN');

-- CreateEnum
CREATE TYPE "StatusCutiIzin" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusPermintaanLembur" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusRekapKasHarian" AS ENUM ('DRAF', 'DIVERIFIKASI');

-- CreateEnum
CREATE TYPE "StatusBiayaOperasional" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DIBAYAR', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusIdempotencyKey" AS ENUM ('MEMPROSES', 'SELESAI', 'GAGAL');

-- CreateEnum
CREATE TYPE "StatusOutboxEvent" AS ENUM ('TERTUNDA', 'DIPROSES', 'TERKIRIM', 'GAGAL');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('PESANAN_QR_MASUK', 'PESANAN_BERUBAH', 'PESANAN_SIAP', 'PEMBAYARAN_MENUNGGU_KONFIRMASI', 'STOK_KRITIS', 'SELISIH_KAS', 'PERSETUJUAN_DIBUTUHKAN', 'KARYAWAN_TERLAMBAT');

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "StatusTenant" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "zonaWaktu" TEXT NOT NULL,
    "status" "StatusOutlet" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengguna" (
    "id" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "StatusPengguna" NOT NULL DEFAULT 'AKTIF',
    "emailTerverifikasiPada" TIMESTAMP(3),
    "terakhirLoginPada" TIMESTAMP(3),
    "terkunciSampai" TIMESTAMP(3),
    "jumlahPercobaanGagal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keanggotaan_tenant" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "StatusKeanggotaanTenant" NOT NULL DEFAULT 'AKTIF',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "bergabungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keanggotaan_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keanggotaan_outlet" (
    "id" TEXT NOT NULL,
    "keanggotaanTenantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "status" "StatusKeanggotaanOutlet" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keanggotaan_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peran" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "izin" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "deskripsi" TEXT,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "izin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peran_izin" (
    "id" TEXT NOT NULL,
    "peranId" TEXT NOT NULL,
    "izinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peran_izin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keanggotaan_peran" (
    "id" TEXT NOT NULL,
    "keanggotaanTenantId" TEXT NOT NULL,
    "peranId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keanggotaan_peran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batas_izin" (
    "id" TEXT NOT NULL,
    "peranId" TEXT NOT NULL,
    "maksimumDiskonPersen" DECIMAL(65,30),
    "maksimumDiskonNominal" INTEGER,
    "maksimumRefund" INTEGER,
    "maksimumPenyesuaianStok" DECIMAL(65,30),
    "wajibPinSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "wajibPersetujuanManajer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batas_izin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "izin_sementara" (
    "id" TEXT NOT NULL,
    "keanggotaanTenantId" TEXT NOT NULL,
    "izinId" TEXT NOT NULL,
    "diberikanOlehId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "berlakuSejak" TIMESTAMP(3) NOT NULL,
    "berlakuSampai" TIMESTAMP(3) NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "izin_sementara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permintaan_persetujuan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "keanggotaanTenantIdPemohon" TEXT NOT NULL,
    "jenisAksi" TEXT NOT NULL,
    "referensiJenis" TEXT NOT NULL,
    "referensiId" TEXT NOT NULL,
    "status" "StatusPermintaanPersetujuan" NOT NULL DEFAULT 'DIAJUKAN',
    "disetujuiOlehId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permintaan_persetujuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perangkat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "jenis" "JenisPerangkat" NOT NULL,
    "kodeAktivasi" TEXT NOT NULL,
    "status" "StatusPerangkat" NOT NULL DEFAULT 'AKTIF',
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "perangkat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "keanggotaanTenantId" TEXT,
    "perangkatId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kadaluarsaPada" TIMESTAMP(3) NOT NULL,
    "terakhirAktifPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dicabutPada" TIMESTAMP(3),
    "alasanPencabutan" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_reset_kata_sandi" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kadaluarsaPada" TIMESTAMP(3) NOT NULL,
    "digunakanPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_reset_kata_sandi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "percobaan_login" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "berhasil" BOOLEAN NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "percobaan_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin_outlet" (
    "id" TEXT NOT NULL,
    "keanggotaanTenantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "perangkatId" TEXT,
    "pinHash" TEXT NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pin_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_perangkat" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "perangkatId" TEXT NOT NULL,
    "aksi" "AksiRiwayatPerangkat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_perangkat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "penggunaId" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT NOT NULL,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_tenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "nilai" JSONB NOT NULL,

    CONSTRAINT "pengaturan_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_outlet" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "nilai" JSONB NOT NULL,

    CONSTRAINT "pengaturan_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori_menu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "kategori_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_menu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "gambarUrl" TEXT,
    "stokTakTerbatas" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusItemMenu" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "varian_menu" (
    "id" TEXT NOT NULL,
    "itemMenuId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hargaTambahan" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "varian_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_grup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "wajibPilih" BOOLEAN NOT NULL DEFAULT false,
    "minPilihan" INTEGER NOT NULL DEFAULT 0,
    "maxPilihan" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "modifier_grup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_modifier_grup" (
    "id" TEXT NOT NULL,
    "itemMenuId" TEXT NOT NULL,
    "modifierGrupId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_modifier_grup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_opsi" (
    "id" TEXT NOT NULL,
    "modifierGrupId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hargaTambahan" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "modifier_opsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harga_item_outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemMenuId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "berlakuSejak" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harga_item_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bahan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kodeSku" TEXT NOT NULL,
    "satuanDasarId" TEXT NOT NULL,
    "jenis" "JenisBahan" NOT NULL DEFAULT 'BAHAN_BAKU',
    "stokMinimum" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "bahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satuan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "simbol" TEXT NOT NULL,

    CONSTRAINT "satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konversi_satuan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "satuanDariId" TEXT NOT NULL,
    "satuanKeId" TEXT NOT NULL,
    "faktor" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "konversi_satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "itemMenuId" TEXT,
    "varianMenuId" TEXT,
    "bahanHasilId" TEXT,
    "status" "StatusResep" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versi_resep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resepId" TEXT NOT NULL,
    "nomorVersi" INTEGER NOT NULL,
    "berlakuSejak" TIMESTAMP(3) NOT NULL,
    "berlakuSampai" TIMESTAMP(3),
    "jumlahHasil" DECIMAL(65,30) NOT NULL,
    "satuanHasilId" TEXT NOT NULL,
    "penyusutanPersen" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "snapshotBiaya" INTEGER,
    "status" "StatusVersiResep" NOT NULL DEFAULT 'DRAF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versi_resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "komponen_resep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versiResepId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,
    "opsional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "komponen_resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "komponen_resep_modifier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versiResepId" TEXT NOT NULL,
    "modifierOpsiId" TEXT NOT NULL,
    "aksi" "AksiKomponenModifier" NOT NULL,
    "bahanId" TEXT NOT NULL,
    "bahanPenggantiId" TEXT,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "komponen_resep_modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proses_produksi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "versiResepId" TEXT NOT NULL,
    "jumlahTarget" DECIMAL(65,30) NOT NULL,
    "jumlahAktual" DECIMAL(65,30),
    "status" "StatusProsesProduksi" NOT NULL DEFAULT 'DRAF',
    "dimulaiPada" TIMESTAMP(3),
    "diselesaikanPada" TIMESTAMP(3),
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proses_produksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proses_produksi_baris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prosesProduksiId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahDipakai" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,

    CONSTRAINT "proses_produksi_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_produksi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "prosesProduksiId" TEXT NOT NULL,
    "bahanHasilId" TEXT NOT NULL,
    "nomorBatch" TEXT NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,
    "tanggalProduksi" TIMESTAMP(3) NOT NULL,
    "tanggalKedaluwarsa" TIMESTAMP(3),
    "status" "StatusBatchProduksi" NOT NULL DEFAULT 'TERSEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_produksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gudang" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "gudang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lokasi_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "JenisLokasiStok",
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "lokasi_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_bahan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "lokasiStokId" TEXT,
    "kuantitas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kuantitasDireservasi" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "direkonsiliasiPada" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stok_bahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutasi_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jenis" "JenisMutasiStok" NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT,
    "referensiJenis" "ReferensiJenisMutasi" NOT NULL,
    "referensiId" TEXT NOT NULL,
    "lokasiSumberId" TEXT,
    "lokasiTujuanId" TEXT,
    "batchStokId" TEXT,
    "hargaPerolehan" INTEGER,
    "catatan" TEXT,
    "dibalikOlehId" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutasi_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "nomorBatch" TEXT NOT NULL,
    "tanggalProduksi" TIMESTAMP(3),
    "tanggalKedaluwarsa" TIMESTAMP(3),
    "kuantitasAwal" DECIMAL(65,30) NOT NULL,
    "hargaPerolehan" INTEGER NOT NULL,
    "lokasiStokId" TEXT,
    "batchProduksiId" TEXT,
    "status" "StatusBatchStok" NOT NULL DEFAULT 'TERSEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservasi_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemPesananId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,
    "status" "StatusReservasiStok" NOT NULL DEFAULT 'AKTIF',
    "kedaluwarsaPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dilepasPada" TIMESTAMP(3),

    CONSTRAINT "reservasi_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penyesuaian_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahSebelum" DECIMAL(65,30) NOT NULL,
    "jumlahSesudah" DECIMAL(65,30) NOT NULL,
    "alasan" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "mutasiStokId" TEXT NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penyesuaian_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_stok" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nomorTransfer" TEXT NOT NULL,
    "outletAsalId" TEXT NOT NULL,
    "gudangAsalId" TEXT NOT NULL,
    "outletTujuanId" TEXT NOT NULL,
    "gudangTujuanId" TEXT NOT NULL,
    "status" "StatusTransferStok" NOT NULL DEFAULT 'DRAF',
    "catatan" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "dikirimOlehId" TEXT,
    "diterimaOlehId" TEXT,
    "diajukanPada" TIMESTAMP(3),
    "disetujuiPada" TIMESTAMP(3),
    "dikirimPada" TIMESTAMP(3),
    "diterimaPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_stok_baris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transferStokId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahDiminta" DECIMAL(65,30) NOT NULL,
    "jumlahDikirim" DECIMAL(65,30),
    "jumlahDiterima" DECIMAL(65,30),
    "satuanId" TEXT NOT NULL,
    "batchStokId" TEXT,
    "mutasiKeluarId" TEXT,
    "mutasiMasukId" TEXT,

    CONSTRAINT "transfer_stok_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alasan_waste" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "alasan_waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catatan_waste" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "lokasiStokId" TEXT,
    "bahanId" TEXT NOT NULL,
    "batchStokId" TEXT,
    "alasanWasteId" TEXT NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "satuanId" TEXT NOT NULL,
    "nilaiKerugian" INTEGER,
    "catatan" TEXT,
    "mutasiStokId" TEXT NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catatan_waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kebijakan_pemesanan_ulang" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "stokMinimum" DECIMAL(65,30) NOT NULL,
    "stokMaksimum" DECIMAL(65,30),
    "jumlahPemesananUlang" DECIMAL(65,30),
    "metode" "MetodePemesananUlang" NOT NULL DEFAULT 'MIN_MAX',
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "kebijakan_pemesanan_ulang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_persediaan_outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "kebijakanPemotongan" "KebijakanPemotonganStok" NOT NULL DEFAULT 'SAAT_MASUK_DAPUR',
    "reservasiSaatPesananDiterima" BOOLEAN NOT NULL DEFAULT true,
    "kedaluwarsaReservasiMenit" INTEGER,
    "metodeAlokasiBatch" "MetodeAlokasiBatch" NOT NULL DEFAULT 'FEFO',
    "izinkanStokNegatif" BOOLEAN NOT NULL DEFAULT false,
    "ambangSelisihOpname" INTEGER,

    CONSTRAINT "pengaturan_persediaan_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "status" "StatusStokOpname" NOT NULL DEFAULT 'DRAF',
    "dijadwalkanPada" TIMESTAMP(3) NOT NULL,
    "snapshotPada" TIMESTAMP(3),
    "dikunciPada" TIMESTAMP(3),
    "disetujuiPada" TIMESTAMP(3),
    "dipostingPada" TIMESTAMP(3),
    "dibatalkanPada" TIMESTAMP(3),
    "alasan" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "penghitungId" TEXT,
    "pengunciId" TEXT,
    "penyetujuId" TEXT,

    CONSTRAINT "stok_opname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname_baris" (
    "id" TEXT NOT NULL,
    "stokOpnameId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "lokasiStokId" TEXT,
    "batchStokId" TEXT,
    "kuantitasSistem" DECIMAL(65,30) NOT NULL,
    "kuantitasFisik" DECIMAL(65,30),
    "selisih" DECIMAL(65,30),
    "alasan" TEXT,
    "mutasiKoreksiId" TEXT,
    "dihitungPada" TIMESTAMP(3),

    CONSTRAINT "stok_opname_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kontak" TEXT,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "nomorPo" TEXT NOT NULL,
    "status" "StatusPurchaseOrder" NOT NULL DEFAULT 'DRAFT',
    "totalEstimasi" INTEGER NOT NULL DEFAULT 0,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_baris" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahDipesan" DECIMAL(65,30) NOT NULL,
    "hargaSatuan" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penerimaan_barang" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "nomorPenerimaan" TEXT NOT NULL,
    "diterimaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diterimaOlehId" TEXT NOT NULL,

    CONSTRAINT "penerimaan_barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penerimaan_barang_baris" (
    "id" TEXT NOT NULL,
    "penerimaanBarangId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlahDiterima" DECIMAL(65,30) NOT NULL,
    "hargaSatuanAktual" INTEGER NOT NULL,

    CONSTRAINT "penerimaan_barang_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retur_pembelian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "penerimaanBarangId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "status" "StatusReturPembelian" NOT NULL DEFAULT 'DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retur_pembelian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_meja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "area_meja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "areaMejaId" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL,
    "status" "StatusMeja" NOT NULL DEFAULT 'TERSEDIA',

    CONSTRAINT "meja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi_meja_qr" (
    "id" TEXT NOT NULL,
    "mejaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kadaluarsaPada" TIMESTAMP(3) NOT NULL,
    "ditutupPada" TIMESTAMP(3),

    CONSTRAINT "sesi_meja_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservasi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "mejaId" TEXT,
    "pelangganId" TEXT NOT NULL,
    "jumlahTamu" INTEGER NOT NULL,
    "waktuReservasi" TIMESTAMP(3) NOT NULL,
    "status" "StatusReservasi" NOT NULL DEFAULT 'DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "mejaId" TEXT,
    "pelangganId" TEXT,
    "kanal" "KanalPesanan" NOT NULL,
    "nomorPesanan" TEXT NOT NULL,
    "status" "StatusPesanan" NOT NULL DEFAULT 'DRAF',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "totalDiskon" INTEGER NOT NULL DEFAULT 0,
    "totalPajak" INTEGER NOT NULL DEFAULT 0,
    "totalServiceCharge" INTEGER NOT NULL DEFAULT 0,
    "totalAkhir" INTEGER NOT NULL DEFAULT 0,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dibatalkanPada" TIMESTAMP(3),

    CONSTRAINT "pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pesanan" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "itemMenuId" TEXT NOT NULL,
    "varianMenuId" TEXT,
    "kuantitas" INTEGER NOT NULL,
    "hargaSatuan" INTEGER NOT NULL,
    "catatan" TEXT,
    "status" "StatusItemPesanan" NOT NULL DEFAULT 'DRAF',
    "namaItemSnapshot" TEXT NOT NULL,
    "namaVarianSnapshot" TEXT,
    "hargaDasarSnapshot" INTEGER NOT NULL,
    "hargaVarianSnapshot" INTEGER NOT NULL DEFAULT 0,
    "hargaModifierSnapshot" INTEGER NOT NULL DEFAULT 0,
    "diskonSnapshot" INTEGER NOT NULL DEFAULT 0,
    "pajakSnapshot" INTEGER NOT NULL DEFAULT 0,
    "serviceChargeSnapshot" INTEGER NOT NULL DEFAULT 0,
    "totalBarisSnapshot" INTEGER NOT NULL,
    "resepVersiId" TEXT,

    CONSTRAINT "item_pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pesanan_modifier" (
    "id" TEXT NOT NULL,
    "itemPesananId" TEXT NOT NULL,
    "modifierOpsiId" TEXT NOT NULL,
    "hargaTambahan" INTEGER NOT NULL,
    "namaModifierSnapshot" TEXT NOT NULL,
    "hargaSnapshot" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "totalSnapshot" INTEGER NOT NULL,

    CONSTRAINT "item_pesanan_modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan_riwayat_status" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "statusSebelumnya" "StatusPesanan" NOT NULL,
    "statusBaru" "StatusPesanan" NOT NULL,
    "diubahOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesanan_riwayat_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan_perubahan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "jenisPerubahan" "JenisPerubahanPesanan" NOT NULL,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "diubahOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesanan_perubahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan_penolakan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "ditolakOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesanan_penolakan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan_pembatalan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "dibatalkanOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesanan_pembatalan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stasiun_dapur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "stasiun_dapur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aturan_routing_dapur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemMenuId" TEXT,
    "kategoriMenuId" TEXT,
    "stasiunDapurId" TEXT NOT NULL,
    "prioritas" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aturan_routing_dapur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_dapur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "stasiunDapurId" TEXT,
    "nomorGelombang" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusTiketDapur" NOT NULL DEFAULT 'BARU',
    "masukPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mulaiDiprosesPada" TIMESTAMP(3),
    "siapPada" TIMESTAMP(3),

    CONSTRAINT "tiket_dapur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_dapur_baris" (
    "id" TEXT NOT NULL,
    "tiketDapurId" TEXT NOT NULL,
    "itemPesananId" TEXT NOT NULL,
    "statusMasak" "StatusMasakBaris" NOT NULL DEFAULT 'MENUNGGU',

    CONSTRAINT "tiket_dapur_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_status_tiket_dapur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tiketDapurId" TEXT NOT NULL,
    "statusSebelumnya" "StatusTiketDapur" NOT NULL,
    "statusBaru" "StatusTiketDapur" NOT NULL,
    "diubahOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_status_tiket_dapur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gelombang_dapur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "nomorGelombang" INTEGER NOT NULL,
    "dipicuPada" TIMESTAMP(3),
    "dipicuOlehId" TEXT,
    "status" "StatusGelombangDapur" NOT NULL DEFAULT 'MENUNGGU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gelombang_dapur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giliran_kasir" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "penggunaId" TEXT NOT NULL,
    "modalAwal" INTEGER NOT NULL,
    "modalAkhirDihitung" INTEGER,
    "modalAkhirSistem" INTEGER,
    "status" "StatusGiliranKasir" NOT NULL DEFAULT 'DIBUKA',
    "dibukaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ditutupPada" TIMESTAMP(3),

    CONSTRAINT "giliran_kasir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_kasir" (
    "id" TEXT NOT NULL,
    "giliranKasirId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "jenis" "JenisTransaksiKasir" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaksi_kasir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metode_bayar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kode" "KodeMetodeBayar" NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "metode_bayar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "totalDiterima" INTEGER NOT NULL,
    "kembalian" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusPembayaran" NOT NULL DEFAULT 'DRAF',
    "dikonfirmasiOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dikonfirmasiPada" TIMESTAMP(3),

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alokasi_pembayaran" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alokasi_pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran_metode_baris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "metodeBayarId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,

    CONSTRAINT "pembayaran_metode_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koreksi_pembayaran" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "jumlahSebelum" INTEGER NOT NULL,
    "jumlahSesudah" INTEGER NOT NULL,
    "dikoreksiOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koreksi_pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qris_konfirmasi_manual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "catatanKasir" TEXT,
    "diverifikasiOlehId" TEXT NOT NULL,
    "diverifikasiPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qris_konfirmasi_manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "struk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "nomorStruk" TEXT NOT NULL,
    "dicetakPada" TIMESTAMP(3),
    "jumlahCetakUlang" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "struk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran_refund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "disetujuiOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konfigurasi_qris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "payloadTerenkripsi" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "namaMerchant" TEXT NOT NULL,
    "kotaMerchant" TEXT NOT NULL,
    "status" "StatusKonfigurasiQris" NOT NULL DEFAULT 'DRAF',
    "dibuatOlehId" TEXT NOT NULL,
    "diverifikasiOlehId" TEXT,
    "diverifikasiPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "konfigurasi_qris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_konfigurasi_qris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "konfigurasiQrisId" TEXT NOT NULL,
    "aksi" "AksiKonfigurasiQris" NOT NULL,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "dilakukanOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_konfigurasi_qris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "berlakuSejak" TIMESTAMP(3) NOT NULL,
    "berlakuSampai" TIMESTAMP(3) NOT NULL,
    "status" "StatusPromo" NOT NULL DEFAULT 'AKTIF',
    "stackingPolicy" "StackingPolicyPromo" NOT NULL DEFAULT 'TIDAK_BOLEH_DIGABUNG',
    "conflictGroup" TEXT,
    "prioritas" INTEGER NOT NULL DEFAULT 0,
    "maximumDiscount" INTEGER,
    "usageQuota" INTEGER,
    "usageLimitPerCustomer" INTEGER,
    "usageLimitPerOrder" INTEGER DEFAULT 1,
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_kondisi" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "jenisSyarat" "JenisSyaratPromo" NOT NULL,
    "nilaiSyarat" JSONB NOT NULL,

    CONSTRAINT "promo_kondisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_reward" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "jenis" "JenisRewardPromo" NOT NULL,
    "nilaiPersen" DECIMAL(65,30),
    "nilaiNominal" INTEGER,
    "itemGratisId" TEXT,
    "jumlahGratis" INTEGER,
    "hargaPaket" INTEGER,
    "syaratJumlahBeliX" INTEGER,
    "bayarJumlahY" INTEGER,
    "berlakuKelipatan" BOOLEAN NOT NULL DEFAULT false,
    "modifierIkutGratis" BOOLEAN NOT NULL DEFAULT false,
    "batasHadiahPerOrder" INTEGER,

    CONSTRAINT "promo_reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_jadwal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "hariDalamMinggu" INTEGER[],
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,

    CONSTRAINT "promo_jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,

    CONSTRAINT "promo_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "pelangganId" TEXT,
    "kuotaPemakaian" INTEGER,
    "jumlahDipakai" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKupon" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "kupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_pemakaian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "kuponId" TEXT,
    "pesananId" TEXT NOT NULL,
    "status" "StatusPemakaianPromo" NOT NULL DEFAULT 'DITERAPKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_pemakaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_pemakaian_baris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoPemakaianId" TEXT NOT NULL,
    "itemPesananId" TEXT,
    "nilaiDiskon" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_pemakaian_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_snapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoPemakaianId" TEXT NOT NULL,
    "definisiPromo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_simulasi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "promoId" TEXT,
    "inputKeranjang" JSONB NOT NULL,
    "hasilSimulasi" JSONB NOT NULL,
    "disimulasikanOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_simulasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pelanggan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nomorTelepon" TEXT NOT NULL,
    "email" TEXT,
    "status" "StatusPelanggan" NOT NULL DEFAULT 'AKTIF',
    "saldoTokoCache" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_keanggotaan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "minPoinKumulatif" INTEGER NOT NULL DEFAULT 0,
    "benefit" JSONB NOT NULL,

    CONSTRAINT "tier_keanggotaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keanggotaan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pelangganId" TEXT NOT NULL,
    "tierKeanggotaanId" TEXT NOT NULL,
    "poinAktif" INTEGER NOT NULL DEFAULT 0,
    "poinKumulatif" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKeanggotaan" NOT NULL DEFAULT 'AKTIF',
    "bergabungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keanggotaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poin_riwayat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "keanggotaanId" TEXT NOT NULL,
    "pesananId" TEXT,
    "jenis" "JenisPoinRiwayat" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "kadaluarsaPada" TIMESTAMP(3),
    "dibalikOlehId" TEXT,
    "dicatatOlehId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poin_riwayat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hadiah_stempel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jumlahStempelDibutuhkan" INTEGER NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "itemGratisId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hadiah_stempel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_stempel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "keanggotaanId" TEXT NOT NULL,
    "jenis" "JenisLedgerStempel" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "pesananId" TEXT,
    "hadiahStempelId" TEXT,
    "dibalikOlehId" TEXT,
    "dicatatOlehId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_stempel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_saldo_toko" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pelangganId" TEXT NOT NULL,
    "jenis" "JenisLedgerSaldoToko" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "pesananId" TEXT,
    "pembayaranId" TEXT,
    "dibalikOlehId" TEXT,
    "dicatatOlehId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_saldo_toko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persetujuan_pelanggan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pelangganId" TEXT NOT NULL,
    "jenisPersetujuan" "JenisPersetujuanPelanggan" NOT NULL,
    "disetujui" BOOLEAN NOT NULL,
    "disetujuiPada" TIMESTAMP(3) NOT NULL,
    "dicabutPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persetujuan_pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_gabung_pelanggan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pelangganUtamaId" TEXT NOT NULL,
    "pelangganGabunganId" TEXT NOT NULL,
    "digabungOlehId" TEXT NOT NULL,
    "alasan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_gabung_pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jabatan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "jabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departemen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "departemen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karyawan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "penggunaId" TEXT,
    "nomorInduk" TEXT NOT NULL,
    "status" "StatusKaryawan" NOT NULL DEFAULT 'AKTIF',
    "tanggalBergabung" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karyawan_outlet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "isUtama" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karyawan_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubungan_kerja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "jabatanId" TEXT NOT NULL,
    "departemenId" TEXT,
    "tipeHubungan" "TipeHubunganKerja" NOT NULL,
    "mulaiPada" TIMESTAMP(3) NOT NULL,
    "berakhirPada" TIMESTAMP(3),
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hubungan_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_shift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "lintasTengahMalam" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_kerja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "templateShiftId" TEXT NOT NULL,
    "polaBerulangId" TEXT,
    "tanggal" DATE NOT NULL,
    "status" "StatusJadwalKerja" NOT NULL DEFAULT 'DIJADWALKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jadwal_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pola_jadwal_berulang" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "templateShiftId" TEXT NOT NULL,
    "hariDalamMinggu" INTEGER[],
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "status" "StatusAktifNonaktif" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pola_jadwal_berulang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permintaan_tukar_shift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jadwalKerjaAsalId" TEXT NOT NULL,
    "karyawanPemohonId" TEXT NOT NULL,
    "karyawanPenggantiId" TEXT,
    "disetujuiOlehId" TEXT,
    "status" "StatusPermintaanTukarShift" NOT NULL DEFAULT 'DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permintaan_tukar_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "perangkatId" TEXT,
    "jamMasuk" TIMESTAMP(3) NOT NULL,
    "jamPulang" TIMESTAMP(3),
    "jamMasukEfektif" TIMESTAMP(3),
    "jamPulangEfektif" TIMESTAMP(3),
    "metode" "MetodeAbsensi" NOT NULL,
    "status" "StatusAbsensi" NOT NULL,
    "lokasiLat" DECIMAL(9,6),
    "lokasiLng" DECIMAL(9,6),
    "jarakDariOutletMeter" DECIMAL(8,2),

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koreksi_absensi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "absensiId" TEXT NOT NULL,
    "diajukanOlehId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "jamMasukSebelum" TIMESTAMP(3) NOT NULL,
    "jamMasukSesudah" TIMESTAMP(3),
    "jamPulangSebelum" TIMESTAMP(3),
    "jamPulangSesudah" TIMESTAMP(3),
    "alasan" TEXT NOT NULL,
    "status" "StatusKoreksiAbsensi" NOT NULL DEFAULT 'DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koreksi_absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "istirahat_absensi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "absensiId" TEXT NOT NULL,
    "mulaiPada" TIMESTAMP(3) NOT NULL,
    "selesaiPada" TIMESTAMP(3),
    "jenis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "istirahat_absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuti_izin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "jenis" "JenisCutiIzin" NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE NOT NULL,
    "status" "StatusCutiIzin" NOT NULL DEFAULT 'DIAJUKAN',

    CONSTRAINT "cuti_izin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permintaan_lembur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "tanggal" DATE NOT NULL,
    "jamMulai" TIMESTAMP(3) NOT NULL,
    "jamSelesai" TIMESTAMP(3) NOT NULL,
    "alasan" TEXT NOT NULL,
    "status" "StatusPermintaanLembur" NOT NULL DEFAULT 'DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permintaan_lembur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_kinerja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "targetNilai" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "target_kinerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penilaian_kinerja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "dinilaiOlehId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "skor" DECIMAL(5,2),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penilaian_kinerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori_biaya" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "kategori_biaya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rekap_kas_harian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "giliranKasirId" TEXT,
    "tanggal" DATE NOT NULL,
    "totalPenjualan" INTEGER NOT NULL DEFAULT 0,
    "totalRefund" INTEGER NOT NULL DEFAULT 0,
    "totalDiskon" INTEGER NOT NULL DEFAULT 0,
    "selisihKas" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusRekapKasHarian" NOT NULL DEFAULT 'DRAF',
    "diverifikasiOlehId" TEXT,

    CONSTRAINT "rekap_kas_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biaya_operasional" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "kategoriBiayaId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status" "StatusBiayaOperasional" NOT NULL DEFAULT 'DIAJUKAN',
    "dicatatOlehId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biaya_operasional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_penjualan_harian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "totalTransaksi" INTEGER NOT NULL DEFAULT 0,
    "totalPenjualan" INTEGER NOT NULL DEFAULT 0,
    "totalDiskon" INTEGER NOT NULL DEFAULT 0,
    "totalRefund" INTEGER NOT NULL DEFAULT 0,
    "dihitungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rm_penjualan_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_penjualan_item_harian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemMenuId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "kuantitasTerjual" INTEGER NOT NULL DEFAULT 0,
    "totalPenjualan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rm_penjualan_item_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_stok_kritis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "kuantitasTerkini" DECIMAL(65,30) NOT NULL,
    "ambangMinimum" DECIMAL(65,30) NOT NULL,
    "dihitungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rm_stok_kritis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_kinerja_karyawan_harian" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "karyawanId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "totalTransaksiDitangani" INTEGER NOT NULL DEFAULT 0,
    "totalPenjualanDitangani" INTEGER NOT NULL DEFAULT 0,
    "menitTerlambat" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rm_kinerja_karyawan_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_key" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "status" "StatusIdempotencyKey" NOT NULL DEFAULT 'MEMPROSES',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_outbox_event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "StatusOutboxEvent" NOT NULL DEFAULT 'TERTUNDA',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT,
    "penggunaId" TEXT,
    "tipe" "TipeNotifikasi" NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "data" JSONB,
    "dibacaPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_tenantId_kode_key" ON "outlet"("tenantId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_tenantId_id_key" ON "outlet"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_email_key" ON "pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_tenant_penggunaId_tenantId_key" ON "keanggotaan_tenant"("penggunaId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_tenant_tenantId_id_key" ON "keanggotaan_tenant"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_outlet_keanggotaanTenantId_outletId_key" ON "keanggotaan_outlet"("keanggotaanTenantId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "peran_tenantId_kode_key" ON "peran"("tenantId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "izin_kode_key" ON "izin"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "peran_izin_peranId_izinId_key" ON "peran_izin"("peranId", "izinId");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_peran_keanggotaanTenantId_peranId_key" ON "keanggotaan_peran"("keanggotaanTenantId", "peranId");

-- CreateIndex
CREATE UNIQUE INDEX "batas_izin_peranId_key" ON "batas_izin"("peranId");

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_kodeAktivasi_key" ON "perangkat"("kodeAktivasi");

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_tenantId_id_key" ON "perangkat"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sesi_tokenHash_key" ON "sesi"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "token_reset_kata_sandi_tokenHash_key" ON "token_reset_kata_sandi"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "pin_outlet_keanggotaanTenantId_outletId_perangkatId_key" ON "pin_outlet"("keanggotaanTenantId", "outletId", "perangkatId");

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_tenant_tenantId_kunci_key" ON "pengaturan_tenant"("tenantId", "kunci");

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_outlet_outletId_kunci_key" ON "pengaturan_outlet"("outletId", "kunci");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_menu_tenantId_id_key" ON "kategori_menu"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "item_menu_tenantId_id_key" ON "item_menu"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "item_modifier_grup_itemMenuId_modifierGrupId_key" ON "item_modifier_grup"("itemMenuId", "modifierGrupId");

-- CreateIndex
CREATE UNIQUE INDEX "bahan_tenantId_kodeSku_key" ON "bahan"("tenantId", "kodeSku");

-- CreateIndex
CREATE UNIQUE INDEX "bahan_tenantId_id_key" ON "bahan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "satuan_tenantId_id_key" ON "satuan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "konversi_satuan_tenantId_satuanDariId_satuanKeId_key" ON "konversi_satuan"("tenantId", "satuanDariId", "satuanKeId");

-- CreateIndex
CREATE UNIQUE INDEX "resep_tenantId_id_key" ON "resep"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "versi_resep_resepId_nomorVersi_key" ON "versi_resep"("resepId", "nomorVersi");

-- CreateIndex
CREATE UNIQUE INDEX "versi_resep_tenantId_id_key" ON "versi_resep"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "komponen_resep_versiResepId_bahanId_key" ON "komponen_resep"("versiResepId", "bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "komponen_resep_modifier_versiResepId_modifierOpsiId_bahanId_key" ON "komponen_resep_modifier"("versiResepId", "modifierOpsiId", "bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "proses_produksi_tenantId_id_key" ON "proses_produksi"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_produksi_tenantId_nomorBatch_key" ON "batch_produksi"("tenantId", "nomorBatch");

-- CreateIndex
CREATE UNIQUE INDEX "batch_produksi_tenantId_id_key" ON "batch_produksi"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gudang_tenantId_id_key" ON "gudang"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gudang_outletId_id_key" ON "gudang"("outletId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "lokasi_stok_gudangId_nama_key" ON "lokasi_stok"("gudangId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "lokasi_stok_tenantId_id_key" ON "lokasi_stok"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stok_bahan_gudangId_bahanId_lokasiStokId_key" ON "stok_bahan"("gudangId", "bahanId", "lokasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "mutasi_stok_dibalikOlehId_key" ON "mutasi_stok"("dibalikOlehId");

-- CreateIndex
CREATE INDEX "mutasi_stok_tenantId_gudangId_bahanId_createdAt_idx" ON "mutasi_stok"("tenantId", "gudangId", "bahanId", "createdAt");

-- CreateIndex
CREATE INDEX "mutasi_stok_tenantId_referensiJenis_referensiId_idx" ON "mutasi_stok"("tenantId", "referensiJenis", "referensiId");

-- CreateIndex
CREATE UNIQUE INDEX "mutasi_stok_tenantId_id_key" ON "mutasi_stok"("tenantId", "id");

-- CreateIndex
CREATE INDEX "batch_stok_tenantId_bahanId_status_tanggalKedaluwarsa_idx" ON "batch_stok"("tenantId", "bahanId", "status", "tanggalKedaluwarsa");

-- CreateIndex
CREATE INDEX "batch_stok_tenantId_bahanId_status_createdAt_idx" ON "batch_stok"("tenantId", "bahanId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "batch_stok_tenantId_bahanId_nomorBatch_key" ON "batch_stok"("tenantId", "bahanId", "nomorBatch");

-- CreateIndex
CREATE UNIQUE INDEX "batch_stok_tenantId_batchProduksiId_key" ON "batch_stok"("tenantId", "batchProduksiId");

-- CreateIndex
CREATE UNIQUE INDEX "batch_stok_tenantId_id_key" ON "batch_stok"("tenantId", "id");

-- CreateIndex
CREATE INDEX "reservasi_stok_tenantId_bahanId_status_idx" ON "reservasi_stok"("tenantId", "bahanId", "status");

-- CreateIndex
CREATE INDEX "reservasi_stok_itemPesananId_status_idx" ON "reservasi_stok"("itemPesananId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "penyesuaian_stok_mutasiStokId_key" ON "penyesuaian_stok"("mutasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "penyesuaian_stok_tenantId_mutasiStokId_key" ON "penyesuaian_stok"("tenantId", "mutasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_stok_tenantId_nomorTransfer_key" ON "transfer_stok"("tenantId", "nomorTransfer");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_stok_tenantId_id_key" ON "transfer_stok"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_stok_baris_mutasiKeluarId_key" ON "transfer_stok_baris"("mutasiKeluarId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_stok_baris_mutasiMasukId_key" ON "transfer_stok_baris"("mutasiMasukId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_stok_baris_transferStokId_bahanId_key" ON "transfer_stok_baris"("transferStokId", "bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "alasan_waste_tenantId_kode_key" ON "alasan_waste"("tenantId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "alasan_waste_tenantId_id_key" ON "alasan_waste"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "catatan_waste_mutasiStokId_key" ON "catatan_waste"("mutasiStokId");

-- CreateIndex
CREATE INDEX "catatan_waste_tenantId_bahanId_createdAt_idx" ON "catatan_waste"("tenantId", "bahanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "catatan_waste_tenantId_mutasiStokId_key" ON "catatan_waste"("tenantId", "mutasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "kebijakan_pemesanan_ulang_outletId_bahanId_key" ON "kebijakan_pemesanan_ulang"("outletId", "bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_persediaan_outlet_outletId_key" ON "pengaturan_persediaan_outlet"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_persediaan_outlet_tenantId_outletId_key" ON "pengaturan_persediaan_outlet"("tenantId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_tenantId_id_key" ON "stok_opname"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_baris_mutasiKoreksiId_key" ON "stok_opname_baris"("mutasiKoreksiId");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_baris_stokOpnameId_bahanId_lokasiStokId_key" ON "stok_opname_baris"("stokOpnameId", "bahanId", "lokasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_tenantId_id_key" ON "supplier"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_nomorPo_key" ON "purchase_order"("nomorPo");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_tenantId_id_key" ON "purchase_order"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "penerimaan_barang_nomorPenerimaan_key" ON "penerimaan_barang"("nomorPenerimaan");

-- CreateIndex
CREATE UNIQUE INDEX "area_meja_outletId_id_key" ON "area_meja"("outletId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "meja_outletId_nomor_key" ON "meja"("outletId", "nomor");

-- CreateIndex
CREATE UNIQUE INDEX "meja_outletId_id_key" ON "meja"("outletId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sesi_meja_qr_token_key" ON "sesi_meja_qr"("token");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_outletId_nomorPesanan_key" ON "pesanan"("outletId", "nomorPesanan");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_tenantId_id_key" ON "pesanan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_penolakan_pesananId_key" ON "pesanan_penolakan"("pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_pembatalan_pesananId_key" ON "pesanan_pembatalan"("pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "stasiun_dapur_outletId_id_key" ON "stasiun_dapur"("outletId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_dapur_pesananId_stasiunDapurId_nomorGelombang_key" ON "tiket_dapur"("pesananId", "stasiunDapurId", "nomorGelombang");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_dapur_baris_itemPesananId_key" ON "tiket_dapur_baris"("itemPesananId");

-- CreateIndex
CREATE UNIQUE INDEX "gelombang_dapur_pesananId_nomorGelombang_key" ON "gelombang_dapur"("pesananId", "nomorGelombang");

-- CreateIndex
CREATE UNIQUE INDEX "giliran_kasir_tenantId_id_key" ON "giliran_kasir"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "metode_bayar_tenantId_kode_key" ON "metode_bayar"("tenantId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "metode_bayar_tenantId_id_key" ON "metode_bayar"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pembayaran_tenantId_id_key" ON "pembayaran"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "alokasi_pembayaran_pembayaranId_pesananId_key" ON "alokasi_pembayaran"("pembayaranId", "pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "qris_konfirmasi_manual_pembayaranId_key" ON "qris_konfirmasi_manual"("pembayaranId");

-- CreateIndex
CREATE UNIQUE INDEX "qris_konfirmasi_manual_tenantId_pembayaranId_key" ON "qris_konfirmasi_manual"("tenantId", "pembayaranId");

-- CreateIndex
CREATE UNIQUE INDEX "struk_pembayaranId_key" ON "struk"("pembayaranId");

-- CreateIndex
CREATE UNIQUE INDEX "struk_nomorStruk_key" ON "struk"("nomorStruk");

-- CreateIndex
CREATE UNIQUE INDEX "struk_tenantId_pembayaranId_key" ON "struk"("tenantId", "pembayaranId");

-- CreateIndex
CREATE UNIQUE INDEX "konfigurasi_qris_tenantId_outletId_fingerprint_key" ON "konfigurasi_qris"("tenantId", "outletId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "konfigurasi_qris_tenantId_id_key" ON "konfigurasi_qris"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_tenantId_id_key" ON "promo"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_outlet_promoId_outletId_key" ON "promo_outlet"("promoId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "kupon_kode_key" ON "kupon"("kode");

-- CreateIndex
CREATE INDEX "promo_pemakaian_promoId_pesananId_idx" ON "promo_pemakaian"("promoId", "pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_pemakaian_tenantId_id_key" ON "promo_pemakaian"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_snapshot_promoPemakaianId_key" ON "promo_snapshot"("promoPemakaianId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_snapshot_tenantId_promoPemakaianId_key" ON "promo_snapshot"("tenantId", "promoPemakaianId");

-- CreateIndex
CREATE UNIQUE INDEX "pelanggan_tenantId_nomorTelepon_key" ON "pelanggan"("tenantId", "nomorTelepon");

-- CreateIndex
CREATE UNIQUE INDEX "pelanggan_tenantId_id_key" ON "pelanggan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tier_keanggotaan_tenantId_id_key" ON "tier_keanggotaan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_pelangganId_key" ON "keanggotaan"("pelangganId");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_tenantId_id_key" ON "keanggotaan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_tenantId_pelangganId_key" ON "keanggotaan"("tenantId", "pelangganId");

-- CreateIndex
CREATE UNIQUE INDEX "poin_riwayat_dibalikOlehId_key" ON "poin_riwayat"("dibalikOlehId");

-- CreateIndex
CREATE UNIQUE INDEX "hadiah_stempel_tenantId_id_key" ON "hadiah_stempel"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_stempel_dibalikOlehId_key" ON "ledger_stempel"("dibalikOlehId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_saldo_toko_dibalikOlehId_key" ON "ledger_saldo_toko"("dibalikOlehId");

-- CreateIndex
CREATE UNIQUE INDEX "riwayat_gabung_pelanggan_pelangganGabunganId_key" ON "riwayat_gabung_pelanggan"("pelangganGabunganId");

-- CreateIndex
CREATE UNIQUE INDEX "jabatan_tenantId_id_key" ON "jabatan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "departemen_tenantId_id_key" ON "departemen"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_penggunaId_key" ON "karyawan"("penggunaId");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_nomorInduk_key" ON "karyawan"("nomorInduk");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_tenantId_id_key" ON "karyawan"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_outlet_karyawanId_outletId_key" ON "karyawan_outlet"("karyawanId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "template_shift_tenantId_id_key" ON "template_shift"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_kerja_tenantId_id_key" ON "jadwal_kerja"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_tenantId_id_key" ON "absensi"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_biaya_tenantId_id_key" ON "kategori_biaya"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "rekap_kas_harian_giliranKasirId_key" ON "rekap_kas_harian"("giliranKasirId");

-- CreateIndex
CREATE UNIQUE INDEX "rekap_kas_harian_tenantId_giliranKasirId_key" ON "rekap_kas_harian"("tenantId", "giliranKasirId");

-- CreateIndex
CREATE UNIQUE INDEX "rm_penjualan_harian_outletId_tanggal_key" ON "rm_penjualan_harian"("outletId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "rm_penjualan_item_harian_outletId_itemMenuId_tanggal_key" ON "rm_penjualan_item_harian"("outletId", "itemMenuId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "rm_stok_kritis_outletId_bahanId_key" ON "rm_stok_kritis"("outletId", "bahanId");

-- CreateIndex
CREATE UNIQUE INDEX "rm_kinerja_karyawan_harian_outletId_karyawanId_tanggal_key" ON "rm_kinerja_karyawan_harian"("outletId", "karyawanId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_key_tenantId_scope_key_key" ON "idempotency_key"("tenantId", "scope", "key");

-- CreateIndex
CREATE INDEX "domain_outbox_event_status_availableAt_idx" ON "domain_outbox_event"("status", "availableAt");

-- CreateIndex
CREATE INDEX "notification_penggunaId_dibacaPada_idx" ON "notification"("penggunaId", "dibacaPada");

-- AddForeignKey
ALTER TABLE "outlet" ADD CONSTRAINT "outlet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_tenant" ADD CONSTRAINT "keanggotaan_tenant_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_tenant" ADD CONSTRAINT "keanggotaan_tenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_outlet" ADD CONSTRAINT "keanggotaan_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_outlet" ADD CONSTRAINT "keanggotaan_outlet_keanggotaanTenantId_fkey" FOREIGN KEY ("keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_outlet" ADD CONSTRAINT "keanggotaan_outlet_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peran" ADD CONSTRAINT "peran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peran_izin" ADD CONSTRAINT "peran_izin_peranId_fkey" FOREIGN KEY ("peranId") REFERENCES "peran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peran_izin" ADD CONSTRAINT "peran_izin_izinId_fkey" FOREIGN KEY ("izinId") REFERENCES "izin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_peran" ADD CONSTRAINT "keanggotaan_peran_keanggotaanTenantId_fkey" FOREIGN KEY ("keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan_peran" ADD CONSTRAINT "keanggotaan_peran_peranId_fkey" FOREIGN KEY ("peranId") REFERENCES "peran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batas_izin" ADD CONSTRAINT "batas_izin_peranId_fkey" FOREIGN KEY ("peranId") REFERENCES "peran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_sementara" ADD CONSTRAINT "izin_sementara_keanggotaanTenantId_fkey" FOREIGN KEY ("keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_sementara" ADD CONSTRAINT "izin_sementara_izinId_fkey" FOREIGN KEY ("izinId") REFERENCES "izin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_sementara" ADD CONSTRAINT "izin_sementara_diberikanOlehId_fkey" FOREIGN KEY ("diberikanOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_persetujuan" ADD CONSTRAINT "permintaan_persetujuan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_persetujuan" ADD CONSTRAINT "permintaan_persetujuan_keanggotaanTenantIdPemohon_fkey" FOREIGN KEY ("keanggotaanTenantIdPemohon") REFERENCES "keanggotaan_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_persetujuan" ADD CONSTRAINT "permintaan_persetujuan_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_keanggotaanTenantId_fkey" FOREIGN KEY ("keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_perangkatId_fkey" FOREIGN KEY ("perangkatId") REFERENCES "perangkat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_reset_kata_sandi" ADD CONSTRAINT "token_reset_kata_sandi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_outlet" ADD CONSTRAINT "pin_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_outlet" ADD CONSTRAINT "pin_outlet_keanggotaanTenantId_fkey" FOREIGN KEY ("keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_outlet" ADD CONSTRAINT "pin_outlet_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_perangkat" ADD CONSTRAINT "riwayat_perangkat_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_perangkat" ADD CONSTRAINT "riwayat_perangkat_perangkatId_fkey" FOREIGN KEY ("perangkatId") REFERENCES "perangkat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_tenant" ADD CONSTRAINT "pengaturan_tenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_outlet" ADD CONSTRAINT "pengaturan_outlet_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kategori_menu" ADD CONSTRAINT "kategori_menu_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_menu" ADD CONSTRAINT "item_menu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_menu" ADD CONSTRAINT "item_menu_tenantId_kategoriId_fkey" FOREIGN KEY ("tenantId", "kategoriId") REFERENCES "kategori_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "varian_menu" ADD CONSTRAINT "varian_menu_itemMenuId_fkey" FOREIGN KEY ("itemMenuId") REFERENCES "item_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_grup" ADD CONSTRAINT "modifier_grup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_modifier_grup" ADD CONSTRAINT "item_modifier_grup_itemMenuId_fkey" FOREIGN KEY ("itemMenuId") REFERENCES "item_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_modifier_grup" ADD CONSTRAINT "item_modifier_grup_modifierGrupId_fkey" FOREIGN KEY ("modifierGrupId") REFERENCES "modifier_grup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_opsi" ADD CONSTRAINT "modifier_opsi_modifierGrupId_fkey" FOREIGN KEY ("modifierGrupId") REFERENCES "modifier_grup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harga_item_outlet" ADD CONSTRAINT "harga_item_outlet_tenantId_itemMenuId_fkey" FOREIGN KEY ("tenantId", "itemMenuId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harga_item_outlet" ADD CONSTRAINT "harga_item_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bahan" ADD CONSTRAINT "bahan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bahan" ADD CONSTRAINT "bahan_satuanDasarId_fkey" FOREIGN KEY ("satuanDasarId") REFERENCES "satuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satuan" ADD CONSTRAINT "satuan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konversi_satuan" ADD CONSTRAINT "konversi_satuan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konversi_satuan" ADD CONSTRAINT "konversi_satuan_tenantId_satuanDariId_fkey" FOREIGN KEY ("tenantId", "satuanDariId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konversi_satuan" ADD CONSTRAINT "konversi_satuan_tenantId_satuanKeId_fkey" FOREIGN KEY ("tenantId", "satuanKeId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_tenantId_itemMenuId_fkey" FOREIGN KEY ("tenantId", "itemMenuId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_varianMenuId_fkey" FOREIGN KEY ("varianMenuId") REFERENCES "varian_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resep" ADD CONSTRAINT "resep_tenantId_bahanHasilId_fkey" FOREIGN KEY ("tenantId", "bahanHasilId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versi_resep" ADD CONSTRAINT "versi_resep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versi_resep" ADD CONSTRAINT "versi_resep_tenantId_resepId_fkey" FOREIGN KEY ("tenantId", "resepId") REFERENCES "resep"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versi_resep" ADD CONSTRAINT "versi_resep_tenantId_satuanHasilId_fkey" FOREIGN KEY ("tenantId", "satuanHasilId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep" ADD CONSTRAINT "komponen_resep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep" ADD CONSTRAINT "komponen_resep_tenantId_versiResepId_fkey" FOREIGN KEY ("tenantId", "versiResepId") REFERENCES "versi_resep"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep" ADD CONSTRAINT "komponen_resep_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep" ADD CONSTRAINT "komponen_resep_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_tenantId_versiResepId_fkey" FOREIGN KEY ("tenantId", "versiResepId") REFERENCES "versi_resep"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_modifierOpsiId_fkey" FOREIGN KEY ("modifierOpsiId") REFERENCES "modifier_opsi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_tenantId_bahanPenggantiId_fkey" FOREIGN KEY ("tenantId", "bahanPenggantiId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komponen_resep_modifier" ADD CONSTRAINT "komponen_resep_modifier_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi" ADD CONSTRAINT "proses_produksi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi" ADD CONSTRAINT "proses_produksi_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi" ADD CONSTRAINT "proses_produksi_tenantId_versiResepId_fkey" FOREIGN KEY ("tenantId", "versiResepId") REFERENCES "versi_resep"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi" ADD CONSTRAINT "proses_produksi_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi_baris" ADD CONSTRAINT "proses_produksi_baris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi_baris" ADD CONSTRAINT "proses_produksi_baris_tenantId_prosesProduksiId_fkey" FOREIGN KEY ("tenantId", "prosesProduksiId") REFERENCES "proses_produksi"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi_baris" ADD CONSTRAINT "proses_produksi_baris_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi_baris" ADD CONSTRAINT "proses_produksi_baris_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_produksi" ADD CONSTRAINT "batch_produksi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_produksi" ADD CONSTRAINT "batch_produksi_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_produksi" ADD CONSTRAINT "batch_produksi_tenantId_prosesProduksiId_fkey" FOREIGN KEY ("tenantId", "prosesProduksiId") REFERENCES "proses_produksi"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_produksi" ADD CONSTRAINT "batch_produksi_tenantId_bahanHasilId_fkey" FOREIGN KEY ("tenantId", "bahanHasilId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_produksi" ADD CONSTRAINT "batch_produksi_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gudang" ADD CONSTRAINT "gudang_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lokasi_stok" ADD CONSTRAINT "lokasi_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lokasi_stok" ADD CONSTRAINT "lokasi_stok_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lokasi_stok" ADD CONSTRAINT "lokasi_stok_outletId_gudangId_fkey" FOREIGN KEY ("outletId", "gudangId") REFERENCES "gudang"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_bahan" ADD CONSTRAINT "stok_bahan_tenantId_gudangId_fkey" FOREIGN KEY ("tenantId", "gudangId") REFERENCES "gudang"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_bahan" ADD CONSTRAINT "stok_bahan_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_bahan" ADD CONSTRAINT "stok_bahan_tenantId_lokasiStokId_fkey" FOREIGN KEY ("tenantId", "lokasiStokId") REFERENCES "lokasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_gudangId_fkey" FOREIGN KEY ("tenantId", "gudangId") REFERENCES "gudang"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_lokasiSumberId_fkey" FOREIGN KEY ("tenantId", "lokasiSumberId") REFERENCES "lokasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_lokasiTujuanId_fkey" FOREIGN KEY ("tenantId", "lokasiTujuanId") REFERENCES "lokasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_batchStokId_fkey" FOREIGN KEY ("tenantId", "batchStokId") REFERENCES "batch_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_dibalikOlehId_fkey" FOREIGN KEY ("dibalikOlehId") REFERENCES "mutasi_stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_stok" ADD CONSTRAINT "batch_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_stok" ADD CONSTRAINT "batch_stok_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_stok" ADD CONSTRAINT "batch_stok_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_stok" ADD CONSTRAINT "batch_stok_tenantId_lokasiStokId_fkey" FOREIGN KEY ("tenantId", "lokasiStokId") REFERENCES "lokasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_stok" ADD CONSTRAINT "batch_stok_tenantId_batchProduksiId_fkey" FOREIGN KEY ("tenantId", "batchProduksiId") REFERENCES "batch_produksi"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_itemPesananId_fkey" FOREIGN KEY ("itemPesananId") REFERENCES "item_pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_mutasiStokId_fkey" FOREIGN KEY ("tenantId", "mutasiStokId") REFERENCES "mutasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_outletAsalId_fkey" FOREIGN KEY ("tenantId", "outletAsalId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_outletTujuanId_fkey" FOREIGN KEY ("tenantId", "outletTujuanId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_outletAsalId_gudangAsalId_fkey" FOREIGN KEY ("outletAsalId", "gudangAsalId") REFERENCES "gudang"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_outletTujuanId_gudangTujuanId_fkey" FOREIGN KEY ("outletTujuanId", "gudangTujuanId") REFERENCES "gudang"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_dikirimOlehId_fkey" FOREIGN KEY ("dikirimOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_diterimaOlehId_fkey" FOREIGN KEY ("diterimaOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_transferStokId_fkey" FOREIGN KEY ("tenantId", "transferStokId") REFERENCES "transfer_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_batchStokId_fkey" FOREIGN KEY ("tenantId", "batchStokId") REFERENCES "batch_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_mutasiKeluarId_fkey" FOREIGN KEY ("tenantId", "mutasiKeluarId") REFERENCES "mutasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok_baris" ADD CONSTRAINT "transfer_stok_baris_tenantId_mutasiMasukId_fkey" FOREIGN KEY ("tenantId", "mutasiMasukId") REFERENCES "mutasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alasan_waste" ADD CONSTRAINT "alasan_waste_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_gudangId_fkey" FOREIGN KEY ("tenantId", "gudangId") REFERENCES "gudang"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_lokasiStokId_fkey" FOREIGN KEY ("tenantId", "lokasiStokId") REFERENCES "lokasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_batchStokId_fkey" FOREIGN KEY ("tenantId", "batchStokId") REFERENCES "batch_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_alasanWasteId_fkey" FOREIGN KEY ("tenantId", "alasanWasteId") REFERENCES "alasan_waste"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_satuanId_fkey" FOREIGN KEY ("tenantId", "satuanId") REFERENCES "satuan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_mutasiStokId_fkey" FOREIGN KEY ("tenantId", "mutasiStokId") REFERENCES "mutasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebijakan_pemesanan_ulang" ADD CONSTRAINT "kebijakan_pemesanan_ulang_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebijakan_pemesanan_ulang" ADD CONSTRAINT "kebijakan_pemesanan_ulang_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebijakan_pemesanan_ulang" ADD CONSTRAINT "kebijakan_pemesanan_ulang_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_persediaan_outlet" ADD CONSTRAINT "pengaturan_persediaan_outlet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengaturan_persediaan_outlet" ADD CONSTRAINT "pengaturan_persediaan_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_gudangId_fkey" FOREIGN KEY ("tenantId", "gudangId") REFERENCES "gudang"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_penghitungId_fkey" FOREIGN KEY ("penghitungId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_pengunciId_fkey" FOREIGN KEY ("pengunciId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_penyetujuId_fkey" FOREIGN KEY ("penyetujuId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_baris" ADD CONSTRAINT "stok_opname_baris_stokOpnameId_fkey" FOREIGN KEY ("stokOpnameId") REFERENCES "stok_opname"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_baris" ADD CONSTRAINT "stok_opname_baris_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_baris" ADD CONSTRAINT "stok_opname_baris_lokasiStokId_fkey" FOREIGN KEY ("lokasiStokId") REFERENCES "lokasi_stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_baris" ADD CONSTRAINT "stok_opname_baris_batchStokId_fkey" FOREIGN KEY ("batchStokId") REFERENCES "batch_stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_baris" ADD CONSTRAINT "stok_opname_baris_mutasiKoreksiId_fkey" FOREIGN KEY ("mutasiKoreksiId") REFERENCES "mutasi_stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_tenantId_supplierId_fkey" FOREIGN KEY ("tenantId", "supplierId") REFERENCES "supplier"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_baris" ADD CONSTRAINT "purchase_order_baris_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_baris" ADD CONSTRAINT "purchase_order_baris_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang" ADD CONSTRAINT "penerimaan_barang_tenantId_purchaseOrderId_fkey" FOREIGN KEY ("tenantId", "purchaseOrderId") REFERENCES "purchase_order"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang" ADD CONSTRAINT "penerimaan_barang_tenantId_gudangId_fkey" FOREIGN KEY ("tenantId", "gudangId") REFERENCES "gudang"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang" ADD CONSTRAINT "penerimaan_barang_diterimaOlehId_fkey" FOREIGN KEY ("diterimaOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang_baris" ADD CONSTRAINT "penerimaan_barang_baris_penerimaanBarangId_fkey" FOREIGN KEY ("penerimaanBarangId") REFERENCES "penerimaan_barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang_baris" ADD CONSTRAINT "penerimaan_barang_baris_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur_pembelian" ADD CONSTRAINT "retur_pembelian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur_pembelian" ADD CONSTRAINT "retur_pembelian_penerimaanBarangId_fkey" FOREIGN KEY ("penerimaanBarangId") REFERENCES "penerimaan_barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_meja" ADD CONSTRAINT "area_meja_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meja" ADD CONSTRAINT "meja_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meja" ADD CONSTRAINT "meja_outletId_areaMejaId_fkey" FOREIGN KEY ("outletId", "areaMejaId") REFERENCES "area_meja"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi_meja_qr" ADD CONSTRAINT "sesi_meja_qr_mejaId_fkey" FOREIGN KEY ("mejaId") REFERENCES "meja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi" ADD CONSTRAINT "reservasi_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi" ADD CONSTRAINT "reservasi_outletId_mejaId_fkey" FOREIGN KEY ("outletId", "mejaId") REFERENCES "meja"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservasi" ADD CONSTRAINT "reservasi_tenantId_pelangganId_fkey" FOREIGN KEY ("tenantId", "pelangganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_outletId_mejaId_fkey" FOREIGN KEY ("outletId", "mejaId") REFERENCES "meja"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_tenantId_pelangganId_fkey" FOREIGN KEY ("tenantId", "pelangganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_itemMenuId_fkey" FOREIGN KEY ("itemMenuId") REFERENCES "item_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_varianMenuId_fkey" FOREIGN KEY ("varianMenuId") REFERENCES "varian_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan" ADD CONSTRAINT "item_pesanan_resepVersiId_fkey" FOREIGN KEY ("resepVersiId") REFERENCES "versi_resep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan_modifier" ADD CONSTRAINT "item_pesanan_modifier_itemPesananId_fkey" FOREIGN KEY ("itemPesananId") REFERENCES "item_pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pesanan_modifier" ADD CONSTRAINT "item_pesanan_modifier_modifierOpsiId_fkey" FOREIGN KEY ("modifierOpsiId") REFERENCES "modifier_opsi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_riwayat_status" ADD CONSTRAINT "pesanan_riwayat_status_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_riwayat_status" ADD CONSTRAINT "pesanan_riwayat_status_diubahOlehId_fkey" FOREIGN KEY ("diubahOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_perubahan" ADD CONSTRAINT "pesanan_perubahan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_perubahan" ADD CONSTRAINT "pesanan_perubahan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_perubahan" ADD CONSTRAINT "pesanan_perubahan_diubahOlehId_fkey" FOREIGN KEY ("diubahOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_penolakan" ADD CONSTRAINT "pesanan_penolakan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_penolakan" ADD CONSTRAINT "pesanan_penolakan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_penolakan" ADD CONSTRAINT "pesanan_penolakan_ditolakOlehId_fkey" FOREIGN KEY ("ditolakOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_pembatalan" ADD CONSTRAINT "pesanan_pembatalan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_pembatalan" ADD CONSTRAINT "pesanan_pembatalan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_pembatalan" ADD CONSTRAINT "pesanan_pembatalan_dibatalkanOlehId_fkey" FOREIGN KEY ("dibatalkanOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stasiun_dapur" ADD CONSTRAINT "stasiun_dapur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stasiun_dapur" ADD CONSTRAINT "stasiun_dapur_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_routing_dapur" ADD CONSTRAINT "aturan_routing_dapur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_routing_dapur" ADD CONSTRAINT "aturan_routing_dapur_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_routing_dapur" ADD CONSTRAINT "aturan_routing_dapur_tenantId_itemMenuId_fkey" FOREIGN KEY ("tenantId", "itemMenuId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_routing_dapur" ADD CONSTRAINT "aturan_routing_dapur_tenantId_kategoriMenuId_fkey" FOREIGN KEY ("tenantId", "kategoriMenuId") REFERENCES "kategori_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aturan_routing_dapur" ADD CONSTRAINT "aturan_routing_dapur_outletId_stasiunDapurId_fkey" FOREIGN KEY ("outletId", "stasiunDapurId") REFERENCES "stasiun_dapur"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur" ADD CONSTRAINT "tiket_dapur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur" ADD CONSTRAINT "tiket_dapur_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur" ADD CONSTRAINT "tiket_dapur_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur" ADD CONSTRAINT "tiket_dapur_outletId_stasiunDapurId_fkey" FOREIGN KEY ("outletId", "stasiunDapurId") REFERENCES "stasiun_dapur"("outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur_baris" ADD CONSTRAINT "tiket_dapur_baris_tiketDapurId_fkey" FOREIGN KEY ("tiketDapurId") REFERENCES "tiket_dapur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_dapur_baris" ADD CONSTRAINT "tiket_dapur_baris_itemPesananId_fkey" FOREIGN KEY ("itemPesananId") REFERENCES "item_pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_tiket_dapur" ADD CONSTRAINT "riwayat_status_tiket_dapur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_tiket_dapur" ADD CONSTRAINT "riwayat_status_tiket_dapur_tiketDapurId_fkey" FOREIGN KEY ("tiketDapurId") REFERENCES "tiket_dapur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_tiket_dapur" ADD CONSTRAINT "riwayat_status_tiket_dapur_diubahOlehId_fkey" FOREIGN KEY ("diubahOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gelombang_dapur" ADD CONSTRAINT "gelombang_dapur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gelombang_dapur" ADD CONSTRAINT "gelombang_dapur_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gelombang_dapur" ADD CONSTRAINT "gelombang_dapur_dipicuOlehId_fkey" FOREIGN KEY ("dipicuOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giliran_kasir" ADD CONSTRAINT "giliran_kasir_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giliran_kasir" ADD CONSTRAINT "giliran_kasir_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_kasir" ADD CONSTRAINT "transaksi_kasir_giliranKasirId_fkey" FOREIGN KEY ("giliranKasirId") REFERENCES "giliran_kasir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_kasir" ADD CONSTRAINT "transaksi_kasir_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metode_bayar" ADD CONSTRAINT "metode_bayar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_dikonfirmasiOlehId_fkey" FOREIGN KEY ("dikonfirmasiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_pembayaran" ADD CONSTRAINT "alokasi_pembayaran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_pembayaran" ADD CONSTRAINT "alokasi_pembayaran_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_pembayaran" ADD CONSTRAINT "alokasi_pembayaran_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_metode_baris" ADD CONSTRAINT "pembayaran_metode_baris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_metode_baris" ADD CONSTRAINT "pembayaran_metode_baris_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_metode_baris" ADD CONSTRAINT "pembayaran_metode_baris_tenantId_metodeBayarId_fkey" FOREIGN KEY ("tenantId", "metodeBayarId") REFERENCES "metode_bayar"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_pembayaran" ADD CONSTRAINT "koreksi_pembayaran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_pembayaran" ADD CONSTRAINT "koreksi_pembayaran_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_pembayaran" ADD CONSTRAINT "koreksi_pembayaran_dikoreksiOlehId_fkey" FOREIGN KEY ("dikoreksiOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qris_konfirmasi_manual" ADD CONSTRAINT "qris_konfirmasi_manual_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qris_konfirmasi_manual" ADD CONSTRAINT "qris_konfirmasi_manual_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qris_konfirmasi_manual" ADD CONSTRAINT "qris_konfirmasi_manual_diverifikasiOlehId_fkey" FOREIGN KEY ("diverifikasiOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "struk" ADD CONSTRAINT "struk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "struk" ADD CONSTRAINT "struk_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_refund" ADD CONSTRAINT "pembayaran_refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_refund" ADD CONSTRAINT "pembayaran_refund_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_refund" ADD CONSTRAINT "pembayaran_refund_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_diverifikasiOlehId_fkey" FOREIGN KEY ("diverifikasiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" ADD CONSTRAINT "riwayat_konfigurasi_qris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" ADD CONSTRAINT "riwayat_konfigurasi_qris_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" ADD CONSTRAINT "riwayat_konfigurasi_qris_tenantId_konfigurasiQrisId_fkey" FOREIGN KEY ("tenantId", "konfigurasiQrisId") REFERENCES "konfigurasi_qris"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" ADD CONSTRAINT "riwayat_konfigurasi_qris_dilakukanOlehId_fkey" FOREIGN KEY ("dilakukanOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo" ADD CONSTRAINT "promo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_kondisi" ADD CONSTRAINT "promo_kondisi_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "promo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_reward" ADD CONSTRAINT "promo_reward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_reward" ADD CONSTRAINT "promo_reward_tenantId_promoId_fkey" FOREIGN KEY ("tenantId", "promoId") REFERENCES "promo"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_reward" ADD CONSTRAINT "promo_reward_tenantId_itemGratisId_fkey" FOREIGN KEY ("tenantId", "itemGratisId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_jadwal" ADD CONSTRAINT "promo_jadwal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_jadwal" ADD CONSTRAINT "promo_jadwal_tenantId_promoId_fkey" FOREIGN KEY ("tenantId", "promoId") REFERENCES "promo"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_outlet" ADD CONSTRAINT "promo_outlet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_outlet" ADD CONSTRAINT "promo_outlet_tenantId_promoId_fkey" FOREIGN KEY ("tenantId", "promoId") REFERENCES "promo"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_outlet" ADD CONSTRAINT "promo_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kupon" ADD CONSTRAINT "kupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kupon" ADD CONSTRAINT "kupon_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "promo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kupon" ADD CONSTRAINT "kupon_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "pelanggan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian" ADD CONSTRAINT "promo_pemakaian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian" ADD CONSTRAINT "promo_pemakaian_tenantId_promoId_fkey" FOREIGN KEY ("tenantId", "promoId") REFERENCES "promo"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian" ADD CONSTRAINT "promo_pemakaian_kuponId_fkey" FOREIGN KEY ("kuponId") REFERENCES "kupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian" ADD CONSTRAINT "promo_pemakaian_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian_baris" ADD CONSTRAINT "promo_pemakaian_baris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian_baris" ADD CONSTRAINT "promo_pemakaian_baris_tenantId_promoPemakaianId_fkey" FOREIGN KEY ("tenantId", "promoPemakaianId") REFERENCES "promo_pemakaian"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pemakaian_baris" ADD CONSTRAINT "promo_pemakaian_baris_itemPesananId_fkey" FOREIGN KEY ("itemPesananId") REFERENCES "item_pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_snapshot" ADD CONSTRAINT "promo_snapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_snapshot" ADD CONSTRAINT "promo_snapshot_tenantId_promoPemakaianId_fkey" FOREIGN KEY ("tenantId", "promoPemakaianId") REFERENCES "promo_pemakaian"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_simulasi" ADD CONSTRAINT "promo_simulasi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_simulasi" ADD CONSTRAINT "promo_simulasi_tenantId_promoId_fkey" FOREIGN KEY ("tenantId", "promoId") REFERENCES "promo"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_simulasi" ADD CONSTRAINT "promo_simulasi_disimulasikanOlehId_fkey" FOREIGN KEY ("disimulasikanOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_keanggotaan" ADD CONSTRAINT "tier_keanggotaan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan" ADD CONSTRAINT "keanggotaan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan" ADD CONSTRAINT "keanggotaan_tenantId_pelangganId_fkey" FOREIGN KEY ("tenantId", "pelangganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keanggotaan" ADD CONSTRAINT "keanggotaan_tenantId_tierKeanggotaanId_fkey" FOREIGN KEY ("tenantId", "tierKeanggotaanId") REFERENCES "tier_keanggotaan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_tenantId_keanggotaanId_fkey" FOREIGN KEY ("tenantId", "keanggotaanId") REFERENCES "keanggotaan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_dibalikOlehId_fkey" FOREIGN KEY ("dibalikOlehId") REFERENCES "poin_riwayat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadiah_stempel" ADD CONSTRAINT "hadiah_stempel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hadiah_stempel" ADD CONSTRAINT "hadiah_stempel_tenantId_itemGratisId_fkey" FOREIGN KEY ("tenantId", "itemGratisId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_tenantId_keanggotaanId_fkey" FOREIGN KEY ("tenantId", "keanggotaanId") REFERENCES "keanggotaan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_tenantId_hadiahStempelId_fkey" FOREIGN KEY ("tenantId", "hadiahStempelId") REFERENCES "hadiah_stempel"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_dibalikOlehId_fkey" FOREIGN KEY ("dibalikOlehId") REFERENCES "ledger_stempel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_tenantId_pelangganId_fkey" FOREIGN KEY ("tenantId", "pelangganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_tenantId_pembayaranId_fkey" FOREIGN KEY ("tenantId", "pembayaranId") REFERENCES "pembayaran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_dibalikOlehId_fkey" FOREIGN KEY ("dibalikOlehId") REFERENCES "ledger_saldo_toko"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persetujuan_pelanggan" ADD CONSTRAINT "persetujuan_pelanggan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persetujuan_pelanggan" ADD CONSTRAINT "persetujuan_pelanggan_tenantId_pelangganId_fkey" FOREIGN KEY ("tenantId", "pelangganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" ADD CONSTRAINT "riwayat_gabung_pelanggan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" ADD CONSTRAINT "riwayat_gabung_pelanggan_tenantId_pelangganUtamaId_fkey" FOREIGN KEY ("tenantId", "pelangganUtamaId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" ADD CONSTRAINT "riwayat_gabung_pelanggan_tenantId_pelangganGabunganId_fkey" FOREIGN KEY ("tenantId", "pelangganGabunganId") REFERENCES "pelanggan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" ADD CONSTRAINT "riwayat_gabung_pelanggan_digabungOlehId_fkey" FOREIGN KEY ("digabungOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jabatan" ADD CONSTRAINT "jabatan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departemen" ADD CONSTRAINT "departemen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan_outlet" ADD CONSTRAINT "karyawan_outlet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan_outlet" ADD CONSTRAINT "karyawan_outlet_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan_outlet" ADD CONSTRAINT "karyawan_outlet_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubungan_kerja" ADD CONSTRAINT "hubungan_kerja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubungan_kerja" ADD CONSTRAINT "hubungan_kerja_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubungan_kerja" ADD CONSTRAINT "hubungan_kerja_tenantId_jabatanId_fkey" FOREIGN KEY ("tenantId", "jabatanId") REFERENCES "jabatan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hubungan_kerja" ADD CONSTRAINT "hubungan_kerja_tenantId_departemenId_fkey" FOREIGN KEY ("tenantId", "departemenId") REFERENCES "departemen"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_shift" ADD CONSTRAINT "template_shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_shift" ADD CONSTRAINT "template_shift_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_tenantId_templateShiftId_fkey" FOREIGN KEY ("tenantId", "templateShiftId") REFERENCES "template_shift"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_polaBerulangId_fkey" FOREIGN KEY ("polaBerulangId") REFERENCES "pola_jadwal_berulang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pola_jadwal_berulang" ADD CONSTRAINT "pola_jadwal_berulang_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pola_jadwal_berulang" ADD CONSTRAINT "pola_jadwal_berulang_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pola_jadwal_berulang" ADD CONSTRAINT "pola_jadwal_berulang_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pola_jadwal_berulang" ADD CONSTRAINT "pola_jadwal_berulang_tenantId_templateShiftId_fkey" FOREIGN KEY ("tenantId", "templateShiftId") REFERENCES "template_shift"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_tenantId_jadwalKerjaAsalId_fkey" FOREIGN KEY ("tenantId", "jadwalKerjaAsalId") REFERENCES "jadwal_kerja"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_tenantId_karyawanPemohonId_fkey" FOREIGN KEY ("tenantId", "karyawanPemohonId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_tenantId_karyawanPenggantiId_fkey" FOREIGN KEY ("tenantId", "karyawanPenggantiId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_tenantId_perangkatId_fkey" FOREIGN KEY ("tenantId", "perangkatId") REFERENCES "perangkat"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_tenantId_absensiId_fkey" FOREIGN KEY ("tenantId", "absensiId") REFERENCES "absensi"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_diajukanOlehId_fkey" FOREIGN KEY ("diajukanOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "istirahat_absensi" ADD CONSTRAINT "istirahat_absensi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "istirahat_absensi" ADD CONSTRAINT "istirahat_absensi_tenantId_absensiId_fkey" FOREIGN KEY ("tenantId", "absensiId") REFERENCES "absensi"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuti_izin" ADD CONSTRAINT "cuti_izin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuti_izin" ADD CONSTRAINT "cuti_izin_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuti_izin" ADD CONSTRAINT "cuti_izin_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_lembur" ADD CONSTRAINT "permintaan_lembur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_lembur" ADD CONSTRAINT "permintaan_lembur_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_lembur" ADD CONSTRAINT "permintaan_lembur_disetujuiOlehId_fkey" FOREIGN KEY ("disetujuiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_kinerja" ADD CONSTRAINT "target_kinerja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_kinerja" ADD CONSTRAINT "target_kinerja_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penilaian_kinerja" ADD CONSTRAINT "penilaian_kinerja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penilaian_kinerja" ADD CONSTRAINT "penilaian_kinerja_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penilaian_kinerja" ADD CONSTRAINT "penilaian_kinerja_dinilaiOlehId_fkey" FOREIGN KEY ("dinilaiOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kategori_biaya" ADD CONSTRAINT "kategori_biaya_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekap_kas_harian" ADD CONSTRAINT "rekap_kas_harian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekap_kas_harian" ADD CONSTRAINT "rekap_kas_harian_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekap_kas_harian" ADD CONSTRAINT "rekap_kas_harian_tenantId_giliranKasirId_fkey" FOREIGN KEY ("tenantId", "giliranKasirId") REFERENCES "giliran_kasir"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekap_kas_harian" ADD CONSTRAINT "rekap_kas_harian_diverifikasiOlehId_fkey" FOREIGN KEY ("diverifikasiOlehId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biaya_operasional" ADD CONSTRAINT "biaya_operasional_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biaya_operasional" ADD CONSTRAINT "biaya_operasional_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biaya_operasional" ADD CONSTRAINT "biaya_operasional_tenantId_kategoriBiayaId_fkey" FOREIGN KEY ("tenantId", "kategoriBiayaId") REFERENCES "kategori_biaya"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biaya_operasional" ADD CONSTRAINT "biaya_operasional_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_penjualan_harian" ADD CONSTRAINT "rm_penjualan_harian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_penjualan_harian" ADD CONSTRAINT "rm_penjualan_harian_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_penjualan_item_harian" ADD CONSTRAINT "rm_penjualan_item_harian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_penjualan_item_harian" ADD CONSTRAINT "rm_penjualan_item_harian_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_penjualan_item_harian" ADD CONSTRAINT "rm_penjualan_item_harian_tenantId_itemMenuId_fkey" FOREIGN KEY ("tenantId", "itemMenuId") REFERENCES "item_menu"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_stok_kritis" ADD CONSTRAINT "rm_stok_kritis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_stok_kritis" ADD CONSTRAINT "rm_stok_kritis_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_stok_kritis" ADD CONSTRAINT "rm_stok_kritis_tenantId_bahanId_fkey" FOREIGN KEY ("tenantId", "bahanId") REFERENCES "bahan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_kinerja_karyawan_harian" ADD CONSTRAINT "rm_kinerja_karyawan_harian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_kinerja_karyawan_harian" ADD CONSTRAINT "rm_kinerja_karyawan_harian_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_kinerja_karyawan_harian" ADD CONSTRAINT "rm_kinerja_karyawan_harian_tenantId_karyawanId_fkey" FOREIGN KEY ("tenantId", "karyawanId") REFERENCES "karyawan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_outbox_event" ADD CONSTRAINT "domain_outbox_event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
