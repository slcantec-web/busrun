/**
 * Sisara Coach — Worker API
 * Routes (all under /api):
 *   POST   /api/bookings                (public)  create booking request
 *   GET    /api/bookings                (auth)    list/search/filter bookings
 *   GET    /api/bookings/:id            (auth)
 *   PATCH  /api/bookings/:id            (auth)    update status / internal notes
 *   GET    /api/customers               (auth)
 *   GET    /api/stats                   (auth)    dashboard counters
 *   GET    /api/calendar?month=YYYY-MM  (auth)
 *   POST   /api/auth/login              (public)
 *   POST   /api/auth/logout             (auth)
 *   GET    /api/auth/me                 (public)
 *   POST   /api/auth/change-password    (auth)
 *
 * Bindings expected in wrangler.toml:
 *   DB            -> D1 database
 *   ALLOWED_ORIGIN -> the site origin, e.g. https://sisaracoach.lk (for CORS)
 */

const SESSION_COOKIE = "sisara_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    try {
      const response = await route(request, env, url);
      return withCors(response, origin);
    } catch (err) {
      if (err instanceof HttpError) {
        return withCors(json({ error: err.message }, err.status), origin);
      }
      console.error(err);
      return withCors(json({ error: err.message || "Internal error" }, 500), origin);
    }
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  // ---- Public booking creation ----
  if (pathname === "/api/bookings" && method === "POST") {
    return createBooking(request, env);
  }

  // ---- Auth ----
  if (pathname === "/api/auth/login" && method === "POST") return login(request, env);
  if (pathname === "/api/auth/logout" && method === "POST") return logout(request, env);
  if (pathname === "/api/auth/me" && method === "GET") return me(request, env);
  if (pathname === "/api/auth/change-password" && method === "POST") {
    const admin = await requireAuth(request, env);
    return changePassword(request, env, admin);
  }

  // ---- Everything else requires a session ----
  const admin = await requireAuth(request, env);

  if (pathname === "/api/bookings" && method === "GET") return listBookings(request, env);
  const bookingMatch = pathname.match(/^\/api\/bookings\/(\d+)$/);
  if (bookingMatch && method === "GET") return getBooking(env, bookingMatch[1]);
  if (bookingMatch && method === "PATCH") return updateBooking(request, env, bookingMatch[1]);

  if (pathname === "/api/customers" && method === "GET") return listCustomers(env);
  if (pathname === "/api/stats" && method === "GET") return stats(env);
  if (pathname === "/api/calendar" && method === "GET") return calendar(request, env);

  return json({ error: "Not found" }, 404);
}

/* ------------------------- Bookings ------------------------- */

async function createBooking(request, env) {
  const body = await safeJson(request);
  const required = ["name", "mobile", "pickup", "destination", "date", "time", "passengers"];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === "") {
      return json({ error: `Missing field: ${field}` }, 400);
    }
  }
  const passengerCount = Number(body.passengers);
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 33) {
    return json({ error: "Invalid passenger count" }, 400);
  }
  const returnTrip = body.returnTrip === "yes" ? 1 : 0;

  const db = env.DB;

  // Upsert customer by mobile number.
  let customer = await db
    .prepare("SELECT id FROM customers WHERE mobile = ?")
    .bind(body.mobile.trim())
    .first();

  if (!customer) {
    const result = await db
      .prepare("INSERT INTO customers (name, mobile, email) VALUES (?, ?, ?)")
      .bind(body.name.trim(), body.mobile.trim(), body.email?.trim() || null)
      .run();
    customer = { id: result.meta.last_row_id };
  }

  const bus = await db.prepare("SELECT id FROM buses ORDER BY id LIMIT 1").first();

  const insert = await db
    .prepare(`
      INSERT INTO bookings
        (bus_id, customer_id, name, mobile, email, pickup, destination,
         journey_date, pickup_time, return_trip, return_date, passenger_count, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `)
    .bind(
      bus?.id ?? null,
      customer.id,
      body.name.trim(),
      body.mobile.trim(),
      body.email?.trim() || null,
      body.pickup.trim(),
      body.destination.trim(),
      body.date,
      body.time,
      returnTrip,
      returnTrip ? (body.returnDate || null) : null,
      passengerCount,
      body.notes?.trim() || null
    )
    .run();

  return json({ ok: true, id: insert.meta.last_row_id }, 201);
}

async function listBookings(request, env) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

  let sql = "SELECT * FROM bookings WHERE 1=1";
  const params = [];
  if (status) { sql += " AND status = ?"; params.push(status); }
  if (q) {
    sql += " AND (name LIKE ? OR mobile LIKE ? OR pickup LIKE ? OR destination LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY journey_date DESC, id DESC LIMIT ?";
  params.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return json({ bookings: results.map(mapBooking) });
}

async function getBooking(env, id) {
  const row = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return json({ booking: mapBooking(row) });
}

async function updateBooking(request, env, id) {
  const body = await safeJson(request);
  const allowedStatus = ["Pending", "Confirmed", "Cancelled", "Completed"];
  const sets = [];
  const params = [];

  if (body.status) {
    if (!allowedStatus.includes(body.status)) return json({ error: "Invalid status" }, 400);
    sets.push("status = ?");
    params.push(body.status);
  }
  if (body.internalNotes !== undefined) {
    sets.push("internal_notes = ?");
    params.push(body.internalNotes);
  }
  if (!sets.length) return json({ error: "Nothing to update" }, 400);

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  await env.DB.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  const row = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first();
  return json({ booking: mapBooking(row) });
}

function mapBooking(row) {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    pickup: row.pickup,
    destination: row.destination,
    journeyDate: row.journey_date,
    pickupTime: row.pickup_time,
    returnTrip: Boolean(row.return_trip),
    returnDate: row.return_date,
    passengerCount: row.passenger_count,
    notes: row.notes,
    internalNotes: row.internal_notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

/* ------------------------- Customers ------------------------- */

async function listCustomers(env) {
  const { results } = await env.DB.prepare(`
    SELECT c.*, COUNT(b.id) AS booking_count
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
  return json({
    customers: results.map((c) => ({
      id: c.id, name: c.name, mobile: c.mobile, email: c.email, bookingCount: c.booking_count,
    })),
  });
}

/* ------------------------- Stats & Calendar ------------------------- */

async function stats(env) {
  const rows = await env.DB.prepare(`
    SELECT status, COUNT(*) AS n FROM bookings GROUP BY status
  `).all();
  const counts = { Pending: 0, Confirmed: 0, Cancelled: 0, Completed: 0 };
  rows.results.forEach((r) => { counts[r.status] = r.n; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return json({
    total,
    pending: counts.Pending,
    confirmed: counts.Confirmed,
    cancelled: counts.Cancelled,
    completed: counts.Completed,
  });
}

async function calendar(request, env) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return json({ error: "month=YYYY-MM required" }, 400);

  const { results } = await env.DB.prepare(`
    SELECT id, name, journey_date, status FROM bookings
    WHERE journey_date LIKE ? AND status != 'Cancelled'
    ORDER BY journey_date ASC
  `).bind(`${month}%`).all();

  return json({
    bookings: results.map((r) => ({ id: r.id, name: r.name, journeyDate: r.journey_date, status: r.status })),
  });
}

/* ------------------------- Auth ------------------------- */

async function login(request, env) {
  const body = await safeJson(request);
  if (!body.username || !body.password) return json({ error: "Missing credentials" }, 400);

  const user = await env.DB.prepare("SELECT * FROM admin_users WHERE username = ?")
    .bind(body.username.trim())
    .first();
  if (!user) return json({ error: "Invalid credentials" }, 401);

  const ok = await verifyPassword(body.password, user.password_salt, user.password_hash);
  if (!ok) return json({ error: "Invalid credentials" }, 401);

  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, admin_user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expiresAt)
    .run();

  const res = json({ ok: true });
  res.headers.append("Set-Cookie", buildSessionCookie(token, SESSION_TTL_MS / 1000));
  return res;
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", buildSessionCookie("", 0));
  return res;
}

async function me(request, env) {
  const admin = await getSessionAdmin(request, env);
  return json({ authenticated: Boolean(admin), username: admin?.username || null });
}

async function changePassword(request, env, admin) {
  const body = await safeJson(request);
  if (!body.currentPassword || !body.newPassword) return json({ error: "Missing fields" }, 400);
  if (String(body.newPassword).length < 8) return json({ error: "New password too short" }, 400);

  const ok = await verifyPassword(body.currentPassword, admin.password_salt, admin.password_hash);
  if (!ok) return json({ error: "Current password is incorrect" }, 401);

  const { hash, salt } = await hashPassword(body.newPassword);
  await env.DB.prepare("UPDATE admin_users SET password_hash = ?, password_salt = ? WHERE id = ?")
    .bind(hash, salt, admin.id)
    .run();

  return json({ ok: true });
}

async function requireAuth(request, env) {
  const admin = await getSessionAdmin(request, env);
  if (!admin) throw new HttpError(401, "Not authenticated");
  return admin;
}

async function getSessionAdmin(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const session = await env.DB.prepare("SELECT * FROM sessions WHERE token = ?").bind(token).first();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return env.DB.prepare("SELECT * FROM admin_users WHERE id = ?").bind(session.admin_user_id).first();
}

/* ------------------------- Password hashing (PBKDF2) ------------------------- */

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuffer = await pbkdf2(password, salt);
  return { hash: bufToB64(hashBuffer), salt: bufToB64(salt) };
}

async function verifyPassword(password, saltB64, hashB64) {
  const salt = b64ToBuf(saltB64);
  const hashBuffer = await pbkdf2(password, salt);
  return bufToB64(hashBuffer) === hashB64;
}

async function pbkdf2(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/* ------------------------- Helpers ------------------------- */

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withCors(response, origin) {
  const res = new Response(response.body, response);
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function buildSessionCookie(value, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function safeJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}
