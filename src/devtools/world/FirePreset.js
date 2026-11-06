import {validateAndNormalizePreset} from '../../systems/fire/OriginalPreset.js';
import {LAVA_RIVER_AUTHORING} from '../../systems/fire/LavaRiverAuthored.js';
import {validateBurnCycle,defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {defaultEmitter,legacyLayers,copy,validateLayers,validateEmitter,EFFECT_PRESETS,hash} from './EffectLayers.js';
// Versioned authoring data. GPU matrices are derived outputs, never saved state.
export const PINE_SPECIES=['grove_cluster','runner_spruce_pro','taiga_spruce','dead_snag','sequoia_giant','scots_pine'].map(n=>'pine:'+n);
export const MAX_ANCHORS=32;
export const MAX_SCENE_ANCHORS=2048;
// IDs of the exported demo-river scene effects. Only these legacy anchors are
// migrated, leaving unrelated freely placed effects exactly where they are.
const DEMO_RIVER_WORLD_IDS=new Set([
 'a0f98b2e-aeba-49a2-88b2-2e884f5535c7',
 'bef26812-fdf5-4cbc-a850-5ecf0da7dd1b','ec925d96-5187-4736-9b58-958bb88c2795',
 '0f20d881-9473-4f69-8a41-0d720133a2d5','772355da-6298-4345-9492-bc6e13348751',
 '56da0f28-1a06-427a-89c9-68a3fba4a543','396d00c4-adec-4b5b-910f-10cc7d24ceee',
 '3ec50ae4-f9e5-41af-954e-235d9f2a2f18','971f44f5-be74-4900-bf2a-6f3ad95d52ea',
 '6555dd70-c64b-4fe7-91e1-e37473ef5875','9e5ccbaf-c5e6-40ac-bc78-7b6e12750474',
 'addc0d04-0565-4cc1-bc4b-114c5619197f','cab62e79-9351-40e6-8dd0-964422cffe3b',
 '04935f25-4bef-49e3-a436-cc9470e6cf36','06943561-e891-434c-b98b-247ca0623578'
]);
// IDs for the previous dense crossing release. A one-time migration removes
// only these known artwork anchors; custom scene, tree and river effects stay.
const LEGACY_DECK_IDS=new Set([
 '650e8c3d-469f-4d69-b20b-665c03d715e2','8dab6446-5380-4c6d-a0bd-d2a468ebe180',
 '0c9f2d5d-023b-4c88-a275-18c227886b4b','5b4dd78e-1ef0-4aa0-82e7-2c44b895f7f2',
 'b1be52ef-242f-4631-8349-74e89c0ca9a5','aad974c5-c125-4ef6-95da-f97b2e7a4da1',
 '7cb145bb-68ed-45fd-b18e-f8a0300afec6','ef544c3b-bdc0-46fb-aafe-0baa2b7604ca',
 '086ff68a-22fa-4a76-b6e3-166913488059','3182d4e5-4ef2-445b-bf84-5c461165ec8f',
 '10fc99c6-53de-4743-a2d8-d76f84537270','567e945d-9868-4ee5-83e8-d8ad9c409f16'
]);
const LEGACY_RIVER_IDS=DEMO_RIVER_WORLD_IDS;
// Eight retired Fire Studio wooden-edge anchors. Strip on every import and
// save revision, including if the current revision was exported previously.
export const RETIRED_DECK_IDS=new Set(["650e8c3d-469f-4d69-b20b-665c03d715e2","8dab6446-5380-4c6d-a0bd-d2a468ebe180","5b4dd78e-1ef0-4aa0-82e7-2c44b895f7f2","b1be52ef-242f-4631-8349-74e89c0ca9a5","aad974c5-c125-4ef6-95da-f97b2e7a4da1","ef544c3b-bdc0-46fb-aafe-0baa2b7604ca","10fc99c6-53de-4743-a2d8-d76f84537270","567e945d-9868-4ee5-83e8-d8ad9c409f16"]);
const stripRetiredDeck=items=>Array.isArray(items)?items.filter(a=>!RETIRED_DECK_IDS.has(a.id)):items;
export const LIGHT_RIVER_BACKUP_STORAGE='knottyPine.worldFire.beforeLightRiver.v1';
export const EMBER_RIBBON_BACKUP_STORAGE='knottyPine.worldFire.beforeEmberRibbon.v2';
export const RIVER_REMOVAL_BACKUP_STORAGE='knottyPine.worldFire.beforeRemovingRiverFx.v4';
// Exact fingerprint of the shipped v1 eight-flame preset. If an artist edited
// its positions or sizes, keep their artwork; only untouched defaults migrate.
const V1_DECK_FINGERPRINT=[
 ['650e8c3d-469f-4d69-b20b-665c03d715e2',-2.997491820347495,.26],
 ['8dab6446-5380-4c6d-a0bd-d2a468ebe180',-.9654232905479151,.23],
 ['5b4dd78e-1ef0-4aa0-82e7-2c44b895f7f2',2.25655021270737,.30],
 ['b1be52ef-242f-4631-8349-74e89c0ca9a5',3.6331554423924532,.34],
 ['aad974c5-c125-4ef6-95da-f97b2e7a4da1',-3.0636389651661737,.32],
 ['ef544c3b-bdc0-46fb-aafe-0baa2b7604ca',-1.6136925668269395,.24],
 ['10fc99c6-53de-4743-a2d8-d76f84537270',.4204284066194668,.22],
 ['567e945d-9868-4ee5-83e8-d8ad9c409f16',2.3626239294605327,.27]
];
function isUntouchedLightV1(deck){
 return Array.isArray(deck)&&deck.length===8&&deck.every((a,i)=>{
  const [id,x,height]=V1_DECK_FINGERPRINT[i];
  return a.id===id&&Math.abs(a.position[0]-x)<.00001
   &&a.layers?.flame?.shape==='legacy'&&a.layers.flame.density===1
   &&Math.abs(a.layers.flame.height-height)<.00001;
 });
}
function migrateDemoRiverEffects(p){
 const objects={...p.objects};
 // Empty objects.deck is an intentional user override. Do NOT remove it:
 // previously this revealed all eight deleted wooden flames again.
 if(objects.deck?.anchors)objects.deck={...objects.deck,anchors:stripRetiredDeck(objects.deck.anchors)};
 const deck=stripRetiredDeck(p.deck)??[];
 if(p.riverVisualRevision===LAVA_RIVER_AUTHORING.styleRevision)
  return {...p,deck,objects,river:p.river??clonePreset(LAVA_RIVER_AUTHORING.river)};
 const oldWorld=p.seed===LAVA_RIVER_AUTHORING.sourceSeed
  &&Array.isArray(p.world)&&p.world.some(a=>DEMO_RIVER_WORLD_IDS.has(a.id));
 const previousRiver=Array.isArray(p.river)?p.river.filter(a=>!LEGACY_RIVER_IDS.has(a.id)):[];
 // User's manual river artwork must survive a deck-only cleanup. The v5
 // visual migration still upgrades only its two previously changed anchors.
 let river;
 if(p.riverVisualRevision===5&&previousRiver.length){
  const updates=new Map(LAVA_RIVER_AUTHORING.river.map(a=>[a.id,a]));
  river=previousRiver.map(a=>{
   const next=updates.get(a.id);
   if(!next)return a;
   if(a.id==='b1496f00-0609-413c-993a-0fc35d6128fb')return {...a,rotation:clonePreset(next.rotation),
    layers:{...a.layers,flame:{...a.layers.flame,brightness:next.layers.flame.brightness}}};
   if(a.id==='137227f1-8d6e-4363-8713-49562400074f')return {...a,position:clonePreset(next.position),rotation:clonePreset(next.rotation)};
   return a;
  });
 }else if(p.riverVisualRevision===6)river=previousRiver;
 else river=previousRiver.length?previousRiver:clonePreset(LAVA_RIVER_AUTHORING.river);
 return {...p,objects,deck,river,
  world:oldWorld?p.world.filter(a=>!DEMO_RIVER_WORLD_IDS.has(a.id)):p.world,
  riverVisualRevision:LAVA_RIVER_AUTHORING.styleRevision};
}

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
 return {version:3,seed:legacy.seed,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,legacy.plants[k].map(convert)])),deck:stripRetiredDeck(legacy.deck).map(convert),river:clonePreset(LAVA_RIVER_AUTHORING.river),world:[],objects:{},group:[],customPresets:[],budget:4500,riverVisualRevision:LAVA_RIVER_AUTHORING.styleRevision};
}
export function validatePreset(input){return (input?.version===2||input?.version===3)?validateModernPreset(input):validateLegacyPreset(input);}
function validateModernPreset(input){
 const p=migrateDemoRiverEffects(input);
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
   if(++total>MAX_SCENE_ANCHORS)fail('общий лимит — 2048 очагов');
   // Keep legacy scalar values for consumers of v1; rendering uses layers.
   const legacy=validateLegacyPreset({version:1,seed:p.seed,plants:Object.fromEntries(PINE_SPECIES.map((k,i)=>[k,i===0?[a]:[]])),deck:[]}).plants[PINE_SPECIES[0]][0];
   if(a.name!==undefined&&(typeof a.name!=='string'||!a.name.trim()||a.name.length>60))fail('неверное название эффекта');
   return {...legacy,...(a.name?{name:a.name}:{}),...(a.original?{original:validateAndNormalizePreset(a.original)}:{}),layers:validateLayers(a.layers),emitter:validateEmitter(a.emitter)};
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
 if(!Array.isArray(p.group)||p.group.length>128||p.group.some(id=>typeof id!=='string'||!/^(plant:\d+|deck|river)$/.test(id)))fail('неверная группа');
 if(!Number.isInteger(p.budget)||p.budget<128||p.budget>16384)fail('бюджет частиц: 128…16384');
 if(!Array.isArray(p.customPresets)||p.customPresets.length>32)fail('не более 32 пользовательских пресетов');
 const names=new Set(),customPresets=p.customPresets.map(v=>{
  if(typeof v.name!=='string'||!v.name.trim()||v.name.length>60||names.has(v.name))fail('нужны уникальные имена пресетов до 60 символов');names.add(v.name);
  return {name:v.name,...(v.original?{original:validateAndNormalizePreset(v.original)}:{}),layers:validateLayers(v.layers),emitter:validateEmitter(v.emitter),cycle:validateBurnCycle(v.cycle)};
 });
 return {version:3,seed:p.seed,plants,deck:anchors(p.deck,true),river:anchors(p.river),world:anchors(p.world),objects,group:[...new Set(p.group)],customPresets,budget:p.budget,riverVisualRevision:p.riverVisualRevision};
}
export function readEffectPreset(){try{
 const raw=localStorage.getItem(EFFECT_STORAGE);if(!raw)return null;
 const original=JSON.parse(raw);
 let candidate=original;
 // v4 deleted the user's river fire and saved a backup before overwriting
 // localStorage. Prefer restoring that exact edited work over baked defaults.
 if(original.riverVisualRevision===4&&(!Array.isArray(original.river)||!original.river.length)){
  try{
   const backupText=localStorage.getItem(RIVER_REMOVAL_BACKUP_STORAGE);
   const backup=backupText?JSON.parse(backupText):null;
   if(backup?.seed===original.seed&&Array.isArray(backup.river)&&backup.river.length>0)
    candidate={...original,river:backup.river};
  }catch(error){console.warn('River fire backup unavailable:',error.message);}
 }
 const upgraded=upgradePreset(candidate);
 // Preserve the last six river effects in a separate non-destructive backup
 // before clearing them from browser storage on this visual revision.
 if(original.riverVisualRevision!==LAVA_RIVER_AUTHORING.styleRevision
  &&Array.isArray(original.river)&&original.river.length){
  try{if(!localStorage.getItem(RIVER_REMOVAL_BACKUP_STORAGE))localStorage.setItem(RIVER_REMOVAL_BACKUP_STORAGE,raw);}catch{}
 }
 // Backup the previous artwork once, but leave every other save key alone.
 if(original.version>=2&&original.riverVisualRevision!==LAVA_RIVER_AUTHORING.styleRevision
  &&(JSON.stringify(original.deck)!==JSON.stringify(upgraded.deck)
   ||JSON.stringify(original.river)!==JSON.stringify(upgraded.river)
   ||JSON.stringify(original.world)!==JSON.stringify(upgraded.world))){
  try{if(!localStorage.getItem(EMBER_RIBBON_BACKUP_STORAGE))localStorage.setItem(EMBER_RIBBON_BACKUP_STORAGE,raw);}catch{}
 }
 // Commit the migration, so a reload cannot resurrect obsolete river flames.
 try{if(JSON.stringify(original)!==JSON.stringify(upgraded))
  localStorage.setItem(EFFECT_STORAGE,JSON.stringify(upgraded));}
 catch(error){console.warn('World effect migration could not be persisted:',error.message);}
 return upgraded;
 }catch(error){console.warn('World effect preset ignored:',error.message);return null;}}
export function saveEffectPreset(p){localStorage.setItem(EFFECT_STORAGE,JSON.stringify(p));}
export function distributeAnchors(profile,{count=8,minHeight=0,maxHeight=1,minSize=.4,maxSize=1,seed=1337,effect=EFFECT_PRESETS.calm}={}){
 const candidates=profile.anchors.filter(a=>a.height>=minHeight&&a.height<=maxHeight);
 if(!candidates.length)return [];
 return Array.from({length:Math.min(MAX_ANCHORS,count)},(_,i)=>{
  const source=candidates[Math.floor(hash(seed+i*71)*candidates.length)],a=newEffectAnchor([source.x,source.y,source.z]);
  a.id='distributed:'+seed+':'+i;a.layers=copy(effect.layers);a.emitter=copy(effect.emitter);a.scale.fill(minSize+hash(seed+i*179+1)*(maxSize-minSize));return a;
 });
}
