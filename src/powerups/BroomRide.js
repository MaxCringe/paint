import * as THREE from 'three';

// Independent, reversible power-up. Disable here to remove every broom spawn/effect.
export const BROOM_ENABLED = true;
export const BROOM_CONFIG = Object.freeze({
 duration: 9,
 pickupChance: .055,
 speedMultiplier: 1.20,       // Running = 1, broom = 1.20, ultimate = 1.35
 ultimateSpeedMultiplier: 1.35,
 hoverHeight: .77,            // Low above the road, unlike the high ultimate
 pickupColor: 0xe9b76b
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createBroomRide(scene, runner, {torso, armL, armR, legL, legR}) {
 if (!BROOM_ENABLED) return {
  spawn(){}, advancePickups(){}, tick(){}, applyPose(){},
  reset(){}, cancel(){}, immuneTo(){return false;},
  get active(){return false;}, get remaining(){return 0;},
  get hoverHeight(){return 0;}
 };

 const pickups = [];
 // Reuse all geometries/materials. One small sprite instead of any real lights.
 const wood = new THREE.MeshStandardMaterial({color:0x553522,roughness:.88});
 const gripMat = new THREE.MeshStandardMaterial({color:0x291a17,roughness:1});
 const bronze = new THREE.MeshStandardMaterial({color:0xb18b52,metalness:.42,roughness:.49});
 const bristleMat = new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:1,side:THREE.DoubleSide
 });
 const shaftGeo = new THREE.CylinderGeometry(.038,.052,2.15,8);
 const bindingGeo = new THREE.CylinderGeometry(.088,.088,.15,10);
 const gripGeo = new THREE.CylinderGeometry(.047,.047,.20,8);
 const capGeo = new THREE.SphereGeometry(.055,8,6);
 const bristlePositions = [], bristleColors = [];
 const shades = [0x9c754a,0xba955f,0x80603f,0xc2a073];
 for(let i=0;i<18;i++){
  const a = i/18*Math.PI*2, rad = .055+(i%3)*.015;
  const tipR = .13+(i%4)*.023;
  const base = [Math.cos(a)*rad,Math.sin(a)*rad,.76+(i%3)*.03];
  const tip = [Math.cos(a)*tipR,Math.sin(a)*tipR,1.39+(i%5)*.065];
  const next = [Math.cos(a+.13)*(rad+.03),Math.sin(a+.13)*(rad+.03),.82];
  for(const v of [base,tip,next]) bristlePositions.push(...v);
  const color = new THREE.Color(shades[i%shades.length]);
  for(let j=0;j<3;j++) bristleColors.push(color.r,color.g,color.b);
 }
 const bristlesGeo = new THREE.BufferGeometry();
 bristlesGeo.setAttribute('position',new THREE.Float32BufferAttribute(bristlePositions,3));
 bristlesGeo.setAttribute('color',new THREE.Float32BufferAttribute(bristleColors,3));
 bristlesGeo.computeVertexNormals();

 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = 64;
 const ctx = canvas.getContext('2d');
 const gradient = ctx.createRadialGradient(32,32,1,32,32,32);
 gradient.addColorStop(0,'rgba(255,255,255,.60)');
 gradient.addColorStop(.32,'rgba(255,255,255,.32)');
 gradient.addColorStop(.72,'rgba(255,255,255,.09)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
 const glowTexture = new THREE.CanvasTexture(canvas);
 const glowMat = new THREE.SpriteMaterial({
  map:glowTexture,color:BROOM_CONFIG.pickupColor,
  transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending
 });
 function part(parent,geometry,material,x=0,y=0,z=0){
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=false; mesh.receiveShadow=false;
  parent.add(mesh);return mesh;
 }
 function model(){
  const group = new THREE.Group();
  part(group,shaftGeo,wood,0,0,-.05).rotation.x=Math.PI/2;
  part(group,bindingGeo,bronze,0,0,.75).rotation.x=Math.PI/2;
  part(group,gripGeo,gripMat,0,0,-1.05).rotation.x=Math.PI/2;
  part(group,capGeo,bronze,0,0,-1.18);
  part(group,bristlesGeo,bristleMat);
  return group;
 }

 const mounted = model();
 mounted.position.y=.37;mounted.visible=false;
 runner.add(mounted);
 let remaining=0,blend=0,time=0;

 function spawn(lane,z){
  const group = new THREE.Group();
  group.position.set((lane-1)*2.55,0,z);
  const visual=model();
  visual.position.y=.88;
  visual.rotation.y=.32;
  visual.scale.setScalar(.8);
  group.add(visual);
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(2.65,2.2,1);
  glow.position.set(0,1.04,.02);
  group.add(glow);scene.add(group);
  pickups.push({g:group,visual,glow,lane,phase:Math.random()*Math.PI*2,passed:false});
 }
 function activate(){
  remaining=BROOM_CONFIG.duration;
  blend=Math.max(blend,.08);
  mounted.visible=true;
 }
 function cancel(){
  remaining=0;blend=0;
  mounted.visible=false;torso.rotation.x=0;
 }
 function reset(){
  cancel();
  for(const p of pickups)scene.remove(p.g);
  pickups.length=0;
 }
 function tick(dt,t){
  time=t;
  remaining=Math.max(0,remaining-dt);
  blend=clamp(blend+(remaining>0?1:-1)*dt*4,0,1);
  mounted.visible=blend>.001;
  if(mounted.visible){
   mounted.position.y=.37+Math.sin(t*.0037)*.025;
   mounted.rotation.z=Math.sin(t*.0028)*.028;
   mounted.rotation.x=Math.sin(t*.0033)*.025;
   mounted.scale.setScalar(blend);
  }
 }
 function advancePickups(dt,t,speed,lane,runnerX,{canCollect=true,onCollect=()=>{}}={}){
  for(let i=pickups.length-1;i>=0;i--){
   const p=pickups[i];
   p.g.position.z+=speed*dt;
   if(!p.passed){
    p.visual.rotation.y=t*.0016+p.phase;
    p.visual.position.y=.88+Math.sin(t*.0035+p.phase)*.095;
    const swell=1+Math.sin(t*.004+p.phase)*.07;
    p.glow.scale.set(2.65*swell,2.2*swell,1);
    if(p.g.position.z>1.2){
     p.passed=true;
     if(canCollect&&p.lane===lane&&Math.abs(runnerX-(lane-1)*2.55)<1.05){
      activate();onCollect();
      scene.remove(p.g);pickups.splice(i,1);
      continue;
     }
    }
   }
   if(p.g.position.z>13){scene.remove(p.g);pickups.splice(i,1);}
  }
 }
 function applyPose(){
  if(blend<=0){torso.rotation.x=0;return;}
  // Blend from the running cycle to a low seated witch-riding pose.
  torso.rotation.x=.17*blend;
  armL.rotation.x+=(1.13-armL.rotation.x)*blend;
  armR.rotation.x+=(1.13-armR.rotation.x)*blend;
  legL.rotation.x+=(1.23-legL.rotation.x)*blend;
  legR.rotation.x+=(1.23-legR.rotation.x)*blend;
 }
 function immuneTo(type){
  // Flying low still requires dodging pine trunks.
  return remaining>0&&(type==='pee'||type==='fish'||type==='lava');
 }
 return {
  spawn,advancePickups,tick,applyPose,reset,cancel,immuneTo,
  get active(){return remaining>0;},
  get remaining(){return remaining;},
  get hoverHeight(){
   return BROOM_CONFIG.hoverHeight*blend+
    (remaining>0?Math.sin(time*.003)*.045*blend:0);
  }
 };
}
