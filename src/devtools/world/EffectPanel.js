import {compositionThumbnail} from './CompositionGallery.js';
import {EDITOR_BUILD} from './EditorBuild.js';
import {LAYER_NAMES,LAYER_FIELDS,EMITTER_FIELDS,SHAPES,EFFECT_PRESETS,APPEARANCE_GALLERY} from './EffectLayers.js';
import {PINE_SPECIES} from './FirePreset.js';
const LABELS=['Сосновая группа','Ель бегуна','Таёжная ель','Сухая сосна','Секвойя','Сосна обыкновенная'];
function control(kind,key,spec,value){
 const label=document.createElement('label');label.className='effect-field';
 const title=document.createElement('span');title.textContent=spec.label;label.append(title);
 const row=document.createElement('span');row.className='effect-value';
 const input=document.createElement('input');input.dataset.kind=kind;input.dataset.param=key;input.name=kind+'.'+key;
 if(spec.type==='select'){const select=document.createElement('select');select.dataset.kind=kind;select.dataset.param=key;select.name=input.name;for(const [id,name] of Object.entries(spec.options))select.add(new Option(name,id));select.value=value;row.append(select);}
 else if(spec.type==='color'){input.type='color';input.value=value;row.append(input);}
 else{
  input.type='range';input.min=spec.min;input.max=spec.max;input.step=spec.step;input.value=value;
  input.title=spec.label+': '+spec.min+'…'+spec.max;
  const number=input.cloneNode();number.type='number';number.name=input.name+'.number';number.value=Number(Number(value).toFixed(4));
  number.setAttribute('aria-label',spec.label+' — точное значение');row.append(input,number);
 }
 const reset=document.createElement('button');reset.type='button';reset.textContent='↺';reset.title='Сбросить параметр «'+spec.label+'»';reset.setAttribute('aria-label','Сбросить '+spec.label);reset.dataset.resetKind=kind;reset.dataset.resetParam=key;row.append(reset);label.append(row);return label;
}
export function createEffectPanel(){
 const panel=document.createElement('div');panel.className='world-editor';panel.innerHTML=`
 <div class="hint">ЛКМ — выбор / вращение · ПКМ — панорама · Колесо — приближение<br>WASD — полёт · Q/E — высота · F — к очагу · Shift — быстрее</div>
 <aside aria-label="Редактор мира"><h2>Эффекты мира</h2><p data-build></p><p data-metrics></p><p>Забег остановлен. Изменяется только выбранный очаг.</p>
 <h3>1. Что добавить</h3><div class="quick-add"><button data-add-kind="fire">Добавить огонь</button><button data-add-kind="smoke">Добавить дым</button><button data-add-kind="sparks">Добавить искры</button><button data-add-kind="smolder">Добавить тление</button></div>
 <h3>2. Внешний вид</h3><div data-gallery class="composition-gallery"></div>
 <label>Композиция / пресет<select name="effect-preset"></select></label><p>Форма пламени, состав слоёв и источник настраиваются отдельно.</p>
 <h3>3. Поставить в сцене</h3><label>Объект<select name="species">${PINE_SPECIES.map((id,i)=>`<option value="${id}">${LABELS[i]}</option>`).join('')}<option value="deck">Деревянная переправа</option><option value="world">Свободные эффекты сцены</option></select></label>
 <div class="row"><button data-action="focus">К очагу · F</button><button data-action="next">Другой экземпляр</button></div>
 <label>Очаг<select name="anchor"></select></label>
 <label>Размещение<select name="placement"><option value="surface">На выбранном объекте</option><option value="world">Свободная точка сцены</option></select></label>
 <div class="row"><button class="primary" data-action="add">Добавить эффект</button><button data-action="delete" data-needs-anchor>Удалить</button></div>
 <div class="row"><button data-action="duplicate" data-needs-anchor>Дублировать</button><button data-action="snap" data-needs-anchor>На поверхность</button></div>
 <div class="row"><button data-mode="translate">Двигать</button><button data-mode="rotate">Повернуть</button><button data-mode="scale">Масштаб</button></div>

 <p>Пресет меняет слои и источник, сохраняя позицию и привязку.</p>
 <h3>4. Настроить</h3><div data-layers></div><div class="row"><select name="add-layer"></select><button data-action="add-layer" data-needs-anchor>Добавить слой</button></div>
 <div class="row"><button data-action="delete-layer" data-needs-anchor>Удалить слой</button><button data-action="reset-layer" data-needs-anchor>Сбросить слой</button></div>
 <div data-basic-controls></div>
 <details data-advanced><summary>Дополнительные настройки слоя</summary><div data-advanced-controls></div></details>
 <details><summary>Источник и трансформация</summary><label>Форма<select name="emitter-shape">${Object.entries(SHAPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div data-emitter-controls></div>
 ${['position','rotation','scale'].map((key,i)=>`<p>${['Локальная позиция / кромка','Поворот, градусы','Масштаб'][i]}</p><div class="axis">${['X','Y','Z'].map((axis,j)=>`<label>${axis}<input data-needs-anchor name="${key}${j}" type="number" step=".05"></label>`).join('')}</div>`).join('')}</details>
 <details data-tree-cycle><summary>Стадии горения дерева</summary><p>Последовательность управляет всеми очагами только этого объекта.</p>
 <label>Режим<select name="cycle-mode"><option value="constant">Постоянное горение</option><option value="manual">Ручная стадия</option><option value="auto">Автоматический цикл</option></select></label><div data-cycle-controls></div>
 <label>Повторять<input name="cycle-repeat" type="checkbox"></label><div class="row"><button data-action="pause-cycle">Пауза стадии</button><button data-action="restart-cycle">Сначала нижние ветви</button></div><p data-cycle-state></p></details>
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
 const footer=document.createElement('footer');
 footer.append(panel.querySelector('[data-action=undo]').parentElement,panel.querySelector('output'),panel.querySelector('[data-action=close]'));
 panel.querySelector('aside').append(footer);
 const identity=panel.querySelector('[data-build]');identity.dataset.editorRevision=EDITOR_BUILD.revision;identity.textContent='Редактор r'+EDITOR_BUILD.revision+' · '+EDITOR_BUILD.commit.slice(0,7)+(EDITOR_BUILD.dirty?' · рабочая копия':'');identity.title=EDITOR_BUILD.commit+' '+EDITOR_BUILD.builtAt;
 let selectedKind='flame';
 function refresh({preset,selected,anchor,list,anchorId,history,armed,paused,presetId,addKind='fire',cycle}){
  const $=s=>panel.querySelector(s),a=anchor;
  $('[name=species]').value=selected?.key??'world';$('[name=anchor]').replaceChildren(new Option('Выберите очаг',''));
  list.forEach((item,i)=>$('[name=anchor]').add(new Option('Очаг '+(i+1),item.id)));$('[name=anchor]').value=anchorId??'';
  panel.querySelectorAll('[data-needs-anchor]').forEach(el=>el.disabled=!a);
  $('[data-action=undo]').disabled=history.index===0;$('[data-action=redo]').disabled=history.index===history.entries.length-1;
  $('[data-action=add]').dataset.active=String(armed);$('[data-action=add]').disabled=list.length>=32;
  $('[data-action=pause-effects]').textContent=paused?'Продолжить эффекты':'Пауза эффектов';
  $('[name=seed]').value=preset.seed;$('[name=budget]').value=preset.budget;
  $('[name=group-member]').checked=preset.group.includes(selected?.id);$('[name=group-member]').disabled=!selected||selected.id==='world';
  $('[data-group-count]').textContent='Выбрано объектов: '+preset.group.length;
  $('[data-action=distribute]').disabled=!selected?.key?.startsWith('pine:');
  const library=$('[name=effect-preset]');library.replaceChildren();for(const [id,v] of Object.entries(EFFECT_PRESETS))library.add(new Option(v.name,id));preset.customPresets.forEach((v,i)=>library.add(new Option(v.name,'user:'+i)));library.value=presetId;
  const gallery=$('[data-gallery]');gallery.replaceChildren();
  for(const id of APPEARANCE_GALLERY[addKind]??APPEARANCE_GALLERY.fire){const button=document.createElement('button');button.dataset.composition=id;button.dataset.active=String(id===presetId);button.innerHTML=compositionThumbnail(id);const label=document.createElement('span');label.textContent=EFFECT_PRESETS[id].name;button.append(label);gallery.append(button);}
  const tree=Boolean(selected?.key?.startsWith('pine:'));
  $('[data-tree-cycle]').hidden=!tree;
  $('[name=cycle-mode]').value=cycle?.mode??'constant';$('[name=cycle-repeat]').checked=cycle?.repeat??true;$('[name=cycle-repeat]').disabled=cycle?.mode!=='auto';
  $('[data-action=pause-cycle]').textContent=cycle?.paused?'Продолжить стадию':'Пауза стадии';
  $('[data-action=pause-cycle]').disabled=!tree||cycle?.mode!=='auto';$('[data-action=restart-cycle]').disabled=!tree||cycle?.mode==='constant';
  const controls=$('[data-cycle-controls]');controls.replaceChildren();
  if(tree&&cycle?.mode!=='constant'){
   const stage=control('cycle','stage',{label:'Стадия: низ → крона → тление',type:'number',value:0,min:0,max:1,step:.01},cycle.stage);if(cycle.mode==='auto')stage.querySelectorAll('input').forEach(el=>el.disabled=true);controls.append(stage);
   if(cycle.mode==='auto'){controls.append(control('cycle','speed',{label:'Скорость цикла',type:'number',value:1,min:.1,max:5,step:.1},cycle.speed),control('cycle','duration',{label:'Длительность, с',type:'number',value:24,min:2,max:120,step:1},cycle.duration));}
  }
  if(a&&!a.layers[selectedKind])selectedKind=Object.keys(a.layers)[0]??'flame';
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
   const layer=a.layers[selectedKind];if(['period','burstCount'].includes(key)&&layer.mode!=='burst'||key==='rate'&&layer.mode==='burst')continue;
   $(spec.advanced?'[data-advanced-controls]':'[data-basic-controls]').append(control(selectedKind,key,spec,layer[key]));
  }
  $('[name=emitter-shape]').disabled=!a;$('[name=emitter-shape]').value=a?.emitter.shape??'point';
  const emitterKeys={point:[],circle:['radius'],area:['width','depth'],line:['length'],cone:['radius','angle']};
  if(a)for(const key of emitterKeys[a.emitter.shape])$('[data-emitter-controls]').append(control('emitter',key,EMITTER_FIELDS[key],a.emitter[key]));
  for(const key of ['position','rotation','scale'])for(let i=0;i<3;i++)$(`[name=${key}${i}]`).value=a?Number((key==='rotation'?a[key][i]*180/Math.PI:a[key][i]).toFixed(3)):0;
 }
 return {element:panel,refresh,get layer(){return selectedKind;},chooseLayer(kind){selectedKind=kind;}};
}
