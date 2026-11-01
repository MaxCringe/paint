import * as THREE from 'three';
import { gunzipSync } from 'three/addons/libs/fflate.module.js';

const URL='/models/fiona/animations/run-calibrated.json.gz';
const RIG_BLOB='3745db9b6eecde2fa2f865f61e3e85481f13e514';
let cache=null;
export async function fetchCalibratedRunData(){
 if(cache)return cache;
 const response=await fetch(URL);
 if(!response.ok)throw new Error('Не найдена калиброванная анимация бега: HTTP '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer());
 let data;
 try{
  // A CDN is allowed to decompress Content-Encoding: gzip automatically.
  const payload=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes;
  data=JSON.parse(new TextDecoder().decode(payload));
 }catch(error){throw new Error('Не удалось открыть новый бег: '+(error?.message||String(error)));}
 if(data.schema!==1||data.mode!=='fiona-rig-local-quaternion-delta'||
    data.sourceBlob!==RIG_BLOB||data.name!=='runCalibrated'||
    !Array.isArray(data.frames)||data.frames.length<16||!Number.isFinite(data.duration))
  throw new Error('Набор калиброванного бега не соответствует скелету Фионы.');
 cache=data;return data;
}
export function createCalibratedRunClip(bones,data){
 if(data?.sourceBlob!==RIG_BLOB||data?.mode!=='fiona-rig-local-quaternion-delta')
  throw new Error('Калибровка не подходит к загруженной модели.');
 const frames=data.frames, duration=data.duration;
 if(!Array.isArray(frames)||frames.length<16||!Number.isFinite(duration)||duration<.3||duration>2)
  throw new Error('Неверные ключевые кадры нового бега.');
 const names=Object.keys(frames[0][1]||{});
 const tracks=[];
 const times=frames.map(f=>f[0]*duration);
 if(Math.abs(times[0])>1e-6||Math.abs(times.at(-1)-duration)>1e-6||
    times.some((time,i)=>!Number.isFinite(time)||(i>0&&time<=times[i-1])))
  throw new Error('Неверная временная шкала бега.');
 for(const name of names){
  const bone=bones.get(name)||bones.get('mixamorig:'+name);
  if(!bone)throw new Error('Для нового бега не найдена кость '+name);
  const rest=bone.quaternion.clone(),values=[];
  for(const [,poses] of frames){
   const q=poses[name];
   if(!Array.isArray(q)||q.length!==4||q.some(v=>!Number.isFinite(v)))
    throw new Error('Неверный поворот кости '+name);
   const result=rest.clone().multiply(new THREE.Quaternion(...q)).normalize();
   values.push(result.x,result.y,result.z,result.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
 }
 const hips=bones.get('Hips')||bones.get('mixamorig:Hips');
 if(hips&&frames.every(f=>Number.isFinite(f[2]))){
  const values=[];
  for(const [, ,lift] of frames)values.push(
   hips.position.x,hips.position.y+lift,hips.position.z
  );
  tracks.push(new THREE.VectorKeyframeTrack(hips.name+'.position',times,values));
 }
 return new THREE.AnimationClip('runCalibrated',duration,tracks);
}
