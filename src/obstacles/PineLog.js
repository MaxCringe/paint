import { createFallenPineObstacle } from './FallenPine.js';

// Twelve pre-generated designs share GPU resources with cloned obstacles.
// A shuffled bag prevents a template from repeating until all 12 appear.
export function createPineLogFactory(scene, obstacles, _trunkMaterial) {
 const seeds=[17,41,73,109,157,191,211,257,293,331,367,401];
 const templates=seeds.map((seed,index)=>createFallenPineObstacle({
  seed, profile:index%6, length:8.9, clearance:1.7
 }));
 let bag=[], last=-1;
 function refill(){
  bag=templates.map((_,i)=>i);
  for(let i=bag.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [bag[i],bag[j]]=[bag[j],bag[i]];
  }
  if(bag[bag.length-1]===last)
   [bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
 }
 return function makePineLog(z){
  if(!bag.length)refill();
  const index=bag.pop();
  last=index;
  const group=templates[index].clone(true);
  group.position.set(0,0,z);
  // The second set has its broken stump on the opposite roadside.
  group.rotation.y=index>=6?Math.PI:0;
  scene.add(group);
  obstacles.push({g:group,lane:-1,type:'pineLog',z,passed:false});
 };
}
