import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSculptedFlameGeometry,FLAME_FORMS,applyFlameForm} from '../src/systems/fire/ArtisticFire.js';
import {defaultBurnCycle,computeBurnCycleState,computeAnchorWeight} from '../src/systems/fire/ArtisticBurnCycle.js';
import {upgradePreset,newEffectAnchor,PINE_SPECIES} from '../src/devtools/world/FirePreset.js';
import {defaultLayer,EFFECT_PRESETS,copy} from '../src/devtools/world/EffectLayers.js';
import {createEditableFire} from '../src/devtools/world/EditableFire.js';
import {createTreeComposition} from '../src/devtools/world/CompositionLayout.js';
import {getPineFireProfile} from '../src/systems/fire/ForestFireStudio.js';
const preset=()=>upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});
test('v2 migration preserves placement and old styling; new forms and cycle round-trip',()=>{
 const p=preset(),a=newEffectAnchor([1,2,3]);a.layers.flame=defaultLayer('flame');p.world=[a];p.version=2;
 for(const k of ['shape','forkStrength','shellOpacity','bend','curl','variation'])delete a.layers.flame[k];
 const q=upgradePreset(p);assert.equal(q.version,3);assert.deepEqual(q.world[0].position,[1,2,3]);assert.equal(q.world[0].layers.flame.shape,'legacy');
 for(const shape of Object.keys(FLAME_FORMS)){applyFlameForm(q.world[0].layers.flame,shape);assert.deepEqual(upgradePreset(JSON.parse(JSON.stringify(q))),q);}
 q.world[0].layers.flame.shape='missing';assert.throws(()=>upgradePreset(q));
});
test('shared sculpted geometry has two complete indexed shells',()=>{
 const g=createSculptedFlameGeometry(),shell=g.getAttribute('aShellData'),flags=new Set();for(let i=0;i<shell.count;i++)flags.add(shell.getZ(i));assert.deepEqual([...flags],[0,1]);assert.equal(g.getAttribute('position').count,shell.count);assert.ok(Math.max(...g.index.array)<shell.count);g.dispose();
});
test('constant burning stays active; manual sequence advances up tree and ends with coals',()=>{
 const cycle=defaultBurnCycle();for(const height of [0,.5,1])assert.deepEqual(computeAnchorWeight(height,computeBurnCycleState(cycle,100)),{flame:1,smoke:1,sparks:1,embers:1,coals:1});
 const early=computeBurnCycleState({...cycle,mode:'manual',stage:.2});assert.ok(computeAnchorWeight(.1,early).flame>.9);assert.equal(computeAnchorWeight(.9,early).flame,0);
 const end=computeAnchorWeight(.5,computeBurnCycleState({...cycle,mode:'manual',stage:1}));assert.equal(end.flame,0);assert.equal(end.coals,1);assert.ok(end.smoke>0);
 assert.equal(computeBurnCycleState({...cycle,mode:'auto'},1.2).progress.toFixed(1),'0.2');assert.equal(computeBurnCycleState({...cycle,mode:'auto',repeat:false},1.2).progress,1);
});
test('surface coals stay fixed while clock advances, follow roots; volume smoke falls back at distance',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const p=preset(),a=newEffectAnchor();a.layers={coals:defaultLayer('coals'),smoke:{...defaultLayer('smoke'),quality:'volume'}};const source={root,id:'tree',key:'world',anchors:[a],cycle:defaultBurnCycle()};const engine=createEditableFire(scene,{capacity:512}),camera=new THREE.PerspectiveCamera();
 engine.update(1,[source],p,{camera});assert.ok(engine.stats().smokeVolume>0);const coals=scene.getObjectByName('WorldEditorSurfaceCoals'),m=new THREE.Matrix4(),n=new THREE.Matrix4();coals.getMatrixAt(0,m);engine.update(1,[source],p,{camera});coals.getMatrixAt(0,n);assert.deepEqual(n.elements,m.elements);
 root.position.x=7;engine.update(0,[source],p,{camera});coals.getMatrixAt(0,n);assert.ok(Math.abs(n.elements[12]-m.elements[12]-7)<1e-5);
 root.position.z=-100;engine.update(0,[source],p,{camera});assert.equal(engine.stats().smokeVolume,0);assert.ok(engine.stats().smokeCards>0);assert.ok(engine.stats().drawCalls<=5);engine.dispose();
});
test('auto cycle respects speed, pause, global pause and restart',()=>{
 const scene=new THREE.Scene(),root=new THREE.Group(),p=preset(),source={root,id:'tree',key:'world',anchors:[newEffectAnchor()],cycle:{...defaultBurnCycle(),mode:'auto',duration:10,speed:2}};scene.add(root);const e=createEditableFire(scene,{capacity:32});e.update(1,[source],p);assert.ok(Math.abs(e.cycleProgress('tree').progress-.02)<1e-8);source.cycle.paused=true;e.update(1,[source],p);assert.ok(Math.abs(e.cycleProgress('tree').progress-.02)<1e-8);source.cycle.paused=false;e.setPaused(true);e.update(1,[source],p);assert.ok(Math.abs(e.cycleProgress('tree').progress-.02)<1e-8);e.restartCycle('tree');e.update(0,[source],p);assert.equal(e.cycleProgress('tree').progress,0);e.dispose();
});
test('tree compositions use distinct actual wood/branch anchors with reproducible irregular sizes',()=>{
 const profile=getPineFireProfile('pine:grove_cluster');for(const zone of ['trunk','crown']){const options={zone,seed:17,count:7},a=createTreeComposition(profile,EFFECT_PRESETS[zone],options);assert.deepEqual(a,createTreeComposition(profile,EFFECT_PRESETS[zone],options));assert.ok(a.length>1);assert.equal(new Set(a.map(v=>v.position.join(','))).size,a.length);assert.ok(new Set(a.map(v=>v.scale[0])).size>1);for(const v of a)assert.ok(profile.anchors.some(p=>p.x===v.position[0]&&p.y===v.position[1]&&p.z===v.position[2]));}
});
