// The hallway outside the office. Smallest complete scene: copy this folder to start a new room.
import logo from '../../art/njidion_logo.png';
import type { Box } from '../../logic';
import { M, type Scene } from '../../scene';
import * as L from './lines';

const BOUNDS: Box = { minX: -6, maxX: 6, minZ: -2, maxZ: 2 };

export default {
  id: 'hallway',
  bounds: BOUNDS,

  build(room) {
    room.shell(BOUNDS, [{ wall: 'left', at: 0 }], ['#b9b4aa', '#b1aca2']);
    room.box(M.carpet, 10, 0.02, 1.6, 0.6, 0, 0.2);
    // elevator
    room.box(M.metal, 1.8, 2.4, 0.1, -2, 0, -1.98);
    room.box(M.trim, 0.04, 2.4, 0.12, -2, 0, -1.96);
    room.sign(1.4, 0.35, g => {
      g.fillStyle = '#d9443a'; g.fillRect(0, 0, 512, 128);
      g.fillStyle = '#fff'; g.font = 'bold 64px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('OUT OF ORDER', 256, 66);
    }, -2, 2.65, -1.97);
    // GPU vending machine
    room.box(M.black, 1.3, 2.2, 0.8, 2, 0, -1.55);
    room.box(M.screen, 0.8, 1.4, 0.02, 1.85, 0.6, -1.14);
    room.box(M.neon, 0.2, 0.5, 0.02, 2.48, 1.2, -1.14);
    room.solid(2, -1.55, 1.4, 0.9);
    // framed photo and the company logo
    room.sign(0.9, 1.1, g => {
      g.fillStyle = '#9a7552'; g.fillRect(0, 0, 512, 626);
      g.fillStyle = '#f3efe4'; g.fillRect(36, 36, 440, 554);
      g.fillStyle = '#1a1b20'; g.font = 'bold 44px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('EMPLOYEE', 256, 120); g.fillText('OF THE MONTH', 256, 172);
      g.fillStyle = '#76b900'; g.font = '900 96px "Arial Black",Impact,sans-serif'; g.fillText('KEVIN', 256, 420);
      g.fillStyle = '#6a6f78'; g.font = '32px system-ui,sans-serif'; g.fillText('(x12)', 256, 500);
    }, -4.4, 1.6, -1.97);
    room.sign(1.8, 1.2, logo, 4.6, 1.7, -1.97);
    room.plant(5.4, -1.4);
  },

  things: [
    { at: { x: 2, z: -1.55 }, label: 'Inspect vending machine', lines: L.VENDING },
    { at: { x: -2, z: -1.9 }, label: 'Press elevator button', lines: L.ELEVATOR },
    { at: { x: -4.4, z: -1.9 }, label: 'Look at photo', lines: L.EMPLOYEE },
  ],

  exits: [{ area: { minX: -6, maxX: -5.3, minZ: -0.8, maxZ: 0.8 }, to: 'office', at: { x: 9, z: -6.6 } }],
} satisfies Scene;
