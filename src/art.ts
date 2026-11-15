// Character art pipeline.
// Every sprite sheet / portrait is procedural SVG unless an artist PNG with the
// matching name exists in src/art/ (see src/art/README.md) — then that wins.

export type CharId = 'hensen' | 'kevin' | 'alice' | 'aliceSpy';
export const EMOTIONS = {
  hensen: ['neutral', 'smug', 'shocked', 'love', 'defeated'],
  kevin: ['panic'],
  alice: ['smile', 'wink'],
  aliceSpy: ['evil'],
} as const;
export type Emotion<C extends CharId = CharId> = (typeof EMOTIONS)[C][number];

const overrides = import.meta.glob('./art/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const override = (name: string): string | undefined => overrides[`./art/${name}.png`];

const svgUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error('failed to load ' + src.slice(0, 80)));
  img.src = src;
});

// ---------------------------------------------------------------- palettes
const OUT = '#141417';
interface Pal { skin: string; hair: string; hairHi?: string; top: string; topHi: string; inner: string; leg: string; shoe: string; iris: string }
const PAL: Record<CharId, Pal> = {
  hensen: { skin: '#e9b98e', hair: '#25252a', hairHi: '#9a9aa6', top: '#151518', topHi: '#3a3a42', inner: '#2c2c33', leg: '#1d1d22', shoe: '#0a0a0a', iris: '#3b2a1e' },
  kevin: { skin: '#f1c9a2', hair: '#6d4524', top: '#a9cbef', topHi: '#d6e7f8', inner: '#c8372d', leg: '#3c4456', shoe: '#2a2a2a', iris: '#4a3a22' },
  alice: { skin: '#f4d0b4', hair: '#b8442f', hairHi: '#e0734f', top: '#e2588b', topHi: '#f39ab9', inner: '#ffffff', leg: '#2e2e3c', shoe: '#7c1f3e', iris: '#2f8a57' },
  aliceSpy: { skin: '#f4d0b4', hair: '#8f2f22', hairHi: '#c4523a', top: '#141417', topHi: '#2b2b31', inner: '#76b900', leg: '#141417', shoe: '#0a0a0a', iris: '#e21d3a' },
};

// ---------------------------------------------------------------- portraits
// viewBox 500x600, head centred at (250,250)
type EyeKind = 'normal' | 'wide' | 'heart' | 'closed' | 'tears' | 'shades';
type BrowKind = 'neutral' | 'worried' | 'angry' | 'raised';
type MouthKind = 'smallSmile' | 'smile' | 'grin' | 'scream' | 'wavy' | 'smirk' | 'evilGrin';
interface Face { eyes: [EyeKind, EyeKind]; brows: BrowKind; mouth: MouthKind; blush?: boolean; sweat?: boolean; sparkle?: boolean }

const FACES: Record<string, Face> = {
  'hensen.neutral': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smallSmile' },
  'hensen.smug': { eyes: ['closed', 'closed'], brows: 'raised', mouth: 'smirk' },
  'hensen.shocked': { eyes: ['wide', 'wide'], brows: 'raised', mouth: 'scream', sweat: true },
  'hensen.love': { eyes: ['heart', 'heart'], brows: 'raised', mouth: 'grin', blush: true, sparkle: true },
  'hensen.defeated': { eyes: ['tears', 'tears'], brows: 'worried', mouth: 'wavy', sweat: true },
  'kevin.panic': { eyes: ['wide', 'wide'], brows: 'worried', mouth: 'wavy', sweat: true },
  'alice.smile': { eyes: ['normal', 'normal'], brows: 'neutral', mouth: 'smile', blush: true },
  'alice.wink': { eyes: ['normal', 'closed'], brows: 'raised', mouth: 'smile', blush: true, sparkle: true },
  'aliceSpy.evil': { eyes: ['shades', 'shades'], brows: 'angry', mouth: 'evilGrin' },
};

function eye(kind: EyeKind, x: number, y: number, p: Pal, lashes: boolean): string {
  const lash = lashes ? `<path d="M${x + (x > 250 ? 18 : -18)},${y - 18} l${x > 250 ? 14 : -14},-10" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>` : '';
  switch (kind) {
    case 'normal':
      return `<ellipse cx="${x}" cy="${y}" rx="21" ry="25" fill="#fff" stroke="${OUT}" stroke-width="5"/>
        <circle cx="${x + 2}" cy="${y + 3}" r="14" fill="${p.iris}"/><circle cx="${x + 2}" cy="${y + 3}" r="6.5" fill="#0b0b0d"/>
        <circle cx="${x + 8}" cy="${y - 5}" r="5" fill="#fff"/>${lash}`;
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
    case 'shades':
      return '';
  }
}

function brow(kind: BrowKind, x: number, y: number, color: string): string {
  const s = x < 250 ? 1 : -1; // +1 means the inner end is on the right
  const inner = x + 24 * s, outer = x - 24 * s;
  const [yi, yo] = { neutral: [y - 50, y - 52], worried: [y - 64, y - 44], angry: [y - 36, y - 60], raised: [y - 66, y - 62] }[kind];
  return `<path d="M${outer},${yo} Q${x},${Math.min(yi, yo) - 8} ${inner},${yi}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`;
}

function mouth(kind: MouthKind): string {
  const st = `fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'smallSmile': return `<path d="M228,330 Q250,344 272,330" ${st}/>`;
    case 'smile': return `<path d="M214,322 Q250,358 286,322" ${st}/>`;
    case 'smirk': return `<path d="M222,338 Q262,346 290,316" ${st}/>`;
    case 'grin': return `<path d="M204,316 Q250,384 296,316Z" fill="#fff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/><path d="M226,352 Q250,362 274,352" fill="#e86a7f"/>`;
    case 'scream': return `<ellipse cx="250" cy="345" rx="32" ry="42" fill="#3a0d12" stroke="${OUT}" stroke-width="6"/><ellipse cx="250" cy="368" rx="18" ry="10" fill="#e0607a"/>`;
    case 'wavy': return `<path d="M206,338 l11,-9 l11,9 l11,-9 l11,9 l11,-9 l11,9 l11,-9 l11,9" ${st}/>`;
    case 'evilGrin': return `<path d="M188,312 Q250,392 312,312Z" fill="#fff" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M198,322 l10,14 l10,-10 l10,16 l10,-12 l12,18 l12,-18 l10,12 l10,-16 l10,10 l10,-14" fill="none" stroke="${OUT}" stroke-width="4"/>`;
  }
}

function portraitSVG(id: CharId, emotion: string): string {
  const p = PAL[id];
  const f = FACES[`${id}.${emotion}`];
  const isAlice = id === 'alice' || id === 'aliceSpy';
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
    parts.push(`<path d="M206,430 L250,470 L294,430 L304,452 L250,488 L196,452Z" fill="#fff" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M240,470 L260,470 L268,600 L232,600Z" fill="${p.inner}" stroke="${OUT}" stroke-width="5"/>
      <path d="M190,440 C176,500 184,540 196,560 M310,440 C324,500 316,540 304,560" stroke="#2a8a3a" stroke-width="6" fill="none"/>
      <rect x="172" y="552" width="48" height="40" rx="4" fill="#fff" stroke="${OUT}" stroke-width="4"/><rect x="180" y="560" width="14" height="14" fill="#76b900"/>`);
  } else {
    parts.push(`<path d="M206,432 L250,540 L294,432Z" fill="${p.inner}"/>
      <path d="M206,432 L170,450 L236,600 L250,540Z M294,432 L330,450 L264,600 L250,540Z" fill="${p.topHi}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`);
  }

  // head
  parts.push(`<ellipse cx="132" cy="268" rx="20" ry="30" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/><ellipse cx="368" cy="268" rx="20" ry="30" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/>`);
  parts.push(`<ellipse cx="250" cy="250" rx="120" ry="135" fill="${p.skin}" stroke="${OUT}" stroke-width="6"/>`);
  if (isAlice) parts.push(`<circle cx="130" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/><circle cx="370" cy="305" r="8" fill="#f5c542" stroke="${OUT}" stroke-width="3"/>`);
  if (id === 'aliceSpy') parts.push(`<path d="M378,280 c20,10 -10,25 10,35 c20,10 -10,25 10,35 c20,10 -6,40 4,80" stroke="#222" stroke-width="4" fill="none"/>`);

  // face
  if (f.blush) parts.push(`<ellipse cx="172" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/><ellipse cx="328" cy="312" rx="26" ry="14" fill="#ff7a9a" opacity=".55"/>`);
  parts.push(`<path d="M250,284 L242,306 L258,306" fill="none" stroke="${OUT}" stroke-width="4" stroke-linejoin="round" opacity=".6"/>`);
  parts.push(eye(f.eyes[0], 200, 262, p, isAlice), eye(f.eyes[1], 300, 262, p, isAlice));
  if (f.eyes[0] === 'shades') parts.push(`<path d="M152,240 H240 Q240,292 196,292 Q152,292 152,240Z M260,240 H348 Q348,292 304,292 Q260,292 260,240Z" fill="#0b0b0d" stroke="${OUT}" stroke-width="6"/>
    <path d="M240,248 Q250,240 260,248" stroke="${OUT}" stroke-width="6" fill="none"/><path d="M134,246 L152,244 M348,244 L366,246" stroke="${OUT}" stroke-width="6"/>
    <path d="M166,252 l22,0 M276,252 l22,0" stroke="#76b900" stroke-width="5" stroke-linecap="round"/>`);
  if (id === 'kevin') parts.push(`<circle cx="200" cy="262" r="38" fill="none" stroke="${OUT}" stroke-width="7"/><circle cx="300" cy="262" r="38" fill="none" stroke="${OUT}" stroke-width="7"/><path d="M238,258 Q250,250 262,258" stroke="${OUT}" stroke-width="7" fill="none"/>`);
  parts.push(mouth(f.mouth));

  // front hair & brows
  if (id === 'hensen') parts.push(`<path d="M128,252 C116,140 182,102 256,104 C334,106 386,154 372,252 C364,206 344,176 304,168 C262,160 204,164 172,178 C146,194 134,220 128,252Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6"/>
    <path d="M160,170 C210,132 290,128 350,170 M180,150 C230,124 290,124 330,146" stroke="${p.hairHi}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>`);
  else if (id === 'kevin') parts.push(`<path d="M126,250 L120,170 L150,186 L156,120 L196,156 L222,98 L250,148 L286,96 L304,152 L344,118 L346,180 L380,172 L374,250 C350,190 300,176 250,176 C200,176 150,190 126,250Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>`);
  else parts.push(`<path d="M124,246 C116,136 188,100 254,102 C334,104 388,148 378,248 C354,196 330,176 306,170 C292,198 250,206 232,176 C200,202 160,214 124,246Z" fill="${p.hair}" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M190,130 C220,116 260,114 300,124" stroke="${p.hairHi}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
  parts.push(brow(f.brows, 200, 262, p.hair), brow(f.brows, 300, 262, p.hair));

  // extras
  if (f.sweat) parts.push(`<path d="M392,150 q-14,24 0,30 q14,-6 0,-30Z M408,214 q-10,18 0,22 q10,-4 0,-22Z M100,180 q-12,20 0,26 q12,-6 0,-26Z" fill="#7fd3ff" stroke="#2a6f9a" stroke-width="3"/>`);
  if (f.sparkle) parts.push(`<path d="M420,120 l8,22 l22,8 l-22,8 l-8,22 l-8,-22 l-22,-8 l22,-8Z M80,110 l6,16 l16,6 l-16,6 l-6,16 l-6,-16 l-16,-6 l16,-6Z" fill="#fff6a8" stroke="#c9a400" stroke-width="3"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600" viewBox="0 0 500 600">${parts.join('')}</svg>`;
}

export function portraitSrc<C extends CharId>(id: C, emotion: Emotion<C>): string {
  return override(`portrait_${id}_${emotion}`) ?? svgUrl(portraitSVG(id, emotion));
}

// ---------------------------------------------------------------- sprites
// viewBox 64x96, facing right. Frame 0 = idle, 0..3 = walk cycle.
const FW = 128, FH = 192;

function limb(x1: number, y1: number, x2: number, y2: number, color: string, w = 7) {
  return `<path d="M${x1},${y1} L${x2},${y2}" stroke="${OUT}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="M${x1},${y1} L${x2},${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

function spriteSVG(id: CharId, frame: number): string {
  const p = PAL[id];
  const ph = [0, 1, 0, -1][frame];
  const bob = frame % 2 ? -2 : 0;
  const isAlice = id === 'alice' || id === 'aliceSpy';
  const s: string[] = [];
  // legs (back then front)
  s.push(limb(30, 68, 30 - ph * 5, 86, p.leg), `<ellipse cx="${32 - ph * 5}" cy="88" rx="6" ry="3.5" fill="${p.shoe}" stroke="${OUT}" stroke-width="2"/>`);
  s.push(limb(35, 68, 35 + ph * 5, 86, p.leg), `<ellipse cx="${37 + ph * 5}" cy="88" rx="6" ry="3.5" fill="${p.shoe}" stroke="${OUT}" stroke-width="2"/>`);
  s.push(`<g transform="translate(0,${bob})">`);
  if (isAlice) s.push(`<path d="M14,28 C12,8 30,4 36,5 C50,6 54,18 50,30 L52,58 L22,58 C20,48 16,40 14,28Z" fill="${p.hair}" stroke="${OUT}" stroke-width="2.2"/>`);
  // back arm
  s.push(limb(30, 47, 30 + ph * 6, 62, p.top, 6), `<circle cx="${30 + ph * 6}" cy="63" r="3.4" fill="${p.skin}" stroke="${OUT}" stroke-width="2"/>`);
  // torso
  s.push(`<rect x="21" y="42" width="22" height="29" rx="7" fill="${p.top}" stroke="${OUT}" stroke-width="2.2"/>`);
  if (id === 'hensen') s.push(`<path d="M30,43 L33,58 L37,43Z" fill="${p.inner}"/><path d="M28,43 L32,56 M38,43 L34,56" stroke="${p.topHi}" stroke-width="2.4"/><circle cx="40" cy="52" r="1.6" fill="#76b900"/>`);
  if (id === 'kevin') s.push(`<path d="M33,43 L35,46 L33,60 L31,46Z" fill="${p.inner}" stroke="${OUT}" stroke-width="1"/><rect x="36" y="52" width="5" height="6" fill="#fff" stroke="${OUT}" stroke-width="1"/>`);
  if (isAlice) s.push(`<path d="M30,43 L33,56 L37,43Z" fill="${p.inner}"/><rect x="21" y="64" width="22" height="7" rx="2" fill="${p.leg}" stroke="${OUT}" stroke-width="2"/>`);
  // head
  s.push(`<circle cx="33" cy="26" r="17" fill="${p.skin}" stroke="${OUT}" stroke-width="2.2"/>`);
  // hair
  if (id === 'hensen') s.push(`<path d="M15,27 C13,9 27,5 35,6 C46,7 52,14 50,24 C46,16 39,14 32,15 C25,16 19,20 15,27Z" fill="${p.hair}" stroke="${OUT}" stroke-width="2.2"/><path d="M22,12 C30,8 40,9 46,14" stroke="${p.hairHi}" stroke-width="1.6" fill="none"/>`);
  else if (id === 'kevin') s.push(`<path d="M15,26 L15,12 L20,15 L23,6 L29,11 L34,4 L38,10 L44,6 L45,13 L51,14 L50,25 C44,17 30,16 15,26Z" fill="${p.hair}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`);
  else s.push(`<path d="M15,25 C14,10 26,6 34,6 C46,6 52,14 51,25 C47,18 42,16 38,16 C35,21 30,21 28,17 C24,20 19,22 15,25Z" fill="${p.hair}" stroke="${OUT}" stroke-width="2.2"/>`);
  // face
  if (id === 'aliceSpy') s.push(`<path d="M33,24 H51 V28 Q51,32 46,32 Q42,32 42,28 Q42,32 38,32 Q33,32 33,28Z" fill="#0b0b0d"/><path d="M36,26 h3 M45,26 h3" stroke="#76b900" stroke-width="1.2"/>`);
  else s.push(`<ellipse cx="38" cy="27" rx="2.1" ry="3" fill="${OUT}"/><ellipse cx="46" cy="27" rx="2.1" ry="3" fill="${OUT}"/><circle cx="38.8" cy="25.8" r=".9" fill="#fff"/><circle cx="46.8" cy="25.8" r=".9" fill="#fff"/>`);
  if (id === 'kevin') s.push(`<circle cx="38" cy="27" r="4.6" fill="none" stroke="${OUT}" stroke-width="1.4"/><circle cx="47" cy="27" r="4.6" fill="none" stroke="${OUT}" stroke-width="1.4"/>`);
  if (id === 'alice') s.push(`<ellipse cx="36" cy="33" rx="3" ry="1.6" fill="#ff7a9a" opacity=".7"/><ellipse cx="48" cy="33" rx="3" ry="1.6" fill="#ff7a9a" opacity=".7"/>`);
  s.push(`<path d="M40,35 Q43,${id === 'kevin' ? 33 : 37.5} 46,35" stroke="${OUT}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  // front arm (+ Kevin's folder of secrets)
  s.push(limb(34, 47, 34 - ph * 6, 62, p.top, 6), `<circle cx="${34 - ph * 6}" cy="63" r="3.4" fill="${p.skin}" stroke="${OUT}" stroke-width="2"/>`);
  if (id === 'kevin') s.push(`<rect x="${36 - ph * 6}" y="54" width="12" height="15" rx="1" fill="#e8c26a" stroke="${OUT}" stroke-width="1.8" transform="rotate(8 ${42 - ph * 6} 61)"/>`);
  s.push('</g>');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}" viewBox="0 0 64 96">${s.join('')}</svg>`;
}

/** 8-frame horizontal sheet: 0..3 facing right, 4..7 the same frames mirrored. */
export async function loadSpriteSheet(id: CharId): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas');
  c.width = FW * 8; c.height = FH;
  const g = c.getContext('2d')!;
  const custom = override(`sprite_${id}`);
  const frames = custom
    ? Array(4).fill(await loadImage(custom)).map((img: HTMLImageElement, i) => ({ img, sx: (img.width / 4) * i, sw: img.width / 4, sh: img.height }))
    : (await Promise.all([0, 1, 2, 3].map(f => loadImage(svgUrl(spriteSVG(id, f)))))).map(img => ({ img, sx: 0, sw: FW, sh: FH }));
  frames.forEach(({ img, sx, sw, sh }, i) => {
    g.drawImage(img, sx, 0, sw, sh, i * FW, 0, FW, FH);
    g.save();
    g.translate((i + 5) * FW, 0);
    g.scale(-1, 1);
    g.drawImage(img, sx, 0, sw, sh, 0, 0, FW, FH);
    g.restore();
  });
  return c;
}

/** One frame of a sheet as an <img>-ready URL (used by the battle screen). */
export function frameURL(sheet: HTMLCanvasElement, frame: number): string {
  const c = document.createElement('canvas');
  c.width = FW; c.height = FH;
  c.getContext('2d')!.drawImage(sheet, frame * FW, 0, FW, FH, 0, 0, FW, FH);
  return c.toDataURL();
}

export type Sheets = Record<CharId, HTMLCanvasElement>;

/** Decode every sprite sheet and portrait up front so nothing pops in mid-scene. */
export async function preloadArt(): Promise<Sheets> {
  const ids = Object.keys(EMOTIONS) as CharId[];
  const portraits = ids.flatMap(id => (EMOTIONS[id] as readonly string[]).map(e => loadImage(portraitSrc(id, e as never))));
  const [sheets] = await Promise.all([Promise.all(ids.map(loadSpriteSheet)), Promise.all(portraits)]);
  return Object.fromEntries(ids.map((id, i) => [id, sheets[i]])) as Sheets;
}
