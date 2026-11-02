// Faceted bough silhouette adapted from the pine-runner-assets AI Studio kit.
// Unlike the simple cone pines, this Scots pine has angular drooping branches.
import * as THREE from 'three';

export function createFacetedBoughGeometry(radius,height,lobes=7,droop=.3){
 const points=Math.max(6,lobes*2),vertices=[0,height,0,0,-droop*.45+.08,0],indices=[];
 for(let i=0;i<points;i++){
  const a=i*Math.PI*2/points,tip=i%2===0;
  const r=radius*(tip?1:.65);
  vertices.push(Math.cos(a)*r,tip?-droop:-droop*.35,Math.sin(a)*r);
 }
 for(let i=0;i<points;i++){
  const now=i+2,next=(i+1)%points+2;
  indices.push(0,next,now,1,now,next);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return geometry;
}
export function createScotsPine(){
 const group=new THREE.Group();
 group.userData.pineArchetype='scots_pine';
 const bark=new THREE.MeshStandardMaterial({color:'#6e3822',flatShading:true,roughness:.88});
 const needles=new THREE.MeshStandardMaterial({color:'#123722',flatShading:true,roughness:.7,side:THREE.DoubleSide});
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.20,.36,3.1,7),bark);
 trunk.position.y=1.55;trunk.castShadow=true;group.add(trunk);
 for(let i=0;i<5;i++){
  const progress=i/5,radius=2.55-progress*1.75;
  const tier=new THREE.Mesh(createFacetedBoughGeometry(radius,1.8,7,.3),needles);
  tier.position.y=1.75+i*.93;
  tier.rotation.y=i*.8;
  tier.castShadow=true;group.add(tier);
 }
 // Understory bare stubs for the recognizable Scots-pine silhouette.
 const stubGeo=new THREE.CylinderGeometry(.04,.075,.45,5);
 for(let i=0;i<3;i++){
  const stub=new THREE.Mesh(stubGeo,bark);
  stub.position.set((i-1)*.13,.54+i*.46,0);
  stub.rotation.z=i%2===0?1.16:-1.16;
  group.add(stub);
 }
 const shadowGeo=new THREE.CircleGeometry(2.35,8);
 shadowGeo.rotateX(-Math.PI/2);
 const shadow=new THREE.Mesh(shadowGeo,new THREE.MeshBasicMaterial({
  color:0x0a1014,transparent:true,opacity:.45,depthWrite:false
 }));
 shadow.position.y=.015;group.add(shadow);
 return group;
}
