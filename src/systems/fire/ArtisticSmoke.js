import {FIRE_NOISE} from './FireStudioFlames.js';
export const smokeVolumeVertex=`attribute vec4 aTint;attribute vec3 aPuff;uniform float uTime;varying vec4 vTint;varying vec3 vLocal,vNormal,vView;varying vec3 vPuff;
 void main(){vTint=aTint;vPuff=aPuff;vec3 p=position;
 p*=1.+.13*sin(position.y*5.+aPuff.x*17.)+.1*cos(position.x*6.+position.z*5.+aPuff.x*23.);
 vLocal=p;vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);vView=-view.xyz;
 vNormal=normalize(mat3(modelViewMatrix*instanceMatrix)*normal);gl_Position=projectionMatrix*view;}`;
export const smokeVolumeFragment=`uniform float uTime;varying vec4 vTint;varying vec3 vLocal,vNormal,vView,vPuff;${FIRE_NOISE}
 void main(){float facing=max(0.,dot(normalize(vNormal),normalize(vView)));
 float n=fireNoise(vLocal*2.3+vec3(vPuff.x*13.,-uTime*.16,0.));
 float body=pow(facing,1.8)*smoothstep(.13,.62,n)*(.45+.55*n);
 float alpha=body*vTint.a*.65;if(alpha<.003)discard;
 vec3 c=mix(vTint.rgb,vec3(.7,.24,.07),vPuff.z*max(0.,.5-vLocal.y)*.55);
 gl_FragColor=vec4(c*(.8+.2*facing),alpha);
 #include <colorspace_fragment>
 }`;
export const surfaceCoalVertex=`attribute vec3 aHot,aCool;attribute vec4 aCoal;uniform float uTime;varying vec3 vHot,vCool,vLocal;varying vec4 vCoal;
 void main(){vHot=aHot;vCool=aCool;vCoal=aCoal;vLocal=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`;
export const surfaceCoalFragment=`uniform float uTime;varying vec3 vHot,vCool,vLocal;varying vec4 vCoal;${FIRE_NOISE}
 void main(){float cracks=pow(max(0.,1.-abs(fireNoise(vLocal*5.+vCoal.w*17.)-.48)*8.),2.);
 float pulse=.52+.48*sin(uTime*vCoal.y*2.3+vCoal.w*29.)*sin(uTime*vCoal.y*1.7+vCoal.w*13.);
 vec3 c=mix(vCool,vHot*vCoal.x*(.4+.8*pulse),cracks);gl_FragColor=vec4(c,vCoal.z);}`;
