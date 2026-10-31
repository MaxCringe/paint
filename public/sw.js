// Cleanup-only service worker for browsers that installed the Oct 31 offline build.
// Intentionally has no fetch handler and never caches game files.
const LEGACY_CACHE_PREFIX='knotty-pine-offline-';
self.addEventListener('install',event=>{
 event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  try{
   const keys=await caches.keys();
   await Promise.all(keys.filter(key=>key.startsWith(LEGACY_CACHE_PREFIX))
    .map(key=>caches.delete(key)));
  }finally{
   // Take control from the obsolete cache-first worker, then unregister.
   await self.clients.claim();
   await self.registration.unregister();
  }
 })());
});
