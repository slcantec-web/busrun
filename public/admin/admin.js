// Shared admin dashboard logic. Each admin page sets document.body's
// data-page attribute; the matching init function below wires it up.
// Session auth is a Worker-set httpOnly cookie — every call below sends
// credentials so the Worker can read it.

// TODO: no custom domain yet, so Pages (busrun.pages.dev) and the Worker
// (busrun-api.<your-subdomain>.workers.dev) are different origins — API_BASE
// must be the full Worker URL, not a relative "/api" path. Find
// <your-subdomain> in the output of `wrangler deploy`, or on the Cloudflare
// dashboard under Workers & Pages. Once you attach a real domain and route
// /api/* to the Worker on that same domain, switch this back to "/api".
const API_BASE = "https://busrun.slcantec.workers.dev/api";

const Admin = (() => {
  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (res.status === 401) {
      window.location.href = "/admin/login.html";
      throw new Error("Not authenticated");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function requireAuth() {
    try {
      const me = await api("/auth/me");
      if (!me.authenticated) window.location.href = "/admin/login.html";
      return me;
    } catch (e) {
      window.location.href = "/admin/login.html";
    }
  }

  function markActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll(".admin-nav a[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === page);
    });
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await api("/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/admin/login.html";
      })
    );
  }

  function statusPillHtml(status) {
    const key = (status || "pending").toLowerCase();
    return `<span class="status-pill status-${key}">${status}</span>`;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // ---------------- Dashboard ----------------
  async function initDashboard() {
    const stats = await api("/stats");
    const map = {
      total: stats.total, pending: stats.pending, confirmed: stats.confirmed,
      cancelled: stats.cancelled, completed: stats.completed,
    };
    Object.entries(map).forEach(([key, val]) => {
      const el = document.querySelector(`[data-stat="${key}"]`);
      if (el) el.textContent = val ?? 0;
    });

    const recent = await api("/bookings?limit=6");
    const tbody = document.querySelector("#recent-bookings tbody");
    if (tbody) {
      tbody.innerHTML = recent.bookings.length
        ? recent.bookings.map((b) => `
          <tr>
            <td>${escapeHtml(b.name)}</td>
            <td>${escapeHtml(b.pickup)} → ${escapeHtml(b.destination)}</td>
            <td>${escapeHtml(b.journeyDate)}</td>
            <td>${statusPillHtml(b.status)}</td>
          </tr>`).join("")
        : `<tr><td colspan="4" class="empty-state">No booking requests yet.</td></tr>`;
    }
  }

  // ---------------- Bookings ----------------
  async function initBookings() {
    const tbody = document.querySelector("#bookings-table tbody");
    const searchInput = document.getElementById("booking-search");
    const statusFilter = document.getElementById("booking-status-filter");
    const modal = document.getElementById("booking-modal");
    const modalBody = document.getElementById("booking-modal-body");

    async function render() {
      const params = new URLSearchParams();
      if (searchInput.value) params.set("q", searchInput.value);
      if (statusFilter.value) params.set("status", statusFilter.value);
      const { bookings } = await api(`/bookings?${params.toString()}`);

      tbody.innerHTML = bookings.length
        ? bookings.map((b) => `
          <tr>
            <td>${escapeHtml(b.name)}<br><span style="color:rgba(22,33,29,0.55);font-size:0.8rem;">${escapeHtml(b.mobile)}</span></td>
            <td>${escapeHtml(b.pickup)} → ${escapeHtml(b.destination)}</td>
            <td>${escapeHtml(b.journeyDate)} ${escapeHtml(b.pickupTime || "")}</td>
            <td>${b.passengerCount}</td>
            <td>${statusPillHtml(b.status)}</td>
            <td class="row-actions">
              <button data-view="${b.id}">View</button>
              ${b.status !== "Confirmed" ? `<button class="confirm" data-confirm="${b.id}">Confirm</button>` : ""}
              ${b.status !== "Completed" ? `<button data-complete="${b.id}">Complete</button>` : ""}
              ${b.status !== "Cancelled" ? `<button class="danger" data-cancel="${b.id}">Cancel</button>` : ""}
            </td>
          </tr>`).join("")
        : `<tr><td colspan="6" class="empty-state">No bookings match your filters.</td></tr>`;

      tbody.querySelectorAll("[data-view]").forEach((btn) =>
        btn.addEventListener("click", () => openDetail(btn.dataset.view, bookings)));
      tbody.querySelectorAll("[data-confirm]").forEach((btn) =>
        btn.addEventListener("click", () => updateStatus(btn.dataset.confirm, "Confirmed")));
      tbody.querySelectorAll("[data-complete]").forEach((btn) =>
        btn.addEventListener("click", () => updateStatus(btn.dataset.complete, "Completed")));
      tbody.querySelectorAll("[data-cancel]").forEach((btn) =>
        btn.addEventListener("click", () => updateStatus(btn.dataset.cancel, "Cancelled")));
    }

    async function updateStatus(id, status) {
      await api(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      render();
    }

    function openDetail(id, bookings) {
      const b = bookings.find((x) => String(x.id) === String(id));
      if (!b) return;
      modalBody.innerHTML = `
        <h2>${escapeHtml(b.name)}</h2>
        <p style="color:rgba(22,33,29,0.6);margin-top:-8px;">${statusPillHtml(b.status)}</p>
        <div class="form-grid" style="margin-top:16px;">
          <div class="field"><label>Mobile</label><p>${escapeHtml(b.mobile)}</p></div>
          <div class="field"><label>Email</label><p>${escapeHtml(b.email || "—")}</p></div>
          <div class="field"><label>Pickup</label><p>${escapeHtml(b.pickup)}</p></div>
          <div class="field"><label>Destination</label><p>${escapeHtml(b.destination)}</p></div>
          <div class="field"><label>Journey date</label><p>${escapeHtml(b.journeyDate)} ${escapeHtml(b.pickupTime || "")}</p></div>
          <div class="field"><label>Return trip</label><p>${b.returnTrip ? `Yes — ${escapeHtml(b.returnDate || "")}` : "No"}</p></div>
          <div class="field"><label>Passengers</label><p>${b.passengerCount}</p></div>
          <div class="field full"><label>Customer notes</label><p>${escapeHtml(b.notes || "—")}</p></div>
        </div>
        <div class="field full" style="margin-top:10px;">
          <label for="internal-notes">Internal notes</label>
          <textarea id="internal-notes">${escapeHtml(b.internalNotes || "")}</textarea>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button class="btn btn-primary" id="save-notes">Save notes</button>
          <button class="btn btn-outline" id="close-modal">Close</button>
        </div>`;
      modal.classList.add("open");
      document.getElementById("close-modal").addEventListener("click", () => modal.classList.remove("open"));
      document.getElementById("save-notes").addEventListener("click", async () => {
        await api(`/bookings/${b.id}`, {
          method: "PATCH",
          body: JSON.stringify({ internalNotes: document.getElementById("internal-notes").value }),
        });
        modal.classList.remove("open");
        render();
      });
    }

    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
    searchInput.addEventListener("input", debounce(render, 250));
    statusFilter.addEventListener("change", render);
    render();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ---------------- Calendar ----------------
  async function initCalendar() {
    const grid = document.getElementById("cal-grid");
    const label = document.getElementById("cal-month-label");
    let cursor = new Date();
    cursor.setDate(1);

    async function render() {
      const monthStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      label.textContent = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const { bookings } = await api(`/calendar?month=${monthStr}`);
      const byDate = {};
      bookings.forEach((b) => {
        (byDate[b.journeyDate] ||= []).push(b);
      });

      const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const startOffset = firstDay.getDay();
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

      let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        .map((d) => `<div class="cal-head">${d}</div>`).join("");

      for (let i = 0; i < startOffset; i++) html += `<div class="cal-cell muted"></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayBookings = byDate[dateStr] || [];
        const badges = dayBookings.map((b) =>
          `<span class="badge ${b.status === "Confirmed" ? "confirmed" : "pending"}">${escapeHtml(b.name)}</span>`
        ).join("");
        html += `<div class="cal-cell"><span class="num">${d}</span>${badges}</div>`;
      }
      grid.innerHTML = html;
    }

    document.getElementById("cal-prev").addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() - 1); render();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + 1); render();
    });
    render();
  }

  // ---------------- Customers ----------------
  async function initCustomers() {
    const tbody = document.querySelector("#customers-table tbody");
    const { customers } = await api("/customers");
    tbody.innerHTML = customers.length
      ? customers.map((c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.mobile)}</td>
          <td>${escapeHtml(c.email || "—")}</td>
          <td>${c.bookingCount ?? 0}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="empty-state">No customers yet.</td></tr>`;
  }

  // ---------------- Login ----------------
  function initLogin() {
    const form = document.getElementById("login-form");
    const errorEl = document.getElementById("login-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await api("/auth/login", { method: "POST", body: JSON.stringify(data) });
        window.location.href = "/admin/dashboard.html";
      } catch (err) {
        errorEl.textContent = "Invalid username or password.";
      }
    });
  }

  // ---------------- Settings ----------------
  function initSettings() {
    const form = document.getElementById("password-form");
    const status = document.getElementById("settings-status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      status.textContent = "";
      try {
        await api("/auth/change-password", { method: "POST", body: JSON.stringify(data) });
        status.textContent = "Password updated.";
        status.style.color = "var(--leaf)";
        form.reset();
      } catch (err) {
        status.textContent = err.message || "Could not update password.";
        status.style.color = "var(--signal)";
      }
    });
  }

  async function boot() {
    const page = document.body.dataset.page;
    bindLogout();
    markActiveNav();

    if (page === "login") return initLogin();

    await requireAuth();
    if (page === "dashboard") return initDashboard();
    if (page === "bookings") return initBookings();
    if (page === "calendar") return initCalendar();
    if (page === "customers") return initCustomers();
    if (page === "settings") return initSettings();
  }

  document.addEventListener("DOMContentLoaded", boot);

  return { api };
})();
