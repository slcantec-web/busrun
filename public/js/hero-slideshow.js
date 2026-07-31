// Homepage hero slideshow: crossfades between the photos listed in
// /js/hero-images.js, with a slow "Ken Burns" zoom on the active slide.
// Every image is preloaded first, so a missing/broken file is skipped
// silently instead of flashing a blank or broken slide.
(function () {
  const mount = document.getElementById("hero-slideshow");
  if (!mount) return; // this script only does anything on the homepage

  const INTERVAL_MS = 6500;
  const primary = window.HERO_IMAGES || [];
  const fallback = window.HERO_IMAGES_FALLBACK || [];

  function preload(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function buildSlides(sources) {
    sources.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "hero-slide" + (i === 0 ? " active" : "");
      slide.style.backgroundImage = `url("${src}")`;
      mount.appendChild(slide);
    });
  }

  function startCycle() {
    const slides = mount.querySelectorAll(".hero-slide");
    if (slides.length < 2) return; // one photo: nothing to cycle
    let current = 0;
    setInterval(() => {
      const next = (current + 1) % slides.length;
      slides[current].classList.remove("active");
      slides[next].classList.add("active");
      current = next;
    }, INTERVAL_MS);
  }

  (async function init() {
    let usable = (await Promise.all(primary.map(preload))).filter(Boolean);

    if (!usable.length) {
      // None of the site owner's own photos loaded — fall back to stock
      // photos so the hero still has something to show.
      usable = (await Promise.all(fallback.map(preload))).filter(Boolean);
    }
    if (!usable.length) return; // hero keeps its solid teal background

    buildSlides(usable);
    startCycle();
  })();
})();
