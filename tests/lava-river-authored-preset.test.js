import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset} from '../src/devtools/world/FirePreset.js';
import {authoredAnchors} from '../src/devtools/world/EffectPlacement.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';

// Reconstruct a previously saved twelve-anchor deck and exported demo FX.
// This is intentionally independent of the new eight-anchor defaults.
const OLD_DECK_IDS=[
 '650e8c3d-469f-4d69-b20b-665c03d715e2','8dab6446-5380-4c6d-a0bd-d2a468ebe180',
 '0c9f2d5d-023b-4c88-a275-18c227886b4b','5b4dd78e-1ef0-4aa0-82e7-2c44b895f7f2',
 'b1be52ef-242f-4631-8349-74e89c0ca9a5','aad974c5-c125-4ef6-95da-f97b2e7a4da1',
 '7cb145bb-68ed-45fd-b18e-f8a0300afec6','ef544c3b-bdc0-46fb-aafe-0baa2b7604ca',
 '086ff68a-22fa-4a76-b6e3-166913488059','3182d4e5-4ef2-445b-bf84-5c461165ec8f',
 '10fc99c6-53de-4743-a2d8-d76f84537270','567e945d-9868-4ee5-83e8-d8ad9c409f16'
];
function legacyDemo(){
 const seed=LAVA_RIVER_AUTHORING.sourceSeed;
 const p=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 delete p.riverVisualRevision;
 delete p.river;
 p.budget=6000;
 p.deck=OLD_DECK_IDS.map((id,i)=>({...newEffectAnchor([(i%6)-3,.022,.25],.2),id,side:i<6?-1:1}));
 p.objects.deck={binding:{kind:'deck',seed},anchors:[],cycle:defaultBurnCycle()};
 const old=newEffectAnchor([5.76,.07149,-14.9407],.6);
 old.id='bef26812-fdf5-4cbc-a850-5ecf0da7dd1b';
 const another=newEffectAnchor([-1,.3,-8.5],.4);
 another.id='06943561-e891-434c-b98b-247ca0623578';
 const independent=newEffectAnchor([1,2,-10],.5);
 independent.name='Свободный костёр';
 p.world=[old,another,independent];
 return {p,old,another,independent};
}
test('v2 authored river fire has low ember ribbons on the charred deck',()=>{
 assert.equal(LAVA_RIVER_AUTHORING.styleRevision,2);
 assert.equal(LAVA_RIVER_AUTHORING.deck.length,8);
 assert.equal(LAVA_RIVER_AUTHORING.river.length,0);
 const sides=LAVA_RIVER_AUTHORING.deck.map(a=>a.side);
 assert.ok(sides.includes(-1)&&sides.includes(1));
 assert.ok(LAVA_RIVER_AUTHORING.deck.every(a=>a.layers.flame?.density===3&&a.emitter.shape==='line'));
 assert.equal(LAVA_RIVER_AUTHORING.deck.filter(a=>a.layers.smoke?.enabled).length,2);
 assert.ok(LAVA_RIVER_AUTHORING.deck.every(a=>!a.layers.coals&&!a.layers.embers));
 assert.ok(LAVA_RIVER_AUTHORING.deck.every(a=>a.position[2]>=.02&&a.position[2]<=.39));
 assert.ok(LAVA_RIVER_AUTHORING.deck.reduce((sum,a)=>sum+(a.layers.sparks?.rate??0),0)<12);
 const preset=upgradePreset({version:1,seed:31,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 preset.deck=structuredClone(LAVA_RIVER_AUTHORING.deck);
 assert.deepEqual(upgradePreset(preset),preset,'shipped authored effects must pass schema validation');
});
test('old heavy crossing changes to eight sparse edge flames without losing unrelated scene effects',()=>{
 const {p,independent}=legacyDemo(),m=upgradePreset(p);
 assert.equal(m.riverVisualRevision,2);
 assert.equal(m.river.length,0);
 assert.equal(m.world.length,1);
 assert.equal(m.world[0].id,independent.id);
 assert.equal(m.deck.length,8);
 assert.equal(m.budget,4500);
 assert.equal(m.objects.deck,undefined,'empty override must not hide edge flames');
 assert.equal(authoredAnchors(m).length,9);
 assert.deepEqual(upgradePreset(m),m,'the replacement is one-time and idempotent');
});
test('untouched v1 deck migrates to v2 once, preserving user-owned tree and free effects',()=>{
 const seed=1337;
 const p=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 const x=[-2.997491820347495,-.9654232905479151,2.25655021270737,3.6331554423924532,
          -3.0636389651661737,-1.6136925668269395,.4204284066194668,2.3626239294605327];
 const heights=[.26,.23,.30,.34,.32,.24,.22,.27];
 p.deck.forEach((a,i)=>{a.position[0]=x[i];a.layers.flame.shape='legacy';a.layers.flame.density=1;a.layers.flame.height=heights[i];});
 p.riverVisualRevision=1;
 const customWorld=newEffectAnchor([2,1,6]);
 const customTree=newEffectAnchor([.2,2,0]);
 p.world=[customWorld];p.plants[PINE_SPECIES[0]]=[customTree];
 const result=upgradePreset(p);
 assert.equal(result.riverVisualRevision,2);
 assert.equal(result.deck.length,8);
 assert.ok(result.deck.every(a=>a.emitter.shape==='line'&&a.layers.flame.density===3));
 assert.deepEqual(result.world,[customWorld]);
 assert.deepEqual(result.plants[PINE_SPECIES[0]],[customTree]);
 assert.deepEqual(upgradePreset(result),result);
});
test('custom-edited v1 flame positions do not get overwritten during migration',()=>{
 const seed=1337,p=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
 p.riverVisualRevision=1;
 p.deck[0].position[0]=.12345;
 const custom=structuredClone(p.deck);
 const result=upgradePreset(p);
 assert.deepEqual(result.deck,custom);
});
test('user changes to the lightweight crossing are not overwritten after saving',()=>{
 const {p}=legacyDemo(),m=upgradePreset(p);
 m.deck[0].layers.flame.height=.43;
 m.river=[newEffectAnchor([0,.4,-2])];
 m.world.push(newEffectAnchor([3,1,4]));
 const again=upgradePreset(JSON.parse(JSON.stringify(m)));
 assert.deepEqual(again,m);
});
test('old river FX are removed but separately authored river FX remain',()=>{
 const {p}=legacyDemo();
 const custom=newEffectAnchor([1,.3,3]);
 const previous=newEffectAnchor([2,.3,-3]);
 previous.id='a0f98b2e-aeba-49a2-88b2-2e884f5535c7';
 p.river=[previous,custom];
 const result=upgradePreset(p);
 assert.deepEqual(result.river.map(a=>a.id),[custom.id]);
 assert.equal(result.deck.length,8);
});
test('an explicitly current saved layout is preserved, even if it includes old IDs',()=>{
 const {p}=legacyDemo();
 p.riverVisualRevision=LAVA_RIVER_AUTHORING.styleRevision;
 p.river=[];
 assert.deepEqual(upgradePreset(p).world,p.world);
 assert.deepEqual(upgradePreset(p).deck,p.deck);
 assert.ok(upgradePreset(p).objects.deck);
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
