// Independent FPS presentation. The render loop only supplies the current
// reading; colors, background and responsive positioning are handled by CSS.
export function createOverlays(){
 const fpsDisplay=document.createElement('div');
 fpsDisplay.id='knotty-fps-counter';
 fpsDisplay.textContent='FPS: --';
 fpsDisplay.dataset.status='good';
 fpsDisplay.setAttribute('aria-label','Частота кадров игры');
 document.body.appendChild(fpsDisplay);
 return {fpsDisplay};
}
