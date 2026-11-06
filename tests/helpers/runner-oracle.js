import {advanceSoulMotion,soulCaught} from '../../src/souls/SoulMotion.js';
// Independent numeric transcription of game.js's frame/input order. It does not
// import the validator, planner or their contact/route implementation. Browser
// differential tests additionally replay these cases through the real game loop.
import {createDoubleJump} from '../../src/player/DoubleJump.js';
import {createSlide} from '../../src/player/Slide.js';
import {createUltimateFlight,ULTIMATE_LAND_SECONDS,ultimateLavaGuardDuration} from '../../src/player/UltimateFlight.js';
import {broomLavaGuardDuration,pineLogFlightGuardDuration,pineLogBlocksSlideJump,pineLogCrossingTouchesRunner,smallPineCrossingTouchesRunner,lavaCrossingTouchesRunner,clearsPineLog,smallPineDoubleJumpCleared,lavaJumpCleared} from '../../src/systems/HazardRules.js';
export function createRunnerOracle(context={},hazards=[],pickups=[]){
 const jump=createDoubleJump({initialState:context.jump}),slide=createSlide({initialState:context.slide}),flight=createUltimateFlight();flight.restore({progress:context.ultimateProgress??0});
 let path=context.path??0,lane=context.lane??1,x=context.x??(lane-1)*2.55,slip=context.slip??0,invuln=context.invuln??0,shield=context.shield??0,broom=context.broomRemaining??0,blend=context.broomBlend??(broom?1:0),ult=context.ultimateRemaining??0,time=0,timeMs=context.timeMs??0,magnet=context.magnetRemaining??0,charge=context.soulCharge??0,failure=null;
 const collectedCounts={soul:0,hat:0,broom:0};
 const passed=new WeakSet(hazards.filter(h=>h.passed)),taken=new WeakSet();
 const blocked=()=>hazards.some(h=>h.type==='pineLog'&&pineLogBlocksSlideJump(path-h.s,passed.has(h)));
 const snapshot=()=>({collected:{...collectedCounts},path,lane,x,slip,invuln,shield,timeMs,magnetRemaining:magnet,soulCharge:charge,pickups:pickups.filter(p=>!taken.has(p)).map(p=>({...p,position:p.position?{...p.position}:undefined})),passedHazards:hazards.filter(h=>passed.has(h)).map(h=>[h.type,h.s,h.lane]),broomRemaining:broom,broomBlend:blend,ultimateRemaining:ult,ultimateProgress:flight.progress,jump:jump.snapshot(),slide:slide.snapshot(),time,failure});
 function command(a){if(failure)return false;if(a.type==='move'){if(slip>0)return false;lane=Math.max(0,Math.min(2,lane+a.direction));return true;}
  if(slip>0||ult>0||flight.active||broom>0)return false;
  if(a.type==='slide'){if(jump.airborne)return false;slide.press();return true;}
  if(slide.active||slide.jumpQueued){if(blocked()){slide.queueJump();return true;}slide.cancel();}return jump.jump();
 }
 function step(rawDt){if(failure)return snapshot();const dt=Math.min(rawDt,.04),base=Math.min(29,15+path*.72*.009),old=path;
  if(ult>0){for(const h of hazards){const gap=path-h.s;if(h.type==='pineLog'){const guard=pineLogFlightGuardDuration(gap,base*1.35);if(guard>0)ult=Math.max(ult,guard+ULTIMATE_LAND_SECONDS);}else if(h.type==='lava')ult=Math.max(ult,ultimateLavaGuardDuration(gap,h.half??2.95,base*1.35));}ult=Math.max(0,ult-dt);}
  flight.update(dt,ult>0);const flying=ult>0||flight.active;
  if(broom>0){for(const h of hazards){const gap=path-h.s;if(h.type==='pineLog'&&gap>=-16&&gap<9)broom=Math.max(broom,(9-gap)/(base*1.2)+.03);else if(h.type==='lava'&&!passed.has(h))broom=Math.max(broom,broomLavaGuardDuration(gap,h.half??2.95,base*1.2));}}
  broom=Math.max(0,broom-dt);blend=Math.max(0,Math.min(1,blend+(broom>0?1:-1)*dt*4));
  path+=base*(flying?1.35:broom>0?1.2:1)*dt;time+=dt;timeMs+=rawDt*1000;magnet=Math.max(0,magnet-dt);
  if(!flying&&broom<=0)jump.update(dt);slide.update(dt);slip=Math.max(0,slip-dt);invuln=Math.max(0,invuln-dt);shield=Math.max(0,shield-dt);x+=((lane-1)*2.55-x)*Math.min(1,dt*12);
  const jumping=!flying&&broom<=0&&jump.airborne,sliding=!flying&&broom<=0&&slide.active,height=broom>0||blend>0?.77*blend:jump.height;
  for(const h of hazards){const before=old-h.s,after=path-h.s;if(flying&&2.3+after>-3.5)passed.add(h);
   const touchLane=h.lane===lane&&Math.abs(x-(h.lane-1)*2.55)<1.05;let dead=false;
   if(h.type==='lava'){if(!flying&&broom<=0&&!passed.has(h)&&lavaCrossingTouchesRunner(before,after,h.half??2.95)&&!lavaJumpCleared(jumping,height)&&shield<=0)dead=true;if(after>(h.half??2.95))passed.add(h);}
   else if(h.type==='pineLog'){if(!flying&&!passed.has(h)){if(pineLogCrossingTouchesRunner(before,after)&&!clearsPineLog(sliding,broom>0,shield>0,jump.jumpsUsed,jump.height))dead=true;if(after>.85)passed.add(h);}}
   else if(h.type==='knot'){if(!flying&&!passed.has(h)){if(smallPineCrossingTouchesRunner(before,after)&&touchLane&&shield<=0&&!smallPineDoubleJumpCleared(jump.jumpsUsed,jump.height))dead=true;if(after>.75)passed.add(h);}}
   else if(!flying&&!passed.has(h)&&2.3+after>1.2){passed.add(h);if(touchLane&&broom<=0&&shield<=0){if(h.type==='pee'){if(!jumping&&invuln<=0){slip=.9;invuln=.95;}else if(jumping)invuln=.22;}else if(!jumping)dead=true;else invuln=.22;}}
   if(dead){failure={type:h.type,s:h.s,lane:h.lane,path,height,jumps:jump.jumpsUsed};break;}
  }
  if(!failure&&slide.jumpQueued&&!flying&&broom<=0&&slip<=0&&!jump.airborne&&!blocked()&&slide.consumeJump()){slide.cancel();jump.jump();}
  for(const type of ['broom','hat','soul'])for(const p of pickups){
   if(p.type!==type||taken.has(p))continue;
   if(type==='soul'){
    p.position??={x:(p.lane-1)*2.55,y:1.2,z:2.3+old-p.s};p.baseY??=1.2;p.z??=p.position.z;p.phase??=1;
    advanceSoulMotion(p,p.position,{x,z:2.3},dt,timeMs,magnet,2.3+path-p.s);
    if(soulCaught(p,p.position,{x,z:2.3},lane)){taken.add(p);collectedCounts.soul++;charge++;if(charge>=100){flight.activate(height);broom=0;blend=0;jump.reset();slide.reset();charge=0;ult=5.5;}}
   }else if(2.3+path-p.s>1.2){taken.add(p);if(p.lane===lane&&Math.abs(x-(lane-1)*2.55)<1.05){if(type==='broom'&&!flying){collectedCounts.broom++;broom=9;blend=Math.max(.08,blend);jump.reset();slide.reset();slip=0;}else if(type==='hat'){collectedCounts.hat++;magnet=10;}}}
  }

  return snapshot();
 }
 return {command,step,snapshot,collected:p=>taken.has(p)};
}
export function replayOracle(hazards,context,actions,endS,deltas=[1/60],pickups=[]){const player=createRunnerOracle(context,hazards,pickups);let i=0,n=0,s=player.snapshot();while(s.path<endS&&!s.failure&&n<6000){while(i<actions.length&&actions[i].path<=s.path+1e-9)player.command(actions[i++]);s=player.step(deltas[n++%deltas.length]);}return {...s,frames:n,ok:!s.failure&&s.path>=endS};}
