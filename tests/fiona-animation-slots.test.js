import test from 'node:test';
import assert from 'node:assert/strict';
import { FIONA_ANIMATION_SLOTS, FIONA_ANIMATION_SLOT_IDS } from '../src/player/FionaAnimationSlots.js';

test('Fiona test slots have unique identifiers and readable labels',()=>{
 const ids=FIONA_ANIMATION_SLOTS.map(slot=>slot.id);
 assert.equal(ids.length,23);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(FIONA_ANIMATION_SLOT_IDS,ids);
 for(const slot of FIONA_ANIMATION_SLOTS){
  assert.ok(slot.label?.trim());
  assert.ok(slot.group?.trim());
 }
});

test('existing runner actions have animation placeholders',()=>{
 const ids=new Set(FIONA_ANIMATION_SLOT_IDS);
 for(const action of [
  'idle','run','moveLeft','moveRight','jump','doubleJump','land',
  'slide','slideEnd','slip','broomStart','broomFly','broomDuck','broomLand',
  'ultimateStart','ultimateFly','ultimateEnd','soulPickup','hatPickup',
  'scarfPickup','hitTree','death','revive'
 ])assert.ok(ids.has(action),action+' is missing');
});

test('long-lived states loop and one-shot actions do not',()=>{
 const byId=new Map(FIONA_ANIMATION_SLOTS.map(s=>[s.id,s]));
 for(const id of ['idle','run','slide','slip','broomFly','broomDuck','ultimateFly'])
  assert.equal(byId.get(id).loop,true);
 for(const id of ['moveLeft','jump','doubleJump','land','broomStart','death','revive'])
  assert.notEqual(byId.get(id).loop,true);
});
