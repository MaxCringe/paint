// Adapted from the owner-supplied procedural grass generator: curved faceted
// 3D blades, five color/shape variants, seeded templates and vertex gradients.
import * as THREE from 'three';
import {createForestRandom} from './PlantRegistry.js';

export const GRASS_VARIANTS=Object.freeze({
 forest:{count:[14,20],height:[.85,1.25],width:[.045,.065],radius:[.22,.36],bend:[.35,.6],droop:.4,segments:3,colors:['#142a18','#2b5825','#467f39']},
 wild:{count:[10,16],height:[1.35,1.9],width:[.035,.05],radius:[.35,.55],bend:[.65,1.1],droop:.75,segments:4,colors:['#112417','#385637','#648951']},
 young:{count:[8,14],height:[.35,.6],width:[.04,.06],radius:[.12,.22],bend:[.15,.3],droop:.2,segments:2,colors:['#1b3d20','#408638','#6dc452']},
 dry:{count:[12,18],height:[.75,1.3],width:[.04,.06],radius:[.24,.42],bend:[.45,.85],droop:.55,segments:3,colors:['#382816','#8b6e39','#c6aa66']},
 scorched:{count:[9,15],height:[.45,.85],width:[.04,.065],radius:[.2,.34],bend:[.35,.7],droop:.45,segments:3,colors:['#121213','#282320','#6c2f1b']}
});
const between=(rng,a)=>a[0]+rng()*(a[1]-a[0]);

export function generateGrassClumpGeometry(variant='forest',seed=1337){
 const config=GRASS_VARIANTS[variant];
 if(!config)throw new RangeError('Unknown grass type: '+variant);
 const rng=createForestRandom(seed),positions=[],colors=[],indices=[];
 const palette=config.colors.map(c=>new THREE.Color(c));
 const blades=Math.round(between(rng,config.count));
 const color=new THREE.Color();
 function vertex(x,y,z,t,jitter=0){
  const index=positions.length/3;
  positions.push(x,y,z);
  if(t<.55)color.copy(palette[0]).lerp(palette[1],t/.55);
  else color.copy(palette[1]).lerp(palette[2],(t-.55)/.45);
  colors.push(Math.min(1,Math.max(0,color.r+jitter)),
   Math.min(1,Math.max(0,color.g+jitter*.65)),
   Math.min(1,Math.max(0,color.b+jitter*.5)));
  return index;
 }
 for(let b=0;b<blades;b++){
  const angle=b/blades*Math.PI*2+(rng()-.5)*.7;
  const radius=Math.pow(rng(),.7)*between(rng,config.radius);
  const bx=Math.cos(angle)*radius,bz=Math.sin(angle)*radius;
  const direction=Math.atan2(bz,bx)+(rng()-.5)*.9;
  const dx=Math.cos(direction),dz=Math.sin(direction),rx=-dz,rz=dx;
  const height=between(rng,config.height)*(.8+rng()*.4);
  const width=between(rng,config.width);
  const bend=between(rng,config.bend)*(.65+rng()*.7);
  const jitter=(rng()-.5)*.10;
  const levels=[];
  for(let i=0;i<config.segments;i++){
   const t=i/config.segments;
   const cy=Math.max(0,height*t-config.droop*height*Math.pow(t,2.5));
   const x=bx+dx*bend*Math.pow(t,1.4);
   const z=bz+dz*bend*Math.pow(t,1.4);
   const w=width*Math.max(.08,1-Math.pow(t,1.2));
   levels.push([
    vertex(x-rx*w*.5-dx*w*.25,cy,z-rz*w*.5-dz*w*.25,t,jitter),
    vertex(x+dx*w*.35,cy,z+dz*w*.35,t,jitter),
    vertex(x+rx*w*.5-dx*w*.25,cy,z+rz*w*.5-dz*w*.25,t,jitter)
   ]);
  }
  const tip=vertex(bx+dx*bend*1.05,Math.max(.05,height*(1.02-config.droop*.70)),bz+dz*bend*1.05,1,jitter);
  for(let j=0;j<levels.length-1;j++){
   const [a,m,c]=levels[j],[d,n,e]=levels[j+1];
   indices.push(a,m,n,a,n,d,m,c,e,m,e,n);
  }
  const [a,m,c]=levels[levels.length-1];
  indices.push(a,m,tip,m,c,tip);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
export function createGrassMaterial(){
 return new THREE.MeshStandardMaterial({
  vertexColors:true,side:THREE.DoubleSide,flatShading:true,roughness:.92,metalness:0
 });
}
