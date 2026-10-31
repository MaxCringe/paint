import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBroomEffectSettings,BROOM_EFFECT_DEFAULTS,BROOM_EFFECT_STORAGE_KEY} from '../src/powerups/BroomEffectSettings.js';

test('broom tuning uses existing visual defaults, saves to storage and survives reopening',()=>{
 const map=new Map();
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const first=createBroomEffectSettings(storage);
 assert.deepEqual(first.get(),BROOM_EFFECT_DEFAULTS);
 const changes=[];
 const unsubscribe=first.subscribe(values=>changes.push(values));
 first.set('density',45);
 first.set('opacity',65);
 first.set('size',75);
 first.set('length',150);
 first.set('sparks',185);
 assert.equal(changes.length,6);
 assert.equal(first.get().density,45);
 assert.equal(first.get().opacity,65);
 assert.equal(first.get().size,75);
 assert.equal(first.get().length,150);
 assert.equal(first.get().sparks,185);
 assert.ok(map.has(BROOM_EFFECT_STORAGE_KEY));
 const restored=createBroomEffectSettings(storage);
 assert.deepEqual(restored.get(),first.get());
 first.set('density',500);
 first.set('opacity',-20);
 first.set('sparks',Number.NaN);
 assert.equal(first.get().density,200);
 assert.equal(first.get().opacity,0);
 assert.equal(first.get().sparks,185);
 first.set('other',80);
 unsubscribe();
 first.reset();
 assert.deepEqual(first.get(),BROOM_EFFECT_DEFAULTS);
 assert.deepEqual(createBroomEffectSettings(storage).get(),BROOM_EFFECT_DEFAULTS);
});

test('broom tuning tolerates invalid or unavailable saved preferences',()=>{
 const broken={getItem:()=>'{bad',setItem:()=>{throw new Error('denied')}};
 const settings=createBroomEffectSettings(broken);
 assert.deepEqual(settings.get(),BROOM_EFFECT_DEFAULTS);
 assert.doesNotThrow(()=>settings.set('density',0));
 assert.equal(settings.get().density,0);
});

test('in-run compact sliders, main settings and GPU puffs share live settings',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js'),broom=read('src/powerups/BroomRide.js');
 const tune=read('src/ui/BroomTuning.js'),trail=read('src/powerups/BroomTrail.js');
 const css=read('src/styles/broom-tuning.css'),html=read('index.html');
 assert.match(game,/createBroomTuning\(broomEffectSettings\)/);
 assert.match(game,/createBroomRide\(scene,runner,\{torso,armL,armR,legL,legR\},broomEffectSettings\)/);
 assert.match(broom,/createBroomTrail\(runner,glowTexture,effectSettings\)/);
 for(const key of ['density','opacity','size','length','sparks']){
  assert.ok(tune.includes("'"+key+"'"),key);
  assert.ok(trail.includes('settings.'+key),key);
 }
 assert.ok(tune.includes("input.addEventListener('input'"));
 assert.ok(tune.includes('settings.subscribe'));
 assert.ok(tune.includes("settings.reset()"));
 assert.ok(css.includes('body.menu-open #broom-tuning-dock'));
 assert.ok(html.includes('broom-tuning.css'));
 assert.ok(trail.includes('smoke.count='));
 assert.ok(trail.includes('smoke.instanceMatrix.needsUpdate=true'));
});
