import * as THREE from 'three';

// The broom leaves a visible smoky plume. In the last three seconds the smoke
// chokes into gaps and the last magic escapes as short, dying sparks.
// Deliberately use standard Three.js materials rather than fragile custom
// shaders: two batched InstancedMeshes, shared textures and no per-frame meshes.
export function broomTrailState(remaining){
 const time=Math.max(0,Number.isFinite(remaining)?remaining:0);
 const active=time>0;
 const warning=active&&time<=3;
 const fraction=Math.min(1,time/3);
 return {
  active,
  warning,
  length:warning?.18+.82*fraction:1,
  strength:warning?.25+.75*fraction:1,
  instability:warning?1-fraction:0
 };
}

// Build smoke using several overlapping soft, irregular tufts. Transparent
// borders are fully clear, with no square card or sharp particle outline.
function makeSmokeTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');
 for(let i=0;i<9;i++){
  const angle=i*2.39996;
  const x=64+Math.cos(angle)*(i%3===0?16:23);
  const y=64+Math.sin(angle)*(i%3===0?13:21);
  const radius=27+(i%4)*5;
  const gradient=ctx.createRadialGradient(x,y,1,x,y,radius);
  gradient.addColorStop(0,'rgba(246,239,255,.38)');
  gradient.addColorStop(.33,'rgba(213,194,255,.29)');
  gradient.addColorStop(.68,'rgba(146,117,198,.10)');
  gradient.addColorStop(1,'rgba(146,117,198,0)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,128,128);
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
function makeSparkTexture(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(32,32,1,32,32,31);
 gradient.addColorStop(0,'rgba(255,255,255,1)');
 gradient.addColorStop(.20,'rgba(245,229,255,.94)');
 gradient.addColorStop(.45,'rgba(184,146,255,.52)');
 gradient.addColorStop(1,'rgba(184,146,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

export function createBroomTrail(runner,glowTexture){
 const SMOKE_COUNT=32,SPARK_COUNT=24;
 const plane=new THREE.PlaneGeometry(1,1);
 const smokeMaterial=new THREE.MeshBasicMaterial({
  map:makeSmokeTexture(),side:THREE.DoubleSide,
  transparent:true,opacity:.92,depthWrite:false,depthTest:false,
  blending:THREE.NormalBlending,toneMapped:false
 });
 const smoke=new THREE.InstancedMesh(plane,smokeMaterial,SMOKE_COUNT);
 smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 smoke.frustumCulled=false;
 smoke.renderOrder=3;
 smoke.visible=false;
 runner.add(smoke);

 const sparkMaterial=new THREE.MeshBasicMaterial({
  map:makeSparkTexture(),side:THREE.DoubleSide,
  transparent:true,opacity:.95,depthWrite:false,depthTest:false,
  blending:THREE.AdditiveBlending,toneMapped:false
 });
 const sparks=new THREE.InstancedMesh(plane,sparkMaterial,SPARK_COUNT);
 sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 sparks.frustumCulled=false;
 sparks.renderOrder=4;
 sparks.visible=false;
 runner.add(sparks);
 const dummy=new THREE.Object3D();
 const smokeColors=[0xece5ff,0xc7b3f3,0xab96e5,0xdcd5f9];
 const sparkColors=[0xffffff,0xd9c6ff,0xb79bff];
 for(let i=0;i<SMOKE_COUNT;i++)smoke.setColorAt(i,new THREE.Color(smokeColors[i%4]));
 for(let i=0;i<SPARK_COUNT;i++)sparks.setColorAt(i,new THREE.Color(sparkColors[i%3]));
 smoke.instanceColor.needsUpdate=true;
 sparks.instanceColor.needsUpdate=true;

 const headMaterial=new THREE.SpriteMaterial({
  map:glowTexture,color:0xe6cfff,transparent:true,opacity:.85,
  depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
  toneMapped:false
 });
 const headGlow=new THREE.Sprite(headMaterial);
 headGlow.position.set(0,.67,1.53);
 headGlow.scale.set(1.6,1.4,1);
 headGlow.visible=false;
 runner.add(headGlow);

 // Facing the behind-the-runner camera, with gently tumbling wisps.
 function orient(time,twist=0){
  dummy.rotation.set(-.46,0,twist);
 }
 function update(remaining,timeMs){
  const state=broomTrailState(remaining);
  smoke.visible=state.active;
  sparks.visible=state.warning;
  headGlow.visible=state.active;
  if(!state.active)return;
  const t=timeMs*.001,inst=state.instability;
  // The stream begins at the broom's straw tip (local +Z), then lifts off
  // over the road rather than vanishing below the camera's lower edge.
  for(let i=0;i<SMOKE_COUNT;i++){
   const seed=(i+.5)/SMOKE_COUNT;
   const age=(seed+t*.23)%1;
   const phase=i*2.37+t*.74;
   const density=(1-Math.pow(age,1.45));
   const fade=(Math.min(1,age*8))*(Math.min(1,(1-age)*4));
   // A dying broom coughs in separate puffs, leaving increasingly wide gaps.
   const choking=state.warning&&Math.sin(i*2.8+t*(8+inst*6))>.20;
   const gapFactor=choking?1-inst*.98:1;
   const radius=(.60+age*.85)*( .85+.17*Math.sin(i*3.1) )
               *state.strength*Math.max(.08,gapFactor)*Math.max(.13,fade);
   dummy.position.set(
    Math.sin(phase+age*7)*(.11+age*.43),
    .76+age*.64+Math.sin(phase*.8)*.07,
    1.55+age*3.15*state.length
   );
   orient(t,Math.sin(t*.48+i*1.13)*.19);
   dummy.scale.set(radius*1.36,radius*1.03,1);
   dummy.updateMatrix();
   smoke.setMatrixAt(i,dummy.matrix);
  }
  smoke.instanceMatrix.needsUpdate=true;
  smokeMaterial.opacity=.95*Math.max(.27,state.strength);

  if(state.warning){
   const effort=Math.min(1,inst*2.2);
   const gasp=1-.84*Math.max(0,(inst-.66)/.34);
   sparkMaterial.opacity=Math.max(.08,effort*gasp);
   for(let i=0;i<SPARK_COUNT;i++){
    const seed=(i+.25)/SPARK_COUNT;
    const age=(t*(1.0+(i%5)*.21)+seed*17.3)%1;
    const phase=i*2.43+t*1.6;
    const stutter=Math.max(0,Math.sin(t*(13+(i%3)*3)+i*3.1));
    const life=Math.pow(1-age,1.8);
    const size=(.14+.17*(i%3)/2)*life*(.27+.73*stutter)*effort;
    dummy.position.set(
     Math.sin(phase)*(.20+.55*age),
     .76+age*.62+Math.cos(phase*1.3)*.21,
     1.55+age*(1.8+1.2*state.length)
    );
    orient(t,i*.38+t*.5);
    dummy.scale.setScalar(Math.max(.0001,size));
    dummy.updateMatrix();
    sparks.setMatrixAt(i,dummy.matrix);
   }
   sparks.instanceMatrix.needsUpdate=true;
  }
  const cough=state.warning?1-inst*(.13+.20*(.5+.5*Math.sin(t*12))):1;
  headMaterial.opacity=.87*state.strength*cough;
  const scale=1.55*Math.max(.28,state.length);
  headGlow.scale.set(scale,scale*.84,1);
 }
 function hide(){
  smoke.visible=false;
  sparks.visible=false;
  headGlow.visible=false;
 }
 return {update,hide};
}
