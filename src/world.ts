// The office: renderer, isometric camera, static geometry, colliders, billboard actors.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Box, P2 } from './logic';

export const ROOM: Box = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
export const DOOR: P2 = { x: 9, z: -8 };
const CAM_OFFSET = new THREE.Vector3(20, 17, 20);
// Ground-plane directions of the screen axes for this camera yaw.
export const SCREEN_RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
export const SCREEN_UP = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };

export type DeskId = 'A' | 'B' | 'C';
export interface Desk { id: DeskId; x: number; z: number; searched: boolean; marker: THREE.Mesh }

const lambert = (color: string, flatShading = false) => new THREE.MeshLambertMaterial({ color, flatShading });
const basic = (color: string) => new THREE.MeshBasicMaterial({ color });

const M = {
  wall: lambert('#2b2f37'), trim: lambert('#16181d'), deskTop: lambert('#f2f1ee'), metal: lambert('#4a4e57'),
  black: lambert('#1a1b20'), chair: lambert('#2a2c33'), screen: basic('#86d11a'), screenDim: basic('#2e5d12'),
  pot: lambert('#ece6da'), leaf: lambert('#3d9a3a', true), leaf2: lambert('#63bf4b', true), wood: lambert('#9a7552'),
  couch: lambert('#2f6d40'), cushion: lambert('#3d8a52'), glass: basic('#bfe3ff'), neon: basic('#76b900'),
  white: lambert('#ffffff'), carpet: lambert('#3b414c'), rug: lambert('#556070'), water: lambert('#8fd0ff'),
  red: lambert('#d9443a'), led: basic('#9cff2e'),
};

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  readonly colliders: Box[] = [];
  readonly desks: Desk[] = [];
  shake = 0;
  doorOpen = false;
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private unit = new THREE.BoxGeometry(1, 1, 1);
  private camTarget = new THREE.Vector3();
  private doorPivot = new THREE.Group();
  private time = 0;
  private pixelRatio = Math.min(devicePixelRatio, 1.5);
  private frameAvg = 1 / 60;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.scene.background = new THREE.Color('#0e1013');
    this.camera.position.copy(CAM_OFFSET);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#5a6472', 2.2));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
    sun.position.set(6, 12, 4);
    this.scene.add(sun);
    this.build();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  // ------------------------------------------------------------ building helpers
  /** Box sitting on y (bottom), centred on x/z. Merged into one draw call per material. */
  private box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    this.push(mat, this.unit, new THREE.Matrix4().compose(
      new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(w, h, d)));
  }
  private push(mat: THREE.Material, geo: THREE.BufferGeometry, m: THREE.Matrix4) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat)!.push(g);
  }
  private at(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, s = 1) {
    this.push(mat, geo, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
  }
  private solid(x: number, z: number, w: number, d: number) {
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  private plant(x: number, z: number, big = false) {
    const s = big ? 1.25 : 1;
    this.at(new THREE.CylinderGeometry(0.32 * s, 0.24 * s, 0.55 * s, 8), M.pot, x, 0.27 * s, z);
    const leaf = new THREE.IcosahedronGeometry(0.42 * s, 0);
    this.at(leaf, M.leaf, x, 0.95 * s, z);
    this.at(leaf, M.leaf2, x + 0.18 * s, 1.35 * s, z - 0.1 * s, 0.75);
    this.at(leaf, M.leaf, x - 0.15 * s, 1.6 * s, z + 0.1 * s, 0.55);
    this.solid(x, z, 0.8 * s, 0.8 * s);
  }

  private chair(x: number, z: number, facing: 1 | -1) {
    this.at(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), M.black, x, 0.06, z);
    this.box(M.metal, 0.08, 0.4, 0.08, x, 0.06, z);
    this.box(M.chair, 0.62, 0.12, 0.58, x, 0.45, z);
    this.box(M.chair, 0.62, 0.7, 0.1, x, 0.55, z + 0.3 * facing);
  }

  /** Desk facing +z (facing=1) or -z (facing=-1) with monitor and chair. */
  private desk(x: number, z: number, facing: 1 | -1, lit = true) {
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

  // ------------------------------------------------------------ the office
  private build() {
    const { scene } = this;
    // floor
    const floorTex = canvasTex(256, 256, g => {
      g.fillStyle = '#c4c7cc'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#bcc0c6'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      g.strokeStyle = '#aeb2b9'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256); g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128);
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(12, 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    this.box(M.carpet, 11.6, 0.02, 6.2, 0, 0, -0.4);
    this.box(M.rug, 4.4, 0.02, 3.2, -9.2, 0, 4.6);
    // base slab so the diorama has thickness
    this.box(M.trim, 24.4, 0.6, 16.4, 0, -0.62, 0); // top 2cm under the floor plane, or they z-fight

    // back wall (z=-8) with doorway at x 8..10, left wall (x=-12)
    const H = 3.2;
    this.box(M.wall, 20.3, H, 0.3, -2.15, 0, -8.15);
    this.box(M.wall, 2.3, H, 0.3, 11.15, 0, -8.15);
    this.box(M.wall, 2, H - 2.3, 0.3, 9, 2.3, -8.15);
    this.box(M.wall, 0.3, H, 16.6, -12.15, 0, -0.15);
    this.box(M.neon, 20.3, 0.06, 0.04, -2.15, 2.9, -7.98);
    this.box(M.neon, 0.04, 0.06, 16, -11.98, 2.9, 0);
    // low front lips so the floor reads as a box
    this.box(M.trim, 24.6, 0.25, 0.3, 0, 0, 8.15);
    this.box(M.trim, 0.3, 0.25, 16.6, 12.15, 0, 0);
    // windows on the left wall
    for (const z of [-5, 0.5, 5]) {
      this.box(M.trim, 0.06, 1.7, 3.2, -11.98, 0.85, z);
      this.box(M.glass, 0.06, 1.5, 3.0, -11.95, 0.95, z);
      this.box(M.trim, 0.08, 1.5, 0.06, -11.93, 0.95, z);
    }
    // door frame, door leaf, exit sign
    this.box(M.trim, 0.15, 2.35, 0.4, 8, 0, -8.1);
    this.box(M.trim, 0.15, 2.35, 0.4, 10, 0, -8.1);
    this.box(M.trim, 2.15, 0.12, 0.4, 9, 2.25, -8.1);
    const leaf = new THREE.Mesh(this.unit, M.black);
    leaf.scale.set(1.85, 2.2, 0.08);
    leaf.position.set(0.95, 1.1, 0);
    this.doorPivot.position.set(8.05, 0, -8.05);
    this.doorPivot.add(leaf);
    scene.add(this.doorPivot);
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 86, g => {
        g.fillStyle = '#76b900'; g.fillRect(0, 0, 256, 86);
        g.fillStyle = '#0b0d0f'; g.font = 'bold 56px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('EXIT ➜', 128, 46);
      }),
    }));
    exitSign.position.set(9, 2.75, -7.97);
    scene.add(exitSign);

    // NGIDIA sign on the back wall
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshBasicMaterial({
      map: canvasTex(1024, 256, g => {
        g.fillStyle = '#0b0d10'; g.fillRect(0, 0, 1024, 256);
        // chip glyph
        g.fillStyle = '#76b900'; g.fillRect(40, 48, 160, 160);
        g.fillStyle = '#0b0d10'; g.fillRect(72, 80, 96, 96);
        g.fillStyle = '#76b900'; g.fillRect(96, 104, 48, 48);
        for (let i = 0; i < 4; i++) { g.fillRect(56 + i * 36, 24, 14, 24); g.fillRect(56 + i * 36, 208, 14, 24); }
        g.fillStyle = '#fff'; g.font = '900 150px "Arial Black",Impact,system-ui,sans-serif'; g.textBaseline = 'middle';
        g.fillText('NGIDIA', 236, 120);
        g.fillStyle = '#76b900'; g.font = 'bold 30px system-ui,sans-serif';
        g.fillText("THE WAY IT'S MEANT TO BE LEAKED", 244, 222);
      }),
    }));
    logo.position.set(-4.5, 1.95, -7.98);
    scene.add(logo);

    // whiteboard on the left wall
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshLambertMaterial({
      map: canvasTex(512, 276, g => {
        g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 276);
        g.strokeStyle = '#9aa0a8'; g.lineWidth = 10; g.strokeRect(0, 0, 512, 276);
        g.fillStyle = '#1d4fbf'; g.font = 'bold 34px "Comic Sans MS",cursive';
        g.fillText('Q4 PLAN:', 30, 56);
        g.fillText('1. MORE GPUs', 30, 106);
        g.fillText('2. ???', 30, 152);
        g.fillStyle = '#2a8a2a'; g.fillText('3. PROFIT', 30, 198);
        g.strokeStyle = '#2a8a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(300, 230); g.lineTo(350, 190); g.lineTo(390, 205); g.lineTo(470, 60); g.stroke();
        g.fillStyle = '#d02020'; g.font = 'bold 26px "Comic Sans MS",cursive'; g.fillText('DO NOT LEAK', 300, 258);
      }),
    }));
    wb.rotation.y = Math.PI / 2;
    wb.position.set(-11.97, 1.6, -2.3);
    scene.add(wb);

    // searchable desk row (facing +z) and the back-to-back row behind it
    const ids: DeskId[] = ['A', 'B', 'C'];
    [-3.6, 0, 3.6].forEach((x, i) => {
      this.desk(x, 0.2, 1);
      this.desk(x, -1.1, -1, i !== 1);
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), M.neon);
      marker.position.set(x, 2.1, 0.3);
      scene.add(marker);
      this.desks.push({ id: ids[i], x, z: 0.2, searched: false, marker });
    });
    // CEO corner
    this.box(M.black, 3, 0.1, 1.4, -8.6, 0.76, -5.3);
    this.box(M.black, 2.9, 0.76, 0.12, -8.6, 0, -4.7);
    for (const sx of [-1, 1]) this.box(M.black, 0.12, 0.76, 1.3, -8.6 + sx * 1.4, 0, -5.3);
    this.box(M.black, 1.6, 0.8, 0.06, -8.6, 1.05, -5.7);
    this.box(M.screen, 1.5, 0.7, 0.01, -8.6, 1.1, -5.66);
    this.box(M.chair, 0.8, 1.3, 0.14, -8.6, 0.45, -6.4);
    this.box(M.chair, 0.8, 0.14, 0.7, -8.6, 0.45, -6.05);
    this.solid(-8.6, -5.6, 3.1, 2.1);
    // server racks with blinking LEDs (own material so we can animate it)
    for (const x of [1.5, 2.5, 3.5]) {
      this.box(M.black, 0.9, 2.3, 0.8, x, 0, -7.45);
      for (let y = 0.4; y < 2.2; y += 0.35) this.box(M.led, 0.5, 0.04, 0.02, x, y, -7.04);
    }
    this.solid(2.5, -7.45, 3.1, 0.9);
    // lounge: couch, coffee table
    this.box(M.couch, 3, 0.45, 1, -9.4, 0, 6.6);
    this.box(M.couch, 3, 0.9, 0.3, -9.4, 0.3, 7.05);
    for (const sx of [-1, 1]) this.box(M.couch, 0.3, 0.75, 1, -9.4 + sx * 1.5, 0, 6.6);
    this.box(M.cushion, 1.3, 0.12, 0.8, -10.1, 0.45, 6.55);
    this.box(M.cushion, 1.3, 0.12, 0.8, -8.7, 0.45, 6.55);
    this.solid(-9.4, 6.7, 3.4, 1.4);
    this.box(M.wood, 1.6, 0.08, 0.8, -9.4, 0.4, 4.5);
    for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) this.box(M.black, 0.06, 0.4, 0.06, -9.4 + dx, 0, 4.5 + dz);
    this.solid(-9.4, 4.5, 1.8, 1);
    // kitchen counter + coffee machine, water cooler
    this.box(M.white, 1.1, 0.95, 4.2, 11.35, 0, 3);
    this.box(M.black, 1.2, 0.06, 4.3, 11.35, 0.95, 3);
    this.box(M.black, 0.5, 0.6, 0.45, 11.4, 1.01, 2);
    this.box(M.red, 0.18, 0.2, 0.15, 11.4, 1.01, 3.6);
    this.solid(11.35, 3, 1.3, 4.4);
    this.box(M.white, 0.5, 1.0, 0.5, 11.3, 0, -2.4);
    this.at(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 10), M.water, 11.3, 1.27, -2.4);
    this.solid(11.3, -2.4, 0.7, 0.7);
    // plants
    this.plant(-11.2, -7.2, true);
    this.plant(6.7, -7.3);
    this.plant(11.2, 7.2, true);
    this.plant(-11.2, 2.4);
    this.plant(-5.8, -7.3);
    this.plant(5.6, 7.2);

    // one mesh per material
    for (const [mat, geos] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.matrixAutoUpdate = false;
      scene.add(m);
    }
    this.parts.clear();
  }

  // ------------------------------------------------------------ per-frame
  update(dt: number, focus: P2) {
    this.time += dt;
    const k = 1 - Math.exp(-dt * 4);
    this.camTarget.x += (Math.max(-5, Math.min(5, focus.x * 0.7)) - this.camTarget.x) * k;
    this.camTarget.z += (Math.max(-3, Math.min(3.5, focus.z * 0.7)) - this.camTarget.z) * k;
    this.camera.position.copy(this.camTarget).add(CAM_OFFSET);
    if (this.shake > 0) {
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.doorPivot.rotation.y += ((this.doorOpen ? 1.7 : 0) - this.doorPivot.rotation.y) * (1 - Math.exp(-dt * 8));
    (M.led.color as THREE.Color).setHSL(0.25, 1, 0.45 + 0.15 * Math.sin(this.time * 9));
    for (const d of this.desks) {
      d.marker.rotation.y += dt * 2;
      d.marker.position.y = 2.1 + Math.sin(this.time * 3 + d.x) * 0.1;
    }
    this.adaptPixelRatio(dt);
  }

  /** Drop resolution on slow GPUs (integrated graphics); never raise it back mid-session. */
  private adaptPixelRatio(dt: number) {
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    if (this.frameAvg > 1 / 40 && this.pixelRatio > 0.75 && this.time > 3) {
      this.pixelRatio -= 0.25;
      this.renderer.setPixelRatio(this.pixelRatio);
      this.frameAvg = 1 / 60;
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }

  resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    const half = Math.max(6.6, 9 / aspect);
    Object.assign(this.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** World point → CSS pixel position (for HTML overlays). */
  toScreen(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
}

/** A 2D sprite standee: cylindrical billboard with an 8-frame sheet (see art.ts). */
export class Actor {
  readonly root = new THREE.Group();
  readonly pos: P2;
  tilt = 0;
  lift = 0;
  private mesh: THREE.Mesh;
  private tex: THREE.CanvasTexture;
  private walkT = 0;
  private facing = 1;
  private last = { x: 0, z: 0 };

  constructor(world: World, sheet: HTMLCanvasElement, height = 2.1) {
    this.tex = new THREE.CanvasTexture(sheet);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.repeat.set(1 / 8, 1);
    const w = height * (128 / 192);
    const geo = new THREE.PlaneGeometry(w, height);
    geo.translate(0, height / 2, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide }));
    const turn = new THREE.Group();
    turn.rotation.y = Math.PI / 4; // face the camera
    turn.scale.y = 1.15; // undo the camera's vertical foreshortening
    turn.add(this.mesh);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(w * 0.36, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    this.root.add(shadow, turn);
    this.pos = this.root.position; // moving pos moves the sprite
    world.scene.add(this.root);
  }

  set(x: number, z: number) {
    this.root.position.set(x, 0, z);
    this.last = { x, z };
  }

  face(dir: 1 | -1) { this.facing = dir; }

  /** Call once per frame after moving `pos`; picks walk frame and facing from the motion. */
  animate(dt: number) {
    const vx = (this.pos.x - this.last.x) / dt, vz = (this.pos.z - this.last.z) / dt;
    this.last = { x: this.pos.x, z: this.pos.z };
    const speed = Math.hypot(vx, vz);
    if (speed > 0.3) {
      this.walkT += dt * (4 + speed * 1.4);
      const sx = vx * SCREEN_RIGHT.x + vz * SCREEN_RIGHT.z;
      if (Math.abs(sx) > 0.2) this.facing = sx > 0 ? 1 : -1;
    } else this.walkT = 0;
    const frame = speed > 0.3 ? Math.floor(this.walkT) % 4 : 0;
    this.tex.offset.x = (frame + (this.facing < 0 ? 4 : 0)) / 8;
    this.mesh.rotation.z = this.tilt;
    this.mesh.position.y = this.lift;
  }
}
