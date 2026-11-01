// Visual-only parameter registry for the temporary KNOTTY PINE VFX workshop.
// No gameplay timings, hitboxes, spawning probabilities or inventory rules live here.
export const EFFECT_VISUAL_SCHEMA=2;
export const EFFECT_VISUAL_DEFAULTS=Object.freeze({
 broomModel:Object.freeze({woodColor:'#553522',gripColor:'#291a17',bindingColor:'#b18b52',capColor:'#b18b52',bristlesColor:'#b38e60',pickupGlowColor:'#e9b76b'}),
 hat:Object.freeze({glowColor:'#b59ae5',glowOpacity:88,glowSize:100,bobHeight:100,wobble:100,fabricColor:'#57402e',patchColor:'#755339',seamColor:'#a7885e',bandColor:'#30251d',buckleColor:'#97764b'}),
 scarf:Object.freeze({glowColor:'#ffffff',glowOpacity:65,glowSize:100,floatHeight:100,burstOpacity:95,burstSize:100,clothTint:'#ffffff',fringeColor:'#251c22',collarColor:'#31252c',burstColor:'#ffffff'}),
 souls:Object.freeze({haloColor:'#4e58ff',haloOpacity:16,outerOpacity:93,innerOpacity:97,sparkSize:100,outerColor:'#ffffff',innerColor:'#ffffff',sparkAColor:'#c8ffff',sparkBColor:'#66eeff',sparkCColor:'#8b79ff'}),
 ultimate:Object.freeze({outerColor:'#2275ff',innerColor:'#91eaff',intensity:100,flameSpeed:100,lightIntensity:150,lightColor:'#2275ff',auraWidth:100})
});
export const EFFECT_VISUAL_CONTROLS=Object.freeze({
 broomModel:Object.freeze([
  ['woodColor','Древко · дерево','color'],['gripColor','Рукоять','color'],
  ['bindingColor','Металлическое крепление','color'],['capColor','Наконечник','color'],
  ['bristlesColor','Оттенок прутьев','color'],['pickupGlowColor','Свечение метлы на дороге','color']
 ]),
 hat:Object.freeze([
  ['glowColor','Цвет свечения','color'],['glowOpacity','Яркость свечения','range',0,150],
  ['glowSize','Размер ореола','range',20,220],['bobHeight','Покачивание','range',0,200],
  ['wobble','Повороты шляпы','range',0,200],
  ['fabricColor','Основная ткань','color'],['patchColor','Заплатка','color'],
  ['seamColor','Стежки шва','color'],['bandColor','Лента','color'],
  ['buckleColor','Пряжка','color']
 ]),
 scarf:Object.freeze([
  ['glowColor','Цвет ореола','color'],['glowOpacity','Видимость ореола','range',0,150],
  ['glowSize','Размер свечения','range',20,220],['floatHeight','Парение платка','range',0,200],
  ['burstOpacity','Яркость вспышки','range',0,150],['burstSize','Размер вспышки','range',20,220],
  ['burstColor','Цвет вспышки','color'],['clothTint','Оттенок ткани и вышивки','color'],
  ['fringeColor','Бахрома','color'],['collarColor','Складки воротника','color']
 ]),
 souls:Object.freeze([
  ['haloColor','Цвет голубого ореола','color'],['haloOpacity','Яркость ореола','range',0,120],
  ['outerOpacity','Видимость внешнего пламени','range',0,100],
  ['innerOpacity','Видимость сердцевины','range',0,100],
  ['sparkSize','Размер искр','range',0,220],
  ['outerColor','Внешнее пламя · оттенок','color'],['innerColor','Внутренний огонь · оттенок','color'],
  ['sparkAColor','Искры · светлые','color'],['sparkBColor','Искры · бирюзовые','color'],
  ['sparkCColor','Искры · фиолетовые','color']
 ]),
 ultimate:Object.freeze([
  ['outerColor','Внешний цвет ауры','color'],['innerColor','Цвет сердцевины','color'],
  ['intensity','Интенсивность пламени','range',0,200],
  ['flameSpeed','Скорость колыхания','range',0,250],
  ['lightIntensity','Подсветка Фионы','range',0,300],
  ['lightColor','Цвет подсветки Фионы','color'],['auraWidth','Ширина ауры','range',30,180]
 ])
});
const KEY='knottyPineEffectVisualWorkshopV1';
const CATEGORIES=Object.keys(EFFECT_VISUAL_DEFAULTS);
const isColor=s=>typeof s==='string'&&/^#[a-f0-9]{6}$/i.test(s);
const copy=x=>JSON.parse(JSON.stringify(x));
export const EFFECT_EDITOR_AVAILABLE=import.meta.env?.VITE_ENABLE_EFFECT_EDITOR!=='false';
function initial(){
 if(EFFECT_EDITOR_AVAILABLE){
  try{
   const saved=JSON.parse(localStorage.getItem(KEY)||'null');
   if(saved&&typeof saved==='object'){
    const clean=copy(EFFECT_VISUAL_DEFAULTS);
    for(const category of CATEGORIES){
     if(!saved[category]||typeof saved[category]!=='object')continue;
     for(const control of EFFECT_VISUAL_CONTROLS[category]){
      const [key,,kind,min,max]=control,value=saved[category][key];
      if(kind==='color'&&isColor(value))clean[category][key]=value.toLowerCase();
      else if(kind==='range'&&typeof value==='number'&&Number.isFinite(value))
       clean[category][key]=Math.max(min,Math.min(max,value));
     }
    }
    return clean;
   }
  }catch{}
 }
 return copy(EFFECT_VISUAL_DEFAULTS);
}
let saved=initial(),draft=copy(saved);
export function getEffectVisualProfile(category){return draft[category]||EFFECT_VISUAL_DEFAULTS[category];}
export function effectVisualSnapshot(){return copy(draft);}
export function setEffectVisualValue(category,key,value){
 if(!EFFECT_EDITOR_AVAILABLE||!CATEGORIES.includes(category))return false;
 const field=EFFECT_VISUAL_CONTROLS[category].find(item=>item[0]===key);
 if(!field)return false;
 if(field[2]==='color'){
  if(!isColor(value))return false;
  draft[category][key]=value.toLowerCase();
 }else{
  const n=Number(value);
  if(!Number.isFinite(n))return false;
  draft[category][key]=Math.max(field[3],Math.min(field[4],n));
 }
 return true;
}
export function saveEffectVisuals(){
 if(!EFFECT_EDITOR_AVAILABLE)return false;
 saved=copy(draft);
 try{localStorage.setItem(KEY,JSON.stringify(saved));return true;}catch{return false;}
}
export function revertEffectVisuals(){draft=copy(saved);}
export function resetEffectVisualCategory(category){
 if(!EFFECT_EDITOR_AVAILABLE||!CATEGORIES.includes(category))return;
 draft[category]=copy(EFFECT_VISUAL_DEFAULTS[category]);
}
export function resetEffectVisuals(){
 draft=copy(EFFECT_VISUAL_DEFAULTS);saved=copy(draft);
 try{localStorage.removeItem(KEY);}catch{}
}
