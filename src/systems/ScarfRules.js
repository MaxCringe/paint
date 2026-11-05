// Misty Day scarf: one randomly positioned opportunity in each 1 km interval.
export const SCARF_INTERVAL_METRES=1000;
export const SCARF_TEST_MODE=false;
export const SCARF_TEST_SPAWN_CHANCE=.22;
export const REVIVAL_PROTECTION_SECONDS=3;
export function createScarfRules(){
 let next=0,count=0;
 const randomOffset=()=>Math.random()*SCARF_INTERVAL_METRES;
 function reset(){next=randomOffset();count=0;}
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
 function collect(){count++;return true;}
 function consume(){if(count===0)return false;count--;return true;}
 reset();
 return {reset,milestone,collect,consume,
  get count(){return count},get held(){return count>0},get used(){return false},get canRevive(){return count>0},
  get canSpawn(){return true}};
}
