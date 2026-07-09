// Tiny client-side fetch helpers pointed at the Express backend.
// The base URL is injected at build time via NEXT_PUBLIC_API_URL.

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.error as string)) || res.statusText || "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`${BASE}${path}`, { cache: "no-store" }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`${BASE}${path}`, { method: "DELETE" }));
}
