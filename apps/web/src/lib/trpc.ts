/**
 * tRPC client for the Altora Resto frontend.
 *
 * Creates a type-safe tRPC client that connects to the /api/trpc endpoint.
 *
 * @example
 * ```ts
 * import { trpc } from "@/lib/trpc";
 *
 * // Type-safe API calls:
 * const user = await trpc.auth.me.query();
 * const result = await trpc.auth.login.mutate({
 *   email: "user@example.com",
 *   password: "secret",
 * });
 * ```
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@altora/api";

/**
 * The tRPC client for making type-safe API calls.
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      headers() {
        // The session token is stored in a cookie by the auth flow,
        // so it's automatically included in requests.
        return {};
      },
    }),
  ],
});
