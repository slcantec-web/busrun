// Generic renderer for /js/site-images.js. Fills in any element tagged
// with the data attributes below — no page-specific code needed.
//
//   <img data-site-image="featuredBus" alt="...">
//     -> sets that img's src (and alt, if not already set) from
//        SITE_IMAGES.featuredBus, with automatic fallback on error.
//
//   <div data-site-image-list="busGallery"></div>
//     -> appends one <img> per entry in SITE_IMAGES.busGallery.
//
// The homepage hero slideshow is handled separately (see
// hero-slideshow.js) since it needs cycling/crossfade behaviour that a
// single <img> can't do — but it still reads its photo list from the
// same SITE_IMAGES config file.
(function () {
  const CFG = window.SITE_IMAGES || {};

  function withFallback(img, fallbackSrc) {
    if (!fallbackSrc) return;
    img.addEventListener("error", () => { img.src = fallbackSrc; }, { once: true });
  }

  // Single images
  document.querySelectorAll("img[data-site-image]").forEach((img) => {
    const key = img.getAttribute("data-site-image");
    const entry = CFG[key];
    if (!entry || !entry.src) return;
    if (entry.alt && !img.getAttribute("alt")) img.alt = entry.alt;
    withFallback(img, entry.fallback);
    img.src = entry.src;
  });

  // Image grids/lists
  document.querySelectorAll("[data-site-image-list]").forEach((container) => {
    const key = container.getAttribute("data-site-image-list");
    const list = CFG[key];
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const img = document.createElement("img");
      img.alt = item.alt || "";
      img.loading = "lazy";
      withFallback(img, item.fallback);
      img.src = item.src;
      container.appendChild(img);
    });
  });
})();
