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
function seeded(seed){let s=seed>>>0;return()=>{let t=s+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}}

export function getPineFireProfile(species){
 const name=species?.startsWith('pine:')?species.slice(5):null;
 if(!NAMES.includes(name))throw new RangeError('Unknown pine species: '+species);
 if(cache.has(name))return cache.get(name);
 const model=name==='scots_pine'?createScotsPine():createLowPolyPine(name);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),height=Math.max(1,bounds.max.y);
 const dead=name==='dead_snag';
 const anchors=[{x:0,y:height*.14,z:0,height:.14,size:.4,zone:'trunk'}];
 for(let i=1;i<model.children.length-1;i++){
  const mesh=model.children[i];if(!mesh.isMesh)continue;
  const box=new THREE.Box3().setFromObject(mesh);if(box.isEmpty())continue;
  const center=box.getCenter(new THREE.Vector3());
  const width=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);
  const h=clamp(center.y/height,.12,.98);
  if(dead){
   anchors.push({x:center.x,y:center.y,z:center.z,height:h,size:.32,zone:'branch'});
  }else if(width>.65){
   const angle=i*2.39996,r=Math.min(width*.22,1.2);
   anchors.push({x:Math.cos(angle)*r,y:center.y,z:Math.sin(angle)*r,
    height:h,size:clamp(width*.16,.26,1.05),zone:h>.75?'crown':'branch'});
   if(i%2===0)anchors.push({x:-Math.cos(angle)*r*.85,y:center.y,z:-Math.sin(angle)*r*.85,
    height:h,size:clamp(width*.13,.2,.85),zone:h>.75?'crown':'branch'});
  }
 }
 anchors.push({x:0,y:height*.86,z:0,height:.86,size:dead?.33:.46,zone:dead?'trunk':'crown'});
 // Only the temporary inspection model is destroyed; the real forest is untouched.
 const geometries=new Set(),materials=new Set();
 model.traverse(mesh=>{if(!mesh.isMesh)return;geometries.add(mesh.geometry);
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);
 });
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
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
 function igniteTree(plant){
  if(disposed||!plant?.isObject3D||!plant.parent||active.length>=maxTrees)return false;
  const species=plant.userData?.plantSpecies;
  if(!species?.startsWith('pine:')||active.some(item=>item.plant===plant))return false;
  active.push({plant,profile:getPineFireProfile(species),age:0,
   lastZ:plant.position.z,phase:random()});
  return true;
 }
 function igniteNearRiver(plants,riverZ,{center=()=>0,halfWidth=()=>2.95,reach=.95}={}){
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
  let added=0;for(const match of matches)if(igniteTree(match.plant))added++;
  return added;
 }
 function update(dt){
  if(disposed)return;
  const elapsed=Number.isFinite(dt)?clamp(dt,0,.1):0;time+=elapsed;
  material.uniforms.uTime.value=time;
  for(let i=active.length-1;i>=0;i--){
   const r=active[i];r.age+=elapsed;
   // A recycled pine jumps backwards by ~180 units: its old fire must vanish.
   if(r.age>=burnSeconds||!r.plant.parent||r.plant.position.z<r.lastZ-25){
    active.splice(i,1);continue;
   }
   r.lastZ=r.plant.position.z;
  }
  let n=0,k=0;
  for(const r of active){
   r.plant.updateWorldMatrix(true,false);
   const progress=r.age/burnSeconds,scale=(r.plant.scale.x+r.plant.scale.z)*.5;
   for(const anchor of r.profile.anchors){
    const growth=clamp((progress-anchor.height*.58)*5+.55,0,1);
    const fading=1-clamp((progress-.78)*4.5,0,1);
    const activity=growth*fading;if(activity<.015)continue;
    worldPoint.set(anchor.x,anchor.y,anchor.z).applyMatrix4(r.plant.matrixWorld);
    for(let j=0;j<tonguesPerAnchor;j++){
     if(n>=maxFlames)break;
     const phase=(r.phase+anchor.height*.37+j*.314)%1;
     dummy.position.copy(worldPoint);dummy.rotation.set(0,phase*Math.PI*2,0);
     dummy.scale.set(1,1,1);dummy.updateMatrix();flames.setMatrixAt(n,dummy.matrix);
     params.setXYZW(n,phase,anchor.size*(j?.8:1.25)*scale,
      anchor.size*(j?.65:1)*scale,activity);n++;
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
 function dispose(){
  if(disposed)return;disposed=true;reset();scene.remove(flames,sparks);
  geometry.dispose();material.dispose();sparkGeo.dispose();sparkMaterial.dispose();
 }
 return {igniteTree,igniteNearRiver,update,reset,dispose,
  getStats:()=>({activeTrees:active.length,flames:flames.count,
   sparks:sparkGeo.drawRange.count,maxTrees,maxFlames,
   drawCalls:(flames.count?1:0)+(sparkGeo.drawRange.count?1:0)}),
  previewObjects:{flames,sparks}};
}
