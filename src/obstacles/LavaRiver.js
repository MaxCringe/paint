import * as THREE from 'three';

// Owns lava materials and builds each wide, irregular river with its scorched pine banks.
// Scene and obstacle registry are injected so this module remains independent of the game loop.
export function createLavaRiverFactory(scene, obstacles) {
  const lavaRiverGlowMaterial=new THREE.MeshBasicMaterial({color:0xff3000,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  const lavaSurfaceMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const lavaCoreMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const lavaRockMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const lavaBedMat=new THREE.MeshBasicMaterial({color:0x6f1609,side:THREE.DoubleSide,toneMapped:false});
  const lavaBubbleGeo=new THREE.SphereGeometry(1,8,6);
  const lavaCharredWoodMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const lavaBankFlameMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.23,depthWrite:false,toneMapped:false});
  const lavaBubbleMats=[new THREE.MeshBasicMaterial({color:0xffd76a,toneMapped:false}),new THREE.MeshBasicMaterial({color:0xff8610,toneMapped:false}),new THREE.MeshBasicMaterial({color:0xffffad,toneMapped:false})];
  // A subtle moving highlight layer. The original vivid lava materials are untouched.
  // Use Three.js' regular textured material (no custom shader) to prevent grey/black lava.
  const currentCanvas=document.createElement('canvas');
  currentCanvas.width=256;currentCanvas.height=64;
  const currentCtx=currentCanvas.getContext('2d');
  for(let i=0;i<46;i++){
   const x=Math.random()*256,y=6+Math.random()*52,length=18+Math.random()*60;
   const bend=(Math.random()-.5)*9;
   const brightness=155+Math.floor(Math.random()*95);
   currentCtx.lineWidth=.8+Math.random()*2.4;
   currentCtx.strokeStyle='rgba(255,'+brightness+',55,'+(.18+Math.random()*.27)+')';
   // Repeated copies keep the texture seamless as it scrolls across the river.
   for(const wrap of [-256,0,256]){
    currentCtx.beginPath();
    currentCtx.moveTo(x+wrap,y);
    currentCtx.bezierCurveTo(x+wrap+length*.32,y+bend,x+wrap+length*.68,y-bend*.55,x+wrap+length,y+bend*.18);
    currentCtx.stroke();
   }
  }
  const currentTexture=new THREE.CanvasTexture(currentCanvas);
  currentTexture.colorSpace=THREE.SRGBColorSpace;
  currentTexture.wrapS=THREE.RepeatWrapping;
  const currentMat=new THREE.MeshBasicMaterial({
   map:currentTexture,transparent:true,opacity:.54,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
  });
  // Soft fire cards overlay the old angular flame geometry; no shader or gameplay changes.
  const fireCanvas=document.createElement('canvas');
  fireCanvas.width=96;fireCanvas.height=192;
  const fireCtx=fireCanvas.getContext('2d');
  const halo=fireCtx.createRadialGradient(48,142,6,48,120,73);
  halo.addColorStop(0,'rgba(255,130,19,.42)');
  halo.addColorStop(.5,'rgba(255,65,9,.22)');
  halo.addColorStop(1,'rgba(255,42,5,0)');
  fireCtx.fillStyle=halo;fireCtx.fillRect(0,0,96,192);
  // Uneven flame outline, with translucent orange edges and a smaller bright core.
  fireCtx.beginPath();
  fireCtx.moveTo(24,188);
  fireCtx.bezierCurveTo(11,161,17,139,33,111);
  fireCtx.bezierCurveTo(40,97,30,77,41,60);
  fireCtx.bezierCurveTo(43,82,54,82,56,48);
  fireCtx.bezierCurveTo(61,24,58,18,53,6);
  fireCtx.bezierCurveTo(76,44,70,71,65,90);
  fireCtx.bezierCurveTo(84,108,85,146,69,163);
  fireCtx.bezierCurveTo(64,175,73,182,73,188);
  fireCtx.closePath();
  const outerHeat=fireCtx.createLinearGradient(0,12,0,188);
  outerHeat.addColorStop(0,'rgba(255,186,41,.03)');
  outerHeat.addColorStop(.35,'rgba(255,101,13,.65)');
  outerHeat.addColorStop(.75,'rgba(255,78,6,.92)');
  outerHeat.addColorStop(1,'rgba(245,38,4,.55)');
  fireCtx.fillStyle=outerHeat;fireCtx.fill();
  fireCtx.beginPath();
  fireCtx.moveTo(38,187);
  fireCtx.bezierCurveTo(27,162,39,141,46,123);
  fireCtx.bezierCurveTo(54,109,44,100,53,76);
  fireCtx.bezierCurveTo(62,107,53,121,63,137);
  fireCtx.bezierCurveTo(73,156,61,173,59,187);
  fireCtx.closePath();
  const coreHeat=fireCtx.createLinearGradient(0,80,0,188);
  coreHeat.addColorStop(0,'rgba(255,238,105,.0)');
  coreHeat.addColorStop(.48,'rgba(255,195,46,.75)');
  coreHeat.addColorStop(1,'rgba(255,246,147,.94)');
  fireCtx.fillStyle=coreHeat;fireCtx.fill();
  const fireTexture=new THREE.CanvasTexture(fireCanvas);
  fireTexture.colorSpace=THREE.SRGBColorSpace;
  const fireCardMaterial=new THREE.MeshBasicMaterial({
   map:fireTexture,transparent:true,opacity:.93,side:THREE.DoubleSide,
   depthWrite:false,alphaTest:.015,toneMapped:false
  });
  const fireCardGeometry=new THREE.PlaneGeometry(1,1);
  function addLivingFlame(parent,x,groundY,z,width,height,phase){
   const flame=new THREE.Mesh(fireCardGeometry,fireCardMaterial);
   flame.scale.set(width,height,1);
   flame.position.set(x,groundY+height*.48,z);
   flame.rotation.y=Math.sin(phase)*.32;
   flame.renderOrder=8;
   flame.onBeforeRender=()=>{
    const t=performance.now()*.001;
    const flicker=.88+.11*Math.sin(t*8.6+phase)+.065*Math.sin(t*13.9+phase*1.7);
    flame.scale.set(width*(.93+.07*Math.sin(t*6.7+phase)),height*flicker,1);
    flame.position.x=x+.035*Math.sin(t*4.5+phase);
    flame.position.y=groundY+flame.scale.y*.48;
    flame.rotation.z=.08*Math.sin(t*5.5+phase);
   };
   parent.add(flame);
  }
  function makeLavaRiver(z){
   const g=new THREE.Group();g.position.set(0,.045,z);g.userData.halfDepth=2.95;g.userData.bubbles=[];scene.add(g);
   const phase=Math.random()*6.28,steps=720;
   const center=x=>.28*Math.sin(x*.58+phase)+.16*Math.sin(x*1.37-phase*.7)+.07*Math.sin(x*2.65+phase*1.8);
   const half=x=>2.32+.24*Math.sin(x*.72+phase)+.13*Math.sin(x*2.05-phase);
   const noise=x=>.05*Math.sin(x*4.1+phase*2)+.025*Math.sin(x*7.2-phase);
   // Solid, irregularly banked lava bed keeps the crossing visibly molten on wide screens.
   const bedGeo=new THREE.PlaneGeometry(220,6.4,720,1);
   const bedPos=bedGeo.attributes.position;
   for(let i=0;i<bedPos.count;i++){
    const x=bedPos.getX(i),q=bedPos.getY(i)/3.2;
    bedPos.setY(i,-(center(x)+noise(x)+q*half(x)*1.28));
   }
   bedGeo.rotateX(-Math.PI/2);bedGeo.computeVertexNormals();bedGeo.computeBoundingSphere();
   const bed=new THREE.Mesh(bedGeo,lavaBedMat);bed.position.y=-.052;bed.renderOrder=1;g.add(bed);
   function ribbon(rows,y,palette,material,factor=1){
    const p=[],col=[],idx=[],n=rows.length;
    for(let i=0;i<=steps;i++){
     const x=-110+220*i/steps,mid=center(x)+noise(x),w=half(x)*factor;
     for(let j=0;j<n;j++){
      const q=rows[j];p.push(x,y,mid+q*w+(Math.abs(q)>.7?noise(x)*(q>0?1:-1):0));
      if(palette){const v=new THREE.Color(palette[j]);col.push(v.r,v.g,v.b)}
     }
     if(i<steps)for(let j=0;j<n-1;j++){const a=i*n+j,b=a+n;idx.push(a,b,a+1,b,b+1,a+1)}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    if(palette)geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,material);mesh.renderOrder=material===lavaRiverGlowMaterial?2:(material===lavaSurfaceMat?3:(material===lavaCoreMat?4:5));g.add(mesh);return mesh;
   }
   ribbon([-1,1],-.046,null,lavaRiverGlowMaterial,1.34);
   ribbon([-1,-.86,-.70,-.53,-.36,-.20,-.08,.07,.23,.41,.60,.78,.91,1],-.024,
    [0x211614,0x321813,0x501b11,0x7d210e,0xb82e0a,0xf04708,0xff8b12,0xffc344,0xffa321,0xff700d,0xdd3908,0x812611,0x3a1b14,0x211613],lavaSurfaceMat);
   ribbon([-.26,-.13,-.025,.08,.20,.29],-.008,[0xff4b07,0xff9b18,0xffff9a,0xffffc7,0xffa21a,0xff5108],lavaCoreMat,.92);
   // Flow travels along X, from the forest across the road, without moving the obstacle.
   // Draw above the existing lava surface; preserve the old bright core beneath it.
   const currentMesh=ribbon([-0.87,0.87],.006,null,currentMat,.98);
   const currentUv=[];
   for(let i=0;i<=steps;i++){
    const u=(-110+220*i/steps)/14;
    currentUv.push(u,0,u,1);
   }
   currentMesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(currentUv,2));
   currentMesh.onBeforeRender=()=>{
    currentTexture.offset.x=-(performance.now()*.000075)%1;
   };
   // Broken dark crust fragments make both riverbanks uneven rather than ruler-straight.
   const rp=[],rc=[],ri=[];
   function tri(a,b,c,color){const base=rp.length/3,v=new THREE.Color(color);for(const p of [a,b,c]){rp.push(p[0],p[1],p[2]);rc.push(v.r,v.g,v.b)}ri.push(base,base+1,base+2)}
   const rocks=[0x211613,0x34201a,0x4a291d,0x612b1b,0x2a211c,0x754022];
   for(let i=2;i<steps-2;i+=2){const x=-110+220*i/steps,mid=center(x)+noise(x),w=half(x);
    for(const side of [-1,1]){if(Math.random()<.12)continue;const rx=.05+Math.random()*.1,rz=.03+Math.random()*.08,cx=x+(Math.random()-.5)*.1,cz=mid+side*(w+.02);
     const a=[cx-rx,.01,cz-side*rz*.45],b=[cx-rx*.2,.028,cz+side*rz],d=[cx+rx,.012,cz+side*rz*.7],e=[cx+rx*.6,.009,cz-side*rz*.4],m=[cx,.019,cz+side*rz*.1];
     tri(m,a,b,rocks[i%rocks.length]);tri(m,b,d,rocks[(i+2)%rocks.length]);tri(m,d,e,rocks[(i+3)%rocks.length]);tri(m,e,a,rocks[(i+1)%rocks.length]);
    }
   }
   const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));rg.setAttribute('color',new THREE.Float32BufferAttribute(rc,3));rg.setIndex(ri);rg.computeVertexNormals();rg.computeBoundingSphere();const rockMesh=new THREE.Mesh(rg,lavaRockMat);rockMesh.renderOrder=5;g.add(rockMesh);
   // The hot lava scorches the pine decking only where each riverbank touches it.
   // The charred strips and small flames are attached to the river, not the road's long outer edges.
   const burnPos=[],burnCol=[],burnIdx=[],burnColors=[0xff4b10,0xc43a12,0x74301d,0x3b211a,0x241714],burnSteps=64,burnRows=burnColors.length;
   for(const side of [-1,1]){
    for(let i=0;i<=burnSteps;i++){
     const x=-4.34+8.68*i/burnSteps,mid=center(x)+noise(x),edge=mid+side*half(x);
     const jag=.035*Math.sin(x*5.7+phase*1.3)+.018*Math.sin(x*11.4-phase);
     const offsets=[.018,.075,.16+jag,.29+jag*1.2,.39+jag*1.4];
     for(let j=0;j<burnRows;j++){
      const col=new THREE.Color(burnColors[j]);
      burnPos.push(x,-.012,edge+side*offsets[j]);burnCol.push(col.r,col.g,col.b);
     }
     if(i<burnSteps)for(let j=0;j<burnRows-1;j++){
      const a=i*burnRows+j,b=a+burnRows;burnIdx.push(a,b,a+1,b,b+1,a+1);
     }
    }
   }
   const burnGeo=new THREE.BufferGeometry();burnGeo.setAttribute('position',new THREE.Float32BufferAttribute(burnPos,3));burnGeo.setAttribute('color',new THREE.Float32BufferAttribute(burnCol,3));burnGeo.setIndex(burnIdx);burnGeo.computeVertexNormals();burnGeo.computeBoundingSphere();const charMesh=new THREE.Mesh(burnGeo,lavaCharredWoodMat);charMesh.renderOrder=6;g.add(charMesh);
   // Short irregular flames lick the scorched boards on both sides of the molten crossing.
   // Each flame tip flickers independently; the base stays anchored in burnt wood.
   const flamePos=[],flameCol=[],flameTips=[];
   const emberRed=new THREE.Color(0xff3007),emberOrange=new THREE.Color(0xff710b),emberGold=new THREE.Color(0xffb21a),emberYellow=new THREE.Color(0xffff8a);
   function addFireTri(a,b,c,ca,cb,cc){
    const tipIndex=flamePos.length/3+2;
    for(const [p,col] of [[a,ca],[b,cb],[c,cc]]){flamePos.push(p[0],p[1],p[2]);flameCol.push(col.r,col.g,col.b)}
    flameTips.push({index:tipIndex,x:c[0],y:c[1],z:c[2],phase:Math.random()*6.28});
   }
   for(const side of [-1,1]){
    for(let i=0;i<42;i++){
     const x=-4.25+(i+.5)*8.5/42+(Math.random()-.5)*.10;
     const mid=center(x)+noise(x),edge=mid+side*half(x);
     const z=edge+side*(.025+Math.random()*.10),w=.035+Math.random()*.065,h=.105+Math.random()*.19,lean=(Math.random()-.5)*.11;
     const l=[x-w,-.012,z],r=[x+w,-.012,z+side*.012],tip=[x+lean,-.012+h,z+side*(.025+Math.random()*.055)];
     addFireTri(l,r,tip,emberRed,emberOrange,emberGold);
     const il=[x-w*.30,-.009,z+side*.012],ir=[x+w*.22,-.009,z+side*.016],it=[x+lean*.55,-.012+h*.60,z+side*.035];
     addFireTri(il,ir,it,emberOrange,emberYellow,emberGold);
     // Occasional shorter tongues make the bank fire less evenly comb-shaped.
     if(Math.random()<.42){
      const offset=(Math.random()-.5)*w*.6,smallH=h*(.38+Math.random()*.32);
      addFireTri([x-w*.5,-.01,z],[x+w*.46,-.01,z+side*.012],
       [x+offset,-.01+smallH,z+side*.025],emberRed,emberOrange,emberGold);
     }
    }
   }
   const flameGeo=new THREE.BufferGeometry();flameGeo.setAttribute('position',new THREE.Float32BufferAttribute(flamePos,3));flameGeo.setAttribute('color',new THREE.Float32BufferAttribute(flameCol,3));flameGeo.computeVertexNormals();flameGeo.computeBoundingSphere();
   const bankFlames=new THREE.Mesh(flameGeo,lavaBankFlameMat);bankFlames.renderOrder=7;g.add(bankFlames);
   g.userData.bankFlames=bankFlames;g.userData.bankFlamePhase=phase;
   // Flames visibly spill over the lava banks onto the scorched wood.
   // The river's existing geometry, bright current and collisions are untouched.
   for(const side of [-1,1]){
    for(let i=0;i<19;i++){
     if(i%6===3)continue; // gaps between fire clusters
     const x=-4.18+(i+.5)*8.36/19+(Math.random()-.5)*.19;
     const edge=center(x)+noise(x)+side*half(x);
     const z=edge+side*(.10+Math.random()*.37);
     addLivingFlame(g,x,-.01,z,.28+Math.random()*.26,
      .46+Math.random()*.43,phase+i*1.9+side*.7);
     if(i%4===0) addLivingFlame(g,x+.14,-.01,z+side*.13,
      .19,.33+Math.random()*.22,phase+i*3.1);
    }
   }
   // Forest plants already travel at the same rate as each lava obstacle.
   // Anchor the fire to this river at their current positions; removing the
   // river automatically removes all of these temporary burning effects.
   let burningPlants=0;
   for(const plant of scene.children){
    if(!plant.userData.recycleLength||burningPlants>=18)continue;
    const x=plant.position.x;
    if(Math.abs(x)>27)continue;
    const plantZ=plant.position.z-z;
    const riverMiddle=center(x)+noise(x);
    if(Math.abs(plantZ-riverMiddle)>half(x)+.9)continue;
    burningPlants++;
    const isTree=plant.children.length>1;
    if(isTree){
     // Place fire at the trunk and in the lower pine canopy, not in empty space.
     const sx=plant.scale.x,sy=plant.scale.y;
     addLivingFlame(g,x-.24*sx,.08,plantZ+.26,.48*sx,.88*sy,phase+x);
     addLivingFlame(g,x+.26*sx,.65*sy,plantZ+.28,.58*sx,1.1*sy,phase+x+2.2);
     if(burningPlants%2===0)
      addLivingFlame(g,x-.15*sx,1.62*sy,plantZ+.23,.46*sx,.88*sy,phase+x+4.4);
    }else{
     // Ferns and grass ignite only where the lava reaches the river margins.
     const h=plant.children[0].geometry.attributes.position.count>200?.62:.31;
     addLivingFlame(g,x,0,plantZ+.14,.31*plant.scale.x,
      h*plant.scale.y,phase+x+1.4);
     if(h>.4&&burningPlants%2===0)
      addLivingFlame(g,x+.17,0,plantZ+.17,.22*plant.scale.x,
       h*.7*plant.scale.y,phase+x+3.3);
    }
   }
   // A tiny reusable particle pool: rare bursts from cracking pine, not constant snowfall.
   const sparkCount=12,sparkPositions=new Float32Array(sparkCount*3),sparkColors=new Float32Array(sparkCount*3);
   const sparkGeo=new THREE.BufferGeometry();
   const sparkPositionAttr=new THREE.BufferAttribute(sparkPositions,3);
   const sparkColorAttr=new THREE.BufferAttribute(sparkColors,3);
   sparkPositionAttr.setUsage(THREE.DynamicDrawUsage);
   sparkColorAttr.setUsage(THREE.DynamicDrawUsage);
   sparkGeo.setAttribute('position',sparkPositionAttr);
   sparkGeo.setAttribute('color',sparkColorAttr);
   sparkGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.55,0),8);
   const sparkMat=new THREE.PointsMaterial({
    size:.085,sizeAttenuation:true,vertexColors:true,transparent:true,
    depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false
   });
   const sparkPoints=new THREE.Points(sparkGeo,sparkMat);
   sparkPoints.renderOrder=8;
   g.add(sparkPoints);
   const sparkPool=Array.from({length:sparkCount},()=>({start:-Infinity,life:0}));
   const sparkTint=new THREE.Color(0xffbb52);
   let sparkCursor=0,nextCrackle=performance.now()*.001+.5+Math.random()*1.4;
   const flameVertices=flameGeo.getAttribute('position');
   bankFlames.onBeforeRender=()=>{
    const now=performance.now()*.001;
    // The existing game-loop breathing stays; this only gives individual tips motion.
    for(const tip of flameTips){
     const flutter=.88+.12*Math.sin(now*9.1+tip.phase)+.07*Math.sin(now*15.7+tip.phase*.63);
     flameVertices.setXYZ(tip.index,tip.x+.018*Math.sin(now*7.4+tip.phase),
      -.012+(tip.y+.012)*flutter,tip.z+.01*Math.sin(now*5.3+tip.phase));
    }
    flameVertices.needsUpdate=true;
    if(now>=nextCrackle){
     nextCrackle=now+.75+Math.random()*1.9;
     const x=-4.05+Math.random()*8.1,side=Math.random()<.5?-1:1;
     const z=center(x)+noise(x)+side*(half(x)+.07);
     const count=1+Math.floor(Math.random()*3);
     for(let k=0;k<count;k++){
      const s=sparkPool[sparkCursor++%sparkCount];
      s.start=now;s.life=.45+Math.random()*.55;
      s.x=x+(Math.random()-.5)*.13;s.y=.075+Math.random()*.1;
      s.z=z+side*Math.random()*.06;
      s.vx=(Math.random()-.5)*.24;s.vy=.43+Math.random()*.58;
      s.vz=(Math.random()-.5)*.19;s.phase=Math.random()*6.28;
     }
    }
    for(let i=0;i<sparkCount;i++){
     const s=sparkPool[i],age=now-s.start;
     if(age>=0&&age<s.life){
      const p=age/s.life,glow=Math.sin(Math.PI*p)*(.6+.4*Math.sin(s.phase+9*p)**2);
      sparkPositionAttr.setXYZ(i,s.x+s.vx*age+.018*Math.sin(now*7+s.phase),
       s.y+s.vy*age-.12*age*age,s.z+s.vz*age);
      sparkColorAttr.setXYZ(i,sparkTint.r*glow,sparkTint.g*glow,sparkTint.b*glow);
     }else{
      sparkColorAttr.setXYZ(i,0,0,0);
     }
    }
    sparkPositionAttr.needsUpdate=true;
    sparkColorAttr.needsUpdate=true;
   };
   for(let i=0;i<8;i++){const x=-105+Math.random()*210,b=new THREE.Mesh(lavaBubbleGeo,lavaBubbleMats[i%3]),sy=.018+Math.random()*.02;b.position.set(x,-.002,center(x)+(Math.random()-.5)*half(x)*.7);b.scale.set(.035+Math.random()*.05,sy,.04+Math.random()*.06);g.add(b);g.userData.bubbles.push({mesh:b,phase:Math.random()*6.28,sy})}
   obstacles.push({g,lane:-1,type:'lava',z,passed:false});
  }
  return makeLavaRiver;
}
