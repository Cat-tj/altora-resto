/**
 * @altora/api — tRPC API layer for Altora Resto.
 *
 * Provides type-safe API procedures with built-in auth middleware.
 *
 * @example
 * ```ts
 * // In Next.js API route:
 * import { appRouter, createContext } from "@altora/api";
 *
 * export async function POST(request: Request) {
 *   const ctx = await createContext(prisma, request);
 *   return fetchRequestHandler({
 *     req: request,
 *     endpoint: "/api/trpc",
 *     Router: appRouter,
 *     createContext: () => ctx,
 *   });
 * }
 * ```
 */

// Core tRPC setup
export {
  publicProcedure,
  protectedProcedure,
  tenantProcedure,
  outletProcedure,
  router,
  TRPCError,
} from "./trpc.js";

// Context creation
export { createContext, type TRPCContext } from "./context.js";

// Root router + type
export { appRouter, type AppRouter } from "./routers/index.js";

// Auth router (for direct import if needed)
export { authRouter } from "./routers/auth.js";

// Menu router (for direct import if needed)
export { menuRouter } from "./routers/menu.js";

// Kitchen router (for direct import if needed)
export { kitchenRouter } from "./routers/kitchen.js";

// Meja router (for direct import if needed)
export { mejaRouter } from "./routers/meja.js";

// Persediaan router (for direct import if needed)
export { persediaanRouter } from "./routers/persediaan.js";

// Pembayaran router (for direct import if needed)
export { pembayaranRouter } from "./routers/pembayaran.js";

// Karyawan router (for direct import if needed)
export { karyawanRouter } from "./routers/karyawan.js";
