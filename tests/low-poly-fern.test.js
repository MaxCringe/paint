import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLowPolyFern,generateFernGeometry,FERN_PALETTES} from '../src/world/createLowPolyFern.js';

test('lush young and withered ferns contain real 3D geometry',()=>{
 for(const variant of ['lush','young','withered']){
  const fern=createLowPolyFern({variant,seed:1337,windEnabled:false});
  assert.equal(fern.type,'Group');
  assert.equal(fern.children.length,1);
  assert.equal(fern.children[0].type,'Mesh');
  assert.equal(fern.userData.variant,variant);
  const geometry=fern.children[0].geometry;
  assert.ok(geometry.getAttribute('position').count>500);
  assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
  assert.ok(geometry.boundingBox.min.y>-.3);
  geometry.dispose();
  fern.children[0].material.dispose();
 }
 assert.deepEqual(Object.keys(FERN_PALETTES),['lush','young','withered']);
});

test('same seed reproduces exact vertices and different seed changes them',()=>{
 const a=generateFernGeometry({variant:'lush',seed:27});
 const b=generateFernGeometry({variant:'lush',seed:27});
 const c=generateFernGeometry({variant:'lush',seed:28});
 assert.deepEqual(a.geometry.getAttribute('position').array,b.geometry.getAttribute('position').array);
 assert.notDeepEqual(a.geometry.getAttribute('position').array,c.geometry.getAttribute('position').array);
 a.geometry.dispose();b.geometry.dispose();c.geometry.dispose();
});

test('roadside ferns are visually varied and rendered in shared instance batches',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(world.includes("import { generateFernGeometry, createFernMaterial } from './createLowPolyFern.js'"));
 assert.ok(world.includes("const fernVariants=['lush','young','withered']"));
 assert.ok(world.includes("variant==='lush'?4:3"));
 assert.ok(world.includes('new THREE.InstancedMesh(batch.geometry,fernMaterial,batch.parts.length)'));
 assert.ok(world.includes("g.userData.windKind='fern-static'"));
 assert.ok(world.includes('for(const group of fernGroups)group.updateMatrixWorld(true)'));
 assert.ok(!world.includes('buildFernGeometry()'));
});
