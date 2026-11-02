import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {getPineFireProfile} from '../../systems/fire/ForestFireStudio.js';
import {createLavaRiverFactory} from '../../obstacles/LavaRiver.js';
import {createForestRandom} from '../../world/forest/PlantRegistry.js';
import {createEditableFire} from './EditableFire.js';
import {PINE_SPECIES,MAX_ANCHORS,newAnchor,validatePreset,clonePreset,PresetHistory,deckToLocal,localToDeck} from './FirePreset.js';
import './WorldEditor.css';

const STORAGE='knottyPine.worldFire.v1';
const LABELS=['Сосновая группа','Ель бегуна','Таёжная ель','Сухая сосна','Секвойя','Сосна обыкновенная'];
const editableTarget=e=>e.target instanceof HTMLElement&&!!e.target.closest('input,select,textarea,button,summary');
export function createWorldEditor({scene,renderer,forest,seed,getRivers,getBurningPlants,setSuspended,defaultFireObjects}){
 const canvas=renderer.domElement,pineMeshes=forest.pickMeshes('pine');
 const camera=new THREE.PerspectiveCamera(55,1,.05,400);
 let active=false,selected=null,anchorId=null,armed=false,dragged=false,pointerStart=null,orbit,gizmo,abort,panel,markers,demo=null;
 const keys=new Set(),point=new THREE.Vector3(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const fire=createEditableFire(scene),handle=new THREE.Object3D();scene.add(handle);
 const sources=()=>[...(active?forest.plants:getBurningPlants()).filter(p=>p.userData.plantSpecies.startsWith('pine:')).map(root=>({root,key:root.userData.plantSpecies})),...getRivers().map(root=>({root,key:'deck',boundary:root.userData.fireBoundary})),...(demo?.parent?[{root:demo,key:'deck',boundary:demo.userData.fireBoundary}]:[])];
 const defaults={version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(key=>[key,getPineFireProfile(key).anchors.slice(0,MAX_ANCHORS).map(a=>newAnchor([a.x,a.y,a.z],a.size))])),deck:[]};
 let preset=clonePreset(defaults),hasSavedPreset=false;
 try{const saved=localStorage.getItem(STORAGE);if(saved){preset=validatePreset(JSON.parse(saved));hasSavedPreset=true;}}catch(error){console.warn('World editor preset ignored:',error.message);}
 let history=new PresetHistory(preset);
 const reopen=document.createElement('button');reopen.id='world-editor-reopen';reopen.textContent='Открыть редактор мира';reopen.hidden=true;document.body.append(reopen);reopen.onclick=()=>open();
 const list=()=>selected?(selected.boundary?preset.deck:preset.plants[selected.key]):[];
 const anchor=()=>list().find(a=>a.id===anchorId);
 function message(text){if(panel)panel.querySelector('output').textContent=text;}
 function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(preset));return true;}catch{message('Браузер не сохранил настройки. Используйте экспорт JSON.');return false;}}
 function commit(){history.push(preset);persist();refresh();}
 function mutation(fn){fn();fire.invalidate();commit();}
 function restore(value){preset=value;anchorId=null;fire.invalidate();persist();refresh();}
 function makeDemo(){
  if(demo){scene.add(demo);return;}
  const records=[];createLavaRiverFactory(scene,records,{random:createForestRandom(seed)})(-12);
  demo=records[0].g;
  defaults.deck=demo.userData.deckFireAnchors.map(a=>Object.assign(newAnchor([0,0,0],a.size),localToDeck(new THREE.Vector3(a.x,a.y,a.z),demo.userData.fireBoundary)));
  if(!hasSavedPreset&&!preset.deck.length){preset.deck=clonePreset(defaults.deck);history=new PresetHistory(preset);}
 }
 function choose(target,{focus=true}={}){
  selected=target;anchorId=null;armed=false;snapId=null;fire.invalidate();
  if(target&&focus){
   target.root.getWorldPosition(point);
   const height=target.boundary?2:getPineFireProfile(target.key).height*target.root.scale.y;
   orbit.target.copy(point).add(new THREE.Vector3(0,height*.45,0));
   camera.position.copy(orbit.target).add(new THREE.Vector3(Math.max(6,height*.6),Math.max(3,height*.3),Math.max(9,height*.9)));orbit.update();
  }
  refresh();
 }
 function chooseSpecies(key){
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
  panel.querySelector('[name=species]').value=selected?.key||PINE_SPECIES[0];
  const sel=panel.querySelector('[name=anchor]');sel.replaceChildren(new Option('Выберите очаг', ''));
  list().forEach((item,i)=>sel.add(new Option('Огонь '+(i+1),item.id)));sel.value=a?.id||'';
  panel.querySelectorAll('[data-needs-anchor]').forEach(el=>el.disabled=!a);
  for(const key of ['size','strength','color','speed','sparks','opacity'])panel.querySelector(`[name=${key}]`).value=a?.[key]??(key==='color'?'#ff9b32':1);
  for(const key of ['position','rotation','scale'])for(let i=0;i<3;i++)panel.querySelector(`[name=${key}${i}]`).value=a?Number((key==='rotation'?THREE.MathUtils.radToDeg(a[key][i]):a[key][i]).toFixed(3)):0;
  panel.querySelector('[data-action=undo]').disabled=history.index===0;
  panel.querySelector('[data-action=redo]').disabled=history.index===history.entries.length-1;
  panel.querySelector('[data-action=add]').dataset.active=String(armed);
  panel.querySelector('[data-action=add]').disabled=list().length>=MAX_ANCHORS;
  message(armed?'Щёлкните по ветви или обожжённой доске.':a?'Перетаскивайте стрелки. Настройки применяются ко всему виду.':'Выберите дерево щелчком или вид в списке, затем добавьте огонь.');
 }
 const markerGeometry=new THREE.SphereGeometry(.10,8,6),markerMaterial=new THREE.MeshBasicMaterial({color:0xffca80,depthTest:false}),selectedMaterial=new THREE.MeshBasicMaterial({color:0xcfff72,depthTest:false});
 function surfaceHit(event){
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
  return ray.intersectObjects([...pineMeshes,...(demo?[demo]:[]),...getRivers()],true);
 }
 function pick(event){
  if(event.button!==0||dragged||!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;
  const hits=surfaceHit(event);
  if(!armed){const markerHit=ray.intersectObjects(markers.children)[0];if(markerHit){anchorId=markerHit.object.userData.anchorId;refresh();return;}}
  for(const hit of hits){
   const plant=forest.resolveInstance(hit.object,hit.instanceId);
   let target=plant?.species.startsWith('pine:')?{root:plant.root,key:plant.species}:null;
   if(!target){let root=hit.object;while(root&&!root.userData.fireBoundary)root=root.parent;
    if(root&&hit.object.userData.fireDeckSurface)target={root,key:'deck',boundary:root.userData.fireBoundary};
   }
   if(!target)continue;
   const adding=armed;choose(target,{focus:false});
   if(adding){
    if(list().length>=MAX_ANCHORS){message('Максимум 32 очага на вид.');return;}
    // Use the actual instanced triangle, then inverse root transform: never
    // approximate a branch by the invisible proxy origin or its bounding box.
    const position=target.root.worldToLocal(hit.point.clone());
    const a=newAnchor(position.toArray(),target.boundary?.22:.6);
    if(target.boundary)Object.assign(a,localToDeck(position,target.boundary));
    mutation(()=>{list().push(a);anchorId=a.id;});
   }
   return;
  }
  if(armed)message('Нажмите на видимую сосну или обожжённую деревянную кромку переправы.');
 }
 function transformed(){
  const a=anchor();if(!a)return;
  selected.root.updateWorldMatrix(true,false);point.copy(handle.position);selected.root.worldToLocal(point);
  if(selected.boundary)Object.assign(a,localToDeck(point,selected.boundary));else a.position=point.toArray().map(n=>Math.max(-100,Math.min(100,n)));
  const inverse=selected.root.getWorldQuaternion(new THREE.Quaternion()).invert();
  a.rotation=new THREE.Euler().setFromQuaternion(inverse.multiply(handle.quaternion)).toArray().slice(0,3);
  a.scale=handle.scale.toArray().map(v=>Math.max(.05,Math.min(100,v)));fire.invalidate();
 }
 function download(){const blob=new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='knotty-pine-world-fire.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('JSON экспортирован.');}
 async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(preset,null,2));message('Настройки скопированы.');}catch{message('Буфер обмена недоступен — используйте «Экспорт».');}}
 function applySeed(value){const url=new URL(location.href);url.searchParams.set('seed',String(value>>>0));persist();location.href=url.href;}
 function ui(){
  panel=document.createElement('div');panel.className='world-editor';panel.innerHTML=`
   <div class="hint">ЛКМ — выбор / вращение · ПКМ — панорама · Колесо — приближение<br>WASD — полёт · Q/E — высота · Shift — быстрее · F — к объекту</div>
   <aside aria-label="Редактор мира"><h2>Огонь в лесу</h2><p data-metrics></p><p>Забег остановлен. Огонь продолжает жить.</p>
   <label>Объект<select name="species">${PINE_SPECIES.map((k,i)=>`<option value="${k}">${LABELS[i]}</option>`).join('')}<option value="deck">Деревянная переправа</option></select></label>
   <div class="row"><button data-action="focus">К объекту · F</button><button data-action="next">Другой экземпляр</button></div>
   <label>Очаг<select name="anchor"></select></label>
   <div class="row"><button class="primary" data-action="add">Добавить огонь</button><button data-action="delete" data-needs-anchor>Удалить</button></div>
   <div class="row"><button data-action="duplicate" data-needs-anchor>Дублировать</button><button data-action="snap" data-needs-anchor>На поверхность</button></div>
   <div class="row"><button data-mode="translate">Двигать</button><button data-mode="rotate">Повернуть</button><button data-mode="scale">Масштаб</button></div>
   <label>Размер<input data-needs-anchor name="size" type="range" min=".05" max="5" step=".05"></label>
   <label>Сила<input data-needs-anchor name="strength" type="range" min=".05" max="3" step=".05"></label>
   <label>Цвет<input data-needs-anchor name="color" type="color"></label>
   <details><summary>Точные и дополнительные настройки</summary>
   <label>Скорость<input data-needs-anchor name="speed" type="range" min=".05" max="5" step=".05"></label>
   <label>Искры<input data-needs-anchor name="sparks" type="range" min="0" max="20" step="1"></label>
   <label>Прозрачность<input data-needs-anchor name="opacity" type="range" min="0" max="1" step=".01"></label>
   ${['position','rotation','scale'].map((key,j)=>`<p>${['Локальная позиция / кромка','Поворот, градусы','Масштаб'][j]}</p><div class="axis">${['X','Y','Z'].map((axis,i)=>`<label>${axis}<input data-needs-anchor type="number" step=".05" name="${key}${i}"></label>`).join('')}</div>`).join('')}
   </details>
   <div class="row"><button data-action="undo">Отменить</button><button data-action="redo">Повторить</button></div>
   <div class="row"><button data-action="reset">Сбросить вид</button><button data-action="copy">Скопировать настройки</button></div>
   <div class="row"><button data-action="import">Импорт</button><button data-action="export">Экспорт</button></div>
   <input type="file" accept="application/json,.json" name="file" hidden>
   <details><summary>Демонстрационная сцена</summary><label>Seed<input name="seed" type="number" min="0" max="4294967295" value="${seed}"></label><button data-action="seed">Пересоздать сцену</button><p>Сохраняет огонь и перезагружает сцену с указанным seed.</p></details>
   <output role="status"></output><button class="primary" data-action="close">Закрыть редактор</button>
   </aside>`;document.body.append(panel);
  panel.addEventListener('click',e=>{
   const mode=e.target.dataset.mode;if(mode){gizmo.setMode(mode);panel.querySelectorAll('[data-mode]').forEach(b=>b.dataset.active=String(b===e.target));return;}
   const action=e.target.dataset.action,a=anchor();
   if(action==='close')close();
   if(action==='focus'&&selected)choose(selected);
   if(action==='next'&&selected){const copies=sources().filter(s=>s.key===selected.key);const i=copies.findIndex(s=>s.root===selected.root);choose(copies[(i+1)%copies.length]);}
   if(action==='add'){snapId=null;armed=!armed;refresh();}
   if(action==='snap'&&a){snapId=a.id;armed=true;message('Щёлкните по поверхности этого вида: выбранный огонь будет перемещён.');}
   if(action==='delete'&&a)mutation(()=>{list().splice(list().indexOf(a),1);anchorId=null;});
   if(action==='duplicate'&&a&&list().length<MAX_ANCHORS)mutation(()=>{const b=clonePreset(a);b.id=crypto.randomUUID();if(!selected.boundary)b.position[0]+=.2;list().push(b);anchorId=b.id;});
   if(action==='reset'&&selected)mutation(()=>{if(selected.boundary)preset.deck=clonePreset(defaults.deck);else preset.plants[selected.key]=clonePreset(defaults.plants[selected.key]);anchorId=null;});
   if(action==='undo')restore(history.undo());if(action==='redo')restore(history.redo());
   if(action==='export')download();if(action==='copy')void copy();if(action==='import')panel.querySelector('[name=file]').click();
   if(action==='seed'){const value=Number(panel.querySelector('[name=seed]').value);if(Number.isInteger(value)&&value>=0&&value<=0xffffffff){preset.seed=value;applySeed(value);}else message('Seed: целое число от 0 до 4294967295.');}
  });
  panel.querySelector('[name=species]').onchange=e=>chooseSpecies(e.target.value);
  panel.querySelector('[name=anchor]').onchange=e=>{anchorId=e.target.value;refresh();};
  panel.querySelector('[name=file]').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   try{if(file.size>256000)throw Error('Файл больше 256 КБ.');const value=validatePreset(JSON.parse(await file.text()));history.push(value);restore(value);message(value.seed===seed?'Пресет импортирован.':'Огонь импортирован. Для того же леса примените seed '+value.seed+' в разделе сцены.');panel.querySelector('[name=seed]').value=value.seed;}catch(error){message(error.message);}e.target.value='';
  };
  panel.addEventListener('input',e=>{
   const a=anchor(),name=e.target.name;if(!a)return;
   if(['size','strength','color','speed','sparks','opacity'].includes(name)){a[name]=name==='color'?e.target.value:Number(e.target.value);fire.invalidate();}
  });
  panel.addEventListener('change',e=>{
   const a=anchor(),name=e.target.name;if(!a)return;
   const match=/^(position|rotation|scale)([012])$/.exec(name||'');
   if(match){const n=Number(e.target.value);if(!Number.isFinite(n)||Math.abs(n)>(match[1]==='rotation'?3600:100)||(match[1]==='scale'&&n<.05)){message('Значение вне диапазона.');refresh();return;}a[match[1]][Number(match[2])]=match[1]==='rotation'?THREE.MathUtils.degToRad(n):n;if(selected.boundary)Object.assign(a,localToDeck(new THREE.Vector3(...deckToLocal(a,selected.boundary)),selected.boundary));fire.invalidate();commit();}
   else if(['size','strength','color','speed','sparks','opacity'].includes(name))commit();
  });
 }
 let snapId=null,previousFog;
 const workLight=new THREE.HemisphereLight(0xffecd1,0x849478,2.5);
 function keydown(e){
  e.stopImmediatePropagation();
  if(editableTarget(e))return;
  e.preventDefault();
  if(e.code==='Escape'){close();return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){restore(e.shiftKey?history.redo():history.undo());return;}
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){restore(history.redo());return;}
  if(e.code==='KeyF'&&selected)choose(selected);
  if(e.code==='Delete'&&anchor())mutation(()=>{const a=anchor();list().splice(list().indexOf(a),1);anchorId=null;});
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
  canvas.addEventListener('pointerup',e=>{
   if(snapId&&armed&&!dragged&&pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<5){
    const old=selected,oldId=snapId;const hit=surfaceHit(e).find(h=>old.boundary?h.object.userData.fireDeckSurface&&h.object.parent===old.root:forest.resolveInstance(h.object,h.instanceId)?.root===old.root);
    if(hit){const a=list().find(a=>a.id===oldId),p=old.root.worldToLocal(hit.point.clone());mutation(()=>{if(old.boundary)Object.assign(a,localToDeck(p,old.boundary));else a.position=p.toArray();anchorId=oldId;});snapId=null;armed=false;refresh();}else message('Выберите поверхность выбранного дерева или переправы.');return;
   }
   pick(e);
  },{signal:abort.signal});
 }
 function close(){
  if(!active)return;active=false;persist();abort.abort();keys.clear();orbit.dispose();gizmo.detach();gizmo.dispose();scene.remove(gizmo,markers);panel.remove();panel=null;selected=null;snapId=null;armed=false;
  if(demo)scene.remove(demo);
  scene.fog=previousFog;scene.remove(workLight);
  document.body.classList.remove('world-editor-open');renderer.setSize(innerWidth,innerHeight);fire.invalidate();update(0);setSuspended(false);reopen.hidden=false;
 }
 function update(dt){
  if(active){
   if(keys.size){const velocity=new THREE.Vector3();camera.getWorldDirection(velocity);velocity.y=0;velocity.normalize();const right=new THREE.Vector3().crossVectors(velocity,camera.up).normalize(),move=new THREE.Vector3();
    move.addScaledVector(velocity,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0));move.addScaledVector(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0));move.y+=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0);move.multiplyScalar(dt*(keys.has('ShiftLeft')?18:6));camera.position.add(move);orbit.target.add(move);
   }orbit.update();
  }
  for(const obj of defaultFireObjects)obj.visible=false;
  const visibleSources=sources().filter(s=>!active||s.key===selected?.key);
  fire.update(dt,visibleSources,preset,{moving:!active});
  if(active){const stats=fire.stats();panel.querySelector('[data-metrics]').textContent=visibleSources.length+' экземпляров · '+stats.flames+' очагов';renderer.render(scene,camera);}
 }
 open();
 return {get active(){return active;},update,open,close,getPreset:()=>clonePreset(preset),stats:fire.stats,dispose(){close();if(demo){demo.userData.dispose?.();demo=null;}reopen.remove();fire.dispose();scene.remove(handle);markerGeometry.dispose();markerMaterial.dispose();selectedMaterial.dispose();for(const obj of defaultFireObjects)obj.visible=true;}};
}
