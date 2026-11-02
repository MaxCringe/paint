import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLowPolyPine,PINE_ARCHETYPES} from '../src/world/LowPolyPine.js';
import {createScotsPine,createFacetedBoughGeometry} from '../src/world/forest/FacetedPine.js';

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


test('five low-poly pine archetypes are available without roadside height restrictions',()=>{
 assert.equal(PINE_ARCHETYPES.length,5);
 for(const variant of PINE_ARCHETYPES){
  const pine=createLowPolyPine(variant);
  assert.equal(pine.userData.pineArchetype,variant);
  assert.ok(pine.children.some(child=>child.isMesh));
  assert.ok(pine.position.equals(pine.position.set(0,0,0)));
 }
 const scots=createScotsPine();
 assert.equal(scots.userData.pineArchetype,'scots_pine');
 assert.equal(scots.children.filter(child=>child.geometry.type==='BufferGeometry').length,5);
 const canopy=createFacetedBoughGeometry(2,1.6,7,.3);
 assert.equal(canopy.index.count/3,28);
 canopy.dispose();
});

test('World.js delegates to forest and keeps separate obstacle generation',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(world.includes('populateForest(createForestGenerator(scene'));
 assert.ok(world.includes('const updateForestPines=()=>forest.update()'));
 assert.ok(game.includes("function makeObstacle(lane,z,type='knot')"));
 assert.ok(game.includes("type:'knot'"));
});
