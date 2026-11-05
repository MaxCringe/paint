import {createStudioLibrary} from './StudioLibrary.js';
import {ORIGINAL_FIELDS} from '../../systems/fire/OriginalPreset.js';
import {compositionThumbnail} from './CompositionGallery.js';
import {EDITOR_BUILD} from './EditorBuild.js';
import {LAYER_NAMES,LAYER_FIELDS,EMITTER_FIELDS,SHAPES,EFFECT_PRESETS,APPEARANCE_GALLERY} from './EffectLayers.js';
import {PINE_SPECIES} from './FirePreset.js';
const LABELS=['Сосновая группа','Ель бегуна','Таёжная ель','Сухая сосна','Секвойя','Сосна обыкновенная'];
const PARAM_HELP={height:'Высота языка от основания до кончиков.',flameHeight:'Как высоко поднимается пламя над поверхностью.',width:'Ширина основания пламени.',flameWidth:'Насколько широко расходятся языки.',intensity:'Усиливает свечение огня, сохраняя положение очага.',speed:'Скорость движения эффекта. Скорость забега не меняется.',animationSpeed:'Темп огня и частиц, без изменения скорости игры.',colorTemperature:'Слева — тёплый красно-оранжевый огонь, справа — светлая жёлто-белая сердцевина.',opacity:'0 — невидимый слой, 1 — максимальная плотность.',rate:'Сколько новых частиц появляется за секунду.',count:'Максимум одновременно видимых частиц или участков.',size:'Начальный размер одной частицы.',growth:'Насколько быстро расширяется дым с возрастом.',life:'Сколько секунд живёт частица до растворения.',rise:'Как быстро дым поднимается над очагом.',flameDensity:'Больше языков делает огонь гуще и увеличивает нагрузку.',smokeAmount:'Количество дыма в композиции оригинала.',sparkCount:'Количество одновременно видимых искр в пределах бюджета.',swayStrength:'Насколько сильно языки отклоняются и колеблются.',spreadSpeed:'Скорость перехода огня от нижних ветвей к верхушке. Ноль — постоянный огонь.',seed:'Одинаковое число повторяет тот же рисунок эффекта. Seed леса задаётся отдельно.',forkStrength:'Сила разделения верхушки на несколько кончиков.',shellOpacity:'Видимость внешней полупрозрачной оболочки.',octaves:'Больше деталей шума даёт более сложный рисунок и повышает нагрузку.',brightness:'Яркость свечения без изменения формы.',stage:'От нижних ветвей через крону к затуханию и тлению.'};
function control(kind,key,spec,value){
 const help=spec.help??(kind==='overall'?'Меняет размер всего очага вместе с дымом и частицами.':PARAM_HELP[key])??'Изменяет '+spec.label.toLocaleLowerCase('ru')+' только у выбранного эффекта.';
 const label=document.createElement('label');label.className='effect-field';label.title=help;
 const title=document.createElement('span');title.textContent=spec.label;label.append(title);
 const row=document.createElement('span');row.className='effect-value';
 const input=document.createElement('input');input.dataset.kind=kind;input.dataset.param=key;input.title=help;input.name=kind+'.'+key;
 if(spec.type==='select'){const select=document.createElement('select');select.dataset.kind=kind;select.dataset.param=key;select.name=input.name;for(const [id,name] of Object.entries(spec.options))select.add(new Option(name,id));select.value=value;select.title=help;row.append(select);}
 else if(spec.type==='color'){input.type='color';input.value=value;row.append(input);}
 else{
  input.type='range';input.min=spec.min;input.max=spec.max;input.step=spec.step;input.value=value;
  input.title=help+' Диапазон '+spec.min+'…'+spec.max;
  const number=input.cloneNode();number.type='number';number.name=input.name+'.number';number.value=Number(Number(value).toFixed(4));
  number.setAttribute('aria-label',spec.label+' — точное значение');row.append(input,number);
 }
 const reset=document.createElement('button');reset.type='button';reset.textContent='↺';reset.title='Сбросить параметр «'+spec.label+'»';reset.setAttribute('aria-label','Сбросить '+spec.label);reset.dataset.resetKind=kind;reset.dataset.resetParam=key;row.append(reset);label.append(row);return label;
}
export function createEffectPanel({onLayout=()=>{}}={}){
 const panel=document.createElement('div');panel.className='world-editor';panel.innerHTML=`
 <div class="hint">ЛКМ — выбор / вращение · ПКМ — панорама · Колесо — приближение<br>WASD — полёт · Q/E — высота · F — к очагу · Shift — быстрее</div>
 <aside aria-label="Редактор мира"><h2>Эффекты мира</h2><p data-build></p><p data-metrics></p><p>Забег остановлен. Изменяется только выбранный очаг.</p>
 <h3>1. Что добавить</h3><div class="quick-add"><button data-add-kind="fire">Добавить огонь</button><button data-add-kind="smoke">Добавить дым</button><button data-add-kind="sparks">Добавить искры</button><button data-add-kind="smolder">Добавить тление</button></div>
 <h3>2. Внешний вид</h3><div data-gallery class="composition-gallery"></div>
 <label>Композиция / пресет<select name="effect-preset"></select></label><p>Форма пламени, состав слоёв и источник настраиваются отдельно.</p>
 <h3>3. Поставить в сцене</h3><label>Объект<select name="species">${PINE_SPECIES.map((id,i)=>`<option value="${id}">${LABELS[i]}</option>`).join('')}<option value="deck">Деревянная переправа</option><option value="world">Свободные эффекты сцены</option></select></label>
 <div class="row"><button data-action="focus">К очагу · F</button><button data-action="next">Другой экземпляр</button></div>
 <label class="advanced-only">Очаг<select name="anchor"></select></label>
 <label>Размещение<select name="placement"><option value="surface">На выбранном объекте</option><option value="world">Свободная точка сцены</option></select></label>
 <div class="row"><button class="primary" data-action="add">Разместить вручную</button><button data-action="delete" data-needs-anchor>Удалить</button></div>
 <div class="row"><button data-action="duplicate" data-needs-anchor>Дублировать</button><button data-action="snap" data-needs-anchor>На поверхность</button></div>
 <div class="row"><button data-mode="translate">Двигать</button><button data-mode="rotate">Повернуть</button><button data-mode="scale">Масштаб</button></div>

 <p>Пресет меняет слои и источник, сохраняя позицию и привязку.</p>
 <details open class="scene-objects"><summary>Объекты сцены</summary><p data-scene-count></p><p data-scene-empty>Пока нет созданных эффектов.</p><select name="scene-effects" size="4" aria-label="Объекты сцены"></select><div class="row"><button data-action="scene-focus" data-needs-anchor>К эффекту</button><button data-action="scene-duplicate" data-needs-anchor>Копия</button><button data-action="scene-delete" data-needs-anchor>Удалить эффект</button></div></details><h3>4. Настроить</h3><div data-layers></div><div class="row"><select name="add-layer"></select><button data-action="add-layer" data-needs-anchor>Добавить слой</button></div>
 <div class="row"><button data-action="delete-layer" data-needs-anchor>Удалить слой</button><button data-action="reset-layer" data-needs-anchor>Сбросить слой</button></div>
 <div data-basic-controls></div>
 <details data-advanced><summary>Дополнительные настройки слоя</summary><div data-advanced-controls></div></details>
 <details><summary>Источник и трансформация</summary><label>Форма<select name="emitter-shape">${Object.entries(SHAPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div data-emitter-controls></div>
 ${['position','rotation','scale'].map((key,i)=>`<p>${['Локальная позиция / кромка','Поворот, градусы','Масштаб'][i]}</p><div class="axis">${['X','Y','Z'].map((axis,j)=>`<label>${axis}<input data-needs-anchor name="${key}${j}" type="number" step=".05"></label>`).join('')}</div>`).join('')}</details>
 <details data-tree-cycle><summary>Стадии горения дерева</summary><p>Последовательность управляет всеми очагами только этого объекта.</p>
 <label>Режим<select name="cycle-mode"><option value="constant">Постоянное горение</option><option value="manual">Ручная стадия</option><option value="auto">Автоматический цикл</option></select></label><div data-cycle-controls></div>
 <label class="advanced-only">Характер горения<select name="cycle-curve"><option value=artistic>Художественный r3</option><option value=studio>Оригинал Fire Studio</option></select></label><label>Повторять<input name="cycle-repeat" type="checkbox"></label><div class="row"><button data-action="pause-cycle">Пауза стадии</button><button data-action="restart-cycle">Сначала нижние ветви</button></div><p data-cycle-state></p></details>
 <label>Рабочее освещение<input name="work-light" type="checkbox" checked></label>
 <a class="comparison-link" href="effects-comparison.html" target="_blank" rel="noopener">Сравнить формы, дым и стадии</a>
 <div class="row"><button data-action="pause-effects">Пауза эффектов</button><button data-action="restart-effects">Перезапустить</button></div>
 <div class="row"><button data-action="undo">Отменить</button><button data-action="redo">Повторить</button></div>
 <details><summary>Группа и массовые действия</summary>
 <label><span>Объект в группе</span><input name="group-member" type="checkbox"></label><p data-group-count></p>
 <button data-action="apply-object" data-needs-anchor>Применить к очагам объекта</button><p>Копирует слои и форму источника, не перемещая очаги.</p>
 <button data-action="apply-group" data-needs-anchor>Применить к выбранной группе</button>
 <button data-action="clear-group">Очистить группу</button></details>
 <details><summary>Распределить по дереву</summary>
 <label>Число очагов<input name="distribution-count" type="number" min="1" max="32" value="8"></label>
 <label>Высота от, доля<input name="distribution-min" type="number" min="0" max="1" step=".05" value=".1"></label>
 <label>Высота до, доля<input name="distribution-max" type="number" min="0" max="1" step=".05" value=".9"></label>
 <label>Масштаб от<input name="distribution-size-min" type="number" min=".1" max="3" step=".1" value=".5"></label>
 <label>Масштаб до<input name="distribution-size-max" type="number" min=".1" max="3" step=".1" value="1.2"></label>
 <label>Seed<input name="distribution-seed" type="number" min="0" max="4294967295" value="1337"></label>
 <button data-action="distribute">Заменить очаги дерева</button></details>
 <details><summary>Мои пресеты</summary><label>Имя<input name="preset-name" maxlength="60" placeholder="Например: Синий дым"></label><button data-action="save-named" data-needs-anchor>Сохранить именованный пресет</button></details>
 <div class="row"><button data-action="reset">Сбросить объект</button><button data-action="copy">Скопировать настройки</button></div>
 <div class="row"><button data-action="import">Импорт</button><button data-action="export">Экспорт</button></div>
 <p>Сброс удаляет только эффекты мира и пользовательские пресеты. Рекорды и настройки игры сохраняются.</p><button type="button" data-action="reset-all-effects">Сбросить все эффекты</button>
 <input name="file" type="file" accept="application/json,.json" hidden>
 <details><summary>Сцена и бюджет</summary><label>Seed леса<input name="seed" type="number" min="0" max="4294967295"></label><button data-action="seed">Пересоздать сцену</button>
 <label>Бюджет частиц<input name="budget" type="number" min="128" max="16384" step="128"></label><p>Дальние эффекты автоматически упрощаются.</p></details>
 <output role="status"></output><button class="primary" data-action="close">Закрыть редактор</button></aside>`;
 const inspector=panel.querySelector('aside');inspector.classList.add('studio-inspector');inspector.setAttribute('aria-label','Настройки эффекта');
 const library=createStudioLibrary();panel.append(library.element);
 const header=document.createElement('header');header.className='studio-header';header.innerHTML='<strong>Fire Studio <span>2.0</span></strong><button data-layout="library" aria-expanded="true">Библиотека</button><button data-layout="inspector" aria-expanded="true">Настройки</button><label>Качество<select name="preview-quality"><option value="low">Лёгкое</option><option value="medium" selected>Среднее</option><option value="high">Высокое</option></select></label><button data-action="save" class="primary">Сохранить</button>';
 header.append(panel.querySelector('[data-build]'));for(const action of ['undo','redo','import','export','close'])header.append(panel.querySelector('[data-action='+action+']'));panel.prepend(header);
 const status=document.createElement('div');status.className='studio-status';status.append(panel.querySelector('output'));panel.append(status);
 const viewport=document.createElement('div');viewport.className='studio-viewport';viewport.setAttribute('aria-label','3D-сцена');panel.append(viewport);
 const timeline=document.createElement('div');timeline.className='studio-timeline';timeline.innerHTML='<label>Время<input name="timeline-time" type="range" min="0" max="120" step=".01" value="0"><input name="timeline-number" type="number" min="0" max="120" step=".1" value="0" aria-label="Время эффекта, секунды"></label><label>Скорость<select name="timeline-speed"><option value=".25">¼×</option><option value=".5">½×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="3">3×</option></select></label><button data-action="stop-preview" hidden>Завершить предпросмотр</button>';
 timeline.prepend(panel.querySelector('[data-action=restart-effects]'));timeline.prepend(panel.querySelector('[data-action=pause-effects]'));panel.append(timeline);
 const sceneTools=document.createElement('nav');sceneTools.className='studio-scene-tools';sceneTools.setAttribute('aria-label','Инструменты сцены');for(const selector of ['[data-action=focus]','[name=placement]','[data-action=add]','[data-action=duplicate]','[data-mode=translate]'])sceneTools.append(panel.querySelector(selector).parentElement);panel.append(sceneTools);panel.querySelector('[data-action=next]').classList.add('advanced-only');panel.querySelector('[name=placement]').parentElement.classList.add('advanced-only');panel.querySelector('[data-metrics]').classList.add('advanced-only');for(const p of inspector.querySelectorAll('p'))if(p.textContent.startsWith('Форма пламени')||p.textContent.startsWith('Пресет меняет'))p.classList.add('advanced-only');
 const quick=panel.querySelector('.quick-add');library.element.querySelector('[data-quick-library]').append(quick,panel.querySelector('[name=effect-preset]').parentElement);
 panel.querySelector('[data-gallery]').remove();inspector.querySelectorAll('h3').forEach(el=>el.remove());inspector.querySelector('h2').textContent='Настройки эффекта';
 const mode=document.createElement('div');mode.className='inspector-tabs';mode.innerHTML='<button data-inspector="simple" data-active="true">Простой</button><button data-inspector="advanced">Расширенный</button>';inspector.querySelector('h2').after(mode);
 const empty=document.createElement('p');empty.dataset.emptyInspector='';empty.textContent='Выберите очаг в сцене или добавьте эффект из библиотеки.';mode.after(empty);
 const original=document.createElement('div');original.dataset.originalControls='';panel.querySelector('[data-basic-controls]').before(original);
 const size=document.createElement('div');size.dataset.overallSize='';original.before(size);
 const exports=document.createElement('div');exports.className='advanced-only row';exports.innerHTML='<button data-action=export-original title="Исходные параметры Fire Studio. Ручные правки слоёв сохраняются в общем JSON." data-needs-anchor>JSON оригинала</button><button data-action=export-code data-needs-anchor>Пример подключения</button><button data-action=restore-import>Восстановить до импорта</button>';inspector.append(exports);
 const extra=document.createElement('div');extra.className='row';extra.innerHTML='<button data-action="paste" data-needs-anchor>Вставить настройки</button><button data-action="restore-preset" data-needs-anchor>Вернуть пресет</button>';panel.querySelector('[data-action=copy]').parentElement.after(extra);
 const changes=document.createElement('p');changes.dataset.presetChanges='';extra.after(changes);
 const sceneTip=panel.querySelector('.hint');sceneTip.innerHTML='<span data-scene-tip>Выберите эффект слева, затем нажмите на дерево или поверхность.</span><small>ЛКМ — выбор и вращение · ПКМ — панорама · WASD — полёт · Q/E — высота · F — фокус</small>';
 for(const details of inspector.querySelectorAll('details'))if(!details.hasAttribute('data-tree-cycle')&&!details.classList.contains('scene-objects'))details.classList.add('advanced-only');
 for(const action of ['add-layer','delete-layer','reset-layer'])panel.querySelector('[data-action='+action+']').parentElement.classList.add('advanced-only');
 panel.querySelector('[name=emitter-shape]').closest('details').classList.add('advanced-only');
 panel.querySelector('[name=work-light]').parentElement.classList.add('advanced-only');panel.querySelector('.comparison-link').classList.add('advanced-only');
 panel.dataset.inspectorMode='simple';
 if(innerWidth<1100){panel.classList.add('library-hidden','inspector-hidden');header.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-expanded','false'));}
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.layout){const name=b.dataset.layout,hidden=panel.classList.toggle(name+'-hidden');b.setAttribute('aria-expanded',String(!hidden));onLayout();}if(b.dataset.inspector){panel.dataset.inspectorMode=b.dataset.inspector;panel.querySelectorAll('[data-inspector]').forEach(v=>v.dataset.active=String(v===b));if(lastRefresh)refresh(lastRefresh);}});
 const identity=panel.querySelector('[data-build]');identity.dataset.editorRevision=EDITOR_BUILD.revision;identity.textContent='Редактор r'+EDITOR_BUILD.revision+' · '+EDITOR_BUILD.commit.slice(0,7)+(EDITOR_BUILD.dirty?' · рабочая копия':'');identity.title=EDITOR_BUILD.commit+' '+EDITOR_BUILD.builtAt;
 let selectedKind='flame',lastRefresh;
 function refresh(state){lastRefresh=state;const {preset,selected,anchor,list,anchorId,history,armed,paused,presetId,addKind='fire',cycle,mode='idle',sceneEntries=[],sceneLimit=2048,sceneTotal=sceneEntries.length}=state;
  const $=s=>panel.querySelector(s),a=anchor;
  panel.dataset.mode=mode;const sceneList=$('[name=scene-effects]');sceneList.replaceChildren();for(const entry of sceneEntries){const option=new Option(entry.label,entry.key);option.disabled=!entry.available;sceneList.add(option);}sceneList.value=sceneEntries.find(v=>v.sourceId===selected?.id&&v.id===anchorId)?.key??'';sceneList.hidden=!sceneEntries.length;$('[data-scene-empty]').hidden=sceneEntries.length>0;$('[data-scene-count]').textContent=sceneEntries.length+' эффектов · '+list.length+'/32 у цели · '+sceneTotal+'/'+sceneLimit+' всего';
if(a&&!a.layers[selectedKind])selectedKind=Object.keys(a.layers)[0]??'flame';
  $('[name=species]').value=selected?.key??'world';$('[name=anchor]').replaceChildren(new Option('Выберите очаг',''));
  list.forEach((item,i)=>$('[name=anchor]').add(new Option('Очаг '+(i+1),item.id)));$('[name=anchor]').value=anchorId??'';
  panel.querySelectorAll('[data-needs-anchor]').forEach(el=>el.disabled=!a);
  $('[data-action=undo]').disabled=history.index===0;$('[data-action=redo]').disabled=history.index===history.entries.length-1;
  $('[data-action=add]').dataset.active=String(armed);$('[data-action=add]').textContent=armed?'Отменить размещение':'Разместить вручную';$('[data-action=add]').disabled=false;
  $('[data-action=pause-effects]').textContent=paused?'Продолжить эффекты':'Пауза эффектов';
  $('[name=seed]').value=preset.seed;$('[name=budget]').value=preset.budget;
  $('[name=group-member]').checked=preset.group.includes(selected?.id);$('[name=group-member]').disabled=!selected||selected.id==='world';
  $('[data-group-count]').textContent='Выбрано объектов: '+preset.group.length;
  $('[data-action=distribute]').disabled=!selected?.key?.startsWith('pine:');
  const menu=$('[name=effect-preset]');menu.replaceChildren();for(const [id,v] of Object.entries(EFFECT_PRESETS))menu.add(new Option(v.name,id));preset.customPresets.forEach((v,i)=>menu.add(new Option(v.name,'user:'+i)));menu.value=presetId;
  library.refresh(preset.customPresets,presetId);
  $('[data-empty-inspector]').hidden=Boolean(a);
  $('[data-overall-size]').replaceChildren();if(a)$('[data-overall-size]').append(control('overall','size',{label:'Размер целиком',type:'number',min:.1,max:5,step:.05,value:1},a.scale[0]));
  $('[data-original-controls]').replaceChildren();
  if(a?.original&&selectedKind==='flame'){for(const [key,[label,min,max,step]] of Object.entries(ORIGINAL_FIELDS)){const field=control('original',key,{label,type:'number',min,max,step,value:a.original[key]},a.original[key]);if(['sparkCount','sparkSize','smokeAmount','swayStrength','spreadSpeed','seed'].includes(key))field.classList.add('advanced-only');$('[data-original-controls]').append(field);}const label=document.createElement('label');label.textContent='Качество оригинала';label.innerHTML+='<select name=original-quality><option value=low>Низкое</option><option value=medium>Среднее</option><option value=high>Высокое</option></select>';label.querySelector('select').value=a.original.quality;$('[data-original-controls]').append(label);const mode=document.createElement('label');mode.textContent='Режим оригинала';mode.innerHTML+='<select name=original-mode><option value=tree>Дерево</option><option value=lava>Лава</option><option value=smoldering>Тление</option></select>';mode.querySelector('select').value=a.original.mode;mode.className='advanced-only';$('[data-original-controls]').append(mode);}
  const value=EFFECT_PRESETS[presetId]??preset.customPresets[Number(presetId.slice(5))];$('[data-preset-changes]').textContent=a&&value&&JSON.stringify(a.layers)!==JSON.stringify(value.layers)?'Эффект изменён относительно пресета. Сохраните новый образ в «Мои пресеты».':'';
  for(const action of ['export-original','export-code'])$('[data-action='+action+']').disabled=!a?.original;
  const tree=Boolean(selected?.key?.startsWith('pine:'));
  $('[data-tree-cycle]').hidden=!tree;
  $('[name=cycle-curve]').value=cycle?.curve??'artistic';$('[name=cycle-mode]').value=cycle?.mode??'constant';$('[name=cycle-repeat]').checked=cycle?.repeat??true;$('[name=cycle-repeat]').disabled=cycle?.mode!=='auto';
  $('[data-action=pause-cycle]').textContent=cycle?.paused?'Продолжить стадию':'Пауза стадии';
  $('[data-action=pause-cycle]').disabled=!tree||cycle?.mode!=='auto';$('[data-action=restart-cycle]').disabled=!tree||cycle?.mode==='constant';
  const controls=$('[data-cycle-controls]');controls.replaceChildren();
  if(tree&&cycle?.mode!=='constant'){
   const stage=control('cycle','stage',{label:'Стадия: низ → крона → тление',type:'number',value:0,min:0,max:1,step:.01},cycle.stage);if(cycle.mode==='auto')stage.querySelectorAll('input').forEach(el=>el.disabled=true);controls.append(stage);
   if(cycle.mode==='auto'){controls.append(control('cycle','speed',{label:'Скорость цикла',type:'number',value:1,min:.1,max:5,step:.1},cycle.speed),control('cycle','duration',{label:'Длительность, с',type:'number',value:24,min:2,max:120,step:1},cycle.duration));}
  }
  const layers=$('[data-layers]');layers.replaceChildren();
  if(a)for(const [kind,layer] of Object.entries(a.layers)){
   const row=document.createElement('div');row.className='layer-row';
   const check=document.createElement('input');check.type='checkbox';check.checked=layer.enabled;check.dataset.enableLayer=kind;check.setAttribute('aria-label','Видимость: '+LAYER_NAMES[kind]);
   const button=document.createElement('button');button.dataset.chooseLayer=kind;button.dataset.active=String(kind===selectedKind);button.textContent=LAYER_NAMES[kind];row.append(check,button);layers.append(row);
  }
  $('[data-action=delete-layer]').disabled=!a?.layers[selectedKind];$('[data-action=reset-layer]').disabled=!a?.layers[selectedKind];
  const add=$('[name=add-layer]');add.replaceChildren();for(const [id,name] of Object.entries(LAYER_NAMES))if(!a?.layers[id])add.add(new Option(name,id));$('[data-action=add-layer]').disabled=!a||!add.options.length;
  for(const container of ['[data-basic-controls]','[data-advanced-controls]','[data-emitter-controls]'])$(container).replaceChildren();
  if(a?.layers[selectedKind])for(const [key,spec] of Object.entries(LAYER_FIELDS[selectedKind])){
   const layer=a.layers[selectedKind];if(selectedKind==='flame'&&(layer.shape==='studio'?key==='fullness':['studioMode','octaves','light'].includes(key)))continue;if(['period','burstCount'].includes(key)&&layer.mode!=='burst'||key==='rate'&&layer.mode==='burst')continue;
   const field=control(selectedKind,key,spec,layer[key]);const simple={flame:['shape','height','width','intensity','speed','colorMiddle','brightness'],smoke:['rate','size','rise','opacity','colorStart'],sparks:['rate','size','speed','angle','colorStart'],embers:['rate','size','speed','angle','colorStart'],coals:['count','size','glow','colorHot']};const basic=simple[selectedKind].includes(key)&&(!a.original||selectedKind!=='flame'||key==='brightness');if(!basic)field.classList.add('advanced-only');$(basic?'[data-basic-controls]':'[data-advanced-controls]').append(field);
  }
  $('[name=emitter-shape]').disabled=!a;$('[name=emitter-shape]').value=a?.emitter.shape??'point';
  const emitterKeys={point:[],circle:['radius'],area:['width','depth'],line:['length'],cone:['radius','angle']};
  if(a)for(const key of emitterKeys[a.emitter.shape])$('[data-emitter-controls]').append(control('emitter',key,EMITTER_FIELDS[key],a.emitter[key]));
  for(const key of ['position','rotation','scale'])for(let i=0;i<3;i++)$(`[name=${key}${i}]`).value=a?Number((key==='rotation'?a[key][i]*180/Math.PI:a[key][i]).toFixed(3)):0;
 }
 return {element:panel,refresh,viewport,library,get layer(){return selectedKind;},chooseLayer(kind){selectedKind=kind;}};
}
