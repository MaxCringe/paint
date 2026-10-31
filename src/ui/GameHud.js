// KNOTTY PINE interface only: no Three.js, no gameplay rules.
export function createGameHud({soulGoal,ultimateDuration}){
 const byId=id=>document.getElementById(id);
 const els={
  distance:byId('distance'),coins:byId('coins'),fill:byId('soul-fill'),
  meter:byId('soul-meter-wrap'),state:byId('soul-state'),
  count:byId('soul-count'),best:byId('best'),
  bestSouls:byId('best-souls'),toast:byId('toast'),
  distancePill:byId('distance-pill'),soulsPill:byId('souls-pill'),
  scarfIndicator:byId('scarf-indicator'),scarfCount:byId('scarf-count')
 };
 const magnet=document.createElement('div');
 magnet.className='hud-ability hud-ability-magnet';
 magnet.hidden=true;
 els.meter.append(magnet);
 const cache=new Map();
 let lastPaint=-Infinity,toastTime=0;
 function text(element,key,value){
  const next=String(value);
  if(cache.get(key)===next)return;
  element.textContent=next;
  cache.set(key,next);
 }
 function update({distance,coinCount,soulCharge,ultTimer,magnetTime,scarfHeld=false},force=false){
  const now=performance.now();
  if(!force&&now-lastPaint<100)return; // Ten HUD updates/sec, independent of FPS.
  lastPaint=now;
  const active=ultTimer>0;
  text(els.distance,'distance',Math.floor(distance)+' m');
  text(els.coins,'coins',coinCount);
  const hasScarf=Boolean(scarfHeld);
  text(els.scarfCount,'scarf-count',hasScarf?1:0);
  els.scarfIndicator.classList.toggle('is-ready',hasScarf);
  els.scarfIndicator.setAttribute('aria-label','Платок Мисти: '+(hasScarf?'1, готов к воскрешению':'0, отсутствует'));
  els.scarfIndicator.title=hasScarf?'Платок Мисти: 1 — можно воскреснуть':'Платок Мисти: 0';
  const amount=active?Math.max(0,ultTimer/ultimateDuration*100):soulCharge/soulGoal*100;
  const width=Math.max(0,Math.min(100,amount)).toFixed(1)+'%';
  if(cache.get('bar')!==width){
   els.fill.style.width=width;
   cache.set('bar',width);
  }
  els.meter.classList.toggle('active',active);
  text(els.state,'state',active?'УЛЬТА — ПОЛЁТ':'ПЛАМЯ ДУШ');
  text(els.count,'count',active?Math.ceil(ultTimer)+' с':soulCharge+'/'+soulGoal);
  const showMagnet=magnetTime>0;
  magnet.hidden=!showMagnet;
  if(showMagnet)text(magnet,'magnet','🎩 МАГНИТ '+magnetTime.toFixed(1)+' с');
 }
 function setRecords(metres,souls){
  text(els.best,'record-metres',metres+' m');
  text(els.bestSouls,'record-souls',souls);
 }
 // Persist the glow throughout the achievement run, not across restarts.
 // Only touch the DOM when a flag actually changes.
 const recordVisual={metres:false,souls:false};
 function setRecordHighlights({metres=false,souls=false}={}){
  if(recordVisual.metres!==metres){
   els.distancePill.classList.toggle('new-record',metres);
   recordVisual.metres=metres;
  }
  if(recordVisual.souls!==souls){
   els.soulsPill.classList.toggle('new-record',souls);
   recordVisual.souls=souls;
  }
 }
 function toast(message){
  if(message==='+ 1 ДУША'||message==='+1 ДУША'||message==='+ COIN')return;
  els.toast.textContent=message;
  els.toast.classList.add('show');
  toastTime=.85;
 }
 function tick(dt){
  if(toastTime<=0)return;
  toastTime-=dt;
  if(toastTime<=0)els.toast.classList.remove('show');
 }
 function clearToast(){toastTime=0;els.toast.classList.remove('show');}
 return {update,setRecords,setRecordHighlights,toast,tick,clearToast};
}
