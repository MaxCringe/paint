// KNOTTY PINE's single menu works for ready, paused and game-over states.
// No separate pause overlay; only the Continue action changes with run state.
export function createGameMenu({onStart,onResume,onPause,haptics,fpsDisplay}){
 const $=id=>document.getElementById(id);
 const root=$('center'), pages={
  main:$('menu-main'),help:$('menu-help'),settings:$('menu-settings')
 };
 const tabButtons=Array.from(root.querySelectorAll('[data-help-tab]'));
 const helpPages={pc:$('help-pc'),mobile:$('help-mobile')};
 const resume=$('resume'),start=$('start'),pause=$('pause-button');
 let page='main',mode='ready';

 function openPage(next){
  page=next;
  for(const [name,element] of Object.entries(pages))
   element.classList.toggle('hidden',name!==next);
 }
 function helpTab(name){
  for(const [kind,element] of Object.entries(helpPages))
   element.classList.toggle('hidden',kind!==name);
  for(const button of tabButtons){
   const selected=button.dataset.helpTab===name;
   button.setAttribute('aria-selected',String(selected));
   button.classList.toggle('selected',selected);
  }
 }
 const isTouch=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
 helpTab(isTouch?'mobile':'pc');

 const storageKey='knottyPineShowFps';
 let showFps=false;
 try{showFps=localStorage.getItem(storageKey)==='1';}catch{}
 const fpsToggle=$('fps-toggle');
 function syncFps(){
  fpsDisplay.style.display=showFps&&root.classList.contains('hidden')?'block':'none';
  fpsToggle.checked=showFps;
 }
 fpsToggle.addEventListener('change',()=>{
  showFps=fpsToggle.checked;
  try{localStorage.setItem(storageKey,showFps?'1':'0');}catch{}
  syncFps();
 });
 syncFps();

 const vibration=$('vibration-toggle'),vibrationInfo=$('vibration-info');
 const supported=haptics.supported;
 vibration.disabled=!supported;
 vibration.checked=supported&&haptics.enabled;
 vibrationInfo.textContent=supported
  ?'Короткие импульсы при сборе предметов, ульте и столкновениях.'
  :'Браузер устройства не поддерживает вибрацию игры.';
 vibration.addEventListener('change',()=>haptics.setEnabled(vibration.checked));

 $('menu-open-help').addEventListener('click',()=>openPage('help'));
 $('menu-open-settings').addEventListener('click',()=>openPage('settings'));
 root.querySelectorAll('[data-menu-back]').forEach(button=>
  button.addEventListener('click',()=>openPage('main')));
 tabButtons.forEach(button=>button.addEventListener('click',()=>helpTab(button.dataset.helpTab)));
 start.addEventListener('click',onStart);
 resume.addEventListener('click',onResume);
 pause.addEventListener('click',onPause);

 function show(nextMode){
  mode=nextMode;
  openPage('main');
  resume.classList.toggle('hidden',mode!=='paused');
  start.textContent=mode==='ready'?'НАЧАТЬ ЗАБЕГ':mode==='paused'?'НАЧАТЬ ЗАНОВО':'НОВАЯ ИГРА';
  root.classList.remove('hidden');
  pause.classList.add('hidden');
  syncFps();
 }
 function hide(){
  root.classList.add('hidden');
  pause.classList.remove('hidden');
  openPage('main');
  syncFps();
 }
 function escape(){
  if(page==='main')return false;
  openPage('main');return true;
 }
 return {show,hide,escape,isSubpageOpen:()=>page!=='main'};
}
