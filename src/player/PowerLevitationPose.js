import * as THREE from 'three';

// A model-space, bone-calibrated pose for the actual skinned Fiona.
// Euler offsets in the old Python clip depended on the source FBX bind pose:
// in the shipped rig the arms stayed hanging at the sides. We instead steer
// upper arms, forearms and legs toward the reference silhouette in world space.
// Only called while Fiona is transitioning into, holding or leaving her ultimate.
const clamp01=x=>Math.max(0,Math.min(1,x));
const canonical=name=>String(name).split('|').at(-1).split(':').at(-1)
 .replace(/^mixamorig/i,'').toLowerCase();

export function createPowerLevitationPose(bones,facing){
 const named=new Map([...bones.values()].map(bone=>[canonical(bone.name),bone]));
 const hips=named.get('hips');
 const joints=[
  {upper:named.get('leftarm'),lower:named.get('leftforearm'),
   hand:named.get('lefthand'),fallback:-1},
  {upper:named.get('rightarm'),lower:named.get('rightforearm'),
   hand:named.get('righthand'),fallback:1}
 ];
 const legs=[
  {upper:named.get('leftupleg'),lower:named.get('leftleg'),
   foot:named.get('leftfoot'),fallback:-1},
  {upper:named.get('rightupleg'),lower:named.get('rightleg'),
   foot:named.get('rightfoot'),fallback:1}
 ];
 const a=new THREE.Vector3(),b=new THREE.Vector3();
 const current=new THREE.Vector3(),desired=new THREE.Vector3();
 const facingQuaternion=new THREE.Quaternion(),parentQuaternion=new THREE.Quaternion();
 const delta=new THREE.Quaternion(),localDelta=new THREE.Quaternion(),goal=new THREE.Quaternion();
 const target=new THREE.Vector3(),p=new THREE.Vector3();
 function sideOf(bone,fallback){
  if(!bone)return fallback;
  bone.getWorldPosition(p);
  facing.worldToLocal(p);
  const x=p.x-centerX;
  return Math.abs(x)>.035?Math.sign(x):fallback;
 }
 const centerX=hips?facing.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).x:0;
 for(const arm of joints)arm.side=sideOf(arm.upper,arm.fallback);
 for(const leg of legs)leg.side=sideOf(leg.upper,leg.fallback);

 function aim(bone,endpoint,x,y,z,weight){
  if(!bone||!endpoint||!bone.parent)return;
  bone.getWorldPosition(a);
  endpoint.getWorldPosition(b);
  current.subVectors(b,a);
  if(current.lengthSq()<1e-9)return;
  current.normalize();
  target.set(x,y,z).normalize();
  desired.copy(target).applyQuaternion(facingQuaternion).normalize();
  delta.setFromUnitVectors(current,desired);
  bone.parent.getWorldQuaternion(parentQuaternion);
  localDelta.copy(parentQuaternion).invert().multiply(delta).multiply(parentQuaternion);
  goal.copy(bone.quaternion).premultiply(localDelta).normalize();
  bone.quaternion.slerp(goal,weight);
  bone.updateMatrixWorld(true);
 }

 function apply(lift=0){
  const weight=clamp01(lift*1.40);
  if(weight<=0)return;
  facing.getWorldQuaternion(facingQuaternion);
  for(const arm of joints){
   const s=arm.side;
   // Like the hand-drawn V: elbows HIGH and OUTSIDE the shoulders,
   // forearms extend even further outward; only a gentle elbow bend.
   aim(arm.upper,arm.lower,s*.75,.66,-.08,weight);
   aim(arm.lower,arm.hand,s*.85,.53,.02,weight);
  }
  for(const leg of legs){
   const s=leg.side;
   // Straight hanging legs; no airborne running or bicycle-knee pose.
   aim(leg.upper,leg.lower,s*.055,-1,-.025,weight);
   aim(leg.lower,leg.foot,s*.02,-1,0,weight);
  }
 }
 return {apply};
}
