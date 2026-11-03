import {test,expect} from '@playwright/test';
const enabled=process.env.WORLD_EDITOR_TESTS==='1';
const STORAGE='knottyPine.worldFire.v1';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
async function errorsAndShaders(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|world effect|World editor/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{window.__effectShaders={smoke:0,particles:0};for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]){const original=proto.shaderSource;proto.shaderSource=function(shader,source){if(source.includes('attribute vec4 aTint'))window.__effectShaders.smoke++;if(source.includes('attribute float aSize,aKind'))window.__effectShaders.particles++;return original.call(this,shader,source);};}});
 return errors;
}
async function number(editor,name,value){const input=editor.locator('[name="'+name+'"]');await input.fill(String(value));await input.press('Tab');}
async function details(editor,name){const summary=editor.locator('summary').filter({hasText:name});if(!(await summary.evaluate(el=>el.parentElement.open)))await summary.click();}
async function exportJson(page,editor){const wait=page.waitForEvent('download');await editor.getByRole('button',{name:'Экспорт',exact:true}).click();const file=await wait,stream=await file.createReadStream();let text='';for await(const chunk of stream)text+=chunk;return JSON.parse(text);}
test.describe('layered world effects',()=>{
 test.skip(!enabled,'Requires VITE_ENABLE_WORLD_EDITOR=true build');
 test('independent smoke/sparks, combination, live controls, named preset, history and ordinary-run reload',async({page})=>{
  test.setTimeout(240000);const errors=await errorsAndShaders(page);
  await page.goto('/?worldEditor=1&seed=1337',{waitUntil:'domcontentloaded'});const editor=page.locator('.world-editor');await expect(editor).toBeVisible({timeout:60000});
  await editor.locator('[name=species]').selectOption('world');
  await editor.locator('[name=effect-preset]').selectOption('lightSmoke');await editor.getByRole('button',{name:'Добавить эффект',exact:true}).click();
  const box=await page.locator('body > canvas').boundingBox();await page.mouse.click(box.width*.5,box.height*.65);
  await expect(editor.locator('[name=anchor]')).not.toHaveValue('');const id=await editor.locator('[name=anchor]').inputValue();
  await expect(editor.locator('[data-choose-layer=smoke]')).toBeVisible();await expect(editor.locator('[data-choose-layer=flame]')).toHaveCount(0);
  await expect(editor.locator('[data-metrics]')).toHaveText(/дым [1-9]/);
  await number(editor,'smoke.rate.number',14);expect((await read(page)).world[0].layers.smoke.rate).toBe(14);
  await details(editor,'Источник и трансформация');for(const [key,value] of [['position0',0],['position1',1],['position2',-5]])await number(editor,key,value);
  const transform=(await read(page)).world[0].position;
  await editor.getByRole('button',{name:'Пауза эффектов',exact:true}).click();
  const image1=await page.locator('body > canvas').screenshot();await number(editor,'smoke.opacity.number',.7);const image2=await page.locator('body > canvas').screenshot({path:test.info().outputPath('light-smoke.png')});expect(image1.equals(image2)).toBe(false);
  await editor.getByRole('button',{name:'Перезапустить',exact:true}).click();await editor.getByRole('button',{name:'Продолжить эффекты',exact:true}).click();
  await editor.locator('[name=effect-preset]').selectOption('sparkStream');
  await expect(editor.locator('[data-choose-layer=smoke]')).toHaveCount(0);await expect(editor.locator('[data-choose-layer=flame]')).toHaveCount(0);await expect(editor.locator('[data-metrics]')).toHaveText(/искры [1-9]/);
  await editor.locator('[name=effect-preset]').selectOption('magic');await expect(editor.locator('[data-metrics]')).toHaveText(/пламя [1-9]/);const magicImage=await page.locator('body > canvas').screenshot({path:test.info().outputPath('magic-fire.png')});expect(magicImage.equals(image2)).toBe(false);expect((await read(page)).world[0].position).toEqual(transform);
  await details(editor,'Мои пресеты');await editor.locator('[name=preset-name]').fill('Синий тест');await editor.getByRole('button',{name:'Сохранить именованный пресет',exact:true}).click();expect((await read(page)).customPresets[0].name).toBe('Синий тест');
  await editor.locator('[name=add-layer]').selectOption('smoke');await editor.getByRole('button',{name:'Добавить слой',exact:true}).click();await number(editor,'smoke.rate.number',14);
  await editor.locator('[name=add-layer]').selectOption('embers');await editor.getByRole('button',{name:'Добавить слой',exact:true}).click();expect(Object.keys((await read(page)).world[0].layers).length).toBe(4);
  await editor.getByRole('checkbox',{name:'Видимость: Пламя',exact:true}).uncheck();expect((await read(page)).world[0].layers.flame.enabled).toBe(false);
  await editor.locator('[data-choose-layer=flame]').click();await editor.getByRole('button',{name:'Удалить слой',exact:true}).click();expect((await read(page)).world[0].layers.flame).toBeUndefined();
  await editor.getByRole('button',{name:'Отменить',exact:true}).click();await editor.locator('[name=anchor]').selectOption(id);expect((await read(page)).world[0].layers.flame.enabled).toBe(false);
  await page.screenshot({path:test.info().outputPath('layered-effects.png')});
  const exported=await exportJson(page,editor);expect(exported.version).toBe(2);expect(exported.world[0].layers.smoke.rate).toBe(14);
  await editor.locator('[name=file]').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await expect(editor.locator('output')).toContainText('Пресет импортирован');expect(await read(page)).toEqual(exported);
  const before=await read(page);await editor.locator('[name=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":2,"seed":-4}')});await expect(editor.locator('output')).toContainText('Некорректный');expect(await read(page)).toEqual(before);
  await page.reload({waitUntil:'domcontentloaded'});await expect(editor).toBeVisible({timeout:60000});await editor.locator('[name=species]').selectOption('world');await editor.locator('[name=anchor]').selectOption(id);expect((await read(page)).world).toEqual(exported.world);
  await editor.getByRole('button',{name:'Закрыть редактор',exact:true}).click();
  // Same saved preset, no editor URL and no editor interaction: real smoke and
  // particle programs must be compiled by the ordinary game's runtime.
  await page.goto('/',{waitUntil:'domcontentloaded'});await expect(editor).toHaveCount(0);
  await page.waitForFunction(()=>window.__effectShaders.smoke>0&&window.__effectShaders.particles>0,{timeout:60000});
  await expect(page.locator('#start')).toBeEnabled({timeout:90000});await page.locator('#start').click();await page.keyboard.press('Escape');await expect(page.locator('#resume')).toBeVisible();expect(errors).toEqual([]);
 });
 test('object isolation, explicit group application, seeded placement and saturated budget',async({page})=>{
  test.setTimeout(200000);const errors=await errorsAndShaders(page);
  await page.goto('/?worldEditor=1&seed=1337',{waitUntil:'domcontentloaded'});const editor=page.locator('.world-editor');await expect(editor).toBeVisible({timeout:60000});
  await editor.locator('[name=anchor]').selectOption({index:1});await editor.locator('[name=effect-preset]').selectOption('magic');const first=Object.keys((await read(page)).objects)[0];
  await details(editor,'Группа и массовые действия');await editor.locator('[name=group-member]').check();
  await editor.locator('[name=species]').selectOption('pine:dead_snag');await editor.locator('[name=group-member]').check();expect(Object.keys((await read(page)).objects)).toEqual([first]);
  await editor.locator('[name=anchor]').selectOption({index:1});await editor.locator('[name=effect-preset]').selectOption('inferno');const before=await read(page);expect(Object.keys(before.objects).length).toBe(2);expect(before.objects[first].anchors[0].layers.flame.colorMiddle).toBe('#23a9ff');
  await editor.getByRole('button',{name:'Применить к выбранной группе',exact:true}).click();const after=await read(page);expect(after.objects[first].anchors.every(a=>a.layers.flame.height===2.6)).toBe(true);expect(after.objects[first].anchors.map(a=>a.position)).toEqual(before.objects[first].anchors.map(a=>a.position));
  await editor.locator('[name=species]').selectOption('pine:sequoia_giant');await details(editor,'Распределить по дереву');await number(editor,'distribution-count',5);await number(editor,'distribution-min',0);await number(editor,'distribution-max',1);await number(editor,'distribution-seed',42);
  await editor.getByRole('button',{name:'Заменить очаги дерева',exact:true}).click();const p1=await read(page),third=Object.keys(p1.objects).find(id=>!before.objects[id]);expect(p1.objects[third].anchors.length).toBe(5);
  await editor.getByRole('button',{name:'Заменить очаги дерева',exact:true}).click();expect((await read(page)).objects[third]).toEqual(p1.objects[third]);
  await details(editor,'Сцена и бюджет');await number(editor,'budget',128);await expect(editor.locator('[data-metrics]')).toHaveText(/\/128 частиц/);
  const text=await editor.locator('[data-metrics]').textContent(),active=Number(text.match(/· (\d+)\/128/)[1]);expect(active).toBeLessThanOrEqual(128);
  const sample=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();let frames=0;function tick(){if(++frames===8)resolve({frames,elapsed:performance.now()-start});else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));expect(sample.frames).toBe(8);console.log('LAYERED_EFFECTS_PERF',JSON.stringify(sample));await test.info().attach('saturated-scene.json',{body:Buffer.from(JSON.stringify(sample)),contentType:'application/json'});
  await editor.getByRole('button',{name:'Закрыть редактор',exact:true}).click();await page.locator('#world-editor-reopen').click();await expect(editor).toBeVisible();await editor.getByRole('button',{name:'Закрыть редактор',exact:true}).click();expect(errors).toEqual([]);
 });
});

test('saved standalone smoke runs in the public build while authoring UI stays disabled',async({page})=>{
 test.skip(enabled,'Public-build check');test.setTimeout(90000);const errors=await errorsAndShaders(page);
 const {upgradePreset,newEffectAnchor,PINE_SPECIES}=await import('../../src/devtools/world/FirePreset.js');
 const {EFFECT_PRESETS,applyEffectPreset}=await import('../../src/devtools/world/EffectLayers.js');
 const preset=upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});preset.world=[applyEffectPreset(newEffectAnchor([0,1,-5]),EFFECT_PRESETS.lightSmoke)];
 await page.addInitScript(({key,preset})=>localStorage.setItem(key,JSON.stringify(preset)),{key:STORAGE,preset});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__effectShaders.smoke>0,undefined,{timeout:60000});
 await expect(page.locator('.world-editor')).toHaveCount(0);await page.locator('#menu-open-settings').click();await expect(page.locator('#menu-developer-tools')).toHaveCount(0);expect(errors).toEqual([]);
});
