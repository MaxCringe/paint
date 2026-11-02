import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PINE_SPECIES,newAnchor,validatePreset,PresetHistory,localToDeck,deckToLocal} from '../src/devtools/world/FirePreset.js';
import {createForestGenerator} from '../src/world/forest/ForestGenerator.js';
const preset=()=>({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:[]});
test('preset rejects nonfinite transforms, unsupported species and over-budget data atomically',()=>{
 const p=preset();p.plants[PINE_SPECIES[0]].push(newAnchor());assert.deepEqual(validatePreset(p),p);
 p.plants[PINE_SPECIES[0]][0].position[0]=Infinity;assert.throws(()=>validatePreset(p));
 p.plants[PINE_SPECIES[0]]=Array.from({length:33},()=>newAnchor());assert.throws(()=>validatePreset(p));
 p.plants[PINE_SPECIES[0]]=[];p.plants['pine:unknown']=[];assert.throws(()=>validatePreset(p));
});
test('undo/redo preserves independent snapshots and discards redo after a new edit',()=>{
 const p=preset(),h=new PresetHistory(p);p.plants[PINE_SPECIES[0]].push(newAnchor());h.push(p);
 assert.equal(h.undo().plants[PINE_SPECIES[0]].length,0);assert.equal(h.redo().plants[PINE_SPECIES[0]].length,1);
 h.undo();p.seed=42;h.push(p);assert.equal(h.redo().seed,42);assert.equal(h.entries.length,2);
});
test('deck anchors follow the curved edge on both sides and stay on the wooden strip',()=>{
 const first={center:x=>Math.sin(x),halfWidth:x=>2+.1*Math.cos(x)},second={center:x=>Math.cos(x),halfWidth:()=>3};
 for(const side of [-1,1]){
  const a={...newAnchor([2,.022,.24],.2),side};
  const local=deckToLocal(a,first);assert.deepEqual(localToDeck(new THREE.Vector3(...local),first).position.map(n=>+n.toFixed(4)),[2,.022,.24]);
  const next=deckToLocal(a,second);assert.equal(next[2],Math.cos(2)+side*3.24);
 }
 const clamped=localToDeck(new THREE.Vector3(30,5,0),first);assert.equal(clamped.position[0],4.34);assert.equal(clamped.position[1],.5);assert.ok(clamped.position[2]>=.02);
});
test('instanced hit resolves to the source proxy species/template across generated copies',()=>{
 const scene=new THREE.Scene();const make=()=>createForestGenerator(scene,{seed:19,configure:r=>r.register({id:'pine:test',family:'pine',templates:2,create:()=>new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial())})});
 const forest=make(),a=forest.plant('pine',5,-10,1,150),b=forest.plant('pine',6,-12,1,150);forest.finish();
 for(const mesh of forest.instanceMeshes){for(let i=0;i<mesh.count;i++){const identity=forest.resolveInstance(mesh,i);assert.ok([a,b].includes(identity.root));assert.equal(identity.species,'pine:test');assert.equal(identity.template,identity.root.userData.plantTemplate);}}
 const matrixBefore=a.matrixWorld.clone();a.position.x+=3;forest.update();assert.notDeepEqual(a.matrixWorld.elements,matrixBefore.elements);assert.equal(forest.resolveInstance(forest.instanceMeshes[0],0).root,a);
 assert.equal(forest.resolveInstance(new THREE.Object3D(),0),null);forest.dispose();
});

test('one local anchor renders at the correct transform on every copy and follows source recycling',async()=>{
 const {createEditableFire}=await import('../src/devtools/world/EditableFire.js');
 const scene=new THREE.Scene(),fire=createEditableFire(scene,{capacity:8}),p=preset();
 const a=newAnchor([.4,2,-.3]);a.rotation=[.1,.3,-.2];a.scale=[.7,1.4,.9];a.speed=2;a.opacity=.4;
 p.plants[PINE_SPECIES[0]]=[a];
 const first=new THREE.Group(),second=new THREE.Group();first.position.set(-6,0,-10);first.rotation.y=.5;first.scale.set(.5,.8,.6);second.position.set(9,0,-15);second.rotation.y=-.8;scene.add(first,second);
 const sources=[first,second].map(root=>({root,key:PINE_SPECIES[0]}));fire.update(.04,sources,p);
 assert.equal(fire.stats().flames,2);const mesh=scene.getObjectByName('WorldEditorFire'),actual=new THREE.Matrix4();
 const local=new THREE.Matrix4().compose(new THREE.Vector3(...a.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.rotation)),new THREE.Vector3(...a.scale));
 for(let i=0;i<2;i++){mesh.getMatrixAt(i,actual);const expected=sources[i].root.matrixWorld.clone().multiply(local);actual.elements.forEach((n,j)=>assert.ok(Math.abs(n-expected.elements[j])<1e-5));}
 assert.equal(mesh.geometry.getAttribute('aStyle').getX(0),2);assert.ok(Math.abs(mesh.geometry.getAttribute('aStyle').getY(0)-.4)<1e-6);
 second.position.z=-170;fire.update(.04,sources,p,{moving:true});mesh.getMatrixAt(1,actual);assert.ok(actual.elements[14]<-169);
 fire.dispose();assert.equal(scene.getObjectByName('WorldEditorFire'),undefined);
});

test('fixed forest seed reproduces species templates and proxy transforms',()=>{
 const snapshot=()=>{
  const f=createForestGenerator(new THREE.Scene(),{seed:712,configure:r=>r.register({id:'pine:seeded',family:'pine',templates:3,create:()=>new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial())})});
  for(let i=0;i<4;i++)f.plant('pine',5+i,-8-i*6,1,150);
  const data=f.plants.map(root=>({template:root.userData.plantTemplate,rotation:root.rotation.toArray(),scale:root.scale.toArray(),position:root.position.toArray()}));f.dispose();return data;
 };
 assert.deepEqual(snapshot(),snapshot());
});
