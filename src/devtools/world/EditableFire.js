import * as THREE from 'three';
import {createFireTongueGeometry,FIRE_NOISE} from '../../systems/fire/FireStudioFlames.js';
import {deckToLocal} from './FirePreset.js';
import {defaultEmitter,legacyLayers,sampleEmitter,birthSchedule,hash,stringSeed} from './EffectLayers.js';

const radians=THREE.MathUtils.degToRad;
const attribute=(size,count,instanced=true)=>{const a=instanced?new THREE.InstancedBufferAttribute(new Float32Array(size*count),size):new THREE.Float32BufferAttribute(new Float32Array(size*count),size);return a.setUsage(THREE.DynamicDrawUsage);};
const flameVertex=`attribute vec4 aForm,aStyle,aMotion;attribute vec3 aBase,aMiddle,aTip;
 uniform float uTime;varying vec2 vUv;varying vec3 vBase,vMiddle,vTip;varying vec4 vStyle;varying vec2 vInfo;
 void main(){vUv=uv;vBase=aBase;vMiddle=aMiddle;vTip=aTip;vStyle=aStyle;vInfo=vec2(aForm.z,aMotion.y);
 float h=position.y,t=uTime*aStyle.x;vec3 p=position;
 float pulse=1.+aMotion.z*sin(t*3.+aStyle.w*17.);
 p.xz*=aForm.y*mix(1.,aForm.w,h);p.y*=aForm.x*pulse;
 float sway=pow(h,1.3)*aMotion.x*(sin(h*6.-t*4.+aStyle.w*9.)+.5*cos(h*10.-t*6.));
 p.x+=sway*aForm.x*.35+sin(h*17.-t*7.+aStyle.w*8.)*h*aMotion.y*.07;p.z+=sway*aForm.y*.5;
 gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);}`;
const flameFragment=`uniform float uTime;varying vec2 vUv;varying vec3 vBase,vMiddle,vTip;varying vec4 vStyle;varying vec2 vInfo;
 ${FIRE_NOISE}
 void main(){float h=vUv.y;float t=uTime*vStyle.x;
 float noise=fireNoise(vec3(vUv.x*(3.+vInfo.y*2.),h*(3.+vInfo.y*2.)-t*3.,vStyle.w*17.));
 float fringe=mix(.85,smoothstep(.1,.8,noise),vInfo.y/(1.+vInfo.y));
 float alpha=smoothstep(0.,.08,h)*(1.-smoothstep(.65,1.,h))*fringe*vStyle.y*min(1.,vInfo.x)*.82;
 if(alpha<.012)discard;
 vec3 color=h<.45?mix(vBase,vMiddle,h/.45):mix(vMiddle,vTip,(h-.45)/.55);
 color*=vStyle.z*(.7+.6*noise)*vInfo.x;gl_FragColor=vec4(color,alpha);}`;

// Four shared draws at most: volumetric flames, smoke cards, sparks/embers.
// Every buffer is allocated once. All particles have deterministic birth IDs.
export function createEditableFire(scene,{capacity=16384}={}){
 const maxFlames=Math.min(capacity,4096),maxSmoke=Math.min(capacity,4096);
 const geometry=createFireTongueGeometry('low');
 const attrs={aForm:attribute(4,maxFlames),aStyle:attribute(4,maxFlames),aMotion:attribute(4,maxFlames),aBase:attribute(3,maxFlames),aMiddle:attribute(3,maxFlames),aTip:attribute(3,maxFlames)};
 for(const [name,a] of Object.entries(attrs))geometry.setAttribute(name,a);
 const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:flameVertex,fragmentShader:flameFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const flames=new THREE.InstancedMesh(geometry,material,maxFlames);flames.name='WorldEditorFire';flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flames.count=0;flames.frustumCulled=false;flames.renderOrder=10;scene.add(flames);
 const smokeGeo=new THREE.PlaneGeometry(1,1),smokeTint=attribute(4,maxSmoke);smokeGeo.setAttribute('aTint',smokeTint);
 const smokeMat=new THREE.ShaderMaterial({vertexShader:`attribute vec4 aTint;varying vec4 vTint;varying vec2 vUv;void main(){vUv=uv;vTint=aTint;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec4 vTint;varying vec2 vUv;${FIRE_NOISE}void main(){vec2 p=vUv*2.-1.;float edge=length(p)+.10*sin(atan(p.y,p.x)*7.);float a=(1.-smoothstep(.3,1.,edge))*vTint.a*(.6+.4*fireNoise(vec3(p*3.,vTint.r*8.)));if(a<.004)discard;gl_FragColor=vec4(vTint.rgb,a);}`,
 transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const smoke=new THREE.InstancedMesh(smokeGeo,smokeMat,maxSmoke);smoke.count=0;smoke.name='WorldEditorSmoke';smoke.frustumCulled=false;smoke.renderOrder=11;smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(smoke);
 const particleGeo=new THREE.BufferGeometry(),positions=attribute(3,capacity,false),colors=attribute(4,capacity,false),sizes=attribute(1,capacity,false),kinds=attribute(1,capacity,false);
 for(const [key,a] of Object.entries({position:positions,aColor:colors,aSize:sizes,aKind:kinds}))particleGeo.setAttribute(key,a);
 particleGeo.setDrawRange(0,0);
 const particleMat=new THREE.ShaderMaterial({uniforms:{uPixelRatio:{value:1}},vertexShader:`attribute vec4 aColor;attribute float aSize,aKind;uniform float uPixelRatio;varying vec4 vColor;varying float vKind;void main(){vColor=aColor;vKind=aKind;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(aSize*uPixelRatio*500./max(.1,-mv.z),1.,90.);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying vec4 vColor;varying float vKind;void main(){vec2 p=gl_PointCoord*2.-1.;float shape=vKind>.5?length(p):abs(p.x)+abs(p.y)*.7;float a=(1.-smoothstep(.15,1.,shape))*vColor.a;if(a<.01)discard;gl_FragColor=vec4(vColor.rgb,a);}`,
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 const particles=new THREE.Points(particleGeo,particleMat);particles.frustumCulled=false;particles.name='WorldEditorParticles';particles.renderOrder=12;scene.add(particles);
 const dummy=new THREE.Object3D(),point=new THREE.Vector3(),origin=new THREE.Vector3(),velocity=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color(),end=new THREE.Color();
 const curvePoint=new THREE.Vector3(),curveOffset=new THREE.Vector3();
 const rotation=new THREE.Quaternion(),layerRotation=new THREE.Quaternion(),billboard=new THREE.Quaternion();
 const prepared=[],legacyCache=new WeakMap(),defaultShape=defaultEmitter();
 let time=0,paused=false,disposed=false,preparedCount=0,lastStats={flames:0,smoke:0,sparks:0,embers:0,anchors:0,particles:0,budget:6000,truncated:false};
 function layersFor(a){if(a.layers)return a.layers;if(!legacyCache.has(a))legacyCache.set(a,legacyLayers(a));return legacyCache.get(a);}
 function emissionPoint(r,id,out){
  sampleEmitter(r.emitter,id,out);curveOffset.set(0,0,0);
  if(r.boundary){
   curvePoint.copy(out).applyMatrix4(r.localMatrix);
   const x=THREE.MathUtils.clamp(curvePoint.x,-4.34,4.34);
   const offset=THREE.MathUtils.clamp(r.a.position[2]+r.a.side*(curvePoint.z-r.baseZ),.02,.39);
   const z=r.boundary.center(x)+r.a.side*(r.boundary.halfWidth(x)+offset);
   curveOffset.set(x-curvePoint.x,0,z-curvePoint.z).applyMatrix3(r.rootLinear);
  }
  return out;
 }
 function update(dt,sources,preset,{camera,pixelRatio=1,scroll=0}={}){
  if(disposed)return;if(!paused)time+=Math.max(0,Math.min(.1,dt));material.uniforms.uTime.value=time;particleMat.uniforms.uPixelRatio.value=pixelRatio;
  const budget=Math.min(capacity,preset.budget??6000);let n=0,m=0,k=0,sparkCount=0,emberCount=0,count=0,truncated=false;
  if(camera)camera.getWorldQuaternion(billboard);else billboard.identity();
  for(const source of sources){
   const {root,key,boundary}=source;if(!root?.parent)continue;root.updateWorldMatrix(true,false);
   const list=source.anchors??(boundary?preset.deck:preset.plants[key]);if(!list?.length)continue;
   for(const a of list){
    const layers=layersFor(a);if(!Object.values(layers).some(l=>l.enabled))continue;
    const pos=boundary?deckToLocal(a,boundary):a.position;
    dummy.position.fromArray(pos);if(source.world){dummy.position.z+=scroll;if(dummy.position.z>12)dummy.position.z-=Math.ceil((dummy.position.z-12)/200)*200;}
    dummy.rotation.set(...a.rotation);dummy.scale.fromArray(a.scale);dummy.updateMatrix();
    const item=prepared[count]??(prepared[count]={matrix:new THREE.Matrix4(),localMatrix:new THREE.Matrix4(),rootLinear:new THREE.Matrix3()});
    item.localMatrix.copy(dummy.matrix);item.rootLinear.setFromMatrix4(root.matrixWorld);item.boundary=boundary;item.baseZ=pos[2];item.matrix.multiplyMatrices(root.matrixWorld,dummy.matrix);origin.setFromMatrixPosition(item.matrix);
    const distance=camera?origin.distanceTo(camera.position):0;if(distance>220){item.boundary=null;continue;}
    item.a=a;item.layers=layers;item.emitter=a.emitter??defaultShape;item.lod=distance>90?.15:distance>40?.4:1;item.seed=stringSeed(a.id+'|'+(source.id??root.id))+preset.seed;item.scale=Math.cbrt(Math.abs(item.matrix.determinant()));count++;
   }
  }
  for(let i=count;i<preparedCount;i++){prepared[i].a=null;prepared[i].layers=null;prepared[i].boundary=null;}preparedCount=count;
  // Flames receive their share before particles, so a dense plume cannot hide
  // another object's flame. Source matrices always follow current root motion.
  for(let i=0;i<count;i++){
   const r=prepared[i],f=r.layers.flame;if(!f?.enabled)continue;
   layerRotation.setFromEuler(new THREE.Euler(radians(f.tilt),radians(f.direction),0));
   const density=Math.max(1,Math.round(f.density*r.lod));
   for(let j=0;j<density;j++){
    if(n>=maxFlames||n>=budget){truncated=true;break;}
    emissionPoint(r,r.seed+j*971,point);dummy.position.copy(point);dummy.quaternion.copy(layerRotation);if(r.emitter.shape==='cone'){rotation.setFromEuler(new THREE.Euler(radians(r.emitter.angle)*hash(r.seed+j),hash(r.seed+j+9)*6.28,0));dummy.quaternion.multiply(rotation);}dummy.scale.setScalar(1);dummy.updateMatrix();dummy.matrix.premultiply(r.matrix);dummy.matrix.elements[12]+=curveOffset.x;dummy.matrix.elements[13]+=curveOffset.y;dummy.matrix.elements[14]+=curveOffset.z;flames.setMatrixAt(n,dummy.matrix);
    attrs.aForm.setXYZW(n,f.height,f.width,f.intensity,f.fullness);attrs.aStyle.setXYZW(n,f.speed,f.opacity,f.brightness,hash(r.seed+j));attrs.aMotion.setXYZW(n,f.sway,f.turbulence,f.pulse,0);
    for(const [key,c] of [['aBase',f.colorBase],['aMiddle',f.colorMiddle],['aTip',f.colorTip]]){color.set(c);attrs[key].setXYZ(n,color.r,color.g,color.b);}n++;
   }
  }
  let requested=0;for(let i=0;i<count;i++)for(const [kind,l] of Object.entries(prepared[i].layers))if(kind!=='flame'&&l.enabled)requested+=Math.min(l.count??512,Math.ceil((l.rate??0)*l.life));
  const fairness=Math.min(1,(budget-n)/Math.max(1,requested));
  for(let i=0;i<count;i++){
   const r=prepared[i];
   for(const kind of ['smoke','sparks','embers']){
    const l=r.layers[kind];if(!l?.enabled)continue;
    const schedule=birthSchedule(l,time,r.lod*fairness);
    for(let j=0;j<schedule.count;j++){
     if(n+m+k>=budget||(kind==='smoke'?m>=maxSmoke:k>=capacity)){truncated=true;break;}
     const birth=schedule.birth(j),age=time-birth;if(birth<0||age<0||age>=l.life)continue;
     const id=(r.seed+schedule.id(j)*8191)|0,progress=age/l.life;
     emissionPoint(r,id,point);
     if(kind==='smoke'){
      point.x+=Math.sin(age*2+hash(id+5)*7)*age*l.spread*.3*l.turbulence+(hash(id+1)-.5)*l.spread*age;
      point.z+=Math.cos(age*1.7+hash(id+7)*7)*age*l.spread*.3*l.turbulence+(hash(id+2)-.5)*l.spread*age;
      if(r.emitter.shape==='cone'){const spread=Math.tan(radians(r.emitter.angle))*l.rise*age;point.x+=Math.cos(hash(id)*6.28)*spread;point.z+=Math.sin(hash(id)*6.28)*spread;}point.y+=l.rise*age;point.applyMatrix4(r.matrix).add(curveOffset);point.x+=l.windX*age;point.z+=l.windZ*age;
     }else{
      const angle=Math.min(Math.PI,radians(l.angle+(r.emitter.shape==='cone'?r.emitter.angle:0)))*Math.sqrt(hash(id+1));const azimuth=hash(id+2)*Math.PI*2;
      velocity.set(Math.sin(angle)*Math.cos(azimuth),Math.cos(angle),Math.sin(angle)*Math.sin(azimuth));
      rotation.setFromEuler(new THREE.Euler(radians(l.tilt),radians(l.direction),0));velocity.applyQuaternion(rotation).multiplyScalar(l.speed*(1+(hash(id+3)*2-1)*l.speedSpread));
      point.addScaledVector(velocity,age).applyMatrix4(r.matrix).add(curveOffset);point.y-=.5*l.gravity*age*age;point.x+=l.windX*age;point.z+=l.windZ*age;
     }
     color.set(l.colorStart);end.set(l.colorEnd);color.lerp(end,progress);
     const fade=Math.pow(1-progress,l.fade)*l.opacity;
     if(kind==='smoke'){
      dummy.position.copy(point);dummy.quaternion.copy(billboard);dummy.rotateZ(hash(id+9)*6.28);dummy.scale.setScalar((l.size+l.growth*age)*r.scale);dummy.updateMatrix();smoke.setMatrixAt(m,dummy.matrix);
      smokeTint.setXYZW(m++,color.r,color.g,color.b,fade*Math.min(1,age/.15));
     }else{
      positions.setXYZ(k,point.x,point.y,point.z);colors.setXYZW(k,color.r,color.g,color.b,fade);sizes.setX(k,l.size*(1+(hash(id+4)*2-1)*l.sizeSpread)*r.scale);kinds.setX(k,kind==='embers'?1:0);k++;if(kind==='sparks')sparkCount++;else emberCount++;
     }
    }
   }
  }
  flames.count=n;smoke.count=m;particleGeo.setDrawRange(0,k);
  flames.instanceMatrix.needsUpdate=true;smoke.instanceMatrix.needsUpdate=true;
  for(const a of [...Object.values(attrs),smokeTint,positions,colors,sizes,kinds])a.needsUpdate=true;
  lastStats={flames:n,smoke:m,sparks:sparkCount,embers:emberCount,anchors:count,particles:n+m+k,budget,truncated,drawCalls:Number(n>0)+Number(m>0)+Number(k>0),time};
 }
 return {update,invalidate(){},setPaused(value){paused=value;},get paused(){return paused;},restart(){time=0;},stats:()=>({...lastStats}),dispose(){if(disposed)return;disposed=true;scene.remove(flames,smoke,particles);flames.dispose();smoke.dispose();prepared.length=0;for(const r of [geometry,material,smokeGeo,smokeMat,particleGeo,particleMat])r.dispose();}};
}
