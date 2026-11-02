import * as THREE from 'three';
import {PlantRegistry,createForestRandom} from './PlantRegistry.js';
import {registerDefaultForestPlants} from './PlantCatalog.js';

// Transform-only proxies keep the current infinite-runner recycling contract;
// every mesh of every plant family is drawn through a shared InstancedMesh.
export function createForestGenerator(scene,{seed=Math.floor(Math.random()*0xffffffff),configure=registerDefaultForestPlants}={}){
 const rng=createForestRandom(seed);
 const registry=new PlantRegistry();
 configure(registry);
 const prototypes=new Map(),batches=new Map(),plants=[],instanceMeshes=[];
 const rand=(a,b)=>a+(b-a)*rng();
 function prototypeFor(spec,index){
  const key=spec.id+'@'+index;
  if(!prototypes.has(key)){
   const prototype=spec.create(index);
   if(!prototype?.isObject3D)throw new Error('Forest plant must return a Three.js Object3D: '+spec.id);
   prototype.updateMatrixWorld(true);
   prototypes.set(key,prototype);
  }
  return prototypes.get(key);
 }
 function applySize(group,family,species,baseScale){
  const scale=baseScale*(species==='pine:sequoia_giant'?rand(.78,.96):1);
  if(family==='pine'){
   group.scale.set(scale*.50*rand(.80,1.18),scale*.82*rand(.75,1.45),scale*.50*rand(.80,1.18));
  }else if(family==='fern'){
   const factor=species==='fern:young'?rand(.55,1.07):species==='fern:withered'?rand(.73,1.21):rand(.82,1.42);
   group.scale.set(scale*factor*rand(.85,1.15),scale*factor,scale*factor*rand(.85,1.15));
  }else{
   group.scale.set(scale*rand(.80,1.16),scale*rand(.83,1.20),scale*rand(.80,1.16));
  }
 }
 function plant(family,x,z,baseScale,recycleLength,forcedSpecies){
  const spec=forcedSpecies?registry.get(forcedSpecies):registry.choose(family,rng());
  if(!spec||spec.family!==family)throw new Error('Unknown forest species '+forcedSpecies);
  const prototype=prototypeFor(spec,Math.floor(rng()*spec.templates));
  const group=new THREE.Group();
  group.position.set(x,family==='pine'?0:family==='fern'?-.095:-.105,z);
  group.rotation.y=rand(0,Math.PI*2);
  applySize(group,family,spec.id,baseScale);
  group.userData.recycleLength=recycleLength;
  group.userData.windKind=spec.windKind;
  group.userData.plantSpecies=spec.id;
  const materials=new Set();
  // Prototype matrices become the local (unchanging) transform of each
  // instance node; only the root group is moved when wind/recycling occurs.
  prototype.traverse(node=>{
   if(!node.isMesh)return;
   const part=new THREE.Object3D();
   part.matrixAutoUpdate=false;
   part.matrix.copy(node.matrixWorld);
   group.add(part);
   const key=node.geometry.uuid+'|'+node.material.uuid;
   if(!batches.has(key))batches.set(key,{
    geometry:node.geometry,material:node.material,parts:[],mesh:null
   });
   batches.get(key).parts.push(part);
   materials.add(node.material);
  });
  if(family==='grass')group.userData.windMaterials=[...materials];
  // Every recycle occurs behind the camera. Vary width, height, yaw and
  // horizontal offset so the world does not repeat the same forest every loop.
  group.userData.onForestRecycle=()=>{
   group.position.x=Math.sign(group.position.x||1)*Math.max(family==='grass'?GRASS_DENSITY.minX:4.55,Math.abs(group.position.x)+rand(-1.15,1.15));
   group.rotation.y=rand(0,Math.PI*2);
   applySize(group,family,spec.id,baseScale*rand(.86,1.14));
  };
  scene.add(group);
  plants.push(group);
  return group;
 }
 function finish(){
  if(instanceMeshes.length)return;
  for(const batch of batches.values()){
   const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.parts.length);
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   mesh.frustumCulled=false; // moving instances must never use stale bounds
   mesh.castShadow=false;mesh.receiveShadow=true;
   batch.mesh=mesh;scene.add(mesh);instanceMeshes.push(mesh);
  }
  update();
 }
 function update(){
  for(const group of plants)group.updateMatrixWorld(true);
  for(const batch of batches.values()){
   if(!batch.mesh)continue;
   for(let i=0;i<batch.parts.length;i++)batch.mesh.setMatrixAt(i,batch.parts[i].matrixWorld);
   batch.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 function dispose(){
  for(const group of plants)scene.remove(group);
  for(const mesh of instanceMeshes)scene.remove(mesh);
  const geos=new Set(),mats=new Set();
  for(const batch of batches.values()){geos.add(batch.geometry);mats.add(batch.material);}
  for(const geometry of geos)geometry.dispose();
  for(const material of mats)material.dispose();
  plants.length=0;instanceMeshes.length=0;batches.clear();prototypes.clear();
 }
 return {
  registry,plant,finish,update,dispose,plants,
  getStats:()=>({plants:plants.length,drawCalls:instanceMeshes.length,species:registry.species.size})
 };
}

// Layout lives outside World.js, so placement density/patches and new plant
// families can evolve without changing the game or rendering pipeline.
// Tunable density budget: many tufts, but a fixed pool of recycled instances.
// Patches stay irregular and the road edge stays clear.
// Add a moderate number of real, recycled pine instances along the sides.
// Species, heights and crown widths still follow the wild-forest randomizer.
export const SIDE_PINE_DENSITY=Object.freeze({
 midChance:.52,
 outerChance:.50,
 midX:[8.4,13.5],
 outerX:[13.5,27.0]
});

export const GRASS_DENSITY=Object.freeze({
 spacing:1.8,
 rows:92,
 vergeChance:.94,
 colonyChance:.65,
 outerChance:.5,
 minX:5.35
});

export function populateForest(generator,{seed=1337}={}){
 const rng=createForestRandom(seed),rand=(a,b)=>a+(b-a)*rng();
 const add=(family,x,z,size,loop,species)=>generator.plant(family,x,z,size,loop,species);
 // The existing forest envelope, but independently jittered left/right trees:
 // all pine species have a chance everywhere, not sorted by distance.
 const roadsideSpacing=4,roadsideCount=39,roadsideLoop=(roadsideCount-1)*roadsideSpacing+16;
 for(let i=0;i<roadsideCount;i++){
  const z=-i*roadsideSpacing-4+rand(-1.3,1.3);
  add('pine',-rand(4.95,6.3),z,rand(.66,1.48),roadsideLoop);
  add('pine',rand(4.95,6.3),z+rand(-1.8,1.8),rand(.74,1.44),roadsideLoop);
  // Extra trees sit between existing rows, filling the visible side gaps.
  for(const side of [-1,1]){
   if(rng()<SIDE_PINE_DENSITY.midChance){
    add('pine',side*rand(...SIDE_PINE_DENSITY.midX),
     z-roadsideSpacing*.48+rand(-1.15,1.15),rand(.62,1.24),roadsideLoop);
   }
  }
  if(i%2===0){
   add('pine',-rand(8,10.1),z-2.25+rand(-1.5,1.5),rand(.72,1.64),roadsideLoop);
   add('pine',rand(8,10.1),z-2.25+rand(-1.5,1.5),rand(.72,1.64),roadsideLoop);
  }
 }
 const farSpacing=3.8,farCount=44,farLoop=(farCount-1)*farSpacing+21;
 for(let i=0;i<farCount;i++){
  const z=-i*farSpacing-9+rand(-1.1,1.1);
  add('pine',-rand(13,22),z,rand(.65,1.66),farLoop);
  add('pine',rand(13,22),z+rand(-2.1,2.1),rand(.65,1.66),farLoop);
  // Real pine silhouettes for the outer forest, no static horizon backdrop.
  for(const side of [-1,1]){
   if(rng()<SIDE_PINE_DENSITY.outerChance){
    add('pine',side*rand(...SIDE_PINE_DENSITY.outerX),
     z-farSpacing*.5+rand(-1.4,1.4),rand(.64,1.3),farLoop);
   }
  }
  if(i%3===0){
   add('pine',-rand(24,31),z-1.7+rand(-1.5,1.5),rand(.62,1.44),farLoop);
   add('pine',rand(24,31),z-1.7+rand(-1.5,1.5),rand(.62,1.44),farLoop);
  }
 }
 // Fern colonies share a species most of the time, with occasional outsiders.
 const fernSpacing=2.95,fernCount=52,fernLoop=(fernCount-1)*fernSpacing+15.5;
 for(let i=0;i<fernCount;i++){
  const z=-i*fernSpacing-3.5+rand(-1.3,1.3);
  if(rng()<.61)add('fern',-rand(5.15,8.35),z+rand(-1.8,1.8),1,fernLoop);
  if(rng()<.61)add('fern',rand(5.15,8.35),z+rand(-1.8,1.8),1,fernLoop);
  if(rng()<.52){
   const side=rng()<.5?-1:1;
   const colony=generator.registry.choose('fern',rng()).id;
   for(let j=0;j<1+Math.floor(rng()*3);j++){
    add('fern',side*rand(5.4,14),z+rand(-2.1,2.1),1,fernLoop,rng()<.8?colony:undefined);
   }
  }
 }
 // Fill both forest verges with mixed-height grass, and add loose
 // multi-tuft colonies. Patches are lopsided, not repeating paired rows.
 // All 3D tufts share ten cached geometries and the same five material families.
 const grassSpacing=GRASS_DENSITY.spacing;
 const grassCount=GRASS_DENSITY.rows;
 const grassLoop=(grassCount-1)*grassSpacing+19;
 const addGrass=(side,x,z,scale,species)=>add(
  'grass',side*Math.max(GRASS_DENSITY.minX,x),z,scale,grassLoop,species
 );
 for(let i=0;i<grassCount;i++){
  const z=-i*grassSpacing-2.5+rand(-1.7,1.7);
  for(const side of [-1,1]){
   // Continuous soft undergrowth beside the road, with small natural gaps.
   if(rng()<GRASS_DENSITY.vergeChance){
    addGrass(side,rand(5.35,9.0),z+rand(-1.5,1.5),rand(.3,.92));
   }
   if(rng()<GRASS_DENSITY.colonyChance){
    const centerX=rand(6.4,13.5);
    const centerZ=z+rand(-2.1,2.1);
    const colony=generator.registry.choose('grass',rng()).id;
    // A colony holds 2-5 tufts; some are another color or growth stage.
    const count=2+Math.floor(rng()*4);
    for(let j=0;j<count;j++){
     const species=rng()<.72?colony:undefined;
     addGrass(side,centerX+rand(-1.65,1.65),centerZ+rand(-2.0,2.0),
      rand(.27,1.05),species);
    }
   }
  }
  // Scattered larger patches among distant pines, not just by the road.
  if(rng()<GRASS_DENSITY.outerChance){
   const side=rng()<.5?-1:1;
   const species=generator.registry.choose('grass',rng()).id;
   const center=rand(11.5,19);
   for(let j=0,n=2+Math.floor(rng()*3);j<n;j++){
    addGrass(side,center+rand(-1.7,1.7),z+rand(-2.8,2.8),
     rand(.34,1.12),rng()<.65?species:undefined);
   }
  }
 }
 generator.finish();
 return generator;
}
