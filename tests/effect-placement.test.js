import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlacementState,validLocalPosition,uniqueEffectId} from '../src/devtools/world/EffectPlacement.js';
import {PINE_SPECIES,upgradePreset,newEffectAnchor} from '../src/devtools/world/FirePreset.js';
test('placing and reanchoring remain distinct from selection and unsaved preview',()=>{const s=createPlacementState();for(const mode of ['placing','reanchoring']){s.set(mode);assert.equal(s.placing,true);}for(const mode of ['idle','editing','preview']){s.set(mode);assert.equal(s.placing,false);}assert.throws(()=>s.set('invalid'));});
test('local data bounds reject nonfinite coordinates without silently clamping placement',()=>{for(const v of [[101,0,0],[0,Infinity,0],[0,NaN,0],[1,2]])assert.equal(validLocalPosition(v),false);assert.equal(validLocalPosition([-100,0,100]),true);});
test('effect names round-trip in v3 while old unnamed presets remain valid',()=>{const p=upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});const a=newEffectAnchor([1,2,3]);a.name='Огонь на ветви';p.world=[a];assert.deepEqual(upgradePreset(JSON.parse(JSON.stringify(p))),p);assert.notEqual(uniqueEffectId(p),a.id);a.name='x'.repeat(61);assert.throws(()=>upgradePreset(p));});
