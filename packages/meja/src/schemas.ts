/**
 * Zod validation schemas for the table management (meja) domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas).
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const statusMejaSchema = z.enum([
  "TERSEDIA",
  "TERPAKAI",
  "DIPESAN",
  "PERLU_DIBERSIHKAN",
  "NONAKTIF",
]);

export const statusReservasiSchema = z.enum([
  "DIAJUKAN",
  "DIKONFIRMASI",
  "TIBA",
  "SELESAI",
  "TIDAK_HADIR",
  "DIBATALKAN",
]);

// ─── Area Meja ──────────────────────────────────────────────────────────────

export const createAreaSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama area tidak boleh kosong")
    .max(100, "Nama area maksimal 100 karakter"),
});

export const updateAreaSchema = z.object({
  id: z.string().min(1, "ID area tidak valid"),
  nama: z
    .string()
    .min(1, "Nama area tidak boleh kosong")
    .max(100, "Nama area maksimal 100 karakter")
    .optional(),
});

// ─── Meja ───────────────────────────────────────────────────────────────────

export const createMejaSchema = z.object({
  areaMejaId: z.string().min(1, "ID area tidak valid"),
  nomor: z
    .string()
    .min(1, "Nomor meja tidak boleh kosong")
    .max(20, "Nomor meja maksimal 20 karakter"),
  kapasitas: z.number().int().min(1, "Kapasitas minimal 1 orang"),
});

export const updateMejaSchema = z.object({
  id: z.string().min(1, "ID meja tidak valid"),
  areaMejaId: z.string().min(1, "ID area tidak valid").optional(),
  nomor: z
    .string()
    .min(1, "Nomor meja tidak boleh kosong")
    .max(20, "Nomor meja maksimal 20 karakter")
    .optional(),
  kapasitas: z.number().int().min(1, "Kapasitas minimal 1 orang").optional(),
  status: statusMejaSchema.optional(),
});

export const assignMejaSchema = z.object({
  mejaId: z.string().min(1, "ID meja tidak valid"),
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
});

export const releaseMejaSchema = z.object({
  mejaId: z.string().min(1, "ID meja tidak valid"),
});

// ─── Reservasi ──────────────────────────────────────────────────────────────

export const createReservasiSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  mejaId: z.string().optional(),
  pelangganId: z.string().min(1, "ID pelanggan tidak valid"),
  jumlahTamu: z.number().int().min(1, "Jumlah tamu minimal 1 orang"),
  waktuReservasi: z.coerce.date(),
});

export const updateReservasiSchema = z.object({
  id: z.string().min(1, "ID reservasi tidak valid"),
  mejaId: z.string().nullable().optional(),
  jumlahTamu: z.number().int().min(1, "Jumlah tamu minimal 1 orang").optional(),
  waktuReservasi: z.coerce.date().optional(),
  status: statusReservasiSchema.optional(),
});

export const cancelReservasiSchema = z.object({
  id: z.string().min(1, "ID reservasi tidak valid"),
});

// ─── List Query Schemas ─────────────────────────────────────────────────────

export const listMejaQuerySchema = z.object({
  outletId: z.string().optional(),
  areaMejaId: z.string().optional(),
  status: statusMejaSchema.optional(),
  includeArea: z.boolean().default(false),
});

export const listReservasiQuerySchema = z.object({
  outletId: z.string().optional(),
  status: statusReservasiSchema.optional(),
  dariTanggal: z.coerce.date().optional(),
  sampaiTanggal: z.coerce.date().optional(),
  includeMeja: z.boolean().default(false),
});

export const listAreaQuerySchema = z.object({
  outletId: z.string().optional(),
  includeMeja: z.boolean().default(false),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type CreateMejaInput = z.infer<typeof createMejaSchema>;
export type UpdateMejaInput = z.infer<typeof updateMejaSchema>;
export type AssignMejaInput = z.infer<typeof assignMejaSchema>;
export type ReleaseMejaInput = z.infer<typeof releaseMejaSchema>;
export type CreateReservasiInput = z.infer<typeof createReservasiSchema>;
export type UpdateReservasiInput = z.infer<typeof updateReservasiSchema>;
export type CancelReservasiInput = z.infer<typeof cancelReservasiSchema>;
export type ListMejaQuery = z.infer<typeof listMejaQuerySchema>;
export type ListReservasiQuery = z.infer<typeof listReservasiQuerySchema>;
export type ListAreaQuery = z.infer<typeof listAreaQuerySchema>;
