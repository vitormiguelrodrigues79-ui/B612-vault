const CACHE='oud-haenir-teste-v5';
const CORE=['./','./index.html','./manifest.webmanifest','./test-social.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('oud-haenir-teste-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==location.origin||!u.pathname.includes('/B612-vault/perfume-teste/'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
