import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameHud} from '../src/ui/GameHud.js';
import {createAudioControls} from '../src/ui/AudioControls.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('HUD writes changed values once, and supports forced gameplay updates',()=>{
 const previous=globalThis.document;
 const nodes=new Map();
 const mk=()=>({
  writes:0,
  _text:'',
  style:{},
  classList:{toggle(){},add(){},remove(){}},
  append(){},
  set textContent(value){this._text=String(value);this.writes++;},
  get textContent(){return this._text;}
 });
 globalThis.document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,mk());return nodes.get(id);},
  createElement:()=>mk()
 };
 try{
  const hud=createGameHud({soulGoal:100,ultimateDuration:8});
  const frame={distance:21.5,coinCount:7,soulCharge:43,ultTimer:0,magnetTime:0,broomActive:false,broomRemaining:0};
  hud.update(frame,true);
  const distance=nodes.get('distance'),meter=nodes.get('soul-meter-wrap'),fill=nodes.get('soul-fill');
  assert.equal(distance.textContent,'21 m');
  assert.equal(fill.style.width,'43.0%');
  assert.equal(meter.children,undefined); // Shared DOM is created only once.
  const writes=distance.writes;
  hud.update(frame,true);
  assert.equal(distance.writes,writes);
  hud.update({...frame,distance:22.9,ultTimer:4},true);
  assert.equal(distance.textContent,'22 m');
  assert.equal(nodes.get('soul-state').textContent,'УЛЬТА — ПОЛЁТ');
  hud.setRecords(450,99);
  assert.equal(nodes.get('best').textContent,'450 m');
  hud.toast('ТЕСТ');hud.tick(.9);
  assert.equal(nodes.get('toast').textContent,'ТЕСТ');
 }finally{globalThis.document=previous;}
});

test('Audio controls do not overwrite persisted volumes on initialization',()=>{
 const previous=globalThis.document,nodes=new Map();
 const mk=()=>({
  _text:'',value:'0',events:{},
  set textContent(s){this._text=String(s);},
  get textContent(){return this._text;},
  setAttribute(){},
  addEventListener(type,fn){this.events[type]=fn;}
 });
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,mk());return nodes.get(id);}};
 const controller=volume=>({
  volume,muted:false,sets:0,
  getVolume(){return this.volume;},getMuted(){return this.muted;},
  setVolume(v){this.volume=v;this.sets++;},
  setMuted(v){this.muted=v;}
 });
 try{
  const sfx=controller(.41),music=controller(.18);
  createAudioControls(sfx,music);
  assert.equal(sfx.sets,0);assert.equal(music.sets,0);
  assert.equal(nodes.get('sound-volume').value,'41');
  assert.equal(nodes.get('music-volume').value,'18');
  nodes.get('sound-volume').value='56';
  nodes.get('sound-volume').events.input();
  assert.equal(sfx.volume,.56);
 }finally{globalThis.document=previous;}
});

test('HUD, FPS and menu use separate stylesheets and preserve soul-blue fill',()=>{
 const html=read('index.html');
 for(const name of ['game.css','menu.css','theme.css','hud.css'])
  assert.ok(html.includes('/src/styles/'+name),name);
 const hud=read('src/styles/hud.css');
 const old=read('src/styles/game.css');
 assert.ok(hud.includes('--kp-menu-copper'));
 assert.ok(hud.includes('#knotty-fps-counter'));
 assert.ok(hud.includes('#soul-meter-wrap'));
 assert.ok(old.includes('#soul-fill'));
 assert.ok(!hud.includes('background:linear-gradient(90deg,#164bdb'));
});
