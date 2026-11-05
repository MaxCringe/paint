import test from 'node:test';
import assert from 'node:assert/strict';
import {createSegmentGenerator,HAZARD_SPACING,LAVA_SPAWN} from '../src/systems/ObstacleManager.js';
import {pathToZ,zToPath,laneMask,createRunSpace} from '../src/systems/RunSpace.js';
import {createForestRandom} from '../src/world/forest/PlantRegistry.js';
export function planner(seed=1,random=createForestRandom(seed)){
 const hazards=[],rewards=[];
 const full=type=>(z,s)=>hazards.push({type,lane:-1,z,s});
 const single=type=>(lane,z,s)=>hazards.push({type,lane,z,s});
 const reward=type=>(lane,z,y,s)=>rewards.push({type,lane,z,s});
 const generate=createSegmentGenerator({makeLavaRiver:full('lava'),makePineLog:full('pineLog'),makeFish:single('fish'),makePuddle:single('pee'),makeObstacle:(lane,z,_type,s)=>single('knot')(lane,z,s),makeSoul:reward('soul'),makeHat:reward('hat'),makeBroom:reward('broom'),broomChance:.055,random});
 return {generate,hazards,rewards};
}
test('absolute path mapping stays exact after arbitrary travel and never wraps',()=>{
 for(const path of [0,150,1000,1e7])assert.equal(zToPath(pathToZ(path+60,path),path),path+60);
 const p=planner();p.generate({path:0});p.generate({path:100});assert.throws(()=>p.generate({path:99}));
});
test('1000 seeded runs separate neighboring hazards and rewards in actual world coordinates',()=>{
 for(let seed=1;seed<=1000;seed++){
  const p=planner(seed);
  for(let path=0;path<=1200;path+=20){
   p.generate({path,speed:39.15});
   const records=p.generate.reservations;
   assert.ok(records.length<60);
   for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
    const a=records[i],b=records[j];if(!(laneMask(a.lane)&laneMask(b.lane)))continue;
    assert.ok(Math.abs(a.s-b.s)>=a.half+b.half+(a.kind==='hazard'||b.kind==='hazard'?1.4:.25)-1e-8,JSON.stringify({seed,a,b}));
   }
   const slot=p.generate.reservePickup('scarf',{path});if(slot)assert.equal(slot.z,pathToZ(slot.s,path));
  }
  const full=p.hazards.filter(h=>h.lane<0);
  for(let i=0;i<full.length;i++)for(let j=i+1;j<full.length;j++)assert.ok(Math.abs(full[i].s-full[j].s)>=(full[i].type===full[j].type?HAZARD_SPACING.fullWidth:HAZARD_SPACING.lavaLog));
 }
});
test('scarf reservation excludes full-width logs and future hazards',()=>{
 const space=createRunSpace();space.add({kind:'hazard',type:'pineLog',lane:-1,s:100,half:.85});
 for(let lane=0;lane<3;lane++)assert.equal(space.available({kind:'reward',lane,s:100,half:.35}),false);
 const p=planner();p.generate({path:0});const original=p.hazards.map(h=>h.s);p.generate.reset();p.hazards.length=0;p.generate({path:0});assert.ok(p.hazards.every(h=>h.s>=50));assert.ok(original.length>0);
});
