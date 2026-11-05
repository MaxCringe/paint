import { createFallenPineObstacle } from './FallenPine.js';

// Kimi's authored procedural pine, adapted to the existing runner obstacle.
// Geometry/materials are constructed once. Clones share them while each
// obstacle keeps its own scene transform and collision state.
export function createPineLogFactory(scene, obstacles, _trunkMaterial) {
 const templates = [17, 41, 73, 109].map(seed =>
  createFallenPineObstacle({ seed, length: 8.9, clearance: 1.7 })
 );
 let next = 0;
 return function makePineLog(z) {
  const group = templates[next++ % templates.length].clone(true);
  group.position.set(0, 0, z);
  scene.add(group);
  obstacles.push({g:group,lane:-1,type:'pineLog',z,passed:false});
 };
}
