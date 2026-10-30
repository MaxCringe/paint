import * as THREE from 'three';

// Independent decorative ecosystem. Change to false to disable all rats.
export const RAT_ECOSYSTEM_ENABLED=true;
export function createRatEcosystem(scene,{enabled=RAT_ECOSYSTEM_ENABLED}={}){
 if(!enabled)return {considerFish(){},update(){},reset(){},dispose(){},encounters:[]};
 const rand=(a,b)=>a+Math.random()*(b-a);
 const encounters=[],mobile=typeof window!=='undefined'&&window.innerWidth<720;
 const MAX_ENCOUNTERS=mobile?2:3, FISH_CHANCE=.48;
 const bodyGeo=new THREE.SphereGeometry(1,9,6),headGeo=new THREE.SphereGeometry(1,8,6);
 const earGeo=new THREE.SphereGeometry(1,7,5),eyeGeo=new THREE.SphereGeometry(.035,6,4);
 const noseGeo=new THREE.ConeGeometry(.052,.12,5),footGeo=new THREE.BoxGeometry(.09,.055,.13);
 const tailGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,.19,-.24),new THREE.Vector3(-.06,.16,-.46),
  new THREE.Vector3(-.15,.12,-.69),new THREE.Vector3(-.13,.11,-.91)
 ]),10,.021,4,false);
 const whiskerPoints=[];
 for(const side of [-1,1])for(const tilt of [-.05,.05])
  whiskerPoints.push(side*.05,.23,.47,side*.26,.22+tilt,.57);
 const whiskerGeo=new THREE.BufferGeometry();
 whiskerGeo.setAttribute('position',new THREE.Float32BufferAttribute(whiskerPoints,3));
 const furMats=[0x322c29,0x4a3730,0x3d3a34].map(color=>new THREE.MeshStandardMaterial({
  color,roughness:1,flatShading:true
 }));
 const earMat=new THREE.MeshStandardMaterial({color:0x846158,roughness:1,flatShading:true});
 const eyeMat=new THREE.MeshBasicMaterial({color:0xcd8e6b});
 const blackMat=new THREE.MeshBasicMaterial({color:0x1b1517});
 const tailMat=new THREE.MeshStandardMaterial({color:0x8e6d67,roughness:1,flatShading:true});
 const whiskerMat=new THREE.LineBasicMaterial({color:0xb9a89a,transparent:true,opacity:.65});
 function part(group,geo,mat,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o;
 }
 function makeRat(index){
  const root=new THREE.Group(),fur=furMats[index%furMats.length];
  const body=part(root,bodyGeo,fur,0,.22,-.04,.205,.17,.33);
  const headPivot=new THREE.Group();headPivot.position.set(0,.25,.22);root.add(headPivot);
  part(headPivot,headGeo,fur,0,0,.065,.156,.135,.173);
  part(headPivot,noseGeo,tailMat,0,-.06,.275,.74,.8,.74).rotation.x=Math.PI/2;
  for(const side of [-1,1]){
   part(headPivot,earGeo,fur,side*.113,.102,-.014,.075,.096,.051);
   part(headPivot,earGeo,earMat,side*.114,.107,.025,.045,.066,.020);
   part(headPivot,eyeGeo,eyeMat,side*.139,.03,.151);
   part(headPivot,eyeGeo,blackMat,side*.150,.03,.165,.55,.65,.65);
  }
  const tail=new THREE.Group();root.add(tail);
  tail.add(new THREE.Mesh(tailGeo,tailMat));
  root.add(new THREE.LineSegments(whiskerGeo,whiskerMat));
  const feet=[];
  for(const side of [-1,1])for(const z of [-.18,.19])
   feet.push(part(root,footGeo,tailMat,side*.14,.045,z,.85,1,1));
  return {root,headPivot,body,tail,feet};
 }
 function closeToLava(fish,obstacles){
  return obstacles.some(o=>o.type==='lava'&&o.g.parent===scene&&
   Math.abs(o.g.position.z-fish.g.position.z)<(o.g.userData.halfDepth||3)+6.5);
 }
 function remove(e){
  e.fish.g.remove(e.container);
  const i=encounters.indexOf(e);
  if(i>=0)encounters.splice(i,1);
 }
 function considerFish(fish,obstacles){
  if(!fish||fish.type!=='fish'||Math.random()>FISH_CHANCE||
     encounters.length>=MAX_ENCOUNTERS||closeToLava(fish,obstacles))return;
  const container=new THREE.Group();fish.g.add(container);
  const chance=Math.random(),count=chance<.56?1:chance<.88?2:3;
  const fishX=(fish.lane-1)*2.55;
  const nearest=fishX===0?(Math.random()<.5?-1:1):Math.sign(fishX);
  const directions=count===1?[nearest]:count===2?[nearest,-nearest]:[nearest,-nearest,nearest];
  if(Math.random()<.5)directions.reverse();
  const rats=[];
  for(let i=0;i<count;i++){
   const parts=makeRat(i+Math.floor(rand(0,3)));
   container.add(parts.root);
   const angle=i/count*Math.PI*2+rand(-.38,.38);
   const homeX=Math.cos(angle)*rand(.48,.75);
   const homeZ=Math.sin(angle)*rand(.48,.85);
   const size=rand(.90,1.12);
   parts.root.scale.setScalar(size);
   parts.root.position.set(homeX,0,homeZ);
   parts.root.rotation.y=Math.atan2(-homeX,-homeZ);
   rats.push({
    ...parts,homeX,homeZ,x:homeX,z:homeZ,vx:0,vz:0,mode:'eat',
    timer:rand(.6,2),speed:rand(5,7),phase:rand(0,Math.PI*2),
    gait:rand(13,20),delay:rand(.02,.38),side:directions[i],
    targetZ:rand(-1.8,1.8),sway:rand(-.18,.18),hidden:false
   });
  }
  encounters.push({fish,container,rats,alarmed:false,alarmTime:0});
 }
 function update(dt,{playing=false,runnerX=0,runnerZ=2.3,ultimate=false,obstacles=[]}={}){
  if(!playing||dt<=0)return;
  dt=Math.min(dt,.04);
  for(let i=encounters.length-1;i>=0;i--){
   const e=encounters[i],fish=e.fish;
   if(!fish.g.parent||fish.g.position.z>14||closeToLava(fish,obstacles)){
    remove(e);continue;
   }
   const fishX=fish.g.position.x,fishZ=fish.g.position.z;
   const distance=Math.hypot((fishX-runnerX)*.7,fishZ-runnerZ);
   if(!e.alarmed&&(distance<19||(ultimate&&distance<24))){
    e.alarmed=true;e.alarmTime=0;
   }
   if(e.alarmed)e.alarmTime+=dt;
   for(const r of e.rats){
    if(r.hidden)continue;
    if(e.alarmed&&e.alarmTime>=r.delay){
     // Flee with acceleration/inertia; each rat has its own forest-side goal.
     const goalX=r.side*(6.35+Math.abs(r.sway)*3)-fishX;
     const goalZ=r.targetZ+Math.sin(e.alarmTime*2.7+r.phase)*.22;
     const dx=goalX-r.x,dz=goalZ-r.z,len=Math.max(.001,Math.hypot(dx,dz));
     const steering=1-Math.exp(-dt*6);
     r.vx+=(dx/len*r.speed-r.vx)*steering;
     r.vz+=(dz/len*r.speed-r.vz)*steering;
     // Separation stops frightened animals running through each other.
     for(const n of e.rats){
      if(n===r||n.hidden)continue;
      const sx=r.x-n.x,sz=r.z-n.z,d2=sx*sx+sz*sz;
      if(d2>.015&&d2<.35){r.vx+=sx/d2*dt*1.5;r.vz+=sz/d2*dt*1.5;}
     }
     r.x+=r.vx*dt;r.z+=r.vz*dt;
     const yaw=Math.atan2(r.vx,r.vz);
     const diff=Math.atan2(Math.sin(yaw-r.root.rotation.y),Math.cos(yaw-r.root.rotation.y));
     r.root.rotation.y+=diff*Math.min(1,dt*12);
     const phase=e.alarmTime*r.gait+r.phase;
     r.root.position.set(r.x,.025+Math.abs(Math.sin(phase))*.035,r.z);
     r.body.rotation.z=Math.sin(phase)*.065;
     r.headPivot.rotation.x=-.10+Math.sin(phase)*.09;
     r.tail.rotation.y=Math.sin(e.alarmTime*13+r.phase)*.30;
     for(let j=0;j<r.feet.length;j++)
      r.feet[j].position.z=(j%2===0?-.18:.19)+Math.sin(phase+(j%3)*Math.PI)*.065;
     if(Math.abs(fishX+r.x)>5.9){r.root.visible=false;r.hidden=true;}
    }else{
     // Eat, sniff, or cautiously reposition near the fish; unsynchronized rhythms.
     r.timer-=dt;
     if(r.timer<=0){
      const choice=Math.random();
      r.mode=choice<.60?'eat':choice<.82?'sniff':'shuffle';
      r.timer=r.mode==='eat'?rand(.8,2.4):rand(.32,.8);
     }
     const phase=r.phase+r.timer*9;
     if(r.mode==='shuffle'){
      r.x+=(r.homeX+Math.sin(phase)*.13-r.x)*Math.min(1,dt*3);
      r.z+=(r.homeZ+Math.cos(phase)*.12-r.z)*Math.min(1,dt*3);
     }
     r.root.position.set(r.x,.008*Math.sin(phase),r.z);
     r.headPivot.rotation.x=r.mode==='eat'?-.25+Math.sin(phase*1.8)*.23:
      r.mode==='sniff'?.15+Math.sin(phase)*.09:0;
     r.headPivot.rotation.y=r.mode==='sniff'?Math.sin(phase*.55)*.26:0;
     r.tail.rotation.y=Math.sin(phase*.7)*.10;
    }
   }
   if(e.rats.every(r=>r.hidden))remove(e);
  }
 }
 function reset(){for(const e of [...encounters])remove(e);}
 function dispose(){
  reset();
  for(const geo of [bodyGeo,headGeo,earGeo,noseGeo,footGeo,eyeGeo,tailGeo,whiskerGeo])geo.dispose();
  for(const mat of [...furMats,earMat,eyeMat,blackMat,tailMat,whiskerMat])mat.dispose();
 }
 return {considerFish,update,reset,dispose,encounters};
}
