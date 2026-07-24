/**
 * Aturan batas domain (dependency boundaries) untuk monorepo Altora Resto.
 *
 * Konvensi nama paket: @altora/<nama-folder-di-packages>
 * Dijalankan lewat: pnpm depcheck  ->  depcruise --config .dependency-cruiser.cjs packages apps
 */

const BUSINESS_PACKAGES = [
  "kasir",
  "pesanan",
  "pembayaran",
  "qris",
  "meja",
  "reservasi",
  "dapur",
  "pelayan",
  "menu",
  "resep",
  "persediaan",
  "pembelian",
  "promo",
  "keanggotaan",
  "karyawan",
  "absensi",
  "keuangan",
  "analitik",
  "notifikasi",
  "dukungan",
];

// Paket transaksional mentah yang tidak boleh diakses langsung oleh analitik.
// Analitik hanya boleh membaca dari read-model (mis. @altora/analitik/read-model
// atau tabel/tipe read-model di Prisma), bukan modul tulis domain transaksional.
const TRANSACTIONAL_WRITE_PACKAGES = [
  "kasir",
  "pesanan",
  "pembayaran",
  "qris",
  "persediaan",
  "pembelian",
  "keuangan",
];

function businessPackagePattern(exclude = []) {
  const list = BUSINESS_PACKAGES.filter((p) => !exclude.includes(p));
  return `^@altora/(${list.join("|")})(/.*)?$`;
}

module.exports = {
  forbidden: [
    {
      name: "ui-tidak-boleh-impor-paket-bisnis",
      comment:
        "packages/ui adalah pustaka komponen murni. Tidak boleh mengimpor paket bisnis apa pun " +
        "(kasir, persediaan, pesanan, dst). ui hanya boleh bergantung pada desain/platform/utilitas generik.",
      severity: "error",
      from: { path: "^packages/ui" },
      to: { path: businessPackagePattern() },
    },
    {
      name: "dapur-hanya-baca-kontrak-pesanan",
      comment:
        "packages/dapur hanya boleh mengimpor read-contract 'kitchen order' dari packages/pesanan " +
        "(mis. @altora/pesanan/kontrak-dapur), tidak boleh mengimpor internal penulisan pesanan.",
      severity: "error",
      from: { path: "^packages/dapur" },
      to: {
        path: "^@altora/pesanan(?!/kontrak-dapur)(/.*)?$",
      },
    },
    {
      name: "analitik-hanya-baca-read-model",
      comment:
        "packages/analitik tidak boleh mengimpor langsung paket transaksional penulisan " +
        "(kasir, pesanan, pembayaran, qris, persediaan, pembelian, keuangan). " +
        "Analitik wajib membaca lewat read-model (tabel/tipe read-model Prisma atau modul */read-model).",
      severity: "error",
      from: { path: "^packages/analitik" },
      to: {
        path: `^@altora/(${TRANSACTIONAL_WRITE_PACKAGES.join("|")})(?!/read-model)(/.*)?$`,
      },
    },
    {
      name: "no-circular",
      comment: "Tidak boleh ada dependency melingkar antar modul.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Modul yatim (tidak diimpor siapa pun dan tidak mengimpor apa pun) kemungkinan sisa refactor.",
      severity: "info",
      from: { orphan: true, pathNot: ["\\.d\\.ts$", "(^|/)tsconfig\\.json$", "(^|/)package\\.json$"] },
      to: {},
    },
    {
      name: "desain-tidak-boleh-impor-apa-pun-dari-monorepo",
      comment:
        "packages/desain hanya berisi token desain murni (CSS var / TS object), tidak boleh " +
        "bergantung pada paket lain di monorepo ini (termasuk ui atau paket bisnis).",
      severity: "error",
      from: { path: "^packages/desain" },
      to: { path: "^@altora/", pathNot: "^@altora/desain" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      err: {
        collapsePattern: "node_modules",
      },
    },
  },
};
