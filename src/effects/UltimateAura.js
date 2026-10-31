import * as THREE from 'three';

// Visual-only effect; disabling this module leaves the ultimate's gameplay intact.
export const ULT_AURA_ENABLED = true;
export const ULT_AURA_STYLE = Object.freeze({
 outerBlue:0x2275ff,
 innerBlue:0x91eaff,
 intensity:1.0,
 animationSpeed:1.0,
 lightIntensity:1.5
});
const vertexShader = `
 varying vec2 vUv;
 void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
 }
`;
const fragmentShader = `
 uniform float uTime;
 uniform float uOpacity;
 uniform vec3 uOuterBlue;
 uniform vec3 uInnerBlue;
 varying vec2 vUv;

 float hash(vec2 p) {
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
 }
 float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(
   mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
   mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),
   f.y
  );
 }
 void main() {
  float y=vUv.y, x=vUv.x-0.5;
  // Continuous rising blue flame, not discrete particles or sphere outlines.
  float broad=noise(vec2(x*5.0+uTime*.18,y*4.1-uTime*.9));
  float detail=noise(vec2(x*10.0-uTime*.12,y*8.6-uTime*1.5));
  float drift=.055*sin(y*11.5-uTime*3.0)+(broad-.5)*.095;
  float dx=x-drift;
  float width=mix(.30,.10,smoothstep(.18,1.0,y))+(detail-.5)*.075;
  float flame=1.0-smoothstep(width-.11,width+.16,abs(dx));
  float vertical=smoothstep(.015,.23,y)*(1.0-smoothstep(.76,1.0,y));
  float body=flame*vertical*(.70+.30*detail);
  // Broad falloff melts away without a hard edge or visible ring.
  float halo=exp(-pow(dx*3.05,2.0)-pow((y-.48)*2.35,2.0));
  float alpha=clamp((body*.68+halo*.47)*uOpacity,0.0,.88);
  if(alpha<.004)discard;
  float core=exp(-pow(dx*5.4,2.0))*body;
  vec3 color=mix(uOuterBlue,uInnerBlue,clamp(core*1.45,0.0,1.0));
  color*=.94+.12*sin(uTime*3.1+detail*4.8);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;

export function createUltimateAura(runner) {
 if(!ULT_AURA_ENABLED)return {update(){},reset(){},dispose(){}};
 const group=new THREE.Group();
 group.visible=false;
 runner.add(group);
 const clock={value:0};
 const colors={
  uOuterBlue:{value:new THREE.Color(ULT_AURA_STYLE.outerBlue)},
  uInnerBlue:{value:new THREE.Color(ULT_AURA_STYLE.innerBlue)}
 };
 const geometry=new THREE.PlaneGeometry(1,1);
 const materials=[];
 function layer(width,height,y,z,opacity,order){
  const material=new THREE.ShaderMaterial({
   uniforms:{uTime:clock,uOpacity:{value:opacity*ULT_AURA_STYLE.intensity},...colors},
   vertexShader,fragmentShader,transparent:true,
   blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
   side:THREE.DoubleSide
  });
  const plane=new THREE.Mesh(geometry,material);
  plane.position.set(0,y,z);
  plane.scale.set(width,height,1);
  plane.frustumCulled=false;
  plane.renderOrder=order;
  plane.castShadow=false;plane.receiveShadow=false;
  group.add(plane);materials.push(material);
 }
 // Two soft transparent flame planes preserve Fiona's silhouette.
 layer(3.15,4.05,1.34,-.66,.94,3);
 layer(2.45,3.65,1.31,.56,.40,4);
 const blueLight=new THREE.PointLight(
  ULT_AURA_STYLE.outerBlue,ULT_AURA_STYLE.lightIntensity,5.5,2
 );
 blueLight.position.set(0,1.25,.06);
 group.add(blueLight);
 function update(timeMs,active){
  group.visible=!!active;
  if(active)clock.value=timeMs*.001*ULT_AURA_STYLE.animationSpeed;
 }
 function reset(){group.visible=false;}
 function dispose(){
  runner.remove(group);
  geometry.dispose();
  for(const material of materials)material.dispose();
 }
 return {update,reset,dispose};
}
