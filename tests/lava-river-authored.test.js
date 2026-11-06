import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
test('all eight deleted deck flames are gone; the six manual lava flames survive',()=>{
 const {deck,river,styleRevision}=LAVA_RIVER_AUTHORING;
 assert.equal(styleRevision,7);assert.deepEqual(deck,[]);assert.equal(river.length,6);
 assert.ok(river.every(a=>a.layers.flame?.enabled&&a.layers.flame.shape==='studio'));
 assert.equal(river[0].layers.flame.brightness,2.3);
 assert.deepEqual(river[5].position,[-4.292833860456927,-0.7753001598477711,-3.2310344066615855]);
});
test('every crossing renders exactly six river effects and no bundled deck effects',()=>{
 const scene=new THREE.Scene(),rivers=[];
 const make=()=>{const root=new THREE.Group();root.position.z=-35;
  root.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(root);return root;};
 rivers.push(make());
 const r=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:1337,
  camera:new THREE.PerspectiveCamera(),renderer:{getPixelRatio:()=>1},
  getRivers:()=>rivers,getBurningPlants:()=>[],defaultFireObjects:[]});
 try{
  assert.deepEqual(r.defaults.deck,[]);assert.deepEqual(r.preset.deck,[]);
  r.update(.016);assert.equal(r.fire.stats().anchors,6);
  assert.ok(r.fire.stats().originalFlames>=72);
  rivers.push(make());r.update(.016);assert.equal(r.fire.stats().anchors,12);
  rivers.shift();r.update(.016);assert.equal(r.fire.stats().anchors,6);
 }finally{r.dispose();}
});
