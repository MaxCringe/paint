import {snapshotRouteContext} from './RunTrajectory.js';
import {createRunSpace,pathToZ,hazardDepth,laneMask} from './RunSpace.js';
import {createRunDirector,chooseRunWeight,RUN_DIRECTOR_CONFIG} from './RunDirector.js';
import {validateRunRoute,replayRunWitness} from './RunReachability.js';
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
 const space=createRunSpace(),director=createRunDirector(config),spacing=config.spacing,lava=config.lava;
 let currentPath=0,nextSection=50,lastLava=null,lastProof=null,context={},accepted=0,rejected=0;
 let stats={reasons:{},fallbackSafe:0,fallbackUnproven:0,rewardRejected:0,pickupChecks:0,validationSteps:0},pickupCache=new Map(),branchCertificates=new Map();
 const reset=()=>{space.reset();currentPath=0;nextSection=50;lastLava=null;lastProof=null;accepted=0;rejected=0;stats={reasons:{},fallbackSafe:0,fallbackUnproven:0,rewardRejected:0,pickupChecks:0,validationSteps:0};pickupCache.clear();branchCertificates.clear();};
 function reservePickup(type,s,lanes=[0,1,2]){
  for(const lane of lanes){const r={kind:'reward',type,lane,s,half:.35};if(space.available(r)){space.add(r);return r;}}return null;
 }
 const validationContext=()=>({...context,pickups:context.getLivePickups?.()??context.pickups??context.getBroomPickups?.()??space.records.filter(r=>r.kind==='reward'&&r.s+1.5>=currentPath)});
 const hazard=(type,s,lane=-1)=>({kind:'hazard',type,s,lane,half:hazardDepth(type)});
 const visit=r=>({...hazard('visit',r.s,r.lane),pickupType:r.type,magnetAllowed:r.type==='soul'&&((context.magnetRemaining??0)>0||validationContext().pickups.some(p=>p.type==='hat'&&p.s<r.s+11.5))});
 const note=reason=>{stats.reasons[reason]=(stats.reasons[reason]??0)+1;};
 function certify(hazards,budget,visits=[],extra=[],initial){
  const c=initial??validationContext(),proof=validateRunRoute([...hazards,...visits.map(visit)],{...c,pickups:[...c.pickups,...extra]},{config,budget});
  stats.validationSteps+=proof.steps??0;return proof;
 }
 function liveBranches(){
  const live=context.getLivePickups?.(),keys=live?new Set(live.map(p=>p.type+'|'+p.s+'|'+p.lane)):null,groups=new Map();
  for(const r of space.records)if(r.kind==='reward'&&(keys?keys.has(r.type+'|'+r.s+'|'+r.lane):r.s+1.5>=currentPath)){
   const id=r.branchId??r.type+':'+r.s;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);
  }
  for(const id of branchCertificates.keys())if(!groups.has(id))branchCertificates.delete(id);
  return [...groups.values()];
 }
 function stageRewards(phase,last,lane,branchId,hazards,budget){
  const staged=[];
  const stage=(type,s,y)=>{
   const record={kind:'reward',type,lane,s,half:.35,branchId};if(!space.available(record))return;
   const created=({soul:makeSoul,hat:makeHat,broom:makeBroom})[type]?.(lane,pathToZ(s,currentPath),y,s,record);
   Object.assign(record,{phase:created?.phase??1,z:created?.z??pathToZ(s,currentPath),baseY:created?.baseY??1.2});space.add(record);staged.push({record,rollback:created?.rollback});
  };
  for(let j=0;j<phase.souls;j++)stage('soul',last+6+j*1.55,1.2+Math.sin(j*.8)*.12);
  if(random()<phase.powerup)stage(makeBroom&&random()<broomChance/(.075+broomChance)?'broom':'hat',last+9+phase.souls*1.55);
  if(!staged.length)return;
  const proof=certify(hazards,budget,staged.map(p=>p.record));
  if(!proof.ok){for(const p of staged){p.rollback?.();space.records.splice(space.records.indexOf(p.record),1);}stats.rewardRejected++;note('reward:'+proof.reason);return null;}branchCertificates.set(branchId,{initial:proof.initial,visits:staged.map(p=>p.record),sequence:hazards,exit:proof.visitExit});return proof;
 }
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
  const phase=director.phaseAt(s),proposed=pattern(s,phase).filter(h=>h.s<phase.end),budget={remaining:(config.maxSectionSteps??18000)-config.maxSimulationSteps};
  const existing=space.records.filter(r=>r.kind==='hazard'&&r.s+r.half>=currentPath);
  // Centre-gap preferences still shape patterns. Physical reservations and the
  // executable trajectory, not a blanket 52-unit rule, decide final safety.
  const spatial=proposed.every(h=>space.available(h));
  let proof=spatial?certify([...existing,...proposed],budget):{ok:false,reason:'reservation'};
  const branchUpdates=[];
  if(proof.ok)for(const branch of liveBranches()){
   const id=branch[0].branchId??branch[0].type+':'+branch[0].s,certificate=branchCertificates.get(id);
   let continuation,sequence;
   if(certificate?.exit&&proposed.every(h=>h.s-h.half>certificate.exit.path)){
    const unique=new Map([...certificate.sequence,...existing,...proposed].map(h=>[h.type+'|'+h.s+'|'+h.lane,h]));sequence=[...unique.values()];
    continuation=certify(sequence,budget,[],[],certificate.exit);
   }else{sequence=[...existing,...proposed];continuation=certify(sequence,budget,branch,[],certificate?.initial);}
   if(!continuation.ok){proof={...continuation,reason:'reward-continuation:'+continuation.reason};break;}
   if(certificate)branchUpdates.push({id,value:{...certificate,sequence}});
  }
  let last=s,lane=context.lane??1;
  if(proof.ok){
   for(const update of branchUpdates)branchCertificates.set(update.id,update.value);
   for(const h of proposed)spawn(h);last=proposed.at(-1)?.s??s;lane=proof.lanes.at(-1)??lane;
   accepted++;lastProof={...proof,phase:phase.id,start:s,acceptedPattern:true};
   const rewarded=stageRewards(phase,last,lane,'section:'+s,[...existing,...proposed],budget);
   if(rewarded?.ok)lastProof={...rewarded,phase:phase.id,start:s,acceptedPattern:true,rewardRoute:true};
  }else{
   rejected++;note(proof.reason);
   const fallbackBudget={remaining:config.maxSimulationSteps};let fallback=null;
   // First replay the previously offered route from the actual current state.
   // This also handles a command whose threshold was crossed in the last frame.
   const previous=lastProof?.ok?lastProof.actions:[];
   const firstFuture=previous.findIndex(a=>a.path>=currentPath);
   const cuts=[previous.length,...new Set([Math.max(0,(firstFuture<0?previous.length:firstFuture)-1),Math.max(0,firstFuture)])];
   for(const cut of cuts){
    if(fallbackBudget.remaining<=0)break;
    const c=validationContext(),actions=previous.slice(cut);let candidate=null,ok=true,used=0;
    for(const deltas of [[1/60],[.04],[.1,1/60,1/120,1/30]]){
     const r=replayRunWitness(existing,c,actions,{config,deltas,stepLimit:Math.min(2400,fallbackBudget.remaining-used)});used+=r.steps;
     if(!r.ok||!r.metrics.comfortable){ok=false;break;}candidate??=r;
    }
    fallbackBudget.remaining-=used;stats.validationSteps+=used;
    if(ok&&candidate){fallback={...candidate,initial:snapshotRouteContext(c),sequence:existing,lanes:[],steps:used};break;}
   }
   fallback??=certify(existing,fallbackBudget);
   if(fallback.ok)stats.fallbackSafe++;else stats.fallbackUnproven++;
   lastProof={...fallback,fallback:true,acceptedPattern:false,rejectionReason:proof.reason,phase:phase.id,start:s};
  }
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
  const key=[Math.floor(path/3),context.lane,context.broomRemaining>0,context.ultimateRemaining>0,nextSection].join('|');
  if(pickupCache.get(type)===key)return null;pickupCache.set(type,key);
  const hazards=space.records.filter(r=>r.kind==='hazard');let checks=0;const budget={remaining:config.maxSimulationSteps};
  for(let s=Math.max(path+50,preferredS);s<nextSection-9;s+=3)for(const lane of [...new Set([context.lane??1,0,2,1])]){
   if(!space.available({kind:'reward',type,lane,s,half:.35}))continue;
   if(checks++>=config.maxPickupChecks)return null;
   stats.pickupChecks++;const record={kind:'reward',type,lane,s,half:.35,branchId:type+':'+s};
   const proof=certify(hazards,budget,[record],[record]);if(!proof.ok)continue;
   space.add(record);branchCertificates.set(record.branchId,{initial:proof.initial,visits:[record],sequence:hazards,exit:proof.visitExit});return {...record,z:pathToZ(s,path)};
  }return null;
 };
 makeSegment.reservations=space.records;
 makeSegment.reset=reset;
 makeSegment.diagnostics=()=>({path:currentPath,frontier:nextSection,phase:director.phaseAt(currentPath).id,accepted,rejected,reservations:space.records.length,proof:lastProof,stats:structuredClone(stats)});
 return makeSegment;
}
