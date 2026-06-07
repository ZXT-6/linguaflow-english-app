const CACHE_NAME = "linguaflow-v32-supabase-client";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app-entry.js",
  "./app.js",
  "./supabase-client.js",
  "./daily-path-core.mjs",
  "./learning-core.mjs",
  "./sync-client.mjs",
  "./sync-core.mjs",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./assets/learner-hero.svg",
  "./assets/learner-avatar.svg",
  "./assets/study-cafe-desk.svg",
  "./assets/empty-bookmark.svg",
  "./assets/empty-review.svg",
  "./assets/empty-notebook.svg",
  "./assets/volume-d.svg",
  "./assets/menu-plan-a.svg",
  "./assets/menu-vocab-a.svg",
  "./assets/menu-favorites-d.svg",
  "./assets/menu-settings-b.svg",
  "./assets/menu-about-a.svg",
  "./assets/nav-home-a.svg",
  "./assets/nav-vocab-b.svg",
  "./assets/nav-practice-c.svg",
  "./assets/nav-mistakes-a.svg",
  "./assets/nav-profile-a.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
