import {PINE_LOG_COLLISION_HALF_DEPTH,SMALL_PINE_COLLISION_HALF_DEPTH} from './HazardRules.js';

export const RUNNER_Z=2.3;
export const pathToZ=(s,path)=>RUNNER_Z+path-s;
export const zToPath=(z,path)=>RUNNER_Z+path-z;
export const laneMask=lane=>lane<0?7:1<<lane;
export const hazardDepth=type=>type==='lava'?2.95:type==='pineLog'?PINE_LOG_COLLISION_HALF_DEPTH:type==='knot'?SMALL_PINE_COLLISION_HALF_DEPTH:1.1;
const isHazard=r=>r.kind==='hazard';
export function createRunSpace(){
 const records=[];
 function available(r){return records.every(other=>{
  if(!(laneMask(r.lane)&laneMask(other.lane)))return true;
  const margin=isHazard(r)||isHazard(other)?1.4:.25;
  return Math.abs(r.s-other.s)>=r.half+other.half+margin;
 });}
 return {records,available,
  add(r){if(!Number.isFinite(r.s)||!Number.isFinite(r.half))throw Error('Invalid run reservation');records.push(r);return r;},
  prune(path){for(let i=records.length-1;i>=0;i--)if(records[i].s+records[i].half<path-15)records.splice(i,1);},
  reset(){records.length=0;}
 };
}
