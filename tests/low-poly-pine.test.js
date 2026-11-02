import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLowPolyPine,PINE_ARCHETYPES,FOREST_PINE_WEIGHTS,FOREST_PINE_DEPTH_SIZE,chooseForestPine,forestPineScale} from '../src/world/LowPolyPine.js';

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
 assert.ok(world.includes('const pineSize=forestPineScale(depth,visualScale)'));
 assert.ok(world.includes('pineSize.height'));
 assert.ok(world.includes('pineSize.width*(.82+Math.random()*.22)'));
 // Original pine stays unchanged; render instances are still batched.
 const pine=createLowPolyPine();
 assert.equal(pine.children[0].position.y,2.4);
 assert.ok(.82>.50);
});

test('forest instancing keeps wind, recycling and lane obstacles separate from visual pine swap',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(world.includes("import { createLowPolyPine, PINE_ARCHETYPES, chooseForestPine, forestPineScale } from './LowPolyPine.js'"));
 assert.ok(world.includes('const pinePrototype=createLowPolyPine()'));
 assert.ok(world.includes('pinePart(g,source.geometry,source.material)'));
 assert.ok(world.includes('new THREE.InstancedMesh(batch.geometry,batch.material,batch.parts.length)'));
 assert.ok(world.includes("g.userData.recycleLength=recycleLength;g.userData.windKind='pine'"));
 assert.ok(world.includes('updateForestPines()'));
 assert.ok(game.includes("function makeObstacle(lane,z,type='knot')"));
 assert.ok(game.includes("type:'knot'"));
});

test('all five AI Studio forest pines have their authored trunk and foliage dimensions',()=>{
 const variants=[
  ['grove_cluster',4,4.8,.242,.528,6,'582b1b','143823',2.64],
  ['runner_spruce_pro',5,5.52,.231,.504,7,'5c2d1d','143823',2.52],
  ['dead_snag',0,4.56,.187,.408,6,'4d3228',null,2.04],
  ['sequoia_giant',6,7.68,.33,.72,8,'7a311b','113320',3.6],
  ['taiga_spruce',6,5.76,.209,.456,6,'4f281b','0e2b1b',2.28]
 ];
 assert.deepEqual([...PINE_ARCHETYPES],variants.map(v=>v[0]));
 for(const [name,tiers,height,top,bottom,sides,bark,foliage,shadowRadius] of variants){
  const pine=createLowPolyPine(name);
  assert.equal(pine.userData.pineArchetype,name);
  const trunk=pine.children[0],shadow=pine.children.at(-1);
  assert.equal(trunk.geometry.parameters.height,height);
  assert.equal(trunk.geometry.parameters.radiusTop,top);
  assert.equal(trunk.geometry.parameters.radiusBottom,bottom);
  assert.equal(trunk.geometry.parameters.radialSegments,sides);
  assert.equal(trunk.position.y,height/2);
  assert.equal(trunk.material.color.getHexString(),bark);
  assert.ok(Math.abs(shadow.geometry.parameters.radius-shadowRadius)<1e-10);
  const cones=pine.children.filter(part=>part.geometry.type==='ConeGeometry');
  assert.equal(cones.length,tiers,name+' foliage tier count');
  if(tiers){
   assert.equal(cones[0].material.color.getHexString(),foliage);
   assert.ok(cones.every(part=>part.geometry===cones[0].geometry&&part.material===cones[0].material));
  }else{
   // Bare dead pine has broken wooden branches, not green needles.
   const stubs=pine.children.filter(part=>part.geometry.type==='CylinderGeometry');
   assert.ok(stubs.length>1);
   assert.ok(stubs.slice(1).every(part=>part.material===trunk.material));
  }
 }
 assert.throws(()=>createLowPolyPine('unknown'),RangeError);
});

test('tree variety weights favor verge spruces and keep giants outside the roadside grove',()=>{
 for(const band of ['near','middle','far']){
  const weights=FOREST_PINE_WEIGHTS[band];
  assert.equal(PINE_ARCHETYPES.reduce((total,kind)=>total+weights[kind],0),100);
  assert.ok(PINE_ARCHETYPES.every(kind=>Number.isFinite(weights[kind])&&weights[kind]>=0));
  assert.equal(chooseForestPine(band,0),'grove_cluster');
  assert.equal(chooseForestPine(band,.999999),band==='near'?'dead_snag':'taiga_spruce');
 }
 assert.equal(FOREST_PINE_WEIGHTS.near.sequoia_giant,0);
 assert.ok(FOREST_PINE_WEIGHTS.far.sequoia_giant>FOREST_PINE_WEIGHTS.middle.sequoia_giant);
 assert.equal(chooseForestPine('near',.77),'runner_spruce_pro');
 assert.equal(chooseForestPine('near',.90),'dead_snag');
 assert.equal(chooseForestPine('middle',.70),'dead_snag');
 assert.equal(chooseForestPine('far',.59),'sequoia_giant');
 assert.equal(chooseForestPine('far',.82),'taiga_spruce');
});

test('five forest pines keep instancing, original scale, recycling and untouched obstacles',()=>{
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(world.includes('pinePrototypes[name]=createLowPolyPine(name)'));
 assert.ok(world.includes('const archetype=chooseForestPine(depth)'));
 assert.ok(world.includes("archetype==='sequoia_giant'?.78+Math.random()*.18:1"));
 assert.ok(world.includes('for(const source of prototype.children)'));
 for(const row of ["'near'","'middle'","'far'"])assert.ok(world.includes("farForestLoop,"+row)||world.includes("roadsideLoop,"+row));
 assert.ok(world.includes('const pineModelScaleXZ=.50;'));
 assert.ok(world.includes('const pineModelScaleY=.82;'));
 assert.ok(world.includes("g.userData.recycleLength=recycleLength;g.userData.windKind='pine'"));
 assert.ok(world.includes('new THREE.InstancedMesh(batch.geometry,batch.material,batch.parts.length)'));
 assert.ok(game.includes("function makeObstacle(lane,z,type='knot')"));
});

test('tallest pines are reserved for the distant forest instead of the road verge',()=>{
 assert.equal(FOREST_PINE_WEIGHTS.near.sequoia_giant,0);
 assert.equal(FOREST_PINE_WEIGHTS.near.taiga_spruce,0);
 assert.equal(FOREST_PINE_WEIGHTS.middle.sequoia_giant,0);
 assert.ok(FOREST_PINE_WEIGHTS.far.sequoia_giant>0);
 assert.ok(FOREST_PINE_WEIGHTS.far.taiga_spruce>FOREST_PINE_WEIGHTS.middle.taiga_spruce);

 const nearMin=forestPineScale('near',1,0);
 const nearMax=forestPineScale('near',1.8,1);
 const middleMax=forestPineScale('middle',1.8,1);
 const farMax=forestPineScale('far',1.8,1);
 assert.equal(nearMin.height,1*.77*.86);
 assert.equal(nearMax.width,1.25);
 assert.equal(middleMax.width,1.4);
 assert.equal(farMax.width,1.8);
 assert.ok(nearMax.height<middleMax.height);
 assert.ok(middleMax.height<farMax.height);
 assert.ok(FOREST_PINE_DEPTH_SIZE.far.heightFactor>FOREST_PINE_DEPTH_SIZE.near.heightFactor);

 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(world.includes('const pineSize=forestPineScale(depth,visualScale)'));
 assert.ok(world.includes('g.scale.set(pineSize.width'));
 assert.ok(world.includes('pineSize.height'));
 assert.ok(world.includes("roadsideLoop,'near'"));
 assert.ok(world.includes("roadsideLoop,'middle'"));
 assert.ok(world.includes("farForestLoop,'far'"));
});
