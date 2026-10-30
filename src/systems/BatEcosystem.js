import * as THREE from 'three';

// Independent low-poly bat habitat: no collisions, pickups or changes to the runner.
// Colonies sit near the forest's recycled pines and are spaced along the route.
export function createBatEcosystem(scene, options={}) {
 const mobile=options.mobile ?? (typeof window!=='undefined'&&window.innerWidth<720);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const rand=(a,b)=>a+Math.random()*(b-a);
 const habitats=[
  // Forest nests well away from the road, with long gaps between encounters.
  {kind:'forest',x:-9.7,z:-110,baseY:4.2,spread:2.6,count:mobile?3:4},
  {kind:'forest',x:13,z:-350,baseY:4.7,spread:3.8,count:mobile?2:4},
  // Just a couple of distant bats over the treeline.
  {kind:'sky',x:-23,z:-150,baseY:18.5,spread:3.5,count:mobile?1:2}
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
 // Small snout, shoulder ridge and two claw-like hind feet.
 face([-.08,.12,.14],[0,.025,.23],[.08,.12,.14]);
 face([-.13,-.27,.07],[-.17,-.39,.1],[-.07,-.30,.06]);
 face([.13,-.27,.07],[.17,-.39,.1],[.07,-.30,.06]);
 bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 bodyGeo.computeVertexNormals();
 // Anatomical low-poly wing: shoulder -> elbow -> wrist -> long finger rays.
 // Separate segments hinge at elbow and wrist, without a heavy SkinnedMesh.
 // Each segment includes membrane, leading-edge bones and dark scalloped borders.
 const membrane=new THREE.Color(0x0b090d);
 const membraneShade=new THREE.Color(0x191219);
 const rimColor=new THREE.Color(0x443640);
 const boneColor=new THREE.Color(0x63505c);
 function wingPart(outline,ribs){
  const positions=[],colors=[];
  function tri(a,b,c,color){
   for(const p of [a,b,c]){
    positions.push(p[0],p[1],p[2]);
    colors.push(color.r,color.g,color.b);
   }
  }
  function line(a,b,width,color){
   const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
   const ox=-dy/length*width,oy=dx/length*width,z=.027;
   const p1=[a[0]-ox,a[1]-oy,z],p2=[a[0]+ox,a[1]+oy,z];
   const p3=[b[0]-ox,b[1]-oy,z],p4=[b[0]+ox,b[1]+oy,z];
   tri(p1,p2,p3,color);tri(p2,p4,p3,color);
  }
  // Low-poly triangular membrane, anchored at the joint.
  for(let i=1;i<outline.length-1;i++)
   tri(outline[0],outline[i],outline[i+1],i%3===0?membraneShade:membrane);
  // Cut-out scallops are already part of the outline, not decorative feathers.
  for(let i=1;i<outline.length-1;i++)line(outline[i],outline[i+1],.014,rimColor);
  for(const [a,b,w] of ribs)line(a,b,w,boneColor);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  return geo;
 }
 const upperGeo=wingPart(
  [[0,0,0],[.16,.18,0],[.34,.18,0],[.30,-.19,0],[.09,-.31,0]],
  [[[0,0,0],[.34,.18,0],.019]]
 );
 const foreGeo=wingPart(
  [[0,0,0],[.20,.15,0],[.39,.07,0],[.43,-.16,0],[.29,-.28,0],[.12,-.25,0]],
  [[[0,0,0],[.39,.07,0],.018]]
 );
 // Four long finger supports reach into the angular flight membrane.
 const handGeo=wingPart(
  [[0,0,0],[.23,.23,0],[.55,.41,0],[1.02,.23,0],
   [.79,-.095,0],[.69,-.025,0],[.57,-.33,0],
   [.47,-.16,0],[.32,-.44,0],[.22,-.20,0]],
  [[[0,0,0],[1.02,.23,0],.013],
   [[0,0,0],[.79,-.095,0],.010],
   [[0,0,0],[.57,-.33,0],.010],
   [[0,0,0],[.32,-.44,0],.010]]
 );
 const eyeGeo=new THREE.BufferGeometry();
 eyeGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.145,.135,.23,-.065,.135,.23,-.11,.05,.23,
   .065,.135,.23,.145,.135,.23,.11,.05,.23
 ],3));
 eyeGeo.computeVertexNormals();
 // Shared GPU batches: body, eyes, shoulder wings, forearms, finger wings.
 const bodyMat=new THREE.MeshBasicMaterial({color:0x151116,side:THREE.DoubleSide,fog:false,toneMapped:false});
 const wingMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,fog:false,toneMapped:false});
 const eyeMat=new THREE.MeshBasicMaterial({color:0xff3428,side:THREE.DoubleSide,fog:false,toneMapped:false});
 const count=habitats.reduce((n,h)=>n+h.count,0);
 const bodies=new THREE.InstancedMesh(bodyGeo,bodyMat,count);
 const upperWings=new THREE.InstancedMesh(upperGeo,wingMat,count*2);
 const foreWings=new THREE.InstancedMesh(foreGeo,wingMat,count*2);
 const fingerWings=new THREE.InstancedMesh(handGeo,wingMat,count*2);
 const eyes=new THREE.InstancedMesh(eyeGeo,eyeMat,count);
 for(const mesh of [bodies,upperWings,foreWings,fingerWings,eyes]){
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  scene.add(mesh);
 }
 function resetBat(b){
  const g=b.colony;
  b.x=g.x+b.slotX;b.y=g.baseY+b.slotY;b.z=g.z+b.slotZ;
  b.vx=0;b.vy=0;b.vz=0;
  b.mode=g.kind==='sky'?'patrol':Math.random()<.82?'perched':'patrol';
  b.actionTime=rand(2.2,8.5);
  b.flap=rand(0,Math.PI*2);
  b.fearDelay=rand(.05,.82);
  b.escapeSide=Math.sign(g.x)*(rand(3,7))+(Math.random()-.5)*3;
  b.escapeUp=rand(2.1,4.6);
  b.escapeBack=rand(1.8,4);
  b.glideClock=rand(.1,5);
  b.glideDuration=rand(.55,1.25);
  b.glidePeriod=rand(3.5,7.4);
  b.dashClock=rand(.5,6.5);
  b.dashWindow=rand(.28,.75);
  b.dashPeriod=rand(4.5,9);
  b.dashX=rand(-1.3,1.3);
  b.dashZ=rand(-1.5,1.5);
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
    hasEyes:h.kind==='forest'};
   g.bats.push(b);bats.push(b);
  }
  resetColony(g);
 }
 let time=0,previousUltimate=false;
 const dummy=new THREE.Object3D(),rotation=new THREE.Matrix4();
 const yawMirror=new THREE.Matrix4().makeRotationY(Math.PI);
 const joint=new THREE.Matrix4(),shoulderPose=new THREE.Matrix4();
 const elbowPose=new THREE.Matrix4(),wristPose=new THREE.Matrix4();
 const zero=new THREE.Matrix4().makeScale(0,0,0);
 function update(dt,{playing=false,ultimate=false,speed=0,runnerX=0,runnerZ=2.3}={}){
  dt=clamp(dt,0,.04);
  if(!dt)return;
  time+=dt;
  for(const g of colonies){
   if(playing){
    const movement=speed*dt*(g.kind==='sky'?.38:1);
     g.z+=movement;
     for(const b of g.bats)b.z+=movement;
     // Repeat far away, leaving substantial quiet gaps between forest colonies.
     if(g.z>(g.kind==='sky'?-23:23)){
      resetColony(g,g.homeZ-(g.kind==='sky'?170:470)-rand(0,g.kind==='sky'?90:100));
      continue;
     }
     const dx=g.x-runnerX,dz=g.z-runnerZ;
     const near=Math.hypot(dx*.58,dz);
     if(g.kind==='forest'&&!g.alarmed&&(near<21||(ultimate&&!previousUltimate&&near<27))){
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
   if(!g.alarmed&&g.kind==='forest'){
    b.actionTime-=dt;
    if(b.actionTime<=0){
     b.mode=b.mode==='perched'?'patrol':(Math.random()<.68?'perched':'patrol');
     b.actionTime=b.mode==='perched'?rand(3,9):rand(4,11);
    }
   }
   const perchX=g.x+b.slotX,perchY=g.baseY+b.slotY,perchZ=g.z+b.slotZ;
   let tx=perchX,ty=perchY,tz=perchZ;
   if(g.kind==='sky'){
    const a=time*b.orbitSpeed*.72*b.orbitSign+b.wingPhase;
    tx=perchX+Math.sin(a)*b.orbitRadius*1.4;
    ty=perchY+Math.cos(a*1.2)*1.4;
    tz=perchZ+Math.cos(a*.85)*3.6;
   }else if(departing){
    const t=g.alertAge-b.fearDelay;
    // Flee out toward the treetops, climb, and break formation asymmetrically.
    tx=perchX+b.escapeSide*Math.min(t*.9,3.7)+Math.sin(t*2.7+b.wingPhase)*.7;
    ty=perchY+b.escapeUp*Math.min(t,2.7)+Math.sin(t*2.1+b.wingPhase)*.5;
    tz=perchZ-b.escapeBack*Math.min(t,3)+Math.cos(t*2+b.wingPhase)*.7;
   }else if(b.mode==='patrol'){
    const angle=time*b.orbitSpeed*b.orbitSign+b.wingPhase;
    // Short individual hunting turns; no flock-wide synchronized diving.
    b.dashClock=(b.dashClock+dt)%b.dashPeriod;
    const hunting=b.dashClock<b.dashWindow;
    // All patrol positions remain near the pine canopy, not above the road.
    tx=perchX+Math.sign(g.x)*(.8+Math.cos(angle)*b.orbitRadius*.68)+(hunting?b.dashX:0);
    ty=perchY+1.25+Math.sin(angle*1.35)*1.1+Math.sin(time*.43+b.wingPhase)*b.wobble-(hunting?1.15:0);
    tz=perchZ+Math.sin(angle)*b.orbitRadius+(hunting?b.dashZ:0);
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
   const top=departing?15:b.mode==='perched'?4.5:g.kind==='sky'?5:7.5;
   const v=Math.hypot(b.vx,b.vy,b.vz);
   if(v>top){const k=top/v;b.vx*=k;b.vy*=k;b.vz*=k;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   b.y=clamp(b.y,2.6,23);
   const shouldFlap=departing||b.mode==='patrol';
   b.glideClock=(b.glideClock+dt)%b.glidePeriod;
   const gliding=shouldFlap&&!departing&&b.glideClock<b.glideDuration;
   b.gliding=gliding;
   // Glide with open wings, beat faster on an alarm, individual asynchronous cycles.
   b.flap+=dt*b.wingSpeed*(departing?1.25:gliding?.075:shouldFlap?1:.12);
  }
  for(let i=0;i<bats.length;i++){
   const b=bats[i],g=b.colony;
   const departing=g.alarmed&&g.alertAge>b.fearDelay;
   const flying=departing||b.mode==='patrol';
   const speed=Math.hypot(b.vx,b.vz);
   dummy.position.set(b.x,b.y+(flying?Math.sin(b.flap*.67+b.wingPhase)*.085:0),b.z);
   dummy.rotation.set(clamp(b.vy*.042,-.26,.26),
    speed>.15?Math.atan2(-b.vx,-b.vz):0,clamp(-b.vx*.058,-.45,.45));
   dummy.scale.setScalar(b.size);
   dummy.updateMatrix();
   bodies.setMatrixAt(i,dummy.matrix);
   eyes.setMatrixAt(i,b.hasEyes?dummy.matrix:zero);

   // Measured bat flight has a broad downstroke and folded recovery.
   // Each wing uses three connected joints, no negative-scale mirror matrices.
   const phase=b.flap+b.wingPhase*.22;
   const folded=Math.max(0,Math.sin(phase));
   const shoulder=flying?(b.gliding?.045:.06+Math.sin(phase)*.63):1.15;
   const elbow=flying?(b.gliding?-.02:-.12+.48*folded):.37;
   const wrist=flying?(b.gliding?.04:-.13+.66*folded):.65;
   for(let side=0;side<2;side++){
    const idx=i*2+side;
    const wingOffset=side===0?.155:-.155;
    joint.makeTranslation(wingOffset,.075,0);
    shoulderPose.multiplyMatrices(dummy.matrix,joint);
    if(side===1)shoulderPose.multiply(yawMirror);
    rotation.makeRotationZ(shoulder+(side===0?.025*Math.sin(phase+.45):-.035*Math.cos(phase+.3)));
    shoulderPose.multiply(rotation);
    upperWings.setMatrixAt(idx,shoulderPose);
    // Elbow hinge: lower arm flexes separately during the recovery stroke.
    joint.makeTranslation(.34,.18,0);
    elbowPose.multiplyMatrices(shoulderPose,joint);
    rotation.makeRotationZ(elbow);
    elbowPose.multiply(rotation);
    foreWings.setMatrixAt(idx,elbowPose);
    // Wrist hinge retracts the finger membrane during the upstroke.
    joint.makeTranslation(.39,.07,0);
    wristPose.multiplyMatrices(elbowPose,joint);
    rotation.makeRotationZ(wrist);
    wristPose.multiply(rotation);
    fingerWings.setMatrixAt(idx,wristPose);
   }
  }
  for(const mesh of [bodies,upperWings,foreWings,fingerWings,eyes])
   mesh.instanceMatrix.needsUpdate=true;
 }
 update(1/60);
 function reset(){
  time=0;previousUltimate=false;
  for(const g of colonies)resetColony(g,g.homeZ);
  update(1/60);
 }
 function dispose(){
  for(const mesh of [bodies,upperWings,foreWings,fingerWings,eyes]){scene.remove(mesh);mesh.dispose();}
  for(const geo of [bodyGeo,upperGeo,foreGeo,handGeo,eyeGeo])geo.dispose();
  for(const mat of [bodyMat,wingMat,eyeMat])mat.dispose();
 }
 return {update,reset,dispose,colonies,bats};
}
