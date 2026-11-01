import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDoubleJump} from '../src/player/DoubleJump.js';
import {createSlide,getSlidePose,SLIDE_DURATION} from '../src/player/Slide.js';
import {BROOM_CONFIG,getBroomDuckPose} from '../src/powerups/BroomRide.js';
import {broomIgnoresHazard,lavaJumpCleared,travelSpeedMultiplier,clearsPineLog,pineLogBroomDuck,pineLogFlightGuardDuration} from '../src/systems/HazardRules.js';

test('double jump: two jumps, third blocked, landing resets',()=>{
 const events=[],j=createDoubleJump({onJump:n=>events.push(n),onLand:()=>events.push('land')});
 assert.equal(j.jump(),true);
 j.update(.1);
 assert.ok(j.height>0);
 assert.equal(j.jump(),true);
 assert.equal(j.jump(),false);
 for(let i=0;i<150&&j.airborne;i++)j.update(1/60);
 assert.equal(j.height,0);
 assert.equal(j.jumpsUsed,0);
 assert.deepEqual(events,[1,2,'land']);
 assert.equal(j.jump(),true);
 j.reset();
 assert.equal(j.airborne,false);
});

test('broom can pass low hazards and duck below suspended logs, but not pine trunks',()=>{
 for(const type of ['pee','fish','lava','pineLog'])assert.equal(broomIgnoresHazard(type),true);
 for(const type of ['knot','tree'])assert.equal(broomIgnoresHazard(type),false);
 assert.equal(BROOM_CONFIG.duration,9);
 assert.equal(BROOM_CONFIG.hoverHeight,.77);
});

test('full-width pine log requires sliding; jumping cannot clear it',()=>{
 assert.equal(clearsPineLog(false,false,false),false);
 assert.equal(clearsPineLog(true,false,false),true);
 assert.equal(clearsPineLog(false,true,false),true);
 assert.equal(clearsPineLog(false,false,true),true);
});

test('broom ducks smoothly under pine log and returns to normal flight',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.equal(pineLogBroomDuck(-16,0),0);
 assert.ok(pineLogBroomDuck(-10,0)>0);
 assert.equal(pineLogBroomDuck(-4,0),1);
 assert.equal(pineLogBroomDuck(2,0),1);
 assert.ok(pineLogBroomDuck(6,0)<1);
 assert.equal(pineLogBroomDuck(9,0),0);
 assert.equal(pineLogBroomDuck(16,0),0);
 assert.ok(game.includes("const broomDuck=broom.active?obstacles.reduce("));
 assert.ok(!game.includes('runner.scale.y=ultActive?1:(sliding?.58:1)'));
 assert.ok(game.includes('applySlidePose(ultActive||broom.active||broom.hoverHeight>.001?0:slideAction.crouch)'));
 assert.ok(game.includes('runner.rotation.x=ultActive?-.12:0;'));
 assert.ok(game.includes("broom.applyPose(broomDuck)"));
 assert.ok(!game.includes("runner.scale.y=ultActive?1:(sliding?.58:1-.50*broomDuck)"));
 assert.ok(game.includes("const broomHover=broom.hoverHeight*(1-broomDuck)+.20*broomDuck"));
 assert.ok(!game.includes('pineLogBroomLift'));
 // A proper body bend changes the torso joint, not the full character's scale.
 const upright=getBroomDuckPose(0), tucked=getBroomDuckPose(1);
 assert.equal(upright.waistHeight,1);
 assert.equal(upright.waistPitch,.17);
 assert.ok(tucked.waistPitch< -1.4);
 assert.ok(tucked.waistHeight<upright.waistHeight);
 assert.ok(tucked.armPitch>upright.armPitch);
 assert.ok(tucked.legPitch>upright.legPitch);
 assert.equal(getBroomDuckPose(0).waistPitch,upright.waistPitch);
 assert.equal(getBroomDuckPose(1,0).waistHeight,1);
 const normal=.77;
 assert.equal(normal*(1-pineLogBroomDuck(-16,0))+.20*pineLogBroomDuck(-16,0),normal);
});

test('ultimate keeps normal flight altitude and cannot expire over a log',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('const broomDuck=broom.active?obstacles.reduce('));
 assert.ok(game.includes('const jumpY=ultActive?2.25+Math.sin(t*.008)*.14:'));
 assert.ok(game.includes('ultTimer=Math.max(ultTimer,pineLogFlightGuardDuration(gap,ultimateSpeed))'));
 // Extend a nearly finished ultimate just enough to pass the crossing corridor.
 const remaining=.1, speed=22;
 for(const gap of [-15,-8,-1,0,2,8]){
  const required=pineLogFlightGuardDuration(gap,speed);
  assert.ok(required>0);
  assert.ok(Math.max(remaining,required)>=required);
 }
 assert.equal(pineLogFlightGuardDuration(-17,speed),0);
 assert.equal(pineLogFlightGuardDuration(9,speed),0);
 assert.equal(pineLogFlightGuardDuration(0,0),0);
});

test('lava jumps retain their original height threshold',()=>{
 assert.equal(lavaJumpCleared(true,.63),true);
 assert.equal(lavaJumpCleared(true,.62),false);
 assert.equal(lavaJumpCleared(false,2),false);
});

test('ultimate moves faster than the broom, which moves faster than running',()=>{
 const factor=(ult,broom)=>travelSpeedMultiplier(ult,broom,BROOM_CONFIG.speedMultiplier,BROOM_CONFIG.ultimateSpeedMultiplier);
 assert.equal(factor(false,false),1);
 assert.equal(factor(false,true),1.2);
 assert.equal(factor(true,true),1.35);
 assert.equal(factor(true,false),1.35);
});

test('protected third-party sound and road-texture URLs remain untouched',()=>{
 const sfx=readFileSync(new URL('../src/audio/sfx.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../src/world/World.js',import.meta.url),'utf8');
 assert.ok(sfx.includes('https://assets.mixkit.co/active_storage/sfx/883/883-preview.mp3'));
 assert.ok(world.includes('https://raw.githubusercontent.com/MaxCringe/paint/main/pictures/KNOTTY%20PINE/TEXTURE/knotty%20pine_1.jpg'));
});

test('backup sounds are removed, active audio is still present',()=>{
 for(const file of ['soul.ogg','bats-flap_1.ogg','bats-flap_2.ogg','bats-flap_3.ogg'])
  assert.equal(existsSync(new URL('../public/audio/sfx/'+file,import.meta.url)),false,file);
 for(const file of ['jump.ogg','hat.ogg','pine-body-impact-courtneyeck.mp3','bats-flock-digpro120.mp3'])
  assert.equal(existsSync(new URL('../public/audio/sfx/'+file,import.meta.url)),true,file);
});

test('consecutive pine logs: a second deliberate slide press refreshes the active slide',()=>{
 const s=createSlide();
 assert.equal(SLIDE_DURATION,.82);
 s.press();
 s.update(.45);
 assert.ok(s.active);
 assert.ok(s.crouch>.8);
 const nearlyOver=s.remaining;
 s.press(); // This used to be discarded while the first slide was active.
 assert.ok(s.remaining>nearlyOver);
 s.update(.5); // Past the first slide's original expiration.
 assert.equal(s.active,true);
 for(let i=0;i<20;i++)s.update(1/60); // Cross expiry at real frame intervals.
 assert.equal(s.active,false);
 assert.ok(s.crouch>0); // Fiona recovers gradually rather than popping upright.
 for(let i=0;i<25;i++)s.update(1/60);
 assert.ok(s.crouch<.03);
 s.reset();
 assert.equal(s.crouch,0);
});

test('natural slide bends joints and skirt; no full-body squash, repeat hold or broom pose regression',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const fiona=readFileSync(new URL('../src/player/Fiona.js',import.meta.url),'utf8');
 assert.ok(game.includes("slideAction.press();audio.play('slide')"));
 assert.ok(game.includes("'ArrowDown','KeyS'].includes(e.code)"));
 assert.ok(game.includes('slideAction.update(dt)'));
 assert.ok(!game.includes('slideT'));
 assert.ok(!game.includes('runner.scale.y='));
 assert.ok(fiona.includes('skirtPivot.rotation.x=pose.skirtPitch'));
 assert.ok(fiona.includes('torso.rotation.x+=pose.waistPitch'));
 assert.ok(fiona.includes('legL.rotation.x+=(pose.frontLegPitch'));
 const standing=getSlidePose(0),crouched=getSlidePose(1);
 assert.equal(standing.waistPitch,0);
 assert.equal(standing.waistDrop,0);
 assert.ok(crouched.waistPitch< -1);
 assert.ok(crouched.waistDrop<0);
 assert.ok(crouched.skirtPitch<0);
 assert.ok(crouched.frontLegPitch>0);
 assert.ok(crouched.rearLegPitch<0);
 assert.equal(getSlidePose(2).waistPitch,crouched.waistPitch);
});
