import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {
 EFFECT_EDITOR_AVAILABLE,EFFECT_VISUAL_SCHEMA,EFFECT_VISUAL_DEFAULTS,EFFECT_VISUAL_CONTROLS,
 effectVisualSnapshot,getEffectVisualProfile,setEffectVisualValue,
 resetEffectVisualCategory,revertEffectVisuals,resetEffectVisuals,
 restoreOriginalAppearance,EFFECT_VISUAL_RESTORE_REVISION,RESTORED_VISUAL_CATEGORIES
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
test('temporary effect editor is removed but runtime visual profiles remain',()=>{
 const html=read('index.html'),main=read('src/main.js'),game=read('src/game.js');
 assert.ok(!html.includes('menu-open-effects-editor'));
 assert.ok(!main.includes('EffectEditor.js'));
 assert.ok(!main.includes('VITE_ENABLE_EFFECT_EDITOR'));
 assert.ok(!game.includes('effect-editor-open'));
 for(const path of ['src/devtools/EffectEditor.js','src/devtools/EffectEditor.css'])
  assert.equal(existsSync(new URL('../'+path,import.meta.url)),false,path);
 assert.ok(existsSync(new URL('../src/effects/EffectVisualProfiles.js',import.meta.url)));
 assert.ok(existsSync(new URL('../src/powerups/BroomVisualProfiles.js',import.meta.url)));
 assert.ok(read('src/souls/createSoulFactory.js').includes('if(!force&&signature===lastVisualSignature)return'));
});
test('visual profiles drive actual hat, scarf, soul and ultimate renderers, never their game rules',()=>{
 const hat=read('src/powerups/WitchHat.js'),scarf=read('src/powerups/ScarfPickup.js');
 const soul=read('src/souls/createSoulFactory.js'),aura=read('src/effects/UltimateAura.js');
 for(const [content,category] of [[hat,'hat'],[scarf,'scarf'],[soul,'souls'],[aura,'ultimate']])
  assert.ok(content.includes("getEffectVisualProfile('"+category+"')"),category);
 assert.match(read('src/systems/ScarfRules.js'),/SCARF_INTERVAL_METRES=1000/);
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

test('legacy persisted overrides restore soul, hat and ultimate defaults without changing broom material or scarf',()=>{
 assert.equal(EFFECT_VISUAL_RESTORE_REVISION,1);
 assert.deepEqual(RESTORED_VISUAL_CATEGORIES,['hat','souls','ultimate']);
 const previouslySaved=JSON.parse(JSON.stringify(EFFECT_VISUAL_DEFAULTS));
 previouslySaved.hat.glowOpacity=63;
 previouslySaved.souls.haloOpacity=13;
 previouslySaved.souls.outerOpacity=100;
 previouslySaved.souls.innerOpacity=85;
 previouslySaved.souls.sparkSize=220;
 previouslySaved.ultimate.intensity=77;
 previouslySaved.ultimate.flameSpeed=39;
 previouslySaved.broomModel.woodColor='#123456';
 previouslySaved.scarf.glowOpacity=40;
 const restored=restoreOriginalAppearance(previouslySaved);
 for(const category of RESTORED_VISUAL_CATEGORIES)
  assert.deepEqual(restored[category],EFFECT_VISUAL_DEFAULTS[category],category);
 assert.equal(restored.broomModel.woodColor,'#123456');
 assert.equal(restored.scarf.glowOpacity,40);
 assert.equal(previouslySaved.souls.sparkSize,220);
 assert.equal(previouslySaved.hat.glowOpacity,63);
});
test('saved legacy browser profiles migrate exactly once; future intentional soul edits persist',async()=>{
 const key='knottyPineEffectVisualWorkshopV1';
 const earlier={
  ...JSON.parse(JSON.stringify(EFFECT_VISUAL_DEFAULTS)),
  hat:{...EFFECT_VISUAL_DEFAULTS.hat,glowOpacity:63},
  souls:{...EFFECT_VISUAL_DEFAULTS.souls,haloOpacity:13,outerOpacity:100,innerOpacity:85,sparkSize:220},
  ultimate:{...EFFECT_VISUAL_DEFAULTS.ultimate,intensity:77,flameSpeed:39},
  broomModel:{...EFFECT_VISUAL_DEFAULTS.broomModel,woodColor:'#123456'}
 };
 const savedStorage=new Map([[key,JSON.stringify(earlier)]]);
 const original=globalThis.localStorage;
 globalThis.localStorage={
  getItem:k=>savedStorage.get(k)??null,
  setItem:(k,v)=>savedStorage.set(k,String(v)),
  removeItem:k=>savedStorage.delete(k)
 };
 try{
  const one=await import('../src/effects/EffectVisualProfiles.js?migration-first');
  assert.equal(one.getEffectVisualProfile('souls').sparkSize,100);
  assert.equal(one.getEffectVisualProfile('souls').innerOpacity,97);
  assert.equal(one.getEffectVisualProfile('hat').glowOpacity,88);
  assert.equal(one.getEffectVisualProfile('ultimate').flameSpeed,100);
  assert.equal(one.getEffectVisualProfile('broomModel').woodColor,'#123456');
  assert.equal(JSON.parse(savedStorage.get(key)).__appearanceRevision,1);
  one.setEffectVisualValue('souls','sparkSize',126);
  assert.equal(one.saveEffectVisuals(),true);
  const two=await import('../src/effects/EffectVisualProfiles.js?migration-second');
  assert.equal(two.getEffectVisualProfile('souls').sparkSize,126);
  assert.equal(two.getEffectVisualProfile('hat').glowOpacity,88);
  assert.equal(two.getEffectVisualProfile('broomModel').woodColor,'#123456');
 }finally{
  if(original===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=original;
 }
});
test('soul material update signature observes independent color changes',()=>{
 const soul=read('src/souls/createSoulFactory.js');
 for(const part of ['v.outerColor,v.innerColor,v.sparkAColor,v.sparkBColor,v.sparkCColor']){
  assert.ok(soul.includes(part),part);
 }
});
