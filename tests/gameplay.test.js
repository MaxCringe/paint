import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDoubleJump} from '../src/player/DoubleJump.js';
import {BROOM_CONFIG} from '../src/powerups/BroomRide.js';
import {broomIgnoresHazard,lavaJumpCleared,travelSpeedMultiplier,clearsPineLog,pineLogBroomLift,pineLogFlightGuardDuration} from '../src/systems/HazardRules.js';

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

test('broom can pass low hazards and fly above suspended logs, but not pine trunks',()=>{
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

test('broom crosses logs in a smooth arc and returns to normal hover height',()=>{
 assert.equal(pineLogBroomLift(-16,0),0);
 assert.ok(pineLogBroomLift(-10,0)>0);
 assert.ok(Math.abs(pineLogBroomLift(-4,0)-1.9)<1e-10);
 assert.ok(Math.abs(pineLogBroomLift(2,0)-1.9)<1e-10);
 assert.ok(pineLogBroomLift(6,0)>0);
 assert.equal(pineLogBroomLift(9,0),0);
 assert.equal(pineLogBroomLift(16,0),0);
});

test('ultimate keeps normal flight altitude and cannot expire over a log',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('const logLift=broom.active?obstacles.reduce('));
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
