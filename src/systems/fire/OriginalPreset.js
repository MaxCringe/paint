import * as THREE from 'three';
import {DEFAULT_FIRE_SETTINGS,MODE_PRESETS,validateAndNormalizePreset,computeColorPalette,getQualityBudgets} from './original/Math.js';
export {DEFAULT_FIRE_SETTINGS,MODE_PRESETS,validateAndNormalizePreset};
export const ORIGINAL_FIELDS={
 intensity:['Интенсивность',.1,3,.05],flameHeight:['Высота',.2,3.5,.05],flameWidth:['Ширина',.2,3,.05],flameDensity:['Густота языков',.2,2.5,.05],animationSpeed:['Скорость анимации',.1,3,.05],sparkCount:['Количество искр',0,300,1],sparkSize:['Размер искр',.2,3,.05],opacity:['Прозрачность',.1,1,.01],colorTemperature:['Температура цвета',0,1,.01],smokeAmount:['Количество дыма',0,2,.05],swayStrength:['Колебания',0,2.5,.05],spreadSpeed:['Скорость горения дерева',0,3,.05],seed:['Seed эффекта',1,999999,1]
};
const hex=rgb=>'#'+new THREE.Color().setRGB(...rgb).getHexString();
export function originalComposition(raw,layer,emitter){
 const s=validateAndNormalizePreset(raw),palette=computeColorPalette(s.colorTemperature,s.mode),b=getQualityBudgets(s.quality,s.flameDensity,s.sparkCount,s.smokeAmount);
 const low=s.mode==='smoldering',lava=s.mode==='lava';
 return {name:{tree:'Оригинал · Горящее дерево',lava:'Оригинал · Лавовый огонь',smoldering:'Оригинал · Тление'}[s.mode],original:s,
 cycle:{mode:s.mode==='tree'&&s.spreadSpeed>.01?'auto':'constant',stage:.35,speed:Math.max(.1,s.spreadSpeed),duration:1/.055,repeat:true,paused:false,curve:'studio'},
 layers:{flame:{...layer('flame'),shape:'studio',light:1,pulse:.38,turbulence:1,bend:0,curl:0,studioMode:s.mode,octaves:b.noiseOctaves,height:s.flameHeight*(lava?.72:low?.42:1),width:s.flameWidth*(lava?1.45:low?.88:1),density:Math.max(1,Math.min(12,Math.round(b.activeTongueCount/30))),intensity:s.intensity,speed:s.animationSpeed,opacity:s.opacity,sway:s.swayStrength,variation:.4,forkStrength:.85,shellOpacity:s.quality==='low'?0:.58,colorBase:hex(palette.core),colorMiddle:hex(palette.mid),colorTip:hex(palette.edge)},
 smoke:{...layer('smoke'),enabled:s.smokeAmount>.01,quality:s.quality==='low'?'light':'volume',kind:'studio',size:.25,growth:.3,windX:0,rate:Math.min(80,b.activeSmokePuffs/3),opacity:s.opacity*Math.min(.68,s.smokeAmount*.42),warmth:.38*Math.min(1.2,s.intensity*.6),colorWarm:hex(palette.mid),colorStart:hex(palette.smoke),colorEnd:hex(palette.smoke)},
 sparks:{...layer('sparks'),trajectory:'spiral',gravity:0,opacity:s.opacity,brightness:s.intensity*1.45,count:b.activeSparks,rate:b.activeSparks/2.3,size:.055*s.sparkSize,speed:s.animationSpeed,life:2.3,colorStart:hex(palette.ember),colorEnd:hex(palette.edge)},
 coals:{...layer('coals'),style:'studio',count:Math.min(64,b.maxEmberNodes),size:.13,glow:s.intensity,colorHot:hex(palette.core),colorCool:hex(palette.edge)}},
 emitter:{...emitter(),shape:lava?'line':'circle',radius:low?.3:.18,length:lava?2:.3}};
}

// Change only the properties affected by an original slider. Independent layers,
// deleted layers, hand-tuned motion and source transforms remain authored data.
export function updateOriginalSettings(anchor,patch,layer,emitter){
 const before=originalComposition(anchor.original??DEFAULT_FIRE_SETTINGS,layer,emitter),after=originalComposition({...before.original,...patch},layer,emitter);
 for(const [kind,next] of Object.entries(after.layers)){
  const target=anchor.layers[kind];if(!target)continue;
  for(const [key,value] of Object.entries(next))if(JSON.stringify(before.layers[kind]?.[key])!==JSON.stringify(value))target[key]=value;
 }
 for(const [key,value] of Object.entries(after.emitter))if(JSON.stringify(before.emitter[key])!==JSON.stringify(value))anchor.emitter[key]=value;
 anchor.original=after.original;return after;
}
