import * as THREE from 'three';

// AI Studio grove_cluster pine, adapted from TypeScript to the game's JavaScript.
// The model stays at its original size and origin. World.js scales only its
// instanced forest copies, preserving the approved forest density and road view.
export function createLowPolyPine(){
 const tree=new THREE.Group();

 const barkMat=new THREE.MeshStandardMaterial({
  color:'#582b1b',roughness:.88,metalness:.04,flatShading:true
 });
 const foliageMat=new THREE.MeshStandardMaterial({
  color:'#143823',roughness:.68,metalness:.02,flatShading:true
 });

 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.242,.528,4.8,6),barkMat);
 trunk.position.y=2.4;
 trunk.castShadow=true;
 tree.add(trunk);

 // Shared geometry/material: four cone tiers, one instanced draw batch in World.js.
 const tierGeometry=new THREE.ConeGeometry(1,1.9,6);
 const tierCount=4;
 for(let t=0;t<tierCount;t++){
  const prog=t/tierCount;
  const radius=2.86*(1-prog*.58);
  const tier=new THREE.Mesh(tierGeometry,foliageMat);
  tier.scale.set(radius,1,radius);
  tier.position.y=1.4+t*.92+1.9/2;
  tier.rotation.y=t*Math.PI/3;
  tier.castShadow=true;
  tree.add(tier);
 }

 const shadowGeo=new THREE.CircleGeometry(2.64,8);
 shadowGeo.rotateX(-Math.PI/2);
 const shadowMat=new THREE.MeshBasicMaterial({
  color:0x0a1014,transparent:true,opacity:.45,depthWrite:false
 });
 const shadow=new THREE.Mesh(shadowGeo,shadowMat);
 shadow.position.y=.015;
 tree.add(shadow);

 return tree;
}
