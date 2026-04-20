
export class FetchError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FetchError(res.status, body?.error?.message ?? res.statusText, body?.error);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new FetchError(res.status, err?.error?.message ?? res.statusText, err?.error);
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE", credentials: "same-origin" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new FetchError(res.status, err?.error?.message ?? res.statusText, err?.error);
  }
  return res.json();
}
