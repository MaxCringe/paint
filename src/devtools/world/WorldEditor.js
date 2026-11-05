import {createPlacementState,validLocalPosition,uniqueEffectId,effectLabel,authoredAnchors} from './EffectPlacement.js';
import {originalComposition,updateOriginalSettings,ORIGINAL_FIELDS,validateAndNormalizePreset} from '../../systems/fire/OriginalPreset.js';
import {parseEffect,effectDocument,validateComposition,uniquePresetName,IMPORT_BACKUP,integrationExample} from './StudioStorage.js';
import {createTreeComposition} from './CompositionLayout.js';
import {applyFlameForm} from '../../systems/fire/ArtisticFire.js';
import {defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {getPineFireProfile} from '../../systems/fire/ForestFireStudio.js';
import {createLavaRiverFactory} from '../../obstacles/LavaRiver.js';
import {createForestRandom} from '../../world/forest/PlantRegistry.js';
import {createEffectPanel} from './EffectPanel.js';
import {EFFECT_PRESETS,LAYER_FIELDS,EMITTER_FIELDS,defaultLayer,defaultEmitter,copy,applyEffectPreset,COMPOSITION_PLACEMENT} from './EffectLayers.js';
import {PINE_SPECIES,MAX_ANCHORS,MAX_SCENE_ANCHORS,newEffectAnchor,upgradePreset,readEffectPreset,saveEffectPreset,EFFECT_STORAGE,clonePreset,PresetHistory,deckToLocal,localToDeck,distributeAnchors} from './FirePreset.js';
import './WorldEditor.css';

const LABELS=['Сосновая группа','Ель бегуна','Таёжная ель','Сухая сосна','Секвойя','Сосна обыкновенная'];
const editableTarget=e=>e.target instanceof HTMLElement&&!!e.target.closest('input,select,textarea,button,summary');
export function createWorldEditor({scene,renderer,forest,seed,getRivers,getBurningPlants,setSuspended,defaultFireObjects,runtime}){
 const canvas=renderer.domElement,pineMeshes=forest.pickMeshes('pine');
 const camera=new THREE.PerspectiveCamera(55,1,.05,800);
 let active=false,selected=null,anchorId=null,dragged=false,pointerStart=null,orbit,gizmo,abort,panel,markers,demo=null;
 const keys=new Set(),point=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const fire=runtime.fire,handle=new THREE.Object3D();scene.add(handle);
 const sources=()=>[...forest.plants.filter(p=>p.userData.plantSpecies.startsWith('pine:')).map(root=>runtime.sourceFor(root)),...getRivers().map(root=>runtime.sourceFor(root)),...(demo?.parent?[runtime.sourceFor(demo)]:[]),runtime.world];
 const defaults=runtime.defaults;
 let preset=runtime.preset,hasSavedPreset=!!readEffectPreset(),view,presetId='calm',addKind='fire',storageWarning='';
 let preview=null,clipboardEffect=null;
 const interaction=createPlacementState(),ghostRoot=new THREE.Group();ghostRoot.name='FireStudioPlacementPreview';
 let ghost=null,placementOrigin=null,reanchorSource=null,lastPointer=null,placementDirty=false;
 const placing=()=>interaction.placing;
 let history=new PresetHistory(preset);
 const reopen=document.createElement('button');reopen.id='world-editor-reopen';reopen.textContent='Открыть редактор мира';reopen.hidden=true;document.body.append(reopen);reopen.onclick=()=>open();
 const list=(mutable=false)=>selected?runtime.anchorsFor(selected,mutable):[];
 const anchor=(mutable=false)=>list(mutable).find(a=>a.id===anchorId);
 const cycleFields={stage:{value:0,min:0,max:1,type:'number'},speed:{value:1,min:.1,max:5,type:'number'},duration:{value:24,min:2,max:120,type:'number'}};
 const effect=()=>presetId.startsWith('user:')?preset.customPresets[Number(presetId.slice(5))]??EFFECT_PRESETS.calm:EFFECT_PRESETS[presetId]??EFFECT_PRESETS.calm;
 function message(text){if(panel)panel.querySelector('output').textContent=storageWarning?storageWarning+' '+text:text;}
 function persist(){try{saveEffectPreset(preset);storageWarning='';return true;}catch{storageWarning='Не удалось сохранить в браузере. Экспортируйте JSON перед закрытием.';message('');return false;}}
 function commit(refreshView=true){history.push(preset);persist();if(refreshView)refresh();else{panel.querySelector('[data-action=undo]').disabled=history.index===0;panel.querySelector('[data-action=redo]').disabled=history.index===history.entries.length-1;panel.querySelector('[data-preset-changes]').textContent='Эффект изменён относительно пресета. Изменения сцены сохранены в браузере.';}}
 function mutation(fn){if(preset.seed!==seed){message('Примените seed импортированного леса в разделе сцены перед редактированием.');return;}fn();fire.invalidate();commit();}
 function restore(value){stopPreview();cancelPlacement(false);const previousId=anchorId;preset=value;runtime.setPreset(preset);anchorId=list().some(a=>a.id===previousId)?previousId:null;interaction.set(anchorId?'editing':'idle');fire.invalidate();persist();refresh();}
 function makeDemo(){
  if(demo){scene.add(demo);return;}
  const records=[];createLavaRiverFactory(scene,records,{random:createForestRandom(seed)})(-12);
  demo=records[0].g;
  defaults.deck=demo.userData.deckFireAnchors.map(a=>Object.assign(newEffectAnchor([0,0,0],a.size),localToDeck(new THREE.Vector3(a.x,a.y,a.z),demo.userData.fireBoundary)));
  if(!hasSavedPreset&&!preset.deck.length){preset.deck=clonePreset(defaults.deck);history=new PresetHistory(preset);}
 }
 function choose(target,{focus=true,preservePlacement=true}={}){
  const keep=preservePlacement&&placing(),mode=interaction.mode;if(!keep)cancelPlacement(false);
  stopPreview();
  selected=target?.id==='world'?runtime.world:target?runtime.sourceFor(target.root):null;anchorId=null;if(!keep){snapId=null;reanchorSource=null;interaction.set('idle');}else interaction.set(mode);placementDirty=true;if(panel)panel.querySelector('[name=placement]').value=selected?.id==='world'?'world':'surface';fire.invalidate();
  if(target&&focus){
   target.root.getWorldPosition(point);
   const height=target.boundary||target.key==='world'?2:getPineFireProfile(target.key).height*target.root.scale.y;
   orbit.target.copy(point).add(new THREE.Vector3(0,height*.45,0));
   camera.position.copy(orbit.target).add(new THREE.Vector3(Math.max(6,height*.6),Math.max(3,height*.3),Math.max(9,height*.9)));orbit.update();
  }
  refresh();
 }
 function chooseSpecies(key){
  if(key==='world'){choose(runtime.world);panel.querySelector('[name=placement]').value='world';return;}
  panel.querySelector('[name=placement]').value='surface';
  if(key==='deck'){choose({root:demo,key:'deck',boundary:demo.userData.fireBoundary});return;}
  const root=forest.plants.filter(p=>p.userData.plantSpecies===key).sort((a,b)=>Math.abs(a.position.z+8)-Math.abs(b.position.z+8))[0];
  if(root)choose({root,key});
 }
 function resize(){if(!active||!view)return;const rect=view.viewport.getBoundingClientRect(),width=Math.max(160,rect.width),height=Math.max(160,rect.height);canvas.style.position='fixed';canvas.style.left=rect.left+'px';canvas.style.top=rect.top+'px';renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function refresh(){
  if(!active)return;
  if(!placing()&&interaction.mode!=='preview')interaction.set(anchor()?'editing':'idle');
  const a=placing()?null:anchor();gizmo.detach();
  if(a){
   selected.root.updateWorldMatrix(true,false);
   point.fromArray(selected.boundary?deckToLocal(a,selected.boundary):a.position).applyMatrix4(selected.root.matrixWorld);
   handle.position.copy(point);
   const local=new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.rotation));
   handle.quaternion.copy(selected.root.getWorldQuaternion(new THREE.Quaternion())).multiply(local);
   handle.scale.fromArray(a.scale);gizmo.attach(handle);
  }
  // Small pickable handles belong to the selected root only, not to every copy.
  for(const child of [...markers.children])markers.remove(child);
  for(const item of list()){
   const marker=new THREE.Mesh(markerGeometry,item.id===anchorId?selectedMaterial:markerMaterial);
   marker.position.fromArray(selected.boundary?deckToLocal(item,selected.boundary):item.position).applyMatrix4(selected.root.matrixWorld);
   marker.userData.anchorId=item.id;markers.add(marker);
  }
  view.refresh({preset,selected,anchor:a,list:list(),anchorId,history,armed:placing(),mode:interaction.mode,sceneEntries:sceneEntries(),sceneLimit:MAX_SCENE_ANCHORS,sceneTotal:authoredAnchors(preset).length,paused:fire.paused,presetId,addKind,cycle:selected?runtime.cycleFor(selected):undefined});
  panel.querySelector('[data-scene-tip]').textContent=preview?'Предпросмотр: '+effect().name+'. Выберите «Создать сразу» или «Разместить вручную».':placing()?(interaction.mode==='reanchoring'?'Выберите новую поверхность · Esc — отмена':'Выберите поверхность · Esc — отмена'):a?'Эффект выбран. Измените размер и цвет справа.':'Выберите эффект слева, затем нажмите на дерево или поверхность.';
  message(placing()?(snapId?'Щёлкните по поверхности для привязки очага.':'Щёлкните по поверхности или свободной точке сцены.'):a?'Изменяется только выбранный очаг. Массовые действия находятся в отдельном разделе.':'Выберите очаг или добавьте новый эффект.');
 }
 const markerGeometry=new THREE.SphereGeometry(.10,8,6),markerMaterial=new THREE.MeshBasicMaterial({color:0xffca80,depthTest:false}),selectedMaterial=new THREE.MeshBasicMaterial({color:0xcfff72,depthTest:false});
 function surfaceHit(event){
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);camera.updateWorldMatrix(true,false);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects([...pineMeshes,...(demo?[demo]:[]),...getRivers()],true);
 }
 function sceneEntries(){
  const all=sources(),rows=[];
  const add=(sourceId,items)=>{const source=all.find(v=>v.id===sourceId),available=!!source&&(sourceId==='world'||runtime.anchorsFor(source)===items);const label=sourceId==='world'?'Сцена':source?.boundary?'Переправа':source?LABELS[PINE_SPECIES.indexOf(source.key)]+' №'+source.binding.id:'Объект недоступен';items.forEach((a,i)=>rows.push({key:JSON.stringify([sourceId,a.id]),sourceId,id:a.id,label:effectLabel(a)+' · '+label+' · '+(i+1),available}));};
  add('world',preset.world);for(const [id,entry] of Object.entries(preset.objects))add(id,entry.anchors);return rows;
 }
 function clearGhost(){ghostRoot.visible=false;scene.remove(ghostRoot);ghost=null;lastPointer=null;placementDirty=false;if(panel){delete panel.dataset.placementTarget;delete panel.dataset.placementPreview;}}
 function cancelPlacement(notify=true){
  if(!placing())return false;
  const origin=placementOrigin;clearGhost();snapId=null;reanchorSource=null;placementOrigin=null;
  if(origin?.source?.root.parent){selected=origin.source;anchorId=runtime.anchorsFor(selected).some(a=>a.id===origin.id)?origin.id:null;}
  interaction.set(anchorId?'editing':'idle');if(panel)panel.querySelector('[name=placement]').value=selected?.id==='world'?'world':'surface';if(notify){refresh();message('Размещение отменено');}return true;
 }
 function startPlacement(mode='placing'){
  stopPreview();if(!placing())placementOrigin={source:selected,id:anchorId};interaction.set(mode);
  const template=mode==='reanchoring'?runtime.anchorsFor(reanchorSource).find(a=>a.id===snapId):null;
  const a=template?copy(template):applyEffectPreset(newEffectAnchor([0,0,0]),effect());a.position=[0,0,0];a.id='studio:placement:anchor';
  for(const [kind,l] of Object.entries(a.layers)){if('opacity' in l)l.opacity*=.35;if(kind==='flame')l.light=0;}
  ghost={root:ghostRoot,id:'studio:placement',key:'world',anchors:[a],cycle:defaultBurnCycle()};ghostRoot.visible=false;scene.add(ghostRoot);
  const rect=canvas.getBoundingClientRect();lastPointer={clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};placementDirty=true;refresh();message('Выберите поверхность');
 }
 function placementAt(event,{immediate=false}={}){
  const rect=canvas.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return null;
  const hits=surfaceHit(event);const free=panel.querySelector('[name=placement]').value==='world';
  if(!free)for(const hit of hits){
   const plant=forest.resolveInstance(hit.object,hit.instanceId);let source;
   if(plant?.species.startsWith('pine:'))source=runtime.sourceFor(plant.root);
   else{let root=hit.object;while(root&&!root.userData.fireBoundary)root=root.parent;if(root&&hit.object.userData.fireDeckSurface)source=runtime.sourceFor(root);}
   if(source&&(!immediate||source.id===selected?.id)&&validCandidate(source,hit.point))return {source,point:hit.point.clone()};
  }
  const worldPoint=new THREE.Vector3();let hit;
  if(!immediate)hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),worldPoint);
  if(!hit||worldPoint.distanceTo(camera.position)<.5||worldPoint.distanceTo(camera.position)>50)ray.ray.at(5,worldPoint);
  return validCandidate(runtime.world,worldPoint)?{source:runtime.world,point:worldPoint}:null;
 }
 function validCandidate(source,worldPoint){
  if(!worldPoint.toArray().every(Number.isFinite)||worldPoint.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()))<=.1)return false;
  source.root.updateWorldMatrix(true,false);return validLocalPosition(source.root.worldToLocal(worldPoint.clone()).toArray());
 }
 function updateGhost(){
  placementDirty=false;if(!ghost||!lastPointer)return;
  const candidate=placementAt(lastPointer);ghostRoot.visible=!!candidate;panel.dataset.placementTarget=candidate?.source.id??'';panel.dataset.placementPreview=String(!!candidate);panel.querySelector('[data-scene-tip]').textContent=candidate?'Выберите поверхность · '+(candidate.source.id==='world'?'Свободная точка':candidate.source.boundary?'Деревянная переправа':'Сосна'):'Невозможно разместить здесь';if(!candidate)return;
  ghostRoot.position.copy(candidate.point);candidate.source.root.getWorldQuaternion(ghostRoot.quaternion);candidate.source.root.getWorldScale(ghostRoot.scale);ghostRoot.updateWorldMatrix(true,false);
 }
 function sceneTransaction(edit){
  if(preset.seed!==seed){message('Примените seed импортированного леса перед редактированием.');return false;}
  const before=clonePreset(preset);
  try{const result=edit();upgradePreset(preset);saveEffectPreset(preset);storageWarning='';history.push(preset);fire.invalidate();return result;}
  catch(error){preset=before;runtime.setPreset(preset);refresh();message('Не удалось сохранить эффект: '+error.message);return false;}
 }
 function placeEffect(candidate,{immediate=false}={}){
  if(!candidate){message('Невозможно разместить здесь');return false;}
  const target=candidate.source,oldSource=reanchorSource,oldAnchor=snapId?runtime.anchorsFor(oldSource).find(v=>v.id===snapId):null;
  if(runtime.anchorsFor(target).length>=MAX_ANCHORS&&(!oldAnchor||target.id!==oldSource.id)){message('Достигнут лимит очагов — максимум 32 на объект');return false;}
  const result=sceneTransaction(()=>{
   const local=target.root.worldToLocal(candidate.point.clone());let created=[];
   const composition=!immediate&&!oldAnchor&&(COMPOSITION_PLACEMENT[presetId]??(effect().original?.mode==='tree'?{zone:'all',count:32}:null));
   if(composition&&target.key.startsWith('pine:')){
    const items=runtime.anchorsFor(target,true);created=createTreeComposition(getPineFireProfile(target.key),effect(),{seed:preset.seed,...composition,count:Math.min(MAX_ANCHORS-items.length,composition.count)});
    if(effect().original){for(const a of created){a.layers.coals.count=Math.max(1,Math.ceil(effect().layers.coals.count/created.length));a.layers.smoke.rate/=created.length;a.layers.sparks.rate/=created.length;}Object.assign(runtime.cycleFor(target,true),copy(effect().cycle));}
   }else{
    const a=oldAnchor?copy(oldAnchor):applyEffectPreset(newEffectAnchor(),effect());
    if(oldAnchor){const q=oldSource.root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.rotation)));a.rotation=new THREE.Euler().setFromQuaternion(target.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).toArray().slice(0,3);const items=runtime.anchorsFor(oldSource,true);items.splice(items.findIndex(v=>v.id===a.id),1);}
    if(target.boundary)Object.assign(a,localToDeck(local,target.boundary));else a.position=local.toArray();created=[a];
   }
   if(!created.length)throw Error('Невозможно разместить здесь');const items=runtime.anchorsFor(target,true);for(const a of created){if(!oldAnchor||items.some(v=>v.id===a.id))a.id=uniqueEffectId(preset);if(!oldAnchor)a.name=effect().name;items.push(a);}return {source:target,id:created[0]?.id,count:created.length};
  });
  if(!result)return false;clearGhost();snapId=null;reanchorSource=null;placementOrigin=null;selected=result.source;anchorId=result.id;interaction.set('editing');refresh();view.library.used(presetId);message(oldAnchor?'Привязка изменена. Эффект сохранён':'Эффект создан'+(result.count>1?' · '+result.count+' очагов':'')+'. Эффект сохранён');return true;
 }
 function createImmediately(id=presetId){
  stopPreview();cancelPlacement(false);presetId=id;refresh();const rect=canvas.getBoundingClientRect();return placeEffect(placementAt({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2},{immediate:true}),{immediate:true});
 }
 function pick(event){
  const start=pointerStart;pointerStart=null;
  if(event.button!==0||dragged||!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
  if(placing()){placeEffect(placementAt(event));return;}
  surfaceHit(event);const marker=ray.intersectObjects(markers.children)[0];
  if(marker){stopPreview();anchorId=marker.object.userData.anchorId;interaction.set('editing');refresh();return;}
  const hits=surfaceHit(event);for(const hit of hits){const plant=forest.resolveInstance(hit.object,hit.instanceId);if(plant?.species.startsWith('pine:')){choose(runtime.sourceFor(plant.root),{focus:false});return;}let root=hit.object;while(root&&!root.userData.fireBoundary)root=root.parent;if(root&&hit.object.userData.fireDeckSurface){choose(runtime.sourceFor(root),{focus:false});return;}}
 }
 function focusAnchor(){
  const a=anchor();if(!a){if(selected)choose(selected);return;}
  point.fromArray(selected.boundary?deckToLocal(a,selected.boundary):a.position).applyMatrix4(selected.root.matrixWorld);
  const offset=camera.position.clone().sub(orbit.target).normalize().multiplyScalar(5);
  orbit.target.copy(point);camera.position.copy(point).add(offset);orbit.update();
 }
 function transformed(){
  if(preset.seed!==seed)return;
  const a=anchor(true);if(!a)return;
  selected.root.updateWorldMatrix(true,false);point.copy(handle.position);selected.root.worldToLocal(point);
  if(selected.boundary)Object.assign(a,localToDeck(point,selected.boundary));else a.position=point.toArray().map(n=>Math.max(-100,Math.min(100,n)));
  const inverse=selected.root.getWorldQuaternion(new THREE.Quaternion()).invert();
  a.rotation=new THREE.Euler().setFromQuaternion(inverse.multiply(handle.quaternion)).toArray().slice(0,3);
  a.scale=handle.scale.toArray().map(v=>Math.max(.05,Math.min(100,v)));fire.invalidate();
 }
 function download(){const blob=new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='knotty-pine-world-fire.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('JSON экспортирован.');}
 function downloadValue(value,name,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function settingsFor(a=anchor()){return validateComposition({name:effect().name,layers:a.layers,emitter:a.emitter,cycle:runtime.cycleFor(selected),...(a.original?{original:a.original}:{})});}
 async function copyToClipboard(){if(!anchor()){message('Выберите очаг для копирования.');return;}clipboardEffect=settingsFor();try{await navigator.clipboard.writeText(JSON.stringify(effectDocument(clipboardEffect)));}catch{}message('Настройки скопированы. Нажмите «Вставить настройки» на другом очаге.');}
 function stopPreview(){if(!preview)return;scene.remove(preview.root);if(preview.cameraPosition){camera.position.copy(preview.cameraPosition);orbit.target.copy(preview.cameraTarget);orbit.update();}preview=null;if(interaction.mode==='preview')interaction.set(anchorId?'editing':'idle');if(panel)panel.querySelector('[data-action=stop-preview]').hidden=true;fire.invalidate();}
 function armPreset(id){if(interaction.mode!=='placing')cancelPlacement(false);presetId=id;const value=effect();addKind=value.layers.flame?'fire':value.layers.coals?'smolder':value.layers.smoke?'smoke':'sparks';snapId=null;startPlacement();view.library.used(id);}
 function previewPreset(id){cancelPlacement(false);stopPreview();presetId=id;anchorId=null;interaction.set('preview');const value=effect(),root=new THREE.Group(),cameraPosition=camera.position.clone(),cameraTarget=orbit.target.clone();scene.add(root);if(selected?.id!=='world'){selected.root.updateWorldMatrix(true,false);selected.root.matrixWorld.decompose(root.position,root.quaternion,root.scale);}else root.position.copy(orbit.target).setY(0);
  const profile=selected?.key?.startsWith('pine:')?getPineFireProfile(selected.key):null;let anchors;
  if(profile&&(value.original?.mode==='tree'||COMPOSITION_PLACEMENT[id])){anchors=value.original?profile.anchors.map(p=>applyEffectPreset(newEffectAnchor([p.x,p.y,p.z],p.size),value)):createTreeComposition(profile,value,{seed:preset.seed,...COMPOSITION_PLACEMENT[id]});}
  else anchors=[applyEffectPreset(newEffectAnchor([0,.2,0]),value)];
  if(!profile){const target=root.localToWorld(new THREE.Vector3(0,.8,0)),offset=camera.position.clone().sub(orbit.target).normalize().multiplyScalar(4.5);orbit.target.copy(target);camera.position.copy(target).add(offset);orbit.update();}
  preview={cameraPosition,cameraTarget,root,key:'world',id:'studio:preview',height:profile?.height??1,anchors,cycle:copy(value.cycle??defaultBurnCycle())};fire.restart();fire.setPaused(false);panel.querySelector('[data-action=stop-preview]').hidden=false;refresh();view.library.used(id);
 }
 function addCustom(value){if(preset.customPresets.length>=32)throw Error('Максимум 32 пользовательских пресета.');const v=validateComposition(value);v.name=uniquePresetName(v.name,preset.customPresets);mutation(()=>{preset.customPresets.push(v);presetId='user:'+(preset.customPresets.length-1);});message('Импортирован эффект: '+v.name);}
 async function importValue(file,{effectOnly=false}={}){if(!file)return;try{if(file.size>4*1024*1024)throw Error('Файл больше 4 МБ.');const raw=JSON.parse(await file.text());if(effectOnly||raw.version===undefined||raw.format==='knottyPine.effect'){addCustom(parseEffect(raw));return;}const value=upgradePreset(raw);localStorage.setItem(IMPORT_BACKUP,JSON.stringify(preset));history.push(value);stopPreview();restore(value);message(value.seed===seed?'Пресет импортирован. Предыдущее состояние доступно через восстановление.':'Пресет импортирован. Примените seed '+value.seed+' в разделе сцены.');}catch(error){message('Не удалось импортировать JSON: '+error.message);}}

 function applySeed(value){const url=new URL(location.href);url.searchParams.set('seed',String(value>>>0));persist();location.href=url.href;}
 function ui(){
  view=createEffectPanel({onLayout:resize});panel=view.element;document.body.append(panel);
  const $=name=>panel.querySelector('[name="'+name+'"]');
  panel.addEventListener('focusin',()=>keys.clear());
  panel.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.dataset.previewPreset){previewPreset(button.dataset.previewPreset);return;}
   if(button.dataset.addPreset){createImmediately(button.dataset.addPreset);return;}
   if(button.dataset.placePreset){armPreset(button.dataset.placePreset);return;}
   if(button.dataset.userAction){const index=Number(button.dataset.userIndex),value=preset.customPresets[index];if(!value)return;const action=button.dataset.userAction;if(action==='export'){downloadValue(effectDocument(value),'knotty-pine-effect.json');return;}if(action==='delete'&&!window.confirm('Удалить пресет «'+value.name+'» из библиотеки? Размещённые эффекты останутся.'))return;let name;if(action==='rename'){name=window.prompt('Новое название пресета',value.name)?.trim();if(!name)return;if(name.length>60||preset.customPresets.some((v,i)=>i!==index&&v.name===name)){message('Нужно уникальное название до 60 символов.');return;}}if(action==='duplicate'&&preset.customPresets.length>=32){message('Максимум 32 пользовательских пресета.');return;}mutation(()=>{if(action==='rename'){view.library.rename(value.name,name);value.name=name;}if(action==='delete'){preset.customPresets.splice(index,1);presetId='calm';}if(action==='duplicate'){const v=copy(value);v.name=uniquePresetName(v.name,preset.customPresets);preset.customPresets.push(v);presetId='user:'+(preset.customPresets.length-1);}});return;}
   if(button.dataset.addKind){addKind=button.dataset.addKind;createImmediately({fire:'calm',smoke:'thinSmoke',sparks:'sparkStream',smolder:'smolder'}[addKind]);return;}
   if(button.dataset.composition){presetId=button.dataset.composition;if(anchor()&&!placing())mutation(()=>applyEffectPreset(anchor(true),effect()));else refresh();return;}
   if(button.dataset.mode){gizmo.setMode(button.dataset.mode);panel.querySelectorAll('[data-mode]').forEach(b=>b.dataset.active=String(b===button));return;}
   if(button.dataset.chooseLayer){view.chooseLayer(button.dataset.chooseLayer);refresh();return;}
   if(button.dataset.resetKind){const kind=button.dataset.resetKind,key=button.dataset.resetParam;mutation(()=>{const a=anchor(true);if(kind==='overall'){a.scale.fill(1);}else if(kind==='original'){const value=effect().original??validateAndNormalizePreset({});updateOriginalSettings(a,{[key]:value[key]},defaultLayer,defaultEmitter);}else if(kind==='cycle')runtime.cycleFor(selected,true)[key]=cycleFields[key].value;else if(a){const value=(kind==='emitter'?effect().emitter:effect().layers[kind])?.[key]??(kind==='emitter'?EMITTER_FIELDS:LAYER_FIELDS[kind])[key].value;(kind==='emitter'?a.emitter:a.layers[kind])[key]=value;if(kind==='flame'&&key==='shape')applyFlameForm(a.layers.flame,value);}});return;}
   const action=({'scene-focus':'focus','scene-duplicate':'duplicate','scene-delete':'delete'})[button.dataset.action]??button.dataset.action,a=anchor();
   if(action==='save'){if(persist())message('Эффект сохранён. Для файла используйте «Экспорт».');return;}
   if(action==='stop-preview'){stopPreview();refresh();return;}
   if(action==='import-effect'){$('library-file').click();return;}
   if(action==='restore-import'){const saved=localStorage.getItem(IMPORT_BACKUP);if(!saved){message('Нет сохранённого состояния перед импортом.');return;}try{const value=upgradePreset(JSON.parse(saved));history.push(value);restore(value);message('Восстановлено состояние перед импортом.');}catch(e){message(e.message);}return;}
   if(action==='export-code'&&a?.original){downloadValue(integrationExample(a.original),'knotty-pine-fire-integration.js','text/javascript');return;}
   if(action==='export-original'&&a?.original){downloadValue(a.original,'fire-studio-original.json');return;}
   if(action==='restore-preset'&&a){mutation(()=>{applyEffectPreset(anchor(true),effect());if(selected.id!=='world')Object.assign(runtime.cycleFor(selected,true),copy(effect().cycle??defaultBurnCycle()));});return;}
   if(action==='paste'&&a){void(async()=>{try{const value=clipboardEffect??parseEffect(JSON.parse(await navigator.clipboard.readText()));mutation(()=>{applyEffectPreset(anchor(true),value);if(selected.id!=='world')Object.assign(runtime.cycleFor(selected,true),copy(value.cycle));});message('Настройки вставлены. Положение сохранено.');}catch(e){message('Не удалось вставить настройки: '+e.message);}})();return;}
   if(action==='close'){close();return;}
   if(action==='reset-all-effects'){
    if(!window.confirm('Сбросить все сохранённые эффекты огня, дыма, искр и тления, включая пользовательские пресеты?\nРекорды и настройки игры сохранятся. Отменить сброс после подтверждения нельзя.'))return;
    try{localStorage.removeItem(EFFECT_STORAGE);localStorage.removeItem(IMPORT_BACKUP);}catch{message('Не удалось очистить сохранённые эффекты. Проверьте настройки хранения браузера.');return;}
    location.reload();
    return;
   }
   if(action==='focus')focusAnchor();
   if(action==='next'&&selected){const copies=sources().filter(s=>s.key===selected.key);const i=copies.findIndex(s=>s.root===selected.root);if(copies.length)choose(copies[(i+1)%copies.length]);}
   if(action==='add'){if(!cancelPlacement())armPreset(presetId);}
   if(action==='snap'&&a){reanchorSource=selected;snapId=a.id;startPlacement('reanchoring');}
   if(action==='delete'&&a)mutation(()=>{const items=list(true);items.splice(items.findIndex(v=>v.id===a.id),1);anchorId=null;interaction.set('idle');});
   if(action==='duplicate'&&a){if(list().length>=MAX_ANCHORS){message('Достигнут лимит очагов — максимум 32 на объект');return;}const result=sceneTransaction(()=>{const b=copy(a);b.id=uniqueEffectId(preset);b.name=(effectLabel(a)+' — копия').slice(0,60);if(!selected.boundary)b.position[0]+=.2;list(true).push(b);return b;});if(result){anchorId=result.id;interaction.set('editing');refresh();message('Эффект создан. Эффект сохранён');}}
   if(action==='reset'&&selected)mutation(()=>{const values=selected.id==='world'?[]:selected.boundary?defaults.deck:defaults.plants[selected.key];list(true).splice(0,list().length,...copy(values));anchorId=null;});
   if(action==='undo')restore(history.undo());if(action==='redo')restore(history.redo());
   if(action==='export')download();if(action==='copy')void copyToClipboard();if(action==='import')$('file').click();
   if(action==='pause-effects'){fire.setPaused(!fire.paused);refresh();}
   if(action==='restart-effects'){fire.restart();refresh();}
   if(action==='pause-cycle'&&selected){mutation(()=>{const cycle=runtime.cycleFor(selected,true);cycle.paused=!cycle.paused;if(cycle.paused)cycle.stage=fire.cycleProgress(selected.id)?.progress??cycle.stage;});}
   if(action==='restart-cycle'&&selected){mutation(()=>{runtime.cycleFor(selected,true).stage=0;fire.restartCycle(selected.id);});}
   if(action==='add-layer'&&a&&$('add-layer').value)mutation(()=>{const kind=$('add-layer').value;anchor(true).layers[kind]=defaultLayer(kind);view.chooseLayer(kind);});
   if(action==='delete-layer'&&a)mutation(()=>{delete anchor(true).layers[view.layer];});
   if(action==='reset-layer'&&a?.layers[view.layer])mutation(()=>{anchor(true).layers[view.layer]=defaultLayer(view.layer);});
   if((action==='apply-object'||action==='apply-group')&&a){
    const targets=action==='apply-object'?[selected]:preset.group.map(id=>sources().find(s=>s.id===id)).filter(Boolean);if(!targets.length){message('Сначала добавьте объекты в группу.');return;}if(!window.confirm('Применить настройки ко всем очагам объектов: '+targets.map(v=>v.key==='world'?'Свободные эффекты сцены':v.boundary?'Деревянная переправа':(LABELS[PINE_SPECIES.indexOf(v.key)]??'Дерево')+' №'+v.binding.id).join(', ')+'? Позиции сохранятся.'))return;
    const settings={...(a.original?{original:copy(a.original)}:{}),layers:copy(a.layers),emitter:copy(a.emitter),cycle:copy(runtime.cycleFor(selected))};
    mutation(()=>{const targets=action==='apply-object'?[selected]:preset.group.map(id=>sources().find(s=>s.id===id)).filter(Boolean);for(const source of targets){for(const item of runtime.anchorsFor(source,true))applyEffectPreset(item,settings);if(source.id!=='world')Object.assign(runtime.cycleFor(source,true),settings.cycle);}});
    message(action==='apply-group'?'Настройки явно применены к группе.':'Настройки применены к очагам объекта.');
   }
   if(action==='clear-group')mutation(()=>preset.group=[]);
   if(action==='save-named'&&a){
    const name=$('preset-name').value.trim();if(!name){message('Введите имя пресета.');return;}
    if(preset.customPresets.length>=32&&!preset.customPresets.some(v=>v.name===name)){message('Максимум 32 пользовательских пресета.');return;}
    mutation(()=>{const value={name,...(a.original?{original:copy(a.original)}:{}),layers:copy(a.layers),emitter:copy(a.emitter),cycle:copy(runtime.cycleFor(selected))},index=preset.customPresets.findIndex(v=>v.name===name);if(index<0){preset.customPresets.push(value);presetId='user:'+(preset.customPresets.length-1);}else{preset.customPresets[index]=value;presetId='user:'+index;}});message('Пресет сохранён: '+name);
   }
   if(action==='distribute'&&selected?.key.startsWith('pine:')){
    const count=Number($('distribution-count').value),minHeight=Number($('distribution-min').value),maxHeight=Number($('distribution-max').value),minSize=Number($('distribution-size-min').value),maxSize=Number($('distribution-size-max').value),distributionSeed=Number($('distribution-seed').value);
    if(!Number.isInteger(count)||count<1||count>32||![minHeight,maxHeight,minSize,maxSize,distributionSeed].every(Number.isFinite)||minHeight<0||maxHeight>1||minHeight>maxHeight||minSize<.1||maxSize>3||minSize>maxSize||!Number.isInteger(distributionSeed)||distributionSeed<0||distributionSeed>0xffffffff){message('Проверьте диапазоны высоты, масштаба, количество и seed.');return;}
    const values=distributeAnchors(getPineFireProfile(selected.key),{count,minHeight,maxHeight,minSize,maxSize,seed:distributionSeed,effect:effect()});
    if(!values.length){message('В этом диапазоне высоты нет точек поверхности.');return;}
    mutation(()=>{list(true).splice(0,list().length,...values);anchorId=values[0].id;});
   }
   if(action==='seed'){const value=Number($('seed').value);if(Number.isInteger(value)&&value>=0&&value<=0xffffffff){preset.seed=value;for(const entry of Object.values(preset.objects))entry.binding.seed=value;applySeed(value);}else message('Seed: целое число от 0 до 4294967295.');}
  });
  $('species').onchange=e=>chooseSpecies(e.target.value);
  $('anchor').onchange=e=>{const source=selected,id=e.target.value;cancelPlacement(false);stopPreview();choose(source,{focus:false,preservePlacement:false});anchorId=id;interaction.set(anchorId?'editing':'idle');refresh();};
  $('scene-effects').onchange=e=>{const entry=sceneEntries().find(v=>v.key===e.target.value&&v.available);if(!entry)return;cancelPlacement(false);stopPreview();const target=sources().find(v=>v.id===entry.sourceId);choose(target,{focus:false,preservePlacement:false});anchorId=entry.id;interaction.set('editing');refresh();focusAnchor();};
  $('effect-preset').onchange=e=>{stopPreview();presetId=e.target.value;const value=effect();addKind=value.layers.flame?'fire':value.layers.coals?'smolder':value.layers.smoke?'smoke':'sparks';if(placing()){armPreset(presetId);return;}if(anchor())mutation(()=>{applyEffectPreset(anchor(true),value);if((presetId.startsWith('user:')||value.original)&&selected.id!=='world'&&value.cycle)Object.assign(runtime.cycleFor(selected,true),value.cycle);});else refresh();};
  $('cycle-mode').onchange=e=>mutation(()=>{runtime.cycleFor(selected,true).mode=e.target.value;});
  $('cycle-curve').onchange=e=>mutation(()=>{runtime.cycleFor(selected,true).curve=e.target.value;});
  $('cycle-repeat').onchange=e=>mutation(()=>{runtime.cycleFor(selected,true).repeat=e.target.checked;});
  $('work-light').onchange=e=>{if(e.target.checked){scene.add(workLight);scene.fog=null;}else{scene.remove(workLight);scene.fog=previousFog;}};
  $('emitter-shape').onchange=e=>{if(anchor())mutation(()=>anchor(true).emitter.shape=e.target.value);};
  $('group-member').onchange=e=>mutation(()=>{if(e.target.checked){if(preset.group.length<128&&!preset.group.includes(selected.id))preset.group.push(selected.id);}else preset.group=preset.group.filter(id=>id!==selected.id);});
  $('budget').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=128&&v<=16384)mutation(()=>preset.budget=v);else{refresh();message('Бюджет: целое число 128…16384.');}};
  $('file').onchange=async e=>{await importValue(e.target.files[0]);e.target.value='';};
  $('library-file').onchange=async e=>{await importValue(e.target.files[0],{effectOnly:true});e.target.value='';};
  $('preview-quality').onchange=e=>fire.setQuality(e.target.value);
  $('timeline-speed').onchange=e=>fire.setPlaybackSpeed(Number(e.target.value));
  panel.addEventListener('input',e=>{
   const input=e.target,kind=input.dataset.kind,key=input.dataset.param;
   if(input.name==='timeline-time'||input.name==='timeline-number'){const n=input.valueAsNumber;if(Number.isFinite(n)&&n>=0&&n<=120){fire.setPaused(true);fire.seek(n);for(const name of ['timeline-time','timeline-number'])if($(name)!==input)$(name).value=n;panel.querySelector('[data-action=pause-effects]').textContent='Продолжить эффекты';}return;}
   if((!anchor()&&kind!=='cycle')||!kind||!key)return;
   if(preset.seed!==seed){message('Примените seed импортированного леса перед редактированием.');return;}
   if(kind==='overall'){const value=input.valueAsNumber;if(Number.isFinite(value)&&value>=.1&&value<=5)anchor(true).scale.fill(value);panel.querySelectorAll('[data-kind=overall]').forEach(v=>{if(v!==input)v.value=value;});return;}
   if(kind==='original'){const spec=ORIGINAL_FIELDS[key],value=input.valueAsNumber;if(!spec||!Number.isFinite(value)||value<spec[1]||value>spec[2])return;const a=anchor(true);updateOriginalSettings(a,{[key]:value},defaultLayer,defaultEmitter);if(selected.id!=='world'&&key==='spreadSpeed')Object.assign(runtime.cycleFor(selected,true),{speed:Math.max(.1,value),...(value<=.01?{mode:'constant'}:{})});panel.querySelectorAll('[data-kind=original]').forEach(v=>{if(v!==input&&v.dataset.param===key)v.value=value;});return;}
   const spec=(kind==='cycle'?cycleFields:kind==='emitter'?EMITTER_FIELDS:LAYER_FIELDS[kind])[key];
   const value=spec.type==='number'?input.valueAsNumber:input.value;
   if(spec.type==='number'&&(!Number.isFinite(value)||value<spec.min||value>spec.max||spec.integer&&!Number.isInteger(value)))return;
   if(kind==='cycle')runtime.cycleFor(selected,true)[key]=value;else{const a=anchor(true);(kind==='emitter'?a.emitter:a.layers[kind])[key]=value;if(kind==='flame'&&key==='shape')applyFlameForm(a.layers.flame,value);}
   panel.querySelectorAll('[data-kind="'+kind+'"][data-param="'+key+'"]').forEach(other=>{if(other!==input)other.value=value;});
   fire.invalidate();
  });
  panel.addEventListener('change',e=>{
   const input=e.target;if(['original-quality','original-mode'].includes(input.name)&&anchor()?.original){mutation(()=>{const a=anchor(true);updateOriginalSettings(a,{[input.name==='original-mode'?'mode':'quality']:input.value},defaultLayer,defaultEmitter);if(input.name==='original-mode'&&selected.id!=='world')Object.assign(runtime.cycleFor(selected,true),originalComposition(a.original,defaultLayer,defaultEmitter).cycle);});return;}if(!anchor()&&input.dataset.kind!=='cycle')return;
   if(input.dataset.enableLayer){mutation(()=>anchor(true).layers[input.dataset.enableLayer].enabled=input.checked);return;}
   if(input.dataset.kind){if(input.dataset.kind==='overall'&&anchor())handle.scale.fromArray(anchor().scale);commit(input.tagName==='SELECT');return;}
   const match=/^(position|rotation|scale)([012])$/.exec(input.name??'');
   if(match){const n=Number(input.value);if(!Number.isFinite(n)||Math.abs(n)>(match[1]==='rotation'?3600:100)||(match[1]==='scale'&&n<.05)){refresh();message('Значение вне диапазона.');return;}
    mutation(()=>{const a=anchor(true);a[match[1]][Number(match[2])]=match[1]==='rotation'?THREE.MathUtils.degToRad(n):n;if(selected.boundary)Object.assign(a,localToDeck(new THREE.Vector3(...deckToLocal(a,selected.boundary)),selected.boundary));});
   }
  });
 }
 let snapId=null,previousFog;
 const workLight=new THREE.HemisphereLight(0xffecd1,0x849478,2.5);
 function keydown(e){
  e.stopImmediatePropagation();
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();if(persist())message('Сохранено в браузере.');return;}
  if(e.code==='Tab')return;
  if(e.code==='Escape'&&cancelPlacement()){e.preventDefault();return;}
  if(e.code==='Escape'&&interaction.mode==='preview'){e.preventDefault();stopPreview();refresh();return;}
  if(editableTarget(e)&&e.target.matches('input,select,textarea')){if(e.code==='Escape'){e.target.blur();e.preventDefault();}return;}
  if(e.code==='Escape'){e.preventDefault();close();return;}
  if(editableTarget(e))return;
  e.preventDefault();
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){restore(e.shiftKey?history.redo():history.undo());return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){restore(history.redo());return;}
  if(e.code==='Space'){fire.setPaused(!fire.paused);refresh();return;}
  if(e.code==='KeyF'&&selected)focusAnchor();
  if(e.code==='Delete'&&!placing()&&interaction.mode==='editing'&&anchor())mutation(()=>{const a=anchor();const items=list(true);items.splice(items.findIndex(v=>v.id===a.id),1);anchorId=null;});
  keys.add(e.code);
 }
 function open(){
  if(active)return;active=true;setSuspended(true);reopen.hidden=true;document.body.classList.add('world-editor-open');abort=new AbortController();
  previousFog=scene.fog;scene.fog=null;scene.add(workLight);
  makeDemo();markers=new THREE.Group();scene.add(markers);
  orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.dampingFactor=.12;
  gizmo=new TransformControls(camera,canvas);gizmo.setSpace('local');gizmo.setSize(.85);scene.add(gizmo);
  gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;if(e.value)dragged=true;else{transformed();commit();}});
  gizmo.addEventListener('objectChange',transformed);
  ui();fire.setQuality('medium');resize();chooseSpecies(PINE_SPECIES[0]);fire.invalidate();
  orbit.addEventListener('change',()=>{if(placing())placementDirty=true;});
  canvas.addEventListener('pointermove',e=>{if(placing()&&!e.buttons){lastPointer={clientX:e.clientX,clientY:e.clientY};placementDirty=true;}},{signal:abort.signal});
  canvas.addEventListener('pointerleave',()=>{ghostRoot.visible=false;lastPointer=null;if(panel){panel.dataset.placementPreview='false';delete panel.dataset.placementTarget;}},{signal:abort.signal});
  window.addEventListener('resize',resize,{signal:abort.signal});
  window.addEventListener('keydown',keydown,{capture:true,signal:abort.signal});
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(!editableTarget(e)){e.stopImmediatePropagation();e.preventDefault();}},{capture:true,signal:abort.signal});
  window.addEventListener('blur',()=>keys.clear(),{signal:abort.signal});
  canvas.addEventListener('pointerdown',e=>{dragged=false;pointerStart={x:e.clientX,y:e.clientY};},{capture:true,signal:abort.signal});
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;},{signal:abort.signal});
  canvas.addEventListener('pointerup',pick,{signal:abort.signal});
 }
 function close(){
  if(!active)return;cancelPlacement(false);active=false;stopPreview();fire.setPaused(false);fire.setPlaybackSpeed(1);fire.setQuality('high');persist();abort.abort();keys.clear();orbit.dispose();gizmo.detach();gizmo.dispose();scene.remove(gizmo,markers);panel.remove();panel=null;view=null;markers=null;orbit=null;gizmo=null;abort=null;selected=null;snapId=null;interaction.set('idle');
  if(demo)scene.remove(demo);
  scene.fog=previousFog;scene.remove(workLight);
  document.body.classList.remove('world-editor-open');canvas.style.position='';canvas.style.left='';canvas.style.top='';renderer.setSize(innerWidth,innerHeight);fire.invalidate();update(0);fire.releaseUnused();setSuspended(false);reopen.hidden=false;
 }
 function update(dt){
  if(active){
   if(editableTarget({target:document.activeElement}))keys.clear();
   if(keys.size){const velocity=new THREE.Vector3();camera.getWorldDirection(velocity);velocity.y=0;velocity.normalize();const right=new THREE.Vector3().crossVectors(velocity,camera.up).normalize(),move=new THREE.Vector3();
    move.addScaledVector(velocity,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0));move.addScaledVector(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0));move.y+=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0);move.multiplyScalar(dt*(keys.has('ShiftLeft')?18:6));camera.position.add(move);orbit.target.add(move);
   }orbit.update();if(placing()&&placementDirty)updateGhost();
  }
  const ids=new Set([selected?.id,...preset.group]);
  const visibleSources=sources().filter(s=>ids.has(s.id)||s.id==='world'&&preset.world.length);
  if(active){if(preview)fire.update(dt,[preview],preset,{camera,pixelRatio:renderer.getPixelRatio()});else runtime.update(dt,{sources:visibleSources,camera,placementPreview:ghostRoot.visible?ghost:null});}else runtime.update(dt);
  if(active){const stats=fire.stats();for(const name of ['timeline-time','timeline-number']){const field=panel.querySelector('[name='+name+']');if(document.activeElement!==field)field.value=Math.min(120,stats.time).toFixed(2);}panel.querySelector('[data-metrics]').textContent=stats.anchors+' очагов · '+stats.particles+'/'+stats.budget+' частиц · пламя '+stats.flames+' · дым '+stats.smoke+' · искры '+stats.sparks+' · летящие угольки '+stats.embers+' · тление '+stats.coals+(stats.truncated?' · лимит':'');const state=selected?fire.cycleProgress(selected.id):null;const cycleText=panel.querySelector('[data-cycle-state]');if(state)cycleText.textContent=state.label+' · '+Math.round(state.progress*100)+'%';renderer.render(scene,camera);}
 }
 open();
 return {get active(){return active;},get mode(){return interaction.mode;},update,open,close,getPreset:()=>clonePreset(preset),stats:fire.stats,dispose(){close();if(demo){demo.userData.dispose?.();demo=null;}reopen.remove();scene.remove(handle);markerGeometry.dispose();markerMaterial.dispose();selectedMaterial.dispose();}};
}
