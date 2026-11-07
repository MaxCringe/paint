import * as THREE from 'three';
import {normalizeAtmosphere} from './AtmosphereSettings.js';

// Controls the existing AirLite, wind and volcanic particles; owns no extra renderer.
export function createAtmosphereRuntime({scene,air,wind,backdrop,settings,mobile=innerWidth<720}){
 let current=normalizeAtmosphere(settings??(mobile?{quality:'low'}:undefined)),hidden=false,last='',cpuMs=0;
 const fog=scene.fog??new THREE.Fog(0x3b101b,14.7,65.9),horizon={value:0},softness={value:1},materials=new Set();
 const sky=scene.background?.isColor?scene.background:null,originalSky=sky?.clone();
 backdrop.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(!material?.isMeshBasicMaterial||material.fog||materials.has(material))continue;
  materials.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.fog=true;
  material.onBeforeCompile=function(shader,...args){compile.call(this,shader,...args);shader.uniforms.kpHorizonFog=horizon;shader.uniforms.kpFogSoftness=softness;shader.fragmentShader='uniform float kpHorizonFog;\nuniform float kpFogSoftness;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 float kpDistance=smoothstep(fogNear,fogFar,vFogDepth);
 float kpFade=pow(kpDistance,1.0/kpFogSoftness)*kpHorizonFog;
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,kpFade);
 #endif`);};
  material.customProgramCacheKey=()=>cache()+'-atmosphere-v2';material.needsUpdate=true;
 }});
 const volcanic=backdrop.getObjectByName('VolcanoAtmosphericParticles');
 function applyFog(){scene.fog=current.fog.enabled&&!hidden?fog:null;if(sky)sky.copy(originalSky).lerp(fog.color,scene.fog?horizon.value:0);air.setFogPreviewHidden(hidden);}
 function configure(value){
  const next=normalizeAtmosphere(value),key=JSON.stringify(next);if(key===last)return;last=key;current=next;
  fog.color.set(current.fog.color);fog.near=current.fog.near;
  const opticalDepth=current.fog.depth*current.fog.distantDensity;
  fog.far=fog.near+Math.max(30,(current.fog.far-fog.near)/(current.fog.density*current.fog.trees*opticalDepth));
  // Optical depth approaches complete extinction instead of retaining a fixed silhouette.
  horizon.value=1-Math.pow(1-current.fog.mountains,opticalDepth);softness.value=current.fog.softness;
  air.configure(current);wind.configure(current.wind);
  if(volcanic){volcanic.visible=current.background.enabled;const cap={low:16,medium:32,high:64}[current.quality];volcanic.geometry.setDrawRange(0,Math.round(cap*current.background.intensity));}
  applyFog();
 }
 function update(dt,{playing=true,speed=0}={}){const start=performance.now();wind.update(dt);air.update(dt,{playing,speed,wind:wind.current});cpuMs=performance.now()-start;}
 configure(current);
 return {configure,update,get settings(){return current;},get fogHidden(){return hidden;},setFogHidden(value){hidden=Boolean(value);applyFog();},stats(){const stats=air.stats();return {...stats,particles:stats.particles+(volcanic?.visible?volcanic.geometry.drawRange.count:0),drawCalls:stats.drawCalls+(volcanic?.visible&&volcanic.geometry.drawRange.count?1:0),cpuMs};}};
}
