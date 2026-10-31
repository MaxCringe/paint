import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {broomTrailState} from '../src/powerups/BroomTrail.js';

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
 assert.match(trail,/SMOKE_COUNT=14,SPARK_COUNT=16/);
 assert.match(trail,/smokeMaterial\\.opacity=\\.53/);
 assert.doesNotMatch(trail,/depthTest:false/);
 assert.match(trail,/smoke\.setMatrixAt/);
 assert.match(trail,/sparks\.setMatrixAt/);
 assert.doesNotMatch(trail,/ShaderMaterial/);
 assert.match(broom,/trail\.update\(remaining,t\)/);
 assert.match(broom,/trail\.hide\(\)/);
 assert.match(broom,/duration: 9/);
 assert.doesNotMatch(hud,/createBroomTimer/);
 assert.doesNotMatch(css,/broom-flight-status/);
});
