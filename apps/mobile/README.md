# @altora/mobile

Pembungkus [Capacitor](https://capacitorjs.com/) untuk menjalankan `@altora/web` sebagai aplikasi native Android dan iOS.

## Domain boundary

Paket ini hanya berisi konfigurasi Capacitor (`capacitor.config.ts`), shell native project (`android/`, `ios/` - digenerate oleh `cap add`, tidak dikomit sebagai source of truth manual), dan plugin bridge tipis ke `packages/perangkat` untuk kapabilitas native (printer, scanner, dsb). Tidak boleh berisi logika bisnis - semua logika bisnis tetap di `packages/*` dan dijalankan lewat web view yang sama dengan `apps/web`.

## Status

Scaffold awal. Build native Android/iOS memerlukan Android SDK/Play Console credentials dan Xcode/Apple Developer account - lihat `docs/engineering/PLATFORM-BUILD-MATRIX.md` dan `docs/engineering/RISK-REGISTER.md` untuk status DIBLOKIR.
