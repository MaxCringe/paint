import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {broomTrailState,broomSputterState} from '../src/powerups/BroomTrail.js';
import {broomVisualProfile,BROOM_VISUAL_PROFILES,BROOM_LANDING_TRANSITION_SECONDS,BROOM_VISUAL_RANGES,resetBroomTuning} from '../src/powerups/BroomVisualProfiles.js';

test('broom coughs and sparks intensify during the final three seconds',()=>{
 const off=broomTrailState(0);
 assert.equal(off.active,false);
 assert.equal(off.warning,false);
 assert.equal(off.fatigue,0);
 assert.equal(broomTrailState(9).active,true);
 assert.equal(broomTrailState(3.01).warning,false);
 assert.equal(broomTrailState(3).warning,true);
 assert.equal(broomTrailState(3).fatigue,0);
 assert.ok(broomTrailState(.5).fatigue>.8);
 assert.ok(broomTrailState(.5).coughPhase>broomTrailState(2.5).coughPhase);
 assert.ok(broomTrailState(.5).sparkIntensity>broomTrailState(2.5).sparkIntensity);
 assert.equal(broomTrailState(1.21).stalling,false);
 assert.equal(broomTrailState(1.2).stalling,true);
 assert.equal(broomTrailState(0).stallPulse,0);
});

test('particles use built-in instanced Three.js materials rather than shaders',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const fx=read('src/powerups/BroomTrail.js');
 const broom=read('src/powerups/BroomRide.js');
 const hud=read('src/ui/GameHud.js');
 const css=read('src/styles/hud.css');
 for(const term of ['function smokeTexture(','function streakTexture(','function sparkTexture(','new THREE.InstancedMesh(plane,material,count)','THREE.NormalBlending','THREE.AdditiveBlending','depthTest:true','depthWrite:false','mesh.setMatrixAt(i,dummy.matrix)','broomVisualProfile(remaining)','visual.density','visual.opacity','visual.coughs','visual.sparks']){
  assert.ok(fx.includes(term),term);
 }
 assert.doesNotMatch(fx,/ShaderMaterial|depthTest:false/);
 assert.match(broom,/trail\.update\(remaining,t\)/);
 assert.match(broom,/trail\.hide\(\)/);
 assert.match(broom,/duration: 9/);
 assert.doesNotMatch(hud,/createBroomTimer/);
 assert.doesNotMatch(css,/broom-flight-status/);
});

test('approved standard VFX profiles match both complete sets of values',()=>{
 resetBroomTuning();
 assert.deepEqual(BROOM_VISUAL_PROFILES.flight,{"density":180,"opacity":110,"size":150,"length":90,"streaks":95,"coughs":150,"sparks":150,"smokeRise":100,"sparkSpread":100,"sparkSize":100,"glowSize":100,"glowIntensity":100,"smokeColor":"#d8c5ec","coughColor":"#d8c5ec","streakColor":"#dbcbff","sparkColor":"#ffc17c","glowColor":"#dec5ff"});
 assert.deepEqual(BROOM_VISUAL_PROFILES.landing,{"density":150,"opacity":70,"size":150,"length":50,"streaks":39,"coughs":250,"sparks":299,"smokeRise":100,"sparkSpread":100,"sparkSize":100,"glowSize":100,"glowIntensity":100,"smokeColor":"#d8c5ec","coughColor":"#d8c5ec","streakColor":"#dbcbff","sparkColor":"#ffc17c","glowColor":"#dec5ff"});
 assert.equal(BROOM_LANDING_TRANSITION_SECONDS,3);
 const start=broomVisualProfile(9),beforeLanding=broomVisualProfile(3),end=broomVisualProfile(0);
 for(const key of Object.keys(BROOM_VISUAL_RANGES)){
  assert.equal(start[key],BROOM_VISUAL_PROFILES.flight[key]);
  assert.equal(beforeLanding[key],BROOM_VISUAL_PROFILES.flight[key]);
  assert.equal(end[key],BROOM_VISUAL_PROFILES.landing[key]);
 }
 assert.equal(start.smokeColor,'#d8c5ec');
 for(const key of ['smokeColor','coughColor','streakColor','sparkColor','glowColor']){
  assert.equal(start[key],defaultsColor(key));
  assert.equal(end[key],defaultsColor(key));
 }
 function defaultsColor(key){return BROOM_VISUAL_PROFILES.flight[key];}
 assert.equal(end.smokeColor,'#d8c5ec');
});

test('final-three-second profile blends smoothly and respects all bounds',()=>{
 resetBroomTuning();
 const before=broomVisualProfile(3.001),at=broomVisualProfile(3);
 const after=broomVisualProfile(2.999),mid=broomVisualProfile(1.5);
 const nearEnd=broomVisualProfile(.001),end=broomVisualProfile(0);
 assert.equal(before.transition,0);
 assert.equal(at.transition,0);
 assert.ok(after.transition>0&&after.transition<.000001);
 assert.equal(mid.transition,.5);
 assert.ok(nearEnd.transition<1);
 assert.equal(end.transition,1);
 assert.ok(Math.abs(after.density-at.density)<.001);
 assert.ok(Math.abs(end.opacity-nearEnd.opacity)<.001);
 for(const seconds of [2.5,2,1.5,1,.5,0]){
  const p=broomVisualProfile(seconds);
  for(const key of Object.keys(BROOM_VISUAL_RANGES)){
   const a=BROOM_VISUAL_PROFILES.flight[key],b=BROOM_VISUAL_PROFILES.landing[key];
   assert.ok(p[key]>=Math.min(a,b)&&p[key]<=Math.max(a,b),key+' at '+seconds);
  }
 }
});

test('3D broom workshop stays separate from runner and preserves gameplay mechanics',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js'),broom=read('src/powerups/BroomRide.js');
 const html=read('index.html'),lab=read('src/ui/BroomLab.js');
 assert.match(html,/menu-open-effects-editor/);
 assert.ok(lab.includes('createBroomRide(scene,runner,model)'));
 assert.ok(lab.includes('setBroomTuningValue'));
 assert.match(broom,/duration: 9/);
 assert.match(broom,/speedMultiplier: 1\.20/);
 assert.match(broom,/ultimateSpeedMultiplier: 1\.35/);
 assert.ok(broom.includes('broomIgnoresHazard(type)'));
 assert.doesNotMatch(game,/createBroomTuning|broomEffectSettings/);
});

test('engine-stall warning is intermittent, deterministic and frame-rate independent',()=>{
 for(const s of [9,3,1.21,0,-.2,NaN,Infinity]){
  assert.equal(broomSputterState(s).pulse,0,'no sputter outside final 1.2s: '+s);
 }
 const peaks=[1.11,.905,.71,.505,.2825,.145,.0625];
 const gaps=[1.01,.81,.61,.40,.22,.10,.02];
 for(const remaining of peaks){
  const a=broomSputterState(remaining);
  assert.equal(a.stalling,true);
  assert.ok(a.pulse>.25,'expected bright beat at '+remaining);
  assert.deepEqual(a,broomSputterState(remaining));
 }
 for(const remaining of gaps){
  assert.equal(broomSputterState(remaining).pulse,0,'expected dark gap at '+remaining);
 }
 assert.equal(broomSputterState(.2825).finalBurst,true);
 assert.equal(broomSputterState(1.11).finalBurst,false);
 assert.ok(broomSputterState(.0625).pulse>broomSputterState(1.11).pulse);
 assert.equal(broomSputterState(0).stalling,false);
});

test('spark, smoke cough and broom glow share one stall pulse while running model stays untouched',()=>{
 const fx=readFileSync(new URL('../src/powerups/BroomTrail.js',import.meta.url),'utf8');
 for(const token of ['const stallBeat=state.stalling?state.stallPulse:1','visual.coughs/100*coughBeat','*stallBeat*sparkBurstSize','1.15*stallBeat']){
  assert.ok(fx.includes(token),token);
 }
 const ride=readFileSync(new URL('../src/powerups/BroomRide.js',import.meta.url),'utf8');
 assert.match(ride,/duration: 9/);
 assert.match(ride,/trail\.update\(remaining,t\)/);
});

test('different colors of smoke, coughs, streaks, sparks and tip glow use distinct materials',()=>{
 const fx=readFileSync(new URL('../src/powerups/BroomTrail.js',import.meta.url),'utf8');
 for(const part of ['visual.smokeColor','visual.coughColor','visual.streakColor','visual.sparkColor','visual.glowColor',
   'visual.sparkSize','visual.sparkSpread','visual.smokeRise','visual.glowSize','visual.glowIntensity']){
  assert.ok(fx.includes(part),part);
 }
 assert.ok(fx.includes('const coughs=batch(smokeMap,WISPS-BASE_WISPS'));
 assert.ok(fx.includes('place(coughs.mesh,j'));
 assert.ok(fx.includes('coughs.mesh.instanceMatrix.needsUpdate=true'));
 const ride=readFileSync(new URL('../src/powerups/BroomRide.js',import.meta.url),'utf8');
 assert.ok(ride.includes('if(showTrail)trail.update('));
 assert.ok(ride.includes('else trail.hide()'));
});

test('neutral particle textures and straw variation support true independent recoloring',()=>{
 const fx=readFileSync(new URL('../src/powerups/BroomTrail.js',import.meta.url),'utf8');
 const ride=readFileSync(new URL('../src/powerups/BroomRide.js',import.meta.url),'utf8');
 for(const code of ['rgba(255,255,255,${alpha})','rgba(255,255,255,.98)','rgba(255,255,255,.63)']){
  assert.ok(fx.includes(code),code);
 }
 assert.ok(ride.includes('bristleMat.color.set(v.bristlesColor)'));
 assert.equal(BROOM_VISUAL_PROFILES.flight.sparkColor,'#ffc17c');
 assert.equal(BROOM_VISUAL_PROFILES.flight.streakColor,'#dbcbff');
});
