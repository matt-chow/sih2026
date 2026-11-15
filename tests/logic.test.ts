import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEXT, resolveCircle, placeRect, followPath, type State } from '../src/logic.ts';

test('FSM visits every state once and loops back for replay', () => {
  const seen: State[] = [];
  let s: State = 'START';
  for (let i = 0; i < 5; i++) { seen.push(s); s = NEXT[s]; }
  assert.equal(new Set(seen).size, 5);
  assert.equal(seen.at(-1), 'ENDING');
  assert.equal(NEXT.ENDING, 'EXPLORATION');
});

test('circle is pushed out of a box and kept in bounds', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const box = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
  const p = { x: -0.2, z: 1 };
  resolveCircle(p, 0.5, [box], bounds);
  assert.ok(Math.abs(p.x - -0.5) < 1e-9 && p.z === 1);
  const inside = { x: 1.9, z: 1 };
  resolveCircle(inside, 0.5, [box], bounds);
  assert.equal(inside.x, 2.5);
  const out = { x: 50, z: -50 };
  resolveCircle(out, 0.5, [], bounds);
  assert.deepEqual(out, { x: 9.5, z: -9.5 });
});

test('placeRect stays in bounds and never overlaps the avoided rect', () => {
  const bounds = { x: 0, y: 0, w: 800, h: 600 };
  const alice = { x: 300, y: 250, w: 200, h: 100 };
  for (let i = 0; i < 2000; i++) {
    const r = { x: Math.random() * 1200 - 200, y: Math.random() * 900 - 150, w: 160, h: 60 };
    const p = placeRect(r, bounds, alice);
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + r.w <= 800 && p.y + r.h <= 600, 'in bounds');
    const hit = p.x < alice.x + alice.w && p.x + r.w > alice.x && p.y < alice.y + alice.h && p.y + r.h > alice.y;
    assert.ok(!hit, 'no overlap');
  }
});

test('followPath reaches the end and reports completion', () => {
  const path = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 4 }];
  const p = { x: 0, z: 0 };
  let i = followPath(p, path, 0, 5);
  assert.equal(i, 1);
  assert.deepEqual(p, { x: 3, z: 2 });
  i = followPath(p, path, i, 100);
  assert.equal(i, 2);
  assert.deepEqual(p, { x: 3, z: 4 });
});
