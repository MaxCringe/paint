import * as THREE from 'three';

// Five-plus distinct orientations of a discarded fish, with soft translucent odor.
// The game still treats the entire display as one ordinary lane-based fish obstacle.
export function createFishFactory(scene, obstacles) {
 const rand=(a,b)=>a+Math.random()*(b-a);
 const TAU=Math.PI*2;
 const bodyMaterial=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.95,metalness:0,flatShading:true,side:THREE.DoubleSide
 });
 const finMaterial=new THREE.MeshStandardMaterial({
  color:0x596459,roughness:.97,flatShading:true,side:THREE.DoubleSide
 });
 const gillMaterial=new THREE.MeshBasicMaterial({color:0x4c534b,side:THREE.DoubleSide});
 const eyeMaterial=new THREE.MeshBasicMaterial({color:0x111713});
 const milkyEye=new THREE.MeshBasicMaterial({color:0xb2b5a5});
 const scaleMaterial=new THREE.MeshStandardMaterial({color:0x929a8c,roughness:1});
 const commonGeos=[];
 function own(geometry){commonGeos.push(geometry);return geometry;}
 const headGeo=own(new THREE.SphereGeometry(.25,9,6));
 const eyeGeo=own(new THREE.SphereGeometry(.065,7,5));
 const scaleGeo=own(new THREE.SphereGeometry(.095,5,4));
 const finGeo=own(new THREE.BufferGeometry());
 finGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,-.2, -.40,-.025,.15, -.3,-.025,.43,
  0,0,-.2, -.3,-.025,.43, -.08,-.025,.16
 ],3));
 finGeo.computeVertexNormals();
 const tailGeo=own(new THREE.BufferGeometry());
 tailGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0, -.43,-.02,.59, -.17,-.02,.47,
  0,0,0, .17,-.02,.47, .43,-.02,.59,
  0,0,0, -.17,-.02,.47, .17,-.02,.47
 ],3));
 tailGeo.computeVertexNormals();
 const gillGeo=own(new THREE.BufferGeometry());
 gillGeo.setAttribute('position',new THREE.Float32BufferAttribute([
   -.22,-.015,-.62, -.24,.15,-.5, -.21,.09,-.4,
    .22,-.015,-.62, .24,.15,-.5, .21,.09,-.4
 ],3));
 gillGeo.computeVertexNormals();

 // Elongated faceted taper, much closer to a washed-up fish than a round capsule.
 // A separate bend geometry visibly curves the last third of the body.
 function makeBodyGeometry(curve=0,thin=1) {
  const rings=[
   [-.90,.17,.115],[-.72,.30,.19],[-.49,.39,.26],
   [-.18,.41,.275],[.14,.36,.25],[.47,.26,.19],
   [.74,.145,.12],[.97,.045,.052]
  ];
  const positions=[],colors=[];
  const top=new THREE.Color(0x7e897e),side=new THREE.Color(0x707b70);
  const pale=new THREE.Color(0xaeb4a6);
  const segments=10;
  function ringPoint(index,j){
   const [z,w,h]=rings[index];
   const a=j/segments*TAU;
   const cx=curve*Math.max(0,z+.14)**2;
   return [cx+Math.cos(a)*w*thin,Math.sin(a)*h,z];
  }
  function push(p,c){
   positions.push(...p);
   colors.push(c.r,c.g,c.b);
  }
  for(let i=0;i<rings.length-1;i++){
   for(let j=0;j<segments;j++){
    const a=ringPoint(i,j),b=ringPoint(i,j+1);
    const c=ringPoint(i+1,j),d=ringPoint(i+1,j+1);
    const mid=(j+.5)/segments*TAU;
    const tint=Math.sin(mid)<-.18?pale:((j+i)%3===0?side:top);
    push(a,tint);push(b,tint);push(c,tint);
    push(b,tint);push(d,tint);push(c,tint);
   }
  }
  const geometry=own(new THREE.BufferGeometry());
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
 }
 const bodies=[
  makeBodyGeometry(0,1),
  makeBodyGeometry(.34,1),
  makeBodyGeometry(-.36,.92),
  makeBodyGeometry(.12,.83)
 ];
 function mesh(parent,geometry,material,x=0,y=0,z=0){
  const obj=new THREE.Mesh(geometry,material);
  obj.position.set(x,y,z);obj.castShadow=false;parent.add(obj);return obj;
 }
 function addFish(group,{x=0,z=0,yaw=0,roll=0,scale=1,body=0,broken=false}={}) {
  const fish=new THREE.Group();
  fish.position.set(x,.285*scale,z);
  fish.rotation.set(0,yaw,roll,'YXZ');
  fish.scale.setScalar(scale);
  group.add(fish);
  mesh(fish,bodies[body],bodyMaterial);
  // A single anatomically tapered silhouette: blunt head, narrow tail, flat fins.
  const head=mesh(fish,headGeo,bodyMaterial,0,0,-.86);
  // bodyMaterial is vertex-colored; the head uses a separate plain material.
  head.material=finMaterial;
  head.scale.set(.83,.69,.78);
  mesh(fish,gillGeo,gillMaterial);
  for(const side of [-1,1]){
   const eye=mesh(fish,eyeGeo,milkyEye,side*.207,.095,-.77);
   eye.scale.set(.9,1,1);
   const pupil=mesh(fish,eyeGeo,eyeMaterial,side*.255,.104,-.77);
   pupil.scale.set(.48,.55,.51);
   const pectoral=mesh(fish,finGeo,finMaterial,side*.20,-.10,-.03);
   pectoral.scale.x=side*.88;pectoral.rotation.y=side*.15;
  }
  const tailJoint=new THREE.Group();
  tailJoint.position.set(0,-.025,.95);
  tailJoint.rotation.y=body===1?.23:body===2?-.26:0;
  fish.add(tailJoint);
  const tail=mesh(tailJoint,tailGeo,finMaterial);
  if(broken)tail.scale.set(.52,1,.73);
  // Small dorsal fin that follows the body's local orientation.
  const dorsal=mesh(fish,finGeo,finMaterial,0,.20,.13);
  dorsal.rotation.x=.45;dorsal.scale.set(.46,.65,.65);
  for(let i=0;i<5;i++){
   const zMark=-.24+i*.16;
   const mark=mesh(fish,scaleGeo,scaleMaterial,(i%2?-.1:.11),.223-i*.012,zMark);
   mark.scale.set(.80,.18,.58);
  }
  if(broken){
   // A few displaced pieces make this layout genuinely different, not just rotated.
   const loose=mesh(group,tailGeo,finMaterial,x+.31,.035,z+.46);
   loose.rotation.y=yaw+.35;loose.scale.set(.40,1,.39);
   mesh(group,scaleGeo,scaleMaterial,x-.35,.07,z-.32).scale.set(.9,.40,.75);
  }
  return fish;
 }

 // Sims-like diffuse stink: soft radial-alpha sprites, NOT lines or tubes.
 const canvas=document.createElement('canvas');
 canvas.width=96;canvas.height=96;
 const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(48,48,2,48,48,47);
 gradient.addColorStop(0,'rgba(255,255,255,0.78)');
 gradient.addColorStop(.30,'rgba(255,255,255,0.55)');
 gradient.addColorStop(.64,'rgba(255,255,255,0.23)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
 const hazeTexture=new THREE.CanvasTexture(canvas);
 hazeTexture.colorSpace=THREE.SRGBColorSpace;
 const stinkColors=[0x9cad67,0x889c64,0xb1ad70,0x8b9460];

 let variantCounter=0;
 function makeFish(lane,z){
  const group=new THREE.Group();
  group.position.set((lane-1)*2.55,0,z);
  scene.add(group);
  // Explicitly vary BOTH direction (toward pines, volcano, Fiona, away)
  // and which side of the carcass faces the camera (belly/back/side).
  const layouts=[
   [{yaw:Math.PI/2,roll:.10,body:0,scale:1.08}],         // head left toward pines
   [{yaw:-Math.PI/2,roll:-.58,body:1,scale:.99}],         // head right toward volcano
   [{yaw:Math.PI,roll:Math.PI,body:2,scale:1.02}],       // head toward Fiona, belly exposed
   [{yaw:0,roll:Math.PI/2,body:0,scale:1.1}],            // head away, on its side
   [{yaw:2.26,roll:-Math.PI/2,body:1,scale:1.04}],       // diagonal, opposite side exposed
   [{yaw:-2.32,roll:.25,body:3,scale:.97,broken:true}],  // battered, diagonal
   [{yaw:-Math.PI/2,roll:Math.PI,body:2,scale:.69,x:-.32,z:-.34},
    {yaw:.92,roll:-.4,body:1,scale:.68,x:.34,z:.4}]       // two smaller fish
  ];
  const arrangement=layouts[variantCounter++%layouts.length];
  const shiftX=rand(-.12,.12),shiftZ=rand(-.15,.15);
  for(const c of arrangement){
   addFish(group,{
    ...c,
    x:(c.x||0)+shiftX,
    z:(c.z||0)+shiftZ,
    yaw:c.yaw+rand(-.12,.12),
    roll:c.roll+rand(-.09,.09)
   });
  }
  const odor=[];
  const cloudCount=9;
  for(let i=0;i<cloudCount;i++){
   const material=new THREE.SpriteMaterial({
    map:hazeTexture,
    color:stinkColors[i%stinkColors.length],
    transparent:true,
    opacity:rand(.18,.33),
    depthWrite:false,
    depthTest:true,
    fog:false,
    blending:THREE.NormalBlending
   });
   const sprite=new THREE.Sprite(material);
   group.add(sprite);
   odor.push({
    sprite,material,
    phase:((i+rand(0,.55))/cloudCount)%1,
    x:shiftX+rand(-.48,.48),
    z:shiftZ+rand(-.48,.48),
    spread:rand(.8,1.45),
    speed:rand(.72,1.35),
    sway:rand(0,TAU),
    opacity:material.opacity
   });
  }
  group.userData.fishOdor=odor;
  group.userData.dispose=()=>{for(const p of odor)p.material.dispose();};
  // Same lane and hazard type as before: no changes to jumping or hit detection.
  obstacles.push({g:group,lane,type:'fish',z,passed:false});
 }
 function animateFishOdor(group,t){
  const seconds=t*.001;
  for(const p of group.userData.fishOdor||[]){
   const age=(seconds*.38*p.speed+p.phase)%1;
   const softFade=Math.sin(age*Math.PI);
   p.sprite.material.opacity=p.opacity*softFade;
   p.sprite.position.set(
    p.x+Math.sin(seconds*.85+p.sway)*.20+age*.13,
    .35+age*1.55,
    p.z+Math.cos(seconds*.70+p.sway)*.18
   );
   const size=(.56+age*.84)*p.spread;
   p.sprite.scale.set(size*1.35,size*.82,1);
  }
 }
 return {makeFish,animateFishOdor};
}
