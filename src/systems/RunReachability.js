import {createDoubleJump} from '../player/DoubleJump.js';
import {createSlide} from '../player/Slide.js';
import {ULTIMATE_RISE_SECONDS,ULTIMATE_LAND_SECONDS,ultimateLavaGuardDuration} from '../player/UltimateFlight.js';
import {broomLavaGuardDuration,pineLogFlightGuardDuration,pineLogBlocksSlideJump,clearsPineLog,smallPineDoubleJumpCleared,lavaJumpCleared,travelSpeedMultiplier} from './HazardRules.js';
import {hazardDepth} from './RunSpace.js';
import {RUN_DIRECTOR_CONFIG} from './RunDirector.js';

const laneX=lane=>(lane-1)*2.55;
// Bounded witness search: it may conservatively reject a possible pattern, but
// never accepts one merely because an unoccupied lane exists.
export function validateRunRoute(hazards,context={},options={}){
 const config=options.config??RUN_DIRECTOR_CONFIG,dt=options.dt??1/60,path=context.path??0;
 const rows=[];
 for(const h of hazards.filter(h=>h.s+hazardDepth(h.type)>=path&&!h.passed).sort((a,b)=>a.s-b.s)){
  let row=rows.at(-1);if(!row||Math.abs(row.s-h.s)>.01)rows.push(row={s:h.s,hazards:[]});row.hazards.push(h);
 }
 if(!rows.length)return {ok:true,actions:[],lanes:[],steps:0};
 if(rows.length>12)return {ok:false,reason:'horizon-limit',steps:0};
 const initialLane=context.lane??1;
 let routes=[{lanes:[],lane:initialLane,cost:0}];
 for(const row of rows){
  const next=[];
  for(const r of routes)for(const lane of row.hazards.some(h=>h.type==='visit')?[row.hazards.find(h=>h.type==='visit').lane]:row.hazards.some(h=>h.lane<0)?[r.lane]:[r.lane,(r.lane+1)%3,(r.lane+2)%3]){
   const occupied=row.hazards.some(h=>h.lane===lane);
   next.push({lanes:[...r.lanes,lane],lane,cost:r.cost+(lane!==r.lane?.25:0)+(occupied?.8:0)});
  }
  routes=next.sort((a,b)=>a.cost-b.cost).slice(0,config.maxRoutes);
 }
 let steps=0;
 const run=(route,checkDt)=>{
  if(steps>=config.maxSimulationSteps)return {ok:false};
  const result=simulateRoute(rows,route.lanes,context,{...config,dt:checkDt,endS:options.endS,stepLimit:Math.min(2400,config.maxSimulationSteps-steps)});
  steps+=result.steps;return result;
 };
 for(const route of routes){
  const result=run(route,dt);if(!result.ok)continue;
  const checks=options.dt?[]:[1/30,.04];
  if(checks.every(checkDt=>run(route,checkDt).ok))return {...result,lanes:route.lanes,steps};
 }

 return {ok:false,reason:'no-witness',steps};
}
export function simulateRoute(rows,lanes,context,config){
 const dt=config.dt??1/60,jump=createDoubleJump({initialState:context.jump}),slide=createSlide({initialState:context.slide});
 let path=context.path??0,x=context.x??laneX(context.lane??1),lane=context.lane??1,time=0,slip=context.slip??0,shield=context.shield??0;
 let broom=context.broomRemaining??0,ult=context.ultimateRemaining??0,lift=context.ultimateProgress??0;
 const startPath=path,end=config.endS??rows.at(-1).s+hazardDepth(rows.at(-1).hazards[0].type)+config.maxTravelSpeed*config.recoverySeconds;
 const events=[],actions=[],seen=new Map(),pickups=(context.pickups??[]).filter(p=>p.type==='broom'),collected=new Set();
 rows.forEach((row,i)=>{
  if(row.s<=path)return;
  events.push({row,type:'move',lane:lanes[i],lead:config.maneuvers.laneLead});
  const h=row.hazards.find(h=>h.lane<0||h.lane===lanes[i]);if(!h||h.type==='visit')return;
  events.push({row,type:h.type==='pineLog'?'slide':'jump',lead:h.type==='knot'?config.maneuvers.pineFirstLead:config.maneuvers.lowJumpLead});
  if(h.type==='knot')events.push({row,type:'second',lead:config.maneuvers.pineSecondLead});
 });
 for(const p of pickups)if(path>p.s-1.1){collected.add(p);if(ult<=0&&lift<=0&&lane===p.lane&&Math.abs(x-laneX(p.lane))<1.05){broom=config.flight.broomDuration;jump.reset();slide.reset();slip=0;}}
 const blocked=()=>rows.some(r=>r.hazards.some(h=>h.type==='pineLog'&&pineLogBlocksSlideJump(path-h.s,path>h.s+hazardDepth(h.type))));
 const stepLimit=config.stepLimit??2400;
 for(let step=0;step<stepLimit;step++){
  const base=Math.min(29,15+path*.72*.009),oldPath=path;
  if(ult>0){const speed=base*config.flight.ultimateMultiplier;for(const r of rows)for(const h of r.hazards){const gap=path-h.s;if(h.type==='pineLog'){const guard=pineLogFlightGuardDuration(gap,speed);if(guard>0)ult=Math.max(ult,guard+ULTIMATE_LAND_SECONDS);}else if(h.type==='lava')ult=Math.max(ult,ultimateLavaGuardDuration(gap,2.95,speed));}ult=Math.max(0,ult-dt);}
  lift=ult>0?Math.min(1,lift+dt/ULTIMATE_RISE_SECONDS):Math.max(0,lift-dt/ULTIMATE_LAND_SECONDS);
  if(broom>0){const speed=base*config.flight.broomMultiplier;for(const r of rows)for(const h of r.hazards){const gap=path-h.s;if(h.type==='pineLog'&&gap>=-16&&gap<9)broom=Math.max(broom,(9-gap)/speed+.03);if(h.type==='lava')broom=Math.max(broom,broomLavaGuardDuration(gap,2.95,speed));}broom=Math.max(0,broom-dt);}
  const flying=ult>0||lift>0,speed=base*travelSpeedMultiplier(flying,broom>0,config.flight.broomMultiplier,config.flight.ultimateMultiplier);
  for(const row of rows)if(!seen.has(row)&&row.s-path<=config.recognitionDistance)seen.set(row,time);
  for(const e of events){
   if(e.done||time<(e.after??0)||time-(seen.get(e.row)??Infinity)<(config.recognitionSeconds+config.safetySeconds)||path<e.row.s-hazardDepth(e.row.hazards[0].type)-speed*e.lead)continue;
   e.done=true;
   if(slip>0)continue;
   if(e.type==='move'){if(lane!==e.lane){const direction=Math.sign(e.lane-lane);lane+=direction;actions.push({path,time,type:'move',lane,direction});if(lane!==e.lane){e.done=false;e.after=time+config.inputSeconds;}}continue;}
   if(flying||broom>0)continue;
   if(e.type==='slide'){if(!jump.airborne){slide.press();actions.push({path,time,type:'slide'});}continue;}
   if(e.type==='second'&&jump.jumpsUsed!==1)continue;
   if(slide.active){if(blocked()){slide.queueJump();continue;}slide.cancel();}
   if(jump.jump())actions.push({path,time,type:'jump'});
  }
  path+=speed*dt;time+=dt;
  if(!flying&&broom<=0)jump.update(dt);
  slide.update(dt);slip=Math.max(0,slip-dt);shield=Math.max(0,shield-dt);
  x+=(laneX(lane)-x)*Math.min(1,dt*12);
  for(const r of rows)for(const h of r.hazards){
   if(h.type==='visit'){if(oldPath<=h.s&&path>=h.s&&(lane!==h.lane||Math.abs(x-laneX(h.lane))>=1.05))return {ok:false,steps:step+1};continue;}
   const half=hazardDepth(h.type);if(oldPath>h.s+half||path<h.s-half||flying||shield>0)continue;
   if(h.lane>=0&&Math.abs(x-laneX(h.lane))>=1.05)continue;
   if(h.type==='knot'){if(!smallPineDoubleJumpCleared(jump.jumpsUsed,jump.height))return {ok:false,steps:step+1};}
   else if(broom>0)continue;
   else if(h.type==='pineLog'){if(!clearsPineLog(slide.active,false,false,jump.jumpsUsed,jump.height))return {ok:false,steps:step+1};}
   else if(h.type==='lava'){if(!lavaJumpCleared(jump.airborne,jump.height))return {ok:false,steps:step+1};}
   else if(!jump.airborne)return {ok:false,steps:step+1}; // A witness never relies on slipping through a puddle.
  }
  if(slide.jumpQueued&&!flying&&broom<=0&&slip<=0&&!jump.airborne&&!blocked()&&slide.consumeJump()){slide.cancel();jump.jump();actions.push({path,time,type:'jump'});}
  for(const p of pickups)if(!collected.has(p)&&path>p.s-1.1){collected.add(p);if(!flying&&lane===p.lane&&Math.abs(x-laneX(p.lane))<1.05){broom=config.flight.broomDuration;jump.reset();slide.reset();slip=0;}}
  if(path>=end)return {ok:true,actions,steps:step+1,end:{path,x,lane,jump:jump.snapshot(),slide:slide.snapshot()},distance:path-startPath};
 }
 return {ok:false,reason:'step-limit',steps:stepLimit};
}
