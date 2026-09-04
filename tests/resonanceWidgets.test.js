// =============================================================================
// The resonance instruments
// -----------------------------------------------------------------------------
// The analysis these four widgets sit on is tested in tests/resonance.test.js.
// What is left for here is the part that only a widget can get wrong: drawing
// and reporting from a world that is empty, half-formed, or not the one the
// step expected. A student who opens the panel before pressing play, or on a
// scenario the step did not set up, must see a sentence explaining that rather
// than a stack trace or an empty box.
//
// The worlds below are synthetic - a primary and some bodies on exact
// Keplerian orbits, advanced analytically - so a widget's arithmetic is checked
// against a known answer without running the engine.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  RESONANCE_WIDGETS,
  angleRows,
  argumentFor,
  measureAngle,
  measureConjunctions,
  measureFrame,
  verdictText,
} from '../js/resonanceWidgets.js';
import { recorder, partition } from '../js/resonance/recorder.js';
import { ANGLE_STATE, wrap360 } from '../js/resonance/elements.js';
import { stateFromElements } from '../js/resonance/systems.js';

const G = 2;
const byId = id => RESONANCE_WIDGETS.find(w => w.id === id);

/** A canvas stub with a context whose every method is a no-op. */
function canvas() {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return () => ({ width: 10 });
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop)) {
          return () => ({ addColorStop() {} });
        }
        return (...args) => {
          calls.push([prop, args]);
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  return {
    width: 600,
    height: 300,
    style: {},
    clientWidth: 600,
    getBoundingClientRect: () => ({ width: 600, height: 300 }),
    getContext: () => ctx,
    calls,
  };
}

/**
 * A world of bodies on exact Keplerian orbits, sampled forward in time.
 *
 * Each body is described by its elements and its mean motion, so advancing the
 * clock is a matter of advancing every mean longitude by n dt and rebuilding
 * the state. No integrator, and therefore no integration error to explain away.
 */
function world(primaryMass, specs) {
  const mu = G * primaryMass;
  let clock = 0;
  const primary = {
    name: 'Primary',
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    mass: primaryMass,
  };
  const at = t =>
    specs.map(s => {
      const n = (360 / s.period) * t;
      const state = stateFromElements({
        a: Math.cbrt(mu / ((2 * Math.PI) / s.period) ** 2),
        e: s.e ?? 0,
        varpiDeg: s.varpi ?? 0,
        lambdaDeg: wrap360((s.lambda ?? 0) + n),
        mu,
      });
      return { name: s.name, mass: 0, ...state };
    });

  return {
    ctx(step = 0) {
      clock += step;
      return {
        bodies: [primary, ...at(clock)],
        G,
        clock: () => clock,
      };
    },
    /**
     * Feed the recorder `n` samples spaced `dt` apart, and hand back the
     * context as it stands afterwards.
     *
     * Recording directly rather than through a widget's draw(): the widgets
     * record as a side effect of drawing, which is right in the panel and
     * quadratic here, because every frame would reduce the whole history. The
     * one thing that costs is coverage of collect() itself, and the drawing
     * tests below cover that.
     */
    run(n, dt) {
      for (let i = 0; i < n; i++) {
        const c = this.ctx(dt);
        recorder.record({ clock: c.clock(), ...partition(c) });
      }
      return this.ctx(0);
    },
  };
}

beforeEach(() => recorder.reset());

describe('the registry', () => {
  test('all four are registered, with the shape the engine expects', () => {
    expect(RESONANCE_WIDGETS.map(w => w.id)).toEqual([
      'resonance-periods',
      'resonance-angle',
      'resonance-conjunctions',
      'resonance-frame',
    ]);
    for (const w of RESONANCE_WIDGETS) {
      expect(typeof w.title).toBe('string');
      expect(typeof w.note).toBe('string');
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(Array.isArray(w.controls)).toBe(true);
      // All four read the live simulation and repaint every frame; the
      // recorder is fed from draw(), so a widget that was not animated would
      // sample once and report on one frame of history.
      expect(w.live).toBe(true);
      expect(w.animated).toBe(true);
    }
  });
});

describe('an empty or half-formed world', () => {
  const nothing = { bodies: [], G, clock: () => 0 };

  test('every widget draws a message instead of throwing', () => {
    for (const w of RESONANCE_WIDGETS) {
      const c = canvas();
      expect(() => w.draw(c, {}, nothing, {})).not.toThrow();
      expect(c.calls.some(([m]) => m === 'fillText')).toBe(true);
    }
  });

  test('every widget reports a status row instead of throwing', () => {
    for (const w of RESONANCE_WIDGETS) {
      const rows = w.readout({}, nothing, {});
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(typeof row.label).toBe('string');
        expect(typeof row.value).toBe('string');
      }
    }
  });

  test('a world with one body in it is not enough', () => {
    const lonely = {
      bodies: [
        { name: 'Sun', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 1000 },
      ],
      G,
      clock: () => 0,
    };
    for (const w of RESONANCE_WIDGETS) {
      expect(() => w.draw(canvas(), {}, lonely, {})).not.toThrow();
    }
  });

  test('no context at all is survivable', () => {
    for (const w of RESONANCE_WIDGETS) {
      expect(() => w.draw(canvas(), {}, undefined, {})).not.toThrow();
      expect(() => w.readout({}, undefined, {})).not.toThrow();
    }
  });

  test('a record of two samples is not reported on', () => {
    const w = world(1000, [
      { name: 'a', period: 100 },
      { name: 'b', period: 200 },
    ]);
    w.run(2, 1);
    const rows = byId('resonance-periods').readout({}, w.ctx(0), {});
    expect(rows.length).toBe(1);
  });
});

describe('periods and ratios', () => {
  test('recovers the periods it was built from', () => {
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 200.7 },
    ]);
    const ctx = w.run(400, 1);
    const rows = byId('resonance-periods').readout({}, ctx, {});
    // Two body rows and one ratio row.
    expect(rows.length).toBe(3);
    expect(rows[0].label).toBe('inner');
    expect(rows[1].label).toBe('outer');
    // The ratio row quotes the measured ratio and its nearest small ratio.
    expect(rows[2].value).toContain('2.007');
    expect(rows[2].value).toContain('2:1');
  });

  test('bodies are listed innermost first, whatever order they arrive in', () => {
    const w = world(1000, [
      { name: 'far', period: 400 },
      { name: 'near', period: 100 },
      { name: 'middle', period: 200 },
    ]);
    const ctx = w.run(400, 1);
    const rows = byId('resonance-periods').readout({}, ctx, {});
    expect(rows.slice(0, 3).map(r => r.label)).toEqual([
      'near',
      'middle',
      'far',
    ]);
  });

  test('drawing a real world touches the canvas', () => {
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 200 },
    ]);
    const ctx = w.run(200, 1);
    const c = canvas();
    byId('resonance-angle').draw(c, {}, ctx, {
      inner: 'inner',
      outer: 'outer',
    });
    expect(c.calls.some(([m]) => m === 'stroke' || m === 'fillRect')).toBe(
      true
    );
  });
});

describe('choosing the argument', () => {
  const galilean = () =>
    world(1000, [
      { name: 'Io', period: 100 },
      { name: 'Europa', period: 200.7, lambda: 180, varpi: 180 },
      { name: 'Ganymede', period: 404.4 },
      { name: 'Callisto', period: 943.3, lambda: 90 },
    ]);

  test('the Laplace argument is picked by name and uses all three moons', () => {
    const w = galilean();
    const ctx = w.run(400, 1);
    const m = measureAngle(ctx, { argument: 'laplace' });
    expect(m.arg.kind).toBe('laplace');
    expect(m.arg.names).toEqual(['Io', 'Europa', 'Ganymede']);
    expect(m.arg.label).toContain('3λ(Europa)');
  });

  test('a named argument that the world cannot supply is refused', () => {
    const w = world(1000, [
      { name: 'a', period: 100 },
      { name: 'b', period: 200 },
    ]);
    const ctx = w.run(200, 1);
    const m = measureAngle(ctx, { argument: 'laplace' });
    // Falls through to the general case rather than inventing a Laplace
    // argument out of two bodies.
    expect(m.arg.kind).not.toBe('laplace');
  });

  test('the general case builds the argument for whatever ratio it finds', () => {
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 233.3 },
    ]);
    const ctx = w.run(400, 1);
    const m = measureAngle(ctx, { inner: 'inner', outer: 'outer' });
    expect(m.arg.ratio).toMatchObject({ p: 7, q: 3 });
    expect(m.arg.label).toBe('7λ(outer) − 3λ(inner) − 4ϖ(outer)');
  });

  test('a 1:1 pair gets the co-orbital angle, with no periapsis term', () => {
    // p - q is zero, so the periapsis coefficient vanishes and what is left is
    // the difference of the two mean longitudes. Building the general
    // first-order argument here would divide by nothing useful.
    const w = world(1000, [
      { name: 'jupiter', period: 100 },
      { name: 'trojan', period: 100 },
    ]);
    const ctx = w.run(400, 1);
    const m = measureAngle(ctx, { inner: 'jupiter', outer: 'trojan' });
    expect(m.arg.kind).toBe('coorbital');
    expect(m.arg.label).not.toContain('ϖ');
  });

  test('a co-orbital pair is judged against the orbital period, not the synodic', () => {
    // Two equal periods have an infinite synodic period, and every threshold
    // measured in conjunction cycles would be unreachable: the instrument would
    // report "too short" forever.
    const w = world(1000, [
      { name: 'jupiter', period: 100 },
      { name: 'trojan', period: 100 },
    ]);
    const ctx = w.run(3000, 1);
    const m = measureAngle(ctx, { inner: 'jupiter', outer: 'trojan' });
    expect(Number.isFinite(m.synodic)).toBe(true);
    expect(m.synodic).toBeCloseTo(100, 0);
    expect(m.verdict.reason).not.toBe('too-short');
  });

  test('a step can name the ratio instead of letting it be detected', () => {
    // 1.59 is nearest to 8:5, but a step asking "is this body in the same 3:2
    // as Pluto?" wants the 3:2 argument, not the nearest one.
    const w = world(1000, [
      { name: 'Neptune', period: 100 },
      { name: 'rogue', period: 159, e: 0.25 },
    ]);
    const ctx = w.run(400, 1);
    expect(
      measureAngle(ctx, { inner: 'Neptune', outer: 'rogue' }).arg.ratio
    ).toMatchObject({ p: 8, q: 5 });
    const named = measureAngle(ctx, {
      inner: 'Neptune',
      outer: 'rogue',
      p: 3,
      q: 2,
    });
    expect(named.arg.ratio).toMatchObject({ p: 3, q: 2 });
    expect(named.arg.label).toBe('3λ(rogue) − 2λ(Neptune) − 1ϖ(rogue)');
    // ...and the fractional offset is measured against the ratio that was
    // asked for, not against the one that would have been found.
    expect(named.arg.ratio.fractional).toBeCloseTo(
      Math.abs(1.59 - 1.5) / 1.59,
      2
    );
  });

  test('argumentFor returns null when the named bodies are absent', () => {
    const series = [{ t: 0, el: { a: { a: 1 }, b: { a: 2 } } }];
    expect(argumentFor({ inner: 'nope', outer: 'b' }, series)).toBeNull();
    expect(argumentFor({ inner: 'a', outer: 'a' }, series)).toBeNull();
  });
});

describe('the angle instrument’s verdicts', () => {
  test('an exactly commensurate pair librates and says so', () => {
    // Periods in an exact 2:1 with the periapsis fixed: the argument does not
    // move at all, which the classifier reports as an equilibrium.
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 200, e: 0.05, varpi: 40 },
    ]);
    // Thirty conjunction cycles, comfortably past the twenty the classifier
    // insists on before it will offer any verdict at all.
    const ctx = w.run(6000, 1);
    const m = measureAngle(ctx, { inner: 'inner', outer: 'outer' });
    expect(m.verdict.observedCycles).toBeGreaterThan(25);
    expect(m.verdict.state).toBe(ANGLE_STATE.LIBRATION);
    expect(m.verdict.reason).toBe('stationary');
  });

  test('a pair well off commensurability circulates', () => {
    // 2.05, whose nearest ratio with denominator ten or less is still 2:1 -
    // 214 would have been read as 15:7, which is a real argument and a
    // different test. The 2:1 argument here drifts by about 0.09 degrees per
    // time unit, so the run covers about two full circuits.
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 205, e: 0.05, varpi: 0 },
    ]);
    const ctx = w.run(4000, 2);
    const m = measureAngle(ctx, { inner: 'inner', outer: 'outer' });
    expect(m.arg.ratio).toMatchObject({ p: 2, q: 1 });
    expect(m.verdict.state).toBe(ANGLE_STATE.CIRCULATION);
  });

  test('verdictText gives a sentence for every state the classifier can reach', () => {
    for (const v of [
      null,
      { state: ANGLE_STATE.CIRCULATION },
      { state: ANGLE_STATE.LIBRATION, reason: 'stationary' },
      {
        state: ANGLE_STATE.LIBRATION,
        reason: 'reversals',
        periodResolved: true,
      },
      {
        state: ANGLE_STATE.LIBRATION,
        reason: 'reversals',
        periodResolved: false,
      },
      { state: ANGLE_STATE.INCONCLUSIVE, reason: 'confined' },
      { state: ANGLE_STATE.INCONCLUSIVE, reason: 'one-reversal' },
      { state: ANGLE_STATE.INCONCLUSIVE, reason: 'drifting-centre' },
      { state: ANGLE_STATE.INCONCLUSIVE, reason: 'ambiguous-drift' },
      { state: ANGLE_STATE.INCONCLUSIVE, reason: 'too-short' },
    ]) {
      const text = verdictText(v);
      expect(typeof text).toBe('string');
      // An unresolved message key would render as "resW.something", which is
      // what a missing translation looks like on screen.
      expect(text).not.toMatch(/^resW\./);
    }
  });

  test('the readout survives every verdict, including the partial ones', () => {
    // The classifier does not hand back centre, amplitude and period as a set.
    // A confined angle has the first two and no period; one whose centre is
    // drifting has an amplitude and neither of the others - and that one is
    // Callisto, the case the lesson spends longest on. An earlier version
    // assumed they arrived together and threw on exactly that system.
    const base = {
      ready: true,
      primary: { name: 'Sun' },
      window: 50_000,
      synodic: 2_000,
      pIn: 1_000,
      pOut: 1_500,
      stats: { samples: 900, interval: 55, halvings: 2 },
      arg: {
        label: '3λ(b) − 2λ(a) − 1ϖ(b)',
        referencePair: ['a', 'b'],
        ratio: { p: 3, q: 2, fractional: 0.003 },
      },
    };
    const verdicts = [
      {
        state: ANGLE_STATE.LIBRATION,
        reason: 'reversals',
        centre: 180,
        amplitude: 20,
        amplitudeIsBound: false,
        period: 9_000,
        periodResolved: true,
        minimumCirculationPeriod: null,
        drift: 3,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.LIBRATION,
        reason: 'reversals',
        centre: 180,
        amplitude: 20,
        amplitudeIsBound: false,
        period: 9_000,
        periodResolved: false,
        minimumCirculationPeriod: null,
        drift: 3,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.LIBRATION,
        reason: 'stationary',
        centre: 60,
        amplitude: 0,
        amplitudeIsBound: false,
        period: null,
        periodResolved: false,
        minimumCirculationPeriod: Infinity,
        drift: 0,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.INCONCLUSIVE,
        reason: 'confined',
        centre: 190,
        amplitude: 10,
        amplitudeIsBound: true,
        period: null,
        periodResolved: false,
        minimumCirculationPeriod: 500_000,
        drift: 20,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.INCONCLUSIVE,
        reason: 'drifting-centre',
        centre: null,
        amplitude: 26,
        amplitudeIsBound: true,
        period: null,
        periodResolved: false,
        minimumCirculationPeriod: 400_000,
        drift: 35,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.INCONCLUSIVE,
        reason: 'one-reversal',
        centre: 300,
        amplitude: 40,
        amplitudeIsBound: true,
        period: null,
        periodResolved: false,
        minimumCirculationPeriod: 200_000,
        drift: 70,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.INCONCLUSIVE,
        reason: 'ambiguous-drift',
        centre: null,
        amplitude: null,
        amplitudeIsBound: false,
        period: null,
        periodResolved: false,
        minimumCirculationPeriod: Infinity,
        drift: 200,
        observedCycles: 25,
      },
      {
        state: ANGLE_STATE.CIRCULATION,
        reason: 'completed-circuit',
        centre: null,
        amplitude: null,
        amplitudeIsBound: false,
        period: 12_000,
        periodResolved: true,
        minimumCirculationPeriod: 12_000,
        drift: 900,
        observedCycles: 25,
      },
    ];

    for (const verdict of verdicts) {
      const rows = angleRows({ ...base, verdict });
      expect(rows.length).toBeGreaterThan(3);
      for (const row of rows) {
        expect(typeof row.label).toBe('string');
        expect(typeof row.value).toBe('string');
        expect(row.value).not.toContain('undefined');
        expect(row.value).not.toContain('NaN');
        expect(row.value).not.toMatch(/^resW\./);
      }
      // The verdict itself is always reported, whatever it is.
      expect(
        rows.some(r =>
          /LIBRATION|CIRCULATION|INCONCLUSIVE|EQUILIBRIUM/.test(r.value)
        )
      ).toBe(true);
    }
  });

  test('a measurement that is not ready reports a status row and nothing else', () => {
    expect(angleRows(null)).toHaveLength(1);
    expect(angleRows({ ready: false, reason: 'warming-up' })).toHaveLength(1);
    expect(
      angleRows({ ready: false, reason: 'warming-up' })[0].value
    ).not.toMatch(/^resW\./);
  });

  test('the readout never leaks an unresolved message key', () => {
    const w = world(1000, [
      { name: 'inner', period: 100 },
      { name: 'outer', period: 214, e: 0.05 },
    ]);
    const ctx = w.run(4000, 2);
    for (const spec of [
      { inner: 'inner', outer: 'outer' },
      { argument: 'laplace' },
      { argument: 'pluto' },
    ]) {
      for (const w2 of RESONANCE_WIDGETS) {
        for (const row of w2.readout({}, ctx, spec)) {
          expect(row.label).not.toMatch(/^resW\./);
          expect(row.value).not.toMatch(/^resW\./);
        }
      }
    }
  });
});

describe('conjunctions', () => {
  test('finds the line-ups and says where on the outer orbit they fall', () => {
    // Inner and outer in a 3:2, with the outer's periapsis fixed and the phase
    // arranged so every conjunction happens at the outer body's aphelion. This
    // is Pluto's protection mechanism, in closed form.
    const w = world(1000, [
      { name: 'Neptune', period: 100, lambda: 0 },
      { name: 'Pluto', period: 150, e: 0.25, varpi: 0, lambda: 60 },
    ]);
    const ctx = w.run(3000, 1);
    const m = measureConjunctions(ctx, { inner: 'Neptune', outer: 'Pluto' });
    expect(m.events.length).toBeGreaterThan(5);
    expect(m.anomalies.R).toBeGreaterThan(0.7);
    expect(Math.abs(m.anomalies.mean - 180)).toBeLessThan(45);
  });

  test('a pair that is not resonant smears its line-ups round the orbit', () => {
    const w = world(1000, [
      { name: 'inner', period: 100, lambda: 0 },
      { name: 'outer', period: 173, e: 0.25, varpi: 0 },
    ]);
    const ctx = w.run(6000, 2);
    const m = measureConjunctions(ctx, { inner: 'inner', outer: 'outer' });
    expect(m.events.length).toBeGreaterThan(10);
    expect(m.anomalies.R).toBeLessThan(0.6);
  });

  test('naming a body that is not there is reported, not thrown', () => {
    const w = world(1000, [
      { name: 'a', period: 100 },
      { name: 'b', period: 200 },
    ]);
    const ctx = w.run(400, 1);
    const m = measureConjunctions(ctx, { inner: 'a', outer: 'nope' });
    expect(m.ready).toBe(false);
    expect(m.reason).toBe('no-pair');
  });
});

describe('the rotating frame', () => {
  test('puts a co-orbital body at a fixed point and a wider one on a ring', () => {
    const w = world(1000, [
      { name: 'Jupiter', period: 100, lambda: 0 },
      { name: 'trojan', period: 100, lambda: 60 },
      { name: 'wide', period: 140, lambda: 0 },
    ]);
    const ctx = w.run(1500, 1);
    const m = measureFrame(ctx, { secondary: 'Jupiter' });
    expect(m.ready).toBe(true);

    // The trojan holds a constant angle from Jupiter, so its track is a point.
    const trojan = m.tracks.get('trojan');
    const xs = trojan.map(p => p.x);
    const ys = trojan.map(p => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1e-6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-6);
    // ...and it sits exactly on L4.
    expect(xs[0]).toBeCloseTo(m.points.L4.x, 6);
    expect(ys[0]).toBeCloseTo(m.points.L4.y, 6);

    // The wide body goes right round.
    const wide = m.tracks.get('wide');
    const angles = wide.map(p => Math.atan2(p.y, p.x));
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(6);
  });

  test('the secondary is at (1, 0) and the triangular points are exact', () => {
    const w = world(1000, [
      { name: 'Jupiter', period: 100 },
      { name: 'trojan', period: 100, lambda: 60 },
    ]);
    const ctx = w.run(1500, 1);
    const m = measureFrame(ctx, { secondary: 'Jupiter' });
    expect(m.points.L4.x).toBeCloseTo(0.5, 12);
    expect(m.points.L4.y).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(m.points.L5.y).toBeCloseTo(-Math.sqrt(3) / 2, 12);
  });

  test('a missing secondary is reported, not thrown', () => {
    const w = world(1000, [
      { name: 'a', period: 100 },
      { name: 'b', period: 200 },
    ]);
    const ctx = w.run(400, 1);
    const m = measureFrame(ctx, { secondary: 'Jupiter' });
    expect(m.ready).toBe(false);
    expect(m.reason).toBe('no-secondary');
  });

  test('the readout names a kind of libration rather than a bare verdict', () => {
    const w = world(1000, [
      { name: 'Jupiter', period: 100 },
      { name: 'trojan', period: 100, lambda: 60 },
    ]);
    const ctx = w.run(4000, 1);
    const rows = byId('resonance-frame').readout({}, ctx, {
      secondary: 'Jupiter',
    });
    expect(rows[0].value).toBe('Jupiter');
    expect(rows.some(r => r.label === 'trojan')).toBe(true);
  });
});
