import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db } from './db';
import { hashPassword, signToken, verifyPassword, verifyToken, type TokenUser } from './auth';
import { sendInviteEmail } from './email';
import { notifyUser, publicKey, removeSubscription, saveSubscription } from './push';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Fatal: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
const APP_URL = (process.env.APP_URL ?? '').replace(/\/$/, '');
const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.use(express.json({ limit: '10mb' })); // postcard images are inline data URLs

const origins = (process.env.ALLOWED_ORIGIN ?? '*').split(',').map((s) => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e: string) => e.trim().toLowerCase();

interface UserRow {
  id: string;
  email: string;
  name: string;
  pw: string;
  created_at: number;
}

// --- Auth middleware ---
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token, JWT_SECRET!) : null;
  if (!user) return res.status(401).json({ error: 'Nicht angemeldet.' });
  res.locals.user = user;
  next();
}
const currentUser = (res: Response): TokenUser => res.locals.user;

// Record a mutual friendship (stored once with the smaller id first).
// Returns true when a new connection was created (false if it already existed).
function addFriendship(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const r = db.prepare(
    'INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) VALUES (?,?,?)',
  ).run(lo, hi, Date.now());
  return r.changes > 0;
}

// True when the two users are already connected as friends.
function areFriends(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return !!db.prepare('SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?').get(lo, hi);
}

// Redeem an invite link: connect the inviter and `userId` as friends.
// Reusable — many people can redeem the same token. No-op for empty/unknown
// tokens or self-invites.
function acceptInvite(token: string, userId: string): void {
  if (!token) return;
  const inv = db.prepare('SELECT inviter_id FROM invites WHERE token = ?').get(token) as
    | { inviter_id: string }
    | undefined;
  if (inv) addFriendship(inv.inviter_id, userId);
}

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Register ---
app.post('/api/register', (req, res) => {
  const email = normEmail(String(req.body.email ?? ''));
  const name = String(req.body.name ?? '').trim();
  const password = String(req.body.password ?? '');
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  if (name.length < 2) return res.status(400).json({ error: 'Bitte gib einen Namen an.' });
  if (password.length < 6) return res.status(400).json({ error: 'Passwort braucht mindestens 6 Zeichen.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert.' });

  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email, name, pw, created_at) VALUES (?,?,?,?,?)')
    .run(id, email, name, hashPassword(password), Date.now());

  acceptInvite(String(req.body.inviteToken ?? ''), id);

  const user: TokenUser = { id, email, name };
  res.status(201).json({ token: signToken(user, JWT_SECRET!), user });
});

// --- Login ---
app.post('/api/login', (req, res) => {
  const email = normEmail(String(req.body.email ?? ''));
  const password = String(req.body.password ?? '');
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!u || !verifyPassword(password, u.pw)) {
    return res.status(401).json({ error: 'E-Mail oder Passwort ist falsch.' });
  }

  // An existing user who follows an invite link becomes the inviter's friend too.
  acceptInvite(String(req.body.inviteToken ?? ''), u.id);

  const user: TokenUser = { id: u.id, email: u.email, name: u.name };
  res.json({ token: signToken(user, JWT_SECRET!), user });
});

// --- Current user ---
app.get('/api/me', requireAuth, (_req, res) => {
  res.json({ user: currentUser(res) });
});

// --- Update the current user's display name ---
// The name is baked into the JWT (and shown as sender on cards), so we hand back
// a fresh token alongside the updated user.
app.post('/api/me', requireAuth, (req, res) => {
  const me = currentUser(res);
  const name = String(req.body.name ?? '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Bitte gib einen Namen an.' });
  if (name.length > 60) return res.status(400).json({ error: 'Der Name ist zu lang.' });

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, me.id);

  const user: TokenUser = { id: me.id, email: me.email, name };
  res.json({ token: signToken(user, JWT_SECRET!), user });
});

// --- List postcards (inbox + outbox) ---
app.get('/api/postcards', requireAuth, (_req, res) => {
  const me = currentUser(res);
  const rows = db.prepare(
    `SELECT p.*, s.name AS sender_name, s.email AS sender_email,
            r.name AS recipient_name, r.email AS recipient_email
     FROM postcards p
     JOIN users s ON s.id = p.sender_id
     JOIN users r ON r.id = p.recipient_id
     WHERE p.sender_id = ? OR p.recipient_id = ?
     ORDER BY p.created_at DESC`,
  ).all(me.id, me.id) as any[];

  const cards = rows.map((p) => ({
    id: p.id,
    box: p.recipient_id === me.id ? 'inbox' : 'outbox',
    from: p.sender_name,
    fromEmail: p.sender_email,
    to: p.recipient_name,
    toEmail: p.recipient_email,
    read: !!p.read || p.sender_id === me.id,
    liked: !!p.liked,
    createdAt: p.created_at,
    ...JSON.parse(p.payload),
  }));
  res.json({ cards });
});

// --- Send a postcard ---
app.post('/api/postcards', requireAuth, (req, res) => {
  const me = currentUser(res);
  const toEmail = normEmail(String(req.body.toEmail ?? ''));
  if (!emailRe.test(toEmail)) return res.status(400).json({ error: 'Bitte gib die E-Mail des Empfängers an.' });

  const recipient = db.prepare('SELECT * FROM users WHERE email = ?').get(toEmail) as UserRow | undefined;
  if (!recipient) {
    return res.status(404).json({ error: 'Diese Person ist noch nicht dabei — lade sie zuerst ein.', code: 'NO_RECIPIENT' });
  }

  const p = req.body.payload ?? {};
  const payload = JSON.stringify({
    image: String(p.image ?? ''),
    message: String(p.message ?? ''),
    templateId: String(p.templateId ?? 'classic'),
    stampId: String(p.stampId ?? 'heart'),
    filter: p.filter ?? 'none',
    orientation: p.orientation === 'portrait' ? 'portrait' : 'landscape',
    crop: p.crop ?? { zoom: 1, x: 50, y: 50 },
    location: p.location ?? undefined,
  });

  const id = randomUUID();
  db.prepare('INSERT INTO postcards (id, sender_id, recipient_id, payload, read, created_at) VALUES (?,?,?,?,0,?)')
    .run(id, me.id, recipient.id, payload, Date.now());
  res.status(201).json({ id });

  // Notify the recipient (fire-and-forget — never blocks or fails the response).
  const unread = db
    .prepare('SELECT COUNT(*) AS n FROM postcards WHERE recipient_id = ? AND read = 0')
    .get(recipient.id) as { n: number } | undefined;
  void notifyUser(recipient.id, {
    title: '📬 Neue Postkarte',
    body: `${me.name} hat dir eine Postkarte geschickt.`,
    url: '/mailbox',
    badgeCount: unread?.n ?? 1,
  });
});

// --- Web Push: the public VAPID key (null when push isn't configured) ---
app.get('/api/push/key', (_req, res) => res.json({ key: publicKey() }));

// --- Web Push: register this browser for notifications ---
app.post('/api/push/subscribe', requireAuth, (req, res) => {
  const me = currentUser(res);
  const sub = req.body.sub;
  if (!sub || typeof sub.endpoint !== 'string') {
    return res.status(400).json({ error: 'Ungültiges Abo.' });
  }
  saveSubscription(me.id, sub);
  res.status(201).json({ ok: true });
});

// --- Web Push: stop notifications for this browser ---
app.post('/api/push/unsubscribe', requireAuth, (req, res) => {
  removeSubscription(String(req.body.endpoint ?? ''));
  res.json({ ok: true });
});

// --- Mark a received postcard read ---
app.post('/api/postcards/:id/read', requireAuth, (req, res) => {
  const me = currentUser(res);
  db.prepare('UPDATE postcards SET read = 1 WHERE id = ? AND recipient_id = ?').run(req.params.id, me.id);
  res.json({ ok: true });
});

// --- Like / unlike a received postcard ---
app.post('/api/postcards/:id/like', requireAuth, (req, res) => {
  const me = currentUser(res);
  const liked = req.body.liked ? 1 : 0;
  db.prepare('UPDATE postcards SET liked = ? WHERE id = ? AND recipient_id = ?')
    .run(liked, req.params.id, me.id);
  res.json({ ok: true, liked: !!liked });
});

// --- Create (or reuse) an invite link ---
// Each user has one durable, reusable link — many people can redeem it.
app.post('/api/invites', requireAuth, async (req, res) => {
  const me = currentUser(res);
  const email = req.body.email ? normEmail(String(req.body.email)) : null;
  if (email && !emailRe.test(email)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });

  const existing = db.prepare(
    'SELECT token FROM invites WHERE inviter_id = ? ORDER BY created_at LIMIT 1',
  ).get(me.id) as { token: string } | undefined;

  let token = existing?.token;
  if (!token) {
    token = randomUUID();
    db.prepare('INSERT INTO invites (token, inviter_id, email, created_at) VALUES (?,?,?,?)')
      .run(token, me.id, null, Date.now());
  }

  const link = `${APP_URL}/invite/${token}`;
  const emailed = email ? await sendInviteEmail(email, me.name, link) : false;
  res.status(201).json({ token, link, emailed });
});

// --- List friends ---
// Friendship is mutual and derived from accepted invites: the other party of
// any invite where I'm the inviter (and it was accepted) or the one who joined.
app.get('/api/friends', requireAuth, (_req, res) => {
  const me = currentUser(res);
  const rows = db.prepare(
    `SELECT u.id, u.name, u.email
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
     WHERE f.user_a = ? OR f.user_b = ?
     ORDER BY u.name COLLATE NOCASE`,
  ).all(me.id, me.id, me.id) as { id: string; name: string; email: string }[];
  res.json({ friends: rows });
});

// --- Introduce two of my friends to each other ---
// Lets you connect two people you already know, so they become friends and can
// exchange postcards directly. You may only introduce your own friends.
app.post('/api/friends/introduce', requireAuth, (req, res) => {
  const me = currentUser(res);
  const aId = String(req.body.aId ?? '');
  const bId = String(req.body.bId ?? '');
  if (!aId || !bId || aId === bId) {
    return res.status(400).json({ error: 'Wähle zwei verschiedene Freund:innen aus.' });
  }
  if (!areFriends(me.id, aId) || !areFriends(me.id, bId)) {
    return res.status(403).json({ error: 'Du kannst nur eigene Freund:innen miteinander bekannt machen.' });
  }

  const created = addFriendship(aId, bId);
  if (!created) return res.json({ ok: true, created: false });

  // Tell both sides who introduced them (fire-and-forget).
  const a = db.prepare('SELECT name FROM users WHERE id = ?').get(aId) as { name: string } | undefined;
  const b = db.prepare('SELECT name FROM users WHERE id = ?').get(bId) as { name: string } | undefined;
  if (a && b) {
    void notifyUser(aId, {
      title: '🤝 Neue Bekanntschaft',
      body: `${me.name} hat dich mit ${b.name} bekannt gemacht.`,
      url: '/friends',
    });
    void notifyUser(bId, {
      title: '🤝 Neue Bekanntschaft',
      body: `${me.name} hat dich mit ${a.name} bekannt gemacht.`,
      url: '/friends',
    });
  }
  res.json({ ok: true, created: true });
});

// --- Unknown API routes → JSON 404 (don't fall through to the SPA) ---
app.use('/api', (_req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));

// --- Serve the built frontend (single origin: Node serves the SPA + the API) ---
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(__dirname, '../../dist'));
if (existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  // SPA fallback: any non-API GET returns index.html so client-side routes work.
  app.get('*', (_req, res) => res.sendFile(join(STATIC_DIR, 'index.html')));
  console.log(`Serving frontend from ${STATIC_DIR}`);
} else {
  console.warn(`Frontend not found at ${STATIC_DIR} — run "npm run build" in the repo root.`);
}

// --- Fallback error handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Serverfehler' });
});

app.listen(PORT, () => console.log(`Postcards API listening on :${PORT}`));
