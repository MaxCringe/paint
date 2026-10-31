# KNOTTY PINE — Fiona in Hell

A browser-based 3D endless runner starring Fiona Good.

## Development

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm test
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Vite writes the production site to `dist/`. Wrangler runs the build before deployment and serves the generated `dist/` directory.

## Architecture

- `index.html` — static game HUD and menu markup.
- `src/main.js` — Vite entry point.
- `src/game.js` — shared run state, obstacle collision checks, input handling, and the main animation loop.
- `src/config.js` — shared gameplay constants.
- `src/world/World.js` — scene, camera, renderer, volcanic horizon, track, forest, and recycled roadside vegetation.
- `src/world/buildFernGeometry.js` — reusable procedural fern geometry.
- `src/player/Fiona.js` — Fiona's procedural 3D model and the body parts driven by the run animation.
- `src/souls/createSoulFactory.js` — soul materials, collectible soul models, and their registration in the shared coin list.
- `src/obstacles/LavaRiver.js` — lava materials, wide river geometry, glowing surface, charred boards, and riverbank flames.
- `src/systems/ObstacleManager.js` — existing random choices and probabilities for generating the next obstacle segment.
- `src/souls/buildSoulFlameGeometry.js` — procedural soul-flame geometry.
- `src/souls/animateSoulFlame.js` — animation of soul-flame meshes.
- `src/styles/game.css` — HUD and page styles.
- `src/powerups/BroomRide.js` and `src/powerups/WitchHat.js` — optional collectible abilities.
- `src/effects/UltimateAura.js` — shader-only blue flame surrounding Fiona.
- `src/systems/HazardRules.js` — pure collision and speed predicates, covered by tests.
- `src/ui/GameOverlays.js` — FPS overlay and pause screen (FPS can be disabled there).
- `tests/gameplay.test.js` — automated gameplay and protected asset checks.

The forest uses shared instanced pine meshes; each tree retains its independent wind and recycling transform. Obstacles reuse shared pine geometry, while individually generated puddle and soul geometry is freed on pickup, expiry, or a restarted run. Faraway souls hidden by fog skip CPU deformation.

Run `npm test` to check jump, broom, lava collision and speed rules plus the two intentionally unchanged external asset URLs. GitHub Actions also runs these tests automatically. Successful tests/builds are not a substitute for visual browser playtesting.

## Controls

- Left / Right arrows or A / D: change lanes
- Up arrow, W, or Space: jump
- Down arrow or S: slide
- Touch: swipe left/right to change lanes, swipe up to jump, swipe down to slide

## Current mechanics

- Three-lane endless runner with pine-tree obstacles
- Slippery cat-urine puddles and occasional fish obstacles
- Collectible blue soul flames
- Ultimate flight activates after collecting 100 souls
- Distance, soul counter, and best-run HUD

## Music and sound licenses

- **Background soundtrack:** [Creepy](https://opengameart.org/content/creepy) (file `CrEEP.mp3`) by **TokyoGeisha**, licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The artist explicitly permits use without attribution. Bundled in `public/audio/music/creepy-tokyogeisha.mp3` without modifying the recording.
- The soundtrack begins with a run, loops while running, pauses with Escape, and stops on defeat. Music has independent mute and volume preferences (`src/audio/music.js`) separate from SFX (`src/audio/sfx.js`).
- Existing sound effect attribution and the separate Mixkit sound license are described in [the SFX credits](public/audio/sfx/README.md).

## Deliberately external assets

At the owner's request, the soul pickup sound is still loaded from `assets.mixkit.co`, and the knotty pine road texture is still loaded from `raw.githubusercontent.com`. Do **not** remove or rewrite these URLs without explicit consent. A private GitHub repository may block the road texture URL for public visitors; the site is not completely offline-capable while this dependency remains.
