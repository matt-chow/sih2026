// The boardroom: the suspects line up, E chats, Q is the ONE interrogation (a Pokémon-style duel). Every path ends with Alice's betrayal.
import logo from '../../art/njidion_logo.png';
import { sfx } from '../../audio';
import { attack, battleSay, chooseAlice, crash, faint, showEnding, spyReveal, startDuel } from '../../battle';
import { above, game } from '../../game';
import type { Box, P2 } from '../../logic';
import { M, type Room, type Scene, type Thing } from '../../scene';
import { $, floatText, setObjective, toast, wait } from '../../ui';
import type { Actor } from '../../world';
import * as L from './lines';

const BOUNDS: Box = { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };
const DOOR_Z = 2;
// police lineup in front of the conference table
const SPOT: Record<L.Suspect, P2> = { kevin: { x: -2, z: -1.6 }, cfo: { x: 0.6, z: -1.6 }, alice: { x: 3.2, z: -1.6 } };

const crew = {} as Record<L.Suspect, Actor>;
let introduced = false;

async function intro() {
  game.busy = true;
  await wait(300);
  setObjective(L.OBJECTIVE);
  floatText(L.FLOAT.impostor, ...above(SPOT.cfo, 3), 'big');
  toast(L.TOAST.oneShot, 'info', 4000);
  sfx.alert();
  game.busy = false;
}

async function interrogate(who: L.Suspect) {
  game.go('REVEAL');
  const B = L.BATTLE[who];
  $('hud').hidden = true;
  await startDuel(who, B.name, B.level);
  await battleSay(B.appear, 900);
  if (who === 'alice') {
    // the original ending: she charms, Hensen picks her, she was the spy all along
    for (const m of B.moves) await attack(m.by, m.text, m.dmg, m.fx);
    await chooseAlice();
  } else {
    await chooseAlice();
    for (const m of B.moves) await attack(m.by, m.text, m.dmg, m.fx);
    if (B.faint) await faint(B.faint);
    crew[who].root.visible = false;
  }
  await spyReveal(who === 'alice' ? L.BETRAYAL_QUOTE : L.SPY_QUOTE);
  crew.alice.root.visible = false;
  sfx.stockDown();
  await crash();
  game.go('ENDING');
  showEnding(game.elapsed, L.VERDICT[who], false, () => game.restart());
}

function build(room: Room) {
  room.shell(BOUNDS, [{ wall: 'left', at: DOOR_Z }], ['#b9b4aa', '#b1aca2']);
  room.box(M.rug, 8, 0.02, 4.6, 0.6, 0, -1.2);
  // the projector screen asks the audience directly
  room.sign(4.2, 1.5, g => {
    g.fillStyle = '#0b0d0f'; g.fillRect(0, 0, 512, 183);
    g.fillStyle = '#76b900'; g.font = '900 54px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    L.SCREEN.forEach((t, i) => g.fillText(t, 256, 58 + i * 66));
  }, 0.6, 2.1, -3.98);
  room.sign(1.4, 0.95, logo, -3.6, 2.1, -3.98);
  // conference table behind the lineup
  room.box(M.wood, 7.4, 0.1, 1.2, 0.6, 0.74, -3.1);
  for (const x of [-2.9, 4.1]) room.box(M.black, 0.12, 0.74, 1, x, 0, -3.1);
  room.solid(0.6, -3.1, 7.6, 1.4);
  room.plant(4.4, -3.4, true);
  room.plant(-4.4, 3.4);

  crew.kevin = room.actor('kevin', SPOT.kevin.x, SPOT.kevin.z, 2.0);
  crew.cfo = room.actor('cfo', SPOT.cfo.x, SPOT.cfo.z);
  crew.alice = room.actor('alice', SPOT.alice.x, SPOT.alice.z);
}

// E chats for free, Q is the one interrogation
const suspect = (who: L.Suspect): Thing => ({
  at: SPOT[who],
  label: L.LABEL.chat[who],
  lines: L.CHAT[who],
  when: () => game.state === 'INTERROGATION',
  alt: { label: L.LABEL.interrogate, use: () => interrogate(who) },
});

export default {
  id: 'boardroom',
  bounds: BOUNDS,
  build,
  things: [suspect('kevin'), suspect('cfo'), suspect('alice')],
  exits: [{
    area: { minX: BOUNDS.minX, maxX: BOUNDS.minX + 0.7, minZ: DOOR_Z - 0.8, maxZ: DOOR_Z + 0.8 },
    to: 'office',
    at: { x: -1, z: -6.6 },
    locked: () => L.NO_LEAVING,
  }],

  reset() {
    introduced = false;
    for (const a of Object.values(crew)) a.root.visible = true;
  },

  update() {
    crew.kevin.lift = Math.abs(Math.sin(performance.now() / 160)) * 0.06; // nervous gamer bounce
    if (game.state === 'INTERROGATION' && !introduced && !game.busy) { introduced = true; void intro(); }
  },
} satisfies Scene;
