import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createUltimateFlight,ultimateLavaGuardDuration,ULTIMATE_RISE_SECONDS,ULTIMATE_LAND_SECONDS,ULTIMATE_FLIGHT_HEIGHT} from '../src/player/UltimateFlight.js';

test('ultimate rises smoothly from current height and lands at road level',()=>{
 const f=createUltimateFlight();f.activate(.8);
 assert.equal(f.height(0),.8);
 f.update(ULTIMATE_RISE_SECONDS/2,true);
 assert.ok(f.height(0)>.8&&f.height(0)<ULTIMATE_FLIGHT_HEIGHT);
 f.update(ULTIMATE_RISE_SECONDS/2,true);
 assert.equal(f.height(0),ULTIMATE_FLIGHT_HEIGHT);
 f.update(ULTIMATE_LAND_SECONDS/2,false);
 assert.ok(f.active&&f.landing);
 assert.ok(f.height(0)>0&&f.height(0)<ULTIMATE_FLIGHT_HEIGHT);
 f.update(ULTIMATE_LAND_SECONDS/2,false);
 assert.equal(f.active,false);
 assert.equal(f.height(0),0);
 f.activate(0);f.update(.05,true);f.reset();
 assert.equal(f.active,false);
});

test('lava guard prevents landing during a crossing',()=>{
 const speed=25,half=3;
 assert.equal(ultimateLavaGuardDuration(-100,half,speed),0);
 assert.ok(ultimateLavaGuardDuration(-half-2-speed*ULTIMATE_LAND_SECONDS,half,speed)>ULTIMATE_LAND_SECONDS);
 assert.ok(ultimateLavaGuardDuration(0,half,speed)>ULTIMATE_LAND_SECONDS);
 assert.equal(ultimateLavaGuardDuration(half+3,half,speed),0);
 assert.equal(ultimateLavaGuardDuration(0,half,0),0);
});

test('baked witch animations are present, loop seamlessly and match landing/rise timing',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/models/fiona/animations/motions.json.gz',import.meta.url))).toString());
 assert.equal(Object.keys(data.motions).length,23);
 assert.equal(data.motions.ultimateStart.d,ULTIMATE_RISE_SECONDS);
 assert.equal(data.motions.ultimateEnd.d,ULTIMATE_LAND_SECONDS);
 assert.equal(data.motions.ultimateFly.l,1);
 assert.equal(data.motions.ultimateFly.f.length,5);
 assert.deepEqual(data.motions.ultimateFly.f[0][1],data.motions.ultimateFly.f.at(-1)[1]);
});
test('landed Fiona regains input; descent stays immune until the animation ends',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('const ultActive=ultTimer>0||ultimateFlight.active'));
 assert.ok(game.includes('slipT<=0&&ultTimer<=0&&!ultimateFlight.active&&!broom.active'));
 assert.ok(game.includes('ultimate:ultTimer>0,ultimateLift:ultimateFlight.lift,slip:slipT>0'));
 assert.ok(game.includes('ultimateLavaGuardDuration(gap,half,ultimateSpeed)'));
 assert.ok(game.includes('ultimateAura.update(t,ultActive,ultimateFlight.lift)'));
});

test('levitation has small slow bob and lands without residual vertical motion',()=>{
 const f=createUltimateFlight();
 f.activate(0);
 f.update(ULTIMATE_RISE_SECONDS,true);
 const heights=[0,400,800,1200,1600,2000,2400].map(t=>f.height(t));
 assert.ok(Math.max(...heights)-Math.min(...heights)<.10);
 assert.ok(Math.min(...heights)>ULTIMATE_FLIGHT_HEIGHT-.051);
 assert.ok(Math.max(...heights)<ULTIMATE_FLIGHT_HEIGHT+.051);
 f.update(ULTIMATE_LAND_SECONDS,false);
 for(const t of [0,260,950,1800])assert.equal(f.height(t),0);
});
test('take-off has direct priority and landing cannot trigger a ground slide',()=>{
 const controller=readFileSync(new URL('../src/player/FionaTest.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(controller.includes("if(!previous.ultimate&&ultimate){"));
 assert.ok(controller.includes("if(!trigger('ultimateStart'))playBase();"));
 assert.ok(controller.includes("if(!trigger('ultimateEnd'))playBase();"));
 assert.ok(controller.includes("const fadeSeconds=flightTransition?.20:.13;"));
 assert.ok(game.includes("function slide(){if(state==='playing'&&slipT<=0&&ultTimer<=0&&!ultimateFlight.active"));
});
test('hover pose remains calm, asymmetric and loops without a visible jump',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/models/fiona/animations/motions.json.gz',import.meta.url))).toString());
 const fly=data.motions.ultimateFly;
 assert.ok(fly.d>=2);
 const arms=['LeftArm','RightArm'];
 for(const bone of arms){
  const values=fly.f.map(([,pose])=>pose[bone][0]);
  assert.ok(Math.max(...values)-Math.min(...values)<.10);
 }
 assert.notDeepEqual(fly.f[0][1].LeftUpLeg,fly.f[0][1].RightUpLeg);
 assert.deepEqual(fly.f[0][1],fly.f.at(-1)[1]);
});

test('power levitation opens both arms sideways instead of reaching forward',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../public/models/fiona/animations/motions.json.gz',import.meta.url))).toString());
 const {ultimateStart,ultimateFly,ultimateEnd}=data.motions;
 const fly=ultimateFly.f[0][1];
 for(const arm of ['LeftArm','RightArm']){
  assert.ok(Math.abs(fly[arm][0])<.16,arm+' is not thrust forward');
  assert.ok(Math.abs(fly[arm][2])<.40,arm+' is not lowered against the torso');
 }
 assert.ok(fly.LeftArm[2]<0&&fly.RightArm[2]>0);
 assert.ok(fly.Spine1[0]<0,'chest is open');
 assert.ok(fly.LeftHand&&fly.RightHand,'hand rotation tracks exist');
 assert.deepEqual(ultimateStart.f.at(-1)[1],fly);
 assert.deepEqual(ultimateEnd.f[0][1],fly);
 assert.deepEqual(ultimateFly.f.at(-1)[1],fly);
});
