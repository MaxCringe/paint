import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDoubleJump} from '../src/player/DoubleJump.js';
import {createSlide,getSlidePose,getSlideLegPose,SLIDE_DURATION} from '../src/player/Slide.js';
import * as THREE from 'three';
import {createFiona} from '../src/player/Fiona.js';
import {BROOM_CONFIG,getBroomDuckPose} from '../src/powerups/BroomRide.js';
import {broomIgnoresHazard,lavaJumpCleared,lavaCrossingTouchesRunner,travelSpeedMultiplier,clearsPineLog,pineLogBroomDuck,pineLogFlightGuardDuration,pineLogDoubleJumpCleared,pineLogCrossingTouchesRunner, PINE_LOG_DOUBLE_JUMP_CLEARANCE,PINE_LOG_COLLISION_HALF_DEPTH,smallPineDoubleJumpCleared,smallPineCrossingTouchesRunner,SMALL_PINE_DOUBLE_JUMP_CLEARANCE,SMALL_PINE_COLLISION_HALF_DEPTH} from '../src/systems/HazardRules.js';

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

test('full-width pine log requires sliding, broom or a sufficiently high DOUBLE jump',()=>{
 assert.equal(clearsPineLog(false,false,false),false);
 assert.equal(clearsPineLog(true,false,false),true);
 assert.equal(clearsPineLog(false,true,false),true);
 assert.equal(clearsPineLog(false,false,true),true);
 // A first jump can never clear the trunk, even with an artificial high Y.
 assert.equal(clearsPineLog(false,false,false,1,3.5),false);
 assert.equal(clearsPineLog(false,false,false,2,2.44),false);
 assert.equal(clearsPineLog(false,false,false,2,2.45),true);
 assert.equal(clearsPineLog(false,false,false,2,3.2),true);
});

test('double jump reaches pine-log clearance, but only after the second press',()=>{
 const jumper=createDoubleJump();
 jumper.jump();
 let firstPeak=0;
 for(let frame=0;frame<18;frame++){
  jumper.update(1/60);
  firstPeak=Math.max(firstPeak,jumper.height);
  assert.equal(pineLogDoubleJumpCleared(jumper.jumpsUsed,jumper.height),false);
 }
 assert.ok(firstPeak<2);
 assert.equal(jumper.jump(),true);
 let maxHeight=0,safeFrames=0;
 for(let frame=0;frame<45;frame++){
  jumper.update(1/60);
  maxHeight=Math.max(maxHeight,jumper.height);
  if(pineLogDoubleJumpCleared(jumper.jumpsUsed,jumper.height))safeFrames++;
 }
 assert.ok(maxHeight>3,'second jump rises above the log');
 assert.ok(safeFrames>=18,'player has a practical crossing window');
 assert.equal(pineLogDoubleJumpCleared(2,NaN),false);
});

test('pine log collision is swept across its width, not accepted after a brief high point',()=>{
 const h=PINE_LOG_COLLISION_HALF_DEPTH;
 assert.ok(h>.36);
 assert.equal(pineLogCrossingTouchesRunner(-4,-h-.01),false);
 assert.equal(pineLogCrossingTouchesRunner(-4,-h),true);
 assert.equal(pineLogCrossingTouchesRunner(-h,h),true);
 assert.equal(pineLogCrossingTouchesRunner(0,h+.01),true);
 assert.equal(pineLogCrossingTouchesRunner(h+.01,h+1),false);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('pineLogCrossingTouchesRunner(before,after)'));
 assert.ok(game.includes('doubleJump.jumpsUsed,doubleJump.height'));
 assert.ok(game.includes('if(after>PINE_LOG_COLLISION_HALF_DEPTH)o.passed=true'));
 assert.ok(game.includes("if(o.type==='pineLog'){"));
 assert.equal(PINE_LOG_DOUBLE_JUMP_CLEARANCE,2.45);
});

test('small one-lane pine now requires SECOND jump and clearance above its trunk',()=>{
 assert.equal(SMALL_PINE_DOUBLE_JUMP_CLEARANCE,2.7);
 assert.equal(smallPineDoubleJumpCleared(0,4),false);
 assert.equal(smallPineDoubleJumpCleared(1,4),false);
 assert.equal(smallPineDoubleJumpCleared(2,2.69),false);
 assert.equal(smallPineDoubleJumpCleared(2,2.7),true);
 assert.equal(smallPineDoubleJumpCleared(2,3.1),true);
 assert.equal(smallPineDoubleJumpCleared(2,NaN),false);
 const jumper=createDoubleJump();
 jumper.jump();
 let firstApex=0;
 for(let i=0;i<23;i++){
  jumper.update(1/60);firstApex=Math.max(firstApex,jumper.height);
  assert.equal(smallPineDoubleJumpCleared(jumper.jumpsUsed,jumper.height),false);
 }
 assert.ok(firstApex<SMALL_PINE_DOUBLE_JUMP_CLEARANCE);
 assert.equal(jumper.jump(),true);
 let framesAbove=0;
 for(let i=0;i<45;i++){
  jumper.update(1/60);
  if(smallPineDoubleJumpCleared(jumper.jumpsUsed,jumper.height))framesAbove++;
 }
 assert.ok(framesAbove>=15,'second jump gives enough time to cross a small pine');
});

test('small pine checks all of its depth with a swept test, without affecting fish',()=>{
 const h=SMALL_PINE_COLLISION_HALF_DEPTH;
 assert.ok(h>.62);
 assert.equal(smallPineCrossingTouchesRunner(-5,-h-.01),false);
 assert.equal(smallPineCrossingTouchesRunner(-5,-h),true);
 assert.equal(smallPineCrossingTouchesRunner(-h,h),true);
 assert.equal(smallPineCrossingTouchesRunner(0,h+.02),true);
 assert.equal(smallPineCrossingTouchesRunner(h+.01,h+1),false);
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes("if(o.type==='knot'){"));
 assert.ok(game.includes('smallPineCrossingTouchesRunner(before,after)'));
 assert.ok(game.includes('!smallPineDoubleJumpCleared(doubleJump.jumpsUsed,doubleJump.height)'));
 assert.ok(game.includes("end('tree');break;"));
 assert.ok(game.includes("if(after>SMALL_PINE_COLLISION_HALF_DEPTH)o.passed=true;"));
 assert.ok(game.includes("if(o.type==='pee'){"));
 assert.ok(game.includes("if(!jumping){end(o.type==='fish'?'fish':'other');break}"));
 assert.ok(game.includes("if(broom.immuneTo(o.type)||revivalShield>0)continue;"));
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
 assert.ok(game.includes('runner.rotation.x=-.055*ultimateFlight.lift;'));
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
 assert.ok(game.includes('const jumpY=ultActive?ultimateFlight.height(t):'));
 assert.ok(game.includes('if(crossing>0)ultTimer=Math.max(ultTimer,crossing+ULTIMATE_LAND_SECONDS)'));
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

test('lava collision stays active until the far bank, even after an airborne entry',()=>{
 const half=2.95;
 assert.equal(lavaCrossingTouchesRunner(-4,-half-.01,half),false);
 assert.equal(lavaCrossingTouchesRunner(-4,-half,half),true);
 assert.equal(lavaCrossingTouchesRunner(-2,0,half),true);
 assert.equal(lavaCrossingTouchesRunner(0,half+.1,half),true);
 assert.equal(lavaCrossingTouchesRunner(half+.01,half+1,half),false);
 assert.equal(lavaCrossingTouchesRunner(NaN,0,half),false);
 assert.equal(lavaCrossingTouchesRunner(0,0,0),false);

 const jump=createDoubleJump();
 jump.jump();
 for(let i=0;i<12;i++)jump.update(1/60);
 assert.equal(lavaJumpCleared(jump.airborne,jump.height),true);
 assert.equal(lavaCrossingTouchesRunner(-3.2,-2.7,half),true);
 // Fiona can initially clear the front edge, then land in the same river.
 for(let i=0;i<42;i++)jump.update(1/60);
 assert.equal(jump.airborne,false);
 assert.equal(lavaCrossingTouchesRunner(-.5,.1,half),true);
 assert.equal(lavaJumpCleared(jump.airborne,jump.height),false);

 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('if(lavaCrossingTouchesRunner(before,after,half))'));
 assert.ok(game.includes('if(!lavaJumpCleared(jumping,jumpY)&&revivalShield<=0){end();break}'));
 assert.ok(game.includes('if(after>half)o.passed=true;'));
 assert.ok(!game.includes('const crossedFrontEdge='));
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
 const input=readFileSync(new URL('../src/systems/GameInput.js',import.meta.url),'utf8');
 assert.ok(input.includes("e.code==='ArrowDown'||e.code==='KeyS'"));
 assert.ok(game.includes('slideAction.update(dt)'));
 assert.ok(!game.includes('slideT'));
 assert.ok(!game.includes('runner.scale.y='));
 assert.ok(fiona.includes('skirtPivot.rotation.x=pose.skirtPitch'));
 assert.ok(fiona.includes('torso.rotation.x+=pose.waistPitch'));
 assert.ok(fiona.includes('knee.rotation.x=legs.kneePitch'));
 const standing=getSlidePose(0),crouched=getSlidePose(1);
 assert.ok(Math.abs(standing.waistPitch)<1e-9);
 assert.ok(Math.abs(standing.waistDrop)<1e-9);
 assert.ok(crouched.waistPitch< -.7 && crouched.waistPitch> -1);
 assert.ok(crouched.waistDrop<0);
 assert.ok(crouched.skirtPitch<0);
 assert.ok(crouched.waistRoll<0);
 assert.ok(getSlideLegPose(1).thighPitch>.5);
 assert.ok(getSlideLegPose(1).kneePitch< -1.5);
 assert.equal(getSlidePose(2).waistPitch,crouched.waistPitch);
});

test('worn witch hat follows Fiona head while crouching or ducking on broom',()=>{
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 const hat=readFileSync(new URL('../src/powerups/WitchHat.js',import.meta.url),'utf8');
 const fiona=readFileSync(new URL('../src/player/Fiona.js',import.meta.url),'utf8');
 assert.ok(game.includes('createWitchHatFactory(scene,hats,torso)'));
 assert.ok(hat.includes('torso.add(wearable)'));
 assert.ok(hat.includes('wearable.position.set(0,1.46,0)'));
 assert.ok(!hat.includes('runner.add(wearable)'));
 assert.ok(fiona.includes('torso.rotation.x+=pose.waistPitch'));
 assert.ok(game.includes('broom.applyPose(broomDuck)'));
 // Its pickup and ten-second soul-magnet behavior must be preserved.
 assert.ok(hat.includes('hats.push({g,visual,glow,lane,z,phase:'));
 assert.ok(hat.includes('wearable.visible=active'));
 assert.ok(game.includes('magnetTime=10;'));
});

test('sliding bends true knee joints, plants the feet and preserves avatar proportions',()=>{
 const mat=color=>new THREE.MeshStandardMaterial({color});
 const box=(w,h,d,material,x,y,z,parent)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 const {runner,torso,legL,legR,applySlidePose}=createFiona(new THREE.Scene(),mat,box);
 applySlidePose(1);
 runner.updateMatrixWorld(true);
 assert.ok(torso.rotation.x<-.7&&torso.rotation.x> -1.1);
 assert.ok(torso.rotation.z<-.1);
 assert.ok(torso.position.y<.8);
 for(const [leg,side] of [[legL,'left'],[legR,'right']]){
  const knee=leg.getObjectByName('fiona-'+side+'-knee');
  const boot=leg.getObjectByName('fiona-'+side+'-boot');
  assert.ok(knee&&boot);
  assert.ok(leg.position.y<.4);
  assert.ok(leg.rotation.x>.5&&knee.rotation.x< -1.5);
  const p=boot.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(p.y-.075)<.04,'ankle close to ground');
  assert.ok(Math.abs(p.z-runner.position.z)<.04,'ankle beneath hip');
  for(const joint of [runner,torso,leg,knee,boot])assert.deepEqual(joint.scale.toArray(),[1,1,1]);
 }
 const pose=getSlideLegPose(1);
 assert.ok(Math.abs(pose.ankleHeight-.075)<.00001);
 assert.ok(Math.abs(pose.ankleDepth)<.00001);
 assert.ok(getSlidePose(1).waistPitch> -1);
});
