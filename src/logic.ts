// Pure, DOM-free game logic. Imported by the game and by tests/logic.test.ts.

export type State =
  | 'START' | 'EXPLORATION' | 'SPY_REVEAL' | 'CHASE' | 'SPY_ESCAPE'
  | 'ALICE_ENCOUNTER' | 'BATTLE_TRANSITION' | 'BATTLE_CHOICE' | 'ALICE_REVEAL' | 'ENDING';

// The only legal transitions. The story is linear; ENDING loops back for Replay.
export const NEXT: Record<State, State> = {
  START: 'EXPLORATION',
  EXPLORATION: 'SPY_REVEAL',
  SPY_REVEAL: 'CHASE',
  CHASE: 'SPY_ESCAPE',
  SPY_ESCAPE: 'ALICE_ENCOUNTER',
  ALICE_ENCOUNTER: 'BATTLE_TRANSITION',
  BATTLE_TRANSITION: 'BATTLE_CHOICE',
  BATTLE_CHOICE: 'ALICE_REVEAL',
  ALICE_REVEAL: 'ENDING',
  ENDING: 'EXPLORATION',
};

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }
export interface P2 { x: number; z: number }

/** Push a circle (p, r) out of every box and keep it inside bounds. Mutates p. */
export function resolveCircle(p: P2, r: number, boxes: Box[], bounds: Box): void {
  for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.z = cz + (dz / d) * r;
    } else {
      // Centre is inside the box: exit through the nearest face.
      const exits = [p.x - b.minX, b.maxX - p.x, p.z - b.minZ, b.maxZ - p.z];
      const i = exits.indexOf(Math.min(...exits));
      if (i === 0) p.x = b.minX - r;
      else if (i === 1) p.x = b.maxX + r;
      else if (i === 2) p.z = b.minZ - r;
      else p.z = b.maxZ + r;
    }
  }
  p.x = Math.max(bounds.minX + r, Math.min(p.x, bounds.maxX - r));
  p.z = Math.max(bounds.minZ + r, Math.min(p.z, bounds.maxZ - r));
}

export interface Rect { x: number; y: number; w: number; h: number }

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Place rect r inside bounds without overlapping `avoid` (the Alice button).
 * Returns the corrected top-left. Used by the evasive battle buttons.
 */
export function placeRect(r: Rect, bounds: Rect, avoid: Rect): { x: number; y: number } {
  const clampX = (x: number) => Math.max(bounds.x, Math.min(x, bounds.x + bounds.w - r.w));
  const clampY = (y: number) => Math.max(bounds.y, Math.min(y, bounds.y + bounds.h - r.h));
  let x = clampX(r.x), y = clampY(r.y);
  if (!overlaps({ x, y, w: r.w, h: r.h }, avoid)) return { x, y };
  // Try the four exits, keep the in-bounds one that moves the least.
  const options = [
    { x: avoid.x - r.w, y }, { x: avoid.x + avoid.w, y },
    { x, y: avoid.y - r.h }, { x, y: avoid.y + avoid.h },
  ].map(o => ({ x: clampX(o.x), y: clampY(o.y) }))
    .filter(o => !overlaps({ ...o, w: r.w, h: r.h }, avoid))
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  return options[0] ?? { x: bounds.x, y: bounds.y };
}

/** Walk along a polyline at `speed`; returns the new segment index (path.length-1 = done). */
export function followPath(p: P2, path: P2[], i: number, dist: number): number {
  while (i < path.length - 1 && dist > 0) {
    const t = path[i + 1];
    const dx = t.x - p.x, dz = t.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d <= dist) { p.x = t.x; p.z = t.z; dist -= d; i++; }
    else { p.x += (dx / d) * dist; p.z += (dz / d) * dist; dist = 0; }
  }
  return i;
}
