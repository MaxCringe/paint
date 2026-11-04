import {test,expect} from '@playwright/test';

// The editor suite runs against Vite dev or an explicit opt-in build:
// VITE_ENABLE_WORLD_EDITOR=true npm run build
const editorEnabled=process.env.WORLD_EDITOR_TESTS==='1';
test.describe('world fire authoring',()=>{
 test.skip(!editorEnabled,'Opt-in authoring build required; ordinary production intentionally excludes the editor');
 test('surface placement, transforms, history, JSON and return to gameplay',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|World editor failed/.test(m.text()))errors.push(m.text());});
  await page.goto('/?worldEditor=1&seed=1337',{waitUntil:'domcontentloaded'});
  const editor=page.locator('.world-editor');await expect(editor).toBeVisible({timeout:60000});
  await expect(editor.locator('[data-metrics]')).toContainText('очагов');
  const initial=await page.locator('#distance').textContent();
  await page.keyboard.press('KeyW');await page.keyboard.press('KeyE');expect(await page.locator('#distance').textContent()).toBe(initial);
  await editor.locator('[name=species]').selectOption('pine:dead_snag');
  const count=await editor.locator('[name=anchor] option').count();
  await editor.locator('[name=anchor]').selectOption({index:1});
  await editor.getByRole('button',{name:'Дублировать',exact:true}).click();await expect(editor.locator('[name=anchor] option')).toHaveCount(count+1);
  await editor.getByRole('button',{name:'Отменить',exact:true}).click();await expect(editor.locator('[name=anchor] option')).toHaveCount(count);
  await editor.getByRole('button',{name:'Повторить',exact:true}).click();await expect(editor.locator('[name=anchor] option')).toHaveCount(count+1);
  // Select a near spruce and place on its actual visible triangle using a ray
  // from a deterministic projected root. The user path is a real canvas click.
  await editor.locator('[name=species]').selectOption('pine:grove_cluster');
  await editor.getByRole('button',{name:'Добавить эффект',exact:true}).click();
  const canvas=page.locator('body > canvas');const box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
  await expect(editor.locator('[name=anchor]')).not.toHaveValue('');
  await page.screenshot({path:test.info().outputPath('world-editor.png')});
  await editor.locator('summary').filter({hasText:'Источник и трансформация'}).click();
  const placedId=await editor.locator('[name=anchor]').inputValue();
  const positionBefore=await editor.locator('[name=position0]').inputValue();
  await page.mouse.move(box.x+box.width*.5+30,box.y+box.height*.5+2);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.5+80,box.y+box.height*.5-18,{steps:8});await page.mouse.up();
  await expect(editor.locator('[name=position0]')).not.toHaveValue(positionBefore);
  await editor.getByRole('button',{name:'Отменить',exact:true}).click();
  await editor.locator('[name=anchor]').selectOption(placedId);
  await expect(editor.locator('[name=position0]')).toHaveValue(positionBefore);
  await editor.getByRole('button',{name:'Повторить',exact:true}).click();
  await editor.locator('[name=anchor]').selectOption(placedId);
  await editor.locator('[name=position0]').fill('0.35');await editor.locator('[name=position0]').press('Tab');
  await editor.locator('[name="flame.height"]').fill('1.2');await editor.locator('[name="flame.height"]').dispatchEvent('change');
  const download=page.waitForEvent('download');await editor.getByRole('button',{name:'Экспорт',exact:true}).click();const file=await download;
  const stream=await file.createReadStream();let json='';for await(const chunk of stream)json+=chunk;
  const preset=JSON.parse(json);expect(preset.version).toBe(3);expect(Object.values(preset.objects).some(o=>o.anchors.some(a=>a.position[0]===.35&&a.layers.flame?.height===1.2))).toBe(true);
  await editor.locator('[name=file]').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(json)});await expect(editor.locator('output')).toContainText('Пресет импортирован');
  await editor.locator('[name=species]').selectOption('deck');await editor.locator('[name=anchor]').selectOption({index:1});await editor.locator('[name=effect-preset]').selectOption('lava');
  await expect(editor.locator('[name=anchor]')).not.toHaveValue('');
  await editor.getByRole('button',{name:'Закрыть редактор',exact:true}).click();await expect(editor).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(page.locator('#center')).toBeVisible();
  await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();await expect(page.locator('#center')).toHaveClass(/hidden/);
  await page.keyboard.press('Escape');await expect(page.locator('#resume')).toBeVisible();await page.locator('#resume').click();
  await page.keyboard.press('Escape');await expect(page.locator('#resume')).toBeVisible();
  await page.locator('#world-editor-reopen').click();await expect(editor).toBeVisible();
  await editor.getByRole('button',{name:'Закрыть редактор',exact:true}).click();await expect(page.locator('#resume')).toBeVisible();expect(errors).toEqual([]);
 });
});

test('settings exposes the world editor only in enabled builds and restores audio settings on close',async({page})=>{
 test.setTimeout(150000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const editorRequests=[];page.on('request',r=>{if(/WorldEditor.*\.js/.test(r.url()))editorRequests.push(r.url());});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('#menu-open-settings').click();
 await expect(page.locator('#audio-controls')).toBeVisible();
 const button=page.getByRole('button',{name:'Редактор мира',exact:true});
 if(!editorEnabled){
  await expect(page.locator('#menu-developer-tools')).toHaveCount(0);
  await expect(button).toHaveCount(0);expect(editorRequests).toEqual([]);return;
 }
 await expect(page.getByText('ИНСТРУМЕНТЫ РАЗРАБОТЧИКА',{exact:true})).toBeVisible();
 await expect(button).toBeVisible();expect(editorRequests).toEqual([]);
 await page.locator('#sound-volume').fill('37');await page.locator('#sound-volume').dispatchEvent('input');
 await page.locator('#music-volume').fill('28');await page.locator('#music-volume').dispatchEvent('input');
 await button.click();await expect(page.locator('.world-editor')).toBeVisible({timeout:60000});
 expect(new URL(page.url()).searchParams.has('worldEditor')).toBe(false);
 await page.getByRole('button',{name:'Закрыть редактор',exact:true}).click();
 await expect(page.locator('#menu-settings')).toBeVisible();await expect(button).toBeEnabled();
 await expect(page.locator('#sound-volume')).toHaveValue('37');await expect(page.locator('#music-volume')).toHaveValue('28');
 await button.click();await expect(page.locator('.world-editor')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#menu-settings')).toBeVisible();
 await page.locator('#menu-settings [data-menu-back]').click();
 await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();
 await page.keyboard.press('Escape');await page.locator('#menu-open-settings').click();
 await button.click();await expect(page.locator('.world-editor')).toBeVisible();
 await page.getByRole('button',{name:'Закрыть редактор',exact:true}).click();
 await expect(page.locator('#menu-settings')).toBeVisible();await page.locator('#menu-settings [data-menu-back]').click();
 await expect(page.locator('#resume')).toBeVisible();await page.locator('#resume').click();await expect(page.locator('#center')).toHaveClass(/hidden/);
 expect(errors).toEqual([]);
});
