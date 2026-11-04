import {validateAndNormalizePreset} from '../../systems/fire/OriginalPreset.js';
import {validateBurnCycle,defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {defaultEmitter,legacyLayers,copy,validateLayers,validateEmitter,EFFECT_PRESETS,hash} from './EffectLayers.js';
// Versioned authoring data. GPU matrices are derived outputs, never saved state.
export const PINE_SPECIES=['grove_cluster','runner_spruce_pro','taiga_spruce','dead_snag','sequoia_giant','scots_pine'].map(n=>'pine:'+n);
export const MAX_ANCHORS=32;
export function newAnchor(position=[0,1,0],size=.6){
 return {id:globalThis.crypto.randomUUID(),position:[...position],rotation:[0,0,0],scale:[1,1,1],size,strength:1,color:'#ff9b32',speed:1,sparks:4,opacity:.94,side:1};
}
function validateLegacyPreset(input){
 const fail=()=>{throw new Error('Неверный JSON: нужен пресет KNOTTY PINE версии 1 с конечными координатами и не более 32 очагов на вид.');};
 if(!input||input.version!==1||!Number.isInteger(input.seed)||input.seed<0||input.seed>0xffffffff||!input.plants||typeof input.plants!=='object'||Array.isArray(input.plants)||!Array.isArray(input.deck))fail();
 if(Object.keys(input.plants).some(k=>!PINE_SPECIES.includes(k)))fail();
 function anchors(list,deck=false){
  if(!Array.isArray(list)||list.length>MAX_ANCHORS)fail();
  const ids=new Set();
  return list.map(a=>{
   if(!a||typeof a.id!=='string'||a.id.length>100||ids.has(a.id))fail();ids.add(a.id);
   const out={id:a.id};
   for(const key of ['position','rotation','scale']){
    if(!Array.isArray(a[key])||a[key].length!==3||a[key].some(n=>!Number.isFinite(n)||Math.abs(n)>100||(key==='scale'&&n<.05)))fail();
    out[key]=[...a[key]];
   }
   for(const [key,min,max] of [['size',.05,5],['strength',.05,3],['speed',.05,5],['sparks',0,20],['opacity',0,1]]){
    if(!Number.isFinite(a[key])||a[key]<min||a[key]>max)fail();out[key]=a[key];
   }
   if(!/^#[\da-f]{6}$/i.test(a.color)||![1,-1].includes(a.side))fail();
   if(deck&&(Math.abs(a.position[0])>4.34||a.position[2]<.02||a.position[2]>.39||a.position[1]<-.03||a.position[1]>.5))fail();
   out.color=a.color;out.side=a.side;return out;
  });
 }
 return {version:1,seed:input.seed,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,anchors(input.plants[k])])),deck:anchors(input.deck,true)};
}
export const clonePreset=p=>JSON.parse(JSON.stringify(p));
export class PresetHistory{
 constructor(initial){const text=JSON.stringify(initial);this.entries=[JSON.parse(text)];this.sizes=[text.length*2];this.bytes=this.sizes[0];this.index=0;}
 push(preset){
  const text=JSON.stringify(preset);if(text===JSON.stringify(this.entries[this.index]))return;
  this.entries.splice(this.index+1);this.sizes.splice(this.index+1);this.bytes=this.sizes.reduce((a,b)=>a+b,0);
  this.entries.push(JSON.parse(text));this.sizes.push(text.length*2);this.bytes+=text.length*2;this.index++;
  while(this.entries.length>1&&(this.entries.length>100||this.bytes>16*1024*1024)){this.entries.shift();this.bytes-=this.sizes.shift();this.index--;}
 }
 undo(){if(this.index>0)this.index--;return clonePreset(this.entries[this.index]);}
 redo(){if(this.index<this.entries.length-1)this.index++;return clonePreset(this.entries[this.index]);}
}
// Deck x follows the crossing; z is an outward distance from its curved edge.
export function deckToLocal(anchor,boundary){const [x,y,offset]=anchor.position;return [x,y,boundary.center(x)+anchor.side*(boundary.halfWidth(x)+offset)];}
export function localToDeck(point,boundary){
 const x=Math.max(-4.34,Math.min(4.34,point.x));
 const side=point.z<boundary.center(x)?-1:1;
 return {side,position:[x,Math.max(-.03,Math.min(.5,point.y)),Math.max(.02,Math.min(.39,Math.abs(point.z-boundary.center(x))-boundary.halfWidth(x)))]};
}

export const EFFECT_STORAGE='knottyPine.worldFire.v1';
export function newEffectAnchor(position=[0,1,0],size=.6){const a=newAnchor(position,size);return {...a,emitter:defaultEmitter(),layers:legacyLayers(a)};}
export function upgradePreset(input){
 if(!input||typeof input!=='object')throw Error('Некорректный JSON: ожидался объект пресета.');
 if(input.version===2||input.version===3)return validateModernPreset(input);
 const legacy=validateLegacyPreset(input),convert=a=>({...a,emitter:defaultEmitter(),layers:legacyLayers(a)});
 return {version:3,seed:legacy.seed,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,legacy.plants[k].map(convert)])),deck:legacy.deck.map(convert),world:[],objects:{},group:[],customPresets:[],budget:6000};
}
export function validatePreset(input){return (input?.version===2||input?.version===3)?validateModernPreset(input):validateLegacyPreset(input);}
function validateModernPreset(p){
 const fail=message=>{throw Error('Некорректный JSON: '+message);};
 if(!p||![2,3].includes(p.version)||!Number.isInteger(p.seed)||p.seed<0||p.seed>0xffffffff)fail('нужна версия 2/3 и seed от 0 до 4294967295');
 if(!p.plants||Object.keys(p.plants).some(k=>!PINE_SPECIES.includes(k)))fail('неизвестный вид растения');
 let total=0;
 const anchors=(list,deck=false)=>{
  if(!Array.isArray(list)||list.length>MAX_ANCHORS)fail('не более 32 очагов на объект');
  const ids=new Set();return list.map(a=>{
   if(!a||typeof a.id!=='string'||!a.id.length||a.id.length>100||ids.has(a.id))fail('нужны уникальные идентификаторы очагов');ids.add(a.id);
   for(const k of ['position','rotation','scale'])if(!Array.isArray(a[k])||a[k].length!==3||a[k].some(n=>!Number.isFinite(n)||Math.abs(n)>100||(k==='scale'&&n<.05)))fail('неверная трансформация очага');
   if(![1,-1].includes(a.side))fail('неверная сторона переправы');
   if(deck&&(Math.abs(a.position[0])>4.34||a.position[2]<.02||a.position[2]>.39||a.position[1]<-.03||a.position[1]>.5))fail('очаг вне деревянной кромки');
   if(++total>2048)fail('общий лимит — 2048 очагов');
   // Keep legacy scalar values for consumers of v1; rendering uses layers.
   const legacy=validateLegacyPreset({version:1,seed:p.seed,plants:Object.fromEntries(PINE_SPECIES.map((k,i)=>[k,i===0?[a]:[]])),deck:[]}).plants[PINE_SPECIES[0]][0];
   return {...legacy,...(a.original?{original:validateAndNormalizePreset(a.original)}:{}),layers:validateLayers(a.layers),emitter:validateEmitter(a.emitter)};
  });
 };
 const plants=Object.fromEntries(PINE_SPECIES.map(k=>[k,anchors(p.plants[k])]));
 if(!p.objects||typeof p.objects!=='object'||Array.isArray(p.objects)||Object.keys(p.objects).length>256)fail('неверные привязки объектов');
 const objects={};
 for(const [id,entry] of Object.entries(p.objects)){
  if(!/^(plant:\d+|deck)$/.test(id)||!entry?.binding)fail('неизвестная привязка '+id);
  const b=entry.binding;
  if(b.seed!==p.seed||(id==='deck'?b.kind!=='deck':b.kind!=='plant'||!PINE_SPECIES.includes(b.species)||!Number.isInteger(b.template)||b.template<0||b.id!==Number(id.slice(6))))fail('привязка не соответствует seed/виду/шаблону');
  objects[id]={binding:copy(b),anchors:anchors(entry.anchors,id==='deck'),cycle:validateBurnCycle(entry.cycle)};
 }
 if(!Array.isArray(p.group)||p.group.length>128||p.group.some(id=>typeof id!=='string'||!/^(plant:\d+|deck)$/.test(id)))fail('неверная группа');
 if(!Number.isInteger(p.budget)||p.budget<128||p.budget>16384)fail('бюджет частиц: 128…16384');
 if(!Array.isArray(p.customPresets)||p.customPresets.length>32)fail('не более 32 пользовательских пресетов');
 const names=new Set(),customPresets=p.customPresets.map(v=>{
  if(typeof v.name!=='string'||!v.name.trim()||v.name.length>60||names.has(v.name))fail('нужны уникальные имена пресетов до 60 символов');names.add(v.name);
  return {name:v.name,...(v.original?{original:validateAndNormalizePreset(v.original)}:{}),layers:validateLayers(v.layers),emitter:validateEmitter(v.emitter),cycle:validateBurnCycle(v.cycle)};
 });
 return {version:3,seed:p.seed,plants,deck:anchors(p.deck,true),world:anchors(p.world),objects,group:[...new Set(p.group)],customPresets,budget:p.budget};
}
export function readEffectPreset(){try{const raw=localStorage.getItem(EFFECT_STORAGE);return raw?upgradePreset(JSON.parse(raw)):null;}catch(error){console.warn('World effect preset ignored:',error.message);return null;}}
export function saveEffectPreset(p){localStorage.setItem(EFFECT_STORAGE,JSON.stringify(p));}
export function distributeAnchors(profile,{count=8,minHeight=0,maxHeight=1,minSize=.4,maxSize=1,seed=1337,effect=EFFECT_PRESETS.calm}={}){
 const candidates=profile.anchors.filter(a=>a.height>=minHeight&&a.height<=maxHeight);
 if(!candidates.length)return [];
 return Array.from({length:Math.min(MAX_ANCHORS,count)},(_,i)=>{
  const source=candidates[Math.floor(hash(seed+i*71)*candidates.length)],a=newEffectAnchor([source.x,source.y,source.z]);
  a.id='distributed:'+seed+':'+i;a.layers=copy(effect.layers);a.emitter=copy(effect.emitter);a.scale.fill(minSize+hash(seed+i*179+1)*(maxSize-minSize));return a;
 });
}
