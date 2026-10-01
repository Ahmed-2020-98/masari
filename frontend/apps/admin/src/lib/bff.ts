import { backendUrl } from "@masari/api/server";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Backend-for-frontend helpers. The Sanctum token lives in an httpOnly cookie; browser code only talks to
 * /api/proxy/*, which forwards to Laravel with the bearer token. Mobile apps call Laravel directly.
 */
export const TOKEN_COOKIE = "masari_admin_token";
export const PLATFORM = "admin";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setToken(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearToken() {
  (await cookies()).delete(TOKEN_COOKIE);
}

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

/** Call Laravel with JSON and relay the response (used by auth route handlers). */
export async function backendJson(path: string, init: { method?: string; body?: unknown; token?: string }) {
  const response = await fetch(backendUrl(path), {
    method: init.method ?? "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  return { response, payload: await response.json().catch(() => ({})) };
}

const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"];

/** Stream any request to Laravel with the bearer token and stream the response back (JSON, PDF, XLSX). */
export async function forward(request: NextRequest, path: string[]): Promise<Response> {
  const token = await getToken();
  const url = new URL(backendUrl(path.map(encodeURIComponent).join("/")));
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));

  const headers = new Headers({ Accept: request.headers.get("accept") ?? "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const merchantId = request.headers.get("x-merchant-id");
  if (merchantId) headers.set("X-Merchant-Id", merchantId);
  headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for") ?? "");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  FORWARDED_RESPONSE_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  });

  const response = new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  if (upstream.status === 401) response.cookies.delete(TOKEN_COOKIE);

  return response;
}
