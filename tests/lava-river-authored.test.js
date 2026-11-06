import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';

test('shipped crossing artwork uses eight low flames over scorched wood and no heavy river cluster',()=>{
 const {deck,river,sourceSeed,styleRevision}=LAVA_RIVER_AUTHORING;
 assert.equal(sourceSeed,2912723152);
 assert.equal(styleRevision,1);
 assert.equal(deck.length,8);assert.equal(river.length,0);
 assert.ok(deck.some(a=>a.side===-1)&&deck.some(a=>a.side===1));
 for(const a of deck){
  assert.ok(Math.abs(a.position[0])<=4.34);
  assert.ok(a.position[2]>=.02&&a.position[2]<=.39);
  assert.ok([-1,1].includes(a.side));
  assert.equal(a.layers.flame.density,1);
  assert.ok(!a.layers.coals&&!a.layers.smoke&&!a.layers.embers);
 }
 assert.ok(deck.reduce((sum,a)=>sum+(a.layers.sparks?.rate??0),0)<12);
});

test('each active river gets only the lightweight edge flames and follows river recycling',()=>{
 const scene=new THREE.Scene();
 const make=()=>{const g=new THREE.Group();g.position.set(0,.045,-35);g.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(g);return g;};
 const first=make(),second=make(),rivers=[first];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:1337,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>rivers,getBurningPlants:()=>[],defaultFireObjects:[]});
 try{
  assert.equal(runtime.preset.deck.length,8);
  assert.equal(runtime.preset.river.length,0);
  assert.equal(runtime.preset.budget,4500);
  runtime.update(.016);
  const one=runtime.fire.stats().anchors;
  assert.equal(one,8);
  assert.equal(runtime.fire.stats().flames,8);
  rivers.push(second);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,one*2);
  rivers.splice(0,1);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,one);
 }finally{runtime.dispose();}
});

test('current saved authored layout preserves explicit user overrides',async()=>{
 const {upgradePreset,PINE_SPECIES,newEffectAnchor}=await import('../src/devtools/world/FirePreset.js');
 const {defaultBurnCycle}=await import('../src/systems/fire/ArtisticBurnCycle.js');
 const original={version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:1,
  plants:Object.fromEntries(PINE_SPECIES.map(p=>[p,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[],world:[newEffectAnchor([2,1,4])],
  objects:{deck:{binding:{kind:'deck',seed:LAVA_RIVER_AUTHORING.sourceSeed},anchors:[],cycle:defaultBurnCycle()}},
  group:[],customPresets:[],budget:4500};
 const actual=upgradePreset(original);
 assert.equal(actual.deck.length,8);
 assert.equal(actual.world.length,1);
 assert.equal(actual.river.length,0);
 assert.ok(actual.objects.deck,'user intentionally cleared deck on this version');
 assert.deepEqual(upgradePreset(actual),actual);
});
