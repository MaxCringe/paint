// Deforms a soul-flame mesh over time; collection and ultimate rules stay in the game engine.
export function animateSoulFlame(mesh,t,phase,strength=1){
 const geometry=mesh.geometry;
 const attribute=geometry.attributes.position;
 const base=geometry.userData.basePositions;
 const p=attribute.array;
 for(let i=0;i<attribute.count;i++){
  const k=i*3,bx=base[k],by=base[k+1],bz=base[k+2];
  const h=Math.max(0,Math.min(1,(by+.43)/1.37));
  const pulse=1+Math.sin(t*.012+phase+h*7+bx*8)*(.018+h*.075)*strength;
  p[k]=bx*pulse+Math.sin(t*.008+phase+h*8)*h*.055*strength;
  p[k+1]=by+Math.sin(t*.016+phase+h*10+bx*5)*h*.025*strength;
  p[k+2]=bz*pulse+Math.cos(t*.010+phase+h*6)*h*.035*strength;
 }
 attribute.needsUpdate=true;
}
