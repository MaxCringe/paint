import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {catalog,filterCatalog} from '../src/devtools/world/StudioLibrary.js';
import {parseEffect,effectDocument,uniquePresetName,integrationExample} from '../src/devtools/world/StudioStorage.js';
import {EFFECT_PRESETS,defaultLayer,defaultEmitter,applyEffectPreset,copy} from '../src/devtools/world/EffectLayers.js';
import {originalComposition,updateOriginalSettings,DEFAULT_FIRE_SETTINGS,ORIGINAL_FIELDS} from '../src/systems/fire/OriginalPreset.js';
import {upgradePreset,newEffectAnchor,PINE_SPECIES} from '../src/devtools/world/FirePreset.js';
import {createEditableFire} from '../src/devtools/world/EditableFire.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
const preset=()=>upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});
test('every registered composition validates, has metadata, and is available in the searchable catalog',()=>{
 const entries=catalog();assert.equal(entries.length,16);assert.equal(filterCatalog(catalog([copy(EFFECT_PRESETS.calm)]),{category:'builtin'}).length,16);assert.equal(entries.filter(e=>e.preset.original).length,3);
 for(const entry of entries){assert.ok(entry.description.length>0);assert.deepEqual(parseEffect(effectDocument(entry.preset)),entry.preset);assert.equal(filterCatalog(entries,{query:entry.preset.name}).some(e=>e.id===entry.id),true);}
 assert.equal(filterCatalog(entries,{category:'favorites',favorites:['original:tree']})[0].id,'original:tree');assert.deepEqual(filterCatalog(entries,{category:'recent',recent:['magic','calm']}).map(e=>e.id),['magic','calm']);assert.equal(filterCatalog(entries,{query:'неизвестное'}).length,0);
});
test('original JSON import preserves original settings, all sliders affect mapped composition and do not change forest seed',()=>{
 const input={...DEFAULT_FIRE_SETTINGS,seed:197,quality:'medium'},p=preset(),value=parseEffect(input);assert.deepEqual(value.original,input);assert.equal(p.seed,1337);const base=originalComposition(input,defaultLayer,defaultEmitter);
 for(const [key,meta] of Object.entries(ORIGINAL_FIELDS)){const next={...input,[key]:key==='seed'?999:meta[1]};const v=originalComposition(next,defaultLayer,defaultEmitter);assert.equal(v.original[key],next[key]);assert.notDeepEqual(v,base,key);for(const quality of ['low','medium','high'])for(const edge of [meta[1],meta[2]]){const boundary=originalComposition({...input,quality,[key]:edge},defaultLayer,defaultEmitter);assert.deepEqual(parseEffect(effectDocument(boundary)),boundary);}}
 assert.match(integrationExample(input),/originalComposition/);assert.match(integrationExample(input),/197/);
});
test('v1/v2/v3 retain old placement; original settings and named presets round-trip',()=>{
 const p=preset(),a=applyEffectPreset(newEffectAnchor([1,2,3]),EFFECT_PRESETS['original:lava']);p.world=[a];p.customPresets=[copy(EFFECT_PRESETS['original:lava'])];assert.deepEqual(upgradePreset(JSON.parse(JSON.stringify(p))),p);const v2=copy(p);v2.version=2;delete v2.world[0].original;delete v2.world[0].layers.flame.studioMode;assert.deepEqual(upgradePreset(v2).world[0].position,a.position);assert.equal(upgradePreset(v2).version,3);
});
test('mixed original and authored effects share a global budget; resources are lazy and disposed',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const p=preset();p.budget=128;const e=createEditableFire(scene,{capacity:512});assert.equal(scene.getObjectByName('FireStudioOriginalFlames'),undefined);
 const anchors=[applyEffectPreset(newEffectAnchor(),EFFECT_PRESETS['original:tree']),applyEffectPreset(newEffectAnchor(),EFFECT_PRESETS.magic)],source={root,id:'a',key:'world',anchors};for(let i=0;i<10;i++)e.update(.1,[source],p);assert.ok(e.stats().originalFlames>0);assert.ok(e.stats().flames>e.stats().originalFlames);assert.ok(e.stats().particles<=128);assert.ok(e.stats().drawCalls<=6);
 const mesh=scene.getObjectByName('FireStudioOriginalFlames');assert.equal(mesh.geometry.getAttribute('aExtra').count,512);assert.equal(scene.children.filter(o=>o.name==='FireStudioSharedLight').length,1);const coal=scene.getObjectByName('WorldEditorSurfaceCoals'),shape=coal.geometry.getAttribute('aCoalShape');assert.ok(Array.from(shape.array).some((n,i)=>i%4===3&&n===1));e.setQuality('low');e.update(0,[source],p);assert.ok(mesh.geometry.getAttribute('position').count<200);let disposed=0;mesh.addEventListener('dispose',()=>disposed++);e.update(0,[],p);e.releaseUnused();assert.equal(scene.getObjectByName('FireStudioOriginalFlames'),undefined);e.dispose();e.dispose();assert.equal(disposed,1);assert.equal(scene.getObjectByName('FireStudioOriginalFlames'),undefined);
});
test('timeline speed, seek and pause are deterministic without mutating authored data',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group(),p=preset();scene.add(root);const a=applyEffectPreset(newEffectAnchor(),EFFECT_PRESETS['original:tree']),source={root,id:'x',key:'world',anchors:[a],cycle:copy(EFFECT_PRESETS['original:tree'].cycle)},before=copy(a),e=createEditableFire(scene,{capacity:128});e.setPlaybackSpeed(2);e.update(.1,[source],p);assert.equal(e.stats().time,.2);e.setPaused(true);e.seek(7);e.update(.1,[source],p);assert.equal(e.stats().time,7);assert.deepEqual(a,before);e.restart();e.update(0,[source],p);assert.equal(e.stats().time,0);e.dispose();
});
test('free world coordinates follow road movement while saved local anchors stay untouched',()=>{
 const scene=new THREE.Scene(),p=preset();p.world=[newEffectAnchor([1,2,-5])];let offset=0;const runtime=createWorldEffectsRuntime({scene,forest:{plants:[]},seed:p.seed,camera:new THREE.PerspectiveCamera(),renderer:{getPixelRatio:()=>1},getRivers:()=>[],getBurningPlants:()=>[],defaultFireObjects:[],preset:p,getWorldOffset:()=>offset});runtime.update(.1);offset=10;runtime.update(.1);assert.equal(runtime.world.root.position.z,10);assert.deepEqual(p.world[0].position,[1,2,-5]);runtime.dispose();
});
test('custom preset naming avoids destructive overwrite and invalid composition imports are atomic',()=>{
 const custom=[{name:'Дым'},{name:'Дым (2)'}];assert.equal(uniquePresetName('Дым',custom),'Дым (3)');const before=copy(custom);assert.throws(()=>parseEffect({name:'bad',layers:{smoke:{enabled:true,quality:'invalid'}},emitter:defaultEmitter()}));assert.deepEqual(custom,before);
});

test('original sliders preserve deleted layers, independent tuning and transforms',()=>{
 const a=applyEffectPreset(newEffectAnchor([1,2,3]),EFFECT_PRESETS['original:tree']);a.layers.smoke.rate=17;a.layers.flame.bend=.6;a.emitter.radius=.7;delete a.layers.coals;const before=copy(a);updateOriginalSettings(a,{flameHeight:2},defaultLayer,defaultEmitter);assert.equal(a.layers.flame.height,2);assert.equal(a.layers.smoke.rate,17);assert.equal(a.layers.flame.bend,.6);assert.equal(a.layers.coals,undefined);assert.equal(a.emitter.radius,.7);assert.deepEqual(a.position,before.position);assert.deepEqual(a.scale,before.scale);updateOriginalSettings(a,{seed:712},defaultLayer,defaultEmitter);assert.equal(a.original.seed,712);assert.equal(a.layers.smoke.rate,17);assert.equal(a.layers.coals,undefined);
});
