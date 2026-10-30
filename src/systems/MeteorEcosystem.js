import * as THREE from 'three';

// Independent, lightweight distant meteor shower. Set to false to switch it off.
// No impacts in the forest, no burning trees, and no gameplay collisions.
export const METEOR_ECOSYSTEM_ENABLED = true;

export function createMeteorEcosystem(scene, _roadsideVegetation, {
 enabled=METEOR_ECOSYSTEM_ENABLED,
 camera,
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 // Camera is injected so off-screen entries and flight angles work at any aspect ratio.
 if(enabled&&!camera)throw new Error('MeteorEcosystem requires the game camera');
 if(!enabled)return {update(){},reset(){},dispose(){},active:[]};
 const rand=(a,b)=>a+Math.random()*(b-a);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const meteors=[],glows=[],UP=new THREE.Vector3(0,1,0);
 const rockGeo=new THREE.IcosahedronGeometry(.68,1);
 const plasmaGeo=new THREE.IcosahedronGeometry(.85,1);
 const hotGeo=new THREE.SphereGeometry(.35,8,6);
 const coneGeo=new THREE.CylinderGeometry(.01,.40,1,9,1);
 const sparkGeo=new THREE.IcosahedronGeometry(.09,0);
  const smokeCanvas=document.createElement('canvas');
 smokeCanvas.width=64;smokeCanvas.height=64;
 const ctx=smokeCanvas.getContext('2d');
 const grad=ctx.createRadialGradient(32,32,2,32,32,31);
 grad.addColorStop(0,'rgba(255,255,255,.76)');
 grad.addColorStop(.38,'rgba(255,255,255,.48)');
 grad.addColorStop(.78,'rgba(255,255,255,.15)');
 grad.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
 smokeTexture.colorSpace=THREE.SRGBColorSpace;
 // A single radial texture, reused for the brief fire-lit sky behind the ridge.
 // Depth testing allows the opaque mountain geometry to mask the lower glow.
 const glowCanvas=document.createElement('canvas');
 glowCanvas.width=128;glowCanvas.height=128;
 const glowCtx=glowCanvas.getContext('2d');
 const radiance=glowCtx.createRadialGradient(64,64,2,64,64,63);
 radiance.addColorStop(0,'rgba(255,234,160,.90)');
 radiance.addColorStop(.13,'rgba(255,160,50,.82)');
 radiance.addColorStop(.32,'rgba(255,82,19,.55)');
 radiance.addColorStop(.60,'rgba(210,43,15,.22)');
 radiance.addColorStop(.86,'rgba(110,21,19,.06)');
 radiance.addColorStop(1,'rgba(70,12,16,0)');
 glowCtx.fillStyle=radiance;
 glowCtx.fillRect(0,0,128,128);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);
 glowTexture.colorSpace=THREE.SRGBColorSpace;
 const rockMat=new THREE.MeshStandardMaterial({
  color:0x302322,emissive:0x8e2a08,emissiveIntensity:.67,
  flatShading:true,roughness:1,fog:false
 });
 const plasmaMat=new THREE.MeshBasicMaterial({
  color:0xff5410,transparent:true,opacity:.37,
  depthWrite:false,fog:false,toneMapped:false
 });
 const whiteHotMat=new THREE.MeshBasicMaterial({color:0xfff1b2,fog:false,toneMapped:false});
 const fireMat=new THREE.MeshBasicMaterial({
  color:0xff5812,transparent:true,opacity:.76,depthWrite:false,
  side:THREE.DoubleSide,fog:false,toneMapped:false
 });
 const fireCoreMat=new THREE.MeshBasicMaterial({
  color:0xffcb53,transparent:true,opacity:.94,depthWrite:false,
  side:THREE.DoubleSide,fog:false,toneMapped:false
 });
 const sparkMat=new THREE.MeshBasicMaterial({color:0xffd77a,fog:false,toneMapped:false});
 const p=new THREE.Vector3();
 const SKY_Z=-98;
 // Three apparent depth groups; even the closest is behind the distant mountains.
 const DEPTHS=[
  {z:-125,scale:[.56,.76],weight:.40},
  {z:-110,scale:[.86,1.05],weight:.40},
  {z:-98,scale:[1.22,1.52],weight:.20}
 ];
 function depthChoice(){
  const n=Math.random();
  return n<DEPTHS[0].weight?DEPTHS[0]:n<DEPTHS[0].weight+DEPTHS[1].weight?DEPTHS[1]:DEPTHS[2];
 }
 // Convert normalized screen points to a world plane behind every mountain.
 // This maintains the intended diagonal on phones and widescreen monitors.
 function skyPoint(nx,ny,depth=SKY_Z){
  const projected=new THREE.Vector3(nx,ny,.5).unproject(camera);
  const ray=projected.sub(camera.position);
  return camera.position.clone().addScaledVector(ray,(depth-camera.position.z)/ray.z);
 }
 function createGlow(e){
  // The meteor is disappearing behind the peaks, not hitting the road/forest.
  const g=new THREE.Group();
  g.position.copy(e.impactPoint);
  scene.add(g);
  const mats=[],sprites=[];
  for(const [width,height,strength] of [
   [mobile?35:53,mobile?29:36,.70],
   [mobile?18:28,mobile?16:23,.60]
  ]){
   const material=new THREE.SpriteMaterial({
    map:glowTexture,transparent:true,opacity:0,
    depthTest:true,depthWrite:false,fog:false,toneMapped:false,
    blending:THREE.AdditiveBlending
   });
   const sprite=new THREE.Sprite(material);
   sprite.scale.set(width*e.glowScale,height*e.glowScale,1);
   g.add(sprite);mats.push(material);sprites.push({sprite,strength});
  }
  glows.push({group:g,mats,sprites,age:0,duration:rand(3.5,4.5),phase:e.phase});
 }
 function removeGlow(g){
  g.group.parent?.remove(g.group);
  for(const material of g.mats)material.dispose();
 }
 let nextMeteor=rand(3.5,5.5),elapsed=0;
 function spawn(){
  // Enter from beyond the LEFT or RIGHT edge, streak across the sky at
  // a shallow randomized angle (like a diagonal meteor in the reference),
  // then let the existing mountain geometry obscure the descent.
  const side=Math.random()<.65?1:-1;
  const group=new THREE.Group();scene.add(group);
  const tier=depthChoice();
  const size=rand(tier.scale[0],tier.scale[1]);
  const depth=tier.z+rand(-4,4);
  const startX=-side*rand(1.23,1.42); // guaranteed off-screen, including the head
  const endX=side*rand(-.16,.33);
  const endY=rand(.08,.18); // below the visible mountain ridge
  const slope=mobile?rand(.45,.58):rand(.26,.35);
  const startY=endY+slope*camera.aspect*Math.abs(endX-startX);
  camera.updateMatrixWorld();
  const from=skyPoint(startX,startY,depth);
  const to=skyPoint(endX,endY,depth);
  // Approximate when it sinks behind the mountain skyline (screen y~.48).
  const hitFraction=clamp((startY-.47)/(startY-endY),.40,.90);
  const impactPoint=from.clone().lerp(to,hitFraction);
  impactPoint.y-=2.0;
  const trajectory=to.clone().sub(from).normalize();
  const backwards=trajectory.clone().negate();
  const rock=new THREE.Mesh(rockGeo,rockMat);
  rock.scale.set(1.06*size,.92*size,.95*size);
  const plasma=new THREE.Mesh(plasmaGeo,plasmaMat);
  plasma.scale.set(1.27*size,1.17*size,1.18*size);
  const bright=new THREE.Mesh(hotGeo,whiteHotMat);
  const outer=new THREE.Mesh(coneGeo,fireMat),inner=new THREE.Mesh(coneGeo,fireCoreMat);
  group.add(outer,inner,plasma,rock,bright);
  const particles=[];
  for(let i=0;i<4;i++){
   const m=new THREE.Mesh(sparkGeo,sparkMat);
   group.add(m);
   particles.push({mesh:m,offset:rand(.5,3.5),phase:rand(0,Math.PI*2)});
  }
  const smoke=[];
  for(let i=0;i<5;i++){
   const mat=new THREE.SpriteMaterial({
    map:smokeTexture,color:i%2?0x4c3130:0x382e32,
    transparent:true,opacity:.19,depthWrite:false,fog:false
   });
   const sprite=new THREE.Sprite(mat);
   group.add(sprite);
   smoke.push({sprite,mat,phase:rand(0,Math.PI*2),width:rand(1.45,2.3)});
  }
  const e={group,from,to,trajectory,backwards,rock,plasma,bright,
   outer,inner,particles,smoke,age:0,duration:rand(8.0,9.5),
   size,glowScale:rand(.88,1.12)*(tier===DEPTHS[0]?.76:tier===DEPTHS[1]?1:1.17),
   hitFraction,impactPoint,glowed:false,
   phase:rand(0,Math.PI*2)};
  meteors.push(e);
  animateMeteor(e,0);
 }
 function animateMeteor(e,dt){
  const t=clamp(e.age/e.duration,0,1);
  // Gentle acceleration, keeping the fireball on screen for several seconds
  // rather than barely moving above the frame before suddenly dropping.
  const fall=t*(.72+.28*t);
  p.lerpVectors(e.from,e.to,fall);
  p.x+=Math.sin(t*Math.PI)*.32*Math.sin(e.phase);
  e.rock.position.copy(p);
  e.rock.rotation.x+=dt*2.3;
  e.rock.rotation.z+=dt*1.4;
  e.plasma.position.copy(p);
  e.plasma.scale.setScalar(e.size*(1.06+.16*Math.sin(elapsed*17+e.phase)));
  e.bright.position.copy(p).addScaledVector(e.trajectory,.53*e.size);
  e.bright.scale.setScalar(e.size*(.94+.11*Math.sin(elapsed*23+e.phase)));
  for(const [idx,trail] of [e.outer,e.inner].entries()){
   const length=(idx===0?7.4:4.4)*(.65+.35*e.size);
   trail.position.copy(p).addScaledVector(e.backwards,length*.50);
   trail.quaternion.setFromUnitVectors(UP,e.backwards);
   const width=(idx===0?1.34:.60)*e.size*(1+.11*Math.sin(elapsed*15+e.phase));
   trail.scale.set(width,length,width);
  }
  e.particles.forEach((item,i)=>{
   const drift=Math.sin(elapsed*11+item.phase)*(.14+i*.04);
   item.mesh.position.copy(p).addScaledVector(e.backwards,(item.offset+drift)*e.size);
   item.mesh.position.x+=Math.sin(elapsed*9+item.phase)*.23*e.size;
   item.mesh.scale.setScalar(e.size*(.8+.35*Math.sin(elapsed*12+item.phase)**2));
  });
  e.smoke.forEach((item,i)=>{
   const distance=(2.3+i*1.76)*e.size;
   item.sprite.position.copy(p).addScaledVector(e.backwards,distance);
   item.sprite.position.x+=Math.sin(elapsed*3.5+item.phase)*.30*e.size;
   const scale=item.width*(1+i*.21)*e.size;
   item.sprite.scale.set(scale,scale,1);
   item.mat.opacity=.19*(1-i*.11)*(.87+.13*Math.sin(elapsed*5+item.phase));
  });
 }
 function release(e){
  e.group.parent?.remove(e.group);
  e.smoke.forEach(x=>x.mat.dispose());
 }
 function update(dt,{playing=false}={}){
  if(!playing||dt<=0)return;
  dt=clamp(dt,0,.04);
  elapsed+=dt;nextMeteor-=dt;
  if(nextMeteor<=0){
   if(meteors.length===0)spawn();
   nextMeteor=rand(20,33);
  }
  for(let i=meteors.length-1;i>=0;i--){
   const e=meteors[i];e.age+=dt;
   animateMeteor(e,dt);
   const travel=clamp(e.age/e.duration,0,1);
   const fall=travel*(.72+.28*travel);
   if(!e.glowed&&fall>=e.hitFraction){
    e.glowed=true;
    createGlow(e);
   }
   if(e.age>=e.duration){
    // Its last stretch has already passed behind the mountain ridge.
    // Remove only after the whole meteor is fully obscured.
    release(e);
    meteors.splice(i,1);
   }
  }
  for(let i=glows.length-1;i>=0;i--){
   const g=glows[i];g.age+=dt;
   const progress=clamp(g.age/g.duration,0,1);
   // A quick flash that grows to a lingering warm glow over the horizon.
   const strength=Math.sin(Math.PI*Math.pow(progress,.63));
   for(const {sprite,strength:gain} of g.sprites){
    sprite.material.opacity=gain*strength*(.96+.04*Math.sin(elapsed*9+g.phase));
    sprite.scale.multiplyScalar(1+dt*.07);
   }
   if(progress>=1){removeGlow(g);glows.splice(i,1);}
  }
 }
 function reset(){
  meteors.forEach(release);
  glows.forEach(removeGlow);
  meteors.length=0;glows.length=0;
  nextMeteor=rand(3.5,5.5);elapsed=0;
 }
 function dispose(){
  reset();
  for(const geo of [rockGeo,plasmaGeo,hotGeo,coneGeo,sparkGeo])geo.dispose();
  smokeTexture.dispose();
  glowTexture.dispose();
  for(const mat of [rockMat,plasmaMat,whiteHotMat,fireMat,fireCoreMat,sparkMat])mat.dispose();
 }
 return {update,reset,dispose,active:meteors};
}
