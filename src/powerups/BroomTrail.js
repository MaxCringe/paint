import * as THREE from 'three';

// A diegetic broom lifetime cue: wispy lavender smoke and dying magic embers.
// The two camera-facing batches share static buffers; shader uniforms animate
// everything on the GPU without spawning objects or adding HUD elements.
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

function makeBillboardBatch(count){
 const positions=[],corners=[],seeds=[],indices=[];
 const quad=[[-1,-1],[1,-1],[-1,1],[1,1]];
 for(let i=0;i<count;i++){
  const seed=(i+.37)/count;
  const start=i*4;
  for(const c of quad){
   positions.push(0,0,0);
   corners.push(...c);
   seeds.push(seed);
  }
  indices.push(start,start+1,start+2,start+1,start+3,start+2);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('aCorner',new THREE.Float32BufferAttribute(corners,2));
 geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
 geometry.setIndex(indices);
 geometry.computeBoundingSphere();
 return geometry;
}

export function createBroomTrail(runner,glowTexture){
 const uniforms={
  uTime:{value:0},
  uLength:{value:1},
  uStrength:{value:1},
  uInstability:{value:0},
  uSparks:{value:0}
 };

 const smokeMaterial=new THREE.ShaderMaterial({
  uniforms,
  vertexShader:`
   attribute vec2 aCorner;
   attribute float aSeed;
   uniform float uTime;
   uniform float uLength;
   varying vec2 vCorner;
   varying float vAge;
   varying float vSeed;
   void main(){
    float age=fract(aSeed+uTime*.29);
    float phase=uTime*1.1+aSeed*19.0;
    // Positive local Z is behind the witch, toward the trailing camera.
    vec3 center=vec3(
     sin(phase+age*7.0)*(.075+.23*age),
     .51+.27*age+sin(phase*.65+age*10.0)*.075,
     1.48+age*3.75*uLength
    );
    float radius=(.24+.37*age)*(1.0+.12*sin(aSeed*43.0));
    vec4 viewCenter=modelViewMatrix*vec4(center,1.0);
    // Camera-facing smoke puffs remain visible even when the broom turns.
    viewCenter.xy+=aCorner*radius;
    gl_Position=projectionMatrix*viewCenter;
    vCorner=aCorner;vAge=age;vSeed=aSeed;
   }
  `,
  fragmentShader:`
   precision mediump float;
   uniform float uTime;
   uniform float uStrength;
   uniform float uInstability;
   varying vec2 vCorner;
   varying float vAge;
   varying float vSeed;
   void main(){
    float a=atan(vCorner.y,vCorner.x);
    float radial=length(vCorner);
    // Irregular fluffy edges break up the disc silhouette without textures.
    float turbulence=.075*sin(a*6.0+vSeed*23.0+uTime*.8)
                    +.048*sin(a*11.0-uTime*.65+vSeed*37.0);
    float edge=1.0-turbulence;
    float density=1.0-smoothstep(.20,edge,radial);
    float wisps=.76+.24*sin(vCorner.x*5.8+vCorner.y*4.2+vSeed*35.0+uTime*.8);
    float fadeIn=smoothstep(.0,.09,vAge);
    float fadeOut=1.0-smoothstep(.57,1.0,vAge);
    // During the landing warning, magic coughs and gaps open in the smoke.
    float choke=step(.18, .5+.5*sin(uTime*10.0+vSeed*40.0));
    float gaps=mix(1.0,.12+.88*choke,uInstability*.9);
    float alpha=density*wisps*fadeIn*fadeOut*gaps*uStrength*.43;
    vec3 pale=vec3(.90,.84,1.0);
    vec3 violet=vec3(.39,.29,.65);
    vec3 color=mix(pale,violet,smoothstep(.12,.95,vAge)*.83);
    color=mix(color,vec3(.98,.95,1.0),.25*(1.0-smoothstep(0.0,.4,radial)));
    gl_FragColor=vec4(color,clamp(alpha,0.0,.85));
   }
  `,
  side:THREE.DoubleSide,
  transparent:true,
  depthWrite:false,
  depthTest:true,
  blending:THREE.NormalBlending
 });
 const smoke=new THREE.Mesh(makeBillboardBatch(48),smokeMaterial);
 smoke.frustumCulled=false;
 smoke.visible=false;
 smoke.renderOrder=3;
 runner.add(smoke);

 const sparkMaterial=new THREE.ShaderMaterial({
  uniforms,
  vertexShader:`
   attribute vec2 aCorner;
   attribute float aSeed;
   uniform float uTime;
   uniform float uLength;
   uniform float uSparks;
   varying vec2 vCorner;
   varying float vLife;
   varying float vSeed;
   void main(){
    float speed=.68+fract(aSeed*13.0)*.95;
    float life=fract(aSeed*19.0+uTime*speed);
    float side=sin(aSeed*57.0+uTime*2.0);
    vec3 center=vec3(
     side*(.15+.54*life),
     .50+sin(aSeed*28.0+life*8.0)*.20+life*.30,
     1.48+life*(1.3+1.8*uLength)
    );
    float radius=(.022+.046*fract(aSeed*43.0))*(1.0+.25*sin(life*13.0));
    vec4 viewCenter=modelViewMatrix*vec4(center,1.0);
    viewCenter.xy+=aCorner*radius;
    gl_Position=projectionMatrix*viewCenter;
    vCorner=aCorner;
    vLife=life;
    vSeed=aSeed;
   }
  `,
  fragmentShader:`
   precision mediump float;
   uniform float uTime;
   uniform float uSparks;
   varying vec2 vCorner;
   varying float vLife;
   varying float vSeed;
   void main(){
    float disc=1.0-smoothstep(.1,1.0,length(vCorner));
    float flicker=.27+.73*pow(max(0.0,sin(uTime*17.0+vSeed*79.0)),2.0);
    // Uneven, breathless flashes. Old sparks die before another appears.
    float dying=pow(1.0-vLife,2.5)*(1.0-smoothstep(.6,.95,vLife));
    float alpha=disc*flicker*dying*uSparks;
    vec3 color=mix(vec3(.60,.49,1.0),vec3(1.0,.97,.94),.62+.28*fract(vSeed*11.0));
    gl_FragColor=vec4(color,alpha);
   }
  `,
  side:THREE.DoubleSide,
  transparent:true,
  depthWrite:false,
  depthTest:true,
  blending:THREE.AdditiveBlending
 });
 const sparks=new THREE.Mesh(makeBillboardBatch(28),sparkMaterial);
 sparks.frustumCulled=false;
 sparks.visible=false;
 sparks.renderOrder=4;
 runner.add(sparks);

 const headMaterial=new THREE.SpriteMaterial({
  map:glowTexture,color:0xe9d5ff,transparent:true,opacity:.82,
  depthWrite:false,blending:THREE.AdditiveBlending
 });
 const headGlow=new THREE.Sprite(headMaterial);
 headGlow.position.set(0,.49,1.38);
 headGlow.scale.set(1.12,.91,1);
 headGlow.visible=false;
 runner.add(headGlow);

 function update(remaining,timeMs){
  const state=broomTrailState(remaining);
  smoke.visible=state.active;
  sparks.visible=state.warning;
  headGlow.visible=state.active;
  if(!state.active)return;
  const seconds=timeMs*.001;
  uniforms.uTime.value=seconds;
  uniforms.uLength.value=state.length;
  uniforms.uInstability.value=state.instability;
  uniforms.uStrength.value=state.strength;
  // Sparks build as the plume breaks up, then gasp out in the last second.
  const stage=state.instability;
  const rise=Math.min(1,stage*2.15);
  const dying=1.0-Math.max(0,stage-.64)/.36*.88;
  uniforms.uSparks.value=state.warning?Math.max(.08,rise*dying):0;
  const stutter=state.warning?1-stage*(.10+.20*(.5+.5*Math.sin(seconds*12.5))):1;
  headMaterial.opacity=.82*state.strength*stutter;
  headGlow.scale.set(
   (1.08+.06*Math.sin(seconds*5.0))*Math.max(.4,state.length),
   (.88+.05*Math.sin(seconds*4.0))*Math.max(.4,state.length),
   1
  );
 }
 function hide(){
  smoke.visible=false;
  sparks.visible=false;
  headGlow.visible=false;
 }
 return {update,hide};
}
