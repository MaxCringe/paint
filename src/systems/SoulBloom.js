import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Selective bloom: only collectible soul meshes participate in the bloom pass.
// These percentages map directly to UnrealBloomPass strength/radius/threshold.
export const SOUL_BLOOM_ENABLED = true;
export const SOUL_BLOOM_PERCENT = Object.freeze({
 strength: 55,
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

 // The world is rendered directly to the original antialiased canvas.
 // Only the souls are rendered through a low-resolution bloom target.
 // A single additive fullscreen quad overlays their glow without reducing
 // the quality of the pine road, foliage or any other scene texture.
 const glowMaterial = new THREE.ShaderMaterial({
  uniforms: { bloomTexture: { value: bloomComposer.renderTarget2.texture } },
  vertexShader: [
   'varying vec2 vUv;',
   'void main() {',
   '  vUv = uv;',
   '  gl_Position = vec4(position.xy, 0.0, 1.0);',
   '}'
  ].join('\n'),
  fragmentShader: [
   'uniform sampler2D bloomTexture;',
   'varying vec2 vUv;',
   'void main() {',
   '  gl_FragColor = vec4(texture2D(bloomTexture, vUv).rgb, 1.0);',
   '  #include <tonemapping_fragment>',
   '  #include <colorspace_fragment>',
   '}'
  ].join('\n'),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false
 });
 const glowScene = new THREE.Scene();
 const glowCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
 const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMaterial);
 glowMesh.frustumCulled = false;
 glowScene.add(glowMesh);

 // Only the bloom pass is downscaled to save FPS.
 const bloomPixelRatio = Math.min(renderer.getPixelRatio(), mobile ? 0.65 : 0.85);
 function resize() {
  bloomComposer.setPixelRatio(bloomPixelRatio);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
 }
 resize();

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

  // Direct canvas rendering uses WebGLRenderer's original edge antialiasing
  // and native texture filtering, without a full-scene postprocessing buffer.
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  const autoClear = renderer.autoClear;
  renderer.autoClear = false;
  try {
   renderer.render(glowScene, glowCamera);
  } finally {
   renderer.autoClear = autoClear;
  }
 }

 function dispose() {
  bloomComposer.dispose();
  bloom.dispose();
  glowMesh.geometry.dispose();
  glowMaterial.dispose();
 }

 return { registerSoul, render, resize, dispose };
}
