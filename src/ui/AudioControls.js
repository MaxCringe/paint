// Audio settings UI only. Sound playback and saved user volumes remain in
// src/audio/sfx.js and src/audio/music.js, respectively.
export function createAudioControls(audio,music){
 const byId=id=>document.getElementById(id);
 function bind({toggleId,volumeId,labelId,controller,unmutedIcon,ariaName}){
  const toggle=byId(toggleId);
  const slider=byId(volumeId);
  const label=byId(labelId);
  function sync(){
   const percent=Math.round(controller.getVolume()*100);
   const muted=controller.getMuted();
   toggle.textContent=muted||percent===0?'🔇':unmutedIcon;
   toggle.setAttribute('aria-label',(muted?'Включить ':'Выключить ')+ariaName);
   toggle.setAttribute('aria-pressed',String(!muted));
   if(slider.value!==String(percent))slider.value=String(percent);
   if(label.textContent!==percent+'%')label.textContent=percent+'%';
  }
  toggle.addEventListener('click',()=>{
   controller.setMuted(!controller.getMuted());
   sync();
  });
  slider.addEventListener('input',()=>{
   controller.setVolume(Number(slider.value)/100);
   sync();
  });
  sync();
 }
 bind({toggleId:'sound-toggle',volumeId:'sound-volume',labelId:'sound-volume-value',
  controller:audio,unmutedIcon:'🔊',ariaName:'звук'});
 bind({toggleId:'music-toggle',volumeId:'music-volume',labelId:'music-volume-value',
  controller:music,unmutedIcon:'🎵',ariaName:'музыку'});
}
