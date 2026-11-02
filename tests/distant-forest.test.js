import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDistantForestBackdrop,DISTANT_FOREST_LAYERS} from '../src/world/forest/DistantForestBackdrop.js';
import {readFileSync} from 'node:fs';

test('distant forest visually bridges fog and mountain horizon without extra animated trees',()=>{
 const scene=new THREE.Scene();
 const backdrop=createDistantForestBackdrop(scene,{seed:2026});
 assert.equal(DISTANT_FOREST_LAYERS.length,3);
 assert.equal(backdrop.drawCalls,1);
 assert.equal(scene.children.filter(x=>x.name==='KnottyPineDistantForest').length,1);
 assert.equal(backdrop.mesh.material.fog,false);
 assert.ok(backdrop.treeCount>65);
 assert.ok(backdrop.treeCount<220);
 const trees=backdrop.mesh.userData.trees;
 assert.ok(trees.every(t=>Math.abs(t.x)-t.canopyWidth>6),'no silhouette intrudes on the road view');
 assert.ok(trees.some(t=>t.x<0)&&trees.some(t=>t.x>0));
 assert.ok(trees.some(t=>t.x>50)&&trees.some(t=>t.x< -50),'fill the outer side gaps');
 for(const [i,layer] of DISTANT_FOREST_LAYERS.entries()){
  assert.ok(trees.some(t=>t.layer===i),'each fog-to-horizon depth band contributes pines');
  assert.ok(layer.z< -50&&layer.z> -73);
 }
 assert.ok(trees.filter(t=>t.volcanoSide).every(t=>t.height<=2.05),
  'volcano crater and its glowing streams remain unobscured by tall silhouettes');
 const geometry=backdrop.mesh.geometry;
 assert.equal(geometry.getAttribute('position').count,geometry.getAttribute('color').count);
 assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
 assert.ok(geometry.getAttribute('position').count<8500,'silhouettes have a small geometry budget');
 const seedTwin=createDistantForestBackdrop(new THREE.Scene(),{seed:2026});
 assert.deepEqual(seedTwin.mesh.userData.trees,trees,'same seed yields a stable background');
 seedTwin.dispose();backdrop.dispose();
 assert.ok(!scene.children.includes(backdrop.mesh));
});

test('distant treeline supplements the scene without replacing animated vegetation',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(world.includes('createDistantForestBackdrop(scene,{seed'));
 assert.ok(world.includes('populateForest(createForestGenerator(scene'));
 assert.ok(world.includes('const updateForestPines=()=>forest.update()'));
 assert.ok(world.includes('new THREE.Fog(0x3b101b, 14, 68)'),
  'the original fog treatment stays intact');
});
