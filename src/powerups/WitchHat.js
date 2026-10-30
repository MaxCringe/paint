import * as THREE from 'three';

// Old, folded low-poly witch hat with a crooked tip, inspired by storybook hats.
// Geometry/materials are shared between the road pick-up and Fiona's worn hat.
export function createWitchHatFactory(scene,hats,runner) {
 const fabric=new THREE.MeshStandardMaterial({color:0x57402e,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const highlight=new THREE.MeshStandardMaterial({color:0x755339,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const seam=new THREE.MeshBasicMaterial({color:0xa7885e,side:THREE.DoubleSide});
 const band=new THREE.MeshStandardMaterial({color:0x30251d,roughness:1,flatShading:true,side:THREE.DoubleSide});
 const gold=new THREE.MeshStandardMaterial({color:0x97764b,metalness:.25,roughness:.6,side:THREE.DoubleSide});
 const brimGeo=new THREE.BufferGeometry();
 const positions=[],shade=[],indices=[];
 const segments=24, rInner=.28;
 for(let j=0;j<=segments;j++){
  const a=j/segments*Math.PI*2;
  const irregular=1+.105*Math.sin(3*a+.8)+.085*Math.cos(5*a-.4);
  const rOuter=.79*irregular;
  const tilt=.035*Math.sin(a*2.8)+.10*Math.sin(a+1.1);
  for(const [r,y] of [[rInner,.12],[rOuter,tilt]]){
   positions.push(Math.cos(a)*r,y,Math.sin(a)*r*.88);
  }
 }
 for(let j=0;j<segments;j++){
  const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);
 }
 brimGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 brimGeo.setIndex(indices);brimGeo.computeVertexNormals();
 const crownGeo=new THREE.BufferGeometry();
 const verts=[],faces=[];
 const rings=[
  {y:.08,r:.37,x:0,z:0},
  {y:.27,r:.36,x:-.03,z:0},
  {y:.43,r:.33,x:.02,z:.025},
  {y:.64,r:.275,x:-.07,z:0},
  {y:.86,r:.23,x:-.07,z:-.065},
  {y:1.08,r:.17,x:-.01,z:-.11},
  {y:1.23,r:.11,x:.15,z:-.18},
  {y:1.31,r:.055,x:.31,z:-.22}
 ];
 const sides=12;
 for(let i=0;i<rings.length;i++){
  const r=rings[i];
  for(let j=0;j<sides;j++){
   const a=j/sides*Math.PI*2;
   const wrinkle=1+Math.sin(a*4+i*2.1)*.065+Math.cos(a*3-i*.9)*.055;
   verts.push(r.x+Math.cos(a)*r.r*wrinkle,r.y+Math.sin(a*2+i)*.016,r.z+Math.sin(a)*r.r*wrinkle);
  }
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
  const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;
  faces.push(a,b,c,b,d,c);
 }
 crownGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 crownGeo.setIndex(faces);crownGeo.computeVertexNormals();
 const stripeGeo=new THREE.TorusGeometry(.35,.027,5,20);
 const patchGeo=new THREE.PlaneGeometry(.23,.21);
 const stitchGeo=new THREE.BoxGeometry(.035,.012,.014);
 const buckleGeo=new THREE.BoxGeometry(.12,.105,.02);
 const buckleHoleGeo=new THREE.BoxGeometry(.060,.050,.024);
 // A single shared soft violet glow texture keeps rare road pick-ups lightweight.
 // The worn hat on Fiona never receives this effect.
 const glowCanvas=document.createElement('canvas');
 glowCanvas.width=glowCanvas.height=64;
 const glowCtx=glowCanvas.getContext('2d');
 const glowGradient=glowCtx.createRadialGradient(32,32,1,32,32,32);
 glowGradient.addColorStop(0,'rgba(255,255,255,.58)');
 glowGradient.addColorStop(.30,'rgba(255,255,255,.32)');
 glowGradient.addColorStop(.65,'rgba(255,255,255,.11)');
 glowGradient.addColorStop(1,'rgba(255,255,255,0)');
 glowCtx.fillStyle=glowGradient;
 glowCtx.fillRect(0,0,64,64);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);
 const glowMat=new THREE.SpriteMaterial({
  map:glowTexture,color:0xb59ae5,transparent:true,opacity:.8,
  depthWrite:false,blending:THREE.AdditiveBlending
 });
 const glowingBrimGeo=new THREE.TorusGeometry(.79,.023,6,32);
 const glowingBrimMat=new THREE.MeshBasicMaterial({
  color:0xb59ae5,transparent:true,opacity:.65,
  depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
 });
 function mesh(parent,geo,material,x=0,y=0,z=0){
  const part=new THREE.Mesh(geo,material);part.position.set(x,y,z);parent.add(part);return part;
 }
 function model(){
  const group=new THREE.Group();
  const brim=mesh(group,brimGeo,fabric);
  brim.rotation.z=.035;
  mesh(group,crownGeo,fabric);
  const hatBand=mesh(group,stripeGeo,band,0,.21,0);
  hatBand.rotation.x=Math.PI/2;
  mesh(group,buckleGeo,gold,0,.22,.365);
  mesh(group,buckleHoleGeo,band,0,.22,.384);
  const patch=mesh(group,patchGeo,highlight,-.228,.50,.23);
  patch.rotation.set(-.12,-.62,-.20);
  for(let i=0;i<4;i++){
   const st=mesh(group,stitchGeo,seam,-.31+i*.025,.48+i*.036,.255);
   st.rotation.z=i%2?.65:-.5;
  }
  group.userData.brim=brim;
  return group;
 }
 const wearable=model();
 wearable.position.set(0,2.46,0);
 wearable.scale.setScalar(.66);
 wearable.visible=false;
 runner.add(wearable);
 function makeHat(lane,z){
  const g=new THREE.Group();
  g.position.set((lane-1)*2.55,0,z);
  scene.add(g);
  const visual=model();
  visual.position.y=.71;
  const glow=new THREE.Sprite(glowMat);
  glow.position.set(0,.67,-.18);
  glow.scale.set(2.75,2.55,1);
  visual.add(glow);
  const glowingBrim=new THREE.Mesh(glowingBrimGeo,glowingBrimMat);
  glowingBrim.rotation.x=Math.PI/2;
  glowingBrim.position.y=.045;
  visual.add(glowingBrim);
  g.add(visual);
  hats.push({g,visual,glow,glowingBrim,lane,z,phase:Math.random()*Math.PI*2,passed:false,collected:false});
 }
 function animateHat(h,t){
  h.visual.position.y=.74+Math.sin(t*.003+h.phase)*.10;
  h.visual.rotation.y=t*.0018+h.phase;
  h.visual.rotation.z=Math.sin(t*.002+h.phase)*.065;
  const pulse=Math.sin(t*.004+h.phase);
  h.glow.scale.set(2.75*(1+pulse*.065),2.55*(1+pulse*.065),1);
  h.glowingBrim.scale.setScalar(1+pulse*.025);
 }
 function animateWearable(t,active){
  wearable.visible=active;
  if(active)wearable.rotation.z=Math.sin(t*.004)*.035;
 }
 return {makeHat,animateHat,animateWearable};
}
