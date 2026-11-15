# Njidion: The 60-Second Disaster — agent guide

2.5D browser comedy RPG. Three.js + TypeScript + Vite, no backend. You play Hensen Juang, CEO of Njidion.

```bash
npm run dev     # http://localhost:5173
npm run build   # type-check + bundle. Run after EVERY change: it catches bad dialogue (who/emo typos) too.
npm test        # pure-logic tests (src/logic.ts)
```

## The one rule

**Content lives in `src/scenes/<id>/`. The engine does not change when content changes.**
Adding a room, an object, an NPC, or rewriting jokes touches only that scene's folder
(and, for a new door, the room it connects to). If a request truly needs a new engine capability,
add **one optional field** to `Scene` / `Thing` / `Exit` in `src/scene.ts` (or one `Room` helper),
implement it in `src/main.ts`, and leave every existing scene untouched.

## Map

| Path | What | Edit when |
|------|------|-----------|
| `src/scenes/<id>/lines.ts` | **All words** for that room: dialogue, objectives, toasts, floaters. | Making it funnier. |
| `src/scenes/<id>/index.ts` | The room: geometry (`build`), interactables (`things`), doors (`exits`), story logic. | Changing the room. |
| `src/scenes/index.ts` | Auto-registry (globs every scene folder) + `START` room/position + boot-time validation of doors. | Changing where the game starts. |
| `src/scene.ts` | `Scene`, `Thing`, `Exit` types; `Room` builder (`shell`, `box`, `desk`, `plant`, `sign`, `actor`, `solid`…); materials `M`. | New engine capability only. |
| `src/main.ts` | Engine: input, movement, collisions, prompts, door travel with fade, run reset. | New engine capability only. |
| `src/game.ts` | Shared state scenes import: `game` (story `state`, `go()`, `busy`, `elapsed`), `player`, `world`, `above()`, `talk()` (dialogue that also poses the sprites). | Rarely. |
| `src/logic.ts` | Story FSM (`State`, `NEXT`), collision, path following. DOM-free, tested. | Adding a story state (also update `tests/logic.test.ts`, which counts states). |
| `src/art.ts` | Character assets: `EMOTIONS` (portraits with talk/blink frames), `ANIMS` (pixel-art sprite clips, painted by `paintSprite`), procedural SVG portrait fallback. | New character, emotion or pose. |
| `src/ui.ts` | Dialogue box, toasts, floaters, stock ticker. `NAMES` = name tag per character. | New character. |
| `src/battle.ts` | Pokémon-style duel primitives (`startDuel`, `attack`, `faint`, `spyReveal`), stock crash, ending card. The duel *script* is `BATTLE` in `src/scenes/office/lines.ts`. | New battle effects. |
| `index.html` | Title screen, battle buttons, crash ticker, ending text. | Those screens' text. |
| `src/art/` | Artist PNG/WebP drop folder; its README is the asset manifest. Also `njidion_logo.png`. | New art. |

## Recipes

### Make dialogue funnier
Edit `src/scenes/<id>/lines.ts`. Each line is `{ who, emo, text }`, plus an optional `pose` (the speaker's sprite clip, default `talk`):

| who | emo | pose |
|-----|-----|------|
| `hensen` (left portrait) | `neutral` `smug` `shocked` `determined` `love` `defeated` | `idle` `talk` `shocked` |
| `kevin` | `nervous` `panic` | `idle` `panic` `stumble` |
| `cfo` | `hype` `panic` | `idle` `talk` `panic` |
| `alice` | `smile` `wink` `dramatic` `villain` | `idle` `talk` `dramatic` `villain` |
| `jessica` | `neutral` `friendly` | `idle` `talk` |

Add or remove lines freely; arrays can be any length. Toast strings are HTML (`<b>` title, `<span>` subtitle).

### Add an interactable to a room
Append to that scene's `things`, with its text in `lines.ts`:
```ts
{ at: { x: 3, z: -1.5 }, label: 'Inspect coffee machine', lines: L.COFFEE },
```
Scenes that play dialogue in code use `await talk(L.X)` from `game.ts`.
Optional: `once: true` (gone after use), `when: () => game.state === 'EXPLORATION'`,
`alt: { label: 'INTERROGATE', use: async () => { ... } }` (a second action on the Q key, shown in the same prompt),
`use: async () => { ... }` (runs after `lines`; sounds via `sfx.*`, popups via `toast`/`floatText`).
The green marker and the "E" prompt are automatic. Usable within 2.2 units of `at`.

### Add a new room
1. Copy `src/scenes/hallway/` to `src/scenes/<newid>/`. Set `id: '<newid>'`. It is registered automatically.
2. Set `bounds` (walkable floor), then in `build(room)`: `room.shell(bounds, doors)` for floor and walls, then furniture.
   Call `room.solid(x, z, w, d)` for anything the player must not walk through.
3. Connect it **both ways**: an `exits` entry in the new room *and* one in an existing room pointing back.
4. `npm run build`, then `npm run dev` and walk through both doors.

Boot throws a clear error if an exit points at a missing room, lands outside the target's bounds,
or lands inside the target's own exit (which would bounce the player straight back).

### Add an NPC to talk to
```ts
let bob: Actor;                                   // module level
// in build(room):
bob = room.actor('kevin', 2, 1);                  // optional 4th arg: height (default 2.1)
// in things (the getter makes the prompt follow bob if he moves):
{ get at() { return bob.pos; }, label: 'Talk to Kevin', lines: L.KEVIN_CHAT },
```
Move NPCs in `update(dt)` (walk animation is automatic); put them back in `reset()`.
Only characters that have art can appear (see next recipe).

### Add a new character
1. `src/art.ts`: add the id to `CharId` and `EMOTIONS`, a palette in `PAL`, one `FACES` entry per emotion
   (mix existing eyes/brows/mouths), `ANIMS` clips (start with `...base(<move clip>)` for idle/move in every facing) and a `MOVE` entry.
   Optional bespoke hair/clothes branches in `portraitSVG`/`paintSprite`.
2. `src/ui.ts`: add a name tag to `NAMES`.
3. Optional: drop artist PNG/WebP files in `src/art/` (names and frame order in `src/art/README.md`).

### Story gating
The global story is the linear FSM in `src/logic.ts` (`START → EXPLORATION → … → ENDING`); `game.go(next)` throws on an
illegal jump. Scenes read `game.state` to decide what is available (`when`, `locked`). Set `game.busy = true` to freeze
the player during a cutscene and `false` after. `things[].use` is already wrapped in busy.

## Coordinates and layout

- Ground plane is x/z, y is up. One unit ≈ one metre; characters are ~2.1 tall, player radius 0.4.
- Camera is isometric: **screen-right = +x −z**, **screen-up = −x −z**.
- `room.shell` builds the **back wall at z = minZ** (top-right on screen) and **left wall at x = minX** (top-left).
  Front and right edges stay open so the camera sees in. Doors go on back or left walls: `{ wall: 'back', at: x }`
  or `{ wall: 'left', at: z }`, 2 units wide.
- An exit `area` must reach about 0.7 into the room from the wall (the player's centre stops 0.4 short of `bounds`).
  Example for a back-wall door at x = 9: `{ minX: 8.2, maxX: 9.8, minZ: minZ, maxZ: minZ + 0.7 }`.
- Wall decorations: `room.sign(w, h, art, x, y, z)` at `z = minZ + 0.02` (back) or
  `x = minX + 0.02, ry = Math.PI / 2` (left). `art` is an imported image URL or a canvas draw function
  (canvas is `px` = 512 wide by default, height follows the aspect ratio).
- Rooms are built once at boot and kept; leaving and re-entering keeps their state. `reset()` runs on each new run.
- The camera centres small rooms; big rooms (wider than ~14 or deeper than ~10) scroll with the player.

## Style

- Comedy first: short lines, one joke per line, Hensen is clueless and smug.
- Keep every player-visible string in `lines.ts` (battle/title text are the existing exceptions, see Map).
- Reuse materials from `M` and `Room` helpers before writing raw Three.js.
- Do not add dependencies.
