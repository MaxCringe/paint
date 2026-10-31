// Debug FPS counter is independent of game menus and gameplay.
export function createOverlays(){
 const fpsDisplay=document.createElement('div');
 fpsDisplay.id='knotty-fps-counter';
 fpsDisplay.textContent='FPS: --';
 fpsDisplay.setAttribute('aria-label','Частота кадров игры');
 fpsDisplay.style.cssText='position:fixed;right:14px;bottom:80px;z-index:50;padding:7px 10px;background:rgba(8,12,15,.78);border:1px solid rgba(255,255,255,.3);border-radius:9px;font:700 15px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;color:#a7ff9b;pointer-events:none;text-shadow:0 1px 4px #000;min-width:86px;text-align:center';
 document.body.appendChild(fpsDisplay);
 const mobileStyle=document.createElement('style');
 mobileStyle.textContent='@media(max-width:700px){#knotty-fps-counter{bottom:76px!important;right:12px!important}}';
 document.head.appendChild(mobileStyle);
 return {fpsDisplay};
}
