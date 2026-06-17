# Postkarten – Backend (Node + Express + SQLite)

A small, self-hostable backend so you can run the app with friends while the
frontend stays on GitHub Pages. Simple email/password auth (JWT), postcards
delivered between registered users, and shareable friend invites (optional
email via SMTP). Auth is intentionally minimal and easy to swap for Zitadel later.

## API

| Method | Path                      | Auth | Purpose                         |
| ------ | ------------------------- | ---- | ------------------------------- |
| GET    | `/api/health`             | –    | Health check                    |
| POST   | `/api/register`           | –    | Create account → `{token,user}` |
| POST   | `/api/login`              | –    | Sign in → `{token,user}`        |
| GET    | `/api/me`                 | ✓    | Current user                    |
| GET    | `/api/postcards`          | ✓    | Inbox + outbox                  |
| POST   | `/api/postcards`          | ✓    | Send `{toEmail,payload}`        |
| POST   | `/api/postcards/:id/read` | ✓    | Mark received card read         |
| POST   | `/api/invites`            | ✓    | Create invite `{email?}`        |

Auth is a Bearer JWT. Passwords are hashed with scrypt (`node:crypto`).

## Run locally

```bash
cd server
cp .env.example .env      # set at least JWT_SECRET
npm install
npm run dev               # http://localhost:8787
```

Run the frontend against it from the repo root:

```bash
VITE_API_URL=http://localhost:8787 npm run dev
```

## Deploy to your own server

### Option A — Docker (recommended)

```bash
cd server
docker build -t postcards-api .
docker run -d --name postcards-api \
  -p 8787:8787 \
  -v /srv/postcards-data:/app/data \
  -e JWT_SECRET="a-long-random-string" \
  -e APP_URL="https://fritscherman.github.io/postcards" \
  -e ALLOWED_ORIGIN="https://fritscherman.github.io" \
  postcards-api
```

### Option B — Node + pm2 / systemd

```bash
cd server
npm install
npm run build
# set env vars (see .env.example), then:
node dist/index.js
# or keep it alive: pm2 start dist/index.js --name postcards-api
```

### ⚠️ HTTPS is required

GitHub Pages is served over HTTPS, so the browser will **refuse** to call an
`http://` backend (mixed content). Put the server behind a TLS reverse proxy
and point `VITE_API_URL` at the HTTPS URL. Example with Caddy:

```
api.deinedomain.de {
    reverse_proxy localhost:8787
}
```

…or nginx with a Let's Encrypt cert proxying to `localhost:8787`.

Also set `ALLOWED_ORIGIN=https://fritscherman.github.io` so CORS permits the
Pages frontend.

## Connect the frontend

In the GitHub repo: **Settings → Secrets and variables → Actions → Variables**

```
VITE_API_URL = https://api.deinedomain.de
```

Re-run the Pages deploy. The app now requires sign-in and delivers postcards
between real users. Leaving the variable unset keeps the app in local demo mode.
