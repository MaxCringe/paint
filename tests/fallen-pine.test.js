import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFallenPineObstacle } from '../src/obstacles/FallenPine.js';
import { createPineLogFactory } from '../src/obstacles/PineLog.js';

test('six profiles have significantly different visible structure and color',()=>{
 const trees=Array.from({length:6},(_,profile)=>createFallenPineObstacle({seed:17,profile,length:8.9,clearance:1.7}));
 assert.deepEqual(trees.map(t=>t.userData.branchCount),[2,5,8,2,10,0]);
 assert.deepEqual(trees.map(t=>t.userData.signatureArmCount),[2,2,3,2,5,1]);
 assert.equal(new Set(trees.map(t=>t.userData.silhouette)).size,6);
 assert.equal(new Set(trees.map(t=>t.children[0].material.color.getHex())).size,6);
 assert.equal(new Set(trees.map(t=>t.userData.trunkMidDiameter)).size,6);
 for(const tree of trees){
  assert.equal(tree.children.length,2);
  assert.ok(tree.children.every(mesh=>mesh.isMesh&&mesh.geometry.attributes.position.count>0));
  assert.ok(tree.userData.clearance>1.3,'all designs preserve Fiona slide');
  assert.ok(tree.userData.triangles>200);
  tree.children[0].geometry.computeBoundingBox();
  assert.ok(tree.children[0].geometry.boundingBox.max.y>3,'tall branches must be visible');
 }
});
test('log spawning reuses 12 cached designs with original collision type',()=>{
 const scene=new THREE.Scene(), obstacles=[], add=createPineLogFactory(scene,obstacles);
 for(let i=0;i<13;i++)add(-40-i*20);
 assert.ok(obstacles.every(o=>o.type==='pineLog'&&o.lane===-1&&!o.passed));
 assert.equal(new Set(obstacles.slice(0,12).map(o=>o.g.children[0].geometry)).size,12);
 assert.equal(new Set(obstacles.slice(0,12).map(o=>o.g.userData.silhouette)).size,6);
 assert.equal(new Set(obstacles.slice(0,12).map(o=>o.g.rotation.y)).size,2);
 assert.ok(obstacles.slice(0,12).some(o=>o.g.children[0].geometry===obstacles[12].g.children[0].geometry));
});
