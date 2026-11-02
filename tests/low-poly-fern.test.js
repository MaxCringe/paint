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

test('fern generator provides the three cached species of the unified forest',()=>{
 const catalog=readFileSync(new URL('../src/world/forest/PlantCatalog.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(catalog.includes("Object.entries({lush:55,young:29,withered:16})"));
 assert.ok(catalog.includes("templates:variant==='lush'?4:3"));
 assert.ok(catalog.includes('generateFernGeometry('));
 assert.ok(world.includes('populateForest('));
 assert.ok(!world.includes('buildFernGeometry()'));
});
