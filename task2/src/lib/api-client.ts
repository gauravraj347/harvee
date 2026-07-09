// Client-side fetch helpers (same-origin API routes).

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || "Request failed") as Error & {
      payload?: unknown;
    };
    err.payload = data;
    throw err;
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { cache: "no-store" }));
}

export async function apiPostJson<T>(url: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  return parse<T>(await fetch(url, { method: "POST", body: formData }));
}

export async function apiDelete<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { method: "DELETE" }));
}
