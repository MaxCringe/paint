import test from 'node:test';
import assert from 'node:assert/strict';
import {createSegmentGenerator,LAVA_SPAWN,HAZARD_SPACING} from '../src/systems/ObstacleManager.js';
import {readFileSync} from 'node:fs';
function simulate(random){const events=[];const full=type=>(z,s)=>events.push({type,z,s});const planner=createSegmentGenerator({makeLavaRiver:full('lava'),makePineLog:full('pineLog'),makeFish:()=>{},makePuddle:()=>{},makeObstacle:()=>{},makeSoul:()=>{},makeHat:()=>{},random});for(let path=0;path<=2000;path+=10)planner({path,speed:39.15});return {events,planner};}
test('lava remains regular across the infinite monotonic path, even when random rolls fail',()=>{
 for(const chance of [.02,.12,.18,.35,.99]){const {events}=simulate(()=>chance),lava=events.filter(e=>e.type==='lava'),logs=events.filter(e=>e.type==='pineLog');assert.ok(lava.length>=5);assert.ok(lava[0].s<=LAVA_SPAWN.firstGuaranteed+100);for(let i=1;i<lava.length;i++){const d=lava[i].s-lava[i-1].s;assert.ok(d>=LAVA_SPAWN.minGap);assert.ok(d<=LAVA_SPAWN.maxGap+100);}for(const a of lava)for(const b of logs)assert.ok(Math.abs(a.s-b.s)>=HAZARD_SPACING.lavaLog);}
});
test('restart clears the absolute frontier and lava cooldown',()=>{const {events,planner}=simulate(()=>.99);const first=events[0];planner.reset();events.length=0;for(let path=0;path<300;path+=10)planner({path,speed:39.15});assert.deepEqual(events[0],first);});
test('lava geometry and swept collision remain integrated with the absolute planner',()=>{const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');assert.ok(game.includes('createLavaRiverFactory(scene, obstacles'));assert.ok(game.includes('makeSegment({path:runPath'));assert.ok(game.includes('lavaCrossingTouchesRunner(before,after,half)'));assert.ok(game.includes('o.g.position.z=pathToZ(o.pathS,runPath)'));assert.ok(!game.includes('spawnZ<-150'));});
