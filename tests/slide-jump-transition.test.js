import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSlide,SLIDE_DURATION,SLIDE_JUMP_BUFFER_SECONDS} from '../src/player/Slide.js';
import {createDoubleJump} from '../src/player/DoubleJump.js';
import {pineLogBlocksSlideJump,PINE_LOG_COLLISION_HALF_DEPTH} from '../src/systems/HazardRules.js';

test('pressing jump while sliding queues one jump until after full log clearance',()=>{
 const slide=createSlide(),jump=createDoubleJump();
 slide.press();slide.queueJump();
 for(let i=0;i<18;i++){
  slide.update(1/60);
  assert.equal(pineLogBlocksSlideJump(.2+i*.03),true);
  assert.equal(jump.jumpsUsed,0);
 }
 assert.equal(slide.jumpQueued,true);
 assert.equal(pineLogBlocksSlideJump(PINE_LOG_COLLISION_HALF_DEPTH),true);
 assert.equal(pineLogBlocksSlideJump(PINE_LOG_COLLISION_HALF_DEPTH+.01,true),false);
 assert.equal(slide.consumeJump(),true);
 slide.cancel();
 assert.equal(jump.jump(),true);
 assert.equal(jump.jumpsUsed,1);
 assert.equal(slide.active,false);
 assert.equal(slide.crouch,0);
 assert.equal(slide.jumpQueued,false);
 assert.equal(SLIDE_DURATION,.82);
 assert.equal(SLIDE_JUMP_BUFFER_SECONDS,.7);
});

test('jump buffering expires and is cleared by a deliberate second slide or reset',()=>{
 const s=createSlide();
 assert.equal(pineLogBlocksSlideJump(-3,false),true);
 assert.equal(pineLogBlocksSlideJump(-6,false),false);
 assert.equal(pineLogBlocksSlideJump(0,true),false);
 assert.equal(pineLogBlocksSlideJump(NaN),false);
 s.press();s.queueJump();s.update(SLIDE_JUMP_BUFFER_SECONDS+.01);
 assert.equal(s.consumeJump(),false);
 s.press();s.queueJump();s.press();
 assert.equal(s.jumpQueued,false);
 s.queueJump();s.reset();
 assert.equal(s.jumpQueued,false);
});
test('queued jumps are handled after log collisions, not before them',()=>{
 const code=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(code.indexOf('slideAction.consumeJump()')>code.indexOf("if(o.type==='pineLog'){"));
 assert.ok(code.includes('if(slideJumpBlocked()){slideAction.queueJump();return;}'));
 assert.ok(code.includes('pineLogBlocksSlideJump(o.g.position.z-runner.position.z,o.passed)'));
 assert.ok(code.includes('function beginJump(){\n slideAction.cancel();'));
 assert.ok(code.includes('if(doubleJump.jump())avatar?.playJump(doubleJump.jumpsUsed);'));
});
