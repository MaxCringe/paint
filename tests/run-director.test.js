import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createRunDirector,RUN_DIRECTOR_CONFIG as config} from '../src/systems/RunDirector.js';
import {validateRunRoute} from '../src/systems/RunReachability.js';
import {createSegmentGenerator} from '../src/systems/ObstacleManager.js';
import {createForestRandom} from '../src/world/forest/PlantRegistry.js';
import {createDoubleJump} from '../src/player/DoubleJump.js';
import {createRunSpace} from '../src/systems/RunSpace.js';
import {createSlide} from '../src/player/Slide.js';
const h=(type,s,lane=-1)=>({type,s,lane});
const makePlanner=seed=>createSegmentGenerator({makeLavaRiver:()=>{},makePineLog:()=>{},makeFish:()=>{},makePuddle:()=>{},makeObstacle:()=>{},makeSoul:()=>{},makeHat:()=>{},makeBroom:()=>{},random:createForestRandom(seed)});
test('four configurable phases repeat at exact distance boundaries, without resetting speed or run state',()=>{
 const director=createRunDirector();let s=0;for(let cycle=0;cycle<3;cycle++)for(const p of config.phases){assert.equal(director.phaseAt(s).id,p.id);assert.equal(director.phaseAt(s+p.duration-.001).id,p.id);assert.equal(director.phaseAt(s).cycle,cycle);s+=p.duration;}
 assert.throws(()=>createRunDirector({...config,phases:[{duration:0}]}));
 const custom=createRunDirector({...config,phases:config.phases.map(p=>({...p,duration:100}))});assert.equal(custom.phaseAt(100).id,'build');
});
test('log to river, river to pine and consecutive logs have executable witnesses across speeds and frame rates',()=>{
 for(const path of [0,700,2200,5000])for(const dt of [1/120,1/60,1/30,.04])for(const types of [['pineLog','lava'],['lava','knot'],['pineLog','pineLog']]){
  const proof=validateRunRoute(types.map((t,i)=>h(t,path+60+60*i,t==='knot'?1:-1)),{path,lane:1},{dt});
  assert.ok(proof.ok,JSON.stringify({path,dt,types}));assert.ok(proof.steps<10000);
 }
});
test('reachability rejects a physically unreachable empty lane and incompatible slide/lava overlap',()=>{
 const trapped=validateRunRoute([h('knot',5002,0),h('knot',5002,2)],{path:5000,lane:0,x:-2.55,slip:.9});assert.equal(trapped.ok,false);
 const overlap=validateRunRoute([h('pineLog',5060),h('lava',5061)],{path:5000,lane:1});assert.equal(overlap.ok,false);
 const pickup=validateRunRoute([h('visit',5001,2)],{path:5000,lane:0,x:-2.55,slip:.9},{endS:5003});assert.equal(pickup.ok,false);
});
test('maximum-speed flight expiry preserves existing lava/log landing guards and requires a route around pine',()=>{
 for(const power of [{broomRemaining:.01},{ultimateRemaining:.01,ultimateProgress:1}]){
  for(const type of ['lava','pineLog'])assert.ok(validateRunRoute([h(type,5006),h('knot',5066,1)],{path:5000,lane:1,...power}).ok);
  assert.equal(validateRunRoute([h('knot',5002,0),h('knot',5002,1),h('knot',5002,2)],{path:5000,lane:1,...power}).ok,Boolean(power.ultimateProgress),'ultimate clears pines; broom does not');
 }
 assert.equal(validateRunRoute([h('knot',5002,0),h('knot',5002,1),h('knot',5002,2)],{path:5000,lane:1}).ok,false);
});
test('1000 deterministic seeds produce repeatable phase decisions, bounded reservations and safe fallbacks',()=>{
 let rejected=0;const phases=new Set();
 for(let seed=1;seed<=1000;seed++){
  const a=makePlanner(seed),b=makePlanner(seed);
  for(let path=0;path<=1800;path+=60){for(const p of [a,b])p({path,lane:1});const x=a.diagnostics(),y=b.diagnostics();assert.deepEqual(x,y);assert.ok(x.reservations<100);phases.add(x.phase);rejected+=x.proof?.ok===false?1:0;}
 }
 assert.deepEqual([...phases].sort(),['build','recovery','tension','warmup']);assert.ok(rejected>0,'impossible current-state candidates must fall back rather than force a spawn');
});
test('long runs retain a bounded working set and bounded witness work',()=>{
 const p=makePlanner(796),start=performance.now();let peak=0,maxSteps=0;
 for(let path=0;path<100000;path+=25){p({path,lane:1,broomRemaining:path%1000<100?.05:0});const d=p.diagnostics();peak=Math.max(peak,d.reservations);maxSteps=Math.max(maxSteps,d.proof?.steps??0);}
 assert.ok(peak<100);assert.ok(maxSteps<=config.maxSimulationSteps);console.log('RUN_PLANNER_LONG_RUN',JSON.stringify({peak,maxSteps,elapsedMs:Math.round(performance.now()-start)}));
});
test('physics snapshots preserve in-progress jumps and buffered input without creating an automatic second jump',()=>{
 const j=createDoubleJump();j.jump();j.update(.2);const copy=createDoubleJump({initialState:j.snapshot()});copy.update(.1);j.update(.1);assert.deepEqual(copy.snapshot(),j.snapshot());
 const s=createSlide();s.press();s.queueJump();s.update(.2);const restored=createSlide({initialState:s.snapshot()});assert.equal(restored.consumeJump(),true);assert.equal(restored.consumeJump(),false);restored.cancel();const first=createDoubleJump();first.jump();first.update(.3);assert.equal(first.jumpsUsed,1);assert.equal(restored.jumpQueued,false);
});

test('reward reservations preserve time to react after collecting, in either insertion order',()=>{
 const reward={kind:'reward',type:'soul',lane:1,s:100,half:.35},danger={kind:'hazard',type:'pineLog',lane:-1,s:110,half:.85};
 for(const [first,second] of [[reward,danger],[danger,reward]]){const space=createRunSpace({rewardRecovery:35});space.add(first);assert.equal(space.available(second),false);}
});

test('route validation includes the speed and jump restrictions of a future broom pickup',()=>{
 const path=5000,pickups=[{type:'broom',s:5050,lane:1}];
 const proof=validateRunRoute([h('visit',5050,1),h('knot',5090,1),h('pineLog',5150)],{path,lane:1,pickups});
 assert.equal(proof.ok,true);assert.ok(proof.actions.some(a=>a.type==='move'));
});

test('two-lane witnesses require two separate legal lane inputs',()=>{
 const proof=validateRunRoute([h('visit',5060,2)],{path:5000,lane:0,x:-2.55});assert.equal(proof.ok,true);
 const moves=proof.actions.filter(a=>a.type==='move');assert.equal(moves.length,2);assert.deepEqual(moves.map(a=>a.direction),[1,1]);assert.ok(moves[1].time-moves[0].time>=config.inputSeconds-1e-8);
});

test('a pending pickup at the collection boundary activates only when actually collected',()=>{
 const hazards=[h('lava',5006)],pickups=[{type:'broom',s:5001,lane:1}];
 assert.equal(validateRunRoute(hazards,{path:5000,lane:1,x:0,pickups}).ok,true);
 assert.equal(validateRunRoute(hazards,{path:5000,lane:0,x:-2.55,pickups}).ok,false);
});
