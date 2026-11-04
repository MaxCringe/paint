import {SIMPLEX_NOISE_GLSL} from './original/Shaders.js';
import {FIRE_NOISE} from './FireStudioFlames.js';
export const smokeVolumeVertex=`attribute vec4 aTint;attribute vec3 aWarm;attribute vec4 aPuff;uniform float uTime;varying vec4 vTint;varying vec3 vLocal,vNormal,vView;varying vec4 vPuff;varying vec3 vWarm;
 void main(){vTint=aTint;vPuff=aPuff;vWarm=aWarm;vec3 p=position;
 p*=1.+.13*sin(position.y*5.+aPuff.x*17.)+.1*cos(position.x*6.+position.z*5.+aPuff.x*23.);
 vLocal=p;vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);vView=-view.xyz;
 vNormal=normalize(mat3(modelViewMatrix*instanceMatrix)*normal);gl_Position=projectionMatrix*view;}`;
export const smokeVolumeFragment=`uniform float uTime;varying vec4 vTint;varying vec3 vLocal,vNormal,vView;varying vec4 vPuff;varying vec3 vWarm;${FIRE_NOISE}${SIMPLEX_NOISE_GLSL}
 void main(){float facing=max(0.,dot(normalize(vNormal),normalize(vView)));
 float n=fireNoise(vLocal*2.3+vec3(vPuff.x*13.,-uTime*.16,0.));
 float body=pow(facing,1.8)*smoothstep(.13,.62,n)*(.45+.55*n);
 if(vPuff.w>.5){float n= noise3D(vLocal*2.2+vec3(0.,-uTime*.6+vPuff.x*5.,0.));body=pow(facing,.85)*smoothstep(.22,.78,n+.25);}
 float alpha=body*vTint.a*(vPuff.w>.5?1.:.65);if(alpha<.003)discard;
 vec3 c=mix(vTint.rgb,vWarm,vPuff.z*(vPuff.w>.5?1.-smoothstep(0.,.55,vPuff.y):max(0.,.5-vLocal.y)*.55));
 gl_FragColor=vec4(c*(.8+.2*facing),alpha);
 if(vPuff.w<.5){
 #include <colorspace_fragment>
 }
 }`;
export const surfaceCoalVertex=`attribute vec3 aHot,aCool;attribute vec4 aCoal,aCoalShape;uniform float uTime;varying vec3 vHot,vCool,vLocal;varying vec4 vCoal;
 void main(){vHot=aHot;vCool=aCool;vCoal=aCoal;vLocal=aCoalShape.w>.5?aCoalShape.xyz:position;if(abs(aCoalShape.w-(aCoal.w<0.?1.:0.))>.1){gl_Position=vec4(2.,2.,2.,1.);return;}gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`;
export const surfaceCoalFragment=`uniform float uTime;varying vec3 vHot,vCool,vLocal;varying vec4 vCoal;${FIRE_NOISE}${SIMPLEX_NOISE_GLSL}
 void main(){float cracks=pow(max(0.,1.-abs(fireNoise(vLocal*5.+vCoal.w*17.)-.48)*8.),2.);
 float pulse=.52+.48*sin(uTime*vCoal.y*2.3+vCoal.w*29.)*sin(uTime*vCoal.y*1.7+vCoal.w*13.);
 vec3 c=mix(vCool,vHot*vCoal.x*(.4+.8*pulse),cracks);if(vCoal.w<0.){float phase=abs(vCoal.w),pulse=.55+.45*sin(uTime*3.4*vCoal.y+phase*15.);float heat=clamp(noise3D(vLocal*9.+vec3(phase*4.,uTime*.5*vCoal.y,0.))*pulse*.95,0.,1.);c=mix(vec3(.06,.04,.04),mix(vCool,vHot,smoothstep(.45,.88,heat))*vCoal.x*1.35,smoothstep(.22,.68,heat));}
 gl_FragColor=vec4(c,vCoal.z);}`;
