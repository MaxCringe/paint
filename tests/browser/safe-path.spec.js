import {test,expect} from '@playwright/test';
import {validateRunRoute} from '../../src/systems/RunReachability.js';
import {readFileSync} from 'node:fs';
const enabled=process.env.RUN_DIRECTOR_TESTS==='1';
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/safe-path-regressions.json',import.meta.url)));
test.use({viewport:{width:640,height:360},deviceScaleFactor:.5});
test('witnesses replay through the real game input and collision loop across frame patterns',async({page})=>{
 test.skip(!enabled,'Requires a --mode test build');test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?runSeed=796');await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();
 const cases=fixtures.filter(f=>f.expectAccepted!==false).map(f=>{const proof=validateRunRoute(f.hazards,f.context);expect(proof.ok,f.id).toBe(true);return {...f,proof};});
 for(const path of [0,5000])for(const types of [['pineLog','lava'],['lava','knot'],['knot','pineLog'],['pineLog','pineLog'],['lava','pineLog','lava'],['pee','lava'],['fish','knot']]){
  const hazards=types.map((type,i)=>({type,s:path+60+i*52,lane:['lava','pineLog'].includes(type)?-1:1})),context={path,lane:1};
  const proof=validateRunRoute(hazards,context);expect(proof.ok,JSON.stringify({types,path,proof})).toBe(true);cases.push({id:types.join('-')+'-'+path,hazards,context,proof});
 }
 for(const power of [{broomRemaining:.05,broomBlend:1},{ultimateRemaining:.05,ultimateProgress:1}]){
  const context={path:5000,lane:1,...power},hazards=[{type:'lava',s:5006,lane:-1},{type:'knot',s:5066,lane:1}];const proof=validateRunRoute(hazards,context);expect(proof.ok).toBe(true);cases.push({id:JSON.stringify(power),context,hazards,proof});
 }
 const magnetic={path:5000,lane:1,soulCharge:99,pickups:[{type:'hat',s:5050,lane:1},{type:'soul',s:5056,lane:0,phase:1,baseY:1.2}]};
 const magneticHazards=[{type:'visit',pickupType:'hat',s:5050,lane:1},{type:'lava',s:5080,lane:-1},{type:'pineLog',s:5140,lane:-1}];
 const magneticProof=validateRunRoute(magneticHazards,magnetic);expect(magneticProof.ok).toBe(true);cases.push({id:'magnet-auto-ultimate',context:magnetic,hazards:magneticHazards,proof:magneticProof});
 const results=await page.evaluate(cases=>{
  const bridge=window.__knottyRunTest,results=[];
  for(const c of cases)for(const deltas of [[1/60],[1/30],[.04],[.04,1/120,1/30],[.1,1/60,.07]]){
   bridge.fixture(c.context,c.hazards,c.context.pickups??[]);let s=bridge.snapshot(),i=0,n=0;
   while(s.state==='playing'&&s.path<c.proof.end.path&&n<4000){while(i<c.proof.actions.length&&c.proof.actions[i].path<=s.path+1e-9){const a=c.proof.actions[i++];bridge.command(a.type,a.direction);}s=bridge.step(deltas[n++%deltas.length]);}
   results.push({id:c.id,deltas,state:s.state,path:s.path,end:c.proof.end.path,jump:s.jump,slip:s.slip,ultimate:s.ultimateRemaining});
  }
  bridge.draw();return results;
 },cases);
 const failed=results.filter(r=>r.state!=='playing'||r.path<r.end);expect(failed,JSON.stringify(failed)).toEqual([]);expect(errors).toEqual([]);
 console.log('REAL_RUNTIME_REPLAYS',results.length);await page.screenshot({path:test.info().outputPath('runtime-replay.png')});
});

test('complete default director cycles run through real runtime at normal and maximum speeds',async({page})=>{
 test.skip(!enabled,'Requires a --mode test build');test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?runSeed=796');await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();
 const cycles=await page.evaluate(()=>{
  const bridge=window.__knottyRunTest,results=[];
  for(const context of [{path:0,lane:1},{path:5000,lane:1,broomRemaining:9,broomBlend:1}]){
   bridge.fixture(context,[],[],true);let queue=[],generation=-1,s=bridge.snapshot(),n=0,peak=0;const phases=new Set();
   while(s.state==='playing'&&s.path<context.path+850&&n<10000){
    while(queue.length&&queue[0].path<=s.path+1e-9){const a=queue.shift();bridge.command(a.type,a.direction);}
    s=bridge.step([1/60,.04,1/30,1/120][n++%4]);peak=Math.max(peak,s.obstacles.length+s.coins+s.hats);phases.add(s.director.phase);
    const proof=s.director.proof;if(proof?.ok&&proof.start!==generation){generation=proof.start;queue=proof.actions.filter(a=>a.path>=s.path-1e-9);}
   }
   results.push({start:context.path,state:s.state,path:s.path,frames:n,phases:[...phases],peak,stats:s.director.stats});
  }
  bridge.draw();return results;
 });
 for(const c of cycles){expect(c.state,JSON.stringify(c)).toBe('playing');expect(c.path).toBeGreaterThanOrEqual(c.start+850);expect(c.phases.sort()).toEqual(['build','recovery','tension','warmup']);expect(c.peak).toBeLessThan(120);expect(c.stats.fallbackUnproven).toBe(0);}expect(errors).toEqual([]);
 console.log('REAL_RUNTIME_CYCLES',JSON.stringify(cycles));await page.screenshot({path:test.info().outputPath('runtime-cycle.png')});
});
