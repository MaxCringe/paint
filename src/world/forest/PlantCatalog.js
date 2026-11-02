import * as THREE from 'three';
import {createLowPolyPine} from '../LowPolyPine.js';
import {generateFernGeometry,createFernMaterial} from '../createLowPolyFern.js';
import {GRASS_VARIANTS,generateGrassClumpGeometry,createGrassMaterial} from './GrassModels.js';
import {createScotsPine} from './FacetedPine.js';

// The only place to register a NEW plant type. Supply a family, weight,
// prototype factory, and optional size/wind behavior; the rest of the forest
// (recycling, instance batches, placement) needs no changes.
export function registerDefaultForestPlants(registry){
 const pineWeights={
  grove_cluster:31,runner_spruce_pro:19,taiga_spruce:18,
  dead_snag:12,sequoia_giant:6,scots_pine:14
 };
 for(const [name,weight] of Object.entries(pineWeights)){
  registry.register({
   id:'pine:'+name,family:'pine',weight,templates:1,windKind:'pine',
   create:()=>name==='scots_pine'?createScotsPine():createLowPolyPine(name)
  });
 }
 const fernMat=createFernMaterial({roughness:.92,metalness:0,windEnabled:false});
 for(const [variant,weight] of Object.entries({lush:55,young:29,withered:16})){
  registry.register({
   id:'fern:'+variant,family:'fern',weight,templates:variant==='lush'?4:3,
   windKind:'fern-static',
   create:(template)=>{
    const seed=1307+['lush','young','withered'].indexOf(variant)*1019+template*257;
    const {geometry}=generateFernGeometry({variant,seed,curvature:.65,spread:.85});
    return new THREE.Mesh(geometry,fernMat);
   }
  });
 }
 const grassMat=createGrassMaterial();
 for(const [variant,weight] of Object.entries({forest:40,wild:19,young:16,dry:15,scorched:10})){
  if(!GRASS_VARIANTS[variant])throw new Error('Unknown grass variant '+variant);
  registry.register({
   id:'grass:'+variant,family:'grass',weight,templates:2,windKind:'grass',
   create:(template)=>new THREE.Mesh(
    generateGrassClumpGeometry(variant,2023+template*577+Object.keys(GRASS_VARIANTS).indexOf(variant)*1099),
    grassMat
   )
  });
 }
 return registry;
}
