import * as THREE from 'three';
import { buildFernGeometry } from './buildFernGeometry.js';

// Build the scene, forest, volcanic horizon, track, and recycled roadside vegetation.
export function createWorld() {
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
  // Small faceted 3D volcanic cone in front of the original silhouette,
  // but BEHIND the existing orange lava streaks (-72.4 and closer).
  // Single mesh, inexpensive unlit facets, no changes to the mountain ranges.
  const volcanoVertices=[],volcanoColors=[];
  const coneRings=[
   {y:-.9,x:17.0,d:1.0},{y:4.7,x:13.8,d:1.0},
   {y:11.9,x:9.2,d:.91},{y:18.4,x:5.5,d:.84},
   {y:21.7,x:3.35,d:.78},{y:23.6,x:2.25,d:.67}
  ];
  const coneSegments=28,coneCenterZ=-73.73;
  const conePalette=[
   new THREE.Color(0x24131a),new THREE.Color(0x301821),
   new THREE.Color(0x3b2029),new THREE.Color(0x472831),
   new THREE.Color(0x342029),new THREE.Color(0x1b1018)
  ];
  function conePoint(ring,i,ringIndex){
   const theta=i/coneSegments*Math.PI*2;
   const jitter=1+.045*Math.sin(theta*5+ringIndex*2.1)+.03*Math.sin(theta*11-ringIndex);
   return [
    30+Math.cos(theta)*ring.x*jitter,
    -1+ring.y+(ringIndex?Math.sin(theta*7+ringIndex*1.4)*.16:0),
    coneCenterZ+Math.sin(theta)*ring.d*jitter
   ];
  }
  function coneFacet(a,b,c,col){
   for(const p of [a,b,c]){
    volcanoVertices.push(...p);
    volcanoColors.push(col.r,col.g,col.b);
   }
  }
  for(let j=0;j<coneRings.length-1;j++){
   for(let i=0;i<coneSegments;i++){
    const a=conePoint(coneRings[j],i,j);
    const b=conePoint(coneRings[j],i+1,j);
    const c=conePoint(coneRings[j+1],i,j+1);
    const d=conePoint(coneRings[j+1],i+1,j+1);
    const shade=conePalette[(i*7+j*3)%conePalette.length];
    const ridge=conePalette[(i*3+j*5+2)%conePalette.length];
    coneFacet(a,b,c,shade);
    coneFacet(b,d,c,ridge);
   }
  }
  const volcano3DGeo=new THREE.BufferGeometry();
  volcano3DGeo.setAttribute('position',new THREE.Float32BufferAttribute(volcanoVertices,3));
  volcano3DGeo.setAttribute('color',new THREE.Float32BufferAttribute(volcanoColors,3));
  volcano3DGeo.computeVertexNormals();
  const volcano3D=new THREE.Mesh(volcano3DGeo,
   new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,fog:false}));
  volcano3D.renderOrder=-1.8;
  scene.add(volcano3D);

  // Elliptical dark interior and glowing magma visible inside the crater rim.
  const craterDark=new THREE.Mesh(
   new THREE.CircleGeometry(2.15,20),
   new THREE.MeshBasicMaterial({color:0x120b10,side:THREE.DoubleSide,fog:false})
  );
  craterDark.rotation.x=-Math.PI/2;
  craterDark.scale.y=.36;
  craterDark.position.set(30,21.6,-72.51);
  craterDark.renderOrder=-1.5;
  scene.add(craterDark);
  const craterMagma=new THREE.Mesh(
   new THREE.CircleGeometry(1.25,20),
   new THREE.MeshBasicMaterial({color:0xff5410,side:THREE.DoubleSide,fog:false})
  );
  craterMagma.rotation.x=-Math.PI/2;
  craterMagma.scale.y=.32;
  craterMagma.position.set(30,21.64,-72.5);
  craterMagma.renderOrder=-1.4;
  scene.add(craterMagma);

  // One lightweight particle system for ash and glowing fragments above the vent.
  const ventCount=64,ventPos=new Float32Array(ventCount*3),ventColor=new Float32Array(ventCount*3);
  const ventGeo=new THREE.BufferGeometry();
  const ventPosAttr=new THREE.BufferAttribute(ventPos,3);
  const ventColorAttr=new THREE.BufferAttribute(ventColor,3);
  ventPosAttr.setUsage(THREE.DynamicDrawUsage);
  ventColorAttr.setUsage(THREE.DynamicDrawUsage);
  ventGeo.setAttribute('position',ventPosAttr);
  ventGeo.setAttribute('color',ventColorAttr);
  ventGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(30,27,-72.1),18);
  const ventAsh=new THREE.Color(0x6c5860),ventEmber=new THREE.Color(0xff9821),ventHot=new THREE.Color(0xffe485);
  const ventSeeds=Array.from({length:ventCount},(_,i)=>({
   phase:Math.random()*5.5,side:(Math.random()-.5)*2,
   drift:(Math.random()-.5)*1.65,rise:2.1+Math.random()*2.3,
   period:2.8+Math.random()*2.5,ash:i%4===0
  }));
  const ventPoints=new THREE.Points(ventGeo,new THREE.PointsMaterial({
   size:4.3,sizeAttenuation:false,vertexColors:true,
   transparent:true,opacity:.96,depthWrite:false,
   blending:THREE.AdditiveBlending,fog:false
  }));
  ventPoints.frustumCulled=false;
  ventPoints.renderOrder=4;
  ventPoints.onBeforeRender=()=>{
   const now=performance.now()*.001;
   for(let i=0;i<ventCount;i++){
    const p=ventSeeds[i],age=(now+p.phase)%p.period;
    const progress=age/p.period;
    const lateral=p.side*.62+p.drift*age*.65+.18*Math.sin(age*3.2+p.phase);
    const height=22.4+p.rise*age-(p.ash?.04:.25)*age*age;
    ventPosAttr.setXYZ(i,30+lateral,height,-72.08+.23*Math.sin(age*2.8+p.phase));
    const fade=Math.min(1,age*3)*Math.pow(1-progress,p.ash?1.2:2.1);
    const tint=p.ash?ventAsh:(i%3===0?ventHot:ventEmber);
    ventColorAttr.setXYZ(i,tint.r*fade,tint.g*fade,tint.b*fade);
   }
   ventPosAttr.needsUpdate=true;ventColorAttr.needsUpdate=true;
  };
  scene.add(ventPoints);
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
   g.userData.recycleLength=recycleLength;g.userData.windKind='pine';scene.add(g);
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
   g.userData.recycleLength=recycleLength;g.userData.windKind='fern';
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
   g.userData.recycleLength=recycleLength;g.userData.windKind='grass';
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
  return { scene, camera, renderer, mat, box, trunkMat, darkStone, pineFloorTexture, movingLava, fixedDecor, roadsideVegetation };
}
