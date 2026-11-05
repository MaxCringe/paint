import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFallenPineObstacle } from '../src/obstacles/FallenPine.js';
import { createPineLogFactory } from '../src/obstacles/PineLog.js';

test('Kimi pine geometry has two merged meshes, useful metadata and varied seeds', () => {
 const left=createFallenPineObstacle({seed:17,length:8.9,clearance:1.7});
 const right=createFallenPineObstacle({seed:41,length:8.9,clearance:1.7});
 for(const tree of [left,right]){
  assert.equal(tree.children.length,2);
  assert.ok(tree.children.every(mesh=>mesh.isMesh&&mesh.geometry.attributes.position.count>0));
  assert.ok(tree.userData.clearance>1.3,'clearance should allow slide');
  assert.ok(tree.userData.triangles>200);
 }
 assert.notEqual(left.userData.trunkMidDiameter,right.userData.trunkMidDiameter);
});

test('new log factory preserves all-lanes pineLog hazard and shares meshes across instances',()=>{
 const scene=new THREE.Scene(), obstacles=[];
 const add=createPineLogFactory(scene,obstacles);
 for(let i=0;i<5;i++)add(-40-i*20);
 assert.equal(obstacles.length,5);
 assert.ok(obstacles.every(o=>o.type==='pineLog'&&o.lane===-1&&!o.passed));
 assert.deepEqual(obstacles.map(o=>o.g.position.z),[-40,-60,-80,-100,-120]);
 assert.equal(obstacles[0].g.children[0].geometry,obstacles[4].g.children[0].geometry);
 assert.equal(obstacles[0].g.children[0].material,obstacles[4].g.children[0].material);
});
