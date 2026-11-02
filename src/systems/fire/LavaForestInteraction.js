// Keep the recycled procedural forest out of the molten river channel.
// Rivers are generated after the trees; placement and fire must therefore
// share the actual shoreline function, not an approximate obstacle rectangle.
export const LAVA_FOREST_RULES=Object.freeze({
 ignitionLead:49,      // ignite roughly 3 seconds before a 15 m/s approach
 bankClearance:1.55,   // trunks stand on solid ground outside the black banks
 heatReach:4.9,       // radiant heat ignites trees before direct contact
 maxAdjustments:6
});

const isPine=plant=>plant?.userData?.plantSpecies?.startsWith('pine:');

export function createLavaForestInteraction(plants,fire,options={}){
 const config={...LAVA_FOREST_RULES,...options};
 const rivers=[];
 function safeRiverDistance(plant,river){
  const x=plant.position.x;
  return plant.position.z-river.group.position.z-river.center(x);
 }
 function adjustTree(plant,river){
  if(!isPine(plant)||!river.group.parent)return false;
  // Rivers extend across the entire forest; check the actual winding bank
  // instead of only the road width. Allow narrow overhanging crowns.
  const x=plant.position.x;
  if(Math.abs(x)>105)return false;
  const half=river.halfWidth(x)+config.bankClearance+
   Math.min(.65,Math.max(.1,plant.scale.x)*.65);
  const delta=safeRiverDistance(plant,river);
  if(Math.abs(delta)>=half)return false;
  // Move once in the direction of the nearest bank. For a tree centred in
  // the channel choose the far-side bank to avoid popping towards the runner.
  const sign=delta<=0?-1:1;
  plant.position.z+=sign*(half-Math.abs(delta)+.08);
  return true;
 }
 function keepTreeClear(plant){
  if(!isPine(plant))return false;
  let moved=false;
  // Several rivers can coexist; resolve against all, including after recycle.
  for(let n=0;n<config.maxAdjustments;n++){
   let changed=false;
   for(const river of rivers)if(adjustTree(plant,river))changed=true;
   moved ||=changed;
   if(!changed)break;
  }
  return moved;
 }
 function registerRiver({group,z,center,halfWidth}){
  if(!group?.isObject3D||typeof center!=='function'||typeof halfWidth!=='function')
   throw new TypeError('Lava river must supply its group and real shore functions');
  const river={group,center,halfWidth,ignited:false};
  rivers.push(river);
  // Everything happens before the river is visible at the runner, and before
  // the shared forest InstancedMesh matrices are updated for this frame.
  for(const plant of plants)keepTreeClear(plant);
  return river;
 }
 function onPlantRecycle(plant){return keepTreeClear(plant)}
 function update(runnerZ=2.3){
  for(let i=rivers.length-1;i>=0;i--){
   const river=rivers[i];
   if(!river.group.parent){
    fire.releaseOwner?.(river.group);
    rivers.splice(i,1);
    continue;
   }
   if(!river.ignited&&river.group.position.z>=runnerZ-config.ignitionLead){
    river.ignited=true;
    fire.igniteNearRiver(plants,river.group.position.z,{
     center:river.center,halfWidth:river.halfWidth,
     reach:config.heatReach,owner:river.group
    });
   }
  }
 }
 function releaseRiver(group){
  const index=rivers.findIndex(r=>r.group===group);
  if(index>=0)rivers.splice(index,1);
  fire.releaseOwner?.(group);
 }
 function reset(){
  for(const river of rivers)fire.releaseOwner?.(river.group);
  rivers.length=0;
 }
 return {registerRiver,onPlantRecycle,keepTreeClear,update,releaseRiver,reset,
  getStats:()=>({rivers:rivers.length,ignited:rivers.filter(r=>r.ignited).length})};
}
