import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLavaForestInteraction,LAVA_FOREST_RULES} from '../src/systems/fire/LavaForestInteraction.js';

function pine(x,z,species='pine:taiga_spruce'){
 const p=new THREE.Group();p.position.set(x,0,z);p.scale.set(.6,.8,.6);
 p.userData.plantSpecies=species;return p;
}
function river(scene,z,offset=0){
 const group=new THREE.Group();group.position.z=z;scene.add(group);
 return {group,z,center:x=>.2*Math.sin(x*.45)+offset,
  halfWidth:x=>2.5+.15*Math.cos(x*.2)};
}
function stubFire(){
 const calls=[],releases=[];
 return {calls,releases,
  igniteNearRiver(plants,z,opts){calls.push({plants,z,opts});return 1},
  releaseOwner(owner){releases.push(owner)}
 };
}
test('procedural pines are moved onto solid banks before a lava river appears',()=>{
 const scene=new THREE.Scene(),fire=stubFire();
 const trees=[pine(-6,-50),pine(8,-50,'pine:dead_snag'),pine(15,-50)];
 const fern=pine(-6,-50,'fern:lush');
 const interaction=createLavaForestInteraction([...trees,fern],fire);
 const r=river(scene,-50);
 const fernZ=fern.position.z;
 interaction.registerRiver(r);
 for(const t of trees){
  const delta=Math.abs(t.position.z-r.group.position.z-r.center(t.position.x));
  assert.ok(delta>=r.halfWidth(t.position.x)+LAVA_FOREST_RULES.bankClearance,
   'a pine trunk cannot stand in or on the molten bank');
 }
 assert.equal(fern.position.z,fernZ,'no surprise shifts to other plant families');
 assert.equal(fire.calls.length,0,'lava far ahead should not ignite instantly');
 interaction.reset();
});
test('flames ignite ahead of the approach, not at river generation or contact',()=>{
 const scene=new THREE.Scene(),fire=stubFire();
 const plant=pine(-6,-60),r=river(scene,-60);
 const system=createLavaForestInteraction([plant],fire);
 system.registerRiver(r);
 system.update(2.3);
 assert.equal(fire.calls.length,0);
 r.group.position.z=2.3-LAVA_FOREST_RULES.ignitionLead-.1;
 plant.position.z+=r.group.position.z+60;
 system.update(2.3);
 assert.equal(fire.calls.length,0);
 r.group.position.z+=.2;plant.position.z+=.2;
 system.update(2.3);
 assert.equal(fire.calls.length,1);
 assert.equal(fire.calls[0].opts.owner,r.group);
 assert.ok(fire.calls[0].opts.reach>=4);
 system.update(2.3);
 assert.equal(fire.calls.length,1,'do not re-ignite every frame');
 system.releaseRiver(r.group);
 assert.deepEqual(fire.releases,[r.group]);
});
test('recycling and successive rivers maintain safe shore clearance',()=>{
 const scene=new THREE.Scene(),fire=stubFire();
 const plant=pine(6,-80),sys=createLavaForestInteraction([plant],fire);
 const first=river(scene,-80),second=river(scene,-95);
 sys.registerRiver(first);
 sys.registerRiver(second);
 // Simulates vegetation returning from behind the camera to another segment.
 for(let n=0;n<50;n++){
  plant.position.z=-95+(n%5)*.32;
  sys.onPlantRecycle(plant);
  for(const r of [first,second]){
   const delta=Math.abs(plant.position.z-r.group.position.z-r.center(plant.position.x));
   assert.ok(delta>=r.halfWidth(plant.position.x)+LAVA_FOREST_RULES.bankClearance-.01);
  }
 }
 scene.remove(first.group);
 sys.update(2.3);
 assert.equal(sys.getStats().rivers,1,'old rivers are dropped when removed');
 sys.reset();assert.equal(sys.getStats().rivers,0);
});
