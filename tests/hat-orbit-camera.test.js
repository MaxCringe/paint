import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_HAT_CAMERA,HAT_CAMERA_LIMITS,normalizeHatCamera,
 orbitHatCameraPosition,createHatOrbitCamera} from '../src/ui/HatOrbitCamera.js';

test('hat camera can look around the full character and over the brim',()=>{
 const target=new THREE.Vector3(1,2.5,3);
 const a=orbitHatCameraPosition(target,{angle:0,pitch:0,distance:4});
 const b=orbitHatCameraPosition(target,{angle:180,pitch:0,distance:4});
 const above=orbitHatCameraPosition(target,{angle:0,pitch:75,distance:4});
 assert.ok(a.z>target.z+3.9);
 assert.ok(b.z<target.z-3.9);
 assert.ok(above.y>target.y+3.8);
 assert.equal(a.distanceTo(target),4);
 assert.equal(b.distanceTo(target),4);
 assert.ok(above.distanceTo(target)>3.99);
 assert.equal(normalizeHatCamera({angle:450}).angle,90);
 assert.equal(normalizeHatCamera({angle:-90}).angle,270);
 assert.equal(normalizeHatCamera({pitch:500}).pitch,HAT_CAMERA_LIMITS.pitchMax);
 assert.equal(normalizeHatCamera({distance:-1}).distance,HAT_CAMERA_LIMITS.zoomMin);
});

test('inspector camera restores normal gameplay camera and ignores input when closed',()=>{
 const camera=new THREE.PerspectiveCamera();
 camera.position.set(1,5,10.5);camera.lookAt(0,1,-5);
 const originalPosition=camera.position.clone(),originalRotation=camera.quaternion.clone();
 const canvas=new EventTarget();
 const classes=new Set();
 canvas.classList={add:value=>classes.add(value),remove:value=>classes.delete(value)};
 canvas.setPointerCapture=()=>{};
 canvas.releasePointerCapture=()=>{};
 canvas.hasPointerCapture=()=>false;
 const seen=[];
 const orbit=createHatOrbitCamera(camera,canvas,{onChange:value=>seen.push(value)});
 orbit.begin();
 assert.deepEqual(orbit.get(),DEFAULT_HAT_CAMERA);
 assert.ok(classes.has('hat-orbit-active'));
 const target=new THREE.Vector3(0,2.6,2.3);
 orbit.update(target);
 assert.ok(camera.position.distanceTo(originalPosition)>1);
 orbit.set({angle:180,pitch:60,distance:2});
 orbit.update(target);
 assert.ok(camera.position.z<target.z);
 assert.ok(camera.position.y>target.y+1);
 const event=(type,props)=>{
  const e=new Event(type,{cancelable:true});
  Object.assign(e,props);
  canvas.dispatchEvent(e);
 };
 event('pointerdown',{pointerId:1,clientX:200,clientY:200,button:0});
 event('pointermove',{pointerId:1,clientX:300,clientY:120});
 assert.notEqual(orbit.get().angle,180);
 event('pointerup',{pointerId:1,clientX:300,clientY:120});
 const prevDist=orbit.get().distance;
 event('wheel',{deltaY:200});
 assert.ok(orbit.get().distance>prevDist);
 orbit.end();
 assert.ok(!classes.has('hat-orbit-active'));
 assert.equal(orbit.active,false);
 assert.ok(camera.position.distanceTo(originalPosition)<1e-9);
 assert.ok(camera.quaternion.angleTo(originalRotation)<1e-9);
 const old=orbit.get();
 event('wheel',{deltaY:-200});
 assert.deepEqual(orbit.get(),old);
 assert.ok(seen.length>=4);
 orbit.destroy();
});
