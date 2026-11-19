// The engine's source rule moved into one pure function (js/engine/sources.js)
// that the step calls and the scene statement reads. This is the proof that
// the move changed nothing: every coordinate of every body after 500 steps of
// `binary-pair` and `circumbinary-planet-lab`, at the page's 60-frames-a-second
// step and seed 1, equals bit for bit the run recorded on the tree before the
// move (tests/fixtures/source-rule-identity.json, written by
// `node tests/barycentreRuns.js --write` there). Both scenes set the world's
// gravitational constant to 1, their own value. The world-construction golden
// is checked unchanged by its own e2e spec.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { positionsAfter, IDENTITY_SCENES } from './barycentreRuns.js';

const RECORDED = JSON.parse(
  readFileSync(
    new URL('./fixtures/source-rule-identity.json', import.meta.url),
    'utf8'
  )
);

describe('the source rule move changes no trajectory', () => {
  test.each(IDENTITY_SCENES)('%s after 500 steps, bit for bit', key => {
    const now = positionsAfter(key, RECORDED.steps, RECORDED.seed);
    const before = RECORDED.scenes[key];
    expect(now.length).toBe(before.length);
    now.forEach((b, i) => {
      expect(b.name).toBe(before[i].name);
      expect(b.kind).toBe(before[i].kind);
      expect(Object.is(Number(b.x), Number(before[i].x))).toBe(true);
      expect(Object.is(Number(b.y), Number(before[i].y))).toBe(true);
      expect(b.x).toBe(before[i].x);
      expect(b.y).toBe(before[i].y);
    });
  });
});
