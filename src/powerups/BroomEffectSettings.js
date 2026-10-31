// Broom visual tuning, independent of flight speed, collisions and duration.
// 100% is the original visual setting, and values may be disabled at 0%.
export const BROOM_EFFECT_DEFAULTS=Object.freeze({
 density:100,
 opacity:100,
 size:100,
 length:100,
 sparks:100
});
export const BROOM_EFFECT_KEYS=Object.freeze(Object.keys(BROOM_EFFECT_DEFAULTS));
export const BROOM_EFFECT_STORAGE_KEY='knottyPineBroomEffectsV1';

const clamp=value=>Math.min(200,Math.max(0,Math.round(Number(value))));
export function createBroomEffectSettings(storage=globalThis.localStorage){
 let saved={};
 try{
  const raw=storage?.getItem(BROOM_EFFECT_STORAGE_KEY);
  if(raw){
   const parsed=JSON.parse(raw);
   if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))saved=parsed;
  }
 }catch{}
 const listeners=new Set();
 const validated=(value,fallback)=>Number.isFinite(Number(value))?clamp(value):fallback;
 let values=Object.freeze(Object.fromEntries(
  BROOM_EFFECT_KEYS.map(key=>[key,validated(saved[key],BROOM_EFFECT_DEFAULTS[key])])
 ));
 const publish=()=>{
  try{storage?.setItem(BROOM_EFFECT_STORAGE_KEY,JSON.stringify(values))}catch{}
  for(const listener of listeners)listener(values);
 };
 function set(key,value){
  if(!BROOM_EFFECT_KEYS.includes(key))return;
  const next=validated(value,values[key]);
  if(values[key]===next)return;
  values=Object.freeze({...values,[key]:next});
  publish();
 }
 function reset(){
  values=Object.freeze({...BROOM_EFFECT_DEFAULTS});
  publish();
 }
 function subscribe(listener){
  listeners.add(listener);
  listener(values);
  return ()=>listeners.delete(listener);
 }
 return {get:()=>values,set,reset,subscribe};
}
