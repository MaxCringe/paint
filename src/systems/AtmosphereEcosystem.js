import * as THREE from 'three';

// Independent, optional atmospheric depth. No collisions or full-screen post-processing.
export const ATMOSPHERE_ENABLED = true;

// Air is built from separate clouds at real 3D coordinates, not a screen overlay.
// Adjust density here; the foreground stays thin so hazards remain readable.
const SETTINGS={
 fogColor:0x39202a,
 fogNear:19,
 fogFar:104,
 nearOpacity:.31,
 middleOpacity:.43,
 farOpacity:.48,
 groundOpacity:.12,
 ashOpacity:.34
};

export function createAtmosphereEcosystem(scene,{
 enabled=ATMOSPHERE_ENABLED,
 camera,
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 if(!enabled)return {update(){},reset(){},dispose(){}};
 if(!camera)throw new Error('AtmosphereEcosystem requires the game camera');
 const random=(min,max)=>min+Math.random()*(max-min);
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const previousFog=scene.fog;
 // A broader fog range preserves the contours of the near/middle forest.
 scene.fog=new THREE.Fog(SETTINGS.fogColor,SETTINGS.fogNear,SETTINGS.fogFar);

 // Soft irregular smoke, generated only once. It has lobes and subtle wisps,
 // so overlapping billboards resemble drifting air instead of flat circles.
 const canvas=document.createElement('canvas');
 canvas.width=128;canvas.height=128;
 const context=canvas.getContext('2d');
 const pixels=context.createImageData(128,128);
 function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const u=(x-63.5)/63.5,v=(y-63.5)/63.5;
  const theta=Math.atan2(v,u);
  const warped=Math.hypot(u*.98,v*1.06)*
   (1+.065*Math.sin(theta*5+1.2)+.075*Math.cos(theta*7-.7));
  const edge=1-smooth(.53,1.0,warped);
  const lobe=
   .40*Math.exp(-((u+.25)**2+(v+.09)**2)*5.0)+
   .34*Math.exp(-((u-.25)**2+(v-.09)**2)*6.1)+
   .28*Math.exp(-((u-.01)**2+(v+.28)**2)*5.2);
  const wisps=.81+.10*Math.sin(u*11+v*7)+.065*Math.sin(u*23-v*15+.8)
   +.04*Math.cos(v*31+u*17);
  const alpha=clamp((.36+lobe)*edge*wisps,0,.85);
  const i=(y*128+x)*4;
  pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255;
  pixels.data[i+3]=Math.round(alpha*255);
 }
 context.putImageData(pixels,0,0);
 const cloudTexture=new THREE.CanvasTexture(canvas);
 cloudTexture.colorSpace=THREE.SRGBColorSpace;
 cloudTexture.minFilter=THREE.LinearFilter;
 cloudTexture.magFilter=THREE.LinearFilter;

 const plane=new THREE.PlaneGeometry(1,1);
 const matrix=new THREE.Matrix4();
 const pos=new THREE.Vector3(),size=new THREE.Vector3();
 let time=0;

 // Three independent depth bands: near/mid/far smoke actually occupies volume,
 // moves through the forest and is occluded by nearer solid trees.
 const bands=[
  {name:'near',count:mobile?9:14,z:[-39,-9],x:[5.1,10.5],
   y:[.75,2.9],w:[5.8,9.5],h:[2.7,4.8],opacity:SETTINGS.nearOpacity,
   color:0xd0a9a0,drift:.47},
  {name:'middle',count:mobile?11:18,z:[-77,-27],x:[4.8,13.5],
   y:[1.05,4.0],w:[8.2,15],h:[3.9,7],opacity:SETTINGS.middleOpacity,
   color:0xb98d88,drift:.33},
  {name:'far',count:mobile?12:21,z:[-125,-62],x:[2.8,17],
   y:[1.9,5.7],w:[11,22],h:[5.0,10],opacity:SETTINGS.farOpacity,
   color:0x9a7276,drift:.25}
 ].map((config,k)=>{
  const material=new THREE.MeshBasicMaterial({
   map:cloudTexture,color:config.color,opacity:config.opacity,
   transparent:true,depthTest:true,depthWrite:false,fog:false,
   side:THREE.DoubleSide
  });
  const mesh=new THREE.InstancedMesh(plane,material,config.count);
  mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const puffs=[];
  for(let i=0;i<config.count;i++){
   const side=(i%2===0?-1:1);
   const z=random(config.z[0],config.z[1]);
   const x=side*random(config.x[0],config.x[1]);
   puffs.push({
    x,y:random(config.y[0],config.y[1]),z,homeZ:z,
    width:random(config.w[0],config.w[1]),
    height:random(config.h[0],config.h[1]),
    phase:random(0,Math.PI*2),scroll:random(.82,1.02),
    wave:random(.18,.46),side
   });
  }
  return {config,material,mesh,puffs,k};
 });
 function layoutClouds(){
  // Quads rotate toward the actual camera while their coordinates remain 3D.
  const facing=camera.quaternion;
  for(const band of bands){
   for(let i=0;i<band.puffs.length;i++){
    const c=band.puffs[i];
    pos.set(c.x+Math.sin(time*.27+c.phase)*c.wave,
     c.y+Math.sin(time*.20+c.phase*1.4)*.18,
     c.z);
    const breathe=1+.045*Math.sin(time*.35+c.phase);
    size.set(c.width*breathe,c.height*breathe,1);
    matrix.compose(pos,facing,size);
    band.mesh.setMatrixAt(i,matrix);
   }
   band.mesh.instanceMatrix.needsUpdate=true;
  }
 }

 // Very low diffuse haze just above the forest floor; NOT a road-wide overlay.
 const groundMaterial=new THREE.MeshBasicMaterial({
  map:cloudTexture,color:0x886c67,opacity:SETTINGS.groundOpacity,
  transparent:true,depthTest:true,depthWrite:false,
  side:THREE.DoubleSide,fog:false
 });
 const groundPuffs=[
  {x:-7,z:-24,w:11,h:10},{x:8,z:-47,w:12,h:13},
  {x:-9,z:-76,w:17,h:18},{x:9,z:-103,w:17,h:16}
 ].slice(0,mobile?3:4).map((c,i)=>({...c,homeZ:c.z,phase:i*1.67}));
 const ground=new THREE.InstancedMesh(plane,groundMaterial,groundPuffs.length);
 ground.frustumCulled=false;ground.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 scene.add(ground);
 const groundRotation=new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1,0,0),-Math.PI/2
 );
 function layoutGround(){
  for(let i=0;i<groundPuffs.length;i++){
   const c=groundPuffs[i];
   pos.set(c.x+Math.sin(time*.22+c.phase)*.6,.09,c.z);
   size.set(c.w,c.h,1);
   matrix.compose(pos,groundRotation,size);
   ground.setMatrixAt(i,matrix);
  }
  ground.instanceMatrix.needsUpdate=true;
 }

 // Weak warm shafts between trees make the suspended smoke catch hellfire.
 // They are decorative, shadow-free, and share a single draw call.
 const shafts=mobile?[
  {x:-9,z:-49,phase:1.3,w:4.2,h:10}
 ]:[
  {x:-9,z:-38,phase:.7,w:4.4,h:10},
  {x:10,z:-60,phase:1.9,w:5.1,h:11},
  {x:-10,z:-88,phase:3.4,w:5.7,h:13}
 ];
 for(const s of shafts)s.homeZ=s.z;
 const shaftMaterial=new THREE.MeshBasicMaterial({
  map:cloudTexture,color:0xff8b5a,opacity:.11,
  transparent:true,depthTest:true,depthWrite:false,
  blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false
 });
 const shaftMesh=new THREE.InstancedMesh(plane,shaftMaterial,shafts.length);
 shaftMesh.frustumCulled=false;shaftMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 scene.add(shaftMesh);
 function layoutShafts(){
  for(let i=0;i<shafts.length;i++){
   const s=shafts[i];
   pos.set(s.x+Math.sin(time*.13+s.phase)*.7,s.h*.47,s.z);
   size.set(s.w,s.h,1);
   matrix.compose(pos,camera.quaternion,size);
   shaftMesh.setMatrixAt(i,matrix);
  }
  shaftMesh.instanceMatrix.needsUpdate=true;
 }

 // Warm dust particles in 3D. One Points call, with subtle lateral turbulence.
 const count=mobile?34:72;
 const ashPositions=new Float32Array(count*3),ash=[];
 for(let i=0;i<count;i++){
  const a={
   x:random(-13,13),y:random(.5,6.3),z:random(-82,-5),
   phase:random(0,Math.PI*2),floatSpeed:random(.06,.18)
  };
  ash.push(a);
 }
 const ashGeometry=new THREE.BufferGeometry();
 ashGeometry.setAttribute('position',new THREE.BufferAttribute(ashPositions,3));
 const ashMaterial=new THREE.PointsMaterial({
  color:0xffc69b,map:cloudTexture,
  size:mobile?.36:.30,sizeAttenuation:true,
  transparent:true,opacity:SETTINGS.ashOpacity,
  depthTest:true,depthWrite:false,fog:false
 });
 const ashMesh=new THREE.Points(ashGeometry,ashMaterial);
 ashMesh.frustumCulled=false;scene.add(ashMesh);
 function layoutAsh(){
  for(let i=0;i<count;i++){
   const a=ash[i],k=i*3;
   ashPositions[k]=a.x+Math.sin(time*.54+a.phase)*.33;
   ashPositions[k+1]=a.y;
   ashPositions[k+2]=a.z;
  }
  ashGeometry.attributes.position.needsUpdate=true;
 }
 function update(dt,{playing=false,speed=0}={}){
  if(!playing||dt<=0)return;
  dt=Math.min(.04,dt);time+=dt;
  for(const band of bands)for(const puff of band.puffs){
   puff.z+=speed*dt*puff.scroll;
   if(puff.z>9)puff.z-=133;
  }
  for(const puff of groundPuffs){
   puff.z+=speed*dt;
   if(puff.z>12)puff.z-=123;
  }
  for(const shaft of shafts){
   shaft.z+=speed*dt*.94;
   if(shaft.z>13)shaft.z-=129;
  }
  for(const a of ash){
   a.z+=(speed*.53+a.floatSpeed)*dt;
   a.y+=dt*.095;
   if(a.z>9){a.z=random(-87,-57);a.x=random(-13,13);a.y=random(.5,5.7)}
   if(a.y>6.5)a.y=.5;
  }
  layoutClouds();layoutGround();layoutShafts();layoutAsh();
 }
 function reset(){
  time=0;
  for(const band of bands)for(const puff of band.puffs)puff.z=puff.homeZ;
  for(const p of groundPuffs)p.z=p.homeZ;
  for(const shaft of shafts)shaft.z=shaft.homeZ;
  layoutClouds();layoutGround();layoutShafts();layoutAsh();
 }
 reset();
 function dispose(){
  for(const band of bands){band.mesh.parent?.remove(band.mesh);band.material.dispose();}
  ground.parent?.remove(ground);
  shaftMesh.parent?.remove(shaftMesh);
  ashMesh.parent?.remove(ashMesh);
  plane.dispose();groundMaterial.dispose();shaftMaterial.dispose();
  ashGeometry.dispose();ashMaterial.dispose();cloudTexture.dispose();
  scene.fog=previousFog;
 }
 return {update,reset,dispose};
}
