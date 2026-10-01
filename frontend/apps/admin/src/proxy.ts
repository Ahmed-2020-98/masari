import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "masari_admin_token";

/** Optimistic auth redirects for the back-office; every API call is still authorized by Laravel. */
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has(TOKEN_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname !== "/login" && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|brand|icon|apple-icon|favicon).*)"],
};
