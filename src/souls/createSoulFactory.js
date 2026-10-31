import * as THREE from 'three';
import { buildSoulFlameGeometry } from './buildSoulFlameGeometry.js';

// Create collectible soul flames. Their values are still added to the shared coin registry.
export function createSoulFactory(scene, coins) {
  const soulOuterMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.93,depthWrite:false});
  const soulInnerMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.97,depthWrite:false});
  const soulAuraMaterial=new THREE.MeshBasicMaterial({color:0x4e58ff,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
  const soulSparkMaterials=[
   new THREE.MeshBasicMaterial({color:0xc8ffff}),
   new THREE.MeshBasicMaterial({color:0x66eeff}),
   new THREE.MeshBasicMaterial({color:0x8b79ff})
  ];
  const soulSparkGeometry=new THREE.IcosahedronGeometry(.033,0);
  
  
  function makeSoul(lane,z,y=1.2){
   const g=new THREE.Group();
   g.position.set((lane-1)*2.55,y,z);
   scene.add(g);
   const phase=Math.random()*Math.PI*2;
  
   // A blue-violet halo, full 3D outer flame, and a hotter cyan-white inner tongue.
   const aura=new THREE.Mesh(buildSoulFlameGeometry(phase+.4,false),soulAuraMaterial);
   aura.scale.set(1.32,1.22,1.18);
   aura.position.z=-.035;
   g.add(aura);
  
   const outer=new THREE.Mesh(buildSoulFlameGeometry(phase,false),soulOuterMaterial);
   g.add(outer);
  
   const inner=new THREE.Mesh(buildSoulFlameGeometry(phase+1.1,true),soulInnerMaterial);
   inner.scale.set(.61,.78,.68);
   inner.position.set(.015,.015,.105);
   g.add(inner);
  
   // A secondary flickering tongue gives the silhouette a less static, flame-like profile.
   const side=new THREE.Mesh(buildSoulFlameGeometry(phase+2.3,false),soulOuterMaterial);
   side.scale.set(.43,.70,.54);
   side.position.set(.17,.02,-.06);
   side.material=soulOuterMaterial;
   g.add(side);
  
   const sparks=[];
   for(let i=0;i<4;i++){
    const mesh=new THREE.Mesh(soulSparkGeometry,soulSparkMaterials[i% soulSparkMaterials.length]);
    const s={mesh,x:(Math.random()-.5)*.65,y:.08+Math.random()*.78,z:(Math.random()-.5)*.26,phase:Math.random()*Math.PI*2};
    mesh.position.set(s.x,s.y,s.z);
    mesh.scale.setScalar(.55+Math.random()*.8);
    g.add(mesh);
    sparks.push(s);
   }
  
   // Soul flame geometry is unique to this pickup; materials and sparks are shared.
   let disposed=false;
   g.userData.dispose=()=>{
    if(disposed)return;
    disposed=true;
    for(const mesh of [aura,outer,inner,side])mesh.geometry.dispose();
   };
   coins.push({g,lane,z,got:false,baseY:y,phase,flames:[outer,inner,side],aura,sparks});
  }
  return makeSoul;
}
