import * as THREE from 'three';
import {createFireTongueGeometry,FIRE_NOISE} from './FireStudioFlames.js';

// Independent r160 adaptation of the requested artistic techniques. The AI Studio
// archive was not supplied; these are not claimed to be its original algorithms.
export const FLAME_FORMS={legacy:'Совместимый язык v2',tongue:'Простой вытянутый язык',forked:'Раздвоенные рваные кончики',roaring:'Широкое бушующее пламя',creeping:'Низкое стелющееся пламя',bent:'Изогнутое направленное пламя'};
export const FLAME_FORM_IDS=Object.keys(FLAME_FORMS);
export const FLAME_FORM_DEFAULTS={
 legacy:{forkStrength:0,shellOpacity:0,bend:0,curl:0},
 tongue:{forkStrength:0,shellOpacity:.18,bend:.08,curl:.18},
 forked:{forkStrength:1,shellOpacity:.24,bend:.12,curl:.55},
 roaring:{forkStrength:.35,shellOpacity:.36,bend:.15,curl:1.1},
 creeping:{forkStrength:.2,shellOpacity:.2,bend:.25,curl:.65},
 bent:{forkStrength:.15,shellOpacity:.25,bend:.75,curl:.7}
};
export function applyFlameForm(layer,form){Object.assign(layer,FLAME_FORM_DEFAULTS[form]??FLAME_FORM_DEFAULTS.tongue,{shape:form});return layer;}
export function createSculptedFlameGeometry(){
 const original=createFireTongueGeometry('low'),geometry=new THREE.BufferGeometry();
 for(const [name,attr] of Object.entries(original.attributes)){
  const values=new Float32Array(attr.array.length*2);values.set(attr.array);values.set(attr.array,attr.array.length);
  if(name==='aShellData')for(let i=attr.count;i<attr.count*2;i++)values[i*3+2]=1;
  geometry.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize));
 }
 const base=original.index.array,indices=new Uint16Array(base.length*2);indices.set(base);
 for(let i=0;i<base.length;i++)indices[base.length+i]=base[i]+original.attributes.position.count;
 geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeBoundingSphere();original.dispose();return geometry;
}
export const artisticFlameVertex=`attribute vec3 aShellData;attribute vec4 aForm,aStyle,aMotion,aSculpt;attribute vec3 aBase,aMiddle,aTip;
 uniform float uTime;varying vec2 vUv;varying vec3 vBase,vMiddle,vTip,vFacing;varying vec4 vStyle,vInfo,vDetail;
 void main(){vUv=uv;vBase=aBase;vMiddle=aMiddle;vTip=aTip;vStyle=aStyle;
 float h=uv.y,t=uTime*aStyle.x,phase=aStyle.w,form=aSculpt.x,shell=aShellData.z,angle=aShellData.y;
 vInfo=vec4(aForm.z,aMotion.y,shell,form);vDetail=vec4(aSculpt.y,aSculpt.z,0.,1.);
 vFacing=form<.5?vec3(0.,0.,1.):normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(cos(angle),.2*(1.-h),sin(angle)));
 if(shell>.5&&aSculpt.z<.001){gl_Position=vec4(2.,2.,2.,1.);return;}
 vec3 p=position;float pulse=1.+aMotion.z*sin(t*3.+phase*17.);
 if(form<.5){
  p.xz*=aForm.y*mix(1.,aForm.w,h);p.y*=aForm.x*pulse;
  float sway=pow(h,1.3)*aMotion.x*(sin(h*6.-t*4.+phase*9.)+.5*cos(h*10.-t*6.));
  p.x+=sway*aForm.x*.35+sin(h*17.-t*7.+phase*8.)*h*aMotion.y*.07;p.z+=sway*aForm.y*.5;
 }else{
  float radius=.38*pow(max(0.,sin(3.14159*h)),.65)*(1.-.25*h)+.025*(1.-h);
  float y=h,x=0.,z=0.;
  if(form>1.5&&form<2.5){
   float split=smoothstep(.32,.95,h)*aSculpt.y;
   x=sign(cos(angle))*split*.63;y=h*(1.-.2*split*(1.-abs(cos(angle))));radius*=1.+.2*split;
  }else if(form>2.5&&form<3.5){
   radius=.52*pow(max(0.,sin(3.14159*(.08+.9*h))),.55)*(1.-.24*h);
   radius*=1.+.25*sin(angle*3.+h*17.-t*(2.+phase))+.14*cos(angle*5.-h*9.+t*4.);
   y=h*(1.-.1*sin(angle*4.+phase*9.)*h);x=.12*sin(h*11.-t*3.+phase*12.)*h;
  }else if(form>3.5&&form<4.5){
   x=h*1.55;radius*=1.2;y=.13*h+.24*sin(h*3.14159);z=.18*sin(h*9.+angle*2.-t*4.)*h;
  }else if(form>4.5){
   x=aSculpt.w*aForm.x/max(.05,aForm.y)*h*h;y=sin(h*1.3)/sin(1.3);radius*=.85;
  }else{x=aSculpt.w*h*h;}
  radius*=mix(1.,aForm.w,h)*(shell>.5?1.18:1.);
  p=vec3((x+cos(angle)*radius)*aForm.y,y*aForm.x,(z+sin(angle)*radius)*aForm.y);
  float segment=sin(h*13.-t*4.+phase*17.)+cos(h*7.+t*3.+phase*11.);
  p.x+=pow(h,1.4)*segment*aMotion.x*aForm.x*.16;
  p.z+=sin(h*16.-t*5.+angle*2.+phase*19.)*h*aMotion.w*aForm.y*.16;
  p.y*=1.+aMotion.z*.12*sin(t*(3.+phase)+phase*31.);
  vDetail.w=1.+aMotion.z*.6*pow(max(0.,sin(t*(4.2+phase)+phase*39.)),10.);
 }
 vDetail.z=p.x/max(.05,aForm.y);
 gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);}`;
export const artisticFlameFragment=`uniform float uTime;varying vec2 vUv;varying vec3 vBase,vMiddle,vTip,vFacing;varying vec4 vStyle,vInfo,vDetail;
 ${FIRE_NOISE}
 void main(){float h=vUv.y,t=uTime*vStyle.x,form=vInfo.w;
 float noise=fireNoise(vec3(vUv.x*(3.+vInfo.y*2.),h*(3.+vInfo.y*2.)-t*3.,vStyle.w*17.));
 float fringe=mix(.85,smoothstep(.1,.8,noise),vInfo.y/(1.+vInfo.y));
 float alpha=smoothstep(0.,.08,h)*(1.-smoothstep(.65,1.,h))*fringe*vStyle.y*min(1.,vInfo.x)*.82;
 if(form>.5){
  float n2=fireNoise(vec3(vUv.x*13.+vStyle.w*7.,h*11.-t*(5.+vStyle.w),vInfo.z+vStyle.w*9.));
  float tips=1.-smoothstep(.82,1.04,h+(1.-n2)*.14*vInfo.y);
  alpha=smoothstep(0.,.065,h)*tips*(.35+.65*fringe)*vStyle.y*min(1.,vInfo.x)*.88;
  alpha*=.25+.75*pow(abs(normalize(vFacing).z),.4);
  if(form>1.5&&form<2.5){float gap=max(0.,h-.46)*vDetail.x*.67;alpha*=mix(1.,smoothstep(gap-.035,gap+.025,abs(vDetail.z)),smoothstep(.48,.68,h));}
 }
 alpha*=vInfo.z>.5?vDetail.y:1.;if(alpha<.008)discard;
 vec3 color=h<.45?mix(vBase,vMiddle,h/.45):mix(vMiddle,vTip,(h-.45)/.55);
 color*=vStyle.z*(.7+.6*noise)*vInfo.x*vDetail.w*(vInfo.z>.5?.82:1.);
 gl_FragColor=vec4(color,alpha);}`;
