// Thin client for the Postcards backend API. When VITE_API_URL is empty the app
// runs in local demo mode and this client is unused.
//   VITE_API_URL=/                  -> same origin (Node serves API + app), relative calls
//   VITE_API_URL=https://api.host   -> separate backend host
import i18n from '../i18n';

const raw = (import.meta.env.VITE_API_URL ?? '').trim();

/** True when a backend is configured — switches the app from demo to online mode. */
export const isOnline = raw.length > 0;

const BASE = raw === '/' ? '' : raw.replace(/\/$/, '');

const TOKEN_KEY = 'postcards.token.v1';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null): void => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? i18n.t('errors.generic'), res.status, data.code);
  return data as T;
}

export const apiRegister = (b: { email: string; name: string; password: string; inviteToken?: string }) =>
  api<{ token: string; user: AuthUser }>('/api/register', 'POST', b);

export const apiLogin = (b: { email: string; password: string; inviteToken?: string }) =>
  api<{ token: string; user: AuthUser }>('/api/login', 'POST', b);

export const apiMe = () => api<{ user: AuthUser }>('/api/me');

/** Change the signed-in user's display name; returns a fresh token + user. */
export const apiUpdateName = (name: string) =>
  api<{ token: string; user: AuthUser }>('/api/me', 'POST', { name });

export const apiListPostcards = () => api<{ cards: any[] }>('/api/postcards');

export const apiSendPostcard = (b: { toEmail: string; payload: unknown }) =>
  api<{ id: string }>('/api/postcards', 'POST', b);

export const apiMarkRead = (id: string) => api<{ ok: boolean }>(`/api/postcards/${id}/read`, 'POST');

export const apiSetLike = (id: string, liked: boolean) =>
  api<{ ok: boolean; liked: boolean }>(`/api/postcards/${id}/like`, 'POST', { liked });

export const apiCreateInvite = (b: { email?: string }) =>
  api<{ token: string; link: string; emailed: boolean }>('/api/invites', 'POST', b);

export const apiListFriends = () => api<{ friends: AuthUser[] }>('/api/friends');

/** Connect two of my friends with each other so they can exchange postcards. */
export const apiIntroduceFriends = (aId: string, bId: string) =>
  api<{ ok: boolean; created: boolean }>('/api/friends/introduce', 'POST', { aId, bId });

/** Public VAPID key for push, or null when the server hasn't configured push. */
export const apiPushKey = () => api<{ key: string | null }>('/api/push/key');

export const apiPushSubscribe = (sub: unknown) =>
  api<{ ok: boolean }>('/api/push/subscribe', 'POST', { sub });

export const apiPushUnsubscribe = (endpoint: string) =>
  api<{ ok: boolean }>('/api/push/unsubscribe', 'POST', { endpoint });
