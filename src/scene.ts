// What a scene (room) is, and the Room builder scenes use to make their geometry.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharId } from './art';
import { sheets } from './game';
import type { Box, P2 } from './logic';
import type { Line } from './ui';
import { Actor } from './world';

/** Something the player can walk up to and press E on. */
export interface Thing {
  /** Where it is. Pass an actor's `pos` to make the prompt follow them. */
  at: P2;
  /** Prompt text, e.g. 'Search desk'. */
  label: string;
  /** Dialogue played on use (before `use`, if both are set). */
  lines?: Line[];
  use?: () => void | Promise<void>;
  /** Gone after the first use (until the next run). */
  once?: boolean;
  /** Only usable while this returns true, e.g. () => game.state === 'EXPLORATION'. */
  when?: () => boolean;
}

/** Walk into `area` and you are moved to scene `to` at `at`. */
export interface Exit {
  area: Box;
  to: string;
  at: P2;
  /** Return a message to keep the door shut, or false to let the player through. */
  locked?: () => string | false;
}

export interface Scene {
  id: string;
  /** Walkable floor. Also frames the camera. */
  bounds: Box;
  /** Runs once at boot: geometry, colliders, actors. */
  build(room: Room): void;
  things?: Thing[];
  exits?: Exit[];
  /** New run (and Replay): put this scene's state back. */
  reset?(): void;
  /** Every time the player walks in. */
  enter?(): void;
  /** Every frame while the player is in this scene. */
  update?(dt: number): void;
}

// ------------------------------------------------------------ materials
const lambert = (color: string, flatShading = false) => new THREE.MeshLambertMaterial({ color, flatShading });
const basic = (color: string) => new THREE.MeshBasicMaterial({ color });

export const M = {
  wall: lambert('#2b2f37'), trim: lambert('#16181d'), deskTop: lambert('#f2f1ee'), metal: lambert('#4a4e57'),
  black: lambert('#1a1b20'), chair: lambert('#2a2c33'), screen: basic('#86d11a'), screenDim: basic('#2e5d12'),
  pot: lambert('#ece6da'), leaf: lambert('#3d9a3a', true), leaf2: lambert('#63bf4b', true), wood: lambert('#9a7552'),
  couch: lambert('#2f6d40'), cushion: lambert('#3d8a52'), glass: basic('#bfe3ff'), neon: basic('#76b900'),
  white: lambert('#ffffff'), carpet: lambert('#3b414c'), rug: lambert('#556070'), water: lambert('#8fd0ff'),
  red: lambert('#d9443a'), led: basic('#9cff2e'),
};

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const loader = new THREE.TextureLoader();
const WALL_H = 3.2;

// ------------------------------------------------------------ room builder
export class Room {
  readonly group = new THREE.Group();
  readonly colliders: Box[] = [];
  /** Animated by the engine every frame this room is shown. */
  readonly actors: Actor[] = [];
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private unit = new THREE.BoxGeometry(1, 1, 1);

  /** Box sitting on y (bottom), centred on x/z. Merged into one draw call per material. */
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    this.push(mat, this.unit, new THREE.Matrix4().compose(
      new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(w, h, d)));
  }
  /** Any geometry, centred at x/y/z. */
  at(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, s = 1) {
    this.push(mat, geo, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
  }
  private push(mat: THREE.Material, geo: THREE.BufferGeometry, m: THREE.Matrix4) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat)!.push(g);
  }
  /** Make a w×d footprint centred at x/z block the player. */
  solid(x: number, z: number, w: number, d: number) {
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  /** Add a live (non-merged) object, e.g. something you animate. */
  add(obj: THREE.Object3D) { this.group.add(obj); return obj; }

  /** A character standee. Move it with `.pos`, hide it with `.root.visible`. */
  actor(who: CharId, x: number, z: number, height = 2.1) {
    const a = new Actor(sheets[who], height);
    a.set(x, z);
    this.group.add(a.root);
    this.actors.push(a);
    return a;
  }

  /**
   * Flat picture: `art` is an image URL (import it: `import logo from '../../art/x.png'`)
   * or a canvas draw function on a `px`-wide canvas. ry = Math.PI / 2 faces it out of the left wall.
   */
  sign(w: number, h: number, art: string | ((g: CanvasRenderingContext2D) => void), x: number, y: number, z: number, ry = 0, px = 512) {
    const map = typeof art === 'string' ? loader.load(art) : canvasTex(px, Math.round(px * h / w), art);
    map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    return this.add(m);
  }

  /** The bouncing green "you can interact here" gem. */
  marker(p: P2) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), M.neon);
    m.position.set(p.x, 2.1, p.z);
    return this.add(m);
  }

  /**
   * Floor, base slab, low front lips, and the back (z = minZ) and left (x = minX) walls.
   * Each door is a 2-unit gap centred at `at` (an x for the back wall, a z for the left wall).
   */
  shell(b: Box, doors: { wall: 'back' | 'left'; at: number }[] = [], tiles: [string, string] = ['#c4c7cc', '#bcc0c6']) {
    const W = b.maxX - b.minX, D = b.maxZ - b.minZ, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const tex = canvasTex(256, 256, g => {
      g.fillStyle = tiles[0]; g.fillRect(0, 0, 256, 256);
      g.fillStyle = tiles[1]; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      g.strokeStyle = '#aeb2b9'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256); g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(W / 2, D / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: tex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    this.add(floor);
    this.box(M.trim, W + 0.4, 0.6, D + 0.4, cx, -0.62, cz); // top 2cm under the floor plane, or they z-fight
    this.box(M.trim, W + 0.6, 0.25, 0.3, cx, 0, b.maxZ + 0.15);
    this.box(M.trim, 0.3, 0.25, D + 0.6, b.maxX + 0.15, 0, cz);
    const gaps = (w: string) => doors.filter(d => d.wall === w).map(d => d.at).sort((p, q) => p - q);
    this.wall('back', b.minX - 0.3, b.maxX + 0.3, b.minZ - 0.15, gaps('back'));
    this.wall('left', b.minZ - 0.3, b.maxZ + 0.15, b.minX - 0.15, gaps('left'));
  }

  private wall(side: 'back' | 'left', from: number, to: number, at: number, gaps: number[]) {
    // a0..a1 runs along the wall; off pushes toward the room
    const piece = (m: THREE.Material, a0: number, a1: number, y: number, h: number, thick: number, off = 0) => {
      if (a1 <= a0) return;
      if (side === 'back') this.box(m, a1 - a0, h, thick, (a0 + a1) / 2, y, at + off);
      else this.box(m, thick, h, a1 - a0, at + off, y, (a0 + a1) / 2);
    };
    let a = from;
    for (const g of gaps) {
      piece(M.wall, a, g - 1, 0, WALL_H, 0.3);
      piece(M.neon, a, g - 1, 2.9, 0.06, 0.04, 0.17);
      piece(M.wall, g - 1, g + 1, 2.3, WALL_H - 2.3, 0.3);
      piece(M.trim, g - 1.075, g - 0.925, 0, 2.35, 0.4, 0.05);
      piece(M.trim, g + 0.925, g + 1.075, 0, 2.35, 0.4, 0.05);
      piece(M.trim, g - 1.075, g + 1.075, 2.25, 0.12, 0.4, 0.05);
      a = g + 1;
    }
    piece(M.wall, a, to, 0, WALL_H, 0.3);
    piece(M.neon, a, to, 2.9, 0.06, 0.04, 0.17);
  }

  // ------------------------------------------------------------ furniture
  plant(x: number, z: number, big = false) {
    const s = big ? 1.25 : 1;
    this.at(new THREE.CylinderGeometry(0.32 * s, 0.24 * s, 0.55 * s, 8), M.pot, x, 0.27 * s, z);
    const leaf = new THREE.IcosahedronGeometry(0.42 * s, 0);
    this.at(leaf, M.leaf, x, 0.95 * s, z);
    this.at(leaf, M.leaf2, x + 0.18 * s, 1.35 * s, z - 0.1 * s, 0.75);
    this.at(leaf, M.leaf, x - 0.15 * s, 1.6 * s, z + 0.1 * s, 0.55);
    this.solid(x, z, 0.8 * s, 0.8 * s);
  }

  chair(x: number, z: number, facing: 1 | -1) {
    this.at(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), M.black, x, 0.06, z);
    this.box(M.metal, 0.08, 0.4, 0.08, x, 0.06, z);
    this.box(M.chair, 0.62, 0.12, 0.58, x, 0.45, z);
    this.box(M.chair, 0.62, 0.7, 0.1, x, 0.55, z + 0.3 * facing);
  }

  /** Desk facing +z (facing=1) or -z (facing=-1) with monitor and chair. */
  desk(x: number, z: number, facing: 1 | -1, lit = true) {
    this.box(M.deskTop, 2.2, 0.08, 1.1, x, 0.74, z);
    for (const sx of [-1, 1]) this.box(M.metal, 0.08, 0.74, 1.0, x + sx * 1.0, 0, z);
    this.box(M.black, 0.95, 0.58, 0.06, x, 1.0, z - 0.3 * facing);
    this.box(lit ? M.screen : M.screenDim, 0.85, 0.48, 0.01, x, 1.05, z - 0.3 * facing + 0.035 * facing);
    this.box(M.black, 0.1, 0.2, 0.1, x, 0.82, z - 0.3 * facing);
    this.box(M.chair, 0.7, 0.03, 0.22, x - 0.1, 0.82, z + 0.12 * facing);
    this.box(M.white, 0.12, 0.03, 0.18, x + 0.45, 0.82, z + 0.12 * facing);
    this.chair(x, z + 0.95 * facing, facing);
    this.solid(x, z + 0.3 * facing, 2.3, 2.0);
  }

  /** Merge the static boxes into one mesh per material. Called by the engine after build(). */
  finish() {
    for (const [mat, geos] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.matrixAutoUpdate = false;
      this.group.add(m);
    }
    this.parts.clear();
  }
}
