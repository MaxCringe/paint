import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {FIONA_ANIMATION_SLOTS} from '../src/player/FionaAnimationSlots.js';
import {createPythonFionaClips} from '../src/player/FionaPythonMotions.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const motionData=JSON.parse(gunzipSync(read('public/models/fiona/animations/motions.json.gz')).toString());
const names=['Hips','Spine','Spine1','Spine2','Head','LeftArm','RightArm',
 'LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'];

test('Python motions cover all 23 KNOTTY PINE actions',()=>{
 assert.equal(motionData.schema,1);
 assert.equal(motionData.author,'python-numpy');
 assert.deepEqual(Object.keys(motionData.motions).sort(),FIONA_ANIMATION_SLOTS.map(x=>x.id).sort());
 assert.ok(read('public/models/fiona/rigged-model (1) (1).fbx').length>1_000_000);
});
test('all Python clips bind to FBX skeleton and contain valid quaternion keys',()=>{
 const bones=new Map(names.map(name=>[name,Object.assign(new THREE.Bone(),{name})]));
 const clips=createPythonFionaClips(bones,motionData);
 assert.equal(clips.size,23);
 for(const [id,clip] of clips){
  assert.ok(clip.duration>0,id);
  assert.ok(clip.tracks.length>0,id);
  for(const track of clip.tracks){
   assert.equal(track.ValueTypeName,'quaternion');
   assert.equal(track.values.length,track.times.length*4);
   for(const value of track.values)assert.ok(Number.isFinite(value),id);
   for(let i=1;i<track.times.length;i++)assert.ok(track.times[i]>track.times[i-1],id);
  }
 }
});
test('test run no longer asks for Run Forward or Jump FBX files',()=>{
 const html=read('index.html').toString();
 const menu=read('src/ui/GameMenu.js').toString();
 const fiona=read('src/player/FionaTest.js').toString();
 assert.ok(html.includes('id="fiona-model-file"'));
 for(const name of ['fiona-jump-file','fiona-run-file','fiona-test-animation-slots'])
  assert.ok(!html.includes(name),name);
 assert.ok(!menu.includes('jumpFile'));
 assert.ok(!menu.includes('runFile'));
 assert.ok(!fiona.includes('generateFionaPrototypeClips'));
 assert.ok(fiona.includes('createPythonFionaClips'));
});
test('Python motion loader handles both compressed bytes and browser-auto-decompressed responses',async()=>{
 const compressed=read('public/models/fiona/animations/motions.json.gz');
 const uncompressed=gunzipSync(compressed);
 const oldFetch=globalThis.fetch;
 async function check(body,variant){
  globalThis.fetch=async()=>new Response(body,{status:200});
  const module=await import('../src/player/FionaPythonMotions.js?'+variant);
  const data=await module.fetchPythonFionaMotionData();
  assert.equal(data.author,'python-numpy');
  assert.equal(Object.keys(data.motions).length,23);
 }
 try{
  await check(compressed,'raw-gzip');
  await check(uncompressed,'browser-decoded');
 }finally{
  globalThis.fetch=oldFetch;
 }
});
