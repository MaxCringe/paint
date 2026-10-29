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
- `src/game.js` — the existing Three.js game engine and gameplay loop. The tightly coupled loop remains intact in this first migration to avoid changing behavior.
- `src/config.js` — shared gameplay constants.
- `src/world/buildFernGeometry.js` — reusable procedural fern geometry.
- `src/souls/buildSoulFlameGeometry.js` — procedural soul-flame geometry.
- `src/souls/animateSoulFlame.js` — animation of soul-flame meshes.
- `src/styles/game.css` — HUD and page styles.

This is the first behavior-preserving architecture pass. Collision, obstacle, HUD, forest, and player systems can be extracted individually after the Vite build is confirmed.

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
