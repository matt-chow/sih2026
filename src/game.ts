// Shared run state. Scenes import from here; main.ts owns the loop.
import { preloadArt } from './art';
import { NEXT, type P2, type State } from './logic';
import { $ } from './ui';
import { Actor, World } from './world';

export const world = new World($<HTMLCanvasElement>('scene'));
export const sheets = await preloadArt();
export const player = new Actor(sheets.hensen);
world.scene.add(player.root); // the player persists across rooms; room contents are swapped

export const game = {
  state: 'START' as State,
  /** True while a cutscene or dialogue owns the player: no movement, prompts or exits. */
  busy: false,
  /** Seconds since the run started (HUD timer). */
  elapsed: 0,
  go(next: State) {
    if (NEXT[game.state] !== next) throw new Error(`Illegal transition ${game.state} → ${next}`);
    game.state = next;
    document.body.dataset.state = next;
  },
  /** Start a fresh run. Filled in by main.ts. */
  restart() {},
};

/** Screen position above a world point, for floatText/hearts. */
export function above(p: P2, h = 2.6): [number, number] {
  const s = world.toScreen(p.x, h, p.z);
  return [s.x, s.y];
}
