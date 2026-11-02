import '../styles/hat-dev-editor.css';
import {HAT_DEV_CONTROLS,DEFAULT_HAT_DEV_PLACEMENT,normalizeHatDevPlacement} from '../powerups/HatDevPlacement.js';

// Visible only in the optional 3D Fiona DEV run. The hat is previewed on
// Fiona's head regardless of magnet pickup, with real-time transform changes.
const STORAGE_KEY='knottyPineDevHatPlacementV1';
export function createFionaHatEditor({onOpen,onClose,onChange,onRotate}){
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
  <div class="hat-dev-view">
   <label for="hat-dev-view-angle">Повернуть Фиону для осмотра</label>
   <input id="hat-dev-view-angle" type="range" min="0" max="360" step="5" value="0">
   <output id="hat-dev-view-output">0°</output>
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
 const turn=$('hat-dev-view-angle');
 turn.addEventListener('input',()=>{
  $('hat-dev-view-output').textContent=turn.value+'°';
  onRotate?.(Number(turn.value));
 });
 function close(){
  if(panel.classList.contains('hidden'))return;
  panel.classList.add('hidden');
  document.body.classList.remove('fiona-hat-dev-open');
  turn.value='0';$('hat-dev-view-output').textContent='0°';
  onClose?.();
 }
 toggle.addEventListener('click',()=>{
  if(!onOpen?.())return;
  panel.classList.remove('hidden');
  document.body.classList.add('fiona-hat-dev-open');
  $('hat-dev-json').hidden=true;
  sync();onRotate?.(0);
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
 return {setAvailable,close,getValues:()=>({...values})};
}
