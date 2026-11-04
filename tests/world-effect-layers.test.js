import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PINE_SPECIES,newAnchor,newEffectAnchor,upgradePreset,validatePreset,distributeAnchors,PresetHistory} from '../src/devtools/world/FirePreset.js';
import {EFFECT_PRESETS,defaultEmitter,defaultLayer,applyEffectPreset,copy,sampleEmitter,birthSchedule} from '../src/devtools/world/EffectLayers.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';
import {createEditableFire} from '../src/devtools/world/EditableFire.js';
import {createWorldEffectsRuntime} from '../src/devtools/world/WorldEffectsRuntime.js';
const legacy=()=>({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});
const modern=()=>upgradePreset(legacy());
function fixture(layers,{capacity=512}={}){
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const p=modern(),a=newEffectAnchor();a.layers=layers;p.world=[a];const source={root,id:'world',key:'world',anchors:p.world};
 const fire=createEditableFire(scene,{capacity});return {scene,root,p,a,source,fire,tick(count=20){for(let i=0;i<count;i++)fire.update(.1,[source],p);}};
}
test('all thirteen presets validate; switching preserves attachment transforms and has distinct behaviors',()=>{
 assert.equal(Object.keys(EFFECT_PRESETS).length,13);const p=modern(),a=newEffectAnchor([1,2,3]);a.rotation=[.2,.3,.4];a.scale=[.7,1,2];const transform=copy({position:a.position,rotation:a.rotation,scale:a.scale,id:a.id});
 const behaviors=new Set();for(const value of Object.values(EFFECT_PRESETS)){applyEffectPreset(a,value);p.world=[a];assert.deepEqual(validatePreset(p),p);assert.deepEqual({position:a.position,rotation:a.rotation,scale:a.scale,id:a.id},transform);behaviors.add(JSON.stringify(value.layers));}
 assert.equal(behaviors.size,13);assert.equal(EFFECT_PRESETS.lightSmoke.layers.flame,undefined);assert.equal(EFFECT_PRESETS.sparkStream.layers.smoke,undefined);
});
test('legacy JSON migrates without altering transforms and retains its flame/spark settings',()=>{
 const p=legacy(),a=newAnchor([.3,4,-.6],.7);a.speed=2;a.opacity=.4;a.sparks=7;p.plants[PINE_SPECIES[0]]=[a];
 const upgraded=upgradePreset(p),b=upgraded.plants[PINE_SPECIES[0]][0];assert.equal(upgraded.version,3);assert.deepEqual(b.position,a.position);assert.equal(b.layers.flame.speed,2);assert.equal(b.layers.flame.opacity,.4);assert.equal(b.layers.sparks.count,7);assert.deepEqual(validatePreset(upgraded),upgraded);assert.equal(p.version,1);
});
test('all layers, world and object bindings, groups and named presets round-trip with history',()=>{
 const p=modern(),a=applyEffectPreset(newEffectAnchor(),EFFECT_PRESETS.campfire);a.layers.embers=defaultLayer('embers');p.objects['plant:4']={binding:{kind:'plant',id:4,species:PINE_SPECIES[0],template:0,seed:p.seed},anchors:[a],cycle:defaultBurnCycle()};p.world=[copy(a)];p.group=['plant:4'];p.customPresets=[copy(EFFECT_PRESETS.magic)];
 assert.deepEqual(upgradePreset(JSON.parse(JSON.stringify(p))),p);const h=new PresetHistory(p);p.world[0].layers.smoke.opacity=.1;h.push(p);assert.equal(h.undo().world[0].layers.smoke.opacity,EFFECT_PRESETS.campfire.layers.smoke.opacity);assert.equal(h.redo().world[0].layers.smoke.opacity,.1);
});
test('malformed layers, bindings, budgets and duplicate custom names fail atomically',()=>{
 const p=modern();p.world=[newEffectAnchor()];p.world[0].layers.flame.height=Infinity;assert.throws(()=>validatePreset(p),/Высота/);p.world[0].layers.flame.height=1;p.world[0].layers['unknown']={enabled:true};assert.throws(()=>validatePreset(p),/слой/);delete p.world[0].layers.unknown;
 p.budget=20000;assert.throws(()=>validatePreset(p),/бюджет/);p.budget=6000;
 p.objects['plant:2']={binding:{kind:'plant',id:2,species:PINE_SPECIES[0],template:0,seed:99},anchors:[]};assert.throws(()=>validatePreset(p),/seed/);p.objects={};p.customPresets=[copy(EFFECT_PRESETS.magic),copy(EFFECT_PRESETS.magic)];assert.throws(()=>validatePreset(p),/имена/);
});
test('seeded distribution repeats exact layout/scale/identities and respects local surface/height range',()=>{
 const profile={anchors:Array.from({length:8},(_,i)=>({x:i,y:i,z:-i,height:i/7}))};const options={count:12,minHeight:.2,maxHeight:.8,seed:123,minSize:.6,maxSize:1.2};
 const a=distributeAnchors(profile,options),b=distributeAnchors(profile,options);assert.deepEqual(a,b);assert.equal(a.length,12);assert.ok(a.every(v=>v.position[1]>=2&&v.position[1]<=5&&v.scale[0]>=.6&&v.scale[0]<=1.2));assert.notDeepEqual(a,distributeAnchors(profile,{...options,seed:124}));
});
test('emitter shapes occupy their real source extents with reproducible samples',()=>{
 const emitter=defaultEmitter(),v=new THREE.Vector3();for(const shape of ['point','circle','area','line','cone']){emitter.shape=shape;for(let i=0;i<50;i++){sampleEmitter(emitter,i,v);if(shape==='point')assert.equal(v.length(),0);if(shape==='line'){assert.equal(v.z,0);assert.ok(Math.abs(v.x)<=emitter.length/2);}if(shape==='circle'||shape==='cone')assert.ok(v.length()<=emitter.radius+1e-8);if(shape==='area')assert.ok(Math.abs(v.x)<=emitter.width/2&&Math.abs(v.z)<=emitter.depth/2);}}
});
test('smoke alone and sparks alone really render with no flame batch, and can be disabled',()=>{
 for(const kind of ['smoke','sparks','embers']){
  const f=fixture({[kind]:defaultLayer(kind)});f.tick();assert.equal(f.fire.stats().flames,0);assert.ok(f.fire.stats()[kind]>0);f.a.layers[kind].enabled=false;f.fire.update(.1,[f.source],f.p);assert.equal(f.fire.stats().particles,0);f.fire.dispose();assert.equal(f.scene.getObjectByName('WorldEditorSmoke'),undefined);
 }
});
test('particle pause/restart does not accumulate time and attached smoke follows the root transform',()=>{
 const f=fixture({smoke:defaultLayer('smoke')});f.tick();f.fire.setPaused(true);const t=f.fire.stats().time,smoke=f.scene.getObjectByName('WorldEditorSmoke'),before=new THREE.Matrix4(),after=new THREE.Matrix4();smoke.getMatrixAt(0,before);
 f.root.position.x+=7;f.fire.update(.1,[f.source],f.p);smoke.getMatrixAt(0,after);assert.equal(f.fire.stats().time,t);assert.ok(Math.abs(after.elements[12]-before.elements[12]-7)<1e-5);
 f.fire.restart();f.fire.update(0,[f.source],f.p);assert.equal(f.fire.stats().time,0);f.fire.dispose();
});
test('continuous births and periodic bursts differ and lowering LOD lowers emission',()=>{
 const l=defaultLayer('sparks');const continuous=birthSchedule(l,3);l.mode='burst';l.burstCount=20;l.period=2;const burst=birthSchedule(l,3);assert.notEqual(continuous.birth(1),burst.birth(1));assert.equal(burst.birth(0),2);assert.ok(birthSchedule(l,3,.2).count<burst.count);
});
test('combined dense scene obeys one global budget and far sources have fewer flames',()=>{
 const f=fixture(copy(EFFECT_PRESETS.inferno.layers),{capacity:512});f.p.budget=128;const sources=Array.from({length:30},(_,i)=>({...f.source,id:'s'+i}));for(let i=0;i<20;i++)f.fire.update(.1,sources,f.p);assert.ok(f.fire.stats().particles<=128);assert.ok(f.fire.stats().truncated);
 f.p.budget=512;const camera=new THREE.PerspectiveCamera();camera.position.set(0,1,0);f.fire.update(0,[f.source],f.p,{camera});const near=f.fire.stats().flames;f.root.position.z=-100;f.fire.update(0,[f.source],f.p,{camera});assert.ok(f.fire.stats().flames<near);assert.ok(f.fire.stats().drawCalls<=5);f.fire.dispose();
});
test('ordinary-run runtime renders saved per-object effects without an editor and keeps templates isolated',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group(),other=new THREE.Group();for(const [i,r] of [root,other].entries()){r.userData={plantId:i,plantSpecies:PINE_SPECIES[0],plantTemplate:0};scene.add(r);}
 const p=modern(),a=applyEffectPreset(newEffectAnchor(),EFFECT_PRESETS.lightSmoke);p.objects['plant:0']={binding:{kind:'plant',id:0,species:PINE_SPECIES[0],template:0,seed:p.seed},anchors:[a]};
 const runtime=createWorldEffectsRuntime({scene,forest:{plants:[root,other]},seed:p.seed,camera:new THREE.PerspectiveCamera(),renderer:{getPixelRatio:()=>1},getRivers:()=>[],getBurningPlants:()=>[],defaultFireObjects:[],preset:p});
 for(let i=0;i<20;i++)runtime.update(.1);assert.equal(runtime.fire.stats().anchors,1);assert.ok(runtime.fire.stats().smoke>0);assert.equal(runtime.anchorsFor(runtime.sourceFor(other)).length,0);assert.equal(p.plants[PINE_SPECIES[0]].length,0);runtime.dispose();assert.equal(scene.getObjectByName('AuthoredWorldEffects'),undefined);
});

test('wide lava-line emitters follow the curved wooden edge instead of a fixed z',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const p=modern(),a=applyEffectPreset(newEffectAnchor([3,.02,.2]),EFFECT_PRESETS.lava);a.side=-1;p.deck=[a];
 const boundary={center:x=>Math.sin(x),halfWidth:x=>2+.2*Math.cos(x)};const fire=createEditableFire(scene,{capacity:128});fire.update(.1,[{root,id:'deck',key:'deck',boundary}],p);
 const mesh=scene.getObjectByName('WorldEditorFire'),m=new THREE.Matrix4();assert.ok(mesh.count>1);
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);const x=m.elements[12],z=m.elements[14],offset=-1*(z-boundary.center(x))-boundary.halfWidth(x);assert.ok(x<=4.34+1e-5&&x>=-4.34-1e-5);assert.ok(offset>=.02-1e-5&&offset<=.39+1e-5);}
 fire.dispose();
});

test('disposing shared instance batches releases their instance-matrix GPU ownership exactly once',()=>{
 const f=fixture({smoke:defaultLayer('smoke'),flame:defaultLayer('flame')});f.tick();let disposed=0;
 for(const name of ['WorldEditorFire','WorldEditorSmoke'])f.scene.getObjectByName(name).addEventListener('dispose',()=>disposed++);
 f.fire.dispose();f.fire.dispose();assert.equal(disposed,2);
});
