import * as THREE from 'three';
import { buildFernGeometry } from './world/buildFernGeometry.js';
import { buildSoulFlameGeometry } from './souls/buildSoulFlameGeometry.js';
import { animateSoulFlame } from './souls/animateSoulFlame.js';
import { SOULS_PER_ULT, ULT_DURATION } from './config.js';
import { createLavaRiverFactory } from './obstacles/LavaRiver.js';
import { createSegmentGenerator } from './systems/ObstacleManager.js';
import { createFiona } from './player/Fiona.js';
import { createSoulFactory } from './souls/createSoulFactory.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b050b);
scene.fog = new THREE.Fog(0x3b101b, 14, 68);
const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, .1, 180);
camera.position.set(0,5.3,10.5);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.2)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xff8b76,0x120308,1.45));
const sun=new THREE.DirectionalLight(0xff3927,2.8); sun.position.set(-8,35,8); sun.target.position.set(0,0,-12); scene.add(sun.target); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-18; sun.shadow.camera.right=18; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55; sun.shadow.camera.near=.1; sun.shadow.camera.far=160; sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias=-0.00012; sun.shadow.normalBias=.025; sun.shadow.radius=2; scene.add(sun);
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const grassMat=mat(0x3d8b4d), roadMat=mat(0xffffff), edgeMat=mat(0xc8a66b), stoneMat=mat(0x807e69), darkStone=mat(0x454c40), leafMats=[mat(0x173b2a),mat(0x204832),mat(0x28513a),mat(0x142f24)], goldMat=mat(0xff4b36,.3,.2), trunkMat=mat(0x68472d);
const pineFloorTexture=new THREE.TextureLoader().load('https://raw.githubusercontent.com/MaxCringe/paint/main/pictures/KNOTTY%20PINE/TEXTURE/knotty%20pine_1.jpg',()=>{renderer.render(scene,camera)});
pineFloorTexture.colorSpace=THREE.SRGBColorSpace;
pineFloorTexture.wrapS=THREE.RepeatWrapping; pineFloorTexture.wrapT=THREE.RepeatWrapping;
pineFloorTexture.repeat.set(1.8,15); pineFloorTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
roadMat.map=pineFloorTexture; roadMat.needsUpdate=true;
// Layered jagged mountain ranges across the horizon, with a lava volcano far to the right.
const mountainFarMat=new THREE.MeshBasicMaterial({color:0x241019,side:THREE.DoubleSide,fog:false});
const mountainMidMat=new THREE.MeshBasicMaterial({color:0x3b111c,side:THREE.DoubleSide,fog:false});
const mountainNearMat=new THREE.MeshBasicMaterial({color:0x581722,side:THREE.DoubleSide,fog:false});
const volcanoRockMat=new THREE.MeshBasicMaterial({color:0x211016,side:THREE.DoubleSide,fog:false});
const volcanoShadowMat=new THREE.MeshBasicMaterial({color:0x10080d,side:THREE.DoubleSide,fog:false});
const lavaMat=new THREE.MeshBasicMaterial({color:0xff3b08,side:THREE.DoubleSide,fog:false});
const lavaGlowMat=new THREE.MeshBasicMaterial({color:0xffa323,side:THREE.DoubleSide,fog:false});
function horizonShape(points,z,material,x=0){
 const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
 shape.lineTo(points[points.length-1][0],-6);shape.lineTo(points[0][0],-6);shape.closePath();
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);
 mesh.position.set(x,-1,z);mesh.renderOrder=-2;scene.add(mesh);return mesh;
}
horizonShape([[-105,0],[-92,7],[-82,4],[-69,12],[-57,6],[-45,15],[-31,8],[-18,12],[-5,5],[9,13],[22,7],[36,16],[48,9],[61,14],[73,6],[87,11],[99,4],[108,0]],-91,mountainFarMat);
horizonShape([[-105,0],[-91,4],[-79,3],[-67,9],[-54,4],[-41,11],[-29,5],[-15,9],[-2,4],[12,10],[26,5],[39,12],[52,6],[66,10],[79,4],[94,8],[108,0]],-84,mountainMidMat);
horizonShape([[-105,0],[-89,3],[-76,2],[-62,7],[-49,3],[-35,8],[-21,3],[-7,6],[8,2],[22,7],[37,3],[51,8],[65,3],[80,6],[94,2],[108,0]],-77,mountainNearMat);
// Detailed volcano on the far-right skyline. Keep all three mountain ranges untouched.
horizonShape([[-18,0],[-15,4],[-12,9],[-9,15],[-6,21],[-3,25],[-1,22],[2,21],[5,24],[8,19],[11,13],[14,7],[18,0]],-73,volcanoRockMat,30);
// Dark fractured face and a deep, uneven crater opening.
horizonShape([[-9,14],[-6,20],[-3,24],[-1,21],[1,19],[4,21],[7,17],[10,12],[6,15],[3,16],[0,15],[-3,17],[-6,15]],-72.8,volcanoShadowMat,30);
horizonShape([[-1.5,21.5],[-.2,20.5],[1.2,20.2],[3.5,21.5],[2.2,19.6],[.5,19.2],[-1.5,20]],-72.6,lavaGlowMat,30);
// Main molten river, branching down the front of the volcano.
horizonShape([[-2,19.4],[-.8,18.8],[-1.8,16],[-.9,13],[-2.1,10],[-1.1,7],[-2.4,4],[-1.8,1],[-2.8,-.1],[-5,-.1],[-3.8,2],[-4.2,5],[-3,8],[-3.8,11],[-2.7,14],[-3.4,17]],-72.4,lavaMat,30);
horizonShape([[3.2,19.4],[4.3,18.6],[3.8,16],[5.1,13],[4.4,10],[6,7],[5.2,4],[6.4,1],[7.5,-.1],[5.3,-.1],[4.5,2],[4.9,5],[3.5,8],[4.2,11],[2.9,14],[3.5,17]],-72.35,lavaMat,30);
horizonShape([[-8,14],[-7,13],[-6.4,10],[-7.3,8],[-6.5,6],[-7.5,3],[-7,1],[-8,-.1],[-9.4,-.1],[-8.7,2],[-9,5],[-8.1,8],[-8.8,11]],-72.3,lavaMat,30);
// Hot yellow-orange cores make the lava read as glowing molten rock, not painted stripes.
horizonShape([[-2.8,17],[-2.1,14],[-2.8,11],[-1.9,8],[-3,5],[-2.5,2],[-3.4,.1],[-3.9,.1],[-3.2,2],[-3.7,5],[-2.7,8],[-3.5,11],[-2.7,14]],-72.2,lavaGlowMat,30);
horizonShape([[3.8,17],[4.3,14],[3.8,11],[5,8],[4.5,5],[5.6,2],[6.2,.1],[5.7,.1],[5,2],[4.9,5],[4.3,8],[4.5,11],[3.4,14]],-72.15,lavaGlowMat,30);
// A small glowing lava fan at the foot of the mountain.
horizonShape([[-5,-.1],[-3.8,1],[-2,1.3],[0,.7],[2,1.4],[4,.8],[6.5,1],[8,-.1]],-72.1,lavaMat,30);
// Animated molten rivulets visibly travel from the crater toward the foot of the volcano.
const movingLava=[];
const lavaDropGeo=new THREE.SphereGeometry(1,8,6);
function addLavaStream(xStart,xEnd,count,phase){
 for(let i=0;i<count;i++){
  const material=new THREE.MeshBasicMaterial({color:i%3===0?0xffc04a:0xff5a0a});
  const drop=new THREE.Mesh(lavaDropGeo,material);
  drop.scale.set(.08+Math.random()*.04,.22+Math.random()*.18,.035);
  scene.add(drop);
  movingLava.push({mesh:drop,xStart,xEnd,phase:phase+i/count});
 }
}
addLavaStream(27.2,27.7,7,0);
addLavaStream(33.2,34.1,7,.23);
addLavaStream(22.8,23.6,5,.51);

const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,220),grassMat); floor.rotation.x=-Math.PI/2; floor.position.set(0,-.12,-65); floor.receiveShadow=true; scene.add(floor);
const road=new THREE.Mesh(new THREE.PlaneGeometry(8.7,220),roadMat); road.rotation.x=-Math.PI/2; road.position.set(0,-.07,-65); road.receiveShadow=true; scene.add(road);
for(let x of [-4.45,4.45]){const e=new THREE.Mesh(new THREE.BoxGeometry(.22,.08,220),edgeMat);e.position.set(x,-.06,-65);e.receiveShadow=true;scene.add(e)}
// Decorative temple arches in the distance and along the trail
const fixedDecor=[];
function box(w,h,d,material,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
// Reuse tree geometry across the whole forest and keep foliage out of the expensive shadow pass.
const treeTrunkGeometry=new THREE.BoxGeometry(.38,2.5,.38);
const treeConeGeometries=[new THREE.ConeGeometry(1.15,1.8,5),new THREE.ConeGeometry(.98,1.8,5),new THREE.ConeGeometry(.81,1.8,5)];
function tree(x,z,scale=1,recycleLength=180){
 const g=new THREE.Group();g.position.set(x,0,z);
 // Each pine gets its own silhouette: different height, crown width and irregular branch tiers.
 g.scale.set(scale*(.84+Math.random()*.30),scale*(.76+Math.random()*.48),scale*(.84+Math.random()*.30));
 g.userData.recycleLength=recycleLength;scene.add(g);
 const trunk=new THREE.Mesh(treeTrunkGeometry,trunkMat);
 trunk.position.set((Math.random()-.5)*.09,1.15,0);
 trunk.rotation.z=(Math.random()-.5)*.035;
 trunk.castShadow=false;g.add(trunk);
 for(let i=0;i<3;i++){
  const cone=new THREE.Mesh(treeConeGeometries[i],leafMats[(Math.random()*leafMats.length)|0]);
  cone.position.set((Math.random()-.5)*.12,2.05+i*.69+(Math.random()-.5)*.16,(Math.random()-.5)*.08);
  const width=.78+Math.random()*.40;
  cone.scale.set(width,.86+Math.random()*.28,width);
  cone.rotation.y=(Math.random()-.5)*.42;
  cone.castShadow=false;g.add(cone);
 }
 return g
}
const roadsideVegetation=[];
// Build an entire fern clump as one lightweight mesh with separate pointed leaflets.
const fernGeometry=buildFernGeometry();
const fernMaterial=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.92});
function randomFernScale(){
 const roll=Math.random();
 if(roll<.27)return .36+Math.random()*.30; // little young fern
 if(roll<.79)return .68+Math.random()*.48; // ordinary fern
 return 1.18+Math.random()*.55; // large mature fern
}
function fern(x,z,scale=1,recycleLength=174){
 const g=new THREE.Group();
 g.position.set(x,-.095,z);
 g.rotation.y=Math.random()*Math.PI*2;
 g.scale.set(scale*(.88+Math.random()*.22),scale,scale*(.88+Math.random()*.22));
 g.userData.recycleLength=recycleLength;
 const leaves=new THREE.Mesh(fernGeometry,fernMaterial);
 leaves.castShadow=false;leaves.receiveShadow=true;g.add(leaves);scene.add(g);
 return g;
}
// Low wild grass: many small blade meshes are combined into one geometry per tuft.
function buildGrassGeometry(){
 const positions=[],colors=[];
 const palette=[0x326b32,0x548d3b,0x70984a,0x3e7d36,0x87a957,0x2c5b2d];
 function addTriangle(a,b,c,color){
  const col=new THREE.Color(color);
  for(const p of [a,b,c]){positions.push(p[0],p[1],p[2]);colors.push(col.r,col.g,col.b)}
 }
 for(let i=0;i<24;i++){
  const angle=i*2.399963+Math.random()*.25;
  const radius=.035+Math.random()*.18;
  const h=.14+Math.random()*.21;
  const width=.018+Math.random()*.018;
  const bx=Math.cos(angle)*radius,bz=Math.sin(angle)*radius;
  const lean=(Math.random()-.5)*.16;
  const tx=bx+Math.cos(angle+.55)*lean,tz=bz+Math.sin(angle+.55)*lean;
  const sideX=-Math.sin(angle)*width,sideZ=Math.cos(angle)*width;
  const color=palette[(Math.random()*palette.length)|0];
  addTriangle([bx-sideX,0,bz-sideZ],[bx+sideX,0,bz+sideZ],[tx,h,tz],color);
  // A second slim blade crosses the first, so the tuft reads as wild grass from multiple angles.
  const crossX=Math.cos(angle+1.2)*width*.55,crossZ=Math.sin(angle+1.2)*width*.55;
  addTriangle([bx-crossX,0,bz-crossZ],[bx+crossX,0,bz+crossZ],[tx+Math.cos(angle+1.2)*width*.8,h*.82,tz+Math.sin(angle+1.2)*width*.8],palette[(i+2)%palette.length]);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();return geo;
}
const grassGeometry=buildGrassGeometry();
const grassTuftMaterial=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1});
function grassTuft(x,z,scale=1,recycleLength=174){
 const g=new THREE.Group();g.position.set(x,-.105,z);
 g.rotation.y=Math.random()*Math.PI*2;
 g.scale.set(scale*(.8+Math.random()*.4),scale,scale*(.8+Math.random()*.4));
 g.userData.recycleLength=recycleLength;
 const blades=new THREE.Mesh(grassGeometry,grassTuftMaterial);
 blades.castShadow=false;blades.receiveShadow=true;g.add(blades);scene.add(g);return g;
}
// Pines are staggered with natural gaps instead of forming a continuous wall.
const roadsideSpacing=4.0, roadsideCount=39;
const roadsideLoop=(roadsideCount-1)*roadsideSpacing+16;
for(let i=0;i<roadsideCount;i++){
 const z=-i*roadsideSpacing-4+(Math.random()-.5)*1.35;
 const nearScale=.66+Math.random()*.82;
 roadsideVegetation.push(tree(-4.95-Math.random()*1.35,z,nearScale,roadsideLoop));
 roadsideVegetation.push(tree(4.95+Math.random()*1.35,z+(Math.random()-.5)*.9,.84+Math.random()*.4,roadsideLoop));
 // A more distant, staggered pine appears only every other position.
 if(i%2===0){
  const backZ=z-2.25+(Math.random()-.5)*1.7;
  const backScale=.72+Math.random()*.92;
  roadsideVegetation.push(tree(-8.0-Math.random()*2.1,backZ,backScale,roadsideLoop));
  roadsideVegetation.push(tree(8.0+Math.random()*2.1,backZ+(Math.random()-.5)*1.1,.92+Math.random()*.42,roadsideLoop));
 }
}
// More distant tree rows have their own spacing and longer recycling loop.
const farSpacing=3.8,farCount=44,farForestLoop=(farCount-1)*farSpacing+21;
for(let i=0;i<farCount;i++){
 const z=-i*farSpacing-9+(Math.random()-.5)*1.5;
 const scale=.72+Math.random()*.96;
 roadsideVegetation.push(tree(-13-Math.random()*9,z,scale,farForestLoop));
 roadsideVegetation.push(tree(13+Math.random()*9,z+(Math.random()-.5)*1.4,.96+Math.random()*.5,farForestLoop));
 if(i%3===0){
  const outerZ=z-1.7+(Math.random()-.5)*1.5;
  roadsideVegetation.push(tree(-24-Math.random()*7,outerZ,.62+Math.random()*.82,farForestLoop));
  roadsideVegetation.push(tree(24+Math.random()*7,outerZ+(Math.random()-.5)*1.4,.62+Math.random()*.82,farForestLoop));
 }
}
// Ferns grow in loose clumps along both verges, filling the spaces below and between the pines.
const fernSpacing=2.95,fernCount=52,fernLoop=(fernCount-1)*fernSpacing+15.5;
for(let i=0;i<fernCount;i++){
 const z=-i*fernSpacing-3.5+(Math.random()-.5)*1.55;
 if(Math.random()<.9)roadsideVegetation.push(fern(-5.45-Math.random()*2.0,z,randomFernScale(),fernLoop));
 if(Math.random()<.9)roadsideVegetation.push(fern(5.45+Math.random()*2.0,z+(Math.random()-.5)*1.1,randomFernScale(),fernLoop));
 if(i%4===1&&Math.random()<.68){
  const side=Math.random()<.5?-1:1;
  roadsideVegetation.push(fern(side*(6.2+Math.random()*2.0),z-1.25+(Math.random()-.5)*.8,randomFernScale(),fernLoop));
 }
}

// Scatter tufts of fine grass in irregular pockets on both sides of the path.
const grassSpacing=2.4,grassCount=69,grassLoop=(grassCount-1)*grassSpacing+19;
for(let i=0;i<grassCount;i++){
 const z=-i*grassSpacing-2.5+(Math.random()-.5)*1.8;
 // Patchy little grass on both verges rather than randomly leaving one side bare.
 if(Math.random()<.84)roadsideVegetation.push(grassTuft(-(4.55+Math.random()*2.8),z,.42+Math.random()*.7,grassLoop));
 if(Math.random()<.84)roadsideVegetation.push(grassTuft(4.55+Math.random()*2.8,z+(Math.random()-.5)*.95,.42+Math.random()*.7,grassLoop));
 if(i%2===1&&Math.random()<.82){
  const side=Math.random()<.5?-1:1;
  roadsideVegetation.push(grassTuft(side*(6.0+Math.random()*3.5),z-1.05+(Math.random()-.5)*1.0,.34+Math.random()*.48,grassLoop));
  if(Math.random()<.48)roadsideVegetation.push(grassTuft(-side*(5.8+Math.random()*2.8),z-1.65+(Math.random()-.5)*1.0,.28+Math.random()*.36,grassLoop));
 }
}

const { runner, torso, armL, armR, legL, legR, flightAura, auraOuter, auraInner, flightParticles } = createFiona(scene, mat, box);
const obstacles=[], coins=[], segments=[];
function makeObstacle(lane,z,type='knot'){const g=new THREE.Group();g.position.set((lane-1)*2.55,0,z);scene.add(g);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.36,.62,2.55,7),trunkMat);trunk.position.y=1.25;trunk.castShadow=true;g.add(trunk);for(const [x,y,z,s] of [[-.16,.72,.34,.19],[.2,1.32,.33,.16],[-.08,1.88,.28,.14]]){const knot=new THREE.Mesh(new THREE.SphereGeometry(s,8,7),darkStone);knot.position.set(x,y,z);knot.scale.set(1,.82,.42);knot.castShadow=true;g.add(knot)}for(const x of [-.38,.38]){const branch=new THREE.Mesh(new THREE.ConeGeometry(.13,.9,5),trunkMat);branch.position.set(x,1.72,0);branch.rotation.z=x<0?.8:-.8;g.add(branch)}obstacles.push({g,lane,type:'knot',z,passed:false})}
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

 obstacles.push({g,lane,type:'pee',z,passed:false});
}
function makeFish(lane,z){const g=new THREE.Group();g.position.set((lane-1)*2.55,0,z);g.rotation.y=0;scene.add(g);const fishMat=new THREE.MeshStandardMaterial({color:0x777f89,roughness:.42,metalness:.22});const bellyMat=new THREE.MeshStandardMaterial({color:0xd0cec4,roughness:.58});const finMat=new THREE.MeshStandardMaterial({color:0x626b76,roughness:.55});const body=new THREE.Mesh(new THREE.SphereGeometry(.52,16,10),fishMat);body.scale.set(.78,.48,1.75);body.position.y=.19;body.rotation.x=-.04;g.add(body);const belly=new THREE.Mesh(new THREE.SphereGeometry(.39,14,8),bellyMat);belly.scale.set(.78,.24,1.48);belly.position.set(0,.075,-.04);g.add(belly);const tail=new THREE.Mesh(new THREE.ConeGeometry(.34,.66,5),fishMat);tail.rotation.x=Math.PI/2;tail.position.set(0,.19,1.02);g.add(tail);for(const side of [-1,1]){const fin=new THREE.Mesh(new THREE.ConeGeometry(.19,.43,4),finMat);fin.rotation.z=side*.8;fin.position.set(side*.34,.19,.13);g.add(fin);const eye=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0x090b0e}));eye.position.set(side*.28,.32,-.55);g.add(eye)}obstacles.push({g,lane,type:'fish',z,passed:false})}
// Procedural 3D soul-flame geometry. No face, eyes, or coin-like ring.

const makeSoul = createSoulFactory(scene, coins);

const makeLavaRiver = createLavaRiverFactory(scene, obstacles);
const makeSegment = createSegmentGenerator({
  makeLavaRiver,
  makeFish,
  makePuddle,
  makeObstacle,
  makeSoul
});
let lane=1, state='ready', distance=0, coinCount=0, soulCharge=0, ultTimer=0, speed=15, spawnZ=-50, jumpT=0, slideT=0, slipT=0, invuln=0, last=0, spawnTimer=0, toastTimer=0;
const $=id=>document.getElementById(id);let best=Number(localStorage.getItem('knottyPineBest')||0);let bestSouls=Number(localStorage.getItem('knottyPineBestSouls')||0);$('best').textContent=best+' m';$('best-souls').textContent=bestSouls;
function updateHud(){
 $('distance').textContent=Math.floor(distance)+' m';
 $('coins').textContent=coinCount;
 const active=ultTimer>0;
 const amount=active?Math.max(0,ultTimer/ULT_DURATION*100):soulCharge/SOULS_PER_ULT*100;
 $('soul-fill').style.width=Math.max(0,Math.min(100,amount))+'%';
 $('soul-meter-wrap').classList.toggle('active',active);
 $('soul-state').textContent=active?'УЛЬТА — ПОЛЁТ':'ПЛАМЯ ДУШ';
 $('soul-count').textContent=active?Math.ceil(ultTimer)+' с':soulCharge+'/'+SOULS_PER_ULT;
}
function popToast(t){if(t==='+ 1 ДУША'||t==='+1 ДУША'||t==='+ COIN')return;$('toast').textContent=t;$('toast').classList.add('show');toastTimer=.85}
function activateUltimate(){soulCharge=0;ultTimer=ULT_DURATION;popToast('УЛЬТА! ФИОНА ВЗЛЕТАЕТ');updateHud()}
function start(){for(const o of obstacles)scene.remove(o.g);for(const c of coins)scene.remove(c.g);obstacles.length=0;coins.length=0;lane=1;distance=0;coinCount=0;soulCharge=0;ultTimer=0;speed=15;spawnZ=-48;spawnTimer=.2;jumpT=0;slideT=0;slipT=0;invuln=0;runner.rotation.set(0,0,0);runner.position.set(0,0,2.3);flightAura.visible=false;state='playing';$('center').classList.add('hidden');updateHud()}
function end(){state='over';best=Math.max(best,Math.floor(distance));bestSouls=Math.max(bestSouls,coinCount);localStorage.setItem('knottyPineBest',best);localStorage.setItem('knottyPineBestSouls',bestSouls);$('best').textContent=best+' m';$('best-souls').textContent=bestSouls;$('message').innerHTML='Фиона не выбралась. Пройдено <b>'+Math.floor(distance)+' м</b> и собрал <b>'+coinCount+' душ</b>.';$('start').textContent='ЕЩЁ ОДИН ЗАБЕГ';$('center').classList.remove('hidden')}
function move(d){if(state!=='playing'||slipT>0)return;lane=Math.max(0,Math.min(2,lane+d))}
function jump(){if(state==='playing'&&ultTimer<=0&&jumpT<=0&&slideT<=0)jumpT=.72}
function slide(){if(state==='playing'&&ultTimer<=0&&slideT<=0&&jumpT<=0)slideT=.68}
function actionKey(e){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','KeyA','KeyD','KeyW','KeyS'].includes(e.code))e.preventDefault();if(state!=='playing'){if(e.code==='Enter'||e.code==='Space')start();return}if(e.code==='ArrowLeft'||e.code==='KeyA')move(-1);if(e.code==='ArrowRight'||e.code==='KeyD')move(1);if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')jump();if(e.code==='ArrowDown'||e.code==='KeyS')slide()}
window.addEventListener('keydown',actionKey);
$('start').addEventListener('click',start);$('left').addEventListener('click',()=>move(-1));$('right').addEventListener('click',()=>move(1));$('jump').addEventListener('click',jump);$('slide').addEventListener('click',slide);
let touchX=0,touchY=0;renderer.domElement.addEventListener('pointerdown',e=>{touchX=e.clientX;touchY=e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(state!=='playing')return;const dx=e.clientX-touchX,dy=e.clientY-touchY;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<0)jump();else slide()});
function resetDecor(){for(const d of fixedDecor){if(d.position.z>16)d.position.z-=120}}
function frame(t){requestAnimationFrame(frame);const dt=Math.min((t-last)/1000||0,.04);last=t;
 // Animate molten streaks from the summit down the volcano's face, looping continuously.
 for(const flow of movingLava){const p=(t*.000085+flow.phase)%1;const y=19-p*19;const x=flow.xStart+(flow.xEnd-flow.xStart)*p+Math.sin(p*17+flow.phase*9)*.22;flow.mesh.position.set(x,y-1,-71.85);}

 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show')}
 if(state==='playing'){
  // Scroll the road texture toward the camera so the boards stay fixed to the world as Fiona runs.
  pineFloorTexture.offset.y=(pineFloorTexture.offset.y+speed*dt*15/220)%1;
  distance+=speed*dt*.72;updateHud();speed=Math.min(29,15+distance*.009);spawnTimer-=dt;
  if(spawnTimer<=0){makeSegment(spawnZ);spawnZ-=18+Math.random()*7;spawnTimer=Math.max(.48,1.02-(speed-15)*.025)}
  if(spawnZ<-150)spawnZ= -50;
  if(ultTimer>0)ultTimer=Math.max(0,ultTimer-dt);
  if(ultTimer<=0&&soulCharge>=SOULS_PER_ULT)activateUltimate();
  const ultActive=ultTimer>0;
  jumpT=Math.max(0,jumpT-dt);slideT=Math.max(0,slideT-dt);slipT=Math.max(0,slipT-dt);invuln=Math.max(0,invuln-dt);
  const jumping=!ultActive&&jumpT>0, sliding=!ultActive&&slideT>0;
  const jumpY=ultActive?2.25+Math.sin(t*.008)*.14:(jumping?Math.sin((1-jumpT/.72)*Math.PI)*1.75:0);
  runner.position.x+=( (lane-1)*2.55-runner.position.x)*Math.min(1,dt*12);runner.position.y=jumpY;
  runner.scale.y=ultActive?1:(sliding?.58:1);runner.position.z=2.3;
  runner.rotation.z=ultActive?Math.sin(t*.003)*.035:(slipT>0?Math.sin(t*.045)*.2:0);
  runner.rotation.x=ultActive?-.12:0;
  flightAura.visible=ultActive;
  if(ultActive){
   const pulse=1+Math.sin(t*.012)*.045;
   auraOuter.scale.set(.82*pulse,1.53/pulse,.67*pulse);
   auraInner.scale.set(.64/pulse,1.30*pulse,.53/pulse);
   flightAura.rotation.y=Math.sin(t*.0018)*.10;
   flightParticles.forEach((p,i)=>{
    const a=t*.0028+p.phase;
    p.mesh.visible=true;
    p.mesh.position.set(Math.cos(a)*p.radius,p.height+Math.sin(t*.006+p.phase)*.12,Math.sin(a)*p.radius*.72);
    p.mesh.scale.setScalar(.65+.35*(.5+.5*Math.sin(t*.009+p.phase)));
    p.mesh.rotation.x+=dt*2.4;p.mesh.rotation.y+=dt*1.8;
   });
  }else{
   flightParticles.forEach(p=>p.mesh.visible=false);
   flightAura.rotation.y=0;
  }
  const run= t*.012*speed/15;armL.rotation.x=Math.sin(run)*.65;armR.rotation.x=-Math.sin(run)*.65;legL.rotation.x=-Math.sin(run)*.72;legR.rotation.x=Math.sin(run)*.72;
  torso.rotation.z=( (lane-1)*2.55-runner.position.x)*-.05;
  for(const o of obstacles){
   const previousZ=o.g.position.z;
   o.g.position.z+=speed*dt;
   // During ultimate flight Fiona can pass over lava rivers and all ground hazards.
   if(ultActive&&o.g.position.z>-3.5)o.passed=true;
   if(o.type==='lava'){
    if(!ultActive&&!o.passed){
     const half=o.g.userData.halfDepth||.88;
     const crossedFrontEdge=previousZ+half<runner.position.z&&o.g.position.z+half>=runner.position.z;
     if(crossedFrontEdge){
      o.passed=true;
      if(!(jumping&&jumpY>.62)){end();break}
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
     if(o.type==='pee'){if(!jumping&&invuln<=0){slipT=.9;invuln=.95;popToast('ФИОНА ПОСКОЛЬЗНУЛАСЬ!')}else if(jumping){invuln=.22}}
     else{const safe=jumping;if(!safe){end();break}else{invuln=.22}}
    }
   }
  }
  for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].g.position.z>13){scene.remove(obstacles[i].g);obstacles.splice(i,1)}
  for(const c of coins){
   c.g.position.z+=speed*dt;
   const phase=c.phase||c.z*.2;
   c.g.rotation.y=Math.sin(t*.0018+phase)*.62;
   c.g.rotation.z=Math.sin(t*.003+phase)*.07;
   const soulPulse=1+Math.sin(t*.006+phase)*.045;
   c.g.scale.set(soulPulse,soulPulse,soulPulse);
   c.g.position.y=c.baseY+Math.sin(t*.004+phase)*.14;
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
   if(!c.g.userData.got&&c.g.position.z>1.0&&c.g.position.z<3.7&&c.lane===lane&&Math.abs(runner.position.x-(c.lane-1)*2.55)<1.1){
    c.g.userData.got=true;coinCount++;if(coinCount>bestSouls){bestSouls=coinCount;localStorage.setItem('knottyPineBestSouls',bestSouls);$('best-souls').textContent=bestSouls}soulCharge=Math.min(SOULS_PER_ULT,soulCharge+1);scene.remove(c.g);if(soulCharge>=SOULS_PER_ULT)activateUltimate();else popToast('+ 1 ДУША');updateHud()
   }
  }
  for(let i=coins.length-1;i>=0;i--)if(coins[i].g.position.z>13||coins[i].g.userData.got){if(coins[i].g.parent)scene.remove(coins[i].g);coins.splice(i,1)}
  // Roadside trees are fixed in the world; move them toward and past the runner, then recycle them far ahead.
  for(const plant of roadsideVegetation){plant.position.z+=speed*dt;if(plant.position.z>12)plant.position.z-=plant.userData.recycleLength}
  for(const d of fixedDecor){d.position.z+=speed*dt;if(d.position.z>16)d.position.z-=120}
  updateHud();
 }
 // Camera follows gently; maintain forward view
 camera.position.x+=(runner.position.x*.32-camera.position.x)*Math.min(1,dt*2.2);camera.position.y=5.0+(state==='playing'?Math.sin(t*.004)*.035:0);camera.lookAt(runner.position.x*.2,1.05,-5);
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.2))});
