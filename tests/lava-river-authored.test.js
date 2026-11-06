import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';

test('the manually placed fire from the previous export is back on each crossing',()=>{
 const {deck,river,sourceSeed,styleRevision}=LAVA_RIVER_AUTHORING;
 assert.equal(sourceSeed,2912723152);
 assert.equal(styleRevision,5);
 assert.equal(deck.length,8);
 assert.equal(river.length,6);
 assert.ok(deck.some(a=>a.side===-1)&&deck.some(a=>a.side===1));
 assert.ok(deck.every(a=>a.layers.flame?.enabled&&a.layers.flame.density===3));
 assert.ok(deck.every(a=>a.position[2]>=.02&&a.position[2]<=.39));
 assert.ok(river.every(a=>a.layers.flame?.enabled&&a.layers.flame.shape==='studio'));
 const distinct=new Set([...deck,...river].map(a=>a.id));
 assert.equal(distinct.size,14);
});
test('eight wooden-edge and six hand-placed river effects render for every crossing',()=>{
 const scene=new THREE.Scene();
 const make=()=>{const g=new THREE.Group();g.position.set(0,.045,-35);g.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(g);return g;};
 const first=make(),second=make(),rivers=[first];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:1337,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>rivers,getBurningPlants:()=>[],defaultFireObjects:[]});
 try{
  assert.equal(runtime.preset.deck.length,8);
  assert.equal(runtime.preset.river.length,6);
  runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,14);
  assert.ok(runtime.fire.stats().originalFlames>=72,'6 custom volumetric flames');
  assert.ok(scene.getObjectByName('FireStudioOriginalFlames')?.visible);
  rivers.push(second);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,28);
  rivers.splice(0,1);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,14);
 }finally{runtime.dispose();}
});
test('future edits in current revision remain independent of the restored artwork',async()=>{
 const {upgradePreset,PINE_SPECIES,newEffectAnchor}=await import('../src/devtools/world/FirePreset.js');
 const {defaultBurnCycle}=await import('../src/systems/fire/ArtisticBurnCycle.js');
 const current={version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:5,
  plants:Object.fromEntries(PINE_SPECIES.map(p=>[p,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[newEffectAnchor([0,.4,-2])],
  world:[newEffectAnchor([2,1,4])],
  objects:{deck:{binding:{kind:'deck',seed:LAVA_RIVER_AUTHORING.sourceSeed},anchors:[],cycle:defaultBurnCycle()}},
  group:[],customPresets:[],budget:4500};
 const actual=upgradePreset(current);
 assert.equal(actual.river.length,1);
 assert.ok(actual.objects.deck);
 assert.deepEqual(upgradePreset(actual),actual);
});
