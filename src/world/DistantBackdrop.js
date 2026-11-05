import * as THREE from 'three';

// Scale about the running camera to preserve the skyline's apparent size.
// The nearest volcanic face moves from z=-72.1 to z=-237.3, beyond
// the ground's far edge (z=-175). Keep animated parts in local coordinates.
export function createDistantBackdrop(viewpoint){
 const backdrop=new THREE.Group();
 backdrop.name='distant-skyline';
 backdrop.scale.setScalar(3);
 backdrop.position.copy(viewpoint).multiplyScalar(1-3);
 return backdrop;
}

// Project a screen point onto a local depth plane of the distant backdrop.
// Return local coordinates so meteors keep correct off-screen entries even
// when their parent is translated/scaled away from the playable forest.
export function backdropSkyPoint(backdrop,camera,nx,ny,depth){
 backdrop.updateWorldMatrix(true,false);
 const worldDepth=backdrop.localToWorld(new THREE.Vector3(0,0,depth)).z;
 const ray=new THREE.Vector3(nx,ny,.5).unproject(camera).sub(camera.position);
 return backdrop.worldToLocal(camera.position.clone().addScaledVector(ray,
  (worldDepth-camera.position.z)/ray.z));
}
