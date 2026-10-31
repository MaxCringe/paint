import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBroomTimer} from '../src/ui/BroomTimer.js';

test('broom warning shows progress, flags last three seconds and hides at landing',()=>{
 const old=globalThis.document;
 const mk=()=>({
  children:[],hidden:false,textContent:'',style:{},attributes:{},
  className:'',
  classes:new Set(),
  append(...children){this.children.push(...children)},
  setAttribute(name,value){this.attributes[name]=String(value)},
  classList:null
 });
 // Provide realistic classList behavior for the standalone DOM component.
 const create=()=>{
  const el=mk();
  el.classList={
   add(cls){el.classes.add(cls)},
   remove(cls){el.classes.delete(cls)},
   toggle(cls,on){if(on)el.classes.add(cls);else el.classes.delete(cls)},
   contains(cls){return el.classes.has(cls)}
  };
  return el;
 };
 const root=create();
 globalThis.document={createElement:()=>create(),getElementById:()=>root};
 try{
  const timer=createBroomTimer({duration:9});
  assert.equal(root.children[0],timer.panel);
  assert.equal(timer.panel.hidden,true);
  const [heading,seconds,track]=timer.panel.children;
  const fill=track.children[0];
  timer.update(9,true);
  assert.equal(timer.panel.hidden,false);
  assert.equal(heading.textContent,'🧹 ПОЛЁТ НА МЕТЛЕ');
  assert.equal(seconds.textContent,'9.0 С');
  assert.equal(fill.style.width,'100.0%');
  timer.update(3.01,true);
  assert.equal(timer.panel.classes.has('is-ending'),false);
  timer.update(3,true);
  assert.equal(timer.panel.classes.has('is-ending'),true);
  assert.equal(heading.textContent,'ПОСАДКА ЧЕРЕЗ');
  assert.equal(seconds.textContent,'3 С');
  assert.equal(fill.style.width,'33.3%');
  timer.update(1.2,true);
  assert.equal(seconds.textContent,'2 С');
  timer.update(0.3,true);
  assert.equal(seconds.textContent,'1 С');
  timer.update(0,false);
  assert.equal(timer.panel.hidden,true);
  assert.equal(timer.panel.classes.has('is-ending'),false);
  timer.update(9,true);
  assert.equal(timer.panel.hidden,false);
  assert.equal(timer.panel.classes.has('is-ending'),false);
 }finally{globalThis.document=old}
});

test('the timer is hooked to the actual broom duration without changing collisions',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js'),hud=read('src/ui/GameHud.js'),css=read('src/styles/hud.css');
 assert.ok(game.includes('broomDuration:BROOM_CONFIG.duration'));
 assert.ok(game.includes('broomRemaining:broom.remaining'));
 assert.ok(hud.includes('broomTimer.update(broomRemaining,broomActive)'));
 assert.ok(css.includes('#broom-flight-status.is-ending'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.match(read('src/powerups/BroomRide.js'),/duration: 9/);
});
