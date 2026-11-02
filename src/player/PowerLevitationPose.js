import * as THREE from 'three';

// Approved Fiona ultimate silhouette, copied exactly from the player's
// temporary DEV workshop export (2026-11-02). Keep the rig-calibrated aiming,
// not FBX Euler guesses: left/right arms and legs use these same directions.
export const ULTIMATE_POSE=Object.freeze({
 leftUpper:0,rightUpper:0,leftLower:44,rightLower:45,
 leftForward:35,rightForward:35,leftLeg:0,rightLeg:0,chest:-18
});
const clamp01=x=>Math.max(0,Math.min(1,x));
const canonical=name=>String(name).split('|').at(-1).split(':').at(-1).replace(/^mixamorig/i,'').toLowerCase();
const rad=THREE.MathUtils.degToRad;
export function createPowerLevitationPose(bones,facing){
 const named=new Map([...bones.values()].map(bone=>[canonical(bone.name),bone]));
 const hips=named.get('hips'),spine=named.get('spine1')||named.get('spine');
 const arms=[
  {upper:named.get('leftarm'),lower:named.get('leftforearm'),hand:named.get('lefthand'),fallback:-1,label:'left'},
  {upper:named.get('rightarm'),lower:named.get('rightforearm'),hand:named.get('righthand'),fallback:1,label:'right'}
 ];
 const legs=[
  {upper:named.get('leftupleg'),lower:named.get('leftleg'),foot:named.get('leftfoot'),fallback:-1,label:'left'},
  {upper:named.get('rightupleg'),lower:named.get('rightleg'),foot:named.get('rightfoot'),fallback:1,label:'right'}
 ];
 const a=new THREE.Vector3(),b=new THREE.Vector3(),current=new THREE.Vector3(),desired=new THREE.Vector3(),p=new THREE.Vector3();
 const facingQuaternion=new THREE.Quaternion(),parentQuaternion=new THREE.Quaternion();
 const delta=new THREE.Quaternion(),localDelta=new THREE.Quaternion(),goal=new THREE.Quaternion(),target=new THREE.Vector3();
 const settings=ULTIMATE_POSE;
 const centerX=hips?facing.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).x:0;
 function sideOf(bone,fallback){
  if(!bone)return fallback;
  bone.getWorldPosition(p);facing.worldToLocal(p);
  return Math.abs(p.x-centerX)>.035?Math.sign(p.x-centerX):fallback;
 }
 for(const arm of arms)arm.side=sideOf(arm.upper,arm.fallback);
 for(const leg of legs)leg.side=sideOf(leg.upper,leg.fallback);
 function aim(bone,endpoint,x,y,z,weight){
  if(!bone||!endpoint||!bone.parent)return;
  bone.getWorldPosition(a);endpoint.getWorldPosition(b);
  current.subVectors(b,a);
  if(current.lengthSq()<1e-9)return;
  target.set(x,y,z).normalize();
  desired.copy(target).applyQuaternion(facingQuaternion).normalize();
  delta.setFromUnitVectors(current.normalize(),desired);
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
  if(spine&&settings.chest){
   spine.rotateX(rad(settings.chest)*weight);spine.updateMatrixWorld(true);
  }
  for(const arm of arms){
   const side=arm.side,name=arm.label;
   const upper=rad(settings[name+'Upper']),lower=rad(settings[name+'Lower']);
   const depth=Math.sin(rad(settings[name+'Forward']));
   aim(arm.upper,arm.lower,side*Math.cos(upper),Math.sin(upper),depth,weight);
   aim(arm.lower,arm.hand,side*Math.cos(lower),Math.sin(lower),depth*.35,weight);
  }
  for(const leg of legs){
   const angle=rad(settings[leg.label+'Leg']);
   aim(leg.upper,leg.lower,leg.side*Math.sin(angle),-Math.cos(angle),-.025,weight);
   aim(leg.lower,leg.foot,leg.side*.02,-1,0,weight);
  }
 }
 return {apply};
}
