import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PlantRegistry,createForestRandom} from '../src/world/forest/PlantRegistry.js';
import {GRASS_VARIANTS,generateGrassClumpGeometry} from '../src/world/forest/GrassModels.js';
import {createForestGenerator,populateForest,GRASS_DENSITY,SIDE_PINE_DENSITY} from '../src/world/forest/ForestGenerator.js';

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
 assert.ok(pine.userData.lavaFootprint.x>0);
 assert.ok(fern.userData.lavaFootprint.z>0);
 assert.ok(grass.userData.lavaFootprint.x>0);
 const cached=grass.userData.lavaFootprint;
 grass.userData.onForestRecycle();
 assert.equal(grass.userData.lavaFootprint,cached,'bounds cached across recycling');

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

test('thick wild grass forms variable-density colonies on both forest sides without covering the road',()=>{
 assert.ok(GRASS_DENSITY.vergeChance>.9);
 assert.ok(GRASS_DENSITY.colonyChance>.5);
 assert.ok(GRASS_DENSITY.minX>4.45,'the 8.7-unit road and its edge remain clear');
 const counts=[],species=new Set(),heights=new Set();
 for(const seed of [207,311,907]){
  const forest=createForestGenerator(new THREE.Scene(),{seed});
  populateForest(forest,{seed:seed+1});
  const grass=forest.plants.filter(p=>p.userData.plantSpecies.startsWith('grass:'));
  counts.push(grass.length);
  assert.ok(grass.length>=550&&grass.length<=950,'dense but finite pool: '+grass.length);
  assert.ok(grass.every(p=>Math.abs(p.position.x)>=GRASS_DENSITY.minX));
  assert.ok(grass.some(p=>p.position.x<0)&&grass.some(p=>p.position.x>0));
  assert.ok(grass.some(p=>Math.abs(p.position.x)>13),'undergrowth extends into forest');
  assert.ok(grass.some(p=>Math.abs(p.position.x)<8),'dense verge planting');
  for(const p of grass){
   species.add(p.userData.plantSpecies);
   heights.add(Math.round(p.scale.y*100)/100);
  }
  assert.ok(forest.getStats().drawCalls<100,'shared grass meshes stay instanced');
  const one=grass[0];
  for(let i=0;i<80;i++){
   one.userData.onForestRecycle();
   assert.ok(Math.abs(one.position.x)>=GRASS_DENSITY.minX,'recycling never moves grass onto track');
  }
  forest.dispose();
 }
 assert.equal(species.size,5,'every grass variety appears in thick undergrowth');
 assert.ok(heights.size>70,'grass heights remain genuinely varied');
 assert.ok(new Set(counts).size>1,'density responds to the random seed');
});

test('real recycled pines fill side gaps, with the original volcanic skyline restored',()=>{
 assert.ok(SIDE_PINE_DENSITY.midChance>=.5);
 assert.ok(SIDE_PINE_DENSITY.outerChance>=.5);
 assert.ok(SIDE_PINE_DENSITY.midX[0]>8);
 for(const seed of [47,129,521]){
  const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed});
  populateForest(forest,{seed:seed+123});
  const trees=forest.plants.filter(p=>p.userData.windKind==='pine');
  assert.ok(trees.length>=280&&trees.length<=370,'moderate additional pines: '+trees.length);
  assert.ok(trees.some(p=>p.position.x>8.5&&p.position.x<13.5));
  assert.ok(trees.some(p=>p.position.x< -8.5&&p.position.x> -13.5));
  assert.ok(trees.some(p=>p.position.x>24)&&trees.some(p=>p.position.x< -24));
  assert.ok(trees.every(p=>Math.abs(p.position.x)>=4.95));
  assert.ok(forest.getStats().drawCalls<trees.length/2,'side trees reuse the original instanced batches');
  forest.dispose();
 }
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(!world.includes('createDistantForestBackdrop'));
 assert.ok(!world.includes('distantForestBackdrop'));
 assert.ok(world.includes('populateForest(createForestGenerator(scene'));
 assert.ok(world.includes('new THREE.Fog(0x3b101b, 14, 68)'));
});

test('fern thickets are more numerous, differ in size, and stay outside the road',()=>{
 const counts=[],sizes=new Set(),species=new Set();
 for(const seed of [109,329,772]){
  const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed});
  populateForest(forest,{seed:seed+77});
  const ferns=forest.plants.filter(p=>p.userData.plantSpecies.startsWith('fern:'));
  counts.push(ferns.length);
  assert.ok(ferns.length>=210&&ferns.length<=375,'dense fern pool: '+ferns.length);
  assert.ok(ferns.some(p=>p.position.x<0)&&ferns.some(p=>p.position.x>0));
  assert.ok(ferns.some(p=>Math.abs(p.position.x)>11));
  assert.ok(ferns.every(p=>Math.abs(p.position.x)>4.65),'fern fronds stay off the road');
  assert.ok(forest.getStats().drawCalls<ferns.length/2,'shared fern batches are preserved');
  let min=Infinity,max=-Infinity;
  for(const fern of ferns){
   min=Math.min(min,fern.scale.y);max=Math.max(max,fern.scale.y);
   sizes.add(Math.round(fern.scale.y*100)/100);
   species.add(fern.userData.plantSpecies);
  }
  assert.ok(min<.6,'some ferns are small');
  assert.ok(max>1.5,'some ferns are large');
  const recycled=ferns.find(p=>p.position.x<0);
  for(let i=0;i<60;i++){
   recycled.userData.onForestRecycle();
   assert.ok(Math.abs(recycled.position.x)>4.65,'no drift onto track while recycling');
  }
  forest.dispose();
 }
 assert.equal(species.size,3,'lush, young and withered varieties are unchanged');
 assert.ok(sizes.size>80,'many distinct plant sizes');
 assert.ok(new Set(counts).size>1,'colonies remain irregular');
});
