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
    liked        INTEGER NOT NULL DEFAULT 0,
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

  -- Web Push subscriptions. One row per browser/device endpoint; a user can
  -- have several (phone, laptop, …). Keyed by the unique push endpoint URL.
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint   TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    sub        TEXT NOT NULL,        -- JSON PushSubscription (endpoint + keys)
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

  -- Shared pinboards ("Pinwände"). A board has one owner and any number of
  -- members; everyone on it can place their own postcards and rearrange them.
  CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    owner_id   TEXT NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- Who can see/edit a board. The owner is also stored here as a member.
  CREATE TABLE IF NOT EXISTS board_members (
    board_id   TEXT NOT NULL REFERENCES boards(id),
    user_id    TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (board_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id);

  -- A postcard pinned onto a board, with its position + rotation. A given card
  -- can sit on a board only once (UNIQUE), and is placed by one of the members.
  CREATE TABLE IF NOT EXISTS board_cards (
    id          TEXT PRIMARY KEY,
    board_id    TEXT NOT NULL REFERENCES boards(id),
    postcard_id TEXT NOT NULL REFERENCES postcards(id),
    placed_by   TEXT NOT NULL REFERENCES users(id),
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    rotation    REAL NOT NULL,
    created_at  INTEGER NOT NULL,
    UNIQUE (board_id, postcard_id)
  );
  CREATE INDEX IF NOT EXISTS idx_board_cards_board ON board_cards(board_id);

  -- A postcard shared via a public link, before it has a registered recipient.
  -- Anyone who opens the link can preview the card; registering / logging in
  -- through it delivers a copy to their mailbox and befriends the sender.
  CREATE TABLE IF NOT EXISTS shares (
    token      TEXT PRIMARY KEY,
    sender_id  TEXT NOT NULL REFERENCES users(id),
    payload    TEXT NOT NULL,        -- JSON, same shape as postcards.payload
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_shares_sender ON shares(sender_id);

  -- Who has already claimed a shared link, so re-opening it doesn't deliver the
  -- same card twice. One row per (link, user).
  CREATE TABLE IF NOT EXISTS share_claims (
    token      TEXT NOT NULL REFERENCES shares(token),
    user_id    TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (token, user_id)
  );
`);

// Add the `liked` column to postcard tables created before it existed.
try {
  raw.exec('ALTER TABLE postcards ADD COLUMN liked INTEGER NOT NULL DEFAULT 0');
} catch {
  /* column already exists */
}

// Add the `lang` column so we can localise push/email in each user's language.
try {
  raw.exec('ALTER TABLE users ADD COLUMN lang TEXT');
} catch {
  /* column already exists */
}

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
