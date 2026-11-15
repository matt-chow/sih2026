# NGIDIA: The 60-Second Disaster

A 2.5D browser comedy game (Three.js + TypeScript + Vite). Work in progress.

```bash
npm install
npm run dev     # local dev server
npm test        # pure-logic tests (Node 24+)
npm run build   # type-check + production build
```

Controls: **WASD / arrows** move, **E / Space / Enter** interact and advance dialogue.

## Layout

| File | What | Status |
|------|------|--------|
| `src/logic.ts` | FSM transition table, circle-vs-box collision, evasive-button rect placement, waypoint following. DOM-free, tested in `tests/`. | done |
| `src/art.ts` | Procedural SVG sprites and portraits; auto-uses artist PNGs from `src/art/`. | done |
| `src/audio.ts` | Web Audio sound effects (`sfx.*`). | done |
| `src/world.ts` | Office scene, iso camera, colliders, billboard actors. | in progress |
| `src/ui.ts` | Dialogue, toasts, stock ticker, HUD (HTML/CSS overlays). | todo |
| `src/battle.ts` | Battle screen, evasive choices, betrayal + stock crash, ending. | todo |
| `src/main.ts` | Game loop and story flow through the FSM states. | todo |

Gameplay (`world.ts`, `main.ts`) and UI (`ui.ts`, `battle.ts`) are separate so two people can work in parallel.

## Artists

See `src/art/README.md`. Drop PNGs with the listed names into `src/art/`; they replace the placeholder art automatically.
