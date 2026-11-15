// Engine: input, player movement, room swapping, interaction prompts. Story lives in src/scenes/.
import './style.css';
import type * as THREE from 'three';
import { initAudio, sfx, toggleMute } from './audio';
import { resetBattle } from './battle';
import { above, cast, game, player, talk, world } from './game';
import { resolveCircle, type P2 } from './logic';
import { Room, type Exit, type Scene, type Thing } from './scene';
import { SCENES, START } from './scenes';
import { $, floatText, isDialogueOpen, showPrompt, stock, wait } from './ui';
import { SCREEN_RIGHT, SCREEN_UP } from './world';

const PLAYER_R = 0.4, WALK = 4.6, REACH = 2.2;

// ------------------------------------------------------------ rooms
// Every room is built once at boot; walking through a door swaps which one is in the scene graph.
interface Built { scene: Scene; room: Room; markers: Map<Thing, THREE.Object3D> }
const rooms = new Map<string, Built>(SCENES.map(scene => {
  const room = new Room();
  scene.build(room);
  const markers = new Map((scene.things ?? []).map(t => [t, room.marker(t.at)] as const));
  room.finish();
  return [scene.id, { scene, room, markers }];
}));
let here = rooms.get(START.scene)!;
const used = new Set<Thing>();
let blockedBy: Exit | null = null;

function enter(id: string, at: P2) {
  world.scene.remove(here.room.group);
  here = rooms.get(id)!;
  world.scene.add(here.room.group);
  player.set(at.x, at.z);
  world.jump = true;
  here.scene.enter?.();
}

async function travel(e: Exit) {
  game.busy = true;
  sfx.door();
  $('fade').classList.add('on');
  await wait(220);
  enter(e.to, e.at);
  $('fade').classList.remove('on');
  game.busy = false;
}

const available = (t: Thing) => !(t.once && used.has(t)) && (t.when?.() ?? true);

async function use(t: Thing) {
  game.busy = true;
  if (t.once) used.add(t);
  if (t.lines) await talk(t.lines);
  await t.use?.();
  game.busy = false;
}

// ------------------------------------------------------------ runs
let t0 = 0;
function newRun() {
  game.busy = false;
  game.elapsed = 0;
  used.clear();
  blockedBy = null;
  for (const s of SCENES) s.reset?.();
  for (const a of cast) a.anim = null;
  stock.reset();
  resetBattle();
  $('toasts').replaceChildren();
  $('floaters').replaceChildren();
  $('hud').hidden = false;
  enter(START.scene, START.at);
  player.face(1);
  t0 = performance.now();
}
game.restart = () => { newRun(); game.go('EXPLORATION'); };

function begin() {
  initAudio();
  $('title').hidden = true;
  newRun();
  game.go('EXPLORATION');
  sfx.select();
}

// ------------------------------------------------------------ input
const keys = new Set<string>();
let interact = false;
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyM') $('mute').textContent = toggleMute() ? '🔇 M' : '🔊 M';
  if (game.state === 'START' && ['Enter', 'Space', 'KeyE'].includes(e.code)) begin();
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
const inside = (p: P2, b: Exit['area']) => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;

// ------------------------------------------------------------ frame update
function update(dt: number) {
  const { state } = game, { scene, room } = here;
  if (state !== 'START' && state !== 'REVEAL' && state !== 'ENDING') game.elapsed = (performance.now() - t0) / 1000;
  $('timer').textContent = game.elapsed.toFixed(1) + 's';

  const free = !game.busy && state !== 'START' && state !== 'ENDING';
  if (free) {
    const d = inputDir(), speed = WALK;
    player.pos.x += d.x * speed * dt;
    player.pos.z += d.z * speed * dt;
    resolveCircle(player.pos, PLAYER_R, room.colliders, scene.bounds);

    const exit = scene.exits?.find(e => inside(player.pos, e.area));
    const msg = exit?.locked?.();
    if (exit && !msg) void travel(exit);
    else if (exit && msg && blockedBy !== exit) { sfx.nope(); floatText(msg, ...above(player.pos, 2.9)); }
    blockedBy = exit && msg ? exit : null;
  }

  // interaction prompt for the nearest usable thing
  const near = free ? scene.things?.filter(available).map(t => ({ t, d: dist(player.pos, t.at) })).filter(n => n.d < REACH).sort((a, b) => a.d - b.d)[0]?.t : undefined;
  if (near) {
    const p = world.toScreen(near.at.x, 1.6, near.at.z);
    showPrompt(near.label, p.x, p.y);
    if (interact) void use(near);
  } else showPrompt(null);
  interact = false;

  const t = performance.now() / 1000;
  for (const [thing, m] of here.markers) {
    m.visible = available(thing);
    m.rotation.y += dt * 2;
    m.position.set(thing.at.x, 2.1 + Math.sin(t * 3 + thing.at.x) * 0.1, thing.at.z);
  }

  scene.update?.(dt);
  player.animate(dt);
  for (const a of room.actors) a.animate(dt);
  const b = scene.bounds;
  world.update(dt, state === 'START' ? { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 } : player.pos, b);
}

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  world.render();
  requestAnimationFrame(loop);
}
newRun();
$('hud').hidden = true;
$('loading').remove();
document.body.dataset.state = game.state;
requestAnimationFrame(loop);

// Exposed for automated playthrough tests.
Object.assign(window, { __game: { get state() { return game.state; }, get scene() { return here.scene.id; }, player, world, game } });
