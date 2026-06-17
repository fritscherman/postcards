# Postkarten – Backend (Node + Express + SQLite)

A small self-hosted backend so you can run the app on your own server and test
it with friends. **One Node process serves both** the built frontend (the SPA)
**and** the `/api` routes, so there is a single origin — no CORS, no mixed
content. Auth is intentionally simple (email/password) and meant to be replaced
by Zitadel later.

- Passwords: `scrypt` (node:crypto) — no native build needed.
- Sessions: signed JWT (HS256) in the `Authorization: Bearer` header.
- Storage: SQLite via `node-sqlite3-wasm` (pure WASM — **no build tools / Visual Studio needed**).

## API

| Method | Path                      | Auth | Purpose                         |
| ------ | ------------------------- | ---- | ------------------------------- |
| POST   | `/api/register`           | –    | Create account → `{token,user}` |
| POST   | `/api/login`              | –    | Sign in → `{token,user}`        |
| GET    | `/api/me`                 | ✓    | Current user                    |
| GET    | `/api/postcards`          | ✓    | Inbox + outbox                  |
| POST   | `/api/postcards`          | ✓    | Send `{toEmail,payload}`        |
| POST   | `/api/postcards/:id/read` | ✓    | Mark received card read         |
| POST   | `/api/invites`            | ✓    | Create invite `{email?}`        |
| GET    | `/api/health`             | –    | Health check                    |

## Deploy on your Windows server (git pull + pm2)

One-time setup:

1. Install **Node.js LTS** (20 or 22).
2. From the repo root run **`.\setup.ps1`** — it installs pm2 and creates
   `server\.env` with a random `JWT_SECRET`. Then edit `server\.env` and set
   `APP_URL=https://postkarten.deinedomain.de`.
   (Manual alternative: `npm i -g pm2`, then `copy server\.env.example server\.env`.)
3. Point your subdomain at the Node port (default `8787`) via your existing
   reverse proxy / TLS. For **IIS** use the ready-made **`iis/web.config`**
   (needs the URL Rewrite + Application Request Routing modules with proxy
   enabled — see the comments inside the file). nginx/Caddy work too. The app
   is served at the domain root.

Every deploy (from the repo root):

```powershell
.\deploy.ps1
```

`deploy.ps1` pulls, builds the frontend (`VITE_API_URL=/`, same origin) and the
backend, then `pm2 restart wanderpost` (or starts it the first time via
`ecosystem.config.cjs`).

To start automatically after a server reboot, run once:

```powershell
pm2 save
pm2 startup        # follow the printed instructions (or use pm2-windows-startup)
```

## Local development

```bash
cd server
cp .env.example .env      # set JWT_SECRET, APP_URL=http://localhost:5173
npm install
npm run dev               # http://localhost:8787
```

Run the frontend separately with `VITE_API_URL=http://localhost:8787 npm run dev`
from the repo root, or build it (`npm run build`) and let the server serve it.

## Email invites (optional)

Invites always produce a shareable link. To also send them by email, set the
`SMTP_*` variables in `.env`. Without SMTP configured, just copy the link
(WhatsApp, etc.).

> A `Dockerfile` is included as an alternative if you ever prefer containers,
> but the pm2 flow above is the supported path for the Windows server.
