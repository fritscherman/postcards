# Postkarten – Backend (Cloudflare Worker + D1)

A tiny serverless backend so you can test the app with friends: simple
email/password auth, postcards delivered between registered users, and
shareable friend invites (optionally emailed via Resend).

The frontend (GitHub Pages) talks to this Worker over HTTPS. Auth is
intentionally minimal and meant to be replaced by Zitadel later.

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

Auth is a Bearer JWT (HS256) in the `Authorization` header. Passwords are
hashed with PBKDF2 (Web Crypto) — no native modules.

## Deploy

```bash
cd worker
npm install
npx wrangler login

# 1. Create the D1 database and copy the printed database_id into wrangler.toml
npm run db:create

# 2. Apply the schema to the remote database
npm run db:migrate

# 3. Set the signing secret (and optionally an email key)
npx wrangler secret put JWT_SECRET
# optional, enables emailed invites:
npx wrangler secret put RESEND_API_KEY

# 4. Point APP_URL in wrangler.toml at your Pages URL, then deploy
npm run deploy
```

`wrangler deploy` prints your Worker URL, e.g.
`https://postcards-api.<you>.workers.dev`.

## Connect the frontend

In the GitHub repo: **Settings → Secrets and variables → Actions →
Variables → New variable**

```
VITE_API_URL = https://postcards-api.<you>.workers.dev
```

Re-run the Pages deploy. The app now requires sign-in and delivers
postcards between real users. Leaving the variable unset keeps the app in
local demo mode.

## Local development

```bash
cd worker
npm run db:migrate:local      # set up the local SQLite database
npm run dev                   # http://localhost:8787
```

Create `worker/.dev.vars` (git-ignored) with at least:

```
JWT_SECRET=local-dev-secret
APP_URL=http://localhost:5173
ALLOWED_ORIGIN=*
```

Then run the frontend with `VITE_API_URL=http://localhost:8787 npm run dev`
from the repo root.
