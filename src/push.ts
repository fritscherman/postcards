// Browser-side Web Push helpers. The public VAPID key comes from the server at
// runtime (apiPushKey), so enabling push needs no frontend rebuild.
import { apiPushKey, apiPushSubscribe, apiPushUnsubscribe } from './api/client';

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'on' | 'off';

/** Does this browser support the APIs we need at all? */
export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// VAPID public keys are URL-safe base64; the subscribe API wants a byte buffer.
// Build over an explicit ArrayBuffer so the type is a plain BufferSource.
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Current notification state for this device. */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  // Only offer it when the server actually has push keys configured.
  let key: string | null = null;
  try {
    key = (await apiPushKey()).key;
  } catch {
    return 'unavailable';
  }
  if (!key) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** Ask permission and subscribe. Returns the resulting state. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const key = (await apiPushKey()).key;
  if (!key) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'off';
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  await apiPushSubscribe(sub.toJSON());
  return 'on';
}

/** Unsubscribe this device. */
export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await apiPushUnsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}
