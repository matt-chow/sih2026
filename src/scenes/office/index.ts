// The office: CEO briefing, search the three suspects' desks, then ONE interrogation (Q) decides the ending.
import * as THREE from 'three';
import logo from '../../art/njidion_logo.png';
import { sfx } from '../../audio';
import { attack, battlePop, battleSay, crash, faint, setupBattle, showEnding, spyReveal, startDuel } from '../../battle';
import { above, game, player, sheets, talk } from '../../game';
import type { Box, P2 } from '../../logic';
import { M, type Room, type Scene, type Thing } from '../../scene';
import { $, floatText, hearts, setObjective, stock, toast, wait } from '../../ui';
import type { Actor } from '../../world';
import * as L from './lines';

const BOUNDS: Box = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
const DOOR: P2 = { x: 9, z: -8 };
const DESK_X = { A: -3.6, B: 0, C: 3.6 };

let jessica: Actor;
const crew = {} as Record<L.Suspect, Actor>;
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
  setObjective(L.OBJECTIVE.interrogate);
  floatText(L.FLOAT.impostor, ...above(crew.cfo.pos, 3), 'big');
  toast(L.TOAST.oneShot, 'info', 4000);
  sfx.alert();
}

async function interrogate(who: L.Suspect) {
  game.go('REVEAL');
  const B = L.BATTLE[who];
  $('hud').hidden = true;
  await startDuel(who, B.name, B.level);
  await battleSay(B.appear, 900);
  for (const m of B.moves) await attack(m.by, m.text, m.dmg, m.fx);
  await faint(B.faint);
  if (who === 'alice') {
    sfx.achievement();
    battlePop(L.FLOAT.win);
    await battleSay(L.BATTLE_WIN, 1200);
    $('battle').hidden = true;
    $('hud').hidden = false;
    crew.alice.root.visible = false;
    floatText(L.FLOAT.arrested, ...above(crew.alice.pos), 'warn');
    stock.show();
    toast(L.TOAST.saved, 'achievement', 2600);
    await stock.animate(1420, 1600);
    await wait(900);
  } else {
    crew[who].root.visible = false;
    await spyReveal(L.SPY_QUOTE);
    crew.alice.root.visible = false;
    sfx.stockDown();
    await crash();
  }
  game.go('ENDING');
  showEnding(game.elapsed, L.VERDICT[who], who === 'alice', () => game.restart());
}

// ------------------------------------------------------------ geometry
function build(room: Room) {
  room.shell(BOUNDS, [{ wall: 'back', at: DOOR.x }]);
  room.box(M.carpet, 11.6, 0.02, 6.2, 0, 0, -0.4);
  room.box(M.rug, 4.4, 0.02, 3.2, -9.2, 0, 4.6);
  // windows on the left wall
  for (const z of [-5, 0.5, 5]) {
    room.box(M.trim, 0.06, 1.7, 3.2, -11.98, 0.85, z);
    room.box(M.glass, 0.06, 1.5, 3.0, -11.95, 0.95, z);
    room.box(M.trim, 0.08, 1.5, 0.06, -11.93, 0.95, z);
  }
  // hallway door leaf and exit sign
  room.box(M.black, 1.85, 2.2, 0.08, DOOR.x, 0, -8.05);
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
  // every screen shows the logo, except Alice's
  for (const x of [DESK_X.A, DESK_X.B]) room.sign(0.72, 0.48, logo, x, 1.29, -0.055);
  for (const x of Object.values(DESK_X)) room.sign(0.72, 0.48, logo, x, 1.29, -0.845, Math.PI);
  room.sign(0.85, 0.48, g => {
    g.fillStyle = '#2a0508'; g.fillRect(0, 0, 512, 289);
    g.fillStyle = '#ff3b4e'; g.font = 'bold 44px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = L.ALICE_MONITOR.split(' ');
    words.forEach((w, i) => g.fillText(w, 256, 145 + (i - (words.length - 1) / 2) * 56));
  }, DESK_X.C, 1.29, -0.055);
  // Brad's finance setup: crashing ticker on a second monitor, oat latte, quarterly reports
  room.box(M.black, 0.06, 0.2, 0.06, 0.82, 0.78, -0.1);
  room.box(M.black, 0.52, 0.36, 0.05, 0.82, 0.95, -0.1);
  room.sign(0.46, 0.3, g => {
    g.fillStyle = '#12060a'; g.fillRect(0, 0, 512, 334);
    g.strokeStyle = '#ff3b4e'; g.lineWidth = 12; g.beginPath(); g.moveTo(20, 60);
    for (const [x, y] of [[90, 90], [140, 70], [210, 150], [270, 130], [340, 220], [400, 200], [490, 300]]) g.lineTo(x, y);
    g.stroke();
    g.fillStyle = '#ff3b4e'; g.font = 'bold 54px ui-monospace,monospace'; g.textAlign = 'right';
    g.fillText(L.TICKER[0], 490, 70); g.fillText(L.TICKER[1], 490, 130);
  }, 0.82, 1.13, -0.07);
  room.at(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 10), M.white, -0.8, 0.85, 0.4);
  room.at(new THREE.CylinderGeometry(0.052, 0.048, 0.05, 10), M.wood, -0.8, 0.85, 0.4);
  room.box(M.white, 0.3, 0.05, 0.38, -0.72, 0.78, -0.05);
  room.box(M.red, 0.28, 0.02, 0.36, -0.72, 0.83, -0.05);
  // CEO corner
  room.box(M.black, 3, 0.1, 1.4, -8.6, 0.76, -5.3);
  room.box(M.black, 2.9, 0.76, 0.12, -8.6, 0, -4.7);
  for (const sx of [-1, 1]) room.box(M.black, 0.12, 0.76, 1.3, -8.6 + sx * 1.4, 0, -5.3);
  room.box(M.black, 1.6, 0.8, 0.06, -8.6, 1.05, -5.7);
  room.box(M.screen, 1.5, 0.7, 0.01, -8.6, 1.1, -5.66);
  room.sign(1.05, 0.7, logo, -8.6, 1.45, -5.65);
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

  crew.kevin = room.actor('kevin', DESK_X.A + 1.5, 1.4, 2.0);
  crew.cfo = room.actor('cfo', DESK_X.B + 1.5, 1.4);
  crew.alice = room.actor('alice', DESK_X.C + 1.5, 1.4);
  jessica = room.actor('jessica', 10.2, -2.4);
  jessica.face(-1);
  setupBattle(sheets); // resetBattle() needs it even though the battle screen is unused
}

const desk = (id: keyof typeof L.DESKS): Thing => ({
  at: { x: DESK_X[id], z: 0.2 },
  label: L.DESK_LABEL[id],
  once: true,
  when: () => game.state === 'EXPLORATION' && briefed,
  use: () => search(id),
});

// after the desks: E chats for free, Q is the one interrogation
const suspect = (who: L.Suspect): Thing => ({
  get at() { return crew[who].pos; },
  label: L.LABEL.chat[who],
  lines: L.CHAT[who],
  when: () => game.state === 'INTERROGATION',
  alt: { label: L.LABEL.interrogate, use: () => interrogate(who) },
});

export default {
  id: 'office',
  bounds: BOUNDS,
  build,
  things: [
    desk('A'), desk('B'), desk('C'),
    suspect('kevin'), suspect('cfo'), suspect('alice'),
    { get at() { return jessica.pos; }, label: 'Talk to Jessica', lines: L.JESSICA, when: () => game.state === 'EXPLORATION' },
    { get at() { return crew.cfo.pos; }, label: 'Talk to Brad', lines: L.BRAD, when: () => game.state === 'EXPLORATION' && briefed },
  ],
  exits: [{
    area: { minX: 8.2, maxX: 9.8, minZ: -8, maxZ: -7.3 },
    to: 'hallway',
    at: { x: -4.4, z: 0 },
    locked: () => game.state !== 'EXPLORATION' && L.DOOR_LOCKED,
  }],

  reset() {
    briefed = false;
    searched = 0;
    setObjective('');
    for (const a of Object.values(crew)) a.root.visible = true;
  },

  update() {
    crew.kevin.lift = Math.abs(Math.sin(performance.now() / 160)) * 0.06; // nervous gamer bounce
    M.led.color.setHSL(0.25, 1, 0.45 + 0.15 * Math.sin(performance.now() / 1000 * 9));
    if (game.state === 'EXPLORATION' && !briefed && !game.busy) { briefed = true; void briefing(); }
  },
} satisfies Scene;
