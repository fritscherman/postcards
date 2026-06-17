import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// SQLite file location — keep it on a persistent volume in production.
const DB_PATH = resolve(process.env.DB_PATH ?? './data/postcards.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema is created on startup; safe to run every time.
db.exec(`
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
`);
