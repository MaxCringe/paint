import * as THREE from 'three';
import {createForestFireStudio} from './ForestFireStudio.js';
import {createLowPolyPine} from '../../world/LowPolyPine.js';
import {createScotsPine} from '../../world/forest/FacetedPine.js';

const canvas=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x160e15);
const camera=new THREE.PerspectiveCamera(48,1,.1,150);
scene.add(new THREE.HemisphereLight(0xf5a47d,0x241723,2.2));
const light=new THREE.DirectionalLight(0xfcb98b,2.1);light.position.set(-4,12,8);scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x3a2924,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.015;scene.add(ground);
const grid=new THREE.GridHelper(25,25,0x684336,0x44332f);grid.position.y=.002;scene.add(grid);
const fire=createForestFireStudio(scene,{maxTrees:1,quality:'medium',burnSeconds:30});
let current=null,angle=.4,pitch=.16,radius=13,targetHeight=2.8;
function disposeTree(tree){
 if(!tree)return;scene.remove(tree);
 const geometries=new Set(),materials=new Set();
 tree.traverse(obj=>{if(!obj.isMesh)return;geometries.add(obj.geometry);
  for(const m of Array.isArray(obj.material)?obj.material:[obj.material])materials.add(m);
 });
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
function selectTree(name){
 fire.reset();disposeTree(current);
 current=name==='scots_pine'?createScotsPine():createLowPolyPine(name);
 current.userData.plantSpecies='pine:'+name;
 current.scale.set(.75,.88,.75);scene.add(current);
 current.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(current);
 targetHeight=Math.max(1.2,bounds.max.y*.44);
 radius=Math.max(11,bounds.max.y*1.65);
 fire.igniteTree(current);
}
const select=document.getElementById('tree');
select.addEventListener('change',()=>selectTree(select.value));
document.getElementById('ignite').addEventListener('click',()=>fire.igniteTree(current)||(
 fire.reset(),fire.igniteTree(current)
));
selectTree(select.value);
let dragging=false,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('pointermove',e=>{
 if(!dragging)return;
 angle+=(e.clientX-lastX)*.008;pitch=Math.max(-.4,Math.min(.85,pitch+(e.clientY-lastY)*.006));
 lastX=e.clientX;lastY=e.clientY;
});
canvas.addEventListener('wheel',e=>{radius=Math.max(5,Math.min(35,radius+e.deltaY*.016));e.preventDefault()},{passive:false});
function resize(){
 const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
const metrics=document.getElementById('metrics');let last=performance.now(),clock=last,frames=0;
function frame(now){
 const dt=Math.min((now-last)*.001,.05);last=now;
 fire.update(dt);
 camera.position.set(Math.sin(angle)*radius,Math.sin(pitch)*radius+targetHeight,Math.cos(angle)*radius);
 camera.lookAt(0,targetHeight,0);
 renderer.render(scene,camera);
 frames++;
 if(now-clock>600){
  const stats=fire.getStats();
  metrics.textContent='FPS '+Math.round(frames*1000/(now-clock))+
   ' | огонь '+stats.flames+' | искры '+stats.sparks+
   ' | Draw calls '+renderer.info.render.calls;
  clock=now;frames=0;
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
