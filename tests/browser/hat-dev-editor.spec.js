import {test,expect} from '@playwright/test';

test('3D Fiona DEV worn-hat editor previews and exports manual fitting',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.locator('#fiona-hat-dev-toggle')).toBeHidden();
 await page.locator('#menu-open-fiona-test').click();
 await page.locator('#fiona-test-launch').click();
 await page.waitForFunction(()=>{
  const menu=document.getElementById('center');
  const status=document.getElementById('fiona-test-status')?.textContent||'';
  return menu?.classList.contains('hidden')||status.startsWith('Ошибка:');
 },{timeout:90_000});
 const status=await page.locator('#fiona-test-status').textContent();
 expect(await page.locator('#center').evaluate(el=>el.classList.contains('hidden')),
  '3D Fiona did not load: '+status).toBe(true);
 const button=page.locator('#fiona-hat-dev-toggle');
 await expect(button).toBeVisible();
 await button.click();
 await expect(page.locator('#fiona-hat-dev-panel')).toBeVisible();
 const y=page.getByRole('slider',{name:'Выше / ниже'});
 await y.evaluate(input=>{input.value='.26';input.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#fiona-hat-dev-panel .hat-dev-row').nth(1).locator('output')).toHaveText('0.26м');
 await page.getByRole('slider',{name:'Размер шляпы'}).evaluate(input=>{input.value='115';input.dispatchEvent(new Event('input',{bubbles:true}));});
 const distance=await page.locator('#distance').textContent();
 await page.waitForTimeout(250);
 expect(await page.locator('#distance').textContent()).toBe(distance);
 await page.locator('#hat-dev-copy').click();
 const exported=JSON.parse(await page.locator('#hat-dev-json').inputValue());
 expect(exported.kind).toBe('knotty-pine-worn-hat-placement');
 expect(exported.settings.y).toBe(.26);
 expect(exported.settings.size).toBe(115);
 await page.locator('#hat-dev-close').click();
 await expect(button).toBeVisible();
 await expect(page.locator('#pause-button')).toBeVisible();
 expect(errors).toEqual([]);
});
