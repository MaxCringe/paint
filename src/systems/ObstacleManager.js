// Fair, deterministic-spacing obstacle planner. Distances use world units.
// A segment is ~18-25 units; speed rises from 15 to 29 units/s.
// Full-width hazards require incompatible actions (jump vs slide), so they
// need longer recovery windows than lane-specific hazards.
export const HAZARD_SPACING=Object.freeze({
 lavaLog:52, fullWidth:32, laneRepeat:22, laneAfterFull:18
});
// Keep lava as a regular recognizable biome hazard, not a rare random streak.
// Distance is measured in monotonic segment progress, not recycled world z.
export const LAVA_SPAWN=Object.freeze({
 firstEligible:110,
 firstGuaranteed:154,
 minGap:132,
 maxGap:220,
 chance:.18
});
export function createSegmentGenerator({ makeLavaRiver, makePineLog, makeFish, makePuddle, makeObstacle, makeSoul, makeHat, makeBroom, broomChance=0, random=Math.random }) {
 const history=[];
 let progress=0,lastLavaProgress=null;
 const reset=()=>{history.length=0;progress=0;lastLavaProgress=null;};
 const near=(a,b,dist)=>Math.abs(a-b)<dist;
 const remember=(z,type,lane=-1)=>{
  history.push({z,type,lane});
  for(let i=history.length-1;i>=0;i--)if(Math.abs(history[i].z-z)>140)history.splice(i,1);
 };
 const safe=(z,type,lane=-1)=>history.every(h=>{
  if((type==='lava'&&h.type==='pineLog')||(type==='pineLog'&&h.type==='lava'))
   return !near(z,h.z,HAZARD_SPACING.lavaLog);
  if(type==='lava'||type==='pineLog'){
   if(h.type==='lava'||h.type==='pineLog')return !near(z,h.z,HAZARD_SPACING.fullWidth);
   return !near(z,h.z,HAZARD_SPACING.laneAfterFull);
  }
  if(h.type==='lava'||h.type==='pineLog')return !near(z,h.z,HAZARD_SPACING.laneAfterFull);
  return lane!==h.lane||!near(z,h.z,HAZARD_SPACING.laneRepeat);
 });
 function maybePowerup(freeLanes,z){
  if(!freeLanes.length)return;
  const roll=random();
  const lane=freeLanes[(random()*freeLanes.length)|0];
  if(roll<.075)makeHat(lane,z);
  else if(makeBroom&&roll<.075+broomChance)makeBroom(lane,z);
 }
 function addSouls(lane,z,count){
  for(let j=0;j<count;j++)makeSoul(lane,z-j*1.55,1.2+Math.sin(j*.8)*.12);
 }
 function makeSegment(z){
  // World z wraps from -150 to -50 repeatedly. Spacing must instead use
  // a monotonic progression or old entries block every future spawn.
  progress+=22;
  const p=progress;
  const lavaGap=lastLavaProgress===null?Infinity:p-lastLavaProgress;
  const lavaEligible=lastLavaProgress===null
   ?p>=LAVA_SPAWN.firstEligible:lavaGap>=LAVA_SPAWN.minGap;
  const lavaDue=lastLavaProgress===null
   ?p>=LAVA_SPAWN.firstGuaranteed:lavaGap>=LAVA_SPAWN.maxGap;
  if(lavaEligible&&safe(p,'lava')&&(lavaDue||random()<LAVA_SPAWN.chance)){
   makeLavaRiver(z);remember(p,'lava');lastLavaProgress=p;return;
  }
  // Once lava is due, defer a new log that could keep postponing it.
  if(!lavaDue&&makePineLog&&random()<.10&&safe(p,'pineLog')){
   makePineLog(z);remember(p,'pineLog');return;
  }
  const free=[0,1,2].filter(l=>safe(p,'lane',l));
  if(free.length&&random()<.88){
   const lane=free[(random()*free.length)|0];
   const roll=random();
   if(roll<.20)makeFish(lane,z);
   else if(roll<.336)makePuddle(lane,z);
   else makeObstacle(lane,z,'knot');
   remember(p,'lane',lane);
   // Reward a safe neighboring lane; never bury souls inside hazards.
   const neighbors=[0,1,2].filter(l=>l!==lane);
   let soulLane=-1;
   if(random()<.72){
    soulLane=neighbors[(random()*neighbors.length)|0];
    addSouls(soulLane,z-4,4);
   }
   maybePowerup([0,1,2].filter(l=>l!==lane&&l!==soulLane),z-1);
  }else{
   // An intentionally empty recovery segment is preferable to an unfair spawn.
   if(random()<.75){
    const lane=(random()*3)|0;
    addSouls(lane,z,5);
    maybePowerup([0,1,2].filter(l=>l!==lane),z-1);
   }
  }
 }
 makeSegment.reset=reset;
 return makeSegment;
}
