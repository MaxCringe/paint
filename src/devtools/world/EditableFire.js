import {computeAnchorWeight as originalAnchorWeight} from '../../systems/fire/original/Math.js';
import {sharedFireGeometries} from '../../systems/fire/original/Geometry.js';
import {createOriginalBatchMaterial,createSurfaceCoalGeometry} from '../../systems/fire/OriginalRendererAdapter.js';
import {createSculptedFlameGeometry,artisticFlameVertex,artisticFlameFragment,FLAME_FORM_IDS} from '../../systems/fire/ArtisticFire.js';
import {computeBurnCycleState,computeAnchorWeight,defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {smokeVolumeVertex,smokeVolumeFragment,surfaceCoalVertex,surfaceCoalFragment} from '../../systems/fire/ArtisticSmoke.js';
import * as THREE from 'three';
import {FIRE_NOISE} from '../../systems/fire/FireStudioFlames.js';
import {deckToLocal} from './FirePreset.js';
import {defaultEmitter,legacyLayers,sampleEmitter,birthSchedule,hash,stringSeed} from './EffectLayers.js';

const radians=THREE.MathUtils.degToRad;
const attribute=(size,count,instanced=true)=>{const a=instanced?new THREE.InstancedBufferAttribute(new Float32Array(size*count),size):new THREE.Float32BufferAttribute(new Float32Array(size*count),size);return a.setUsage(THREE.DynamicDrawUsage);};
// Six shared draws at most (including the optional original-flame batch): flames, cards, volumetric smoke, flight particles and surface coals.
// Every buffer is allocated once. All particles have deterministic birth IDs.
export function createEditableFire(scene,{capacity=16384}={}){
 const maxFlames=Math.min(capacity,4096),maxSmoke=Math.min(capacity,4096);
 const geometry=createSculptedFlameGeometry();
 const attrs={aSculpt:attribute(4,maxFlames),aForm:attribute(4,maxFlames),aStyle:attribute(4,maxFlames),aMotion:attribute(4,maxFlames),aBase:attribute(3,maxFlames),aMiddle:attribute(3,maxFlames),aTip:attribute(3,maxFlames)};
 for(const [name,a] of Object.entries(attrs))geometry.setAttribute(name,a);
 const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:artisticFlameVertex,fragmentShader:artisticFlameFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false});
 const flames=new THREE.InstancedMesh(geometry,material,maxFlames);flames.name='WorldEditorFire';flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flames.count=0;flames.frustumCulled=false;flames.renderOrder=10;scene.add(flames);
 const smokeGeo=new THREE.PlaneGeometry(1,1),smokeTint=attribute(4,maxSmoke);smokeGeo.setAttribute('aTint',smokeTint);const smokeWarm=attribute(3,maxSmoke);smokeGeo.setAttribute('aWarm',smokeWarm);const smokePuff=attribute(3,maxSmoke);smokeGeo.setAttribute('aPuff',smokePuff);
 const smokeMat=new THREE.ShaderMaterial({vertexShader:`attribute vec4 aTint;attribute vec3 aWarm;varying vec3 vWarm;attribute vec3 aPuff;varying vec3 vPuff;varying vec4 vTint;varying vec2 vUv;void main(){vUv=uv;vTint=aTint;vPuff=aPuff;vWarm=aWarm;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vWarm;varying vec3 vPuff;varying vec4 vTint;varying vec2 vUv;${FIRE_NOISE}void main(){vec2 p=vUv*2.-1.;float edge=length(p)+.10*sin(atan(p.y,p.x)*7.);float a=(1.-smoothstep(.3,1.,edge))*vTint.a*(.6+.4*fireNoise(vec3(p*3.,vPuff.x*19.)));if(a<.004)discard;vec3 c=mix(vTint.rgb,vWarm,vPuff.z*(1.-vUv.y)*.4);gl_FragColor=vec4(c,a);}`,
 transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const smoke=new THREE.InstancedMesh(smokeGeo,smokeMat,maxSmoke);smoke.count=0;smoke.name='WorldEditorSmoke';smoke.frustumCulled=false;smoke.renderOrder=11;smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(smoke);
 const maxVolume=Math.min(capacity,512),volumeGeo=new THREE.IcosahedronGeometry(1,1),volumeTint=attribute(4,maxVolume),volumePuff=attribute(4,maxVolume),volumeWarm=attribute(3,maxVolume);
 volumeGeo.setAttribute('aWarm',volumeWarm);volumeGeo.setAttribute('aTint',volumeTint);volumeGeo.setAttribute('aPuff',volumePuff);
 const volumeMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:smokeVolumeVertex,fragmentShader:smokeVolumeFragment,transparent:true,depthWrite:false,toneMapped:false});
 const volumeSmoke=new THREE.InstancedMesh(volumeGeo,volumeMat,maxVolume);volumeSmoke.name='WorldEditorVolumeSmoke';volumeSmoke.count=0;volumeSmoke.frustumCulled=false;volumeSmoke.renderOrder=11;volumeSmoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(volumeSmoke);
 const maxCoals=Math.min(capacity,2048),coalGeo=createSurfaceCoalGeometry(THREE,sharedFireGeometries.getEmberNodeGeometry()),coalHot=attribute(3,maxCoals),coalCool=attribute(3,maxCoals),coalParams=attribute(4,maxCoals);
 coalGeo.setAttribute('aHot',coalHot);coalGeo.setAttribute('aCool',coalCool);coalGeo.setAttribute('aCoal',coalParams);
 const coalMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:surfaceCoalVertex,fragmentShader:surfaceCoalFragment,transparent:true,depthWrite:false,toneMapped:false});
 const surfaceCoals=new THREE.InstancedMesh(coalGeo,coalMat,maxCoals);surfaceCoals.name='WorldEditorSurfaceCoals';surfaceCoals.count=0;surfaceCoals.frustumCulled=false;surfaceCoals.renderOrder=10;surfaceCoals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(surfaceCoals);
 const particleGeo=new THREE.BufferGeometry(),positions=attribute(3,capacity,false),colors=attribute(4,capacity,false),sizes=attribute(1,capacity,false),kinds=attribute(1,capacity,false);
 for(const [key,a] of Object.entries({position:positions,aColor:colors,aSize:sizes,aKind:kinds}))particleGeo.setAttribute(key,a);
 particleGeo.setDrawRange(0,0);
 const particleMat=new THREE.ShaderMaterial({uniforms:{uPixelRatio:{value:1}},vertexShader:`attribute vec4 aColor;attribute float aSize,aKind;uniform float uPixelRatio;varying vec4 vColor;varying float vKind;void main(){vColor=aColor;vKind=aKind;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(aSize*uPixelRatio*500./max(.1,-mv.z),1.,90.);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying vec4 vColor;varying float vKind;void main(){vec2 p=gl_PointCoord*2.-1.;float shape=vKind>.5?length(p):abs(p.x)+abs(p.y)*.7;if(vKind>1.5){float r=dot(p,p);if(r>1.)discard;gl_FragColor=vec4(vColor.rgb*(1.+.45*(1.-r)),exp(-r*3.2)*vColor.a);return;}float a=(1.-smoothstep(.15,1.,shape))*vColor.a;if(a<.01)discard;gl_FragColor=vec4(vColor.rgb,a);}`,
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 const particles=new THREE.Points(particleGeo,particleMat);particles.frustumCulled=false;particles.name='WorldEditorParticles';particles.renderOrder=12;scene.add(particles);
 const dummy=new THREE.Object3D(),point=new THREE.Vector3(),origin=new THREE.Vector3(),velocity=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color(),end=new THREE.Color();
 const curvePoint=new THREE.Vector3(),curveOffset=new THREE.Vector3();
 const rotation=new THREE.Quaternion(),layerRotation=new THREE.Quaternion(),billboard=new THREE.Quaternion();
 let studioLight=null,studioMesh=null,studioMaterial=null,studioAttrs=null,previewQuality='high',playbackSpeed=1;
 const studioGeometries=new Map(),maxStudio=Math.min(capacity,512);
 function ensureStudio(quality){
  if(!studioMesh){studioMaterial=createOriginalBatchMaterial();studioAttrs=Object.fromEntries(Object.entries({aForm:4,aStyle:4,aMotion:4,aExtra:4,aEnvelope:4,aBase:3,aMiddle:3,aTip:3}).map(([k,n])=>[k,attribute(n,maxStudio)]));}
  if(!studioGeometries.has(quality)){const geo=sharedFireGeometries.getFlameTongueGeometry(quality).clone();for(const [k,v] of Object.entries(studioAttrs))geo.setAttribute(k,v);studioGeometries.set(quality,geo);}
  if(!studioMesh){studioMesh=new THREE.InstancedMesh(studioGeometries.get(quality),studioMaterial,maxStudio);studioMesh.name='FireStudioOriginalFlames';studioMesh.frustumCulled=false;studioMesh.renderOrder=10;scene.add(studioMesh);}studioMesh.geometry=studioGeometries.get(quality);
 }
 function releaseStudio(){if(!studioMesh)return;scene.remove(studioMesh);studioMesh.dispose();studioMaterial.dispose();for(const g of studioGeometries.values())g.dispose();studioGeometries.clear();studioMesh=null;studioMaterial=null;studioAttrs=null;}
 const cycleClocks=new Map();let frameId=0;
 const prepared=[],legacyCache=new WeakMap(),defaultShape=defaultEmitter();
 let time=0,paused=false,disposed=false,preparedCount=0,lastStats={flames:0,smoke:0,sparks:0,embers:0,anchors:0,particles:0,budget:6000,truncated:false};
 function layersFor(a){if(a.layers)return a.layers;if(!legacyCache.has(a))legacyCache.set(a,legacyLayers(a));return legacyCache.get(a);}
 function emissionPoint(r,id,out){
  sampleEmitter(r.emitter,id,out);return projectBoundary(r,out);
 }
 function projectBoundary(r,out){
  curveOffset.set(0,0,0);
  if(r.boundary){
   curvePoint.copy(out).applyMatrix4(r.localMatrix);
   const x=THREE.MathUtils.clamp(curvePoint.x,-4.34,4.34);
   const offset=THREE.MathUtils.clamp(r.a.position[2]+r.a.side*(curvePoint.z-r.baseZ),.02,.39);
   const z=r.boundary.center(x)+r.a.side*(r.boundary.halfWidth(x)+offset);
   curveOffset.set(x-curvePoint.x,0,z-curvePoint.z).applyMatrix3(r.rootLinear);
  }
  return out;
 }
 function cycleStateFor(source,delta){
  const id=source.id??source.root.id,cycle=source.cycle??defaultBurnCycle();
  let clock=cycleClocks.get(id);if(!clock){clock={progress:cycle.stage,stage:cycle.stage,mode:cycle.mode,frame:-1};cycleClocks.set(id,clock);}
  if(clock.frame===frameId)return clock.state;
  if(cycle.mode==='auto'&&(clock.mode!==cycle.mode||clock.stage!==cycle.stage))clock.progress=cycle.stage;
  clock.stage=cycle.stage;
  clock.mode=cycle.mode;clock.speed=cycle.speed;clock.duration=cycle.duration;
  if(cycle.mode==='auto'&&!cycle.paused)clock.progress+=delta*cycle.speed/cycle.duration;
  clock.state=computeBurnCycleState(cycle,clock.progress);clock.frame=frameId;
  return clock.state;
 }
 function update(dt,sources,preset,{camera,pixelRatio=1,scroll=0,fixedTime,phase:fixedPhase}={}){
  if(disposed)return;frameId++;const delta=paused?0:Math.max(0,Math.min(.1,dt))*playbackSpeed;time=fixedTime===undefined?time+delta:fixedTime;material.uniforms.uTime.value=time;volumeMat.uniforms.uTime.value=time;coalMat.uniforms.uTime.value=time;particleMat.uniforms.uPixelRatio.value=pixelRatio;
  const budget=Math.min(capacity,preset.budget??6000);let shellEnabled=false,n=0,o=0,studioTier=1,m=0,v=0,c=0,originalCoals=0,coalsOpaque=true,lightDistance=Infinity,lightX=0,lightY=0,lightZ=0,lightIntensity=0,lightColor=0xff7722,k=0,sparkCount=0,emberCount=0,count=0,truncated=false;
  if(camera)camera.getWorldQuaternion(billboard);else billboard.identity();
  for(const source of sources){
   const {root,key,boundary}=source;if(!root?.parent)continue;root.updateWorldMatrix(true,false);
   const burn=cycleStateFor(source,delta);
   const list=source.anchors??(boundary?preset.deck:preset.plants[key]);if(!list?.length)continue;
   for(const a of list){
    const layers=layersFor(a),weights=computeAnchorWeight(a.position[1]/(source.height??1),burn);if(!Object.entries(layers).some(([kind,l])=>l.enabled&&(weights[kind]??1)>.005))continue;
    const pos=boundary?deckToLocal(a,boundary):a.position;
    dummy.position.fromArray(pos);if(source.world){dummy.position.z+=scroll;if(dummy.position.z>12)dummy.position.z-=Math.ceil((dummy.position.z-12)/200)*200;}
    dummy.rotation.set(...a.rotation);dummy.scale.fromArray(a.scale);dummy.updateMatrix();
    const item=prepared[count]??(prepared[count]={matrix:new THREE.Matrix4(),localMatrix:new THREE.Matrix4(),rootLinear:new THREE.Matrix3()});
    item.localMatrix.copy(dummy.matrix);item.rootLinear.setFromMatrix4(root.matrixWorld);item.boundary=boundary;item.baseZ=pos[2];item.matrix.multiplyMatrices(root.matrixWorld,dummy.matrix);origin.setFromMatrixPosition(item.matrix);
    const distance=camera?origin.distanceTo(camera.position):0;if(layers.flame?.enabled&&layers.flame.shape==='studio'&&distance<30&&(layers.flame.light??0)>0&&distance<lightDistance){const f=layers.flame;lightDistance=distance;lightX=origin.x;lightY=origin.y+2.2*Math.cbrt(Math.abs(item.matrix.determinant()));lightZ=origin.z;lightIntensity=f.light*f.intensity*3.4*(f.studioMode==='smoldering'?.45:.55+.45*weights.flame);lightColor=f.colorMiddle;}if(distance>220){item.boundary=null;continue;}
    item.a=a;item.height=source.height??1;item.layers=layers;item.weights=weights;item.emitter=a.emitter??defaultShape;item.lod=distance>90?.15:distance>40?.4:1;item.seed=stringSeed(a.id+'|'+(source.id??root.id))+(a.original?.seed??preset.seed);item.scale=Math.cbrt(Math.abs(item.matrix.determinant()));count++;
   }
  }
  for(let i=count;i<preparedCount;i++){prepared[i].a=null;prepared[i].layers=null;prepared[i].boundary=null;}preparedCount=count;
  // Flames receive their share before particles, so a dense plume cannot hide
  // another object's flame. Source matrices always follow current root motion.
  for(let i=0;i<count;i++){
   const r=prepared[i],f=r.layers.flame;if(!f?.enabled||r.weights.flame<.005)continue;
   if((f.shellOpacity??0)>.001)shellEnabled=true;
   layerRotation.setFromEuler(new THREE.Euler(radians(f.tilt),radians(f.direction),0));
   const density=Math.max(1,Math.round(f.density*r.lod*r.weights.flame));
   for(let j=0;j<density;j++){
    if(n+o>=maxFlames||n+o>=budget||f.shape==='studio'&&o>=maxStudio){truncated=true;break;}
    emissionPoint(r,r.seed+j*971,point);dummy.position.copy(point);dummy.quaternion.copy(layerRotation);if(r.emitter.shape==='cone'){rotation.setFromEuler(new THREE.Euler(radians(r.emitter.angle)*hash(r.seed+j),hash(r.seed+j+9)*6.28,0));dummy.quaternion.multiply(rotation);}dummy.scale.setScalar(1);dummy.updateMatrix();dummy.matrix.premultiply(r.matrix);dummy.matrix.elements[12]+=curveOffset.x;dummy.matrix.elements[13]+=curveOffset.y;dummy.matrix.elements[14]+=curveOffset.z;if(f.shape==='studio'){
     const tier=Math.min(f.octaves??2,{low:1,medium:2,high:3}[previewQuality]);studioTier=Math.max(studioTier,tier);ensureStudio(['low','medium','high'][studioTier-1]);studioMesh.setMatrixAt(o,dummy.matrix);
     const phase=fixedPhase??hash(r.seed+j),h=f.height*(1+(hash(r.seed+j*71)-.5)*2*f.variation),w=f.width*(1+(hash(r.seed+j*317)-.5)*f.variation);
     studioAttrs.aForm.setXYZW(o,h,w,f.intensity,r.weights.flame*(f.studioMode==='tree'?1:originalAnchorWeight(r.a.position[1]/r.height,0,f.studioMode,0)));studioAttrs.aStyle.setXYZW(o,f.speed,f.opacity,f.brightness,phase);studioAttrs.aMotion.setXYZW(o,f.sway,tier,f.shellOpacity,{tree:0,lava:1,smoldering:2}[f.studioMode]??0);studioAttrs.aEnvelope.setXYZW(o,f.pulse,f.turbulence,f.bend,f.curl);studioAttrs.aExtra.setXYZW(o,(hash(r.seed+j*17)-.5)*1.3,(hash(r.seed+j*37)-.5)*1.3,f.forkStrength,hash(r.seed+j*91)*10);
     for(const [key,c] of [['aBase',f.colorBase],['aMiddle',f.colorMiddle],['aTip',f.colorTip]]){color.set(c);studioAttrs[key].setXYZ(o,color.r,color.g,color.b);}o++;continue;
    }flames.setMatrixAt(n,dummy.matrix);
    const variation=f.variation??0;attrs.aForm.setXYZW(n,f.height*(1+(hash(r.seed+j*71)-.5)*2*variation),f.width*(1+(hash(r.seed+j*317)-.5)*variation),f.intensity*r.weights.flame,f.fullness);attrs.aSculpt.setXYZW(n,Math.max(0,FLAME_FORM_IDS.indexOf(f.shape??'legacy')),f.forkStrength??0,f.shellOpacity??0,f.bend??0);attrs.aStyle.setXYZW(n,f.speed,f.opacity,f.brightness,fixedPhase??hash(r.seed+j));attrs.aMotion.setXYZW(n,f.sway,f.turbulence,f.pulse,f.curl??0);
    for(const [key,c] of [['aBase',f.colorBase],['aMiddle',f.colorMiddle],['aTip',f.colorTip]]){color.set(c);attrs[key].setXYZ(n,color.r,color.g,color.b);}n++;
   }
  }
  for(let i=0;i<count;i++){
   const r=prepared[i],l=r.layers.coals;if(!l?.enabled||r.weights.coals<.005)continue;
   const amount=Math.max(1,Math.round(l.count*r.lod));color.set(l.colorHot);end.set(l.colorCool);
   for(let j=0;j<amount;j++){
    if(n+o+c>=budget||c>=maxCoals){truncated=true;break;}
    if(l.opacity<.999)coalsOpaque=false;
    const id=r.seed+j*171;emissionPoint(r,id,point);
    point.x+=(hash(id+3)-.5)*l.spread;point.z+=(hash(id+7)-.5)*l.spread;projectBoundary(r,point);
    dummy.position.copy(point);dummy.rotation.set(0,hash(id+5)*6.28,0);const size=l.size*(1+(hash(id+11)*2-1)*l.sizeSpread);if(l.style==='studio'){dummy.scale.setScalar(size);originalCoals++;}else dummy.scale.set(size,size*.32,size*.75);dummy.updateMatrix();dummy.matrix.premultiply(r.matrix);
    dummy.matrix.elements[12]+=curveOffset.x;dummy.matrix.elements[13]+=curveOffset.y;dummy.matrix.elements[14]+=curveOffset.z;
    surfaceCoals.setMatrixAt(c,dummy.matrix);coalHot.setXYZ(c,color.r,color.g,color.b);coalCool.setXYZ(c,end.r,end.g,end.b);coalParams.setXYZW(c,l.glow*r.weights.coals,l.pulseSpeed,l.opacity*r.weights.coals,l.style==='studio'?-(hash(id)+.01):hash(id));c++;
   }
  }
  let requested=0;for(let i=0;i<count;i++)for(const [kind,l] of Object.entries(prepared[i].layers))if(kind!=='flame'&&kind!=='coals'&&l.enabled)requested+=Math.min(l.count??512,Math.ceil((l.rate??0)*l.life));
  const fairness=Math.min(1,(budget-n-o-c)/Math.max(1,requested));
  for(let i=0;i<count;i++){
   const r=prepared[i];
   for(const kind of ['smoke','sparks','embers']){
    const l=r.layers[kind];if(!l?.enabled||(r.weights[kind]??1)<.005)continue;
    const schedule=birthSchedule(l,time,r.lod*fairness*(r.weights[kind]??1));
    for(let j=0;j<schedule.count;j++){
     if(n+o+c+m+v+k>=budget||(kind==='smoke'?m>=maxSmoke:k>=capacity)){truncated=true;break;}
     const birth=schedule.birth(j),age=time-birth;if(birth<0||age<0||age>=l.life)continue;
     const id=(r.seed+schedule.id(j)*8191)|0,progress=age/l.life;
     emissionPoint(r,id,point);
     if(kind==='smoke'){
      const kindFactor=l.kind==='stream'?.22:l.kind==='column'?.55:l.kind==='low'?1.8:1;
      if(l.kind==='studio'){const angle=hash(id)*12+progress*3.5,drift=progress*.85*l.spread/.4*l.turbulence;point.x+=Math.cos(angle)*drift;point.z+=Math.sin(angle)*drift;point.y+=progress*(3.2+l.size*1.8)*(l.rise/.65);}else{
      point.x+=Math.sin(age*2+hash(id+5)*7)*age*l.spread*.3*l.turbulence*kindFactor+(hash(id+1)-.5)*l.spread*age*kindFactor;
      point.z+=Math.cos(age*1.7+hash(id+7)*7)*age*l.spread*.3*l.turbulence*kindFactor+(hash(id+2)-.5)*l.spread*age*kindFactor;
      }
      if(r.emitter.shape==='cone'){const spread=Math.tan(radians(r.emitter.angle))*l.rise*age;point.x+=Math.cos(hash(id)*6.28)*spread;point.z+=Math.sin(hash(id)*6.28)*spread;}if(l.kind!=='studio')point.y+=l.rise*age*(l.kind==='low'?.25:l.kind==='stream'?1.2:1);point.applyMatrix4(r.matrix).add(curveOffset);point.x+=l.windX*age;point.z+=l.windZ*age;
     }else{
      const angle=Math.min(Math.PI,radians(l.angle+(r.emitter.shape==='cone'?r.emitter.angle:0)))*Math.sqrt(hash(id+1));const azimuth=hash(id+2)*Math.PI*2;
      velocity.set(Math.sin(angle)*Math.cos(azimuth),Math.cos(angle),Math.sin(angle)*Math.sin(azimuth));
      rotation.setFromEuler(new THREE.Euler(radians(l.tilt),radians(l.direction),0));velocity.applyQuaternion(rotation).multiplyScalar(l.speed*(1+(hash(id+3)*2-1)*l.speedSpread));
      if(l.trajectory==='spiral'){const phase=hash(id),a=phase*25+progress*7.5,rad=(.08+progress*.65)*(1+(hash(id+3)-.5)*l.speedSpread);point.x+=Math.cos(a)*rad;point.z+=Math.sin(a)*rad;point.y+=progress*(2.6+l.speed*2.2);}else point.addScaledVector(velocity,age);point.applyMatrix4(r.matrix).add(curveOffset);point.y-=.5*l.gravity*age*age;point.x+=l.windX*age;point.z+=l.windZ*age;
     }
     color.set(l.colorStart);end.set(l.colorEnd);color.lerp(end,progress);if(kind!=='smoke')color.multiplyScalar(l.brightness??1);if(l.trajectory==='spiral')color.multiplyScalar(.6+.4*Math.sin(time*18+hash(id)*45));
     const fade=Math.pow(kind==='smoke'&&l.kind==='studio'?THREE.MathUtils.smoothstep(progress,0,.22)*(1-THREE.MathUtils.smoothstep(progress,.35,1)):1-progress,l.fade)*l.opacity*(r.weights[kind]??1);
     if(kind==='smoke'){
      dummy.position.copy(point);const size=(l.size+l.growth*age)*r.scale,opacity=fade*(l.kind==='studio'?1:Math.min(1,age/.15));
      if(l.quality==='volume'&&previewQuality!=='low'&&r.lod>.4&&v<maxVolume){
       dummy.rotation.set(hash(id+13)*3,hash(id+17)*6,hash(id+19)*3);dummy.scale.set(size*(.8+hash(id+23)*.4),size*(.85+hash(id+29)*.5),size);dummy.updateMatrix();volumeSmoke.setMatrixAt(v,dummy.matrix);
       end.set(l.colorWarm??'#da864b');volumeWarm.setXYZ(v,end.r,end.g,end.b);volumeTint.setXYZW(v,color.r,color.g,color.b,opacity);volumePuff.setXYZW(v,hash(id),l.kind==='studio'?progress:l.turbulence,l.warmth??0,l.kind==='studio'?1:0);v++;
      }else{dummy.quaternion.copy(billboard);dummy.rotateZ(hash(id+9)*6.28);dummy.scale.setScalar(size);dummy.updateMatrix();smoke.setMatrixAt(m,dummy.matrix);end.set(l.colorWarm??'#da864b');smokeWarm.setXYZ(m,end.r,end.g,end.b);smokeTint.setXYZW(m,color.r,color.g,color.b,opacity);smokePuff.setXYZ(m,hash(id),l.turbulence,l.warmth??0);m++;}
     }else{
      positions.setXYZ(k,point.x,point.y,point.z);colors.setXYZW(k,color.r,color.g,color.b,fade);sizes.setX(k,l.size*(1+(hash(id+4)*2-1)*l.sizeSpread)*r.scale*(l.trajectory==='spiral'?.22+.78*Math.sin(progress*Math.PI):1));kinds.setX(k,kind==='embers'?1:l.trajectory==='spiral'?2:0);k++;if(kind==='sparks')sparkCount++;else emberCount++;
     }
    }
   }
  }
  if(lightIntensity>0){if(!studioLight){studioLight=new THREE.PointLight(0xff7722,0,22,1.5);studioLight.name='FireStudioSharedLight';scene.add(studioLight);}studioLight.position.set(lightX,lightY,lightZ);studioLight.color.set(lightColor);studioLight.intensity=Math.min(8,lightIntensity*(.88+.12*Math.sin(time*11.3)+.08*Math.cos(time*19.7)));}else if(studioLight)studioLight.intensity=0;
  coalMat.depthWrite=c>0&&originalCoals===c&&coalsOpaque;surfaceCoals.renderOrder=coalMat.depthWrite?5:10;
  const crackedCount=coalGeo.userData.crackedCount;coalGeo.setDrawRange(originalCoals===c?crackedCount:0,originalCoals===0?crackedCount:originalCoals===c?coalGeo.getAttribute('position').count-crackedCount:Infinity);
  if(studioMesh){studioMesh.count=o;studioMesh.visible=o>0;studioMesh.instanceMatrix.needsUpdate=true;studioMaterial.uniforms.uTime.value=time;for(const a of Object.values(studioAttrs))a.needsUpdate=true;}
  geometry.setDrawRange(0,geometry.index.count/(shellEnabled?1:2));
  flames.count=n;smoke.count=m;volumeSmoke.count=v;surfaceCoals.count=c;particleGeo.setDrawRange(0,k);
  flames.visible=n>0;smoke.visible=m>0;volumeSmoke.visible=v>0;surfaceCoals.visible=c>0;particles.visible=k>0;
  flames.instanceMatrix.needsUpdate=true;smoke.instanceMatrix.needsUpdate=true;volumeSmoke.instanceMatrix.needsUpdate=true;surfaceCoals.instanceMatrix.needsUpdate=true;
  for(const a of [...Object.values(attrs),smokeTint,smokePuff,smokeWarm,volumeTint,volumePuff,volumeWarm,coalHot,coalCool,coalParams,positions,colors,sizes,kinds])a.needsUpdate=true;
  lastStats={flames:n+o,originalFlames:o,smoke:m+v,smokeCards:m,smokeVolume:v,coals:c,sparks:sparkCount,embers:emberCount,anchors:count,particles:n+o+m+v+c+k,budget,truncated,drawCalls:Number(n>0)+Number(o>0)+Number(m>0)+Number(v>0)+Number(c>0)+Number(k>0),time};
 }
 return {update,releaseUnused(){if(studioMesh?.count===0)releaseStudio();if(studioLight?.intensity===0){scene.remove(studioLight);studioLight.dispose();studioLight=null;}},setQuality(value){if(['low','medium','high'].includes(value))previewQuality=value;},setPlaybackSpeed(value){playbackSpeed=Math.max(.1,Math.min(3,value));},invalidate(){},setPaused(value){paused=value;},get paused(){return paused;},restart(){time=0;for(const clock of cycleClocks.values())clock.progress=0;},restartCycle(id){const clock=cycleClocks.get(id);if(clock){clock.progress=0;clock.mode='auto';}},cycleProgress(id){return cycleClocks.get(id)?.state??null;},seek(value){time=Math.max(0,value);for(const c of cycleClocks.values())if(c.mode==='auto')c.progress=c.stage+time*c.speed/c.duration;},stats:()=>({...lastStats}),dispose(){if(disposed)return;disposed=true;scene.remove(flames,smoke,volumeSmoke,surfaceCoals,particles);flames.dispose();smoke.dispose();volumeSmoke.dispose();surfaceCoals.dispose();prepared.length=0;cycleClocks.clear();if(studioLight){scene.remove(studioLight);studioLight.dispose();}releaseStudio();for(const r of [geometry,material,smokeGeo,smokeMat,volumeGeo,volumeMat,coalGeo,coalMat,particleGeo,particleMat])r.dispose();}};
}
