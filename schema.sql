-- Sisara Coach / BusRun — D1 schema
-- Safe to paste directly into the Cloudflare D1 console, or apply with:
--   wrangler d1 execute busrun-db --file=./worker/schema.sql
--
-- NOTE: the original syntax error came from putting a `-- comment` on the
-- same line as SQL when run via `--command "...one line..."`. Everything
-- after `--` on a line is ignored by SQLite, which silently swallowed the
-- rest of the statement (closing paren + semicolon) and caused
-- "incomplete input: SQLITE_ERROR". Comments below are on their own lines
-- so this is safe however you run it.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS buses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_name            TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  seat_capacity       INTEGER NOT NULL,
  -- status: Active | Maintenance | Retired
  status              TEXT NOT NULL DEFAULT 'Active',
  created_at          TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  mobile      TEXT NOT NULL UNIQUE,
  email       TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id           INTEGER REFERENCES buses(id),
  customer_id      INTEGER NOT NULL REFERENCES customers(id),
  -- name/mobile/email below are a denormalised snapshot at time of request
  name             TEXT NOT NULL,
  mobile           TEXT NOT NULL,
  email            TEXT,
  pickup           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  journey_date     TEXT NOT NULL,
  pickup_time      TEXT NOT NULL,
  return_trip      INTEGER NOT NULL DEFAULT 0,
  return_date      TEXT,
  passenger_count  INTEGER NOT NULL,
  notes            TEXT,
  internal_notes   TEXT,
  -- status: Pending | Confirmed | Cancelled | Completed
  status           TEXT NOT NULL DEFAULT 'Pending',
  created_at       TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at       TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (journey_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS sessions (
  token           TEXT PRIMARY KEY,
  admin_user_id   INTEGER NOT NULL REFERENCES admin_users(id),
  expires_at      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Seed the single bus this business currently operates.
INSERT INTO buses (bus_name, registration_number, seat_capacity, status)
SELECT 'Sisara Coach', 'TBD-0000', 33, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM buses);

-- NOTE: no default admin user is seeded here on purpose (never ship a
-- known password). Create one with worker/scripts/create-admin.js.
