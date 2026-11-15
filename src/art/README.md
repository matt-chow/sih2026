# Artist drop folder

Drop PNGs here; they are picked up automatically at build time (no code changes).
Anything missing falls back to the procedural SVG art in `src/art.ts`.

| File | Format |
|------|--------|
| `sprite_<id>.png` | 4 walk frames side by side, character facing **right**, each frame 2:3 (e.g. 128x192 → 512x192). Frame 0 doubles as idle. Transparent background. |
| `portrait_<id>_<emotion>.png` | Bust portrait, 5:6 aspect (e.g. 500x600), transparent background. |

Ids: `hensen`, `kevin`, `alice`, `aliceSpy`.
Emotions — hensen: `neutral smug shocked love defeated`; kevin: `panic`; alice: `smile wink`; aliceSpy: `evil`.
