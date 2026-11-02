import * as THREE from 'three';

// DEV-only adjustable directions on the skinned FBX rig; default parameters
// reproduce the currently approved V-shaped levitation pose.
export const POWER_POSE_CONTROLS=Object.freeze([
 {key:'leftUpper',label:'Левое плечо · вверх',min:0,max:85},
 {key:'rightUpper',label:'Правое плечо · вверх',min:0,max:85},
 {key:'leftLower',label:'Левое предплечье · вверх',min:0,max:85},
 {key:'rightLower',label:'Правое предплечье · вверх',min:0,max:85},
 {key:'leftForward',label:'Левая рука · вперёд / назад',min:-35,max:35},
 {key:'rightForward',label:'Правая рука · вперёд / назад',min:-35,max:35},
 {key:'leftLeg',label:'Левая нога · в сторону',min:0,max:20},
 {key:'rightLeg',label:'Правая нога · в сторону',min:0,max:20},
 {key:'chest',label:'Наклон корпуса',min:-18,max:18}
]);
export const DEFAULT_POWER_POSE=Object.freeze({
 leftUpper:42,rightUpper:42,leftLower:32,rightLower:32,
 leftForward:-6,rightForward:-6,leftLeg:3,rightLeg:3,chest:0
});
export function normalizePowerPose(values={}){
 const result={};
 for(const c of POWER_POSE_CONTROLS){
  const input=values?.[c.key],num=typeof input==='number'||typeof input==='string'&&input.trim()!==''?Number(input):NaN;
  result[c.key]=Number.isFinite(num)?Math.round(Math.max(c.min,Math.min(c.max,num))):DEFAULT_POWER_POSE[c.key];
 }
 return result;
}
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
 let settings={...DEFAULT_POWER_POSE};
 function getSettings(){return {...settings};}
 function setSettings(values){settings=normalizePowerPose({...settings,...values});return getSettings();}
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
 return {apply,getSettings,setSettings};
}
