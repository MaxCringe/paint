import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Selective bloom: only collectible soul meshes participate in the bloom pass.
// These percentages map directly to UnrealBloomPass strength/radius/threshold.
export const SOUL_BLOOM_ENABLED = true;
export const SOUL_BLOOM_PERCENT = Object.freeze({
 strength: 40,
 radius: 30,
 threshold: 78
});

const SOUL_LAYER = 1;
const BLACK = new THREE.Color(0x000000);
const percent = value => THREE.MathUtils.clamp(value, 0, 100) / 100;

export function createSoulBloom(scene, camera, renderer, {
 enabled = SOUL_BLOOM_ENABLED,
 mobile = window.innerWidth < 720
} = {}) {
 if (!enabled) return {
  registerSoul() {},
  render() { renderer.render(scene, camera); },
  resize() {},
  dispose() {}
 };

 const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
 const bloomComposer = new EffectComposer(renderer);
 bloomComposer.renderToScreen = false;
 bloomComposer.addPass(new RenderPass(scene, camera));
 const bloom = new UnrealBloomPass(
  size,
  percent(SOUL_BLOOM_PERCENT.strength),
  percent(SOUL_BLOOM_PERCENT.radius),
  percent(SOUL_BLOOM_PERCENT.threshold)
 );
 bloomComposer.addPass(bloom);

 // The full scene is rendered normally; only the soul-layer bloom is added.
 const composite = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: {
   tDiffuse: { value: null },
   bloomTexture: { value: bloomComposer.renderTarget2.texture }
  },
  vertexShader: [
   'varying vec2 vUv;',
   'void main() {',
   '  vUv = uv;',
   '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
   '}'
  ].join('\n'),
  fragmentShader: [
   'uniform sampler2D tDiffuse;',
   'uniform sampler2D bloomTexture;',
   'varying vec2 vUv;',
   'void main() {',
   '  vec4 base = texture2D(tDiffuse, vUv);',
   '  vec3 glow = texture2D(bloomTexture, vUv).rgb;',
   '  gl_FragColor = vec4(base.rgb + glow, base.a);',
   '}'
  ].join('\n')
 }));
 const finalComposer = new EffectComposer(renderer);
 finalComposer.addPass(new RenderPass(scene, camera));
 finalComposer.addPass(composite);
 finalComposer.addPass(new OutputPass());

 // The bloom textures are smaller, minimizing GPU cost without blurring the game.
 const bloomPixelRatio = Math.min(renderer.getPixelRatio(), mobile ? 0.65 : 0.85);
 function resize() {
  const width = window.innerWidth, height = window.innerHeight;
  bloomComposer.setPixelRatio(bloomPixelRatio);
  bloomComposer.setSize(width, height);
  finalComposer.setPixelRatio(renderer.getPixelRatio());
  finalComposer.setSize(width, height);
 }
 resize();

 // Original soul meshes stay on the default layer as well, so the normal
 // scene and game collision/collection logic are completely unaffected.
 function registerSoul(group) {
  group.traverse(object => {
   if (object.isMesh) object.layers.enable(SOUL_LAYER);
  });
 }

 function render() {
  const previousBackground = scene.background;
  const previousMask = camera.layers.mask;
  try {
   camera.layers.set(SOUL_LAYER);
   scene.background = BLACK;
   bloomComposer.render();
  } finally {
   camera.layers.mask = previousMask;
   scene.background = previousBackground;
  }
  finalComposer.render();
 }

 function dispose() {
  bloomComposer.dispose();
  finalComposer.dispose();
  bloom.dispose();
  composite.material.dispose();
 }
 return { registerSoul, render, resize, dispose };
}
