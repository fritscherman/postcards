import { Database, type RunResult } from 'node-sqlite3-wasm';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Pure-WASM SQLite — no native build tools (no Visual Studio) required anywhere.
const DB_PATH = resolve(process.env.DB_PATH ?? './data/postcards.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const raw = new Database(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL');

// Schema is created on startup; safe to run every time.
raw.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    pw         TEXT NOT NULL,          -- "salt:hash" (scrypt)
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS postcards (
    id           TEXT PRIMARY KEY,
    sender_id    TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT NOT NULL REFERENCES users(id),
    payload      TEXT NOT NULL,        -- JSON: image, message, templateId, stampId, filter, orientation, crop, location
    read         INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pc_recipient ON postcards(recipient_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_pc_sender    ON postcards(sender_id, created_at);

  CREATE TABLE IF NOT EXISTS invites (
    token       TEXT PRIMARY KEY,
    inviter_id  TEXT NOT NULL REFERENCES users(id),
    email       TEXT,
    accepted_by TEXT REFERENCES users(id),
    created_at  INTEGER NOT NULL
  );

  -- Mutual friendships. Stored once per pair with user_a < user_b so the
  -- relationship is symmetric and de-duplicated.
  CREATE TABLE IF NOT EXISTS friendships (
    user_a     TEXT NOT NULL REFERENCES users(id),
    user_b     TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_a, user_b)
  );
`);

// Backfill friendships from any invites that were accepted under the old
// one-shot model, so existing connections survive the move to reusable links.
raw.exec(`
  INSERT OR IGNORE INTO friendships (user_a, user_b, created_at)
  SELECT MIN(inviter_id, accepted_by), MAX(inviter_id, accepted_by), created_at
  FROM invites
  WHERE accepted_by IS NOT NULL AND inviter_id != accepted_by
`);

type Param = number | bigint | string | Uint8Array | null;

interface Statement {
  run: (...params: Param[]) => RunResult;
  get: <T = any>(...params: Param[]) => T | undefined;
  all: <T = any>(...params: Param[]) => T[];
}

// Adapter that keeps the better-sqlite3-style `prepare(sql).run/get/all(...args)`
// API used across the routes, so nothing else had to change.
export const db = {
  exec: (sql: string): void => raw.exec(sql),
  prepare: (sql: string): Statement => ({
    run: (...params) => raw.run(sql, params),
    get: <T = any>(...params: Param[]) => (raw.get(sql, params) ?? undefined) as T | undefined,
    all: <T = any>(...params: Param[]) => raw.all(sql, params) as T[],
  }),
};
