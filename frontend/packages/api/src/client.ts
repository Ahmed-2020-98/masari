/**
 * Browser-side API client. Requests go to the Next.js BFF (`/api/proxy/*`), which attaches the
 * httpOnly Sanctum token server-side — the token is never exposed to JavaScript.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** First validation message for a field (dot notation), if any. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
};

export const API_PREFIX = "/api/proxy";

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(`${key}[]`, String(item)));
    else params.set(key, String(value));
  }

  const string = params.toString();
  return string ? `?${string}` : "";
}

export async function api<T = unknown>(path: string, { method = "GET", body, query, signal }: RequestOptions = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`${API_PREFIX}/${path.replace(/^\//, "")}${buildQuery(query)}`, {
    method,
    signal,
    headers: { Accept: "application/json", ...(body && !isForm ? { "Content-Type": "application/json" } : {}) },
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    credentials: "same-origin",
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("masari:unauthenticated"));
    }
    throw new ApiError(payload.message ?? "حدث خطأ غير متوقع، حاول مرة أخرى.", response.status, payload.code ?? "error", payload.errors ?? {});
  }

  return payload as T;
}

/** URL for binary downloads (PDF labels, Excel exports) streamed through the proxy. */
export function fileUrl(path: string, query?: Query): string {
  return `${API_PREFIX}/${path.replace(/^\//, "")}${buildQuery(query)}`;
}

/** POST that returns a binary (e.g. merged labels PDF) and opens it in a new tab. */
export async function openBinary(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${API_PREFIX}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/pdf" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError("تعذر تحميل الملف.", response.status, "download_failed");
  const blob = await response.blob();
  window.open(URL.createObjectURL(blob), "_blank", "noopener");
}
