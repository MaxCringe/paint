// Live visual-only presets for the real Three.js broom trail.
export const BROOM_VISUAL_PROFILES=Object.freeze({
 flight:Object.freeze({density:150,opacity:100,size:80,length:95,sparks:65,streaks:100,coughs:100,smokeColor:'#ffffff'}),
 landing:Object.freeze({density:45,opacity:30,size:65,length:35,sparks:200,streaks:100,coughs:100,smokeColor:'#ffffff'})
});
export const BROOM_LANDING_TRANSITION_SECONDS=3;
export const BROOM_TUNING_STORAGE_KEY='knottyPineBroomVisualLabV1';
export const BROOM_VISUAL_RANGES=Object.freeze({
 density:[0,200],opacity:[0,200],size:[15,220],length:[15,200],
 sparks:[0,400],streaks:[0,200],coughs:[0,250]
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const isColor=s=>typeof s==='string'&&/^#[a-f0-9]{6}$/i.test(s);
const modes=['flight','landing'];
const clone=v=>JSON.parse(JSON.stringify(v));
const copyDefaults=()=>Object.fromEntries(modes.map(mode=>[mode,{...BROOM_VISUAL_PROFILES[mode]}]));
function sanitizeMode(mode,values){
 const safe={...BROOM_VISUAL_PROFILES[mode]};
 for(const [key,[min,max]] of Object.entries(BROOM_VISUAL_RANGES)){
  if(values&&values[key]!==undefined&&Number.isFinite(Number(values[key])))
   safe[key]=clamp(Number(values[key]),min,max);
 }
 if(isColor(values?.smokeColor))safe.smokeColor=values.smokeColor.toLowerCase();
 return safe;
}
function loadSaved(){
 try{
  const saved=JSON.parse(localStorage.getItem(BROOM_TUNING_STORAGE_KEY)||'null');
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
 if(key==='smokeColor'){if(isColor(value))draft[mode][key]=value.toLowerCase();return;}
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
 mixed.smokeColor=blendColor(flight.smokeColor,landing.smokeColor,transition);
 return mixed;
}
