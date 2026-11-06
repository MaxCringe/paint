import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {runStress} from './helpers/run-stress.js';
import {validateRunRoute} from '../src/systems/RunReachability.js';
import {replayOracle} from './helpers/runner-oracle.js';
test('300 seeded complete phase cycles execute safely with an independent runtime-order driver',()=>{
 const total={seeds:300,accepted:0,rejected:0,fallbackSafe:0,fallbackUnproven:0,rewardRejected:0,collected:{soul:0,hat:0,broom:0},reasons:{},peak:0,minSlack:Infinity},times=[];
 for(let seed=1;seed<=300;seed++){
  const r=runStress(seed,{distance:900,benchmark:true,deltas:seed%2?[1/60,1/30,.04,1/120]:[.1,1/60,.07,1/30]});
  if(!r.ok){writeFileSync('/tmp/knotty-safe-path-'+seed+'.json',JSON.stringify(r,null,2));assert.fail('runtime replay failed: seed '+seed+' /tmp/knotty-safe-path-'+seed+'.json');}
  assert.ok(r.collected.soul>0,'seed '+seed+' must exercise actual reward collection');for(const type of ['soul','hat','broom'])total.collected[type]+=r.collected[type];
  total.accepted+=r.accepted;total.rejected+=r.rejected;total.fallbackSafe+=r.stats.fallbackSafe;total.fallbackUnproven+=r.stats.fallbackUnproven;total.rewardRejected+=r.stats.rewardRejected;total.peak=Math.max(total.peak,r.peak);if(r.minSlack!==null)total.minSlack=Math.min(total.minSlack,r.minSlack);
  for(const [reason,n] of Object.entries(r.stats.reasons))total.reasons[reason]=(total.reasons[reason]??0)+n;
  if(seed>20)times.push(...r.times);
 }
 times.sort((a,b)=>a-b);total.validationMs={median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)};
 console.log('SAFE_PATH_STRESS',JSON.stringify(total));assert.equal(total.fallbackUnproven,0);assert.ok(total.peak<120);assert.ok(total.minSlack>=-1e-8);
});
test('alternative routes are counted only after their witnesses have actually passed replay',()=>{
 const hazards=[{type:'knot',s:5060,lane:1}],context={path:5000,lane:1},proof=validateRunRoute(hazards,context,{findAlternatives:true});assert.ok(proof.ok);assert.ok(proof.verifiedAlternatives>0);
 for(const alternative of [proof,...proof.alternatives])assert.ok(replayOracle(hazards,context,alternative.actions,alternative.end.path,[.04,1/30,1/60]).ok);
});
