// From the user-supplied Google AI Studio Fire Studio archive (2026-11-02).
// TypeScript annotations removed; Three.js r160 adapter lives outside this module.
import * as THREE from 'three';

export const SIMPLEX_NOISE_GLSL = /* glsl */ `
// Fast 3D procedural value/gradient noise for volumetric fire & smoke
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3D(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0, 0, 0)), hash31(i + vec3(1, 0, 0)), f.x),
      mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x),
      f.y
    ),
    mix(
      mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
      mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x),
      f.y
    ),
    f.z
  );
}

float fbmFire(vec3 p, int octaves) {
  float val = 0.0;
  float amp = 0.54;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    if (i >= octaves) break;
    val += amp * noise3D(p * freq);
    freq *= 2.07;
    amp *= 0.48;
  }
  return val;
}
`;

                                      
                           
                                
                                  
                                 
                            
                              
                                   
                                     
                                    
                                     
                              
                                                                     
 

export function createFlameShaderMaterial()                       {
  const uniforms                      = {
    uTime: { value: 0 },
    uIntensity: { value: 1.35 },
    uFlameHeight: { value: 1.25 },
    uFlameWidth: { value: 1.1 },
    uSpeed: { value: 1.15 },
    uOpacity: { value: 0.92 },
    uSwayStrength: { value: 1.0 },
    uCoreColor: { value: new THREE.Color(1.0, 0.95, 0.72) },
    uMidColor: { value: new THREE.Color(1.0, 0.46, 0.08) },
    uEdgeColor: { value: new THREE.Color(0.85, 0.08, 0.02) },
    uOctaves: { value: 3 },
    uModeType: { value: 0 },
  };

  return new THREE.ShaderMaterial({
    uniforms: uniforms                                             ,
    vertexShader: /* glsl */ `
      attribute vec3 aShellData;
      attribute vec4 aInstanceParams; // x: phase, y: heightMult, z: widthMult, w: activityWeight
      attribute vec4 aInstanceExtra;  // x: leanX, y: leanZ, z: forkStrength, w: burstSeed

      uniform float uTime;
      uniform float uFlameHeight;
      uniform float uFlameWidth;
      uniform float uSpeed;
      uniform float uSwayStrength;
      uniform float uModeType;

      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vShellData;
      varying float vPhase;
      varying float vActivity;
      varying float vForkFactor;
      varying float vBurst;
      varying vec3 vLocalPos;

      ${SIMPLEX_NOISE_GLSL}

      void main() {
        vUv = uv;
        vShellData = aShellData;
        vPhase = aInstanceParams.x;
        vActivity = aInstanceParams.w;

        float hNorm = position.y; // 0 at base, 1 at tip
        float t = uTime * uSpeed * 2.4 + vPhase * 6.28318;

        // Random periodic intensity flare / burst per flame cluster
        float burstWave = sin(t * 1.35 + aInstanceExtra.w * 12.0) * 0.5 + 0.5;
        float sharpFlare = pow(burstWave, 4.0) * 0.38;
        vBurst = 1.0 + sharpFlare;

        // Scale base geometry by slider & per-instance parameters + activity weight
        float activeScale = max(0.001, vActivity);
        float wScale = uFlameWidth * aInstanceParams.z * (0.45 + 0.55 * activeScale);
        float hScale = uFlameHeight * aInstanceParams.y * activeScale * (1.0 + sharpFlare * 0.28);

        // Lava fire is wider and more jagged at the base
        if (uModeType > 0.5 && uModeType < 1.5) {
          wScale *= 1.25 + 0.25 * (1.0 - hNorm);
        }

        vec3 pos = position;
        pos.x *= wScale;
        pos.z *= wScale;
        pos.y *= hScale;

        // Natural S-curve sway & upward travelling wave
        float swayEnv = pow(hNorm, 1.35) * uSwayStrength * (0.4 + 0.6 * activeScale);
        float waveX = sin(hNorm * 4.2 - t * 1.9 + vPhase * 5.0) * 0.28
                    + cos(hNorm * 7.5 - t * 3.1 + aInstanceExtra.w) * 0.12;
        float waveZ = cos(hNorm * 3.8 - t * 1.7 + vPhase * 3.7) * 0.28
                    + sin(hNorm * 6.8 - t * 2.8 + aInstanceExtra.w * 2.0) * 0.12;

        // Bifurcation (раздвоение языков пламени):
        // Upper portion of outer shell & main tongue splits into forked tips
        float forkSplit = smoothstep(0.38, 0.92, hNorm) * aInstanceExtra.z;
        float sideSign = sign( sin(aShellData.y + t * 0.45) );
        float forkOffset = sideSign * forkSplit * 0.22 * wScale * (0.6 + 0.4 * aShellData.z);
        vForkFactor = forkSplit;

        pos.x += (waveX + aInstanceExtra.x * 0.45) * swayEnv + forkOffset;
        pos.z += (waveZ + aInstanceExtra.y * 0.45) * swayEnv + forkOffset * 0.5;

        // Subtle upward breathing stretch
        pos.y += sin(t * 2.2 + hNorm * 3.0) * 0.05 * hScale * hNorm;

        vLocalPos = pos;

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
        vec4 mvPosition = viewMatrix * worldPos;

        vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vViewDir = normalize(-mvPosition.xyz);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uOpacity;
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uEdgeColor;
      uniform float uOctaves;
      uniform float uModeType;

      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vShellData;
      varying float vPhase;
      varying float vActivity;
      varying float vForkFactor;
      varying float vBurst;
      varying vec3 vLocalPos;

      ${SIMPLEX_NOISE_GLSL}

      void main() {
        if (vActivity < 0.02) discard;

        float h = clamp(vUv.y, 0.0, 1.0);
        float t = uTime * uSpeed * 2.6 + vPhase * 10.0;
        int octs = int(clamp(uOctaves, 1.0, 3.0));

        // 3D upward scrolling turbulent noise coordinates
        vec3 noiseCoord = vec3(
          vLocalPos.x * 2.8 + sin(h * 4.0 - t * 0.8) * 0.4,
          h * 3.6 - t * 1.45,
          vLocalPos.z * 2.8 + cos(h * 3.5 - t * 0.7) * 0.4
        );

        float n1 = fbmFire(noiseCoord, octs);
        float n2 = noise3D(noiseCoord * 2.3 + vec3(0.0, -t * 1.9, 4.2));
        float combinedNoise = mix(n1, n2, 0.38);

        // Bifurcation channel carve: creates twin/forked flame tips at the top of the tongue
        float angleWave = abs(sin(vShellData.y * 1.5 + n2 * 1.8 - t * 0.5));
        float forkCarve = mix(1.0, smoothstep(0.18, 0.65, angleWave), vForkFactor * 0.85);

        // View-dependent volumetric softness (eliminates flat polygon edges from any angle)
        float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float radialSoftness = pow(clamp(ndotv, 0.0, 1.0), 0.55);

        // Base & tip vertical envelope
        float bottomFade = smoothstep(0.0, 0.14, h);
        float topErosion = smoothstep(1.0, 0.12, h + (1.0 - combinedNoise) * 0.56);

        // Crisp flame tongue ribbons and forked tips
        float noiseRidge = smoothstep(0.24, 0.78, combinedNoise);
        float shellMask = mix(1.0, 0.58 * noiseRidge, step(0.5, vShellData.z));

        float flameDensityMask = bottomFade * topErosion * radialSoftness * forkCarve * shellMask;
        flameDensityMask = clamp(flameDensityMask * (0.45 + noiseRidge * 0.95), 0.0, 1.0);

        if (flameDensityMask < 0.04) discard;

        // Heat core calculation: hottest at lower-center and high-density ridges
        float coreHeat = flameDensityMask * (1.0 - h * 0.68) * radialSoftness * vBurst;

        // Stylized 3-zone dark-fantasy color ramp:
        // Edge (deep red translucent) -> Mid (vibrant volcanic orange) -> Core (bright yellow-white)
        vec3 color = mix(uEdgeColor, uMidColor, smoothstep(0.14, 0.54, coreHeat));
        color = mix(color, uCoreColor, smoothstep(0.58, 0.92, coreHeat));

        // Boost emissive brilliance with intensity & periodic bursts, with soft highlight roll-off
        color *= uIntensity * (0.95 + 0.38 * vBurst);
        color = color / (1.0 + color * 0.18);

        // Calibrated additive alpha so overlapping tongues build rich volume without solid white blow-out
        float alpha = pow(flameDensityMask, 1.2) * uOpacity * 0.58 * clamp(vActivity * 1.25, 0.0, 1.0);

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function createSparksShaderMaterial()                       {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSparkSize: { value: 1.15 },
      uIntensity: { value: 1.35 },
      uOpacity: { value: 0.92 },
      uCoreColor: { value: new THREE.Color(1.0, 0.96, 0.75) },
      uEmberColor: { value: new THREE.Color(1.0, 0.45, 0.08) },
      uPixelRatio: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSparkPhase;
      attribute float aSparkScale;
      attribute float aSparkSpeed;
      attribute vec3 aSparkAnchor;

      uniform float uTime;
      uniform float uSparkSize;
      uniform float uPixelRatio;

      varying float vLife;
      varying float vFlicker;

      void main() {
        // Continuous cycling life [0..1]
        float life = fract(uTime * aSparkSpeed * 0.32 + aSparkPhase);
        vLife = life;

        // Fast flicker
        vFlicker = 0.6 + 0.4 * sin(uTime * 18.0 + aSparkPhase * 45.0);

        // Spiral upward trajectory from anchor point
        float angle = aSparkPhase * 25.0 + life * 7.5;
        float spiralRadius = (0.08 + life * 0.65) * aSparkScale;

        vec3 pos = aSparkAnchor + position;
        pos.x += cos(angle) * spiralRadius;
        pos.z += sin(angle) * spiralRadius;
        pos.y += life * (2.6 + aSparkScale * 2.2);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Size swells after birth and shrinks as ember cools at top
        float sizeEnv = sin(life * 3.14159);
        float basePointSize = (18.0 * uSparkSize * aSparkScale * sizeEnv + 4.0) * uPixelRatio;
        gl_PointSize = clamp(basePointSize / max(1.0, -mvPosition.z * 0.35), 2.0, 42.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      uniform float uOpacity;
      uniform vec3 uCoreColor;
      uniform vec3 uEmberColor;

      varying float vLife;
      varying float vFlicker;

      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r2 = dot(cxy, cxy);
        if (r2 > 1.0) discard;

        // Soft glowing circular spark with intense hot center
        float glow = exp(-r2 * 3.2);
        float core = smoothstep(0.45, 0.0, r2);

        vec3 col = mix(uEmberColor, uCoreColor, core * (1.0 - vLife * 0.5));
        col *= uIntensity * 1.45 * vFlicker;

        float lifeAlpha = smoothstep(0.0, 0.12, vLife) * smoothstep(1.0, 0.65, vLife);
        float alpha = glow * lifeAlpha * uOpacity;

        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function createSmokeShaderMaterial()                       {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSmokeAmount: { value: 0.75 },
      uOpacity: { value: 0.9 },
      uSmokeColor: { value: new THREE.Color(0.14, 0.13, 0.14) },
      uFireTint: { value: new THREE.Color(1.0, 0.42, 0.08) },
      uIntensity: { value: 1.2 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSmokeParams; // x: phase, y: speed, z: scale, w: anchorHeight
      attribute vec3 aSmokeOrigin;

      uniform float uTime;
      uniform float uSmokeAmount;

      varying float vLife;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vNoisePos;

      void main() {
        float life = fract(uTime * aSmokeParams.y * 0.18 + aSmokeParams.x);
        vLife = life;

        // Smoke plume rises and expands organically
        float puffScale = aSmokeParams.z * (0.45 + life * 1.65) * clamp(uSmokeAmount * 0.85, 0.01, 1.8);
        float driftAngle = aSmokeParams.x * 12.0 + life * 3.5;

        vec3 center = aSmokeOrigin;
        center.x += cos(driftAngle) * life * 0.85;
        center.z += sin(driftAngle) * life * 0.85;
        center.y += life * (3.2 + aSmokeParams.z * 1.8);

        vec3 displaced = center + position * puffScale;
        vNoisePos = position * 2.2 + vec3(0.0, -uTime * 0.6 + aSmokeParams.x * 5.0, 0.0);

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uSmokeAmount;
      uniform float uOpacity;
      uniform vec3 uSmokeColor;
      uniform vec3 uFireTint;
      uniform float uIntensity;

      varying float vLife;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vNoisePos;

      ${SIMPLEX_NOISE_GLSL}

      void main() {
        if (uSmokeAmount < 0.02) discard;

        float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float softSphere = pow(clamp(ndotv, 0.0, 1.0), 0.85);

        float n = noise3D(vNoisePos);
        float density = softSphere * smoothstep(0.22, 0.78, n + 0.25);

        // Fade in smoothly at base of plume and dissolve into thin air at top
        float lifeFade = smoothstep(0.0, 0.22, vLife) * smoothstep(1.0, 0.35, vLife);
        float alpha = density * lifeFade * clamp(uSmokeAmount * 0.42, 0.0, 0.68) * uOpacity;

        if (alpha < 0.015) discard;

        // Warm under-glow from the flames at the lower part of the smoke plume
        float warmGlow = (1.0 - smoothstep(0.0, 0.55, vLife)) * 0.38 * clamp(uIntensity * 0.6, 0.0, 1.2);
        vec3 col = mix(uSmokeColor, uFireTint, warmGlow);

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

export function createEmberShaderMaterial()                       {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.35 },
      uCoreColor: { value: new THREE.Color(1.0, 0.9, 0.6) },
      uEmberColor: { value: new THREE.Color(0.95, 0.25, 0.03) },
      uSmolderBoost: { value: 0.4 },
    },
    vertexShader: /* glsl */ `
      attribute float aEmberPhase;
      varying float vPhase;
      varying vec3 vLocalPos;

      void main() {
        vPhase = aEmberPhase;
        vLocalPos = position;
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uCoreColor;
      uniform vec3 uEmberColor;
      uniform float uSmolderBoost;

      varying float vPhase;
      varying vec3 vLocalPos;

      ${SIMPLEX_NOISE_GLSL}

      void main() {
        float pulse = 0.55 + 0.45 * sin(uTime * 3.4 + vPhase * 15.0);
        float crackNoise = noise3D(vLocalPos * 9.0 + vec3(vPhase * 4.0, uTime * 0.5, 0.0));
        float heat = clamp(crackNoise * pulse * (0.65 + uSmolderBoost * 0.65), 0.0, 1.0);

        vec3 charBark = vec3(0.06, 0.04, 0.04);
        vec3 glowCol = mix(uEmberColor, uCoreColor, smoothstep(0.45, 0.88, heat)) * uIntensity * 1.35;
        vec3 finalCol = mix(charBark, glowCol, smoothstep(0.22, 0.68, heat));

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });
}
