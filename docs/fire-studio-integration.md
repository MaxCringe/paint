# Fire Studio — staged Three.js integration

Source: user's 2026-11-02 Google AI Studio ZIP, `knotty-pine-—-fire-studio.zip`.
The low-poly flame-shell geometry and GPU noise/sway approach were adapted to
our existing Three.js r160. No React runtime, TypeScript compiler or upgrade
to Three.js r187 is required.

## Status

**Enabled only for trees next to lava in the main game.**
`src/obstacles/LavaRiver.js` retains all existing lava geometry, bank fire,
undergrowth fire and collision behavior, but delegates procedural pine fire
to a single shared manager. The existing legacy pine flames still serve as
a fallback if the river factory is used without the new callback.

The independent preview remains available at `/fire-studio-preview.html`.
The visual engine is still evolving: smoke, blackening and true forest-fire
spread are not connected to the production game.

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

- No more than 6 trees at once in the production run (hard maximum 12).
- One instanced flame mesh and one spark Points mesh, independent of tree count.
  Two-sided transparent materials may require additional GPU passes.
- No extra point lights or shadow passes.
- Fire follows current proxy world transforms (including wind), and is
  cancelled if a tree recycles or its owning river is removed.
- Does not modify or recolor shared instanced foliage (so other trees remain safe).
- The low-poly shell shader and sparks are **phase 1**, not the final Studio
  package. Smoke, embers, charred needles and fire spread remain unintegrated.
- Geometry cleanup and reset are explicit.

## Acceptance criteria for eventual integration

1. Verify the six species in the preview and play a sustained main run
   through at least one guaranteed lava river with no WebGL/JS console errors.
2. Measure real FPS on low-end target devices with six fires and rich grass.
3. Review the actual flames near lava for foreground depth, size and clipping.
4. Verify branches, wind, scroll, recycle, and owner cleanup in gameplay.
5. Once visuals are accepted, stage charred needles, smoke and smouldering
   as independent bounded-cost effects.

## Lava shoreline integration (2026-11-02)

`src/systems/fire/LavaForestInteraction.js` now owns three constraints:
- At river creation, move **pine trunk proxies** off the true winding molten
  band before the scene renders it, leaving at least 1.55 m of firm bank.
- Re-check recycled trees against all active rivers so distant repeat sections
  never reintroduce a pine into lava. Other vegetation and obstacles untouched.
- Ignite the nearest six pine proxies only when the crossing approaches within
  about 49 units of Fiona; radiant heat extends several metres beyond the
  riverbank, so trees burn while still on solid ground.

The historical low-poly triangular mesh of bank flames has been removed;
crossed, soft translucent flame cards remain, as do the lava flow, stone edges,
scorched decorative logs, and collision geometry. Sparks are now driven by
the river's particles rather than a triangle-mesh render callback.
Tree flame pockets use smaller, staggered, varied-height GPU flames to avoid
regular luminous rings around every crown tier.

Runtime checks: renderer shader errors, lava creation, river-driven fire,
vegetation recycling, long main runs and visual QA on target GPU.
