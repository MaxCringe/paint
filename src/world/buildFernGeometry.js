import * as THREE from 'three';

// Builds reusable procedural geometry for fern clumps in the forest.
export function buildFernGeometry(){
 const positions=[],colors=[];
 const palette=[0x286b32,0x39853b,0x4b9747,0x347a34,0x619d4d];
 function triangle(a,b,c,color){
  const col=new THREE.Color(color);
  for(const p of [a,b,c]){positions.push(p.x,p.y,p.z);colors.push(col.r,col.g,col.b)}
 }
 function quad(a,b,c,d,color){triangle(a,b,c,color);triangle(a,c,d,color)}
 const frondCount=9, leafletPairs=7;
 for(let f=0;f<frondCount;f++){
  const angle=f/frondCount*Math.PI*2+Math.sin(f*2.1)*.13;
  const radial=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
  const tangent=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
  const stemPoint=t=>{
   const r=.07+.88*t;
   return new THREE.Vector3(radial.x*r,.025+Math.sin(t*Math.PI*.78)*.62-.11*t,radial.z*r);
  };
  // Thin, gently arched central rib for each frond.
  for(let k=0;k<9;k++){
   const p0=stemPoint(k/9),p1=stemPoint((k+1)/9);
   const w=.0085,side=new THREE.Vector3(tangent.x*w,.003,tangent.z*w);
   quad(p0.clone().sub(side),p0.clone().add(side),p1.clone().add(side),p1.clone().sub(side),0x729849);
  }
  for(let j=0;j<leafletPairs;j++){
   const t=.14+j*.105,base=stemPoint(t);
   const len=.255*(1-t*.48);
   for(const sign of [-1,1]){
    const mid=base.clone().addScaledVector(tangent,sign*len*.57).addScaledVector(radial,.025).add(new THREE.Vector3(0,-len*.16,0));
    const tip=base.clone().addScaledVector(tangent,sign*len).addScaledVector(radial,.045).add(new THREE.Vector3(0,-len*.38,0));
    const wing=radial.clone().multiplyScalar(len*.19).add(new THREE.Vector3(0,len*.13,0));
    const shade=palette[(j+f+(sign>0?1:0))%palette.length];
    triangle(base,mid.clone().add(wing),tip,shade);
    triangle(base,tip,mid.clone().sub(wing),shade);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 return geometry;
}
