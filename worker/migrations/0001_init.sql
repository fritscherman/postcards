-- Users, postcards and invites for the Postcards app.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  pw_hash    TEXT NOT NULL,
  pw_salt    TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_postcards_recipient ON postcards(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_postcards_sender ON postcards(sender_id, created_at);

CREATE TABLE IF NOT EXISTS invites (
  token       TEXT PRIMARY KEY,
  inviter_id  TEXT NOT NULL REFERENCES users(id),
  email       TEXT,
  accepted_by TEXT REFERENCES users(id),
  created_at  INTEGER NOT NULL
);
