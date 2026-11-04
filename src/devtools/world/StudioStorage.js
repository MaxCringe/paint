import {validateLayers,validateEmitter,copy} from './EffectLayers.js';
import {validateBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {validateAndNormalizePreset,originalComposition} from '../../systems/fire/OriginalPreset.js';
import {defaultLayer,defaultEmitter} from './EffectLayers.js';
export const IMPORT_BACKUP='knottyPine.worldFire.beforeImport.v1';
export function validateComposition(value){
 if(!value||typeof value!=='object')throw Error('Ожидался объект эффекта.');
 const name=typeof value.name==='string'?value.name.trim().slice(0,60):'Импортированный эффект';if(!name)throw Error('Введите название эффекта.');
 return {name,layers:validateLayers(value.layers),emitter:validateEmitter(value.emitter),cycle:validateBurnCycle(value.cycle),...(value.original?{original:validateAndNormalizePreset(value.original)}:{})};
}
export function parseEffect(value){
 if(value?.format==='knottyPine.effect'&&value.version===1)return validateComposition(value.preset);
 if(value?.mode&&value.version===undefined)return originalComposition(validateAndNormalizePreset(value),defaultLayer,defaultEmitter);
 return validateComposition(value);
}
export const effectDocument=value=>({format:'knottyPine.effect',version:1,preset:validateComposition(copy(value))});
export function uniquePresetName(requested,custom){let name=requested.trim().slice(0,60)||'Мой эффект';for(let i=2;custom.some(v=>v.name===name);i++)name=requested.slice(0,50)+' ('+i+')';return name;}
export function integrationExample(settings){const normalized=validateAndNormalizePreset(settings);return `// Three.js r160 / KNOTTY PINE. Uses the game's shared runtime; no renderer or light per effect.\nimport {originalComposition} from './src/systems/fire/OriginalPreset.js';\nimport {defaultLayer,defaultEmitter,applyEffectPreset} from './src/devtools/world/EffectLayers.js';\nconst settings = ${JSON.stringify(normalized,null,2)};\n// anchor is a selected authored anchor. Save the surrounding world preset normally.\napplyEffectPreset(anchor, originalComposition(settings, defaultLayer, defaultEmitter));\n`;}
