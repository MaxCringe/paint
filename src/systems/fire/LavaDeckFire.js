import * as THREE from 'three';
import {createFireTongueGeometry,createFireTongueMaterial} from './FireStudioFlames.js';

// Small, scattered GPU flames on the CHARRED WOODEN DECK only.
// The molten channel and its basalt banks never receive flame anchors.
export const DECK_FIRE_BUDGET=Object.freeze({
 maxRivers:6,
 maxAnchorsPerRiver:32,
 minHeight:.17,
 maxHeight:.37
});

export function createLavaDeckFire(scene,{
 maxRivers=DECK_FIRE_BUDGET.maxRivers,
 maxAnchorsPerRiver=DECK_FIRE_BUDGET.maxAnchorsPerRiver
}={}){
 if(!Number.isInteger(maxRivers)||maxRivers<1||maxRivers>12||
    !Number.isInteger(maxAnchorsPerRiver)||maxAnchorsPerRiver<1||maxAnchorsPerRiver>64){
  throw new RangeError('Invalid lava deck fire budget');
 }
 const capacity=maxRivers*maxAnchorsPerRiver;
 const geometry=createFireTongueGeometry('low');
 const params=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4);
 params.setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute('aInstanceParams',params);
 const material=createFireTongueMaterial();
 // The same Fire Studio shader/geometry used by real burning pines.
 // One shared GPU batch regardless of the number of active river crossings.
 const flames=new THREE.InstancedMesh(geometry,material,capacity);
 flames.name='KnottyPineLavaDeckFire';
 flames.frustumCulled=false;
 flames.castShadow=false;
 flames.receiveShadow=false;
 flames.renderOrder=9;
 flames.count=0;
 scene.add(flames);
 const active=[];
 const dummy=new THREE.Object3D();
 const worldPoint=new THREE.Vector3();
 let elapsed=0,disposed=false;

 function registerRiver(owner){
  if(disposed||!owner?.isObject3D||!owner.parent||
    !Array.isArray(owner.userData.deckFireAnchors)||
    !owner.userData.deckFireAnchors.length||
    active.some(r=>r.owner===owner)||active.length>=maxRivers)return false;
  active.push({owner,anchors:owner.userData.deckFireAnchors.slice(0,maxAnchorsPerRiver)});
  return true;
 }
 function releaseOwner(owner){
  for(let i=active.length-1;i>=0;i--)
   if(active[i].owner===owner)active.splice(i,1);
  if(!active.length)flames.count=0;
 }
 function update(deltaSeconds=0){
  if(disposed)return;
  const dt=Number.isFinite(deltaSeconds)?Math.max(0,Math.min(.1,deltaSeconds)):0;
  elapsed+=dt;
  material.uniforms.uTime.value=elapsed;
  let count=0;
  for(let i=active.length-1;i>=0;i--){
   if(!active[i].owner.parent)active.splice(i,1);
  }
  for(const {owner,anchors} of active){
   owner.updateWorldMatrix(true,false);
   for(const anchor of anchors){
    if(count>=capacity)break;
    const flicker=.82+.18*Math.sin(elapsed*6.9+anchor.phase*17);
    const width=anchor.size*(.80+.10*Math.sin(elapsed*4.1+anchor.phase*11));
    worldPoint.set(anchor.x,anchor.y,anchor.z).applyMatrix4(owner.matrixWorld);
    dummy.position.copy(worldPoint);
    dummy.rotation.set(.055*Math.sin(elapsed*3.2+anchor.phase*13),
     anchor.phase*Math.PI*2,
     .075*Math.sin(elapsed*2.7+anchor.phase*9));
    dummy.scale.set(1,1,1);
    dummy.updateMatrix();
    flames.setMatrixAt(count,dummy.matrix);
    params.setXYZW(count,anchor.phase,
     anchor.size*flicker, width, .66+.22*flicker);
    count++;
   }
  }
  flames.count=count;
  if(count){
   flames.instanceMatrix.needsUpdate=true;
   params.needsUpdate=true;
  }
 }
 function reset(){
  active.length=0;
  flames.count=0;
  elapsed=0;
 }
 function dispose(){
  if(disposed)return;
  disposed=true;
  reset();
  scene.remove(flames);
  geometry.dispose();
  material.dispose();
 }
 return {registerRiver,releaseOwner,update,reset,dispose,
  getStats:()=>({rivers:active.length,flames:flames.count,capacity,drawCalls:flames.count?1:0}),
  previewObject:flames};
}
