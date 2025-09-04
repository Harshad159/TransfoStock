// TransfoStock PWA — offline-first service worker
// Scope: GitHub Pages under /TransfoStock/

const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `ts-static-${CACHE_VERSION}`;
const HTML_CACHE = `ts-html-${CACHE_VERSION}`;

// IMPORTANT: include your repo base path for GitHub Pages
const BASE = "/TransfoStock";

// Core files to always cache (fast app shell + icons + manifest)
const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

// ----- Install: precache core files -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ----- Activate: clean old caches -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((key) => ![STATIC_CACHE, HTML_CACHE].includes(key))
        .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Utility: is HTML navigation request
function isHTMLRequest(request) {
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

// ----- Fetch: offline strategies -----
// - HTML (app shell): network-first, fall back to cached index.html
// - Static assets (JS/CSS/images under /assets or same-origin files): cache-first
// - Other GET requests: stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) HTML navigations → network-first
  if (isHTMLRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Cache a copy of successful HTML responses
          const cache = await caches.open(HTML_CACHE);
          cache.put(`${BASE}/index.html`, fresh.clone());
          return fresh;
        } catch {
          // Offline: serve cached shell
          const cached = await caches.match(`${BASE}/index.html`);
          if (cached) return cached;
          // As a last resort, return a simple offline page
          return new Response(
            "<h1>Offline</h1><p>Please reconnect and try again.</p>",
            { headers: { "Content-Type": "text/html; charset=UTF-8" } }
          );
        }
      })()
    );
    return;
  }

  // 2) Static assets (JS/CSS/images/fonts) → cache-first
  const isStaticAsset =
    sameOrigin &&
    (url.pathname.startsWith(`${BASE}/assets/`) || // Vite build outputs
     [ "script", "style", "image", "font" ].includes(request.destination));

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          // Cache successful responses
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, resp.clone());
          return resp;
        } catch {
          // Offline and not in cache
          return new Response("", { status: 504, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // 3) Everything else (e.g., JSON) → stale-while-revalidate
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

      // Return cached immediately if present, else wait for network
      return cached || (await networkFetch) || new Response("", { status: 504 });
    })()
  );
});
