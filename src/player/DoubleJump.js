// Self-contained vertical jump physics for Fiona. Tune these values here.
export const MAX_JUMPS=2;
export const JUMP_VELOCITY=9.72; // Original single-jump apex: ~1.75 units after ~0.36 s.
export const GRAVITY=27; // Original landing time: ~0.72 s.

export function createDoubleJump({onJump=()=>{},onLand=()=>{},initialState}={}){
 let height=initialState?.height??0,velocity=initialState?.velocity??0,jumpsUsed=initialState?.jumpsUsed??0;
 function reset(){height=0;velocity=0;jumpsUsed=0;}
 function jump(){
  if(jumpsUsed>=MAX_JUMPS)return false;
  // Each new press restarts upward momentum without snapping the character's height.
  velocity=JUMP_VELOCITY;
  jumpsUsed++;
  onJump(jumpsUsed);
  return true;
 }
 function update(dt){
  if(jumpsUsed===0)return;
  const previousHeight=height;
  // Exact constant-gravity integration keeps the jump consistent across frame rates.
  height+=velocity*dt-.5*GRAVITY*dt*dt;
  velocity-=GRAVITY*dt;
  if(height<=0){
   height=0;velocity=0;jumpsUsed=0;
   if(previousHeight>0)onLand();
  }
 }
 return {reset,jump,update,restore(s){height=s.height;velocity=s.velocity;jumpsUsed=s.jumpsUsed;},snapshot:()=>({height,velocity,jumpsUsed}),get height(){return height;},get airborne(){return jumpsUsed>0;},get jumpsUsed(){return jumpsUsed;}};
}
