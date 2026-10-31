// Misty Day scarf: fixed 3 km opportunities and one revival per attempt.
export const SCARF_INTERVAL_METRES=3000;
// TEMPORARY: set false for rare 3000m pickups after testing.
export const SCARF_TEST_MODE=true;
export const SCARF_TEST_SPAWN_CHANCE=.22; // Probability per generated section (hat-like).
export const REVIVAL_PROTECTION_SECONDS=3;
export function createScarfRules(){
 let next=SCARF_INTERVAL_METRES,held=false,used=false;
 function reset(){next=SCARF_INTERVAL_METRES;held=false;used=false}
 function milestone(metres){
  if(!Number.isFinite(metres))return false;
  let reached=false;
  while(metres>=next){next+=SCARF_INTERVAL_METRES;reached=true}
  return reached&&!held&&!used;
 }
 function collect(){if(held||used)return false;held=true;return true}
 function consume(){if(!held||used)return false;held=false;used=true;return true}
 return {reset,milestone,collect,consume,
  get held(){return held},get used(){return used},get canRevive(){return held&&!used},
  get canSpawn(){return !held&&!used}};
}
