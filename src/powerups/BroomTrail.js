import * as THREE from 'three';

// The broom itself communicates its remaining magic instead of adding HUD clutter.
// The trail is one tiny batched GPU mesh + one shared glow sprite (no particles spawned per frame).
export function broomTrailState(remaining){
 const time=Math.max(0,Number.isFinite(remaining)?remaining:0);
 const active=time>0;
 const warning=active&&time<=3;
 const fraction=Math.min(1,time/3);
 return {
  active,
  warning,
  length:warning?.18+.82*fraction:1,
  strength:warning?.25+.75*fraction:1,
  instability:warning?1-fraction:0
 };
}

export function createBroomTrail(runner,glowTexture){
 // Three tapered ribbons, batched into a single BufferGeometry / draw call.
 const positions=[],uvs=[],indices=[],bands=[];
 const strips=[
  {x:-.23,y:.37,z:1.06,width:.135},
  {x:.04,y:.39,z:1.02,width:.16},
  {x:.28,y:.35,z:1.10,width:.115}
 ];
 const steps=18;
 for(let strip=0;strip<strips.length;strip++){
  const s=strips[strip],offset=positions.length/3;
  for(let i=0;i<=steps;i++){
   const v=i/steps;
   const z=s.z+v*3.1;
   // Smooth tail taper and an initial flare emerging from the broom head.
   const width=s.width*(1-.84*v);
   for(const side of [-1,1]){
    positions.push(s.x+side*width,s.y+.13*v,z);
    uvs.push((side+1)*.5,v);
    bands.push(strip);
   }
  }
  for(let i=0;i<steps;i++){
   const a=offset+i*2,b=a+1,c=a+2,d=a+3;
   indices.push(a,c,b,b,c,d);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('aBand',new THREE.Float32BufferAttribute(bands,1));
 geometry.setIndex(indices);
 geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({
  uniforms:{
   uTime:{value:0},
   uLength:{value:1},
   uStrength:{value:1},
   uInstability:{value:0}
  },
  vertexShader:`
   attribute float aBand;
   varying vec2 vUv;
   varying float vBand;
   uniform float uTime;
   uniform float uLength;
   void main(){
    vUv=uv;
    vBand=aBand;
    vec3 p=position;
    float lengthAlong=uv.y;
    p.x+=sin(lengthAlong*9.0-uTime*3.1+aBand*2.3)*(.025+.14*lengthAlong);
    p.y+=sin(lengthAlong*11.0-uTime*4.2+aBand*2.1)*.065*lengthAlong;
    // Collapse the flowing ribbon toward the bristles as its magic runs out.
    float origin=1.02+(aBand==0.0?.04:(aBand==2.0?.08:0.0));
    p.z=origin+(p.z-origin)*uLength;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
   }
  `,
  fragmentShader:`
   precision mediump float;
   varying vec2 vUv;
   varying float vBand;
   uniform float uTime;
   uniform float uStrength;
   uniform float uInstability;
   void main(){
    float across=1.0-abs(vUv.x*2.0-1.0);
    float glow=pow(max(across,0.0),1.4);
    float fade=pow(1.0-vUv.y,1.55)*smoothstep(0.0,.08,vUv.y);
    float ripple=.88+.12*sin(uTime*5.0-vUv.y*13.0+vBand*2.6);
    // Irregular dying embers, not a full-screen flashing warning.
    float sputter=1.0-uInstability*(.19+.17*sin(uTime*14.0+vBand*2.4));
    float alpha=glow*fade*ripple*sputter*uStrength*.55;
    vec3 copper=vec3(.83,.37,.17);
    vec3 gold=vec3(1.,.73,.40);
    vec3 color=mix(copper,gold,.54+.23*sin(vUv.y*5.0+vBand));
    color=mix(color,vec3(1.,.88,.63),pow(across,4.0)*.20);
    gl_FragColor=vec4(color,alpha);
   }
  `,
  side:THREE.DoubleSide,
  transparent:true,
  depthWrite:false,
  depthTest:true,
  blending:THREE.AdditiveBlending
 });
 const ribbons=new THREE.Mesh(geometry,material);
 ribbons.visible=false;
 ribbons.frustumCulled=false; // attached to a moving character; tiny constant cost.
 runner.add(ribbons);

 const headMaterial=new THREE.SpriteMaterial({
  map:glowTexture,color:0xf4c482,transparent:true,opacity:.62,
  depthWrite:false,blending:THREE.AdditiveBlending
 });
 const headGlow=new THREE.Sprite(headMaterial);
 headGlow.position.set(0,.37,1.02);
 headGlow.scale.set(.90,.85,1);
 headGlow.visible=false;
 runner.add(headGlow);
 function update(remaining,timeMs){
  const state=broomTrailState(remaining);
  ribbons.visible=state.active;
  headGlow.visible=state.active;
  if(!state.active)return;
  const seconds=timeMs*.001;
  material.uniforms.uTime.value=seconds;
  material.uniforms.uLength.value=state.length;
  material.uniforms.uInstability.value=state.instability;
  material.uniforms.uStrength.value=state.strength;
  const sputter=state.warning
   ?1-state.instability*(.10+.18*(.5+.5*Math.sin(seconds*16)))
   :1;
  const energy=state.strength*sputter;
  headMaterial.opacity=.55*energy;
  headMaterial.color.setHex(state.warning?0xff9c60:0xf4c482);
  const size=(.74+.10*Math.sin(seconds*6))*Math.max(.3,state.length);
  headGlow.scale.set(size,size*.9,1);
 }
 function hide(){
  ribbons.visible=false;
  headGlow.visible=false;
 }
 return {update,hide};
}
