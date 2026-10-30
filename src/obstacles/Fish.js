import * as THREE from 'three';

// Procedural cartoon fish hazard: five visual layouts, one unchanged lane collision.
export function createFishFactory(scene,obstacles){
 const bodyGeo=new THREE.SphereGeometry(.55,10,7);
 const headGeo=new THREE.SphereGeometry(.32,9,6);
 const eyeGeo=new THREE.SphereGeometry(.10,8,6);
 const finGeo=new THREE.ConeGeometry(.17,.40,3);
 const strokeGeo=new THREE.BoxGeometry(.025,.14,.025);
 const flakeGeo=new THREE.SphereGeometry(.105,5,4);
 const tailShape=new THREE.Shape();
 tailShape.moveTo(-.07,0);tailShape.lineTo(-.34,.36);tailShape.lineTo(-.25,.53);
 tailShape.lineTo(0,.32);tailShape.lineTo(.25,.53);tailShape.lineTo(.34,.36);
 tailShape.lineTo(.07,0);tailShape.closePath();
 const tailGeo=new THREE.ShapeGeometry(tailShape,2);

 // Shared faceted geometry/materials instead of allocating them per obstacle.
 const skin=new THREE.MeshStandardMaterial({color:0x7f9389,roughness:.8,flatShading:true});
 const belly=new THREE.MeshStandardMaterial({color:0xc3ccb8,roughness:.8,flatShading:true});
 const fin=new THREE.MeshStandardMaterial({color:0x4b5d57,roughness:.9,side:THREE.DoubleSide,flatShading:true});
 const white=new THREE.MeshBasicMaterial({color:0xe5e7ce});
 const ink=new THREE.MeshBasicMaterial({color:0x141b17});
 const flakes=new THREE.MeshStandardMaterial({color:0x9fae99,flatShading:true,roughness:1});
 function part(parent,geo,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=false;parent.add(m);return m;
 }
 function fishModel(parent,{x=0,z=0,angle=0,size=1,bend=0,roll=0,battered=false}={}){
  const root=new THREE.Group();
  root.position.set(x,0,z);root.rotation.y=angle;root.rotation.z=roll;root.scale.setScalar(size);
  parent.add(root);
  const body=part(root,bodyGeo,skin,0,.18,.06);
  body.scale.set(.76,.43,1.12);body.rotation.y=-bend*.10;
  const underside=part(root,bodyGeo,belly,0,.085,-.025);
  underside.scale.set(.64,.16,.96);
  part(root,headGeo,skin,0,.20,-.53).scale.set(.87,.70,.96);
  part(root,headGeo,belly,0,.13,-.79).scale.set(.48,.20,.42);
  part(root,strokeGeo,ink,0,.095,-.92).scale.set(1,.46,1);
  const tailRoot=new THREE.Group();tailRoot.position.set(0,.17,.57);tailRoot.rotation.y=bend;root.add(tailRoot);
  const tail=part(tailRoot,tailGeo,fin);
  tail.rotation.x=-Math.PI/2;tail.rotation.y=battered?.24:0;
  for(const side of [-1,1]){
   part(root,eyeGeo,white,side*.27,.31,-.49).scale.set(1,.88,.87);
   // Cartoon dead-fish X pupils on both cheeks.
   for(const sign of [-1,1]){
    const slash=part(root,strokeGeo,ink,side*.354,.31,-.49);
    slash.rotation.x=sign*Math.PI/4;
   }
   const sideFin=part(root,finGeo,fin,side*.30,.21,.08);
   sideFin.rotation.z=-side*.88;sideFin.rotation.x=Math.PI/2;
  }
  part(root,finGeo,fin,0,.44,.16).scale.set(.82,.95,.9);
  for(let k=0;k<3;k++)part(root,flakeGeo,flakes,(k-1)*.13,.38,.05+k*.19).scale.set(.8,.23,.65);
  if(battered){
   part(parent,finGeo,fin,x+.37,.025,z+.45).rotation.z=Math.PI/2;
   part(parent,flakeGeo,flakes,x-.33,.045,z-.35).scale.set(.75,.25,.7);
  }
  return root;
 }
 // Wavy low-poly "stink" lines float above the fish with independent timing.
 const stinkPath=new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,0,0),new THREE.Vector3(.11,.17,0),
  new THREE.Vector3(-.04,.36,0),new THREE.Vector3(.12,.55,0),
  new THREE.Vector3(-.02,.80,0)
 ]);
 const stinkGeo=new THREE.TubeGeometry(stinkPath,12,.027,4,false);
 const stinkMats=[
  new THREE.MeshBasicMaterial({color:0xb0c984,transparent:true,opacity:.72,depthWrite:false,fog:false}),
  new THREE.MeshBasicMaterial({color:0x7f9d69,transparent:true,opacity:.68,depthWrite:false,fog:false}),
  new THREE.MeshBasicMaterial({color:0xa1ac8b,transparent:true,opacity:.59,depthWrite:false,fog:false})
 ];
 let nextVariant=0;
 function makeFish(lane,z){
  const g=new THREE.Group();g.position.set((lane-1)*2.55,0,z);scene.add(g);
  const variant=nextVariant++%5;
  const jitter=()=>Math.random()-.5;
  const x=jitter()*.32,zOffset=jitter()*.24,angle=jitter()*.22;
  // All fish stay predominantly lengthwise on the planks, as requested.
  if(variant===0)fishModel(g,{x,z:zOffset,angle,size:1.03});
  if(variant===1)fishModel(g,{x,z:zOffset,angle,size:1.0,bend:.55});
  if(variant===2)fishModel(g,{x:x+.05,z:zOffset,angle:angle-.17,size:1.06,bend:-.36,roll:.10});
  if(variant===3)fishModel(g,{x:x-.04,z:zOffset,angle:angle+.13,size:.95,bend:.23,battered:true});
  if(variant===4){
   fishModel(g,{x:x-.32,z:zOffset-.35,angle:angle-.10,size:.68,bend:.28});
   fishModel(g,{x:x+.32,z:zOffset+.37,angle:angle+.13,size:.68,bend:-.29});
  }
  const odor=[];
  for(let i=0;i<3;i++){
   const trail=part(g,stinkGeo,stinkMats[i]);
   const phase=(i/3+Math.random()*.14)%1,baseX=(i-1)*.32+x*.35;
   trail.position.set(baseX,.40,zOffset+(i===1?-.14:.10));
   odor.push({mesh:trail,phase,baseX});
  }
  g.userData.fishOdor=odor;
  obstacles.push({g,lane,type:'fish',z,passed:false});
 }
 function animateFishOdor(group,t){
  for(const trail of group.userData.fishOdor||[]){
   const p=(t*.00040+trail.phase)%1;
   trail.mesh.position.y=.36+p*.70;
   trail.mesh.position.x=trail.baseX+Math.sin(t*.0025+trail.phase*6.28)*.10;
   const f=.63+.37*Math.sin(p*Math.PI);
   trail.mesh.scale.set(f,.7+.3*f,f);
  }
 }
 return {makeFish,animateFishOdor};
}
