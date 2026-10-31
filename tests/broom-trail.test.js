import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {broomTrailState} from '../src/powerups/BroomTrail.js';
import {broomVisualProfile,BROOM_VISUAL_PROFILES,BROOM_LANDING_TRANSITION_SECONDS} from '../src/powerups/BroomVisualProfiles.js';

test('broom smoke shrinks and coughs over its last three seconds',()=>{
 assert.deepEqual(broomTrailState(0),{active:false,warning:false,length:1,strength:1,instability:0});
 assert.equal(broomTrailState(9).active,true);
 assert.equal(broomTrailState(3.01).warning,false);
 assert.equal(broomTrailState(3).warning,true);
 assert.equal(broomTrailState(3).strength,1);
 assert.ok(broomTrailState(.5).length<.4);
 assert.ok(broomTrailState(.5).strength<.5);
 assert.ok(broomTrailState(.5).instability>.8);
});

test('visible smoke uses standard instanced Three.js materials instead of custom shaders',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const trail=read('src/powerups/BroomTrail.js');
 const broom=read('src/powerups/BroomRide.js');
 const hud=read('src/ui/GameHud.js');
 const css=read('src/styles/hud.css');
 assert.match(trail,/makeSmokeTexture/);
 assert.match(trail,/InstancedMesh\(plane,smokeMaterial,SMOKE_COUNT\)/);
 assert.match(trail,/InstancedMesh\(plane,sparkMaterial,SPARK_COUNT\)/);
 assert.match(trail,/THREE\.NormalBlending/);
 assert.match(trail,/THREE\.AdditiveBlending/);
 assert.match(trail,/depthTest:true/);
 assert.match(trail,/BASE_SMOKE_COUNT=14,SMOKE_COUNT=22,SPARK_COUNT=16/);
 assert.ok(trail.includes('smokeMaterial.opacity=Math.min(1,.53'));
 assert.doesNotMatch(trail,/depthTest:false/);
 assert.match(trail,/smoke\.setMatrixAt/);
 assert.match(trail,/sparks\.setMatrixAt/);
 assert.match(trail,/broomVisualProfile\(remaining\)/);
 assert.match(trail,/smokePopulation=BASE_SMOKE_COUNT\*visual\.density\/100/);
 assert.doesNotMatch(trail,/createBroomTuning/);
 assert.doesNotMatch(trail,/ShaderMaterial/);
 assert.match(broom,/trail\.update\(remaining,t\)/);
 assert.match(broom,/trail\.hide\(\)/);
 assert.match(broom,/duration: 9/);
 assert.doesNotMatch(hud,/createBroomTimer/);
 assert.doesNotMatch(css,/broom-flight-status/);
});

test('exact user-approved broom profiles for normal flight and final three seconds',()=>{
 assert.deepEqual(BROOM_VISUAL_PROFILES.flight,{density:150,opacity:100,size:80,length:95,sparks:65});
 assert.deepEqual(BROOM_VISUAL_PROFILES.landing,{density:45,opacity:30,size:65,length:35,sparks:200});
 assert.equal(BROOM_LANDING_TRANSITION_SECONDS,3);
 const start=broomVisualProfile(9);
 const normal=broomVisualProfile(3);
 const end=broomVisualProfile(0);
 for(const key of ['density','opacity','size','length','sparks']){
  assert.equal(start[key],BROOM_VISUAL_PROFILES.flight[key]);
  assert.equal(normal[key],BROOM_VISUAL_PROFILES.flight[key]);
  assert.equal(end[key],BROOM_VISUAL_PROFILES.landing[key]);
 }
});

test('landing visual effect smoothly interpolates with no hard jump at three seconds',()=>{
 const before=broomVisualProfile(3.001);
 const at=broomVisualProfile(3);
 const justAfter=broomVisualProfile(2.999);
 const middle=broomVisualProfile(1.5);
 const almostDone=broomVisualProfile(.001);
 const atEnd=broomVisualProfile(0);
 assert.equal(before.transition,0);
 assert.equal(at.transition,0);
 assert.ok(justAfter.transition>0&&justAfter.transition<.000001);
 assert.equal(middle.transition,.5);
 assert.ok(almostDone.transition<1);
 assert.equal(atEnd.transition,1);
 assert.ok(Math.abs(justAfter.density-at.density)<.001);
 assert.ok(Math.abs(atEnd.opacity-almostDone.opacity)<.001);
 assert.ok(middle.density<150&&middle.density>45);
 assert.ok(middle.sparks>65&&middle.sparks<200);
 for(const duration of [2.5,2,1.5,1,.5,0]){
  const values=broomVisualProfile(duration);
  for(const key of ['density','opacity','size','length','sparks']){
   const a=BROOM_VISUAL_PROFILES.flight[key],b=BROOM_VISUAL_PROFILES.landing[key];
   assert.ok(values[key]>=Math.min(a,b)&&values[key]<=Math.max(a,b));
  }
 }
});

test('no in-game broom tuning sliders or unrelated mechanic changes',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js');
 const broom=read('src/powerups/BroomRide.js');
 const html=read('index.html');
 assert.doesNotMatch(html,/broom-tuning/);
 assert.doesNotMatch(game,/createBroomTuning|broomEffectSettings/);
 assert.match(broom,/duration: 9/);
 assert.match(broom,/speedMultiplier: 1\.20/);
 assert.match(broom,/ultimateSpeedMultiplier: 1\.35/);
 assert.match(broom,/broomIgnoresHazard\(type\)/);
});
