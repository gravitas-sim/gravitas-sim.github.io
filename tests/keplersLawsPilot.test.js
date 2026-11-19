// =============================================================================
// Kepler's Laws as a pilot of the lesson capabilities
// -----------------------------------------------------------------------------
// The lesson is content only, so what can be tested without a browser is its
// shape and its judgments: that every law is predicted before it is named, that
// the readings are taken with provenance rather than typed, that the wrong
// spread of planets, the wrong pair of markers and a period without the square
// root are each refused with feedback the author wrote, and that no step states
// what a later step measures. The browser walk is e2e/keplersLawsPilot.spec.js.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import KEPLER from '../js/data/investigations/keplers-laws.js';
import DEEPER from '../js/data/investigations/depth/keplers-laws.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { predictionState } from '../js/lesson/held.js';

const steps = KEPLER.steps;
const at = sid => steps.findIndex(s => s.sid === sid);
const step = sid => steps[at(sid)];
const field = (sid, id) => step(sid).fields.find(f => f.id === id);
const plain = s => String(s).replace(/<[^>]*>/g, ' ');
const ctxOf = (over = {}) => ({
  selected: null,
  find: () => null,
  role: () => null,
  elements: () => null,
  years: x => x,
  ...over,
});

describe('order: each law is predicted before it is named', () => {
  test('the star is predicted, then found, then named', () => {
    expect(at('where-is-the-star')).toBeLessThan(at('find-the-foci'));
    expect(at('find-the-foci')).toBeLessThan(at('the-first-law-and-the'));
    expect(step('where-is-the-star').reveal).toBe('the-first-law-and-the');
  });

  test('the fastest point is predicted, measured, then explained, and the wedges come last', () => {
    const order = [
      'where-does-it-move-fastest',
      'fast-and-slow-in-numbers',
      'why-the-speed-changes',
      'equal-areas-however-you-slice',
    ].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(step('where-does-it-move-fastest').reveal).toBe(
      'why-the-speed-changes'
    );
  });

  test('nothing before a prediction says what it will find', () => {
    const before = sid =>
      steps
        .slice(0, at(sid) + 1)
        .map(s => plain(`${s.title} ${s.body || ''}`))
        .join(' ');
    // The first law and the second, in the words the old lesson used.
    expect(before('where-is-the-star')).not.toMatch(
      /not at its center|drawing itself|one focus|at one focus/i
    );
    expect(before('where-does-it-move-fastest')).not.toMatch(
      /sweeps out equal areas|equal areas in equal times|drawing itself/i
    );
  });

  test('the wedges are refused until the step about them', () => {
    expect(KEPLER.lock.areaSweep).toBe(false);
    expect(step('equal-areas-however-you-slice').wedgeOf).toBeTruthy();
    expect(steps.filter(s => s.wedgeOf).map(s => s.sid)).toEqual([
      'equal-areas-however-you-slice',
    ]);
  });

  test('the scene opens paused', () => {
    expect(step('eight-minutes-of-arc').setup.paused).toBe(true);
    expect(step('where-is-the-star').time).toEqual({ paused: true });
    expect(step('where-does-it-move-fastest').time).toEqual({ paused: true });
  });
});

describe('readings are taken with provenance, not typed', () => {
  test('every printed reading of the pilot steps has a source and a button', () => {
    for (const [sid, ids] of [
      ['find-the-foci', ['f_peri', 'f_apo']],
      ['fast-and-slow-in-numbers', ['v_peri', 'r_peri', 'v_apo', 'r_apo']],
      ['check-the-estimate', ['near_a', 'near_P']],
    ]) {
      for (const id of ids) {
        const f = field(sid, id);
        expect(f.source?.probe).toBeTruthy();
        const rows = step(sid).probe(ctxOf());
        // The author check reads the rows in the empty state: the id is there.
        expect(rows.map(r => r.id)).toContain(f.source.probe);
      }
    }
  });

  test('the star-to-focus distance is a decision, not a copy', () => {
    const f = field('find-the-foci', 'f_sep');
    expect(f.source).toBeUndefined();
    expect(f.compute).toBeUndefined();
  });

  test('the speed step arms the periapsis watch itself', () => {
    expect(step('fast-and-slow-in-numbers').pauseAt).toMatchObject({
      kind: 'periapsis',
      auto: true,
    });
  });

  test('the prediction is shown beside the readings at its reveal step', () => {
    const why = step('why-the-speed-changes');
    expect(why.evidence.map(e => e.field)).toEqual(['v_peri', 'v_apo']);
    for (const e of why.evidence) expect(field(e.step, e.field)).toBeTruthy();
    const first = step('the-first-law-and-the');
    expect(first.evidence.map(e => e.field)).toContain('f_sep');
  });
});

describe('a wrong marker is refused with the author’s words', () => {
  const f = field('find-the-foci', 'f_sep');
  const asked = value =>
    matchMisconception(
      { misconceptions: f.misconceptions, answer: Number(f.want) },
      value,
      Number(f.want) * 0.05,
      {}
    );

  test('the right pair of markers matches no slip', () => {
    expect(asked(1.86)).toBeNull();
  });

  test('the star-to-center distance, the near pair and the far pair each have a message', () => {
    expect(asked(0.93)?.id).toBe('secondFocusAtTheCenter');
    expect(asked(0.5)?.id).toBe('wrongTwoMarkers');
    expect(asked(2.36)?.id).toBe('wrongTwoMarkersFar');
    for (const v of [0.93, 0.5, 2.36])
      expect(asked(v).message).not.toMatch(/\d/);
  });

  test('a reading from the Circular Orbiter is named by its provenance', () => {
    const peri = field('find-the-foci', 'f_peri');
    const from = {
      src: { k: 'c', b: 'Circular Orbiter', t: 0 },
      roleOf: name => (name === 'Circular Orbiter' ? 'circular' : 'eccentric'),
    };
    const m = matchMisconception(
      { misconceptions: peri.misconceptions, answer: 0.5 },
      0.9,
      0.025,
      from
    );
    expect(m?.id).toBe('wrongBody');
    expect(
      matchMisconception(
        { misconceptions: peri.misconceptions, answer: 0.5 },
        0.5,
        0.025,
        { ...from, roleOf: () => 'eccentric' }
      )
    ).toBeNull();
  });

  test('the check agrees with the two distances and warns when it does not', () => {
    const v = (sep, peri = 0.5, apo = 2.36) => ({
      f_peri: peri,
      f_apo: apo,
      f_sep: sep,
    });
    const val = step('find-the-foci').validate;
    expect(val(v(1.86), ctxOf()).level).toBe('ok');
    expect(val(v(0.93), ctxOf()).level).toBe('warn');
    expect(val(v(1.86, 2.36, 0.5), ctxOf()).level).toBe('warn');
  });
});

describe('the wrong spread of planets is refused', () => {
  const val = step('measure-four-planets').validate;
  const rows = list =>
    Object.fromEntries(
      list.flatMap(([name, a, P], i) => [
        [`p${i + 1}_name_text`, name],
        [`p${i + 1}_a`, a],
        [`p${i + 1}_P`, P],
      ])
    );
  const planets = {
    Mercury: [0.387, 0.2408],
    Venus: [0.723, 0.6152],
    Earth: [1, 1],
    Mars: [1.524, 1.881],
    Jupiter: [5.204, 11.86],
    Saturn: [9.58, 29.46],
  };
  const pick = (...n) => n.map(x => [x, ...planets[x]]);

  test('five planets across the range are accepted', () => {
    const r = val(rows(pick('Mercury', 'Earth', 'Mars', 'Jupiter', 'Saturn')));
    expect(r.level).toBe('ok');
  });

  test('fewer than five are asked to add more', () => {
    const r = val(rows(pick('Mercury', 'Earth', 'Jupiter')));
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/at least five/);
  });

  test('a narrow spread cannot tell a power law from a line', () => {
    const r = val(rows(pick('Earth', 'Mars', 'Venus', 'Mercury')));
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/narrow range|factor of/);
  });

  test('a period in the wrong units names the row that disagrees', () => {
    const list = pick('Mercury', 'Earth', 'Mars', 'Jupiter', 'Saturn');
    list[3][2] = 11.86 * 365.25;
    const r = val(rows(list));
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/Jupiter \(row 4\)/);
  });
});

describe('a period without the square root is refused', () => {
  const val = step('check-the-estimate').validate;
  // The student chose 2.5 AU and scaled from Mars (1.524 AU, 1.881 yr).
  const base = { near_a: 1.524, near_P: 1.881, ratio: 2.5 / 1.524 };
  // The eight planets as the scenario places them (a, in simulation units).
  const AXES = {
    Mercury: 0.387,
    Venus: 0.723,
    Earth: 1,
    Mars: 1.524,
    Jupiter: 5.203,
    Saturn: 9.537,
    Uranus: 19.19,
    Neptune: 30.07,
  };
  const sel = ctxOf({
    bodies: Object.keys(AXES).map(name => ({ name })),
    elements: b => (AXES[b?.name] ? { a: AXES[b.name] * 100 } : null),
  });

  test('the law’s period is accepted', () => {
    expect(val({ ...base, P_calc: 3.95 }, sel).level).toBe('ok');
  });

  test('the cube of the distance, its root and a proportional scale each get a sentence', () => {
    expect(val({ ...base, P_calc: 15.625 }, sel).message).toMatch(
      /distance cubed/
    );
    expect(val({ ...base, P_calc: 1.58 }, sel).message).toMatch(
      /square root of the distance/
    );
    expect(val({ ...base, P_calc: 3.09 }, sel).message).toMatch(
      /in proportion/
    );
  });

  test('a planet that is not near the chosen distance is not accepted as the check', () => {
    expect(
      val({ near_a: 0.387, near_P: 0.2408, ratio: 6.46, P_calc: 4 }, sel).level
    ).toBe('warn');
  });

  test('the nearest planet is named when another was taken, nearest in plain distance', () => {
    // 2.5 AU is nearer Mars than Jupiter; Venus is within a factor of four
    // but is not the nearest. At 2.9 AU Mars is still the nearest (1.4 AU away,
    // Jupiter is 2.3 AU away), so Mars is accepted although Jupiter is nearer
    // in ratio.
    const far = { near_a: 1.524, near_P: 1.881, ratio: 2.9 / 1.524 };
    expect(val({ ...far, P_calc: 5 }, sel).message).not.toMatch(/Jupiter/);
    const venus = { near_a: 0.723, near_P: 0.615, ratio: 2.5 / 0.723 };
    const out = val({ ...venus, P_calc: 4 }, sel);
    expect(out.level).toBe('warn');
    expect(out.message).toMatch(/Mars is the planet whose orbit is nearest/);
    expect(val({ ...base, P_calc: 3.95 }, sel).level).toBe('ok');
  });

  test('a planet more than twice as far as the chosen orbit is not the check', () => {
    // 3.3 AU: Mars is the nearest (1.8 AU away) but 3.3 / 1.524 is above two.
    const out = val(
      { near_a: 1.524, near_P: 1.881, ratio: 3.3 / 1.524, P_calc: 6 },
      sel
    );
    expect(out.level).toBe('warn');
    expect(out.message).toMatch(/more than twice/);
  });

  test('none of the feedback states a number the student could copy', () => {
    for (const p of [15.625, 1.58, 3.09, 99]) {
      const m = val({ ...base, P_calc: p }, sel).message;
      expect(m).not.toMatch(/\b3\.9\d?\b/);
    }
  });
});

describe('the estimate and the controlled run', () => {
  test('the estimate is a number, held until its reveal step', () => {
    const e = step('estimate-the-year');
    expect(e).toMatchObject({
      type: 'predict',
      kind: 'estimate',
      unit: 'yr',
      reveal: 'compare-the-estimate',
    });
    expect(at('compare-the-estimate')).toBeGreaterThan(
      at('check-the-estimate')
    );
    const reveal = step('compare-the-estimate');
    // The estimate is held against the first reading, so the unit must agree.
    expect(field('check-the-estimate', reveal.evidence[0].field).unit).toBe(
      e.unit
    );
  });

  test('the committed estimate opens the reading buttons', () => {
    const e = step('estimate-the-year');
    const check = step('check-the-estimate');
    const key = 'keplers-laws:estimate-the-year';
    expect(predictionState(steps, check, new Set(), {})).toBe('uncommitted');
    expect(predictionState(steps, check, new Set(), { [key]: '4' })).toBe(
      'committed'
    );
    expect(e.reveal).toBe('compare-the-estimate');
  });

  test('the star’s mass is varied through the one key the system stage reads', () => {
    const s = step('what-the-constant-depends-on');
    expect(s.variation).toMatchObject({
      param: 'starMassSun',
      values: [1, 2],
    });
    expect(s.stage.system.planets).toHaveLength(1);
    expect(s.stage.system.starMassSun).toBeUndefined();
    expect(s.probe(ctxOf()).map(r => r.id)).toContain('P');
  });
});

describe('retired steps name their successor', () => {
  test('each retired id is gone and points at a step the lesson has, or nothing', () => {
    const live = new Set(steps.map(s => s.sid));
    for (const [id, r] of Object.entries(KEPLER.retired)) {
      expect(live.has(id)).toBe(false);
      expect(r.to === null || live.has(r.to)).toBe(true);
      expect(r.was.en && r.was.es).toBeTruthy();
    }
    expect(Object.keys(KEPLER.retired).sort()).toEqual([
      'measure-the-two-orbits',
      'repeat-the-timing',
      'use-the-law',
    ]);
  });
});

describe('the deeper steps keep their decisions', () => {
  const deeper = Object.fromEntries(DEEPER.steps.map(s => [s.sid, s]));
  const val = deeper['time-it-until-sure'].validate;

  test('how many repeat timings to take is the student’s, and the error bar follows', () => {
    const three = val({ t1: 1.0, t2: 1.001, t3: 0.999 });
    const six = val({
      t1: 1.0,
      t2: 1.001,
      t3: 0.999,
      t4: 1.0005,
      t5: 0.9995,
      t6: 1.0,
    });
    expect(three.message).toMatch(/From 3 readings/);
    expect(six.message).toMatch(/From 6 readings/);
    expect(val({ t1: 1, t2: 1.001 })).toBeNull();
    const sem = f =>
      deeper['time-it-until-sure'].fields.find(x => x.id === 'sem').compute(f);
    const f3 = { t1: 1.0, t2: 1.001, t3: 0.999 };
    const f6 = { ...f3, t4: 1.0, t5: 1.001, t6: 0.999 };
    expect(sem(f6)).toBeLessThan(sem(f3));
  });

  test('the prediction step no longer says to copy, or restates a retired question', () => {
    const p = deeper['predict-with-an-error-bar'];
    expect(p.hints.method).not.toMatch(/copy/i);
    expect(p.restates).toBeUndefined();
    expect(p.after).toBe('weighted-fit');
    expect(deeper['time-it-until-sure'].after).toBe('check-the-estimate');
  });

  test('the advanced step tests the law on a close planet and accepts the half', () => {
    const s = deeper['size-of-the-miss'];
    // 1.321 Earth masses of a 0.0898 solar-mass star, half the ratio, in ppm.
    const ratio = (1.321 * 3.0035e-6) / 0.0898;
    expect((ratio / 2) * 1e6).toBeCloseTo(s.answer, 0);
    const twice = matchMisconception(s, ratio * 1e6, s.tolerance, {});
    expect(twice?.id).toBe('forgotTheHalf');
    expect(matchMisconception(s, s.answer, s.tolerance, {})).toBeNull();
  });
});

describe('what the app reads, and where the wedges show', () => {
  test('the distances and speed an answer key quotes are what the built scenario reads', async () => {
    // The world as the page builds it, read the way the lesson's own probe does.
    const find = globalThis.document.getElementById.bind(globalThis.document);
    globalThis.document.getElementById = id => {
      let el = find(id);
      if (!el) {
        el = globalThis.document.createElement(
          /canvas/i.test(id) ? 'canvas' : 'div'
        );
        el.id = id;
        globalThis.document.body.appendChild(el);
      }
      return el;
    };
    const ctx2d = new Proxy(
      {},
      {
        get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
        set: (t, k, v) => ((t[k] = v), true),
      }
    );
    globalThis.HTMLCanvasElement.prototype.getContext = () => ctx2d;
    const world = await import('../js/world.js');
    const physics = await import('../js/physics.js');
    const app = await import('../js/appState.js');
    const { orbitalElements } = await import('../js/orbital.js');
    const { formatSpeed } = await import('../js/units.js');
    app.SETTINGS.preset_scenario = 'keplers-2nd-law';
    world.initialize_simulation({ seed: 'keplers-laws-speeds' });
    const orbiter = physics.planets.find(b => b.name === 'Eccentric Orbiter');
    const star = physics.stars[0];
    const el = orbitalElements(
      orbiter,
      star,
      app.SETTINGS.gravitational_constant
    );
    // Distances in AU (100 simulation units to the AU): 0.50 closest, 2.36 furthest.
    expect(el.a * (1 - el.e) * 0.01).toBeCloseTo(0.5, 2);
    expect(el.a * (1 + el.e) * 0.01).toBeCloseTo(2.36, 2);
    // The speed the card shows at the start, and the one at the far point from
    // the same orbit (vis-viva, G M = 4 pi^2 AU^3/yr^2 in the app's units).
    expect(parseFloat(formatSpeed(el.v))).toBeCloseTo(54.1, 1);
    const vApo = (parseFloat(formatSpeed(el.v)) * (1 - el.e)) / (1 + el.e);
    expect(vApo).toBeCloseTo(11.48, 1);
    expect(
      Number(field('fast-and-slow-in-numbers', 'v_peri').want)
    ).toBeCloseTo(54, 0);
    expect(Number(field('fast-and-slow-in-numbers', 'v_apo').want)).toBeCloseTo(
      11.5,
      1
    );
  });

  test('the step that says wedges are drawn asks for them', () => {
    expect(KEPLER.lock.areaSweep).toBe(false);
    expect(step('the-same-laws-forty-light').showAreaSweep).toBe(true);
    expect(step('the-same-laws-forty-light').allowInspector).toBe(true);
    expect(step('equal-areas-however-you-slice').wedgeOf).toBeTruthy();
  });

  test('a remix of the lesson checks clean, estimate prediction included', async () => {
    const { remixBuiltin } = await import('../js/composer/remixApi.js');
    const { checkInvestigationPack } = await import('../js/composer/api.js');
    const { pack } = await remixBuiltin('keplers-laws', { id: 'my-kepler' });
    const { errors, compiled } = await checkInvestigationPack(pack);
    expect(errors).toEqual([]);
    const est = compiled.lesson.steps.find(x => x.sid === 'estimate-the-year');
    expect(est).toMatchObject({ kind: 'estimate', unit: 'yr' });
    expect(est.options).toBeUndefined();
  });
});
