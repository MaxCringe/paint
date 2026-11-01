import * as THREE from 'three';
import {broomVisualProfile} from './BroomVisualProfiles.js';

// WebGL-compatible magical-wisp / spark-burst preset, adapted for KNOTTY PINE.
// A light, fast-moving wake in flight; distinct "cough" puffs and amber sparks
// during the last three seconds. No imported assets or per-frame meshes.
const WARN_SECONDS=3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
const smooth=v=>v*v*(3-2*v);

export function broomTrailState(remaining){
 const seconds=Math.max(0,Number.isFinite(remaining)?remaining:0);
 const active=seconds>0, warning=active&&seconds<=WARN_SECONDS;
 const fatigue=warning?smooth(clamp((WARN_SECONDS-seconds)/WARN_SECONDS,0,1)):0;
 const elapsed=warning?WARN_SECONDS-seconds:0;
 // Integrated emission phase: coughs accelerate smoothly from 2 to 4 per second.
 return {
  active,warning,fatigue,
  coughPhase:2*elapsed+elapsed*elapsed/3,
  sparkIntensity:.12+.88*fatigue
 };
}

// Procedural atlas-free textures: no square quads, no CDN, no new dependencies.
function smokeTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');
 const blobs=[
  [57,61,36,.33],[76,58,33,.27],[46,79,29,.24],
  [71,82,34,.24],[52,42,23,.19],[88,77,24,.18]
 ];
 for(const [x,y,r,alpha] of blobs){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(245,236,252,${alpha})`);
  g.addColorStop(.40,`rgba(199,179,218,${alpha*.57})`);
  g.addColorStop(1,'rgba(153,139,172,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 return tex;
}
function streakTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=128;canvas.height=64;
 const ctx=canvas.getContext('2d');
 // Tapered magical speed streak, not an opaque rectangular smoke card.
 const shape=ctx.createRadialGradient(62,32,1,62,32,59);
 shape.addColorStop(0,'rgba(241,228,255,.92)');
 shape.addColorStop(.46,'rgba(189,170,242,.36)');
 shape.addColorStop(1,'rgba(151,142,199,0)');
 ctx.save();ctx.translate(64,32);ctx.scale(1,.13);ctx.translate(-64,-32);
 ctx.fillStyle=shape;ctx.fillRect(0,-220,128,500);ctx.restore();
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 return tex;
}
function sparkTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');
 const g=ctx.createRadialGradient(32,32,0,32,32,31);
 g.addColorStop(0,'rgba(255,255,255,1)');
 g.addColorStop(.16,'rgba(255,239,193,.98)');
 g.addColorStop(.46,'rgba(255,186,100,.63)');
 g.addColorStop(1,'rgba(255,126,58,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 return tex;
}

export function createBroomTrail(runner,glowTexture){
 const WISPS=20,STREAKS=12,SPARKS=24,BASE_WISPS=12;
 const plane=new THREE.PlaneGeometry(1,1);
 function batch(texture,count,opacity,blending,order){
  const material=new THREE.MeshBasicMaterial({
   map:texture,side:THREE.DoubleSide,transparent:true,
   opacity,depthTest:true,depthWrite:false,blending,toneMapped:false
  });
  const mesh=new THREE.InstancedMesh(plane,material,count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  mesh.renderOrder=order;
  mesh.visible=false;
  runner.add(mesh);
  return {mesh,material};
 }
 const wisps=batch(smokeTexture(),WISPS,.37,THREE.NormalBlending,3);
 const streaks=batch(streakTexture(),STREAKS,.65,THREE.AdditiveBlending,4);
 const sparks=batch(sparkTexture(),SPARKS,.75,THREE.AdditiveBlending,5);
 const smokePalette=[0xd0c1d9,0xbdb1ca,0xe1d5e7,0xb1a4bd];
 const streakPalette=[0xe2ceff,0xc4b4ef,0xf3d8ff];
 const sparkPalette=[0xffe4ac,0xffbb6c,0xffda91,0xfff6e8];
 for(let i=0;i<WISPS;i++)wisps.mesh.setColorAt(i,new THREE.Color(smokePalette[i%4]));
 for(let i=0;i<STREAKS;i++)streaks.mesh.setColorAt(i,new THREE.Color(streakPalette[i%3]));
 for(let i=0;i<SPARKS;i++)sparks.mesh.setColorAt(i,new THREE.Color(sparkPalette[i%4]));
 for(const b of [wisps,streaks,sparks])b.mesh.instanceColor.needsUpdate=true;
 const headMaterial=new THREE.SpriteMaterial({
  map:glowTexture,color:0xdec5ff,transparent:true,opacity:.25,
  depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false
 });
 const head=new THREE.Sprite(headMaterial);
 head.position.set(0,.62,1.52);
 head.visible=false;
 runner.add(head);
 const dummy=new THREE.Object3D();
 function place(mesh,i,x,y,z,w,h,angle=0,tilt=-.46){
  dummy.position.set(x,y,z);
  dummy.rotation.set(tilt,0,angle);
  dummy.scale.set(Math.max(.00001,w),Math.max(.00001,h),1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i,dummy.matrix);
 }
 function hide(){
  for(const b of [wisps,streaks,sparks])b.mesh.visible=false;
  head.visible=false;
 }
 function update(remaining,timeMs){
  const state=broomTrailState(remaining);
  if(!state.active){hide();return;}
  const visual=broomVisualProfile(remaining);
  const t=timeMs*.001;
  const fatigue=state.fatigue;
  const coughOnset=smooth(clamp((WARN_SECONDS-remaining)/.65,0,1));
  const size=visual.size/100;
  const length=visual.length/100;
  // The ordinary trail is airy: sparse moving filaments + faint translucent wisps.
  // The failure phase adds *separate* puffs rather than multiplying a grey fog.
  const normalPopulation=Math.min(BASE_WISPS,Math.round(8*visual.density/100));
  for(let i=0;i<WISPS;i++){
   if(i<BASE_WISPS){
    const age=fract((i+.35)/BASE_WISPS+t*.24);
    const envelope=Math.sin(Math.PI*age);
    const enabled=i<normalPopulation;
    const radius=enabled?(.21+age*.22)*envelope*size*(1-.27*fatigue):0;
    place(wisps.mesh,i,
     .12+age*.32+Math.sin(t*1.55+i*2.25)*(.05+.07*age),
     .57+age*.12+Math.cos(t*1.3+i*1.9)*.05,
     1.58+age*2.3*length,
     radius*1.18,radius*.87,Math.sin(t*.5+i)*.30);
   }else{
    // Eight recycled sprites form staggered, expanding bursts at the bristle tip.
    const j=i-BASE_WISPS,phase=state.coughPhase+(j%4)*.07+Math.floor(j/4)*.5;
    const age=fract(phase);
    const envelope=Math.sin(Math.PI*age);
    const radius=state.warning?
     (.24+.51*age)*envelope*(.68+.32*fatigue)*coughOnset*Math.max(.72,size)*visual.coughs/100:0;
    place(wisps.mesh,i,
     .10+Math.sin(j*2.7+age*7)*(.11+.28*age),
     .61+age*.32+Math.cos(j*3.1)*.065,
     1.60+age*(.58+.75*length),
     radius*1.16,radius*.93,Math.sin(j*2.5+age*5)*.65);
   }
  }
  wisps.mesh.instanceMatrix.needsUpdate=true;
  wisps.material.opacity=(.37+.19*fatigue)*visual.opacity/100;
  wisps.material.color.set(visual.smokeColor);
  // Slender magical airflow streaks replace the old thick persistent smoke.
  for(let i=0;i<STREAKS;i++){
   const age=fract((i+.4)/STREAKS+t*(.29+(i%3)*.034));
   const envelope=Math.sin(Math.PI*age);
   const fade=1-.74*fatigue;
   const w=.07*(.8+(i%3)*.2)*size*envelope*fade*visual.streaks/100;
   const h=(.54+age*.75)*length*envelope*fade*visual.streaks/100;
   place(streaks.mesh,i,
    -.08+Math.sin(i*2.4)*(.14+.17*age),
    .56+Math.cos(i*1.71)*.07+age*.11,
    1.59+age*2.1*length,
    w,h,Math.sin(i*1.9+t*.7)*.17,1.05);
  }
  streaks.mesh.instanceMatrix.needsUpdate=true;
  streaks.material.opacity=.67*(1-.38*fatigue)*visual.streaks/100;
  // Subtle airborne motes during flight; clustered, increasingly bright gold
  // sputters in the final three seconds, then an immediate safe stop.
  for(let i=0;i<SPARKS;i++){
   const burstAge=fract(state.coughPhase+(i%8)*.035+Math.floor(i/8)/3);
   const normalAge=fract(t*(.42+(i%3)*.09)+i*.237);
   const age=state.warning?burstAge:normalAge;
   const visible=state.warning||i<4;
   const life=Math.sin(Math.PI*age)*Math.pow(1-age,.65);
   const amount=visible?life*(state.warning?.62+.38*fatigue:.32):0;
   const spread=state.warning?(.18+1.06*age):(.09+.33*age);
   const w=(.09+(i%4)*.026)*size*amount;
   const h=w*(1.1+(i%3)*.36);
   place(sparks.mesh,i,
    .11+Math.sin(i*2.399)*spread,
    .61+Math.cos(i*2.1)*spread*.28+age*.15-age*age*.23,
    1.6+age*(state.warning?1.75:1.05),
    w,h,i*1.77+t*2);
  }
  sparks.mesh.instanceMatrix.needsUpdate=true;
  sparks.material.opacity=Math.min(1,
   (.31+.69*fatigue)*Math.sqrt(visual.sparks/100));
  headMaterial.opacity=.28+.21*fatigue+
   .12*fatigue*Math.max(0,Math.sin(state.coughPhase*Math.PI*2));
  head.scale.set(.51*size*(1+.20*fatigue),.42*size*(1+.20*fatigue),1);
  for(const b of [wisps,streaks,sparks])b.mesh.visible=true;
  head.visible=true;
 }
 return {update,hide};
}
