import {defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import * as THREE from 'three';
import {createEditableFire} from './EditableFire.js';
import {getPineFireProfile} from '../../systems/fire/ForestFireStudio.js';
import {PINE_SPECIES,newAnchor,upgradePreset,clonePreset,readEffectPreset} from './FirePreset.js';

// This controller is also loaded in normal play when an authored preset exists.
// It owns the only effect batches; opening the UI never creates a second engine.
export function createWorldEffectsRuntime({scene,forest,seed,camera,renderer,getRivers,getBurningPlants,defaultFireObjects,preset:initial}){
 const defaults=upgradePreset({version:1,seed,plants:Object.fromEntries(PINE_SPECIES.map(key=>[key,getPineFireProfile(key).anchors.map(a=>newAnchor([a.x,a.y,a.z],a.size))])),deck:[]});
 let preset=initial??readEffectPreset()??clonePreset(defaults);
 const fire=createEditableFire(scene),worldRoot=new THREE.Group();worldRoot.name='AuthoredWorldEffects';scene.add(worldRoot);
 const cache=new WeakMap();
 function sourceFor(root,key=root.userData.plantSpecies,boundary=root.userData.fireBoundary){
  if(cache.has(root))return cache.get(root);
  const deck=!!boundary,id=deck?'deck':'plant:'+root.userData.plantId;
  const source={root,height:deck?1:getPineFireProfile(key).height,key:deck?'deck':key,boundary,id,binding:deck?{kind:'deck',seed}:{kind:'plant',seed,id:root.userData.plantId,species:key,template:root.userData.plantTemplate}};
  cache.set(root,source);return source;
 }
 const world={root:worldRoot,key:'world',id:'world',world:true};
 function matches(entry,source){return entry&&entry.binding.seed===seed&&(source.boundary||entry.binding.species===source.key&&entry.binding.template===source.binding.template);}
 function anchorsFor(source,mutable=false){
  if(source.id==='world')return preset.world;
  const entry=preset.objects[source.id];
  if(matches(entry,source))return entry.anchors;
  const inherited=source.boundary?preset.deck:preset.plants[source.key]??[];
  if(mutable){preset.objects[source.id]={binding:clonePreset(source.binding),anchors:clonePreset(inherited),cycle:defaultBurnCycle()};return preset.objects[source.id].anchors;}
  return inherited;
 }
 function cycleFor(source,mutable=false){if(source.id==='world')return defaultBurnCycle();if(mutable)anchorsFor(source,true);const entry=preset.objects[source.id];return matches(entry,source)?(entry.cycle??(mutable?(entry.cycle=defaultBurnCycle()):defaultBurnCycle())):defaultBurnCycle();}
 function renderSources(list){return list.map(s=>({...s,anchors:anchorsFor(s),cycle:cycleFor(s)}));}
 function runtimeSources(){
  const burning=new Set(getBurningPlants()),list=[];
  for(const root of forest.plants)if(root.userData.plantSpecies.startsWith('pine:')){
   const source=sourceFor(root);if(matches(preset.objects[source.id],source)||burning.has(root))list.push(source);
  }
  for(const root of getRivers())list.push(sourceFor(root));
  if(preset.world.length)list.push(world);return list;
 }
 function update(dt,{sources,camera:previewCamera}={}){
  for(const obj of defaultFireObjects)obj.visible=false;
  fire.update(dt,renderSources(sources??runtimeSources()),preset,{camera:previewCamera??camera,pixelRatio:renderer.getPixelRatio()});
 }
 return {fire,defaults,world,sourceFor,anchorsFor,cycleFor,update,
  get preset(){return preset;},setPreset(value){preset=value;},
  sourceById(id){if(id==='world')return world;if(id==='deck'){const root=getRivers()[0];return root?sourceFor(root):null;}const root=forest.plants.find(p=>'plant:'+p.userData.plantId===id);return root?sourceFor(root):null;},
  dispose(){fire.dispose();scene.remove(worldRoot);for(const obj of defaultFireObjects)obj.visible=true;}
 };
}
