// Original archive tests, imports adapted to the r160 port.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SeededRandom,
  getQualityBudgets,
  computeColorPalette,
  computeBurnCycleState,
  computeAnchorWeight,
  validateAndNormalizePreset,
  DEFAULT_FIRE_SETTINGS,
} from '../src/systems/fire/original/Math.js';

test('SeededRandom produces deterministic sequences for identical seeds', () => {
  const rngA = new SeededRandom(4207);
  const rngB = new SeededRandom(4207);
  const rngC = new SeededRandom(9999);

  const seqA = [rngA.next(), rngA.next(), rngA.range(-5, 5)];
  const seqB = [rngB.next(), rngB.next(), rngB.range(-5, 5)];
  const seqC = [rngC.next(), rngC.next(), rngC.range(-5, 5)];

  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
});

test('getQualityBudgets scales tongue and particle counts across Low, Medium, High', () => {
  const low = getQualityBudgets('low', 1.2, 120, 1.0);
  const med = getQualityBudgets('medium', 1.2, 120, 1.0);
  const high = getQualityBudgets('high', 1.2, 120, 1.0);

  assert.ok(low.activeTongueCount < med.activeTongueCount);
  assert.ok(med.activeTongueCount < high.activeTongueCount);
  assert.ok(low.activeSparks < med.activeSparks);
  assert.ok(med.activeSparks < high.activeSparks);
  assert.equal(low.noiseOctaves, 1);
  assert.equal(med.noiseOctaves, 2);
  assert.equal(high.noiseOctaves, 3);
});

test('computeColorPalette transitions core and mid colors with colorTemperature', () => {
  const cool = computeColorPalette(0.1, 'tree');
  const hot = computeColorPalette(0.95, 'tree');

  // Higher color temperature increases blue/green channels in the white-yellow core
  assert.ok(hot.core[1] > cool.core[1]);
  assert.ok(hot.core[2] > cool.core[2]);
  assert.ok(hot.mid[1] > cool.mid[1]);
});

test('computeBurnCycleState progresses sequentially through 4 stages', () => {
  const s1 = computeBurnCycleState(0.1);
  const s2 = computeBurnCycleState(0.4);
  const s3 = computeBurnCycleState(0.68);
  const s4 = computeBurnCycleState(0.9);

  assert.equal(s1.stage, 'lower');
  assert.equal(s2.stage, 'middle');
  assert.equal(s3.stage, 'crown');
  assert.equal(s4.stage, 'smoldering');

  // Verify lower branches ignite before crown
  const wLowerEarly = computeAnchorWeight(0.05, 0.12, 'tree', 1.0);
  const wCrownEarly = computeAnchorWeight(0.95, 0.12, 'tree', 1.0);
  assert.ok(wLowerEarly > wCrownEarly, 'Lower branches should burn strongly before top crown');

  // Verify crown reaches high intensity during stage 3
  const wCrownPeak = computeAnchorWeight(0.9, 0.68, 'tree', 1.0);
  assert.ok(wCrownPeak > 0.75, 'Crown should burn intensely during stage 3');
});

test('validateAndNormalizePreset clamps out-of-range values and preserves valid fields', () => {
  const normalized = validateAndNormalizePreset({
    mode: 'lava',
    quality: 'medium',
    seed: 777,
    intensity: 99, // should clamp to 3.0
    flameHeight: -5, // should clamp to 0.2
    sparkCount: 155.8,
  });

  assert.equal(normalized.mode, 'lava');
  assert.equal(normalized.quality, 'medium');
  assert.equal(normalized.seed, 777);
  assert.equal(normalized.intensity, 3.0);
  assert.equal(normalized.flameHeight, 0.2);
  assert.equal(normalized.sparkCount, 156);
  assert.equal(normalized.opacity, DEFAULT_FIRE_SETTINGS.opacity);
});
