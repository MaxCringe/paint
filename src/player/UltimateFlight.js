// Visual flight follows the original ultimate timer, without altering its 5.5 s charge.
// Keep collision protection active until the landing animation touches the road.
export const ULTIMATE_RISE_SECONDS = .72;
export const ULTIMATE_LAND_SECONDS = .60;
export const ULTIMATE_FLIGHT_HEIGHT = 2.25;
export const ULTIMATE_BOB_AMPLITUDE = .045;
const clamp01=x=>Math.max(0,Math.min(1,x));
const smoothstep=x=>{const t=clamp01(x);return t*t*(3-2*t);};

// Do not begin landing close enough to a lava river to touch it during descent.
// Positive gaps travel toward the player as the world scrolls forward.
export function ultimateLavaGuardDuration(gap,halfDepth,speed){
 if(!Number.isFinite(gap)||!Number.isFinite(halfDepth)||!Number.isFinite(speed)||
    halfDepth<=0||speed<=0)return 0;
 const farBank=halfDepth+2;
 const approach=-halfDepth-2-speed*ULTIMATE_LAND_SECONDS;
 if(gap<approach||gap>farBank)return 0;
 return (farBank-gap)/speed+ULTIMATE_LAND_SECONDS;
}

export function createUltimateFlight(){
 let progress=0,launchHeight=0,landing=false;
 function activate(fromHeight=0){
  launchHeight=Number.isFinite(fromHeight)?Math.max(0,fromHeight):0;
  progress=0;landing=false;
 }
 function update(dt,powered){
  if(!Number.isFinite(dt)||dt<=0)return;
  if(powered){
   progress=Math.min(1,progress+dt/ULTIMATE_RISE_SECONDS);
   landing=false;
  }else if(progress>0){
   landing=true;
   progress=Math.max(0,progress-dt/ULTIMATE_LAND_SECONDS);
   if(progress===0){launchHeight=0;landing=false;}
  }
 }
 function height(timeMs,groundHeight=0){
  const lift=smoothstep(progress);
  const base=landing?groundHeight:launchHeight;
  // Slow, almost weightless breathing: the old 0.8 s bob looked like bouncing.
  // Suppress bob during lift-off/touchdown so the feet meet the road cleanly.
  const bobWeight=smoothstep((lift-.55)/.45);
  const bob=Math.sin(timeMs*.0022)*ULTIMATE_BOB_AMPLITUDE*bobWeight;
  return base+(ULTIMATE_FLIGHT_HEIGHT-base)*lift+bob;
 }
 function reset(){progress=0;launchHeight=0;landing=false;}
 return {activate,update,height,reset,
  restore(s){progress=s.progress??0;launchHeight=s.launchHeight??0;landing=Boolean(s.landing);},
  get active(){return progress>0;},
  get lift(){return smoothstep(progress);},
  get landing(){return landing;},
  get progress(){return progress;}
 };
}
