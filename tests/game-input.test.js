import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameInput} from '../src/systems/GameInput.js';

test('input controller retains keyboard, touch, pause and repeated-jump semantics',()=>{
 const old=globalThis.window;
 const win=new Map(),canvasHandlers=new Map(),actions=[];
 const canvas={
  addEventListener(k,f){canvasHandlers.set(k,f)},
  removeEventListener(k){canvasHandlers.delete(k)}
 };
 globalThis.window={
  addEventListener(k,f){win.set(k,f)},
  removeEventListener(k){win.delete(k)}
 };
 let state='ready',subpage=false;
 const controller=createGameInput({canvas,getState:()=>state,
  isSubpageOpen:()=>subpage,onStart:()=>actions.push('start'),
  onEscape:()=>actions.push('escape'),onMove:n=>actions.push('move:'+n),
  onJump:()=>actions.push('jump'),onSlide:()=>actions.push('slide')});
 function press(code,repeat=false){
  let prevented=false;
  win.get('keydown')({code,repeat,preventDefault(){prevented=true}});
  return prevented;
 }
 try{
  subpage=true;press('Enter');assert.deepEqual(actions,[]);
  subpage=false;press('Enter');assert.deepEqual(actions,['start']);
  actions.length=0;state='playing';
  press('ArrowLeft');press('KeyD');press('Space');press('Space',true);
  press('ArrowDown');press('ArrowDown',true);
  assert.deepEqual(actions,['move:-1','move:1','jump','slide']);
  actions.length=0;
  canvasHandlers.get('pointerdown')({clientX:100,clientY:100});
  canvasHandlers.get('pointerup')({clientX:150,clientY:100});
  canvasHandlers.get('pointerdown')({clientX:100,clientY:100});
  canvasHandlers.get('pointerup')({clientX:100,clientY:30});
  assert.deepEqual(actions,['move:1','jump']);
  actions.length=0;state='paused';
  press('ArrowUp');press('Escape');press('Escape',true);
  assert.deepEqual(actions,['escape']);
  controller.destroy();
  assert.equal(win.size,0);assert.equal(canvasHandlers.size,0);
 }finally{globalThis.window=old;}
});
