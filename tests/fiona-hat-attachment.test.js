import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mountWearableHat} from '../src/powerups/WitchHat.js';
import {APPROVED_WORN_HAT_PLACEMENT} from '../src/powerups/WornHatPlacement.js';

test('approved 90%-size worn hat preserves calibrated transform on FBX skeleton',()=>{
 const root=new THREE.Group();root.scale.setScalar(.015);
 const head=new THREE.Bone();head.position.set(0,150,0);root.add(head);
 const torso=new THREE.Group(),hat=new THREE.Group();
 root.updateMatrixWorld(true);
 mountWearableHat(hat,torso,head);
 root.updateMatrixWorld(true);
 const scale=hat.getWorldScale(new THREE.Vector3());
 const origin=head.getWorldPosition(new THREE.Vector3());
 const actual=hat.getWorldPosition(new THREE.Vector3());
 assert.equal(hat.parent,head);
 for(const dimension of ['x','y','z'])assert.ok(Math.abs(scale[dimension]-.66*.90)<1e-6,dimension);
 assert.ok(Math.abs(actual.y-origin.y-(.18+APPROVED_WORN_HAT_PLACEMENT.y))<1e-6);
 assert.ok(Math.abs(actual.x-origin.x-APPROVED_WORN_HAT_PLACEMENT.x)<1e-6);
 assert.ok(Math.abs(actual.z-origin.z-APPROVED_WORN_HAT_PLACEMENT.z)<1e-6);
 mountWearableHat(hat,torso);
 assert.equal(hat.parent,torso);
 assert.equal(hat.scale.x,.66);
 assert.equal(hat.position.y,1.46);
});
