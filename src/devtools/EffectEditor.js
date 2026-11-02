// Temporary, lazily loaded developer VFX editor. Remove with
// VITE_ENABLE_EFFECT_EDITOR=false before public launch.
import * as THREE from 'three';
import './EffectEditor.css';
import {createFiona} from '../player/Fiona.js';
import {loadFiona} from '../player/FionaRig.js';
import {resolveFionaAssets} from '../player/FionaAssetCache.js';
import {createBroomRide} from '../powerups/BroomRide.js';
import {createWitchHatFactory} from '../powerups/WitchHat.js';
import {createScarfModelFactory} from '../powerups/ScarfModel.js';
import {createSoulFactory} from '../souls/createSoulFactory.js';
import {animateSoulFlame} from '../souls/animateSoulFlame.js';
import {
 BROOM_VISUAL_RANGES,broomTuningSnapshot,setBroomTuningValue,
 saveBroomTuning,revertBroomTuning,resetBroomTuning
} from '../powerups/BroomVisualProfiles.js';
import {
 EFFECT_VISUAL_SCHEMA,EFFECT_VISUAL_CONTROLS,effectVisualSnapshot,getEffectVisualProfile,
 setEffectVisualValue,saveEffectVisuals,revertEffectVisuals,
 resetEffectVisualCategory
} from '../effects/EffectVisualProfiles.js';

const categories=[
 ['broom','🧹','Эффекты метлы','Дым, искры, прерывистые пыхи и магические струйки'],
 ['broomModel','🪵','Модель метлы','Древко, рукоять, крепление, прутья и свечение предмета'],
 ['hat','✦','Шляпа','Свечение и покачивание предмета'],
 ['scarf','❀','Платок Мисти','Ореол, парение и вспышка'],
 ['souls','◈','Души','Голубое пламя и искры'],
 ['ultimate','✧','Ульта','Огненная аура вокруг Фионы']
];
const broomFields=[
 ['_smoke','ДЫМ И ВЕТЕР','heading'],
 ['density','Плотность дыма','range',0,200],
 ['opacity','Видимость дыма','range',0,200],
 ['size','Размер дымовых клубов','range',15,220],
 ['length','Длина шлейфа','range',15,200],
 ['smokeRise','Подъём дыма','range',0,200],
 ['smokeColor','Цвет обычного дыма','color'],
 ['_streaks','МАГИЧЕСКИЙ ШЛЕЙФ','heading'],
 ['streaks','Магические струйки','range',0,200],
 ['streakColor','Цвет струек','color'],
 ['_coughs','ПОСЛЕДНИЕ «ПЫХИ»','heading'],
 ['coughs','Сила выбросов','range',0,250],
 ['coughColor','Цвет «пыхов»','color'],
 ['_sparks','ИСКРЫ И СБОИ','heading'],
 ['sparks','Яркость искр','range',0,400],
 ['sparkSize','Размер искр','range',0,250],
 ['sparkSpread','Разлёт искр','range',0,250],
 ['sparkColor','Цвет искр','color'],
 ['_glow','СВЕЧЕНИЕ КОНЧИКА','heading'],
 ['glowSize','Размер свечения','range',20,250],
 ['glowIntensity','Интенсивность','range',0,200],
 ['glowColor','Цвет свечения','color']
];
export function buildEffectExport(){
 const all=effectVisualSnapshot();
 return JSON.stringify({
  schemaVersion:EFFECT_VISUAL_SCHEMA,
  game:'KNOTTY PINE',
  broom:broomTuningSnapshot(),
  broomModel:all.broomModel,
  hat:all.hat,
  scarf:all.scarf,
  souls:all.souls,
  ultimate:all.ultimate
 },null,2);
}

export function createEffectEditor(){
 const openButton=document.getElementById('menu-open-effects-editor');
 if(!openButton)return {open(){},close(){}};
 openButton.classList.remove('hidden');
 const root=document.createElement('section');
 root.id='effects-editor';root.className='hidden';
 root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');
 root.setAttribute('aria-labelledby','effects-editor-title');
 root.innerHTML=`
 <div class="effects-editor-shell">
  <header class="effects-editor-header">
   <div><div class="effects-editor-eyebrow">KNOTTY PINE / DEV TOOLS · VFX STUDIO</div>
    <h2 id="effects-editor-title">МАСТЕРСКАЯ ЭФФЕКТОВ</h2>
    <p>Только визуальные параметры. Игровая механика не меняется.</p>
   </div>
   <button id="fx-close" type="button" class="effects-editor-close" aria-label="Закрыть редактор">✕</button>
  </header>
  <nav id="fx-categories" class="effects-editor-tabs" aria-label="Категории эффектов"></nav>
  <div class="effects-editor-preview">
   <div id="fx-viewport" class="effects-editor-viewport" aria-label="Интерактивная трёхмерная сцена выбранного эффекта"></div>
   <div class="effects-editor-preview-top">
    <span id="fx-preview-title">МЕТЛА / 3D</span>
    <span id="fx-preview-timer">9.0 с</span>
   </div>
   <div class="effects-editor-preview-hint">Поверни модель мышью или пальцем ↔</div>
  </div>
  <section class="effects-editor-inspector" aria-label="Настройки выбранного эффекта">
   <div class="effects-editor-inspector-title">
    <h3 id="fx-category-title">Метла</h3><p id="fx-category-info"></p>
   </div>
   <div id="fx-broom-phase" class="effects-editor-phases" role="group" aria-label="Этап полёта">
    <button type="button" data-fx-phase="flight" aria-pressed="true">Обычный полёт</button>
    <button type="button" data-fx-phase="landing" aria-pressed="false">Последние 3 сек.</button>
   </div>
   <div id="fx-fields" class="effects-editor-fields"></div>
   <p id="fx-message" class="effects-editor-message" role="status" aria-live="polite">Выбери эффект и настрой его вручную.</p>
  </section>
  <footer class="effects-editor-footer">
   <div class="effects-editor-footer-left">
    <button id="fx-save" type="button" class="effects-editor-save">Сохранить в браузере</button>
    <button id="fx-reset" type="button" class="effects-editor-reset">Сбросить категорию</button>
   </div>
   <button id="fx-copy" type="button" class="effects-editor-copy">⧉ КОПИРОВАТЬ ВСЕ ЗНАЧЕНИЯ</button>
   <textarea id="fx-copy-fallback" class="hidden" readonly aria-label="Пресет для копирования"></textarea>
   <small>Копирование включает все 6 категорий, даже несохранённые изменения. Пришли JSON в чат — и мы применим его для всех игроков.</small>
  </footer>
 </div>`;
 document.body.appendChild(root);
 const $=id=>root.querySelector('#'+id);
 const nav=$('fx-categories'),fields=$('fx-fields'),notice=$('fx-message');
 let active=false,category='broom',phase='flight',lastFocus=null;
 let scene=null,renderer=null,camera=null,runner=null,broom=null,hat=null,hatFactory=null,rig=null;
 let scarfGroup=null,scarfFactory=null,scarfHalo=null,scarfFlash=null,soul=null,soulFactory=null,aura=null;
 let raf=0,started=0,rotation=-.31,dragX=null,previewWidth=0,previewHeight=0;
 function setMessage(text){notice.textContent=text;}
 function activeConfig(){return category==='broom'?broomTuningSnapshot()[phase]:getEffectVisualProfile(category);}
 function setConfig(key,value){
  if(category==='broom')setBroomTuningValue(phase,key,value);
  else setEffectVisualValue(category,key,value);
  setMessage('Изменения видны сразу. Сохрани или скопируй весь пресет.');
 }
 for(const [key,symbol,name] of categories){
  const btn=document.createElement('button');
  btn.type='button';btn.dataset.category=key;
  btn.textContent=symbol+' '+name;
  btn.addEventListener('click',()=>selectCategory(key));
  nav.appendChild(btn);
 }
 function drawFields(){
  fields.replaceChildren();
  const specs=category==='broom'?broomFields:EFFECT_VISUAL_CONTROLS[category];
  const values=activeConfig();
  for(const [key,title,kind,min,max] of specs){
   if(kind==='heading'){
    const header=document.createElement('h4');
    header.className='effects-editor-group-heading';
    header.textContent=title;
    fields.appendChild(header);
    continue;
   }
   const row=document.createElement('label');
   row.className='effects-editor-field';
   const titleRow=document.createElement('span');titleRow.className='effects-editor-field-top';
   const caption=document.createElement('strong');caption.textContent=title;
   const output=document.createElement('output');
   output.textContent=kind==='color'?String(values[key]):values[key]+'%';
   titleRow.append(caption,output);
   const input=document.createElement('input');
   input.type=kind==='color'?'color':'range';
   input.setAttribute('aria-label',title);
   input.value=values[key];
   if(kind==='range'){input.min=min;input.max=max;input.step='1';}
   input.addEventListener('input',()=>{
    const value=kind==='color'?input.value:Number(input.value);
    setConfig(key,value);
    output.textContent=kind==='color'?value:Math.round(value)+'%';
   });
   row.append(titleRow,input);
   fields.appendChild(row);
  }
 }
 function selectCategory(next){
  category=next;
  started=performance.now();
  if(broom)broom.cancel();
  if(aura)aura.reset();
  for(const [key,,name,description] of categories){
   const item=nav.querySelector('[data-category="'+key+'"]');
   item.classList.toggle('selected',key===category);
   item.setAttribute('aria-current',String(key===category));
   if(key===category){$('fx-category-title').textContent=name;$('fx-category-info').textContent=description;}
  }
  $('fx-broom-phase').classList.toggle('hidden',category!=='broom');
  $('fx-preview-title').textContent=category==='broom'
   ?'МЕТЛА / '+(phase==='flight'?'ПОЛЁТ':'ПОСАДКА')
   :$('fx-category-title').textContent.toUpperCase()+' / 3D';
  drawFields();
  selectPhaseUI();
 }
 function selectPhaseUI(){
  root.querySelectorAll('[data-fx-phase]').forEach(btn=>{
   const selected=phase===btn.dataset.fxPhase;
   btn.setAttribute('aria-pressed',String(selected));
   btn.classList.toggle('selected',selected);
  });
 }
 root.querySelectorAll('[data-fx-phase]').forEach(btn=>btn.addEventListener('click',()=>{
  phase=btn.dataset.fxPhase;started=performance.now();
  $('fx-preview-title').textContent=phase==='flight'?'МЕТЛА / ПОЛЁТ':'МЕТЛА / ПОСАДКА';
  selectPhaseUI();drawFields();
 }));
 function initPreview(){
  if(renderer)return;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1a111c);
  scene.add(new THREE.HemisphereLight(0xf9dfed,0x241521,2.2));
  const key=new THREE.DirectionalLight(0xffc98f,2.25);
  key.position.set(-3,6,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xa18dff,1.3);
  fill.position.set(4,5,-4);scene.add(fill);
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const box=(w,h,d,material,x,y,z,parent=scene)=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
   m.position.set(x,y,z);parent.add(m);return m;
  };
  const fiona=createFiona(scene);
  runner=fiona.runner;runner.position.set(0,.77,0);
  aura=fiona.ultimateAura;
  broom=createBroomRide(scene,runner);
  const hats=[];
  hatFactory=createWitchHatFactory(scene,hats,runner);
  // Use the production rig and fitted headwear, not the removed procedural body.
  void resolveFionaAssets().then(({files})=>loadFiona({runner,...files})).then(next=>{
   rig=next;rig.setActive(true);
   hatFactory.attachWearableToHead(rig.headBone);
  }).catch(error=>setMessage('Модель Фионы не загрузилась: '+error.message));
  hatFactory.makeHat(1,0);
  hat=hats[0];
  hat.visual.scale.setScalar(1.25);
  scarfFactory=createScarfModelFactory();
  scarfGroup=scarfFactory.createModel();scarfGroup.position.y=1.55;
  scarfGroup.scale.setScalar(1.13);scene.add(scarfGroup);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.95)');
  g.addColorStop(.3,'rgba(255,255,255,.55)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const glow=new THREE.SpriteMaterial({
   map:new THREE.CanvasTexture(canvas),color:0xffffff,
   transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending
  });
  scarfHalo=new THREE.Sprite(glow);
  scarfHalo.position.set(0,0,-.25);scarfHalo.scale.set(3.5,3.1,1);
  scarfGroup.add(scarfHalo);
  // Repeating pickup burst uses the same visual parameters as the real shawl.
  const flashMaterial=glow.clone();
  scarfFlash=new THREE.Sprite(flashMaterial);
  scarfFlash.position.set(0,0,-.21);
  scarfFlash.scale.set(2.5,2.5,1);
  scarfGroup.add(scarfFlash);
  const coins=[];
  soulFactory=createSoulFactory(scene,coins);
  soulFactory(1,0,1.4);
  soul=coins[0];
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(11,17),
   new THREE.MeshStandardMaterial({color:0x31232b,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.12,0);scene.add(ground);
  const marker=new THREE.GridHelper(11,11,0x725560,0x45313b);
  marker.position.y=-.10;scene.add(marker);
  camera=new THREE.PerspectiveCamera(48,1,.1,80);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  $('fx-viewport').appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Вращаемая 3D-модель эффекта');
  renderer.domElement.addEventListener('pointerdown',e=>{
   dragX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
   if(dragX===null)return;
   rotation+=Math.max(-70,Math.min(70,e.clientX-dragX))*.01;
   dragX=e.clientX;
  });
  renderer.domElement.addEventListener('pointerup',()=>dragX=null);
  renderer.domElement.addEventListener('pointercancel',()=>dragX=null);
 }
 function resize(){
  if(!renderer)return;
  const viewport=$('fx-viewport');
  const w=Math.max(230,viewport.clientWidth),h=Math.max(220,viewport.clientHeight);
  if(previewWidth===w&&previewHeight===h)return;
  previewWidth=w;previewHeight=h;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
 }
 function draw(now){
  if(!active)return;
  resize();
  const elapsed=(now-started)*.001;
  const focus=category==='broom'||category==='broomModel'||category==='ultimate';
  runner.visible=focus;
  hat.g.visible=category==='hat';
  scarfGroup.visible=category==='scarf';
  soul.g.visible=category==='souls';
  runner.position.set(0,.77+Math.sin(now*.003)*.04,0);
  runner.rotation.y=rotation;
  hat.g.rotation.y=rotation;
  scarfGroup.rotation.y=rotation+Math.sin(now*.0007)*.15;
  soul.g.rotation.y=rotation;
  aura.update(now,category==='ultimate');
  rig?.update(1/60,{broom:category==='broom'||category==='broomModel',ultimate:category==='ultimate',ultimateLift:category==='ultimate'?1:0,speed:15});
  if(category==='broomModel'){
   broom.preview(8,now,{showTrail:false});
   $('fx-preview-timer').textContent='ДЕТАЛИ МЕТЛЫ';
  }else if(category==='broom'){
   // Preview the *entire* last 3 s, including the final 0.1s "bah-bah".
   const remaining=phase==='flight'?9-(elapsed%5.5):
    Math.max(.001,3-(elapsed%3.6));
   broom.preview(remaining,now);
   $('fx-preview-timer').textContent=remaining.toFixed(2)+' с';
  }else{
   broom.cancel();
   if(category==='hat'){
    hatFactory.animateHat(hat,now);
    $('fx-preview-timer').textContent='МАГНИТ · ВИЗУАЛ';
   }else if(category==='scarf'){
    const v=getEffectVisualProfile('scarf');
    scarfFactory.updateVisuals();
    scarfGroup.position.y=1.55+Math.sin(now*.0035)*.14*v.floatHeight/100;
    scarfHalo.material.color.set(v.glowColor);
    scarfHalo.material.opacity=v.glowOpacity/100;
    const s=(1+Math.sin(now*.006)*.08)*v.glowSize/100;
    scarfHalo.scale.set(3.5*s,3.1*s,1);
    const burstAge=(elapsed%2.2)/.65;
    const burstLife=burstAge<1?1-burstAge:0;
    scarfFlash.material.color.set(v.burstColor);
    scarfFlash.material.opacity=burstLife*v.burstOpacity/100;
    scarfFlash.scale.setScalar((2.5+2*(1-burstLife))*v.burstSize/100);
    scarfFlash.visible=burstLife>0;
    $('fx-preview-timer').textContent='ПЛАТОК · ВСПЫШКА';
   }else if(category==='souls'){
    soulFactory.updateVisuals();
    for(let i=0;i<soul.flames.length;i++)animateSoulFlame(soul.flames[i],now,soul.phase+i*1.7,i===1?.65:1);
    soul.g.position.y=1.4+Math.sin(now*.004)*.09;
    $('fx-preview-timer').textContent='ДУША · 3D';
   }else if(category==='ultimate'){
    $('fx-preview-timer').textContent='УЛЬТА · АУРА';
   }
  }
  const close=category==='hat'||category==='scarf'||category==='souls'||category==='broomModel';
  const camDistance=close?4.6:8;
  camera.position.set(Math.sin(rotation*.23+0.33)*camDistance*.34,close?2.25:3.55,camDistance);
  camera.lookAt(0,close?1.25:1.75,category==='broom'?.45:0);
  renderer.render(scene,camera);
  raf=requestAnimationFrame(draw);
 }
 function open(){
  if(active)return;
  try{initPreview();}catch(error){
   setMessage('WebGL-предпросмотр недоступен: '+error.message);
   return;
  }
  active=true;lastFocus=document.activeElement;
  document.body.classList.add('effect-editor-open');
  document.getElementById('center')?.classList.add('hidden');
  root.classList.remove('hidden');
  selectCategory('broom');
  started=performance.now();
  setMessage('Параметры сразу меняют 3D-эффект. Сохранение — только в этом браузере.');
  $('fx-close').focus();
  raf=requestAnimationFrame(draw);
 }
 function close(){
  if(!active)return;
  active=false;cancelAnimationFrame(raf);
  document.body.classList.remove('effect-editor-open');
  broom.cancel();aura.reset();
  revertBroomTuning();revertEffectVisuals();
  root.classList.add('hidden');
  document.getElementById('center')?.classList.remove('hidden');
  lastFocus?.focus?.();
 }
 function resetCurrent(){
  if(category==='broom'){
   // Reset only the selected flight stage; the other stage is independent.
   resetBroomTuning();
  }
  else resetEffectVisualCategory(category);
  drawFields();
  setMessage('Настройки этой категории восстановлены. Чтобы закрепить — нажми «Сохранить».');
 }
 function save(){
  const a=saveBroomTuning(),b=saveEffectVisuals();
  setMessage(a&&b?'Сохранено! В этом браузере эффекты обновятся и в забеге.':'Настройки действуют сейчас, но браузер не разрешил постоянное сохранение.');
 }
 async function copy(){
  const json=buildEffectExport();
  try{
   await navigator.clipboard.writeText(json);
   setMessage('Все значения скопированы! Вставь JSON прямо в чат.');
  }catch{
   const fallback=$('fx-copy-fallback');
   fallback.value=json;fallback.classList.remove('hidden');
   fallback.focus();fallback.select();
   setMessage('Копирование заблокировано браузером — выдели текст ниже и скопируй вручную.');
  }
 }
 openButton.addEventListener('click',open);
 $('fx-close').addEventListener('click',close);
 $('fx-reset').addEventListener('click',resetCurrent);
 $('fx-save').addEventListener('click',save);
 $('fx-copy').addEventListener('click',copy);
 window.addEventListener('keydown',event=>{
  if(!active)return;
  if(event.code==='Escape'){event.preventDefault();close();}
  // Do not let the hidden endless-runner handle Enter/arrows during editing.
  event.stopImmediatePropagation();
 },true);
 window.addEventListener('resize',resize);
 return {open,close};
}
