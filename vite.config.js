import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';

// Generate a dependency-free service worker that precaches every built asset.
// The cache name changes when any bundled file changes.
function offlineBundle(){
 return {
  name:'knotty-offline-bundle',apply:'build',
  closeBundle(){
   const out=resolve('dist'),files=[];
   function walk(dir){
    for(const entry of readdirSync(dir,{withFileTypes:true})){
     const path=join(dir,entry.name);
     if(entry.isDirectory())walk(path);
     else if(entry.isFile()&&entry.name!=='sw.js')
      files.push(relative(out,path).replaceAll('\\','/'));
    }
   }
   walk(out);files.sort();
   const hash=createHash('sha256');
   for(const name of files)
    hash.update(name).update(createHash('sha256').update(readFileSync(join(out,name))).digest());
   const cache='knotty-pine-offline-'+hash.digest('hex').slice(0,12);
   const script=`const CACHE=${JSON.stringify(cache)};
const FILES=${JSON.stringify(files.map(name=>'./'+name))};
const URLS=FILES.map(name=>new URL(name,self.registration.scope));
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(names
   .filter(name=>name.startsWith('knotty-pine-offline-')&&name!==CACHE)
   .map(name=>caches.delete(name)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  if(request.mode==='navigate'){
   const page=await cache.match(new URL('./index.html',self.registration.scope));
   if(page)return page;
  }
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok)cache.put(request,response.clone());
  return response;
 }));
});\n`;
   writeFileSync(join(out,'sw.js'),script);
  }
 };
}
export default defineConfig({
 base:'./',
 plugins:[offlineBundle()],
 build:{outDir:'dist',assetsDir:'assets',emptyOutDir:true}
});
