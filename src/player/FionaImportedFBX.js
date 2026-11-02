import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// User-approved FBX assets for the production Fiona.
// Flying.fbx was rejected and removed; flight uses the Python fallback.
export const FIONA_FBX_FILES=Object.freeze([
 {id:'run',file:'Fast Run.fbx',action:'runFBX'},
 {id:'jump',file:'Running Jump.fbx',action:'jumpFBX'},
 {id:'slip',file:'Edge Slip.fbx',action:'slipFBX'},
 {id:'slide',file:'Running Slide (1).fbx',action:'slideFBX'}
]);
const URL='/models/fiona/animations/fbx/';
const MIN_MAJOR_JOINTS=4;
const important=new Set(['hips','spine','leftupleg','rightupleg','leftleg','rightleg','leftarm','rightarm']);

// Three.js FBX paths can contain Mixamo prefixes and FBX namespaces.
export function fionaBoneKey(name){
 return String(name).split('|').at(-1).split(':').at(-1)
   .replace(/^mixamorig/i,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
}
function trackParts(trackName){
 const dot=trackName.lastIndexOf('.');
 if(dot<0)return null;
 return {node:trackName.slice(0,dot),property:trackName.slice(dot+1)};
}
function validatedSourceBones(scene){
 const map=new Map();
 scene.traverse(node=>{
  if(node.isBone)map.set(fionaBoneKey(node.name),node);
 });
 return map;
}
function disposeForeignModel(model){
 model.traverse(node=>{
  node.geometry?.dispose?.();
  for(const material of (Array.isArray(node.material)?node.material:[node.material])){
   if(!material)continue;
   for(const field of Object.values(material))if(field?.isTexture)field.dispose();
   material.dispose?.();
  }
 });
}

// Convert source bone rotations into DELTAS from each source FBX bind pose.
// This permits correct playback even when the source FBX has a different
// rest rotation, without ever copying mesh/root translation or scale.
export function retargetFionaFBXClip(sourceClip,sourceBones,targetBones,name){
 if(!sourceClip?.tracks?.length||!(sourceClip.duration>0))
  throw new Error('В FBX нет корректной анимации: '+name);
 const targetByKey=new Map([...targetBones].map(([boneName,bone])=>[fionaBoneKey(boneName),bone]));
 const seen=new Set(),tracks=[],matched=[];
 for(const track of sourceClip.tracks){
  const p=trackParts(track.name);
  if(!p||p.property!=='quaternion')continue;
  const key=fionaBoneKey(p.node);
  const target=targetByKey.get(key);
  if(!target||seen.has(key))continue;
  const source=sourceBones.get(key);
  // Reject blind retargeting when a source skeleton cannot be calibrated.
  if(!source)continue;
  const times=Array.from(track.times);
  if(!times.length||times.some((v,i)=>!Number.isFinite(v)||(i>0&&v<=times[i-1])))
   continue;
  const values=Array.from(track.values);
  if(values.length!==4*times.length||values.some(v=>!Number.isFinite(v)))continue;
  const sourceRestInverse=source.quaternion.clone().invert();
  const targetRest=target.quaternion.clone();
  const output=[];
  const delta=new THREE.Quaternion(),posed=new THREE.Quaternion();
  let invalid=false;
  for(let i=0;i<times.length;i++){
   posed.fromArray(values,4*i);
   if(posed.lengthSq()<.1){invalid=true;break;}
   delta.copy(sourceRestInverse).multiply(posed.normalize());
   const q=targetRest.clone().multiply(delta).normalize();
   output.push(q.x,q.y,q.z,q.w);
  }
  if(invalid)continue;
  tracks.push(new THREE.QuaternionKeyframeTrack(target.name+'.quaternion',times,output));
  seen.add(key);matched.push(key);
 }
 const mainJointCount=matched.filter(x=>important.has(x)).length;
 if(mainJointCount<MIN_MAJOR_JOINTS||tracks.length<6)
  throw new Error(name+': скелеты несовместимы ('+matched.length+' совпавших костей; '+mainJointCount+' основных). '
   +'Пример дорожек: '+sourceClip.tracks.slice(0,4).map(t=>t.name).join(', '));
 const duration=Math.max(sourceClip.duration,...tracks.map(t=>t.times[t.times.length-1]));
 return {clip:new THREE.AnimationClip(name,duration,tracks),boneCount:tracks.length,mainJointCount};
}
export async function loadFionaFBXClips(targetBones){
 const loader=new FBXLoader();
 const results=await Promise.allSettled(FIONA_FBX_FILES.map(async asset=>{
  const url=URL+encodeURIComponent(asset.file);
  const response=await fetch(url);
  if(!response.ok)throw new Error(asset.file+': HTTP '+response.status);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<2000)throw new Error(asset.file+': слишком маленький файл');
  let model;
  try{
   model=loader.parse(bytes,URL);
   const sourceBones=validatedSourceBones(model);
   const allClips=(model.animations||[]).filter(c=>c.tracks?.some(t=>t.name.endsWith('.quaternion')));
   // Uploaded FBXs contain original Walk/Run/Idle as well as the new Mixamo take.
   const title=asset.file.replace(/\.fbx$/i,'').toLowerCase();
   const sourceClip=allClips.find(c=>c.name.toLowerCase()===title)
    ||allClips.find(c=>/^mixamo\.com$/i.test(c.name))
    ||allClips.find(c=>c.name.toLowerCase().includes(title)&&c.duration>.1)
    ||allClips.find(c=>c.tracks.length>=6&&c.duration>.3&&
      !['walk','run','wave','bind','idle'].includes(c.name.toLowerCase()));
   if(!sourceClip)throw new Error(asset.file+': нет скелетных дорожек вращения');
   const result=retargetFionaFBXClip(sourceClip,sourceBones,targetBones,asset.action);
   return {...asset,...result,originalDuration:sourceClip.duration,
    sourceClip:sourceClip.name,
    allClips:allClips.map(c=>({name:c.name,duration:+c.duration.toFixed(3),tracks:c.tracks.length}))};
  }finally{
   if(model)disposeForeignModel(model);
  }
 }));
 const clips=new Map(),reports=[],errors=[];
 for(let i=0;i<results.length;i++){
  const outcome=results[i],asset=FIONA_FBX_FILES[i];
  if(outcome.status==='fulfilled'){
   const x=outcome.value;
   clips.set(asset.id,x.clip);
   reports.push({file:x.file,id:x.id,boneCount:x.boneCount,mainJointCount:x.mainJointCount,
    duration:x.clip.duration,sourceClip:x.sourceClip,allClips:x.allClips});
  }else{
   errors.push(asset.file+': '+String(outcome.reason?.message||outcome.reason));
  }
 }
 return {clips,reports,errors};
}
