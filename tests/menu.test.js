import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameHaptics} from '../src/systems/Haptics.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const game=read('src/game.js');
const menu=read('src/ui/GameMenu.js');

test('one main menu has start, conditional resume, help and settings',()=>{
 for(const id of ['center','menu-main','menu-help','menu-settings','resume','start','menu-open-help','menu-open-settings','pause-button'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/id="resume"[^>]+hidden/);
 assert.ok(menu.includes("mode!=='paused'"));
 assert.ok(game.includes("menu.show('paused')"));
 assert.ok(game.includes("menu.showGameOver()"));
 assert.ok(game.includes("gameOver.show({metres:Math.floor(distance),collectedSouls:coinCount})"));
 assert.ok(game.includes("menu.hide()"));
});

test('mobile gameplay uses swipes; redundant arrows and repeated hints are gone',()=>{
 assert.ok(!html.includes('id="bottom"'));
 assert.ok(!html.includes('id="hint"'));
 for(const id of ['help-pc','help-mobile','vibration-toggle','fps-toggle'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(game.includes("renderer.domElement.addEventListener('pointerup'"));
 assert.ok(game.includes("move(dx>0?1:-1)"));
 assert.ok(!game.includes("$('left')"));
 assert.ok(!game.includes('pauseOverlay'));
});

test('Fiona has no surname anywhere in the game menu',()=>{
 assert.ok(html.includes('Фиона — ведьма в аду'));
 assert.ok(!html.includes('Фиона Гуд'));
});

test('sound sliders keep their original controls and personalized preferences',()=>{
 for(const id of ['sound-toggle','sound-volume','music-toggle','music-volume'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(read('src/audio/sfx.js').includes("stored(VOLUME_KEY, '.30')"));
 assert.ok(read('src/audio/music.js').includes("loadSetting(VOLUME_KEY,'0.20')"));
});

test('haptics safely opt out on unsupported environments',()=>{
 const instance=createGameHaptics();
 if(!instance.supported){
  assert.equal(instance.enabled,false);
  assert.doesNotThrow(()=>instance.play('ultimate'));
  instance.setEnabled(true);
  assert.equal(instance.enabled,false);
 }
});
