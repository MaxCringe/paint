// Live visual-only presets for the real Three.js broom trail.
export const BROOM_VISUAL_PROFILES=Object.freeze({
 flight:Object.freeze({density:180,opacity:110,size:150,length:90,streaks:95,coughs:150,sparks:150,smokeRise:100,sparkSpread:100,sparkSize:100,glowSize:100,glowIntensity:100,smokeColor:'#d8c5ec',coughColor:'#d8c5ec',streakColor:'#dbcbff',sparkColor:'#ffc17c',glowColor:'#dec5ff'}),
 landing:Object.freeze({density:150,opacity:70,size:150,length:50,streaks:39,coughs:250,sparks:299,smokeRise:100,sparkSpread:100,sparkSize:100,glowSize:100,glowIntensity:100,smokeColor:'#d8c5ec',coughColor:'#d8c5ec',streakColor:'#dbcbff',sparkColor:'#ffc17c',glowColor:'#dec5ff'})
});
export const BROOM_LANDING_TRANSITION_SECONDS=3;
export const BROOM_TUNING_STORAGE_KEY='knottyPineBroomVisualLabV1';
export const BROOM_VISUAL_RANGES=Object.freeze({
 density:[0,200],opacity:[0,200],size:[15,220],length:[15,200],
 sparks:[0,400],streaks:[0,200],coughs:[0,250],
 smokeRise:[0,200],sparkSpread:[0,250],sparkSize:[0,250],glowSize:[20,250],glowIntensity:[0,200]
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const isColor=s=>typeof s==='string'&&/^#[a-f0-9]{6}$/i.test(s);
export const BROOM_VISUAL_COLOR_KEYS=Object.freeze(['smokeColor','coughColor','streakColor','sparkColor','glowColor']);
const modes=['flight','landing'];
const clone=v=>JSON.parse(JSON.stringify(v));
const copyDefaults=()=>Object.fromEntries(modes.map(mode=>[mode,{...BROOM_VISUAL_PROFILES[mode]}]));
function sanitizeMode(mode,values){
 const safe={...BROOM_VISUAL_PROFILES[mode]};
 for(const [key,[min,max]] of Object.entries(BROOM_VISUAL_RANGES)){
  if(values&&values[key]!==undefined&&Number.isFinite(Number(values[key])))
   safe[key]=clamp(Number(values[key]),min,max);
 }
 for(const key of BROOM_VISUAL_COLOR_KEYS)
  if(isColor(values?.[key]))safe[key]=values[key].toLowerCase();
 return safe;
}
function loadSaved(){
 try{
  const saved=import.meta.env?.VITE_ENABLE_EFFECT_EDITOR==='false'
   ?null:JSON.parse(localStorage.getItem(BROOM_TUNING_STORAGE_KEY)||'null');
  if(saved&&typeof saved==='object')
   return Object.fromEntries(modes.map(m=>[m,sanitizeMode(m,saved[m])]));
 }catch{}
 return copyDefaults();
}
let savedProfiles=loadSaved();
let draft=clone(savedProfiles);
export function broomTuningSnapshot(){return clone(draft);}
export function setBroomTuningValue(mode,key,value){
 if(!modes.includes(mode))return;
 if(BROOM_VISUAL_COLOR_KEYS.includes(key)){if(isColor(value))draft[mode][key]=value.toLowerCase();return;}
 const range=BROOM_VISUAL_RANGES[key],n=Number(value);
 if(range&&Number.isFinite(n))draft[mode][key]=clamp(n,...range);
}
export function saveBroomTuning(){
 savedProfiles=clone(draft);
 try{localStorage.setItem(BROOM_TUNING_STORAGE_KEY,JSON.stringify(savedProfiles));return true;}catch{return false;}
}
export function revertBroomTuning(){draft=clone(savedProfiles);}
export function resetBroomTuning(){
 draft=copyDefaults();
 savedProfiles=copyDefaults();
 try{localStorage.removeItem(BROOM_TUNING_STORAGE_KEY);}catch{}
}
function blendColor(a,b,k){
 const channel=i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-k)+parseInt(b.slice(i,i+2),16)*k);
 return '#'+[1,3,5].map(i=>channel(i).toString(16).padStart(2,'0')).join('');
}
export function broomVisualProfile(remaining){
 const seconds=Number.isFinite(remaining)?Math.max(0,remaining):0;
 const elapsed=clamp((BROOM_LANDING_TRANSITION_SECONDS-seconds)/BROOM_LANDING_TRANSITION_SECONDS,0,1);
 const transition=elapsed*elapsed*(3-2*elapsed);
 const flight=draft.flight,landing=draft.landing;
 const lerp=(a,b)=>a+(b-a)*transition;
 const mixed={transition};
 for(const key of Object.keys(BROOM_VISUAL_RANGES))
  mixed[key]=lerp(flight[key],landing[key]);
 for(const key of BROOM_VISUAL_COLOR_KEYS)
  mixed[key]=blendColor(flight[key],landing[key],transition);
 return mixed;
}
