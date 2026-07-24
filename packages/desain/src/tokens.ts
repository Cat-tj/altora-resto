/**
 * Token desain Altora Resto.
 *
 * Sumber kebenaran teknis untuk nilai yang didokumentasikan secara naratif di
 * `docs/ui-ux/DESIGN-TOKENS.md`. Jika ada perbedaan antara file ini dan dokumen
 * tersebut, file ini yang menang.
 *
 * Status: BELUM DIKERJAKAN untuk integrasi ke komponen `packages/ui` - saat ini
 * baru berupa deklarasi token murni (belum dipakai di komponen mana pun).
 */

export const warnaMerek = {
  50: "#FDF3EC",
  100: "#FAE1CE",
  200: "#F3C09D",
  300: "#EA9A6C",
  400: "#E17E48",
  500: "#D9642C",
  600: "#B34F22",
  700: "#8C3E1B",
  800: "#662C13",
  900: "#401A0B",
} as const;

/** Warna aksen per aplikasi internal (lihat docs/ui-ux/DESIGN-TOKENS.md #3). */
export const warnaAksen = {
  web: "#D9642C",
  mobile: "#2C7A7B",
  desktop: "#4C51BF",
} as const;

export const warnaNetral = {
  0: "#FFFFFF",
  50: "#FAFAF9",
  100: "#F2F1EF",
  200: "#E4E2DE",
  300: "#CFCBC4",
  400: "#A8A29A",
  500: "#7D776D",
  600: "#5C574F",
  700: "#433F39",
  800: "#2B2824",
  900: "#181614",
  1000: "#000000",
} as const;

export const warnaSukses = {
  100: "#DDF3E4",
  500: "#2E9E5B",
} as const;

export const warnaPeringatan = {
  100: "#FBF0D9",
  500: "#D69E2E",
} as const;

export const warnaBahaya = {
  100: "#F8DEDE",
  500: "#C93838",
} as const;

export const warnaInfo = {
  100: "#DCE9F7",
  500: "#2B6CB0",
} as const;

export const fontKeluarga = {
  dasar: '"Inter", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const fontUkuran = {
  xs: { ukuran: "12px", tinggiBaris: "16px" },
  sm: { ukuran: "14px", tinggiBaris: "20px" },
  base: { ukuran: "16px", tinggiBaris: "24px" },
  lg: { ukuran: "18px", tinggiBaris: "28px" },
  xl: { ukuran: "20px", tinggiBaris: "28px" },
  "2xl": { ukuran: "24px", tinggiBaris: "32px" },
  "3xl": { ukuran: "30px", tinggiBaris: "36px" },
} as const;

export const fontBobot = {
  reguler: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const spasi = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  penuh: "9999px",
} as const;

export const bayangan = {
  sm: "0 1px 2px rgba(24, 22, 20, 0.06)",
  md: "0 2px 8px rgba(24, 22, 20, 0.10)",
  lg: "0 8px 24px rgba(24, 22, 20, 0.14)",
} as const;

export const tokenDesain = {
  warnaMerek,
  warnaAksen,
  warnaNetral,
  warnaSukses,
  warnaPeringatan,
  warnaBahaya,
  warnaInfo,
  fontKeluarga,
  fontUkuran,
  fontBobot,
  spasi,
  radius,
  bayangan,
} as const;

export type TokenDesain = typeof tokenDesain;
