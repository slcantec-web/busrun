/**
 * Homepage hero slideshow — image list.
 * =================================================================
 * THIS is the file to edit when you want to change the hero photos.
 * No other code needs to change.
 *
 * HOW TO ADD YOUR OWN PHOTOS:
 *   1. Drop your luxury coach photos into /public/images/
 *      (e.g. hero-bus.jpg, hero-bus-2.jpg). Landscape orientation,
 *      1600px+ wide works best. Keep each file under ~400KB so the
 *      homepage loads quickly.
 *   2. List the paths below, one per line, in the order you want
 *      them to appear in the slideshow.
 *   3. Local paths ("/images/...") or full external URLs both work —
 *      e.g. a link straight to a photo hosted elsewhere is fine too.
 *   4. Save this file and refresh the homepage.
 *
 * If an image listed below fails to load (for example you haven't
 * uploaded hero-bus-3.jpg yet), the slideshow silently skips it —
 * it will never show a broken image. If NONE of your images load,
 * it falls back to the stock photos at the bottom of this file, so
 * the hero always has something to show.
 * ================================================================= */

window.HERO_IMAGES = [
  "/images/hero-bus.jpg",
  "/images/hero-bus-2.jpg",
  "/images/hero-bus-3.jpg",
];

// Backup photos only — used automatically if none of the images above
// are available yet. Safe to leave as-is, or replace with your own.
window.HERO_IMAGES_FALLBACK = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1800&q=80",
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1800&q=80",
  "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1800&q=80",
];
