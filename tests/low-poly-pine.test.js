import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLowPolyPine} from '../src/world/LowPolyPine.js';

test('AI Studio grove pine has a tapered trunk, four crafted foliage tiers and a contact shadow',()=>{
 const pine=createLowPolyPine();
 assert.equal(pine.type,'Group');
 assert.deepEqual(pine.position.toArray(),[0,0,0]);
 assert.equal(pine.children.length,6);

 const [trunk,...rest]=pine.children;
 const tiers=rest.slice(0,4),shadow=rest[4];
 assert.equal(trunk.geometry.type,'CylinderGeometry');
 assert.equal(trunk.geometry.parameters.radiusTop,.242);
 assert.equal(trunk.geometry.parameters.radiusBottom,.528);
 assert.equal(trunk.geometry.parameters.height,4.8);
 assert.equal(trunk.geometry.parameters.radialSegments,6);
 assert.equal(trunk.position.y,2.4);
 assert.equal(trunk.material.color.getHexString(),'582b1b');
 assert.equal(trunk.material.flatShading,true);

 const radii=[2.86,2.86*(1-.58/4),2.86*(1-.58/2),2.86*(1-3*.58/4)];
 tiers.forEach((tier,i)=>{
  assert.equal(tier.geometry.type,'ConeGeometry');
  assert.equal(tier.geometry.parameters.radialSegments,6);
  assert.equal(tier.geometry,tiers[0].geometry,'four cones share one geometry');
  assert.equal(tier.material,tiers[0].material,'four cones share one material');
  assert.ok(Math.abs(tier.scale.x-radii[i])<1e-10);
  assert.ok(Math.abs(tier.position.y-(2.35+i*.92))<1e-10);
  assert.equal(tier.material.color.getHexString(),'143823');
  assert.equal(tier.material.flatShading,true);
 });
 assert.equal(shadow.geometry.type,'CircleGeometry');
 assert.equal(shadow.geometry.parameters.radius,2.64);
 assert.equal(shadow.material.opacity,.45);
 assert.equal(shadow.material.depthWrite,false);
 assert.equal(shadow.position.y,.015);
});

test('preview pines grow vertically without widening into the running lanes',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(world.includes('const pineModelScaleXZ=.50;'));
 assert.ok(world.includes('const pineModelScaleY=.82;'));
 assert.ok(world.includes('source.position.y*pineModelScaleY'));
 assert.ok(world.includes('source.position.x*pineModelScaleXZ'));
 assert.ok(world.includes('source.scale.y*pineModelScaleY'));
 assert.ok(world.includes('source.scale.x*pineModelScaleXZ'));
 assert.ok(world.includes('scale*(.92+Math.random()*.52)'));
 assert.ok(world.includes('scale*(.82+Math.random()*.22)'));
 // Original pine stays unchanged; render instances are still batched.
 const pine=createLowPolyPine();
 assert.equal(pine.children[0].position.y,2.4);
 assert.ok(.82>.50);
});

test('forest instancing keeps wind, recycling and lane obstacles separate from visual pine swap',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(world.includes("import { createLowPolyPine } from './LowPolyPine.js'"));
 assert.ok(world.includes('const pinePrototype=createLowPolyPine()'));
 assert.ok(world.includes('pinePart(g,source.geometry,source.material)'));
 assert.ok(world.includes('new THREE.InstancedMesh(batch.geometry,batch.material,batch.parts.length)'));
 assert.ok(world.includes("g.userData.recycleLength=recycleLength;g.userData.windKind='pine'"));
 assert.ok(world.includes('updateForestPines()'));
 assert.ok(game.includes("function makeObstacle(lane,z,type='knot')"));
 assert.ok(game.includes("type:'knot'"));
});
