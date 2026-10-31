import * as THREE from 'three';
import {createScarfRules,SCARF_TEST_MODE,SCARF_TEST_SPAWN_CHANCE} from '../systems/ScarfRules.js';
import {createScarfModelFactory} from './ScarfModel.js';

// Pickup logic and revival stay independent of the embroidered 3D model.
export function createScarfPickup(scene){
 const rules=createScarfRules();
 const {createModel}=createScarfModelFactory();
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const context=canvas.getContext('2d');
 const gradient=context.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'rgba(255,255,255,1)');
 gradient.addColorStop(.25,'rgba(255,255,255,.74)');
 gradient.addColorStop(.6,'rgba(255,255,255,.22)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 context.fillStyle=gradient;context.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas);
 const aura=new THREE.SpriteMaterial({map:texture,color:0xffffff,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending});
 let pickup=null,burstEffect=null,firstTestOffer=true;
 function clearPickup(){if(pickup)scene.remove(pickup.group);pickup=null}
 function clearBurst(){if(burstEffect){scene.remove(burstEffect.sprite);burstEffect.material.dispose()}burstEffect=null}
 function burst(position){
  clearBurst();
  const material=aura.clone();material.depthTest=false;material.opacity=.95;
  const sprite=new THREE.Sprite(material);
  sprite.position.set(position.x,position.y+1.45,position.z);sprite.scale.set(2.5,2.5,1);
  scene.add(sprite);burstEffect={sprite,material,timer:.65};
 }
 function reset(){clearPickup();clearBurst();rules.reset();firstTestOffer=true}
 function offer(distance,spawnZ,hazards=[],hats=[],souls=[]){
  if(pickup)return;
  if(SCARF_TEST_MODE){
   // Only one roll per generated section; first pickup is guaranteed for testing.
   if(!rules.canSpawn||(!firstTestOffer&&Math.random()>=SCARF_TEST_SPAWN_CHANCE))return;
  }else if(!rules.milestone(distance))return;
  // Prefer an open lane ahead of Fiona; avoid known obstacles and soul chains.
  for(let n=0;n<12;n++){
   const z=Math.min(-55,spawnZ-9)-n*12;
   const lanes=[0,1,2].filter(lane=>
    !hazards.some(o=>Math.abs(o.g.position.z-z)<6&&(o.type==='lava'||o.lane===lane))&&
    !hats.some(h=>h.lane===lane&&Math.abs(h.g.position.z-z)<4)&&
    !souls.some(s=>s.lane===lane&&Math.abs(s.g.position.z-z)<3)
   );
   if(!lanes.length)continue;
   const lane=lanes[Math.floor(Math.random()*lanes.length)];
   const group=new THREE.Group();group.position.set((lane-1)*2.55,0,z);
   const visual=createModel();
   visual.position.y=1.68;
   const halo=new THREE.Sprite(aura);
   halo.position.set(0,-.05,-.23);halo.scale.set(3.5,3.1,1);
   visual.add(halo);
   group.add(visual);scene.add(group);
   pickup={group,visual,halo,lane,phase:Math.random()*Math.PI*2};
   firstTestOffer=false;return;
  }
 }
 function update(dt,t,speed,lane,runnerX,onCollect){
  if(burstEffect){
   burstEffect.timer-=dt;
   const r=Math.max(0,burstEffect.timer/.65);
   burstEffect.material.opacity=r*.95;
   burstEffect.sprite.scale.setScalar(2.5+(1-r)*2);
   if(burstEffect.timer<=0)clearBurst();
  }
  if(!pickup)return;
  const p=pickup;
  p.group.position.z+=speed*dt;
  p.visual.position.y=1.68+Math.sin(t*.0035+p.phase)*.14;
  // A full, continuous 360-degree rotation, not the old back-and-forth sway.
  p.visual.rotation.y=t*.0015+p.phase;
  p.visual.rotation.x=Math.sin(t*.0017+p.phase)*.075;
  p.visual.rotation.z=Math.sin(t*.0028+p.phase)*.065;
  const scale=1+Math.sin(t*.006+p.phase)*.08;
  p.halo.scale.set(3.5*scale,3.1*scale,1);
  if(p.group.position.z>=1&&p.group.position.z<=3.8&&p.lane===lane&&Math.abs(runnerX-(lane-1)*2.55)<1.05){
   if(rules.collect()){burst({x:p.group.position.x,y:0,z:p.group.position.z});onCollect?.()}
   clearPickup();
  }else if(p.group.position.z>13)clearPickup();
 }
 function revive(position){if(!rules.consume())return false;burst(position);return true}
 return {reset,offer,update,revive,get canRevive(){return rules.canRevive}};
}
