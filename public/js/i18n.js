/**
 * Minimal i18n engine.
 * - Reads/writes the chosen language to localStorage so it is remembered.
 * - Loads /locales/{lang}.json and applies strings to any element carrying
 *   data-i18n="dot.path" (textContent) or data-i18n-placeholder="dot.path".
 * - Exposes window.i18n.t(path) and window.i18n.applyWhatsAppTemplate(vars)
 *   for pages (like booking.js) that need a translated string in JS.
 */
(function () {
  const STORAGE_KEY = "sisara_lang";
  const SUPPORTED = ["en", "si"];
  const DEFAULT_LANG = "en";

  function getStoredLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (e) { /* localStorage unavailable */ }
    return null;
  }

  function detectBrowserLang() {
    const nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("si") ? "si" : DEFAULT_LANG;
  }

  function resolvePath(dict, path) {
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
  }

  const i18n = {
    lang: getStoredLang() || detectBrowserLang(),
    dict: {},

    async load(lang) {
      const res = await fetch(`/locales/${lang}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Could not load locale: ${lang}`);
      this.dict = await res.json();
      this.lang = lang;
      document.documentElement.setAttribute("lang", lang);
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    },

    t(path, fallback) {
      const value = resolvePath(this.dict, path);
      return value !== undefined ? value : (fallback || path);
    },

    applyToDom(root = document) {
      root.querySelectorAll("[data-i18n]").forEach((el) => {
        const text = this.t(el.getAttribute("data-i18n"));
        el.textContent = text;
      });
      root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.setAttribute("placeholder", this.t(el.getAttribute("data-i18n-placeholder")));
      });
      root.querySelectorAll("[data-i18n-html]").forEach((el) => {
        el.innerHTML = this.t(el.getAttribute("data-i18n-html"));
      });
      root.querySelectorAll(".lang-switch button").forEach((btn) => {
        btn.setAttribute("aria-pressed", btn.dataset.lang === this.lang ? "true" : "false");
      });
    },

    async setLang(lang) {
      if (!SUPPORTED.includes(lang) || lang === this.lang && Object.keys(this.dict).length) {
        if (lang === this.lang) return;
      }
      await this.load(lang);
      this.applyToDom();
      document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
    },

    async init() {
      await this.load(this.lang);
      this.applyToDom();
      document.querySelectorAll(".lang-switch button").forEach((btn) => {
        btn.addEventListener("click", () => this.setLang(btn.dataset.lang));
      });
      document.dispatchEvent(new CustomEvent("i18n:ready", { detail: { lang: this.lang } }));
    },
  };

  window.i18n = i18n;
  document.addEventListener("DOMContentLoaded", () => i18n.init());
})();
