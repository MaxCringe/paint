import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRunRoute,replayRunWitness} from '../src/systems/RunReachability.js';
import {replayOracle} from './helpers/runner-oracle.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/safe-path-regressions.json',import.meta.url)));
const frames=[[1/120],[1/60],[1/30],[.04],[.04,1/120,1/30],[.1,1/60,.07]];
test('saved regressions keep difficult but possible routes and reject the old FPS-dependent witness',()=>{
 assert.equal(replayOracle(fixtures[0].hazards,fixtures[0].context,fixtures[0].oldActions,110,fixtures[0].deltas).ok,false);
 for(const f of fixtures.filter(f=>f.expectAccepted!==false)){const proof=validateRunRoute(f.hazards,f.context);assert.ok(proof.ok,JSON.stringify({id:f.id,proof}));for(const dt of frames){assert.ok(replayOracle(f.hazards,f.context,proof.actions,proof.end.path,dt).ok,JSON.stringify({id:f.id,dt,proof}));}}
});
test('all ordered hazard pairs and significant triples have one executable witness at supported spacings',()=>{
 const types=['knot','pineLog','pee','fish','lava'];let count=0;
 const triples=[['lava','pineLog','lava'],['pineLog','knot','pineLog'],['pee','lava','knot'],['fish','knot','pineLog']];
 for(const path of [0,5000])for(const sequence of [...types.flatMap(a=>types.map(b=>[a,b])),...triples]){
  const hazards=sequence.map((type,i)=>({type,s:path+60+i*52,lane:['lava','pineLog'].includes(type)?-1:1})),context={path,lane:1};
  const proof=validateRunRoute(hazards,context);assert.ok(proof.ok,JSON.stringify({sequence,path,proof}));
  for(const dt of frames)assert.ok(replayOracle(hazards,context,proof.actions,proof.end.path,dt).ok,JSON.stringify({sequence,path,dt,proof}));count++;
 }
 console.log('INDEPENDENT_PAIR_TRIPLE_REPLAYS',count*frames.length);
});
test('reaction calibration is separate from physical possibility and does not claim impossibility on budget exhaustion',()=>{
 const hazards=[0,1,2].map(lane=>({type:'knot',s:5060,lane}));
 const strict=validateRunRoute(hazards,{path:5000,lane:1},{config:{...RUN_DIRECTOR_CONFIG,recognitionSeconds:10}});
 assert.equal(strict.ok,false);assert.equal(strict.physicalPossible,true);assert.equal(strict.reason,'reaction-budget');
 const tiny=validateRunRoute(hazards,{path:5000,lane:1},{config:{...RUN_DIRECTOR_CONFIG,maxSimulationSteps:1}});assert.equal(tiny.ok,false);assert.equal(tiny.reason,'search-budget');assert.equal(tiny.physicalPossible,null);
});
import {RUN_DIRECTOR_CONFIG} from '../src/systems/RunDirector.js';

test('known hat and magnet souls can trigger ultimate during a route without assuming free protection',()=>{
 const context={path:5000,lane:1,soulCharge:99,pickups:[{type:'hat',s:5050,lane:1},{type:'soul',s:5056,lane:0,phase:1,baseY:1.2}]};
 const hazards=[{type:'visit',pickupType:'hat',s:5050,lane:1},{type:'lava',s:5080,lane:-1},{type:'pineLog',s:5140,lane:-1}];
 const proof=validateRunRoute(hazards,context);assert.ok(proof.ok,JSON.stringify(proof));
 for(const dt of frames){const r=replayRunWitness(hazards,context,proof.actions,{deltas:dt,endS:proof.end.path});assert.ok(r.ok);assert.ok(r.end.ultimateRemaining>0||r.end.ultimateProgress>0);}
});

import {createRunTrajectory} from '../src/systems/RunTrajectory.js';
test('a frame endpoint above a trunk does not hide insufficient height at the start of swept contact',()=>{
 const h=[{type:'knot',s:5000.75,lane:1}],c={path:5000,lane:1,jump:{height:2.69,velocity:1,jumpsUsed:2}};
 const model=createRunTrajectory(h,c,RUN_DIRECTOR_CONFIG);model.step(1/60);assert.equal(model.state.failure.reason,'jump-height');assert.ok(model.jump.height>=2.7);
});

test('an action before the configured visibility boundary never receives infinite reaction credit',()=>{
 const hazards=[0,1,2].map(lane=>({type:'knot',s:5060,lane}));
 const proof=validateRunRoute(hazards,{path:5000,lane:1},{config:{...RUN_DIRECTOR_CONFIG,recognitionDistance:1}});
 assert.equal(proof.ok,false);assert.equal(proof.physicalPossible,true);assert.equal(proof.reason,'reaction-budget');
});

test('invalid search calibration cannot create an unbounded timing search',()=>{
 const config={...RUN_DIRECTOR_CONFIG,timingSearch:{firstOffsets:Infinity,secondOffsets:4}};
 assert.equal(validateRunRoute([{type:'lava',s:60,lane:-1}],{path:0},{config}).reason,'invalid-config');
});

test('unknown hazard types cannot silently use fish clearance for a pine mesh',()=>{
 assert.equal(validateRunRoute([{type:'unknown',s:60,lane:1}],{path:0,lane:1}).reason,'invalid-hazard');
});

import {createForestRandom} from '../src/world/forest/PlantRegistry.js';
test('1000 seeded boundary sequences replay accepted witnesses independently and classify refusals',()=>{
 const types=['knot','pineLog','pee','fish','lava'],summary={accepted:0,rejected:0,reasons:{}};
 for(let seed=1;seed<=1000;seed++){
  const random=createForestRandom(seed),path=seed%2?0:5000,context={path,lane:(random()*3)|0};
  if(seed%7===0)context.slip=.4;else if(seed%7===1)context.slide={remaining:.3,crouch:1,queuedJump:0};else if(seed%7===2){context.broomRemaining=.1+random()*2;context.broomBlend=1;}else if(seed%7===3){context.ultimateRemaining=0;context.ultimateProgress=.1+random()*.8;}
  let s=path+random()*70;const hazards=[];
  for(let n=0;n<3;n++){const type=types[(random()*types.length)|0];hazards.push({type,s,lane:['lava','pineLog'].includes(type)?-1:(random()*3)|0});s+=1+random()*60;}
  const proof=validateRunRoute(hazards,context);
  if(proof.ok){summary.accepted++;for(const dt of [[1/60],[.04],[.1,1/60,.07]]){const replay=replayOracle(hazards,context,proof.actions,proof.end.path,dt);assert.ok(replay.ok,JSON.stringify({seed,context,hazards,proof,failure:replay.failure,dt}));}}
  else{summary.rejected++;summary.reasons[proof.reason]=(summary.reasons[proof.reason]??0)+1;}
 }
 assert.ok(summary.accepted>0&&summary.rejected>0);console.log('SAFE_PATH_BOUNDARIES',JSON.stringify(summary));
});

test('landing certificates never rely on an early ultimate passed flag being set in a lucky frame',()=>{
 const f=fixtures.find(f=>f.expectAccepted===false);
 assert.equal(replayOracle(f.hazards,f.context,f.oldActions,80,f.deltas).ok,false);
 assert.equal(validateRunRoute(f.hazards,f.context).ok,false);
});
