import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {broomTrailState} from '../src/powerups/BroomTrail.js';

test('smoke plume remains stable until the last three seconds of broom flight',()=>{
 assert.deepEqual(broomTrailState(0),{active:false,warning:false,length:1,strength:1,instability:0});
 const full=broomTrailState(8);
 assert.equal(full.active,true);
 assert.equal(full.warning,false);
 assert.equal(full.length,1);
 assert.equal(full.strength,1);
 assert.equal(broomTrailState(3.01).warning,false);
 const warning=broomTrailState(3);
 assert.equal(warning.warning,true);
 assert.equal(warning.instability,0);
 const dying=broomTrailState(.4);
 assert.ok(dying.length<.4);
 assert.ok(dying.strength<.5);
 assert.ok(dying.instability>.8);
 assert.equal(broomTrailState(-1).active,false);
});

test('broom visual cue is flowing camera-facing smoke with dying sparks, not flat ribbons or a HUD timer',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const trail=read('src/powerups/BroomTrail.js');
 const broom=read('src/powerups/BroomRide.js');
 const hud=read('src/ui/GameHud.js');
 const css=read('src/styles/hud.css');
 assert.match(trail,/makeBillboardBatch\(48\)/);
 assert.match(trail,/makeBillboardBatch\(28\)/);
 assert.match(trail,/viewCenter\.xy\+=aCorner\*radius/);
 assert.match(trail,/smoke\.visible=state\.active/);
 assert.match(trail,/sparks\.visible=state\.warning/);
 assert.match(trail,/gl_FragColor/);
 assert.match(trail,/THREE\.NormalBlending/);
 assert.match(trail,/THREE\.AdditiveBlending/);
 assert.match(broom,/duration: 9/);
 assert.match(broom,/trail\.update\(remaining,t\)/);
 assert.match(broom,/trail\.hide\(\)/);
 assert.doesNotMatch(hud,/createBroomTimer/);
 assert.doesNotMatch(css,/broom-flight-status/);
 assert.match(broom,/broomIgnoresHazard\(type\)/);
});
