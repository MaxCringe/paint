import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPowerLevitationPose} from '../src/player/PowerLevitationPose.js';

function skeleton(rotation=0){
 const facing=new THREE.Group();
 facing.rotation.y=rotation;
 const hips=new THREE.Bone();hips.name='mixamorig:Hips';hips.position.y=1;
 facing.add(hips);
 const bones=new Map([[hips.name,hips]]);
 for(const side of [-1,1]){
  const label=side<0?'Left':'Right';
  const add=(name,parent,x,y,z)=>{
   const bone=new THREE.Bone();bone.name='mixamorig:'+label+name;
   bone.position.set(x,y,z);parent.add(bone);bones.set(bone.name,bone);return bone;
  };
  const upper=add('Arm',hips,side*.34,.47,0);
  const lower=add('ForeArm',upper,0,-.37,0);
  const hand=add('Hand',lower,0,-.35,0);
  const thigh=add('UpLeg',hips,side*.19,-.07,0);
  const knee=add('Leg',thigh,side*.02,-.46,.18);
  const foot=add('Foot',knee,0,-.48,.20);
  // Bindpose upper and lower arms initially hang down, like the screenshot.
  assert.equal(upper.quaternion.w,1);
 }
 return {facing,bones};
}
function aligned(facing,bones,labelA,labelB,target,minDot=.985){
 const a=bones.get('mixamorig:'+labelA),b=bones.get('mixamorig:'+labelB);
 const start=a.getWorldPosition(new THREE.Vector3());
 const end=b.getWorldPosition(new THREE.Vector3());
 const dir=end.sub(start).normalize();
 const worldTarget=target.clone().applyQuaternion(facing.getWorldQuaternion(new THREE.Quaternion())).normalize();
 assert.ok(dir.dot(worldTarget)>minDot,labelA+' -> '+labelB+': '+dir.dot(worldTarget));
}

test('ultimate V reference lifts both elbows and wrists above shoulders on a down-arm rig',()=>{
 for(const rotation of [0,Math.PI]){
  const {facing,bones}=skeleton(rotation);
  const pose=createPowerLevitationPose(bones,facing);
  const original=bones.get('mixamorig:LeftArm').quaternion.clone();
  pose.apply(0);
  assert.ok(original.equals(bones.get('mixamorig:LeftArm').quaternion),'no pose outside flight');
  pose.apply(1);
  for(const [side,name] of [[-1,'Left'],[1,'Right']]){
   aligned(facing,bones,name+'Arm',name+'ForeArm',
    new THREE.Vector3(side*.75,.66,-.08));
   aligned(facing,bones,name+'ForeArm',name+'Hand',
    new THREE.Vector3(side*.85,.53,.02));
  }
 }
});

test('ultimate airborne legs hang straight, not in a running pose',()=>{
 const {facing,bones}=skeleton(Math.PI);
 createPowerLevitationPose(bones,facing).apply(1);
 for(const [side,name] of [[-1,'Left'],[1,'Right']]){
  aligned(facing,bones,name+'UpLeg',name+'Leg',new THREE.Vector3(side*.055,-1,-.025));
  aligned(facing,bones,name+'Leg',name+'Foot',new THREE.Vector3(side*.02,-1,0));
 }
});
