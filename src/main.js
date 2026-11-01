// Vite entry point. Gameplay loads independently from the optional editor.
import './game.js';

// Single release switch: VITE_ENABLE_EFFECT_EDITOR=false removes the UI chunk
// and keeps per-browser editor overrides disabled in release builds.
if(import.meta.env.VITE_ENABLE_EFFECT_EDITOR!=='false'){
 import('./devtools/EffectEditor.js').then(({createEffectEditor})=>createEffectEditor())
  .catch(error=>console.warn('Optional VFX editor unavailable:',error));
}
