import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {DEFAULT_POWER_POSE,POWER_POSE_CONTROLS,normalizePowerPose,createPowerLevitationPose} from '../src/player/PowerLevitationPose.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function sampleRig(){
 const root=new THREE.Group();
 const hips=new THREE.Bone();hips.name='mixamorig:Hips';hips.position.y=1;root.add(hips);
 const bones=new Map([[hips.name,hips]]);
 for(const label of ['Left','Right']){
  const side=label==='Left'?-1:1;
  const add=(name,parent,x,y,z)=>{
   const bone=new THREE.Bone();bone.name='mixamorig:'+label+name;
   bone.position.set(x,y,z);parent.add(bone);bones.set(bone.name,bone);return bone;
  };
  const arm=add('Arm',hips,side*.35,.5,0),forearm=add('ForeArm',arm,0,-.4,0);
  add('Hand',forearm,0,-.35,0);
  const upperLeg=add('UpLeg',hips,side*.19,-.1,0),lowerLeg=add('Leg',upperLeg,0,-.45,.12);
  add('Foot',lowerLeg,0,-.46,.15);
 }
 return {root,bones};
}

test('workshop exposes nine bounded angle controls with complete defaults',()=>{
 assert.equal(POWER_POSE_CONTROLS.length,9);
 assert.deepEqual(normalizePowerPose({}),DEFAULT_POWER_POSE);
 assert.equal(normalizePowerPose({leftUpper:500}).leftUpper,85);
 assert.equal(normalizePowerPose({rightLeg:-10}).rightLeg,0);
 assert.equal(normalizePowerPose({chest:'12'}).chest,12);
 assert.equal(normalizePowerPose({chest:'garbage'}).chest,0);
});

test('live shoulder sliders steer the actual skeleton; no effect when not flying',()=>{
 const {root,bones}=sampleRig();
 const pose=createPowerLevitationPose(bones,root);
 const arm=bones.get('mixamorig:LeftArm'),elbow=bones.get('mixamorig:LeftForeArm');
 const direction=()=>{
  const start=arm.getWorldPosition(new THREE.Vector3());
  const end=elbow.getWorldPosition(new THREE.Vector3());
  return end.sub(start).normalize();
 };
 const before=arm.quaternion.clone();
 pose.apply(0);assert.ok(before.equals(arm.quaternion));
 pose.apply(1);const normal=direction();
 assert.ok(normal.y>.5);
 pose.setSettings({leftUpper:85});pose.apply(1);
 const raised=direction();
 assert.ok(raised.y>normal.y+.15);
 assert.equal(pose.getSettings().leftUpper,85);
 pose.setSettings(DEFAULT_POWER_POSE);
 assert.deepEqual(pose.getSettings(),DEFAULT_POWER_POSE);
});

test('DEV editor freezes the run and supports copyable browser-local settings',()=>{
 const game=read('src/game.js'),controller=read('src/player/FionaTest.js');
 const editor=read('src/ui/FionaPoseEditor.js');
 const input=read('src/systems/GameInput.js');
 assert.ok(game.includes("state='pose-edit'"));
 assert.ok(game.includes("state==='pose-edit'&&useTestFiona"));
 assert.ok(game.includes('testAvatar.setPoseEditorPreview(true)'));
 assert.ok(game.includes('poseEditor.setAvailable(false)'));
 assert.ok(controller.includes('setPowerPose,getPowerPose,setPoseEditorPreview,setPosePreviewAngle'));
 assert.ok(input.includes("state==='pose-edit'"));
 assert.ok(editor.includes('navigator.clipboard.writeText(json)'));
 assert.ok(editor.includes('localStorage.setItem(KEY'));
 assert.ok(editor.includes('knotty-pine-ultimate-pose'));
});
