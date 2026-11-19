/* Service worker: lets the home-screen app open offline.
   - Page (navigation): network first, so a new deploy shows up on the next
     launch; falls back to the cached copy if offline or slow (3 s).
   - Same-origin files (hashed JS/CSS, icons): cache first. Hashed names
     change on every build, so a cached file is never stale.
   - Anything else (GitHub API for sync, later) is not touched. */
const CACHE = "workout-path-v1";
const PAGE = new URL("./", self.registration.scope).href;

/* On install, cache the current page and the files it references, so the
   app opens offline even if it was only ever loaded once. */
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const res = await fetch(PAGE, { cache: "no-store" });
      if (res.ok) {
        const html = await res.clone().text();
        await cache.put(PAGE, res);
        const files = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => new URL(m[1], PAGE).href);
        await cache.addAll([...new Set(files)]);
      }
    } catch { /* offline during install: runtime caching fills in later */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function page(req) {
  const cache = await caches.open(CACHE);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(PAGE, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch { /* offline */ }
  return (await cache.match(PAGE)) || network;
}

async function asset(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(req.mode === "navigate" ? page(req) : asset(req));
});
