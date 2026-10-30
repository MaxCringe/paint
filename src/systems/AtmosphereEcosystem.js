import * as THREE from 'three';

// Atmospheric depth and drifting air. One toggle disables the entire effect.
// No post-processing, shadows, collisions or changes to the runner.
export const ATMOSPHERE_ENABLED = true;

// Central tuning points: low contrast on purpose, so obstacles stay readable.
const SETTINGS={
 fogColor:0x482631,
 fogNear:10,
 fogFar:72,
 groundOpacity:.16,
 treeOpacity:.20,
 ashOpacity:.24
};
export function createAtmosphereEcosystem(scene,{
 enabled=ATMOSPHERE_ENABLED,
 mobile=typeof window!=='undefined'&&window.innerWidth<720
}={}){
 if(!enabled)return {update(){},reset(){},dispose(){}};
 const previousFog=scene.fog;
 scene.fog=new THREE.Fog(SETTINGS.fogColor,SETTINGS.fogNear,SETTINGS.fogFar);
 const random=(min,max)=>min+Math.random()*(max-min);
 // A single soft alpha texture shared by mist, low hanging haze, and ash.
 const canvas=document.createElement('canvas');
 canvas.width=96;canvas.height=96;
 const context=canvas.getContext('2d');
 const gradient=context.createRadialGradient(48,48,2,48,48,47);
 gradient.addColorStop(0,'rgba(255,255,255,.56)');
 gradient.addColorStop(.25,'rgba(255,255,255,.47)');
 gradient.addColorStop(.58,'rgba(255,255,255,.21)');
 gradient.addColorStop(.82,'rgba(255,255,255,.06)');
 gradient.addColorStop(1,'rgba(255,255,255,0)');
 context.fillStyle=gradient;
 context.fillRect(0,0,96,96);
 const softTexture=new THREE.CanvasTexture(canvas);
 softTexture.colorSpace=THREE.SRGBColorSpace;
 
 // Ground-level swirls: one instanced draw rather than one mesh per patch.
 // They are especially faint over the pine boards, softening harsh texture edges.
 const cells=[
  {x:-7,z:-18,w:13,d:16},{x:7,z:-30,w:13,d:17},
  {x:0,z:-39,w:8,d:15},{x:-8,z:-50,w:15,d:18},
  {x:8,z:-63,w:15,d:18},{x:0,z:-76,w:10,d:19},
  {x:-7,z:-91,w:14,d:18},{x:7,z:-105,w:14,d:18}
 ].slice(0,mobile?5:8).map((o,i)=>({...o,homeZ:o.z,phase:i*1.37}));
 const groundGeometry=new THREE.PlaneGeometry(1,1);
 const groundMaterial=new THREE.MeshBasicMaterial({
  map:softTexture,color:0xa28278,transparent:true,
  opacity:SETTINGS.groundOpacity,depthWrite:false,
  side:THREE.DoubleSide,fog:false,polygonOffset:true,polygonOffsetFactor:-1
 });
 const ground=new THREE.InstancedMesh(groundGeometry,groundMaterial,cells.length);
 ground.frustumCulled=false;
 ground.castShadow=false;ground.receiveShadow=false;
 scene.add(ground);
 const matrix=new THREE.Matrix4();
 const quaternion=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 const scale=new THREE.Vector3();
 const position=new THREE.Vector3();
 function positionGround(time){
  for(let i=0;i<cells.length;i++){
   const cell=cells[i];
   position.set(cell.x+Math.sin(time*.28+cell.phase)*.28,.065,cell.z);
   scale.set(cell.w,cell.d,1);
   matrix.compose(position,quaternion,scale);
   ground.setMatrixAt(i,matrix);
  }
  ground.instanceMatrix.needsUpdate=true;
 }
 
 // Thin suspended pockets between trees. No enormous screen-wide fog plane.
 const treeMaterial=new THREE.SpriteMaterial({
  map:softTexture,color:0x95797b,transparent:true,
  opacity:SETTINGS.treeOpacity,depthWrite:false,depthTest:true,fog:false
 });
 const layers=(mobile?[
  [-8,-30,11,2.9],[8,-53,12,3.3]
 ]:[
  [-8,-25,13,3.3],[8,-42,12,3.4],
  [-9,-62,16,4.0],[9,-79,17,4.2]
 ]).map(([x,z,width,height],i)=>{
  const sprite=new THREE.Sprite(treeMaterial);
  sprite.position.set(x,1.25+i*.15,z);
  sprite.scale.set(width,height,1);
  scene.add(sprite);
  return {sprite,x,z,initialZ:z,phase:i*1.47};
 });
 
 // One Points draw call for a little soot/ash floating through the hellish air.
 const count=mobile?24:48;
 const points=new Float32Array(count*3);
 const ash=[];
 for(let i=0;i<count;i++){
  const x=random(-11,11),y=random(.65,5.2),z=random(-62,-7);
  ash.push({x,y,z,phase:random(0,Math.PI*2),speed:random(.12,.28)});
  points[i*3]=x;points[i*3+1]=y;points[i*3+2]=z;
 }
 const ashGeometry=new THREE.BufferGeometry();
 ashGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
 const ashMaterial=new THREE.PointsMaterial({
  color:0xd9b4a0,map:softTexture,size:mobile?.27:.22,
  sizeAttenuation:true,transparent:true,opacity:SETTINGS.ashOpacity,
  depthWrite:false,fog:false
 });
 const ashMesh=new THREE.Points(ashGeometry,ashMaterial);
 ashMesh.frustumCulled=false;
 scene.add(ashMesh);
 let time=0;
 function update(dt,{playing=false,speed=0}={}){
  if(!playing||dt<=0)return;
  dt=Math.min(dt,.04);
  time+=dt;
  // Mist scrolls with the scenery while gently wafting sideways.
  for(const cell of cells){
   cell.z+=speed*dt;
   if(cell.z>17)cell.z-=112;
  }
  positionGround(time);
  for(const layer of layers){
   layer.z+=speed*dt;
   if(layer.z>15)layer.z-=111;
   layer.sprite.position.set(layer.x+Math.sin(time*.17+layer.phase)*.48,
    1.28+Math.sin(time*.23+layer.phase)*.10,layer.z);
  }
  // Ash drifts much more slowly than the ground, conveying moving air.
  for(let i=0;i<ash.length;i++){
   const a=ash[i];
   a.z+=(speed*.35+a.speed)*dt;
   a.y+=dt*.085;
   if(a.z>9){a.z=random(-67,-46);a.y=random(.6,4.3);a.x=random(-11,11)}
   if(a.y>5.8)a.y=.55;
   const k=i*3;
   points[k]=a.x+Math.sin(time*.65+a.phase)*.20;
   points[k+1]=a.y;
   points[k+2]=a.z;
  }
  ashGeometry.attributes.position.needsUpdate=true;
 }
 function reset(){
  time=0;
  for(const c of cells)c.z=c.homeZ;
  for(const l of layers)l.z=l.initialZ;
  positionGround(0);
  for(const l of layers)l.sprite.position.set(l.x,1.3,l.z);
 }
 positionGround(0);
 function dispose(){
  ground.parent?.remove(ground);
  for(const l of layers)l.sprite.parent?.remove(l.sprite);
  ashMesh.parent?.remove(ashMesh);
  groundGeometry.dispose();groundMaterial.dispose();
  treeMaterial.dispose();ashGeometry.dispose();ashMaterial.dispose();
  softTexture.dispose();
  if(scene.fog!==previousFog)scene.fog=previousFog;
 }
 return {update,reset,dispose};
}
