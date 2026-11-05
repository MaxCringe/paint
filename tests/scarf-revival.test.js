import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScarfRules,SCARF_INTERVAL_METRES,REVIVAL_PROTECTION_SECONDS,SCARF_TEST_MODE,SCARF_TEST_SPAWN_CHANCE} from '../src/systems/ScarfRules.js';

test('one opportunity per kilometre, with a random location in each interval',()=>{
 const r=createScarfRules();
 assert.equal(SCARF_INTERVAL_METRES,1000);
 assert.equal(r.milestone(1000),true);
 assert.equal(r.milestone(1001),false);
 assert.equal(r.milestone(2000),true);
 assert.equal(r.milestone(2001),false);
 assert.equal(r.milestone(3000),true);
 assert.equal(r.milestone(3001),false);
});
test('scarves stack without a gameplay cap and each revival consumes one',()=>{
 const r=createScarfRules();
 assert.equal(r.count,0);
 assert.equal(r.consume(),false);
 for(let i=1;i<=10000;i++){
  assert.equal(r.collect(),true);
  assert.equal(r.count,i);
 }
 assert.equal(r.held,true);
 assert.equal(r.canRevive,true);
 assert.equal(r.milestone(1000),true);
 for(let i=9999;i>=0;i--){
  assert.equal(r.consume(),true);
  assert.equal(r.count,i);
  assert.equal(r.canRevive,i>0);
 }
 assert.equal(r.consume(),false);
 assert.equal(r.count,0);
 assert.equal(r.held,false);
 assert.equal(r.milestone(2000),true);
 r.collect();r.collect();
 assert.equal(REVIVAL_PROTECTION_SECONDS,3);
 r.reset();
 assert.equal(r.count,0);
 assert.equal(r.canRevive,false);
 assert.equal(r.milestone(1000),true);
});
test('pickup, independent revival screen and disabled advertisements are wired',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js'),html=read('index.html'),screen=read('src/ui/GameOver.js');
 assert.match(game,/scarfPickup\.offer\(distance,/);
 assert.match(game,/scarfPickup\.update\(dt,t,travelSpeed/);
 assert.match(game,/revivalShield=REVIVAL_PROTECTION_SECONDS/);
 assert.match(game,/scarfPickup\.reset\(\)/);
 assert.match(screen,/canRevive=false/);
 assert.match(html,/id="game-over-revive"/);
 assert.match(html,/id="game-over-ad"[^>]*disabled/);
 assert.match(game,/onRetry:\(\)=>\{/);
});

test('release rarity is restored and abundant pickups disabled',()=>{
 assert.equal(SCARF_TEST_MODE,false);
 assert.ok(SCARF_TEST_SPAWN_CHANCE>=.075&&SCARF_TEST_SPAWN_CHANCE<=1);
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const game=read('src/game.js'),scarf=read('src/powerups/ScarfPickup.js');
 assert.ok(game.includes("makeSegment.reservePickup('scarf'"));
 assert.ok(scarf.includes('if(SCARF_TEST_MODE)'));
 assert.ok(scarf.includes('rules.milestone(distance)'));
 assert.ok(scarf.includes('firstTestOffer'));
 assert.ok(read('index.html').includes('id="scarf-indicator"'));
 assert.ok(read('index.html').includes('id="scarf-count"'));
 assert.ok(read('src/styles/game-over.css').includes('menu-revive:disabled'));
});
