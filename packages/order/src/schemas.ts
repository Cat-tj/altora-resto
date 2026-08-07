/**
 * Zod validation schemas for the order domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas). Each schema corresponds to a service operation.
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const kanalPesananSchema = z.enum(["KASIR", "PELAYAN", "QR_PELANGGAN"]);

export const statusPesananSchema = z.enum([
  "DRAF",
  "DIKIRIM",
  "MENUNGGU_PERSETUJUAN",
  "DITERIMA",
  "DITOLAK",
  "MENUNGGU_PEMBAYARAN",
  "DIKONFIRMASI",
  "DIKIRIM_KE_DAPUR",
  "SEDANG_DISIAPKAN",
  "SIAP",
  "DISAJIKAN",
  "SELESAI",
  "DIBATALKAN",
]);

export const statusItemPesananSchema = z.enum([
  "DRAF",
  "DITERIMA",
  "DIKIRIM_KE_DAPUR",
  "DITAHAN",
  "SEDANG_DISIAPKAN",
  "SIAP",
  "DISAJIKAN",
  "DIBATALKAN",
  "DIRETUR",
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

export const kodeMetodeBayarSchema = z.enum([
  "TUNAI",
  "TRANSFER_MANUAL",
  "QRIS_MANUAL",
  "SALDO_TOKO",
]);

export const jenisPembatalanSchema = z.enum([
  "SEBELUM_PRODUKSI",
  "SETELAH_PRODUKSI",
]);

// ─── Create Pesanan ─────────────────────────────────────────────────────────

export const createPesananSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  mejaId: z.string().optional(),
  pelangganId: z.string().optional(),
  kanal: kanalPesananSchema,
});

// ─── Add Item ───────────────────────────────────────────────────────────────

export const addItemSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  itemMenuId: z.string().min(1, "ID item menu tidak valid"),
  varianMenuId: z.string().optional(),
  kuantitas: z.number().int().min(1, "Kuantitas minimal 1"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  modifier: z
    .array(
      z.object({
        modifierOpsiId: z.string().min(1, "ID opsi modifier tidak valid"),
        jumlah: z.number().int().min(1).default(1),
      }),
    )
    .optional(),
});

// ─── Remove Item ────────────────────────────────────────────────────────────

export const removeItemSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  itemPesananId: z.string().min(1, "ID item pesanan tidak valid"),
});

// ─── Update Item Quantity ───────────────────────────────────────────────────

export const updateItemQuantitySchema = z.object({
  itemPesananId: z.string().min(1, "ID item pesanan tidak valid"),
  kuantitas: z.number().int().min(0, "Kuantitas tidak boleh negatif"),
});

// ─── Update Status ──────────────────────────────────────────────────────────

export const updateStatusSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  statusBaru: statusPesananSchema,
  alasan: z.string().max(500).optional(),
});

// ─── Create Payment ─────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  alokasi: z
    .array(
      z.object({
        pesananId: z.string().min(1, "ID pesanan tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah alokasi minimal 1"),
      }),
    )
    .min(1, "Minimal ada satu alokasi pembayaran"),
  metodeBayar: z
    .array(
      z.object({
        metodeBayarId: z.string().min(1, "ID metode bayar tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah metode bayar minimal 1"),
      }),
    )
    .min(1, "Minimal ada satu metode bayar"),
  totalDiterima: z.number().int().min(0, "Total diterima tidak boleh negatif"),
});

// ─── Split Bill ─────────────────────────────────────────────────────────────

export const splitBillSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  splits: z
    .array(
      z.object({
        itemPesananIds: z
          .array(z.string().min(1))
          .min(1, "Minimal satu item per split"),
        targetMejaId: z.string().optional(),
      }),
    )
    .min(2, "Minimal dua bagian untuk split bill"),
});

// ─── Cancel Order ───────────────────────────────────────────────────────────

export const cancelOrderSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  alasan: z.string().min(1, "Alasan pembatalan tidak boleh kosong").max(500),
  jenisPembatalan: jenisPembatalanSchema.default("SEBELUM_PRODUKSI"),
});

// ─── Reject Order ───────────────────────────────────────────────────────────

export const rejectOrderSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  alasan: z.string().min(1, "Alasan penolakan tidak boleh kosong").max(500),
});

// ─── List Pesanan ───────────────────────────────────────────────────────────

export const listPesananSchema = z.object({
  outletId: z.string().optional(),
  status: z.array(statusPesananSchema).optional(),
  kanal: kanalPesananSchema.optional(),
  mejaId: z.string().optional(),
  dariTanggal: z.coerce.date().optional(),
  sampaiTanggal: z.coerce.date().optional(),
  includeItems: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

// ─── Get Pesanan ────────────────────────────────────────────────────────────

export const getPesananSchema = z.object({
  id: z.string().min(1, "ID pesanan tidak valid"),
  includeItems: z.boolean().default(true),
  includePembayaran: z.boolean().default(false),
  includeRiwayat: z.boolean().default(false),
});

// ─── Get Active Orders (POS) ────────────────────────────────────────────────

export const getActiveOrdersSchema = z.object({
  outletId: z.string().optional(),
  kanal: kanalPesananSchema.optional(),
});

// ─── Checkout (POS) ────────────────────────────────────────────────────────

export const kasirCheckoutSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  metodeBayar: z
    .array(
      z.object({
        metodeBayarId: z.string().min(1, "ID metode bayar tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah minimal 1"),
      }),
    )
    .min(1, "Minimal satu metode bayar"),
  totalDiterima: z.number().int().min(0, "Total diterima tidak boleh negatif"),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CreatePesananInput = z.infer<typeof createPesananSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type RemoveItemInput = z.infer<typeof removeItemSchema>;
export type UpdateItemQuantityInput = z.infer<typeof updateItemQuantitySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type SplitBillInput = z.infer<typeof splitBillSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
export type ListPesananInput = z.infer<typeof listPesananSchema>;
export type GetPesananInput = z.infer<typeof getPesananSchema>;
export type GetActiveOrdersInput = z.infer<typeof getActiveOrdersSchema>;
export type KasirCheckoutInput = z.infer<typeof kasirCheckoutSchema>;
