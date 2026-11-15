// Renderer, isometric camera and billboard actors. Room contents live in src/scenes/.
import * as THREE from 'three';
import type { Box, P2 } from './logic';

const CAM_OFFSET = new THREE.Vector3(20, 17, 20);
// Ground-plane directions of the screen axes for this camera yaw.
export const SCREEN_RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
export const SCREEN_UP = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  shake = 0;
  /** Set when changing rooms: the camera snaps instead of gliding. */
  jump = true;
  private camTarget = new THREE.Vector3();
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
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  // ------------------------------------------------------------ per-frame
  /** Follow `focus`, but only as far as keeps room `b` framed (small rooms stay centred). */
  update(dt: number, focus: P2, b: Box) {
    this.time += dt;
    const k = this.jump ? 1 : 1 - Math.exp(-dt * 4);
    this.jump = false;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const rx = Math.max(0, (b.maxX - b.minX) / 2 - 7), rz = Math.max(0, (b.maxZ - b.minZ) / 2 - 5);
    this.camTarget.x += (cx + Math.max(-rx, Math.min(rx, (focus.x - cx) * 0.7)) - this.camTarget.x) * k;
    this.camTarget.z += (cz + Math.max(-rz, Math.min(rz, (focus.z - cz) * 0.7)) - this.camTarget.z) * k;
    this.camera.position.copy(this.camTarget).add(CAM_OFFSET);
    if (this.shake > 0) {
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
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

  constructor(sheet: HTMLCanvasElement, height = 2.1) {
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
