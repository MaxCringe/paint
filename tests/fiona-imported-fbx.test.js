import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FIONA_FBX_FILES,fionaBoneKey,retargetFionaFBXClip} from '../src/player/FionaImportedFBX.js';

const joints=['Hips','Spine','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftArm','RightArm'];
test('production Fiona uses four approved FBX clips',()=>{
 assert.deepEqual(FIONA_FBX_FILES.map(x=>x.file),['Fast Run.fbx','Running Jump.fbx','Edge Slip.fbx','Running Slide (1).fbx']);
 assert.deepEqual(FIONA_FBX_FILES.map(x=>x.id),['run','jump','slip','slide']);
 assert.equal(fionaBoneKey('mixamorig:Hips'),'hips');
 assert.equal(fionaBoneKey('Armature|mixamorig:LeftArm'),'leftarm');
});
test('retargeted FBX rotation uses target rest pose and never root translation',()=>{
 const target=new Map(),source=new Map(),tracks=[];
 for(const name of joints){
  const src=new THREE.Bone();src.name='mixamorig:'+name;
  src.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),.45);
  source.set(fionaBoneKey(src.name),src);
  const dst=new THREE.Bone();dst.name=name;
  dst.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-.25);
  target.set(name,dst);
  const rest=src.quaternion.clone();
  const bent=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.6));
  tracks.push(new THREE.QuaternionKeyframeTrack(src.name+'.quaternion',[0,.6],
   [rest.x,rest.y,rest.z,rest.w,bent.x,bent.y,bent.z,bent.w]));
 }
 tracks.push(new THREE.VectorKeyframeTrack('mixamorig:Hips.position',[0,.6],[0,0,0,500,100,0]));
 tracks.push(new THREE.VectorKeyframeTrack('mixamorig:Hips.scale',[0,.6],[1,1,1,8,8,8]));
 const original=new THREE.AnimationClip('source',.6,tracks);
 const {clip,boneCount,mainJointCount}=retargetFionaFBXClip(original,source,target,'runFBX');
 assert.equal(clip.tracks.length,8);
 assert.equal(boneCount,8);
 assert.equal(mainJointCount,8);
 assert.ok(clip.tracks.every(x=>x.name.endsWith('.quaternion')));
 assert.ok(Math.abs(clip.duration-.6)<1e-5);
 const hip=clip.tracks.find(x=>x.name==='Hips.quaternion');
 const first=new THREE.Quaternion().fromArray(hip.values,0);
 const second=new THREE.Quaternion().fromArray(hip.values,4);
 assert.ok(first.angleTo(target.get('Hips').quaternion)<1e-6);
 const desired=target.get('Hips').quaternion.clone().multiply(
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.6));
 assert.ok(second.angleTo(desired)<1e-6);
});
test('incompatible FBX skeleton is rejected instead of pretending to play',()=>{
 const dst=new Map(),src=new Map(),tracks=[];
 for(const name of ['Head','Finger1']){
  const b=new THREE.Bone();b.name=name;dst.set(name,b);src.set(fionaBoneKey(name),b);
  tracks.push(new THREE.QuaternionKeyframeTrack(name+'.quaternion',[0,1],[0,0,0,1,0,.1,0,.995]));
 }
 assert.throws(()=>retargetFionaFBXClip(new THREE.AnimationClip('wrong',1,tracks),src,dst,'bad'),
  /скелеты несовместимы/);
});

test('rejected flight FBX is not referenced or downloaded',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const loader=read('src/player/FionaImportedFBX.js');
 const fiona=read('src/player/FionaRig.js');
 const game=read('src/game.js');
 assert.ok(!existsSync(new URL('../public/models/fiona/animations/fbx/Flying.fbx',import.meta.url)));
 assert.ok(!loader.includes("file:'Flying.fbx'"));
 assert.ok(!fiona.includes("actions.has('flyFBX')"));
 assert.ok(fiona.includes("id==='soulPickup')return false"));
 assert.ok(!game.includes("testAvatar?.trigger('soulPickup')"));
 // Original soul reward and sound remain, and nothing else blocks the run.
 assert.ok(game.includes("audio.play('soul');haptics.play('soul');coinCount++"));
});

test('puddle slips, fish kills, and production Fiona keeps instant game over',async()=>{
 const {readFileSync}=await import('node:fs');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const player=readFileSync(new URL('../src/player/FionaRig.js',import.meta.url),'utf8');
 assert.ok(game.includes("if(o.type==='pee'){if(!jumping&&invuln<=0){slipT=.9"));
 assert.ok(game.includes("o.type==='fish'?'fish':'other'"));
 assert.ok(game.includes('avatar?.die(reason,{onBroom:broom.active})'));
 assert.ok(game.includes('showDeathResult();'));
 assert.ok(player.includes('mixer.timeScale=0;'));
 assert.ok(!game.includes('deathRevealRemaining'));
});

test('ground-only slide uses FBX but broom and ultimate have independent poses',async()=>{
 const {readFileSync}=await import('node:fs');
 const player=readFileSync(new URL('../src/player/FionaRig.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(player.includes("if(id==='slide'&&actions.has('slideFBX'))return 'slideFBX'"));
 assert.ok(player.includes("!['slipFBX','slideFBX'].includes(resolved)"));
 assert.ok(player.includes("ultimate?'ultimateFly':broom?(broomDuck>0.14?'broomDuck':'broomFly')"));
 assert.ok(game.includes("slideAction.press();audio.play('slide')"));
});

test('pine collisions end the run without forced broom ground death',async()=>{
 const {readFileSync}=await import('node:fs');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const player=readFileSync(new URL('../src/player/FionaRig.js',import.meta.url),'utf8');
 assert.ok(game.includes("end('tree');break;"));
 assert.ok(game.includes('avatar?.die(reason,{onBroom:broom.active})'));
 assert.ok(player.includes("function die(reason='other',{onBroom=false}={})"));
 assert.ok(player.includes('mixer.timeScale=0;'));
 assert.ok(game.includes('showDeathResult();'));
});
