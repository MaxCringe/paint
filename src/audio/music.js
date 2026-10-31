// Background music for KNOTTY PINE.
// TokyoGeisha — "Creepy" / "CrEEP.mp3" (OpenGameArt, CC0).
// An HTMLAudioElement streams the original loop without loading it into Web Audio memory.
const VOLUME_KEY='knottyPineMusicVolume';
const MUTE_KEY='knottyPineMusicMuted';
const clamp = v => Math.min(1, Math.max(0, Number(v) || 0));
const loadSetting=(key, fallback)=>{try{return localStorage.getItem(key) ?? fallback;}catch{return fallback;}};
const saveSetting=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};

export function createGameMusic() {
  let volume=clamp(loadSetting(VOLUME_KEY,'0.20'));
  let muted=loadSetting(MUTE_KEY,'0')==='1';
  let track=null;
  let playing=false;
  function ensureTrack() {
    if(track) return track;
    const audio=new Audio(import.meta.env.BASE_URL+'audio/music/creepy-tokyogeisha.mp3');
    audio.loop=true;
    audio.preload='auto';
    audio.volume=muted?0:volume;
    audio.addEventListener('error',()=>console.warn('KNOTTY PINE background music failed to load'));
    track=audio;
    return track;
  }
  function syncVolume(){
    if(track) track.volume=muted?0:volume;
  }
  function start(){
    playing=true;
    const audio=ensureTrack();
    audio.pause();
    try{audio.currentTime=0;}catch{}
    syncVolume();
    const result=audio.play();
    if(result?.catch) result.catch(err=>console.warn('Background music playback blocked',err));
  }
  function pause(){
    playing=false;
    if(track)track.pause();
  }
  function resume(){
    playing=true;
    const audio=ensureTrack();
    syncVolume();
    const result=audio.play();
    if(result?.catch) result.catch(err=>console.warn('Background music resume blocked',err));
  }
  function setMuted(next){
    muted=Boolean(next);
    saveSetting(MUTE_KEY,muted?'1':'0');
    syncVolume();
  }
  function setVolume(next){
    volume=clamp(next);
    saveSetting(VOLUME_KEY,volume);
    syncVolume();
  }
  return {start,pause,resume,setMuted,setVolume,getMuted:()=>muted,getVolume:()=>volume,isPlaying:()=>playing};
}
