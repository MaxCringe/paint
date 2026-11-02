import * as THREE from 'three';
import {createFireTongueGeometry,createFireTongueMaterial} from '../../systems/fire/FireStudioFlames.js';
import {deckToLocal} from './FirePreset.js';

// Editor-only batches: one flame draw and one spark draw for every species.
export function createEditableFire(scene,{capacity=16384}={}){
 const geometry=createFireTongueGeometry('low'),material=createFireTongueMaterial();
 const params=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4);
 const tint=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
 const style=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);
 for(const attr of [params,tint,style])attr.setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute('aInstanceParams',params);geometry.setAttribute('aTint',tint);geometry.setAttribute('aStyle',style);
 material.vertexShader='attribute vec3 aTint; attribute vec2 aStyle; varying vec3 vTint; varying vec2 vStyle;\n'+material.vertexShader;
 material.vertexShader=material.vertexShader.replace('vUv=uv;','vTint=aTint;vStyle=aStyle;vUv=uv;').replace('uTime*2.6','uTime*aStyle.x*2.6');
 material.fragmentShader='varying vec3 vTint; varying vec2 vStyle;\n'+material.fragmentShader;
 material.fragmentShader=material.fragmentShader.replace('uTime*2.9','uTime*vStyle.x*2.9').replace('min(.85,alpha)','min(.85,alpha*vStyle.y)').replace('vec4(color,','vec4(color*vTint*1.4,');
 const flames=new THREE.InstancedMesh(geometry,material,capacity);flames.count=0;flames.frustumCulled=false;flames.renderOrder=10;flames.name='WorldEditorFire';scene.add(flames);
 const sparkGeo=new THREE.BufferGeometry();
 const positions=new THREE.Float32BufferAttribute(new Float32Array(capacity*3),3),colors=new THREE.Float32BufferAttribute(new Float32Array(capacity*3),3);
 positions.setUsage(THREE.DynamicDrawUsage);colors.setUsage(THREE.DynamicDrawUsage);
 sparkGeo.setAttribute('position',positions);sparkGeo.setAttribute('color',colors);sparkGeo.setDrawRange(0,0);
 const sparkMat=new THREE.PointsMaterial({size:.07,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const sparks=new THREE.Points(sparkGeo,sparkMat);sparks.frustumCulled=false;scene.add(sparks);
 const dummy=new THREE.Object3D(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),c=new THREE.Color();
 let time=0,lastRevision=-1,revision=0,truncated=false;
 function invalidate(){revision++;}
 function update(dt,sources,preset,{moving=false}={}){
  time+=Math.min(.1,dt);material.uniforms.uTime.value=time;
  const rebuild=moving||lastRevision!==revision;let n=0,k=0;truncated=false;
  for(const {root,key,boundary} of sources){
   if(!root.parent)continue;
   const list=boundary?preset.deck:preset.plants[key];if(!list?.length)continue;
   root.updateWorldMatrix(true,false);
   for(const a of list){
    if(n>=capacity){truncated=true;break;}
    const pos=boundary?deckToLocal(a,boundary):a.position;
    c.set(a.color);
    if(rebuild){
     dummy.position.fromArray(pos);dummy.rotation.fromArray([...a.rotation,'XYZ']);dummy.scale.fromArray(a.scale);dummy.updateMatrix();matrix.multiplyMatrices(root.matrixWorld,dummy.matrix);flames.setMatrixAt(n,matrix);
     params.setXYZW(n,(n*.618)%1,a.size,a.size,a.strength);
     tint.setXYZ(n,c.r,c.g,c.b);style.setXY(n,a.speed,a.opacity);
    }
    for(let j=0;j<Math.round(a.sparks)&&k<capacity;j++){
     const phase=(time*a.speed*.32+j*.618+n*.317)%1;
     p.set(pos[0]+Math.sin(j*7+phase*11)*.15*a.size,pos[1]+phase*a.size*2,pos[2]+Math.cos(j*5+phase*8)*.15*a.size).applyMatrix4(root.matrixWorld);
     positions.setXYZ(k,p.x,p.y,p.z);const glow=(1-phase)*a.opacity;
     colors.setXYZ(k,c.r*glow,c.g*glow,c.b*glow);k++;
    }
    n++;
   }
  }
  flames.count=n;sparkGeo.setDrawRange(0,k);positions.needsUpdate=true;colors.needsUpdate=true;
  if(rebuild){flames.instanceMatrix.needsUpdate=true;params.needsUpdate=true;tint.needsUpdate=true;style.needsUpdate=true;lastRevision=revision;}
 }
 return {update,invalidate,stats:()=>({flames:flames.count,sparks:sparkGeo.drawRange.count,truncated}),dispose(){scene.remove(flames,sparks);geometry.dispose();material.dispose();sparkGeo.dispose();sparkMat.dispose();}};
}
