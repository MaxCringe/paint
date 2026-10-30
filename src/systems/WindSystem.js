import * as THREE from 'three';

// Strengths in percent; disable WIND_ENABLED to return to static vegetation.
// V2: visible canopy sway and directional low-frequency gusts with no new draw calls.
export const WIND_ENABLED=true;
export const WIND_PERCENT=Object.freeze({
 steady:60,
 gusts:72,
 pines:75,
 ferns:75,
 grass:80,
 ash:35
});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const pct=n=>clamp(n,0,100)/100;

// GPU bending affects the outer parts of each fern or grass blade; the roots stay planted.
function attachWindShader(material,kind,uniforms){
 if(!material)return;
 const amplitude=kind==='grass'?.35*pct(WIND_PERCENT.grass):.75*pct(WIND_PERCENT.ferns);
 const weight=kind==='grass'
  ?'pow(clamp(position.y / .35, 0.0, 1.0), 1.6)'
  :'pow(clamp(length(position.xz) / 1.05, 0.0, 1.0), 1.7)';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('void main() {',
   'uniform float kpWindTime;\nuniform float kpWindStrength;\nuniform vec2 kpWindDirection;\nvoid main() {');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',[
   '#include <begin_vertex>',
   'vec3 kpWorld=(modelMatrix*vec4(position,1.0)).xyz;',
   'vec3 kpDirection=vec3(kpWindDirection.x,0.0,kpWindDirection.y);',
   'vec2 kpLocalDirection=normalize(vec2(dot(modelMatrix[0].xyz,kpDirection),dot(modelMatrix[2].xyz,kpDirection)));',
   'float kpWave=sin(kpWindTime*1.15+kpWorld.z*.085+kpWorld.x*.21);',
   'float kpGust=pow(max(0.0,sin(kpWindTime*.43+kpWorld.z*.048-kpWorld.x*.08)),2.0);',
   'float kpWeight='+weight+';',
   'float kpBend=kpWindStrength*'+amplitude.toFixed(3)+'*kpWeight*(.08+.68*kpWave+.24*kpGust);',
   'transformed.x+=kpLocalDirection.x*kpBend;',
   'transformed.z+=kpLocalDirection.y*kpBend;'
  ].join('\n'));
 };
 material.customProgramCacheKey=()=>'knotty-wind-'+kind+'-v1';
 material.needsUpdate=true;
}
export function createWindSystem(roadsideVegetation){
 const current={x:0,z:0,strength:0};
 if(!WIND_ENABLED)return {current,reset(){},update(){}};
 const direction=new THREE.Vector2(.94,.34).normalize();
 const uniforms={
  kpWindTime:{value:0},
  kpWindStrength:{value:0},
  kpWindDirection:{value:direction}
 };
 const pines=[];
 let fernMaterial=null,grassMaterial=null;
 for(const plant of roadsideVegetation){
  const kind=plant.userData.windKind;
  if(kind==='pine'){
   pines.push({
    plant,baseX:plant.rotation.x,baseZ:plant.rotation.z,
    velocityX:0,velocityZ:0,
    phase:plant.position.x*.13+plant.position.z*.043,
    flexibility:clamp(1.15/plant.scale.y,.64,1.37)
   });
  }else if(kind==='fern'&&!fernMaterial)fernMaterial=plant.children[0]?.material;
  else if(kind==='grass'&&!grassMaterial)grassMaterial=plant.children[0]?.material;
 }
 attachWindShader(fernMaterial,'fern',uniforms);
 attachWindShader(grassMaterial,'grass',uniforms);
 let time=0;
 const p=WIND_PERCENT;
 function reset(){
  time=0;
  current.x=current.z=current.strength=0;
  uniforms.kpWindTime.value=0;
  uniforms.kpWindStrength.value=0;
  for(const pine of pines){
   pine.plant.rotation.x=pine.baseX;
   pine.plant.rotation.z=pine.baseZ;
   pine.velocityX=pine.velocityZ=0;
  }
 }
 function update(dt){
  if(dt<=0)return;
  dt=Math.min(dt,.04);time+=dt;
  // Moving gust bands influence all vegetation and the existing airborne ash.
  const steady=pct(p.steady),gusts=pct(p.gusts);
  const broadGust=Math.pow(Math.max(0,Math.sin(time*.47-.8)),3);
  const force=Math.min(1,steady+gusts*(.15+.85*broadGust));
  current.strength=force;
  current.x=direction.x*force*pct(p.ash)*2.1;
  current.z=direction.y*force*pct(p.ash)*2.1;
  uniforms.kpWindTime.value=time;
  uniforms.kpWindStrength.value=force;
  // Heavy trees follow a damped spring instead of the quick blade motion.
  const spring=26,damping=Math.exp(-7*dt);
  for(const pine of pines){
   const {plant,phase,flexibility}=pine;
   const travelling=Math.max(0,Math.sin(time*.60+phase+plant.position.z*.024));
   const localForce=steady+gusts*(.18+.82*travelling*travelling);
   // Lean downwind and rebound past the neutral position, without exceeding 10 degrees.
   const sway=.45+.55*Math.sin(time*.88+phase*.55);
   const bend=clamp(.28*pct(p.pines)*flexibility*localForce*sway,-.18,.18);
   const targetX=pine.baseX+direction.y*bend;
   const targetZ=pine.baseZ-direction.x*bend;
   pine.velocityX=(pine.velocityX+(targetX-plant.rotation.x)*spring*dt)*damping;
   pine.velocityZ=(pine.velocityZ+(targetZ-plant.rotation.z)*spring*dt)*damping;
   plant.rotation.x+=pine.velocityX*dt;
   plant.rotation.z+=pine.velocityZ*dt;
  }
 }
 return {current,reset,update};
}
