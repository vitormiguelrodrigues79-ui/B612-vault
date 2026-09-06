const CACHE='oud-haenir-v1.16.5';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()){
    if(k.startsWith('oud-haenir-')&&k!==CACHE)await caches.delete(k);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith((async()=>{
    try{
      const r=await fetch(e.request,{cache:'no-store'});
      const c=await caches.open(CACHE);
      c.put(e.request,r.clone());
      return r;
    }catch{
      const cached=await caches.match(e.request);
      return cached||Response.error();
    }
  })());
});