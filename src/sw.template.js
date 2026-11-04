/* Whirl service worker. vite.config.js fills in VERSION and PRECACHE at build time.
 * Network first, so changes show up at once; the saved copy is the fallback when the network
 * fails, stalls or the laptop is down. /api is never cached: the app keeps its own saved copy.
 * A redirect to the Cloudflare Access login passes straight through, so an expired session
 * still reaches the login page. */
const VERSION = "%%VERSION%%";
const PRECACHE = %%PRECACHE%%;
const CACHE = `whirl-${VERSION}`;
const TIMEOUT_MS = 3500;

function storable(r) {
  return r.status === 200 && r.type === "basic" && !r.redirected;
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((cache) => Promise.all(PRECACHE.map((url) =>
    fetch(url, { cache: "no-cache", redirect: "manual" })
      .then((r) => { if (storable(r)) return cache.put(url, r); })
      .catch(() => {}) // an expired login must not block the install
  ))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((n) => /^(whirl|wheel)-/.test(n) && n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Offline</title><body style="color-scheme:light dark;background:Canvas;color:CanvasText;font:16px system-ui,sans-serif;text-align:center;padding:64px 24px">' +
    '<h1 style="font-size:1.4rem">You are offline</h1><p>Whirl needs a connection the first time it opens.</p><p><a href="/">Try again</a></p>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/cdn-cgi/") || req.headers.has("range")) return;

  // The app has one page, so every navigation shares the one saved copy of it
  const isPage = req.mode === "navigate";
  const key = isPage ? "/" : url.pathname;

  let storing = Promise.resolve();
  const network = fetch(req).then((r) => {
    // With the laptop or tunnel down, Cloudflare answers with its own 5xx page: fall back instead
    if (r.status >= 500) throw new Error(`server unavailable (${r.status})`);
    if (storable(r)) {
      const copy = r.clone();
      storing = caches.open(CACHE).then((cache) => cache.put(key, copy));
    }
    return r;
  });
  e.waitUntil(network.then(() => storing).catch(() => {}));

  e.respondWith(caches.match(key).then((cached) => {
    if (!cached) return network.catch(() => (isPage ? offlinePage() : Response.error()));
    // Files in /assets/ have their content hash in the name, so a saved copy is never out of date.
    // Without this, each one would wait out the timeout in turn on a slow connection.
    if (url.pathname.startsWith("/assets/")) return cached;
    const stalled = new Promise((resolve) => { setTimeout(() => resolve(cached), TIMEOUT_MS); });
    return Promise.race([network, stalled]).catch(() => cached);
  }));
});
