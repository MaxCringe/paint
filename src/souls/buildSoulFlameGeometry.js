import * as THREE from 'three';

// Builds a procedural blue soul-flame mesh without owning gameplay state.
export function buildSoulFlameGeometry(seed=0, inner=false){
 const positions=[], colors=[], indices=[];
 const heights=[-.42,-.30,-.17,-.02,.13,.29,.45,.60,.74];
 const outerR=[.11,.24,.32,.37,.35,.29,.22,.14,.055];
 const innerR=[.015,.095,.145,.17,.16,.13,.09,.045,.012];
 const radii=inner?innerR:outerR;
 const segments=24;
 const bottom=new THREE.Color(inner?0x14a5ff:0x2838b5);
 const middle=new THREE.Color(inner?0x69faff:0x24dfff);
 const tip=new THREE.Color(inner?0xffffff:0xc5ffff);

 function vertexColor(v){
  const c=new THREE.Color();
  if(v<.62)c.lerpColors(bottom,middle,v/.62);
  else c.lerpColors(middle,tip,(v-.62)/.38);
  return c;
 }
 for(let ring=0;ring<heights.length;ring++){
  const v=ring/(heights.length-1);
  const y=heights[ring];
  const centerX=.12*v*Math.sin(seed+v*3.4);
  const centerZ=.055*v*Math.cos(seed*.7+v*4.2);
  for(let j=0;j<segments;j++){
   const a=j/segments*Math.PI*2;
   const irregular=1+.13*Math.sin(a*3+seed+v*4)+.07*Math.cos(a*5-seed*.8+v*3);
   const r=radii[ring]*irregular;
   positions.push(centerX+Math.cos(a)*r,y,centerZ+Math.sin(a)*r*.78);
   const c=vertexColor(v);
   colors.push(c.r,c.g,c.b);
  }
 }
 const bottomIndex=positions.length/3;
 positions.push(0,-.43,0);
 {const c=vertexColor(0);colors.push(c.r,c.g,c.b)}
 for(let j=0;j<segments;j++){
  const next=(j+1)%segments;
  indices.push(bottomIndex,next,j);
 }
 for(let ring=0;ring<heights.length-1;ring++){
  for(let j=0;j<segments;j++){
   const next=(j+1)%segments;
   const a=ring*segments+j,b=ring*segments+next;
   const c=(ring+1)*segments+j,d=(ring+1)*segments+next;
   indices.push(a,b,c,b,d,c);
  }
 }
 const tipIndex=positions.length/3;
 const tipY=.94;
 positions.push(.15*Math.sin(seed+1.2),tipY,.04*Math.cos(seed));
 {const c=vertexColor(1);colors.push(c.r,c.g,c.b)}
 const lastRing=(heights.length-1)*segments;
 for(let j=0;j<segments;j++)indices.push(lastRing+j,lastRing+(j+1)%segments,tipIndex);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.userData.basePositions=new Float32Array(positions);
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 if(geometry.boundingSphere)geometry.boundingSphere.radius+=.18;
 return geometry;
}
