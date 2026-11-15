// Character art pipeline. One design per character, two tiers:
//  - dialogue portraits: big busts per expression, each with 2 talk frames and a blink frame;
//  - in-game sprites: a strip of small frames grouped into named animations (ANIMS).
// Everything is procedural SVG unless an artist file with the matching name exists in
// src/art/ (see src/art/README.md) — then that wins.

export type CharId = 'hensen' | 'kevin' | 'alice';
export const EMOTIONS = {
  hensen: ['neutral', 'smug', 'shocked', 'determined', 'love', 'defeated'],
  kevin: ['nervous', 'panic'],
  alice: ['smile', 'wink', 'dramatic', 'villain'],
} as const;
export type Emotion<C extends CharId = CharId> = (typeof EMOTIONS)[C][number];

const overrides = import.meta.glob('./art/*.{png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const override = (name: string): string | undefined => overrides[`./art/${name}.webp`] ?? overrides[`./art/${name}.png`];

const svgUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error('failed to load ' + src.slice(0, 80)));
  img.src = src;
});

// ---------------------------------------------------------------- palettes
const OUT = '#141417';
interface Pal { skin: string; hair: string; hairHi: string; top: string; topHi: string; inner: string; leg: string; shoe: string; iris: string }
const PAL: Record<CharId, Pal> = {
  // black leather jacket, dark tee, salt-and-pepper hair
  hensen: { skin: '#e2b48a', hair: '#2a2a2f', hairHi: '#8d8d98', top: '#141417', topHi: '#4a4a55', inner: '#25252b', leg: '#1c1c21', shoe: '#0b0b0b', iris: '#3b2a1e' },
  // muted blue-gray office shirt, slate tie
  kevin: { skin: '#f0c9a4', hair: '#6a4a2e', hairHi: '#8f6a44', top: '#8fa3ba', topHi: '#b9c7d6', inner: '#46566b', leg: '#3d4452', shoe: '#262626', iris: '#4a3a22' },
  // rose blazer, ivory blouse, charcoal trousers — the same outfit in every scene, villain included
  alice: { skin: '#f2cdb0', hair: '#b8442f', hairHi: '#dc6a4a', top: '#b9506f', topHi: '#d97c97', inner: '#f6efe7', leg: '#2e2e3c', shoe: '#5a1f33', iris: '#2f8a57' },
};

// ---------------------------------------------------------------- portraits
// viewBox 500x600, head centred at (250,250)
type EyeKind = 'normal' | 'wide' | 'heart' | 'closed' | 'tears' | 'narrow';
type BrowKind = 'neutral' | 'worried' | 'angry' | 'raised';
type MouthKind = 'smallSmile' | 'smile' | 'grin' | 'scream' | 'wavy' | 'smirk' | 'flat' | 'evilGrin';
interface Face { eyes: [EyeKind, EyeKind]; brows: BrowKind; mouth: MouthKind; blush?: boolean; sweat?: boolean; sparkle?: boolean; shadow?: boolean }

const FACES: Record<string, Face> = {
  'hensen.neutral': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smallSmile' },
  'hensen.smug': { eyes: ['closed', 'closed'], brows: 'raised', mouth: 'smirk' },
  'hensen.shocked': { eyes: ['wide', 'wide'], brows: 'raised', mouth: 'scream', sweat: true },
  'hensen.determined': { eyes: ['normal', 'normal'], brows: 'angry', mouth: 'flat' },
  'hensen.love': { eyes: ['heart', 'heart'], brows: 'raised', mouth: 'grin', blush: true, sparkle: true },
  'hensen.defeated': { eyes: ['tears', 'tears'], brows: 'worried', mouth: 'wavy', sweat: true },
  'kevin.nervous': { eyes: ['normal', 'normal'], brows: 'worried', mouth: 'smallSmile', sweat: true },
  'kevin.panic': { eyes: ['wide', 'wide'], brows: 'worried', mouth: 'wavy', sweat: true },
  'alice.smile': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smile', blush: true },
  'alice.wink': { eyes: ['normal', 'closed'], brows: 'raised', mouth: 'smile', blush: true, sparkle: true },
  'alice.dramatic': { eyes: ['normal', 'normal'], brows: 'raised', mouth: 'smirk', sparkle: true },
  'alice.villain': { eyes: ['narrow', 'narrow'], brows: 'angry', mouth: 'evilGrin', shadow: true },
};

function eye(kind: EyeKind, x: number, y: number, p: Pal, lashes: boolean): string {
  const lash = lashes ? `<path d="M${x + (x > 250 ? 18 : -18)},${y - 18} l${x > 250 ? 14 : -14},-10" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>` : '';
  switch (kind) {
    case 'normal':
      return `<ellipse cx="${x}" cy="${y}" rx="21" ry="25" fill="#fff" stroke="${OUT}" stroke-width="5"/>
        <circle cx="${x + 2}" cy="${y + 3}" r="14" fill="${p.iris}"/><circle cx="${x + 2}" cy="${y + 3}" r="6.5" fill="#0b0b0d"/>
        <circle cx="${x + 8}" cy="${y - 5}" r="5" fill="#fff"/>${lash}`;
    case 'narrow':
      return `<path d="M${x - 24},${y + 4} Q${x},${y - 8} ${x + 24},${y + 4} Q${x},${y + 14} ${x - 24},${y + 4}Z" fill="#fff" stroke="${OUT}" stroke-width="5"/>
        <circle cx="${x + 2}" cy="${y + 4}" r="8" fill="${p.iris}"/><circle cx="${x + 2}" cy="${y + 4}" r="3.5" fill="#0b0b0d"/>
        <path d="M${x - 26},${y + 2} Q${x},${y - 12} ${x + 26},${y + 2}" fill="none" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/>${lash}`;
    case 'wide':
      return `<ellipse cx="${x}" cy="${y}" rx="27" ry="31" fill="#fff" stroke="${OUT}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="6" fill="#0b0b0d"/>`;
    case 'heart':
      return `<path transform="translate(${x},${y}) scale(1.25)" d="M0,14 C-26,-2 -20,-24 -6,-20 C-2,-19 0,-15 0,-12 C0,-15 2,-19 6,-20 C20,-24 26,-2 0,14Z" fill="#ff3b6b" stroke="#7d0c2a" stroke-width="4"/>
        <circle cx="${x - 9}" cy="${y - 13}" r="4" fill="#fff" opacity=".9"/>`;
    case 'closed':
      return `<path d="M${x - 22},${y + 6} Q${x},${y - 16} ${x + 22},${y + 6}" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>${lash}`;
    case 'tears':
      return `<path d="M${x - 22},${y - 2} Q${x},${y + 12} ${x + 22},${y - 2}" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>
        <path d="M${x - 8},${y + 10} q-8,40 4,90 M${x + 10},${y + 10} q10,40 -2,95" stroke="#6cc4ff" stroke-width="11" fill="none" stroke-linecap="round" opacity=".85"/>`;
  }
}

function brow(kind: BrowKind, x: number, y: number, color: string): string {
  const s = x < 250 ? 1 : -1; // +1 means the inner end is on the right
  const inner = x + 24 * s, outer = x - 24 * s;
  const [yi, yo] = { neutral: [y - 50, y - 52], worried: [y - 64, y - 44], angry: [y - 36, y - 60], raised: [y - 66, y - 62] }[kind];
  return `<path d="M${outer},${yo} Q${x},${Math.min(yi, yo) - 8} ${inner},${yi}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`;
}

/** `open` 0 = the expression's own mouth, 1–2 = talking frames. */
function mouth(kind: MouthKind, open: number): string {
  const st = `fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
  if (kind === 'grin') return `<path d="M204,316 Q250,${384 + open * 14} 296,316Z" fill="#fff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/><path d="M226,${352 + open * 8} Q250,${362 + open * 10} 274,${352 + open * 8}" fill="#e86a7f"/>`;
  if (kind === 'evilGrin') return `<path d="M188,312 Q250,${392 + open * 14} 312,312Z" fill="#fff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M198,322 l10,14 l10,-10 l10,16 l10,-12 l12,18 l12,-18 l10,12 l10,-16 l10,10 l10,-14" fill="none" stroke="${OUT}" stroke-width="4"/>`;
  if (open || kind === 'scream') {
    const ry = kind === 'scream' ? [42, 28, 35][open] : 6 + open * 9;
    return `<ellipse cx="250" cy="340" rx="${kind === 'scream' ? 32 : 18 + open * 5}" ry="${ry}" fill="#3a0d12" stroke="${OUT}" stroke-width="6"/><ellipse cx="250" cy="${340 + ry * 0.55}" rx="${ry * 0.45}" ry="${ry * 0.25}" fill="#e0607a"/>`;
  }
  switch (kind) {
    case 'smallSmile': return `<path d="M228,330 Q250,344 272,330" ${st}/>`;
    case 'smile': return `<path d="M214,322 Q250,358 286,322" ${st}/>`;
    case 'smirk': return `<path d="M222,338 Q262,346 290,316" ${st}/>`;
    case 'flat': return `<path d="M222,336 Q250,330 278,336" ${st}/>`;
    default: return `<path d="M206,338 l11,-9 l11,9 l11,-9 l11,9 l11,-9 l11,9 l11,-9 l11,9" ${st}/>`; // wavy
  }
}

const BLINKS = new Set<EyeKind>(['normal', 'wide', 'narrow']);

function portraitSVG(id: CharId, emotion: string, open: number, blink: boolean): string {
  const p = PAL[id];
  const f = FACES[`${id}.${emotion}`];
  const eyes = f.eyes.map(e => (blink && BLINKS.has(e) ? 'closed' : e));
  const isAlice = id === 'alice';
  const parts: string[] = [];

  // back hair
  if (isAlice) parts.push(`<path d="M112,250 C100,118 182,88 250,92 C330,92 404,128 392,262 C402,390 424,480 404,600 L318,600 C336,470 330,390 330,330 L170,330 C170,390 164,470 182,600 L96,600 C76,480 100,390 112,250Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6"/>`);

  // body
  parts.push(`<rect x="214" y="340" width="72" height="100" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/>`);
  parts.push(`<path d="M34,600 C44,478 118,432 250,428 C382,432 456,478 466,600Z" fill="${p.top}" stroke="${OUT}" stroke-width="6"/>`);
  if (id === 'hensen') {
    parts.push(`<path d="M204,432 L250,540 L296,432Z" fill="${p.inner}"/>
      <path d="M204,432 L166,446 L238,600 L250,540Z M296,432 L334,446 L262,600 L250,540Z" fill="${p.topHi}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M70,540 C90,490 130,465 170,455" stroke="#4a4a54" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M330,520 l14,-10 l14,10 l-14,-4z" fill="#76b900" stroke="${OUT}" stroke-width="3"/>`);
  } else if (id === 'kevin') {
    parts.push(`<path d="M206,430 L250,470 L294,430 L304,452 L250,488 L196,452Z" fill="${p.topHi}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M240,470 L260,470 L268,600 L232,600Z" fill="${p.inner}" stroke="${OUT}" stroke-width="5"/>
      <path d="M190,440 C176,500 184,540 196,560 M310,440 C324,500 316,540 304,560" stroke="#3a4a5a" stroke-width="6" fill="none"/>
      <rect x="172" y="552" width="48" height="40" rx="4" fill="#fff" stroke="${OUT}" stroke-width="4"/><rect x="180" y="560" width="14" height="14" fill="#76b900"/>`);
  } else {
    parts.push(`<path d="M206,432 L250,540 L294,432Z" fill="${p.inner}"/>
      <path d="M206,432 L170,450 L236,600 L250,540Z M294,432 L330,450 L264,600 L250,540Z" fill="${p.topHi}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`);
  }

  // head
  parts.push(`<ellipse cx="132" cy="268" rx="20" ry="30" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/><ellipse cx="368" cy="268" rx="20" ry="30" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/>`);
  parts.push(`<ellipse cx="250" cy="250" rx="120" ry="135" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/>`);
  if (isAlice) parts.push(`<circle cx="130" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/><circle cx="370" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/>`);

  // face
  if (f.blush) parts.push(`<ellipse cx="172" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/><ellipse cx="328" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/>`);
  parts.push(`<path d="M250,284 L242,306 L258,306" fill="none" stroke="${OUT}" stroke-width="4" stroke-linejoin="round" opacity=".6"/>`);
  parts.push(eye(eyes[0], 200, 262, p, isAlice), eye(eyes[1], 300, 262, p, isAlice));
  if (id === 'kevin') parts.push(`<circle cx="200" cy="262" r="38" fill="none" stroke="${OUT}" stroke-width="7"/><circle cx="300" cy="262" r="38" fill="none" stroke="${OUT}" stroke-width="7"/><path d="M238,258 Q250,250 262,258" stroke="${OUT}" stroke-width="7" fill="none"/>`);
  parts.push(mouth(f.mouth, open));
  // the reveal is lighting, not wardrobe: top-down shadow over the face, eyes catch a red glint
  if (f.shadow) parts.push(`<defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0010" stop-opacity=".7"/><stop offset=".62" stop-color="#1a0010" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="250" cy="250" rx="120" ry="135" fill="url(#sh)"/>${blink ? '' : '<circle cx="206" cy="264" r="3.5" fill="#ff2d47"/><circle cx="306" cy="264" r="3.5" fill="#ff2d47"/>'}`);

  // front hair & brows
  if (id === 'hensen') parts.push(`<path d="M128,252 C116,140 182,102 256,104 C334,106 386,154 372,252 C364,206 344,176 304,168 C262,160 204,164 172,178 C146,194 134,220 128,252Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6"/>
    <path d="M160,170 C210,132 290,128 350,170 M180,150 C230,124 290,124 330,146" stroke="${p.hairHi}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>`);
  else if (id === 'kevin') parts.push(`<path d="M126,250 C118,150 180,104 252,104 C326,104 384,150 374,250 C356,200 330,178 290,170 L262,150 L250,172 C200,172 152,190 126,250Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>`);
  else parts.push(`<path d="M124,246 C116,136 188,100 254,102 C334,104 388,148 378,248 C354,196 330,176 306,170 C292,198 250,206 232,176 C200,202 160,214 124,246Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M190,130 C220,116 260,114 300,124" stroke="${p.hairHi}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
  parts.push(brow(f.brows, 200, 262, p.hair), brow(f.brows, 300, 262, p.hair));

  // extras
  if (f.sweat) parts.push(`<path d="M392,150 q-14,24 0,30 q14,-6 0,-30Z M408,214 q-10,18 0,22 q10,-4 0,-22Z M100,180 q-12,20 0,26 q12,-6 0,-26Z" fill="#7fd3ff" stroke="#2a6f9a" stroke-width="3"/>`);
  if (f.sparkle) parts.push(`<path d="M420,120 l8,22 l22,8 l-22,8 l-8,22 l-8,-22 l-22,-8 l22,-8Z M80,110 l6,16 l16,6 l-16,6 l-6,16 l-6,-16 l-16,-6 l16,-6Z" fill="#fff6a8" stroke="#c9a400" stroke-width="3"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600" viewBox="0 0 500 600">${parts.join('')}</svg>`;
}

/** Every frame of one expression; all the same size so swapping them never shifts the layout. */
export interface PortraitFrames { base: string; talk: [string, string]; blink: string }
const portraitCache = new Map<string, PortraitFrames>();

export function portraitFrames<C extends CharId>(id: C, emotion: Emotion<C>): PortraitFrames {
  const key = `portrait_${id}_${emotion}`;
  let f = portraitCache.get(key);
  if (!f) {
    const png = override(key);
    // an artist base without its variants just holds still; never mix in procedural frames
    const v = (suffix: string, open: number, blink: boolean) => (png ? override(key + suffix) ?? png : svgUrl(portraitSVG(id, emotion, open, blink)));
    f = { base: v('', 0, false), talk: [v('_talk1', 1, false), v('_talk2', 2, false)], blink: v('_blink', 0, true) };
    portraitCache.set(key, f);
  }
  return f;
}

export const portraitSrc = <C extends CharId>(id: C, emotion: Emotion<C>) => portraitFrames(id, emotion).base;

// ---------------------------------------------------------------- sprites
// viewBox 64x96, facing right, feet at y≈90, about 6 heads tall.
const FW = 128, FH = 192;

type Arms = 'swing' | 'talk' | 'up' | 'flail' | 'point' | 'cross';
interface Pose { leg?: number; arm?: number; bob?: number; lean?: number; arms?: Arms; mouth?: number; eyes?: 'open' | 'wide' | 'closed' | 'narrow' }

const cycle = (amp: number, lean = 0): Pose[] => [1, 0, -1, 0].map((s, i) => ({ leg: s * amp, arm: s * amp, bob: i % 2 ? -1 : 0, lean }));
const SHOCK: Pose = { arms: 'up', eyes: 'wide', mouth: 2 };

/** Sprite animations in strip order — an artist strip must use this exact frame order. */
const ANIMS: Record<CharId, Record<string, { fps: number; poses: Pose[] }>> = {
  hensen: {
    idle: { fps: 2, poses: [{}, { bob: 0.6 }] },
    walk: { fps: 8, poses: cycle(1) },
    talk: { fps: 5, poses: [{ arms: 'talk', mouth: 1 }, { arms: 'talk', bob: 0.4 }] },
    shocked: { fps: 8, poses: [SHOCK, { ...SHOCK, bob: -1.2 }] },
  },
  kevin: {
    idle: { fps: 3, poses: [{}, { bob: 0.6, eyes: 'closed' }] },
    run: { fps: 10, poses: cycle(1.6, 9) },
    stumble: { fps: 1, poses: [{ arms: 'flail', leg: 1.3, eyes: 'wide', mouth: 2, lean: -12 }] },
    panic: { fps: 8, poses: [SHOCK, { ...SHOCK, mouth: 1, bob: -1.2 }] },
  },
  alice: {
    idle: { fps: 2, poses: [{}, { bob: 0.6 }] },
    walk: { fps: 8, poses: cycle(0.8) },
    talk: { fps: 5, poses: [{ arms: 'talk', mouth: 1 }, { arms: 'talk', bob: 0.4 }] },
    dramatic: { fps: 1, poses: [{ arms: 'point', leg: 0.9, mouth: 1, lean: 4 }] },
    villain: { fps: 1, poses: [{ arms: 'cross', eyes: 'narrow', leg: 0.5 }] },
  },
};
const MOVE: Record<CharId, string> = { hensen: 'walk', kevin: 'run', alice: 'walk' };

function limb(pts: number[], color: string, w = 4) {
  const d = pts.reduce((acc, v, i) => acc + (i % 2 ? ',' : i ? ' L' : 'M') + v, '');
  const st = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  return `<path d="${d}" stroke="${OUT}" stroke-width="${w + 2.4}" ${st}/><path d="${d}" stroke="${color}" stroke-width="${w}" ${st}/>`;
}

// hand positions per arm pose: [back arm points, front arm points], from the shoulder
function armPts(a: Arms, swing: number): [number[], number[]] {
  switch (a) {
    case 'swing': return [[28, 27, 28 + swing * 5, 49], [37, 27, 37 - swing * 5, 49]];
    case 'talk': return [[28, 27, 27, 49], [37, 27, 42, 38, 48, 33]];
    case 'up': return [[28, 27, 22, 18, 25, 7], [37, 27, 44, 18, 41, 6]];
    case 'flail': return [[28, 27, 18, 22, 12, 14], [37, 27, 47, 31, 54, 24]];
    case 'point': return [[28, 27, 25, 39, 31, 48], [37, 27, 47, 24, 57, 20]];
    case 'cross': return [[28, 27, 26, 37, 39, 37], [37, 27, 40, 36, 27, 35]];
  }
}

function spriteSVG(id: CharId, p: Pose): string {
  const c = PAL[id];
  const leg = p.leg ?? 0, arms = p.arms ?? 'swing', eyes = p.eyes ?? 'open', m = p.mouth ?? 0;
  const [back, front] = armPts(arms, p.arm ?? 0);
  const hand = (pts: number[]) => `<circle cx="${pts.at(-2)}" cy="${pts.at(-1)}" r="1.9" fill="${c.skin}" stroke="${OUT}" stroke-width="1"/>`;
  const shoe = (x: number) => `<ellipse cx="${x + 1.6}" cy="89.6" rx="4.2" ry="2.1" fill="${c.shoe}" stroke="${OUT}" stroke-width="1"/>`;
  const s: string[] = [`<g transform="rotate(${p.lean ?? 0} 32 90)">`];

  if (id === 'alice') s.push(`<path d="M27,9 C22,16 22,30 25,38 L32,37 C29,30 29,20 30,12Z" fill="${c.hair}" stroke="${OUT}" stroke-width="1.2"/>`);
  // legs, back then front
  s.push(limb([30, 51, 30 - leg * 6, 88], c.leg, 4.6), shoe(30 - leg * 6));
  s.push(limb([34, 51, 34 + leg * 6, 88], c.leg, 4.6), shoe(34 + leg * 6));
  s.push(`<g transform="translate(0,${p.bob ?? 0})">`);
  if (arms !== 'cross') s.push(limb(back, c.top, 3.6), hand(back));

  // torso + outfit
  s.push(`<path d="M25,25 Q32,22.5 40,25 L41,53 L24.5,53Z" fill="${c.top}" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`);
  s.push(`<path d="M25,25 L28,24.4 L28,53 L24.5,53Z" fill="#000" opacity=".22"/>`); // far-side shade
  if (id === 'hensen') s.push(`<path d="M30,24 L33.5,40 L37,24Z" fill="${c.inner}"/><path d="M29.5,24.5 L33,39 M37.5,24.5 L34,39" stroke="${c.topHi}" stroke-width="1.2"/>
    <path d="M38.5,28 L39.2,46" stroke="${c.topHi}" stroke-width="1" opacity=".8"/><circle cx="37.6" cy="31" r=".9" fill="#76b900"/>`);
  if (id === 'kevin') s.push(`<path d="M32,24.5 L34.5,24.5 L35,39 L33.2,41 L31.5,39Z" fill="${c.inner}" stroke="${OUT}" stroke-width=".6"/>
    <rect x="36.5" y="31" width="3.4" height="4.4" fill="#fff" stroke="${OUT}" stroke-width=".5"/><rect x="37.1" y="31.6" width="1.4" height="1.4" fill="#76b900"/><path d="M25,50.5 H41" stroke="${OUT}" stroke-width="1.4"/>`);
  if (id === 'alice') s.push(`<path d="M30,24 L33.5,37 L37,24Z" fill="${c.inner}"/><path d="M29.5,24.5 L33,36 M37.5,24.5 L34,36" stroke="${c.topHi}" stroke-width="1.1"/><path d="M25,45 Q33,46.5 41,45" stroke="${OUT}" stroke-width=".8" fill="none"/>`);

  // head
  s.push(`<rect x="31" y="18" width="4.4" height="7" fill="${c.skin}" stroke="${OUT}" stroke-width="1"/>`);
  s.push(`<ellipse cx="33" cy="14" rx="6.2" ry="7.4" fill="${c.skin}" stroke="${OUT}" stroke-width="1.2"/>`);
  s.push(`<ellipse cx="29.6" cy="14.6" rx="1.2" ry="1.8" fill="${c.skin}" stroke="${OUT}" stroke-width=".8"/>`);
  if (id === 'hensen') s.push(`<path d="M26.6,13 C26,6 31,5.4 34,5.7 C38.2,6 40.6,8.2 39.6,11 C37,9 33,9.2 30.5,10.2 C28.6,11 27.6,12 26.6,13Z" fill="${c.hair}" stroke="${OUT}" stroke-width="1.1"/>
    <path d="M29,8.2 C32,6.6 36,6.8 38.6,8.4" stroke="${c.hairHi}" stroke-width=".8" fill="none"/>`);
  else if (id === 'kevin') s.push(`<path d="M26.8,13 C26,6.4 32,5.4 35,5.8 C39,6.4 40.2,9 39.6,11 L35.6,9.4 C32.4,10 29.2,11 26.8,13Z" fill="${c.hair}" stroke="${OUT}" stroke-width="1.1"/>`);
  else s.push(`<path d="M26.4,15 C25.4,6 31,5 34,5.2 C39,5.5 41,9 40.2,13 C38.4,10.4 36.4,9.6 34.4,10 C31,10.6 28.4,12.4 26.4,15Z" fill="${c.hair}" stroke="${OUT}" stroke-width="1.1"/>
    <path d="M29.5,7.5 C32,6.4 35,6.4 37.5,7.4" stroke="${c.hairHi}" stroke-width=".8" fill="none"/>`);

  // face (3/4 view, looking right)
  const ex = [34.6, 38];
  if (eyes === 'open') s.push(ex.map(x => `<ellipse cx="${x}" cy="13.6" rx=".7" ry="1" fill="${OUT}"/>`).join(''));
  if (eyes === 'wide') s.push(ex.map(x => `<circle cx="${x}" cy="13.4" r="1.3" fill="#fff" stroke="${OUT}" stroke-width=".6"/><circle cx="${x}" cy="13.4" r=".45" fill="${OUT}"/>`).join(''));
  if (eyes === 'closed') s.push(ex.map(x => `<path d="M${x - 0.9},13.8 h1.8" stroke="${OUT}" stroke-width=".7"/>`).join(''));
  if (eyes === 'narrow') s.push(ex.map(x => `<path d="M${x - 1},13.2 L${x + 1},14" stroke="${OUT}" stroke-width=".9"/><circle cx="${x + 0.2}" cy="14.2" r=".45" fill="#ff2d47"/>`).join(''));
  const browY = eyes === 'wide' ? 10.4 : 11.4;
  s.push(ex.map(x => (eyes === 'narrow' ? `<path d="M${x - 1.2},11.4 L${x + 1},12.4"` : `<path d="M${x - 1},${browY} h2"`) + ` stroke="${c.hair}" stroke-width=".8"/>`).join(''));
  if (id === 'kevin') s.push(`<circle cx="34.6" cy="13.6" r="1.8" fill="none" stroke="${OUT}" stroke-width=".6"/><circle cx="38.2" cy="13.6" r="1.6" fill="none" stroke="${OUT}" stroke-width=".6"/><path d="M36.4,13.4 h0.2" stroke="${OUT}" stroke-width=".6"/>`);
  s.push(`<path d="M38.8,14.6 l1,2.2 l-1.2,.3" fill="none" stroke="${OUT}" stroke-width=".5" opacity=".7"/>`);
  if (id === 'alice') s.push(`<ellipse cx="35" cy="16.6" rx="1.2" ry=".6" fill="#ff7a9a" opacity=".55"/>`);
  s.push(m ? `<ellipse cx="36.6" cy="18.4" rx="${0.6 + m * 0.35}" ry="${0.4 + m * 0.5}" fill="#3a0d12"/>` : `<path d="M35.4,18.3 Q36.6,18.9 37.8,18.2" stroke="${OUT}" stroke-width=".6" fill="none" stroke-linecap="round"/>`);

  // front arm (and the crossed back arm), Kevin's folder of secrets while running
  if (arms === 'cross') s.push(limb(back, c.top, 3.6), hand(back));
  s.push(limb(front, c.top, 3.6), hand(front));
  if (id === 'kevin' && arms === 'swing') s.push(`<rect x="${front[2] - 1}" y="${front[3] - 6}" width="7" height="9" rx=".6" fill="#e8c26a" stroke="${OUT}" stroke-width="1" transform="rotate(8 ${front[2] + 2} ${front[3] - 2})"/>`);
  s.push('</g></g>');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}" viewBox="0 0 64 96">${s.join('')}</svg>`;
}

export interface Clip { start: number; count: number; fps: number }
/** A character's sprite strip (FW x FH frames, facing right) and where each animation lives in it. */
export interface Sheet { canvas: HTMLCanvasElement; frames: number; clips: Record<string, Clip>; move: string }

export async function loadSpriteSheet(id: CharId): Promise<Sheet> {
  const clips: Record<string, Clip> = {};
  const poses: Pose[] = [];
  for (const [name, a] of Object.entries(ANIMS[id])) {
    clips[name] = { start: poses.length, count: a.poses.length, fps: a.fps };
    poses.push(...a.poses);
  }
  const c = document.createElement('canvas');
  c.width = FW * poses.length; c.height = FH;
  const g = c.getContext('2d')!;
  const custom = override(`sprite_${id}`);
  if (custom) {
    const img = await loadImage(custom);
    const sw = img.width / poses.length;
    for (let i = 0; i < poses.length; i++) g.drawImage(img, sw * i, 0, sw, img.height, i * FW, 0, FW, FH);
  } else {
    const imgs = await Promise.all(poses.map(p => loadImage(svgUrl(spriteSVG(id, p)))));
    imgs.forEach((img, i) => g.drawImage(img, i * FW, 0, FW, FH));
  }
  return { canvas: c, frames: poses.length, clips, move: MOVE[id] };
}

/** One frame of a sheet as an <img>-ready URL (used by the battle screen). */
export function frameURL(sheet: Sheet, clip: string, i = 0, flip = false): string {
  const c = document.createElement('canvas');
  c.width = FW; c.height = FH;
  const g = c.getContext('2d')!;
  if (flip) { g.translate(FW, 0); g.scale(-1, 1); }
  g.drawImage(sheet.canvas, (sheet.clips[clip].start + i) * FW, 0, FW, FH, 0, 0, FW, FH);
  return c.toDataURL();
}

export type Sheets = Record<CharId, Sheet>;

/** Decode every sprite sheet and portrait frame up front so nothing pops in mid-scene. */
export async function preloadArt(): Promise<Sheets> {
  const ids = Object.keys(EMOTIONS) as CharId[];
  const urls = ids.flatMap(id => (EMOTIONS[id] as readonly string[]).flatMap(e => {
    const f = portraitFrames(id, e as never);
    return [f.base, ...f.talk, f.blink];
  }));
  const [sheets] = await Promise.all([Promise.all(ids.map(loadSpriteSheet)), Promise.all([...new Set(urls)].map(loadImage))]);
  return Object.fromEntries(ids.map((id, i) => [id, sheets[i]])) as Sheets;
}
