// Self-contained vertical jump physics for Fiona. Tune these values here.
const MAX_JUMPS=2;
const JUMP_VELOCITY=9.72; // Original single-jump apex: ~1.75 units after ~0.36 s.
const GRAVITY=27; // Original landing time: ~0.72 s.

export function createDoubleJump({onJump=()=>{},onLand=()=>{}}={}){
 let height=0,velocity=0,jumpsUsed=0;
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
 return {reset,jump,update,get height(){return height;},get airborne(){return jumpsUsed>0;},get jumpsUsed(){return jumpsUsed;}};
}
