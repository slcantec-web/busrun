// Booking form: validation, submission to the Worker API, and the
// WhatsApp hand-off described in the spec (section 5 & 6).
(function () {
  const WHATSAPP_NUMBER = "94770000000"; // TODO: replace with the live business number (no leading +/0)

  // TODO: no custom domain yet, so Pages (busrun.pages.dev) and the Worker
  // (busrun-api.<your-subdomain>.workers.dev) are different origins —
  // this must be the full Worker URL, not a relative "/api/bookings" path.
  // Find <your-subdomain> in the output of `wrangler deploy`, or on the
  // Cloudflare dashboard under Workers & Pages. Once you attach a real
  // domain and route /api/* to the Worker on that same domain, switch
  // this back to the relative path "/api/bookings".
  const API_ENDPOINT = "https://busrun.slcantec.workers.dev/api/bookings";

  const form = document.getElementById("booking-form");
  if (!form) return;

  const submitBtn = document.getElementById("submit-btn");
  const statusSuccess = document.getElementById("status-success");
  const statusError = document.getElementById("status-error");
  const whatsappLink = document.getElementById("whatsapp-link");
  const returnRadios = form.querySelectorAll('input[name="returnTrip"]');
  const returnDateField = document.getElementById("return-date-field");

  function toggleReturnDate() {
    const isReturn = form.querySelector('input[name="returnTrip"]:checked').value === "yes";
    returnDateField.style.display = isReturn ? "flex" : "none";
    document.getElementById("returnDate").required = isReturn;
  }
  returnRadios.forEach((r) => r.addEventListener("change", toggleReturnDate));

  function setFieldError(name, message) {
    const field = form.querySelector(`[name="${name}"]`)?.closest(".field");
    const errEl = form.querySelector(`[data-error-for="${name}"]`);
    if (errEl) errEl.textContent = message || "";
    if (field) field.classList.toggle("has-error", Boolean(message));
  }

  function clearErrors() {
    form.querySelectorAll(".error-text").forEach((el) => (el.textContent = ""));
    form.querySelectorAll(".field").forEach((el) => el.classList.remove("has-error"));
  }

  function isValidMobile(value) {
    return /^[0-9+\s-]{9,15}$/.test(value.trim());
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function validate(data) {
    const t = (path) => window.i18n.t(`booking.validation.${path}`);
    let valid = true;

    ["name", "mobile", "pickup", "destination", "date", "time"].forEach((field) => {
      if (!data[field] || !data[field].trim()) {
        setFieldError(field, t("required"));
        valid = false;
      }
    });

    if (data.mobile && !isValidMobile(data.mobile)) {
      setFieldError("mobile", t("mobile"));
      valid = false;
    }
    if (data.email && !isValidEmail(data.email)) {
      setFieldError("email", t("email"));
      valid = false;
    }
    if (data.date && data.date < todayISO()) {
      setFieldError("date", t("date_past"));
      valid = false;
    }
    if (data.returnTrip === "yes") {
      if (!data.returnDate) {
        setFieldError("returnDate", t("required"));
        valid = false;
      } else if (data.returnDate < data.date) {
        setFieldError("returnDate", t("date_past"));
        valid = false;
      }
    }
    const passengers = Number(data.passengers);
    if (!passengers || passengers < 1 || passengers > 33) {
      setFieldError("passengers", t("passengers"));
      valid = false;
    }

    return valid;
  }

  function buildWhatsAppMessage(data) {
    const template = window.i18n.t("booking.wa_template");
    return template
      .replace("{name}", data.name)
      .replace("{date}", data.date)
      .replace("{pickup}", data.pickup)
      .replace("{destination}", data.destination)
      .replace("{passengers}", data.passengers)
      .replace("{returnTrip}", data.returnTrip === "yes" ? window.i18n.t("booking.return_yes") : window.i18n.t("booking.return_no"))
      .replace("{notes}", data.notes || "-");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    statusSuccess.classList.remove("visible");
    statusError.classList.remove("visible");

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!validate(data)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = window.i18n.t("booking.submitting");

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const waMessage = buildWhatsAppMessage(data);
      whatsappLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
      statusSuccess.classList.add("visible");
      form.querySelectorAll("input, textarea, button[type=submit]").forEach((el) => (el.disabled = true));
      statusSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      statusError.classList.add("visible");
      statusError.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = window.i18n.t("booking.submit");
    }
  });

  document.getElementById("date")?.setAttribute("min", todayISO());
  toggleReturnDate();
})();
