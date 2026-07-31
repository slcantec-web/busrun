// Shared behaviour across all public pages: mobile nav toggle + scroll
// reveal animations. Photo rendering lives in its own files
// (site-images.js / site-images-render.js / hero-slideshow.js).
document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initRevealAnimations();
});

// .nav-collapse holds BOTH the page links and the lang-switch/Book Now
// button, so opening/closing the hamburger shows or hides everything
// together — nothing is left stranded in the top bar on narrow screens.
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const collapse = document.querySelector(".nav-collapse");
  if (!toggle || !collapse) return;
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

// Fades/slides any element with class="reveal" into place the first time
// it scrolls into view. Falls back to showing everything immediately if
// IntersectionObserver isn't available.
function initRevealAnimations() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}
