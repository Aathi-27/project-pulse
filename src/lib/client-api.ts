// Small fetch wrapper: unwraps {data} / {error} and throws Error(message).
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  });
  let payload: { data?: T; error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) throw new Error(payload.error ?? `Request failed (${res.status}).`);
  return payload.data as T;
}
