import {createDoubleJump} from '../player/DoubleJump.js';
import {createSlide} from '../player/Slide.js';
import {createUltimateFlight} from '../player/UltimateFlight.js';
import {SOULS_PER_ULT,ULT_DURATION} from '../config.js';
import {advanceSoulMotion,soulCaught} from '../souls/SoulMotion.js';
import {flightHold,advanceLane,lanePosition,bodyOverlapsLane,nextBroomBlend,pointContact} from './RunMechanics.js';
import {lavaCrossingTouchesRunner,pineLogCrossingTouchesRunner,smallPineCrossingTouchesRunner,pineLogBlocksSlideJump,lavaJumpCleared,clearsPineLog,smallPineDoubleJumpCleared,travelSpeedMultiplier} from './HazardRules.js';

export const hazardKey=h=>h.type+'|'+h.s+'|'+h.lane;
export function routeContext(raw={}){
 return {...raw,passedHazards:raw.passedHazards??raw.getPassedHazards?.()??[],
  pickups:raw.pickups??raw.getLivePickups?.()??raw.getBroomPickups?.()??[]};
}
export function createRunTrajectory(hazards,raw,config){
 const c=routeContext(raw),jump=createDoubleJump({initialState:c.jump}),slide=createSlide({initialState:c.slide}),ultimate=createUltimateFlight();
 ultimate.restore({progress:c.ultimateProgress??0});
 const state={path:c.path??0,lane:c.lane??1,x:c.x??lanePosition(c.lane??1),time:0,timeMs:c.timeMs??0,
  slip:c.slip??0,invuln:c.invuln??0,shield:c.shield??0,broomRemaining:c.broomRemaining??0,
  broomBlend:c.broomBlend??(c.broomRemaining?1:0),ultimateRemaining:c.ultimateRemaining??0,
  magnetRemaining:c.magnetRemaining??0,soulCharge:c.soulCharge??0,failure:null};
 const runner={x:state.x,z:2.3};
 const passed=new Set(c.passedHazards.map(h=>Array.isArray(h)?h.join('|'):typeof h==='string'?h:hazardKey(h)));
 for(const h of hazards)if(h.passed)passed.add(hazardKey(h));
 const visited=new Set(),taken=new Set(),pickups=c.pickups.map((p,i)=>({...p,key:p.id??p.type+'|'+p.s+'|'+p.lane,position:p.position?{...p.position}:{x:lanePosition(p.lane),y:p.baseY??1.2,z:2.3+state.path-p.s},baseY:p.baseY??1.2,phase:p.phase??1,z:p.z??(2.3+state.path-p.s)}));
 const blocked=()=>hazards.some(h=>h.type==='pineLog'&&pineLogBlocksSlideJump(state.path-h.s,passed.has(hazardKey(h))));
 const flying=()=>state.ultimateRemaining>0||ultimate.active;
 function command(a){
  if(state.failure||state.slip>0)return false;
  if(a.type==='move'){
   const direction=a.direction??Math.sign(a.lane-state.lane);if(!direction)return false;
   const lane=Math.max(0,Math.min(2,state.lane+Math.sign(direction)));if(lane===state.lane)return false;state.lane=lane;return true;
  }
  if(flying()||state.broomRemaining>0)return false;
  if(a.type==='slide'){if(jump.airborne)return false;slide.press();return true;}
  if(slide.active||slide.jumpQueued){if(blocked()){slide.queueJump();return true;}slide.cancel();}
  return jump.jump();
 }
 function activateUltimate(){state.ultimateRemaining=ULT_DURATION;ultimate.activate(height());state.broomRemaining=0;state.broomBlend=0;jump.reset();slide.reset();state.soulCharge=0;}
 function height(){return state.broomRemaining>0||state.broomBlend>0?.77*state.broomBlend:jump.height;}
 function fail(reason,h){state.failure={reason,hazard:h?{type:h.type,s:h.s,lane:h.lane}:undefined,path:state.path,height:jump.height,jumpsUsed:jump.jumpsUsed};}
 function step(rawDt){
  if(state.failure)return state;
  const dt=Math.min(rawDt,.04),oldPath=state.path,oldX=state.x,oldJump=jump.snapshot(),base=Math.min(29,15+state.path*.72*.009);
  if(state.ultimateRemaining>0){for(const h of hazards)state.ultimateRemaining=Math.max(state.ultimateRemaining,flightHold('ultimate',h.type,state.path-h.s,h.half??2.95,base*config.flight.ultimateMultiplier,passed.has(hazardKey(h))));state.ultimateRemaining=Math.max(0,state.ultimateRemaining-dt);}
  if(state.ultimateRemaining<=0&&state.soulCharge>=SOULS_PER_ULT&&!ultimate.active)activateUltimate();
  ultimate.update(dt,state.ultimateRemaining>0);const ult=flying();
  if(state.broomRemaining>0)for(const h of hazards)state.broomRemaining=Math.max(state.broomRemaining,flightHold('broom',h.type,state.path-h.s,h.half??2.95,base*config.flight.broomMultiplier,passed.has(hazardKey(h))));
  state.broomRemaining=Math.max(0,state.broomRemaining-dt);state.broomBlend=nextBroomBlend(state.broomRemaining,state.broomBlend,dt);
  state.path+=base*travelSpeedMultiplier(ult,state.broomRemaining>0,config.flight.broomMultiplier,config.flight.ultimateMultiplier)*dt;
  state.time+=dt;state.timeMs+=rawDt*1000;state.magnetRemaining=Math.max(0,state.magnetRemaining-dt);
  if(!ult&&state.broomRemaining<=0)jump.update(dt);slide.update(dt);
  state.slip=Math.max(0,state.slip-dt);state.invuln=Math.max(0,state.invuln-dt);state.shield=Math.max(0,state.shield-dt);
  state.x=advanceLane(state.x,state.lane,dt);
  const jumping=!ult&&state.broomRemaining<=0&&jump.airborne,sliding=!ult&&state.broomRemaining<=0&&slide.active;
  for(const h of hazards){
   const before=oldPath-h.s,after=state.path-h.s,key=hazardKey(h);
   if(h.type==='visit'){
    const pickupType=h.pickupType??'point';
    if(pickupType==='point'){
     if(oldPath<=h.s&&state.path>=h.s&&h.lane===state.lane&&bodyOverlapsLane(state.x,h.lane))visited.add(key);
     if(state.path>=h.s&&!visited.has(key)){fail('pickup-unreachable',h);break;}
    }
    continue;
   }
   // Do not predict the runtime's early ultimate passed flag: its exact frame
   // can differ on landing. Only an already observed flag or a fully cleared
   // corridor is a valid certificate. Point hazards pass at their real trigger.
   if(ult&&!['lava','pineLog','knot'].includes(h.type)&&pointContact(after))passed.add(key);
   if(passed.has(key))continue;
   const laneHit=h.lane<0||h.lane===state.lane&&bodyOverlapsLane(state.x,h.lane);
   let touches=false;
   if(h.type==='lava')touches=lavaCrossingTouchesRunner(before,after,h.half??2.95);
   else if(h.type==='pineLog')touches=pineLogCrossingTouchesRunner(before,after);
   else if(h.type==='knot')touches=smallPineCrossingTouchesRunner(before,after);
   else if(!ult&&pointContact(after)){touches=true;passed.add(key);}
   if(!ult&&touches&&laneHit&&state.shield<=0){
    if(h.type==='knot'){if(!smallPineDoubleJumpCleared(jump.jumpsUsed,jump.height))fail('jump-height',h);}
    else if(state.broomRemaining>0){}
    else if(h.type==='pineLog'){if(!clearsPineLog(sliding,false,false,jump.jumpsUsed,jump.height))fail(jump.airborne?'jump-height':'action-state',h);}
    else if(h.type==='lava'){if(!lavaJumpCleared(jumping,height()))fail('jump-height',h);if(before<-(h.half??2.95)&&after>=-(h.half??2.95))state.invuln=Math.max(state.invuln,.22);}
    else if(h.type==='pee'){if(!jumping&&state.invuln<=0){state.slip=.9;state.invuln=.95;}else if(jumping)state.invuln=.22;}
    else if(!jumping)fail('action-state',h);else state.invuln=.22;
   }
   if(h.type==='lava'&&after>(h.half??2.95)||h.type==='pineLog'&&after>.85||h.type==='knot'&&after>.75)passed.add(key);
   // Endpoint checks above match runtime. Also require clearance throughout
   // the swept contact, so a coarse frame cannot certify clipping through wood.
   if(!ult&&state.shield<=0&&['lava','pineLog','knot'].includes(h.type)){
    const half=h.type==='lava'?(h.half??2.95):h.type==='pineLog'?.85:.75;
    const speed=(state.path-oldPath)/dt,begin=Math.max(0,(h.s-half-oldPath)/speed),end=Math.min(dt,(h.s+half-oldPath)/speed);
    if(begin<=end&&end>=0&&begin<=dt){
     const x1=oldX+(state.x-oldX)*begin/dt,x2=oldX+(state.x-oldX)*end/dt;
     const body=h.lane<0||Math.max(x1,x2)>lanePosition(h.lane)-1.05&&Math.min(x1,x2)<lanePosition(h.lane)+1.05;
     if(body&&!(state.broomRemaining>0&&h.type!=='knot')&&!(h.type==='pineLog'&&sliding)){
      const at=t=>oldJump.height+oldJump.velocity*t-13.5*t*t;
      const minimum=state.broomBlend>0?.77*state.broomBlend:Math.min(at(begin),at(end));
      const needed=h.type==='lava'?.62:h.type==='knot'?2.7:2.45;
      if(!jumping||h.type!=='lava'&&jump.jumpsUsed!==2||minimum<needed)fail(body&&h.lane>=0&&state.lane!==h.lane?'lane-transition':'jump-height',h);
     }
    }
   }
   if(state.failure)break;
  }
  if(state.failure)return state;
  if(slide.jumpQueued&&!ult&&state.broomRemaining<=0&&state.slip<=0&&!jump.airborne&&!blocked()&&slide.consumeJump()){slide.cancel();jump.jump();}
  // Same order as game.js: broom, hat, then souls. Automatic ultimate is a result
  // of real collection, never an assumed shield for a proposed route.
  runner.x=state.x;
  for(const type of ['broom','scarf','hat','soul'])for(const p of pickups){
   if(p.type!==type||taken.has(p.key))continue;
   if(type==='soul'){
    if(!p.magnetFlight&&p.s-state.path>12.5){p.position.z=2.3+state.path-p.s;continue;}
    advanceSoulMotion(p,p.position,runner,dt,state.timeMs,state.magnetRemaining,2.3+state.path-p.s);
    if(soulCaught(p,p.position,runner,state.lane)){taken.add(p.key);state.soulCharge=Math.min(SOULS_PER_ULT,state.soulCharge+1);if(state.soulCharge>=SOULS_PER_ULT)activateUltimate();}
   }else if(type==='scarf'){if(state.path-p.s>=-1.3&&state.path-p.s<=1.5&&state.lane===p.lane&&bodyOverlapsLane(state.x,p.lane))taken.add(p.key);}
   else if(pointContact(state.path-p.s)){
    taken.add(p.key);if(state.lane!==p.lane||!bodyOverlapsLane(state.x,p.lane))continue;
    if(type==='broom'&&!ult){state.broomRemaining=config.flight.broomDuration;state.broomBlend=Math.max(.08,state.broomBlend);jump.reset();slide.reset();state.slip=0;}
    else if(type==='hat')state.magnetRemaining=10;
   }
  }
  return state;
 }
 function visitsComplete(){return hazards.filter(h=>h.type==='visit').every(h=>h.pickupType&&h.pickupType!=='point'?taken.has(h.pickupType+'|'+h.s+'|'+h.lane):visited.has(hazardKey(h)));}
 function snapshot(){return {...state,pickups:pickups.filter(p=>!taken.has(p.key)).map(p=>({...p,position:{...p.position}})),jump:jump.snapshot(),slide:slide.snapshot(),ultimateProgress:ultimate.progress,passedHazards:[...passed]};}
 return {state,jump,slide,command,step,snapshot,blocked,flying,visited,taken,visitsComplete};
}

export function snapshotRouteContext(raw){
 const c=routeContext(raw),result={};
 for(const k of ['path','lane','x','jump','slide','slip','invuln','shield','broomRemaining','broomBlend','ultimateRemaining','ultimateProgress','magnetRemaining','soulCharge','timeMs','seed'])if(c[k]!==undefined)result[k]=typeof c[k]==='object'?{...c[k]}:c[k];
 result.passedHazards=c.passedHazards.map(h=>Array.isArray(h)?[...h]:h);
 result.pickups=c.pickups.map(p=>{const item={};for(const k of ['type','s','lane','phase','z','baseY','magnetFlight','magnetProgress','branchId','id'])if(p[k]!==undefined)item[k]=p[k];if(p.position)item.position={...p.position};return item;});return result;
}
