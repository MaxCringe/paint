import * as THREE from 'three';

// The five authored AI Studio forest archetypes. All dimensions/colors are
// kept in model space; World.js handles the forest's tall/slim visual scale.
const PINE_SPECS=Object.freeze({
 grove_cluster: {bark:'#582b1b',foliage:'#143823',top:.242,bottom:.528,trunkHeight:4.8,
  sides:6,tiers:4,radius:2.86,tierHeight:1.90,firstY:1.40,stepY:.92,shadow:2.64},
 runner_spruce_pro: {bark:'#5c2d1d',foliage:'#143823',top:.231,bottom:.504,trunkHeight:5.52,
  sides:7,tiers:5,radius:2.73,tierHeight:2.18,firstY:1.61,stepY:1.06,shadow:2.52},
 dead_snag: {bark:'#4d3228',foliage:'#143823',top:.187,bottom:.408,trunkHeight:4.56,
  sides:6,tiers:0,radius:2.21,tierHeight:1.80,firstY:1.33,stepY:.87,shadow:2.04},
 sequoia_giant: {bark:'#7a311b',foliage:'#113320',top:.33,bottom:.72,trunkHeight:7.68,
  sides:8,tiers:6,radius:3.90,tierHeight:3.04,firstY:2.24,stepY:1.47,shadow:3.60},
 taiga_spruce: {bark:'#4f281b',foliage:'#0e2b1b',top:.209,bottom:.456,trunkHeight:5.76,
  sides:6,tiers:6,radius:2.47,tierHeight:2.28,firstY:1.68,stepY:1.10,shadow:2.28}
});
export const PINE_ARCHETYPES=Object.freeze(Object.keys(PINE_SPECS));

// Near the road: mostly shorter grove pines, no tall taiga/giant archetypes.
// Tall silhouettes become gradually more common deeper in the forest.
export const FOREST_PINE_WEIGHTS=Object.freeze({
 near:Object.freeze({grove_cluster:72,runner_spruce_pro:16,dead_snag:12,sequoia_giant:0,taiga_spruce:0}),
 middle:Object.freeze({grove_cluster:45,runner_spruce_pro:22,dead_snag:10,sequoia_giant:0,taiga_spruce:23}),
 far:Object.freeze({grove_cluster:30,runner_spruce_pro:15,dead_snag:10,sequoia_giant:8,taiga_spruce:37})
});

// Separate scale envelopes make the tallest tree crowns distant landmarks.
// Keep the same X/Z width variation, recycling and batched rendering.
export const FOREST_PINE_DEPTH_SIZE=Object.freeze({
 near:Object.freeze({maxScale:1.25,heightFactor:.77,minHeight:.86,heightRange:.24}),
 middle:Object.freeze({maxScale:1.4,heightFactor:.86,minHeight:.9,heightRange:.3}),
 far:Object.freeze({maxScale:Infinity,heightFactor:1,minHeight:.98,heightRange:.47})
});

export function forestPineScale(depth,scale,randomValue=Math.random()){
 const cfg=FOREST_PINE_DEPTH_SIZE[depth]||FOREST_PINE_DEPTH_SIZE.near;
 const roll=Math.min(1,Math.max(0,Number.isFinite(randomValue)?randomValue:0));
 const base=Math.min(Math.max(0,scale),cfg.maxScale);
 return {width:base,height:base*cfg.heightFactor*(cfg.minHeight+roll*cfg.heightRange)};
}

export function chooseForestPine(depth='near',randomValue=Math.random()){
 const weights=FOREST_PINE_WEIGHTS[depth]||FOREST_PINE_WEIGHTS.near;
 let roll=Math.min(1-Number.EPSILON,Math.max(0,Number.isFinite(randomValue)?randomValue:0))*100;
 for(const name of PINE_ARCHETYPES){
  roll-=weights[name];
  if(roll<0)return name;
 }
 return 'grove_cluster';
}

export function createLowPolyPine(archetype='grove_cluster'){
 const spec=PINE_SPECS[archetype];
 if(!spec)throw new RangeError('Unknown pine archetype: '+archetype);
 const tree=new THREE.Group();
 tree.userData.pineArchetype=archetype;

 const barkMat=new THREE.MeshStandardMaterial({
  color:spec.bark,roughness:.88,metalness:.04,flatShading:true
 });
 const trunk=new THREE.Mesh(
  new THREE.CylinderGeometry(spec.top,spec.bottom,spec.trunkHeight,spec.sides),barkMat
 );
 trunk.position.y=spec.trunkHeight/2;
 trunk.castShadow=true;
 tree.add(trunk);

 // One reusable tier geometry per archetype; instance batching reuses it
 // across every tree in the forest without creating hundreds of materials.
 if(spec.tiers>0){
  const foliageMat=new THREE.MeshStandardMaterial({
   color:spec.foliage,roughness:.68,metalness:.02,flatShading:true
  });
  const tierGeometry=new THREE.ConeGeometry(1,spec.tierHeight,spec.sides);
  for(let t=0;t<spec.tiers;t++){
   const progress=t/spec.tiers;
   const radius=spec.radius*(1-progress*.58);
   const tier=new THREE.Mesh(tierGeometry,foliageMat);
   tier.scale.set(radius,1,radius);
   tier.position.y=spec.firstY+t*spec.stepY+spec.tierHeight/2;
   tier.rotation.y=t*Math.PI/3;
   tier.castShadow=true;
   tree.add(tier);
  }
 }else{
  // The reference dead_snag has no foliage. A few inexpensive broken,
  // faceted branch stubs keep its silhouette readable as a dead pine.
  const branchGeometry=new THREE.CylinderGeometry(.045,.09,1,5);
  for(let i=0;i<6;i++){
   const row=Math.floor(i/2),side=i%2===0?1:-1;
   const length=[1.04,.84,.62][row];
   const branch=new THREE.Mesh(branchGeometry,barkMat);
   branch.position.set(side*(.23+length*.30),1.48+row*.96,(row-1)*.11);
   branch.rotation.z=-side*1.04;
   branch.rotation.y=(i%3-1)*.16;
   branch.scale.y=length;
   branch.castShadow=true;
   tree.add(branch);
  }
 }

 const shadowGeo=new THREE.CircleGeometry(spec.shadow,8);
 shadowGeo.rotateX(-Math.PI/2);
 const shadowMat=new THREE.MeshBasicMaterial({
  color:0x0a1014,transparent:true,opacity:.45,depthWrite:false
 });
 const shadow=new THREE.Mesh(shadowGeo,shadowMat);
 shadow.position.y=.015;
 tree.add(shadow);
 return tree;
}
