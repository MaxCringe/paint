import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Isolated Fiona FBX test. Local files only: no upload to any server.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
async function parseFBX(file){
 if(!file||!/\.fbx$/i.test(file.name))throw new Error('Выбери FBX: '+(file?.name||'файл отсутствует'));
 return new FBXLoader().parse(await file.arrayBuffer(),'');
}
function extractClip(root,label,bones){
 const clip=root.animations?.[0];
 if(!clip?.tracks?.length)throw new Error(label+' не содержит анимации.');
 const matched=new Set();
 for(const track of clip.tracks){
  const boneName=track.name.split('.')[0];
  if(bones.has(boneName))matched.add(boneName);
 }
 if(matched.size<8)throw new Error(label+': совпадает только '+matched.size+' костей. Нужны анимации от этого скелета.');
 const copy=clip.clone();copy.name=label;return copy;
}
export async function loadFionaTest({runner,modelFile,runFile,jumpFile,turn=true}){
 // Read and validate all three files before touching the actual game scene.
 const [model,runSource,jumpSource]=await Promise.all([
  parseFBX(modelFile),parseFBX(runFile),parseFBX(jumpFile)
 ]);
 const bones=new Map();
 let skinnedMeshes=0;
 model.traverse(o=>{
  if(o.isBone)bones.set(o.name,o);
  if(o.isSkinnedMesh)skinnedMeshes++;
  if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
 });
 if(!skinnedMeshes||bones.size<8)throw new Error('Модель FBX не содержит скелета с привязанной 3D-сеткой.');
 const runClip=extractClip(runSource,'Run Forward',bones);
 const jumpClip=extractClip(jumpSource,'Jump',bones);
 const headBone=[...bones.values()].find(b=>/^(mixamorig:)?Head$/i.test(b.name))||null;
 const avatar=new THREE.Group();
 const facing=new THREE.Group();
 avatar.add(facing);facing.add(model);
 facing.rotation.y=turn?Math.PI:0;
 model.updateMatrixWorld(true);
 const originalBox=new THREE.Box3().setFromObject(facing);
 const originalHeight=originalBox.getSize(new THREE.Vector3()).y;
 if(!Number.isFinite(originalHeight)||originalHeight<.01)throw new Error('Не могу определить размер модели.');
 model.scale.multiplyScalar(2.5/originalHeight);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(facing);
 const center=bounds.getCenter(new THREE.Vector3());
 facing.position.set(-center.x,-bounds.min.y,-center.z);
 avatar.visible=false;
 runner.add(avatar);
 const mixer=new THREE.AnimationMixer(model);
 const run=mixer.clipAction(runClip);
 const jump=mixer.clipAction(jumpClip);
 run.setLoop(THREE.LoopRepeat,Infinity);run.play();
 jump.setLoop(THREE.LoopOnce,1);jump.clampWhenFinished=true;
 let active=false,wasAirborne=false;
 function setActive(value){active=!!value;avatar.visible=active;}
 function playJump(){
  if(!active)return;
  jump.stop();jump.reset().fadeIn(.12).play();
  run.fadeOut(.12);
  wasAirborne=true;
 }
 function update(dt,{jumping=false,sliding=false,crouch=0,broom=false,ultimate=false,speed=15}={}){
  if(!active)return;
  if(!jumping&&wasAirborne){
   jump.fadeOut(.15);
   run.reset().fadeIn(.15).play();
   wasAirborne=false;
  }
  run.setEffectiveTimeScale((broom||ultimate)?0.2:clamp(speed/15,.85,1.8));
  mixer.update(dt);
  // Approximate unprovided animation states without squash/stretch.
  const pitch=sliding?-.72*crouch:broom?-.19:ultimate?-.13:0;
  const offset=sliding?-.18*crouch:broom?0.05:0;
  avatar.rotation.x+=(pitch-avatar.rotation.x)*Math.min(1,dt*12);
  avatar.position.y+=(offset-avatar.position.y)*Math.min(1,dt*12);
 }
 function dispose(){
  mixer.stopAllAction();mixer.uncacheRoot(model);
  runner.remove(avatar);
  model.traverse(o=>{
   o.geometry?.dispose?.();
   for(const m of (Array.isArray(o.material)?o.material:[o.material])){
    if(!m)continue;
    for(const value of Object.values(m))if(value?.isTexture)value.dispose();
    m.dispose?.();
   }
  });
 }
 return {setActive,playJump,update,dispose,headBone};
}
