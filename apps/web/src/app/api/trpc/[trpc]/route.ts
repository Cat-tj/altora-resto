/**
 * tRPC API route handler for Next.js App Router.
 *
 * Handles all tRPC requests at /api/trpc/*
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@altora/api";
import { prisma } from "@altora/db";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    Router: appRouter,
    createContext: () => createContext(prisma, request),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
