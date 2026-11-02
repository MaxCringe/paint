import test from 'node:test';
import assert from 'node:assert/strict';
import {createSegmentGenerator,LAVA_SPAWN,HAZARD_SPACING} from '../src/systems/ObstacleManager.js';
import {readFileSync} from 'node:fs';

// Use the exact production segment generator with deterministic random input.
// World coordinates recycle in the runner; progress and lava cooldown must not.
function simulate(random,count=85){
 const events=[],calls=[];
 const make=(type)=>(...args)=>events.push({type,index:calls.length,z:args[0]});
 const planner=createSegmentGenerator({
  makeLavaRiver:make('lava'),makePineLog:make('pineLog'),
  makeFish:make('fish'),makePuddle:make('puddle'),
  makeObstacle:make('pine'),makeSoul:()=>{},makeHat:()=>{},
  random
 });
 for(let i=0;i<count;i++){
  const z=-50-(i%5)*23;
  calls.push(z);
  planner(z);
 }
 return {events,planner};
}

test('lava is guaranteed on the first run even when all random rolls fail',()=>{
 const {events}=simulate(()=>.99,65);
 const rivers=events.filter(e=>e.type==='lava');
 assert.ok(rivers.length>=5,'regular real lava rivers must spawn');
 assert.equal(rivers[0].index,7,'first lava must arrive in the opening segments');
 for(let i=1;i<rivers.length;i++){
  const elapsed=(rivers[i].index-rivers[i-1].index)*22;
  assert.equal(elapsed,LAVA_SPAWN.maxGap);
  assert.ok(elapsed>=LAVA_SPAWN.minGap);
 }
 const recycled=simulate(()=>.12,55).events.filter(e=>e.type==='lava');
 assert.ok(new Set(recycled.map(r=>r.z)).size>1,
  'lava should remain active when the game recycles world-z coordinates');
});

test('frequent lava is still separated safely from logs and lane hazards',()=>{
 for(const chance of [.02,.12,.18,.35,.99]){
  const {events}=simulate(()=>chance,100);
  const lava=events.filter(e=>e.type==='lava');
  const logs=events.filter(e=>e.type==='pineLog');
  assert.ok(lava.length>=5,'lava must be present for chance '+chance);
  assert.ok(lava[0].index<=11,'first lava not postponed indefinitely');
  for(let i=1;i<lava.length;i++){
   const elapsed=(lava[i].index-lava[i-1].index)*22;
   assert.ok(elapsed>=LAVA_SPAWN.minGap);
   assert.ok(elapsed<=LAVA_SPAWN.maxGap+HAZARD_SPACING.lavaLog*2,
    'overdue river cannot be blocked indefinitely');
  }
  for(const river of lava){
   for(const log of logs){
    assert.ok(Math.abs(river.index-log.index)*22>=HAZARD_SPACING.lavaLog,
     'never put a log beside a lava crossing');
   }
  }
 }
});

test('restart clears lava cooldown and reintroduces early rivers',()=>{
 const events=[];
 let position=0;
 const planner=createSegmentGenerator({
  makeLavaRiver:()=>events.push(position),
  makePineLog:()=>{},makeFish:()=>{},makePuddle:()=>{},
  makeObstacle:()=>{},makeSoul:()=>{},makeHat:()=>{},
  random:()=>.99
 });
 for(position=1;position<=17;position++)planner(-50);
 assert.deepEqual(events,[7,17]);
 planner.reset();
 events.length=0;
 for(position=1;position<=8;position++)planner(-50);
 assert.deepEqual(events,[7]);
});

test('lava geometry factory and collision rules are still integrated into the game',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const river=readFileSync(new URL('../src/obstacles/LavaRiver.js',import.meta.url),'utf8');
 assert.ok(game.includes('const makeLavaRiver = createLavaRiverFactory(scene, obstacles)'));
 assert.ok(game.includes('makeSegment(spawnZ)'));
 assert.ok(game.includes("if(o.type==='lava')"));
 assert.ok(game.includes('lavaCrossingTouchesRunner(before,after,half)'));
 assert.ok(river.includes("obstacles.push({g,lane:-1,type:'lava',z,passed:false})"));
});
