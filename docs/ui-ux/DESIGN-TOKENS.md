# Token Desain - Altora Resto

Status dokumen: **DRAF AWAL**. Sumber kebenaran teknis ada di
`packages/desain/src/tokens.ts`; dokumen ini adalah referensi manusia untuk nilai yang
sama - jika ada perbedaan, `tokens.ts` yang menang.

## 1. Prinsip

- Satu set token dasar dipakai di semua platform (web, Android, iOS, Windows, macOS,
  Linux) lewat `packages/desain` - lihat `docs/arsitektur/ARSITEKTUR-SISTEM.md`.
- Setiap **app internal** (`apps/web`, `apps/mobile`, `apps/desktop`) boleh memakai
  warna aksen (`accent`) yang berbeda untuk membedakan konteks penggunaan secara visual
  (mis. staf tahu langsung sedang di aplikasi kasir mobile vs dasbor web), tetapi warna
  netral, status, tipografi, spacing, dan radius tetap identik.
- Warna kontras diuji terhadap WCAG AA (rasio kontras teks-latar minimum 4.5:1 untuk
  teks normal, 3:1 untuk teks besar/ikon).

## 2. Warna merek (brand)

| Token | Hex | Deskripsi |
|---|---|---|
| `warna.merek.500` (utama) | `#D9642C` | Terakota hangat - warna utama identitas Altora Resto. |
| `warna.merek.50` | `#FDF3EC` | Latar lembut varian merek. |
| `warna.merek.100` | `#FAE1CE` | |
| `warna.merek.200` | `#F3C09D` | |
| `warna.merek.300` | `#EA9A6C` | |
| `warna.merek.400` | `#E17E48` | |
| `warna.merek.500` | `#D9642C` | Basis. |
| `warna.merek.600` | `#B34F22` | Hover/aktif. |
| `warna.merek.700` | `#8C3E1B` | |
| `warna.merek.800` | `#662C13` | |
| `warna.merek.900` | `#401A0B` | Teks di atas latar terang. |

## 3. Aksen per aplikasi

| App | Token | Hex | Alasan |
|---|---|---|---|
| `apps/web` (dasbor & staf kantor) | `warna.aksen.web` | `#D9642C` | Sama dengan warna merek utama - konteks "kantor pusat". |
| `apps/mobile` (kasir/pelayan/dapur di lapangan) | `warna.aksen.mobile` | `#2C7A7B` | Teal - kontras jelas dari web, cepat dikenali di outlet. |
| `apps/desktop` (kasir kasir meja/back-office Windows/macOS) | `warna.aksen.desktop` | `#4C51BF` | Indigo - membedakan sesi desktop dari sesi mobile saat staf memakai keduanya. |

## 4. Warna netral (grayscale)

| Token | Hex |
|---|---|
| `warna.netral.0` | `#FFFFFF` |
| `warna.netral.50` | `#FAFAF9` |
| `warna.netral.100` | `#F2F1EF` |
| `warna.netral.200` | `#E4E2DE` |
| `warna.netral.300` | `#CFCBC4` |
| `warna.netral.400` | `#A8A29A` |
| `warna.netral.500` | `#7D776D` |
| `warna.netral.600` | `#5C574F` |
| `warna.netral.700` | `#433F39` |
| `warna.netral.800` | `#2B2824` |
| `warna.netral.900` | `#181614` |
| `warna.netral.1000` | `#000000` |

## 5. Warna status/semantik

| Token | Hex | Dipakai untuk |
|---|---|---|
| `warna.sukses.500` | `#2E9E5B` | Pesanan DIBAYAR, PO DITERIMA_PENUH, dsb. |
| `warna.sukses.100` | `#DDF3E4` | Latar badge sukses. |
| `warna.peringatan.500` | `#D69E2E` | Stok mendekati ambang minimum, menunggu approval. |
| `warna.peringatan.100` | `#FBF0D9` | Latar badge peringatan. |
| `warna.bahaya.500` | `#C93838` | Dibatalkan, refund, stok kritis, gagal bayar. |
| `warna.bahaya.100` | `#F8DEDE` | Latar badge bahaya. |
| `warna.info.500` | `#2B6CB0` | Info netral, status "menunggu verifikasi". |
| `warna.info.100` | `#DCE9F7` | Latar badge info. |

## 6. Tipografi

| Token | Nilai |
|---|---|
| `font.keluarga.dasar` | `"Inter", "Segoe UI", system-ui, sans-serif` |
| `font.keluarga.mono` | `"JetBrains Mono", ui-monospace, monospace` (struk, kode PO) |
| `font.ukuran.xs` | `12px` / `line-height 16px` |
| `font.ukuran.sm` | `14px` / `line-height 20px` |
| `font.ukuran.base` | `16px` / `line-height 24px` |
| `font.ukuran.lg` | `18px` / `line-height 28px` |
| `font.ukuran.xl` | `20px` / `line-height 28px` |
| `font.ukuran.2xl` | `24px` / `line-height 32px` |
| `font.ukuran.3xl` | `30px` / `line-height 36px` |
| `font.bobot.reguler` | `400` |
| `font.bobot.medium` | `500` |
| `font.bobot.semibold` | `600` |
| `font.bobot.bold` | `700` |

## 7. Spacing (skala 4px)

| Token | Nilai |
|---|---|
| `spasi.0` | `0px` |
| `spasi.1` | `4px` |
| `spasi.2` | `8px` |
| `spasi.3` | `12px` |
| `spasi.4` | `16px` |
| `spasi.5` | `20px` |
| `spasi.6` | `24px` |
| `spasi.8` | `32px` |
| `spasi.10` | `40px` |
| `spasi.12` | `48px` |
| `spasi.16` | `64px` |

## 8. Radius & bayangan

| Token | Nilai |
|---|---|
| `radius.sm` | `4px` |
| `radius.md` | `8px` |
| `radius.lg` | `12px` |
| `radius.xl` | `16px` |
| `radius.penuh` | `9999px` |
| `bayangan.sm` | `0 1px 2px rgba(24, 22, 20, 0.06)` |
| `bayangan.md` | `0 2px 8px rgba(24, 22, 20, 0.10)` |
| `bayangan.lg` | `0 8px 24px rgba(24, 22, 20, 0.14)` |

## 9. Implementasi

Nilai di atas diimplementasikan sebagai objek TypeScript pada
`packages/desain/src/tokens.ts` dan diekspor lewat `packages/desain/src/index.ts` untuk
dipakai `packages/ui` dan seluruh `apps/*`. Status: **BELUM DIKERJAKAN** untuk integrasi
ke komponen `packages/ui` - baru berupa deklarasi token.
