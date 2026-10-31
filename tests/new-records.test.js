import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRunRecordTracker} from '../src/systems/RunRecords.js';
import {createGameHud} from '../src/ui/GameHud.js';

const makeStore=()=>{
 const values=new Map(),writes=[];
 return {values,writes,
  getItem(key){return values.has(key)?values.get(key):null;},
  setItem(key,value){values.set(key,String(value));writes.push([key,String(value)]);}
 };
};

test('first ever run establishes records without any achievement glow',()=>{
 const store=makeStore();
 const records=createRunRecordTracker({storage:store,bestMetres:0,bestSouls:0});
 assert.deepEqual(records.start(0,0),{metres:false,souls:false});
 assert.deepEqual(records.progress(2000,500),{metres:false,souls:false});
 assert.equal(store.values.get('knottyPineRunsStarted'),'1');
});

test('second run glows only after strictly exceeding the previous snapshot',()=>{
 const store=makeStore();
 const records=createRunRecordTracker({storage:store});
 records.start(0,0); // first run
 records.progress(4409,828);
 records.start(4409,828); // second run
 assert.deepEqual(records.progress(4409.9,828),{metres:false,souls:false});
 assert.deepEqual(records.progress(4410,828),{metres:true,souls:false});
 assert.deepEqual(records.progress(4410,829),{metres:true,souls:true});
 // Flags stay on even if another score update happens.
 assert.deepEqual(records.progress(0,0),{metres:true,souls:true});
 assert.deepEqual(records.start(4410,829),{metres:false,souls:false});
 assert.deepEqual(records.progress(4410,829),{metres:false,souls:false});
 assert.deepEqual(records.progress(4411,830),{metres:true,souls:true});
});

test('old players with saved personal records may earn highlights immediately',()=>{
 const store=makeStore();
 const records=createRunRecordTracker({storage:store,bestMetres:4409,bestSouls:828});
 records.start(4409,828);
 assert.deepEqual(records.progress(4410,828),{metres:true,souls:false});
 assert.deepEqual(records.progress(4410,829),{metres:true,souls:true});
 assert.equal(store.values.get('knottyPineRunsStarted'),'2');
});

test('scores are independent and no per-frame localStorage writes occur',()=>{
 const store=makeStore();
 const records=createRunRecordTracker({storage:store,bestMetres:25,bestSouls:100});
 records.start(25,100);
 assert.deepEqual(records.progress(20,101),{metres:false,souls:true});
 assert.deepEqual(records.progress(26,101),{metres:true,souls:true});
 for(let i=0;i<500;i++)records.progress(26+i,101+i);
 assert.equal(store.writes.length,1);
});

test('run count survives reloads without mutating existing best keys',()=>{
 const store=makeStore();
 const first=createRunRecordTracker({storage:store});
 first.start(0,0);
 const second=createRunRecordTracker({storage:store});
 second.start(100,10);
 assert.deepEqual(second.progress(101,11),{metres:true,souls:true});
 assert.equal(store.values.has('knottyPineBest'),false);
 assert.equal(store.values.has('knottyPineBestSouls'),false);
});

test('HUD toggles exactly the two record pill classes and clears on restart',()=>{
 const previous=globalThis.document;
 const nodes=new Map();
 const makeNode=()=>{
  const classes=new Set(),toggles=[];
  return {
   classes,toggles,style:{},hidden:false,append(){},
   classList:{
    toggle(name,enabled){
     toggles.push([name,enabled]);
     if(enabled)classes.add(name);else classes.delete(name);
    },
    add(name){classes.add(name);},remove(name){classes.delete(name);}
   },
   set textContent(value){this.value=String(value);},
   get textContent(){return this.value||'';}
  };
 };
 globalThis.document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);},
  createElement(){return makeNode();}
 };
 try{
  const hud=createGameHud({soulGoal:100,ultimateDuration:8});
  hud.setRecordHighlights({metres:false,souls:false});
  hud.setRecordHighlights({metres:true,souls:false});
  const distance=nodes.get('distance-pill'),souls=nodes.get('souls-pill');
  assert.equal(distance.classes.has('new-record'),true);
  assert.equal(souls.classes.has('new-record'),false);
  hud.setRecordHighlights({metres:true,souls:true});
  hud.setRecordHighlights({metres:true,souls:true});
  assert.equal(distance.toggles.length,1);
  assert.equal(souls.toggles.length,1);
  hud.setRecordHighlights({metres:false,souls:false});
  assert.equal(distance.classes.has('new-record'),false);
  assert.equal(souls.classes.has('new-record'),false);
 }finally{
  globalThis.document=previous;
 }
});

test('new personal record colors only affect distance and souls, not ultimate meter',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles/hud.css',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="souls-pill"'));
 assert.ok(css.includes('#distance-pill.new-record'));
 assert.ok(css.includes('#souls-pill.new-record'));
 assert.ok(!css.includes('#soul-meter-wrap.new-record'));
 assert.ok(game.includes('runRecords.start(best,bestSouls)'));
 assert.ok(game.includes('runRecords.progress(distance,coinCount)'));
});
