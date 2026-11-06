import test from 'node:test';
import assert from 'node:assert/strict';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset,readEffectPreset,EFFECT_STORAGE,RETIRED_DECK_IDS,RIVER_REMOVAL_BACKUP_STORAGE} from '../src/devtools/world/FirePreset.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';
function preset(rev=6){
 return {version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:rev,
  plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),
  deck:[],river:structuredClone(LAVA_RIVER_AUTHORING.river),world:[],
  objects:{},group:[],customPresets:[],budget:4500};
}
function oldEight(){return [...RETIRED_DECK_IDS].map((id,i)=>{
 const a=newEffectAnchor([-.9+i*.2,.023,.2]);a.id=id;return a;});}
test('all saved revisions, including latest, remove the retired eight and keep manual work',()=>{
 assert.equal(RETIRED_DECK_IDS.size,8);
 for(const rev of [2,3,4,5,6,7]){
  const p=preset(rev),custom=newEffectAnchor([0,.023,.25]);
  p.deck=[...oldEight(),custom];
  p.objects.deck={binding:{kind:'deck',seed:p.seed},anchors:[],cycle:defaultBurnCycle()};
  const tree=newEffectAnchor([0,1,0]),free=newEffectAnchor([2,1,-10]);
  p.plants[PINE_SPECIES[0]]=[tree];p.world=[free];
  const next=upgradePreset(p);
  assert.deepEqual(next.deck,[custom]);assert.deepEqual(next.objects.deck.anchors,[]);
  assert.deepEqual(next.plants[PINE_SPECIES[0]],[tree]);assert.deepEqual(next.world,[free]);
  assert.equal(next.river.length,6);assert.deepEqual(upgradePreset(next),next);
 }
});
test('same-revision JSON and object overrides cannot resurrect the 8 anchors',()=>{
 const p=preset(7);p.deck=oldEight();
 p.objects.deck={binding:{kind:'deck',seed:p.seed},anchors:oldEight(),cycle:defaultBurnCycle()};
 const next=upgradePreset(p);
 assert.deepEqual(next.deck,[]);assert.deepEqual(next.objects.deck.anchors,[]);
 assert.equal(next.river.length,6);
});
test('custom deck and custom lava-surface effects survive cleanup',()=>{
 const p=preset(6),custom=newEffectAnchor([0,.023,.2]);
 p.deck=[...oldEight(),custom];
 p.objects.deck={binding:{kind:'deck',seed:p.seed},anchors:[...oldEight(),custom],cycle:defaultBurnCycle()};
 p.river[0].position=[2,.1,3];p.river[0].layers.flame.brightness=.77;
 const next=upgradePreset(p);
 assert.deepEqual(next.deck,[custom]);assert.deepEqual(next.objects.deck.anchors,[custom]);
 assert.deepEqual(next.river,p.river);
});
test('browser storage migration persists the deletion and retains backups',()=>{
 const original=globalThis.localStorage,store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
 try{
  const p=preset(6);p.deck=oldEight();
  p.objects.deck={binding:{kind:'deck',seed:p.seed},anchors:[],cycle:defaultBurnCycle()};
  const backup=preset(4);
  store.set(RIVER_REMOVAL_BACKUP_STORAGE,JSON.stringify(backup));
  store.set(EFFECT_STORAGE,JSON.stringify(p));
  const next=readEffectPreset();
  assert.deepEqual(next.deck,[]);assert.deepEqual(next.objects.deck.anchors,[]);
  assert.deepEqual(JSON.parse(store.get(EFFECT_STORAGE)).deck,[]);
  assert.deepEqual(readEffectPreset(),next);
  assert.deepEqual(JSON.parse(store.get(RIVER_REMOVAL_BACKUP_STORAGE)),backup);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
test('legacy JSON imports do not restore the deleted eight',()=>{
 const p={version:1,seed:42,plants:Object.fromEntries(PINE_SPECIES.map(s=>[s,[]])),deck:oldEight()};
 assert.deepEqual(upgradePreset(p).deck,[]);
});
