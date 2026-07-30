# Sisara Coach — Bus Hire Website & Booking Management System

Phase 1 implementation: public website with a booking request form,
WhatsApp hand-off, and a password-protected admin dashboard for managing
requests, a one-bus calendar, and customers. Built on Cloudflare Pages
(static frontend) + Cloudflare Workers (API) + Cloudflare D1 (database),
per the project brief.

## Project layout

```
public/              → deploy this folder to Cloudflare Pages
  index.html, about.html, bus-details.html, services.html,
  gallery.html, contact.html, booking.html
  css/style.css       → design system (shared by all public pages)
  js/i18n.js           → language switcher (English / සිංහල), remembers choice
  js/main.js            → mobile nav toggle
  js/booking.js          → booking form validation + submit + WhatsApp link
  locales/en.json, si.json → all translated strings
  admin/                → admin dashboard (separate, simple auth-gated app)
    login.html, dashboard.html, bookings.html, calendar.html,
    customers.html, settings.html, admin.css, admin.js

worker/               → deploy as a Cloudflare Worker (the API)
  src/index.js          → all /api/* routes
  schema.sql             → D1 table definitions
  scripts/create-admin.js → generates the SQL to create your first admin login

wrangler.toml          → Worker + D1 binding config
```

## 1. Create the D1 database

```bash
wrangler d1 create sisara-coach-db
```

Copy the `database_id` it prints into `wrangler.toml`.

Apply the schema:

```bash
wrangler d1 execute sisara-coach-db --file=./worker/schema.sql
```

## 2. Create your admin login

No default admin account is seeded (never ship a known password). Generate one:

```bash
node worker/scripts/create-admin.js owner "choose-a-strong-password"
```

That prints an `INSERT` statement — run it against your database:

```bash
wrangler d1 execute sisara-coach-db --command "PASTE_THE_PRINTED_SQL_HERE"
```

## 3. Configure and deploy the Worker (API)

Edit `wrangler.toml`:
- Set `ALLOWED_ORIGIN` to your live site URL (needed for CORS on the login cookie).
- Uncomment `routes` and point it at `yourdomain.com/api/*`.

```bash
wrangler deploy
```

## 4. Deploy the website (Cloudflare Pages)

Point a Pages project at the `public/` folder (no build step needed for
Phase 1 — plain HTML/CSS/JS as specified). Either connect the repo in the
Cloudflare dashboard with **Build output directory: `public`**, or:

```bash
wrangler pages deploy public --project-name=sisara-coach
```

Make sure the Pages project and the Worker route share the same domain so
`/api/*` calls and the session cookie work same-origin.

## 5. Before going live

- Replace the WhatsApp number in `public/js/booking.js` (`WHATSAPP_NUMBER`) and
  the phone/WhatsApp/email links in `public/contact.html` and `public/index.html`.
- Replace placeholder images in `public/images/` (the pages fall back to
  stock photos via `onerror` until you do).
- Update the Google Maps embed src in `contact.html` with your real address.
- Update `wrangler.toml`'s `database_id` and `ALLOWED_ORIGIN`.

## How the booking flow works (per the spec)

1. Customer fills in the form on `booking.html`.
2. Client-side validation runs first (required fields, mobile/email format,
   future date, passenger count 1–33).
3. On submit, the form POSTs to `/api/bookings`. The Worker upserts the
   customer by mobile number and inserts a `Pending` booking row in D1.
4. On success, a "Send details on WhatsApp" button appears with a
   pre-filled message built from the same data, in whichever language is
   currently selected.

## Admin dashboard

- `/admin/login.html` — the Worker issues an `HttpOnly` session cookie on
  success (12-hour expiry, PBKDF2-hashed passwords, 100,000 iterations).
- `/admin/dashboard.html` — totals by status + recent requests.
- `/admin/bookings.html` — search, filter by status, confirm / complete /
  cancel, and add internal notes (never shown to the customer).
- `/admin/calendar.html` — month view; pending vs. confirmed bookings per
  day, since the business runs a single bus and double-booking must be
  visible at a glance.
- `/admin/customers.html` — read-only customer list with booking counts.
- `/admin/settings.html` — change the admin password. (A full settings
  editor for contact details is listed under Future Enhancements in the
  brief; for now those are edited directly in the HTML/JS files.)

The admin UI is English-only for this phase, as specified.

## Multi-language support

English and Sinhala (සිංහල) are implemented via `js/i18n.js`, which loads
`locales/{lang}.json` and swaps any element tagged `data-i18n="path.to.key"`.
The chosen language is stored in `localStorage` so it's remembered on
return visits, and the WhatsApp message template is translated too. Tamil
is listed as a future enhancement in the brief — add `locales/ta.json` and
a third button in the `.lang-switch` markup when ready.

## Security notes already in place

- Passwords hashed with PBKDF2-SHA256 (100,000 iterations), never stored
  in plaintext.
- Sessions are random 64+ character tokens stored server-side in D1, not
  JWTs — logout invalidates them immediately.
- Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`.
- All admin routes require a valid session; booking creation is the only
  public write endpoint, and it's validated server-side too (not just in
  the browser).
- D1 access uses parameterised queries throughout (no string-built SQL),
  which is the main SQL-injection defence.

Still to add before production: rate limiting on `/api/bookings` and
`/api/auth/login` (e.g. via Cloudflare's built-in rate limiting rules or a
Durable Object), and CSRF protection if you later add cookie-authenticated
state-changing requests from third-party origins.

## What's not built yet (see brief §14/§16, Phase 2 & 3)

Multiple buses, driver management, online payments, SMS/email
notifications, customer accounts, invoice generation, reports/analytics,
and the customer portal / mobile app / GPS tracking are intentionally out
of scope for this Phase 1 build. The schema (`buses` table, `bus_id` on
bookings) is already shaped so multiple buses can be added later without a
redesign, per the brief's scalability goal.
