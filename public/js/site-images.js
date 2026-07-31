/**
 * Site-wide photo list — the ONE file to edit for every photo on the
 * site: the homepage hero slideshow, the "Fleet" and "About" highlight
 * photos, the bus-details gallery, and the main gallery page.
 * =================================================================
 * HOW TO ADD YOUR OWN PHOTOS:
 *   1. Drop photos into /public/images/ (any filenames you like).
 *   2. Find the matching section below and set "src" to your path
 *      (or any external URL — both work).
 *   3. "alt" is a short description (accessibility/SEO). "fallback"
 *      is an optional stock photo shown automatically if "src" fails
 *      to load — remove it once your real photo is confirmed working.
 *   4. Save this file and refresh the page. Nothing else needs to
 *      change — no HTML or CSS editing required for any of this.
 *
 * Reminder: a static site can't scan your /images/ folder on its own
 * (no server is "listing" what's in there) — this file is what tells
 * every page which files to use, in which order.
 * ================================================================= */

window.SITE_IMAGES = {

  // Homepage hero — cycles through these automatically every ~6.5s.
  // List as many as you like; a single photo just won't cycle.
  hero: {
    images: [
      "/images/hero-bus.jpg",
      "/images/hero-bus-2.jpg",
      "/images/hero-bus-3.jpg",
    ],
    // Backup photos, used only if none of the ones above load yet.
    fallback: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1800&q=80",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1800&q=80",
      "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1800&q=80",
    ],
  },

  // Homepage "Fleet" section — the single photo next to "A coach built
  // for long Sri Lankan roads".
  featuredBus: {
    src: "/images/featured-bus.jpg",
    alt: "Interior of the coach",
    fallback: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=900&q=80",
  },

  // About page — the single photo next to the "AC Coach" checklist.
  aboutHighlight: {
    src: "/images/featured-bus.jpg",
    alt: "Sisara Coach parked and ready",
    fallback: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=900&q=80",
  },

  // Bus Details page — the 3-photo strip under "Photos".
  busGallery: [
    {
      src: "/images/bus-1.jpg",
      alt: "Front view of the coach",
      fallback: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=700&q=80",
    },
    {
      src: "/images/bus-2.jpg",
      alt: "Interior seating",
      fallback: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&q=80",
    },
    {
      src: "/images/bus-3.jpg",
      alt: "Luggage hold",
      fallback: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=700&q=80",
    },
  ],

  // Gallery page — add/remove/reorder as many as you like.
  gallery: [
    {
      src: "/images/gallery-1.jpg",
      alt: "Coach on the road",
      fallback: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80",
    },
    {
      src: "/images/gallery-2.jpg",
      alt: "Wedding party boarding",
      fallback: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    },
    {
      src: "/images/gallery-3.jpg",
      alt: "Pilgrimage trip",
      fallback: "https://images.unsplash.com/photo-1548783307-f63adc3f200b?w=600&q=80",
    },
    {
      src: "/images/gallery-4.jpg",
      alt: "Coastal road",
      fallback: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
    },
    {
      src: "/images/gallery-5.jpg",
      alt: "Hill country tour",
      fallback: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&q=80",
    },
    {
      src: "/images/gallery-6.jpg",
      alt: "School trip group",
      fallback: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80",
    },
    // Add more here, e.g.:
    // { src: "/images/gallery-7.jpg", alt: "Company outing" },
  ],

};
