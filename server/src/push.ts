import webpush from 'web-push';
import { db } from './db';

// Web Push is enabled only when a VAPID key pair is configured. Without it the
// app runs exactly as before — sending a card just skips the notification step.
// Generate a key pair once with:  npm run generate-vapid
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

export const pushEnabled = !!(PUBLIC_KEY && PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  console.log('Web Push enabled.');
} else {
  console.log('Web Push disabled (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to enable).');
}

/** The public VAPID key the browser needs to create a subscription, or null. */
export function publicKey(): string | null {
  return pushEnabled ? PUBLIC_KEY : null;
}

interface SubRow {
  endpoint: string;
  sub: string;
}

/** Store (or refresh) a browser push subscription for a user. */
export function saveSubscription(userId: string, sub: { endpoint?: string } & object): void {
  const endpoint = String((sub as { endpoint?: string }).endpoint ?? '');
  if (!endpoint) return;
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, user_id, sub, created_at) VALUES (?,?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, sub = excluded.sub`,
  ).run(endpoint, userId, JSON.stringify(sub), Date.now());
}

/** Forget a subscription (user turned notifications off, or it expired). */
export function removeSubscription(endpoint: string): void {
  if (!endpoint) return;
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  badgeCount?: number;
}

/**
 * Send a notification to every device a user has registered. Stale endpoints
 * (404/410) are pruned automatically. Fire-and-forget: never throws.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;
  const rows = db
    .prepare('SELECT endpoint, sub FROM push_subscriptions WHERE user_id = ?')
    .all(userId) as SubRow[];
  const data = JSON.stringify(payload);

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(JSON.parse(row.sub), data);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) removeSubscription(row.endpoint);
        else console.error('Push send failed:', code ?? err);
      }
    }),
  );
}
