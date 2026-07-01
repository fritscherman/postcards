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

async function api<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Tell the server our language so it can localise push/email it sends us.
      'X-Lang': (i18n.language || 'en').split('-')[0],
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Prefer a stable error code translated into the current UI language; fall
    // back to the server's own message, then a generic one.
    const message = data.code
      ? i18n.t(`serverErrors.${data.code}`, { defaultValue: data.error ?? i18n.t('errors.generic') })
      : data.error ?? i18n.t('errors.generic');
    throw new ApiError(message, res.status, data.code);
  }
  return data as T;
}

export const apiRegister = (b: { email: string; name: string; password: string; inviteToken?: string; shareToken?: string }) =>
  api<{ token: string; user: AuthUser }>('/api/register', 'POST', b);

export const apiLogin = (b: { email: string; password: string; inviteToken?: string; shareToken?: string }) =>
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

/** Connect to an inviter via their link while already signed in. */
export const apiAcceptInvite = (token: string) =>
  api<{ ok: boolean; created: boolean; self: boolean; from: string | null }>(
    `/api/invites/${token}/accept`,
    'POST',
  );

/** A postcard payload as carried by a public share link. */
export interface SharedCard {
  image: string;
  message: string;
  templateId: string;
  stampId: string;
  customStamp?: { id: string; name: string; emoji: string; bg: string };
  filter?: string;
  orientation?: 'landscape' | 'portrait';
  crop?: { zoom: number; x: number; y: number };
  location?: { lat: number; lng: number; label?: string; source?: 'exif' | 'manual' };
}

/** Create a public link to the designed card so an unregistered friend can see it. */
export const apiCreateShare = (payload: SharedCard) =>
  api<{ token: string; link: string }>('/api/shares', 'POST', { payload });

/** Public preview of a shared card — no auth required. */
export const apiGetShare = (token: string) =>
  api<{ from: string; card: SharedCard }>(`/api/shares/${token}`);

/** Deliver a shared card into the signed-in user's mailbox. */
export const apiClaimShare = (token: string) =>
  api<{ ok: boolean; delivered: boolean; mine: boolean }>(`/api/shares/${token}/claim`, 'POST');

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

// --- Shared pinboards ---

export interface BoardSummary {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  cardCount: number;
  createdAt: number;
}

export interface BoardMember {
  id: string;
  name: string;
  email: string;
}

/** A postcard placed on a board: its payload plus position + who pinned it. */
export interface BoardCard {
  placementId: string;
  postcardId: string;
  x: number;
  y: number;
  rotation: number;
  placedBy: string;
  from: string;
  to: string;
  createdAt: number;
  image: string;
  message: string;
  templateId: string;
  stampId: string;
  customStamp?: { id: string; name: string; emoji: string; bg: string };
  filter?: string;
  orientation?: 'landscape' | 'portrait';
  crop?: { zoom: number; x: number; y: number };
  location?: { lat: number; lng: number; label?: string; source?: 'exif' | 'manual' };
}

export interface BoardDetail {
  board: { id: string; name: string; ownerId: string };
  members: BoardMember[];
  cards: BoardCard[];
}

export const apiListBoards = () => api<{ boards: BoardSummary[] }>('/api/boards');

export const apiCreateBoard = (name: string) =>
  api<{ board: BoardSummary }>('/api/boards', 'POST', { name });

export const apiGetBoard = (id: string) => api<BoardDetail>(`/api/boards/${id}`);

export const apiRenameBoard = (id: string, name: string) =>
  api<{ ok: boolean; name: string }>(`/api/boards/${id}`, 'POST', { name });

export const apiDeleteBoard = (id: string) =>
  api<{ ok: boolean }>(`/api/boards/${id}`, 'DELETE');

export const apiAddBoardMember = (id: string, friendId: string) =>
  api<{ ok: boolean; added: boolean }>(`/api/boards/${id}/members`, 'POST', { friendId });

export const apiRemoveBoardMember = (id: string, userId: string) =>
  api<{ ok: boolean }>(`/api/boards/${id}/members/${userId}`, 'DELETE');

export const apiPinBoardCard = (
  id: string,
  b: { postcardId: string; x: number; y: number; rotation: number },
) => api<{ placementId: string }>(`/api/boards/${id}/cards`, 'POST', b);

export const apiMoveBoardCard = (
  id: string,
  placementId: string,
  b: { x: number; y: number; rotation: number },
) => api<{ ok: boolean }>(`/api/boards/${id}/cards/${placementId}`, 'POST', b);

export const apiUnpinBoardCard = (id: string, placementId: string) =>
  api<{ ok: boolean }>(`/api/boards/${id}/cards/${placementId}`, 'DELETE');
