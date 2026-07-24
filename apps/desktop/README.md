# @altora/desktop

Pembungkus [Tauri](https://tauri.app/) untuk menjalankan `@altora/web` sebagai aplikasi desktop native (Windows, macOS, Linux) - terutama untuk mesin kasir/kantor yang butuh akses printer/laci kas lokal secara langsung.

## Domain boundary

Berisi konfigurasi Tauri (`src-tauri/`, digenerate oleh `tauri init`, tidak dikomit manual) dan command bridge tipis ke `packages/perangkat`. Tidak boleh berisi logika bisnis.

## Status

Scaffold awal. Build Windows/macOS/Linux memerlukan toolchain native Rust + platform SDK masing-masing - lihat `docs/engineering/PLATFORM-BUILD-MATRIX.md`.
