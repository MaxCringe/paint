import * as THREE from 'three';

// Independent atmospheric layer. Switch this off to remove ALL meteor effects.
export const METEOR_ECOSYSTEM_ENABLED = true;

export function createMeteorEcosystem(scene, roadsideVegetation, {
 enabled=METEOR_ECOSYSTEM_ENABLED,
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 if(!enabled)return {update(){},reset(){},dispose(){},active:[]};
 const rand=(a,b)=>a+Math.random()*(b-a);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const trees=roadsideVegetation.filter(g=>g.children.some(c=>c.geometry?.type==='ConeGeometry'));
 const events=[],impacts=[],burns=[];
 const yAxis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),pos=new THREE.Vector3();
 const start=new THREE.Vector3(),end=new THREE.Vector3();
 // Shared low-poly geometry / unlit materials. No lights, shadows or heavy particles.
 const rockGeo=new THREE.IcosahedronGeometry(.50,0);
 const glowGeo=new THREE.SphereGeometry(.82,8,6);
 const trailGeo=new THREE.CylinderGeometry(.018,.29,1,7,1);
 const sparkGeo=new THREE.IcosahedronGeometry(.10,0);
 const ringGeo=new THREE.TorusGeometry(1,.085,4,22);
 const craterGeo=new THREE.CircleGeometry(.87,15);
 const flameGeo=new THREE.BufferGeometry();
 flameGeo.setAttribute('position',new THREE.Float32BufferAttribute([
   -.22,0,0,.18,0,0,-.01,1.05,0,
   -.07,.30,.005,.24,.20,.005,.08,.80,.005,
   -.18,.05,.002,.12,.06,.002,.04,.58,.002
 ],3));
 flameGeo.computeVertexNormals();
 const hot=new THREE.MeshBasicMaterial({color:0xffbd35,toneMapped:false,fog:false});
 const halo=new THREE.MeshBasicMaterial({color:0xff4910,transparent:true,opacity:.39,depthWrite:false,toneMapped:false,fog:false});
 const tailMat=new THREE.MeshBasicMaterial({color:0xff6013,transparent:true,opacity:.93,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false});
 const emberMat=new THREE.MeshBasicMaterial({color:0xffed91,toneMapped:false,fog:false});
 const ringMat=new THREE.MeshBasicMaterial({color:0xff6b1b,transparent:true,opacity:.8,depthWrite:false,toneMapped:false,fog:false});
 const scarMat=new THREE.MeshBasicMaterial({color:0x291410,transparent:true,opacity:.67,depthWrite:false,side:THREE.DoubleSide,fog:false});
 const fireMats=[
  new THREE.MeshBasicMaterial({color:0xff420c,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,fog:false}),
  new THREE.MeshBasicMaterial({color:0xffab23,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,fog:false})
 ];
 // Show an early preview in the first run; later meteors are uncommon.
 let skyClock=rand(2.2,3.8),landClock=rand(7.5,10.5),time=0;
 const maxEvents=mobile?1:2;
 function makeGroup(){const g=new THREE.Group();scene.add(g);return g}
 function meteor(type,targetTree=null){
  if(events.length>=maxEvents)return;
  const group=makeGroup(),ground=type==='ground';
  if(ground){
   const side=Math.random()<.5?-1:1;
   const x=targetTree?targetTree.position.x+rand(-.5,.5):side*rand(6.1,mobile?9.2:11.2);
   const z=targetTree?targetTree.position.z+rand(-.5,.5):rand(-42,-22);
   group.position.set(x,0,z);
   start.set(rand(-11,11),rand(14,20),-rand(3,8));
   end.set(0,.55,0);
  }else{
   group.position.set(0,0,0);
   // Keep the entire path in the sky above mountains, but INSIDE the camera view.
   // The old 31-39-unit height placed meteors above the screen.
   const side=Math.random()<.5?-1:1;
   start.set(side*rand(mobile?6:11,mobile?9:20),rand(19,22),-63);
   end.set(-side*rand(mobile?4:6,mobile?7:10),rand(12,14.5),-63);
  }
  const core=new THREE.Mesh(rockGeo,hot),aura=new THREE.Mesh(glowGeo,halo);
  const trail=new THREE.Mesh(trailGeo,tailMat);
  // More legible at distance, while using the same few cheap shared meshes.
  const size=ground?1.5:2.4;
  core.scale.setScalar(size);aura.scale.setScalar(size*1.2);
  const sparks=[];
  group.add(trail,core,aura);
  for(let i=0;i<3;i++){
   const p=new THREE.Mesh(sparkGeo,emberMat);
   p.scale.setScalar(1-i*.2);
   group.add(p);sparks.push(p);
  }
  const length=ground?rand(1.8,2.5):rand(1.9,2.9);
  events.push({type,group,start:start.clone(),end:end.clone(),core,aura,trail,sparks,
   age:0,duration:length,landTree:targetTree,size});
 }
 function spawnGround(){
  // Only hit grass or forest OUTSIDE the road; never spawn a new gameplay hazard.
  const available=trees.filter(t=>Math.abs(t.position.x)<14&&t.position.z< -21&&
   t.position.z> -50&&!burns.some(b=>b.tree===t));
  const hitForest=Math.random()<.65&&available.length>0;
  meteor('ground',hitForest?available[(Math.random()*available.length)|0]:null);
 }
 function ignite(tree){
  if(!tree||burns.some(b=>b.tree===tree))return;
  const flames=new THREE.Group();
  tree.add(flames);
  const meshes=[];
  for(let i=0;i<(mobile?3:4);i++){
   const flame=new THREE.Mesh(flameGeo,fireMats[i%2]);
   flame.position.set(rand(-.36,.36),.25+i*.54,rand(-.23,.23));
   flame.rotation.y=i*1.73;
   flame.scale.setScalar(rand(.58,1.0));
   flames.add(flame);meshes.push({mesh:flame,base:flame.scale.x,phase:rand(0,Math.PI*2)});
  }
  burns.push({tree,flames,meshes,age:0,lifetime:rand(5.5,8),lastZ:tree.position.z});
 }
 function blast(e){
  const g=e.group;
  g.remove(e.core,e.aura,e.trail,...e.sparks);
  // Expanding shock ring and a short-lived blackened patch in the grass.
  const crater=new THREE.Mesh(craterGeo,scarMat);
  crater.rotation.x=-Math.PI/2;crater.position.y=-.055;g.add(crater);
  const ring=new THREE.Mesh(ringGeo,ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);
  const embers=[];
  for(let i=0;i<4;i++){
   const m=new THREE.Mesh(sparkGeo,emberMat);
   const a=i*Math.PI/2+rand(-.25,.25);
   m.position.set(Math.cos(a)*rand(.3,.75),rand(.2,.8),Math.sin(a)*rand(.3,.75));
   g.add(m);embers.push({mesh:m,v:rand(.4,1),phase:rand(0,6.28)});
  }
  impacts.push({group:g,ring,crater,embers,age:0,lifetime:3.7});
  // Set fire only to genuine pine models near a forest landing.
  if(e.landTree){
   for(const tree of trees){
    if(Math.abs(tree.position.x-g.position.x)<2.7&&
       Math.abs(tree.position.z-g.position.z)<3.2&&
       !burns.some(b=>b.tree===tree)){
     ignite(tree);
     if(burns.length>=3)break;
    }
   }
  }
 }
 function removeGroup(g){g.parent?.remove(g)}
 function reset(){
  for(const e of events)removeGroup(e.group);
  for(const e of impacts)removeGroup(e.group);
  for(const b of burns)b.tree.remove(b.flames);
  events.length=0;impacts.length=0;burns.length=0;
  skyClock=rand(2.2,3.8);landClock=rand(7.5,10.5);time=0;
 }
 function update(dt,{playing=false,speed=0}={}){
  if(!playing||dt<=0)return;
  dt=clamp(dt,0,.04);time+=dt;
  skyClock-=dt;landClock-=dt;
  if(skyClock<=0){
   if(events.length<maxEvents)meteor('sky');
   skyClock=rand(14,22);
  }
  if(landClock<=0){
   if(events.length<maxEvents)spawnGround();
   landClock=rand(24,35);
  }
  for(let i=events.length-1;i>=0;i--){
   const e=events[i];e.age+=dt;
   if(e.type==='ground')e.group.position.z+=speed*dt;
   const p=clamp(e.age/e.duration,0,1);
   const travel=e.type==='ground'?p*p*(3-2*p):p;
   pos.lerpVectors(e.start,e.end,travel);
   e.core.position.copy(pos);
   e.aura.position.copy(pos);
   const pulse=1+.14*Math.sin(time*19+i*2);
   e.aura.scale.setScalar(e.size*1.2*pulse);
   direction.subVectors(e.start,e.end).normalize();
   const tailLength=e.type==='ground'?5.5:8.5;
   e.trail.position.copy(pos).addScaledVector(direction,tailLength*.5);
   e.trail.quaternion.setFromUnitVectors(yAxis,direction);
   e.trail.scale.set(e.size,tailLength,e.size);
   e.sparks.forEach((s,k)=>s.position.copy(pos).addScaledVector(direction,.7+k*.76));
   if(p>=1){
    events.splice(i,1);
    if(e.type==='ground')blast(e);
    else removeGroup(e.group);
   }
  }
  for(let i=impacts.length-1;i>=0;i--){
   const e=impacts[i];
   e.age+=dt;e.group.position.z+=speed*dt;
   const p=clamp(e.age/e.lifetime,0,1);
   e.ring.scale.setScalar(.2+p*2.4);
   e.ring.material=ringMat;
   e.crater.scale.setScalar(.85+p*.4);
   e.embers.forEach(s=>{
    s.mesh.position.y+=dt*s.v;
    s.mesh.scale.setScalar(Math.max(.001,1-p));
   });
   if(p>=1){removeGroup(e.group);impacts.splice(i,1);}
  }
  for(let i=burns.length-1;i>=0;i--){
   const b=burns[i];b.age+=dt;
   const recycled=b.tree.position.z<b.lastZ-25;
   b.lastZ=b.tree.position.z;
   const fade=clamp((b.lifetime-b.age)/1.7,0,1);
   for(const f of b.meshes){
    const pulse=.84+Math.sin(time*13+f.phase)*.17;
    f.mesh.scale.set(f.base*pulse*fade,f.base*(.9+pulse*.3)*fade,f.base);
   }
   if(recycled||b.age>=b.lifetime){
    b.tree.remove(b.flames);burns.splice(i,1);
   }
  }
 }
 function dispose(){
  reset();
  for(const g of [rockGeo,glowGeo,trailGeo,sparkGeo,ringGeo,craterGeo,flameGeo])g.dispose();
  for(const m of [hot,halo,tailMat,emberMat,ringMat,scarMat,...fireMats])m.dispose();
 }
 return {update,reset,dispose,active:events};
}
