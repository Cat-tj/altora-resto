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
} from "./trpc";

// Context creation
export { createContext, type TRPCContext } from "./context";

// Root router + type
export { appRouter, type AppRouter } from "./routers/index";

// Auth router (for direct import if needed)
export { authRouter } from "./routers/auth";

// Menu router (for direct import if needed)
export { menuRouter } from "./routers/menu";

// Kitchen router (for direct import if needed)
export { kitchenRouter } from "./routers/kitchen";

// Meja router (for direct import if needed)
export { mejaRouter } from "./routers/meja";

// Persediaan router (for direct import if needed)
export { persediaanRouter } from "./routers/persediaan";

// Pembayaran router (for direct import if needed)
export { pembayaranRouter } from "./routers/pembayaran";

// Karyawan router (for direct import if needed)
export { karyawanRouter } from "./routers/karyawan";
