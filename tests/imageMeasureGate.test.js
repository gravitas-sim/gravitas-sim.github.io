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
import process from 'node:process';
import { webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
import { judge } from '../tools/image-measure-gate/judge.mjs';
import { prototypeDigest } from '../tools/image-measure-gate/digest.mjs';
import {
  discFrame,
  makeRandom,
  moonSequence,
  pointField,
} from '../tools/image-measure-gate/frames.mjs';
import {
  refineCircle,
  refinePoint,
  createStore,
  emptyState,
  place,
  nudge,
  edit,
  remove,
  refine,
} from '../tools/image-measure-gate/marks.js';
import {
  replay,
  writeRecord,
  ReplayError,
} from '../tools/image-measure-gate/record.js';
import { nudgeScale as panelNudge } from '../tools/image-measure-gate/panel.js';
import { nudgeScale } from '../js/shortcuts.js';
import { validateArtifact } from '../js/platform/artifact.js';

// The record's digest is WebCrypto's; the jsdom realm has neither it nor TextEncoder.
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

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

// ---- the recorded measurement is the function of its evidence ---------------------

const results = readResults();

describe('the record (tools/image-measure-gate.json)', () => {
  test('it exists, and its statuses are judge() of its own evidence', () => {
    expect(results).not.toBeNull();
    expect(results.thresholdsCommit).toMatch(/^[0-9a-f]{40}$/);
    const derived = judge(results.evidence);
    expect(Object.keys(derived).sort()).toEqual(Object.keys(CHECKS).sort());
    for (const id of Object.keys(CHECKS)) {
      expect(results.checks[id].status).toBe(derived[id].status);
      expect(results.checks[id].why).toBe(derived[id].why);
    }
    expect(results.verdict).toBe(decide(results.checks).verdict);
    expect(results.notPassing).toEqual(decide(results.checks).failing);
  });

  test('the prototype is the one that was measured', () => {
    expect(results.prototypeDigest).toBe(prototypeDigest());
  });

  test('the lunar frame is reported as not measured and is not read by the verdict', () => {
    expect(results.authentic.lunar.status).toBe('not-measured');
    const without = { ...results.checks };
    expect(decide(without).verdict).toBe(results.verdict);
  });

  test('no check is a pass without a measurement behind it', () => {
    for (const c of Object.values(results.checks))
      if (c.status === 'pass') expect(c.why).not.toMatch(/^no /);
    expect(judge({})['T1.deferred'].status).toBe('not-measured');
    expect(decide(judge({})).verdict).toBe('C');
  });

  test('the thresholds judged against are the committed ones: a worse number fails', () => {
    const worse = JSON.parse(JSON.stringify(results.evidence));
    worse.core.point.p95 = THRESHOLDS.precision.pointP95 + 0.01;
    expect(judge(worse)['T2.point'].status).toBe('fail');
    const heavy = JSON.parse(JSON.stringify(results.evidence));
    heavy.bytes.deferredGzipBytes = THRESHOLDS.deferred.maxBytes + 1;
    expect(judge(heavy)['T1.deferred'].status).toBe('fail');
    const slow = JSON.parse(JSON.stringify(results.evidence));
    slow.browser.interaction.valid = false;
    expect(judge(slow)['T6.interaction'].status).toBe('fail');
  });
});

// ---- the prototype is excluded from every route, build and precache ----------------

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

describe('the prototype is kept out of the product', () => {
  test('nothing under js/, no page, no build file imports tools/image-measure-gate', () => {
    const files = [
      ...walk(path.join(ROOT, 'js')),
      ...readdirSync(ROOT)
        .filter(f => /\.(html|js|mjs)$/.test(f))
        .map(f => path.join(ROOT, f)),
      ...readdirSync(path.join(ROOT, 'tools'))
        .filter(f => /^(build|sw|route|bundle|data-budget)/.test(f))
        .map(f => path.join(ROOT, 'tools', f)),
    ];
    const hits = files.filter(f =>
      readFileSync(f, 'utf8').includes('image-measure-gate')
    );
    expect(hits.map(f => path.relative(ROOT, f))).toEqual([]);
  });

  test('the service worker precaches none of it', async () => {
    const prev = process.cwd();
    process.chdir(ROOT);
    try {
      const { buildManifest } =
        await import('../tools/build-service-worker.mjs');
      const m = await buildManifest();
      expect(m.paths.filter(p => p.startsWith('tools/'))).toEqual([]);
      expect(m.paths.some(p => p.includes('image-measure-gate'))).toBe(false);
    } finally {
      process.chdir(prev);
    }
  });

  test("the panel's nudge sizes are the contract's (js/shortcuts.js)", () => {
    for (const altKey of [false, true])
      for (const shiftKey of [false, true])
        expect(panelNudge({ altKey, shiftKey })).toBe(
          nudgeScale({ altKey, shiftKey })
        );
  });
});

// ---- the prototype, small and live (the full ensembles are in the record) ---------

describe('the prototype on small ensembles', () => {
  test('point sources: refined within the bound, none refused', () => {
    const f = pointField({ seed: 5, n: 25, size: 512 });
    const errors = f.truth.map(s => {
      const r = refinePoint(f, s.click.x, s.click.y);
      expect(r.ok).toBe(true);
      return Math.hypot(r.x - s.x, r.y - s.y);
    });
    expect(Math.max(...errors)).toBeLessThanOrEqual(
      THRESHOLDS.precision.pointP95
    );
  }, 60000);

  test('discs: radius within 2% where refined', () => {
    let refined = 0;
    for (let i = 0; i < 6; i++) {
      const f = discFrame({ seed: 40 + i, bright: i < 4 });
      const c = f.click;
      const r = refineCircle(f, [c.centre.x, c.centre.y], [c.limb.x, c.limb.y]);
      if (!r.ok) continue;
      refined++;
      expect(Math.abs(r.r - f.truth.r) / f.truth.r).toBeLessThanOrEqual(
        THRESHOLDS.precision.circleP95
      );
    }
    expect(refined).toBeGreaterThanOrEqual(4);
  }, 120000);

  test('a faint source, a click far from any source and a frame edge are refused, not guessed', () => {
    const f = pointField({ seed: 6, n: 4, size: 512 });
    expect(refinePoint(f, 5, 5).reason).toBe('edge');
    expect(refinePoint(f, 11.3, 400.2).reason).toBe('edge');
    const rnd = makeRandom(1);
    const blank = {
      ...f,
      data: Float64Array.from(f.data, () => 200 + 9.7 * rnd.gauss()),
    };
    const s = f.truth[0];
    expect(refinePoint(blank, s.click.x, s.click.y).ok).toBe(false);
  });

  test('undo restores exact states and refinement is deterministic', () => {
    const f = discFrame({ seed: 77, bright: true });
    const store = createStore(emptyState());
    const seen = [JSON.stringify(store.state)];
    let s = store.state;
    for (const next of [
      st => place(st, { kind: 'point', frame: 0, tag: 'a', pts: [[100, 100]] }),
      st =>
        place(st, {
          kind: 'circle',
          frame: 0,
          tag: '',
          pts: [
            [f.truth.x + 1, f.truth.y - 1],
            [f.truth.x + f.truth.r, f.truth.y],
          ],
        }),
      st => nudge(st, 'm1', 0, 2, -3),
      st => edit(st, 'm1', { tag: 'z', x: 150 }),
      st => refine(st, 'm2', [f]).state,
      st => remove(st, 'm1'),
    ]) {
      s = next(s);
      store.apply(s);
      store.seal();
      seen.push(JSON.stringify(store.state));
    }
    for (let i = seen.length - 2; i >= 0; i--) {
      store.undo();
      expect(JSON.stringify(store.state)).toBe(seen[i]);
    }
    const c = f.click;
    const a = refineCircle(f, [c.centre.x, c.centre.y], [c.limb.x, c.limb.y]);
    const b = refineCircle(f, [c.centre.x, c.centre.y], [c.limb.x, c.limb.y]);
    expect(Object.is(a.r, b.r) && Object.is(a.x, b.x)).toBe(true);
  }, 60000);

  test('a record validates, round-trips through JSON, replays bit for bit and refuses a changed image', async () => {
    const seq = moonSequence({ seed: 3, frames: 2 });
    const R = 220;
    const d = seq.frames[0].truth.disc;
    let s = place(emptyState(), {
      kind: 'reference-pair',
      frame: 0,
      tag: 'diameter',
      pts: [
        [d.x - R + 1, d.y],
        [d.x + R - 1, d.y + 1],
      ],
      length: seq.knownLength,
    });
    s = place(s, {
      kind: 'circle',
      frame: 0,
      tag: 'limb',
      pts: [
        [d.x + 1, d.y - 1],
        [d.x + R, d.y],
      ],
    });
    s = refine(s, 'm2', seq.frames).state;
    const record = await writeRecord({
      id: 't',
      setId: seq.id,
      frames: seq.frames,
      sidecar: { knownLength: seq.knownLength },
      state: s,
    });
    expect(validateArtifact(record)).toEqual([]);
    const back = JSON.parse(JSON.stringify(record));
    const r = await replay(back, seq.frames);
    expect(r.identical).toBe(true);
    expect(r.state.marks.map(m => m.pts)).toEqual(s.marks.map(m => m.pts));
    const changed = {
      ...seq.frames[0],
      data: Float64Array.from(seq.frames[0].data),
    };
    changed.data[99] += 1;
    await expect(replay(back, [changed, seq.frames[1]])).rejects.toBeInstanceOf(
      ReplayError
    );
  }, 120000);
});
