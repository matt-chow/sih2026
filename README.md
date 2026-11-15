# Njidion: The 60-Second Disaster

A 2.5D browser comedy game (Three.js + TypeScript + Vite). You are Hensen Juang, CEO of Njidion. Find the spy. Lose everything.

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

Each room is a self-contained folder in `src/scenes/<id>/` (`index.ts` = room, `lines.ts` = all its text), picked up automatically. Walking through a door fades and swaps rooms. **See `AGENTS.md`** (also loaded by Claude Code via `CLAUDE.md`) for the full map and recipes: editing dialogue, adding rooms, objects, NPCs and characters.

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
