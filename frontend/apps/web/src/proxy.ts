import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "masari_token";

/** Optimistic auth redirects; the API remains the source of truth for authorization. */
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has(TOKEN_COOKIE);
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasToken) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
