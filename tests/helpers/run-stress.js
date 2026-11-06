import {createSegmentGenerator} from '../../src/systems/ObstacleManager.js';
import {createForestRandom} from '../../src/world/forest/PlantRegistry.js';
import {createRunnerOracle} from './runner-oracle.js';
export function runStress(seed,{distance=900,deltas=[1/60,1/30,.04,1/120],benchmark=false}={}){
 const hazards=[],pickups=[],rng=createForestRandom(seed),oracle=createRunnerOracle({},hazards,pickups),times=[];
 let currentPath=0,queue=[],generation=-1,lastProof=null,peak=0,minSlack=Infinity;
 const add=(type,lane,s,extra={})=>{const p={type,lane,s,...extra};pickups.push(p);return {phase:p.phase,baseY:p.baseY,z:p.z,rollback:()=>{const i=pickups.indexOf(p);if(i>=0)pickups.splice(i,1);}};};
 const p=createSegmentGenerator({random:rng,
  makeLavaRiver:(_z,s)=>hazards.push({type:'lava',lane:-1,s}),makePineLog:(_z,s)=>hazards.push({type:'pineLog',lane:-1,s}),
  makeFish:(lane,_z,s)=>hazards.push({type:'fish',lane,s}),makePuddle:(lane,_z,s)=>hazards.push({type:'pee',lane,s}),makeObstacle:(lane,_z,_type,s)=>hazards.push({type:'knot',lane,s}),
  makeSoul:(lane,z,y,s,r)=>add('soul',lane,s,{phase:1+(seed%6)*.7,z,baseY:y,branchId:r.branchId,position:{x:(lane-1)*2.55,y,z}}),
  makeHat:(lane,_z,_y,s,r)=>add('hat',lane,s,{branchId:r.branchId}),makeBroom:(lane,_z,_y,s,r)=>add('broom',lane,s,{branchId:r.branchId}),broomChance:.055});
 for(let frame=0;frame<20000;frame++){
  let state=oracle.snapshot();while(queue.length&&queue[0].path<=state.path+1e-9)oracle.command(queue.shift());
  state=oracle.step(deltas[frame%deltas.length]);currentPath=state.path;
  if(state.failure)return {ok:false,seed,frame,failure:state.failure,proof:lastProof,hazards:[...hazards],state};
  for(let i=hazards.length-1;i>=0;i--)if(hazards[i].s<currentPath-12)hazards.splice(i,1);
  for(let i=pickups.length-1;i>=0;i--)if(oracle.collected(pickups[i])||!pickups[i].magnetFlight&&pickups[i].s<currentPath-12)pickups.splice(i,1);
  const before=p.diagnostics().frontier,start=benchmark?performance.now():0;
  p({...state,seed,getLivePickups:()=>oracle.snapshot().pickups});
  const diag=p.diagnostics();if(benchmark&&diag.frontier!==before)times.push(performance.now()-start);
  peak=Math.max(peak,diag.reservations,hazards.length+pickups.length);
  if(diag.proof?.ok&&diag.proof.start!==generation){generation=diag.proof.start;lastProof=diag.proof;queue=diag.proof.actions.filter(a=>a.path>=state.path-1e-9);if(diag.proof.metrics.minRecognitionSlack!==null)minSlack=Math.min(minSlack,diag.proof.metrics.minRecognitionSlack);}
  if(currentPath>=distance)return {ok:true,seed,frames:frame+1,peak,minSlack:Number.isFinite(minSlack)?minSlack:null,accepted:diag.accepted,rejected:diag.rejected,stats:diag.stats,collected:state.collected,times};
 }
 return {ok:false,seed,reason:'frame-budget',currentPath};
}
