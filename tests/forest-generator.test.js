import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PlantRegistry,createForestRandom} from '../src/world/forest/PlantRegistry.js';
import {GRASS_VARIANTS,generateGrassClumpGeometry} from '../src/world/forest/GrassModels.js';
import {createForestGenerator,populateForest} from '../src/world/forest/ForestGenerator.js';

test('custom new species can join the forest without modifying the renderer',()=>{
 const registry=new PlantRegistry();
 registry.register({id:'moss',family:'groundcover',weight:2,create:()=>new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),new THREE.MeshBasicMaterial())});
 assert.equal(registry.choose('groundcover',.7).id,'moss');
 assert.throws(()=>registry.register({id:'moss',family:'groundcover',create:()=>{}}));
 assert.throws(()=>registry.choose('missing'));
 const a=createForestRandom(19),b=createForestRandom(19);
 assert.deepEqual(Array.from({length:12},()=>a()),Array.from({length:12},()=>b()));
});

test('all five adapted 3D grass variants have stable geometry and vertex colors',()=>{
 assert.deepEqual(Object.keys(GRASS_VARIANTS),['forest','wild','young','dry','scorched']);
 for(const name of Object.keys(GRASS_VARIANTS)){
  const a=generateGrassClumpGeometry(name,24),b=generateGrassClumpGeometry(name,24);
  assert.ok(a.getAttribute('position').count>32,name);
  assert.equal(a.index.count%3,0);
  assert.equal(a.getAttribute('color').count,a.getAttribute('position').count);
  assert.deepEqual(a.getAttribute('position').array,b.getAttribute('position').array);
  assert.ok(a.getAttribute('normal').array.every(Number.isFinite));
  a.dispose();b.dispose();
 }
 assert.throws(()=>generateGrassClumpGeometry('missing'),RangeError);
});

test('the same renderer instances pine, fern and grass without individual mesh draws',()=>{
 const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed:2026});
 assert.equal(forest.registry.list('pine').length,6);
 assert.equal(forest.registry.list('fern').length,3);
 assert.equal(forest.registry.list('grass').length,5);
 const pine=forest.plant('pine',-6,-8,1,182,'pine:sequoia_giant');
 const fern=forest.plant('fern',7,-13,1,174,'fern:young');
 const grass=forest.plant('grass',-6,-14,.5,173,'grass:dry');
 assert.equal(pine.userData.windKind,'pine');
 assert.equal(fern.userData.windKind,'fern-static');
 assert.equal(grass.userData.windKind,'grass');
 assert.ok(grass.userData.windMaterials.length>0);
 forest.finish();
 assert.equal(forest.getStats().plants,3);
 assert.ok(forest.getStats().drawCalls>0);
 assert.equal(scene.children.filter(child=>child.isInstancedMesh).length,forest.getStats().drawCalls);
 const previousRotation=pine.rotation.y;
 pine.userData.onForestRecycle();
 assert.notEqual(pine.rotation.y,previousRotation);
 forest.update();
 forest.dispose();
 assert.equal(forest.getStats().plants,0);
});

test('infinite forest generates many unique-looking plants with low draw-call count',()=>{
 const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed:602});
 populateForest(forest,{seed:603});
 const stats=forest.getStats();
 assert.ok(stats.plants>350,JSON.stringify(stats));
 assert.ok(stats.drawCalls<stats.plants/5,JSON.stringify(stats));
 const pines=forest.plants.filter(p=>p.userData.windKind==='pine');
 const ferns=forest.plants.filter(p=>p.userData.windKind==='fern-static');
 const grass=forest.plants.filter(p=>p.userData.windKind==='grass');
 assert.ok(pines.length>100);
 assert.ok(ferns.length>50);
 assert.ok(grass.length>100);
 // All species can spawn in any row, no depth-locked placement.
 const types=new Set(pines.map(p=>p.userData.plantSpecies));
 assert.ok(types.has('pine:sequoia_giant'));
 assert.ok(types.has('pine:dead_snag'));
 assert.ok(types.has('pine:scots_pine'));
 assert.ok(pines.some(p=>Math.abs(p.position.x)<7&&p.userData.plantSpecies==='pine:taiga_spruce'));
 const matrices=scene.children.filter(c=>c.isInstancedMesh);
 assert.ok(matrices.every(m=>m.instanceMatrix.usage===THREE.DynamicDrawUsage));
 forest.dispose();
});
