import * as THREE from 'three';

// Approved placement exported from Fiona's 3D DEV hat fitting workshop.
// Units and Euler rotations are kept exactly as chosen by the player.
export const APPROVED_WORN_HAT_PLACEMENT=Object.freeze({
 x:-.01,y:.08,z:-.09,rx:-3,ry:-180,rz:4,size:90
});

// The imported FBX is scaled relative to the game world. Convert the
// offsets and hat size into its head bone's local coordinates. Only the
// worn hat on the new 3D Fiona uses this configuration.
export function applyApprovedWornHatPlacement(wearable,headBone){
 if(!headBone||wearable.parent!==headBone)return false;
 const cfg=APPROVED_WORN_HAT_PLACEMENT;
 headBone.updateWorldMatrix(true,false);
 const world=headBone.getWorldScale(new THREE.Vector3());
 const safe=n=>Math.max(1e-6,Math.abs(n));
 wearable.position.set(cfg.x/safe(world.x),(.18+cfg.y)/safe(world.y),cfg.z/safe(world.z));
 const scalar=.66*cfg.size/100;
 wearable.scale.set(scalar/safe(world.x),scalar/safe(world.y),scalar/safe(world.z));
 wearable.rotation.set(
  THREE.MathUtils.degToRad(cfg.rx),THREE.MathUtils.degToRad(cfg.ry),THREE.MathUtils.degToRad(cfg.rz)
 );
 return true;
}
