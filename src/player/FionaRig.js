import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { FIONA_ANIMATION_SLOTS } from './FionaAnimationSlots.js';
import { fetchPythonFionaMotionData, createPythonFionaClips } from './FionaPythonMotions.js';
import { fetchCalibratedRunData, createCalibratedRunClip } from './FionaCalibratedRun.js';
import { loadFionaFBXClips } from './FionaImportedFBX.js';
import { SLIDE_DURATION } from './Slide.js';
import { createPowerLevitationPose } from './PowerLevitationPose.js';

// Production skinned Fiona: animations and geometry only; collisions remain in game.js.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SLOTS=new Map(FIONA_ANIMATION_SLOTS.map(slot=>[slot.id,slot]));
async function parseFBX(file){
 if(!file||!/\.fbx$/i.test(file.name))throw new Error('Нужен файл FBX: '+(file?.name||'не выбран'));
 return new FBXLoader().parse(await file.arrayBuffer(),'');
}
export async function loadFiona({runner,modelFile,turn=true}){
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
 // Python motions remain as fallbacks when an FBX clip is unavailable.
 // FBX replaces only running and the first jump; flight stays procedural.
 clips.set('runCalibrated',createCalibratedRunClip(bones,calibratedData));
 // Keep the original Python/NumPy actions as reversible fallbacks.
 const importResult=await loadFionaFBXClips(bones);
 for(const [id,clip] of importResult.clips){
  const name={run:'runFBX',jump:'jumpFBX',slip:'slipFBX',
   death:'deathFBX',fishDeath:'fishDeathFBX',slide:'slideFBX',
   treeDeath:'treeDeathFBX'}[id];
  if(name)clips.set(name,clip);
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
 // Seated broom pose is applied directly to the real skinned bones.
 const broomJoints={};
 for(const [key,pattern] of Object.entries({hips:/hips$/i,spine:/spine$/i,
  leftUpperLeg:/leftupleg$/i,rightUpperLeg:/rightupleg$/i,
  leftLowerLeg:/leftleg$/i,rightLowerLeg:/rightleg$/i,
  leftArm:/leftarm$/i,rightArm:/rightarm$/i,
  leftForeArm:/leftforearm$/i,rightForeArm:/rightforearm$/i})){
  const bone=[...bones.values()].find(b=>pattern.test(b.name.replace(/^mixamorig:/i,'')));
  if(bone)broomJoints[key]={bone,rest:bone.quaternion.clone()};
 }
 let broomSeatBlend=0;
 const broomSeatAngles={hips:[-.28,0,0],spine:[.30,0,0],
  leftUpperLeg:[-1.50,0,-.12],rightUpperLeg:[-1.50,0,.12],
  leftLowerLeg:[1.65,0,0],rightLowerLeg:[1.65,0,0],
  // Mixamo shoulders start in a raised/T pose: lower them toward the torso
  // before reaching forward; elbows bend so hands approach the broom handle.
  leftArm:[-.55,0,-1.05],rightArm:[-.55,0,1.05],
  leftForeArm:[-.85,0,-.12],rightForeArm:[-.85,0,.12]};
 const broomSeatTarget=new THREE.Quaternion();
 const powerLevitationPose=createPowerLevitationPose(bones,facing);
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
  if(id==='slip'&&actions.has('slipFBX'))return 'slipFBX';
  // Slide is ground-only. The broom and ultimate have distinct pose logic.
  if(id==='slide'&&actions.has('slideFBX'))return 'slideFBX';
  if(id==='death'&&actions.has('deathFBX'))return 'deathFBX';
  if(id==='fishDeath'&&actions.has('fishDeathFBX'))return 'fishDeathFBX';
  // Existing "Удар о дерево" preview now shows the full, standalone pine death.
  if((id==='hitTree'||id==='treeDeath')&&actions.has('treeDeathFBX'))
   return 'treeDeathFBX';
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
  // Do not snap from a fast run into the slow hovering silhouette.
  const flightTransition=resolved.startsWith('ultimate')||(currentName||'').startsWith('ultimate');
  const fadeSeconds=flightTransition?.20:.13;
  if(currentAction&&currentAction!==action)currentAction.fadeOut(fadeSeconds);
  action.reset();
  action.enabled=true;
  action.setEffectiveWeight(1);
  // Finish the full take during the ground-slide window without changing physics.
  if(resolved==='slideFBX')action.setEffectiveTimeScale(clips.get(resolved).duration/SLIDE_DURATION);
  // The Running Slide FBX is a single take: play it once, and let the
  // gameplay slide timer continue to control collision safety.
  const loop=once===null?(!['slipFBX','slideFBX'].includes(resolved)&&
   (['runCalibrated','runFBX'].includes(resolved)||Boolean(SLOTS.get(resolved)?.loop))):!once;
  action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
  action.clampWhenFinished=!loop;
  action.fadeIn(fadeSeconds).play();
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
  if(id==='soulPickup'||id==='hatPickup'||id==='scarfPickup')return false;
  // Lane changes are lateral movement, not standalone one-shot clips.
  // A clamped moveLeft/moveRight clip freezes Fiona mid-stride until the
  // base state changes. Keep the current run/flight/jump animation playing.
  if(id==='moveLeft'||id==='moveRight')return false;
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
  if(id==='slide'&&(previous.broom||previous.ultimate))
   return {ok:false,message:'Подкат под бревном доступен только при беге, не на метле.'};
  if(!actions.has(resolve(id)))return {ok:false,message:'Анимация не найдена: '+(SLOTS.get(id)?.label||id)};
  dead=false;awaitingDeath=false;
  manualSlot=id;
  manualSeconds=Math.max(SLOTS.get(id)?.loop&&!['slip','slide'].includes(id)?2.7:1.2,clips.get(resolve(id)).duration+.18);
  oneShot=null;
  play(id,{force:true,once:['fishDeath','slip','slide'].includes(id)||!SLOTS.get(id)?.loop});
  const selected=resolve(id);
  const filenames={
   runFBX:'Fast Run.fbx',jumpFBX:'Running Jump.fbx',
   slipFBX:'Edge Slip.fbx',deathFBX:'Standing React Death Right.fbx',
   fishDeathFBX:'Stumble Backwards.fbx',
   slideFBX:'Running Slide (1).fbx',
   treeDeathFBX:'Hit On Legs.fbx'
  };
  const source=filenames[selected]||null;
  return {ok:true,message:'Просмотр: '+(SLOTS.get(id)?.label||'Смерть от рыбы')+
   (source?' — '+source:' — Python/NumPy')+'. Физика забега не меняется.'};
 }
 function die(reason='other',{onBroom=false}={}){
  if(!active)return 0;
  dead=true;awaitingDeath=false;manualSlot=null;manualSeconds=0;oneShot=null;
  // Original instant game-over: no FBX or Python death reaction.
  mixer.timeScale=0;
  return 0;
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
  mixer.timeScale=1; // Resume animations after a broom collision.
  dead=false;awaitingDeath=false;manualSlot=null;manualSeconds=0;
  oneShot=null;baseState='run';airborneSlot='jump';
  previous={jumping:false,sliding:false,broom:false,ultimate:false};
  mixer.stopAllAction();
  currentAction=null;currentName=null;
  broomSeatBlend=0;
  avatar.rotation.set(0,0,0);avatar.position.y=0;
  if(active)play('run',{force:true});
 }
 function setActive(value){
  active=Boolean(value);avatar.visible=active;
  if(active)reset();
  else mixer.stopAllAction();
 }
 function update(dt,{jumping=false,sliding=false,crouch=0,broom=false,broomDuck=0,ultimate=false,ultimateLift=0,slip=false,speed=15}={}){
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
     // Directly crossfade into the take-off / landing one-shot. Previously
     // playBase briefly queued flight or running first, and a broom ending
     // could override the ultimate take-off altogether.
     if(!previous.ultimate&&ultimate){
      if(!trigger('ultimateStart'))playBase();
     }else if(previous.ultimate&&!ultimate){
      if(!trigger('ultimateEnd'))playBase();
     }else{
      playBase();
      if(!previous.broom&&broom)trigger('broomStart');
      else if(previous.broom&&!broom)trigger('broomLand');
      else if(previous.sliding&&!sliding&&!importedIds.has('slide'))
       trigger('slideEnd'); // The FBX slide already contains its exit to sprint.
      else if(previous.jumping&&!jumping)trigger('land');
     }
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
  // Transition into a genuine seated posture: bent hips/knees, forward torso,
  // arms reaching for the shaft. Apply after the mixer so flight clips cannot
  // restore the standing pose. Fade out on landing without changing physics.
  const seatTarget=broom&&!ultimate?1:0;
  broomSeatBlend+=(seatTarget-broomSeatBlend)*Math.min(1,dt*(seatTarget?7:9));
  if(broomSeatBlend>.0001){
   // Do not blend the running cycle into flight: the reference is the FBX bind pose.
   // This prevents alternating running legs from making Fiona stand on the broom.
   for(const [key,joint] of Object.entries(broomJoints)){
    const [x,y,z]=broomSeatAngles[key];
    broomSeatTarget.copy(joint.rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')));
    joint.bone.quaternion.slerp(broomSeatTarget,broomSeatBlend);
   }
  }
  // Correct the arm/leg silhouette from the real rig, after animation mixing.
  // The active flight height supplies a smooth ramp in and out.
  if(!dead)powerLevitationPose.apply(manualSlot?.startsWith('ultimate')?1:ultimateLift);
  // Python clips animate bones, not entire meshes. No squashing or root displacement.
  avatar.rotation.x+=(0-avatar.rotation.x)*Math.min(1,dt*12);
  avatar.position.y+=(-.62*broomSeatBlend-avatar.position.y)*Math.min(1,dt*9);
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
