// Final act: RPG wipe, parody battle, evasive choices, betrayal, stock crash, ending.
import { frameURL, portraitSrc, type Sheets } from './art';
import { sfx } from './audio';
import { placeRect, type Rect } from './logic';
import { $, wait, hearts, stock, formatPrice, OPEN_PRICE, PortraitAnim } from './ui';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINAL_PRICE = -420.69;

// ------------------------------------------------------------ transition
/** Encounter flash → double spinning wipe to black → iris open on the battle screen. */
export function battleTransition(): Promise<void> {
  const el = $('wipe');
  el.hidden = false;
  const t0 = performance.now();
  sfx.flash();
  let flashed = 1;
  return new Promise(res => {
    const step = () => {
      const t = performance.now() - t0;
      if (t < 420) {
        // two soft flashes (kept under 3/s for photosensitivity)
        const on = !reducedMotion && Math.floor(t / 105) % 2 === 0;
        el.style.background = on ? 'rgba(255,255,255,.75)' : 'transparent';
        if (t > 210 && flashed === 1) { flashed = 2; sfx.flash(); }
      } else if (t < 1250) {
        if (flashed === 2) { flashed = 3; sfx.wipe(); }
        const p = (t - 420) / 830, e = p * p * (3 - 2 * p);
        const a = e * 180, rot = e * 270;
        el.style.background = `conic-gradient(from ${rot}deg, #050607 0 ${a}deg, transparent ${a}deg 180deg, #050607 180deg ${180 + a}deg, transparent ${180 + a}deg)`;
      } else if (t < 1650) {
        $('battle').hidden = false;
        const r = (t - 1250) / 400 * 80;
        el.style.background = `radial-gradient(circle at 50% 50%, transparent ${r}%, #050607 ${r + 0.5}%)`;
      } else {
        el.hidden = true;
        el.style.background = '';
        return res();
      }
      requestAnimationFrame(step);
    };
    step();
  });
}

// ------------------------------------------------------------ battle screen
async function say(text: string, hold = 900) {
  const el = $('btText');
  el.textContent = '';
  for (let i = 1; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    if (i % 2 === 0) sfx.blip();
    await wait(18);
  }
  await wait(hold);
}

// battle stand-ins, Alice mirrored to face left; her villain frame is the same outfit in a new pose
let frames: Record<'hensen' | 'shocked' | 'alice' | 'dramatic' | 'villain', string>;
let revealAnim: PortraitAnim;

export function setupBattle(sheets: Sheets) {
  frames = {
    hensen: frameURL(sheets.hensen, 'idle'),
    shocked: frameURL(sheets.hensen, 'shocked'),
    alice: frameURL(sheets.alice, 'idle', 0, true),
    dramatic: frameURL(sheets.alice, 'dramatic', 0, true),
    villain: frameURL(sheets.alice, 'villain', 0, true),
  };
  revealAnim = new PortraitAnim($<HTMLImageElement>('btRevealImg'));
}

export function resetBattle() {
  const b = $('battle');
  b.hidden = true;
  b.className = '';
  $('btReveal').hidden = true;
  $('crash').hidden = true;
  $('ending').hidden = true;
  $('choices').hidden = true;
  $('btText').textContent = '';
  revealAnim.stop();
  $<HTMLImageElement>('btHensen').src = frames.hensen;
  $<HTMLImageElement>('btAlice').src = frames.dramatic;
  document.querySelectorAll('.quip').forEach(q => q.remove());
}

export async function battleIntro() {
  sfx.battleStart();
  $('battle').classList.add('in');
  await say('A wild ALICE appeared!', 700);
  $<HTMLImageElement>('btAlice').src = frames.alice;
  $('btHensen').classList.add('hit');
  hearts(...centerOf('btHensen'), 6, $('btFx'));
  sfx.romance();
  await say('ALICE used BAT EYELASHES! It\'s super effective!', 800);
  $('btHensen').classList.remove('hit');
}

function centerOf(id: string): [number, number] {
  const r = $(id).getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

// ------------------------------------------------------------ evasive choices
interface Evader {
  el: HTMLButtonElement; key: string; x: number; y: number; tx: number; ty: number;
  homeX: number; homeY: number; fleeing: boolean; rot: number; quip: number;
}
const QUIPS: Record<string, string[]> = {
  njidion: ['Not now. Board meeting.', 'Shareholders can\'t hear you.', 'I\'m vesting, go away.'],
  family: ['Dad, it\'s my recital…', 'We moved to Ohio in 2019.', 'Who are you again?'],
  america: ['🦅 CAAAAW!', 'FREEDOM DODGES!', 'Tariffs say no.'],
};

function quip(e: Evader) {
  const list = QUIPS[e.key];
  const q = document.createElement('div');
  q.className = 'quip ' + e.key;
  q.textContent = list[e.quip++ % list.length];
  const r = e.el.getBoundingClientRect();
  q.style.left = r.left + r.width / 2 + 'px';
  q.style.top = r.top + 'px';
  $('battle').append(q);
  setTimeout(() => q.remove(), 1300);
  $('btLive').textContent = `${e.el.textContent} refuses to be chosen.`;
}

/** Shows the four choices; resolves only when Alice is chosen. */
export function chooseWhatMatters(): Promise<void> {
  const box = $('choices');
  box.hidden = false;
  void say('HENSEN! WHAT MATTERS MOST TO YOU?', 0);
  const buttons = [...box.querySelectorAll<HTMLButtonElement>('button')];
  const aliceBtn = buttons.find(b => b.dataset.k === 'alice')!;
  const anchor = $('btBox').getBoundingClientRect();
  // 2x2 grid in the right half of the text box; Alice bottom-right
  const cw = Math.min(220, anchor.width * 0.24), ch = 52, gap = 12;
  const gx = anchor.right - 2 * cw - gap - 24, gy = anchor.top + anchor.height / 2 - ch - gap / 2;
  const homes = [[gx, gy], [gx + cw + gap, gy], [gx, gy + ch + gap], [gx + cw + gap, gy + ch + gap]];
  buttons.forEach((b, i) => {
    b.style.width = cw + 'px';
    b.style.height = ch + 'px';
    b.style.transform = `translate(${homes[i][0]}px, ${homes[i][1]}px)`;
  });
  const evaders: Evader[] = buttons.filter(b => b !== aliceBtn).map((el, i) => ({
    el, key: el.dataset.k!, x: homes[i][0], y: homes[i][1], tx: homes[i][0], ty: homes[i][1],
    homeX: homes[i][0], homeY: homes[i][1], fleeing: false, rot: 0, quip: 0,
  }));
  const aliceRect = (): Rect => {
    const r = aliceBtn.getBoundingClientRect();
    // 24px pad covers the evaders' tilt
    return { x: r.left - 24, y: r.top - 24, w: r.width + 48, h: r.height + 48 };
  };
  // 24px margin covers the tilt and the focus outline
  const bounds = (): Rect => ({ x: 24, y: 24, w: innerWidth - 48, h: innerHeight - 48 });
  let mx = -1e4, my = -1e4, last = performance.now(), running = true;
  const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
  addEventListener('pointermove', onMove);

  const teleport = (e: Evader) => {
    // farthest in-bounds spot from the cursor
    const b = bounds(), r = e.el.getBoundingClientRect();
    const spots = [[b.x, b.y], [b.x + b.w - r.width, b.y], [b.x, b.y + b.h * 0.45], [b.x + b.w - r.width, b.y + b.h * 0.45]];
    spots.sort((p, q) => Math.hypot(q[0] - mx, q[1] - my) - Math.hypot(p[0] - mx, p[1] - my));
    const p = placeRect({ x: spots[0][0], y: spots[0][1], w: r.width, h: r.height }, b, aliceRect());
    e.x = e.tx = p.x; e.y = e.ty = p.y;
    sfx.poof();
  };

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const R = 150;
    for (const e of evaders) {
      const w = e.el.offsetWidth, h = e.el.offsetHeight;
      const cx = e.x + w / 2, cy = e.y + h / 2;
      let dx = cx - mx, dy = cy - my;
      const d = Math.hypot(dx, dy) || 1;
      if (d < R) {
        dx /= d; dy /= d;
        if (e.key === 'family') { const s = Math.sin(now / 90) * 0.8; [dx, dy] = [dx - dy * s, dy + dx * s]; }
        if (e.key === 'america') dy -= 0.7;
        const push = R - d + 30;
        e.tx = e.x + dx * push; e.ty = e.y + dy * push;
        if (!e.fleeing) { e.fleeing = true; quip(e); sfx.dodge(e.key === 'america' ? 1.5 : e.key === 'family' ? 0.7 : 1); }
      } else if (d > R * 1.6) {
        e.fleeing = false;
        e.tx += (e.homeX - e.tx) * dt * 0.6; e.ty += (e.homeY - e.ty) * dt * 0.6;
      }
      const p = placeRect({ x: e.tx, y: e.ty, w, h }, bounds(), aliceRect());
      e.tx = p.x; e.ty = p.y;
      // cornered against a wall: vanish to the far side
      if (Math.hypot(e.tx + w / 2 - mx, e.ty + h / 2 - my) < 50) teleport(e);
      const k = 1 - Math.exp(-dt * (e.key === 'family' ? 9 : e.key === 'america' ? 20 : 15));
      // clamp the drawn position too: the lerp path can cut across Alice
      const q = placeRect({ x: e.x + (e.tx - e.x) * k, y: e.y + (e.ty - e.y) * k, w, h }, bounds(), aliceRect());
      e.x = q.x; e.y = q.y;
      const target = e.key === 'america' && e.fleeing ? 360 : e.key === 'njidion' && e.fleeing ? -8 : 0;
      e.rot += (target - e.rot) * k;
      if (!e.fleeing && e.key === 'america' && Math.abs(e.rot) > 300) e.rot = 0;
      // america flips on X so its bounding box never grows past the clamp margin
      e.el.style.transform = `translate(${e.x}px, ${e.y}px) ${e.key === 'america' ? 'rotateX' : 'rotate'}(${e.rot}deg)`;
      e.el.classList.toggle('fleeing', e.fleeing);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // keyboard: arrows move focus around the 2x2 grid
  const onKey = (ev: KeyboardEvent) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[ev.key];
    if (move === undefined) return;
    ev.preventDefault();
    buttons[((i < 0 ? 0 : i) + move + 4) % 4].focus();
  };
  addEventListener('keydown', onKey);
  buttons[0].focus({ preventScroll: true });

  return new Promise(res => {
    const onClick = (ev: MouseEvent) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b) return;
      const e = evaders.find(x => x.el === b);
      if (e) {
        // keyboard activation (or a lucky click): refuse with a reaction
        sfx.nope();
        quip(e);
        b.classList.remove('nope');
        void b.offsetWidth;
        b.classList.add('nope');
        if (ev.detail > 0) teleport(e);
        return;
      }
      running = false;
      removeEventListener('pointermove', onMove);
      removeEventListener('keydown', onKey);
      box.removeEventListener('click', onClick);
      res();
    };
    box.addEventListener('click', onClick);
  });
}

// ------------------------------------------------------------ betrayal
export async function betrayal() {
  const battle = $('battle'), alice = $<HTMLImageElement>('btAlice');
  // 1. love wins (for about a second)
  $('choices').classList.add('chosen');
  sfx.love();
  hearts(...centerOf('btAlice'), 22, $('btFx'));
  $('btHensen').classList.add('hop');
  await say('HENSEN chose ALICE! ❤ True love is super effective!', 650);
  $('choices').hidden = true;
  $('choices').classList.remove('chosen');
  $('btHensen').classList.remove('hop');

  // 2. glitch + reveal
  sfx.glitch();
  battle.classList.add('glitch');
  await wait(650);
  alice.src = frames.villain;
  $<HTMLImageElement>('btHensen').src = frames.shocked;
  battle.classList.remove('glitch');
  battle.classList.add('evil');
  sfx.sting();
  revealAnim.show('alice', 'villain');
  $('btReveal').hidden = false;
  await say('ALICE used INSIDER TRADING!', 1700);
  $('btText').textContent = '"Thanks for the root password, darling~ 💚"';
  revealAnim.talk(true);
  await wait(1300);
  revealAnim.stop();

  // 3. the crash
  await crash();
}

async function crash() {
  const root = $('crash'), c = $<HTMLCanvasElement>('crashChart'), g = c.getContext('2d')!;
  root.hidden = false;
  const dpr = Math.min(devicePixelRatio, 2);
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  const W = c.width, H = c.height;
  const start = stock.price, end = FINAL_PRICE;
  const yMax = 1150, yMin = -650;
  const Y = (v: number) => H * 0.08 + (yMax - v) / (yMax - yMin) * H * 0.84;
  const pts: number[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    // flat-ish with the earlier dip, then a cliff that blows straight through $0
    const v = t < 0.35 ? OPEN_PRICE - (OPEN_PRICE - start) * Math.min(1, t / 0.2) + Math.sin(i) * 6
      : start + (end - start) * ((t - 0.35) / 0.65) ** 1.6 + Math.sin(i * 1.7) * 18 * (1 - t);
    pts.push(t === 1 ? end : v);
  }
  const priceEl = $('crashPrice'), pctEl = $('crashPct');
  sfx.plunge();
  const t0 = performance.now(), DUR = 2600;
  let boomed = false;
  await new Promise<void>(res => {
    const draw = () => {
      const p = Math.min(1, (performance.now() - t0) / DUR);
      const n = Math.max(2, Math.floor(p * pts.length));
      g.clearRect(0, 0, W, H);
      // grid
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = dpr;
      for (let v = -600; v <= 1000; v += 200) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(W, Y(v)); g.stroke(); }
      // red zone below zero
      g.fillStyle = 'rgba(255,40,60,.10)'; g.fillRect(0, Y(0), W, H - Y(0));
      g.setLineDash([10 * dpr, 8 * dpr]); g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; g.font = `bold ${14 * dpr}px "Space Grotesk",system-ui`; g.fillText('$0.00 — "this is fine"', 12 * dpr, Y(0) - 8 * dpr);
      // line + area
      const X = (i: number) => i / (pts.length - 1) * W * 0.92 + W * 0.02;
      const v = pts[n - 1];
      g.beginPath();
      for (let i = 0; i < n; i++) g.lineTo(X(i), Y(pts[i]));
      g.strokeStyle = v < 0 ? '#ff2d47' : '#ff6b5e'; g.lineWidth = 5 * dpr; g.lineJoin = 'round'; g.stroke();
      g.lineTo(X(n - 1), H); g.lineTo(X(0), H); g.closePath();
      g.fillStyle = 'rgba(255,45,71,.15)'; g.fill();
      // tip
      g.fillStyle = '#fff'; g.beginPath(); g.arc(X(n - 1), Y(v), 7 * dpr, 0, 7); g.fill();
      priceEl.textContent = formatPrice(v);
      pctEl.textContent = `▼ ${Math.abs((v - OPEN_PRICE) / OPEN_PRICE * 100).toFixed(2)}%`;
      root.style.setProperty('--shake', `${reducedMotion ? 0 : Math.max(0, p - 0.3) * 18}px`);
      if (v < 0 && !boomed) { boomed = true; sfx.boom(); root.classList.add('negative'); }
      if (p < 1) requestAnimationFrame(draw); else res();
    };
    draw();
  });
  await wait(1400);
  root.style.setProperty('--shake', '0px');
}

// ------------------------------------------------------------ ending
export function showEnding(seconds: number, stumbles: number, onReplay: () => void) {
  sfx.defeat();
  $('crash').hidden = true;
  $('crash').classList.remove('negative');
  $('battle').hidden = true;
  const el = $('ending');
  el.hidden = false;
  $<HTMLImageElement>('endPortrait').src = portraitSrc('hensen', 'defeated');
  $('endStats').innerHTML = `
    <dt>Final share price</dt><dd class="neg">${formatPrice(FINAL_PRICE)}</dd>
    <dt>Spies caught</dt><dd>0 of 2</dd>
    <dt>Times Kevin tripped</dt><dd>${stumbles}</dd>
    <dt>Leather jackets unlocked</dt><dd>1 (already wearing it)</dd>
    <dt>Disaster duration</dt><dd>${seconds.toFixed(1)}s</dd>`;
  const btn = $<HTMLButtonElement>('replay');
  btn.onclick = () => { sfx.select(); onReplay(); };
  btn.focus({ preventScroll: true });
}
