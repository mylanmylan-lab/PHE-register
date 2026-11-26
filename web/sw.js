/* Cache only application files. IndexedDB and personal backups are never transmitted. */
const CACHE='phe-shell-__VERSION__';
const FILES=['./','index.html','style.css','domain.js','store.js','export.js','timetable.js','app.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
// No skipWaiting: existing windows keep their version and unfinished forms.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('phe-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),base=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const relative=url.pathname.slice(base.pathname.length);
 if(request.mode!=='navigate'&&!FILES.includes(relative))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request.mode==='navigate'?new URL('index.html',base).href:request.url,{ignoreSearch:true});
  return cached||fetch(request);
 })());
});
