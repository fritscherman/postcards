import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db } from './db';
import { hashPassword, signToken, verifyPassword, verifyToken, type TokenUser } from './auth';
import { sendInviteEmail } from './email';

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

// Mark an invite as accepted by `userId`, forming a mutual friendship.
// No-op for empty tokens, already-accepted invites, or self-invites.
function acceptInvite(token: string, userId: string): void {
  if (!token) return;
  db.prepare(
    `UPDATE invites SET accepted_by = ?
     WHERE token = ? AND accepted_by IS NULL AND inviter_id != ?`,
  ).run(userId, token, userId);
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
});

// --- Mark a received postcard read ---
app.post('/api/postcards/:id/read', requireAuth, (req, res) => {
  const me = currentUser(res);
  db.prepare('UPDATE postcards SET read = 1 WHERE id = ? AND recipient_id = ?').run(req.params.id, me.id);
  res.json({ ok: true });
});

// --- Create an invite ---
app.post('/api/invites', requireAuth, async (req, res) => {
  const me = currentUser(res);
  const email = req.body.email ? normEmail(String(req.body.email)) : null;
  if (email && !emailRe.test(email)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });

  const token = randomUUID();
  db.prepare('INSERT INTO invites (token, inviter_id, email, created_at) VALUES (?,?,?,?)')
    .run(token, me.id, email, Date.now());

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
    `SELECT DISTINCT u.id, u.name, u.email
     FROM invites i
     JOIN users u ON u.id = CASE WHEN i.inviter_id = ? THEN i.accepted_by ELSE i.inviter_id END
     WHERE i.accepted_by IS NOT NULL
       AND (i.inviter_id = ? OR i.accepted_by = ?)
       AND u.id != ?
     ORDER BY u.name COLLATE NOCASE`,
  ).all(me.id, me.id, me.id, me.id) as { id: string; name: string; email: string }[];
  res.json({ friends: rows });
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
