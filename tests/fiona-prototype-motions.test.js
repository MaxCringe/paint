import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FIONA_ANIMATION_SLOTS} from '../src/player/FionaAnimationSlots.js';
import {generateFionaPrototypeClips} from '../src/player/FionaPrototypeMotions.js';

test('Fiona generated prototype animations cover every slot except imported run and jump',()=>{
 const bones=new Map();
 for(const name of ['Hips','Spine','Spine1','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg']){
  const bone=new THREE.Bone();bone.name=name;bones.set(name,bone);
 }
 const provided=new Map([['run',new THREE.AnimationClip('run',1,[])],['jump',new THREE.AnimationClip('jump',1,[])]]);
 const generated=generateFionaPrototypeClips(bones,{},provided);
 const allowed=new Set(FIONA_ANIMATION_SLOTS.map(s=>s.id));
 assert.equal(generated.size,allowed.size-2);
 for(const [id,clip] of generated){
  assert.ok(allowed.has(id),id);
  assert.ok(clip.tracks.length>0,id);
  assert.ok(clip.duration>0,id);
  for(const track of clip.tracks){
   assert.equal(track.ValueTypeName,'quaternion');
   assert.ok(track.times.length>=3);
   assert.equal(track.values.length,4*track.times.length);
   assert.ok(track.times[track.times.length-1]<=clip.duration+1e-6);
   for(let i=1;i<track.times.length;i++)assert.ok(track.times[i]>track.times[i-1]);
  }
 }
});

test('user-provided clip always wins over a generated prototype',()=>{
 const bones=new Map([['Spine',Object.assign(new THREE.Bone(),{name:'Spine'})]]);
 const provided=new Map([['run',{}],['jump',{}],['slide',{}]]);
 const generated=generateFionaPrototypeClips(bones,{},provided);
 assert.ok(!generated.has('slide'));
 assert.ok(generated.has('hitTree'));
});
