// =============================================================================
// The image-measurement gate: thresholds, slices and the decision function
// (Prompt 178)
// -----------------------------------------------------------------------------
// tools/image-measure-gate.mjs holds the thresholds, the slices, the consumers
// and decide(). These cases pin each of them, so that a bound, a slice or a rule
// cannot move without a test saying so, and hold the document to the code. The
// measured results are held to the function further down.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  CHECKS,
  C_CONSEQUENCES,
  DISPLAY_RULE,
  SLICES,
  THRESHOLDS,
  VERDICTS,
  decide,
  problems,
  readResults,
  statusesOf,
} from '../tools/image-measure-gate.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const doc = readFileSync(path.join(ROOT, 'IMAGE_MEASUREMENT_GATE.md'), 'utf8');

const allPass = () =>
  Object.fromEntries(Object.keys(CHECKS).map(id => [id, { status: 'pass' }]));
const with_ = (id, status) => ({ ...allPass(), [id]: { status } });

describe('the committed thresholds (a change is a register row)', () => {
  test('the numbers of the prompt and of D-R10-35 item (3)', () => {
    expect(THRESHOLDS.route).toEqual({ requests: 0, maxKb: 0.2 });
    expect(THRESHOLDS.deferred).toEqual({ maxBytes: 25600, maxRequests: 3 });
    expect(THRESHOLDS.tier).toEqual({ firstVisitBytes: 0, idleBytes: 138331 });
    expect(THRESHOLDS.precision).toEqual({
      pointP95: 0.5,
      circleP95: 0.02,
      pathPoint: 0.5,
      pathCircle: 0.02,
      captureRadius: 3,
      points: 300,
      circles: 150,
      minRadius: 15,
    });
    expect(THRESHOLDS.paths.announcementsPerCommit).toBe(1);
    expect(THRESHOLDS.paths.strayEvents).toBe(0);
    expect(THRESHOLDS.paths.kinds).toEqual([
      'point',
      'segment',
      'circle',
      'polygon',
      'count',
      'reference-pair',
    ]);
    expect(THRESHOLDS.interaction).toEqual({
      cpuThrottle: 4,
      viewport: [375, 812],
      frameSide: 1024,
      marks: 50,
      repeats: 20,
      keyMs: 15,
      placeMs: 28,
      changeMs: 90,
      undoMs: 104,
      paintMs: 100,
      frameMs: 500,
    });
    expect(THRESHOLDS.tier2048).toEqual({
      side: 2048,
      totalMs: 2000,
      maxDecodedBytes: 67108864,
    });
  });

  test('the interaction budget is the Observatory bench mobile budget', () => {
    const b = JSON.parse(
      readFileSync(path.join(ROOT, 'tools', 'observatory-budgets.json'), 'utf8')
    ).profiles.mobile;
    expect(THRESHOLDS.interaction.keyMs).toBe(b.keyMs);
    expect(THRESHOLDS.interaction.placeMs).toBe(b.dragMs);
    expect(THRESHOLDS.interaction.changeMs).toBe(b.changeMs);
    expect(THRESHOLDS.interaction.undoMs).toBe(b.undoMs);
    expect(THRESHOLDS.interaction.paintMs).toBe(b.keyPaintMs);
    expect(THRESHOLDS.interaction.frameMs).toBe(b.openMs);
  });

  test('the 2,048-pixel bound is 157s decoded-image bound', async () => {
    const { LIMITS } = await import('../js/dataKinds/limits.js');
    expect(THRESHOLDS.tier2048.maxDecodedBytes).toBe(LIMITS.maxDecodedBytes);
    expect(THRESHOLDS.interaction.frameSide).toBe(LIMITS.maxDisplaySide);
  });

  test('the byte bounds are the checkpoint allocation', () => {
    expect(THRESHOLDS.deferred.maxBytes).toBe(25 * 1024);
  });
});

describe('decide()', () => {
  test('every check passing is A', () => {
    const d = decide(allPass());
    expect(d.verdict).toBe('A');
    expect(d.failing).toEqual([]);
    expect(d.slice).toBeNull();
  });

  test('nothing measured is C: not measured is never a pass', () => {
    expect(decide({}).verdict).toBe('C');
    expect(decide(undefined).verdict).toBe('C');
    expect(statusesOf({ 'T1.route': { status: 'pass' } })['T3.keyboard']).toBe(
      'not-measured'
    );
  });

  test('an unknown status counts as not measured', () => {
    expect(statusesOf({ 'T1.route': { status: 'ok' } })['T1.route']).toBe(
      'not-measured'
    );
  });

  test.each(Object.entries(CHECKS).filter(([, g]) => g === 'core'))(
    'core check %s failing is C',
    id => {
      expect(decide(with_(id, 'fail')).verdict).toBe('C');
      expect(decide(with_(id, 'not-measured')).verdict).toBe('C');
    }
  );

  test.each(Object.entries(CHECKS).filter(([, g]) => g === 'refine'))(
    'refine check %s failing is B1',
    id => {
      expect(decide(with_(id, 'fail')).verdict).toBe('B1');
      expect(decide(with_(id, 'fail')).slice.name).toMatch(
        /without refinement/
      );
    }
  );

  test.each(Object.entries(CHECKS).filter(([, g]) => g === 'sequence'))(
    'sequence check %s failing is B2',
    id => {
      expect(decide(with_(id, 'fail')).verdict).toBe('B2');
    }
  );

  test.each(Object.entries(CHECKS).filter(([, g]) => g === 'tier'))(
    'tier check %s failing is B3',
    id => {
      expect(decide(with_(id, 'fail')).verdict).toBe('B3');
    }
  );

  test('the first failing group decides', () => {
    const r = {
      ...allPass(),
      'T7.time': { status: 'fail' },
      'T3.sequence': { status: 'fail' },
    };
    expect(decide(r).verdict).toBe('B2');
    expect(decide({ ...r, 'T2.point': { status: 'fail' } }).verdict).toBe('B1');
    expect(decide({ ...r, 'T5.undo': { status: 'fail' } }).verdict).toBe('C');
  });

  test('the checks, groups and verdicts are the committed set', () => {
    expect(Object.keys(CHECKS)).toHaveLength(21);
    expect(VERDICTS).toEqual(['A', 'B1', 'B2', 'B3', 'C']);
    expect(Object.keys(SLICES)).toEqual(['B1', 'B2', 'B3']);
  });
});

describe('the slices name their consumers before the prototype', () => {
  test('B1 serves 191, 193, 194 and 195 and not 186', () => {
    const s = SLICES.B1.serves.join(' ');
    for (const n of ['191', '193', '194', '195']) expect(s).toContain(n);
    expect(s).not.toContain('186');
    expect(SLICES.B1.doesNot.join(' ')).toContain('186');
  });

  test('B2 adds 186 and not the sequence navigator', () => {
    expect(SLICES.B2.serves.join(' ')).toContain('186');
    expect(SLICES.B2.doesNot.join(' ')).toMatch(/sequence navigator/);
  });

  test('B3 serves every consumer under the display rule', () => {
    expect(SLICES.B3.serves.join(' ')).toMatch(/every consumer/);
    expect(DISPLAY_RULE).toMatch(/toFull/);
    expect(DISPLAY_RULE).toMatch(/downsampleMean/);
  });
});

describe('the document says what the code says', () => {
  test('it names every check and every slice', () => {
    for (const id of Object.keys(CHECKS)) expect(doc).toContain(`\`${id}\``);
    for (const s of Object.keys(SLICES)) expect(doc).toContain(`**${s}**`);
  });

  test('its numbers are the thresholds', () => {
    for (const text of [
      '0.2 KB',
      '25,600 B (25.0 KiB)',
      '138,331 B',
      '0.5 pixel',
      '2%',
      '3 pixels',
      '300 Gaussian',
      '150 discs',
      '15 pixels',
      '15 ms',
      '28 ms',
      '90 ms',
      '104 ms',
      '100 ms',
      '500 ms',
      '2,000 ms',
      '67,108,864 B',
      '20 repeats',
      '50 marks',
    ])
      expect(doc).toContain(text);
  });

  test("every prompt of Appendix C's C list is in the document", () => {
    for (const [prompt] of C_CONSEQUENCES) expect(doc).toContain(prompt);
  });

  test('the record, when there is one, follows the function', () => {
    expect(problems(readResults())).toEqual([]);
  });
});
