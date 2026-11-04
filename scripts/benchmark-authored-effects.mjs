// Usage: node scripts/benchmark-authored-effects.mjs URL output.json [legacy|original] [chromium-path]
// Run baseline and current sequentially with no other browser doing WebGL work.
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import {upgradePreset,PINE_SPECIES,newEffectAnchor} from '../src/devtools/world/FirePreset.js';
import {applyEffectPreset,EFFECT_PRESETS} from '../src/devtools/world/EffectLayers.js';
const [url,output,mode='legacy',executablePath]=process.argv.slice(2);
if(!url||!output)throw Error('Expected URL and output.json');
const preset=upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});preset.budget=1024;
preset.world=[-3,0,3].map((x,i)=>{const a=applyEffectPreset(newEffectAnchor([x,1,-10]),EFFECT_PRESETS[mode==='original'?'original:tree':'inferno']);a.id='benchmark:'+i;if(mode==='legacy'){for(const [kind,l] of Object.entries(a.layers))for(const key of ['light','studioMode','octaves','trajectory','style','colorWarm','brightness'])if(key!=='brightness'||kind!=='flame')delete l[key];}return a;});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|shader/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(p=>{localStorage.setItem('knottyPine.worldFire.v1',JSON.stringify(p));let state=1761;Math.random=()=>{let t=state+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};window.__draws=0;for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const fn=proto[name];if(fn)proto[name]=function(...args){window.__draws++;return fn.apply(this,args);};}},preset);
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.getElementById('start')?.disabled,undefined,{timeout:90000});
 const result=await page.evaluate(()=>new Promise(resolve=>{let times=[],calls=[],last=null,warmup=20;function tick(t){if(last!==null&&warmup--<=0){times.push(t-last);calls.push(window.__draws);}window.__draws=0;last=t;if(times.length<20)requestAnimationFrame(tick);else{const sorted=[...times].sort((a,b)=>a-b);resolve({frames:20,warmup:20,medianMs:sorted[10],p95Ms:sorted[18],avgDrawCalls:calls.reduce((a,b)=>a+b,0)/20});}}requestAnimationFrame(tick);}));
 const data={mode,seed:1337,viewport:[1280,720],budget:1024,...result,errors};fs.writeFileSync(output,JSON.stringify(data,null,2));console.log(JSON.stringify(data));if(errors.length)process.exitCode=1;
}finally{await browser.close();}
