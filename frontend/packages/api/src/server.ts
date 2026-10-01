/**
 * Server-side helpers for Next.js route handlers / server components talking to Laravel directly.
 */

export const TOKEN_COOKIE = "masari_token";

export function backendUrl(path: string): string {
  const base = process.env.MASARI_API_URL ?? "http://127.0.0.1:8010/api/v1";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** Fetch a public endpoint from a server component (cached with ISR-style revalidation). */
export async function publicFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const response = await fetch(backendUrl(path), { headers: { Accept: "application/json" }, next: { revalidate } } as RequestInit);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
