import test from 'node:test';
import assert from 'node:assert/strict';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset,readEffectPreset,EFFECT_STORAGE,RIVER_REMOVAL_BACKUP_STORAGE} from '../src/devtools/world/FirePreset.js';
import {authoredAnchors} from '../src/devtools/world/EffectPlacement.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';

function seeded(revision=3){
 return {version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:revision,
  plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[],world:[],
  objects:{},group:[],customPresets:[],budget:4500};
}
test('the six published river-surface flames are removed from old version-3 saves',()=>{
 const old=seeded();
 old.river=Array.from({length:6},(_,i)=>newEffectAnchor([i-3,.3,-1]));
 old.deck[0].layers.flame.height=.35;
 const independent=newEffectAnchor([1,2,3]),tree=newEffectAnchor([.2,2,0]);
 old.world.push(independent);old.plants[PINE_SPECIES[0]].push(tree);
 old.objects.deck={binding:{kind:'deck',seed:old.seed},anchors:[],cycle:defaultBurnCycle()};
 const originalDeck=structuredClone(old.deck),originalOverride=structuredClone(old.objects.deck);
 const result=upgradePreset(old);
 assert.equal(result.riverVisualRevision,4);
 assert.deepEqual(result.river,[]);
 assert.deepEqual(result.deck,originalDeck,'wooden fire must be untouched');
 assert.deepEqual(result.objects.deck,originalOverride,'user object settings must be untouched');
 assert.deepEqual(result.world,[independent]);
 assert.deepEqual(result.plants[PINE_SPECIES[0]],[tree]);
 assert.equal(authoredAnchors(result).length,10,'eight deck, one tree, one world effect');
 assert.deepEqual(upgradePreset(result),result,'migration is idempotent');
});

test('old version 2 and earlier presets also have zero river effects and retain wood',()=>{
 for(const revision of [undefined,1,2]){
  const p=seeded(revision);p.river=[newEffectAnchor([0,.4,-2])];
  p.deck[0].position[0]=1.23;
  const originalDeck=structuredClone(p.deck);
  const upgraded=upgradePreset(p);
  assert.equal(upgraded.riverVisualRevision,4);
  assert.deepEqual(upgraded.river,[]);
  assert.deepEqual(upgraded.deck,originalDeck);
 }
});

test('legacy free-standing lava fire is removed without deleting unrelated scene effects',()=>{
 const p=seeded(1);
 const original=newEffectAnchor([5.76,.07,-14.94]);
 original.id='bef26812-fdf5-4cbc-a850-5ecf0da7dd1b';
 const independent=newEffectAnchor([1,2,3]);
 p.world=[original,independent];p.river=[newEffectAnchor([.2,.3,0])];
 const result=upgradePreset(p);
 assert.deepEqual(result.river,[]);
 assert.deepEqual(result.world,[independent]);
 assert.deepEqual(upgradePreset(result),result);
});

test('existing browser saves migrate persistently, with previous fire backed up',()=>{
 const original=globalThis.localStorage;
 const entries=new Map();
 globalThis.localStorage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>{entries.set(k,String(v));}};
 try{
  const p=seeded(3);p.river=[newEffectAnchor([0,.4,-2]),newEffectAnchor([2,.4,0])];
  entries.set(EFFECT_STORAGE,JSON.stringify(p));
  const migrated=readEffectPreset();
  assert.deepEqual(migrated.river,[]);
  assert.deepEqual(JSON.parse(entries.get(EFFECT_STORAGE)).river,[],'old flames cannot return on refresh');
  assert.deepEqual(JSON.parse(entries.get(RIVER_REMOVAL_BACKUP_STORAGE)).river,p.river);
  const next=readEffectPreset();
  assert.deepEqual(next,migrated);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
