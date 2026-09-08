import { describe, test, expect } from '@jest/globals';
import {
  BASELINE,
  C_TOLERANCE,
  DIRECTIONS,
  comparePaths,
  describePath,
  initialConditions,
  sameAccessibleRegion,
  velocityFor,
  windowFor,
} from '../js/experiments/neckPair.js';
import {
  CONFIGURATIONS,
  CONTROLS,
  SUPPORTED_INTEGRATORS,
  alternateIntegrator,
  controlDiffers,
  controlLabel,
  refinementReport,
  sameInterval,
  stepStatistics,
} from '../js/experiments/chaosPair.js';
import {
  jacobiConstant,
  lagrangePoints,
  massRatio,
  regimeFor,
} from '../js/cr3bp.js';
import { fromChaosPair, fromNeckPair } from '../js/notebook/capture.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';

// These panels' prose is in the deferred half of the catalogue, which nothing
// loads in a unit test.
registerMessages('en', EN_DEFERRED);

/** The laboratory's own mass parameter, so the checks are about its numbers. */
const MU = massRatio(1, 0.03);

/** A tracer state at the activity's start, at a given direction. */
const stateFor = (deg, speed = BASELINE.speed) => ({
  x: BASELINE.position.x,
  y: BASELINE.position.y,
  ...velocityFor(deg, speed),
});

describe('the neck pair holds the accessible region fixed', () => {
  test('the two directions have the same speed', () => {
    const a = velocityFor(DIRECTIONS.a);
    const b = velocityFor(DIRECTIONS.b);
    expect(Math.hypot(a.vx, a.vy)).toBeCloseTo(BASELINE.speed, 12);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(BASELINE.speed, 12);
    expect(DIRECTIONS.a).not.toBe(DIRECTIONS.b);
  });

  test('and therefore the same Jacobi constant, exactly', () => {
    const ca = jacobiConstant(stateFor(DIRECTIONS.a), MU);
    const cb = jacobiConstant(stateFor(DIRECTIONS.b), MU);
    // Not "close to": C is 2*Omega(x, y) minus the speed squared, and neither
    // term knows the direction. If this ever stops being exact, the activity's
    // premise has gone.
    expect(ca).toBe(cb);
  });

  test('the chosen speed opens the L1 neck and leaves L2 shut', () => {
    const C = jacobiConstant(stateFor(DIRECTIONS.a), MU);
    const regime = regimeFor(C, MU);
    expect(regime.l1Open).toBe(true);
    expect(regime.l2Open).toBe(false);
    // And with room at both ends, so the round trip through the world's units
    // cannot push it over either threshold.
    const points = Object.fromEntries(
      lagrangePoints(MU).map(p => [p.name, p.C])
    );
    expect(points.L1 - C).toBeGreaterThan(0.01);
    expect(C - points.L2).toBeGreaterThan(0.005);
  });

  test('the control passes for the pair and names what would break it', () => {
    const a = initialConditions(stateFor(DIRECTIONS.a), MU, DIRECTIONS.a);
    const b = initialConditions(stateFor(DIRECTIONS.b), MU, DIRECTIONS.b);
    expect(sameAccessibleRegion(a, b)).toMatchObject({ ok: true });

    // A different speed is a different accessible region, and is refused.
    const slower = initialConditions(
      stateFor(DIRECTIONS.b, 0.5),
      MU,
      DIRECTIONS.b
    );
    expect(sameAccessibleRegion(a, slower)).toMatchObject({
      ok: false,
      reason: 'constantsDiffer',
    });
    // So is a speed low enough that the neck never opened...
    const sealed = initialConditions(
      stateFor(DIRECTIONS.a, 0.2),
      MU,
      DIRECTIONS.a
    );
    expect(sameAccessibleRegion(sealed, sealed)).toMatchObject({
      ok: false,
      reason: 'neckClosed',
    });
    // ...and one high enough that the exterior opened too.
    const fast = initialConditions(
      stateFor(DIRECTIONS.a, 0.62),
      MU,
      DIRECTIONS.a
    );
    expect(sameAccessibleRegion(fast, fast)).toMatchObject({
      ok: false,
      reason: 'exteriorOpen',
    });
    expect(sameAccessibleRegion(a, null)).toMatchObject({
      ok: false,
      reason: 'missingArm',
    });
  });

  test('the tolerance is on the round trip, not on the physics', () => {
    const a = initialConditions(stateFor(DIRECTIONS.a), MU, DIRECTIONS.a);
    const nudged = { ...a, C: a.C * (1 + C_TOLERANCE / 10) };
    expect(sameAccessibleRegion(a, nudged).ok).toBe(true);
    const worse = { ...a, C: a.C * (1 + C_TOLERANCE * 10) };
    expect(sameAccessibleRegion(a, worse).ok).toBe(false);
  });

  test('the window is the pair’s own period, in the units the engine uses', () => {
    const system = {
      primary: { mass: 1000 },
      secondary: { mass: 30 },
      separation: 800,
    };
    const one = windowFor(system, 2, 1);
    const n = Math.sqrt((2 * 1030) / 800 ** 3);
    expect(one).toBeCloseTo((2 * Math.PI) / n, 6);
    expect(windowFor(system, 2, 2)).toBeCloseTo(one * 2, 6);
    expect(windowFor(null, 2)).toBeNull();
  });
});

describe('what a path did, and what that licenses', () => {
  const l1 = lagrangePoints(MU).find(p => p.name === 'L1');
  /** A path that goes out past L1 and comes back. */
  const crossing = [
    { t: 0, x: 0.6, y: 0 },
    { t: 10, x: 0.7, y: 0.1 },
    { t: 20, x: l1.x + 0.01, y: 0 },
    { t: 30, x: 0.7, y: -0.1 },
    { t: 40, x: 0.6, y: 0 },
  ];
  /** One that never gets near it. */
  const staying = [
    { t: 0, x: 0.6, y: 0 },
    { t: 10, x: 0.3, y: 0.2 },
    { t: 20, x: -0.2, y: 0.3 },
    { t: 30, x: 0.1, y: -0.3 },
    { t: 40, x: 0.5, y: 0 },
  ];

  test('a crossing is reported with when and for how long', () => {
    const p = describePath(crossing, MU, { asked: 40 });
    expect(p.crossed).toBe(true);
    expect(p.firstCrossing).toBe(20);
    expect(p.timeBeyond).toBe(10);
    expect(p.closestToL1).toBeCloseTo(0.01, 6);
    expect(p.complete).toBe(true);
  });

  test('not crossing is reported as not crossing, with how close it came', () => {
    const p = describePath(staying, MU, { asked: 40 });
    expect(p.crossed).toBe(false);
    expect(p.firstCrossing).toBeNull();
    expect(p.timeBeyond).toBe(0);
    expect(p.closestToL1).toBeGreaterThan(0.1);
  });

  test('an arm that stopped early is not an arm that did not cross', () => {
    const p = describePath(staying.slice(0, 3), MU, { asked: 40 });
    expect(p.crossed).toBe(false);
    // The distinction the whole activity turns on.
    expect(p.complete).toBe(false);
    expect(p.span).toBe(20);
    expect(p.asked).toBe(40);
  });

  test('the comparison names the conclusion the evidence supports', () => {
    const arm = (deg, path) => ({
      conditions: initialConditions(stateFor(deg), MU, deg),
      path: describePath(path, MU, { asked: 40 }),
    });
    const verdict = comparePaths(
      arm(DIRECTIONS.a, crossing),
      arm(DIRECTIONS.b, staying)
    );
    expect(verdict.region.ok).toBe(true);
    expect(verdict.crossedA).toBe(true);
    expect(verdict.crossedB).toBe(false);
    expect(verdict.pathsDiffer).toBe(true);
    expect(verdict.bothComplete).toBe(true);
    expect(verdict.conclusion).toBe('sameRegionDifferentPaths');
    expect(verdict.speedMismatch).toBeLessThan(1e-12);
  });

  test('a short arm downgrades the conclusion rather than the finding', () => {
    const arm = (deg, path, asked) => ({
      conditions: initialConditions(stateFor(deg), MU, deg),
      path: describePath(path, MU, { asked }),
    });
    const verdict = comparePaths(
      arm(DIRECTIONS.a, crossing, 40),
      arm(DIRECTIONS.b, staying.slice(0, 3), 40)
    );
    expect(verdict.conclusion).toBe('windowIncomplete');
    expect(verdict.bothComplete).toBe(false);
  });

  test('a failed control outranks everything below it', () => {
    const good = {
      conditions: initialConditions(stateFor(DIRECTIONS.a), MU, DIRECTIONS.a),
      path: describePath(crossing, MU, { asked: 40 }),
    };
    const slow = {
      conditions: initialConditions(
        stateFor(DIRECTIONS.b, 0.5),
        MU,
        DIRECTIONS.b
      ),
      path: describePath(staying, MU, { asked: 40 }),
    };
    expect(comparePaths(good, slow).conclusion).toBe('notControlled');
  });

  test('two similar paths are allowed to be similar', () => {
    const arm = deg => ({
      conditions: initialConditions(stateFor(deg), MU, deg),
      path: describePath(staying, MU, { asked: 40 }),
    });
    expect(comparePaths(arm(DIRECTIONS.a), arm(DIRECTIONS.b)).conclusion).toBe(
      'sameRegionSimilarPaths'
    );
  });

  test('nothing here has a vocabulary for stability', () => {
    const text = JSON.stringify(
      comparePaths(
        {
          conditions: initialConditions(
            stateFor(DIRECTIONS.a),
            MU,
            DIRECTIONS.a
          ),
          path: describePath(crossing, MU, { asked: 40 }),
        },
        {
          conditions: initialConditions(
            stateFor(DIRECTIONS.b),
            MU,
            DIRECTIONS.b
          ),
          path: describePath(staying, MU, { asked: 40 }),
        }
      )
    );
    expect(text).not.toMatch(/stab/i);
  });
});

describe('the chaos pair measures rather than assumes', () => {
  test('the configurations keep the two-body counterexample', () => {
    expect(CONFIGURATIONS.binary.scenario).toBe('Binary Pair');
    expect(CONFIGURATIONS.binary.expect).toBe('linear');
    expect(CONFIGURATIONS.triple.expect).toBe('exponential');
    // The same nudge in both, which is what makes them comparable.
    expect(CONFIGURATIONS.binary.km).toBe(CONFIGURATIONS.triple.km);
  });

  test('step statistics come from the steps, not from the settings', () => {
    const s = stepStatistics([0.1, 0.2, 0.3]);
    expect(s.steps).toBe(3);
    expect(s.span).toBeCloseTo(0.6, 12);
    expect(s.mean).toBeCloseTo(0.2, 12);
    expect(s.min).toBe(0.1);
    expect(s.max).toBe(0.3);
    expect(stepStatistics([])).toMatchObject({ steps: 0, mean: null });
    expect(stepStatistics([0, -1, NaN])).toMatchObject({ steps: 0 });
  });

  test('a control that changed nothing is not a control', () => {
    const base = { mean: 0.08333, integrator: 'Symplectic Euler' };
    const same = { mean: 0.08333, integrator: 'Symplectic Euler' };
    expect(controlDiffers(base, same)).toMatchObject({
      differs: false,
      reason: 'nothingChanged',
    });
    const halved = { mean: 0.041665, integrator: 'Symplectic Euler' };
    expect(controlDiffers(base, halved)).toMatchObject({
      stepChanged: true,
      schemeChanged: false,
      differs: true,
    });
    expect(controlDiffers(base, halved).stepChange).toBeCloseTo(-0.5, 6);
    const verlet = { mean: 0.08333, integrator: 'Velocity Verlet' };
    expect(controlDiffers(base, verlet)).toMatchObject({
      stepChanged: false,
      schemeChanged: true,
      differs: true,
    });
  });

  test('the alternate integrator is always a real change, and supported', () => {
    for (const from of SUPPORTED_INTEGRATORS) {
      const to = alternateIntegrator(from);
      if (to === null) continue;
      expect(to).not.toBe(from);
      expect(SUPPORTED_INTEGRATORS).toContain(to);
    }
    expect(CONTROLS.map(c => c.id)).toEqual(['finerStep', 'altIntegrator']);
  });

  test('a control is labelled with the step it took', () => {
    expect(controlLabel({ integrator: 'RK4', mean: 0.0416, steps: 960 })).toBe(
      'RK4, step 0.0416 x960'
    );
  });

  test('two agreeing repeats that changed nothing are unresolved', () => {
    const same = { differs: false, tau: 8.2, behaviour: 'exponential' };
    const report = refinementReport([
      { ...same, label: 'a' },
      { ...same, label: 'b' },
    ]);
    expect(report.resolved).toBe(false);
    expect(report.unresolved).toBe(true);
    expect(report.reason).toBe('controlsIneffective');
    expect(report.effective).toBe(0);
  });

  test('two effective repeats that agree are resolved', () => {
    const report = refinementReport([
      { label: 'a', differs: true, tau: 8.265, behaviour: 'exponential' },
      { label: 'b', differs: true, tau: 8.262, behaviour: 'exponential' },
    ]);
    expect(report.resolved).toBe(true);
    expect(report.unresolved).toBe(false);
    expect(report.effective).toBe(2);
  });

  test('repeats that disagree are UNRESOLVED, not averaged', () => {
    const moved = refinementReport([
      { label: 'a', differs: true, tau: 8, behaviour: 'exponential' },
      { label: 'b', differs: true, tau: 24, behaviour: 'exponential' },
    ]);
    expect(moved.resolved).toBe(false);
    expect(moved.unresolved).toBe(true);
    expect(moved.reason).toBe('timescale-moved');

    const changed = refinementReport([
      { label: 'a', differs: true, tau: 8, behaviour: 'exponential' },
      { label: 'b', differs: true, tau: 8.1, behaviour: 'linear' },
    ]);
    expect(changed.resolved).toBe(false);
    expect(changed.reason).toBe('behaviour-changed');
  });

  test('one repeat is not refinement', () => {
    const report = refinementReport([
      { label: 'a', differs: true, tau: 8, behaviour: 'exponential' },
    ]);
    expect(report.resolved).toBe(false);
    expect(report.reason).toBe('need-two-estimates');
  });

  test('runs of different lengths are named as such', () => {
    expect(sameInterval({ span: 40 }, { span: 40 })).toMatchObject({
      ok: true,
    });
    expect(sameInterval({ span: 40 }, { span: 20 })).toMatchObject({
      ok: false,
      reason: 'intervalsDiffer',
      overlap: 20,
    });
    expect(sameInterval(null, { span: 40 })).toMatchObject({
      ok: false,
      reason: 'missingRun',
    });
  });
});

describe('what these two write into the notebook', () => {
  const arm = (over = {}) => ({
    label: 'A',
    span: 40,
    asked: 40,
    samples: 480,
    steps: 480,
    mean: 0.08333,
    min: 0.08333,
    max: 0.08333,
    integrator: 'Symplectic Euler',
    maxTimestep: 0,
    simSpeed: 1,
    ...over,
  });
  const chaos = {
    configuration: 'triple',
    scenario: 'Three-Body Sensitivity Lab',
    a: arm(),
    b: arm({ label: 'B' }),
    interval: sameInterval(arm(), arm()),
    perturbation: { bodyName: 'Alpha', axis: 'x', km: 1500 },
    verdict: {
      behaviour: 'exponential',
      tau: 8.2645,
      r2: 0.991,
      efolds: 3.4,
      growth: 231,
      window: { from: 4.3, to: 30.2 },
    },
    series: [
      { t: 0, d: 0.001 },
      { t: 40, d: 0.2 },
    ],
    controls: [],
    refinement: refinementReport([]),
  };

  test('the chaos entry keeps the measured step beside the rate', () => {
    const entry = fromChaosPair({ report: chaos });
    const labels = entry.snapshot.quantities.map(q => q.label);
    expect(labels).toContain('Measured integration step');
    expect(labels).toContain('e-folding time');
    const step = entry.snapshot.quantities.find(
      q => q.label === 'Measured integration step'
    );
    expect(step.value).toBeCloseTo(0.08333, 6);
    expect(step.note).toMatch(/actually took/i);
  });

  test('an unresolved refinement is a flag and a limitation, not a footnote', () => {
    const entry = fromChaosPair({ report: chaos });
    expect(entry.snapshot.provenance.flags).toContain('unresolved');
    expect(entry.prose.limitations).toMatch(/UNRESOLVED/);
  });

  test('a resolved one is not flagged', () => {
    const resolved = refinementReport([
      { label: 'a', differs: true, tau: 8.265, behaviour: 'exponential' },
      { label: 'b', differs: true, tau: 8.262, behaviour: 'exponential' },
    ]);
    const entry = fromChaosPair({
      report: { ...chaos, refinement: resolved },
    });
    expect(entry.snapshot.provenance.flags).not.toContain('unresolved');
  });

  test('the two-body counterexample is recorded as a result', () => {
    const entry = fromChaosPair({
      report: {
        ...chaos,
        configuration: 'binary',
        verdict: { behaviour: 'linear', linearR2: 0.994 },
      },
    });
    expect(entry.title).toMatch(/two-body control/i);
    expect(entry.prose.evidence).toMatch(/proportion to time/i);
    expect(entry.prose.evidence).toMatch(/not chaos/i);
  });

  test('the fitted interval is stated as a limitation, and so is the estimate', () => {
    const entry = fromChaosPair({ report: chaos });
    expect(entry.prose.limitations).toMatch(/4\.3/);
    expect(entry.prose.limitations).toMatch(/Lyapunov exponent/);
  });

  test('a prediction is kept whether or not it was right', () => {
    const entry = fromChaosPair({
      report: chaos,
      prediction: 'I said it would halve',
    });
    expect(entry.prose.claim).toMatch(/I said it would halve/);
  });

  const neckArm = (deg, path) => ({
    conditions: initialConditions(stateFor(deg), MU, deg),
    path,
    samples: [
      { t: 0, x: 0.6, y: 0 },
      { t: 20, x: 0.5, y: 0.2 },
    ],
  });
  const neck = {
    scenario: 'Lagrange Point Lab',
    periods: 2,
    span: 6265,
    held: { integrator: 'Velocity Verlet', maxTimestep: 0.3, simSpeed: 30 },
    a: neckArm(DIRECTIONS.a, {
      crossed: true,
      firstCrossing: 360,
      closestToL1: 0.008,
      complete: true,
    }),
    b: neckArm(DIRECTIONS.b, {
      crossed: false,
      firstCrossing: null,
      closestToL1: 0.172,
      complete: true,
    }),
  };

  test('the neck entry records both constants and both paths', () => {
    const entry = fromNeckPair({
      report: { ...neck, comparison: comparePaths(neck.a, neck.b) },
    });
    const labels = entry.snapshot.quantities.map(q => q.label);
    expect(labels).toContain('Jacobi constant, direction A');
    expect(labels).toContain('Jacobi constant, direction B');
    expect(entry.snapshot.figure.series).toHaveLength(2);
    for (const series of entry.snapshot.figure.series) {
      expect(series.style).toBe('points');
    }
  });

  test('it never turns "did not cross" into "cannot cross"', () => {
    const entry = fromNeckPair({
      report: { ...neck, comparison: comparePaths(neck.a, neck.b) },
    });
    expect(entry.prose.evidence).toMatch(/did not cross the L1 neck/);
    expect(entry.prose.limitations).toMatch(/is not "can never cross"/);
    expect(entry.prose.limitations).not.toMatch(/can never cross the/);
  });

  test('it says the activity is not about stability', () => {
    const entry = fromNeckPair({
      report: { ...neck, comparison: comparePaths(neck.a, neck.b) },
    });
    expect(entry.prose.limitations).toMatch(/Nothing here is about stability/);
  });

  test('a failed control is flagged before anything else is read', () => {
    const slow = neckArm(DIRECTIONS.b, neck.b.path);
    slow.conditions = initialConditions(
      stateFor(DIRECTIONS.b, 0.5),
      MU,
      DIRECTIONS.b
    );
    const entry = fromNeckPair({
      report: { ...neck, b: slow, comparison: comparePaths(neck.a, slow) },
    });
    expect(entry.snapshot.provenance.flags).toContain('not-controlled');
    expect(entry.prose.limitations.split('\n')[0]).toMatch(/control failed/i);
  });

  test('neither entry is produced from nothing', () => {
    expect(fromNeckPair({ report: { a: null, b: null } })).toBeNull();
    expect(fromChaosPair({ report: { a: null, b: null } })).toBeNull();
  });
});
