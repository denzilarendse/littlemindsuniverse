const CACHE='lmu-production-v14';

const CORE=[
  '/',
  '/index.html',
  '/connect.html',
  '/privacy.html',
  '/account-data-request.html',
  '/assets/app.css',
  '/assets/connect.css',
  '/assets/accessibility.css',
  '/assets/runtime-config.js',
  '/assets/data.js',
  '/assets/early-learning.js',
  '/assets/milo-studios.js',
  '/assets/coding-studio.js',
  '/assets/parent-controls.js',
  '/assets/teacher-reports.js',
  '/assets/privacy-controls.js',
  '/assets/privacy-request.js',
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

self.addEventListener('push',event=>{
  // Keep lock-screen content deliberately generic. The app fetches authorized
  // conversation data only after the user opens Connect.
  let payload={};
  try{payload=event.data?.json?.()||{}}catch{}
  const conversationId=typeof payload.conversationId==='string'?payload.conversationId:'';
  const target=conversationId
    ? '/connect.html?conversation='+encodeURIComponent(conversationId)
    : '/connect.html';
  event.waitUntil(self.registration.showNotification('LittleMinds Connect',{
    body:'You have a new private message.',
    icon:'/assets/icon.svg',
    badge:'/assets/icon.svg',
    tag:conversationId?'connect-'+conversationId:'connect-message',
    renotify:Boolean(conversationId),
    data:{path:target}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const raw=String(event.notification?.data?.path||'/connect.html');
  const target=raw.startsWith('/connect')?raw:'/connect.html';
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      const url=new URL(client.url);
      if(url.origin===self.location.origin){
        await client.focus();
        if('navigate' in client)await client.navigate(target);
        return;
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
