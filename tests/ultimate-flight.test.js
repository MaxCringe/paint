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
 assert.ok(game.includes('ultimate:ultTimer>0,slip:slipT>0'));
 assert.ok(game.includes('ultimateLavaGuardDuration(gap,half,ultimateSpeed)'));
 assert.ok(game.includes('ultimateAura.update(t,ultActive,ultimateFlight.lift)'));
});
