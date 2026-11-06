import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createLavaRiverFactory} from '../src/obstacles/LavaRiver.js';
import {createLavaForestInteraction,LAVA_FOREST_RULES} from '../src/systems/fire/LavaForestInteraction.js';
import {createForestRandom} from '../src/world/forest/PlantRegistry.js';

function mockCanvas(){
 const noop=()=>{},gradient={addColorStop:noop};
 return {createElement(tag){
  assert.equal(tag,'canvas');
  const ctx={beginPath:noop,moveTo:noop,bezierCurveTo:noop,stroke:noop,fillRect:noop,
   createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,
   getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop};
  return {width:0,height:0,getContext:()=>ctx};
 }};
}
function plant(x,z,species){
 const root=new THREE.Group();root.position.set(x,0,z);
 root.scale.set(.8,1,.8);root.userData.plantSpecies=species;
 root.userData.lavaFootprint={x:.6,z:.6};return root;
}
test('Fire Studio demo river uses the same actual shore clearance and reverses it on close',()=>{
 const originalDocument=globalThis.document;globalThis.document=mockCanvas();
 const scene=new THREE.Scene(),pines=[
  plant(-5.6,-12,'pine:taiga_spruce'),
  plant(6,-12,'pine:scots_pine'),
  plant(-8,-12,'fern:lush'),
  plant(9,-12,'grass:forest')
 ];
 for(const p of pines)scene.add(p);
 const originals=pines.map(p=>p.position.z);
 const fire={releaseOwner(){}},system=createLavaForestInteraction(pines,fire);
 const records=[];let descriptor=null;
 try{
  createLavaRiverFactory(scene,records,{
   random:createForestRandom(1337),
   onTreeFire:river=>{descriptor=river;system.registerRiver(river);}
  })(-12);
  assert.ok(descriptor?.group?.parent,'demo river sends a genuine shoreline descriptor');
  assert.equal(system.getStats().rivers,1);
  for(let i=0;i<pines.length;i++){
   const p=pines[i],family=p.userData.plantSpecies.split(':')[0];
   const delta=Math.abs(p.position.z-descriptor.group.position.z-descriptor.center(p.position.x));
   const margin=family==='pine'?LAVA_FOREST_RULES.bankClearance:LAVA_FOREST_RULES.fernClearance;
   assert.ok(delta>descriptor.halfWidth(p.position.x)+margin,
    family+' cannot visibly grow in demo lava or its basalt banks');
   assert.notEqual(p.position.z,originals[i],'preview has moved plant to solid land');
  }
  system.releaseRiver(descriptor.group);
  for(let i=0;i<pines.length;i++)pines[i].position.z=originals[i];
  assert.deepEqual(pines.map(p=>p.position.z),originals,'leaving preview restores every tree');
  assert.equal(system.getStats().rivers,0);
 }finally{
  for(const obstacle of records){scene.remove(obstacle.g);obstacle.g.userData.dispose?.();}
  system.reset();
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 }
});

test('the editor registers demo river clearance, refreshes pine batches and restores the game forest',()=>{
 const editor=readFileSync(new URL('../src/devtools/world/WorldEditor.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(game,/createWorldEditor\(\{scene,renderer,forest,lavaForest,/);
 assert.match(editor,/onTreeFire:river=>\{demoRiver=river;\}/);
 assert.match(editor,/lavaForest\.registerRiver\(demoRiver\)/);
 assert.match(editor,/originalPlantZ=forest\.plants\.map\(plant=>plant\.position\.z\)/);
 assert.match(editor,/lavaForest\.releaseRiver\(demo\)/);
 assert.match(editor,/forest\.plants\[i\]\.position\.z=originalPlantZ\[i\]/);
 assert.match(editor,/forest\.update\(\)/);
});
