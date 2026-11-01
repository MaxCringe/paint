import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {createCalibratedRunClip} from '../src/player/FionaCalibratedRun.js';

const asset=new URL('../public/models/fiona/animations/run-calibrated.json.gz',import.meta.url);
const data=JSON.parse(gunzipSync(readFileSync(asset)).toString('utf8'));
const radians=n=>n*Math.PI/180;
test('Python-calibrated run is reproducible source data for the correct FBX rig',()=>{
 assert.equal(data.schema,1);
 assert.equal(data.mode,'fiona-rig-local-quaternion-delta');
 assert.equal(data.sourceBlob,'3745db9b6eecde2fa2f865f61e3e85481f13e514');
 assert.equal(data.name,'runCalibrated');
 assert.equal(data.frames.length,25);
 assert.equal(data.duration,.70);
 const names=Object.keys(data.frames[0][1]);
 assert.ok(names.includes('LeftUpLeg'));
 assert.ok(names.includes('RightUpLeg'));
 for(const [,poses,lift] of data.frames){
  assert.ok(lift>=0&&lift<=1.26);
  for(const name of names){
   const q=poses[name];
   assert.equal(q.length,4,name);
   assert.ok(Math.abs(Math.hypot(...q)-1)<.00002,name);
  }
 }
 for(const name of names){
  assert.deepEqual(data.frames[0][1][name],data.frames.at(-1)[1][name],
   'first and last frames should loop seamlessly: '+name);
 }
});
test('calibrated run eliminates asymmetrical exported leg bind angles',()=>{
 // In this FBX exported Lcl Rotation is +39.5667 for left and -39.5667 for right.
 // The old additive clip cannot cancel those non-neutral start poses.
 const bones=new Map();
 for(const name of Object.keys(data.frames[0][1])){
  const bone=new THREE.Bone();bone.name=name;
  const base=name==='LeftUpLeg'?39.566755:name==='RightUpLeg'?-39.566755:0;
  bone.quaternion.setFromEuler(new THREE.Euler(radians(base),0,0));
  bones.set(name,bone);
 }
 bones.get('Hips').position.set(0,49.88,0);
 const clip=createCalibratedRunClip(bones,data);
 assert.equal(clip.name,'runCalibrated');
 assert.equal(clip.duration,.70);
 assert.equal(clip.tracks.length,19); // 18 bones + cosmetic local Hips bounce.
 for(const track of clip.tracks){
  assert.equal(track.times.length,25);
  assert.ok(track.times.every(Number.isFinite));
  assert.ok(track.values.every(Number.isFinite));
 }
 const left=clip.tracks.find(t=>t.name==='LeftUpLeg.quaternion');
 const right=clip.tracks.find(t=>t.name==='RightUpLeg.quaternion');
 assert.ok(left&&right);
 const qleft=new THREE.Quaternion().fromArray(left.values,0);
 const qright=new THREE.Quaternion().fromArray(right.values,0);
 const angleL=new THREE.Euler().setFromQuaternion(qleft).x;
 const angleR=new THREE.Euler().setFromQuaternion(qright).x;
 assert.ok(Math.abs(angleL-radians(-34))<.002,angleL);
 assert.ok(Math.abs(angleR-radians(34))<.002,angleR);
 // No full avatar scale, gameplay runner transform or baked root displacement.
 assert.ok(!clip.tracks.some(track=>track.name.includes('.scale')));
 assert.ok(clip.tracks.some(track=>track.name==='Hips.position'));
});
test('legacy Python run remains available for comparison',()=>{
 const old=JSON.parse(gunzipSync(readFileSync(new URL('../public/models/fiona/animations/motions.json.gz',import.meta.url))));
 assert.equal(Object.keys(old.motions).length,23);
 assert.equal(old.motions.run.f.length,9);
 assert.equal(old.motions.run.d,.74);
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(ui,/data-fiona-run-variant="calibrated"/);
 assert.match(ui,/data-fiona-run-variant="original"/);
});
