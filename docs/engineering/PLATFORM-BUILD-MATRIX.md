# Matriks Build Platform - Altora Resto

Status dokumen: **DRAF AWAL**. Mencatat status build/uji per target platform dan
toolchain yang dibutuhkan. Lihat `docs/arsitektur/ARSITEKTUR-SISTEM.md` untuk peran
tiap `apps/*`.

## 1. Matriks status

| Platform | App | Toolchain dibutuhkan | Status build | Catatan |
|---|---|---|---|---|
| Web (browser, PWA) | `apps/web` | Node.js >=20, pnpm >=9 (tersedia di lingkungan ini) | BELUM DICOBA | Belum ada kode Next.js untuk di-build - baru `package.json`/`tsconfig.json` scaffold. |
| Android | `apps/mobile` (Capacitor) | Android SDK + Java/Gradle, Android Studio atau `sdkmanager` CLI | TIDAK DAPAT DIVERIFIKASI DI SESI INI | Lingkungan kerja saat ini (macOS shell, lihat di bawah) tidak memiliki Android SDK terpasang/terverifikasi pada sesi ini. |
| iOS | `apps/mobile` (Capacitor) | Xcode + CocoaPods, akun Apple Developer untuk signing | TIDAK DAPAT DIVERIFIKASI DI SESI INI | Xcode command line tools/keberadaan proyek iOS belum diperiksa/di-provision pada sesi ini. |
| Windows | `apps/desktop` (Tauri) | Rust toolchain + Tauri CLI + Visual Studio Build Tools (MSVC) | TIDAK DAPAT DIVERIFIKASI DI SESI INI | Build silang (cross-compile) Windows dari macOS tidak trivial untuk target Tauri; butuh mesin/CI Windows. |
| macOS | `apps/desktop` (Tauri) | Rust toolchain + Tauri CLI + Xcode command line tools | BELUM DICOBA | Platform host sesi ini adalah macOS (Darwin arm64) sehingga secara prinsip memungkinkan, tapi belum ada kode Tauri untuk di-build. |
| Linux | `apps/desktop` (Tauri) | Rust toolchain + Tauri CLI + paket GTK/WebKitGTK | TIDAK DAPAT DIVERIFIKASI DI SESI INI | Butuh mesin/CI Linux. |

## 2. Yang benar-benar diverifikasi di lingkungan kerja sesi ini

| Alat | Hasil pengecekan |
|---|---|
| Node.js | `v25.5.0` tersedia. |
| npx / registry npm | Tersedia dan bisa mengunduh paket (`prisma@5.20.0` berhasil diunduh & dijalankan). |
| pnpm | **Tidak ditemukan** di `PATH` pada sesi ini (`pnpm: command not found`) - perlu diinstal sebelum menjalankan skrip `pnpm`/`turbo` di `package.json`. |
| Xcode / `xcodebuild` | Tidak diperiksa/tidak dikonfirmasi tersedia pada sesi ini. |
| Android SDK / `adb` / `sdkmanager` | Tidak diperiksa/tidak dikonfirmasi tersedia pada sesi ini. |
| Rust / `cargo` / Tauri CLI | Tidak diperiksa/tidak dikonfirmasi tersedia pada sesi ini. |

## 3. Implikasi

- Verifikasi build Android/iOS/Windows/Linux **tidak dapat dilakukan secara jujur**
  dalam sesi kerja ini karena keterbatasan lingkungan (toolchain terkait belum
  diperiksa/tidak tersedia) - ini dicatat apa adanya, bukan diklaim sebagai
  "LULUS" atau dilewati diam-diam.
- Build web dan skema Prisma adalah satu-satunya kategori yang realistis diverifikasi
  dari lingkungan kerja shell macOS + Node.js yang tersedia saat ini, dan bahkan itu
  baru sebatas validasi skema (lihat `docs/engineering/RELEASE-EVIDENCE.md`) karena
  belum ada kode aplikasi Next.js yang bisa di-build.
- Rekomendasi: verifikasi build native (Capacitor Android/iOS, Tauri
  Windows/Linux) dijalankan lewat CI matrix (mis. GitHub Actions dengan runner
  `macos-latest` untuk iOS, `ubuntu-latest` untuk Linux/Android, `windows-latest`
  untuk Windows) begitu kode `apps/mobile`/`apps/desktop` mulai diisi.

## 4. Status per requirement UI lintas platform

Rujuk `docs/engineering/MASTER-CHECKLIST.md`:

- `ALT-UIX-002` (shell Capacitor Android/iOS): BELUM DIKERJAKAN, verifikasi build
  butuh toolchain di atas.
- `ALT-UIX-003` (shell Tauri Windows/macOS/Linux): BELUM DIKERJAKAN, verifikasi build
  butuh toolchain di atas.
