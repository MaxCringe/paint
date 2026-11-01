import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 EFFECT_EDITOR_AVAILABLE,EFFECT_VISUAL_SCHEMA,EFFECT_VISUAL_DEFAULTS,EFFECT_VISUAL_CONTROLS,
 effectVisualSnapshot,getEffectVisualProfile,setEffectVisualValue,
 resetEffectVisualCategory,revertEffectVisuals,resetEffectVisuals
} from '../src/effects/EffectVisualProfiles.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('VFX registry has five effects plus broom appearance with bounded editable fields',()=>{
 assert.equal(EFFECT_VISUAL_SCHEMA,2);
 assert.equal(EFFECT_EDITOR_AVAILABLE,true);
 assert.deepEqual(Object.keys(EFFECT_VISUAL_DEFAULTS),['broomModel','hat','scarf','souls','ultimate']);
 resetEffectVisuals();
 assert.equal(getEffectVisualProfile('hat').glowOpacity,88);
 assert.equal(getEffectVisualProfile('scarf').burstOpacity,95);
 assert.equal(getEffectVisualProfile('souls').haloOpacity,16);
 assert.equal(getEffectVisualProfile('ultimate').lightIntensity,150);
 for(const [category,controls] of Object.entries(EFFECT_VISUAL_CONTROLS)){
  for(const [key,,type,min,max] of controls){
   assert.ok(Object.hasOwn(EFFECT_VISUAL_DEFAULTS[category],key));
   if(type==='range')assert.ok(min<=EFFECT_VISUAL_DEFAULTS[category][key]&&max>=EFFECT_VISUAL_DEFAULTS[category][key]);
  }
 }
});
test('settings clamp invalid values and retain independent categories',()=>{
 resetEffectVisuals();
 assert.equal(setEffectVisualValue('hat','glowOpacity',999),true);
 assert.equal(getEffectVisualProfile('hat').glowOpacity,150);
 assert.equal(setEffectVisualValue('scarf','glowColor','#ABCDff'),true);
 assert.equal(getEffectVisualProfile('scarf').glowColor,'#abcdff');
 assert.equal(setEffectVisualValue('souls','haloColor','javascript:alert(1)'),false);
 assert.equal(setEffectVisualValue('ultimate','intensity',NaN),false);
 assert.equal(setEffectVisualValue('hat','pickupChance',500),false);
 assert.equal(getEffectVisualProfile('scarf').glowOpacity,65);
 const snapshot=effectVisualSnapshot();
 snapshot.hat.glowOpacity=-500;
 assert.equal(getEffectVisualProfile('hat').glowOpacity,150);
 resetEffectVisualCategory('hat');
 assert.equal(getEffectVisualProfile('hat').glowOpacity,88);
 revertEffectVisuals();
 assert.equal(getEffectVisualProfile('scarf').glowColor,'#ffffff');
});
test('editor isolates the real 3D models, exports all effects, and has a one-switch release guard',()=>{
 const editor=read('src/devtools/EffectEditor.js');
 const html=read('index.html'),main=read('src/main.js'),game=read('src/game.js');
 assert.match(html,/id="menu-open-effects-editor"[^>]+hidden/);
 assert.match(editor,/openButton.classList.remove\('hidden'\)/);
 assert.match(editor,/createFiona\(scene,mat,box\)/);
 assert.match(editor,/createBroomRide\(scene,runner,fiona\)/);
 assert.match(editor,/createWitchHatFactory\(scene,hats,fiona.torso\)/);
 assert.match(editor,/createScarfModelFactory\(\)/);
 assert.match(editor,/createSoulFactory\(scene,coins\)/);
 assert.match(editor,/saveEffectVisuals\(\)/);
 assert.match(editor,/saveBroomTuning\(\)/);
 assert.match(editor,/navigator.clipboard.writeText\(json\)/);
 assert.match(editor,/scarfFlash.material.opacity=burstLife\*v.burstOpacity\/100/);
 assert.match(read('src/souls/createSoulFactory.js'),/if\(!force&&signature===lastVisualSignature\)return/);
 assert.match(editor,/schemaVersion:EFFECT_VISUAL_SCHEMA/);
 assert.ok(editor.includes('broomModel:all.broomModel'));
 assert.ok(editor.includes("['coughColor','Цвет «пыхов»','color']"));
 assert.ok(editor.includes("['sparkColor','Цвет искр','color']"));
 assert.ok(editor.includes("['streakColor','Цвет струек','color']"));
 assert.ok(editor.includes("['glowColor','Цвет свечения','color']"));
 assert.ok(editor.includes('scarfFactory.updateVisuals()'));
 assert.ok(editor.includes("broom.preview(8,now,{showTrail:false})"));
 assert.match(main,/VITE_ENABLE_EFFECT_EDITOR/);
 assert.match(main,/import\('\.\/devtools\/EffectEditor\.js'\)/);
 assert.match(game,/effect-editor-open/);
 assert.ok(!html.includes('id="menu-open-broom-lab"'));
});
test('visual profiles drive actual hat, scarf, soul and ultimate renderers, never their game rules',()=>{
 const hat=read('src/powerups/WitchHat.js'),scarf=read('src/powerups/ScarfPickup.js');
 const soul=read('src/souls/createSoulFactory.js'),aura=read('src/effects/UltimateAura.js');
 for(const [content,category] of [[hat,'hat'],[scarf,'scarf'],[soul,'souls'],[aura,'ultimate']])
  assert.ok(content.includes("getEffectVisualProfile('"+category+"')"),category);
 assert.match(read('src/systems/ScarfRules.js'),/SCARF_INTERVAL_METRES=3000/);
 assert.match(read('src/powerups/BroomRide.js'),/duration: 9/);
 const model=read('src/powerups/BroomRide.js');
 for(const token of ['v.woodColor','v.gripColor','v.bindingColor','v.capColor','v.bristlesColor','v.pickupGlowColor']){
  assert.ok(model.includes(token),token);
 }
 const cloth=read('src/powerups/ScarfModel.js');
 for(const token of ['v.clothTint','v.fringeColor','v.collarColor'])assert.ok(cloth.includes(token),token);
 assert.match(read('src/game.js'),/magnetTime=10/);
});

test('appearance colors are independently addressable and survive local resets',()=>{
 resetEffectVisuals();
 assert.equal(setEffectVisualValue('broomModel','woodColor','#123abc'),true);
 assert.equal(getEffectVisualProfile('broomModel').woodColor,'#123abc');
 assert.equal(getEffectVisualProfile('broomModel').gripColor,'#291a17');
 assert.equal(setEffectVisualValue('hat','fabricColor','#aabbcc'),true);
 assert.equal(getEffectVisualProfile('hat').fabricColor,'#aabbcc');
 assert.equal(setEffectVisualValue('scarf','fringeColor','#112233'),true);
 assert.equal(getEffectVisualProfile('scarf').fringeColor,'#112233');
 assert.equal(setEffectVisualValue('souls','innerColor','#00ff44'),true);
 assert.equal(getEffectVisualProfile('souls').innerColor,'#00ff44');
 assert.equal(setEffectVisualValue('ultimate','lightColor','#ffddcc'),true);
 assert.equal(getEffectVisualProfile('ultimate').lightColor,'#ffddcc');
 assert.equal(setEffectVisualValue('hat','fabricColor','untrusted'),false);
 assert.equal(setEffectVisualValue('broomModel','pickupChance',.9),false);
 resetEffectVisualCategory('broomModel');
 assert.equal(getEffectVisualProfile('broomModel').woodColor,'#553522');
 resetEffectVisuals();
});

test('component tint defaults preserve natural broom appearance rather than flattening straw tones',()=>{
 assert.equal(EFFECT_VISUAL_DEFAULTS.broomModel.bristlesColor,'#b38e60');
 assert.equal(EFFECT_VISUAL_DEFAULTS.broomModel.woodColor,'#553522');
 assert.equal(EFFECT_VISUAL_DEFAULTS.hat.bandColor,'#30251d');
 assert.equal(EFFECT_VISUAL_DEFAULTS.scarf.clothTint,'#ffffff');
});

test('restored non-broom defaults remain unchanged when editing broom effects',()=>{
 resetEffectVisuals();
 assert.equal(EFFECT_VISUAL_DEFAULTS.hat.glowOpacity,88);
 assert.equal(EFFECT_VISUAL_DEFAULTS.souls.haloOpacity,16);
 assert.equal(EFFECT_VISUAL_DEFAULTS.souls.outerOpacity,93);
 assert.equal(EFFECT_VISUAL_DEFAULTS.souls.innerOpacity,97);
 assert.equal(EFFECT_VISUAL_DEFAULTS.souls.sparkSize,100);
 assert.equal(EFFECT_VISUAL_DEFAULTS.ultimate.intensity,100);
 assert.equal(EFFECT_VISUAL_DEFAULTS.ultimate.flameSpeed,100);
 assert.equal(EFFECT_VISUAL_DEFAULTS.scarf.glowOpacity,65);
 assert.equal(EFFECT_VISUAL_DEFAULTS.broomModel.woodColor,'#553522');
});
