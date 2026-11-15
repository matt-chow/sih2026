// HTML/CSS overlays: HUD, interaction prompt, dialogue, toasts, stock ticker, floaters.
import { portraitFrames, type CharId } from './art';
import { sfx } from './audio';

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function setObjective(text: string) {
  const el = $('objective');
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth; // restart the animation
  el.classList.add('pop');
}

export function showPrompt(label: string | null, x = 0, y = 0) {
  const el = $('prompt');
  el.hidden = !label;
  if (!label) return;
  el.querySelector('span')!.textContent = label;
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}

// ------------------------------------------------------------ dialogue
/** `pose` is the speaker's sprite clip for this line (default 'talk'). */
export interface Line { who: CharId; emo: string; text: string; pose?: string }
const NAMES: Record<CharId, string> = { hensen: 'HENSEN JUANG', kevin: 'KEVIN · ACCOUNTING', alice: 'ALICE' };
const SHAKY = new Set(['shocked', 'panic', 'villain']);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let dialogueOpen = false;
export const isDialogueOpen = () => dialogueOpen;

/** Talking/blinking for one portrait <img>: swaps between pre-decoded frames, timers run only while shown. */
export class PortraitAnim {
  private f = { base: '', talk: ['', ''], blink: '' };
  private mouth = 0;
  private blinking = false;
  private talkTimer = 0;
  private blinkTimer = 0;
  constructor(private img: HTMLImageElement) {}

  show(who: CharId, emo: string) {
    this.f = portraitFrames(who, emo as never);
    this.mouth = 0;
    this.draw();
    clearTimeout(this.blinkTimer);
    const blink = () => {
      this.blinking = true;
      this.draw();
      this.blinkTimer = setTimeout(() => {
        this.blinking = false;
        this.draw();
        this.blinkTimer = setTimeout(blink, 1800 + Math.random() * 2600);
      }, 120);
    };
    this.blinkTimer = setTimeout(blink, 900 + Math.random() * 1500);
  }

  talk(on: boolean) {
    clearTimeout(this.talkTimer);
    if (!on) { this.mouth = 0; this.draw(); return; }
    const flap = () => {
      this.mouth = (this.mouth + 1 + Math.floor(Math.random() * 2)) % 3; // never the same mouth twice
      this.draw();
      this.talkTimer = setTimeout(flap, 80 + Math.random() * 50);
    };
    flap();
  }

  stop() {
    this.talk(false);
    clearTimeout(this.blinkTimer);
    this.blinking = false;
  }

  private draw() {
    const f = this.f;
    this.img.src = this.blinking ? f.blink : this.mouth ? f.talk[this.mouth - 1] : f.base;
    // subtle head bob; `translate`/`rotate` compose with the CSS transform animations
    if (!reducedMotion) {
      this.img.style.translate = `0 ${-this.mouth * 2}px`;
      this.img.style.rotate = `${this.mouth ? (Math.random() - 0.5) * 0.8 : 0}deg`;
    }
  }
}

const portL = new PortraitAnim($<HTMLImageElement>('portL'));
const portR = new PortraitAnim($<HTMLImageElement>('portR'));

/**
 * Visual-novel dialogue. Hensen stands left, everyone else right. Resolves after the last line.
 * `onLine` fires as each line starts, then with null when the dialogue closes (drives the sprites).
 */
export async function dialogue(lines: Line[], onLine?: (line: Line | null) => void) {
  const root = $('dialogue'), name = $('dlgName'), text = $('dlgText');
  const L = $<HTMLImageElement>('portL'), R = $<HTMLImageElement>('portR');
  dialogueOpen = true;
  root.hidden = false;
  L.hidden = R.hidden = true;
  let advance = () => {};
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || !['KeyE', 'Space', 'Enter'].includes(e.code)) return;
    e.preventDefault();
    advance();
  };
  const onClick = () => advance();
  // Let the key that opened the dialogue finish before we listen.
  await wait(120);
  addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', onClick);

  for (const line of lines) {
    const left = line.who === 'hensen';
    const img = left ? L : R, other = left ? R : L, anim = left ? portL : portR;
    (left ? portR : portL).talk(false);
    anim.show(line.who, line.emo);
    anim.talk(true);
    onLine?.(line);
    img.hidden = false;
    img.className = 'portrait active' + (SHAKY.has(line.emo) ? ' shake' : '');
    void img.offsetWidth;
    img.classList.add('enter');
    if (!other.hidden) other.className = 'portrait dim';
    name.textContent = NAMES[line.who];
    name.className = 'dlg-name ' + (left ? 'left' : 'right');
    // typewriter; first press completes, second advances
    let done = false, i = 0;
    await new Promise<void>(res => {
      const finish = () => { done = true; anim.talk(false); root.classList.add('ready'); };
      advance = () => {
        if (!done) { i = line.text.length; text.textContent = line.text; finish(); }
        else res();
      };
      root.classList.remove('ready');
      const tick = () => {
        if (done) return;
        i += 1;
        text.textContent = line.text.slice(0, i);
        if (i % 3 === 0) sfx.blip();
        if (i >= line.text.length) { finish(); return; }
        setTimeout(tick, 22);
      };
      tick();
    });
    sfx.select();
  }
  removeEventListener('keydown', onKey);
  root.removeEventListener('pointerdown', onClick);
  portL.stop();
  portR.stop();
  onLine?.(null);
  root.hidden = true;
  dialogueOpen = false;
}

// ------------------------------------------------------------ toasts & floaters
export function toast(html: string, kind: 'info' | 'achievement' | 'danger', ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = html;
  $('toasts').append(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 500);
}

export function floatText(text: string, x: number, y: number, cls = '') {
  const el = document.createElement('div');
  el.className = 'floater ' + cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  $('floaters').append(el);
  setTimeout(() => el.remove(), 1400);
}

export function hearts(x: number, y: number, n = 8, parent = $('floaters')) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = '❤';
    h.style.left = x + 'px';
    h.style.top = y + 'px';
    h.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
    h.style.setProperty('--dy', `${-80 - Math.random() * 160}px`);
    h.style.setProperty('--r', `${(Math.random() - 0.5) * 80}deg`);
    h.style.animationDelay = `${i * 40}ms`;
    h.style.fontSize = `${18 + Math.random() * 22}px`;
    parent.append(h);
    setTimeout(() => h.remove(), 1600 + i * 40);
  }
}

// ------------------------------------------------------------ stock ticker
export const OPEN_PRICE = 1000;
let price = OPEN_PRICE;
const history: number[] = [];

const fmt = (v: number) => (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);

function drawStock() {
  const pct = (price - OPEN_PRICE) / OPEN_PRICE * 100;
  $('stkPrice').textContent = fmt(price);
  const chg = $('stkChg');
  chg.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
  $('stock').classList.toggle('down', pct < 0);
  const c = $<HTMLCanvasElement>('stkSpark'), g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  const lo = Math.min(...history) - 5, hi = Math.max(...history) + 5;
  g.beginPath();
  history.forEach((v, i) => g.lineTo(i / (history.length - 1) * c.width, c.height - (v - lo) / (hi - lo) * c.height));
  g.strokeStyle = pct < 0 ? '#ff4d5e' : '#8be22b';
  g.lineWidth = 3;
  g.stroke();
}

export const stock = {
  get price() { return price; },
  reset() {
    price = OPEN_PRICE;
    history.length = 0;
    // a little pre-scandal noise so the sparkline has shape
    for (let i = 0; i < 24; i++) history.push(OPEN_PRICE - 6 + Math.sin(i * 1.3) * 4 + i * 0.4);
    history.push(OPEN_PRICE);
    $('stock').hidden = true;
  },
  show() { $('stock').hidden = false; drawStock(); },
  async animate(to: number, ms: number) {
    const from = price, t0 = performance.now();
    await new Promise<void>(res => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        price = from + (to - from) * (1 - (1 - p) ** 3);
        history.push(price);
        if (history.length > 60) history.shift();
        drawStock();
        if (p < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  },
};
export const formatPrice = fmt;
