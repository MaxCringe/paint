import * as THREE from 'three';

// Independent atmospheric wildlife. Nothing here is a collision or collectible.
// All bats share three GPU batches: bodies, wings and tiny eyes.
export function createBatEcosystem(scene, options={}) {
 const mobile=options.mobile ?? (typeof window!=='undefined'&&window.innerWidth<720);
 const habitats=[
  {kind:'forest',x:-12,y:9.2,z:-32,radius:7.5,count:mobile?3:5},
  {kind:'forest',x:13.5,y:10.8,z:-46,radius:8.5,count:mobile?3:6},
  {kind:'volcano',x:27,y:19.2,z:-72,radius:6.8,count:mobile?3:5},
  {kind:'sky',x:-3,y:13.0,z:-56,radius:12,count:mobile?3:6}
 ];
 const groups=[],bats=[];
 const pick=a=>a[(Math.random()*a.length)|0];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const rand=(a,b)=>a+(b-a)*Math.random();
 const bodyGeo=new THREE.BufferGeometry();
 const bodyVertices=[];
 function bodyTriangle(a,b,c){bodyVertices.push(...a,...b,...c);}
 // Small faceted body, pointed ears and a tail, all in one geometry.
 const tip=[0,.21,.09],belly=[0,-.34,.08],left=[-.16,0,.10],right=[.16,0,.10];
 bodyTriangle(tip,left,belly);bodyTriangle(tip,belly,right);
 bodyTriangle(tip,[0,0,-.15],left);bodyTriangle(tip,right,[0,0,-.15]);
 bodyTriangle(left,[0,0,-.15],belly);bodyTriangle(right,belly,[0,0,-.15]);
 bodyTriangle([-.14,.12,.10],[-.16,.41,.04],[-.015,.18,.10]);
 bodyTriangle([.14,.12,.10],[.16,.41,.04],[.015,.18,.10]);
 bodyTriangle([-.08,-.28,.04],[0,-.52,.01],[.08,-.28,.04]);
 bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(bodyVertices,3));
 bodyGeo.computeVertexNormals();
 const wingGeo=new THREE.BufferGeometry();
 const wingOutline=[
  [0,.07,0],[.24,.21,.01],[.65,.34,-.02],[1.25,.18,0],
  [.94,-.16,.015],[.71,-.07,.025],[.47,-.28,0],[.27,-.09,.02]
 ];
 const wingVertices=[];
 for(let i=1;i<wingOutline.length-1;i++)
  wingVertices.push(...wingOutline[0],...wingOutline[i],...wingOutline[i+1]);
 wingGeo.setAttribute('position',new THREE.Float32BufferAttribute(wingVertices,3));
 wingGeo.computeVertexNormals();
 const eyeGeo=new THREE.BufferGeometry();
 eyeGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.095,.09,.18,-.052,.09,.18,-.073,.048,.18,
   .052,.09,.18,.095,.09,.18,.073,.048,.18
 ],3));
 eyeGeo.computeVertexNormals();
 const bodyMat=new THREE.MeshBasicMaterial({color:0x130c16,side:THREE.DoubleSide,fog:false});
 const wingMat=new THREE.MeshBasicMaterial({color:0x28121e,side:THREE.DoubleSide,fog:false});
 const eyeMat=new THREE.MeshBasicMaterial({color:0xb42c20,side:THREE.DoubleSide,fog:false});
 const count=habitats.reduce((n,h)=>n+h.count,0);
 const bodies=new THREE.InstancedMesh(bodyGeo,bodyMat,count);
 const wings=new THREE.InstancedMesh(wingGeo,wingMat,count*2);
 const eyes=new THREE.InstancedMesh(eyeGeo,eyeMat,count);
 for(const mesh of [bodies,wings,eyes]){
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  mesh.castShadow=false;
  mesh.receiveShadow=false;
  scene.add(mesh);
 }
 function chooseMode(group,first=false){
  const old=group.mode;
  const modes=group.kind==='volcano'
   ?['thermal','thermal','circle','scatter']
   :group.kind==='sky'
   ?['cross','migrate','circle','circle','scatter']
   :['circle','circle','forage','forage','cross','roost','scatter'];
  group.mode=first?(group.kind==='volcano'?'thermal':'circle'):pick(modes);
  if(!first&&group.mode===old&&group.mode!=='circle')group.mode='circle';
  group.elapsed=0;
  group.duration=group.mode==='scatter'?rand(1.7,3.3)
   :group.mode==='cross'||group.mode==='migrate'?rand(7,10)
   :group.mode==='roost'?rand(3.5,5.5):rand(7,14);
  group.direction=Math.random()<.5?-1:1;
  group.spin=Math.random()<.5?-1:1;
  group.pulse=rand(.55,1.15);
  group.phase=rand(0,Math.PI*2);
  group.previousX=group.x;
  group.previousZ=group.z;
 }
 for(const h of habitats){
  const group={...h,index:groups.length,members:[],mode:'circle',elapsed:0,time:rand(0,30),
   x:h.x,y:h.y,z:h.z,direction:1,spin:1};
  groups.push(group);
  chooseMode(group,true);
  for(let i=0;i<h.count;i++){
   const angle=2*Math.PI*i/h.count+rand(-.32,.32),radius=rand(1.3,h.radius*.61);
   const bat={
    group,x:h.x+Math.cos(angle)*radius,y:h.y+rand(-1.6,1.6),
    z:h.z+Math.sin(angle)*radius*.6,
    vx:rand(-.8,.8),vy:rand(-.4,.4),vz:rand(-.8,.8),
    slotX:Math.cos(angle)*radius,slotZ:Math.sin(angle)*radius*.75,
    slotY:rand(-1.4,1.4),seed:rand(0,Math.PI*2),
    flap:rand(0,Math.PI*2),flapSpeed:rand(6.1,9.6),
    size:rand(.65,1.17)*(h.kind==='sky'?.83:1),
    huntTimer:rand(0,6),huntDepth:rand(.45,1.7)
   };
   group.members.push(bat);
   bats.push(bat);
  }
 }
 const bodyPose=new THREE.Object3D();
 const temp=new THREE.Matrix4(),rot=new THREE.Matrix4();
 const mirror=new THREE.Matrix4().makeScale(-1,1,1);
 const leftWing=new THREE.Matrix4(),rightWing=new THREE.Matrix4();
 let time=0,alertActive=false;
 function target(group,bat){
  const a=group.time*group.spin*.37+group.phase;
  const orbit=group.radius;
  let cx=group.x,cy=group.y,cz=group.z;
  switch(group.mode){
   case 'thermal':
    cx+=Math.cos(a)*orbit*.85;
    cy+=Math.sin(a*.8)*2.1+1.3;
    cz+=Math.sin(a)*orbit*.32;
    break;
   case 'forage':
    cx+=Math.sin(a*.75)*orbit*.75;
    cy=6.6+Math.sin(a*1.2)*.7;
    cz+=Math.cos(a*.65)*orbit*.75;
    break;
   case 'cross':
   case 'migrate':{
    const p=clamp(group.elapsed/group.duration,0,1);
    const width=group.mode==='cross'?22:31;
    cx=group.direction*(width-2*width*p);
    cy=group.y+2+Math.sin(p*Math.PI)*2.8;
    cz=group.z+Math.sin(p*Math.PI)*4;
    break;
   }
   case 'roost':
    cx=group.x>0?Math.max(7,group.x-4):Math.min(-7,group.x+4);
    cy=5.3;
    cz+=Math.sin(a)*1.8;
    break;
   case 'scatter':
    cx+=Math.cos(group.phase+group.elapsed*.9)*orbit*1.15;
    cy+=2.4+group.elapsed*.55;
    cz+=Math.sin(group.phase+group.elapsed)*orbit*.5;
    break;
   default:
    cx+=Math.cos(a)*orbit*.78;
    cy+=Math.sin(a*1.35)*1.5;
    cz+=Math.sin(a)*orbit*.64;
  }
  const loose=group.mode==='scatter'?2.3:group.mode==='roost'?.35:1;
  const wander=Math.sin(time*1.19+bat.seed)*.45;
  const settle=group.mode==='roost'?-bat.slotY*.7:0;
  return {
   x:cx+bat.slotX*loose+Math.sin(time*.9+bat.seed)*wander,
   y:cy+bat.slotY*.6+settle+(group.mode==='forage'?-bat.huntDepth*Math.max(0,Math.sin(time*.85+bat.seed)):0),
   z:cz+bat.slotZ*loose+Math.cos(time*.72+bat.seed)*.55
  };
 }
 function update(dt,{playing=false,ultimate=false}={}){
  dt=clamp(dt,0,.04);
  if(!dt)return;
  time+=dt;
  if(playing&&ultimate&&!alertActive){
   // Bat colonies scatter at the sudden pale-blue flight aura.
   for(const group of groups)if(group.kind==='forest'||group.kind==='sky'){
    chooseMode(group);group.mode='scatter';group.duration=rand(2,3.5);
   }
  }
  alertActive=playing&&ultimate;
  for(const group of groups){
   group.elapsed+=dt;group.time+=dt;
   if(group.elapsed>=group.duration)chooseMode(group);
  }
  for(const b of bats){
   const g=b.group,p=target(g,b);
   let sx=0,sy=0,sz=0;
   for(const neighbor of g.members){
    if(neighbor===b)continue;
    const dx=b.x-neighbor.x,dy=b.y-neighbor.y,dz=b.z-neighbor.z;
    const d2=dx*dx+dy*dy+dz*dz;
    if(d2<5.5&&d2>.0001){
     const weight=(5.5-d2)/5.5/(d2+.25);
     sx+=dx*weight;sy+=dy*weight;sz+=dz*weight;
    }
   }
   // Steering combines personal targets with separation and damped inertia.
   const accel=g.mode==='scatter'?2.1:1.65;
   b.vx+=(clamp((p.x-b.x)*accel+sx*10-b.vx*2.2,-25,25))*dt;
   b.vy+=(clamp((p.y-b.y)*accel+sy*8-b.vy*2.2,-25,25))*dt;
   b.vz+=(clamp((p.z-b.z)*accel+sz*10-b.vz*2.2,-25,25))*dt;
   const maxSpeed=g.mode==='cross'||g.mode==='migrate'?13:g.mode==='scatter'?17:9;
   const speed=Math.hypot(b.vx,b.vy,b.vz);
   if(speed>maxSpeed){const k=maxSpeed/speed;b.vx*=k;b.vy*=k;b.vz*=k;}
   b.x+=b.vx*dt;b.y=clamp(b.y+b.vy*dt,5.1,29);b.z=clamp(b.z+b.vz*dt,-92,-10);
   b.flap+=dt*b.flapSpeed*(g.mode==='thermal'?.56:g.mode==='roost'?.42:g.mode==='scatter'?1.55:1);
  }
  for(let i=0;i<bats.length;i++){
   const b=bats[i],speed=Math.hypot(b.vx,b.vz);
   bodyPose.position.set(b.x,b.y+Math.sin(b.flap*.55+b.seed)*.12,b.z);
   bodyPose.rotation.set(0,speed>.12?Math.atan2(-b.vx,-b.vz):0,
    clamp(-b.vx*.036,-.27,.27));
   bodyPose.scale.setScalar(b.size);
   bodyPose.updateMatrix();
   bodies.setMatrixAt(i,bodyPose.matrix);
   eyes.setMatrixAt(i,bodyPose.matrix);
   const mode=b.group.mode;
   const amplitude=mode==='thermal'?.25:mode==='roost'?.20:.52;
   const wingAngle=(mode==='roost'?.75:.10)+Math.sin(b.flap)*amplitude;
   rot.makeRotationZ(wingAngle);
   rightWing.multiplyMatrices(bodyPose.matrix,rot);
   wings.setMatrixAt(i*2,rightWing);
   rot.makeRotationZ(-wingAngle);
   temp.multiplyMatrices(rot,mirror);
   leftWing.multiplyMatrices(bodyPose.matrix,temp);
   wings.setMatrixAt(i*2+1,leftWing);
  }
  bodies.instanceMatrix.needsUpdate=true;
  wings.instanceMatrix.needsUpdate=true;
  eyes.instanceMatrix.needsUpdate=true;
 }
 // Initial transforms are populated before the first render, including the menu scene.
 update(1/60);
 function dispose(){
  for(const mesh of [bodies,wings,eyes])scene.remove(mesh);
  for(const geom of [bodyGeo,wingGeo,eyeGeo])geom.dispose();
  for(const mat of [bodyMat,wingMat,eyeMat])mat.dispose();
 }
 return {update,dispose,groups,bats};
}
