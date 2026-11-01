// Ground slide controller: repeated deliberate inputs refresh the timer.
export const SLIDE_DURATION = .82;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createSlide({duration=SLIDE_DURATION}={}) {
 let remaining=0, crouch=0;
 function press(){ remaining=duration; }
 function update(dt){
  remaining=Math.max(0,remaining-dt);
  const target=remaining>0?1:0;
  crouch+=(target-crouch)*Math.min(1,dt*(target?24:14));
  if(Math.abs(target-crouch)<.001)crouch=target;
 }
 function reset(){remaining=0;crouch=0;}
 return {press,update,reset,
  get active(){return remaining>0;},
  get remaining(){return remaining;},
  get crouch(){return crouch;}
 };
}

// Bend at the waist and hips, keeping every mesh at its original scale.
// Legs settle into a low staggered slide; the skirt tilts around the waist.
export function getSlidePose(amount){
 const blend=clamp(amount,0,1);
 return {
  blend,
  waistPitch:-1.26*blend,
  waistDrop:-.17*blend,
  waistForward:-.17*blend,
  skirtPitch:-.22*blend,
  skirtLift:-.035*blend,
  armPitch:.85,
  frontLegPitch:1.05,
  rearLegPitch:-.85
 };
}
