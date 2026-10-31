import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {broomTrailState} from '../src/powerups/BroomTrail.js';

test('Broom magic is steady until three seconds and fades before landing',()=>{
 assert.deepEqual(broomTrailState(0),{
  active:false,warning:false,length:1,strength:1,instability:0
 });
 const normal=broomTrailState(9);
 assert.equal(normal.active,true);
 assert.equal(normal.warning,false);
 assert.equal(normal.length,1);
 assert.equal(normal.strength,1);
 assert.equal(broomTrailState(3.01).warning,false);
 const warning=broomTrailState(3);
 assert.equal(warning.warning,true);
 assert.equal(warning.length,1);
 assert.equal(warning.strength,1);
 const near=broomTrailState(.6);
 assert.ok(near.length<.4);
 assert.ok(near.strength<.5);
 assert.ok(near.instability>.7);
 assert.equal(broomTrailState(-1).active,false);
});

test('Broom trail is visual-only; no on-screen timer, game duration or gameplay change',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const broom=read('src/powerups/BroomRide.js');
 const hud=read('src/ui/GameHud.js');
 const game=read('src/game.js');
 const trail=read('src/powerups/BroomTrail.js');
 const css=read('src/styles/hud.css');
 assert.match(broom,/duration: 9/);
 assert.match(broom,/createBroomTrail\(runner,glowTexture\)/);
 assert.match(broom,/trail\.update\(remaining,t\)/);
 assert.match(broom,/trail\.hide\(\)/);
 assert.match(trail,/ShaderMaterial/);
 assert.match(trail,/AdditiveBlending/);
 assert.doesNotMatch(hud,/createBroomTimer/);
 assert.doesNotMatch(hud,/broomTimer/);
 assert.doesNotMatch(css,/broom-flight-status/);
 assert.doesNotMatch(game,/broomDuration/);
 assert.match(broom,/broomIgnoresHazard\(type\)/);
});
