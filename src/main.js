// Vite entry point. index.html loads the stylesheet; game logic lives in its own module.
import './game.js';

// The first online visit downloads and caches every game file.
// Later visits can work offline without third-party network requests.
if(import.meta.env.PROD && 'serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js')
   .catch(error=>console.warn('Offline cache is unavailable:',error));
 });
}
