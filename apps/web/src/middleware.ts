/**
 * Next.js middleware for Altora Resto.
 *
 * Responsibilities:
 * 1. Resolve tenant from subdomain or path
 * 2. Redirect unauthenticated users to login (except public routes)
 * 3. Add tenant context headers for API routes
 *
 * This middleware runs on every request (except static files).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Public Routes (no auth required) ───────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/masuk",           // Login
  "/daftar",          // Register
  "/lupa-kata-sandi", // Forgot password
  "/reset-kata-sandi", // Reset password
  "/api/trpc/auth.login",
  "/api/trpc/auth.register",
  "/api/trpc/auth.forgotPassword",
  "/api/trpc/auth.resetPassword",
  "/api/health",
];

// ─── Tenant Resolution ──────────────────────────────────────────────────────

/**
 * Extract tenant slug from the request.
 *
 * Strategy:
 * 1. Subdomain: {tenant-slug}.altora.resto → tenant-slug
 * 2. Path: /t/{tenant-slug}/... → tenant-slug
 * 3. Cookie: altora-tenant → tenant slug
 * 4. Header: X-Tenant-Slug → tenant slug
 */
function resolveTenantSlug(request: NextRequest): string | null {
  const host = request.headers.get("host") ?? "";

  // 1. Subdomain
  const parts = host.split(".");
  const subdomain: string | undefined = parts[0];
  if (parts.length >= 3 && subdomain != null) {
    return subdomain;
  }

  // 2. Path prefix
  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "t" && pathParts[1]) {
    return pathParts[1];
  }

  // 3. Cookie
  const tenantCookie = request.cookies.get("altora-tenant")?.value;
  if (tenantCookie) {
    return tenantCookie;
  }

  // 4. Header (for API requests)
  const tenantHeader = request.headers.get("x-tenant-slug");
  if (tenantHeader) {
    return tenantHeader;
  }

  return null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Resolve tenant
  const tenantSlug = resolveTenantSlug(request);

  // Create response
  const response = NextResponse.next();

  // Add tenant context headers (for downstream API handlers)
  if (tenantSlug) {
    response.headers.set("X-Tenant-Slug", tenantSlug);
  }

  // Check if route requires authentication
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (!isPublicRoute) {
    // Check for session token
    const sessionToken =
      request.cookies.get("altora-session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!sessionToken) {
      // Redirect to login (for web) or return 401 (for API)
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      }

      const loginUrl = new URL("/masuk", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (robots.txt, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
