import * as THREE from 'three';
import {createUltimateAura} from '../effects/UltimateAura.js';

// Position and shared effects for the skinned Fiona. The legacy procedural body is removed.
export function createFiona(scene){
 const runner=new THREE.Group();
 runner.position.set(0,0,2.3);
 scene.add(runner);
 return {runner,ultimateAura:createUltimateAura(runner)};
}
