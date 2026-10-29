# KNOTTY PINE — Fiona in Hell

A browser-based 3D endless runner starring Fiona Good.

## Development

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
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
- `src/game.js` — scene setup, world objects, shared run state, collision checks, and the main animation loop.
- `src/config.js` — shared gameplay constants.
- `src/world/buildFernGeometry.js` — reusable procedural fern geometry.
- `src/player/Fiona.js` — Fiona's procedural 3D model and the body parts driven by the run animation.
- `src/souls/createSoulFactory.js` — soul materials, collectible soul models, and their registration in the shared coin list.
- `src/obstacles/LavaRiver.js` — lava materials, wide river geometry, glowing surface, charred boards, and riverbank flames.
- `src/systems/ObstacleManager.js` — existing random choices and probabilities for generating the next obstacle segment.
- `src/souls/buildSoulFlameGeometry.js` — procedural soul-flame geometry.
- `src/souls/animateSoulFlame.js` — animation of soul-flame meshes.
- `src/styles/game.css` — HUD and page styles.

This is the first behavior-preserving architecture pass. Collision, HUD, forest construction, and the remaining run-state logic can be extracted individually in later passes.

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
