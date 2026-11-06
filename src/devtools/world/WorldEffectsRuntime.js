import {defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {LAVA_RIVER_AUTHORING} from '../../systems/fire/LavaRiverAuthored.js';
import * as THREE from 'three';
import {createEditableFire} from './EditableFire.js';
import {getPineFireProfile} from '../../systems/fire/ForestFireStudio.js';
import {PINE_SPECIES,newAnchor,upgradePreset,clonePreset,readEffectPreset} from './FirePreset.js';

// This controller is also loaded in normal play when an authored preset exists.
// It owns the only effect batches; opening the UI never creates a second engine.
export function createWorldEffectsRuntime({scene,forest,seed,camera,renderer,getRivers,getBurningPlants,defaultFireObjects,preset:initial,getWorldOffset=()=>0}){
 const defaults=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(key=>[key,getPineFireProfile(key).anchors.map(a=>newAnchor([a.x,a.y,a.z],a.size))])),deck:[]});
 defaults.deck=clonePreset(LAVA_RIVER_AUTHORING.deck);
 defaults.river=clonePreset(LAVA_RIVER_AUTHORING.river);
 let preset=initial??readEffectPreset()??clonePreset(defaults);
 const lavaWorldIds=new Set(LAVA_RIVER_AUTHORING.river.map(a=>a.id));
 const fire=createEditableFire(scene),worldRoot=new THREE.Group();worldRoot.name='AuthoredWorldEffects';scene.add(worldRoot);
 const cache=new WeakMap();
 function sourceFor(root,key=root.userData.plantSpecies,boundary=root.userData.fireBoundary){
  if(cache.has(root))return cache.get(root);
  const deck=!!boundary,id=deck?'deck':'plant:'+root.userData.plantId;
  const source={root,height:deck?1:getPineFireProfile(key).height,key:deck?'deck':key,boundary,id,binding:deck?{kind:'deck',seed}:{kind:'plant',seed,id:root.userData.plantId,species:key,template:root.userData.plantTemplate}};
  cache.set(root,source);return source;
 }
 const world={root:worldRoot,key:'world',id:'world',world:true};
 // Unlike deck edge anchors, river effects are stored in the river group's
 // local XYZ space, so their full shape remains unchanged on every crossing.
 const riverSourceFor=root=>({root,key:'river',id:'river',height:1});
 function matches(entry,source){return entry&&entry.binding.seed===seed&&(source.boundary||entry.binding.species===source.key&&entry.binding.template===source.binding.template);}
 function anchorsFor(source,mutable=false){
  if(source.id==='world')return preset.world;
  if(source.id==='river')return preset.river;
  const entry=preset.objects[source.id];
  if(matches(entry,source))return entry.anchors;
  const inherited=source.boundary?preset.deck:preset.plants[source.key]??[];
  if(mutable){preset.objects[source.id]={binding:clonePreset(source.binding),anchors:clonePreset(inherited),cycle:defaultBurnCycle()};return preset.objects[source.id].anchors;}
  return inherited;
 }
 function cycleFor(source,mutable=false){if(source.id==='world'||source.id==='river')return defaultBurnCycle();if(mutable)anchorsFor(source,true);const entry=preset.objects[source.id];return matches(entry,source)?(entry.cycle??(mutable?(entry.cycle=defaultBurnCycle()):defaultBurnCycle())):defaultBurnCycle();}
 function renderSources(list){
  const rendered=[];
  for(const s of list){
   rendered.push({...s,anchors:s.anchors??anchorsFor(s),cycle:s.cycle??cycleFor(s)});
   // Exported world effects are attached to every procedural lava crossing,
   // including the editor demonstration, rather than fixed world coordinates.
   if(s.boundary&&!list.some(other=>other.id==='river'&&other.root===s.root))rendered.push({...riverSourceFor(s.root),anchors:preset.river,cycle:defaultBurnCycle()});
  }
  return rendered;
 }
 function runtimeSources(){
  const burning=new Set(getBurningPlants()),list=[];
  for(const root of forest.plants)if(root.userData.plantSpecies.startsWith('pine:')){
   const source=sourceFor(root);if(matches(preset.objects[source.id],source)||burning.has(root))list.push(source);
  }
  for(const root of getRivers())list.push(sourceFor(root));
  // Avoid drawing an imported copy of the exported lava effects twice.
  const freeWorld=preset.world.filter(a=>!lavaWorldIds.has(a.id));
  if(freeWorld.length)list.push({...world,anchors:freeWorld});
  return list;
 }
 function update(dt,{sources,camera:previewCamera,placementPreview}={}){
  worldRoot.position.z=getWorldOffset();
  for(const obj of defaultFireObjects)obj.visible=false;
  const resolved=renderSources(sources??runtimeSources());if(placementPreview)resolved.push(placementPreview);
  fire.update(dt,resolved,preset,{camera:previewCamera??camera,pixelRatio:renderer.getPixelRatio()});
 }
 return {fire,defaults,world,sourceFor,riverSourceFor,anchorsFor,cycleFor,update,
  get preset(){return preset;},setPreset(value){preset=value;},
  sourceById(id){if(id==='world')return world;if(id==='river'){const root=getRivers()[0];return root?riverSourceFor(root):null;}if(id==='deck'){const root=getRivers()[0];return root?sourceFor(root):null;}const root=forest.plants.find(p=>'plant:'+p.userData.plantId===id);return root?sourceFor(root):null;},
  dispose(){fire.dispose();scene.remove(worldRoot);for(const obj of defaultFireObjects)obj.visible=true;}
 };
}
