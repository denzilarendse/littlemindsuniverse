const CACHE='lmu-production-v9';

const CORE=[
  '/',
  '/index.html',
  '/connect.html',
  '/assets/app.css',
  '/assets/connect.css',
  '/assets/accessibility.css',
  '/assets/runtime-config.js',
  '/assets/data.js',
  '/assets/parent-controls.js',
  '/assets/teacher-reports.js',
  '/assets/app.js',
  '/assets/connect-bridge.js',
  '/assets/connect-app.js',
  '/manifest.json',
  '/assets/icon.svg'
];
const CACHEABLE_PATHS=new Set(CORE);

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(key=>key!==CACHE)
          .map(key=>caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);

  // Never intercept or cache cross-origin data. In particular, authenticated
  // Supabase REST/Storage/Realtime traffic must remain outside Cache Storage.
  if(url.origin!==self.location.origin) return;
  if(url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok&&CACHEABLE_PATHS.has(url.pathname)){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>
            cache.put(event.request,copy)
          );
        }
        return response;
      })
      .catch(async()=>{
        const cached=await caches.match(event.request);

        if(cached) return cached;

        if(event.request.mode==='navigate'){
          if(url.pathname==='/connect.html'||url.pathname==='/connect'){
            return caches.match('/connect.html');
          }
          return caches.match('/index.html');
        }

        return Response.error();
      })
  );
});