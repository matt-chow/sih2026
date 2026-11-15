// The office: search the desks, chase Kevin, meet Alice, then the battle (battle.ts).
import * as THREE from 'three';
import logo from '../../art/njidion_logo.png';
import { sfx } from '../../audio';
import { battleIntro, battleTransition, betrayal, chooseWhatMatters, setupBattle, showEnding } from '../../battle';
import { above, game, player, sheets, talk, world } from '../../game';
import { followPath, resolveCircle, type Box, type P2 } from '../../logic';
import { M, type Room, type Scene, type Thing } from '../../scene';
import { $, floatText, hearts, setObjective, stock, toast, wait } from '../../ui';
import { SCREEN_RIGHT, type Actor } from '../../world';
import * as L from './lines';

const BOUNDS: Box = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
const DOOR: P2 = { x: 9, z: -8 };
// Kevin's escape route: around the desk block, through the lounge, out the door.
const SPY_PATH: P2[] = [
  { x: 5.4, z: 1.2 }, { x: 7.2, z: 2.2 }, { x: 7.2, z: 5.4 }, { x: -1, z: 5.6 }, { x: -6.4, z: 5.2 },
  { x: -6.4, z: -3.4 }, { x: 0, z: -3.6 }, { x: 6.6, z: -3.9 }, { x: 9, z: -6.6 }, { x: 9, z: -9.2 },
];
const SPY_SPEED = 4.3;

let kevin: Actor, alice: Actor, colliders: Box[];
const doorPivot = new THREE.Group();
let doorOpen = false, searched = 0, stumbles = 0;
let spyIdx = 0, spyStun = 0, spyBoost = 0, spyCooldown = 0;
let aliceWalking = false, aliceTimer = 0;

// ------------------------------------------------------------ story beats
async function search(id: keyof typeof L.DESKS) {
  sfx.search();
  await wait(300);
  if (id !== 'C') {
    sfx.meh();
    await talk(L.DESKS[id]);
    searched++;
    setObjective(searched === 2 ? L.OBJECTIVE.lastDesk : L.OBJECTIVE.nothing);
    return;
  }
  sfx.alert();
  world.shake = 0.6;
  await talk(L.DESKS.C);
  game.go('SPY_REVEAL');
  kevin.face(-1);
  floatText(L.FLOAT.kevinSpotted, ...above(kevin.pos), 'big');
  sfx.alert();
  await talk(L.SPY);
  game.go('CHASE');
  setObjective(L.OBJECTIVE.chase);
  sfx.run();
}

async function spyEscaped() {
  kevin.root.visible = false;
  sfx.door();
  game.go('SPY_ESCAPE');
  setObjective(L.OBJECTIVE.escaped);
  setTimeout(() => (doorOpen = false), 400);
  toast(L.TOAST.escaped, 'danger', 2600);
  stock.show();
  await wait(500);
  sfx.stockDown();
  await stock.animate(970, 1100);
  await wait(250);
  sfx.achievement();
  toast(L.TOAST.jacket, 'achievement', 3000);
  await wait(1200);
  if (game.state !== 'SPY_ESCAPE') return;
  doorOpen = true;
  sfx.door();
  alice.root.visible = true;
  alice.set(DOOR.x, DOOR.z - 0.4);
  aliceWalking = true;
  setObjective(L.OBJECTIVE.who);
}

async function aliceEncounter() {
  game.go('ALICE_ENCOUNTER');
  aliceWalking = false;
  game.busy = true; // stays busy until Replay
  doorOpen = false;
  const sx = (alice.pos.x - player.pos.x) * SCREEN_RIGHT.x + (alice.pos.z - player.pos.z) * SCREEN_RIGHT.z;
  player.face(sx >= 0 ? 1 : -1);
  alice.face(sx >= 0 ? -1 : 1);
  sfx.romance();
  hearts(...above(alice.pos, 2.2), 10);
  hearts(...above(player.pos, 2.2), 6);
  await wait(700);
  await talk(L.ALICE);
  game.go('BATTLE_TRANSITION');
  $('hud').hidden = true;
  await battleTransition();
  game.go('BATTLE_CHOICE');
  await battleIntro();
  await chooseWhatMatters();
  game.go('ALICE_REVEAL');
  await betrayal();
  game.go('ENDING');
  showEnding(game.elapsed, stumbles, () => game.restart());
}

function updateChase(dt: number) {
  spyCooldown -= dt;
  if (spyStun > 0) {
    spyStun -= dt;
    kevin.tilt = Math.sin(spyStun * 30) * 0.25 - 0.35;
    kevin.anim = 'stumble';
    if (spyStun <= 0) { kevin.tilt = 0; kevin.anim = null; }
    return;
  }
  const speed = spyBoost > 0 ? 7.5 : SPY_SPEED;
  spyBoost -= dt;
  spyIdx = followPath(kevin.pos, SPY_PATH, spyIdx, speed * dt);
  kevin.lift = 0;
  if (spyIdx >= SPY_PATH.length - 3) doorOpen = true;
  if (spyIdx === SPY_PATH.length - 1) { void spyEscaped(); return; }
  // caught up: Kevin trips, recovers, sprints. He always gets away.
  if (spyCooldown <= 0 && Math.hypot(kevin.pos.x - player.pos.x, kevin.pos.z - player.pos.z) < 1.15) {
    spyStun = 0.55;
    spyBoost = 1.1;
    spyCooldown = 2.2;
    stumbles++;
    sfx.stumble();
    world.shake = 0.35;
    floatText(L.FLOAT.kevinTrips, ...above(kevin.pos), 'warn');
    floatText(L.FLOAT.hensenMisses[stumbles % L.FLOAT.hensenMisses.length], ...above(player.pos, 2.9));
  }
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
  // door leaf (animated) and exit sign
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.black);
  leaf.scale.set(1.85, 2.2, 0.08);
  leaf.position.set(0.95, 1.1, 0);
  doorPivot.position.set(8.05, 0, -8.05);
  doorPivot.add(leaf);
  room.add(doorPivot);
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

  kevin = room.actor('kevin', SPY_PATH[0].x, SPY_PATH[0].z, 2.0);
  alice = room.actor('alice', DOOR.x, DOOR.z - 0.6);
  colliders = room.colliders;
  setupBattle(sheets);
}

const desk = (id: keyof typeof L.DESKS, x: number): Thing => ({
  at: { x, z: 0.2 },
  label: id === 'C' ? "Search Kevin's desk" : 'Search desk',
  once: true,
  when: () => game.state === 'EXPLORATION',
  use: () => search(id),
});

export default {
  id: 'office',
  bounds: BOUNDS,
  build,
  things: [desk('A', -3.6), desk('B', 0), desk('C', 3.6)],
  exits: [{
    area: { minX: 8.2, maxX: 9.8, minZ: -8, maxZ: -7.3 },
    to: 'hallway',
    at: { x: -4.4, z: 0 },
    locked: () => game.state !== 'EXPLORATION' && L.DOOR_LOCKED,
  }],

  reset() {
    kevin.set(SPY_PATH[0].x, SPY_PATH[0].z);
    kevin.face(-1);
    kevin.root.visible = true;
    kevin.tilt = 0;
    alice.root.visible = false;
    alice.set(DOOR.x, DOOR.z - 0.6);
    doorOpen = false;
    searched = stumbles = spyIdx = 0;
    spyStun = spyBoost = spyCooldown = 0;
    aliceWalking = false; aliceTimer = 0;
    setObjective(L.OBJECTIVE.start);
  },

  update(dt) {
    doorPivot.rotation.y += ((doorOpen ? 1.7 : 0) - doorPivot.rotation.y) * (1 - Math.exp(-dt * 8));
    M.led.color.setHSL(0.25, 1, 0.45 + 0.15 * Math.sin(performance.now() / 1000 * 9));
    // Kevin idles nervously, then runs the route
    if (game.state === 'EXPLORATION' || game.state === 'SPY_REVEAL') kevin.lift = Math.abs(Math.sin(performance.now() / 160)) * 0.06;
    if (game.state === 'CHASE') updateChase(dt);
    if (game.state === 'SPY_ESCAPE' && aliceWalking) {
      aliceTimer += dt;
      const d = Math.hypot(alice.pos.x - player.pos.x, alice.pos.z - player.pos.z);
      if (d > 1.8) {
        alice.pos.x += (player.pos.x - alice.pos.x) / d * 2.6 * dt;
        alice.pos.z += (player.pos.z - alice.pos.z) / d * 2.6 * dt;
        // once inside, she walks around furniture like everyone else
        if (alice.pos.z > -7.4) resolveCircle(alice.pos, 0.4, colliders, BOUNDS);
      }
      if (d < 2.4 || aliceTimer > 7) void aliceEncounter(); // shortcut: timeout guards against her snagging on a corner
    }
  },
} satisfies Scene;
