// TransfoStock PWA — offline-first service worker
// Place this file at: public/sw.js

// 🔁 Bump this to force updates to installed apps
const CACHE_VERSION = "v1.0.1";
const STATIC_CACHE = `ts-static-${CACHE_VERSION}`;
const HTML_CACHE   = `ts-html-${CACHE_VERSION}`;

// GitHub Pages base path (repo name)
const BASE = "/TransfoStock";

// Core files to precache (app shell + manifest + icons)
const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

// Install: precache core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, HTML_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Utility: detect HTML navigation requests
function isHTMLRequest(request) {
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

// Fetch strategies:
// 1) HTML navigations → network-first, fallback to cached shell
// 2) Static assets (JS/CSS/images/fonts) → cache-first
// 3) Everything else → stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) HTML pages
  if (isHTMLRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(HTML_CACHE);
          // Always keep a copy of the latest app shell
          cache.put(`${BASE}/index.html`, fresh.clone());
          return fresh;
        } catch {
          // Offline → serve cached shell
          const cached = await caches.match(`${BASE}/index.html`);
          if (cached) return cached;
          return new Response(
            "<h1>Offline</h1><p>Please reconnect and try again.</p>",
            { headers: { "Content-Type": "text/html; charset=UTF-8" } }
          );
        }
      })()
    );
    return;
  }

  // 2) Static assets (Vite outputs under /assets) → cache-first
  const isStaticAsset =
    sameOrigin &&
    (url.pathname.startsWith(`${BASE}/assets/`) ||
      ["script", "style", "image", "font"].includes(request.destination));

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, resp.clone());
          return resp;
        } catch {
          return new Response("", { status: 504, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // 3) Everything else → stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((resp) => {
          cache.put(request, resp.clone());
          return resp;
        })
        .catch(() => null);

      return cached || (await networkFetch) || new Response("", { status: 504 });
    })()
  );
});
