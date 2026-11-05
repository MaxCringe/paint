import {test,expect} from '@playwright/test';
// Low resolution reduces software-rasterizer cost; gameplay dt, speed and collisions stay real.
test.use({viewport:{width:640,height:360},deviceScaleFactor:.5});
const enabled=process.env.RUN_DIRECTOR_TESTS==='1';
test('production excludes the run test bridge',async({page})=>{
 test.skip(enabled,'This check uses the ordinary production build');
 await page.goto('/');expect(await page.evaluate(()=>window.__knottyRunTest)).toBeUndefined();
});
async function playWitness(page,target,timeout){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader|TypeError|undefined/.test(m.text()))errors.push(m.text());});
 await page.goto('/?runSeed=796');await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();
 await page.evaluate(target=>{
  const bridge=window.__knottyRunTest;let queue=[],generation=-1,maxObjects=0,maxCoins=0;const phases=new Set();
  window.__runEvidence={};
  const tick=()=>{
   const s=bridge.snapshot();phases.add(s.director.phase);maxObjects=Math.max(maxObjects,s.obstacles.length);maxCoins=Math.max(maxCoins,s.coins);
   const proof=s.director.proof;if(proof?.ok&&proof.start!==generation){generation=proof.start;queue=proof.actions.filter(a=>a.path>=s.path-.001);}
   while(queue.length&&queue[0].path<=s.path){const a=queue.shift();bridge.command(a.type,a.direction);}
   window.__runEvidence={state:s.state,path:s.path,phases:[...phases],maxObjects,maxCoins,reservations:s.director.reservations,accepted:s.director.accepted,rejected:s.director.rejected,next:queue[0],snapshot:s};
   if(s.state==='playing'&&s.path<target)requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
 },target);
 let lastPhase='',lastMark=-1;
 await expect.poll(async()=>{
  const s=await page.evaluate(()=>window.__runEvidence);const phase=s.snapshot?.director.phase;
  if(phase!==lastPhase||Math.floor(s.path/100)!==lastMark){lastPhase=phase;lastMark=Math.floor(s.path/100);console.log('RUN_PHASE',JSON.stringify({phase,path:s.path,state:s.state}));}
  return s.state==='over'||s.path>=target;
 },{timeout,intervals:[1000]}).toBe(true);
 const evidence=await page.evaluate(()=>window.__runEvidence);console.log('RUN_BROWSER_EVIDENCE',JSON.stringify(evidence));
 expect(evidence.state,JSON.stringify(evidence)).toBe('playing');expect(evidence.path).toBeGreaterThanOrEqual(target);
 expect(evidence.maxObjects).toBeLessThan(25);expect(evidence.maxCoins).toBeLessThan(120);expect(evidence.reservations).toBeLessThan(100);expect(errors).toEqual([]);
 await page.screenshot({path:test.info().outputPath('run-director.png')});return evidence;
}
test('real inputs traverse initial sections with live WebGL and bounded objects',async({page})=>{
 test.skip(!enabled,'Build with --mode test and RUN_DIRECTOR_TESTS=1');test.setTimeout(300000);
 const evidence=await playWitness(page,100,240000);expect(evidence.accepted).toBeGreaterThan(1);
});
test('extended: real inputs traverse the complete default phase cycle',async({page})=>{
 test.skip(!enabled,'Build with --mode test and RUN_DIRECTOR_TESTS=1');test.setTimeout(1200000);
 const evidence=await playWitness(page,850,1100000);expect(new Set(evidence.phases)).toEqual(new Set(['warmup','build','tension','recovery']));
});
