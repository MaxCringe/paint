import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';

test('shipped artwork has the exported lava river flames and wooden deck anchors',()=>{
 const {deck,river,sourceSeed}=LAVA_RIVER_AUTHORING;
 assert.equal(sourceSeed,2912723152);
 assert.equal(deck.length,12);assert.equal(river.length,9);
 assert.equal(river.filter(a=>a.original?.mode==='lava').length,3);
 for(const a of deck){
  assert.ok(Math.abs(a.position[0])<=4.34);
  assert.ok(a.position[2]>=.02&&a.position[2]<=.39);
  assert.ok([-1,1].includes(a.side));
 }
 for(const a of river)assert.ok(a.position.every(Number.isFinite));
});

test('each active river gets its own deck and river-local effects',()=>{
 const scene=new THREE.Scene();
 const make=()=>{const g=new THREE.Group();g.position.set(0,.045,-35);g.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(g);return g;};
 const first=make(),second=make(),rivers=[first];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:1337,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>rivers,getBurningPlants:()=>[],defaultFireObjects:[]});
 try{
  assert.equal(runtime.preset.deck.length,12);
  runtime.update(.016);
  const one=runtime.fire.stats().anchors;
  assert.equal(one,21);
  rivers.push(second);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,one*2);
  rivers.splice(0,1);runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,one);
 }finally{runtime.dispose();}
});

test('imported user demo moves all nine lava effects onto rivers and clears empty deck shadow',async()=>{
 const {upgradePreset,PINE_SPECIES}=await import('../src/devtools/world/FirePreset.js');
 const {defaultBurnCycle}=await import('../src/systems/fire/ArtisticBurnCycle.js');
 const bundle=LAVA_RIVER_AUTHORING;
 const oldWorld=bundle.river.map(a=>({...structuredClone(a),
  position:[a.position[0],a.position[1]+.045,a.position[2]+bundle.demoRiverZ]}));
 const legacy={version:3,seed:bundle.sourceSeed,
  plants:Object.fromEntries(PINE_SPECIES.map(p=>[p,[]])),
  deck:structuredClone(bundle.deck),world:oldWorld,objects:{
   deck:{binding:{kind:'deck',seed:bundle.sourceSeed},anchors:[],cycle:defaultBurnCycle()}
  },group:[],customPresets:[],budget:6000};
 const migrated=upgradePreset(legacy);
 assert.equal(migrated.world.length,0,'all nine effects become local to a moving river');
 assert.equal(migrated.river.length,bundle.river.length);
 assert.ok(!migrated.objects.deck,'empty demo override must not suppress charred deck flames');
 assert.deepEqual(migrated.river.map(a=>a.id),bundle.river.map(a=>a.id));
});
