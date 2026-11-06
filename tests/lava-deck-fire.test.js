import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLavaRiverFactory} from '../src/obstacles/LavaRiver.js';
import {createLavaDeckFire} from '../src/systems/fire/LavaDeckFire.js';
import {readFileSync} from 'node:fs';

function mockCanvas(){
 const noop=()=>{},gradient={addColorStop:noop};
 return {createElement(tag){
  assert.equal(tag,'canvas');
  const ctx={beginPath:noop,moveTo:noop,bezierCurveTo:noop,stroke:noop,
   fillRect:noop,createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,
   getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop};
  return {width:0,height:0,getContext:()=>ctx};
 }};
}

test('actual lava river puts only small FireStudio anchors on charred wooden planks',()=>{
 const prior=globalThis.document;
 globalThis.document=mockCanvas();
 const scene=new THREE.Scene(),obstacles=[];
 let shoreline;
 try{
  const makeRiver=createLavaRiverFactory(scene,obstacles,{onTreeFire:data=>shoreline=data});
  makeRiver(-58);
  const group=obstacles[0].g,anchors=group.userData.deckFireAnchors;
  assert.ok(Array.isArray(anchors));
  assert.ok(anchors.length>=6&&anchors.length<=24,'sparse flame spots, never a wall');
  assert.ok(anchors.some(a=>a.z-shoreline.center(a.x)>0));
  assert.ok(anchors.some(a=>a.z-shoreline.center(a.x)<0));
  for(const a of anchors){
   const delta=Math.abs(a.z-shoreline.center(a.x));
   const bank=shoreline.halfWidth(a.x);
   assert.ok(Math.abs(a.x)<=4.2,'flames remain within wooden road, not forest');
   assert.ok(delta>=bank+.30&&delta<=bank+.73,
    'fire must be on the charred deck OUTSIDE the lava, not in molten channel');
   assert.ok(a.size>=.27&&a.size<=.41,'readable low flames, not big torches');
   assert.equal(a.y,.022);
   assert.ok(a.phase>=0&&a.phase<1);
  }
  const charred=group.getObjectByName('LavaCharredPineDeck');
   assert.ok(charred?.userData.fireDeckSurface,'editor can still select burnt planks');
   const verts=charred.geometry.getAttribute('position');
   assert.equal(verts.count,2*65*6,'one low-cost vertex-color mesh for both burnt edges');
   for(const side of [-1,1]){
    const start=side===-1?0:65*6;
    const x=verts.getX(start),z=verts.getZ(start+5);
    assert.ok(Math.abs(z-shoreline.center(x))>=shoreline.halfWidth(x)+1.05,
     'charred pine extends visibly beyond the molten basalt edge');
   }
   assert.equal(group.userData.bankFlames,undefined);
  const fx=createLavaDeckFire(scene);
  try{
   assert.equal(fx.registerRiver(group),true);
   assert.equal(fx.registerRiver(group),false,'no duplicate registration');
   fx.update(.04);
   assert.equal(fx.getStats().rivers,1);
   assert.equal(fx.getStats().flames,anchors.length);
   assert.equal(fx.getStats().drawCalls,1);
   assert.equal(fx.previewObject.geometry.getAttribute('aInstanceParams').itemSize,4);
   const before=fx.previewObject.instanceMatrix.array[14];
   group.position.z+=11;
   fx.update(.04);
   assert.ok(Math.abs(fx.previewObject.instanceMatrix.array[14]-before-11)<.001,
    'board fire must scroll with the river');
   fx.releaseOwner(group);
   assert.equal(fx.getStats().flames,0,'removing the river extinguishes its deck flames');
  }finally{fx.dispose();}
 }finally{
  for(const o of obstacles){scene.remove(o.g);o.g.userData.dispose?.()}
  if(prior===undefined)delete globalThis.document;
  else globalThis.document=prior;
 }
});

test('one GPU batch serves multiple rivers, respects bounds, reset and disposal',()=>{
 const scene=new THREE.Scene(),fx=createLavaDeckFire(scene,{maxRivers:2,maxAnchorsPerRiver:2});
 const groups=[new THREE.Group(),new THREE.Group(),new THREE.Group()];
 for(let i=0;i<groups.length;i++){
  groups[i].userData.deckFireAnchors=Array.from({length:5},(_,j)=>({
   x:j*.5,y:.022,z:3+i,size:.21,phase:j/5
  }));
  scene.add(groups[i]);
 }
 try{
  assert.equal(fx.registerRiver(groups[0]),true);
  assert.equal(fx.registerRiver(groups[1]),true);
  assert.equal(fx.registerRiver(groups[2]),false,'hard river cap');
  fx.update(.016);
  assert.equal(fx.getStats().flames,4,'hard anchor cap');
  assert.equal(fx.getStats().drawCalls,1);
  scene.remove(groups[1]);
  fx.update(.016);
  assert.equal(fx.getStats().rivers,1,'orphan group automatically removed');
  assert.equal(fx.getStats().flames,2);
  fx.reset();
  assert.equal(fx.getStats().flames,0);
  assert.equal(fx.getStats().rivers,0);
  assert.equal(fx.getStats().drawCalls,0);
 }finally{fx.dispose();fx.dispose();}
 assert.equal(scene.children.some(c=>c.name==='KnottyPineLavaDeckFire'),false);
});

test('game owns deck-fire lifecycle and never restores old bank billboards',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const lava=readFileSync(new URL('../src/obstacles/LavaRiver.js',import.meta.url),'utf8');
 assert.ok(game.includes('createLavaDeckFire(scene)'));
 assert.ok(game.includes('lavaDeckFire.registerRiver(river.group)'));
 assert.ok(game.includes('lavaDeckFire.update(dt)'));
 assert.ok(game.includes('lavaDeckFire.reset()'));
 assert.ok(game.includes('lavaDeckFire.releaseOwner(obstacles[i].g)'));
 assert.ok(lava.includes('g.userData.deckFireAnchors.push'));
 assert.ok(!lava.includes('addLivingFlame'));
 assert.ok(!lava.includes('bankFlames'));
});
