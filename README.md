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

## Temporary in-game VFX editor (development only)

The main menu has **✦ РЕДАКТОР ЭФФЕКТОВ · DEV**. This standalone editor
pauses the hidden game scene and shows live Three.js previews of the existing
broom particle trail, broom material appearance, witch hat, Misty shawl, blue soul flames and ultimate aura. It never
changes gameplay rules, item probabilities or ability durations.

- Select a category on the top row, then adjust visible effect parameters.
  The broom has separate **flight** and **last 3 seconds** phases.
- **Сохранить в браузере** keeps local visual overrides on this device only.
  Closing the editor without saving reverts the current unsaved values.
- **Сбросить категорию** restores that category's defaults in the editor
  (save afterward to retain the reset).
- **КОПИРОВАТЬ ВСЕ ЗНАЧЕНИЯ** exports the full versioned JSON preset for
  all six categories, including any unsaved changes. Colors of component materials
  and separate broom smoke/cough/spark/streak/glow layers are included. Paste this JSON into
  ChatGPT to request a reviewed source-code update for every player.
- Runtime visual settings: `src/effects/EffectVisualProfiles.js`,
  `src/powerups/BroomVisualProfiles.js`. UI and its CSS:
  `src/devtools/EffectEditor.js` and `src/devtools/EffectEditor.css`.
  The optional editor loads from `src/main.js` only while enabled.

### Disable completely before public release

In Vercel project's **Environment Variables**, set
`VITE_ENABLE_EFFECT_EDITOR=false` for Production, then **redeploy**.
For local release verification run:

```bash
VITE_ENABLE_EFFECT_EDITOR=false npm run build
```

This build condition prevents importing the optional editor module, keeps the
menu button hidden and ignores local editor overrides. The source files stay
in the repository for future internal development. Re-enable only for
controlled development builds by removing or changing that environment
variable, then rebuilding. This is a **feature switch, not a security/access
control mechanism**: while enabled, everyone using that build can see the
editor.

## Текущая структура разработки Фионы и проверки

- **Обычный персонаж:** `src/player/Fiona.js`. Он остаётся основным игровым персонажем.
- **Новая Фиона со скелетом:** `public/models/fiona/rigged-model (1) (1).fbx`; используется только в тестовом забеге.
- **Собственные движения:** Python/NumPy-генератор `tools/generate_fiona_motions.py` создал 23 анимации в `public/models/fiona/animations/motions.json.gz`. Их подготавливают `src/player/FionaPythonMotions.js` и `src/player/FionaTest.js`. Сторонние `Run Forward.fbx` и `Jump.fbx` в тесте не нужны.
- **Ввод:** `src/systems/GameInput.js` (клавиатура и свайпы), **достижения:** `src/systems/RunRecords.js`.
- **Проверки:** `npm test` для правил и `npm run test:browser` для Chromium с WebGL. Для локального браузерного теста сначала выполните `npm run build` и `npx playwright install chromium`.

Подробная карта, устранённые ошибки и остающиеся ограничения: [аудит и журнал исправлений](docs/code-audit-2026-11-01.md).

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
- `src/obstacles/PineLog.js` — full-width suspended pine log, shared mesh geometry, and roadside supports.
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
- Suspended pine logs block all three lanes: slide to pass underneath. On the broom Fiona bends from the waist, brings her arms and legs closer to the shaft, and lowers slightly to duck beneath the log, without compressing or pitching the entire model. She straightens afterward; the ride remains active through the crossing. Ultimate keeps its normal altitude, and upright trees remain dangerous.
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
