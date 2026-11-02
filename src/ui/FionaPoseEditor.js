import '../styles/fiona-pose-editor.css';
import {DEFAULT_POWER_POSE,POWER_POSE_CONTROLS,normalizePowerPose} from '../player/PowerLevitationPose.js';

// DEV-only workshop. The runner is frozen while its live 3D pose is edited;
// clipboard settings are handed back to the developer to bake into the game.
const KEY='knottyPineDevUltimatePoseV1';
export function createFionaPoseEditor({onOpen,onClose,onChange,onRotate}){
 let values={...DEFAULT_POWER_POSE};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')values=normalizePowerPose(saved);}catch{}
 const toggle=document.createElement('button');
 toggle.id='fiona-pose-editor-toggle';toggle.type='button';
 toggle.textContent='✦ РЕДАКТОР УЛЬТЫ · DEV';toggle.className='hidden';
 toggle.setAttribute('aria-label','Открыть редактор позы Фионы');
 document.body.append(toggle);
 const panel=document.createElement('section');
 panel.id='fiona-pose-editor';panel.className='hidden';
 panel.setAttribute('aria-label','Редактор позы ульты');
 panel.innerHTML=`
 <header class="pose-header"><div><small>DEV · 3D-ФИОНА</small><h2>Поза ульты</h2></div><button id="pose-close" type="button" aria-label="Закрыть">×</button></header>
 <p class="pose-intro">Забег заморожен. Регулируй руки, ноги и корпус — результат виден сразу. Настройки только в твоём браузере.</p>
 <div id="pose-controls"></div>
 <div class="pose-turn"><label for="pose-turn">Повернуть Фиону</label><input id="pose-turn" type="range" min="0" max="360" step="5" value="0"><output id="pose-turn-output">0°</output></div>
 <div class="pose-actions"><button type="button" id="pose-reset">Сбросить</button><button type="button" id="pose-copy">Копировать JSON</button></div>
 <textarea id="pose-export" readonly hidden aria-label="Настройки для отправки в ChatGPT"></textarea>
 <p id="pose-status" role="status" aria-live="polite">Когда закончишь — скопируй JSON и пришли его мне в чат.</p>
 `;
 document.body.append(panel);
 const $=id=>panel.querySelector('#'+id);
 const sliderMap=new Map();
 for(const item of POWER_POSE_CONTROLS){
  const row=document.createElement('label');row.className='pose-row';
  const name=document.createElement('span');name.textContent=item.label;
  const range=document.createElement('input');range.type='range';
  range.min=String(item.min);range.max=String(item.max);range.step='1';
  range.value=String(values[item.key]);range.setAttribute('aria-label',item.label);
  const output=document.createElement('output');output.textContent=values[item.key]+'°';
  row.append(name,range,output);$('pose-controls').append(row);
  sliderMap.set(item.key,{range,output});
  range.addEventListener('input',()=>{
   values[item.key]=Number(range.value);output.textContent=range.value+'°';
   $('pose-export').hidden=true;
   try{localStorage.setItem(KEY,JSON.stringify(values));}catch{}
   onChange?.({...values});
  });
 }
 function syncValues(){
  for(const [key,{range,output}] of sliderMap){
   range.value=String(values[key]);output.textContent=values[key]+'°';
  }
  onChange?.({...values});
 }
 const yaw=$('pose-turn');
 yaw.addEventListener('input',()=>{$('pose-turn-output').textContent=yaw.value+'°';onRotate?.(Number(yaw.value));});
 function close(){
  if(panel.classList.contains('hidden'))return;
  panel.classList.add('hidden');document.body.classList.remove('fiona-pose-editor-open');
  yaw.value='0';$('pose-turn-output').textContent='0°';
  onClose?.();
 }
 toggle.addEventListener('click',()=>{
  if(!onOpen?.())return;
  panel.classList.remove('hidden');document.body.classList.add('fiona-pose-editor-open');
  $('pose-export').hidden=true;syncValues();onRotate?.(0);
 });
 $('pose-close').addEventListener('click',close);
 $('pose-reset').addEventListener('click',()=>{
  values={...DEFAULT_POWER_POSE};
  try{localStorage.removeItem(KEY);}catch{}
  $('pose-export').hidden=true;
  $('pose-status').textContent='Значения сброшены к исходным.';
  syncValues();
 });
 $('pose-copy').addEventListener('click',async()=>{
  const json=JSON.stringify({kind:'knotty-pine-ultimate-pose',version:1,settings:values},null,2);
  const area=$('pose-export');area.value=json;area.hidden=false;
  try{await navigator.clipboard.writeText(json);$('pose-status').textContent='JSON скопирован — вставь его в чат.';}
  catch{area.focus();area.select();$('pose-status').textContent='JSON выделен — нажми Ctrl+C и пришли его мне.';}
 });
 panel.addEventListener('keydown',e=>e.stopPropagation());
 panel.addEventListener('pointerdown',e=>e.stopPropagation());
 panel.addEventListener('pointerup',e=>e.stopPropagation());
 function setAvailable(enabled){
  if(!enabled)close();
  toggle.classList.toggle('hidden',!enabled);
 }
 return {setAvailable,close,getValues:()=>({...values})};
}
