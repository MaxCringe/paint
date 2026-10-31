import * as THREE from 'three';

// Misty Day's embroidered shawl, modeled as a gently folded 3D textile.
// All geometry, floral artwork and materials are shared between pick-ups.
// No physics, downloaded textures or per-frame canvas allocations.
export function createScarfModelFactory(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');
 const triangle=()=>{
  ctx.beginPath();
  ctx.moveTo(5,5);ctx.lineTo(507,5);ctx.lineTo(256,507);ctx.closePath();
 };
 triangle();ctx.fillStyle='#181319';ctx.fill();
 ctx.save();triangle();ctx.clip();

 // Fine woven threads and a barely visible damask motif, on black velvet.
 for(let y=0;y<512;y+=5){
  ctx.strokeStyle=y%10===0?'#30252b':'#221c22';
  ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();
 }
 for(let x=0;x<512;x+=8){
  ctx.strokeStyle='rgba(126,102,105,.075)';
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+12,512);ctx.stroke();
 }
 for(let i=0;i<14;i++){
  const y=48+i*32;
  ctx.strokeStyle='rgba(130,101,125,.12)';ctx.lineWidth=1.4;
  ctx.beginPath();
  ctx.moveTo(115,y);ctx.quadraticCurveTo(256,y+32,397,y);ctx.stroke();
 }

 function leaf(x,y,s,angle,color='#759445'){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.fillStyle=color;ctx.strokeStyle='#d5ba6c';ctx.lineWidth=.95;
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.quadraticCurveTo(s*.40,-s*.68,s*1.04,-s*.20);
  ctx.quadraticCurveTo(s*.82,s*.39,0,0);
  ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ccd77e';ctx.lineWidth=.7;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(s*.93,-s*.18);ctx.stroke();
  ctx.restore();
 }
 function vine(points){
  ctx.lineWidth=3;ctx.strokeStyle='#749648';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(let i=1;i<points.length-1;i++){
   const x=(points[i][0]+points[i+1][0])/2;
   const y=(points[i][1]+points[i+1][1])/2;
   ctx.quadraticCurveTo(...points[i],x,y);
  }
  ctx.lineTo(...points[points.length-1]);ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='#c4ad55';ctx.stroke();
 }
 function flower(x,y,r,phase=0,color='#d53176'){
  ctx.save();ctx.translate(x,y);ctx.rotate(phase);
  for(let i=0;i<6;i++){
   ctx.save();ctx.rotate(i*Math.PI/3);
   ctx.beginPath();ctx.moveTo(0,-r*.12);
   ctx.bezierCurveTo(-r*.56,-r*.35,-r*.52,-r*1.06,0,-r*1.03);
   ctx.bezierCurveTo(r*.52,-r*1.08,r*.55,-r*.30,0,-r*.12);
   ctx.closePath();ctx.fillStyle=i%2?color:'#fa6074';ctx.fill();
   ctx.strokeStyle='#f89e6d';ctx.lineWidth=1.65;ctx.stroke();
   for(let k=-1;k<=1;k++){
    ctx.strokeStyle=k?'rgba(255,197,135,.45)':'rgba(255,231,167,.7)';
    ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(k*r*.05,-r*.22);
    ctx.quadraticCurveTo(k*r*.16,-r*.62,k*r*.10,-r*.91);
    ctx.stroke();
   }
   ctx.restore();
  }
  ctx.beginPath();ctx.arc(0,0,r*.25,0,Math.PI*2);
  ctx.fillStyle='#f2a94c';ctx.fill();
  ctx.beginPath();ctx.arc(-r*.035,-r*.03,r*.11,0,Math.PI*2);
  ctx.fillStyle='#713b24';ctx.fill();
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7;
   ctx.fillStyle='#ffe9a5';ctx.fillRect(Math.cos(a)*r*.18-1,Math.sin(a)*r*.18-1,2.2,2.2);
  }
  ctx.restore();
 }
 // Vines frame a central flower, with asymmetric flowers and coral blossoms.
 vine([[47,35],[93,88],[151,129],[221,152],[256,208]]);
 vine([[465,35],[415,83],[365,133],[292,152],[256,208]]);
 vine([[128,83],[170,193],[221,245],[255,321]]);
 vine([[388,85],[334,199],[294,257],[256,321]]);
 for(const [x,y,s,a,c] of [
  [76,76,21,-.7,'#6f983c'],[129,114,24,.3,'#9aac48'],
  [177,137,22,-.7,'#89a742'],[213,185,27,.5,'#6b8a3f'],
  [435,78,23,3.8,'#a3b943'],[394,115,26,2.8,'#63863d'],
  [346,143,23,3.7,'#7f9848'],[295,188,26,2.8,'#88a744'],
  [171,211,21,-.7,'#87a54c'],[216,261,22,.2,'#6a8a3c'],
  [339,214,23,3.6,'#90a94d'],[294,265,22,2.7,'#739449'],
  [244,305,18,-.6,'#a0af47']
 ])leaf(x,y,s,a,c);
 flower(107,76,33,-.16,'#ca3a74');
 flower(400,77,31,.4,'#d7466b');
 flower(256,175,43,.28,'#d33477');
 flower(161,192,25,.6,'#da5c56');
 flower(349,196,25,-.35,'#da5063');
 flower(255,296,21,0,'#bc2864');
 // Small golden-orange buds make the embroidery readable in the dark.
 for(const [x,y,r] of [[61,123,9],[448,127,9],[201,67,10],[306,81,12],[222,239,9],[289,237,10]]){
  ctx.fillStyle='#e98b37';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f8bb55';ctx.beginPath();ctx.arc(x-2,y-2,r*.48,0,Math.PI*2);ctx.fill();
 }
 // Embroidered hem follows both diagonal edges; top is folded, not fringed.
 ctx.strokeStyle='#a3785d';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(14,13);ctx.lineTo(256,489);ctx.lineTo(498,13);ctx.stroke();
 ctx.strokeStyle='#422c35';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(21,18);ctx.lineTo(256,473);ctx.lineTo(491,18);ctx.stroke();
 ctx.restore();

 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=4;
 const clothMat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,alphaTest:.1});
 const fringeMat=new THREE.MeshBasicMaterial({color:0x251c22,side:THREE.DoubleSide});
 const foldMat=new THREE.MeshBasicMaterial({color:0x31252c});

 const segments=16;
 const vertices=[],uv=[],indices=[];
 for(let row=0;row<=segments;row++){
  const v=row/segments;
  for(let col=0;col<=segments;col++){
   const u=col/segments;
   const x=(2*u-1)*1.08*(1-v);
   const y=.65-1.48*v+.025*Math.sin(u*11+v*8);
   const z=.12*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)
    +.055*Math.sin(u*11+v*7)+.03*Math.cos(u*17-v*5);
   vertices.push(x,y,z);
   uv.push(.5+(u-.5)*(1-v),1-v);
  }
 }
 for(let row=0;row<segments;row++){
  for(let col=0;col<segments;col++){
   const a=row*(segments+1)+col,b=a+1,c=a+segments+1,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
 }
 const clothGeo=new THREE.BufferGeometry();
 clothGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 clothGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 clothGeo.setIndex(indices);
 clothGeo.computeVertexNormals();

 // Long individual tassels along the slanted edges: one merged draw call.
 const fringeVertices=[],fringeIndices=[];
 const strands=34;
 function tassel(side,index){
  const t=(index+.65)/(strands+.6);
  const x=side*1.08*(1-t);
  const y=.65-1.48*t;
  const z=.02+.04*Math.sin(t*13);
  const len=.20+.19*(.5+.5*Math.sin(index*1.85+side))+.07*t;
  const bend=side*(.045+.045*Math.sin(index*2.23));
  const width=.010+.004*(index%3);
  const points=[
   [x,y,z],
   [x+bend*.35,y-len*.50,z+.015],
   [x+bend,y-len,z+.012]
  ];
  for(let k=0;k<2;k++){
   const base=fringeVertices.length/3;
   for(const pt of [points[k],points[k+1]]){
    fringeVertices.push(pt[0]-width,pt[1],pt[2]);
    fringeVertices.push(pt[0]+width,pt[1],pt[2]);
   }
   fringeIndices.push(base,base+1,base+2,base+1,base+3,base+2);
  }
 }
 for(const side of [-1,1])for(let i=0;i<strands;i++)tassel(side,i);
 const fringeGeo=new THREE.BufferGeometry();
 fringeGeo.setAttribute('position',new THREE.Float32BufferAttribute(fringeVertices,3));
 fringeGeo.setIndex(fringeIndices);
 fringeGeo.computeVertexNormals();
 // A substantial rolled collar adds silhouette depth when the shawl turns edge-on.
 const collarGeo=new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([
   new THREE.Vector3(-1.02,.63,.015),
   new THREE.Vector3(-.49,.61,.11),
   new THREE.Vector3(0,.57,.19),
   new THREE.Vector3(.49,.64,.11),
   new THREE.Vector3(1.02,.63,.015)
  ]),20,.049,5,false
 );
 function createModel(){
  const group=new THREE.Group();
  group.add(new THREE.Mesh(clothGeo,clothMat));
  group.add(new THREE.Mesh(fringeGeo,fringeMat));
  group.add(new THREE.Mesh(collarGeo,foldMat));
  return group;
 }
 return {createModel};
}
