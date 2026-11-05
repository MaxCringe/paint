import {createRunSpace,pathToZ,hazardDepth} from './RunSpace.js';
// All reservations and spacing use absolute world-distance coordinates.
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
 const history=[],space=createRunSpace();
 let currentPath=0,nextSection=50;
 let lastLavaProgress=null;
 const reset=()=>{history.length=0;space.reset();lastLavaProgress=null;currentPath=0;nextSection=50;};
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
 function reservePickup(type,s,lanes=[0,1,2]){
  for(const lane of lanes){const r={kind:'reward',type,lane,s,half:.35};if(space.available(r)){space.add(r);return r;}}return null;
 }
 function spawnReward(type,lane,s,y){
  const r=reservePickup(type,s,[lane]);if(!r)return;
  ({soul:makeSoul,hat:makeHat,broom:makeBroom})[type]?.(lane,pathToZ(s,currentPath),y,s);
 }
 function maybePowerup(freeLanes,z){
  if(!freeLanes.length)return;
  const roll=random();
  const lane=freeLanes[(random()*freeLanes.length)|0];
  if(roll<.075)spawnReward('hat',lane,z);
  else if(makeBroom&&roll<.075+broomChance)spawnReward('broom',lane,z);
 }
 function addSouls(lane,z,count){
  for(let j=0;j<count;j++)spawnReward('soul',lane,z+j*1.55,1.2+Math.sin(j*.8)*.12);
 }
 function generate(s){
  const z=s;
  const p=s;
  const lavaGap=lastLavaProgress===null?Infinity:p-lastLavaProgress;
  const lavaEligible=lastLavaProgress===null
   ?p>=LAVA_SPAWN.firstEligible:lavaGap>=LAVA_SPAWN.minGap;
  const lavaDue=lastLavaProgress===null
   ?p>=LAVA_SPAWN.firstGuaranteed:lavaGap>=LAVA_SPAWN.maxGap;
  if(lavaEligible&&space.available({kind:'hazard',lane:-1,s,half:hazardDepth('lava')})&&safe(p,'lava')&&(lavaDue||random()<LAVA_SPAWN.chance)){
   makeLavaRiver(pathToZ(s,currentPath),s);space.add({kind:'hazard',type:'lava',lane:-1,s,half:hazardDepth('lava')});remember(p,'lava');lastLavaProgress=p;return;
  }
  // Once lava is due, defer a new log that could keep postponing it.
  if(!lavaDue&&makePineLog&&random()<.10&&space.available({kind:'hazard',lane:-1,s,half:hazardDepth('pineLog')})&&safe(p,'pineLog')){
   makePineLog(pathToZ(s,currentPath),s);space.add({kind:'hazard',type:'pineLog',lane:-1,s,half:hazardDepth('pineLog')});remember(p,'pineLog');return;
  }
  const free=[0,1,2].filter(l=>safe(p,'lane',l)&&space.available({kind:'hazard',lane:l,s,half:1.1}));
  if(free.length&&random()<.88){
   const lane=free[(random()*free.length)|0];
   const roll=random();
   if(roll<.20)makeFish(lane,pathToZ(s,currentPath),s);
   else if(roll<.336)makePuddle(lane,pathToZ(s,currentPath),s);
   else makeObstacle(lane,pathToZ(s,currentPath),'knot',s);
   space.add({kind:'hazard',type:roll<.20?'fish':roll<.336?'pee':'knot',lane,s,half:hazardDepth(roll<.20?'fish':roll<.336?'pee':'knot')});remember(p,'lane',lane);
   // Reward a safe neighboring lane; never bury souls inside hazards.
   const neighbors=[0,1,2].filter(l=>l!==lane);
   let soulLane=-1;
   if(random()<.72){
    soulLane=neighbors[(random()*neighbors.length)|0];
    addSouls(soulLane,z+4,4);
   }
   maybePowerup([0,1,2].filter(l=>l!==lane&&l!==soulLane),z+1);
  }else{
   // An intentionally empty recovery segment is preferable to an unfair spawn.
   if(random()<.75){
    const lane=(random()*3)|0;
    addSouls(lane,z,5);
    maybePowerup([0,1,2].filter(l=>l!==lane),z+1);
   }
  }
 }
 function makeSegment({path,speed=15}){
  if(!Number.isFinite(path)||path<currentPath)throw Error('Run path must be monotonic');
  currentPath=path;space.prune(path);
  // A distance frontier replaces the independent timer and recycled spawn z.
  while(nextSection<=path+85){generate(nextSection);nextSection+=Math.max(22,speed*1.25);}
 }
 makeSegment.reservePickup=(type,{path,preferredS=path+60}={})=>{
  for(let s=Math.max(path+50,preferredS);s<nextSection-9;s+=3){const r=reservePickup(type,s);if(r)return {...r,z:pathToZ(r.s,path)};}return null;
 };
 makeSegment.reservations=space.records;
 makeSegment.reset=reset;
 return makeSegment;
}
