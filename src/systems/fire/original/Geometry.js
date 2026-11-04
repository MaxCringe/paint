// From the user-supplied Google AI Studio Fire Studio archive (2026-11-02).
// TypeScript annotations removed; Three.js r160 adapter lives outside this module.
import * as THREE from 'three';


/**
 * Shared Geometry Cache so multiple burning trees or scenes reuse the exact same BufferGeometries
 * without reallocating vertex buffers on the GPU.
 */
class FireGeometryPool {
          tongueGeometries = new Map                                    ();
          smokeGeometry                              = null;
          emberGeometry                              = null;

  /**
   * Creates a multi-layered 3D organic flame tongue volume.
   * Each tongue geometry combines an inner core spindle and two intersecting curved
   * volumetric fins/shells with custom attributes so it looks volumetric from EVERY camera angle
   * and never resembles a flat triangle or rigid cone.
   */
  getFlameTongueGeometry(quality              )                       {
    const cached = this.tongueGeometries.get(quality);
    if (cached) return cached;

    const radialSegs = quality === 'low' ? 7 : quality === 'medium' ? 10 : 14;
    const heightSegs = quality === 'low' ? 10 : quality === 'medium' ? 14 : 20;

    // Build an organic teardrop/spindle volume with fluted longitudinal ribs
    const positions           = [];
    const normals           = [];
    const uvs           = [];
    const layerAttrs           = []; // x: radialFactor, y: ribPhase, z: shellIndex
    const indices           = [];

    // 2 concentric shells: Shell 0 = bright dense inner core + body, Shell 1 = outer Wispy / Forking Lick
    const shells = quality === 'low' ? 1 : 2;
    let vertexOffset = 0;

    for (let s = 0; s < shells; s++) {
      const shellScale = s === 0 ? 1.0 : 1.28;
      const twistRate = s === 0 ? 1.15 : -1.65;

      for (let yIdx = 0; yIdx <= heightSegs; yIdx++) {
        const v = yIdx / heightSegs; // 0 at base, 1 at tip

        // Organic flame silhouette profile:
        // Swells rapidly from base (v=0..0.22), then tapers gracefully into a whip-like tip (v=0.22..1.0)
        const baseSwelling = Math.pow(Math.sin(Math.min(1, v * 2.2) * (Math.PI * 0.5)), 0.65);
        const upperTaper = Math.pow(1.0 - v, 0.78);
        const radiusProfile = (0.14 + 0.86 * baseSwelling * upperTaper) * shellScale;

        for (let rIdx = 0; rIdx <= radialSegs; rIdx++) {
          const u = rIdx / radialSegs;
          const theta = u * Math.PI * 2.0 + v * twistRate;

          // 3-lobe organic cross-section (gives flames rich depth and ridges instead of a sterile cylinder)
          const lobeMod =
            1.0 +
            0.22 * Math.sin(theta * 3.0 + v * 2.5) +
            0.12 * Math.cos(theta * 2.0 - v * 1.8);

          const r = radiusProfile * lobeMod * 0.42;
          const px = Math.cos(theta) * r;
          const py = v; // 0 to 1 normalized height
          const pz = Math.sin(theta) * r;

          positions.push(px, py, pz);

          // Outward + slightly upward normal for smooth Fresnel calculation
          const nx = Math.cos(theta);
          const ny = 0.25 * (1.0 - v);
          const nz = Math.sin(theta);
          const nLen = Math.hypot(nx, ny, nz) || 1;
          normals.push(nx / nLen, ny / nLen, nz / nLen);

          uvs.push(u, v);
          layerAttrs.push(lobeMod, theta, s);
        }
      }

      const ringCols = radialSegs + 1;
      for (let yIdx = 0; yIdx < heightSegs; yIdx++) {
        for (let rIdx = 0; rIdx < radialSegs; rIdx++) {
          const a = vertexOffset + yIdx * ringCols + rIdx;
          const b = a + 1;
          const c = a + ringCols;
          const d = c + 1;

          indices.push(a, b, d);
          indices.push(a, d, c);
        }
      }

      vertexOffset += (heightSegs + 1) * (radialSegs + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aShellData', new THREE.Float32BufferAttribute(layerAttrs, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    this.tongueGeometries.set(quality, geometry);
    return geometry;
  }

  /**
   * Low-poly organic volumetric smoke puff geometry (icosahedron with soft normals)
   */
  getSmokePuffGeometry()                       {
    if (this.smokeGeometry) return this.smokeGeometry;
    const geo = new THREE.IcosahedronGeometry(0.55, 1);
    geo.computeVertexNormals();
    this.smokeGeometry = geo;
    return geo;
  }

  /**
   * Glowing ember / charcoal cluster geometry
   */
  getEmberNodeGeometry()                       {
    if (this.emberGeometry) return this.emberGeometry;
    const geo = new THREE.DodecahedronGeometry(0.085, 0);
    geo.scale(1.2, 0.45, 1.0);
    geo.computeVertexNormals();
    this.emberGeometry = geo;
    return geo;
  }

  disposeAll()       {
    this.tongueGeometries.forEach((geo) => geo.dispose());
    this.tongueGeometries.clear();
    this.smokeGeometry?.dispose();
    this.smokeGeometry = null;
    this.emberGeometry?.dispose();
    this.emberGeometry = null;
  }
}

export const sharedFireGeometries = new FireGeometryPool();
