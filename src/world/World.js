import * as THREE from 'three';
import {createForestGenerator,populateForest} from './forest/ForestGenerator.js';
import {createDistantForestBackdrop} from './forest/DistantForestBackdrop.js';

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
  const grassMat=mat(0x3d8b4d), roadMat=mat(0xffffff), edgeMat=mat(0xc8a66b), darkStone=mat(0x454c40), trunkMat=mat(0x68472d);
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
  function box(w,h,d,material,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  // The scene delegates all vegetation to the extensible forest registry.
  const seed=(Math.random()*0xffffffff)>>>0;
  const forest=populateForest(createForestGenerator(scene,{seed}),{seed:seed^0x51f2a9c3});
  // Dense, very inexpensive background silhouettes fill the side gaps
  // where animated trees vanish into fog before the volcanic mountains.
  const distantForestBackdrop=createDistantForestBackdrop(scene,{seed:seed^0x19af4302});
  const roadsideVegetation=forest.plants;
  const updateForestPines=()=>forest.update();
  return { scene, camera, renderer, mat, box, trunkMat, darkStone, pineFloorTexture, movingLava, roadsideVegetation, updateForestPines, forest, distantForestBackdrop };
}
