import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForestGenerator} from '../src/world/forest/ForestGenerator.js';
import {createForestFireStudio,getPineFireProfile} from '../src/systems/fire/ForestFireStudio.js';
import {createFireTongueGeometry} from '../src/systems/fire/FireStudioFlames.js';

const species=['grove_cluster','runner_spruce_pro','taiga_spruce','dead_snag','sequoia_giant','scots_pine'];
test('Studio computes distinct ignition anchors from the six actual pine models',()=>{
 const profiles=species.map(s=>getPineFireProfile('pine:'+s));
 assert.ok(profiles.every(p=>p.height>2&&p.anchors.length>=4));
 assert.ok(profiles.every(p=>p.anchors.every(a=>a.y>=0&&a.y<=p.height&&a.height>=0&&a.height<=1)));
 assert.ok(profiles[4].height>profiles[0].height,'sequoia must have taller crown');
 assert.ok(profiles[3].dead&&profiles[3].anchors.every(a=>a.zone!=='crown'),'dry snag cannot burn nonexistent foliage');
 assert.strictEqual(getPineFireProfile('pine:scots_pine'),profiles[5],'profile must be cached');
 assert.throws(()=>getPineFireProfile('pine:invalid'),RangeError);
});
test('procedural 3D flame geometry is finite and bounded',()=>{
 for(const quality of ['low','medium','high']){
  const g=createFireTongueGeometry(quality);
  assert.ok(g.getAttribute('position').count<1000);
  assert.equal(g.getAttribute('position').count,g.getAttribute('aShellData').count);
  assert.ok(g.getAttribute('position').array.every(Number.isFinite));
  assert.ok(g.index.count>0);g.dispose();
 }
});
test('Fire Studio follows instanced forest proxies, enforces budget and resets on recycling',()=>{
 const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed:541});
 const pines=species.map((name,i)=>forest.plant('pine',i%2?9:-9,-40-i,1,174,'pine:'+name));
 forest.finish();
 const effect=createForestFireStudio(scene,{maxTrees:3,quality:'low',seed:99});
 try{
  assert.ok(pines.every(p=>p.children.every(c=>!c.geometry)));
  assert.equal(effect.igniteTree(pines[0]),true);
  assert.equal(effect.igniteTree(pines[0]),false);
  assert.equal(effect.igniteTree(pines[1]),true);
  assert.equal(effect.igniteTree(pines[2]),true);
  assert.equal(effect.igniteTree(pines[3]),false,'budget at most three trees');
  effect.update(.1);
  const stats=effect.getStats();
  assert.equal(stats.activeTrees,3);
  assert.ok(stats.flames>0&&stats.flames<=stats.maxFlames);
  assert.ok(stats.drawCalls<=2,'one flame batch and one sparks batch');
  const before=effect.previewObjects.flames.instanceMatrix.array.slice(12,16);
  pines[0].position.z+=3;
  effect.update(.1);
  const after=effect.previewObjects.flames.instanceMatrix.array.slice(12,16);
  assert.notDeepEqual(Array.from(before),Array.from(after),'flames follow the moving tree');
  pines[0].position.z-=175;
  effect.update(.1);
  assert.equal(effect.getStats().activeTrees,2,'recycled tree loses its old fire');
  effect.reset();assert.equal(effect.getStats().activeTrees,0);
  assert.equal(effect.getStats().drawCalls,0);
 }finally{effect.dispose();forest.dispose();}
 assert.equal(scene.children.filter(x=>x.name==='KnottyPineFireStudioPreview').length,0);
});
test('ignition near river chooses only nearby pines, never grass or ferns',()=>{
 const scene=new THREE.Scene(),forest=createForestGenerator(scene,{seed:543});
 forest.plant('pine',-6,-50,1,170,'pine:taiga_spruce');
 forest.plant('pine',15,-75,1,170,'pine:scots_pine');
 forest.plant('fern',-6,-50,1,170,'fern:lush');
 forest.plant('grass',7,-50,1,170,'grass:wild');
 forest.finish();
 const fx=createForestFireStudio(scene,{maxTrees:2});
 try{
  assert.equal(fx.igniteNearRiver(forest.plants,-50),1);
  assert.equal(fx.igniteNearRiver(forest.plants,-50),0);
  assert.equal(fx.igniteNearRiver([],0),0);
  fx.update(.1);assert.equal(fx.getStats().activeTrees,1);
 }finally{fx.dispose();forest.dispose();}
});
