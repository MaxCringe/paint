import { resolveFionaAssets } from '../player/FionaAssetCache.js';
import { FIONA_ANIMATION_SLOTS } from '../player/FionaAnimationSlots.js';

// Shared start and pause menu; game-over results now have a dedicated panel.
// Continue is visible only when a live run has been paused.
export function createGameMenu({onStart,onResume,onPause,onStartTest,onPreviewTest,haptics,fpsDisplay}){
 const $=id=>document.getElementById(id);
 const root=$('center'), pages={
  main:$('menu-main'),help:$('menu-help'),settings:$('menu-settings'),fionaTest:$('menu-fiona-test')
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

 $('menu-open-help').addEventListener('click',()=>openPage('help'));
 $('menu-open-settings').addEventListener('click',()=>openPage('settings'));
  $('menu-open-fiona-test').addEventListener('click',()=>openPage('fionaTest'));
  const testStatus=$('fiona-test-status'),testLaunch=$('fiona-test-launch');
  const previews=$('fiona-test-preview-actions');
  const previewPanel=$('fiona-test-tools');
  const previewStatus=$('fiona-test-preview-status');
  const previewButtons=new Map();
  const animationGroups=new Map();
  for(const slot of FIONA_ANIMATION_SLOTS){
    const button=document.createElement('button');
    button.type='button';button.className='fiona-test-preview-button';
    button.textContent=slot.label;
    button.title='Python-анимация ещё не загружена';
    button.disabled=true;
    button.addEventListener('click',()=>{
      const result=onPreviewTest?.(slot.id);
      previewStatus.textContent=result?.message||'Предпросмотр недоступен.';
    });
    previews.append(button);
    previewButtons.set(slot.id,button);
  }
  function showFionaPreviewTools(enabled,loaded=new Set(),prototypeIds=new Set()){
    previewPanel.classList.toggle('hidden',!enabled);
    if(!enabled){previewPanel.open=false;return;}
    const names=new Set(loaded);
    let count=0;
    for(const slot of FIONA_ANIMATION_SLOTS){
      const button=previewButtons.get(slot.id);
      const has=names.has(slot.id);
      button.disabled=!has;
      button.classList.toggle('fiona-test-preview-loaded',has);
      button.title=has?'Python/NumPy: '+slot.label:'Анимация пока недоступна';
      button.textContent=slot.label+(prototypeIds.has(slot.id)?' · Python':'');
      if(has)count++;
    }
    previewStatus.textContent='Доступно движений: '+count+'/'+FIONA_ANIMATION_SLOTS.length+
      ' (сгенерировано на Python: '+prototypeIds.size+'). Проверяй в тестовом забеге.';
  }
  testLaunch.addEventListener('click',async()=>{
    const modelFile=$('fiona-model-file').files?.[0];
    testLaunch.disabled=true;testStatus.textContent='Ищу Фиону и проверяю анимации…';
    try{
      const resolved=await resolveFionaAssets({modelFile});
      await onStartTest({...resolved.files,turn:$('fiona-test-turn').checked});
      testStatus.textContent='Тест запущен: модель '+(resolved.origin==='website'?'из GitHub':'с компьютера')+
        ', анимации Python/NumPy (23).';
    }catch(error){
      console.error('Fiona test load failed',error);
      testStatus.textContent='Ошибка: '+(error?.message||String(error));
    }finally{testLaunch.disabled=false;}
  });
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
 return {show,hide,showGameOver,escape,showFionaPreviewTools,isSubpageOpen:()=>page!=='main'};
}
