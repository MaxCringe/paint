import {createRunSpace,pathToZ,hazardDepth,laneMask} from './RunSpace.js';
import {createRunDirector,chooseRunWeight,RUN_DIRECTOR_CONFIG} from './RunDirector.js';
import {validateRunRoute} from './RunReachability.js';
import {JUMP_VELOCITY,GRAVITY} from '../player/DoubleJump.js';

export const HAZARD_SPACING=RUN_DIRECTOR_CONFIG.spacing;
export const LAVA_SPAWN=RUN_DIRECTOR_CONFIG.lava;
const full=h=>h.lane<0;
export function compatibleHazards(a,b,spacing=HAZARD_SPACING){
 const gap=Math.abs(a.s-b.s);
 if(full(a)&&full(b))return gap>=(a.type===b.type?spacing.fullWidth:spacing.lavaLog);
 if(full(a)||full(b))return gap>=spacing.laneAfterFull;
 return !(laneMask(a.lane)&laneMask(b.lane))||gap>=spacing.laneRepeat;
}
export function createSegmentGenerator({makeLavaRiver,makePineLog,makeFish,makePuddle,makeObstacle,makeSoul,makeHat,makeBroom,broomChance=0,random=Math.random,config=RUN_DIRECTOR_CONFIG}){
 const space=createRunSpace({rewardRecovery:config.maxTravelSpeed*(config.recognitionSeconds+config.safetySeconds+config.maneuvers.laneLead)}),director=createRunDirector(config),spacing=config.spacing,lava=config.lava;
 let currentPath=0,nextSection=50,lastLava=null,lastProof=null,context={},accepted=0,rejected=0;
 const reset=()=>{space.reset();currentPath=0;nextSection=50;lastLava=null;lastProof=null;accepted=0;rejected=0;};
 function reservePickup(type,s,lanes=[0,1,2]){
  for(const lane of lanes){const r={kind:'reward',type,lane,s,half:.35};if(space.available(r)){space.add(r);return r;}}return null;
 }
 function spawnReward(type,lane,s,y){const r=reservePickup(type,s,[lane]);if(!r)return;({soul:makeSoul,hat:makeHat,broom:makeBroom})[type]?.(lane,pathToZ(s,currentPath),y,s);}
 const validationContext=()=>({...context,pickups:context.getBroomPickups?.()??space.records.filter(r=>r.kind==='reward'&&r.type==='broom'&&r.s-1.1>=currentPath)});
 const hazard=(type,s,lane=-1)=>({kind:'hazard',type,s,lane,half:hazardDepth(type)});
 function pattern(s,phase){
  const lane=(random()*3)|0,other=(lane+1+(random()<.5?0:1))%3;
  const gap=Math.max(spacing.lavaLog,config.maxTravelSpeed*(2*JUMP_VELOCITY/GRAVITY+config.recognitionSeconds+config.safetySeconds));
  const lavaGap=lastLava===null?Infinity:s-lastLava;
  const due=lastLava===null?s>=lava.firstGuaranteed:lavaGap>=lava.maxGap;
  if(due)return [hazard('lava',s)];
  if(random()>phase.density)return [];
  const id=director.choose(phase,random);
  if(id==='slalom'){const third=3-lane-other;return phase.id==='tension'?[hazard('knot',s,lane),hazard('fish',s,other),hazard('fish',s+gap,other),hazard('knot',s+gap,third),hazard('pee',s+2*gap,lane),hazard('fish',s+2*gap,third)]:[hazard('knot',s,lane),hazard('fish',s+gap,other)];}
  if(id==='doubleLog'&&makePineLog)return [hazard('pineLog',s),hazard('pineLog',s+gap)];
  if(id==='jumpSlide'&&makePineLog&&lavaGap>=lava.minGap)return [hazard('lava',s),hazard('pineLog',s+gap),...(phase.id==='tension'?[hazard('knot',s+2*gap,lane)]:[])];
  if(id==='riverPine'&&lavaGap>=lava.minGap)return [hazard('lava',s),hazard('knot',s+gap,lane)];
  if(s>=lava.firstEligible&&lavaGap>=lava.minGap&&random()<lava.chance)return [hazard('lava',s)];
  const weights={...config.obstacleWeights};if(!makePineLog)delete weights.pineLog;const type=chooseRunWeight(weights,random);return [hazard(type,s,type==='pineLog'?-1:lane)];
 }
 function spawn(h){
  const z=pathToZ(h.s,currentPath);
  if(h.type==='lava'){makeLavaRiver(z,h.s);lastLava=h.s;}
  else if(h.type==='pineLog')makePineLog(z,h.s);
  else if(h.type==='fish')makeFish(h.lane,z,h.s);
  else if(h.type==='pee')makePuddle(h.lane,z,h.s);
  else makeObstacle(h.lane,z,'knot',h.s);
  space.add(h);
 }
 function generate(s){
  const phase=director.phaseAt(s),proposed=pattern(s,phase).filter(h=>h.s<phase.end);
  const existing=space.records.filter(r=>r.kind==='hazard'&&r.s+r.half>=currentPath);
  const safe=proposed.every((h,i)=>space.available(h)&&existing.every(b=>compatibleHazards(h,b,spacing))&&proposed.slice(0,i).every(b=>compatibleHazards(h,b,spacing)));
  const endS=(proposed.at(-1)?.s??s)+config.maxTravelSpeed*config.recoverySeconds;
  const proof=safe?validateRunRoute([...existing,...proposed],validationContext(),{config,endS}):{ok:false,reason:'reservation'};
  let last=s,lane=context.lane??1;
  if(proof.ok){for(const h of proposed)spawn(h);last=proposed.at(-1)?.s??s;lane=proof.lanes.at(-1)??lane;accepted++;lastProof={...proof,phase:phase.id,start:s};}
  else{rejected++;lastProof={ok:false,reason:proof.reason,phase:phase.id,start:s};}
  // Rewards follow the verified exit lane. No speculative trail through a hazard.
  // A rejected candidate leaves a recovery section; its rewards still require a witness.
  const count=proof.ok?phase.souls:0;
  for(let j=0;j<count;j++)spawnReward('soul',lane,last+6+j*1.55,1.2+Math.sin(j*.8)*.12);
  if(proof.ok&&random()<phase.powerup){const type=makeBroom&&random()<broomChance/(.075+broomChance)?'broom':'hat';spawnReward(type,lane,last+9+count*1.55);}
  const interval=config.maxTravelSpeed*(phase.id==='recovery'?config.recoverySeconds:2*JUMP_VELOCITY/GRAVITY+config.safetySeconds);
  return last+Math.max(spacing.fullWidth,interval);
 }
 function makeSegment(value){
  const {path}=value;if(!Number.isFinite(path)||path<currentPath)throw Error('Run path must be monotonic');
  currentPath=path;context=value;space.prune(path);
  // At most one bounded witness search per frame, even after a long frame.
  if(nextSection<=path+config.lookahead)nextSection=generate(Math.max(nextSection,path+50));
 }
 makeSegment.reservePickup=(type,{path,preferredS=path+60}={})=>{
  const hazards=space.records.filter(r=>r.kind==='hazard');let checks=0;
  for(let s=Math.max(path+50,preferredS);s<nextSection-9;s+=3)for(const lane of [context.lane??1,0,2,1]){
   if(!space.available({kind:'reward',type,lane,s,half:.35}))continue;
   if(checks++>=config.maxPickupChecks)return null;
   const proof=validateRunRoute([...hazards,hazard('visit',s,lane)],validationContext(),{config});
   if(!proof.ok)continue;
   const r=reservePickup(type,s,[lane]);if(r)return {...r,z:pathToZ(r.s,path)};
 }return null;
 };
 makeSegment.reservations=space.records;
 makeSegment.reset=reset;
 makeSegment.diagnostics=()=>({path:currentPath,frontier:nextSection,phase:director.phaseAt(currentPath).id,accepted,rejected,reservations:space.records.length,proof:lastProof});
 return makeSegment;
}
