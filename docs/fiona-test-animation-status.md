# Fiona 3D DEV run — asset and animation status

The original 2D/procedural Fiona, collision gameplay, broom and ultimate are NOT replaced.

## Assets
- The checked-in code can fetch `/fiona/rigged-model.fbx`, `/fiona/run-forward.fbx`, and `/fiona/jump.fbx` if they exist.
- As of this commit **the binary FBX files have NOT been pushed into this repository**. Do not announce them as hosted until they appear in the repository tree.
- If hosted files are missing, the tester can use FBX selected from disk. After a successful test, it caches the three required files locally in IndexedDB, so future tests on the *same browser* need no manual selection.
- Optional extra animations from the DEV panel are session-local; the latest tested three required files remain cached.

## Motion quality
- `Run Forward` and `Jump` are user-supplied Mixamo FBX clips, not part of the source tree yet.
- `Idle` is extracted from the FBX model when present.
- `FionaPrototypeMotions.js` creates up to 21 **experimental** bone-rotation AnimationClips for the other slots with Three.js. These are placeholder choreography for fast functional testing, not motion capture and not vetted Mixamo presets.
- Favor a final rig-safe animation for the duck/slide, broom ride, death and revival. Do not squash the whole character mesh. Verify skirt weights and bone motion visually.
- Every animation in the DEV preview is explicitly identified as an imported FBX or generated prototype.

## Rollback
- Changes are isolated to `src/player/FionaTest.js`, DEV menu, and new helper modules. `src/player/Fiona.js` remains unchanged.
