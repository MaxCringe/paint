import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {DEFAULT_HAT_DEV_PLACEMENT,HAT_DEV_CONTROLS,normalizeHatDevPlacement,applyHeadHatDevPlacement} from '../src/powerups/HatDevPlacement.js';
import {mountWearableHat} from '../src/powerups/WitchHat.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('seven hat controls have safe values; restores exact base attachment',()=>{
 assert.equal(HAT_DEV_CONTROLS.length,7);
 assert.deepEqual(normalizeHatDevPlacement({}),DEFAULT_HAT_DEV_PLACEMENT);
 assert.deepEqual(normalizeHatDevPlacement({x:0,y:0,z:0,rx:0,ry:0,rz:0,size:100}),DEFAULT_HAT_DEV_PLACEMENT);
 assert.equal(normalizeHatDevPlacement({size:999}).size,180);
 assert.equal(normalizeHatDevPlacement({x:-99}).x,-.8);
 assert.equal(normalizeHatDevPlacement({ry:'oops'}).ry,0);
 assert.equal(normalizeHatDevPlacement({y:.123}).y,.12);
});
test('hat placement follows the FBX head at different import scales',()=>{
 for(const scale of [.004,1,3]){
  const parent=new THREE.Group(),head=new THREE.Bone(),wearable=new THREE.Group(),torso=new THREE.Group();
  head.position.set(0,1.7,0);parent.scale.setScalar(scale);parent.add(head);
  mountWearableHat(wearable,torso,head);
  assert.ok(applyHeadHatDevPlacement(wearable,head,DEFAULT_HAT_DEV_PLACEMENT));
  const originalPos=wearable.position.clone(),originalScale=wearable.scale.clone();
  const v={x:.12,y:.23,z:-.17,rx:15,ry:25,rz:-11,size:123};
  assert.ok(applyHeadHatDevPlacement(wearable,head,v));
  assert.ok(Math.abs((wearable.position.x-originalPos.x)*scale-.12)<1e-6);
  assert.ok(Math.abs((wearable.position.y-originalPos.y)*scale-.23)<1e-6);
  assert.ok(Math.abs((wearable.position.z-originalPos.z)*scale+.17)<1e-6);
  assert.ok(Math.abs(wearable.scale.x/originalScale.x-1.23)<1e-6);
  assert.ok(Math.abs(wearable.rotation.x-THREE.MathUtils.degToRad(15))<1e-6);
  assert.ok(Math.abs(wearable.rotation.z-THREE.MathUtils.degToRad(-11))<1e-6);
  mountWearableHat(wearable,torso,null);
  assert.equal(applyHeadHatDevPlacement(wearable,head,v),false);
 }
});
test('temporary hat editor stays DEV only; magnet, pickups and classic hat remain unchanged',()=>{
 const g=read('src/game.js'),hat=read('src/powerups/WitchHat.js'),ui=read('src/ui/FionaHatEditor.js');
 assert.ok(g.includes("state='hat-edit'"));
 assert.ok(g.includes("state==='hat-edit'&&useTestFiona"));
 assert.ok(g.includes('hatEditor.setAvailable(false)'));
 assert.ok(g.includes('setWearableHatDevPreview(true)'));
 assert.ok(g.includes("magnetTime=10;"));
 assert.ok(hat.includes('torso.add(wearable)'));
 assert.ok(hat.includes('wearable.visible=active||devPreview'));
 assert.ok(hat.includes('mountWearableHat(wearable,torso,bone)'));
 assert.ok(ui.includes('navigator.clipboard.writeText(json)'));
 assert.ok(ui.includes('localStorage.setItem(STORAGE_KEY'));
 assert.ok(ui.includes('knotty-pine-worn-hat-placement'));
});
