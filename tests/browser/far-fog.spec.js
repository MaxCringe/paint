import {test,expect} from '@playwright/test';
const KEY='knottyPine.worldFire.v1';
test('far fog sliders visibly hide the horizon, preserve the near road and load in the ordinary run',async({page})=>{
 test.skip(process.env.WORLD_EDITOR_TESTS!=='1','Opt-in editor build');test.setTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|World editor/i.test(m.text()))errors.push(m.text());});
 await page.goto('/?worldEditor=1&seed=1337',{waitUntil:'domcontentloaded'});const editor=page.locator('.world-editor'),panel=editor.locator('.studio-atmosphere');await expect(editor).toBeVisible({timeout:60000});await editor.locator('[data-layout=atmosphere]').click();
 await panel.locator('[name=atmosphere-preset]').selectOption('forest');
 for(const key of ['near','far','depth','distantDensity','softness','trees','mountains'])await expect(panel.locator('[name="atmosphere.fog.'+key+'.number"]')).toBeVisible();
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).atmosphere,KEY);
 // Isolate fog: moving ash, wind and local haze must not fake the pixel comparison.
 const fixture={...saved,format:'knottyPine.atmosphere',quality:'low',fog:{...saved.fog,depth:.3,mountains:.7,mist:0,edge:0,distant:0},ash:{...saved.ash,enabled:false},wind:{...saved.wind,enabled:false},background:{...saved.background,enabled:false}};
 await panel.locator('[name=atmosphere-file]').setInputFiles({name:'fog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await expect(panel.locator('[name="atmosphere.fog.depth.number"]')).toHaveValue('0.3');
 const clip=await editor.locator('.studio-viewport').boundingBox();
 const weak=await page.screenshot({clip,path:test.info().outputPath('far-fog-weak.png')});
 await panel.locator('[name="atmosphere.fog.depth.number"]').fill('3');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).atmosphere.fog.depth,KEY)).toBe(3);
 const strong=await page.screenshot({clip,path:test.info().outputPath('far-fog-strong.png')});
 const difference=await page.evaluate(async({weak,strong})=>{
  const decode=async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const context=canvas.getContext('2d');context.drawImage(img,0,0);return {data:context.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height};};
  const a=await decode(weak),b=await decode(strong);
  const mean=(x1,y1,x2,y2)=>{let sum=0,count=0;for(let y=Math.floor(a.height*y1);y<a.height*y2;y++)for(let x=Math.floor(a.width*x1);x<a.width*x2;x++)for(let c=0;c<3;c++){const i=(y*a.width+x)*4+c;sum+=Math.abs(a.data[i]-b.data[i]);count++;}return sum/count;};
  return {far:mean(.35,.15,.65,.4),near:mean(.33,.8,.4,.94)};
 },{weak:weak.toString('base64'),strong:strong.toString('base64')});
 expect(difference.far,'far forest/background must actually change on the GPU').toBeGreaterThan(.8);expect(difference.near,'near road should remain clear').toBeLessThan(1.5);
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(editor).toHaveCount(0);await expect(page.locator('#start')).toBeEnabled({timeout:60000});await page.locator('#start').click();await expect(page.locator('#center')).toHaveClass(/hidden/);await page.locator('#pause-button').click();await expect(page.locator('#resume')).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).atmosphere.fog.depth,KEY)).toBe(3);expect(errors).toEqual([]);
});
