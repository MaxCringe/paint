import * as THREE from 'three';

// Temporary independent inspection camera. It never rotates the Fiona FBX rig:
// only the camera orbits the head while the DEV hat fitting editor is open.
export const DEFAULT_HAT_CAMERA=Object.freeze({angle:0,pitch:15,distance:4.2});
export const HAT_CAMERA_LIMITS=Object.freeze({
 pitchMin:-35,pitchMax:80,zoomMin:2,zoomMax:9
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function normalizeHatCamera(input={}){
 const angle=Number(input.angle),pitch=Number(input.pitch),distance=Number(input.distance);
 return {
  angle:Number.isFinite(angle)?((angle%360)+360)%360:DEFAULT_HAT_CAMERA.angle,
  pitch:Number.isFinite(pitch)?clamp(pitch,HAT_CAMERA_LIMITS.pitchMin,HAT_CAMERA_LIMITS.pitchMax):DEFAULT_HAT_CAMERA.pitch,
  distance:Number.isFinite(distance)?clamp(distance,HAT_CAMERA_LIMITS.zoomMin,HAT_CAMERA_LIMITS.zoomMax):DEFAULT_HAT_CAMERA.distance
 };
}
export function orbitHatCameraPosition(target,settings){
 const {angle,pitch,distance}=normalizeHatCamera(settings);
 const yaw=THREE.MathUtils.degToRad(angle),elevation=THREE.MathUtils.degToRad(pitch);
 const horizontal=distance*Math.cos(elevation);
 return new THREE.Vector3(
  target.x+Math.sin(yaw)*horizontal,
  target.y+Math.sin(elevation)*distance,
  target.z+Math.cos(yaw)*horizontal
 );
}
export function createHatOrbitCamera(camera,canvas,{onChange}={}){
 let active=false,pointerId=null,lastX=0,lastY=0;
 let settings={...DEFAULT_HAT_CAMERA};
 let previousCamera=null;
 function announce(){onChange?.({...settings});}
 function set(values){
  settings=normalizeHatCamera({...settings,...values});
  announce();
  return {...settings};
 }
 function get(){return {...settings};}
 function begin(){
  if(active)return get();
  active=true;
  previousCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
  settings={...DEFAULT_HAT_CAMERA};
  canvas.classList.add('hat-orbit-active');
  announce();
  return get();
 }
 function end(){
  if(!active)return;
  active=false;
  if(pointerId!==null&&canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);
  pointerId=null;
  canvas.classList.remove('hat-orbit-active');
  if(previousCamera){
   camera.position.copy(previousCamera.position);
   camera.quaternion.copy(previousCamera.quaternion);
  }
  previousCamera=null;
 }
 function update(target){
  if(!active)return;
  camera.position.copy(orbitHatCameraPosition(target,settings));
  camera.lookAt(target);
 }
 function pointerdown(e){
  if(!active||e.button!==0||pointerId!==null)return;
  pointerId=e.pointerId;lastX=e.clientX;lastY=e.clientY;
  canvas.setPointerCapture?.(pointerId);
  e.preventDefault();
 }
 function pointermove(e){
  if(!active||pointerId!==e.pointerId)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;
  lastX=e.clientX;lastY=e.clientY;
  set({angle:settings.angle+dx*.4,pitch:settings.pitch+dy*.3});
  e.preventDefault();
 }
 function pointerup(e){
  if(pointerId!==e.pointerId)return;
  if(canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);
  pointerId=null;
 }
 function wheel(e){
  if(!active)return;
  e.preventDefault();
  set({distance:settings.distance*Math.exp(e.deltaY*.0011)});
 }
 canvas.addEventListener('pointerdown',pointerdown);
 canvas.addEventListener('pointermove',pointermove);
 canvas.addEventListener('pointerup',pointerup);
 canvas.addEventListener('pointercancel',pointerup);
 canvas.addEventListener('wheel',wheel,{passive:false});
 return {begin,end,update,set,get,get active(){return active;},destroy(){
  end();
  canvas.removeEventListener('pointerdown',pointerdown);
  canvas.removeEventListener('pointermove',pointermove);
  canvas.removeEventListener('pointerup',pointerup);
  canvas.removeEventListener('pointercancel',pointerup);
  canvas.removeEventListener('wheel',wheel);
 }};
}
