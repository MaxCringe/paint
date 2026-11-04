import {originalComposition,DEFAULT_FIRE_SETTINGS,MODE_PRESETS} from '../../systems/fire/OriginalPreset.js';
import {FLAME_FORMS,applyFlameForm} from '../../systems/fire/ArtisticFire.js';
import {defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
// Own emitter/preset implementation on Three r160; there is no particle-library API.
const n=(label,value,min,max,step=.05,advanced=false)=>({label,value,min,max,step,advanced,type:'number'});
const color=(label,value,advanced=true)=>({label,value,type:'color',advanced});
const select=(label,value,options,advanced=false)=>({label,value,type:'select',options,advanced});
export const LAYER_NAMES={flame:'Пламя',smoke:'Дым',sparks:'Искры',embers:'Летящие угольки',coals:'Тлеющие участки на поверхности'};
const particleFields=(ember=false)=>({
 count:n('Максимум частиц',ember?12:40,0,300,1),rate:n('Частиц в секунду',ember?3:16,0,150,1),
 size:n('Размер',ember?.09:.055,.01,1,.01),sizeSpread:n('Разброс размера',.4,0,1,.05,true),
 life:n('Время жизни, с',ember?3:1.6,.1,12,.1),speed:n('Начальная скорость',ember?.5:2.3,0,15,.1),speedSpread:n('Разброс скорости',.5,0,1,.05,true),
 direction:n('Направление, °',0,-180,180,1,true),tilt:n('Наклон, °',0,0,180,1,true),angle:n('Угол разлёта, °',ember?45:24,0,180,1,true),
 gravity:n('Гравитация',ember?.35:1.2,-10,20,.1,true),windX:n('Ветер X',0,-5,5,.1,true),windZ:n('Ветер Z',0,-5,5,.1,true),
 brightness:n('Яркость частиц',1,.1,6,.05,true),opacity:n('Прозрачность',1,0,1,.01),fade:n('Плавность затухания',1, .1,4,.1,true),
 colorStart:color('Начальный цвет',ember?'#ff4f15':'#ffd47b',false),colorEnd:color('Конечный цвет','#511909'),
 trajectory:select('Движение','ballistic',{ballistic:'Разлёт',spiral:'Спираль Fire Studio'},true),mode:select('Испускание','continuous',{continuous:'Непрерывное',burst:'Всплески'}),period:n('Период всплесков, с',2,.1,10,.1,true),burstCount:n('Частиц во всплеске',15,1,100,1,true)
});
export const LAYER_FIELDS={
 flame:{light:n('Динамическая подсветка',0,0,1,.05,true),studioMode:select('Режим оригинала','tree',{tree:'Дерево',lava:'Лава',smoldering:'Тление'},true),octaves:n('Детализация шума',2,1,3,1,true),shape:select('Форма пламени','legacy',FLAME_FORMS),forkStrength:n('Раздвоение кончиков',0,0,1.4,.05,true),shellOpacity:n('Внешняя оболочка',0,0,.8,.01,true),bend:n('Изгиб',0,0,1.5,.05,true),curl:n('Закручивание',0,0,2,.05,true),variation:n('Неодинаковость языков',0,0,.8,.05,true),height:n('Высота',1,.05,12),width:n('Ширина',.7,.05,8),intensity:n('Интенсивность',1,.05,3),density:n('Число языков',2,1,12,1),speed:n('Скорость',1,.05,5),
 sway:n('Колебания',.25,0,2.5,.05,true),turbulence:n('Турбулентность',.7,0,3,.05,true),fullness:n('Полнота формы',1,.2,2,.05,true),pulse:n('Пульсация',.15,0,.9,.05,true),
 direction:n('Направление, °',0,-180,180,1,true),tilt:n('Наклон, °',0,0,180,1,true),opacity:n('Прозрачность',.9,0,1,.01),brightness:n('Яркость',1,.1,3,.05,true),
 colorBase:color('Цвет основания','#ff531a'),colorMiddle:color('Цвет середины','#ffa125',false),colorTip:color('Цвет кончиков','#ffe6a1')},
 smoke:{quality:select('Качество дыма','light',{light:'Лёгкий — мягкие карты',volume:'Объёмный — мягкие клубы'}),kind:select('Вид дыма','puffs',{stream:'Тонкая струйка',puffs:'Разреженные клубы',column:'Тёмный столб',low:'Низкий дым тления',studio:'Клубы оригинала'}),colorWarm:color('Цвет подсветки','#da864b'),warmth:n('Тёплая подсветка снизу',0,0,1,.05,true),rate:n('Частиц в секунду',6,0,80,1),size:n('Начальный размер',.3,.05,5),growth:n('Рост за секунду',.45,0,4),life:n('Время жизни, с',3,.2,12,.1),rise:n('Скорость подъёма',.65,0,6,.05),spread:n('Расширение',.4,0,4,.05,true),
 opacity:n('Прозрачность',.3,0,1,.01),fade:n('Плавность исчезновения',1,.1,4,.1,true),colorStart:color('Начальный цвет','#9a8e85',false),colorEnd:color('Конечный цвет','#34353a'),
 windX:n('Ветер X',.15,-5,5,.1,true),windZ:n('Ветер Z',0,-5,5,.1,true),turbulence:n('Турбулентность',.5,0,4,.05,true)},
 sparks:particleFields(),embers:particleFields(true),coals:{style:select('Рисунок углей','cracked',{cracked:'Прожилки',studio:'Оригинал Fire Studio'},true),count:n('Участков на поверхности',8,1,64,1),size:n('Размер углей',.13,.03,1,.01),sizeSpread:n('Разброс размера',.45,0,1,.05,true),spread:n('Разброс по поверхности',.3,0,3),glow:n('Жар',1,.1,3,.05),pulseSpeed:n('Мерцание',1,.1,6,.1),opacity:n('Прозрачность',1,0,1,.01,true),colorHot:color('Горячие прожилки','#ff842a',false),colorCool:color('Тёмная корка','#211719')}
};
for(const fields of Object.values(LAYER_FIELDS))for(const key of ['count','density','burstCount','octaves'])if(fields[key])fields[key].integer=true;
export const EMITTER_FIELDS={radius:n('Радиус',.25,0,5),width:n('Ширина области',1,.05,10),depth:n('Глубина области',1,.05,10),length:n('Длина линии',2,.05,12),angle:n('Угол конуса, °',25,0,85,1)};
export const SHAPES={point:'Точка',circle:'Круг',area:'Прямоугольная область',line:'Линия',cone:'Конус'};
export const copy=value=>JSON.parse(JSON.stringify(value));
export const defaultEmitter=()=>({shape:'point',...Object.fromEntries(Object.entries(EMITTER_FIELDS).map(([k,v])=>[k,v.value]))});
export const defaultLayer=kind=>{const layer={enabled:true,...Object.fromEntries(Object.entries(LAYER_FIELDS[kind]).map(([k,v])=>[k,v.value]))};return kind==='flame'?applyFlameForm(layer,'tongue'):layer;};
function preset(name,layers,emitter={}){return {name,cycle:defaultBurnCycle(),layers:Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,{...defaultLayer(k),...v}])),emitter:{...defaultEmitter(),...emitter}};}
export const EFFECT_PRESETS={
 calm:preset('Небольшое спокойное пламя',{flame:{shape:'tongue',height:.65,width:.4,density:1,speed:.65,turbulence:.2,sway:.12,pulse:.08}}),
 campfire:preset('Костёр',{flame:{shape:'forked',forkStrength:1,shellOpacity:.25,curl:.5,variation:.5,height:1.4,width:.9,density:5,turbulence:.8},smoke:{rate:8,life:3},sparks:{rate:10}},{shape:'circle',radius:.35}),
 inferno:preset('Интенсивный пожар',{flame:{shape:'roaring',shellOpacity:.36,curl:1.1,variation:.65,height:2.6,width:1.5,density:10,speed:1.8,turbulence:1.8,sway:.7,pulse:.4},smoke:{rate:25,size:.7,opacity:.55,growth:.75,colorStart:'#292725'},sparks:{rate:65,count:120,speed:4}},{shape:'area',width:1.4,depth:1.1}),
 trunk:preset('Горящий ствол',{flame:{shape:'bent',bend:.65,shellOpacity:.25,curl:.5,variation:.3,height:2.8,width:.35,density:3,speed:1.3,sway:.15,fullness:.6},embers:{rate:2}},{shape:'line',length:.3}),
 crown:preset('Горящая крона',{flame:{shape:'forked',forkStrength:.85,shellOpacity:.26,variation:.55,height:1.2,width:.8,density:9,sway:.5,turbulence:1.4},smoke:{rate:15,spread:1},sparks:{rate:25,angle:70}},{shape:'circle',radius:1.2}),
 lava:preset('Низкое пламя вдоль поверхности',{flame:{shape:'creeping',shellOpacity:.22,curl:.6,variation:.45,height:.32,width:.55,density:10,speed:1.3,sway:.1,fullness:1.5},embers:{rate:3,size:.04}},{shape:'line',length:3}),
 smolder:preset('Тлеющее дерево или пень',{coals:{count:12,size:.18,spread:.5,glow:1.3},smoke:{kind:'low',rate:5,rise:.3,opacity:.4},embers:{rate:1,count:8,speed:.2,life:4}},{shape:'circle',radius:.3}),
 magic:preset('Магический огонь',{flame:{shape:'forked',forkStrength:1.2,shellOpacity:.32,curl:.8,variation:.25,height:1.7,width:.5,density:4,speed:.8,fullness:.6,pulse:.6,sway:.4,colorBase:'#1329ff',colorMiddle:'#23a9ff',colorTip:'#d1f9ff'},sparks:{colorStart:'#59cfff',colorEnd:'#3724a9',gravity:-.2,angle:65,speed:.7}},{shape:'cone',radius:.25,angle:35}),
 lightSmoke:preset('Отдельный лёгкий дым',{smoke:{rate:4,opacity:.18,rise:.6,life:3,spread:.5}}),
 darkSmoke:preset('Густой тёмный дым',{smoke:{quality:'volume',kind:'column',rate:30,size:.7,growth:.8,life:5,rise:.9,opacity:.7,spread:.8,colorStart:'#242127',colorEnd:'#15171c',turbulence:1.1}},{shape:'circle',radius:.6}),
 thinSmoke:preset('Тонкая струйка',{smoke:{kind:'stream',rate:12,size:.14,growth:.16,spread:.12,rise:1.1,life:3.5,opacity:.35}}),
 lowSmoke:preset('Низкий дым тления',{smoke:{kind:'low',rate:10,size:.4,growth:.5,spread:1.2,rise:.08,life:5,opacity:.34}},{shape:'area',width:.8,depth:.6}),
 sparkStream:preset('Поток искр',{sparks:{rate:70,count:150,speed:5,angle:12,gravity:1.5,life:2.3}},{shape:'cone',radius:.15,angle:12})
};
for(const id of ['campfire','inferno','trunk','crown','lava']){
 EFFECT_PRESETS[id].layers.coals={...defaultLayer('coals'),count:id==='inferno'?18:6,size:id==='lava'?.07:.12};
 if(!EFFECT_PRESETS[id].layers.smoke&&['trunk','crown'].includes(id))EFFECT_PRESETS[id].layers.smoke={...defaultLayer('smoke'),rate:7,quality:'volume'};
}
export const COMPOSITION_PLACEMENT={trunk:{zone:'trunk',count:5},crown:{zone:'crown',count:7}};
export const APPEARANCE_GALLERY={fire:['calm','campfire','inferno','trunk','crown','lava','magic'],smoke:['thinSmoke','lightSmoke','darkSmoke','lowSmoke'],sparks:['sparkStream'],smolder:['smolder']};
for(const mode of Object.keys(MODE_PRESETS))EFFECT_PRESETS['original:'+mode]=originalComposition({...DEFAULT_FIRE_SETTINGS,...MODE_PRESETS[mode]},defaultLayer,defaultEmitter);
export function legacyLayers(a){return {flame:{...defaultLayer('flame'),shape:'legacy',forkStrength:0,shellOpacity:0,bend:0,curl:0,height:a.size*1.65,width:a.size*1.2,density:1,intensity:a.strength,speed:a.speed,opacity:a.opacity,colorMiddle:a.color},...(a.sparks?{sparks:{...defaultLayer('sparks'),count:Math.round(a.sparks),rate:a.sparks,life:1.3,colorStart:a.color}}:{})};}
export function applyEffectPreset(anchor,preset){anchor.layers=copy(preset.layers);anchor.emitter=copy(preset.emitter);if(preset.original)anchor.original=copy(preset.original);else delete anchor.original;return anchor;}
const fail=message=>{throw Error('Некорректный пресет: '+message);};
export function validateFields(input,fields){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('настройки слоя должны быть объектом');
 if(Object.keys(input).some(k=>k!=='enabled'&&!fields[k]))fail('неизвестный параметр слоя');
 const out={};
 for(const [key,spec] of Object.entries(fields)){
  const v=Object.hasOwn(input,key)?input[key]:spec.value;
  if(spec.type==='number'&&(!Number.isFinite(v)||v<spec.min||v>spec.max||spec.integer&&!Number.isInteger(v)))fail(spec.label+': значение вне диапазона');
  if(spec.type==='color'&&(typeof v!=='string'||!/^#[\da-f]{6}$/i.test(v)))fail(spec.label+': нужен HEX-цвет');
  if(spec.type==='select'&&!Object.hasOwn(spec.options,v))fail(spec.label+': неизвестный вариант');
  out[key]=v;
 }
 return out;
}
export function validateLayers(layers){
 if(!layers||typeof layers!=='object'||Array.isArray(layers)||Object.keys(layers).some(k=>!Object.hasOwn(LAYER_FIELDS,k)))fail('неизвестный слой');
 return Object.fromEntries(Object.entries(layers).map(([kind,layer])=>{if(typeof layer.enabled!=='boolean')fail('у слоя нужен переключатель enabled');return [kind,{enabled:layer.enabled,...validateFields(layer,LAYER_FIELDS[kind])}];}));
}
export function validateEmitter(value){
 if(!value||Object.keys(value).some(k=>k!=='shape'&&!Object.hasOwn(EMITTER_FIELDS,k))||!Object.hasOwn(SHAPES,value.shape))fail('неизвестная форма источника');
 return {shape:value.shape,...validateFields(Object.fromEntries(Object.keys(EMITTER_FIELDS).map(k=>[k,Object.hasOwn(value,k)?value[k]:EMITTER_FIELDS[k].value])),EMITTER_FIELDS)};
}
// Deterministic analytical particles: identities depend on births, not frame rate.
export function hash(value){let x=(value+0x9e3779b9)|0;x=Math.imul(x^x>>>16,0x21f0aaad);x=Math.imul(x^x>>>15,0x735a2d97);return ((x^x>>>15)>>>0)/4294967296;}
export function stringSeed(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function sampleEmitter(emitter,index,out){
 const a=hash(index)*Math.PI*2,r=Math.sqrt(hash(index+7))*emitter.radius;
 if(emitter.shape==='circle'||emitter.shape==='cone')out.set(Math.cos(a)*r,0,Math.sin(a)*r);
 else if(emitter.shape==='area')out.set((hash(index)-.5)*emitter.width,0,(hash(index+7)-.5)*emitter.depth);
 else if(emitter.shape==='line')out.set((hash(index)-.5)*emitter.length,0,0);
 else out.set(0,0,0);
 return out;
}
export function birthSchedule(layer,time,lod=1){
 if(layer.mode==='burst'){const amount=Math.max(1,Math.round(layer.burstCount*lod));return {count:lod>0?Math.min(layer.count,Math.ceil(layer.life/layer.period)*amount):0,birth:j=>(Math.floor(time/layer.period)-Math.floor(j/amount))*layer.period,id:j=>(Math.floor(time/layer.period)-Math.floor(j/amount))*layer.burstCount+j%amount};}
 const rate=layer.rate*lod;
 return {count:rate>0?Math.min(layer.count??512,Math.ceil(rate*layer.life)):0,birth:j=>(Math.floor(time*rate)-j)/rate,id:j=>Math.floor(time*rate)-j};
}
