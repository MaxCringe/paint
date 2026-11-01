import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mountWearableHat} from '../src/powerups/WitchHat.js';

test('worn hat stays full-size on a uniformly scaled FBX skeleton',()=>{
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
 for(const dimension of ['x','y','z'])assert.ok(Math.abs(scale[dimension]-.66)<1e-6,dimension);
 assert.ok(Math.abs(actual.y-origin.y-.18)<1e-6);
 mountWearableHat(hat,torso);
 assert.equal(hat.parent,torso);
 assert.equal(hat.scale.x,.66);
 assert.equal(hat.position.y,1.46);
});
