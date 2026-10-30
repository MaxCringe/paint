import * as THREE from 'three';

// Independent, lightweight distant meteor shower. Set to false to switch it off.
// No impacts in the forest, no burning trees, and no gameplay collisions.
export const METEOR_ECOSYSTEM_ENABLED = true;

export function createMeteorEcosystem(scene, _roadsideVegetation, {
 enabled=METEOR_ECOSYSTEM_ENABLED,
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 if(!enabled)return {update(){},reset(){},dispose(){},active:[]};
 const rand=(a,b)=>a+Math.random()*(b-a);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const meteors=[],flashes=[],UP=new THREE.Vector3(0,1,0);
 const rockGeo=new THREE.IcosahedronGeometry(.68,1);
 const plasmaGeo=new THREE.IcosahedronGeometry(.85,1);
 const hotGeo=new THREE.SphereGeometry(.35,8,6);
 const coneGeo=new THREE.CylinderGeometry(.01,.40,1,9,1);
 const sparkGeo=new THREE.IcosahedronGeometry(.09,0);
 const ringGeo=new THREE.TorusGeometry(1,.095,5,24);
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
 const flashMat=new THREE.MeshBasicMaterial({
  color:0xff9f2c,transparent:true,opacity:.72,depthWrite:false,
  fog:false,toneMapped:false,depthTest:false
 });
 const ringMat=new THREE.MeshBasicMaterial({
  color:0xff5d1c,transparent:true,opacity:.8,depthWrite:false,
  fog:false,toneMapped:false,depthTest:false
 });
 const ringAxis=new THREE.Vector3(0,1,0);
 const tailVector=new THREE.Vector3();
 const p=new THREE.Vector3();
 let nextMeteor=rand(2.4,3.7),elapsed=0;
 function spawn(){
  // Every meteor starts in the visible sky and continues all the way
  // down to the remote horizon. There are no close-range forest strikes.
  const side=Math.random()<.5?-1:1;
  const group=new THREE.Group();scene.add(group);
  const from=new THREE.Vector3(side*rand(mobile?9:12,mobile?14:20),rand(18,22),-67);
  const to=new THREE.Vector3(side*rand(mobile?3.8:5,mobile?8:12),.65,-67);
  const trajectory=to.clone().sub(from).normalize();
  const backwards=trajectory.clone().negate();
  const rock=new THREE.Mesh(rockGeo,rockMat);
  rock.scale.set(1.06,.92,.95);
  const plasma=new THREE.Mesh(plasmaGeo,plasmaMat);
  plasma.scale.set(1.27,1.17,1.18);
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
   outer,inner,particles,smoke,age:0,duration:rand(2.65,3.4),
   phase:rand(0,Math.PI*2)};
  meteors.push(e);
  animateMeteor(e,0);
 }
 function animateMeteor(e,dt){
  const t=clamp(e.age/e.duration,0,1);
  // Quadratic fall: an accelerating trajectory rather than a straight,
  // constant-speed streak that abruptly stops in mid-air.
  const fall=t*t*(1.3-.3*t);
  p.lerpVectors(e.from,e.to,fall);
  p.x+=Math.sin(t*Math.PI)*.32*Math.sin(e.phase);
  e.rock.position.copy(p);
  e.rock.rotation.x+=dt*2.3;
  e.rock.rotation.z+=dt*1.4;
  e.plasma.position.copy(p);
  e.plasma.scale.setScalar(1.06+.16*Math.sin(elapsed*17+e.phase));
  e.bright.position.copy(p).addScaledVector(e.trajectory,.53);
  e.bright.scale.setScalar(.94+.11*Math.sin(elapsed*23+e.phase));
  for(const [idx,trail] of [e.outer,e.inner].entries()){
   const length=idx===0?7.4:4.4;
   trail.position.copy(p).addScaledVector(e.backwards,length*.50);
   trail.quaternion.setFromUnitVectors(UP,e.backwards);
   const width=(idx===0?1.34:.60)*(1+.11*Math.sin(elapsed*15+e.phase));
   trail.scale.set(width,length,width);
  }
  e.particles.forEach((item,i)=>{
   const drift=Math.sin(elapsed*11+item.phase)*(.14+i*.04);
   item.mesh.position.copy(p).addScaledVector(e.backwards,item.offset+drift);
   item.mesh.position.x+=Math.sin(elapsed*9+item.phase)*.23;
   item.mesh.scale.setScalar(.8+.35*Math.sin(elapsed*12+item.phase)**2);
  });
  e.smoke.forEach((item,i)=>{
   const distance=2.3+i*1.76;
   item.sprite.position.copy(p).addScaledVector(e.backwards,distance);
   item.sprite.position.x+=Math.sin(elapsed*3.5+item.phase)*.30;
   const scale=item.width*(1+i*.21);
   item.sprite.scale.set(scale,scale,1);
   item.mat.opacity=.19*(1-i*.11)*(.87+.13*Math.sin(elapsed*5+item.phase));
  });
 }
 function release(e){
  e.group.parent?.remove(e.group);
  e.smoke.forEach(x=>x.mat.dispose());
 }
 function land(e){
  // Short distant glow marks the actual arrival at ground/horizon.
  // No forest fire, scorched pines, or near-road meteor objects.
  const group=new THREE.Group();
  group.position.copy(e.to);
  scene.add(group);
  const light=new THREE.Mesh(hotGeo,flashMat);
  light.position.y=.65;
  light.scale.setScalar(3.0);
  group.add(light);
  const ring=new THREE.Mesh(ringGeo,ringMat);
  ring.rotation.x=Math.PI/2;
  ring.position.y=.12;
  group.add(ring);
  flashes.push({group,light,ring,age:0,duration:.85});
 }
 function update(dt,{playing=false}={}){
  if(!playing||dt<=0)return;
  dt=clamp(dt,0,.04);
  elapsed+=dt;nextMeteor-=dt;
  if(nextMeteor<=0){
   if(meteors.length===0)spawn();
   nextMeteor=rand(14,23);
  }
  for(let i=meteors.length-1;i>=0;i--){
   const e=meteors[i];e.age+=dt;
   animateMeteor(e,dt);
   if(e.age>=e.duration){
    // Impact only after the fireball reaches its final ground point.
    animateMeteor(e,0);
    land(e);
    release(e);
    meteors.splice(i,1);
   }
  }
  for(let i=flashes.length-1;i>=0;i--){
   const f=flashes[i];f.age+=dt;
   const progress=clamp(f.age/f.duration,0,1);
   f.light.scale.setScalar((2.7+progress*1.9)*(1-progress*.86));
   f.ring.scale.setScalar(.4+progress*2.7);
   if(progress>=1){f.group.parent?.remove(f.group);flashes.splice(i,1);}
  }
 }
 function reset(){
  meteors.forEach(release);
  flashes.forEach(f=>f.group.parent?.remove(f.group));
  meteors.length=0;flashes.length=0;
  nextMeteor=rand(2.4,3.7);elapsed=0;
 }
 function dispose(){
  reset();
  for(const geo of [rockGeo,plasmaGeo,hotGeo,coneGeo,sparkGeo,ringGeo])geo.dispose();
  smokeTexture.dispose();
  for(const mat of [rockMat,plasmaMat,whiteHotMat,fireMat,fireCoreMat,sparkMat,flashMat,ringMat])mat.dispose();
 }
 return {update,reset,dispose,active:meteors};
}
