import * as THREE from 'three';
import {createForestRandom} from './PlantRegistry.js';

// Stationary, distant treeline. The moving forest fades out in scene fog
// before the un-fogged mountains at z=-77; these low-cost silhouettes bridge
// that visual gap without hundreds of extra wind/recycle updates.
// Keep the volcanic crater (x about 30) visible above the tree crowns.
export const DISTANT_FOREST_LAYERS=Object.freeze([
 Object.freeze({z:-54,inner:9.5,outer:67,step:4.2,minHeight:2.7,maxHeight:5.9}),
 Object.freeze({z:-61.5,inner:9.2,outer:78,step:3.5,minHeight:3.1,maxHeight:7.4}),
 Object.freeze({z:-69,inner:9.5,outer:87,step:3.9,minHeight:3.5,maxHeight:8.4})
]);

export function createDistantForestBackdrop(scene,{seed=1337}={}){
 const rng=createForestRandom(seed);
 const rand=(a,b)=>a+(b-a)*rng();
 const vertices=[],colors=[],treeInfo=[];
 const palettes=[
  [new THREE.Color('#261018'),new THREE.Color('#34151c'),new THREE.Color('#30131b')],
  [new THREE.Color('#32131d'),new THREE.Color('#3c1923'),new THREE.Color('#35141e')],
  [new THREE.Color('#431923'),new THREE.Color('#4b1b2a'),new THREE.Color('#3e1725')]
 ];
 function triangle(a,b,c,color){
  for(const p of [a,b,c]){
   vertices.push(p[0],p[1],p[2]);
   colors.push(color.r,color.g,color.b);
  }
 }
 function quad(a,b,c,d,color){
  triangle(a,b,c,color);triangle(a,c,d,color);
 }
 function crown(x,z,h,layer,volcanoSide){
  const palette=palettes[layer];
  const trunkWidth=h*rand(.025,.043);
  const crownWidth=h*rand(.16,.215);
  // An irregular trunk visible between the tiers.
  quad([x-trunkWidth,0,z],[x+trunkWidth,0,z],
   [x+trunkWidth,h*.54,z],[x-trunkWidth,h*.54,z],palette[0]);
  const count=3+Math.floor(rng()*2);
  const lean=rand(-.10,.10)*h;
  for(let tier=0;tier<count;tier++){
   const t=tier/count,base=h*(.13+.61*t);
   const tip=h*Math.min(1,.57+.54*t);
   const width=crownWidth*(1-t*.63)*rand(.88,1.12);
   const cx=x+lean*t;
   const left=[cx-width,base,z],right=[cx+width,base+rand(-.08,.06)*h,z];
   const peak=[cx+rand(-.13,.13)*width,tip,z];
   const mid=[cx+width*.12,base+h*.10,z];
   triangle(left,peak,mid,palette[(tier+layer)%palette.length]);
   triangle(mid,peak,right,palette[(tier+1+layer)%palette.length]);
  }
  treeInfo.push({x,z,height:h,canopyWidth:crownWidth,layer,volcanoSide});
 }
 for(let layer=0;layer<DISTANT_FOREST_LAYERS.length;layer++){
  const band=DISTANT_FOREST_LAYERS[layer],palette=palettes[layer];
  for(const side of [-1,1]){
   // Low ragged undergrowth fills the ground between trunks, avoiding a
   // perfectly horizontal strip; the center corridor remains completely open.
   for(let d=band.inner;d<band.outer;d+=2.8){
    const next=Math.min(band.outer,d+2.8);
    const x=side*d,nx=side*next;
    const volcanoSide=side===1&&d>22&&d<45;
    const top=volcanoSide?rand(.12,.32):rand(.3,.85);
    quad([x,-1.3,band.z],[nx,-1.3,band.z],
     [nx,top*rand(.74,1.18),band.z],[x,top,band.z],palette[0]);
   }
   // Several offset rows, never regularly repeated cones. The active trees
   // already handle near-camera parallax; these shapes are distant scenery.
   for(let d=band.inner+rand(.1,1.8);d<band.outer;d+=band.step*rand(.76,1.32)){
    const x=side*d+rand(-.55,.55);
    const z=band.z+rand(-.65,.65);
    const volcanoSide=side===1&&d>22&&d<45;
    // Below the volcano's shoulders, not in front of its glowing crater.
    const h=volcanoSide?rand(.9,2.05):rand(band.minHeight,band.maxHeight);
    crown(x,z,h,layer,volcanoSide);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeBoundingSphere();
 const material=new THREE.MeshBasicMaterial({
  vertexColors:true,side:THREE.DoubleSide,fog:false,
  depthWrite:true
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='KnottyPineDistantForest';
 mesh.frustumCulled=false;
 mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData.trees=treeInfo;
 scene.add(mesh);
 return {mesh,treeCount:treeInfo.length,drawCalls:1,dispose(){
  scene.remove(mesh);geometry.dispose();material.dispose();
 }};
}
