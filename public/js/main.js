// Shared behaviour across all public pages: mobile nav toggle.
// .nav-collapse holds BOTH the page links and the lang-switch/Book Now
// button, so opening/closing the hamburger shows or hides everything
// together — nothing is left stranded in the top bar on narrow screens.
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const collapse = document.querySelector(".nav-collapse");
  if (toggle && collapse) {
    toggle.addEventListener("click", () => {
      const isOpen = collapse.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    collapse.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        collapse.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }
});
