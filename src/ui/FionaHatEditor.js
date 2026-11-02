import '../styles/hat-dev-editor.css';
import {HAT_DEV_CONTROLS,DEFAULT_HAT_DEV_PLACEMENT,normalizeHatDevPlacement} from '../powerups/HatDevPlacement.js';
import {DEFAULT_HAT_CAMERA,normalizeHatCamera} from './HatOrbitCamera.js';

// Visible only in the optional 3D Fiona DEV run. The hat is previewed on
// Fiona's head regardless of magnet pickup, with real-time transform changes.
const STORAGE_KEY='knottyPineDevHatPlacementV1';
export function createFionaHatEditor({onOpen,onClose,onChange,onCameraChange}){
 let cameraValues={...DEFAULT_HAT_CAMERA};
 let values={...DEFAULT_HAT_DEV_PLACEMENT};
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(saved&&typeof saved==='object')values=normalizeHatDevPlacement(saved);
 }catch{}
 const toggle=document.createElement('button');
 toggle.id='fiona-hat-dev-toggle';
 toggle.type='button';
 toggle.className='hidden';
 toggle.textContent='✦ ШЛЯПА · DEV';
 toggle.setAttribute('aria-label','Открыть редактор шляпы Фионы');
 document.body.append(toggle);

 const panel=document.createElement('section');
 panel.id='fiona-hat-dev-panel';
 panel.className='hidden';
 panel.setAttribute('aria-label','Редактор шляпы 3D-Фионы');
 panel.innerHTML=`
  <header class="hat-dev-header">
   <div><small>DEV · 3D-ФИОНА</small><h2>Посадка шляпы</h2></div>
   <button id="hat-dev-close" type="button" aria-label="Закрыть редактор шляпы">×</button>
  </header>
  <p class="hat-dev-info">Забег остановлен. Шляпа видна без сбора предмета. Отрегулируй положение на голове, поворот и размер.</p>
  <div id="hat-dev-sliders"></div>
  <div class="hat-dev-camera">
   <h3>Камера вокруг Фионы</h3>
   <p>Тяни мышью или пальцем по сцене для обзора. Колесо мыши приближает и отдаляет.</p>
   <label for="hat-dev-camera-angle">Горизонтальный ракурс</label>
   <input id="hat-dev-camera-angle" type="range" min="0" max="360" step="1" value="0">
   <output id="hat-dev-camera-angle-output">0°</output>
   <label for="hat-dev-camera-pitch">Смотреть сверху / снизу</label>
   <input id="hat-dev-camera-pitch" type="range" min="-35" max="80" step="1" value="15">
   <output id="hat-dev-camera-pitch-output">15°</output>
   <label for="hat-dev-camera-zoom">Приближение камеры</label>
   <input id="hat-dev-camera-zoom" type="range" min="2" max="9" step=".1" value="4.2">
   <output id="hat-dev-camera-zoom-output">4.2</output>
   <div class="hat-dev-camera-presets">
    <button type="button" data-hat-cam="front">Спереди</button>
    <button type="button" data-hat-cam="side">Сбоку</button>
    <button type="button" data-hat-cam="back">Сзади</button>
    <button type="button" data-hat-cam="top">Сверху</button>
   </div>
   <button type="button" id="hat-dev-camera-reset">Сбросить камеру</button>
  </div>
  <div class="hat-dev-actions">
   <button type="button" id="hat-dev-reset">Сбросить</button>
   <button type="button" id="hat-dev-copy">Копировать JSON</button>
  </div>
  <textarea id="hat-dev-json" readonly hidden aria-label="Настройки шляпы для отправки в чат"></textarea>
  <p id="hat-dev-message" role="status" aria-live="polite">Готовую позу скопируй и пришли мне в чат.</p>
 `;
 document.body.append(panel);
 const $=id=>panel.querySelector('#'+id);
 const controls=new Map();
 for(const control of HAT_DEV_CONTROLS){
  const label=document.createElement('label');label.className='hat-dev-row';
  const name=document.createElement('span');name.textContent=control.label;
  const input=document.createElement('input');input.type='range';input.min=String(control.min);input.max=String(control.max);input.step=String(control.step);
  input.value=String(values[control.key]);input.setAttribute('aria-label',control.label);
  const output=document.createElement('output');output.textContent=values[control.key]+control.unit;
  label.append(name,input,output);$('hat-dev-sliders').append(label);
  controls.set(control.key,{input,output});
  input.addEventListener('input',()=>{
   values[control.key]=Number(input.value);
   output.textContent=input.value+control.unit;
   $('hat-dev-json').hidden=true;
   try{localStorage.setItem(STORAGE_KEY,JSON.stringify(values));}catch{}
   onChange?.({...values});
  });
 }
 function sync(){
  for(const control of HAT_DEV_CONTROLS){
   const {input,output}=controls.get(control.key);
   input.value=String(values[control.key]);
   output.textContent=values[control.key]+control.unit;
  }
  onChange?.({...values});
 }
 function setCameraValues(values){
  cameraValues=normalizeHatCamera(values);
  const angle=Math.round(cameraValues.angle);
  const pitch=Math.round(cameraValues.pitch);
  const distance=Number(cameraValues.distance.toFixed(1));
  $('hat-dev-camera-angle').value=String(angle);
  $('hat-dev-camera-angle-output').textContent=angle+'°';
  $('hat-dev-camera-pitch').value=String(pitch);
  $('hat-dev-camera-pitch-output').textContent=pitch+'°';
  $('hat-dev-camera-zoom').value=String(distance);
  $('hat-dev-camera-zoom-output').textContent=distance.toFixed(1);
 }
 for(const [id,key] of [['hat-dev-camera-angle','angle'],['hat-dev-camera-pitch','pitch'],['hat-dev-camera-zoom','distance']]){
  $(id).addEventListener('input',()=>onCameraChange?.({[key]:Number($(id).value)}));
 }
 for(const button of panel.querySelectorAll('[data-hat-cam]')){
  button.addEventListener('click',()=>{
   const angles={front:{angle:180,pitch:12},side:{angle:90,pitch:12},
    back:{angle:0,pitch:12},top:{angle:0,pitch:75}};
   onCameraChange?.(angles[button.dataset.hatCam]);
  });
 }
 $('hat-dev-camera-reset').addEventListener('click',()=>onCameraChange?.({...DEFAULT_HAT_CAMERA}));
 setCameraValues(DEFAULT_HAT_CAMERA);
 function close(){
  if(panel.classList.contains('hidden'))return;
  panel.classList.add('hidden');
  document.body.classList.remove('fiona-hat-dev-open');
  onClose?.();
 }
 toggle.addEventListener('click',()=>{
  if(!onOpen?.())return;
  panel.classList.remove('hidden');
  document.body.classList.add('fiona-hat-dev-open');
  $('hat-dev-json').hidden=true;
  sync();
 });
 $('hat-dev-close').addEventListener('click',close);
 $('hat-dev-reset').addEventListener('click',()=>{
  values={...DEFAULT_HAT_DEV_PLACEMENT};
  try{localStorage.removeItem(STORAGE_KEY);}catch{}
  $('hat-dev-json').hidden=true;
  $('hat-dev-message').textContent='Положение возвращено к исходному.';
  sync();
 });
 $('hat-dev-copy').addEventListener('click',async()=>{
  const json=JSON.stringify({kind:'knotty-pine-worn-hat-placement',version:1,settings:values},null,2);
  const area=$('hat-dev-json');area.value=json;area.hidden=false;
  try{
   await navigator.clipboard.writeText(json);
   $('hat-dev-message').textContent='Скопировано! Вставь JSON сюда в чат.';
  }catch{
   area.focus();area.select();
   $('hat-dev-message').textContent='Настройки выделены. Нажми Ctrl+C и отправь их в чат.';
  }
 });
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();}
  event.stopPropagation();
 });
 panel.addEventListener('pointerdown',event=>event.stopPropagation());
 panel.addEventListener('pointerup',event=>event.stopPropagation());
 function setAvailable(enabled){
  if(!enabled)close();
  toggle.classList.toggle('hidden',!enabled);
 }
 return {setAvailable,close,setCameraValues,getValues:()=>({...values})};
}
