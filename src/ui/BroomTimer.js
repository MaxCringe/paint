// Lightweight, independent broom flight timer for desktop and touch screens.
// All markup is created once; updates occur with the existing throttled HUD.
export function createBroomTimer({duration,root=document.getElementById('hud')}){
 const panel=document.createElement('div');
 panel.id='broom-flight-status';
 panel.hidden=true;
 panel.setAttribute('role','timer');
 panel.setAttribute('aria-live','off');
 panel.setAttribute('aria-label','Время полёта на метле');
 const heading=document.createElement('span');
 heading.className='broom-flight-heading';
 const seconds=document.createElement('span');
 seconds.className='broom-flight-seconds';
 const track=document.createElement('div');
 track.className='broom-flight-track';
 const fill=document.createElement('div');
 fill.className='broom-flight-fill';
 track.append(fill);
 panel.append(heading,seconds,track);
 root.append(panel);
 let lastHeading='',lastSeconds='',lastWidth='';
 function update(remaining,active){
  if(!active||remaining<=0){
   panel.hidden=true;
   panel.classList.remove('is-ending');
   return;
  }
  panel.hidden=false;
  const warning=remaining<=3;
  panel.classList.toggle('is-ending',warning);
  const headingText=warning?'ПОСАДКА ЧЕРЕЗ':'🧹 ПОЛЁТ НА МЕТЛЕ';
  const secondsText=warning?Math.ceil(remaining)+' С':remaining.toFixed(1)+' С';
  const width=(Math.max(0,Math.min(1,remaining/duration))*100).toFixed(1)+'%';
  if(headingText!==lastHeading){heading.textContent=headingText;lastHeading=headingText}
  if(secondsText!==lastSeconds){seconds.textContent=secondsText;lastSeconds=secondsText}
  if(width!==lastWidth){fill.style.width=width;lastWidth=width}
 }
 return {update,panel};
}
