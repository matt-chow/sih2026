import './style.css';
import { preloadArt } from './art';
import { initAudio, sfx, toggleMute } from './audio';
import { battleIntro, battleTransition, betrayal, chooseWhatMatters, resetBattle, setupBattle, showEnding } from './battle';
import { NEXT, followPath, resolveCircle, type P2, type State } from './logic';
import { $, dialogue, floatText, hearts, isDialogueOpen, setObjective, showPrompt, stock, toast, wait, type Line } from './ui';
import { Actor, DOOR, ROOM, SCREEN_RIGHT, SCREEN_UP, World, type Desk, type DeskId } from './world';

// ------------------------------------------------------------ script
const DESK_LINES: Record<DeskId, Line[]> = {
  A: [
    { who: 'hensen', emo: 'neutral', text: 'Marketing desk. 312 stickers that say "RGB IS A LIFESTYLE."' },
    { who: 'hensen', emo: 'smug', text: 'Suspicious only in how correct they are.' },
  ],
  B: [
    { who: 'hensen', emo: 'neutral', text: 'A GPU duct-taped to a toaster. Sticky note: "IT RUNS CRYSIS NOW."' },
    { who: 'hensen', emo: 'smug', text: 'Not a crime. Promote this man.' },
  ],
  C: [
    { who: 'hensen', emo: 'shocked', text: '"TOTALLY NOT STOLEN CHIP BLUEPRINTS — deliver to RIVAL CORP." Signed: KEVIN.' },
    { who: 'hensen', emo: 'shocked', text: 'KEVIN?!' },
  ],
};
const SPY_LINES: Line[] = [
  { who: 'kevin', emo: 'panic', text: 'M-Mr. Juang! Those are just my… vacation photos!' },
  { who: 'kevin', emo: 'panic', text: 'Of a chip. In Bermuda. OKAY BYE!!' },
];
const ALICE_LINES: Line[] = [
  { who: 'alice', emo: 'smile', text: 'Mr. Juang! I heard about Kevin… you must be so stressed.' },
  { who: 'hensen', emo: 'love', text: 'W-who are you? My heart is overclocking.' },
  { who: 'alice', emo: 'wink', text: 'Just Alice. From Accounting. I would NEVER betray you~' },
  { who: 'alice', emo: 'smile', text: "Let's settle this… the old-fashioned way!" },
];

// Kevin's escape route: around the desk block, through the lounge, out the door.
const SPY_PATH: P2[] = [
  { x: 5.4, z: 1.2 }, { x: 7.2, z: 2.2 }, { x: 7.2, z: 5.4 }, { x: -1, z: 5.6 }, { x: -6.4, z: 5.2 },
  { x: -6.4, z: -3.4 }, { x: 0, z: -3.6 }, { x: 6.6, z: -3.9 }, { x: 9, z: -6.6 }, { x: 9, z: -9.2 },
];
const HENSEN_START: P2 = { x: -8.6, z: -3.4 };
const PLAYER_R = 0.4;
const WALK = 4.6, RUN = 5.6, SPY_SPEED = 4.3;

// ------------------------------------------------------------ boot
const world = new World($<HTMLCanvasElement>('scene'));
const sheets = await preloadArt();
setupBattle(sheets);
const hensen = new Actor(world, sheets.hensen);
const kevin = new Actor(world, sheets.kevin, 2.0);
const alice = new Actor(world, sheets.alice);
$('loading').remove();

let state: State = 'START';
function go(next: State) {
  if (NEXT[state] !== next) throw new Error(`Illegal transition ${state} → ${next}`);
  state = next;
  document.body.dataset.state = next;
}

// per-run state
let busy = false, t0 = 0, elapsed = 0, stumbles = 0;
let spyIdx = 0, spyStun = 0, spyBoost = 0, spyCooldown = 0;
let aliceWalking = false, aliceTimer = 0;

function resetRun() {
  hensen.set(HENSEN_START.x, HENSEN_START.z);
  hensen.face(1);
  kevin.set(SPY_PATH[0].x, SPY_PATH[0].z);
  kevin.face(-1);
  kevin.root.visible = true;
  kevin.tilt = 0;
  alice.root.visible = false;
  alice.set(DOOR.x, DOOR.z - 0.6);
  for (const d of world.desks) { d.searched = false; d.marker.visible = true; }
  world.doorOpen = false;
  busy = false; stumbles = 0; spyIdx = 0; spyStun = spyBoost = spyCooldown = 0;
  aliceWalking = false; aliceTimer = 0;
  stock.reset();
  resetBattle();
  $('toasts').replaceChildren();
  $('floaters').replaceChildren();
  $('hud').hidden = false;
  setObjective('Someone is leaking secrets. Search the desks.');
  t0 = performance.now();
}

function begin() {
  initAudio();
  $('title').hidden = true;
  resetRun();
  go('EXPLORATION');
  sfx.select();
}

// ------------------------------------------------------------ input
const keys = new Set<string>();
let interact = false;
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && state !== 'BATTLE_CHOICE') e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyM') $('mute').textContent = toggleMute() ? '🔇 M' : '🔊 M';
  if (state === 'START' && ['Enter', 'Space', 'KeyE'].includes(e.code)) begin();
  else if (['KeyE', 'Space', 'Enter'].includes(e.code) && !isDialogueOpen()) interact = true;
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
$('start').addEventListener('click', begin);

function inputDir() {
  const h = (+keys.has('KeyD') || +keys.has('ArrowRight')) - (+keys.has('KeyA') || +keys.has('ArrowLeft'));
  const v = (+keys.has('KeyW') || +keys.has('ArrowUp')) - (+keys.has('KeyS') || +keys.has('ArrowDown'));
  let x = SCREEN_RIGHT.x * h + SCREEN_UP.x * v, z = SCREEN_RIGHT.z * h + SCREEN_UP.z * v;
  const len = Math.hypot(x, z);
  if (len > 0) { x /= len; z /= len; }
  return { x, z };
}

const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z);
const above = (a: Actor, h = 2.6) => world.toScreen(a.pos.x, h, a.pos.z);

// ------------------------------------------------------------ story beats
async function search(d: Desk) {
  busy = true;
  d.searched = true;
  d.marker.visible = false;
  showPrompt(null);
  sfx.search();
  await wait(300);
  if (d.id !== 'C') {
    sfx.meh();
    await dialogue(DESK_LINES[d.id]);
    const left = world.desks.filter(x => !x.searched).length;
    setObjective(left === 1 ? 'One desk left. It\'s always the last desk.' : 'Nothing. Keep searching.');
    busy = false;
    return;
  }
  sfx.alert();
  world.shake = 0.6;
  await dialogue(DESK_LINES.C);
  go('SPY_REVEAL');
  for (const x of world.desks) x.marker.visible = false;
  kevin.face(-1);
  floatText('!!', ...xy(above(kevin)), 'big');
  sfx.alert();
  await dialogue(SPY_LINES);
  go('CHASE');
  setObjective('CATCH KEVIN!');
  sfx.run();
  busy = false;
}

const xy = (p: { x: number; y: number }): [number, number] => [p.x, p.y];

async function spyEscaped() {
  kevin.root.visible = false;
  sfx.door();
  go('SPY_ESCAPE');
  setObjective('Kevin escaped…');
  setTimeout(() => (world.doorOpen = false), 400);
  toast('<b>KEVIN ESCAPED</b><span>with <code>chip_blueprints_FINAL_v2.zip</code></span>', 'danger', 2600);
  stock.show();
  await wait(500);
  sfx.stockDown();
  await stock.animate(970, 1100);
  await wait(250);
  sfx.achievement();
  toast('<i>🏆</i><b>LEATHER JACKET UNLOCKED</b><span>You were already wearing it.</span>', 'achievement', 3000);
  await wait(1200);
  if (state !== 'SPY_ESCAPE') return;
  world.doorOpen = true;
  sfx.door();
  alice.root.visible = true;
  alice.set(DOOR.x, DOOR.z - 0.4);
  aliceWalking = true;
  setObjective('…who\'s that?');
}

async function aliceEncounter() {
  go('ALICE_ENCOUNTER');
  aliceWalking = false;
  busy = true;
  showPrompt(null);
  world.doorOpen = false;
  const sx = (alice.pos.x - hensen.pos.x) * SCREEN_RIGHT.x + (alice.pos.z - hensen.pos.z) * SCREEN_RIGHT.z;
  hensen.face(sx >= 0 ? 1 : -1);
  alice.face(sx >= 0 ? -1 : 1);
  sfx.romance();
  hearts(...xy(above(alice, 2.2)), 10);
  hearts(...xy(above(hensen, 2.2)), 6);
  await wait(700);
  await dialogue(ALICE_LINES);
  go('BATTLE_TRANSITION');
  $('hud').hidden = true;
  await battleTransition();
  go('BATTLE_CHOICE');
  await battleIntro();
  await chooseWhatMatters();
  go('ALICE_REVEAL');
  await betrayal();
  go('ENDING');
  showEnding(elapsed, stumbles, () => { resetRun(); go('EXPLORATION'); });
}

// ------------------------------------------------------------ frame update
function update(dt: number) {
  const playing = state !== 'START' && state !== 'ENDING';
  if (playing && state !== 'ALICE_REVEAL') elapsed = (performance.now() - t0) / 1000;
  $('timer').textContent = elapsed.toFixed(1) + 's';

  const canMove = !busy && (state === 'EXPLORATION' || state === 'CHASE' || state === 'SPY_ESCAPE');
  if (canMove) {
    const d = inputDir(), speed = state === 'CHASE' ? RUN : WALK;
    hensen.pos.x += d.x * speed * dt;
    hensen.pos.z += d.z * speed * dt;
    resolveCircle(hensen.pos, PLAYER_R, world.colliders, ROOM);
  }

  // interaction prompt
  if (state === 'EXPLORATION' && !busy) {
    const near = world.desks.find(d => !d.searched && dist(hensen.pos, { x: d.x, z: d.z + 1.9 }) < 1.4);
    if (near) {
      const p = world.toScreen(near.x, 1.6, near.z);
      showPrompt(near.id === 'C' ? "Search Kevin's desk" : 'Search desk', p.x, p.y);
      if (interact) void search(near);
    } else showPrompt(null);
  }
  interact = false;

  // Kevin idles nervously, then runs the route
  if (state === 'EXPLORATION' || state === 'SPY_REVEAL') kevin.lift = Math.abs(Math.sin(performance.now() / 160)) * 0.06;
  if (state === 'CHASE') updateChase(dt);

  if (state === 'SPY_ESCAPE' && aliceWalking) {
    aliceTimer += dt;
    const d = dist(alice.pos, hensen.pos);
    if (d > 1.8) {
      alice.pos.x += (hensen.pos.x - alice.pos.x) / d * 2.6 * dt;
      alice.pos.z += (hensen.pos.z - alice.pos.z) / d * 2.6 * dt;
      // once inside, she walks around furniture like everyone else
      if (alice.pos.z > -7.4) resolveCircle(alice.pos, PLAYER_R, world.colliders, ROOM);
    }
    if (d < 2.4 || aliceTimer > 7) void aliceEncounter(); // shortcut: timeout guards against her snagging on a corner
  }

  hensen.animate(dt);
  kevin.animate(dt);
  alice.animate(dt);
  world.update(dt, state === 'START' ? { x: 0, z: 0 } : hensen.pos);
}

function updateChase(dt: number) {
  spyCooldown -= dt;
  if (spyStun > 0) {
    spyStun -= dt;
    kevin.tilt = Math.sin(spyStun * 30) * 0.25 - 0.35;
    if (spyStun <= 0) kevin.tilt = 0;
    return;
  }
  const speed = spyBoost > 0 ? 7.5 : SPY_SPEED;
  spyBoost -= dt;
  spyIdx = followPath(kevin.pos, SPY_PATH, spyIdx, speed * dt);
  kevin.lift = 0;
  if (spyIdx >= SPY_PATH.length - 3) world.doorOpen = true;
  if (spyIdx === SPY_PATH.length - 1) { void spyEscaped(); return; }
  // caught up: Kevin trips, recovers, sprints. He always gets away.
  if (spyCooldown <= 0 && dist(kevin.pos, hensen.pos) < 1.15) {
    spyStun = 0.55;
    spyBoost = 1.1;
    spyCooldown = 2.2;
    stumbles++;
    sfx.stumble();
    world.shake = 0.35;
    floatText('*TRIPS*', ...xy(above(kevin)), 'warn');
    floatText(['Got y—!', 'Almost!', 'KEVIN!!'][stumbles % 3], ...xy(above(hensen, 2.9)));
  }
}

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  world.render();
  requestAnimationFrame(loop);
}
resetRun();
$('hud').hidden = true;
document.body.dataset.state = state;
requestAnimationFrame(loop);

// Exposed for automated playthrough tests.
Object.assign(window, { __game: { get state() { return state; }, hensen, kevin, alice, world } });
