/**
 * One-off helper to create (or reset) the first admin user.
 *
 * D1 can't run this directly (no Web Crypto access from the CLI), so:
 *  1. Run this file with Node to print the SQL to run.
 *  2. Pipe/paste that SQL into `wrangler d1 execute`.
 *
 * Usage:
 *   node worker/scripts/create-admin.js <username> <password>
 *
 * Example:
 *   node worker/scripts/create-admin.js owner "a-strong-password"
 *   wrangler d1 execute sisara-coach-db --command "$(node worker/scripts/create-admin.js owner 'a-strong-password')"
 */

const crypto = require("crypto");

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error("Usage: node create-admin.js <username> <password>");
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

const saltB64 = salt.toString("base64");
const hashB64 = hash.toString("base64");

const sql =
  `INSERT INTO admin_users (username, password_hash, password_salt) ` +
  `VALUES ('${username.replace(/'/g, "''")}', '${hashB64}', '${saltB64}') ` +
  `ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash, password_salt=excluded.password_salt;`;

console.log(sql);
