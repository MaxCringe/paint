import * as THREE from 'three';
import {createLowPolyPine} from '../../world/LowPolyPine.js';
import {createScotsPine} from '../../world/forest/FacetedPine.js';
import {createFireTongueGeometry,createFireTongueMaterial} from './FireStudioFlames.js';

// Experimental, opt-in adapter for the user's AI Studio generator.
// The production lava factory and game loop remain unchanged.
const NAMES=['grove_cluster','runner_spruce_pro','taiga_spruce','dead_snag','sequoia_giant','scots_pine'];
const cache=new Map();
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const dummy=new THREE.Object3D(),worldPoint=new THREE.Vector3();
const up=new THREE.Vector3(0,1,0),outward=new THREE.Vector3(),direction=new THREE.Vector3();
const twist=new THREE.Quaternion(),worldNormal=new THREE.Vector3();
function seeded(seed){let s=seed>>>0;return()=>{let t=s+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}}

// Profile points are taken from the actual prototype geometry, not from the
// opaque instanced proxies. Large needles need fire OUTSIDE the tier silhouette.
export function getPineFireProfile(species){
 const name=species?.startsWith('pine:')?species.slice(5):null;
 if(!NAMES.includes(name))throw new RangeError('Unknown pine species: '+species);
 if(cache.has(name))return cache.get(name);
 const model=name==='scots_pine'?createScotsPine():createLowPolyPine(name);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model,true);
 const height=Math.max(1,bounds.max.y),dead=name==='dead_snag';
 const anchors=[];
 const add=(x,y,z,nx,nz,size,zone)=>{
  anchors.push({x,y,z,nx,nz,height:clamp(y/height,0,1),size,zone});
 };
 // Three distinct low flames curl along the visible trunk rather than
 // emerging from its centre. The trunk itself has no translucent shell.
 const trunkRadius=dead?.24:name==='sequoia_giant'?.4:.28;
 for(let j=0;j<3;j++){
  const a=j*Math.PI*2/3+.4;
  add(Math.cos(a)*trunkRadius,height*(.10+j*.13),
   Math.sin(a)*trunkRadius,Math.cos(a),Math.sin(a),
   dead?.58:.62,'trunk');
 }
 // Skip the trunk (first mesh) and the final ground-shadow disc.
 for(let i=1;i<model.children.length-1;i++){
  const mesh=model.children[i];if(!mesh.isMesh)continue;
  const box=new THREE.Box3().setFromObject(mesh,true);
  if(box.isEmpty())continue;
  const center=box.getCenter(new THREE.Vector3());
  const dimensions=box.getSize(new THREE.Vector3());
  if(dead||name==='scots_pine'&&i>5){
   // Dead twigs or Scots-pine branch stubs: small tips, no phantom foliage.
   const radial=new THREE.Vector2(center.x,center.z);
   const angle=radial.lengthSq()>.0001?Math.atan2(radial.y,radial.x):i*2.39;
   const nx=Math.cos(angle),nz=Math.sin(angle);
   const radius=Math.max(dimensions.x,dimensions.z)*.38;
   add(center.x+nx*radius,center.y,center.z+nz*radius,
    nx,nz,dead?.42:.32,'branch');
   continue;
  }
  const rx=dimensions.x*.5,rz=dimensions.z*.5;
  if(Math.min(rx,rz)<.2)continue;
  // Cone needles are widest near the BOTTOM of the tier. A ring slightly
  // outside the lower shoulder is visible from all viewing directions.
  const y=clamp(center.y-dimensions.y*.21,.3,height-.12);
  const count=name==='sequoia_giant'?4:3;
  const size=clamp(Math.max(rx,rz)*.62,.55,1.75);
  const zone=y/height>.76?'crown':'branch';
  for(let j=0;j<count;j++){
   const a=i*.73+j*Math.PI*2/count;
   const nx=Math.cos(a),nz=Math.sin(a);
   add(center.x+nx*rx*.89,y,center.z+nz*rz*.89,
    nx,nz,size*(j===0?1.09:.9),zone);
  }
 }
 // Tip fires should be small, not a giant flame emerging from the tree centre.
 if(!dead)add(0,height*.91,0,0,0,.62,'crown');
 // Do not dispose these prototype meshes: other caches/registries may share
 // their geometry or materials. These temporary objects are never rendered.
 const profile=Object.freeze({species,height,dead,anchors:Object.freeze(anchors.map(a=>Object.freeze(a)))});
 cache.set(name,profile);return profile;
}

export function createForestFireStudio(scene,{quality='low',maxTrees=6,tonguesPerAnchor=2,sparksPerTree=6,burnSeconds=18,seed=1337}={}){
 if(!Number.isInteger(maxTrees)||maxTrees<1||maxTrees>12)throw new RangeError('maxTrees must be 1..12');
 const maxAnchors=Math.max(...NAMES.map(n=>getPineFireProfile('pine:'+n).anchors.length));
 const maxFlames=maxTrees*maxAnchors*tonguesPerAnchor;
 const geometry=createFireTongueGeometry(quality);
 const params=new THREE.InstancedBufferAttribute(new Float32Array(maxFlames*4),4);
 params.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('aInstanceParams',params);
 const material=createFireTongueMaterial();
 const flames=new THREE.InstancedMesh(geometry,material,maxFlames);
 flames.name='KnottyPineFireStudioPreview';flames.count=0;flames.frustumCulled=false;
 flames.castShadow=false;flames.receiveShadow=false;flames.renderOrder=9;scene.add(flames);
 const sparkGeo=new THREE.BufferGeometry(),maxSparks=maxTrees*sparksPerTree;
 const positions=new THREE.Float32BufferAttribute(new Float32Array(maxSparks*3),3);
 sparkGeo.setAttribute('position',positions);sparkGeo.setDrawRange(0,0);
 const sparkMaterial=new THREE.PointsMaterial({color:0xffa535,size:.09,
  transparent:true,opacity:.9,depthWrite:false,
  blending:THREE.AdditiveBlending,sizeAttenuation:true});
 const sparks=new THREE.Points(sparkGeo,sparkMaterial);
 sparks.name='KnottyPineFireStudioSparks';sparks.frustumCulled=false;scene.add(sparks);
 const random=seeded(seed),active=[];let time=0,disposed=false;
 function igniteTree(plant,owner=null){
  if(disposed||!plant?.isObject3D||!plant.parent||active.length>=maxTrees)return false;
  const species=plant.userData?.plantSpecies;
  if(!species?.startsWith('pine:')||active.some(item=>item.plant===plant))return false;
  active.push({plant,owner,profile:getPineFireProfile(species),age:0,
   lastZ:plant.position.z,phase:random()});
  return true;
 }
 function igniteNearRiver(plants,riverZ,{center=()=>0,halfWidth=()=>2.95,reach=.95,owner=null}={}){
  const matches=[];
  if(disposed)return 0;
  for(const plant of plants){
   if(!plant?.userData?.plantSpecies?.startsWith('pine:')||!plant.parent)continue;
   const x=plant.position.x;
   if(Math.abs(x)<4.45||Math.abs(x)>27)continue;
   const distance=Math.abs(plant.position.z-riverZ-center(x));
   if(distance<=halfWidth(x)+reach)matches.push({plant,distance});
  }
  matches.sort((a,b)=>a.distance-b.distance);
  let added=0;for(const match of matches)if(igniteTree(match.plant,owner))added++;
  return added;
 }
 function update(dt){
  if(disposed)return;
  const elapsed=Number.isFinite(dt)?clamp(dt,0,.1):0;time+=elapsed;
  material.uniforms.uTime.value=time;
  for(let i=active.length-1;i>=0;i--){
   const r=active[i];r.age+=elapsed;
   // A recycled pine jumps backwards by ~180 units: its old fire must vanish.
   if(r.age>=burnSeconds||!r.plant.parent||(r.owner&&!r.owner.parent)||r.plant.position.z<r.lastZ-25){
    active.splice(i,1);continue;
   }
   r.lastZ=r.plant.position.z;
  }
  let n=0,k=0;
  for(const r of active){
   r.plant.updateWorldMatrix(true,false);
   const progress=r.age/burnSeconds;
   // The average scale is only for particle size. The position itself
   // already includes all rotations and scales from the plant world matrix.
   const widthScale=(r.plant.scale.x+r.plant.scale.z)*.5;
   const heightScale=r.plant.scale.y;
   for(const anchor of r.profile.anchors){
    const delay=anchor.zone==='crown'?.16:anchor.zone==='branch'?.055:0;
    const growth=clamp(.90+progress*3.8-anchor.height*.95-delay,0,1);
    const fading=1-clamp((progress-.86)*6.3,0,1);
    const activity=growth*fading;if(activity<.025)continue;
    worldPoint.set(anchor.x,anchor.y,anchor.z).applyMatrix4(r.plant.matrixWorld);
    // Orient the fire UP but lean it away from the foliage. An outward
    // offset keeps the luminous body outside the opaque needles.
    outward.set(anchor.nx||0,0,anchor.nz||0);
    worldNormal.copy(outward).transformDirection(r.plant.matrixWorld);
    const out=anchor.zone==='trunk'?.14:.18;
    worldPoint.addScaledVector(worldNormal,out);
    direction.copy(up).addScaledVector(worldNormal,.26).normalize();
    for(let j=0;j<tonguesPerAnchor;j++){
     if(n>=maxFlames)break;
     const phase=(r.phase+anchor.height*.37+j*.314)%1;
     dummy.position.copy(worldPoint);
     dummy.position.addScaledVector(worldNormal,(j===0?-.025:.09)*widthScale);
     dummy.quaternion.setFromUnitVectors(up,direction);
     twist.setFromAxisAngle(up,phase*2.4+j*.36);
     dummy.quaternion.multiply(twist);
     dummy.scale.set(1,1,1);dummy.updateMatrix();
     flames.setMatrixAt(n,dummy.matrix);
     params.setXYZW(n,phase,
      anchor.size*(j===0?1.30:.94)*heightScale,
      anchor.size*(j===0?1.14:.86)*widthScale,
      activity);
     n++;
    }
   }
   for(let j=0;j<sparksPerTree;j++){
    const anchor=r.profile.anchors[j%r.profile.anchors.length];
    const phase=(r.phase+j*.618+time*.19)%1;
    worldPoint.set(anchor.x+Math.sin(phase*17+j)*.17,
     anchor.y+phase*1.3,anchor.z+Math.cos(phase*19+j)*.17)
     .applyMatrix4(r.plant.matrixWorld);
    positions.setXYZ(k++,worldPoint.x,worldPoint.y,worldPoint.z);
   }
  }
  flames.count=n;flames.instanceMatrix.needsUpdate=true;params.needsUpdate=true;
  sparkGeo.setDrawRange(0,k);positions.needsUpdate=true;
 }
 function reset(){active.length=0;flames.count=0;sparkGeo.setDrawRange(0,0);}
 function releaseOwner(owner){
  if(!owner)return;
  for(let i=active.length-1;i>=0;i--)if(active[i].owner===owner)active.splice(i,1);
 }
 function dispose(){
  if(disposed)return;disposed=true;reset();scene.remove(flames,sparks);
  geometry.dispose();material.dispose();sparkGeo.dispose();sparkMaterial.dispose();
 }
 return {igniteTree,igniteNearRiver,releaseOwner,update,reset,dispose,
  getStats:()=>({activeTrees:active.length,flames:flames.count,
   sparks:sparkGeo.drawRange.count,maxTrees,maxFlames,
   drawCalls:(flames.count?1:0)+(sparkGeo.drawRange.count?1:0)}),
  previewObjects:{flames,sparks}};
}
