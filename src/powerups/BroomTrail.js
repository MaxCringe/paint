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
 // Three broad, feathered luminous ribbons in one GPU draw call.
 // Warm colours alone disappear against the orange pine road; cool pearly edges separate the magic.
 const positions=[],uvs=[],indices=[],bands=[];
 const strips=[
  {x:-.29,y:.46,z:1.26,width:.27},
  {x:0,y:.50,z:1.21,width:.34},
  {x:.29,y:.45,z:1.28,width:.27}
 ];
 const steps=18;
 for(let strip=0;strip<strips.length;strip++){
  const s=strips[strip],offset=positions.length/3;
  for(let i=0;i<=steps;i++){
   const v=i/steps;
   const z=s.z+v*4.1;
   // Smooth tail taper and an initial flare emerging from the broom head.
   const width=s.width*(1-.72*v);
   for(const side of [-1,1]){
    positions.push(s.x+side*width,s.y+.30*v,z);
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
    p.x+=sin(lengthAlong*9.0-uTime*3.1+aBand*2.3)*(.045+.21*lengthAlong);
    p.y+=sin(lengthAlong*11.0-uTime*4.2+aBand*2.1)*.10*lengthAlong;
    // Collapse the flowing ribbon toward the bristles as its magic runs out.
    float origin=1.21+(aBand==0.0?.05:(aBand==2.0?.07:0.0));
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
    // Broad soft ribbon plus a luminous inner core; fade from broom bristles to tail.
    float halo=pow(max(across,0.0),.55);
    float core=pow(max(across,0.0),5.0);
    float fade=pow(1.0-vUv.y,.85)*smoothstep(0.0,.07,vUv.y);
    float ripple=.92+.08*sin(uTime*5.0-vUv.y*13.0+vBand*2.6);
    float spark=pow(max(sin(uTime*11.0-vUv.y*21.0+vBand*3.3),0.0),15.0);
    // Magic stays visible over the orange road, without an opaque streak.
    float alpha=(halo*.74+core*.20+spark*.10)*fade*ripple*uStrength;
    float sputter=1.0-uInstability*(.18+.18*sin(uTime*14.0+vBand*2.4));
    alpha*=sputter;
    vec3 icy=vec3(.35,.73,1.0);
    vec3 pearl=vec3(1.0,.97,.84);
    vec3 lilac=vec3(.65,.52,1.0);
    vec3 rim=vBand<.5?lilac:(vBand>1.5?icy:vec3(.58,.85,1.0));
    vec3 color=mix(rim,pearl,.30+.70*core);
    color+=vec3(.32,.26,.22)*spark*core;
    // Last three seconds: cold flowing magic breaks into short copper embers.
    color=mix(color,vec3(1.0,.42,.15),uInstability*.85);
    gl_FragColor=vec4(color,clamp(alpha,0.0,.96));
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
  map:glowTexture,color:0xd7f3ff,transparent:true,opacity:.95,
  depthWrite:false,blending:THREE.AdditiveBlending
 });
 const headGlow=new THREE.Sprite(headMaterial);
 headGlow.position.set(0,.48,1.22);
 headGlow.scale.set(1.85,1.62,1);
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
  headMaterial.opacity=Math.min(.98,.93*energy);
  headMaterial.color.setHex(state.warning?0xffb675:0xd7f3ff);
  const size=(1.68+.12*Math.sin(seconds*6))*Math.max(.3,state.length);
  headGlow.scale.set(size,size*.88,1);
 }
 function hide(){
  ribbons.visible=false;
  headGlow.visible=false;
 }
 return {update,hide};
}
