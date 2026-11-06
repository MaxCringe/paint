import * as THREE from 'three';
import {normalizeAtmosphere} from './AtmosphereSettings.js';

// Controls the existing AirLite, wind and volcanic particles; owns no extra renderer.
export function createAtmosphereRuntime({scene,air,wind,backdrop,settings,mobile=innerWidth<720}){
 let current=normalizeAtmosphere(settings??(mobile?{quality:'low'}:undefined)),hidden=false,last='',cpuMs=0;
 const fog=scene.fog??new THREE.Fog(0x3b101b,14.7,65.9),horizon={value:0},materials=new Set();
 backdrop.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(!material?.isMeshBasicMaterial||material.fog||materials.has(material))continue;
  materials.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.fog=true;
  material.onBeforeCompile=function(shader,...args){compile.call(this,shader,...args);shader.uniforms.kpHorizonFog=horizon;shader.fragmentShader='uniform float kpHorizonFog;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','vec3 kpUnfogged=gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb=mix(kpUnfogged,gl_FragColor.rgb,kpHorizonFog);');};
  material.customProgramCacheKey=()=>cache()+'-atmosphere-v1';material.needsUpdate=true;
 }});
 const volcanic=backdrop.getObjectByName('VolcanoAtmosphericParticles');
 function applyFog(){scene.fog=current.fog.enabled&&!hidden?fog:null;air.setFogPreviewHidden(hidden);}
 function configure(value){
  const next=normalizeAtmosphere(value),key=JSON.stringify(next);if(key===last)return;last=key;current=next;
  fog.color.set(current.fog.color);fog.near=current.fog.near;
  fog.far=fog.near+Math.max(30,(current.fog.far-fog.near)/(current.fog.density*current.fog.trees));
  horizon.value=current.fog.mountains;
  air.configure(current);wind.configure(current.wind);
  if(volcanic){volcanic.visible=current.background.enabled;const cap={low:16,medium:32,high:64}[current.quality];volcanic.geometry.setDrawRange(0,Math.round(cap*current.background.intensity));}
  applyFog();
 }
 function update(dt,{playing=true,speed=0}={}){const start=performance.now();wind.update(dt);air.update(dt,{playing,speed,wind:wind.current});cpuMs=performance.now()-start;}
 configure(current);
 return {configure,update,get settings(){return current;},get fogHidden(){return hidden;},setFogHidden(value){hidden=Boolean(value);applyFog();},stats(){const stats=air.stats();return {...stats,particles:stats.particles+(volcanic?.visible?volcanic.geometry.drawRange.count:0),drawCalls:stats.drawCalls+(volcanic?.visible&&volcanic.geometry.drawRange.count?1:0),cpuMs};}};
}
