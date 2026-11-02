import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from 'three';
import {mountWearableHat} from '../src/powerups/WitchHat.js';
import {APPROVED_WORN_HAT_PLACEMENT,applyApprovedWornHatPlacement} from '../src/powerups/WornHatPlacement.js';

const original={x:-.01,y:.08,z:-.09,rx:-3,ry:-180,rz:4,size:90};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('the exact approved fitting values are baked into 3D Fiona hat',()=>{
 assert.deepEqual(APPROVED_WORN_HAT_PLACEMENT,original);
 assert.equal(Object.keys(APPROVED_WORN_HAT_PLACEMENT).length,7);
});

test('hat position, 180-degree yaw, roll, pitch and 90% size survive any FBX bone scale',()=>{
 for(const scale of [.003,1,3.5]){
  const parent=new THREE.Group(),head=new THREE.Bone(),torso=new THREE.Group(),hat=new THREE.Group();
  head.name='mixamorig:Head';head.position.set(0,1.6,0);
  parent.scale.setScalar(scale);parent.add(head);
  mountWearableHat(hat,torso,head);
  assert.equal(hat.parent,head);
  const world=head.getWorldScale(new THREE.Vector3());
  assert.ok(Math.abs(hat.position.x*world.x-original.x)<1e-8);
  assert.ok(Math.abs(hat.position.y*world.y-(.18+original.y))<1e-8);
  assert.ok(Math.abs(hat.position.z*world.z-original.z)<1e-8);
  assert.ok(Math.abs(hat.scale.x*world.x-.66*.90)<1e-8);
  assert.ok(Math.abs(hat.rotation.x-THREE.MathUtils.degToRad(-3))<1e-8);
  assert.ok(Math.abs(hat.rotation.y-THREE.MathUtils.degToRad(-180))<1e-8);
  assert.ok(Math.abs(hat.rotation.z-THREE.MathUtils.degToRad(4))<1e-8);
  assert.equal(applyApprovedWornHatPlacement(hat,head),true);
  mountWearableHat(hat,torso);
  assert.equal(hat.parent,torso);
  assert.deepEqual(hat.position.toArray(),[0,1.46,0]);
  assert.deepEqual(hat.scale.toArray(),[.66,.66,.66]);
  assert.deepEqual(hat.rotation.toArray().slice(0,3),[0,0,0]);
  assert.equal(applyApprovedWornHatPlacement(hat,head),false);
 }
});

test('worn hat pickup retains magnet and animation; editor and orbit camera are removed',()=>{
 const hat=read('src/powerups/WitchHat.js'),game=read('src/game.js');
 assert.ok(hat.includes("const baseRoll=activeHeadBone?THREE.MathUtils.degToRad(APPROVED_WORN_HAT_PLACEMENT.rz):0"));
 assert.ok(hat.includes('wearable.visible=active;'));
 assert.ok(hat.includes('hats.push({g,visual,glow,lane,z,phase:'));
 assert.ok(game.includes('magnetTime=10;'));
 assert.ok(game.includes('attachWearableToHead(testAvatar.headBone)'));
 assert.ok(!game.includes("state==='hat-edit'"));
 assert.ok(!hat.includes('setWearableHatDevPreview'));
 for(const file of ['src/ui/FionaHatEditor.js','src/ui/HatOrbitCamera.js',
   'src/styles/hat-dev-editor.css','src/powerups/HatDevPlacement.js',
   'tests/hat-dev-editor.test.js','tests/hat-orbit-camera.test.js',
   'tests/browser/hat-dev-editor.spec.js']){
  assert.equal(existsSync(new URL('../'+file,import.meta.url)),false,file);
 }
});
