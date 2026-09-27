import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate for signed-in areas: no session cookie → straight to sign-in (no page render, no
// database call). A present cookie is NOT trusted here — the real checks run server-side in
// src/lib/session.ts (requireSession / requireAdmin / assertAdmin).
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Server action calls (POST with a Next-Action header) must reach the action, which checks the
  // session itself and returns a proper result. Redirecting them would hand the client an HTML page
  // where it expects an action response ("An unexpected response was received from the server").
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!isServerAction && !getSessionCookie(request)) {
    const signIn = new URL("/account/sign-in", request.url);
    signIn.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  // Let server components know which page was requested, for sign-in redirects that return here.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // /account and everything under it except the public sign-in and register pages, /admin, and the
  // checkout return page.
  matcher: ["/account", "/account/((?!sign-in|register).*)", "/admin", "/admin/:path*", "/checkout/success"],
};
