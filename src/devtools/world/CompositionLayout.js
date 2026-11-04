import {copy,hash,applyEffectPreset} from './EffectLayers.js';
import {newEffectAnchor} from './FirePreset.js';
// Distinct surface pockets, not a regular ring. This operates on the actual
// procedural species profile, so tree composition is separate from a local emitter.
export function createTreeComposition(profile,composition,{seed=1337,zone='crown',count=7}={}){
 let candidates=profile.anchors.filter(a=>zone==='all'?true:zone==='trunk'?a.zone==='trunk':a.zone!=='trunk'&&a.height>.46);
 if(!candidates.length)candidates=profile.anchors;
 const ordered=candidates.map((a,i)=>({a,rank:hash(seed+i*109)})).sort((a,b)=>a.rank-b.rank);
 return ordered.slice(0,count).map(({a},i)=>{
  const anchor=applyEffectPreset(newEffectAnchor([a.x,a.y,a.z],a.size),composition);
  anchor.id='composition:'+seed+':'+zone+':'+i;anchor.scale.fill(.7+hash(seed+i*173)*.65);
  anchor.rotation[1]=hash(seed+i*619)*Math.PI*2;
  // Source is a small irregular pocket at a real branch, not a crown-sized ring.
  anchor.emitter={...anchor.emitter,shape:'point'};
  if(anchor.layers.flame){anchor.layers.flame.height=Math.min(anchor.layers.flame.height,zone==='trunk'?1.8:1.3);anchor.layers.flame.density=zone==='trunk'?2:3;}
  return anchor;
 });
}
