/**
 * Root router for Altora Resto API.
 *
 * Aggregates all domain-specific routers into a single app router.
 */

import { router } from "../trpc"
import { authRouter } from "./auth"
import { menuRouter } from "./menu"
import { orderRouter } from "./order"
import { kasirRouter } from "./kasir"
import { kitchenRouter } from "./kitchen"
import { mejaRouter } from "./meja"
import { persediaanRouter } from "./persediaan"
import { pembayaranRouter } from "./pembayaran"
import { karyawanRouter } from "./karyawan"

/**
 * The root tRPC router.
 *
 * All domain routers are added here as the application grows:
 * ```ts
 * export const appRouter = router({
 *   auth: authRouter,
 *   menu: menuRouter,
 *   order: orderRouter,
 *   kasir: kasirRouter,
 *   kitchen: kitchenRouter,
 *   meja: mejaRouter,
 *   // ...
 * });
 * ```
 */
export const appRouter = router({
  auth: authRouter,
  menu: menuRouter,
  order: orderRouter,
  kasir: kasirRouter,
  kitchen: kitchenRouter,
  meja: mejaRouter,
  persediaan: persediaanRouter,
  pembayaran: pembayaranRouter,
  karyawan: karyawanRouter,
});

/**
 * Type of the app router — used by tRPC client for type-safe API calls.
 *
 * @example
 * ```ts
 * import type { AppRouter } from "@altora/api";
 * import { createTRPCClient } from "@trpc/client";
 *
 * const trpc = createTRPCClient<AppRouter>({ ... });
 * const result = await trpc.auth.login.mutate({ email: "...", password: "..." });
 * ```
 */
export type AppRouter = typeof appRouter;
