import {ATMOSPHERE_FIELDS,ATMOSPHERE_PRESETS,normalizeAtmosphere} from '../../systems/AtmosphereSettings.js';

export function createAtmospherePanel({onChange}){
 const element=document.createElement('aside');element.className='studio-atmosphere';element.hidden=true;element.setAttribute('aria-label','Атмосфера');
 element.innerHTML='<h2>Атмосфера</h2><p>Настройки действуют и в настоящем забеге. Ближняя дорога остаётся читаемой.</p><div class="row"><button data-atmosphere-mode="simple" data-active="true">Простой</button><button data-atmosphere-mode="advanced">Расширенный</button></div><label>Пресет<select name="atmosphere-preset"><option value="">Свой вариант</option>'+Object.entries(ATMOSPHERE_PRESETS).map(([key,v])=>'<option value="'+key+'">'+v.label+'</option>').join('')+'</select></label><label>Качество<select name="atmosphere-quality"><option value="low">Низкое</option><option value="medium">Среднее</option><option value="high">Высокое</option></select></label>';
 let current=normalizeAtmosphere();element.dataset.atmosphereMode='simple';
 const labels={fog:'Туман и границы мира',ash:'Воздушные частицы',wind:'Ветер и движение',background:'Фоновые эффекты'};
 for(const [group,fields] of Object.entries(ATMOSPHERE_FIELDS)){
  const section=document.createElement('details');section.open=['fog','ash'].includes(group);section.innerHTML='<summary>'+labels[group]+'</summary>';const advanced=document.createElement('details');advanced.className='atmosphere-advanced';advanced.innerHTML='<summary>Дополнительно</summary>';
  for(const [key,spec] of Object.entries(fields)){
   const label=document.createElement('label');label.className='effect-field';const title=document.createElement('span');title.textContent=spec.label;label.append(title);
   const row=document.createElement('span');row.className='effect-value';
   const input=document.createElement('input');input.name='atmosphere.'+group+'.'+key;input.dataset.atmosphereGroup=group;input.dataset.atmosphereKey=key;
   input.type=typeof spec.value==='boolean'?'checkbox':typeof spec.value==='string'?'color':'range';
   if(input.type==='range'){input.min=spec.min;input.max=spec.max;input.step=spec.step;const number=input.cloneNode();number.type='number';number.name+='.number';number.setAttribute('aria-label',spec.label+' — точное значение');row.append(number);}
   row.prepend(input);const reset=document.createElement('button');reset.type='button';reset.textContent='↺';reset.title='Сбросить '+spec.label;reset.dataset.atmosphereReset=group+'.'+key;row.append(reset);label.append(row);(spec.advanced?advanced:section).append(label);
  }
  if(advanced.children.length>1)section.append(advanced);element.append(section);
 }
 const footer=document.createElement('div');footer.innerHTML='<button data-atmosphere-defaults>Вернуть стандартную атмосферу</button><div class="row"><button data-action="atmosphere-import">Импорт атмосферы</button><button data-action="atmosphere-export">Экспорт атмосферы</button></div><input name="atmosphere-file" type="file" accept="application/json,.json" hidden><p data-atmosphere-stats></p>';element.append(footer);
 const emit=value=>{current=normalizeAtmosphere(value);onChange(current);};
 element.addEventListener('input',e=>{const input=e.target,group=input.dataset.atmosphereGroup,key=input.dataset.atmosphereKey;if(!group)return;const value=input.type==='checkbox'?input.checked:input.type==='color'?input.value:input.valueAsNumber;if(typeof value==='number'&&!Number.isFinite(value))return;emit({...current,[group]:{...current[group],[key]:value}});});
 element.addEventListener('change',e=>{if(e.target.name==='atmosphere-preset'&&ATMOSPHERE_PRESETS[e.target.value])emit(ATMOSPHERE_PRESETS[e.target.value].settings);if(e.target.name==='atmosphere-quality')emit({...current,quality:e.target.value});});
 element.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.atmosphereMode){element.dataset.atmosphereMode=button.dataset.atmosphereMode;element.querySelectorAll('[data-atmosphere-mode]').forEach(b=>b.dataset.active=String(b===button));}if(button.hasAttribute('data-atmosphere-defaults'))emit(normalizeAtmosphere());if(button.dataset.atmosphereReset){const [group,key]=button.dataset.atmosphereReset.split('.');emit({...current,[group]:{...current[group],[key]:ATMOSPHERE_FIELDS[group][key].value}});}});
 function refresh(value){current=normalizeAtmosphere(value);for(const input of element.querySelectorAll('[data-atmosphere-group]')){const value=current[input.dataset.atmosphereGroup][input.dataset.atmosphereKey];if(input.type==='checkbox')input.checked=value;else if(document.activeElement!==input)input.value=value;}element.querySelector('[name=atmosphere-quality]').value=current.quality;element.querySelector('[name=atmosphere-preset]').value=Object.keys(ATMOSPHERE_PRESETS).find(k=>JSON.stringify(ATMOSPHERE_PRESETS[k].settings)===JSON.stringify(current))??'';}
 return {element,refresh};
}
