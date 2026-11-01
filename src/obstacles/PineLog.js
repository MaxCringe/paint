import * as THREE from 'three';

// A fallen pine held above the road by two broken stumps.
// All three lanes are blocked: Fiona must slide under it, not jump over it.
// Shared geometry/materials keep repeated segments inexpensive.
export function createPineLogFactory(scene, obstacles, trunkMaterial) {
 const bark = new THREE.MeshStandardMaterial({color:0x452818,roughness:1});
 const cutWood = new THREE.MeshStandardMaterial({color:0x99704b,roughness:1});
 const logGeometry = new THREE.CylinderGeometry(.30,.36,8.82,11,6);
 const supportGeometry = new THREE.CylinderGeometry(.32,.47,1.49,9);
 const capGeometry = new THREE.CylinderGeometry(.32,.33,.05,9);
 const knotGeometry = new THREE.SphereGeometry(1,9,7);
 const splinterGeometry = new THREE.ConeGeometry(.12,.56,6);

 function add(parent, geometry, material, x,y,z) {
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
 }

 return function makePineLog(z) {
  const group=new THREE.Group();
  group.position.set(0,0,z);
  // Bottom edge is ~1.55; Fiona's existing slide is ~1.4 high.
  const trunk=add(group,logGeometry,trunkMaterial,0,1.88,0);
  trunk.rotation.z=Math.PI/2;
  // Broken roadside stumps physically support the suspended log.
  for(const x of [-4.34,4.34]){
   add(group,supportGeometry,trunkMaterial,x,.745,.02);
   add(group,capGeometry,cutWood,x,1.49,.02);
   const splinter=add(group,splinterGeometry,trunkMaterial,x+(x<0?.11:-.11),1.62,.16);
   splinter.rotation.z=x<0?-.30:.30;
  }
  // Uneven bark scars and knots distinguish pine from a plain metal bar.
  for(const [x,y,z,s] of [
   [-3.10,2.12,.14,.24],[-1.52,2.13,-.07,.18],
   [.60,2.10,.18,.22],[2.48,2.12,-.14,.26]
  ]){
   const knot=add(group,knotGeometry,bark,x,y,z);
   knot.scale.set(s,.08,s*.52);
  }
  // Fresh broken patches at the ends of the trunk.
  for(const x of [-4.39,4.39]){
   const ring=add(group,capGeometry,cutWood,x,1.88,0);
   ring.rotation.z=Math.PI/2;
   ring.scale.set(1.03,1.8,1.03);
  }
  scene.add(group);
  obstacles.push({g:group,lane:-1,type:'pineLog',z,passed:false});
 };
}
