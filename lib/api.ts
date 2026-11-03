export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

