// Versioned, bounded visual settings shared by the game and Fire Studio.
export const ATMOSPHERE_VERSION=1;
const field=(label,value,min,max,step=.01,advanced=false)=>({label,value,min,max,step,advanced});
export const ATMOSPHERE_FIELDS={
 fog:{
  enabled:field('Туман',true),density:field('Плотность',1,.2,2),near:field('Начало тумана',14.7,14,120,1),far:field('Конец тумана',65.9,44,250,1),color:field('Цвет тумана','#3b101b'),
  height:field('Высота дымки',5,1,18,.5,true),softness:field('Мягкость',1,.3,3,.1,true),edge:field('Туман у краёв леса',0,0,1.5),distant:field('Дальний слой',0,0,1.5),motion:field('Скорость дымки',1,0,3,.1,true),mountains:field('Влияние на горы',0,0,1,.05,true),trees:field('Влияние на дальние деревья',1,.5,1.5,.05,true),mist:field('Локальная дымка',.24,0,.8,.01,true)
 },
 ash:{
  enabled:field('Воздушный пепел',true),amount:field('Количество',28,0,100,1),size:field('Размер',1,.3,3),opacity:field('Видимость',.18,0,.6),speed:field('Скорость частиц',1,0,3),direction:field('Направление, °',0,-180,180,1,true),color:field('Цвет пепла','#cfa79f'),distance:field('Дальность появления',125,50,200,1,true),depth:field('Распределение: ближе / дальше',0,-1,1,.1,true),runner:field('Зависимость от скорости Фионы',1,0,1.5,.05,true)
 },
 wind:{enabled:field('Ветер',true),strength:field('Сила',40,0,100,1),direction:field('Направление, °',20,-180,180,1),gusts:field('Порывы',30,0,100,1),particles:field('Влияние на пепел',1,0,2,.1,true),mist:field('Влияние на дымку',1,0,2,.1,true)},
 background:{enabled:field('Пепел и искры вулкана',true),intensity:field('Интенсивность вулкана',1,0,1,.05)}
};
export const ATMOSPHERE_DEFAULTS=Object.fromEntries(Object.entries(ATMOSPHERE_FIELDS).map(([group,fields])=>[group,Object.fromEntries(Object.entries(fields).map(([key,spec])=>[key,spec.value]))]));
export function normalizeAtmosphere(input){
 if(input?.version!==undefined&&input.version!==ATMOSPHERE_VERSION)throw Error('Неизвестная версия настроек атмосферы');
 const result={version:ATMOSPHERE_VERSION,quality:['low','medium','high'].includes(input?.quality)?input.quality:'medium'};
 for(const [group,fields] of Object.entries(ATMOSPHERE_FIELDS)){
  result[group]={};for(const [key,spec] of Object.entries(fields)){
   const value=input?.[group]?.[key];result[group][key]=typeof spec.value==='boolean'?(typeof value==='boolean'?value:spec.value):typeof spec.value==='string'?(/^#[\da-f]{6}$/i.test(value)?value:spec.value):Number.isFinite(value)?Math.max(spec.min,Math.min(spec.max,value)):spec.value;
  }
 }
 // Keep a readable reaction zone and a soft transition, even after malformed imports.
 result.fog.far=Math.max(result.fog.near+30,result.fog.far);
 return result;
}
export const ATMOSPHERE_PRESETS={
 current:{label:'Текущая атмосфера',settings:normalizeAtmosphere()},
 forest:{label:'Туманный адский лес',settings:normalizeAtmosphere({fog:{near:30,far:115,color:'#49313a',density:1,edge:.8,distant:1,mountains:.55,height:7,softness:1.5,mist:.18}})},
 storm:{label:'Пепельная буря',settings:normalizeAtmosphere({fog:{near:25,far:100,color:'#504047',edge:.6,distant:.85,mountains:.6,mist:.2},ash:{amount:65,opacity:.28,speed:1.35,color:'#bca9a5'},wind:{strength:60,gusts:45,particles:1.4}})}
};
