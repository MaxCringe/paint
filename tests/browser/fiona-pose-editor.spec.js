import {test,expect} from '@playwright/test';

test('DEV ultimate workshop edits live pose, freezes game and exports JSON',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await page.locator('#menu-open-fiona-test').click();
 await page.locator('#fiona-test-launch').click();
 await page.waitForFunction(()=>{
  const menu=document.getElementById('center');
  const status=document.getElementById('fiona-test-status')?.textContent||'';
  return menu?.classList.contains('hidden')||status.startsWith('Ошибка:');
 },{timeout:90_000});
 const status=await page.locator('#fiona-test-status').textContent();
 expect(await page.locator('#center').evaluate(el=>el.classList.contains('hidden')),
  '3D Fiona failed to launch: '+status).toBe(true);
 const open=page.locator('#fiona-pose-editor-toggle');
 await expect(open).toBeVisible();
 await open.click();
 await expect(page.locator('#fiona-pose-editor')).toBeVisible();
 const shoulder=page.getByRole('slider',{name:'Левое плечо · вверх'});
 await shoulder.evaluate(input=>{
  input.value='76';
  input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await expect(page.locator('#fiona-pose-editor .pose-row').first().locator('output')).toHaveText('76°');
 const distance=await page.locator('#distance').textContent();
 await page.waitForTimeout(250);
 expect(await page.locator('#distance').textContent()).toBe(distance);
 await page.locator('#pose-copy').click();
 const exported=JSON.parse(await page.locator('#pose-export').inputValue());
 expect(exported.kind).toBe('knotty-pine-ultimate-pose');
 expect(exported.settings.leftUpper).toBe(76);
 await page.locator('#pose-close').click();
 await expect(page.locator('#fiona-pose-editor-toggle')).toBeVisible();
 await expect(page.locator('#pause-button')).toBeVisible();
 expect(errors).toEqual([]);
});
