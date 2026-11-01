// Misty Day scarf: one randomly positioned opportunity in each 1 km interval.
export const SCARF_INTERVAL_METRES=1000;
export const SCARF_TEST_MODE=false;
export const SCARF_TEST_SPAWN_CHANCE=.22;
export const REVIVAL_PROTECTION_SECONDS=3;
export function createScarfRules(){
 let next=0,held=false;
 const randomOffset=()=>Math.random()*SCARF_INTERVAL_METRES;
 function reset(){next=randomOffset();held=false;}
 function milestone(metres){
  if(!Number.isFinite(metres)||metres<next)return false;
  // Advance to a fresh random position in the next kilometre, even if
  // the previous pickup was held or already consumed.
  const kilometre=Math.floor(next/SCARF_INTERVAL_METRES)+1;
  next=kilometre*SCARF_INTERVAL_METRES+randomOffset();
  while(metres>=next){
   const nextKilometre=Math.floor(next/SCARF_INTERVAL_METRES)+1;
   next=nextKilometre*SCARF_INTERVAL_METRES+randomOffset();
  }
  return true;
 }
 function collect(){if(held)return false;held=true;return true;}
 function consume(){if(!held)return false;held=false;return true;}
 reset();
 return {reset,milestone,collect,consume,
  get held(){return held},get used(){return false},get canRevive(){return held},
  get canSpawn(){return true}};
}
