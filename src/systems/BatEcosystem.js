import * as THREE from 'three';

// Independent low-poly bat habitat: no collisions, pickups or changes to the runner.
// Colonies sit near the forest's recycled pines and are spaced along the route.
export function createBatEcosystem(scene, options={}) {
 const mobile=options.mobile ?? (typeof window!=='undefined'&&window.innerWidth<720);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const rand=(a,b)=>a+Math.random()*(b-a);
 const habitats=[
  {x:-5.9,z:-30,baseY:3.65,spread:2.3,count:mobile?3:6},
  {x:9.1,z:-89,baseY:4.5,spread:3.8,count:mobile?3:5},
  {x:-14.3,z:-154,baseY:4.1,spread:4.6,count:mobile?3:5},
  {x:6.3,z:-228,baseY:3.9,spread:2.7,count:mobile?4:7}
 ];
 const colonies=[],bats=[];
 const bodyGeo=new THREE.BufferGeometry();
 const vertices=[];
 const face=(a,b,c)=>vertices.push(...a,...b,...c);
 const nose=[0,.19,.15],belly=[0,-.32,.13],left=[-.16,0,.08],right=[.16,0,.08];
 face(nose,left,belly);face(nose,belly,right);
 face(nose,[0,0,-.16],left);face(nose,right,[0,0,-.16]);
 face(left,[0,0,-.16],belly);face(right,belly,[0,0,-.16]);
 face([-.13,.14,.1],[-.18,.42,.04],[-.02,.21,.1]);
 face([.13,.14,.1],[.18,.42,.04],[.02,.21,.1]);
 face([-.08,-.3,.04],[0,-.53,.02],[.08,-.3,.04]);
 bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 bodyGeo.computeVertexNormals();
 const wingGeo=new THREE.BufferGeometry();
 const contour=[
  [0,.06,0],[.25,.22,0],[.59,.4,-.02],[1.31,.19,0],
  [.99,-.17,.01],[.75,-.07,.03],[.46,-.31,.01],[.24,-.08,.02]
 ];
 const wingPositions=[];
 for(let j=1;j<contour.length-1;j++)
  wingPositions.push(...contour[0],...contour[j],...contour[j+1]);
 wingGeo.setAttribute('position',new THREE.Float32BufferAttribute(wingPositions,3));
 wingGeo.computeVertexNormals();
 const eyeGeo=new THREE.BufferGeometry();
 eyeGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.11,.1,.19,-.055,.1,.19,-.085,.048,.19,
   .055,.1,.19,.11,.1,.19,.085,.048,.19
 ],3));
 eyeGeo.computeVertexNormals();
 // Slightly lighter than the night sky: readable silhouettes without a realistic look.
 const bodyMat=new THREE.MeshBasicMaterial({color:0x3b2630,side:THREE.DoubleSide,fog:false});
 const wingMat=new THREE.MeshBasicMaterial({color:0x432934,side:THREE.DoubleSide,fog:false});
 const eyeMat=new THREE.MeshBasicMaterial({color:0xff4730,side:THREE.DoubleSide,fog:false});
 const count=habitats.reduce((n,h)=>n+h.count,0);
 const bodies=new THREE.InstancedMesh(bodyGeo,bodyMat,count);
 const wings=new THREE.InstancedMesh(wingGeo,wingMat,count*2);
 const eyes=new THREE.InstancedMesh(eyeGeo,eyeMat,count);
 for(const mesh of [bodies,wings,eyes]){
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  scene.add(mesh);
 }
 function resetBat(b){
  const g=b.colony;
  b.x=g.x+b.slotX;b.y=g.baseY+b.slotY;b.z=g.z+b.slotZ;
  b.vx=0;b.vy=0;b.vz=0;
  b.mode=Math.random()<.7?'perched':'patrol';
  b.actionTime=rand(2.2,8.5);
  b.flap=rand(0,Math.PI*2);
  b.fearDelay=rand(.05,.82);
  b.escapeSide=Math.sign(g.x)*(rand(3,7))+(Math.random()-.5)*3;
  b.escapeUp=rand(2.1,4.6);
  b.escapeBack=rand(1.8,4);
 }
 function resetColony(g,z=g.homeZ){
  g.z=z;g.alarmed=false;g.alertAge=0;
  g.bats.forEach(resetBat);
 }
 for(const h of habitats){
  const g={...h,homeZ:h.z,bats:[],alarmed:false,alertAge:0};
  colonies.push(g);
  for(let i=0;i<h.count;i++){
   const b={colony:g,slotX:rand(-h.spread,h.spread),slotY:rand(-.9,.95),
    slotZ:rand(-3.7,3.7),wingPhase:rand(0,Math.PI*2),
    wingSpeed:rand(6,11.5),size:rand(.82,1.38),
    orbitRadius:rand(1.8,4.8),orbitSpeed:rand(.34,.85),
    orbitSign:Math.random()<.5?-1:1,wobble:rand(.1,.9),
    hasEyes:Math.random()<.43};
   g.bats.push(b);bats.push(b);
  }
  resetColony(g);
 }
 let time=0,previousUltimate=false;
 const dummy=new THREE.Object3D(),rotation=new THREE.Matrix4();
 const mirror=new THREE.Matrix4().makeScale(-1,1,1);
 const tmp=new THREE.Matrix4(),rightWing=new THREE.Matrix4(),leftWing=new THREE.Matrix4();
 const zero=new THREE.Matrix4().makeScale(0,0,0);
 function update(dt,{playing=false,ultimate=false,speed=0,runnerX=0,runnerZ=2.3}={}){
  dt=clamp(dt,0,.04);
  if(!dt)return;
  time+=dt;
  for(const g of colonies){
   if(playing){
    const movement=speed*dt;
    g.z+=movement;
    for(const b of g.bats)b.z+=movement;
    // Recycle only after the entire colony has passed behind the camera.
    if(g.z>23){resetColony(g,g.homeZ-5-rand(0,26));continue;}
    const dx=g.x-runnerX,dz=g.z-runnerZ;
    const near=Math.hypot(dx*.78,dz);
    if(!g.alarmed&&(near<16.8||(ultimate&&!previousUltimate&&near<24))){
     g.alarmed=true;g.alertAge=0;
     // Each bat starts a little later, instead of one synchronized take-off.
     for(const b of g.bats){
      b.fearDelay=rand(0,.75);
      b.escapeSide=Math.sign(g.x)*rand(5,9)+rand(-2.3,2.3);
      b.escapeUp=rand(2.5,5.7);
      b.escapeBack=rand(2.2,5.1);
     }
    }
   }
   if(g.alarmed)g.alertAge+=dt;
  }
  previousUltimate=playing&&ultimate;
  for(const b of bats){
   const g=b.colony;
   const departing=g.alarmed&&g.alertAge>b.fearDelay;
   // Independent daily routines. Only frightened bats share the flock's alarm.
   if(!g.alarmed){
    b.actionTime-=dt;
    if(b.actionTime<=0){
     b.mode=b.mode==='perched'?'patrol':(Math.random()<.68?'perched':'patrol');
     b.actionTime=b.mode==='perched'?rand(3,9):rand(4,11);
    }
   }
   const perchX=g.x+b.slotX,perchY=g.baseY+b.slotY,perchZ=g.z+b.slotZ;
   let tx=perchX,ty=perchY,tz=perchZ;
   if(departing){
    const t=g.alertAge-b.fearDelay;
    // Flee out toward the treetops, climb, and break formation asymmetrically.
    tx=perchX+b.escapeSide*Math.min(t*.9,3.7)+Math.sin(t*2.7+b.wingPhase)*.7;
    ty=perchY+b.escapeUp*Math.min(t,2.7)+Math.sin(t*2.1+b.wingPhase)*.5;
    tz=perchZ-b.escapeBack*Math.min(t,3)+Math.cos(t*2+b.wingPhase)*.7;
   }else if(b.mode==='patrol'){
    const angle=time*b.orbitSpeed*b.orbitSign+b.wingPhase;
    // All patrol positions remain near the pine canopy, not above the road.
    tx=perchX+Math.sign(g.x)*(.8+Math.cos(angle)*b.orbitRadius*.68);
    ty=perchY+1.25+Math.sin(angle*1.35)*1.1+Math.sin(time*.43+b.wingPhase)*b.wobble;
    tz=perchZ+Math.sin(angle)*b.orbitRadius;
   }else{
    // Perched individuals cling to their own branch and occasionally twitch.
    tx=perchX+.06*Math.sin(time*.55+b.wingPhase);
    ty=perchY+.04*Math.sin(time*.8+b.wingPhase);
   }
   let sepX=0,sepY=0,sepZ=0;
   if(departing||b.mode==='patrol'){
    for(const n of g.bats){
     if(n===b)continue;
     const dx=b.x-n.x,dy=b.y-n.y,dz=b.z-n.z;
     const d2=dx*dx+dy*dy+dz*dz;
     if(d2>.04&&d2<4.8){
      const w=(4.8-d2)/(4.8*(d2+.35));
      sepX+=dx*w;sepY+=dy*w;sepZ+=dz*w;
     }
    }
   }
   const responsiveness=departing?3.0:b.mode==='perched'?4.0:1.7;
   b.vx+=clamp((tx-b.x)*responsiveness+sepX*5-b.vx*2.5,-32,32)*dt;
   b.vy+=clamp((ty-b.y)*responsiveness+sepY*5-b.vy*2.5,-32,32)*dt;
   b.vz+=clamp((tz-b.z)*responsiveness+sepZ*5-b.vz*2.5,-32,32)*dt;
   const top=departing?15:b.mode==='perched'?4.5:7.5;
   const v=Math.hypot(b.vx,b.vy,b.vz);
   if(v>top){const k=top/v;b.vx*=k;b.vy*=k;b.vz*=k;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   b.y=clamp(b.y,2.6,23);
   const shouldFlap=departing||b.mode==='patrol';
   b.flap+=dt*b.wingSpeed*(departing?1.25:shouldFlap?1:.12);
  }
  for(let i=0;i<bats.length;i++){
   const b=bats[i],g=b.colony;
   const departing=g.alarmed&&g.alertAge>b.fearDelay;
   const flying=departing||b.mode==='patrol';
   const heading=Math.hypot(b.vx,b.vz);
   dummy.position.set(b.x,b.y+(flying?Math.sin(b.flap*.67+b.wingPhase)*.09:0),b.z);
   dummy.rotation.set(0,heading>.15?Math.atan2(-b.vx,-b.vz):0,clamp(-b.vx*.04,-.38,.38));
   dummy.scale.setScalar(b.size);
   dummy.updateMatrix();
   bodies.setMatrixAt(i,dummy.matrix);
   eyes.setMatrixAt(i,b.hasEyes&&flying?dummy.matrix:zero);
   const wingAmplitude=departing?.66:flying?.39:.055;
   const wingAngle=(flying?.03:1.05)+Math.sin(b.flap+b.wingPhase)*wingAmplitude;
   rotation.makeRotationZ(wingAngle);
   rightWing.multiplyMatrices(dummy.matrix,rotation);
   wings.setMatrixAt(i*2,rightWing);
   rotation.makeRotationZ(-wingAngle);
   tmp.multiplyMatrices(rotation,mirror);
   leftWing.multiplyMatrices(dummy.matrix,tmp);
   wings.setMatrixAt(i*2+1,leftWing);
  }
  bodies.instanceMatrix.needsUpdate=true;
  wings.instanceMatrix.needsUpdate=true;
  eyes.instanceMatrix.needsUpdate=true;
 }
 update(1/60);
 function reset(){
  time=0;previousUltimate=false;
  for(const g of colonies)resetColony(g,g.homeZ);
  update(1/60);
 }
 function dispose(){
  for(const mesh of [bodies,wings,eyes])scene.remove(mesh);
  for(const geo of [bodyGeo,wingGeo,eyeGeo])geo.dispose();
  for(const mat of [bodyMat,wingMat,eyeMat])mat.dispose();
 }
 return {update,reset,dispose,colonies,bats};
}
