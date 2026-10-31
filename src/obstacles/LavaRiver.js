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

  // The textured flames on scorched pines and lava banks must not show
  // rectangular billboard edges. Fade alpha completely at all four sides.
  // Process the small shared texture once, not on each animation frame.
  const firePixels=fireCtx.getImageData(0,0,fireCanvas.width,fireCanvas.height);
  const fireData=firePixels.data;
  const smoothEdge=(distance,width)=>{
   const t=Math.max(0,Math.min(1,distance/width));
   return t*t*(3-2*t);
  };
  const fw=fireCanvas.width,fh=fireCanvas.height;
  for(let y=0;y<fh;y++){
   const fadeY=smoothEdge(y,10)*smoothEdge(fh-1-y,21);
   for(let x=0;x<fw;x++){
    const fadeX=smoothEdge(x,20)*smoothEdge(fw-1-x,20);
    const alpha=(y*fw+x)*4+3;
    fireData[alpha]=Math.round(fireData[alpha]*fadeX*fadeY);
   }
  }
  fireCtx.putImageData(firePixels,0,0);
  const fireTexture=new THREE.CanvasTexture(fireCanvas);
  fireTexture.colorSpace=THREE.SRGBColorSpace;
  const fireCardMaterial=new THREE.MeshBasicMaterial({
   map:fireTexture,transparent:true,opacity:.93,side:THREE.DoubleSide,
   depthWrite:false,alphaTest:.015,toneMapped:false
  });
  const fireCardGeometry=new THREE.PlaneGeometry(1,1);
  function addLivingFlame(parent,x,groundY,z,width,height,phase){
   // Collect identical flame cards instead of creating a separate GPU draw for each.
   parent.userData.fireCards.push({x,groundY,z,width,height,phase});
  }
  function makeLavaRiver(z){
   const g=new THREE.Group();g.position.set(0,.045,z);g.userData.halfDepth=2.95;
   g.userData.bubbles=[];g.userData.fireCards=[];g.userData.treeSparkSources=[];scene.add(g);
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
   // Raised obsidian / cooled-basalt banks along BOTH winding lava edges.
   // One merged, faceted 3D mesh per river: no extra objects in the render loop.
   // Keep its inner edge just over the molten surface, leaving the flowing core visible.
   const basaltPositions=[],basaltColors=[];
   const basaltShades=[
    new THREE.Color(0x100e10),new THREE.Color(0x181516),
    new THREE.Color(0x211d1e),new THREE.Color(0x2b2525),
    new THREE.Color(0x36302e),new THREE.Color(0x433431)
   ];
   const basaltSeam=new THREE.Color(0x552116);
   function basaltTriangle(a,b,c,tint){
    const color=tint;
    for(const p of [a,b,c]){
     basaltPositions.push(p[0],p[1],p[2]);
     basaltColors.push(color.r,color.g,color.b);
    }
   }
   const basaltSteps=450,basaltOffsets=[-.09,.035,.19,.40,.68];
   for(const side of [-1,1]){
    let prior=null;
    for(let i=0;i<=basaltSteps;i++){
     const x=-110+220*i/basaltSteps;
     const edge=center(x)+noise(x)+side*half(x);
     const chip=.035*Math.sin(x*4.6+phase*1.7)+.018*Math.sin(x*10.3-phase);
     const rough=.5+.5*Math.sin(x*13.1+side*2.6+phase);
     const heights=[-.017,.055+rough*.025,.115+rough*.050,
      .072+.025*Math.sin(x*7.9+phase*3),-.027];
     const section=basaltOffsets.map((offset,j)=>[
      x,heights[j],edge+side*(offset+chip*(j===0?.5:j===4?1.5:1))
     ]);
     if(prior){
      for(let j=0;j<basaltOffsets.length-1;j++){
       const a=prior[j],b=section[j],c=prior[j+1],d=section[j+1];
       const shade=basaltShades[(i*7+j*3+Math.floor(rough*3))%basaltShades.length];
       const nextShade=basaltShades[(i*5+j*2+2)%basaltShades.length];
       basaltTriangle(a,b,c,shade);
       basaltTriangle(b,d,c,nextShade);
      }
      // Visible vertical chipped faces, not just a flat dark outline.
      for(const j of [0,basaltOffsets.length-1]){
       const a=prior[j],b=section[j],dropY=-.058;
       basaltTriangle(a,b,[a[0],dropY,a[2]],basaltShades[0]);
       basaltTriangle(b,[b[0],dropY,b[2]],[a[0],dropY,a[2]],basaltShades[1]);
      }
     }
     // Angular basalt plates stand proud of the bank in small uneven clusters.
     if(i>2&&i<basaltSteps-2&&i%5===0){
      const z=edge+side*(.20+chip*.35),baseY=.12+rough*.032;
      const s=.10+.05*Math.sin(i*2.23+phase)**2;
      const left=[x-s,baseY-.025,z-side*.075];
      const right=[x+s,baseY-.022,z+side*.045];
      const back=[x+.03,baseY-.035,z+side*.13];
      const peak=[x-.015,baseY+.03+.045*rough,z];
      const tone=basaltShades[(i+3)%basaltShades.length];
      basaltTriangle(left,right,peak,tone);
      basaltTriangle(right,back,peak,basaltShades[(i+4)%basaltShades.length]);
      basaltTriangle(back,left,peak,basaltShades[(i+1)%basaltShades.length]);
     }
     // A few narrow rust-red fractures hint at heat under the black crust.
     if(i>3&&i<basaltSteps-3&&i%19===0){
      const z=edge+side*(.19+chip),y=heights[2]+.012;
      basaltTriangle([x-.065,y,z-side*.025],[x+.095,y,z+side*.033],
       [x+.155,y-.009,z+side*.045],basaltSeam);
     }
     prior=section;
    }
   }
   const basaltGeo=new THREE.BufferGeometry();
   basaltGeo.setAttribute('position',new THREE.Float32BufferAttribute(basaltPositions,3));
   basaltGeo.setAttribute('color',new THREE.Float32BufferAttribute(basaltColors,3));
   basaltGeo.computeVertexNormals();
   basaltGeo.computeBoundingSphere();
   const basaltMat=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.99,metalness:.02,flatShading:true,
    side:THREE.DoubleSide
   });
   const basaltBank=new THREE.Mesh(basaltGeo,basaltMat);
   basaltBank.renderOrder=5.4;g.add(basaltBank);
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
   // Denser overlapping flames follow both riverbanks and spill onto the pine.
   // These are visual meshes only: lava collision geometry remains unchanged.
   for(const side of [-1,1]){
    for(let i=0;i<25;i++){
     if(i%13===8)continue; // a few organic breaks, not a perfectly solid wall
     const x=-4.20+(i+.5)*8.40/25+(Math.random()-.5)*.13;
     const edge=center(x)+noise(x)+side*half(x);
     const z=edge+side*(.10+Math.random()*.43);
     addLivingFlame(g,x,-.01,z,.36+Math.random()*.23,
      .65+Math.random()*.46,phase+i*1.93+side*.7);
     if(i%2===0) addLivingFlame(g,x+.12,-.01,z+side*.15,
      .29+Math.random()*.15,.39+Math.random()*.39,phase+i*3.12);
     if(i%5===1) addLivingFlame(g,x-.12,-.01,z-side*.08,
      .21,.34+Math.random()*.2,phase+i*2.7);
    }
   }
   // Forest plants already travel at the same rate as each lava obstacle.
   // Anchor the fire to this river at their current positions; removing the
   // river automatically removes all of these temporary burning effects.
   let burningTrees=0,burningUndergrowth=0;
   for(const plant of scene.children){
    if(!plant.userData.recycleLength)continue;
    const x=plant.position.x;
    if(Math.abs(x)>27)continue;
    const plantZ=plant.position.z-z;
    const riverMiddle=center(x)+noise(x);
    if(Math.abs(plantZ-riverMiddle)>half(x)+.95)continue;
    const isTree=plant.children.length>1;
    if(isTree){
     if(burningTrees>=7)continue;
     burningTrees++;
     const sx=plant.scale.x,sy=plant.scale.y;
     g.userData.treeSparkSources.push({x,z:plantZ+.25,minY:.6*sy,maxY:4.0*sy});
     // Flames climb from the trunk up through each tier to the pine's crown.
     const heights=[.16,.88,1.7,2.44,3.16,3.84];
     for(let level=0;level<heights.length;level++){
      const side=level%2===0?-1:1;
      const y=heights[level]*sy;
      addLivingFlame(g,x+side*(.22+.045*level)*sx,y,
       plantZ+.31+(level%3)*.04,
       (.52+(level>1?.18:0))*sx,(level===5?.78:1.12)*sy,
       phase+x+level*1.9);
      if(level===2||level===4) addLivingFlame(g,x-side*.21*sx,y+.08*sy,
       plantZ-.18,.43*sx,.8*sy,phase+x+level*2.7);
     }
    }else{
     // Reserve a separate quota for ferns and grass so trees don't use every slot.
     if(burningUndergrowth>=9)continue;
     burningUndergrowth++;
     const h=plant.children[0].geometry.attributes.position.count>200?.62:.31;
     addLivingFlame(g,x,0,plantZ+.14,.35*plant.scale.x,
      h*plant.scale.y,phase+x+1.4);
     if(h>.4) addLivingFlame(g,x+.16,0,plantZ-.14,.25*plant.scale.x,
      h*.75*plant.scale.y,phase+x+3.3);
    }
   }
   // Scorched, bare pines and dried-out shrubs at the edge of the molten banks.
   // They belong to this river group, not to the global forest/recycling system.
   const charwood=new THREE.MeshStandardMaterial({color:0x201b1a,roughness:1});
   const charwoodTip=new THREE.MeshStandardMaterial({color:0x3b2822,roughness:1});
   const deadTrunkGeometry=new THREE.CylinderGeometry(.11,.23,1,6);
   const deadBranchGeometry=new THREE.CylinderGeometry(.045,.085,1,5);
   const upright=new THREE.Vector3(0,1,0);
   function deadStick(parent,from,to,thickness=.75,tip=false){
    const span=new THREE.Vector3().subVectors(to,from);
    const stick=new THREE.Mesh(deadBranchGeometry,tip?charwoodTip:charwood);
    stick.position.copy(from).addScaledVector(span,.5);
    stick.quaternion.setFromUnitVectors(upright,span.clone().normalize());
    stick.scale.set(thickness,span.length(),thickness);
    parent.add(stick);
   }
   function scorchedPine(x,z,h,seed,stillBurning){
    const tree=new THREE.Group();tree.position.set(x,.01,z);
    tree.rotation.y=seed*.37;
    const trunk=new THREE.Mesh(deadTrunkGeometry,charwood);
    trunk.scale.y=h;trunk.position.y=h*.5;trunk.rotation.z=Math.sin(seed)*.06;
    tree.add(trunk);
    for(let j=0;j<6;j++){
     const a=seed+j*2.39996,base=h*(.29+j*.115);
     const spread=(.64-j*.065)*(h/3.5);
     deadStick(tree,new THREE.Vector3(0,base,0),
      new THREE.Vector3(Math.cos(a)*spread,base+.27+Math.random()*.24,
       Math.sin(a)*spread),.58+j*.04,j%3===0);
    }
    g.add(tree);
    if(stillBurning){
     g.userData.treeSparkSources.push({x,z:z+.22,minY:.5,maxY:h});
     // Several flame levels, including the high branches and blackened crown.
     for(let j=0;j<4;j++){
      addLivingFlame(g,x+Math.sin(seed+j*2.1)*.18,h*(.13+j*.23),
       z+.22,.48+(j%2)*.08,.85,phase+seed+j*2.7);
     }
    }else{
     // Low remaining embers show that the wood burned earlier.
     addLivingFlame(g,x-.09,0,z+.17,.23,.3,phase+seed);
    }
   }
   function burntShrub(x,z,h,seed,stillBurning){
    const shrub=new THREE.Group();shrub.position.set(x,.005,z);
    for(let j=0;j<5;j++){
     const a=seed+j*2.39996;
     deadStick(shrub,new THREE.Vector3(0,.02,0),
      new THREE.Vector3(Math.cos(a)*(.21+j*.035),h*(.69+(j%3)*.13),
       Math.sin(a)*(.21+j*.035)),.35+(j%2)*.1,j%2===0);
    }
    g.add(shrub);
    if(stillBurning) addLivingFlame(g,x,.005,z+.14,.34,h*.9,phase+seed);
   }
   // Only a handful of trees and shrubs per crossing keeps rendering manageable.
   for(const side of [-1,1]){
    for(let j=0;j<3;j++){
     const x=side*(5.1+j*1.33+Math.random()*.4);
     const edge=center(x)+noise(x)+side*half(x);
     const z=edge+side*(.42+Math.random()*.6);
     scorchedPine(x,z,2.65+Math.random()*1.15,
      phase+j*1.53+side,j!==1);
    }
    for(let j=0;j<4;j++){
     const x=side*(4.9+j*1.0+Math.random()*.45);
     const edge=center(x)+noise(x)+side*half(x);
     burntShrub(x,edge+side*(.29+Math.random()*.78),
      .44+Math.random()*.46,phase+j*1.73+side,j%3===0);
    }
   }
   // Merge charred pine trunks and branches into a few GPU batches.
   const charParts=[
    {geometry:deadTrunkGeometry,material:charwood,matrices:[]},
    {geometry:deadBranchGeometry,material:charwood,matrices:[]},
    {geometry:deadBranchGeometry,material:charwoodTip,matrices:[]}
   ];
   g.updateMatrixWorld(true);
   const inverseRiver=new THREE.Matrix4().copy(g.matrixWorld).invert();
   const oldWoodMeshes=[];
   g.traverse(obj=>{
    if(!obj.isMesh)return;
    const batch=charParts.find(part=>part.geometry===obj.geometry&&part.material===obj.material);
    if(!batch)return;
    batch.matrices.push(new THREE.Matrix4().multiplyMatrices(inverseRiver,obj.matrixWorld));
    oldWoodMeshes.push(obj);
   });
   for(const mesh of oldWoodMeshes)mesh.parent.remove(mesh);
   for(const part of charParts){
    if(!part.matrices.length)continue;
    const batch=new THREE.InstancedMesh(part.geometry,part.material,part.matrices.length);
    part.matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));
    batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    batch.computeBoundingSphere();
    g.add(batch);
   }

   // All soft flame cards for this river now render in ONE instanced draw call.
   const cards=g.userData.fireCards;
   const fireBatch=new THREE.InstancedMesh(fireCardGeometry,fireCardMaterial,cards.length);
   const flamePivot=new THREE.Object3D();
   function animateCards(t){
    for(let i=0;i<cards.length;i++){
     const f=cards[i];
     const flicker=.88+.11*Math.sin(t*8.6+f.phase)+.065*Math.sin(t*13.9+f.phase*1.7);
     const w=f.width*(.93+.07*Math.sin(t*6.7+f.phase)),h=f.height*flicker;
     flamePivot.position.set(f.x+.035*Math.sin(t*4.5+f.phase),f.groundY+h*.48,f.z);
     flamePivot.rotation.set(0,Math.sin(f.phase)*.32,.08*Math.sin(t*5.5+f.phase));
     flamePivot.scale.set(w,h,1);
     flamePivot.updateMatrix();
     fireBatch.setMatrixAt(i,flamePivot.matrix);
    }
    fireBatch.instanceMatrix.needsUpdate=true;
   }
   animateCards(performance.now()*.001);
   fireBatch.computeBoundingSphere();
   fireBatch.renderOrder=8;
   fireBatch.onBeforeRender=()=>animateCards(performance.now()*.001);
   g.add(fireBatch);
   delete g.userData.fireCards;

   // Extra crackling sparks use ONE particle draw, even above entire burning pines.
   const sparkCount=36,sparkPositions=new Float32Array(sparkCount*3),sparkColors=new Float32Array(sparkCount*3);
   const sparkGeo=new THREE.BufferGeometry();
   const sparkPositionAttr=new THREE.BufferAttribute(sparkPositions,3);
   const sparkColorAttr=new THREE.BufferAttribute(sparkColors,3);
   sparkPositionAttr.setUsage(THREE.DynamicDrawUsage);
   sparkColorAttr.setUsage(THREE.DynamicDrawUsage);
   sparkGeo.setAttribute('position',sparkPositionAttr);
   sparkGeo.setAttribute('color',sparkColorAttr);
   sparkGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1.8,0),25);
   const sparkMat=new THREE.PointsMaterial({
    size:.085,sizeAttenuation:true,vertexColors:true,transparent:true,
    depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false
   });
   const sparkPoints=new THREE.Points(sparkGeo,sparkMat);
   sparkPoints.renderOrder=8;
   g.add(sparkPoints);
   const sparkPool=Array.from({length:sparkCount},()=>({start:-Infinity,life:0}));
   const sparkTint=new THREE.Color(0xffbb52);
   let sparkCursor=0,nextCrackle=performance.now()*.001+.25+Math.random()*.5;
   let nextTreeCrackle=performance.now()*.001+.35+Math.random()*.55;
   function launchSpark(x,y,z,fromTree=false){
    const s=sparkPool[sparkCursor++%sparkCount];
    s.start=performance.now()*.001;
    s.life=(fromTree?.65:.45)+Math.random()*(fromTree?.75:.55);
    s.x=x+(Math.random()-.5)*.16;s.y=y;s.z=z+(Math.random()-.5)*.14;
    s.vx=(Math.random()-.5)*(fromTree?.9:.45);
    s.vy=(fromTree?.75:.43)+Math.random()*(fromTree?.9:.65);
    s.vz=(Math.random()-.5)*(fromTree?.65:.35);
    s.phase=Math.random()*6.28;
   }
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
     nextCrackle=now+.35+Math.random()*.9;
     const x=-4.05+Math.random()*8.1,side=Math.random()<.5?-1:1;
     const z=center(x)+noise(x)+side*(half(x)+.07);
     for(let k=0,n=2+Math.floor(Math.random()*4);k<n;k++)
      launchSpark(x,.07+Math.random()*.17,z+side*.06);
    }
    // Distinct, intermittent crackling bursts at the branches AND crowns.
    const sources=g.userData.treeSparkSources;
    if(sources.length&&now>=nextTreeCrackle){
     nextTreeCrackle=now+.25+Math.random()*.75;
     const source=sources[(Math.random()*sources.length)|0];
     const height=source.minY+Math.random()*(source.maxY-source.minY);
     for(let k=0,n=3+Math.floor(Math.random()*5);k<n;k++)
      launchSpark(source.x,height,source.z,true);
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
   // Each river owns its own generated buffers; free them when the river leaves play.
   // Factory-wide textures, fire cards and bubble geometry remain shared and reusable.
   g.userData.dispose=()=>{
    const owned=new Set();
    g.traverse(obj=>{
     if(obj.geometry&&obj.geometry!==fireCardGeometry&&obj.geometry!==lavaBubbleGeo)
      owned.add(obj.geometry);
    });
    for(const geo of owned)geo.dispose();
    for(const material of [basaltMat,charwood,charwoodTip,sparkMat])material.dispose();
   };
   obstacles.push({g,lane:-1,type:'lava',z,passed:false});
  }
  return makeLavaRiver;
}
