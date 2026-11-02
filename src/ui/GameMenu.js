// Shared start and pause menu; game-over results now have a dedicated panel.
// Continue is visible only when a live run has been paused.
export function createGameMenu({onStart,onResume,onPause,haptics,fpsDisplay,onWorldEditor}){
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
  fpsDisplay.style.display=showFps&&root.classList.contains('hidden')&&!document.body.classList.contains('game-over-open')?'block':'none';
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

 // Build the section only when the game's existing build flag enables it.
 // Reusing menu classes preserves the ash/copper theme and audio controls.
 if(onWorldEditor){
  const section=document.createElement('section');section.id='menu-developer-tools';
  section.setAttribute('aria-labelledby','menu-developer-tools-title');
  const title=document.createElement('p');title.id='menu-developer-tools-title';
  title.className='menu-settings-title';title.textContent='ИНСТРУМЕНТЫ РАЗРАБОТЧИКА';
  const button=document.createElement('button');button.id='menu-open-world-editor';
  button.className='menu-action menu-secondary';button.type='button';button.textContent='Редактор мира';
  const status=document.createElement('p');status.className='menu-settings-title';status.setAttribute('role','status');status.hidden=true;
  section.append(title,button,status);
  $('audio-controls').after(section);
  button.addEventListener('click',async()=>{
   button.disabled=true;status.hidden=true;
   try{await onWorldEditor();}
   catch(error){console.error('World editor failed to open:',error);status.textContent='Не удалось открыть редактор. Попробуйте ещё раз.';status.hidden=false;}
   finally{button.disabled=false;}
  });
 }

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
  document.body.classList.remove('game-over-open');
  document.body.classList.add('menu-open');
  pause.classList.add('hidden');
  syncFps();
 }
 function hide(){
  root.classList.add('hidden');
  document.body.classList.remove('menu-open','game-over-open');
  pause.classList.remove('hidden');
  openPage('main');
  syncFps();
 }
 function showGameOver(){
  // Keep the same darkened 3D background, but not the title/pause menu.
  root.classList.add('hidden');
  pause.classList.add('hidden');
  document.body.classList.add('menu-open','game-over-open');
  syncFps();
 }
 function escape(){
  if(page==='main')return false;
  openPage('main');return true;
 }
 return {show,hide,showGameOver,escape,isSubpageOpen:()=>page!=='main'};
}
