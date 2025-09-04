// TransfoStock PWA — offline-first service worker

const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `ts-static-${CACHE_VERSION}`;
const HTML_CACHE = `ts-html-${CACHE_VERSION}`;

// IMPORTANT: GitHub Pages base path
const BASE = "/TransfoStock";

// Core files to precache
const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`
];

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ----- Activate -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, HTML_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Utility: detect HTML navigation
function isHTMLRequest(request) {
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

// ----- Fetch handler -----
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1) HTML pages: network-first, fallback to cache
  if (isHTMLRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(HTML_CACHE);
          cache.put(`${BASE}/index.html`, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(`${BASE}/index.html`);
          if (cached) return cached;
          return new Response("<h1>Offline</h1><p>Please reconnect.</p>", {
            headers: { "Content-Type": "text/html; charset=UTF-8" }
          });
        }
      })()
    );
    return;
  }

  // 2) Static assets (JS/CSS/images): cache-first
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

  // 3) Other requests: stale-while-revalidate
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
