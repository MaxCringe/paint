import * as THREE from 'three';
import {createFiona} from '../player/Fiona.js';
import {createBroomRide} from '../powerups/BroomRide.js';
import {
 BROOM_VISUAL_RANGES,broomTuningSnapshot,setBroomTuningValue,
 saveBroomTuning,revertBroomTuning,resetBroomTuning
} from '../powerups/BroomVisualProfiles.js';

// Live 3D laboratory. Uses the SAME Fiona factory, broom geometry and particle
// renderer as the actual run. This second scene cannot affect run state.
const fields=[
 ['density','Плотность дыма','Количество лёгких клубов'],
 ['opacity','Видимость дыма','От невидимого до плотного'],
 ['size','Размер дыма','Масштаб отдельных клубов'],
 ['length','Длина шлейфа','Как далеко он тянется'],
 ['streaks','Магические струйки','Светящийся след при полёте'],
 ['coughs','Мультяшные «пыхи»','Клубы при окончании заряда'],
 ['sparks','Искры','Яркость магических искр']
];
export function createBroomLab(){
 const openButton=document.getElementById('menu-open-broom-lab');
 if(!openButton)return {open(){},close(){}};
 const overlay=document.createElement('section');
 overlay.id='broom-lab';overlay.className='hidden';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-labelledby','broom-lab-title');
 overlay.innerHTML=`
 <div class="broom-lab-shell">
  <header class="broom-lab-head">
   <div><span class="broom-lab-eyebrow">KNOTTY PINE · МАСТЕРСКАЯ ВЕДЬМЫ</span>
    <h2 id="broom-lab-title">НАСТРОЙКА МАГИИ МЕТЛЫ</h2></div>
   <button type="button" class="broom-lab-close" id="broom-lab-close" aria-label="Закрыть">✕</button>
  </header>
  <div class="broom-lab-stage">
   <div id="broom-lab-preview" aria-label="Живая 3D-модель Фионы и метлы, потяните для поворота"></div>
   <div class="broom-lab-stage-label">НАСТОЯЩАЯ 3D-МОДЕЛЬ · ВРАЩАЙ МЫШЬЮ ИЛИ ПАЛЬЦЕМ</div>
   <div class="broom-lab-preview-bar">
    <span id="broom-lab-remaining">9.0 с</span>
    <span id="broom-lab-stage-state">ОБЫЧНЫЙ ПОЛЁТ</span>
   </div>
  </div>
  <div class="broom-lab-controls">
   <p class="broom-lab-caption">Изменения видны сразу на настоящей метле. Настраивай каждый этап отдельно.</p>
   <div class="broom-lab-modes" role="group" aria-label="Фаза полёта">
    <button id="broom-lab-flight" type="button" aria-pressed="true">✦ ПОЛЁТ</button>
    <button id="broom-lab-landing" type="button" aria-pressed="false">✷ ЗАРЯД НА ИСХОДЕ</button>
   </div>
   <div id="broom-lab-fields" class="broom-lab-fields"></div>
   <div class="broom-lab-color">
    <label for="broom-lab-color-input">Цвет дыма</label>
    <input type="color" id="broom-lab-color-input" value="#ffffff" aria-label="Цвет дыма">
   </div>
   <p id="broom-lab-message" class="broom-lab-message" role="status" aria-live="polite">Изменения пока не сохранены.</p>
   <div class="broom-lab-actions">
    <button id="broom-lab-save" type="button">СОХРАНИТЬ</button>
    <button id="broom-lab-copy" type="button">КОПИРОВАТЬ ПРЕСЕТ</button>
    <button id="broom-lab-reset" type="button">СБРОС</button>
   </div>
   <p class="broom-lab-footnote">Настройки сохраняются только в этом браузере. На остальных устройствах останется стандартный эффект.</p>
  </div>
 </div>`;
 document.body.appendChild(overlay);
 const $=id=>overlay.querySelector('#'+id);
 const preview=$('broom-lab-preview');
 const fieldsRoot=$('broom-lab-fields');
 const message=$('broom-lab-message');
 const rows=new Map();
 for(const [key,title,hint] of fields){
  const [min,max]=BROOM_VISUAL_RANGES[key];
  const row=document.createElement('label');
  row.className='broom-lab-field';
  row.innerHTML=`<span class="broom-lab-field-head"><strong>${title}</strong><output></output></span>
   <span class="broom-lab-field-hint">${hint}</span>
   <input type="range" min="${min}" max="${max}" step="1" aria-label="${title}">`;
  const input=row.querySelector('input'),value=row.querySelector('output');
  fieldsRoot.appendChild(row);rows.set(key,{input,value});
  input.addEventListener('input',()=>{
   setBroomTuningValue(mode,key,Number(input.value));
   value.textContent=input.value+'%';
   message.textContent='Изменения видны сразу · нажми «Сохранить»';
  });
 }
 let mode='flight',active=false,renderer=null,scene=null,camera=null,broom=null,runner=null;
 let frameId=0,started=0,rotation=.22,dragX=null,lastFocus=null;
 let previewWidth=0,previewHeight=0;
 const color=$('broom-lab-color-input');
 color.addEventListener('input',()=>{
  setBroomTuningValue(mode,'smokeColor',color.value);
  message.textContent='Цвет применяется сразу · нажми «Сохранить»';
 });
 const modes={flight:$('broom-lab-flight'),landing:$('broom-lab-landing')};
 function sync(){
  const values=broomTuningSnapshot()[mode];
  for(const [key,{input,value}] of rows){
   input.value=values[key];value.textContent=Math.round(values[key])+'%';
  }
  color.value=values.smokeColor;
  for(const [name,btn] of Object.entries(modes)){
   btn.setAttribute('aria-pressed',String(name===mode));
   btn.classList.toggle('selected',name===mode);
  }
  $('broom-lab-stage-state').textContent=mode==='flight'?'ОБЫЧНЫЙ ПОЛЁТ':'ПОСЛЕДНИЕ 3 СЕКУНДЫ';
 }
 function select(next){
  mode=next;started=performance.now();sync();
 }
 modes.flight.addEventListener('click',()=>select('flight'));
 modes.landing.addEventListener('click',()=>select('landing'));
 function initPreview(){
  if(renderer)return;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1a101b);
  scene.add(new THREE.HemisphereLight(0xe7b7d1,0x281625,2.1));
  const light=new THREE.DirectionalLight(0xffc88e,2.2);
  light.position.set(-3,8,7);scene.add(light);
  const fill=new THREE.DirectionalLight(0x9c79ff,1.3);
  fill.position.set(4,5,-5);scene.add(fill);
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const box=(w,h,d,material,x,y,z,parent=scene)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const model=createFiona(scene,mat,box);
  runner=model.runner;runner.position.set(0,.77,0);
  broom=createBroomRide(scene,runner,model);
  const floor=new THREE.Mesh(
   new THREE.PlaneGeometry(8,22),
   new THREE.MeshStandardMaterial({color:0x30262c,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,-.14,1);
  scene.add(floor);
  for(const x of [-2.8,2.8]){
   const line=new THREE.Mesh(new THREE.PlaneGeometry(.035,22),
     new THREE.MeshBasicMaterial({color:0x8b665a,transparent:true,opacity:.42}));
   line.rotation.x=-Math.PI/2;line.position.set(x,-.12,1);scene.add(line);
  }
  camera=new THREE.PerspectiveCamera(48,1,.1,55);
  camera.position.set(2.5,3.6,9.0);camera.lookAt(0,1.65,1.15);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  preview.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D-предпросмотр метлы');
  renderer.domElement.addEventListener('pointerdown',e=>{
   dragX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove',e=>{
   if(dragX!==null){rotation+=Math.max(-60,Math.min(60,e.clientX-dragX))*.009;dragX=e.clientX;}
  });
  renderer.domElement.addEventListener('pointerup',()=>{dragX=null});
  renderer.domElement.addEventListener('pointercancel',()=>{dragX=null});
 }
 function resize(){
  if(!renderer)return;
  const w=Math.max(200,preview.clientWidth),h=Math.max(220,preview.clientHeight);
  if(w===previewWidth&&h===previewHeight)return;
  previewWidth=w;previewHeight=h;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
 }
 function draw(now){
  if(!active)return;
  resize();
  const elapsed=((now-started)/1000);
  const remaining=mode==='flight'?9-(elapsed%5.8):3-(elapsed%2.9);
  const t=now;
  runner.position.set(0,.77+Math.sin(now*.003)*.045,0);
  runner.rotation.y=rotation;
  broom.preview(remaining,t);
  $('broom-lab-remaining').textContent=remaining.toFixed(1)+' с';
  renderer.render(scene,camera);
  frameId=requestAnimationFrame(draw);
 }
 function open(){
  if(active)return;
  try{initPreview();}catch(error){
   message.textContent='Не удалось создать WebGL-просмотр: '+error.message;
   return;
  }
  active=true;lastFocus=document.activeElement;
  document.getElementById('center')?.classList.add('hidden');
  overlay.classList.remove('hidden');
  select('flight');
  message.textContent='Выбирай эффект и крути ползунки — модель меняется сразу.';
  $('broom-lab-close').focus();
  frameId=requestAnimationFrame(draw);
 }
 function close(){
  if(!active)return;
  active=false;cancelAnimationFrame(frameId);
  revertBroomTuning();
  broom.reset();
  overlay.classList.add('hidden');
  document.getElementById('center')?.classList.remove('hidden');
  lastFocus?.focus?.();
 }
 openButton.addEventListener('click',open);
 $('broom-lab-close').addEventListener('click',close);
 $('broom-lab-save').addEventListener('click',()=>{
  const saved=saveBroomTuning();
  message.textContent=saved?'Сохранено! Эффект изменён и в обычном забеге.':'Изменено, но браузер не разрешает постоянное сохранение.';
 });
 $('broom-lab-reset').addEventListener('click',()=>{
  resetBroomTuning();sync();
  message.textContent='Стандартные настройки восстановлены и сохранены.';
 });
 $('broom-lab-copy').addEventListener('click',async()=>{
  const text=JSON.stringify(broomTuningSnapshot(),null,2);
  try{await navigator.clipboard.writeText(text);message.textContent='Пресет скопирован — можно прислать его в чат.';}
  catch{message.textContent='Буфер обмена недоступен. Используй кнопку «Сохранить».';}
 });
 window.addEventListener('keydown',e=>{
  if(active&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
 },true);
 window.addEventListener('resize',resize);
 return {open,close,isOpen:()=>active};
}
