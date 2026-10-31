import * as THREE from 'three';

import { animateSoulFlame } from './souls/animateSoulFlame.js';
import { SOULS_PER_ULT, ULT_DURATION } from './config.js';
import { createLavaRiverFactory } from './obstacles/LavaRiver.js';
import { createFishFactory } from './obstacles/Fish.js';
import { createSegmentGenerator } from './systems/ObstacleManager.js';
import { createFiona } from './player/Fiona.js';
import { createDoubleJump } from './player/DoubleJump.js';
import { createWorld } from './world/World.js';
import { createGameAudio } from './audio/sfx.js';
import { createGameMusic } from './audio/music.js';
import { createBatEcosystem } from './systems/BatEcosystem.js';
import { createRatEcosystem } from './systems/RatEcosystem.js';
import { createMeteorEcosystem } from './systems/MeteorEcosystem.js';
import { createAirLite } from './systems/AirLite.js';
import { createWindSystem } from './systems/WindSystem.js';
import { createSoulFactory } from './souls/createSoulFactory.js';
import { createWitchHatFactory } from './powerups/WitchHat.js';
import { BROOM_ENABLED, BROOM_CONFIG, createBroomRide } from './powerups/BroomRide.js';
import { lavaJumpCleared, travelSpeedMultiplier } from './systems/HazardRules.js';
import { createOverlays } from './ui/GameOverlays.js';
import { createGameHud } from './ui/GameHud.js';
import { createRunRecordTracker } from './systems/RunRecords.js';
import { createAudioControls } from './ui/AudioControls.js';
import { createGameMenu } from './ui/GameMenu.js';
import { createGameOver } from './ui/GameOver.js';
import { createGameHaptics } from './systems/Haptics.js';

const { scene, camera, renderer, mat, box, trunkMat, darkStone, pineFloorTexture, movingLava, roadsideVegetation, updateForestPines } = createWorld();
const audio=createGameAudio();
const music=createGameMusic();
const haptics=createGameHaptics();
const batEcosystem=createBatEcosystem(scene,{onFlee:({x})=>audio.play('bats',{pan:x<0?-1:1})});
const ratEcosystem=createRatEcosystem(scene,{onFlee:({x})=>audio.play('rat',{pan:Math.max(-.65,Math.min(.65,x/10))})});
const meteorEcosystem=createMeteorEcosystem(scene,roadsideVegetation,{camera});
const airLite=createAirLite(scene);
const windSystem=createWindSystem(roadsideVegetation);

const { runner, torso, armL, armR, legL, legR, ultimateAura } = createFiona(scene, mat, box);
const obstacles=[], coins=[], hats=[];
const broom=createBroomRide(scene,runner,{torso,armL,armR,legL,legR});
const {makeHat,animateHat,animateWearable}=createWitchHatFactory(scene,hats,runner);
// One geometry per pine component, reused by every upcoming pine obstacle.
const knotTrunkGeometry=new THREE.CylinderGeometry(.36,.62,2.55,7);
const knotNodeGeometry=new THREE.SphereGeometry(1,8,7);
const knotBranchGeometry=new THREE.ConeGeometry(.13,.9,5);
function makeObstacle(lane,z,type='knot'){const g=new THREE.Group();g.position.set((lane-1)*2.55,0,z);scene.add(g);const trunk=new THREE.Mesh(knotTrunkGeometry,trunkMat);trunk.position.y=1.25;trunk.castShadow=true;g.add(trunk);for(const [x,y,z,s] of [[-.16,.72,.34,.19],[.2,1.32,.33,.16],[-.08,1.88,.28,.14]]){const knot=new THREE.Mesh(knotNodeGeometry,darkStone);knot.position.set(x,y,z);knot.scale.set(s,s*.82,s*.42);knot.castShadow=true;g.add(knot)}for(const x of [-.38,.38]){const branch=new THREE.Mesh(knotBranchGeometry,trunkMat);branch.position.set(x,1.72,0);branch.rotation.z=x<0?.8:-.8;g.add(branch)}obstacles.push({g,lane,type:'knot',z,passed:false})}
let puddleVariantCounter=0;
function makePuddle(lane,z){
 const g=new THREE.Group();
 g.position.set((lane-1)*2.55,0,z);
 scene.add(g);

 // Three asymmetrical splash silhouettes; the variant changes the shape, proportions and lobes.
 const variant=puddleVariantCounter++%3;
 const phase=Math.random()*Math.PI*2;
 const profiles=[
  {rx:1.27,rz:.82},  // wide, uneven kidney-shaped puddle
  {rx:1.12,rz:.94},  // more compact splat with several lobes
  {rx:1.30,rz:.74}   // long, ragged splash
 ];
 const cfg=profiles[variant];
 const outlineMat=new THREE.MeshBasicMaterial({color:0x231600,side:THREE.DoubleSide});
 const rimMat=new THREE.MeshBasicMaterial({color:0xfff2a0,side:THREE.DoubleSide});
 const peeMat=new THREE.MeshBasicMaterial({color:0xffe600,side:THREE.DoubleSide});
 const deepMat=new THREE.MeshBasicMaterial({color:0xffc400,side:THREE.DoubleSide});
 const shineMat=new THREE.MeshBasicMaterial({color:0xfffbd4,side:THREE.DoubleSide});

 function blobGeometry(rx,rz,shapeVariant,seed,scale=1){
  const shape=new THREE.Shape();
  const steps=72;
  for(let i=0;i<steps;i++){
   const a=(i/steps)*Math.PI*2;
   let r;
   if(shapeVariant===0){
    r=1+.17*Math.sin(2*a+seed)+.105*Math.cos(3*a-seed*.7)+.055*Math.sin(5*a+seed*1.3);
   }else if(shapeVariant===1){
    r=1+.16*Math.sin(3*a+seed)+.105*Math.cos(5*a+seed*.8)+.06*Math.sin(7*a-seed);
   }else{
    r=1+.13*Math.cos(2*a+seed)+.145*Math.sin(4*a+seed*.5)+.075*Math.cos(7*a+seed*1.1);
   }
   // Slight directional stretch makes the outline less mechanically radial.
   const x=Math.cos(a)*rx*r*scale;
   const y=Math.sin(a)*rz*r*scale;
   if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape,1);
 }

 function addBlob(rx,rz,shapeVariant,seed,scale,material,y){
  const mesh=new THREE.Mesh(blobGeometry(rx,rz,shapeVariant,seed,scale),material);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=y;
  mesh.renderOrder=5;
  g.add(mesh);
  return mesh;
 }

 // Layer the same ragged edge: dark silhouette, pale wet rim, then vivid yellow liquid.
 addBlob(cfg.rx,cfg.rz,variant,phase,1.00,outlineMat,-.025);
 addBlob(cfg.rx,cfg.rz,variant,phase,.955,rimMat,-.008);
 addBlob(cfg.rx,cfg.rz,variant,phase,.895,peeMat,.002);
 addBlob(cfg.rx,cfg.rz,variant,phase+.32,.57,deepMat,.009);

 // Uneven glossy streaks are also small organic shapes rather than round dots.
 addBlob(.27,.075,1,phase+.8,1.0,shineMat,.015).position.set(-.28,.015,-.18);
 addBlob(.18,.055,2,phase+1.7,1.0,shineMat,.016).position.set(.30,.016,.19);
 addBlob(.12,.04,0,phase+2.4,1.0,rimMat,.017).position.set(.02,.017,-.35);

 // Small detached splashes break up the outline without making the whole puddle a circle.
 addBlob(.20,.13,1,phase+1.1,.95,peeMat,.001).position.set(-cfg.rx*.82,.001,-cfg.rz*.18);
 addBlob(.17,.16,2,phase+2.0,.90,peeMat,.001).position.set(cfg.rx*.80,.001,cfg.rz*.30);
 addBlob(.16,.10,0,phase+2.8,.90,peeMat,.001).position.set(-cfg.rx*.46,.001,cfg.rz*.82);

 // Generated puddle buffers and materials are owned by this one obstacle.
 let disposed=false;
 g.userData.dispose=()=>{
  if(disposed)return;
  disposed=true;
  g.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.dispose();});
  for(const material of [outlineMat,rimMat,peeMat,deepMat,shineMat])material.dispose();
 };
 obstacles.push({g,lane,type:'pee',z,passed:false});
}
const {makeFish:makeFishObstacle,animateFishOdor}=createFishFactory(scene,obstacles);
function makeFish(lane,z){
 makeFishObstacle(lane,z);
 ratEcosystem.considerFish(obstacles[obstacles.length-1],obstacles);
}
// Procedural 3D soul-flame geometry. No face, eyes, or coin-like ring.

const makeSoul = createSoulFactory(scene, coins);

const makeLavaRiver = createLavaRiverFactory(scene, obstacles);
const makeSegment = createSegmentGenerator({
  makeLavaRiver,
  makeFish,
  makePuddle,
  makeObstacle,
  makeSoul,
  makeHat,
  makeBroom:BROOM_ENABLED?broom.spawn:undefined,
  broomChance:BROOM_CONFIG.pickupChance
});
const doubleJump=createDoubleJump({onJump:()=>audio.play('jump'),onLand:()=>audio.play('land')});
let footstepTimer=0;
let lane=1, state='ready', distance=0, coinCount=0, soulCharge=0, ultTimer=0, magnetTime=0, speed=15, spawnZ=-50, slideT=0, slipT=0, invuln=0, last=0, spawnTimer=0;
const $=id=>document.getElementById(id);
createAudioControls(audio,music);
const hud=createGameHud({soulGoal:SOULS_PER_ULT,ultimateDuration:ULT_DURATION});
let best=Number(localStorage.getItem('knottyPineBest')||0);let bestSouls=Number(localStorage.getItem('knottyPineBestSouls')||0);hud.setRecords(best,bestSouls);
const runRecords=createRunRecordTracker({storage:localStorage,bestMetres:best,bestSouls});
function updateHud(force=false){
 hud.setRecordHighlights(runRecords.progress(distance,coinCount));
 hud.update({distance,coinCount,soulCharge,ultTimer,magnetTime,broomActive:broom.active,broomRemaining:broom.remaining},force);
}
const popToast=message=>hud.toast(message);
function activateUltimate(){broom.cancel();doubleJump.reset();audio.play('ultimate');haptics.play('ultimate');soulCharge=0;ultTimer=ULT_DURATION;popToast('УЛЬТА! ФИОНА ВЗЛЕТАЕТ');updateHud(true)}
function start(){
 // A restart from pause is still a completed attempt for record purposes.
 if(state==='paused'){
  best=Math.max(best,Math.floor(distance));
  bestSouls=Math.max(bestSouls,coinCount);
  localStorage.setItem('knottyPineBest',best);
  localStorage.setItem('knottyPineBestSouls',bestSouls);
  hud.setRecords(best,bestSouls);
 }
 runRecords.start(best,bestSouls);
 hud.setRecordHighlights({metres:false,souls:false});
 audio.unlock();audio.play('start');music.start();airLite.reset();windSystem.reset();meteorEcosystem.reset();ratEcosystem.reset();for(const o of obstacles){scene.remove(o.g);o.g.userData.dispose?.()}for(const h of hats)scene.remove(h.g);broom.reset();for(const c of coins){scene.remove(c.g);c.g.userData.dispose?.();}obstacles.length=0;coins.length=0;hats.length=0;lane=1;distance=0;coinCount=0;soulCharge=0;ultTimer=0;magnetTime=0;animateWearable(0,false);speed=15;spawnZ=-48;spawnTimer=.2;footstepTimer=0;doubleJump.reset();slideT=0;slipT=0;invuln=0;runner.rotation.set(0,0,0);runner.position.set(0,0,2.3);ultimateAura.reset();batEcosystem.reset();state='playing';menu.hide();hud.clearToast();updateHud(true)}
function end(reason='other'){broom.cancel();ultimateAura.reset();haptics.play('hit');audio.play(reason==='tree'?'treeHit':'death');music.pause();updateHud(true);state='over';best=Math.max(best,Math.floor(distance));bestSouls=Math.max(bestSouls,coinCount);localStorage.setItem('knottyPineBest',best);localStorage.setItem('knottyPineBestSouls',bestSouls);hud.setRecords(best,bestSouls);menu.showGameOver();gameOver.show({metres:Math.floor(distance),collectedSouls:coinCount})}
function move(d){if(state!=='playing'||slipT>0)return;const nextLane=Math.max(0,Math.min(2,lane+d));if(nextLane!==lane){lane=nextLane;audio.play('move')}}
function jump(){if(state==='playing'&&ultTimer<=0&&!broom.active&&slideT<=0)doubleJump.jump()}
function slide(){if(state==='playing'&&ultTimer<=0&&!broom.active&&slideT<=0&&!doubleJump.airborne){slideT=.68;audio.play('slide')}}
function actionKey(e){if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(state==='playing')togglePause();else if(!menu.escape()&&state==='paused')togglePause();}return}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','KeyA','KeyD','KeyW','KeyS'].includes(e.code))e.preventDefault();if(state==='paused')return;
 // Holding jump must not consume the second jump through keyboard auto-repeat.
 if(e.repeat&&['ArrowUp','KeyW','Space'].includes(e.code))return;
 if(state==='over')return; if(state!=='playing'){if(!menu.isSubpageOpen()&&(e.code==='Enter'||e.code==='Space'))start();return}if(e.code==='ArrowLeft'||e.code==='KeyA')move(-1);if(e.code==='ArrowRight'||e.code==='KeyD')move(1);if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')jump();if(e.code==='ArrowDown'||e.code==='KeyS')slide()}
window.addEventListener('keydown',actionKey);
let touchX=0,touchY=0;renderer.domElement.addEventListener('pointerdown',e=>{touchX=e.clientX;touchY=e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(state!=='playing')return;const dx=e.clientX-touchX,dy=e.clientY-touchY;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<0)jump();else slide()});
const {fpsDisplay}=createOverlays();
const menu=createGameMenu({onStart:start,onResume:togglePause,onPause:togglePause,haptics,fpsDisplay});
const gameOver=createGameOver({
 onRetry:()=>{
  gameOver.hide();
  start();
 },
 onMainMenu:()=>{
  gameOver.hide();
  state='ready';
  $('message').textContent='Фиона — ведьма в аду. Беги сквозь сосновый лес, собирай души и избегай ловушек.';
  menu.show('ready');
 }
});
menu.show('ready');
let fpsSampleStart=null,fpsFrames=0;
function togglePause(){
 if(state!=='playing'&&state!=='paused')return;
 const paused=state==='playing';
 state=paused?'paused':'playing';
 if(paused){
  music.pause();
  $('message').textContent='Пауза. Забег сохранён: можно продолжить с того же места.';
  menu.show('paused');
  fpsDisplay.textContent='FPS: --';fpsSampleStart=null;fpsFrames=0;
 }else{
  music.resume();
  menu.hide();
 }
}
function frame(t){requestAnimationFrame(frame);
 // Keep the final rendered frame completely still, including lava and fire animations.
 if(state==='paused'){last=t;fpsSampleStart=null;fpsFrames=0;return;}
 if(fpsSampleStart===null)fpsSampleStart=t;
 fpsFrames++;
 const fpsInterval=t-fpsSampleStart;
 if(fpsInterval>=500){
  const fps=Math.round(fpsFrames*1000/fpsInterval);
  fpsDisplay.textContent='FPS: '+fps;
  fpsDisplay.dataset.status=fps>=50?'good':fps>=30?'medium':'low';
  fpsSampleStart=t;fpsFrames=0;
 }
 const dt=Math.min((t-last)/1000||0,.04);last=t;
 // Wind is visible on the start and game-over screens; pause still freezes the scene.
 windSystem.update(dt);
 batEcosystem.update(dt,{playing:state==='playing',ultimate:ultTimer>0,speed:speed*(ultTimer>0?BROOM_CONFIG.ultimateSpeedMultiplier:broom.active?BROOM_CONFIG.speedMultiplier:1),runnerX:runner.position.x,runnerZ:runner.position.z});
 // Animate molten streaks from the summit down the volcano's face, looping continuously.
 for(const flow of movingLava){const p=(t*.000085+flow.phase)%1;const y=19-p*19;const x=flow.xStart+(flow.xEnd-flow.xStart)*p+Math.sin(p*17+flow.phase*9)*.22;flow.mesh.position.set(x,y-1,-71.85);}

 hud.tick(dt);
 if(state==='playing'){
  // Scroll the road texture toward the camera so the boards stay fixed to the world as Fiona runs.
  if(ultTimer>0)ultTimer=Math.max(0,ultTimer-dt);
  if(ultTimer<=0&&soulCharge>=SOULS_PER_ULT)activateUltimate();
  const ultActive=ultTimer>0;
  broom.tick(dt,t);
  const travelSpeed=speed*travelSpeedMultiplier(ultActive,broom.active,BROOM_CONFIG.speedMultiplier,BROOM_CONFIG.ultimateSpeedMultiplier);
  pineFloorTexture.offset.y=(pineFloorTexture.offset.y+travelSpeed*dt*15/220)%1;
  distance+=travelSpeed*dt*.72;speed=Math.min(29,15+distance*.009);spawnTimer-=dt;
  if(spawnTimer<=0){makeSegment(spawnZ);spawnZ-=18+Math.random()*7;spawnTimer=Math.max(.48,1.02-(speed-15)*.025)}
  if(spawnZ<-150)spawnZ= -50;
  if(magnetTime>0)magnetTime=Math.max(0,magnetTime-dt);
  animateWearable(t,magnetTime>0);
  if(!ultActive&&!broom.active)doubleJump.update(dt);
  slideT=Math.max(0,slideT-dt);slipT=Math.max(0,slipT-dt);invuln=Math.max(0,invuln-dt);
  const jumping=!ultActive&&!broom.active&&doubleJump.airborne, sliding=!ultActive&&!broom.active&&slideT>0;
  if(!ultActive&&!broom.active&&!jumping&&!sliding&&slipT<=0){
    footstepTimer-=dt;
    if(footstepTimer<=0){audio.play('step');footstepTimer=Math.max(.24,.42*15/speed)}
   }else footstepTimer=.12;
   const jumpY=ultActive?2.25+Math.sin(t*.008)*.14:(broom.active||broom.hoverHeight>0?broom.hoverHeight:doubleJump.height);
  runner.position.x+=( (lane-1)*2.55-runner.position.x)*Math.min(1,dt*12);runner.position.y=jumpY;
  runner.scale.y=ultActive?1:(sliding?.58:1);runner.position.z=2.3;
  runner.rotation.z=ultActive?Math.sin(t*.003)*.035:(slipT>0?Math.sin(t*.045)*.2:0);
  runner.rotation.x=ultActive?-.12:0;
  ultimateAura.update(t,ultActive);
  const run= t*.012*travelSpeed/15;armL.rotation.x=Math.sin(run)*.65;armR.rotation.x=-Math.sin(run)*.65;legL.rotation.x=-Math.sin(run)*.72;legR.rotation.x=Math.sin(run)*.72;
  broom.applyPose();
  torso.rotation.z=( (lane-1)*2.55-runner.position.x)*-.05;
  for(const o of obstacles){
   const previousZ=o.g.position.z;
   o.g.position.z+=travelSpeed*dt;
   // During ultimate flight Fiona can pass over lava rivers and all ground hazards.
   if(ultActive&&o.g.position.z>-3.5)o.passed=true;
   if(o.type==='fish')animateFishOdor(o.g,t);
   if(o.type==='lava'){
    if(!ultActive&&!broom.immuneTo('lava')&&!o.passed){
     const half=o.g.userData.halfDepth||.88;
     const crossedFrontEdge=previousZ+half<runner.position.z&&o.g.position.z+half>=runner.position.z;
     if(crossedFrontEdge){
      o.passed=true;
      if(!lavaJumpCleared(jumping,jumpY)){end();break}
      invuln=Math.max(invuln,.22);
     }
    }
    for(const bubble of (o.g.userData.bubbles||[])){
     const pulse=1+.28*Math.sin(t*.016+bubble.phase);
     bubble.mesh.scale.y=bubble.sy*pulse;
     bubble.mesh.position.y=-.002+Math.max(0,Math.sin(t*.021+bubble.phase))*.018;
    }
    if(o.g.userData.bankFlames){const f=o.g.userData.bankFlames;f.scale.y=.84+.20*(.5+.5*Math.sin(t*.038+o.g.userData.bankFlamePhase));}
    continue;
   }
   if(!ultActive&&!o.passed&&o.g.position.z>1.2){
    o.passed=true;
    if(o.lane===lane&&Math.abs(runner.position.x-(o.lane-1)*2.55)<1.05){
     if(broom.immuneTo(o.type))continue;
      if(o.type==='pee'){if(!jumping&&invuln<=0){slipT=.9;invuln=.95;audio.play('slip');popToast('ФИОНА ПОСКОЛЬЗНУЛАСЬ!')}else if(jumping){invuln=.22}}
     else{const safe=jumping;if(!safe){end(o.type==='knot'?'tree':'other');break}else{invuln=.22}}
    }
   }
  }
  for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].g.position.z>13){scene.remove(obstacles[i].g);obstacles[i].g.userData.dispose?.();obstacles.splice(i,1)}
  ratEcosystem.update(dt,{playing:state==='playing',runnerX:runner.position.x,runnerZ:runner.position.z,ultimate:ultActive,speed:travelSpeed,obstacles});
  if(state==='playing')broom.advancePickups(dt,t,travelSpeed,lane,runner.position.x,{
   canCollect:!ultActive,
   onCollect:()=>{doubleJump.reset();slideT=0;slipT=0;audio.play('hat');haptics.play('item');popToast('ВЕДЬМИНА МЕТЛА — ПОЛЁТ 9 СЕКУНД');updateHud(true);}
  });
  // Floating hat is collected without changing obstacle collisions.
  for(const h of hats){
   h.g.position.z+=travelSpeed*dt;
   if(!h.collected)animateHat(h,t);
   if(!h.passed&&h.g.position.z>1.2){
    h.passed=true;
    if(h.lane===lane&&Math.abs(runner.position.x-(lane-1)*2.55)<1.05){
     h.collected=true;magnetTime=10;audio.play('hat');haptics.play('item');
     scene.remove(h.g);
     animateWearable(t,true);
     popToast('ВЕДЬМИНА ШЛЯПА — МАГНИТ 10 СЕКУНД');
    }
   }
  }
  for(let i=hats.length-1;i>=0;i--)if(hats[i].collected||hats[i].g.position.z>13){
   if(hats[i].g.parent)scene.remove(hats[i].g);
   hats.splice(i,1);
  }
  for(const c of coins){
   const phase=c.phase||c.z*.2;
   // While the hat is worn, attract souls from ALL three lanes.
   // Once a soul begins flying it completes its journey even if the timer runs out.
   const ahead=runner.position.z-c.g.position.z;
   if(magnetTime>0&&!c.magnetFlight&&ahead>-.9&&ahead<11.5){
    c.magnetFlight=true;
    c.magnetProgress=0;
   }
   if(c.magnetFlight){
    // Detach the collected flame from the scrolling road so it can glide inward
    // rather than rushing past Fiona before completing its sideways flight.
    c.magnetProgress=Math.min(1,(c.magnetProgress||0)+dt*1.55);
    const arc=Math.sin(Math.PI*c.magnetProgress);
    const easing=1-Math.exp(-dt*(3.4+c.magnetProgress*3.5));
    const sway=Math.sin(t*.006+phase)*.23*arc;
    c.g.position.x+=(runner.position.x+sway-c.g.position.x)*easing;
    c.g.position.z+=(runner.position.z+.08-c.g.position.z)*easing;
    c.g.position.y=c.baseY+Math.sin(t*.004+phase)*.11+arc*.85;
   }else{
    c.g.position.z+=travelSpeed*dt;
    c.g.position.y=c.baseY+Math.sin(t*.004+phase)*.14;
   }
   c.g.rotation.y=Math.sin(t*.0018+phase)*.62;
   c.g.rotation.z=Math.sin(t*.003+phase)*.07;
   const soulPulse=1+Math.sin(t*.006+phase)*.045;
   c.g.scale.set(soulPulse,soulPulse,soulPulse);

   // Souls beyond the fog distance need no per-frame CPU mesh deformation.
   if(c.g.position.z>-59||c.magnetFlight){
   for(let i=0;i<c.flames.length;i++){
    const flame=c.flames[i];
    animateSoulFlame(flame,t,phase+i*1.7,i===1?.65:1);
    flame.rotation.z=Math.sin(t*.009+phase+i*2.1)*(.045+i*.018);
   }
   c.aura.scale.set(1.32+Math.sin(t*.005+phase)*.07,1.22+Math.cos(t*.006+phase)*.06,1.18);
   c.sparks.forEach((spark,i)=>{
    const angle=t*.0035+spark.phase+i*1.55;
    spark.mesh.position.set(spark.x+Math.cos(angle)*.035,spark.y+Math.sin(t*.009+spark.phase)*.055,spark.z+Math.sin(angle)*.035);
    spark.mesh.rotation.x+=dt*2.3;
    spark.mesh.rotation.y+=dt*1.7;
   });
   }
   const closeToFiona=Math.hypot(c.g.position.x-runner.position.x,c.g.position.z-runner.position.z);
   const magnetCaught=c.magnetFlight&&c.magnetProgress>.25&&closeToFiona<.65;
   const normalCaught=!c.magnetFlight&&c.g.position.z>1.0&&c.g.position.z<3.7&&
    c.lane===lane&&Math.abs(runner.position.x-(c.lane-1)*2.55)<1.1;
   if(!c.g.userData.got&&(magnetCaught||normalCaught)){
    c.g.userData.got=true;audio.play('soul');haptics.play('soul');coinCount++;if(coinCount>bestSouls){bestSouls=coinCount;localStorage.setItem('knottyPineBestSouls',bestSouls);hud.setRecords(best,bestSouls)}soulCharge=Math.min(SOULS_PER_ULT,soulCharge+1);scene.remove(c.g);if(soulCharge>=SOULS_PER_ULT)activateUltimate();else popToast('+ 1 ДУША');updateHud(true)
   }
  }
  for(let i=coins.length-1;i>=0;i--)if(coins[i].g.position.z>13||coins[i].g.userData.got){if(coins[i].g.parent)scene.remove(coins[i].g);coins[i].g.userData.dispose?.();coins.splice(i,1)}
  // Roadside trees are fixed in the world; move them toward and past the runner, then recycle them far ahead.
  for(const plant of roadsideVegetation){plant.position.z+=travelSpeed*dt;if(plant.position.z>12)plant.position.z-=plant.userData.recycleLength}
  // Meteors remain decorative and follow the scrolling ground and recycling pines.
  meteorEcosystem.update(dt,{playing:state==='playing',speed:travelSpeed});
  airLite.update(dt,{playing:state==='playing',speed:travelSpeed,wind:windSystem.current});
  updateHud();
 }
 // Camera follows gently; maintain forward view
 camera.position.x+=(runner.position.x*.32-camera.position.x)*Math.min(1,dt*2.2);camera.position.y=5.0+(state==='playing'?Math.sin(t*.004)*.035:0);camera.lookAt(runner.position.x*.2,1.05,-5);
 // Sync grouped pine instances after recycling and wind movement.
 updateForestPines();
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.2))});
