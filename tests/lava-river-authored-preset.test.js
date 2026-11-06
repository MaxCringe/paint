import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset} from '../src/devtools/world/FirePreset.js';
import {authoredAnchors} from '../src/devtools/world/EffectPlacement.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';

function seeded(revision=2){
 const seed=LAVA_RIVER_AUTHORING.sourceSeed;
 return {version:3,seed,riverVisualRevision:revision,
  plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[],world:[],
  objects:{},group:[],customPresets:[],budget:4500};
}

test('the exact newly exported JSON remains unchanged while lifting its style revision',()=>{
 const raw=seeded(2);
 raw.river=structuredClone(LAVA_RIVER_AUTHORING.river);
 raw.objects.deck={binding:{kind:'deck',seed:raw.seed},anchors:[],cycle:defaultBurnCycle()};
 const next=upgradePreset(raw);
 assert.equal(next.riverVisualRevision,3);
 assert.deepEqual(next.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(next.deck,LAVA_RIVER_AUTHORING.deck);
 assert.equal(next.objects.deck,undefined,'empty export override must not hide eight deck flames');
 assert.equal(authoredAnchors(next).length,14);
 assert.deepEqual(upgradePreset(next),next);
});

test('existing version-2 saved lightweight fire upgrades to new 6 river flames',()=>{
 const saved=seeded(2);
 const unrelated=newEffectAnchor([1,2,3]),tree=newEffectAnchor([.2,2,0]);
 saved.world=[unrelated];saved.plants[PINE_SPECIES[0]]=[tree];
 saved.objects.deck={binding:{kind:'deck',seed:saved.seed},anchors:[],cycle:defaultBurnCycle()};
 saved.deck[0].layers.flame.height=.35;
 const actual=upgradePreset(saved);
 assert.equal(actual.riverVisualRevision,3);
 assert.equal(actual.deck.length,8);
 assert.deepEqual(actual.deck,LAVA_RIVER_AUTHORING.deck);
 assert.deepEqual(actual.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(actual.world,[unrelated]);
 assert.deepEqual(actual.plants[PINE_SPECIES[0]],[tree]);
 assert.equal(actual.objects.deck,undefined);
});

test('previous heavy demo world effects are removed without erasing an independent campfire',()=>{
 const saved=seeded(1),old=newEffectAnchor([5.76,.07149,-14.9407],.6);
 old.id='bef26812-fdf5-4cbc-a850-5ecf0da7dd1b';
 const independent=newEffectAnchor([2,1,-10],.5);
 saved.world=[old,independent];
 saved.river=[{...newEffectAnchor([2,.3,-3]),id:'a0f98b2e-aeba-49a2-88b2-2e884f5535c7'}];
 const result=upgradePreset(saved);
 assert.equal(result.riverVisualRevision,3);
 assert.deepEqual(result.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(result.world,[independent]);
 assert.deepEqual(upgradePreset(result),result);
});

test('river-local studio anchors follow every moving crossing and keep their exact coordinates',()=>{
 const scene=new THREE.Scene(),roots=[new THREE.Group(),new THREE.Group()];
 roots[0].position.z=-20;roots[1].position.z=-84;
 for(const root of roots){root.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(root);}
 const preset=upgradePreset(seeded(3));
 preset.river=structuredClone(LAVA_RIVER_AUTHORING.river);
 preset.deck=[];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:preset.seed,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>roots,getBurningPlants:()=>[],defaultFireObjects:[],preset});
 try{
  runtime.update(.016);
  assert.equal(runtime.fire.stats().anchors,12);
  const mesh=scene.getObjectByName('FireStudioOriginalFlames'),matrix=new THREE.Matrix4();
  assert.ok(mesh&&mesh.count>=72);
  mesh.getMatrixAt(0,matrix);const z=matrix.elements[14];
  roots[0].position.z+=9;
  runtime.update(.016);
  mesh.getMatrixAt(0,matrix);
  assert.ok(Math.abs(matrix.elements[14]-z-9)<1e-5);
 }finally{runtime.dispose();}
});
