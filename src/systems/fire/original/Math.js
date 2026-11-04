// From the user-supplied Google AI Studio Fire Studio archive (2026-11-02).
// TypeScript annotations removed; Three.js r160 adapter lives outside this module.


export const DEFAULT_FIRE_SETTINGS               = {
  mode: 'tree',
  quality: 'high',
  seed: 1337,
  intensity: 1.35,
  flameHeight: 1.25,
  flameWidth: 1.1,
  flameDensity: 1.2,
  animationSpeed: 1.15,
  sparkCount: 120,
  sparkSize: 1.15,
  opacity: 0.92,
  colorTemperature: 0.52,
  smokeAmount: 0.75,
  swayStrength: 1.0,
  spreadSpeed: 0.85,
};

export const MODE_PRESETS                                          = {
  tree: {
    mode: 'tree',
    intensity: 1.35,
    flameHeight: 1.25,
    flameWidth: 1.1,
    flameDensity: 1.2,
    animationSpeed: 1.15,
    sparkCount: 120,
    sparkSize: 1.15,
    opacity: 0.92,
    colorTemperature: 0.52,
    smokeAmount: 0.75,
    swayStrength: 1.0,
    spreadSpeed: 0.85,
  },
  lava: {
    mode: 'lava',
    intensity: 1.65,
    flameHeight: 0.78,
    flameWidth: 1.75,
    flameDensity: 1.5,
    animationSpeed: 0.95,
    sparkCount: 180,
    sparkSize: 1.35,
    opacity: 0.95,
    colorTemperature: 0.38,
    smokeAmount: 0.45,
    swayStrength: 1.35,
    spreadSpeed: 0.35,
  },
  smoldering: {
    mode: 'smoldering',
    intensity: 0.72,
    flameHeight: 0.45,
    flameWidth: 0.85,
    flameDensity: 0.65,
    animationSpeed: 0.65,
    sparkCount: 48,
    sparkSize: 0.9,
    opacity: 0.82,
    colorTemperature: 0.22,
    smokeAmount: 1.35,
    swayStrength: 0.6,
    spreadSpeed: 0.25,
  },
};

/**
 * Deterministic Mulberry32 PRNG for reproducible fire generation via seed
 */
export class SeededRandom {
          state        ;

  constructor(seed        ) {
    this.state = (Math.floor(seed) || 1) >>> 0;
  }

  next()         {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min        , max        )         {
    return min + this.next() * (max - min);
  }

  int(min        , max        )         {
    return Math.floor(this.range(min, max + 1));
  }
}

export function clamp(val        , min        , max        )         {
  return Math.max(min, Math.min(max, val));
}

export function smoothstep(edge0        , edge1        , x        )         {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a        , b        , t        )         {
  return a + (b - a) * t;
}

/**
 * Computes GPU and geometry budgets based on QualityLevel (Low, Medium, High)
 */
export function getQualityBudgets(
  quality              ,
  flameDensity        ,
  sparkCount        ,
  smokeAmount        
)                {
  const d = clamp(flameDensity, 0.2, 2.5);
  const s = clamp(sparkCount, 0, 300);
  const sm = clamp(smokeAmount, 0, 2.0);

  if (quality === 'low') {
    const maxTongues = 140;
    const maxSparks = 100;
    const maxSmoke = 36;
    return {
      maxTongueInstances: maxTongues,
      activeTongueCount: Math.min(maxTongues, Math.max(12, Math.round(48 * d))),
      radialSegments: 6,
      heightSegments: 8,
      maxSparks,
      activeSparks: Math.min(maxSparks, Math.round(s * 0.35)),
      maxSmokePuffs: maxSmoke,
      activeSmokePuffs: Math.min(maxSmoke, Math.round(16 * sm)),
      maxEmberNodes: 24,
      noiseOctaves: 1,
    };
  }

  if (quality === 'medium') {
    const maxTongues = 260;
    const maxSparks = 200;
    const maxSmoke = 68;
    return {
      maxTongueInstances: maxTongues,
      activeTongueCount: Math.min(maxTongues, Math.max(20, Math.round(92 * d))),
      radialSegments: 8,
      heightSegments: 12,
      maxSparks,
      activeSparks: Math.min(maxSparks, Math.round(s * 0.68)),
      maxSmokePuffs: maxSmoke,
      activeSmokePuffs: Math.min(maxSmoke, Math.round(30 * sm)),
      maxEmberNodes: 42,
      noiseOctaves: 2,
    };
  }

  // high
  const maxTongues = 420;
  const maxSparks = 300;
  const maxSmoke = 110;
  return {
    maxTongueInstances: maxTongues,
    activeTongueCount: Math.min(maxTongues, Math.max(28, Math.round(150 * d))),
    radialSegments: 10,
    heightSegments: 16,
    maxSparks,
    activeSparks: Math.min(maxSparks, Math.round(s)),
    maxSmokePuffs: maxSmoke,
    activeSmokePuffs: Math.min(maxSmoke, Math.round(48 * sm)),
    maxEmberNodes: 64,
    noiseOctaves: 3,
  };
}

/**
 * Computes stylized dark-fantasy fire color palette from colorTemperature [0..1] and mode
 */
export function computeColorPalette(
  colorTemperature        ,
  mode          
)                   {
  const t = clamp(colorTemperature, 0, 1);

  // Core: from warm amber-yellow (low temp) to blinding yellow-white (mid) to white-cyan hot (high)
  const core                           = [
    lerp(1.0, 1.0, t),
    lerp(0.76, 0.99, t),
    lerp(0.32, 0.88, Math.pow(t, 1.2)),
  ];

  // Mid flame: rich volcanic orange to bright golden-orange
  const mid                           = [
    1.0,
    lerp(0.28, 0.62, t),
    lerp(0.02, 0.16, t),
  ];

  // Outer translucent edge: dark crimson red to fiery scarlet
  const edge                           = [
    lerp(0.68, 0.95, t),
    lerp(0.03, 0.18, t),
    lerp(0.01, 0.08, t),
  ];

  // Glowing embers / sparks
  const ember                           = [
    1.0,
    lerp(0.38, 0.78, t),
    lerp(0.05, 0.35, t),
  ];

  // Dark fantasy ash smoke
  const smoke                           =
    mode === 'lava'
      ? [0.16, 0.11, 0.1]
      : mode === 'smoldering'
        ? [0.18, 0.16, 0.15]
        : [0.14, 0.13, 0.14];

  if (mode === 'smoldering') {
    // Deeper red-orange embers for smoldering
    core[1] *= 0.85;
    core[2] *= 0.65;
    mid[1] *= 0.82;
  } else if (mode === 'lava') {
    // Richer magmatic orange-red contrast
    edge[0] = Math.min(1.0, edge[0] * 1.08);
    mid[1] = lerp(mid[1], 0.42, 0.3);
  }

  const r = Math.round(clamp(mid[0] * 255, 0, 255));
  const g = Math.round(clamp(mid[1] * 255, 0, 255));
  const b = Math.round(clamp(mid[2] * 255, 0, 255));
  const lightHex = (r << 16) | (g << 8) | b;

  return { core, mid, edge, ember, smoke, lightHex };
}

/**
 * Sequential tree burning state machine:
 * 0.00 - 0.27: Нижние ветви и ствол (lower)
 * 0.27 - 0.55: Середина кроны (middle)
 * 0.55 - 0.80: Верхушка кроны (crown)
 * 0.80 - 1.00: Затухание и тление (smoldering)
 */
export function computeBurnCycleState(progress        )                {
  const p = ((progress % 1) + 1) % 1;

  let stage            = 'lower';
  let labelRu = '1. Нижние ветви';
  let descriptionRu = 'Возгорание у корней, огненные языки охватывают ствол и нижний ярус ветвей';

  if (p >= 0.27 && p < 0.55) {
    stage = 'middle';
    labelRu = '2. Середина кроны';
    descriptionRu = 'Пламя активно поднимается по стволу и охватывает густую среднюю крону';
  } else if (p >= 0.55 && p < 0.80) {
    stage = 'crown';
    labelRu = '3. Верхушка';
    descriptionRu = 'Пик горения: мощные языки пламени и снопы искр вырываются из верхушки';
  } else if (p >= 0.80) {
    stage = 'smoldering';
    labelRu = '4. Затухание и тление';
    descriptionRu = 'Открытое пламя спадает, оставляя раскалённые угли, редкие языки и густой дым';
  }

  const lowerActivity =
    smoothstep(0.0, 0.12, p) * (1.0 - smoothstep(0.55, 0.85, p) * 0.72);
  const middleActivity =
    smoothstep(0.18, 0.36, p) * (1.0 - smoothstep(0.68, 0.90, p) * 0.68);
  const crownActivity =
    smoothstep(0.42, 0.62, p) * (1.0 - smoothstep(0.78, 0.94, p) * 0.65);
  const smolderActivity =
    0.25 + smoothstep(0.72, 0.88, p) * 0.75 * (1.0 - smoothstep(0.95, 1.0, p) * 0.3);

  return {
    stage,
    progress: p,
    labelRu,
    descriptionRu,
    lowerActivity,
    middleActivity,
    crownActivity,
    smolderActivity,
  };
}

/**
 * Calculates flame intensity multiplier for a specific anchor point at normalized height [0..1]
 */
export function computeAnchorWeight(
  anchorHeightNorm        ,
  burnProgress        ,
  mode          ,
  spreadSpeed        
)         {
  if (mode === 'lava') {
    // Lava shore burns continuously with low wide waves
    return 0.88 + 0.12 * Math.sin(anchorHeightNorm * 6.28);
  }
  if (mode === 'smoldering') {
    // Smoldering has low residual tongues across all charred zones
    return 0.38 + 0.18 * (1.0 - anchorHeightNorm * 0.4);
  }

  // If spreadSpeed === 0, burn all tiers evenly
  if (spreadSpeed <= 0.01) {
    return 1.0;
  }

  const p = ((burnProgress % 1) + 1) % 1;
  const h = clamp(anchorHeightNorm, 0, 1);

  // Ignition wave front climbs from h=0 at p=0.02 to h=1.0 at p=0.68
  const ignitionFront = smoothstep(h * 0.58, h * 0.58 + 0.18, p + 0.06);

  // Burnout wave climbs from bottom to top during the smoldering phase (p > 0.65)
  const burnoutWave = smoothstep(0.62 + h * 0.22, 0.88 + h * 0.12, p);

  // Residual smoldering glow never drops to zero so embers & small tongues persist
  const residual = 0.18 + (1.0 - h) * 0.08;

  return clamp(ignitionFront * (1.0 - burnoutWave * (1.0 - residual)), 0.08, 1.0);
}

/**
 * Safely validates and merges an imported JSON object into a complete FireSettings preset
 */
export function validateAndNormalizePreset(raw         )               {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный формат JSON пресета');
  }
  const obj = raw                           ;

  const validModes             = ['tree', 'lava', 'smoldering'];
  const validQualities                 = ['low', 'medium', 'high'];

  const mode           = validModes.includes(obj.mode            )
    ? (obj.mode            )
    : DEFAULT_FIRE_SETTINGS.mode;

  const quality               = validQualities.includes(obj.quality                )
    ? (obj.quality                )
    : DEFAULT_FIRE_SETTINGS.quality;

  const num = (key                    , min        , max        )         => {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return clamp(v, min, max);
    }
    return DEFAULT_FIRE_SETTINGS[key]          ;
  };

  return {
    mode,
    quality,
    seed: Math.round(num('seed', 1, 999999)),
    intensity: num('intensity', 0.1, 3.0),
    flameHeight: num('flameHeight', 0.2, 3.5),
    flameWidth: num('flameWidth', 0.2, 3.0),
    flameDensity: num('flameDensity', 0.2, 2.5),
    animationSpeed: num('animationSpeed', 0.1, 3.0),
    sparkCount: Math.round(num('sparkCount', 0, 300)),
    sparkSize: num('sparkSize', 0.2, 3.0),
    opacity: num('opacity', 0.1, 1.0),
    colorTemperature: num('colorTemperature', 0.0, 1.0),
    smokeAmount: num('smokeAmount', 0.0, 2.0),
    swayStrength: num('swayStrength', 0.0, 2.5),
    spreadSpeed: num('spreadSpeed', 0.0, 3.0),
  };
}
