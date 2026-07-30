-- Sisara Coach — D1 schema
-- Apply with: wrangler d1 execute sisara-coach-db --file=./worker/schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS buses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_name            TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  seat_capacity       INTEGER NOT NULL,
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
  name             TEXT NOT NULL,   -- denormalised snapshot at time of request
  mobile           TEXT NOT NULL,
  email            TEXT,
  pickup           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  journey_date     TEXT NOT NULL,  -- ISO date
  pickup_time      TEXT NOT NULL,  -- HH:MM
  return_trip      INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  return_date      TEXT,
  passenger_count  INTEGER NOT NULL,
  notes            TEXT,           -- customer-provided
  internal_notes   TEXT,           -- admin-only
  status            TEXT NOT NULL DEFAULT 'Pending', -- Pending | Confirmed | Cancelled | Completed
  created_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (journey_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL, -- base64 PBKDF2 hash
  password_salt   TEXT NOT NULL, -- base64 salt
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

-- NOTE: no default admin user is seeded here on purpose (never ship a known
-- password). Create one with worker/scripts/create-admin.js — see README.
