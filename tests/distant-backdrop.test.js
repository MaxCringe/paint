import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDistantBackdrop,backdropSkyPoint} from '../src/world/DistantBackdrop.js';

function camera(){
 const c=new THREE.PerspectiveCamera(62,16/9,.1,500);
 c.position.set(0,5.3,10.5);c.lookAt(0,2,-20);c.updateMatrixWorld();
 return c;
}
test('the entire skyline is beyond the ground while its run framing is preserved',()=>{
 const c=camera(),backdrop=createDistantBackdrop(c.position);
 backdrop.updateWorldMatrix(true,false);
 for(const point of [new THREE.Vector3(30,23,-73),new THREE.Vector3(-45,14,-91),new THREE.Vector3(108,-1,-77)]){
  const moved=backdrop.localToWorld(point.clone());
  assert.ok(moved.z < -175);
  const before=point.clone().project(c),after=moved.clone().project(c);
  assert.ok(Math.abs(before.x-after.x)<1e-10);
  assert.ok(Math.abs(before.y-after.y)<1e-10);
  assert.ok(after.z<1,'skyline must not be clipped');
 }
});
test('meteor screen positions stay correct behind the mountains for different views',()=>{
 const c=camera(),backdrop=createDistantBackdrop(c.position);
 for(const aspect of [16/9,9/16]){
  c.aspect=aspect;c.updateProjectionMatrix();
  for(const depth of [-98,-110,-125]){
   for(const [x,y] of [[-1.2,.8],[1.2,.7],[.3,.12]]){
    const local=backdropSkyPoint(backdrop,c,x,y,depth);
    assert.ok(Math.abs(local.z-depth)<1e-9);
    const world=backdrop.localToWorld(local.clone());
    assert.ok(world.z < -294,'meteors stay behind the farthest ridge');
    const screen=world.project(c);
    assert.ok(Math.abs(screen.x-x)<1e-9);
    assert.ok(Math.abs(screen.y-y)<1e-9);
    assert.ok(screen.z<1);
   }
  }
 }
});
