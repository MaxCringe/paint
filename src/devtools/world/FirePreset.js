// Versioned authoring data. GPU matrices are derived outputs, never saved state.
export const PINE_SPECIES=['grove_cluster','runner_spruce_pro','taiga_spruce','dead_snag','sequoia_giant','scots_pine'].map(n=>'pine:'+n);
export const MAX_ANCHORS=32;
export function newAnchor(position=[0,1,0],size=.6){
 return {id:globalThis.crypto.randomUUID(),position:[...position],rotation:[0,0,0],scale:[1,1,1],size,strength:1,color:'#ff9b32',speed:1,sparks:4,opacity:.94,side:1};
}
export function validatePreset(input){
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
 constructor(initial){this.entries=[clonePreset(initial)];this.index=0;}
 push(preset){const copy=clonePreset(preset);if(JSON.stringify(copy)===JSON.stringify(this.entries[this.index]))return;this.entries.splice(++this.index);this.entries.push(copy);if(this.entries.length>100){this.entries.shift();this.index--;}}
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
