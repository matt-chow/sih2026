# NGIDIA: The 60-Second Disaster

A 2.5D browser comedy game (Three.js + TypeScript + Vite). You are Hensen Juang, CEO of NGIDIA. Find the spy. Lose everything.

```bash
npm install
npm run dev       # local dev server
npm test          # pure-logic tests (Node 24+)
npm run build     # type-check + production build into dist/
npm run preview   # serve dist/ locally
```

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | Move |
| E / Space / Enter | Interact, advance dialogue |
| Mouse or arrows + Enter | Battle choices |
| M | Mute |

## Story flow

`START → EXPLORATION → SPY_REVEAL → CHASE → SPY_ESCAPE → ALICE_ENCOUNTER → BATTLE_TRANSITION → BATTLE_CHOICE → ALICE_REVEAL → ENDING` (Replay returns to EXPLORATION). The transition table is in `src/logic.ts`; an illegal transition throws.

## Layout

| File | What |
|------|------|
| `src/logic.ts` | FSM table, circle-vs-box collision, evasive-button placement, waypoint following. DOM-free, tested in `tests/`. |
| `src/art.ts` | Procedural SVG sprites and portraits; auto-uses artist PNGs from `src/art/`. |
| `src/audio.ts` | Web Audio sound effects (`sfx.*`), no audio files. |
| `src/world.ts` | Office scene (geometry merged per material), iso camera, colliders, billboard actors, adaptive pixel ratio. |
| `src/ui.ts` | Dialogue, toasts, stock ticker, HUD (HTML/CSS overlays). |
| `src/battle.ts` | Battle wipe, evasive choices, betrayal, stock crash, ending screen. |
| `src/main.ts` | Game loop and story script through the FSM states. |

Gameplay (`world.ts`, `main.ts`) and UI (`ui.ts`, `battle.ts`) are separate so people can work in parallel. Dialogue text lives at the top of `main.ts` (`DESK_LINES`, `SPY_LINES`, `ALICE_LINES`).

## Artists

See `src/art/README.md`. Drop PNGs with the listed names into `src/art/`; they replace the placeholder art automatically on the next build.

## Deploy (Vercel)

It is a static site: no backend, no environment variables.

**From GitHub (recommended):** vercel.com → Add New → Project → import this repo. Vercel detects Vite; the defaults are correct (build command `npm run build`, output directory `dist`). Every push to a branch gets a preview URL; `main` deploys to production.

**From the CLI:**

```bash
npx vercel          # first run links the project, creates a preview deploy
npx vercel --prod   # production deploy
```

Any other static host works too: run `npm run build` and upload `dist/`.
