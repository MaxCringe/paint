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
  const lavaBankFlameMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.94,depthWrite:false,toneMapped:false});
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
   const flamePos=[],flameCol=[];
   const emberRed=new THREE.Color(0xff3007),emberOrange=new THREE.Color(0xff710b),emberGold=new THREE.Color(0xffb21a),emberYellow=new THREE.Color(0xffff8a);
   function addFireTri(a,b,c,ca,cb,cc){
    for(const [p,col] of [[a,ca],[b,cb],[c,cc]]){flamePos.push(p[0],p[1],p[2]);flameCol.push(col.r,col.g,col.b)}
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
    }
   }
   const flameGeo=new THREE.BufferGeometry();flameGeo.setAttribute('position',new THREE.Float32BufferAttribute(flamePos,3));flameGeo.setAttribute('color',new THREE.Float32BufferAttribute(flameCol,3));flameGeo.computeVertexNormals();flameGeo.computeBoundingSphere();
   const bankFlames=new THREE.Mesh(flameGeo,lavaBankFlameMat);bankFlames.renderOrder=7;g.add(bankFlames);
   g.userData.bankFlames=bankFlames;g.userData.bankFlamePhase=phase;
   for(let i=0;i<8;i++){const x=-105+Math.random()*210,b=new THREE.Mesh(lavaBubbleGeo,lavaBubbleMats[i%3]),sy=.018+Math.random()*.02;b.position.set(x,-.002,center(x)+(Math.random()-.5)*half(x)*.7);b.scale.set(.035+Math.random()*.05,sy,.04+Math.random()*.06);g.add(b);g.userData.bubbles.push({mesh:b,phase:Math.random()*6.28,sy})}
   obstacles.push({g,lane:-1,type:'lava',z,passed:false});
  }
  return makeLavaRiver;
}
