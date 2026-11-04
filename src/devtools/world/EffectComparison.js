import * as THREE from 'three';
import {createEditableFire} from './EditableFire.js';
import {PINE_SPECIES,newEffectAnchor,upgradePreset} from './FirePreset.js';
import {EFFECT_PRESETS,defaultLayer,applyEffectPreset,copy} from './EffectLayers.js';
import {FLAME_FORMS,applyFlameForm} from '../../systems/fire/ArtisticFire.js';
import {defaultBurnCycle} from '../../systems/fire/ArtisticBurnCycle.js';
import {getPineFireProfile} from '../../systems/fire/ForestFireStudio.js';
import {createLowPolyPine} from '../../world/LowPolyPine.js';
import {EDITOR_BUILD} from './EditorBuild.js';

if(!EDITOR_BUILD.editorEnabled){document.body.textContent='Редактор отключён в этой сборке.';}else{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#13151b');
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.prepend(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(48,1,.1,150);
 const hemi=new THREE.HemisphereLight(0xff8b76,0x120308,1.45),sun=new THREE.DirectionalLight(0xff3927,2.8),work=new THREE.HemisphereLight(0xffecd1,0x849478,2.5);sun.position.set(-8,35,8);scene.add(hemi,sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:'#252229',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
 const preset=upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]});preset.budget=2400;
 const engine=createEditableFire(scene);const groups={forms:[],compositions:[],stages:[],originals:[]};
 const labels=document.querySelector('.labels'),labelNodes=[];
 const add=(view,id,x,z,anchors,{model,cycle,height=1,label=id}={})=>{
  const root=model??new THREE.Group();root.position.set(x,0,z);scene.add(root);
  const source={root,key:'world',id,height,anchors,cycle:cycle??defaultBurnCycle(),label};groups[view].push(source);
  const element=document.createElement('span');element.textContent=label;labels.append(element);labelNodes.push({view,element,source});return source;
 };
 const forms=['tongue','forked','roaring','creeping','bent'];
 for(const [i,shape] of forms.entries()){
  const a=newEffectAnchor([0,0,0]);a.id='same-phase';a.layers={flame:applyFlameForm({...defaultLayer('flame'),height:1.8,width:1,density:1,variation:0,sway:.18,turbulence:.7,speed:1,pulse:0,colorBase:'#ffb14a',colorMiddle:'#ffb14a',colorTip:'#ffb14a'},shape)};
  add('forms',shape,(i-2)*3.6,0,[a],{label:FLAME_FORMS[shape]});
 }
 for(const [i,id] of ['campfire','inferno','darkSmoke','smolder'].entries()){
  const a=applyEffectPreset(newEffectAnchor([0,.1,0]),EFFECT_PRESETS[id]);a.id='composition:'+id;
  add('compositions',id,(i-1.5)*4.4,0,[a],{label:EFFECT_PRESETS[id].name});
 }
 for(const [i,id] of ['original:tree','original:lava','original:smoldering'].entries()){const a=applyEffectPreset(newEffectAnchor([0,.1,0]),EFFECT_PRESETS[id]);a.id=id;add('originals',id,(i-1)*4.4,0,[a],{label:EFFECT_PRESETS[id].name});}
 const profile=getPineFireProfile('pine:grove_cluster');
 for(const [i,stage] of [.2,.55,.95].entries()){
  const model=createLowPolyPine('grove_cluster');model.scale.setScalar(.55);
  const anchors=profile.anchors.map((p,j)=>{const a=newEffectAnchor([p.x,p.y,p.z]);a.id='tree:'+j;a.layers={flame:{...defaultLayer('flame'),shape:'roaring',height:.9,width:.55,density:2,variation:.4,shellOpacity:.25},smoke:{...defaultLayer('smoke'),quality:'volume',rate:3,size:.24,growth:.24,life:3,rise:.35},coals:{...defaultLayer('coals'),count:3,size:.15,spread:.12}};return a;});
  add('stages','stage:'+stage,(i-1)*5,0,anchors,{model,height:profile.height,cycle:{...defaultBurnCycle(),mode:'manual',stage,repeat:false},label:['Низ — стадия 0.20','Середина/крона — 0.55','Тление — 0.95'][i]});
 }
 let view='forms',angle='front',time=1.25,running=false,last=performance.now();
 function aim(){
  const target=view==='stages'?new THREE.Vector3(0,1.8,0):new THREE.Vector3(0,1.05,0);
  const radius=view==='stages'?17:view==='forms'?18:18;
  camera.position.copy(target).add(angle==='top'?new THREE.Vector3(0,radius,.001):angle==='side'?new THREE.Vector3(radius*.75,3,radius*.75):new THREE.Vector3(0,3,radius));camera.lookAt(target);camera.updateMatrixWorld(true);
 }
 function render(){
  for(const [name,list] of Object.entries(groups))for(const s of list)s.root.visible=name===view;
  engine.update(0,groups[view],preset,{camera,fixedTime:time,phase:view==='forms'?0:undefined});renderer.render(scene,camera);
  const point=new THREE.Vector3();for(const {view:which,element,source} of labelNodes){element.hidden=which!==view;if(which===view){source.root.getWorldPosition(point);point.y=-.15;point.project(camera);element.style.left=(point.x*.5+.5)*innerWidth+'px';element.style.top=(-point.y*.5+.5)*innerHeight+'px';}}
  const stats=engine.stats();document.getElementById('status').textContent=`seed 1337 · t=${time.toFixed(2)} с · ${stats.flames} языков · дым ${stats.smokeCards} карт/${stats.smokeVolume} объёмных клубов · ${stats.coals} участков тления · ${stats.drawCalls} пакетных вызовов`;
 }
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();aim();render();}
 document.getElementById('build').textContent='r'+EDITOR_BUILD.revision+' · '+EDITOR_BUILD.commit.slice(0,7)+(EDITOR_BUILD.dirty?' · рабочая копия':'');
 const api={setView(value){view=value;document.getElementById('view').value=value;aim();render();},setAngle(value){angle=value;document.getElementById('angle').value=value;aim();render();},setTime(value){time=value;document.getElementById('time').value=value;render();},setRunning(value){running=value;document.getElementById('play').textContent=value?'Пауза':'Продолжить анимацию';},setLighting(value){if(value==='work')scene.add(work);else scene.remove(work);render();},snapshot(){return {build:EDITOR_BUILD,view,angle,time,stats:engine.stats(),forms:groups.forms.map(s=>({id:s.id,...s.anchors[0].layers.flame})),stages:groups.stages.map(s=>({id:s.id,stage:s.cycle.stage}))};},captureMasks(){
   render();const output=document.createElement('canvas');output.width=renderer.domElement.width;output.height=renderer.domElement.height;const ctx=output.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,output.width,output.height).data;
   return groups.forms.map(source=>{const samples=[];const corners=[];for(const x of [-1.6,2])for(const y of [0,2.4])for(const z of [-.8,.8]){const p=new THREE.Vector3(source.root.position.x+x,y,z).project(camera);corners.push([(p.x*.5+.5)*output.width,(-p.y*.5+.5)*output.height]);}
    const left=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),right=Math.min(output.width-1,Math.ceil(Math.max(...corners.map(p=>p[0])))),top=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),bottom=Math.min(output.height-1,Math.ceil(Math.max(...corners.map(p=>p[1]))));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const i=(y*output.width+x)*4;if(pixels[i]>75&&pixels[i]>pixels[i+1]*1.13&&pixels[i+1]>pixels[i+2]*1.2)samples.push([x,y]);}
    if(!samples.length)return {id:source.id,area:0,mask:[]};
    const minX=Math.min(...samples.map(p=>p[0])),maxX=Math.max(...samples.map(p=>p[0])),minY=Math.min(...samples.map(p=>p[1])),maxY=Math.max(...samples.map(p=>p[1]));const mask=new Array(64*64).fill(0);
    for(const [x,y] of samples){const nx=Math.min(63,Math.floor((x-minX)/Math.max(1,maxX-minX)*63)),ny=Math.min(63,Math.floor((y-minY)/Math.max(1,maxY-minY)*63));mask[ny*64+nx]=1;}
    return {id:source.id,area:samples.length,box:[minX,minY,maxX,maxY],mask};
   });
  }};
 window.__fireComparison=api;
 document.getElementById('view').onchange=e=>api.setView(e.target.value);document.getElementById('angle').onchange=e=>api.setAngle(e.target.value);document.getElementById('time').onchange=e=>api.setTime(Math.max(0,Number(e.target.value)||0));document.getElementById('light').onchange=e=>api.setLighting(e.target.value);document.getElementById('play').onclick=()=>api.setRunning(!running);
 addEventListener('resize',resize);resize();
 function frame(now){if(running){time+=Math.min(.05,(now-last)/1000);document.getElementById('time').value=time.toFixed(2);}last=now;render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
