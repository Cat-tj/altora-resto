/**
 * Zod validation schemas for the kitchen (dapur) domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas).
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const statusTiketDapurSchema = z.enum([
  "BARU",
  "DITERIMA",
  "DITAHAN",
  "SEDANG_DISIAPKAN",
  "SELESAI_SEBAGIAN",
  "SIAP",
  "DISAJIKAN",
  "DIBATALKAN",
]);

export const statusMasakBarisSchema = z.enum([
  "MENUNGGU",
  "DIMASAK",
  "SIAP",
]);

// ─── Stasiun Dapur ─────────────────────────────────────────────────────────

export const createStasiunSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama stasiun tidak boleh kosong")
    .max(100, "Nama stasiun maksimal 100 karakter"),
});

export const updateStasiunSchema = z.object({
  id: z.string().min(1, "ID stasiun tidak valid"),
  nama: z
    .string()
    .min(1, "Nama stasiun tidak boleh kosong")
    .max(100, "Nama stasiun maksimal 100 karakter")
    .optional(),
});

// ─── Aturan Routing Dapur ───────────────────────────────────────────────────

export const createAturanRoutingSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  itemMenuId: z.string().optional(),
  kategoriMenuId: z.string().optional(),
  stasiunDapurId: z.string().min(1, "ID stasiun dapur tidak valid"),
  prioritas: z.number().int().min(0).optional(),
});

export const updateAturanRoutingSchema = z.object({
  id: z.string().min(1, "ID aturan routing tidak valid"),
  stasiunDapurId: z.string().min(1, "ID stasiun dapur tidak valid").optional(),
  itemMenuId: z.string().nullable().optional(),
  kategoriMenuId: z.string().nullable().optional(),
  prioritas: z.number().int().min(0).optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

export const deleteAturanRoutingSchema = z.object({
  id: z.string().min(1, "ID aturan routing tidak valid"),
});

// ─── Tiket Dapur ───────────────────────────────────────────────────────────

export const createTiketFromOrderSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  nomorGelombang: z.number().int().min(1).default(1),
});

export const updateTiketStatusSchema = z.object({
  tiketDapurId: z.string().min(1, "ID tiket dapur tidak valid"),
  status: statusTiketDapurSchema,
  alasanPembatalan: z.string().max(500, "Alasan maksimal 500 karakter").optional(),
});

export const updateBarisStatusSchema = z.object({
  tiketDapurBarisId: z.string().min(1, "ID baris tiket tidak valid"),
  statusMasak: statusMasakBarisSchema,
});

export const getTiketSchema = z.object({
  id: z.string().min(1, "ID tiket tidak valid"),
});

// ─── List Query Schemas ─────────────────────────────────────────────────────

export const listTiketQuerySchema = z.object({
  outletId: z.string().optional(),
  stasiunDapurId: z.string().optional(),
  status: statusTiketDapurSchema.optional(),
  includeBaris: z.boolean().default(false),
  includeRiwayat: z.boolean().default(false),
});

export const listStasiunQuerySchema = z.object({
  outletId: z.string().optional(),
  includeAturan: z.boolean().default(false),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CreateStasiunInput = z.infer<typeof createStasiunSchema>;
export type UpdateStasiunInput = z.infer<typeof updateStasiunSchema>;
export type CreateAturanRoutingInput = z.infer<typeof createAturanRoutingSchema>;
export type UpdateAturanRoutingInput = z.infer<typeof updateAturanRoutingSchema>;
export type CreateTiketFromOrderInput = z.infer<typeof createTiketFromOrderSchema>;
export type UpdateTiketStatusInput = z.infer<typeof updateTiketStatusSchema>;
export type UpdateBarisStatusInput = z.infer<typeof updateBarisStatusSchema>;
export type ListTiketQuery = z.infer<typeof listTiketQuerySchema>;
export type ListStasiunQuery = z.infer<typeof listStasiunQuerySchema>;
