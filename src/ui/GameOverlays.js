// Keep non-gameplay HUD debugging and pause markup out of the main simulation.
export const SHOW_FPS = true; // Switch to false for a clean release UI.
export function createOverlays(){
 // Temporary lightweight FPS overlay for performance profiling; remove after optimization.
 const fpsDisplay=document.createElement('div');
 fpsDisplay.id='knotty-fps-counter';
 fpsDisplay.textContent='FPS: --';
 fpsDisplay.setAttribute('aria-label','Частота кадров игры');
 fpsDisplay.style.cssText='position:fixed;right:12px;bottom:12px;z-index:50;padding:7px 10px;background:rgba(8,12,15,.78);border:1px solid rgba(255,255,255,.3);border-radius:9px;font:700 15px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;color:#a7ff9b;pointer-events:none;text-shadow:0 1px 4px #000;min-width:86px;text-align:center';
 document.body.appendChild(fpsDisplay);
 const fpsSmallScreenStyle=document.createElement('style');
 fpsSmallScreenStyle.textContent='@media(max-width:700px){#knotty-fps-counter{bottom:84px!important}}';
 document.head.appendChild(fpsSmallScreenStyle);
 // Temporary pause screen; Escape toggles it without resetting the current run.
 const pauseOverlay=document.createElement('div');
 pauseOverlay.id='knotty-pause-overlay';
 pauseOverlay.style.cssText='position:fixed;inset:0;z-index:45;display:none;align-items:center;justify-content:center;background:rgba(5,8,12,.62);pointer-events:none;text-align:center;color:#fff;text-shadow:0 3px 14px #000;font-family:Arial,sans-serif';
 pauseOverlay.innerHTML='<div><div style="font-size:clamp(32px,7vw,64px);font-weight:900;letter-spacing:.14em">ПАУЗА</div><div style="font-size:clamp(14px,2vw,20px);margin-top:15px;color:#e6d7ce">Нажми Esc, чтобы продолжить</div></div>';
 document.body.appendChild(pauseOverlay);
 
 if(!SHOW_FPS)fpsDisplay.style.display='none';
 return {fpsDisplay,pauseOverlay};
}
