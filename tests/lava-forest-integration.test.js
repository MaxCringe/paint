import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLavaRiverFactory} from '../src/obstacles/LavaRiver.js';
import {createForestGenerator} from '../src/world/forest/ForestGenerator.js';
import {createForestFireStudio} from '../src/systems/fire/ForestFireStudio.js';
import {createLavaForestInteraction} from '../src/systems/fire/LavaForestInteraction.js';

// The lava factory creates two procedural CanvasTexture objects. Geometry and
// collision integration can be tested in Node without a WebGL/DOM renderer.
function mockCanvasDocument(){
 const noop=()=>{};
 const gradient={addColorStop:noop};
 return {
  createElement(tag){
   assert.equal(tag,'canvas');
   const context={
    beginPath:noop,moveTo:noop,bezierCurveTo:noop,stroke:noop,
    closePath:noop,fill:noop,fillRect:noop,
    createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,
    getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:noop
   };
   return {width:0,height:0,getContext:()=>context};
  }
 };
}

test('a real lava river constructs safely with instanced pine, fern and grass proxies',()=>{
 const originalDocument=globalThis.document;
 globalThis.document=mockCanvasDocument();
 const scene=new THREE.Scene();
 const obstacles=[];
 const forest=createForestGenerator(scene,{seed:2026});
 try{
  const pine=forest.plant('pine',-7,-55,1,180,'pine:grove_cluster');
  const fern=forest.plant('fern',-6.6,-55,1,180,'fern:lush');
  const grass=forest.plant('grass',6.4,-55,1,180,'grass:forest');
  forest.finish();
  // This is the important regression: children in the new procedural forest
  // are transform proxies, so they deliberately have NO .geometry attribute.
  assert.equal(fern.children[0].geometry,undefined);
  assert.equal(grass.children[0].geometry,undefined);
  assert.equal(pine.userData.plantSpecies,'pine:grove_cluster');
  const makeLavaRiver=createLavaRiverFactory(scene,obstacles);
  assert.doesNotThrow(()=>makeLavaRiver(-55),
   'the first lava crossing must not crash the animation frame');
  assert.equal(obstacles.length,1);
  assert.equal(obstacles[0].type,'lava');
  assert.equal(obstacles[0].g.userData.halfDepth,2.95);
  assert.ok(obstacles[0].g.userData.bankFlames,'real river fire meshes were built');
  assert.ok(obstacles[0].g.children.length>4,'the river has actual 3D geometry');
  assert.doesNotThrow(()=>makeLavaRiver(-77),
   'later lava crossings must remain compatible with the same forest');
  assert.equal(obstacles.length,2);
 }finally{
  for(const o of obstacles){
   scene.remove(o.g);
   o.g.userData.dispose?.();
  }
  forest.dispose();
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
 }
});

test('lava retains soft shoreline fire and ignites safely placed pines before Fiona arrives',()=>{
 const originalDocument=globalThis.document;
 globalThis.document=mockCanvasDocument();
 const scene=new THREE.Scene(),obstacles=[],forest=createForestGenerator(scene,{seed:644});
 const fire=createForestFireStudio(scene,{quality:'low',maxTrees:3,seed:42});
 const interaction=createLavaForestInteraction(forest.plants,fire);
 try{
  const pine=forest.plant('pine',-6,-54,1,190,'pine:taiga_spruce');
  forest.plant('fern',-6,-54,1,190,'fern:lush');
  forest.plant('grass',6.1,-54,1,190,'grass:forest');
  forest.finish();
  let callbackCount=0;
  const makeRiver=createLavaRiverFactory(scene,obstacles,{
   onTreeFire:details=>{callbackCount++;interaction.registerRiver(details)}
  });
  assert.doesNotThrow(()=>makeRiver(-54));
  assert.equal(callbackCount,1);
  assert.equal(obstacles.length,1);
  assert.equal(fire.getStats().activeTrees,0,
   'trees are not burning from the instant a distant river is created');
  const g=obstacles[0].g;
  assert.ok(Math.abs(pine.position.z-g.position.z)>g.userData.halfDepth,
   'pine has been relocated outside lava before render');
  assert.ok(g.userData.bankFlames,'smooth bank fire retained');
  assert.ok(g.userData.bankFlames.isInstancedMesh,
   'soft crossed cards replace old low-poly triangle banks');
  assert.equal(g.userData.bankFlames.count%2,0);
  // The first river reaches the approach zone, long before it hits Fiona.
  const travel=17;g.position.z+=travel;pine.position.z+=travel;
  interaction.update(2.3);
  assert.equal(fire.getStats().activeTrees,1);
  fire.update(.2);
  assert.ok(fire.getStats().flames>0);
  assert.equal(g.userData.treeSparkSources.length>0,true,
   'small charred decorative props retain sparks');
  scene.remove(g);
  interaction.update(2.3);fire.update(.1);
  assert.equal(fire.getStats().activeTrees,0);
 }finally{
  for(const o of obstacles){scene.remove(o.g);o.g.userData.dispose?.()}
  interaction.reset();fire.dispose();forest.dispose();
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
 }
});
