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
import {EFFECT_PRESETS,LAYER_FIELDS,EMITTER_FIELDS,defaultLayer,copy,applyEffectPreset,COMPOSITION_PLACEMENT} from './EffectLayers.js';
import {PINE_SPECIES,MAX_ANCHORS,newEffectAnchor,upgradePreset,readEffectPreset,saveEffectPreset,EFFECT_STORAGE,clonePreset,PresetHistory,deckToLocal,localToDeck,distributeAnchors} from './FirePreset.js';
import './WorldEditor.css';

const LABELS=['Сосновая группа','Ель бегуна','Таёжная ель','Сухая сосна','Секвойя','Сосна обыкновенная'];
const editableTarget=e=>e.target instanceof HTMLElement&&!!e.target.closest('input,select,textarea,button,summary');
export function createWorldEditor({scene,renderer,forest,seed,getRivers,getBurningPlants,setSuspended,defaultFireObjects,runtime}){
 const canvas=renderer.domElement,pineMeshes=forest.pickMeshes('pine');
 const camera=new THREE.PerspectiveCamera(55,1,.05,400);
 let active=false,selected=null,anchorId=null,armed=false,dragged=false,pointerStart=null,orbit,gizmo,abort,panel,markers,demo=null;
 const keys=new Set(),point=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const fire=runtime.fire,handle=new THREE.Object3D();scene.add(handle);
 const sources=()=>[...forest.plants.filter(p=>p.userData.plantSpecies.startsWith('pine:')).map(root=>runtime.sourceFor(root)),...getRivers().map(root=>runtime.sourceFor(root)),...(demo?.parent?[runtime.sourceFor(demo)]:[]),runtime.world];
 const defaults=runtime.defaults;
 let preset=runtime.preset,hasSavedPreset=!!readEffectPreset(),view,presetId='calm',addKind='fire',storageWarning='';
 let history=new PresetHistory(preset);
 const reopen=document.createElement('button');reopen.id='world-editor-reopen';reopen.textContent='Открыть редактор мира';reopen.hidden=true;document.body.append(reopen);reopen.onclick=()=>open();
 const list=(mutable=false)=>selected?runtime.anchorsFor(selected,mutable):[];
 const anchor=(mutable=false)=>list(mutable).find(a=>a.id===anchorId);
 const cycleFields={stage:{value:0,min:0,max:1,type:'number'},speed:{value:1,min:.1,max:5,type:'number'},duration:{value:24,min:2,max:120,type:'number'}};
 const effect=()=>presetId.startsWith('user:')?preset.customPresets[Number(presetId.slice(5))]??EFFECT_PRESETS.calm:EFFECT_PRESETS[presetId]??EFFECT_PRESETS.calm;
 function message(text){if(panel)panel.querySelector('output').textContent=storageWarning?storageWarning+' '+text:text;}
 function persist(){try{saveEffectPreset(preset);storageWarning='';return true;}catch{storageWarning='Не удалось сохранить в браузере. Экспортируйте JSON перед закрытием.';message('');return false;}}
 function commit(){history.push(preset);persist();refresh();}
 function mutation(fn){if(preset.seed!==seed){message('Примените seed импортированного леса в разделе сцены перед редактированием.');return;}fn();fire.invalidate();commit();}
 function restore(value){preset=value;runtime.setPreset(preset);anchorId=null;fire.invalidate();persist();refresh();}
 function makeDemo(){
  if(demo){scene.add(demo);return;}
  const records=[];createLavaRiverFactory(scene,records,{random:createForestRandom(seed)})(-12);
  demo=records[0].g;
  defaults.deck=demo.userData.deckFireAnchors.map(a=>Object.assign(newEffectAnchor([0,0,0],a.size),localToDeck(new THREE.Vector3(a.x,a.y,a.z),demo.userData.fireBoundary)));
  if(!hasSavedPreset&&!preset.deck.length){preset.deck=clonePreset(defaults.deck);history=new PresetHistory(preset);}
 }
 function choose(target,{focus=true}={}){
  selected=target?.id==='world'?runtime.world:target?runtime.sourceFor(target.root):null;anchorId=null;armed=false;snapId=null;fire.invalidate();
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
 function resize(){if(!active)return;const width=Math.max(200,innerWidth-(innerWidth<=700?260:310));renderer.setSize(width,innerHeight);camera.aspect=width/innerHeight;camera.updateProjectionMatrix();}
 function refresh(){
  if(!active)return;
  const a=anchor();gizmo.detach();
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
  view.refresh({preset,selected,anchor:a,list:list(),anchorId,history,armed,paused:fire.paused,presetId,addKind,cycle:selected?runtime.cycleFor(selected):undefined});
  message(armed?(snapId?'Щёлкните по поверхности для привязки очага.':'Щёлкните по поверхности или свободной точке сцены.'):a?'Изменяется только выбранный очаг. Массовые действия находятся в отдельном разделе.':'Выберите очаг или добавьте новый эффект.');
 }
 const markerGeometry=new THREE.SphereGeometry(.10,8,6),markerMaterial=new THREE.MeshBasicMaterial({color:0xffca80,depthTest:false}),selectedMaterial=new THREE.MeshBasicMaterial({color:0xcfff72,depthTest:false});
 function surfaceHit(event){
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects([...pineMeshes,...(demo?[demo]:[]),...getRivers()],true);
 }
 function pick(event){
  if(event.button!==0||dragged||!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;
  const hits=surfaceHit(event);
  if(!armed){const hit=ray.intersectObjects(markers.children)[0];if(hit){anchorId=hit.object.userData.anchorId;refresh();return;}}
  let target=null,worldHit=null;
  if(armed&&!snapId&&panel.querySelector('[name=placement]').value==='world'){
   worldHit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());target=runtime.world;
  }else for(const hit of hits){
   const plant=forest.resolveInstance(hit.object,hit.instanceId);
   if(plant?.species.startsWith('pine:'))target=runtime.sourceFor(plant.root);
   else{let root=hit.object;while(root&&!root.userData.fireBoundary)root=root.parent;if(root&&hit.object.userData.fireDeckSurface)target=runtime.sourceFor(root);}
   if(target){worldHit=hit.point.clone();break;}
  }
  if(!target||!worldHit){if(armed)message('Нажмите на видимую сосну, деревянную кромку или выберите свободное размещение.');return;}
  const adding=armed,oldSource=selected,oldId=snapId,oldAnchor=oldId?copy(anchor()):null;
  if(!adding){choose(target,{focus:false});return;}
  if(runtime.anchorsFor(target).length>=MAX_ANCHORS&&target.id!==oldSource?.id){message('Максимум 32 очага на объект.');return;}
  mutation(()=>{
   const local=target.root.worldToLocal(worldHit);
   let a;
   const composition=COMPOSITION_PLACEMENT[presetId];
   if(!oldAnchor&&composition&&target.key.startsWith('pine:')){
    const items=runtime.anchorsFor(target,true),space=MAX_ANCHORS-items.length;
    if(space<=0){message('Максимум 32 очага.');return;}
    const created=createTreeComposition(getPineFireProfile(target.key),effect(),{seed:preset.seed,...composition,count:Math.min(space,composition.count)});
    for(const item of created)if(items.some(v=>v.id===item.id))item.id=crypto.randomUUID();
    items.push(...created);choose(target,{focus:false});anchorId=created[0]?.id??null;armed=false;snapId=null;return;
   }
   if(oldAnchor){
    a=oldAnchor;
    const q=oldSource.root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.rotation)));
    a.rotation=new THREE.Euler().setFromQuaternion(target.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)).toArray().slice(0,3);
    const oldList=runtime.anchorsFor(oldSource,true);oldList.splice(oldList.findIndex(v=>v.id===oldId),1);
   }else{a=applyEffectPreset(newEffectAnchor(local.toArray(),target.boundary?.22:.6),effect());}
   if(target.boundary)Object.assign(a,localToDeck(local,target.boundary));else a.position=local.toArray().map(n=>Math.max(-100,Math.min(100,n)));
   const targetList=runtime.anchorsFor(target,true);if(targetList.some(v=>v.id===a.id))a.id=crypto.randomUUID();
   targetList.push(a);choose(target,{focus:false});anchorId=a.id;armed=false;snapId=null;
  });
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
 async function copyToClipboard(){try{await navigator.clipboard.writeText(JSON.stringify(preset,null,2));message('Настройки скопированы.');}catch{message('Буфер обмена недоступен — используйте «Экспорт».');}}
 function applySeed(value){const url=new URL(location.href);url.searchParams.set('seed',String(value>>>0));persist();location.href=url.href;}
 function ui(){
  view=createEffectPanel();panel=view.element;document.body.append(panel);
  const $=name=>panel.querySelector('[name="'+name+'"]');
  panel.addEventListener('focusin',()=>keys.clear());
  panel.addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.dataset.addKind){addKind=button.dataset.addKind;presetId={fire:'calm',smoke:'thinSmoke',sparks:'sparkStream',smolder:'smolder'}[addKind];anchorId=null;snapId=null;armed=true;refresh();return;}
   if(button.dataset.composition){presetId=button.dataset.composition;if(anchor()&&!armed)mutation(()=>applyEffectPreset(anchor(true),effect()));else refresh();return;}
   if(button.dataset.mode){gizmo.setMode(button.dataset.mode);panel.querySelectorAll('[data-mode]').forEach(b=>b.dataset.active=String(b===button));return;}
   if(button.dataset.chooseLayer){view.chooseLayer(button.dataset.chooseLayer);refresh();return;}
   if(button.dataset.resetKind){const kind=button.dataset.resetKind,key=button.dataset.resetParam;mutation(()=>{const a=anchor(true);if(kind==='cycle')runtime.cycleFor(selected,true)[key]=cycleFields[key].value;else if(a)(kind==='emitter'?a.emitter:a.layers[kind])[key]=(kind==='emitter'?EMITTER_FIELDS:LAYER_FIELDS[kind])[key].value;});return;}
   const action=button.dataset.action,a=anchor();
   if(action==='close'){close();return;}
   if(action==='reset-all-effects'){
    if(!window.confirm('Сбросить все сохранённые эффекты огня, дыма, искр и тления, включая пользовательские пресеты?\nРекорды и настройки игры сохранятся. Отменить сброс после подтверждения нельзя.'))return;
    try{localStorage.removeItem(EFFECT_STORAGE);}catch{message('Не удалось очистить сохранённые эффекты. Проверьте настройки хранения браузера.');return;}
    location.reload();
    return;
   }
   if(action==='focus')focusAnchor();
   if(action==='next'&&selected){const copies=sources().filter(s=>s.key===selected.key);const i=copies.findIndex(s=>s.root===selected.root);if(copies.length)choose(copies[(i+1)%copies.length]);}
   if(action==='add'){snapId=null;armed=!armed;anchorId=null;refresh();}
   if(action==='snap'&&a){snapId=a.id;armed=true;message('Щёлкните по поверхности: очаг будет привязан к выбранному объекту.');}
   if(action==='delete'&&a)mutation(()=>{const items=list(true);items.splice(items.findIndex(v=>v.id===a.id),1);anchorId=null;});
   if(action==='duplicate'&&a&&list().length<MAX_ANCHORS)mutation(()=>{const b=copy(a);b.id=crypto.randomUUID();if(!selected.boundary)b.position[0]+=.2;list(true).push(b);anchorId=b.id;});
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
    const settings={layers:copy(a.layers),emitter:copy(a.emitter),cycle:copy(runtime.cycleFor(selected))};
    mutation(()=>{const targets=action==='apply-object'?[selected]:preset.group.map(id=>sources().find(s=>s.id===id)).filter(Boolean);for(const source of targets){for(const item of runtime.anchorsFor(source,true))applyEffectPreset(item,settings);if(source.id!=='world')Object.assign(runtime.cycleFor(source,true),settings.cycle);}});
    message(action==='apply-group'?'Настройки явно применены к группе.':'Настройки применены к очагам объекта.');
   }
   if(action==='clear-group')mutation(()=>preset.group=[]);
   if(action==='save-named'&&a){
    const name=$('preset-name').value.trim();if(!name){message('Введите имя пресета.');return;}
    if(preset.customPresets.length>=32&&!preset.customPresets.some(v=>v.name===name)){message('Максимум 32 пользовательских пресета.');return;}
    mutation(()=>{const value={name,layers:copy(a.layers),emitter:copy(a.emitter),cycle:copy(runtime.cycleFor(selected))},index=preset.customPresets.findIndex(v=>v.name===name);if(index<0){preset.customPresets.push(value);presetId='user:'+(preset.customPresets.length-1);}else{preset.customPresets[index]=value;presetId='user:'+index;}});message('Пресет сохранён: '+name);
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
  $('anchor').onchange=e=>{anchorId=e.target.value;refresh();};
  $('effect-preset').onchange=e=>{presetId=e.target.value;const value=effect();addKind=value.layers.flame?'fire':value.layers.coals?'smolder':value.layers.smoke?'smoke':'sparks';if(anchor())mutation(()=>{applyEffectPreset(anchor(true),value);if(presetId.startsWith('user:')&&selected.id!=='world'&&value.cycle)Object.assign(runtime.cycleFor(selected,true),value.cycle);});else refresh();};
  $('cycle-mode').onchange=e=>mutation(()=>{runtime.cycleFor(selected,true).mode=e.target.value;});
  $('cycle-repeat').onchange=e=>mutation(()=>{runtime.cycleFor(selected,true).repeat=e.target.checked;});
  $('work-light').onchange=e=>{if(e.target.checked){scene.add(workLight);scene.fog=null;}else{scene.remove(workLight);scene.fog=previousFog;}};
  $('emitter-shape').onchange=e=>{if(anchor())mutation(()=>anchor(true).emitter.shape=e.target.value);};
  $('group-member').onchange=e=>mutation(()=>{if(e.target.checked){if(preset.group.length<128&&!preset.group.includes(selected.id))preset.group.push(selected.id);}else preset.group=preset.group.filter(id=>id!==selected.id);});
  $('budget').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=128&&v<=16384)mutation(()=>preset.budget=v);else{refresh();message('Бюджет: целое число 128…16384.');}};
  $('file').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   try{if(file.size>4*1024*1024)throw Error('Файл больше 4 МБ.');const value=upgradePreset(JSON.parse(await file.text()));history.push(value);restore(value);message(value.seed===seed?'Пресет импортирован.':'Пресет импортирован. Примените seed '+value.seed+' в разделе сцены.');}catch(error){message('Не удалось импортировать JSON: '+error.message);}e.target.value='';
  };
  panel.addEventListener('input',e=>{
   const input=e.target,kind=input.dataset.kind,key=input.dataset.param;
   if((!anchor()&&kind!=='cycle')||!kind||!key)return;
   if(preset.seed!==seed){message('Примените seed импортированного леса перед редактированием.');return;}
   const spec=(kind==='cycle'?cycleFields:kind==='emitter'?EMITTER_FIELDS:LAYER_FIELDS[kind])[key];
   const value=spec.type==='number'?input.valueAsNumber:input.value;
   if(spec.type==='number'&&(!Number.isFinite(value)||value<spec.min||value>spec.max||spec.integer&&!Number.isInteger(value)))return;
   if(kind==='cycle')runtime.cycleFor(selected,true)[key]=value;else{const a=anchor(true);(kind==='emitter'?a.emitter:a.layers[kind])[key]=value;if(kind==='flame'&&key==='shape')applyFlameForm(a.layers.flame,value);}
   panel.querySelectorAll('[data-kind="'+kind+'"][data-param="'+key+'"]').forEach(other=>{if(other!==input)other.value=value;});
   fire.invalidate();
  });
  panel.addEventListener('change',e=>{
   const input=e.target;if(!anchor()&&input.dataset.kind!=='cycle')return;
   if(input.dataset.enableLayer){mutation(()=>anchor(true).layers[input.dataset.enableLayer].enabled=input.checked);return;}
   if(input.dataset.kind){commit();return;}
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
  if(e.code==='Escape'){e.preventDefault();close();return;}
  if(editableTarget(e))return;
  e.preventDefault();
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){restore(e.shiftKey?history.redo():history.undo());return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){restore(history.redo());return;}
  if(e.code==='KeyF'&&selected)focusAnchor();
  if(e.code==='Delete'&&anchor())mutation(()=>{const a=anchor();const items=list(true);items.splice(items.findIndex(v=>v.id===a.id),1);anchorId=null;});
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
  ui();resize();chooseSpecies(PINE_SPECIES[0]);fire.invalidate();
  window.addEventListener('resize',resize,{signal:abort.signal});
  window.addEventListener('keydown',keydown,{capture:true,signal:abort.signal});
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(!editableTarget(e)){e.stopImmediatePropagation();e.preventDefault();}},{capture:true,signal:abort.signal});
  window.addEventListener('blur',()=>keys.clear(),{signal:abort.signal});
  canvas.addEventListener('pointerdown',e=>{dragged=false;pointerStart={x:e.clientX,y:e.clientY};},{capture:true,signal:abort.signal});
  canvas.addEventListener('pointerup',pick,{signal:abort.signal});
 }
 function close(){
  if(!active)return;active=false;fire.setPaused(false);persist();abort.abort();keys.clear();orbit.dispose();gizmo.detach();gizmo.dispose();scene.remove(gizmo,markers);panel.remove();panel=null;view=null;markers=null;orbit=null;gizmo=null;abort=null;selected=null;snapId=null;armed=false;
  if(demo)scene.remove(demo);
  scene.fog=previousFog;scene.remove(workLight);
  document.body.classList.remove('world-editor-open');renderer.setSize(innerWidth,innerHeight);fire.invalidate();update(0);setSuspended(false);reopen.hidden=false;
 }
 function update(dt){
  if(active){
   if(editableTarget({target:document.activeElement}))keys.clear();
   if(keys.size){const velocity=new THREE.Vector3();camera.getWorldDirection(velocity);velocity.y=0;velocity.normalize();const right=new THREE.Vector3().crossVectors(velocity,camera.up).normalize(),move=new THREE.Vector3();
    move.addScaledVector(velocity,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0));move.addScaledVector(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0));move.y+=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0);move.multiplyScalar(dt*(keys.has('ShiftLeft')?18:6));camera.position.add(move);orbit.target.add(move);
   }orbit.update();
  }
  const ids=new Set([selected?.id,...preset.group]);
  const visibleSources=sources().filter(s=>ids.has(s.id)||s.id==='world'&&preset.world.length);
  if(active)runtime.update(dt,{sources:visibleSources,camera});else runtime.update(dt);
  if(active){const stats=fire.stats();panel.querySelector('[data-metrics]').textContent=stats.anchors+' очагов · '+stats.particles+'/'+stats.budget+' частиц · пламя '+stats.flames+' · дым '+stats.smoke+' · искры '+stats.sparks+' · летящие угольки '+stats.embers+' · тление '+stats.coals+(stats.truncated?' · лимит':'');const state=selected?fire.cycleProgress(selected.id):null;const cycleText=panel.querySelector('[data-cycle-state]');if(state)cycleText.textContent=state.label+' · '+Math.round(state.progress*100)+'%';renderer.render(scene,camera);}
 }
 open();
 return {get active(){return active;},update,open,close,getPreset:()=>clonePreset(preset),stats:fire.stats,dispose(){close();if(demo){demo.userData.dispose?.();demo=null;}reopen.remove();scene.remove(handle);markerGeometry.dispose();markerMaterial.dispose();selectedMaterial.dispose();}};
}
