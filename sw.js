
const CACHE = "b612-vault-v4-supabase";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon.svg","./icon-512.png","./apple-touch-icon.png","./app-symbol.jpg","./supabase-config.js","./supabase-storage.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(c=>c.put(e.request, copy));
    return resp;
  }).catch(()=>caches.match("./index.html"))));
});
