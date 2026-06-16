import { hashPassword, signToken, verifyPassword, verifyToken, type TokenPayload } from './auth';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ALLOWED_ORIGIN?: string;
  APP_URL?: string;
  RESEND_API_KEY?: string;
  INVITE_FROM?: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  pw_hash: string;
  pw_salt: string;
  created_at: number;
}

// ---------- HTTP helpers ----------

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allow = env.ALLOWED_ORIGIN ?? '*';
  const list = allow.split(',').map((s) => s.trim());
  const allowOrigin = allow === '*' ? '*' : origin && list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e: string) => e.trim().toLowerCase();

async function authUser(req: Request, env: Env): Promise<TokenPayload | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return verifyToken(header.slice(7), env.JWT_SECRET);
}

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name };
}

// ---------- Handlers ----------

async function register(body: any, env: Env, cors: Record<string, string>): Promise<Response> {
  const email = normEmail(String(body.email ?? ''));
  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');
  if (!emailRe.test(email)) return json({ error: 'Ungültige E-Mail-Adresse.' }, 400, cors);
  if (name.length < 2) return json({ error: 'Bitte gib einen Namen an.' }, 400, cors);
  if (password.length < 6) return json({ error: 'Passwort braucht mindestens 6 Zeichen.' }, 400, cors);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'Diese E-Mail ist bereits registriert.' }, 409, cors);

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, pw_hash, pw_salt, created_at) VALUES (?,?,?,?,?,?)',
  ).bind(id, email, name, hash, salt, now).run();

  // If the user arrived through an invite, mark it accepted.
  const inviteToken = String(body.inviteToken ?? '');
  if (inviteToken) {
    await env.DB.prepare('UPDATE invites SET accepted_by = ? WHERE token = ? AND accepted_by IS NULL')
      .bind(id, inviteToken).run();
  }

  const user = { id, email, name };
  const token = await signToken({ sub: id, email, name }, env.JWT_SECRET);
  return json({ token, user }, 201, cors);
}

async function login(body: any, env: Env, cors: Record<string, string>): Promise<Response> {
  const email = normEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!u || !(await verifyPassword(password, u.pw_hash, u.pw_salt))) {
    return json({ error: 'E-Mail oder Passwort ist falsch.' }, 401, cors);
  }
  const token = await signToken({ sub: u.id, email: u.email, name: u.name }, env.JWT_SECRET);
  return json({ token, user: publicUser(u) }, 200, cors);
}

async function listPostcards(auth: TokenPayload, env: Env, cors: Record<string, string>): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT p.*, s.name AS sender_name, s.email AS sender_email, r.name AS recipient_name, r.email AS recipient_email
     FROM postcards p
     JOIN users s ON s.id = p.sender_id
     JOIN users r ON r.id = p.recipient_id
     WHERE p.sender_id = ?1 OR p.recipient_id = ?1
     ORDER BY p.created_at DESC`,
  ).bind(auth.sub).all<any>();

  const cards = (rows.results ?? []).map((p) => ({
    id: p.id,
    box: p.recipient_id === auth.sub ? 'inbox' : 'outbox',
    from: p.sender_name,
    fromEmail: p.sender_email,
    to: p.recipient_name,
    toEmail: p.recipient_email,
    read: !!p.read || p.sender_id === auth.sub,
    createdAt: p.created_at,
    ...JSON.parse(p.payload),
  }));
  return json({ cards }, 200, cors);
}

async function sendPostcard(auth: TokenPayload, body: any, env: Env, cors: Record<string, string>): Promise<Response> {
  const toEmail = normEmail(String(body.toEmail ?? ''));
  if (!emailRe.test(toEmail)) return json({ error: 'Bitte gib die E-Mail des Empfängers an.' }, 400, cors);

  const recipient = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(toEmail).first<UserRow>();
  if (!recipient) {
    return json({ error: 'Diese Person ist noch nicht dabei — lade sie zuerst ein.', code: 'NO_RECIPIENT' }, 404, cors);
  }

  // Whitelist of fields we persist as the card payload.
  const p = body.payload ?? {};
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

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO postcards (id, sender_id, recipient_id, payload, read, created_at) VALUES (?,?,?,?,0,?)',
  ).bind(id, auth.sub, recipient.id, payload, Date.now()).run();

  return json({ id }, 201, cors);
}

async function markRead(auth: TokenPayload, id: string, env: Env, cors: Record<string, string>): Promise<Response> {
  await env.DB.prepare('UPDATE postcards SET read = 1 WHERE id = ? AND recipient_id = ?').bind(id, auth.sub).run();
  return json({ ok: true }, 200, cors);
}

async function createInvite(auth: TokenPayload, body: any, env: Env, cors: Record<string, string>): Promise<Response> {
  const email = body.email ? normEmail(String(body.email)) : null;
  if (email && !emailRe.test(email)) return json({ error: 'Ungültige E-Mail-Adresse.' }, 400, cors);

  const token = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO invites (token, inviter_id, email, created_at) VALUES (?,?,?,?)')
    .bind(token, auth.sub, email, Date.now()).run();

  const base = (env.APP_URL ?? '').replace(/\/$/, '');
  const link = `${base}/invite/${token}`;

  let emailed = false;
  if (email && env.RESEND_API_KEY) {
    emailed = await sendInviteEmail(email, auth.name, link, env);
  }
  return json({ token, link, emailed }, 201, cors);
}

async function sendInviteEmail(to: string, inviter: string, link: string, env: Env): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.INVITE_FROM ?? 'Postkarten <onboarding@resend.dev>',
        to,
        subject: `${inviter} lädt dich zu Postkarten ein ✉️`,
        html: `<p>${inviter} möchte dir virtuelle Postkarten schicken.</p>
               <p><a href="${link}">Jetzt beitreten</a></p>
               <p>Oder kopiere diesen Link: ${link}</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- Router ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    const cors = corsHeaders(env, origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '');

    try {
      if (!env.JWT_SECRET) return json({ error: 'Server nicht konfiguriert (JWT_SECRET fehlt).' }, 500, cors);

      const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

      if (path === '/api/register' && req.method === 'POST') return register(body, env, cors);
      if (path === '/api/login' && req.method === 'POST') return login(body, env, cors);

      // Everything below needs auth.
      const auth = await authUser(req, env);
      if (!auth) return json({ error: 'Nicht angemeldet.' }, 401, cors);

      if (path === '/api/me' && req.method === 'GET') {
        return json({ user: { id: auth.sub, email: auth.email, name: auth.name } }, 200, cors);
      }
      if (path === '/api/postcards' && req.method === 'GET') return listPostcards(auth, env, cors);
      if (path === '/api/postcards' && req.method === 'POST') return sendPostcard(auth, body, env, cors);
      if (path === '/api/invites' && req.method === 'POST') return createInvite(auth, body, env, cors);

      const readMatch = path.match(/^\/api\/postcards\/([^/]+)\/read$/);
      if (readMatch && req.method === 'POST') return markRead(auth, readMatch[1], env, cors);

      return json({ error: 'Nicht gefunden.' }, 404, cors);
    } catch (err) {
      return json({ error: 'Serverfehler', detail: String((err as Error).message) }, 500, cors);
    }
  },
};
