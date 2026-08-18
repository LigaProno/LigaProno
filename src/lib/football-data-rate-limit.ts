/** Single-flight. Fără așteptare pe 429 — pagina servește snapshot-ul. */

const inflight = new Map<string, Promise<unknown>>();

export function coalesceInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

export async function fetchFootballDataJson<T>(
  url: string,
  token: string,
  options?: { fresh?: boolean; revalidate?: number },
): Promise<T> {
  const revalidateSeconds = options?.revalidate ?? 900;
  const init: RequestInit = {
    headers: {
      "X-Auth-Token": token,
      Accept: "application/json",
    },
    ...(options?.fresh ?
      { cache: "no-store" as const }
    : { next: { revalidate: revalidateSeconds } }),
  };

  const res = await fetch(url, init);

  if (res.status === 429) {
    // Nu aștepta pe calea paginii — apelantul servește snapshot-ul vechi.
    console.warn(`[football-data] 429, fără așteptare — ${url}`);
    throw new Error(`Football-Data 429 (${url})`);
  }

  return parseFdResponse<T>(res, url);
}

async function parseFdResponse<T>(res: Response, url: string): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Football-Data: response was not JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: string }).message)
        : text.slice(0, 200);
    throw new Error(`Football-Data ${res.status}: ${msg} (${url})`);
  }

  return body as T;
}
