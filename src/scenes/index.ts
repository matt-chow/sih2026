// Scene registry. Every src/scenes/<id>/index.ts is picked up automatically; nothing to register.
import type { P2 } from '../logic';
import type { Scene } from '../scene';

const mods = import.meta.glob<{ default: Scene }>('./*/index.ts', { eager: true });
export const SCENES = Object.values(mods).map(m => m.default);

/** Where every run (and Replay) begins. */
export const START: { scene: string; at: P2 } = { scene: 'office', at: { x: -8.6, z: -3.4 } };

// Fail loudly at boot instead of at a doorway.
const byId = new Map(SCENES.map(s => [s.id, s]));
const inside = (p: P2, b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
if (byId.size !== SCENES.length) throw new Error('Two scenes share an id');
if (!byId.has(START.scene)) throw new Error(`START scene "${START.scene}" does not exist`);
for (const s of SCENES) for (const e of s.exits ?? []) {
  const t = byId.get(e.to);
  if (!t) throw new Error(`${s.id}: exit leads to unknown scene "${e.to}"`);
  if (!inside(e.at, t.bounds)) throw new Error(`${s.id} → ${e.to}: arrival point is outside ${e.to}'s bounds`);
  if (t.exits?.some(x => inside(e.at, x.area))) throw new Error(`${s.id} → ${e.to}: arrival point sits inside an exit of ${e.to}, the player would bounce straight back`);
}
