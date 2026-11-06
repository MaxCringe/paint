import {JUMP_VELOCITY,GRAVITY} from '../player/DoubleJump.js';
import {RUN_DIRECTOR_CONFIG} from './RunDirector.js';
import {hazardDepth} from './RunSpace.js';
import {lanePosition,bodyOverlapsLane} from './RunMechanics.js';
import {createRunTrajectory,routeContext,hazardKey,snapshotRouteContext} from './RunTrajectory.js';

const entry=h=>h.s-(h.type==='visit'&&['hat','broom'].includes(h.pickupType)?1.1:hazardDepth(h.type));
function routeRows(hazards,context){
 const passed=new Set((context.passedHazards??[]).map(h=>Array.isArray(h)?h.join('|'):typeof h==='string'?h:hazardKey(h)));
 const rows=[];
 for(const h of hazards.filter(h=>!h.passed&&!passed.has(hazardKey(h))).sort((a,b)=>a.s-b.s)){
  let row=rows.at(-1);if(!row||Math.abs(row.s-h.s)>.01)rows.push(row={s:h.s,entry:entry(h),hazards:[]});
  row.hazards.push(h);row.entry=Math.min(row.entry,entry(h));
 }
 return rows;
}
function laneRoutes(rows,lane,limit){
 let routes=[{lanes:[],lane,cost:0}];
 for(const row of rows){
  const next=[],visit=row.hazards.find(h=>h.type==='visit'&&!h.magnetAllowed);
  for(const r of routes)for(const target of visit?[visit.lane]:row.hazards.some(h=>h.lane<0)?[r.lane]:[r.lane,(r.lane+1)%3,(r.lane+2)%3]){
   next.push({lanes:[...r.lanes,target],lane:target,cost:r.cost+(target!==r.lane?.25:0)+(row.hazards.some(h=>h.lane===target&&h.type!=='visit')?.8:0)});
  }
  routes=next.sort((a,b)=>a.cost-b.cost).slice(0,limit);
 }
 return routes;
}
function* programs(rows,lanes,config){
 const selected=[];
 rows.forEach((r,i)=>{for(const h of r.hazards)if(h.type!=='visit'&&(h.lane<0||h.lane===lanes[i]))selected.push(h);});
 const groups=[];
 for(const h of selected.sort((a,b)=>entry(a)-entry(b))){let g=groups.at(-1);const end=h.s+hazardDepth(h.type);if(!g||entry(h)>g.end)groups.push(g={entry:entry(h),end,hazards:[]});g.hazards.push(h);g.end=Math.max(g.end,end);}
 const timing=config.maneuvers,profiles=[];
 // Explore timing, rather than declaring an overlapping log/river impossible.
 for(let a=0;a<(config.timingSearch?.firstOffsets??5);a++)for(let b=0;b<(config.timingSearch?.secondOffsets??4);b++)profiles.push({first:timing.pineFirstLead+a*config.inputSeconds,second:timing.pineSecondLead+b*config.inputSeconds});
 const nearby=selected.some(h=>h.type==='pineLog'&&selected.some(b=>b.type==='lava'&&Math.abs(b.s-h.s)<config.maxTravelSpeed*.72));
 for(const doubleLogs of nearby?[true,false]:[false,true])for(const profile of profiles){
  const events=rows.map((row,i)=>({type:'move',row,lane:lanes[i],target:row.entry,lead:timing.laneLead,expires:Math.max(...row.hazards.map(h=>h.s+hazardDepth(h.type)))}));
  for(const g of groups){
   const types=new Set(g.hazards.map(h=>h.type)),tall=g.hazards.filter(h=>h.type==='knot'||h.type==='pineLog');
   const reference=tall.length?Math.min(...tall.map(entry)):g.entry;
   const row={s:g.entry,entry:g.entry};
   const double=types.has('knot')||types.has('pineLog')&&(doubleLogs||types.has('lava'))||types.has('lava')&&g.end-g.entry>15*(2*Math.sqrt(JUMP_VELOCITY**2-2*GRAVITY*.62)/GRAVITY-config.inputSeconds);
   if(double){
    const lowOnly=!tall.length;
    events.push({type:'jump',role:'first',row,target:reference,lead:lowOnly?timing.lowJumpLead:profile.first,expires:g.end});
    events.push({type:'jump',role:'second',row,target:reference,lead:lowOnly?timing.lowJumpLead-(2*JUMP_VELOCITY/GRAVITY-config.safetySeconds):profile.second,expires:g.end});
   }else events.push({type:types.has('pineLog')?'slide':'jump',row,target:reference,lead:timing.lowJumpLead,expires:g.end});
  }
  yield events;
 }
}
function visibilityTime(e,context,config){return -Math.max(0,(config.recognitionDistance-(e.row.entry-(context.path??0)))/config.maxTravelSpeed);}
function metricsFor(actions,rows,context,config,firstContact,bodyViolation){
 let slack=Infinity,minInput=Infinity,previous=null,unseenActions=0;const transitions=[];
 for(const a of actions){if(a.recognitionSlack===-Infinity)unseenActions++;slack=Math.min(slack,a.recognitionSlack??Infinity);if(previous){const seconds=(a.intendedTime??a.time)-(previous.intendedTime??previous.time);minInput=Math.min(minInput,seconds);transitions.push({from:previous.type,to:a.type,seconds});}previous=a;}
 const comfortable=slack>=-1e-8&&minInput>=config.inputSeconds-1e-8&&!bodyViolation;
 return {comfortable,unseenActions,recognitionSeconds:config.recognitionSeconds,safetySeconds:config.safetySeconds,
  minRecognitionSlack:Number.isFinite(slack)?slack:null,minRepeatInputInterval:Number.isFinite(minInput)?minInput:null,minInputInterval:Number.isFinite(minInput)?minInput:null,transitions,
  firstContactTime:firstContact??null,firstActionTime:actions[0]?.time??null,bodyViolation:Boolean(bodyViolation)};
}
function traceRun(hazards,context,config,{events,actions:fixed,dt=1/60,deltas,endS,limit=2400,waitForRecognition=false}={}){
 const engine=createRunTrajectory(hazards,context,config),s=engine.state,start=s.path;
 const rows=routeRows(hazards,context),lastEnd=Math.max(start,...hazards.map(h=>h.s+hazardDepth(h.type))),end=endS??Infinity;
 const inputs=[],seen=new Map(),pending=(events??[]).map(e=>({...e}));
 const entries=[...new Set([...(events??[]).map(e=>e.row.entry),...(fixed??[]).map(a=>a.encounterEntry).filter(Number.isFinite)])];
 for(const value of entries)if(value-(context.path??0)<=config.recognitionDistance)seen.set(value,-Math.max(0,(config.recognitionDistance-(value-(context.path??0)))/config.maxTravelSpeed));let index=0,firstContact=null,lastJump=-Infinity,lastInput=-Infinity,bodyViolation=false,clearedAt=null,visitExit=null,waitingForRecognition=false;
 for(let step=0;step<limit;step++){
  for(const value of entries)if(!seen.has(value)&&value-s.path<=config.recognitionDistance)seen.set(value,s.time);
  if(fixed){while(index<fixed.length&&fixed[index].path<=s.path+1e-9){const a=fixed[index++];if(!engine.command(a))return {ok:false,reason:'action-state',steps:step+1,failure:{reason:'action-state',path:s.path,input:a}};inputs.push({...a,path:s.path,time:s.time,intendedTime:a.time,recognitionSlack:s.time-(seen.get(a.encounterEntry)??Infinity)-config.recognitionSeconds-config.safetySeconds});}}
  else for(const e of pending){
   const speed=Math.min(29,15+s.path*.72*.009)*(engine.flying()?config.flight.ultimateMultiplier:s.broomRemaining>0?config.flight.broomMultiplier:1);
   if(s.path>e.expires){e.done=true;continue;}
   if(s.time-lastInput<config.inputSeconds-1e-9)continue;
   if(e.done||s.time<(e.after??0)||s.path<e.target-speed*e.lead)continue;
   if(e.type==='move'&&s.lane===e.lane){e.done=true;continue;}
   if(waitForRecognition&&s.time-(seen.get(e.row.entry)??Infinity)<config.recognitionSeconds+config.safetySeconds){waitingForRecognition=true;continue;}
   if(e.role==='first'&&engine.jump.airborne){e.done=true;continue;}
   if(e.role==='second'&&engine.jump.jumpsUsed!==1){if(s.path>e.target+3)e.done=true;continue;}
   if(e.type==='jump'&&s.time-lastJump<config.inputSeconds-1e-9)continue;
   const input={type:e.type,path:s.path,time:s.time,encounterEntry:e.row.entry};if(e.type==='move'){input.direction=Math.sign(e.lane-s.lane);input.lane=s.lane+input.direction;}
   if(!engine.command(input))continue;
   input.recognitionSlack=s.time-(seen.get(e.row.entry)??Infinity)-config.recognitionSeconds-config.safetySeconds;
   inputs.push(input);lastInput=s.time;if(e.type==='jump')lastJump=s.time;
   e.done=true;if(e.type==='move'&&s.lane!==e.lane){e.done=false;e.after=s.time+config.inputSeconds;}
  }
  const before=s.path,rawDt=deltas?deltas[step%deltas.length]:dt;
  engine.step(rawDt);
  for(const row of rows)if(firstContact===null&&row.hazards.some(h=>h.type!=='visit')&&before<=row.entry&&s.path>=row.entry)firstContact=s.time;
  // A real lane command must also carry the body clear; don't certify a route
  // that only abuses the runtime's target-lane gate while clipping the old lane.
  for(const h of hazards)if(h.lane>=0&&h.type!=='visit'&&s.lane!==h.lane&&Math.abs(s.path-h.s)<hazardDepth(h.type)&&bodyOverlapsLane(s.x,h.lane)&&!engine.flying()&&s.shield<=0&&s.broomRemaining<=0&&!engine.jump.airborne)bodyViolation=true;
  if(s.failure)return {ok:false,reason:s.failure.reason,failure:s.failure,waitingForRecognition,steps:step+1};
  if(visitExit===null&&hazards.some(h=>h.type==='visit')&&engine.visitsComplete())visitExit=engine.snapshot();
  if(s.path>=lastEnd&&clearedAt===null)clearedAt=s.time;
  if(s.path>=end||endS===undefined&&clearedAt!==null&&s.time-clearedAt>=config.recoverySeconds){if(!engine.visitsComplete())return {ok:false,reason:'pickup-unreachable',steps:step+1};const actions=inputs;return {ok:true,actions,steps:step+1,end:engine.snapshot(),visitExit,distance:s.path-start,waitingForRecognition,metrics:metricsFor(actions,rows,context,config,firstContact,bodyViolation)};}
 }
 return {ok:false,reason:'step-limit',steps:limit};
}
export function replayRunWitness(hazards,raw,actions,options={}){
 const context=routeContext(raw),config=options.config??RUN_DIRECTOR_CONFIG;
 return traceRun(hazards,context,config,{actions,dt:options.dt,deltas:options.deltas,endS:options.endS,limit:options.stepLimit??2400});
}
export function validateRunRoute(hazards,raw={},options={}){
 if(hazards.some(h=>!['lava','pineLog','knot','pee','fish','visit'].includes(h.type)||!Number.isFinite(h.s)||!Number.isInteger(h.lane)||h.lane< -1||h.lane>2))return {ok:false,physicalPossible:null,reason:'invalid-hazard',steps:0};
 const context=routeContext(raw),baseConfig=options.config??RUN_DIRECTOR_CONFIG,config=options.budget?{...baseConfig,maxSimulationSteps:Math.min(baseConfig.maxSimulationSteps,options.budget.remaining)}:baseConfig,rows=routeRows(hazards,context);
 const finish=value=>{if(options.budget)options.budget.remaining-=value.steps??0;return value;};
 if(!Number.isInteger(config.timingSearch?.firstOffsets)||config.timingSearch.firstOffsets<1||config.timingSearch.firstOffsets>8||!Number.isInteger(config.timingSearch?.secondOffsets)||config.timingSearch.secondOffsets<1||config.timingSearch.secondOffsets>8)return finish({ok:false,reason:'invalid-config',steps:0,physicalPossible:null});
 if(rows.length>24)return finish({ok:false,physicalPossible:null,reason:'horizon-limit',steps:0});
 let steps=0,physicalPossible=false,lastFailure=null,best=null;const certified=[];const failures={},dedup=new Set();
 const run=opt=>{
  if(steps>=config.maxSimulationSteps)return {ok:false,reason:'search-budget',steps:0};
  const r=traceRun(hazards,context,config,{...opt,endS:options.endS,limit:Math.min(2400,config.maxSimulationSteps-steps)});steps+=r.steps;return r;
 };
 for(const route of laneRoutes(rows,context.lane??1,config.maxRoutes))for(const events of programs(rows,route.lanes,config)){
  const key=events.map(e=>[e.type,e.role,e.target,e.lead,e.lane].join(',')).join(';');if(dedup.has(key))continue;dedup.add(key);
  let result=run({events,dt:options.dt??1/60,waitForRecognition:true});
  if(!result.ok&&result.waitingForRecognition){const physical=run({events,dt:options.dt??1/60});if(physical.ok){physicalPossible=true;failures['reaction-budget']=(failures['reaction-budget']??0)+1;} }
  if(!result.ok){failures[result.reason]=(failures[result.reason]??0)+1;lastFailure=result.failure;if(steps>=config.maxSimulationSteps)break;continue;}
  physicalPossible=true;
  if(!result.metrics.comfortable){const reason=result.metrics.bodyViolation?'lane-transition':'reaction-budget';failures[reason]=(failures[reason]??0)+1;continue;}
  let robust=true;
  for(const deltas of options.dt?[[options.dt]]:[[1/30],[.04],[.1,1/60,1/120,1/30]]){
   const check=run({actions:result.actions,deltas});if(!check.ok||!check.metrics.comfortable){robust=false;failures['witness-replay']=(failures['witness-replay']??0)+1;lastFailure=check.failure;break;}
  }
  if(robust){const found={...result,initial:snapshotRouteContext(context),sequence:hazards.map(h=>({...h})),lanes:route.lanes,steps,physicalPossible:true,alternativeCandidates:laneRoutes(rows,context.lane??1,config.maxRoutes).length,verifiedAlternatives:0,failures};
   const signature=JSON.stringify(found.actions.map(a=>[a.type,a.path,a.direction]));
   if(!certified.some(p=>p.signature===signature))certified.push({signature,proof:found});
   best??=found;
   if(!options.findAlternatives||certified.length>=2)return finish({...best,steps,verifiedAlternatives:certified.length-1,alternatives:certified.slice(1).map(p=>p.proof)});
  }
  if(steps>=config.maxSimulationSteps)break;
 }
 if(best)return finish({...best,steps,verifiedAlternatives:certified.length-1,alternatives:certified.slice(1).map(p=>p.proof)});
 const reason=physicalPossible&&failures['reaction-budget']?'reaction-budget':steps>=config.maxSimulationSteps?'search-budget':physicalPossible?'reaction-budget':lastFailure?.reason??'no-witness';
 return finish({ok:false,physicalPossible:physicalPossible?true:null,reason,steps,searchLimited:steps>=config.maxSimulationSteps,failures,failure:lastFailure});
}
// Compatibility for existing diagnostics: a fixed lane sequence still gets a
// concrete input trace, using the same mechanics as the witness replay.
export function simulateRoute(rows,lanes,context,config){return traceRun(rows.flatMap(r=>r.hazards),routeContext(context),config,{events:programs(rows,lanes,config).next().value,dt:config.dt,endS:config.endS,limit:config.stepLimit??2400});}
