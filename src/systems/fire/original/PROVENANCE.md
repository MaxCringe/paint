# User-provided Fire Studio sources

Source: `knotty-pine-—-fire-studio.zip`, supplied with the Fire Studio 2.0 request.
Archive SHA256: `b6a843411b8b624f1b5dc679437ce6ade80bb95e16259301d7482c2ae1c7c5f5`.

The archive files are dated 2026-11-02. No third-party package called Fire Studio
was installed. Three.js stays at 0.160.0.

| Original | Original SHA256 | Port |
| --- | --- | --- |
| src/fire-lib/math.ts | ad9e7f75a4e0b9982616db6300ce4b2baa8aeae5ab2546a41b69956f6a6c2c51 | Math.js |
| src/fire-lib/geometry.ts | 7d5626fdd5d4b8d72495fbcef6119880f2132ecbd8702e0af4c080904e7385a6 | Geometry.js |
| src/fire-lib/shaders.ts | 93d9e9ffc3a130dfc0e34c29ac723c630ebe3d4c898a79aab63de13331733ec6 | Shaders.js |

TypeScript annotations and imports of erased types were removed. The noise source
constant is exported for reuse. Equations and geometry generators remain here;
r160 batching and deliberate game-specific changes live in OriginalRendererAdapter,
OriginalPreset and EditableFire. The original math tests were retained with their
import path adapted. The React application, demo renderer, per-emitter system class
and demo game assets are not instantiated alongside the game's runtime.
