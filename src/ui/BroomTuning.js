import {BROOM_EFFECT_DEFAULTS} from '../powerups/BroomEffectSettings.js';

// One small reusable DOM controller for the settings menu and live testing.
// Controls instantly update the same persisted settings used by the renderer.
export function createBroomTuning(settings){
 const presets=[
  ['density','Количество дыма'],
  ['opacity','Густота дыма'],
  ['size','Размер клубов'],
  ['length','Длина шлейфа'],
  ['sparks','Яркость искр']
 ];
 const menu=document.getElementById('menu-settings');
 const hud=document.getElementById('hud');
 function makePanel(prefix){
  const root=document.createElement('section');
  root.className='broom-tuning-panel';
  root.setAttribute('aria-label','Настройка магических эффектов метлы');
  const intro=document.createElement('p');
  intro.className='broom-tuning-info';
  intro.textContent='0% — выключено · 100% — обычный эффект · 200% — усилено';
  root.append(intro);
  const controls=new Map();
  for(const [key,label] of presets){
   const row=document.createElement('div');
   row.className='broom-tuning-row';
   const labelNode=document.createElement('label');
   labelNode.textContent=label;
   const input=document.createElement('input');
   input.type='range';input.id=prefix+'-'+key;
   input.min='0';input.max='200';input.step='5';
   input.setAttribute('aria-label',label+' метлы');
   labelNode.htmlFor=input.id;
   const output=document.createElement('output');
   output.htmlFor=input.id;
   row.append(labelNode,input,output);
   root.append(row);
   controls.set(key,{input,output});
   input.addEventListener('input',()=>settings.set(key,Number(input.value)));
  }
  const reset=document.createElement('button');
  reset.type='button';
  reset.className='broom-tuning-reset';
  reset.textContent='СБРОСИТЬ ЭФФЕКТЫ';
  reset.addEventListener('click',()=>settings.reset());
  root.append(reset);
  settings.subscribe(values=>{
   for(const [key,{input,output}] of controls){
    input.value=String(values[key]);
    output.textContent=values[key]+'%';
   }
  });
  return root;
 }

 const settingsTitle=document.createElement('p');
 settingsTitle.className='menu-settings-title broom-tuning-title';
 settingsTitle.textContent='🧹 Эффекты метлы';
 const panelInMenu=makePanel('broom-menu');
 const backButton=menu.querySelector('.menu-back');
 menu.insertBefore(settingsTitle,backButton);
 menu.insertBefore(panelInMenu,backButton);

 const dock=document.createElement('div');
 dock.id='broom-tuning-dock';
 const toggle=document.createElement('button');
 toggle.id='broom-tuning-toggle';
 toggle.type='button';
 toggle.setAttribute('aria-controls','broom-tuning-live');
 toggle.setAttribute('aria-expanded','false');
 toggle.textContent='🧹 ЭФФЕКТЫ';
 const livePanel=makePanel('broom-live');
 livePanel.id='broom-tuning-live';
 livePanel.hidden=true;
 dock.append(toggle,livePanel);
 hud.append(dock);
 toggle.addEventListener('click',()=>{
  const next=livePanel.hidden;
  livePanel.hidden=!next;
  toggle.setAttribute('aria-expanded',String(next));
  toggle.textContent=next?'🧹 СВЕРНУТЬ':'🧹 ЭФФЕКТЫ';
 });
 // No game mechanic changes; the live editor is hidden while in menus.
 return {dock,settingsPanel:panelInMenu};
}
