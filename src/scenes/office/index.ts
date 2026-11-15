// The office: CEO briefing, then search the three suspects' desks. The interrogation is in ../boardroom.
import * as THREE from 'three';
import logo from '../../art/njidion_logo.png';
import { sfx } from '../../audio';
import { setupBattle } from '../../battle';
import { above, game, player, sheets, talk } from '../../game';
import type { Box, P2 } from '../../logic';
import { M, type Room, type Scene, type Thing } from '../../scene';
import { hearts, setObjective, toast, wait } from '../../ui';
import type { Actor } from '../../world';
import * as L from './lines';

const BOUNDS: Box = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
const DOOR: P2 = { x: 9, z: -8 };
const BOARD_DOOR: P2 = { x: -1, z: -8 };
const DESK_X = { A: -3.6, B: 0, C: 3.6 };

let kevin: Actor, cfo: Actor, alice: Actor, rachel: Actor;
let briefed = false, searched = 0;

// ------------------------------------------------------------ story beats
async function briefing() {
  game.busy = true;
  await wait(400);
  await talk(L.BRIEFING);
  setObjective(L.OBJECTIVE.start);
  toast(L.TOAST.mission, 'info', 3500);
  sfx.select();
  game.busy = false;
}

async function search(id: keyof typeof L.DESKS) {
  sfx.search();
  await wait(250);
  if (id === 'C') hearts(...above(player.pos, 2.2), 8);
  else sfx.meh();
  await talk(L.DESKS[id]);
  searched++;
  setObjective(L.OBJECTIVE.progress(searched));
  if (searched < 3) return;
  await talk(L.ALL_SEARCHED);
  game.go('INTERROGATION');
  setObjective(L.OBJECTIVE.boardroom);
  sfx.alert();
}

// ------------------------------------------------------------ geometry
function build(room: Room) {
  room.shell(BOUNDS, [{ wall: 'back', at: DOOR.x }, { wall: 'back', at: BOARD_DOOR.x }]);
  room.box(M.carpet, 11.6, 0.02, 6.2, 0, 0, -0.4);
  room.box(M.rug, 4.4, 0.02, 3.2, -9.2, 0, 4.6);
  // windows on the left wall
  for (const z of [-5, 0.5, 5]) {
    room.box(M.trim, 0.06, 1.7, 3.2, -11.98, 0.85, z);
    room.box(M.glass, 0.06, 1.5, 3.0, -11.95, 0.95, z);
    room.box(M.trim, 0.08, 1.5, 0.06, -11.93, 0.95, z);
  }
  // hallway door leaf, exit sign, boardroom sign
  room.box(M.black, 1.85, 2.2, 0.08, DOOR.x, 0, -8.05);
  room.sign(1.6, 0.4, g => {
    g.fillStyle = '#d9443a'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#fff'; g.font = 'bold 72px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(L.BOARDROOM_SIGN, 256, 68);
  }, BOARD_DOOR.x, 2.75, -7.97);
  room.sign(1.2, 0.4, g => {
    g.fillStyle = '#76b900'; g.fillRect(0, 0, 256, 86);
    g.fillStyle = '#0b0d0f'; g.font = 'bold 56px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('EXIT ➜', 128, 46);
  }, 9, 2.75, -7.97, 0, 256);
  // company logo on the back wall
  room.sign(2.7, 1.8, logo, -4.5, 1.6, -7.98);
  // whiteboard on the left wall
  room.sign(2.6, 1.4, g => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 276);
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 10; g.strokeRect(0, 0, 512, 276);
    g.fillStyle = '#1d4fbf'; g.font = 'bold 34px "Comic Sans MS",cursive';
    g.fillText('Q4 PLAN:', 30, 56);
    g.fillText('1. MORE GPUs', 30, 106);
    g.fillText('2. ???', 30, 152);
    g.fillStyle = '#2a8a2a'; g.fillText('3. PROFIT', 30, 198);
    g.strokeStyle = '#2a8a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(300, 230); g.lineTo(350, 190); g.lineTo(390, 205); g.lineTo(470, 60); g.stroke();
    g.fillStyle = '#d02020'; g.font = 'bold 26px "Comic Sans MS",cursive'; g.fillText('DO NOT LEAK', 300, 258);
  }, -11.97, 1.6, -2.3, Math.PI / 2);

  // searchable desk row (facing +z) and the back-to-back row behind it
  for (const [i, x] of [-3.6, 0, 3.6].entries()) {
    room.desk(x, 0.2, 1);
    room.desk(x, -1.1, -1, i !== 1);
  }
  for (const id of ['A', 'B', 'C'] as const) room.sign(0.85, 0.48, g => {
    g.fillStyle = id === 'C' ? '#2a0508' : '#06120a'; g.fillRect(0, 0, 512, 289);
    g.fillStyle = id === 'C' ? '#ff3b4e' : '#9cff2e'; g.font = 'bold 44px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = L.MONITOR[id].split(' ');
    words.forEach((w, i) => g.fillText(w, 256, 145 + (i - (words.length - 1) / 2) * 56));
  }, DESK_X[id], 1.29, -0.055);
  // CEO corner
  room.box(M.black, 3, 0.1, 1.4, -8.6, 0.76, -5.3);
  room.box(M.black, 2.9, 0.76, 0.12, -8.6, 0, -4.7);
  for (const sx of [-1, 1]) room.box(M.black, 0.12, 0.76, 1.3, -8.6 + sx * 1.4, 0, -5.3);
  room.box(M.black, 1.6, 0.8, 0.06, -8.6, 1.05, -5.7);
  room.box(M.screen, 1.5, 0.7, 0.01, -8.6, 1.1, -5.66);
  room.box(M.chair, 0.8, 1.3, 0.14, -8.6, 0.45, -6.4);
  room.box(M.chair, 0.8, 0.14, 0.7, -8.6, 0.45, -6.05);
  room.solid(-8.6, -5.6, 3.1, 2.1);
  // server racks with blinking LEDs (own material so update() can animate it)
  for (const x of [1.5, 2.5, 3.5]) {
    room.box(M.black, 0.9, 2.3, 0.8, x, 0, -7.45);
    for (let y = 0.4; y < 2.2; y += 0.35) room.box(M.led, 0.5, 0.04, 0.02, x, y, -7.04);
  }
  room.solid(2.5, -7.45, 3.1, 0.9);
  // lounge: couch, coffee table
  room.box(M.couch, 3, 0.45, 1, -9.4, 0, 6.6);
  room.box(M.couch, 3, 0.9, 0.3, -9.4, 0.3, 7.05);
  for (const sx of [-1, 1]) room.box(M.couch, 0.3, 0.75, 1, -9.4 + sx * 1.5, 0, 6.6);
  room.box(M.cushion, 1.3, 0.12, 0.8, -10.1, 0.45, 6.55);
  room.box(M.cushion, 1.3, 0.12, 0.8, -8.7, 0.45, 6.55);
  room.solid(-9.4, 6.7, 3.4, 1.4);
  room.box(M.wood, 1.6, 0.08, 0.8, -9.4, 0.4, 4.5);
  for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) room.box(M.black, 0.06, 0.4, 0.06, -9.4 + dx, 0, 4.5 + dz);
  room.solid(-9.4, 4.5, 1.8, 1);
  // kitchen counter + coffee machine, water cooler
  room.box(M.white, 1.1, 0.95, 4.2, 11.35, 0, 3);
  room.box(M.black, 1.2, 0.06, 4.3, 11.35, 0.95, 3);
  room.box(M.black, 0.5, 0.6, 0.45, 11.4, 1.01, 2);
  room.box(M.red, 0.18, 0.2, 0.15, 11.4, 1.01, 3.6);
  room.solid(11.35, 3, 1.3, 4.4);
  room.box(M.white, 0.5, 1.0, 0.5, 11.3, 0, -2.4);
  room.at(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 10), M.water, 11.3, 1.27, -2.4);
  room.solid(11.3, -2.4, 0.7, 0.7);
  // plants
  room.plant(-11.2, -7.2, true);
  room.plant(6.7, -7.3);
  room.plant(11.2, 7.2, true);
  room.plant(-11.2, 2.4);
  room.plant(-5.8, -7.3);
  room.plant(5.6, 7.2);

  kevin = room.actor('kevin', DESK_X.A + 1.5, 1.4, 2.0);
  cfo = room.actor('cfo', DESK_X.B + 1.5, 1.4);
  alice = room.actor('alice', DESK_X.C + 1.5, 1.4);
  rachel = room.actor('rachel', 10.2, -2.4);
  rachel.face(-1);
  setupBattle(sheets); // resetBattle() needs it even though the battle screen is unused
}

const desk = (id: keyof typeof L.DESKS): Thing => ({
  at: { x: DESK_X[id], z: 0.2 },
  label: L.DESK_LABEL[id],
  once: true,
  when: () => game.state === 'EXPLORATION' && briefed,
  use: () => search(id),
});

export default {
  id: 'office',
  bounds: BOUNDS,
  build,
  things: [
    desk('A'), desk('B'), desk('C'),
    { get at() { return rachel.pos; }, label: 'Talk to Rachel', lines: L.RACHEL, when: () => game.state === 'EXPLORATION' },
  ],
  exits: [{
    area: { minX: 8.2, maxX: 9.8, minZ: -8, maxZ: -7.3 },
    to: 'hallway',
    at: { x: -4.4, z: 0 },
    locked: () => game.state !== 'EXPLORATION' && L.DOOR_LOCKED,
  }, {
    area: { minX: BOARD_DOOR.x - 0.8, maxX: BOARD_DOOR.x + 0.8, minZ: -8, maxZ: -7.3 },
    to: 'boardroom',
    at: { x: -3.6, z: 2 },
    locked: () => game.state === 'EXPLORATION' && L.BOARDROOM_LOCKED,
  }],

  reset() {
    briefed = false;
    searched = 0;
    setObjective('');
  },

  update() {
    // the suspects head to the boardroom once the desks are done
    const atDesks = game.state === 'START' || game.state === 'EXPLORATION';
    for (const a of [kevin, cfo, alice]) a.root.visible = atDesks;
    kevin.lift = atDesks ? Math.abs(Math.sin(performance.now() / 160)) * 0.06 : 0; // nervous gamer bounce
    M.led.color.setHSL(0.25, 1, 0.45 + 0.15 * Math.sin(performance.now() / 1000 * 9));
    if (game.state === 'EXPLORATION' && !briefed && !game.busy) { briefed = true; void briefing(); }
  },
} satisfies Scene;
