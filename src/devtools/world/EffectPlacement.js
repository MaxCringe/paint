// Transient editor interaction only; authored data remains in preset v3.
const MODES=new Set(['idle','preview','placing','editing','reanchoring']);
export function createPlacementState(){
 let mode='idle';return {get mode(){return mode;},get placing(){return mode==='placing'||mode==='reanchoring';},set(value){if(!MODES.has(value))throw Error('Неизвестное действие редактора');mode=value;}};
}
export function validLocalPosition(position){return position.length===3&&position.every(v=>Number.isFinite(v)&&Math.abs(v)<=100);}
export function authoredAnchors(preset){return [...preset.world,...Object.values(preset.objects).flatMap(v=>v.anchors),...Object.values(preset.plants).flat(),...preset.deck];}
export function uniqueEffectId(preset){const ids=new Set(authoredAnchors(preset).map(a=>a.id));for(let i=0;i<20;i++){const id=crypto.randomUUID();if(!ids.has(id))return id;}throw Error('Не удалось создать уникальный ID');}
export function effectLabel(anchor){if(anchor.name)return anchor.name;const l=anchor.layers??{};return l.flame?'Огонь':l.coals?'Тление':l.smoke?'Дым':l.sparks?'Искры':'Эффект';}
