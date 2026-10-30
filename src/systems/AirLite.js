import * as THREE from 'three';

// Air V1 Lite. All sliders are percentages, 0..100, so changes are easy to request.
// This module only handles visual air: no collisions, no postprocessing, no heat distortion.
export const AIR_LITE_ENABLED=true;
export const AIR_LITE_PERCENT=Object.freeze({
 airDepth:35,
 airDensity:22,
 ashAmount:28,
 ashVisibility:18,
 localMist:24,
 airGlow:20,
 motionParallax:40
});

export function createAirLite(scene,{mobile=window.innerWidth<720}={}){
 if(!AIR_LITE_ENABLED)return {update(){},reset(){},dispose(){}};
 const p=AIR_LITE_PERCENT;
 const pct=n=>Math.min(100,Math.max(0,n))/100;
 const rand=(a,b)=>a+Math.random()*(b-a);
 const previousFog=scene.fog;
 // A little more depth between tree rows, without hiding nearby hazards.
 if(p.airDepth>0&&previousFog?.isFog){
  scene.fog=new THREE.Fog(previousFog.color.clone(),
   previousFog.near+2*pct(p.airDepth),
   previousFog.far-6*pct(p.airDepth));
 }

 // Small radial alpha texture, shared by all drifting ash particles.
 const canvas=document.createElement('canvas');
 canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext('2d');
 const grad=ctx.createRadialGradient(32,32,1,32,32,31);
 grad.addColorStop(0,'rgba(255,255,255,.83)');
 grad.addColorStop(.42,'rgba(255,255,255,.43)');
 grad.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const ashTexture=new THREE.CanvasTexture(canvas);
 ashTexture.colorSpace=THREE.SRGBColorSpace;

 // Near / middle / far particles really occupy different 3D positions.
 // Perspective automatically makes nearby particles appear to move faster.
 const bands=[
  {name:'near',mobileCount:9,desktopCount:17,
   zMin:-39,zMax:-7,xSpread:11,yMin:.7,yMax:5.5,size:.32,rate:1.0},
  {name:'middle',mobileCount:13,desktopCount:24,
   zMin:-78,zMax:-33,xSpread:19,yMin:1.5,yMax:8.2,size:.53,rate:.72},
  {name:'far',mobileCount:17,desktopCount:33,
   zMin:-125,zMax:-65,xSpread:32,yMin:2.2,yMax:12.5,size:.76,rate:.48}
 ];
 const particles=bands.map((band,j)=>{
  const count=Math.round((mobile?band.mobileCount:band.desktopCount)*pct(p.ashAmount)/.28);
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(count*3);
  const seeds=Array.from({length:count},()=>({
   x:rand(-band.xSpread,band.xSpread),
   y:rand(band.yMin,band.yMax),
   z:rand(band.zMin,band.zMax),
   phase:rand(0,Math.PI*2),
   rate:rand(.8,1.18)
  }));
  for(let i=0;i<count;i++){
   positions[i*3]=seeds[i].x;
   positions[i*3+1]=seeds[i].y;
   positions[i*3+2]=seeds[i].z;
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.PointsMaterial({
   map:ashTexture,color:j===0?0xffcba1:j===1?0xcfa79f:0xa47f85,
   size:band.size,sizeAttenuation:true,
   opacity:pct(p.ashVisibility)*1.1,
   transparent:true,depthTest:true,depthWrite:false,
   fog:false,alphaTest:.015
  });
  const mesh=new THREE.Points(geometry,material);
  mesh.frustumCulled=false;scene.add(mesh);
  return {band,seeds,positions,geometry,material,mesh};
 });

 // Small *raymarched 3D volumes*, not sprites facing the camera.
 // Each sphere contains a cheap 5-step approximation of suspended haze.
 // Limit counts on mobile so the extra blending remains affordable.
 const volumeData=(mobile?[
  [-9,2.4,-32,5.7,3.7,11],
  [10,3.2,-58,6.1,4.3,15],
  [-11,3.3,-87,7.3,5.1,17]
 ]:[
  [-9,2.3,-27,5.3,3.5,10],
  [10,2.7,-43,5.8,3.9,12],
  [-9,3.3,-62,6.6,4.6,15],
  [10,3.1,-78,7.1,4.9,17],
  [-11,4.2,-101,8.0,5.5,20]
 ]);
 const volumeGeometry=new THREE.SphereGeometry(1,mobile?10:14,mobile?7:10);
 const vertexShader=String.raw`
 varying vec3 vWorld;
 void main(){
  vec4 world=modelMatrix*vec4(position,1.0);
  vWorld=world.xyz;
  gl_Position=projectionMatrix*viewMatrix*world;
 }`;
 const fragmentShader=String.raw`
 uniform vec3 uCenter;
 uniform vec3 uRadius;
 uniform vec3 uTint;
 uniform float uDensity;
 uniform float uTime;
 varying vec3 vWorld;
 void main(){
  vec3 ray=normalize(vWorld-cameraPosition);
  vec3 origin=(cameraPosition-uCenter)/uRadius;
  vec3 direction=ray/uRadius;
  float a=dot(direction,direction);
  float b=dot(origin,direction);
  float c=dot(origin,origin)-1.0;
  float discriminant=b*b-a*c;
  if(discriminant<=0.0)discard;
  float root=sqrt(discriminant);
  float enter=max(0.0,(-b-root)/a);
  float leave=(-b+root)/a;
  if(leave<=enter)discard;
  float sum=0.0;
  for(int i=0;i<STEPS;i++){
   float travel=mix(enter,leave,(float(i)+.5)/float(STEPS));
   vec3 sample=origin+direction*travel;
   float core=max(0.0,1.0-dot(sample,sample));
   float whorl=sin(sample.x*8.1+sample.z*4.4+uTime*.17)
              *cos(sample.y*6.7-sample.z*5.2-uTime*.10);
   float pockets=clamp(.76+.24*whorl,0.15,1.0);
   sum+=core*core*pockets;
  }
  float thickness=(leave-enter)*.14;
  float alpha=clamp(1.0-exp(-sum/float(STEPS)*thickness*uDensity),0.0,.25);
  if(alpha<.003)discard;
  gl_FragColor=vec4(uTint,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 const volumes=volumeData.map(([x,y,z,rx,ry,rz],i)=>{
  const color=new THREE.Color(i%2?0x794a42:0x66505a);
  const warm=new THREE.Color(0xa65e37);
  color.lerp(warm,pct(p.airGlow)*.28);
  const uniforms={
   uCenter:{value:new THREE.Vector3(x,y,z)},
   uRadius:{value:new THREE.Vector3(rx,ry,rz)},
   uTint:{value:color},
   uDensity:{value:pct(p.localMist)*(.8+pct(p.airDensity)*1.2)},
   uTime:{value:0}
  };
  const material=new THREE.ShaderMaterial({
   uniforms,vertexShader,fragmentShader,
   defines:{STEPS:mobile?4:5},
   transparent:true,depthTest:true,depthWrite:false,
   side:THREE.BackSide,blending:THREE.NormalBlending
  });
  const mesh=new THREE.Mesh(volumeGeometry,material);
  mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);
  mesh.frustumCulled=false;mesh.castShadow=false;
  scene.add(mesh);
  return {mesh,uniforms,material,homeZ:z,x,phase:i*1.7};
 });
 let time=0;
 function reset(){
  time=0;
  for(const v of volumes){
   v.mesh.position.set(v.x,v.mesh.position.y,v.homeZ);
   v.uniforms.uCenter.value.copy(v.mesh.position);
   v.uniforms.uTime.value=0;
  }
  for(const item of particles){
   const {seeds,positions,geometry}=item;
   for(let i=0;i<seeds.length;i++){
    const s=seeds[i];s.z=rand(item.band.zMin,item.band.zMax);
    positions[i*3]=s.x;positions[i*3+1]=s.y;positions[i*3+2]=s.z;
   }
   geometry.attributes.position.needsUpdate=true;
  }
 }
 function update(dt,{playing=false,speed=0,wind=null}={}){
  if(!playing||dt<=0)return;
  dt=Math.min(dt,.04);time+=dt;
  for(const item of particles){
   const {band,seeds,positions,geometry}=item;
   for(let i=0;i<seeds.length;i++){
    const s=seeds[i];
    // Existing ash follows the same lateral breeze as the plants.
    s.x+=(wind?.x||0)*dt;
    if(s.x>band.xSpread)s.x-=2*band.xSpread;
    else if(s.x< -band.xSpread)s.x+=2*band.xSpread;
    s.z+=dt*(speed*(.76+.24*pct(p.motionParallax))*band.rate+s.rate*.3);
    if(s.z>9){
     s.z=rand(band.zMin,band.zMin+10);
     s.x=rand(-band.xSpread,band.xSpread);
     s.y=rand(band.yMin,band.yMax);
    }
    const j=i*3;
    positions[j]=s.x+Math.sin(time*.46+s.phase)*.32;
    positions[j+1]=s.y+.17*Math.sin(time*.31+s.phase);
    positions[j+2]=s.z;
   }
   geometry.attributes.position.needsUpdate=true;
  }
  for(const volume of volumes){
   const mesh=volume.mesh;
   mesh.position.z+=speed*dt*(.91+.09*pct(p.motionParallax));
   if(mesh.position.z>7)mesh.position.z-=125;
   mesh.position.x=volume.x+Math.sin(time*.17+volume.phase)*.48;
   volume.uniforms.uCenter.value.copy(mesh.position);
   volume.uniforms.uTime.value=time;
  }
 }
 function dispose(){
  for(const item of particles){
   item.mesh.parent?.remove(item.mesh);
   item.geometry.dispose();item.material.dispose();
  }
  for(const v of volumes){
   v.mesh.parent?.remove(v.mesh);
   v.material.dispose();
  }
  volumeGeometry.dispose();ashTexture.dispose();
  scene.fog=previousFog;
 }
 return {update,reset,dispose};
}
