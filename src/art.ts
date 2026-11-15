// Character art pipeline. One design per character, two tiers:
//  - dialogue portraits: big busts per expression, each with 2 talk frames and a blink frame;
//  - in-game sprites: a strip of pixel-art frames grouped into named animations (ANIMS).
// Portraits are procedural SVG and sprites are painted pixel art, unless an artist file with the matching name exists in
// src/art/ (see src/art/README.md) — then that wins.

export type CharId = 'hensen' | 'kevin' | 'cfo' | 'alice' | 'jessica';
export const EMOTIONS = {
  hensen: ['neutral', 'smug', 'shocked', 'determined', 'love', 'defeated'],
  kevin: ['nervous', 'panic'],
  cfo: ['hype', 'panic'],
  alice: ['smile', 'wink', 'dramatic', 'villain'],
  jessica: ['neutral', 'friendly'],
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
  hensen: { skin: '#e2b48a', hair: '#9c9ca6', hairHi: '#ededf2', top: '#141417', topHi: '#4a4a55', inner: '#25252b', leg: '#1c1c21', shoe: '#0b0b0b', iris: '#3b2a1e' },
  // muted blue-gray office shirt, slate tie
  kevin: { skin: '#f0c9a4', hair: '#6a4a2e', hairHi: '#8f6a44', top: '#8fa3ba', topHi: '#b9c7d6', inner: '#46566b', leg: '#3d4452', shoe: '#262626', iris: '#4a3a22' },
  // crypto-bro CFO: green quarter-zip, gold chain, frosted tips
  cfo: { skin: '#e8b48a', hair: '#6b4226', hairHi: '#a8744a', top: '#1f2d4d', topHi: '#3a4f80', inner: '#f7f7f4', leg: '#25272e', shoe: '#f2f2ef', iris: '#5a3a22' },
  // ivory tailored blazer, black silk blouse, black trousers, black bob — the same outfit in every scene, villain included
  alice: { skin: '#f1d3b8', hair: '#3a2219', hairHi: '#7a4a32', top: '#ece4d6', topHi: '#fffaf1', inner: '#1b1a20', leg: '#1b1a20', shoe: '#0d0d10', iris: '#3a2618' },
  // rose blazer, ivory blouse, charcoal trousers, long auburn hair
  jessica: { skin: '#f2cdb0', hair: '#b8442f', hairHi: '#dc6a4a', top: '#b9506f', topHi: '#d97c97', inner: '#f6efe7', leg: '#2e2e3c', shoe: '#5a1f33', iris: '#2f8a57' },
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
  'cfo.hype': { eyes: ['closed', 'closed'], brows: 'raised', mouth: 'grin', sparkle: true },
  'cfo.panic': { eyes: ['wide', 'wide'], brows: 'worried', mouth: 'scream', sweat: true },
  'alice.smile': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smile', blush: true },
  'alice.wink': { eyes: ['normal', 'closed'], brows: 'raised', mouth: 'smile', blush: true, sparkle: true },
  'alice.dramatic': { eyes: ['normal', 'normal'], brows: 'raised', mouth: 'smirk', sparkle: true },
  'alice.villain': { eyes: ['narrow', 'narrow'], brows: 'angry', mouth: 'evilGrin', shadow: true },
  'jessica.neutral': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smallSmile' },
  'jessica.friendly': { eyes: ['normal', 'normal'], brows: 'raised', mouth: 'smile', blush: true },
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
  const fem = id === 'alice' || id === 'jessica';
  const parts: string[] = [];

  // back hair
  if (id === 'alice') parts.push(`<path d="M112,250 C100,118 182,88 250,92 C330,92 404,128 392,262 C400,330 404,380 384,420 L318,420 C330,380 330,350 330,330 L170,330 C170,350 170,380 182,420 L116,420 C96,380 100,330 112,250Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6"/>`);
  if (id === 'jessica') parts.push(`<path d="M112,250 C100,118 182,88 250,92 C330,92 404,128 392,262 C402,390 424,480 404,600 L318,600 C336,470 330,390 330,330 L170,330 C170,390 164,470 182,600 L96,600 C76,480 100,390 112,250Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6"/>`);

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
  if (fem) parts.push(`<circle cx="130" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/><circle cx="370" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/>`);

  // face
  if (f.blush) parts.push(`<ellipse cx="172" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/><ellipse cx="328" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/>`);
  parts.push(`<path d="M250,284 L242,306 L258,306" fill="none" stroke="${OUT}" stroke-width="4" stroke-linejoin="round" opacity=".6"/>`);
  parts.push(eye(eyes[0], 200, 262, p, fem), eye(eyes[1], 300, 262, p, fem));
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
// Pixel art painted at native resolution (FW x FH per frame) and shown with nearest filtering.
// Key light from the upper left: left edges get a highlight, right edges a shade, then a 1px outline ring.
const FW = 32, FH = 48;

/** Sprite facing. 'side' faces right; the game mirrors it for left. */
export type Dir = 'front' | 'back' | 'side';
type Arms = 'swing' | 'talk' | 'up' | 'flail' | 'point' | 'cross';
interface Pose { dir?: Dir; step?: number; bob?: number; lean?: number; arms?: Arms; mouth?: boolean; eyes?: 'open' | 'wide' | 'closed' | 'narrow' }

const shadeHex = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1));
  return '#' + [16, 8, 0].map(s => f((n >> s) & 255).toString(16).padStart(2, '0')).join('');
};
const dk = (h: string) => shadeHex(h, 0.72), lt = (h: string) => shadeHex(h, 1.3);
const GOLD = '#d4a537', MOUTH = '#3a0d12', BLUSH = '#ff8aa6', GREEN = '#76b900', RED_EYE = '#ff2d47';

// contact, pass, contact, pass; the body rises a pixel on the pass frames
const walk = (dir: Dir, stride: number): Pose[] => [1, 0, -1, 0].map((s, i) => ({ dir, step: s * stride, bob: i % 2 ? -1 : 0 }));
/** idle + move clips for every facing: `idle`, `idle_back`, `idle_side`, `walk`, `walk_back`, `walk_side`. */
const base = (move: string, stride = 1, fps = 8) => Object.fromEntries((['front', 'back', 'side'] as Dir[]).flatMap(dir => {
  const k = dir === 'front' ? '' : '_' + dir;
  return [[`idle${k}`, { fps: 2, poses: [{ dir }, { dir, bob: 1 }] }], [move + k, { fps, poses: walk(dir, stride) }]];
}));
const TALK = { fps: 5, poses: [{ arms: 'talk', mouth: true }, { arms: 'talk', bob: 1 }] as Pose[] };
const SHOCK: Pose = { arms: 'up', eyes: 'wide', mouth: true };

/** Sprite animations in strip order — an artist strip must use this exact frame order. */
const ANIMS: Record<CharId, Record<string, { fps: number; poses: Pose[] }>> = {
  hensen: { ...base('walk'), talk: TALK, shocked: { fps: 8, poses: [SHOCK, { ...SHOCK, bob: -1 }] } },
  kevin: {
    ...base('run', 2, 10),
    stumble: { fps: 1, poses: [{ arms: 'flail', eyes: 'wide', mouth: true, lean: -2 }] },
    panic: { fps: 8, poses: [SHOCK, { ...SHOCK, mouth: false, bob: -1 }] },
  },
  cfo: { ...base('walk'), talk: TALK, panic: { fps: 8, poses: [SHOCK, { ...SHOCK, mouth: false, bob: -1 }] } },
  alice: {
    ...base('walk'), talk: TALK,
    dramatic: { fps: 1, poses: [{ arms: 'point', mouth: true }] },
    villain: { fps: 1, poses: [{ arms: 'cross', eyes: 'narrow' }] },
  },
  jessica: { ...base('walk'), talk: TALK },
};
const MOVE: Record<CharId, string> = { hensen: 'walk', kevin: 'run', cfo: 'walk', alice: 'walk', jessica: 'walk' };

function paintSprite(g: CanvasRenderingContext2D, ox: number, id: CharId, p: Pose) {
  const c = PAL[id];
  const dir = p.dir ?? 'front', s = p.step ?? 0, b = p.bob ?? 0, lean = p.lean ?? 0;
  const arms = p.arms ?? 'swing', eyes = p.eyes ?? 'open';
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(ox + x, y, w, h); };
  const U = (x: number, y: number, w: number, h: number, col: string) => R(x + lean, y + b, w, h, col); // upper body: bobs and leans
  const sleeve = id === 'cfo' ? c.inner : c.top; // Brad's vest is sleeveless
  const long = id === 'jessica' ? 26 : id === 'alice' ? 18 : 0; // bottom row of the hair, 0 = short

  if (dir === 'side') {
    // ---------------------------------------------------------- side view, facing right
    const leg = (x: number, d: number, col: string) => {
      R(x + Math.round(d / 2), 30, 3, 8, col);
      R(x + d, 38, 3, 6, col);
      R(x + d, 44, 5, 2, c.shoe);
    };
    leg(14, -s * 2, dk(c.leg));
    U(14, 19, 3, 5, dk(sleeve)); U(14 + s, 24, 3, 5, dk(sleeve)); U(14 + s, 29, 3, 2, dk(c.skin)); // far arm
    leg(15, s * 2, c.leg);
    U(12, 18, 8, 14, c.top); U(12, 18, 1, 14, lt(c.top)); U(19, 18, 1, 14, dk(c.top));
    if (id === 'hensen') { U(18, 18, 2, 6, c.inner); U(17, 18, 1, 6, c.topHi); U(18, 21, 1, 1, GREEN); }
    if (id === 'kevin') { U(18, 18, 2, 1, c.topHi); U(19, 19, 1, 6, c.inner); U(17, 22, 2, 3, '#fff'); U(12, 31, 8, 1, dk(c.leg)); }
    if (id === 'cfo') { U(18, 18, 2, 3, c.inner); U(13, 23, 6, 1, c.topHi); U(13, 27, 6, 1, c.topHi); }
    if (long) { U(18, 18, 2, 6, c.inner); U(17, 18, 1, 6, c.topHi); }
    if (id === 'alice') U(18, 25, 1, 1, GOLD);
    // head
    U(15, 17, 4, 1, dk(c.skin));
    U(12, 5, 9, 12, c.skin); U(11, 6, 11, 10, c.skin); U(22, 11, 1, 2, c.skin); // nose
    U(15, 10, 2, 3, dk(c.skin)); // ear
    U(11, 4, 10, 4, c.hair); U(12, 3, 8, 1, c.hair); U(11, 8, 4, 5, c.hair); U(15, 8, 1, 2, c.hair);
    if (long) { U(10, 7, 5, long - 7, c.hair); U(11, 8, 1, long - 9, dk(c.hair)); U(19, 8, 2, 1, c.hair); U(12, 4, 4, 1, c.hairHi); }
    if (id === 'hensen') for (const [x, y] of [[13, 4], [16, 3], [18, 5], [12, 7], [14, 6], [12, 10]]) U(x, y, 1, 1, c.hairHi);
    if (id === 'cfo') { U(13, 1, 8, 3, c.hair); U(18, 3, 4, 2, c.hair); U(15, 1, 4, 1, c.hairHi); U(16, 11, 1, 1, '#fff'); }
    if (id === 'kevin') { U(18, 8, 3, 1, c.hair); U(13, 4, 4, 1, c.hairHi); }
    if (id === 'alice') U(15, 13, 1, 1, GOLD);
    // face
    if (eyes === 'closed') U(18, 11, 2, 1, OUT);
    else if (eyes === 'narrow') { U(18, 10, 2, 1, OUT); U(19, 11, 1, 1, RED_EYE); }
    else if (eyes === 'wide') { U(18, 9, 2, 3, '#fff'); U(19, 10, 1, 1, OUT); }
    else { U(19, 10, 1, 1, OUT); U(19, 11, 1, 1, dk(c.iris)); }
    U(18, eyes === 'wide' ? 7 : 8, 2, 1, dk(c.hair));
    if (id === 'kevin') { U(17, 9, 4, 1, OUT); U(17, 12, 4, 1, OUT); U(16, 10, 1, 1, OUT); }
    if (long) U(18, 13, 1, 1, BLUSH);
    U(19, 14, 2, p.mouth ? 2 : 1, p.mouth ? MOUTH : dk(c.skin));
    // near arm, swinging against the near leg
    U(15, 19, 3, 5, sleeve); U(15 - s, 24, 3, 5, id === 'cfo' ? c.skin : sleeve); U(15 - s, 29, 3, 2, c.skin);
    if (id === 'cfo') U(15 - s, 28, 3, 1, '#1a1a20'); // smartwatch
    if (id === 'kevin') { U(16 - s, 26, 5, 6, '#e8c26a'); U(16 - s, 26, 5, 1, '#c9a24a'); } // the folder of secrets
    return;
  }

  // ------------------------------------------------------------ front and back
  const front = dir === 'front';
  if (long) U(9, 7, 14, long - 7, dk(c.hair)); // hair falling behind the shoulders
  for (const [x, up] of [[11, s > 0], [17, s < 0]] as const) {
    const lift = up ? Math.abs(s) + 1 : 0;
    R(x, 28, 4, 16 - lift, c.leg); R(x + 3, 28, 1, 16 - lift, dk(c.leg));
    R(x, 44 - lift, 4, 2, c.shoe);
  }
  U(10, 18, 12, 14, c.top); U(10, 18, 1, 14, lt(c.top)); U(21, 18, 1, 14, dk(c.top));
  if (front) {
    if (id === 'hensen') { U(14, 18, 4, 8, c.inner); U(13, 18, 1, 7, c.topHi); U(18, 18, 1, 7, c.topHi); U(19, 21, 1, 1, GREEN); U(11, 20, 1, 6, c.topHi); }
    if (id === 'kevin') { U(13, 18, 6, 1, c.topHi); U(15, 19, 2, 7, c.inner); U(15, 26, 1, 1, c.inner); U(18, 22, 2, 3, '#fff'); U(18, 22, 1, 1, GREEN); U(10, 31, 12, 1, dk(c.leg)); }
    if (id === 'cfo') { U(14, 18, 4, 3, c.inner); U(15, 21, 2, 11, c.inner); U(11, 23, 4, 1, c.topHi); U(17, 23, 4, 1, c.topHi); U(11, 27, 4, 1, c.topHi); U(17, 27, 4, 1, c.topHi); }
    if (long) { U(14, 18, 4, 6, c.inner); U(13, 18, 1, 6, c.topHi); U(18, 18, 1, 6, c.topHi); }
    if (id === 'alice') for (const [x, y] of [[13, 25], [18, 25], [13, 28], [18, 28]]) U(x, y, 1, 1, GOLD);
  } else {
    U(13, 18, 6, 1, c.topHi); U(15, 19, 1, 12, dk(c.top));
    if (id === 'hensen') U(11, 20, 1, 7, c.topHi);
  }

  // arms
  const arm = (x: number, dy: number) => {
    U(x, 19, 2, 10 + dy, sleeve); U(x === 8 ? 9 : 22, 19, 1, 10 + dy, dk(sleeve));
    if (id === 'cfo') U(x, 25, 2, 4 + dy, c.skin); // rolled sleeves
    U(x, 29 + dy, 2, 2, c.skin);
    if (id === 'cfo' && x === 8) U(x, 27 + dy, 2, 1, '#1a1a20'); // smartwatch
  };
  if (arms === 'swing') { arm(8, front ? s : -s); arm(22, front ? -s : s); }
  if (arms === 'talk' || arms === 'point') arm(8, 0);
  if (arms === 'talk') { U(22, 19, 2, 6, sleeve); U(24, 19, 2, 6, sleeve); U(24, 17, 2, 2, c.skin); }
  if (arms === 'up' || arms === 'flail') { U(8, 18, 2, 2, sleeve); U(7, 9, 2, 10, sleeve); U(7, 7, 2, 2, c.skin); }
  if (arms === 'up') { U(22, 18, 2, 2, sleeve); U(23, 9, 2, 10, sleeve); U(23, 7, 2, 2, c.skin); }
  if (arms === 'flail' || arms === 'point') { U(22, 19, 7, 2, sleeve); U(29, 19, 2, 2, c.skin); }
  if (arms === 'cross') { arm(8, -4); arm(22, -4); U(9, 23, 14, 3, sleeve); U(9, 25, 14, 1, dk(sleeve)); U(10, 23, 2, 2, c.skin); U(20, 24, 2, 2, c.skin); }
  if (id === 'kevin' && arms === 'swing' && front) { U(5, 26 + s, 4, 6, '#e8c26a'); U(5, 26 + s, 4, 1, '#c9a24a'); }

  // head
  U(14, 17, 4, 1, dk(c.skin));
  U(11, 5, 10, 12, c.skin); U(10, 6, 12, 10, c.skin); U(21, 7, 1, 8, dk(c.skin));
  U(9, 10, 1, 3, c.skin); U(22, 10, 1, 3, dk(c.skin));
  // hair: crown, then each character's cut
  U(11, 3, 10, 2, c.hair); U(10, 4, 12, 4, c.hair);
  if (!front) { U(10, 4, 12, 12, c.hair); U(11, 16, 10, 1, c.hair); U(19, 6, 2, 9, dk(c.hair)); }
  if (id === 'hensen') {
    U(10, 8, 1, 3, c.hair); U(21, 8, 1, 3, c.hair);
    for (const [x, y] of [[12, 4], [14, 3], [16, 5], [18, 4], [20, 6], [11, 6], [15, 9], [13, 11]]) if (!front || y < 7) U(x, y, 1, 1, c.hairHi); // salt and pepper
  }
  if (id === 'kevin') { U(10, 8, 5, 1, c.hair); U(10, 9, 1, 2, c.hair); U(21, 8, 1, 2, c.hair); U(12, 4, 5, 1, c.hairHi); }
  if (id === 'cfo') { U(12, 1, 9, 3, c.hair); U(11, 2, 10, 2, c.hair); U(14, 1, 4, 1, c.hairHi); U(10, 8, 1, 2, c.hair); U(21, 8, 1, 2, c.hair); U(22, 11, 1, 1, '#fff'); }
  if (long) {
    U(9, 6, 2, long - 6, c.hair); U(21, 6, 2, long - 6, c.hair); U(12, 4, 4, 1, c.hairHi);
    if (front) { U(11, 8, 4, 1, c.hair); U(11, 9, 2, 1, c.hair); } else U(9, 6, 14, long - 9, c.hair);
  }
  if (id === 'alice' && front) { U(9, 13, 1, 1, GOLD); U(22, 13, 1, 1, GOLD); }
  if (!front) return;

  // face
  for (const [x, w] of [[13, 12], [18, 18]]) { // eye column, and the left edge of its 2px features
    if (eyes === 'closed') U(w, 11, 2, 1, OUT);
    else if (eyes === 'narrow') { U(w, 10, 2, 1, OUT); U(x, 11, 1, 1, RED_EYE); }
    else if (eyes === 'wide') { U(w, 9, 2, 3, '#fff'); U(x, 10, 1, 1, OUT); }
    else { U(x, 10, 1, 1, OUT); U(x, 11, 1, 1, dk(c.iris)); }
    U(w, eyes === 'wide' ? 7 : eyes === 'narrow' ? 9 : 8, 2, 1, dk(c.hair));
    if (long) U(x === 13 ? 12 : 19, 13, 1, 1, BLUSH);
  }
  if (id === 'kevin') { U(11, 9, 4, 1, OUT); U(11, 12, 4, 1, OUT); U(17, 9, 4, 1, OUT); U(17, 12, 4, 1, OUT); U(15, 10, 2, 1, OUT); } // round glasses
  U(15, 14, 2, p.mouth ? 2 : 1, p.mouth ? MOUTH : dk(c.skin));
}

/** Rings every opaque pixel with a 1px outline (4-neighbour), the hallmark of the sprite style. */
function outline(g: CanvasRenderingContext2D, w: number, h: number) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const a = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const ring: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ring.push(y * w + x);
  for (const i of ring) d.set([0x14, 0x14, 0x17, 255], i * 4);
  g.putImageData(img, 0, 0);
}

export interface Clip { start: number; count: number; fps: number }
/** A character's sprite strip (frames side by side) and where each animation lives in it. */
export interface Sheet { id: CharId; canvas: HTMLCanvasElement; frames: number; clips: Record<string, Clip>; move: string }

export async function loadSpriteSheet(id: CharId): Promise<Sheet> {
  const clips: Record<string, Clip> = {};
  const poses: Pose[] = [];
  for (const [name, a] of Object.entries(ANIMS[id])) {
    clips[name] = { start: poses.length, count: a.poses.length, fps: a.fps };
    poses.push(...a.poses);
  }
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const custom = override(`sprite_${id}`);
  if (custom) {
    const img = await loadImage(custom);
    c.width = img.width; c.height = img.height;
    g.drawImage(img, 0, 0);
  } else {
    c.width = FW * poses.length; c.height = FH;
    poses.forEach((p, i) => paintSprite(g, i * FW, id, p));
    outline(g, c.width, c.height);
  }
  return { id, canvas: c, frames: poses.length, clips, move: MOVE[id] };
}

/** One frame of a sheet as an <img>-ready URL (used by the battle screen), upscaled so it stays crisp. */
export function frameURL(sheet: Sheet, clip: string, i = 0, flip = false): string {
  const fw = sheet.canvas.width / sheet.frames, fh = sheet.canvas.height, k = Math.max(1, Math.round(192 / fh));
  const c = document.createElement('canvas');
  c.width = fw * k; c.height = fh * k;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(sheet.canvas, (sheet.clips[clip].start + i) * fw, 0, fw, fh, 0, 0, c.width, c.height);
  return c.toDataURL();
}

export type Sheets = Record<CharId, Sheet>;

const decoded: HTMLImageElement[] = [];
/** Decode every sprite sheet and portrait frame up front so nothing pops in mid-scene. */
export async function preloadArt(): Promise<Sheets> {
  const ids = Object.keys(EMOTIONS) as CharId[];
  const urls = ids.flatMap(id => (EMOTIONS[id] as readonly string[]).flatMap(e => {
    const f = portraitFrames(id, e as never);
    return [f.base, ...f.talk, f.blink];
  }));
  // decode up front so swapping frames never flashes; keeping the images referenced keeps them decoded
  const [sheets] = await Promise.all([Promise.all(ids.map(loadSpriteSheet)), Promise.all([...new Set(urls)].map(u => loadImage(u).then(i => { decoded.push(i); return i.decode(); })))]);
  return Object.fromEntries(ids.map((id, i) => [id, sheets[i]])) as Sheets;
}
