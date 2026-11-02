import * as THREE from 'three';

// Temporary per-model offsets, measured in game-world units. Zero values
// preserve the current shipped head attachment. Only the worn hat changes.
export const HAT_DEV_CONTROLS=Object.freeze([
 {key:'x',label:'Влево / вправо',min:-.8,max:.8,step:.01,unit:'м'},
 {key:'y',label:'Выше / ниже',min:-.65,max:.85,step:.01,unit:'м'},
 {key:'z',label:'Вперёд / назад',min:-.8,max:.8,step:.01,unit:'м'},
 {key:'rx',label:'Наклон вперёд / назад',min:-90,max:90,step:1,unit:'°'},
 {key:'ry',label:'Поворот вокруг головы',min:-180,max:180,step:1,unit:'°'},
 {key:'rz',label:'Наклон в сторону',min:-90,max:90,step:1,unit:'°'},
 {key:'size',label:'Размер шляпы',min:40,max:180,step:1,unit:'%'}
]);
export const DEFAULT_HAT_DEV_PLACEMENT=Object.freeze({
 x:0,y:0,z:0,rx:0,ry:0,rz:0,size:100
});
export function normalizeHatDevPlacement(value={}){
 const result={};
 for(const control of HAT_DEV_CONTROLS){
  const raw=value?.[control.key];
  const num=typeof raw==='number'||typeof raw==='string'&&raw.trim()?Number(raw):NaN;
  const v=Number.isFinite(num)?Math.min(control.max,Math.max(control.min,num)):DEFAULT_HAT_DEV_PLACEMENT[control.key];
  result[control.key]=Math.round(v/control.step)*control.step;
  result[control.key]=Number(result[control.key].toFixed(3));
 }
 return result;
}

// Match mountWearableHat's original .18 and .66 base measurements exactly.
// The rig's FBX import scale is absorbed so the sliders work in meters.
export function applyHeadHatDevPlacement(wearable,headBone,config){
 if(!headBone||wearable.parent!==headBone)return false;
 const v=normalizeHatDevPlacement(config);
 headBone.updateWorldMatrix(true,false);
 const world=headBone.getWorldScale(new THREE.Vector3());
 const safe=n=>Math.max(1e-6,Math.abs(n));
 wearable.position.set(v.x/safe(world.x),(.18+v.y)/safe(world.y),v.z/safe(world.z));
 const scale=.66*v.size/100;
 wearable.scale.set(scale/safe(world.x),scale/safe(world.y),scale/safe(world.z));
 wearable.rotation.set(
  THREE.MathUtils.degToRad(v.rx),THREE.MathUtils.degToRad(v.ry),
  THREE.MathUtils.degToRad(v.rz)
 );
 return true;
}
