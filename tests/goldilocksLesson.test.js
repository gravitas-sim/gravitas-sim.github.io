/**
 * @jest-environment jsdom
 */
// =============================================================================
// The Goldilocks question, first half: the student finds the law and the shift
// -----------------------------------------------------------------------------
// The checks are held against the instruments and against physics done here
// from the definitions alone, not from js/habitability.js: the starlight on a
// planet is L over d squared; the edges of the zone are the published quartic
// in the star's temperature (Kopparapu et al. 2013, with the 2014 erratum),
// typed again below; any three readings a reader could take pass, a reading
// taken at another distance or off the panel is refused in words, and the
// answers saved under the two steps that were retired come back as an earlier
// version.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import DEPTH from '../js/data/investigations/depth/goldilocks-question.js';
import ES_DEEP from '../js/data/investigations/depth/es/goldilocks-question.js';
import ES from '../js/data/investigations/es/goldilocks-question.js';
import { layDepth } from '../js/investigations/depthPure.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';
import { getWidget, whenWidgetsReady } from '../js/widgets.js';
import { relativeInsolation } from '../js/habitability.js';
import { zoneLimits } from '../js/kernels/habitablezone/index.js';
import { LIMIT_STARS } from '../js/habitabilityLimitsWidgets.js';
import { comparisonStars } from '../js/habitabilityWidgets.js';

await whenWidgetsReady();

const LESSON = INVESTIGATIONS.find(l => l.id === 'goldilocks-question');
const step = sid => LESSON.steps.find(s => s.sid === sid);
const LAID = layDepth(LESSON, DEPTH.steps);
const laid = sid => LAID.steps.find(s => s.sid === sid);

// Physics from the definitions, with its own constants.
/** Starlight on a planet, in Earths: luminosity over distance squared (AU, solar units). */
const flux = (L, d) => L / (d * d);
/** The published fit of the effective flux at a limit, in Earths, as a quartic in T - 5780 K. */
const QUARTIC = {
  runaway: [1.0385, 1.2456e-4, 1.4612e-8, -7.6345e-12, -1.7511e-15],
  maximum: [0.3507, 5.9578e-5, 1.6707e-9, -3.0058e-12, -5.1925e-16],
};
const fit = (name, teff) => {
  const x = teff - 5780;
  const [s, a, b, c, d] = QUARTIC[name];
  return s + a * x + b * x ** 2 + c * x ** 3 + d * x ** 4;
};

const grid = (lo, hi, by) =>
  Array.from({ length: Math.round((hi - lo) / by) + 1 }, (_, i) =>
    Number((lo + i * by).toFixed(2))
  );
const DISTANCES = grid(0.3, 3, 0.05);

/** What the panel prints for the starlight at a slider position, as the Take reading button writes it. */
const printed = distance => {
  const w = getWidget('hz-insolation');
  const row = w.readout({ distance }).find(r => r.id === 'starlight');
  return Number(String(row.value).match(/[\d.]+/)[0]);
};
const rowsFor = ds => {
  const v = {};
  ds.forEach((d, i) => {
    v[`d${i + 1}`] = d;
    v[`s${i + 1}`] = printed(d);
  });
  return v;
};
/** The provenance the reading button records: where the slider was. */
const took = ds =>
  Object.fromEntries(ds.map((d, i) => [`s${i + 1}`, { s: { distance: d } }]));

describe('the physics the panel stands on, done independently', () => {
  test('the panel prints one over distance squared, to its own two figures, across the slider', () => {
    for (const d of DISTANCES) {
      const exact = flux(1, d);
      const p = printed(d);
      // Two decimals below 10 Earths, one from 10 to 100.
      expect(Math.abs(p - exact)).toBeLessThanOrEqual(
        exact >= 10 ? 0.051 : 0.0051
      );
    }
    expect(printed(1)).toBe(1);
    expect(printed(2)).toBe(0.25);
    expect(printed(0.5)).toBe(4);
  });

  test('twice the distance is a quarter of the starlight at any distance', () => {
    for (const d of [0.3, 0.7, 1.5])
      expect(flux(1, 2 * d) / flux(1, d)).toBeCloseTo(0.25, 12);
  });

  test('one Earth of starlight lies at the square root of the luminosity, for the four stars of the panel', () => {
    const stars = comparisonStars();
    expect(stars.map(s => s.L)).toEqual([0.0015, 0.34, 1, 5.1]);
    const at = stars.map(s => Math.sqrt(s.L));
    expect(at[0]).toBeCloseTo(0.0387, 4);
    expect(at[3]).toBeCloseTo(2.258, 3);
    // The slider's own grid: 0.04 AU for the dim star is 0.94 Earths, 2.26 AU for the bright one 1.00.
    expect(flux(stars[0].L, 0.04)).toBeCloseTo(0.9375, 4);
    expect(flux(stars[3].L, 2.26)).toBeCloseTo(0.9985, 3);
    // And 670 times fainter, as the tip says.
    expect(1 / stars[0].L).toBeGreaterThan(660);
    expect(1 / stars[0].L).toBeLessThan(680);
  });

  test('the zone edges the step reads are the published fit, to the figures printed', () => {
    const edges = L => {
      const teff = { 0.0015: 3000, 1: 5772, 5.1: 6600 }[L];
      return [
        Math.sqrt(L / fit('runaway', teff)),
        Math.sqrt(L / fit('maximum', teff)),
      ];
    };
    const [rIn, rOut] = edges(0.0015);
    expect(rIn).toBeCloseTo(0.0417, 3);
    expect(rOut).toBeCloseTo(0.0805, 3);
    const [sIn, sOut] = edges(1);
    expect(sIn).toBeCloseTo(0.98, 2);
    expect(sOut).toBeCloseTo(1.69, 2);
    const [bIn, bOut] = edges(5.1);
    expect(bIn).toBeCloseTo(2.11, 2);
    expect(bOut).toBeCloseTo(3.58, 2);
    // One Earth of starlight round the dim star sits just sunward of its inner edge: 1 Earth is above its limit.
    expect(fit('runaway', 3000)).toBeLessThan(1);
  });

  test('the limits step: the Sun at 1.04 and 0.35 Earths, the M dwarf at 0.87 and 0.068 AU, the estimate at 0.062', () => {
    const sun = zoneLimits(LIMIT_STARS[0]);
    expect(sun.limits.runawayGreenhouse.flux).toBeCloseTo(
      fit('runaway', 5780),
      3
    );
    expect(sun.limits.maximumGreenhouse.flux).toBeCloseTo(
      fit('maximum', 5780),
      3
    );
    const m = LIMIT_STARS[3];
    expect(m).toMatchObject({ teffK: 3200, luminositySolar: 0.004 });
    const own = fit('runaway', 3200);
    expect(own).toBeCloseTo(0.8679, 3);
    expect(Math.sqrt(0.004 / own)).toBeCloseTo(0.0679, 4);
    const lim = zoneLimits(m).limits.runawayGreenhouse;
    expect(lim.flux).toBeCloseTo(own, 3);
    expect(lim.distanceAU).toBeCloseTo(Math.sqrt(0.004 / own), 4);
    // The estimate carries the Sun's amount over: 0.062 AU, 9 percent short of the reading.
    const estimate = Math.sqrt(0.004 / fit('runaway', 5780));
    expect(estimate).toBeCloseTo(0.0621, 4);
    expect(lim.distanceAU / estimate).toBeGreaterThan(1.08);
    expect(lim.distanceAU / estimate).toBeLessThan(1.1);
    // Fourteen times closer in than the Sun's 0.98 AU, as the reveal says.
    expect(0.98 / lim.distanceAU).toBeGreaterThan(14);
    expect(0.98 / lim.distanceAU).toBeLessThan(14.7);
  });

  test('Venus by the rule is 1.93 Earths, inside the 0.12 the step accepts around 1.92', () => {
    const v = step('venus-by-the-rule-you');
    expect(Math.abs(flux(1, 0.72) - v.answer)).toBeLessThanOrEqual(v.tolerance);
    expect(relativeInsolation(1, 0.72)).toBeCloseTo(flux(1, 0.72), 10);
    expect(
      Math.abs(1 / 9 - step('writing-it-down-then-using').answer)
    ).toBeLessThan(step('writing-it-down-then-using').tolerance);
  });
});

describe('three distances of your own', () => {
  const s = () => step('three-distances-yours');
  const check = (ds, over = {}, got) =>
    s().validate({ ...rowsFor(ds), ...over }, null, got ?? took(ds));

  test('every triple a reader could choose with a doubling in it and a factor of two overall is accepted', () => {
    let n = 0;
    for (const a of DISTANCES)
      for (const b of DISTANCES)
        for (const c of DISTANCES) {
          if (!(a < b && b < c)) continue;
          const ds = [a, b, c];
          const span = c / a;
          const doubling = ds.some(x =>
            ds.some(y => x !== y && Math.abs(y / x - 2) <= 0.1)
          );
          const r = check(ds);
          n++;
          if (span >= 2 && doubling) expect(r.level).toBe('ok');
          else expect(r.level).toBe('warn');
        }
    expect(n).toBeGreaterThan(10000);
  });

  test('the lesson’s old distances, and any set with the doubling in a different place, pass', () => {
    for (const ds of [
      [0.5, 1, 2],
      [0.6, 1.2, 2.4],
      [1.5, 3, 0.8],
      [0.3, 0.6, 3],
    ])
      expect(check(ds).level).toBe('ok');
  });

  test('a reading taken at another distance is refused, naming the row', () => {
    const r = check([0.5, 1, 2], {}, took([0.5, 1.5, 2]));
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/Row 2.*not where the slider was/);
  });

  test('a uniform slip, which a ratio between the rows would divide out, is caught; so is a stray row', () => {
    const rows = rowsFor([0.5, 1, 2]);
    const half = { s1: rows.s1 / 2, s2: rows.s2 / 2, s3: rows.s3 / 2 };
    expect(check([0.5, 1, 2], half).message).toMatch(
      /agree with each other but not with the panel/
    );
    const swapped = { s1: rows.s3, s3: rows.s1 };
    expect(check([0.5, 1, 2], swapped).message).toMatch(
      /do not belong together/
    );
  });

  test('three distances that are too close, or have no doubling, are refused in words that give no value', () => {
    const tight = check([1, 1.1, 1.2]);
    expect(tight.level).toBe('warn');
    expect(tight.message).toMatch(/too close together/);
    const none = check([0.5, 0.8, 2.4]);
    expect(none.level).toBe('warn');
    expect(none.message).toMatch(/twice another/);
    for (const m of [tight.message, none.message])
      expect(m).not.toMatch(/\d|one quarter|inverse|squared/);
  });

  test('equal distances (1, 2, 2) are told to choose three different ones, not that they are too close', () => {
    for (const ds of [
      [1, 2, 2],
      [0.5, 0.5, 2],
      [1, 1, 1],
    ]) {
      const r = check(ds);
      expect(r.level).toBe('warn');
      expect(r.message).toMatch(/Choose three different distances/);
      expect(r.message).not.toMatch(/too close together/);
    }
  });

  test('two rows wait, empty waits, a non-positive row is an error', () => {
    expect(check([0.5, 1, 2], { d3: undefined, s3: undefined })).toBeNull();
    expect(s().validate({})).toBeNull();
    expect(s().validate({ d1: 0, s1: 1, d2: 1, s2: 1 }).level).toBe('error');
  });

  test('the check and its messages state no rule: the law is for the reveal to settle', () => {
    const ok = check([0.5, 1, 2]);
    expect(ok.message).not.toMatch(
      /squared|inverse|quarter|1 ?\/ ?d|distance × distance/i
    );
    const body = `${s().body} ${s().tip}`;
    expect(body).not.toMatch(/squared|inverse|quarter|= ?1/i);
  });

  test('it opens at a distance that is no answer and hands over no preset; the readings can be taken', () => {
    expect(s().tool.values.distance).toBe(1.5);
    expect(s().tool.presets).toBe(false);
    const w = getWidget('hz-insolation');
    const ids = w.readout({ distance: 1 }).map(r => r.id);
    expect(ids).toContain('starlight');
    for (const f of s().fields.filter(x => x.source))
      expect(f.source).toEqual({ tool: 'starlight' });
    // The distances are the reader's own choice, so no field carries an
    // expected value for the answer key to print, and none a placeholder.
    for (const f of s().fields) {
      expect(f.want).toBeUndefined();
      expect(f.hint).toBeUndefined();
    }
    expect(s().validate(rowsFor([0.5, 1, 2]), null, {}).level).toBe('ok');
  });

  test('the plot is the reader’s own three points', () => {
    const pts = s().plot.points(rowsFor([0.6, 1.2, 2.4]));
    expect(pts).toHaveLength(3);
    expect(pts[0]).toMatchObject({ x: 0.6, y: printed(0.6) });
  });
});

describe('the prediction, the reveal and the leaks', () => {
  test('the doubling prediction is held until the step that sets it beside the readings', () => {
    const p = step('move-it-twice-as-far');
    expect(p.reveal).toBe('what-the-graph-says');
    const r = step('what-the-graph-says');
    expect(LESSON.steps.indexOf(r)).toBeGreaterThan(
      LESSON.steps.indexOf(step('three-distances-yours'))
    );
    expect(r.evidence.map(e => `${e.step}.${e.field}`)).toEqual(
      ['d1', 's1', 'd2', 's2', 'd3', 's3'].map(
        f => `three-distances-yours.${f}`
      )
    );
    for (const e of r.evidence)
      expect(step(e.step).fields.some(f => f.id === e.field)).toBe(true);
    expect(r.compare).toMatch(/one twice the other/);
  });

  test('the doubling prediction carries no slip: the reveal names the wrong turn, half, in its because', () => {
    const p = step('move-it-twice-as-far');
    expect(p.misconceptions).toBeUndefined();
    expect(p.options[1]).toBe('half as much');
    expect(p.because).toMatch(/Half is the answer almost everyone reaches for/);
  });

  test('no step before its measurement states the squares, the factor of fifty, a band edge or the proportion', () => {
    const text = sid =>
      [
        step(sid).body,
        step(sid).tip,
        (step(sid).checklist || []).join(' '),
      ].join(' ');
    expect(text('the-star-is-not-running')).not.toMatch(/1, 4, 9/);
    expect(text('writing-it-down-then-using')).not.toMatch(/1, 4, 9|nine\./);
    const at = step('so-where-would-a-planet');
    expect(text('so-where-would-a-planet')).not.toMatch(
      /factor of fifty|0\.04|0\.08|2\.1|3\.6/
    );
    expect(at.tool.values).toEqual({ star: 2, distance: 1 });
    expect(step('four-stars-one-planet').tip).not.toMatch(/times less light/);
    expect(step('what-the-graph-says').body).not.toMatch(
      /steep|flatten[s]? out|drops/
    );
    expect(step('leave-the-planet-change-the').body).not.toMatch(/faint/);
    expect(step('venus-by-the-rule-you').body).not.toMatch(/0\.52/);
  });

  test('the step that retired s4 and s5 is required by the one that uses it, and the old ids are not live', () => {
    expect(step('writing-it-down-then-using').requires).toEqual([
      'three-distances-yours',
    ]);
    for (const [id, r] of Object.entries(LESSON.retired)) {
      expect(LESSON.steps.some(x => x.sid === id)).toBe(false);
      expect(LESSON.steps.some(x => x.sid === r.to)).toBe(true);
    }
    expect(Object.keys(LESSON.retired).sort()).toEqual([
      'reading-the-fraction',
      'three-distances',
      'write-the-three-down',
    ]);
  });
});

// =============================================================================
// The second half: the eccentric year and the real system
// =============================================================================

/** The fraction of a year a planet on this orbit is between two distances, by the mean anomaly and Kepler's equation (not the module under test). */
const timeBetween = (a, e, lo, hi, n = 20000) => {
  let inside = 0;
  for (let i = 0; i < n; i++) {
    const M = (2 * Math.PI * (i + 0.5)) / n;
    let E = M;
    for (let k = 0; k < 60; k++)
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const r = a * (1 - e * Math.cos(E));
    if (r >= lo && r <= hi) inside++;
  }
  return inside / n;
};
/** The Sun's conservative zone from the published fit typed above (Sun 5780 K). */
const SUN_ZONE = [
  Math.sqrt(1 / fit('runaway', 5780)),
  Math.sqrt(1 / fit('maximum', 5780)),
];

/** What the orbit panel prints for the fraction, as the Take reading button writes it. */
const orbitFraction = ecc => {
  const w = getWidget('hz-orbit');
  const row = w
    .readout({ ecc, semi: 1.2 }, null, { showZone: true })
    .find(r => r.id === 'fraction');
  return { text: row.value, n: Number(String(row.value).match(/[\d.]+/)[0]) };
};

describe('the eccentric year: the fraction the panel prints, done independently', () => {
  test('the printed fraction of the year inside the zone is the time between the two edges, to a whole percent, across the slider', () => {
    for (const e of [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.6]) {
      const exact = 100 * timeBetween(1.2, e, SUN_ZONE[0], SUN_ZONE[1]);
      // The panel rounds to a whole percent; the edges here are the 5780 K fit, the panel's the 5772 K one.
      expect(Math.abs(orbitFraction(e).n - exact)).toBeLessThanOrEqual(1.6);
    }
  });

  test('a circular orbit at 1.2 AU never leaves the zone and the orbit the lesson stages spends about half its year inside', () => {
    expect(orbitFraction(0).text).toBe('100%');
    const n = orbitFraction(0.45).n;
    expect(n).toBeGreaterThan(50);
    expect(n).toBeLessThan(60);
  });

  test('the orbit panel names its fraction row so the reading button can take it', () => {
    const w = getWidget('hz-orbit');
    const rows = w.readout({ ecc: 0.3, semi: 1.2 }, null, { showZone: true });
    expect(rows.filter(r => r.id === 'fraction')).toHaveLength(1);
    expect(
      w
        .readout({ ecc: 0.3, semi: 1.2 }, null, {})
        .some(r => r.id === 'fraction')
    ).toBe(false);
  });
});

describe('two runs at one average distance', () => {
  const s = () => step('two-runs-one-orbit');
  /** The provenance the reading button records: where the controls were. */
  const took = (a, b, semi = 1.2) => ({
    f1: { s: { ecc: a, semi } },
    f2: { s: { ecc: b, semi } },
  });
  const run = (a, b, over = {}, got) =>
    s().validate(
      {
        e1: a,
        f1: orbitFraction(a).n,
        e2: b,
        f2: orbitFraction(b).n,
        ...over,
      },
      null,
      got ?? took(a, b)
    );

  test('a circular run and any eccentric run that leaves the zone are accepted, in either order', () => {
    for (const e of [0.25, 0.3, 0.45, 0.5, 0.6]) {
      expect(run(0, e).level).toBe('ok');
      expect(run(e, 0).level).toBe('ok');
    }
  });

  test('the message that accepts them states no fraction and no verdict', () => {
    expect(run(0, 0.45).message).not.toMatch(/\d/);
  });

  test('two circular runs, two eccentric runs, an eccentric run that never leaves, and a missing run are each told so in words', () => {
    expect(run(0, 0).message).toMatch(/eccentric/);
    expect(run(0.3, 0.45).message).toMatch(/circular/);
    // 0.1 is eccentric and never leaves the zone at 1.2 AU
    expect(run(0, 0.1).level).toBe('warn');
    expect(run(0, 0.1).message).toMatch(/leaves the zone/);
    expect(s().validate({ e1: 0, f1: 100 }, null, {})).toBeNull();
  });

  test('a typed eccentricity that is not where the control was, and readings at two semi-major axes, are refused in words', () => {
    expect(run(0, 0.45, {}, took(0, 0.3)).message).toMatch(/Run 2/);
    expect(run(0, 0.45, {}, took(0, 0.45, 1.2)).level).toBe('ok');
    const axes = {
      f1: { s: { ecc: 0, semi: 1.2 } },
      f2: { s: { ecc: 0.45, semi: 1.5 } },
    };
    expect(run(0, 0.45, {}, axes).message).toMatch(/semi-major/);
  });

  test('impossible numbers are errors', () => {
    expect(run(0, 0.45, { f2: 140 }).level).toBe('error');
    expect(run(0, 0.45, { e2: 0.9 }).level).toBe('error');
  });

  test('the fraction fields are taken from the panel by their row id and the eccentricities are typed', () => {
    const f = Object.fromEntries(s().fields.map(x => [x.id, x]));
    expect(f.f1.source).toEqual({ tool: 'fraction' });
    expect(f.f2.source).toEqual({ tool: 'fraction' });
    expect(f.e1.source).toBeUndefined();
    expect(s().tool.showZone).toBe(true);
    expect(s().tool.values.semi).toBe(1.2);
    // the panel opens on neither run
    expect(s().tool.values.ecc).not.toBe(0);
    expect(f.e1.want ?? f.f1.want).toBeUndefined();
  });
});

describe('what the fraction says: a held prediction, the reader’s own runs, and a slip that names the wrong turn', () => {
  const order = LESSON.steps.map(x => x.sid);
  const p = () => step('predict-the-fraction');
  const q = () => step('fraction-of-your-run');

  test('the prediction comes before the zone is drawn and is settled after the two runs, with both runs beside it', () => {
    expect(p()).toMatchObject({
      type: 'predict',
      reveal: 'fraction-of-your-run',
    });
    expect(order.indexOf('predict-the-fraction')).toBeLessThan(
      order.indexOf('crossing-the-edges')
    );
    expect(order.indexOf('two-runs-one-orbit')).toBeLessThan(
      order.indexOf('fraction-of-your-run')
    );
    expect(q().evidence).toEqual([
      { step: 'two-runs-one-orbit', field: 'e1' },
      { step: 'two-runs-one-orbit', field: 'f1' },
      { step: 'two-runs-one-orbit', field: 'e2' },
      { step: 'two-runs-one-orbit', field: 'f2' },
    ]);
    expect(typeof q().compare).toBe('string');
  });

  test('the orbit the prediction describes is the one the step stages, and its answer is about half', () => {
    const stage = step('crossing-the-edges').stage.system.planets[0];
    expect(stage).toMatchObject({ aAU: 1.2, ecc: 0.45 });
    expect(p().body).toMatch(/1\.2 AU/);
    expect(p().body).toMatch(/0\.45/);
    expect(p().options[p().answer]).toMatch(/about half/);
    const exact = 100 * timeBetween(1.2, 0.45, SUN_ZONE[0], SUN_ZONE[1]);
    expect(exact).toBeGreaterThan(45);
    expect(exact).toBeLessThan(65);
    expect(100 * timeBetween(1.2, 0.45, SUN_ZONE[0], SUN_ZONE[1])).toBeLessThan(
      75
    );
  });

  test('no number of the fraction is written before the reader’s own reading', () => {
    for (const sid of [
      'predict-the-fraction',
      'crossing-the-edges',
      'two-runs-one-orbit',
      'fraction-of-your-run',
    ]) {
      const x = step(sid);
      // A prediction's options are the candidates, so they may be fractions.
      const before = [
        x.body,
        x.tip,
        ...(x.type === 'predict' ? [] : [x.prompt, ...(x.options || [])]),
        ...(x.checklist || []),
      ].join(' ');
      expect(before).not.toMatch(
        /56\s?%|three quarters|a little over half|about three/
      );
    }
    expect(step('fraction-of-your-run').options[0]).not.toMatch(/\d/);
    expect(step('fraction-of-your-run').prompt).not.toMatch(/\d/);
  });

  test('the slip is authored where the because already names the wrong turn: inside means habitable', () => {
    expect(q().misconceptions).toHaveLength(1);
    expect(q().misconceptions[0]).toMatchObject({
      id: 'inside-means-habitable',
      option: 0,
    });
    expect(q().misconceptions[0].option).not.toBe(q().answer);
    expect(q().because).toMatch(/inside the zone means habitable/);
    expect(
      ES.steps[order.indexOf('fraction-of-your-run')].misconceptions
    ).toHaveLength(1);
  });

  test('the retired reading step points at its successor and says what it asked, in both languages', () => {
    const r = LESSON.retired['reading-the-fraction'];
    expect(r.to).toBe('fraction-of-your-run');
    expect(r.release).toBe('3.1');
    expect(r.was.en.length).toBeGreaterThan(20);
    expect(r.was.es.length).toBeGreaterThan(20);
  });
});

describe('the real system: the zone is an estimate there, and no reading is hinted', () => {
  test('the readings step opens on the other definition and its five fields carry no expected value', () => {
    const t = step('take-the-readings-yourself');
    expect(t.tool.values.model).toBe(1);
    for (const f of t.fields) expect(f.want).toBeUndefined();
    const text = `${t.body} ${t.tip}`;
    expect(text).not.toMatch(/0\.0254|0\.0499|0\.65|0\.37|0\.25/);
    expect(text).toMatch(/estimate/);
  });

  test('the five readings are still graded: the panel’s own numbers pass, a swapped planet or the wrong definition does not', () => {
    const t = step('take-the-readings-yourself');
    const ok = { e: 0.65, f: 0.37, g: 0.25, inner: 0.0254, outer: 0.0499 };
    expect(t.validate(ok).level).toBe('ok');
    expect(t.validate({ ...ok, e: 0.37 }).level).toBe('warn');
    expect(t.validate({ ...ok, inner: 0.02, outer: 0.06 }).message).toMatch(
      /zone definition/
    );
  });

  test('every step that shows a zone for TRAPPIST-1 says the calculator takes 2600 to 7200 K and what to do outside it', () => {
    const body = sid => step(sid).body;
    expect(body('all-seven-planets')).toMatch(/2600 to 7200 K/);
    expect(body('all-seven-planets')).toMatch(/estimate/);
    expect(body('all-seven-planets')).toMatch(/does not cover it/);
    expect(body('watch-it-run')).toMatch(/2,566 K|2566 K/);
    expect(body('watch-it-run')).toMatch(/lower limit/);
    expect(laid('a-star-the-fit-refuses').because).toMatch(
      /nearest calibrated temperature/
    );
  });

  test('the prediction before the zone gives the luminosity and not the conversion', () => {
    const b = step('a-real-system-forty-light').body;
    expect(b).toMatch(/0\.000553/);
    expect(b).not.toMatch(/eighteen|forty times|0\.0[2-9]/);
    expect(step('a-real-system-forty-light').reveal).toBe('all-seven-planets');
    expect(
      LESSON.steps.map(x => x.sid).indexOf('a-real-system-forty-light')
    ).toBeLessThan(LESSON.steps.map(x => x.sid).indexOf('all-seven-planets'));
  });

  test('the model-star statement of the advanced steps is kept with its consequence for Earth at 1 AU', () => {
    const e = laid('earth-in-the-model-zone');
    expect(e.because).toMatch(/1\.11 Earths/);
    expect(e.because).toMatch(/model star/);
    expect(laid('why-no-climate-history').body).toMatch(
      /Nothing here says when Earth leaves the zone/
    );
  });
});

describe('the quantitative steps: predict the distance before reading it', () => {
  test('the estimate is a prediction in AU that the step after the reading settles, with the readings beside it', () => {
    const e = laid('estimate-the-dim-limit');
    const m = laid('the-same-limit-a-dim-star');
    const r = laid('the-estimate-and-the-limit');
    expect(e).toMatchObject({ type: 'predict', kind: 'estimate', unit: 'AU' });
    expect(e.reveal).toBe(r.sid);
    expect(LAID.steps.indexOf(e)).toBeLessThan(LAID.steps.indexOf(m));
    expect(LAID.steps.indexOf(m)).toBeLessThan(LAID.steps.indexOf(r));
    expect(r.evidence[0]).toEqual({ step: m.sid, field: 'distance' });
    expect(m.fields.find(f => f.id === 'distance').unit).toBe(e.unit);
    expect(`${e.body} ${m.body}`).not.toMatch(/0\.06|0\.07|0\.87/);
    expect(e.decides).toMatch(/starlight/);
  });

  test('the reading step grades the panel’s own numbers and gives no interpretation before the reveal', () => {
    const m = laid('the-same-limit-a-dim-star');
    const ok = m.validate({ flux: 0.87, distance: 0.068 });
    expect(ok.level).toBe('ok');
    expect(ok.message).not.toMatch(/\d/);
    expect(m.validate({ flux: 1.04, distance: 0.062 }).level).toBe('error');
  });

  test('the zone-fit refusal and the transfer keep their places', () => {
    const order = LAID.steps.map(s => s.sid);
    expect(order.indexOf('a-star-the-fit-refuses')).toBe(
      order.indexOf('the-estimate-and-the-limit') + 1
    );
    expect(order.indexOf('the-limits-as-starlight')).toBe(
      order.indexOf('estimate-the-dim-limit') - 1
    );
    expect(laid('a-star-the-fit-refuses').answer).toBe(2);
    expect(step('venus-by-the-rule-you').answer).toBe(1.92);
  });

  test('every Spanish deeper step exists for every English one, with the same fields', () => {
    for (const s of DEPTH.steps) {
      const es =
        ES_DEEP.steps.find(x => x.sid === s.sid) ??
        ES_DEEP.steps[DEPTH.steps.indexOf(s)];
      expect(Boolean(es)).toBe(true);
      if (s.fields) expect(es.fields).toHaveLength(s.fields.length);
    }
    expect(ES_DEEP.steps).toHaveLength(DEPTH.steps.length);
  });
});

describe('the lesson as a whole, in both languages', () => {
  test('ids are unique and the Spanish has one entry for each step with the same number of fields, options and slips', () => {
    const sids = LESSON.steps.map(x => x.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(ES.steps).toHaveLength(sids.length);
    LESSON.steps.forEach((x, i) => {
      const es = ES.steps[i];
      if (x.fields) expect(es.fields).toHaveLength(x.fields.length);
      if (x.options) expect(es.options).toHaveLength(x.options.length);
      if (x.misconceptions)
        expect(es.misconceptions).toHaveLength(x.misconceptions.length);
    });
  });

  test('the core lesson is 38 steps and 49 with the deeper steps', () => {
    expect(LESSON.steps).toHaveLength(38);
    expect(LAID.steps).toHaveLength(49);
  });
});

describe('saved work under the three steps this lesson retired', () => {
  const OLD = {
    'goldilocks-question:three-distances': 'noted',
    'goldilocks-question:write-the-three-down:d1': '0.5',
    'goldilocks-question:write-the-three-down:s1': '4',
    'goldilocks-question:write-the-three-down:d2': '1',
    'goldilocks-question:write-the-three-down:s2': '1',
    'goldilocks-question:move-it-twice-as-far': 2,
    'goldilocks-question:what-the-graph-says': 1,
    'goldilocks-question:reading-the-fraction': 2,
  };
  const SAVED = {
    schema: 2,
    lesson: 'goldilocks-question',
    stepSid: 'the-star-is-not-running',
    responses: OLD,
    attempts: {},
    visited: ['move-it-twice-as-far'],
    startedAt: '2026-10-01T00:00:00.000Z',
  };
  const read = readProgress(SAVED, LESSON);

  test('the answers under the retired ids are an earlier version and the kept steps keep their answers', () => {
    expect(read.responses['goldilocks-question:move-it-twice-as-far']).toBe(2);
    expect(read.responses['goldilocks-question:what-the-graph-says']).toBe(1);
    const rows = earlierAnswers(LESSON, read.earlier.responses);
    expect(new Set(rows.map(r => [r.id, r.r.to].join('>')))).toEqual(
      new Set([
        'write-the-three-down>three-distances-yours',
        'three-distances>three-distances-yours',
        'reading-the-fraction>fraction-of-your-run',
      ])
    );
    for (const r of rows) {
      expect(wasIn(r.r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.r.was, 'es').length).toBeGreaterThan(20);
    }
    expect(
      read.responses['goldilocks-question:write-the-three-down:s1']
    ).toBeUndefined();
    expect(
      read.responses['goldilocks-question:reading-the-fraction']
    ).toBeUndefined();
  });

  test('a student saved on the step that now requires the new measurement, holding only the retired answers, is not sent back or blocked', () => {
    // `requires` is an edge of the step graph (it adds the measurement to an
    // assignment that uses the rule); the lesson itself never gates on it.
    const at = readProgress(
      { ...SAVED, stepSid: 'writing-it-down-then-using' },
      LESSON
    );
    expect(at.stepSid).toBe('writing-it-down-then-using');
    expect(at.responses['goldilocks-question:three-distances-yours:d1']).toBe(
      undefined
    );
    const live = new Set(LESSON.steps.map(s => s.sid));
    for (const st of LESSON.steps)
      for (const r of st.requires || []) expect(live.has(r)).toBe(true);
    expect(live.has('three-distances')).toBe(false);
    expect(live.has('write-the-three-down')).toBe(false);
  });
});
