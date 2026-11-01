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
 const gl=await page.locator('canvas').first().evaluate(canvas=>
  Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'))
 );
 expect(gl,'Chromium should provide software WebGL').toBe(true);
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

test('Fiona DEV run loads hosted FBX and all 23 Python animations without updating real attempts',async({page})=>{
 const errors=trackUnhandled(page);
 await page.goto('/');
 await page.locator('#menu-open-fiona-test').click();
 await expect(page.locator('#menu-fiona-test')).toBeVisible();
 await page.locator('#fiona-test-launch').click();
 await page.waitForFunction(()=>{
  const menu=document.getElementById('center');
  const status=document.getElementById('fiona-test-status')?.textContent||'';
  return menu?.classList.contains('hidden')||status.startsWith('Ошибка:');
 },{timeout:90_000});
 const status=await page.locator('#fiona-test-status').textContent();
 expect(await page.locator('#center').evaluate(node=>node.classList.contains('hidden')),
  'DEV Fiona failed to start; status: '+status+'; page errors: '+errors.join(' | ')).toBe(true);
 const tools=page.locator('#fiona-test-tools');
 await expect(tools).toBeVisible({timeout:30_000});
 expect(await tools.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('auto');
 await tools.locator('summary').click();
 const importedRun=page.locator('[data-fiona-run-variant="fbx"]');
 const newRun=page.locator('[data-fiona-run-variant="calibrated"]');
 const oldRun=page.locator('[data-fiona-run-variant="original"]');
 expect(await page.locator('#fiona-test-preview-status').textContent()).toContain('FBX-файлы: 3/3');
 await expect(tools).toHaveAttribute('data-fbx-imported','3');
 await expect(importedRun).toHaveAttribute('aria-pressed','true');
 await oldRun.click();
 await expect(oldRun).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Старый бег');
 await newRun.click();
 await expect(newRun).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Новый бег');
 await importedRun.click();
 await expect(importedRun).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Fast Run.fbx');
 await expect(page.locator('#fiona-test-preview-actions button:not([disabled])')).toHaveCount(23);
 const controls=page.locator('#fiona-test-preview-actions button');
 await controls.filter({hasText:'Бег'}).click();
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Fast Run.fbx');
 await controls.filter({hasText:'Прыжок'}).first().click();
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Running Jump.fbx');
 await controls.filter({hasText:'Полёт на метле'}).first().click();
 await expect(page.locator('#fiona-test-preview-status')).toContainText('Flying.fbx');
 const attempts=await page.evaluate(()=>localStorage.getItem('knottyPineRunsStarted'));
 expect(attempts,'DEV test must not count as a real run').toBeNull();
 await page.keyboard.press('Escape');
 await expect(page.locator('#resume')).toBeVisible();
 expect(errors).toEqual([]);
});
