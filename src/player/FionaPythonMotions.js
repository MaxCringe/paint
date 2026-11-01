import * as THREE from 'three';
import { gunzipSync } from 'three/addons/libs/fflate.module.js';

// Python/NumPy authoring output, baked to a tiny gzipped JSON asset.
// This loader only converts additive skeleton offsets to Three.js quaternion tracks.
const URL='/models/fiona/animations/motions.json.gz';
let cached=null;
export async function fetchPythonFionaMotionData(){
 if(cached)return cached;
 const response=await fetch(URL);
 if(!response.ok)throw new Error('Не найдены Python-анимации Фионы ('+response.status+').');
 const bytes=new Uint8Array(await response.arrayBuffer());
 let data;
 try{
  data=JSON.parse(new TextDecoder().decode(gunzipSync(bytes)));
 }catch(error){
  throw new Error('Не удалось открыть Python-анимации: '+error.message);
 }
 if(data.schema!==1||data.author!=='python-numpy'||!data.motions||
    !data.motions.run||!data.motions.jump)throw new Error('Неверный набор Python-анимаций Фионы.');
 cached=data;
 return data;
}
export function createPythonFionaClips(bones,data){
 const clips=new Map();
 const missing=[];
 for(const [id,definition] of Object.entries(data.motions)){
  const frames=definition.f;
  if(!Array.isArray(frames)||frames.length<2||!(definition.d>0))
   throw new Error('Неверные ключевые кадры: '+id);
  const used=new Set(frames.flatMap(([,pose])=>Object.keys(pose)));
  const tracks=[];
  for(const name of used){
   const bone=bones.get(name)||bones.get('mixamorig:'+name);
   if(!bone){missing.push(name);continue;}
   // Apply every rotation relative to this particular rig's rest pose.
   const rest=bone.quaternion.clone();
   const times=[],values=[];
   for(const [fraction,pose] of frames){
    const e=pose[name]||[0,0,0];
    const q=rest.clone().multiply(new THREE.Quaternion().setFromEuler(
     new THREE.Euler(e[0],e[1],e[2],'XYZ')
    )).normalize();
    times.push(definition.d*fraction);
    values.push(q.x,q.y,q.z,q.w);
   }
   tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
  }
  if(!tracks.length)throw new Error('В скелете нет костей для движения «'+id+'».');
  clips.set(id,new THREE.AnimationClip(id,definition.d,tracks));
 }
 if(clips.size!==23)throw new Error('Неполный набор Python-анимаций ('+clips.size+'/23).');
 if(missing.length)console.warn('Fiona motion tracks skipped: '+[...new Set(missing)].join(', '));
 return clips;
}
