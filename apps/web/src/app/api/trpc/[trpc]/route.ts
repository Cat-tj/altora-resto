/**
 * tRPC API route handler for Next.js App Router.
 *
 * Handles all tRPC requests at /api/trpc/*
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@altora/api";
import { prisma } from "@altora/db";

function handler(request: Request) {
  const opts: Parameters<typeof fetchRequestHandler>[0] = {
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createContext(prisma, request),
  };
  if (process.env.NODE_ENV === "development") {
    opts.onError = ({ path, error }) => {
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
      );
    };
  }
  return fetchRequestHandler(opts);
}

export { handler as GET, handler as POST };
