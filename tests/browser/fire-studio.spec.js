import {test,expect} from '@playwright/test';

test('Fire Studio preview compiles and renders an isolated volumetric flame in WebGL',async({page})=>{
 // This fixture checks the fire renderer, not Chromium's automatic icon fetch.
 await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{
  if(message.type()==='error')errors.push(message.text());
 });
 await page.goto('/fire-studio-preview.html');
 await expect(page.locator('canvas#stage')).toBeVisible();
 await expect(page.locator('#metrics')).toContainText('FPS',{timeout:90_000});
 const first=await page.locator('#metrics').innerText();
 expect(first).toContain('Draw calls');
 expect(first).toMatch(/огонь [1-9]/);
 await page.locator('#tree').selectOption('dead_snag');
 await expect(page.locator('#tree')).toHaveValue('dead_snag');
 await expect(page.locator('#metrics')).toContainText('FPS');
 await page.locator('#tree').selectOption('sequoia_giant');
 await page.locator('#ignite').click();
 await expect(page.locator('#metrics')).toContainText('Draw calls');
 // Shader compile failures show in WebGLRenderer's console, even without
 // an uncaught JS error. Do not silently accept those regressions.
 expect(errors).toEqual([]);
});
