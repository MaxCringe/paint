// Ground slide controller: repeated deliberate inputs refresh the timer.
export const SLIDE_DURATION = .82;
export const SLIDE_JUMP_BUFFER_SECONDS = .7;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createSlide({duration=SLIDE_DURATION,initialState}={}) {
 let remaining=initialState?.remaining??0, crouch=initialState?.crouch??0, queuedJump=initialState?.queuedJump??0;
 function press(){ remaining=duration; queuedJump=0; }
 function queueJump(){queuedJump=SLIDE_JUMP_BUFFER_SECONDS;}
 function consumeJump(){if(queuedJump<=0)return false;queuedJump=0;return true;}
 // Exit the crouch pose when the next action is a jump.
 function cancel(){remaining=0;crouch=0;queuedJump=0;}
 function update(dt){
  queuedJump=Math.max(0,queuedJump-dt);
  remaining=Math.max(0,remaining-dt);
  const target=remaining>0?1:0;
  crouch+=(target-crouch)*Math.min(1,dt*(target?24:14));
  if(Math.abs(target-crouch)<.001)crouch=target;
 }
 function reset(){cancel();}
 return {press,update,reset,cancel,queueJump,consumeJump,
  restore(s){remaining=s.remaining;crouch=s.crouch;queuedJump=s.queuedJump;},
  snapshot:()=>({remaining,crouch,queuedJump}),
  get active(){return remaining>0;},
  get remaining(){return remaining;},
  get crouch(){return crouch;},
  get jumpQueued(){return queuedJump>0;}
 };
}

// The slide lowers Fiona through a two-joint bend; shoes stay on the road.
const HIP=.57,ANKLE=.075,THIGH=.27,SHIN=.225,DROP=.25;
export function getSlideLegPose(amount){
 const a=clamp(amount,0,1);
 const hipHeight=HIP-DROP*a,d=hipHeight-ANKLE;
 const along=(THIGH*THIGH-SHIN*SHIN+d*d)/(2*d);
 const forward=Math.sqrt(Math.max(0,THIGH*THIGH-along*along));
 const thighPitch=Math.atan2(forward,along),shinPitch=-Math.atan2(forward,d-along);
 return {hipHeight,thighPitch,kneePitch:shinPitch-thighPitch,
  ankleHeight:hipHeight-THIGH*Math.cos(thighPitch)-SHIN*Math.cos(shinPitch),
  ankleDepth:-THIGH*Math.sin(thighPitch)-SHIN*Math.sin(shinPitch)};
}
// Knees bend and hips lower; the torso pitches moderately and rolls a little
// to remain clearly visible from behind (never compress the mesh geometry).
export function getSlidePose(amount){
 const blend=clamp(amount,0,1);
 return {blend,waistPitch:-.92*blend,waistRoll:-.22*blend,
  waistDrop:-.28*blend,waistForward:-.08*blend,
  skirtPitch:-.55*blend,skirtLift:-.11*blend,armPitch:.90};
}
