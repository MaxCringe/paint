import test from 'node:test';
import assert from 'node:assert/strict';
import {LAVA_RIVER_AUTHORING} from '../src/systems/fire/LavaRiverAuthored.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset,readEffectPreset,EFFECT_STORAGE,RIVER_REMOVAL_BACKUP_STORAGE} from '../src/devtools/world/FirePreset.js';
import {authoredAnchors} from '../src/devtools/world/EffectPlacement.js';
import {defaultBurnCycle} from '../src/systems/fire/ArtisticBurnCycle.js';

function seeded(revision=4){
 return {version:3,seed:LAVA_RIVER_AUTHORING.sourceSeed,riverVisualRevision:revision,
  plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),
  deck:structuredClone(LAVA_RIVER_AUTHORING.deck),river:[],world:[],
  objects:{},group:[],customPresets:[],budget:4500};
}
test('revision 4 accidentally deleted hand-authored lava flames: restore six without changing wood',()=>{
 const old=seeded();
 old.deck[0].layers.flame.height=.35;
 const unrelated=newEffectAnchor([1,2,3]),tree=newEffectAnchor([.2,2,0]);
 old.world.push(unrelated);old.plants[PINE_SPECIES[0]].push(tree);
 old.objects.deck={binding:{kind:'deck',seed:old.seed},anchors:[],cycle:defaultBurnCycle()};
 const originalDeck=structuredClone(old.deck);
 const result=upgradePreset(old);
 assert.equal(result.riverVisualRevision,6);
 assert.deepEqual(result.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(result.deck,originalDeck);
 assert.equal(result.objects.deck,undefined,'empty override must no longer hide wooden fire');
 assert.deepEqual(result.world,[unrelated]);
 assert.deepEqual(result.plants[PINE_SPECIES[0]],[tree]);
 assert.equal(authoredAnchors(result).length,16);
 assert.deepEqual(upgradePreset(result),result);
});
test('v3 user-customized river effects are preserved and wood remains unchanged',()=>{
 const old=seeded(3);
 const custom=newEffectAnchor([0,.4,-2]);
 old.river=[custom];
 old.deck[0].layers.flame.height=.36;
 const result=upgradePreset(old);
 assert.equal(result.riverVisualRevision,6);
 assert.deepEqual(result.river,[custom]);
 assert.deepEqual(result.deck,old.deck);
});
test('free-standing custom scene fire is retained while obsolete demo fire is removed',()=>{
 const old=seeded(1);
 const original=newEffectAnchor([5.76,.07,-14.94]);
 original.id='bef26812-fdf5-4cbc-a850-5ecf0da7dd1b';
 const independent=newEffectAnchor([1,2,3]);
 old.world=[original,independent];
 const result=upgradePreset(old);
 assert.deepEqual(result.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(result.world,[independent]);
});
test('browser migration recovers the original edited river from the v4 safety backup',()=>{
 const original=globalThis.localStorage;
 const entries=new Map();
 globalThis.localStorage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>{entries.set(k,String(v));}};
 try{
  const accidentallyCleared=seeded(4);
  accidentallyCleared.objects.deck={binding:{kind:'deck',seed:accidentallyCleared.seed},anchors:[],cycle:defaultBurnCycle()};
  const backup=seeded(3);
  const custom=structuredClone(LAVA_RIVER_AUTHORING.river[0]);
  custom.position[0]=1.321;
  backup.river=[custom];
  entries.set(EFFECT_STORAGE,JSON.stringify(accidentallyCleared));
  entries.set(RIVER_REMOVAL_BACKUP_STORAGE,JSON.stringify(backup));
  const restored=readEffectPreset();
  assert.equal(restored.river.length,1);
  assert.deepEqual(restored.river[0].position,custom.position);
  assert.equal(restored.objects.deck,undefined);
  assert.deepEqual(JSON.parse(entries.get(EFFECT_STORAGE)).river,restored.river);
  assert.deepEqual(readEffectPreset(),restored,'restoration must be persistent');
  assert.deepEqual(JSON.parse(entries.get(RIVER_REMOVAL_BACKUP_STORAGE)),backup,'do not overwrite saved work');
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
test('no-backup rev4 case still restores all six handwritten exported effects',()=>{
 const old=seeded(4);
 const result=upgradePreset(old);
 assert.deepEqual(result.river,LAVA_RIVER_AUTHORING.river);
 assert.deepEqual(result.deck,old.deck);
});

test('v5 exported settings update just the two adjusted flames without losing other edits',()=>{
 const old=seeded(5);
 old.river=structuredClone(LAVA_RIVER_AUTHORING.river);
 old.river[0].layers.flame.brightness=1;
 old.river[0].rotation=[-0.018707625043051165,0.14146388328555204,0.1056333637883589];
 old.river[5].position=[-4.359869362662731,-0.8058801278197899,-3.2075150236816086];
 old.river[5].rotation=[0.008222797630859131,-0.11366962627458961,0.10525603162069358];
 old.river[1].layers.flame.intensity=.71;
 const manual=newEffectAnchor([1,.4,-3]);
 old.river.push(manual);
 old.deck[0].layers.flame.height=.37;
 old.objects.deck={binding:{kind:'deck',seed:old.seed},anchors:[],cycle:defaultBurnCycle()};
 const previousDeck=structuredClone(old.deck);
 const result=upgradePreset(old);
 assert.equal(result.riverVisualRevision,6);
 assert.equal(result.river.length,7,'six original flames plus an unrelated manual effect');
 assert.equal(result.river[0].layers.flame.brightness,2.3);
 assert.deepEqual(result.river[5].position,LAVA_RIVER_AUTHORING.river[5].position);
 assert.equal(result.river[1].layers.flame.intensity,.71,'other changes survive');
 assert.deepEqual(result.river[6],manual,'custom effects survive');
 assert.deepEqual(result.deck,previousDeck,'wooden-edge settings remain unchanged');
 assert.equal(result.objects.deck,undefined,'empty imported demo override must not hide the wood flames');
 assert.deepEqual(upgradePreset(result),result,'one-time update');
});

test('v6 custom scenes do not have their authored river flames overwritten',()=>{
 const p=seeded(6);
 const personal=newEffectAnchor([0,.2,-1]);
 p.river=[personal];
 p.objects.deck={binding:{kind:'deck',seed:p.seed},anchors:[],cycle:defaultBurnCycle()};
 const result=upgradePreset(p);
 assert.deepEqual(result.river,[personal]);
 assert.ok(result.objects.deck,'explicit current-revision changes remain untouched');
});
