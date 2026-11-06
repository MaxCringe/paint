// Solid-bank placement for the procedural forest. Uses the actual winding
// lava shoreline, not a rectangular exclusion around an obstacle.
export const LAVA_FOREST_RULES=Object.freeze({
 ignitionLead:49,
 bankClearance:1.55,
 // Basalt bank reaches .68 beyond the glowing edge, with a chipped rim.
 fernClearance:.82,
 grassClearance:.82,
 heatReach:4.9,
 maxAdjustments:6 // retained for callers; interval merge is not iterative
});
const FAMILY=new Set(['pine','fern','grass']);
const FALLBACK={pine:{x:.45,z:.45},fern:{x:.9,z:.9},grass:{x:.45,z:.45}};
export function createLavaForestInteraction(plants,fire,options={}){
 const config={...LAVA_FOREST_RULES,...options},rivers=[];
 function interval(plant,river,family){
  if(!river.group.parent)return null;
  const extent=plant.userData.lavaFootprint??FALLBACK[family];
  const c=Math.abs(Math.cos(plant.rotation.y)),s=Math.abs(Math.sin(plant.rotation.y));
  const bx=extent.x*Math.abs(plant.scale.x),bz=extent.z*Math.abs(plant.scale.z);
  const rx=c*bx+s*bz,rz=s*bx+c*bz;
  const px=plant.position.x-river.group.position.x;
  if(px+rx< -110||px-rx>110)return null;
  let lo=Infinity,hi=-Infinity;
  // Sample the winding shore under both ends and the middle of the footprint.
  // This runs only at river registration/recycle, never once per animation frame.
  for(let i=0;i<=4;i++){
   const x=Math.max(-110,Math.min(110,px+rx*(i-2)/2));
   const center=river.center(x),half=river.halfWidth(x);
   lo=Math.min(lo,center-half);hi=Math.max(hi,center+half);
  }
  const clearance=family==='pine'?config.bankClearance:
   family==='fern'?config.fernClearance:config.grassClearance;
  return {lo:river.group.position.z+lo-rz-clearance,
          hi:river.group.position.z+hi+rz+clearance};
 }
 function keepPlantClear(plant){
  const family=plant?.userData?.plantSpecies?.split(':')[0];
  if(!FAMILY.has(family))return false;
  const forbidden=[];
  for(const river of rivers){
   const region=interval(plant,river,family);
   if(region)forbidden.push(region);
  }
  if(!forbidden.length)return false;
  forbidden.sort((a,b)=>a.lo-b.lo);
  const merged=[];
  for(const region of forbidden){
   const last=merged[merged.length-1];
   if(last&&region.lo<=last.hi+.08)last.hi=Math.max(last.hi,region.hi);
   else merged.push({...region});
  }
  const z=plant.position.z,hit=merged.find(r=>z>=r.lo&&z<=r.hi);
  if(!hit)return false;
  const back=hit.lo-.08,forward=hit.hi+.08;
  plant.position.z=Math.abs(z-back)<=Math.abs(z-forward)?back:forward;
  return true;
 }
 function registerRiver({group,center,halfWidth}){
  if(!group?.isObject3D||typeof center!=='function'||typeof halfWidth!=='function')
   throw new TypeError('Lava river must supply its group and real shore functions');
  const river={group,center,halfWidth,ignited:false};rivers.push(river);
  // Correct placement before this frame's InstancedMesh matrix upload.
  for(const plant of plants)keepPlantClear(plant);
  return river;
 }
 const onPlantRecycle=plant=>keepPlantClear(plant);
 function update(runnerZ=2.3){
  for(let i=rivers.length-1;i>=0;i--){
   const river=rivers[i];
   if(!river.group.parent){
    fire.releaseOwner?.(river.group);rivers.splice(i,1);continue;
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
 return {registerRiver,onPlantRecycle,keepTreeClear:keepPlantClear,keepPlantClear,
  update,releaseRiver,reset,
  getStats:()=>({rivers:rivers.length,ignited:rivers.filter(r=>r.ignited).length})};
}
