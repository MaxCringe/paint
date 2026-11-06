import {broomLavaGuardDuration,pineLogFlightGuardDuration} from './HazardRules.js';
import {ultimateLavaGuardDuration,ULTIMATE_LAND_SECONDS} from '../player/UltimateFlight.js';

// Numeric helpers only. No scene, meshes, renderer, or particle allocation.
export const lanePosition=lane=>(lane-1)*2.55;
export const advanceLane=(x,lane,dt)=>x+(lanePosition(lane)-x)*Math.min(1,dt*12);
export const bodyOverlapsLane=(x,lane)=>Math.abs(x-lanePosition(lane))<1.05;
export const nextBroomBlend=(remaining,blend,dt)=>Math.max(0,Math.min(1,blend+(remaining>0?1:-1)*dt*4));
export const pointContact=gap=>2.3+gap>1.2;
export function flightHold(mode,type,gap,half,speed,passed=false){
 if(mode==='ultimate'){
  if(type==='pineLog'){const hold=pineLogFlightGuardDuration(gap,speed);return hold>0?hold+ULTIMATE_LAND_SECONDS:0;}
  return type==='lava'?ultimateLavaGuardDuration(gap,half,speed):0;
 }
 if(type==='pineLog')return gap>=-16&&gap<9?(9-gap)/speed+.03:0;
 return type==='lava'&&!passed?broomLavaGuardDuration(gap,half,speed):0;
}
