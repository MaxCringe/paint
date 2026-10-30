import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// All artistic controls are in PERCENT (0=off/minimal; 100=strong/maximal).
// Change one value at a time. Only bright pixels are bloomed, not the whole scene.
export const VISUAL_FX_PERCENT = Object.freeze({
 bloomStrength: 32,   // 0..100 -> UnrealBloom strength 0..1.1
 bloomRadius: 27,     // 0..100 -> UnrealBloom radius 0..0.9
 bloomCoverage: 46,   // 0..100 -> bright-pixel threshold .90 down to .15
 horizonRed: 52,      // 0..100 -> warm horizon color blend
 skyContrast: 48      // 0..100 -> darker upper sky blend
});

export function createVisualEffects(scene,camera,renderer,{
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 const percent=(value)=>Math.min(100,Math.max(0,value))/100;
 const levels=VISUAL_FX_PERCENT;
 const baseline=scene.background;
 // The static gradient is behind mountains and doesn't change the forest fog.
 // Draw once: no additional geometry and no per-frame work for the sky.
 function hexBlend(hexA,hexB,t){
  const a=[(hexA>>16)&255,(hexA>>8)&255,hexA&255];
  const b=[(hexB>>16)&255,(hexB>>8)&255,hexB&255];
  const k=percent(t);
  return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*k).toString(16).padStart(2,'0')).join('');
 }
 const canvas=document.createElement('canvas');
 canvas.width=32;canvas.height=256;
 const ctx=canvas.getContext('2d');
 const gradient=ctx.createLinearGradient(0,0,0,256);
 const base=0x1b050b;
 const red=levels.horizonRed,contrast=levels.skyContrast;
 gradient.addColorStop(0,hexBlend(base,0x06070f,contrast));
 gradient.addColorStop(.27,hexBlend(base,0x1d0b1a,contrast*.8));
 gradient.addColorStop(.57,hexBlend(base,0x3d1321,red*.58));
 gradient.addColorStop(.81,hexBlend(base,0x78252a,red));
 gradient.addColorStop(1,hexBlend(base,0x55202a,red*.65));
 ctx.fillStyle=gradient;
 ctx.fillRect(0,0,canvas.width,canvas.height);
 const skyTexture=new THREE.CanvasTexture(canvas);
 skyTexture.colorSpace=THREE.SRGBColorSpace;
 skyTexture.magFilter=THREE.LinearFilter;
 skyTexture.minFilter=THREE.LinearFilter;
 scene.background=skyTexture;

 let composer=null,bloomPass=null;
 if(levels.bloomStrength>0){
  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  // Bright-pixel filtering keeps glow on blue souls, hot lava and meteor cores.
  // Bloom is restrained to avoid washing out the pine-board road.
  bloomPass=new UnrealBloomPass(
   new THREE.Vector2(innerWidth,innerHeight),
   1.1*percent(levels.bloomStrength),
   .9*percent(levels.bloomRadius),
   .90-.75*percent(levels.bloomCoverage)
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  // Respect the game renderer pixel ratio, without allowing mobile supersampling.
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth,innerHeight);
  if(mobile)bloomPass.resolution.set(Math.round(innerWidth*.70),Math.round(innerHeight*.70));
 }
 function render(){
  if(composer)composer.render();
  else renderer.render(scene,camera);
 }
 function resize(){
  if(composer){
   composer.setPixelRatio(renderer.getPixelRatio());
   composer.setSize(innerWidth,innerHeight);
   if(mobile)bloomPass.resolution.set(Math.round(innerWidth*.70),Math.round(innerHeight*.70));
  }
 }
 function dispose(){
  if(scene.background===skyTexture)scene.background=baseline;
  skyTexture.dispose();
  composer?.dispose();
  bloomPass?.dispose();
 }
 return {render,resize,dispose,levels};
}
