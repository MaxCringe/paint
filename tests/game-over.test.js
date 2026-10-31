import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameOver} from '../src/ui/GameOver.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('defeat view sets final metres and souls and provides two working actions',()=>{
 const previous=globalThis.document;
 const elements=new Map();
 function make(id){
  const classes=new Set(id==='game-over'?['hidden']:[]);
  return {
   classes,handlers:{},textContent:'',focusCalled:false,
   classList:{
    add(name){classes.add(name);},
    remove(name){classes.delete(name);},
    toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name);},
    contains(name){return classes.has(name);}
   },
   addEventListener(name,fn){this.handlers[name]=fn;},
   focus(){this.focusCalled=true;}
  };
 }
 globalThis.document={
  getElementById(id){if(!elements.has(id))elements.set(id,make(id));return elements.get(id);}
 };
 let retries=0,home=0;
 try{
  const over=createGameOver({onRetry:()=>retries++,onMainMenu:()=>home++});
  over.show({metres:321.9,collectedSouls:57,records:{metres:true,souls:false}});
  assert.equal(elements.get('game-over').classes.has('hidden'),false);
  assert.equal(elements.get('game-over-distance').textContent,'321 м');
  assert.equal(elements.get('game-over-souls').textContent,'57');
  assert.equal(elements.get('game-over-metres-card').classes.has('new-record'),true);
  assert.equal(elements.get('game-over-souls-card').classes.has('new-record'),false);
  // Each achievement is independent, and a no-record result clears old glows.
  over.show({metres:500,collectedSouls:80,records:{metres:false,souls:true}});
  assert.equal(elements.get('game-over-metres-card').classes.has('new-record'),false);
  assert.equal(elements.get('game-over-souls-card').classes.has('new-record'),true);
  over.show({metres:501,collectedSouls:81,records:{metres:true,souls:true}});
  assert.equal(elements.get('game-over-metres-card').classes.has('new-record'),true);
  assert.equal(elements.get('game-over-souls-card').classes.has('new-record'),true);
  over.show({metres:20,collectedSouls:1});
  assert.equal(elements.get('game-over-metres-card').classes.has('new-record'),false);
  assert.equal(elements.get('game-over-souls-card').classes.has('new-record'),false);
  assert.equal(elements.get('game-over-retry').focusCalled,true);
  elements.get('game-over-retry').handlers.click();
  elements.get('game-over-menu').handlers.click();
  assert.equal(retries,1);
  assert.equal(home,1);
  over.hide();
  assert.equal(elements.get('game-over').classes.has('hidden'),true);
  assert.equal(elements.get('game-over-metres-card').classes.has('new-record'),false);
  assert.equal(elements.get('game-over-souls-card').classes.has('new-record'),false);
 }finally{globalThis.document=previous;}
});

test('defeat panel is separate from main menu and matches Ash & Copper palette',()=>{
 const html=read('index.html'),game=read('src/game.js'),menu=read('src/ui/GameMenu.js');
 const css=read('src/styles/game-over.css');
 for(const id of ['game-over','game-over-title','game-over-distance','game-over-souls','game-over-metres-card','game-over-souls-card','game-over-retry','game-over-menu'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/id="game-over" class="hidden"/);
 assert.ok(html.includes('ПОПРОБОВАТЬ СНОВА'));
 assert.ok(html.includes('ГЛАВНОЕ МЕНЮ'));
 assert.ok(html.includes('Фиона не выбралась'));
 assert.ok(html.includes('/src/styles/game-over.css'));
 assert.ok(css.includes('var(--kp-menu-copper)'));
 assert.ok(css.includes('var(--kp-menu-ink)'));
 assert.ok(css.includes('#game-over-metres-card.new-record'));
 assert.ok(css.includes('#game-over-souls-card.new-record'));
 assert.ok(css.includes('kp-violet-record'));
 assert.ok(css.includes('kp-blue-record'));
 assert.ok(game.includes('records:runRecords.status()'));
 assert.ok(game.includes("menu.showGameOver()"));
 assert.ok(game.includes("gameOver.hide();\n  start();"));
 assert.ok(game.includes("state='ready';"));
 assert.ok(menu.includes("document.body.classList.add('menu-open','game-over-open')"));
 assert.ok(menu.includes("!document.body.classList.contains('game-over-open')"));
 assert.ok(!game.includes("menu.show('over')"));
});

test('pause still uses standard menu, new defeat panel does not expose Continue',()=>{
 const html=read('index.html'),game=read('src/game.js'),menu=read('src/ui/GameMenu.js');
 assert.ok(game.includes("menu.show('paused')"));
 assert.ok(menu.includes("mode!=='paused'"));
 assert.ok(menu.includes("pause.classList.add('hidden')"));
 assert.ok(html.includes('id="resume"'));
 assert.ok(html.includes('id="game-over-menu"'));
 assert.ok(!html.includes('Фиона Гуд'));
});
