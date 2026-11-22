/* NutriMD service worker — acces offline.
 * - Navigări: network-first, cu fallback din cache (pagini vizitate + rețete favorite).
 * - Resurse statice (/_next/static, icon): cache-first.
 * - Aplicația trimite mesajul CACHE_URLS cu paginile rețetelor salvate la favorite.
 */
const VERSION = "nutrimd-v3";
// Subfolderul site-ului (ex. "/nutrimd/" pe GitHub Pages), dedus din scope-ul service worker-ului.
const BASE = new URL(self.registration.scope).pathname;
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll([BASE, BASE + "recipes/"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "CACHE_URLS") {
    caches.open(PAGES).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => {}))));
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match(BASE + "recipes/")) || (await caches.match(BASE))),
    );
    return;
  }

  // Date de navigare Next.js (index.txt): network-first, cu fallback din cache — navigare internă offline.
  if (url.pathname.endsWith("/index.txt")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith(BASE + "_next/static") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".png")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC).then((c) => c.put(req, copy));
        return res;
      })),
    );
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(BASE));
});
