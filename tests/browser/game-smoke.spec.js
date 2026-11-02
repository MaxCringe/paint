import {test,expect} from '@playwright/test';

function trackUnhandled(page){
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 return errors;
}
test('ordinary runner starts, pauses and resumes with a live WebGL scene',async({page})=>{
 const errors=trackUnhandled(page);
 await page.goto('/');
 await expect(page.locator('#center')).toBeVisible();
 await expect(page.locator('#menu-main')).toBeVisible();
 await expect(page.locator('#menu-open-effects-editor')).toHaveCount(0);
 const gl=await page.locator('canvas').first().evaluate(canvas=>
  Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'))
 );
 expect(gl,'Chromium should provide software WebGL').toBe(true);
 await expect(page.locator('#start')).toBeEnabled({timeout:90_000});
 await page.locator('#start').click();
 await expect(page.locator('#center')).toHaveClass(/hidden/);
 await expect(page.locator('#pause-button')).toBeVisible();
 await page.keyboard.press('ArrowUp');
 await page.keyboard.press('Escape');
 await expect(page.locator('#center')).toBeVisible();
 await expect(page.locator('#resume')).toBeVisible();
 await page.locator('#resume').click();
 await expect(page.locator('#center')).toHaveClass(/hidden/);
 expect(errors).toEqual([]);
});

test('the main run uses new hosted Fiona without DEV menus',async({page})=>{
 const errors=trackUnhandled(page);
 await page.goto('/');
 await expect(page.locator('#menu-open-fiona-test')).toHaveCount(0);
 await expect(page.locator('#fiona-test-tools')).toHaveCount(0);
 await expect(page.locator('#start')).toBeEnabled({timeout:90_000});
 await page.locator('#start').click();
 await expect(page.locator('#center')).toHaveClass(/hidden/);
 expect(await page.evaluate(()=>localStorage.getItem('knottyPineRunsStarted'))).toBe('1');
 expect(errors).toEqual([]);
});

test('first real lava river and tree fires do not freeze an extended game run',async({page})=>{
 test.setTimeout(55_000);
 const errors=trackUnhandled(page);
 page.on('console',message=>{
  if(message.type()==='error'&&/shader|WebGL|fire|undefined|TypeError/.test(message.text()))
   errors.push(message.text());
 });
 await page.goto('/');
 await expect(page.locator('#start')).toBeEnabled({timeout:45_000});
 await page.locator('#start').click();
 await expect(page.locator('#center')).toHaveClass(/hidden/);
 // Subsequent segments contain no lane obstacles. The obstacle manager must
 // still create a guaranteed lava river by segment seven (~7 seconds).
 await page.evaluate(()=>{Math.random=()=>.99});
 await expect.poll(async()=>{
  const text=await page.locator('#distance').innerText();
  return Number(text.match(/\d+/)?.[0]||0);
 },{timeout:22_000,intervals:[350,500,800]}).toBeGreaterThanOrEqual(102);
 expect(errors).toEqual([]);
});
