// Keyboard/touch adapter only. Movement rules remain in src/game.js.
const MOVEMENT_KEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS']);
const HOLD_GUARD=new Set(['ArrowUp','KeyW','Space','ArrowDown','KeyS']);
export function createGameInput({canvas,getState,isSubpageOpen,onStart,onEscape,onMove,onJump,onSlide}){
 let touchX=0,touchY=0;
 function keydown(e){
  if(e.code==='Escape'){
   e.preventDefault();
   if(!e.repeat)onEscape();
   return;
  }
  if(MOVEMENT_KEYS.has(e.code))e.preventDefault();
  const state=getState();
  if(state==='paused'||state==='over')return;
  if(e.repeat&&HOLD_GUARD.has(e.code))return;
  if(state!=='playing'){
   if(!isSubpageOpen()&&(e.code==='Enter'||e.code==='Space'))onStart();
   return;
  }
  if(e.code==='ArrowLeft'||e.code==='KeyA')onMove(-1);
  else if(e.code==='ArrowRight'||e.code==='KeyD')onMove(1);
  else if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')onJump();
  else if(e.code==='ArrowDown'||e.code==='KeyS')onSlide();
 }
 function pointerdown(e){touchX=e.clientX;touchY=e.clientY;}
 function pointerup(e){
  if(getState()!=='playing')return;
  const dx=e.clientX-touchX,dy=e.clientY-touchY;
  if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  if(Math.abs(dx)>Math.abs(dy))onMove(dx>0?1:-1);
  else if(dy<0)onJump();
  else onSlide();
 }
 window.addEventListener('keydown',keydown);
 canvas.addEventListener('pointerdown',pointerdown);
 canvas.addEventListener('pointerup',pointerup);
 return {destroy(){
  window.removeEventListener('keydown',keydown);
  canvas.removeEventListener('pointerdown',pointerdown);
  canvas.removeEventListener('pointerup',pointerup);
 }};
}
