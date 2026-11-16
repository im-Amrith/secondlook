// SecondLook service worker: keeps the app shell available offline so quick checks (and Gemini
// Nano, where available) work with no connection. It never caches API calls or message content.
const CACHE = "secondlook-shell-v2";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // Also pre-cache the hashed JS/CSS the current index.html points at, so the very first
      // visit is enough to work offline.
      try {
        const html = await (await fetch("/index.html", { cache: "no-store" })).text();
        const assets = [...new Set(html.match(/\/assets\/[^"' )]+/g) ?? [])];
        await cache.addAll(assets);
      } catch {
        /* best effort */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase/Google APIs: always network, never cached.

  if (req.mode === "navigate") {
    // Network first for the page, falling back to the cached shell when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    // Hashed build assets never change: cache first.
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
