import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';

test('shipped lava crossing matches the six new Fire Studio original flames and eight deck anchors',()=>{
 const {deck,river,sourceSeed,styleRevision}=LAVA_RIVER_AUTHORING;
 assert.equal(sourceSeed,2912723152);
 assert.equal(styleRevision,3);
 assert.equal(deck.length,8);
 assert.equal(river.length,6);
 assert.ok(deck.some(a=>a.side===-1)&&deck.some(a=>a.side===1));
 assert.ok(deck.every(a=>a.layers.flame?.enabled&&a.layers.flame.density===3));
 assert.ok(deck.every(a=>a.position[2]>=.02&&a.position[2]<=.39));
 assert.ok(river.every(a=>a.layers.flame?.enabled&&a.layers.flame.shape==='studio'));
 assert.ok(river.every(a=>a.layers.flame.density===12&&a.emitter.shape==='line'));
 assert.ok(river.some(a=>a.layers.embers?.enabled&&a.layers.coals?.enabled));
 const ids=[...deck,...river].map(a=>a.id);
 assert.equal(new Set(ids).size,14,'no overlapping flame identifiers');
});

test('every generated lava river renders all fourteen authored anchors with real studio flames',()=>{
 const scene=new THREE.Scene();
 const make=()=>{const g=new THREE.Group();g.position.set(0,.045,-35);g.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(g);return g;};
 const first=make(),second=make(),rivers=[first];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:1337,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>rivers,getBurningPlants:()=>[],defaultFireObjects:[]});
 try{
  assert.equal(runtime.preset.deck.length,8);
  assert.equal(runtime.preset.river.length,6);
  assert.equal(runtime.preset.budget,4500);
  runtime.update(.016);
  const one=runtime.fire.stats().anchors;
  assert.equal(one,14);
  assert.ok(runtime.fire.stats().originalFlames>=72,'six 12-tongue studio effects must draw');
  const mesh=scene.getObjectByName('FireStudioOriginalFlames');
  assert.ok(mesh&&mesh.visible&&mesh.count>=72);
  rivers.push(second);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,28);
  rivers.splice(0,1);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,one);
 }finally{runtime.dispose();}
});

test('an explicitly saved revision 3 may keep intentional custom art',async()=>{
 const {upgradePreset,PINE_SPECIES,newEffectAnchor}=await import('../src/devtools/world/FirePreset.js');
 const {defaultBurnCycle}=await import('../src/systems/fire/ArtisticBurnCycle.js');
 const data={version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:3,
  plants:Object.fromEntries(PINE_SPECIES.map(p=>[p,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[newEffectAnchor([0,.4,-2])],
  world:[newEffectAnchor([2,1,4])],
  objects:{deck:{binding:{kind:'deck',seed:LAVA_RIVER_AUTHORING.sourceSeed},anchors:[],cycle:defaultBurnCycle()}},
  group:[],customPresets:[],budget:4500};
 const actual=upgradePreset(data);
 assert.equal(actual.deck.length,8);assert.equal(actual.river.length,1);
 assert.equal(actual.world.length,1);assert.ok(actual.objects.deck);
 assert.deepEqual(upgradePreset(actual),actual);
});
