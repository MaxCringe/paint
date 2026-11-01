import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { FIONA_ANIMATION_SLOTS } from './FionaAnimationSlots.js';
import { fetchPythonFionaMotionData, createPythonFionaClips } from './FionaPythonMotions.js';
import { fetchCalibratedRunData, createCalibratedRunClip } from './FionaCalibratedRun.js';
import { loadFionaFBXClips } from './FionaImportedFBX.js';

// Optional, purely visual FBX animation test. Physics/collisions remain in game.js.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SLOTS=new Map(FIONA_ANIMATION_SLOTS.map(slot=>[slot.id,slot]));
async function parseFBX(file){
 if(!file||!/\.fbx$/i.test(file.name))throw new Error('Нужен файл FBX: '+(file?.name||'не выбран'));
 return new FBXLoader().parse(await file.arrayBuffer(),'');
}
export async function loadFionaTest({runner,modelFile,turn=true}){
 const [model,generatedData,calibratedData]=await Promise.all([
  parseFBX(modelFile),fetchPythonFionaMotionData(),fetchCalibratedRunData()
 ]);
 let skinned=0;
 const bones=new Map();
 model.traverse(node=>{
  if(node.isBone)bones.set(node.name,node);
  if(node.isSkinnedMesh)skinned++;
  if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
 });
 if(!skinned||bones.size<8)throw new Error('Модель Фионы не содержит привязанного скелета.');
 // Do not read the FBX-embedded animations or user-supplied Mixamo clips.
 const clips=createPythonFionaClips(bones,generatedData);
 // The old Python clips are retained as DEV fallbacks.
 // FBX replaces only running and the first jump; flight stays procedural.
 clips.set('runCalibrated',createCalibratedRunClip(bones,calibratedData));
 // Keep the original Python/NumPy actions as reversible fallbacks.
 const importResult=await loadFionaFBXClips(bones);
 for(const [id,clip] of importResult.clips){
  clips.set(id==='run'?'runFBX':'jumpFBX',clip);
 }
 const prototypeIds=new Set(FIONA_ANIMATION_SLOTS.map(slot=>slot.id));
 const importedIds=new Set(importResult.clips.keys());
 const headBone=[...bones.values()].find(b=>/^(?:mixamorig:)?Head$/i.test(b.name))||null;
 const avatar=new THREE.Group(),facing=new THREE.Group();
 avatar.add(facing);facing.add(model);
 facing.rotation.y=turn?Math.PI:0;
 model.updateMatrixWorld(true);
 const initialBounds=new THREE.Box3().setFromObject(facing);
 const height=initialBounds.getSize(new THREE.Vector3()).y;
 if(!Number.isFinite(height)||height<0.01)throw new Error('Не удалось определить высоту Фионы.');
 model.scale.multiplyScalar(2.5/height);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(facing);
 const center=bounds.getCenter(new THREE.Vector3());
 facing.position.set(-center.x,-bounds.min.y,-center.z);
 avatar.visible=false;runner.add(avatar);
 const mixer=new THREE.AnimationMixer(model);
 const actions=new Map([...clips].map(([id,clip])=>[id,mixer.clipAction(clip)]));
 let currentAction=null,currentName=null,baseState='run',oneShot=null;
 let active=false,dead=false,manualSlot=null,manualSeconds=0,airborneSlot='jump';
 let runVariant=importedIds.has('run')?'fbx':'calibrated';
 let previous={jumping:false,sliding:false,broom:false,ultimate:false};
 let awaitingDeath=false;
 const available=new Set(FIONA_ANIMATION_SLOTS.map(slot=>slot.id));

 function resolve(id){
  if(id==='run'){
   if(runVariant==='fbx'&&actions.has('runFBX'))return 'runFBX';
   if(runVariant==='calibrated'&&actions.has('runCalibrated'))return 'runCalibrated';
  }
  if(id==='jump'&&actions.has('jumpFBX'))return 'jumpFBX';
  if(actions.has(id))return id;
  if(id==='doubleJump'&&actions.has('jump'))return 'jump';
  if(id==='broomDuck'&&actions.has('broomFly'))return 'broomFly';
  if(id==='ultimateFly'&&actions.has('broomFly'))return 'broomFly';
  return actions.has('run')?'run':null;
 }
 function play(id,{force=false,once=null}={}){
  const resolved=resolve(id);
  if(!resolved)return false;
  if(!force&&currentName===resolved)return true;
  const action=actions.get(resolved);
  if(currentAction&&currentAction!==action)currentAction.fadeOut(.13);
  action.reset();
  action.enabled=true;
  action.setEffectiveWeight(1);
  const loop=once===null?(['runCalibrated','runFBX'].includes(resolved)||Boolean(SLOTS.get(resolved)?.loop)):!once;
  action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
  action.clampWhenFinished=!loop;
  action.fadeIn(.13).play();
  currentAction=action;currentName=resolved;
  return true;
 }
 function playBase(){
  oneShot=null;
  if(baseState==='jump'||baseState==='doubleJump'){
   play(baseState,{once:true});
  }else if(baseState==='death'){
   play('death',{once:true});
  }else{
   play(baseState);
  }
 }
 function trigger(id){
  // Souls are absorbed passively; never interrupt running, jumping or flight.
  // Guard this at the animation-controller layer as well as in game.js.
  if(id==='soulPickup')return false;
  if(!active||dead||!actions.has(id)||manualSlot)return false;
  oneShot=id;
  play(id,{force:true,once:true});
  return true;
 }
 function playJump(count=1){
  if(!active||dead)return;
  airborneSlot=count===2?'doubleJump':'jump';
  oneShot=null;
  baseState=airborneSlot;
  play(airborneSlot,{force:true,once:true});
 }
 function preview(id){
  if(!active)return {ok:false,message:'Сначала запусти тестовый забег.'};
  if(id==='soulPickup'){
   // No soul-pickup pose, even when clicked from the DEV animation panel.
   if(!dead){manualSlot=null;manualSeconds=0;oneShot=null;playBase();}
   return {ok:true,message:'Сбор души — без анимации: Фиона продолжает текущее движение.'};
  }
  if(!actions.has(resolve(id)))return {ok:false,message:'Анимация не найдена: '+(SLOTS.get(id)?.label||id)};
  dead=false;awaitingDeath=false;
  manualSlot=id;
  manualSeconds=Math.max(SLOTS.get(id)?.loop?2.7:1.2,clips.get(resolve(id)).duration+.18);
  oneShot=null;
  play(id,{force:true,once:!SLOTS.get(id)?.loop});
  const selected=resolve(id);
  const source=selected==='runFBX'?'Fast Run.fbx':selected==='jumpFBX'?'Running Jump.fbx':null;
  return {ok:true,message:'Просмотр: '+SLOTS.get(id).label+
   (source?' — '+source:' — Python/NumPy')+'. Физика забега не меняется.'};
 }
 function die(reason='other'){
  if(!active)return;
  dead=true;manualSlot=null;manualSeconds=0;oneShot=null;
  awaitingDeath=reason==='tree'&&actions.has('hitTree')&&actions.has('death');
  if(reason==='tree'&&actions.has('hitTree'))play('hitTree',{force:true,once:true});
  else play('death',{force:true,once:true});
 }
 mixer.addEventListener('finished',event=>{
  if(event.action!==currentAction)return;
  if(manualSlot||dead){
   if(dead&&awaitingDeath&&currentName==='hitTree'){
    awaitingDeath=false;play('death',{force:true,once:true});
   }
   return;
  }
  if(baseState==='jump'||baseState==='doubleJump')return; // Hold end pose until actual landing.
  if(oneShot){
   oneShot=null;
   playBase();
  }
 });
 function setRunVariant(value){
  if(!['fbx','calibrated','original'].includes(value))return {ok:false,message:'Неизвестный вариант бега.'};
  if(value==='fbx'&&!importedIds.has('run'))return {ok:false,message:'Fast Run.fbx не удалось применить к этому скелету.'};
  if(value===runVariant)return {ok:true,message:'Этот вариант бега уже выбран.'};
  runVariant=value;
  if(active&&!dead&&(baseState==='run'&&!oneShot||manualSlot==='run'))
   play('run',{force:true,once:manualSlot==='run'?false:null});
  return {ok:true,message:value==='fbx'
   ?'FBX-бег: Fast Run.fbx (реальные ключи, перенос на скелет Фионы).'
   :value==='calibrated'
   ?'Новый бег: калибровка костей по FBX, цикл 0,70 с.'
   :'Старый бег: исходные Python-повороты, сохранён для сравнения.'};
 }
 function reset(){
  dead=false;awaitingDeath=false;manualSlot=null;manualSeconds=0;
  oneShot=null;baseState='run';airborneSlot='jump';
  previous={jumping:false,sliding:false,broom:false,ultimate:false};
  mixer.stopAllAction();
  currentAction=null;currentName=null;
  avatar.rotation.set(0,0,0);avatar.position.y=0;
  if(active)play('run',{force:true});
 }
 function setActive(value){
  active=Boolean(value);avatar.visible=active;
  if(active)reset();
  else mixer.stopAllAction();
 }
 function update(dt,{jumping=false,sliding=false,crouch=0,broom=false,broomDuck=0,ultimate=false,slip=false,speed=15}={}){
  if(!active)return;
  const current={jumping,sliding,broom,ultimate};
  if(!dead){
   const desired=ultimate?'ultimateFly':broom?(broomDuck>0.14?'broomDuck':'broomFly'):
    jumping?airborneSlot:sliding?'slide':slip?'slip':'run';
   const baseChanged=desired!==baseState;
   baseState=desired;
   if(!manualSlot){
    if(baseChanged){
     oneShot=null;
     playBase();
     if(!previous.broom&&broom)trigger('broomStart');
     else if(previous.broom&&!broom)trigger('broomLand');
     else if(!previous.ultimate&&ultimate)trigger('ultimateStart');
     else if(previous.ultimate&&!ultimate)trigger('ultimateEnd');
     else if(previous.sliding&&!sliding)trigger('slideEnd');
     else if(previous.jumping&&!jumping)trigger('land');
    }
   }else{
    manualSeconds-=dt;
    if(manualSeconds<=0){
     manualSlot=null;manualSeconds=0;playBase();
    }
   }
  }
  previous=current;
  for(const name of ['run','runCalibrated','runFBX']){
   const run=actions.get(name);
   if(run)run.setEffectiveTimeScale(clamp(speed/15,.8,1.85));
  }
  mixer.update(dt);
  // Python clips animate bones, not entire meshes. No squashing or root displacement.
  avatar.rotation.x+=(0-avatar.rotation.x)*Math.min(1,dt*12);
  avatar.position.y+=(0-avatar.position.y)*Math.min(1,dt*12);
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
 return {setActive,playJump,trigger,preview,die,update,reset,dispose,setRunVariant,
  get runVariant(){return runVariant;},headBone,available,prototypeIds,importedIds,
  importedFiles:importResult.reports,importErrors:importResult.errors,
  get loadedCount(){return available.size;}};
}
