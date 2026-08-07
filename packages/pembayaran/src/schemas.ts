/**
 * Zod validation schemas for the pembayaran (payments) domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas).
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const kodeMetodeBayarSchema = z.enum([
  "TUNAI",
  "TRANSFER_MANUAL",
  "QRIS_MANUAL",
  "SALDO_TOKO",
]);

export const statusPembayaranSchema = z.enum([
  "DRAF",
  "MENUNGGU",
  "MENUNGGU_KONFIRMASI",
  "DIBAYAR",
  "GAGAL",
  "DIBATALKAN",
  "DIKOREKSI",
  "DIKEMBALIKAN_SEBAGIAN",
  "DIKEMBALIKAN",
]);

// ─── Create Payment ─────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  alokasi: z
    .array(
      z.object({
        pesananId: z.string().min(1, "ID pesanan tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah harus positif"),
      }),
    )
    .min(1, "Minimal satu alokasi harus ada"),
  metodeBayar: z
    .array(
      z.object({
        metodeBayarId: z.string().min(1, "ID metode bayar tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah harus positif"),
      }),
    )
    .min(1, "Minimal satu metode bayar harus ada"),
  totalDiterima: z.number().int().min(0, "Total diterima tidak boleh negatif"),
});

// ─── Confirm QRIS ───────────────────────────────────────────────────────────

export const confirmQrisSchema = z.object({
  pembayaranId: z.string().min(1, "ID pembayaran tidak valid"),
  catatanKasir: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

// ─── Get Payment Summary ────────────────────────────────────────────────────

export const getPaymentSummarySchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
});

// ─── List Payments ──────────────────────────────────────────────────────────

export const listPembayaranSchema = z.object({
  outletId: z.string().optional(),
  status: statusPembayaranSchema.optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// ─── Get Single Payment ─────────────────────────────────────────────────────

export const getPembayaranSchema = z.object({
  id: z.string().min(1, "ID pembayaran tidak valid"),
});

// ─── List MetodeBayar ───────────────────────────────────────────────────────

export const listMetodeBayarSchema = z.object({
  includeNonActive: z.boolean().default(false),
});

// ─── QRIS Config ────────────────────────────────────────────────────────────

export const getKonfigurasiQrisSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ConfirmQrisInput = z.infer<typeof confirmQrisSchema>;
export type GetPaymentSummaryInput = z.infer<typeof getPaymentSummarySchema>;
export type ListPembayaranQuery = z.infer<typeof listPembayaranSchema>;
export type GetPembayaranInput = z.infer<typeof getPembayaranSchema>;
export type ListMetodeBayarQuery = z.infer<typeof listMetodeBayarSchema>;
export type GetKonfigurasiQrisInput = z.infer<typeof getKonfigurasiQrisSchema>;
