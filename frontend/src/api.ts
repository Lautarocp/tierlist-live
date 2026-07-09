export const API_URL =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

// crypto.randomUUID solo existe en contextos seguros (HTTPS/localhost);
// fallback para acceso por IP de LAN
export function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}

export interface Tier {
  id: string;
  label: string;
  color: string;
  position: number;
}

export interface Item {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface TierList {
  id: string;
  title: string;
  tiers: Tier[];
  items: Item[];
}

export interface Session {
  id: string;
  code: string;
  status: 'LOBBY' | 'LIVE' | 'FINISHED';
  streamerToken: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function createTierList(
  title: string,
  tiers: { label: string; color: string; position: number }[],
): Promise<TierList> {
  return request('/tierlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, tiers }),
  });
}

export function addItem(
  tierListId: string,
  name: string,
  image: File | null,
): Promise<Item> {
  const form = new FormData();
  form.append('name', name);
  if (image) form.append('image', image);
  return request(`/tierlists/${tierListId}/items`, {
    method: 'POST',
    body: form,
  });
}

export function createSession(tierListId: string): Promise<Session> {
  return request('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tierListId }),
  });
}
