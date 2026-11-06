import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset} from '../src/devtools/world/FirePreset.js';
import {authoredAnchors} from '../src/devtools/world/EffectPlacement.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';

function legacyDemo(){
 const seed=LAVA_RIVER_AUTHORING.sourceSeed;
 const p=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 delete p.river;
 p.deck=structuredClone(LAVA_RIVER_AUTHORING.deck);
 p.objects.deck={binding:{kind:'deck',seed},anchors:[],cycle:defaultBurnCycle()};
 const a=newEffectAnchor([5.76,.07149,-14.9407],.6);
 a.id='bef26812-fdf5-4cbc-a850-5ecf0da7dd1b';
 a.name='Низкое пламя вдоль поверхности';
 a.layers.flame.width=.71;
 const b=newEffectAnchor([-1,.3,-8.5],.4);
 b.id='06943561-e891-434c-b98b-247ca0623578';
 const independent=newEffectAnchor([1,2,-10],.5);
 independent.name='Свободный костёр';
 p.world=[a,b,independent];
 return {p,a,b,independent};
}

test('exported demo lava effects migrate to the river while preserving all fire parameters',()=>{
 const {p,a,b,independent}=legacyDemo(),m=upgradePreset(p);
 assert.equal(m.river.length,2);
 assert.equal(m.world.length,1);
 assert.equal(m.world[0].id,independent.id);
 assert.deepEqual(m.river[0].position,[a.position[0],a.position[1]-.045,a.position[2]+12]);
 assert.deepEqual(m.river[1].position,[b.position[0],b.position[1]-.045,b.position[2]+12]);
 assert.equal(m.river[0].layers.flame.width,.71);
 assert.equal(m.river[0].name,a.name);
 assert.equal(m.deck.length,LAVA_RIVER_AUTHORING.deck.length);
 assert.equal(m.objects.deck,undefined,'empty override must not hide painted wooden rims');
 assert.equal(authoredAnchors(m).length,m.deck.length+m.river.length+m.world.length);
 assert.deepEqual(upgradePreset(m),m,'migrating/saving twice must not duplicate fire');
});

test('independent scene effects and explicitly empty river remain unchanged',()=>{
 const {p}=legacyDemo();
 p.river=[];
 const validated=upgradePreset(p);
 assert.equal(validated.river.length,0);
 assert.equal(validated.world.length,3);
 assert.ok(validated.objects.deck);
});

test('river-local anchors render and follow different crossing transforms',()=>{
 const scene=new THREE.Scene(),roots=[new THREE.Group(),new THREE.Group()];
 roots[0].position.z=-20;roots[1].position.z=-84;
 for(const root of roots){root.userData.fireBoundary={center:()=>0,halfWidth:()=>2.5};scene.add(root);}
 const seed=1337,base=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 const a=newEffectAnchor([.3,.4,-2],.6);
 base.river=[a];
 base.deck=[];
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed,camera:new THREE.PerspectiveCamera(),
  renderer:{getPixelRatio:()=>1},getRivers:()=>roots,getBurningPlants:()=>[],defaultFireObjects:[],preset:base});
 try{
  assert.equal(runtime.anchorsFor(runtime.riverSourceFor(roots[0])),base.river);
  runtime.update(.016);
  assert.equal(runtime.fire.stats().flames,2,'one instance per crossing');
  const mesh=scene.getObjectByName('WorldEditorFire'),matrix=new THREE.Matrix4();
  mesh.getMatrixAt(0,matrix);
  const firstZ=matrix.elements[14];
  roots[0].position.z+=9;
  runtime.update(.016);
  mesh.getMatrixAt(0,matrix);
  assert.ok(Math.abs(matrix.elements[14]-firstZ-9)<1e-5,'the same flame follows the moving river');
 }finally{runtime.dispose();}
});
