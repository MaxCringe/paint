# Fire Studio — staged Three.js integration

Source: user's 2026-11-02 Google AI Studio ZIP, `knotty-pine-—-fire-studio.zip`.
The low-poly flame-shell geometry and GPU noise/sway approach were adapted to
our existing Three.js r160. No React runtime, TypeScript compiler or upgrade
to Three.js r187 is required.

## Status

**Experimental opt-in adapter; NOT connected to production gameplay yet.**
`src/obstacles/LavaRiver.js` retains all existing lava, bank fire and
collision behavior. A failed new shader therefore cannot freeze the runner.
Do not replace the legacy system before a full visual/performance review.

## Modules

- `src/systems/fire/FireStudioFlames.js`: single low-poly GPU flame
  mesh/material based on the uploaded Fire Studio flame effect.
- `src/systems/fire/ForestFireStudio.js`: scans each of the six actual
  pine archetypes once, caches branch/trunk/crown anchors, binds effects
  to `ForestGenerator` transform-only proxies, and shares ONE instanced
  flame mesh and ONE spark point mesh across all burning trees.
- `tests/fire-studio.test.js`: coverage for all models, proxy tracking,
  recycle cancellation, budget, independent scene clean-up.

## Standalone scene usage

```js
const fire=createForestFireStudio(scene,{maxTrees:6,quality:'low'});
fire.igniteTree(forest.plants.find(p=>p.userData.plantSpecies==='pine:scots_pine'));
// Or select by proximity to a generated lava crossing:
// fire.igniteNearRiver(forest.plants, river.position.z, {center, halfWidth});
fire.update(deltaSeconds);
fire.dispose();
```

Use an isolated preview scene to validate rendering and FPS on target devices
before ever calling these methods from the main game.

## Safety limits

- No more than 6 trees by default (hard maximum 12).
- 2 draw calls for flames and sparks independent of tree count.
- No extra point lights or shadow passes.
- Fire follows current proxy world transforms, and is cancelled if a tree
  recycles to a distant Z coordinate.
- Does not modify or recolor shared instanced foliage (so other trees remain safe).
- The low-poly shell shader and sparks are **phase 1**, not the final Studio
  package. Smoke, embers, charred needles and fire spread remain unintegrated.
- Geometry cleanup and reset are explicit.

## Acceptance criteria for eventual integration

1. Run browser preview with actual WebGL shader compilation, no console errors.
2. Measure FPS and draw calls with all six species and six concurrent fires.
3. Compare visuals with the current lava/bank fire to avoid double overlays.
4. Confirm fire follows wind, scroll and recycling in long runs.
5. Add a dedicated browser test spawning a real river and verifying fire through
   the segment lifecycle; keep legacy until proven safe.
