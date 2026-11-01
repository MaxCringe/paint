import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { FIONA_ANIMATION_SLOTS } from './FionaAnimationSlots.js';

// Optional, purely visual FBX animation test. Physics/collisions remain in game.js.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SLOTS=new Map(FIONA_ANIMATION_SLOTS.map(slot=>[slot.id,slot]));
async function parseFBX(file){
 if(!file||!/\.fbx$/i.test(file.name))throw new Error('Нужен файл FBX: '+(file?.name||'не выбран'));
 return new FBXLoader().parse(await file.arrayBuffer(),'');
}
function extractClip(object,slot,bones){
 const source=object.animations?.[0];
 if(!source?.tracks?.length)throw new Error('«'+SLOTS.get(slot).label+'»: FBX не содержит анимации.');
 const used=new Set();
 for(const track of source.tracks){
  const bone=track.name.split('.')[0];
  if(bones.has(bone))used.add(bone);
 }
 if(used.size<8)throw new Error('«'+SLOTS.get(slot).label+'»: совпадает всего '+used.size+' костей модели.');
 const clip=source.clone();clip.name=slot;
 return clip;
}

export async function loadFionaTest({runner,modelFile,animationFiles={},runFile,jumpFile,turn=true}){
 // Backward compatibility for the original three-file test panel.
 const files={...animationFiles};
 if(!files.run&&runFile)files.run=runFile;
 if(!files.jump&&jumpFile)files.jump=jumpFile;
 if(!files.run||!files.jump)throw new Error('Для теста нужны анимации бега и прыжка.');
 const entries=Object.entries(files).filter(([id,file])=>SLOTS.has(id)&&file);
 const [model, ...sourceAnimations]=await Promise.all([
  parseFBX(modelFile),...entries.map(([,file])=>parseFBX(file))
 ]);
 let skinned=0;
 const bones=new Map();
 model.traverse(node=>{
  if(node.isBone)bones.set(node.name,node);
  if(node.isSkinnedMesh)skinned++;
  if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
 });
 if(!skinned||bones.size<8)throw new Error('Модель не содержит скелета с привязанной геометрией.');
 const clips=new Map();
 for(let i=0;i<entries.length;i++){
  const [id]=entries[i];
  clips.set(id,extractClip(sourceAnimations[i],id,bones));
 }
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
 let previous={jumping:false,sliding:false,broom:false,ultimate:false};
 let awaitingDeath=false;
 const available=new Set(actions.keys());

 function resolve(id){
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
  const loop=once===null?Boolean(SLOTS.get(resolved)?.loop):!once;
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
  if(!actions.has(id))return {ok:false,message:'Для «'+(SLOTS.get(id)?.label||id)+'» ещё нет FBX. Добавь файл в тестовом меню.'};
  dead=false;awaitingDeath=false;
  manualSlot=id;
  manualSeconds=Math.max(SLOTS.get(id)?.loop?2.7:1.2,clips.get(id).duration+.18);
  oneShot=null;
  play(id,{force:true,once:!SLOTS.get(id)?.loop});
  return {ok:true,message:'Просмотр: '+SLOTS.get(id).label+' ('+manualSeconds.toFixed(1)+' с). Механика забега не меняется.'};
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
  const run=actions.get('run');
  if(run)run.setEffectiveTimeScale(clamp(speed/15,.8,1.85));
  mixer.update(dt);
  // For states without FBX, gently retain temporary no-squash character poses.
  const needsSlide=sliding&&!actions.has('slide')&&!manualSlot;
  const needsBroom=broom&&!actions.has('broomFly')&&!manualSlot;
  const pitch=needsSlide?-.72*crouch:needsBroom?-.19:0;
  const offset=needsSlide?-.18*crouch:needsBroom?.05:0;
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
 return {setActive,playJump,trigger,preview,die,update,reset,dispose,headBone,available,
  get loadedCount(){return available.size;}};
}
