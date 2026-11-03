// Adapted from the user's Google AI Studio Fire Studio: an inexpensive,
// animated, low-poly volumetric flame shell compatible with Three.js r160.
import * as THREE from 'three';

export function createFireTongueGeometry(quality='low') {
 const radial=quality==='high'?12:quality==='medium'?9:7;
 const vertical=quality==='high'?18:quality==='medium'?13:9;
 const positions=[],normals=[],uv=[],triangles=[],shell=[];
 const layers=quality==='low'?1:2;
 for(let layer=0;layer<layers;layer++){
  const offset=positions.length/3;
  for(let y=0;y<=vertical;y++){
   const v=y/vertical;
   const profile=(.14+.86*Math.pow(Math.sin(Math.min(1,v*2.2)*Math.PI/2),.65)*Math.pow(1-v,.78))*(layer?1.28:1);
   for(let r=0;r<=radial;r++){
    const u=r/radial,angle=u*2*Math.PI+v*(layer?-1.65:1.15);
    const lobes=1+.22*Math.sin(angle*3+v*2.5)+.12*Math.cos(angle*2-v*1.8);
    positions.push(Math.cos(angle)*profile*lobes*.42,v,Math.sin(angle)*profile*lobes*.42);
    normals.push(Math.cos(angle),.25*(1-v),Math.sin(angle));
    uv.push(u,v);shell.push(lobes,angle,layer);
   }
  }
  for(let y=0;y<vertical;y++)for(let r=0;r<radial;r++){
   const a=offset+y*(radial+1)+r,b=a+1,c=a+radial+1,d=c+1;
   triangles.push(a,b,d,a,d,c);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('aShellData',new THREE.Float32BufferAttribute(shell,3));
 geo.setIndex(triangles);geo.computeBoundingSphere();
 return geo;
}

export const FIRE_NOISE=String.raw`
float fireHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float fireNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(fireHash(i),fireHash(i+vec3(1,0,0)),f.x),
 mix(fireHash(i+vec3(0,1,0)),fireHash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(fireHash(i+vec3(0,0,1)),fireHash(i+vec3(1,0,1)),f.x),
 mix(fireHash(i+vec3(0,1,1)),fireHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

export function createFireTongueMaterial(){
 return new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uHeight:{value:1.65},uWidth:{value:1.20},uOpacity:{value:.94}},
  vertexShader:String.raw`
  attribute vec3 aShellData;
  attribute vec4 aInstanceParams;
  uniform float uTime,uHeight,uWidth;
  varying vec2 vUv;
  varying vec3 vSurface;
  varying float vPhase,vActivity,vOuter;
  void main(){
   vUv=uv;vPhase=aInstanceParams.x;vActivity=aInstanceParams.w;vOuter=aShellData.z;
   float h=position.y,t=uTime*2.6+vPhase*6.28318;
   float width=uWidth*aInstanceParams.z*(.5+.5*vActivity);
   float height=uHeight*aInstanceParams.y*(.42+.58*vActivity);
   vec3 p=position;
   p.xz*=width;p.y*=height;
   float sway=pow(h,1.25)*(.24*sin(h*5.-t*2.)+.15*cos(h*8.-t*3.));
   p.x+=sway+.08*h*sin(t+vPhase*12.);
   p.z+=.7*sway+.06*h*cos(t*.8+vPhase*7.);
   vSurface=p;
   vec4 world=modelMatrix*instanceMatrix*vec4(p,1.);
   gl_Position=projectionMatrix*viewMatrix*world;
  }`,
  fragmentShader:String.raw`
  uniform float uTime,uOpacity;
  varying vec2 vUv;
  varying vec3 vSurface;
  varying float vPhase,vActivity,vOuter;
  ${FIRE_NOISE}
  void main(){
   if(vActivity<.02)discard;
   float h=clamp(vUv.y,0.,1.);
  float t=uTime*2.9+vPhase*8.;
   vec3 p=vec3(vSurface.x*3.1,h*3.6-t*1.4,vSurface.z*3.1);
   float n=.58*fireNoise(p)+.29*fireNoise(p*2.1+vec3(0.,-t,1.));
   float body=smoothstep(0.,.09,h)*(1.-smoothstep(.71,1.03,h+(1.-n)*.13));
   float fringe=smoothstep(.18,.68,n);
   float alpha=body*(.46+.54*fringe)*(vOuter>.5?.50:1.)*uOpacity*.67*vActivity;
    if(alpha<.035)discard;
    vec3 red=vec3(.69,.05,.012),orange=vec3(1.,.31,.018),gold=vec3(1.,.84,.39);
   vec3 color=mix(red,orange,smoothstep(.12,.55,fringe));
    color=mix(color,gold,smoothstep(.50,.9,fringe)*(1.-h*.66));
    gl_FragColor=vec4(color,min(.85,alpha));
  }`,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
  blending:THREE.NormalBlending,toneMapped:false,forceSinglePass:true
 });
}
