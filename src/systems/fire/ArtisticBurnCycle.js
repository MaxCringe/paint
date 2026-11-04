import {computeBurnCycleState as originalState,computeAnchorWeight as originalWeight} from './original/Math.js';
// Artistic sequence only. No tree-to-tree spread or gameplay damage.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const defaultBurnCycle=()=>({mode:'constant',stage:0,speed:1,duration:24,repeat:true,paused:false});
export function validateBurnCycle(value){
 if(value===undefined)return defaultBurnCycle();
 if(!value||!['constant','manual','auto'].includes(value.mode)||typeof value.repeat!=='boolean'||typeof value.paused!=='boolean'||!Number.isFinite(value.stage)||value.stage<0||value.stage>1||!Number.isFinite(value.speed)||value.speed<.1||value.speed>5||!Number.isFinite(value.duration)||value.duration<2||value.duration>120)throw Error('Некорректный цикл: режим, стадия 0…1, скорость 0.1…5 и длительность 2…120 с.');
 if(value.curve!==undefined&&!['studio','artistic'].includes(value.curve))throw Error('Неизвестная последовательность горения.');
 return {...(value.curve?{curve:value.curve}:{}),mode:value.mode,stage:value.stage,speed:value.speed,duration:value.duration,repeat:value.repeat,paused:value.paused};
}
export function computeBurnCycleState(cycle,elapsed=0){
 if(cycle.mode==='constant')return {constant:true,progress:0,smolder:0,label:'Постоянное горение',repeat:false};
 const raw=cycle.mode==='manual'?cycle.stage:elapsed;
 const progress=cycle.mode==='auto'&&cycle.repeat?((raw%1)+1)%1:clamp(raw);
 if(cycle.curve==='studio')return {constant:false,progress,studio:true,smolder:originalState(Math.min(.999999,progress)).smolderActivity,label:originalState(Math.min(.999999,progress)).labelRu,repeat:cycle.mode==='auto'&&cycle.repeat};
 return {constant:false,progress,smolder:smooth(.7,.96,progress),repeat:cycle.mode==='auto'&&cycle.repeat,label:progress<.25?'Нижние ветви':progress<.5?'Середина':progress<.75?'Крона':'Затухание и тление'};
}
export function computeAnchorWeight(height,state){
 if(state.constant)return {flame:1,smoke:1,sparks:1,embers:1,coals:1};
 const h=clamp(height),p=state.progress;
 if(state.studio){const flame=originalWeight(h,Math.min(.999999,p),'tree',1);return {flame,sparks:flame,smoke:.25+.75*state.smolder,embers:state.smolder,coals:state.smolder};}
 const ignite=smooth(h*.57,h*.57+.13,p);
 const fade=1-smooth(.73+h*.12,.93+h*.055,p);
 const smolder=state.smolder*ignite;
 const wrap=state.repeat?1-smooth(.96,1,p):1;
 return {flame:ignite*fade,sparks:ignite*fade,smoke:ignite*(.24+.76*smolder)*wrap,embers:ignite*(.25+.65*smolder)*wrap,coals:smolder*wrap};
}
