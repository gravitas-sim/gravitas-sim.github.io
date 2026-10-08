/**
 * The Exoplanet Observatory's guided investigations
 * (js/observatory/guides/exoplanet.js, EXOPLANET_OBSERVATORY.md).
 *
 * Four kinds of test, as the roadmap asks for them:
 *
 *   the guides as data     every step well formed, every word in both
 *                          languages, the advanced path a superset of the
 *                          introductory one, every answer's inputs earlier
 *   synthetic recovery     science.js on light curves made here with known
 *                          depths, epochs, odd/even and secondary eclipses
 *   published values       the reference run on the real packs against the
 *                          literature, each with its stated tolerance
 *   the runner             the checks, the answer parsing, and one guide
 *                          walked in the DOM
 *
 * The reference run (tools/exoplanet-reference.mjs) fits three light curves
 * four times, which takes about ten seconds.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect, beforeAll } from '@jest/globals';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// One at a time: several import()s linking the same module at once can lose
// it (the jest concurrent import race).
const S = await import('../js/observatory/guides/science.js');
const G = await import('../js/observatory/guides/exoplanet.js');
const P = await import('../js/observatory/guidePanel.js');
const C = await import('../js/observatory/guides/core.js');
const { EN_GUIDES: EN_RUNNER } = await import('../js/i18n/en.guides.js');
const { ES_GUIDES: ES_RUNNER } = await import('../js/i18n/es.guides.js');
const { EN_EXOPLANET } = await import('../js/i18n/en.exoplanet.js');
const { ES_EXOPLANET } = await import('../js/i18n/es.exoplanet.js');
const EN_GUIDES = { ...EN_RUNNER, ...EN_EXOPLANET };
const ES_GUIDES = { ...ES_RUNNER, ...ES_EXOPLANET };
const { HD209458 } = await import('../js/data/exoplanetSystems.js');
const R = await import('../tools/exoplanet-reference.mjs');
// A check against the exoplanet suite's targets.
const evaluate = (check, w) => C.evaluateCheck(check, w, G.TARGETS);
const { EXOPLANET_KEY } = await import('../js/data/exoplanetAnswerKey.js');

const KINDS = ['read', 'do', 'answer', 'choose'];
const CHECKS = ['opened', 'measured', 'folded', 'fitted'];
const SHOWS = [
  'crowding',
  'stellarRadius',
  'depths',
  'published',
  'oddEven',
  'secondary',
  'count',
  'simulation',
];

/** A seeded uniform stream (mulberry32), and normal deviates from it. */
function random(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    const r = Math.sqrt(-2 * Math.log(1 - u()));
    return r * Math.cos(2 * Math.PI * u());
  };
}

/**
 * A box-shaped transit light curve: 20-minute points over 27 days, white
 * noise of `noise`, a transit of `depth` lasting `duration`, optionally
 * alternating depths (an eclipsing binary at half its period) and a
 * secondary eclipse at phase one half.
 */
function synthetic({
  period = 3.5,
  epoch = 1.3,
  depth = 0.01,
  duration = 0.12,
  noise = 0.001,
  alternate = 0,
  second = 0,
  seed = 1,
}) {
  const n = random(seed);
  const t = [];
  const y = [];
  const dy = [];
  for (let x = 0; x < 27; x += 20 / 1440) {
    const ph = (x - epoch) / period;
    const c = Math.round(ph);
    const off = Math.abs(ph - c) * period;
    let f = 1;
    if (off < duration / 2) f -= depth * (c % 2 ? 1 + alternate : 1);
    const off2 = Math.abs(ph - 0.5 - Math.round(ph - 0.5)) * period;
    if (off2 < duration / 2) f -= second;
    t.push(x);
    y.push(f + noise * n());
    dy.push(noise);
  }
  return { t, y, dy };
}

// --- The guides as data ------------------------------------------------------------

describe('the guides as data', () => {
  test('five guides, each id unique, each step id unique within its guide', () => {
    expect(G.GUIDES.map(g => g.id)).toEqual([
      'exo-star',
      'exo-find',
      'exo-fit',
      'exo-dilution',
      'exo-planet',
    ]);
    for (const g of G.GUIDES) {
      const ids = g.steps.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(g.steps[0].id).toBe('intro');
      expect(g.steps.at(-1).id).toBe('wrap');
    }
  });

  test('every step is a known kind, on a known path, with what its kind needs', () => {
    for (const g of G.GUIDES) {
      for (const s of g.steps) {
        const where = `${g.id}.${s.id}`;
        expect({ where, kind: KINDS.includes(s.kind) }).toEqual({
          where,
          kind: true,
        });
        expect(['both', 'advanced']).toContain(s.path);
        if (s.kind === 'do') expect(CHECKS).toContain(s.check.kind);
        if (s.check?.target) expect(G.TARGETS).toHaveProperty([s.check.target]);
        if (s.go?.open) expect(G.TARGETS).toHaveProperty([s.go.open]);
        if (s.go?.panel) expect(['fit', 'measure']).toContain(s.go.panel);
        if (s.kind === 'answer') {
          expect(typeof G.ANSWERS[s.expect.answer]).toBe('function');
          expect(s.expect.tolerance).toBeGreaterThanOrEqual(0);
        }
        if (s.kind === 'choose') {
          expect(s.options.length).toBeGreaterThanOrEqual(2);
          if (typeof s.correct === 'string')
            expect(s.options).toContain(s.correct);
          else if (s.correct !== null)
            expect(typeof G.CORRECT[s.correct.answer]).toBe('function');
        }
        if (s.show) expect(SHOWS).toContain(s.show);
        if (s.target) expect(G.TARGETS).toHaveProperty([s.target]);
      }
    }
  });

  test('the advanced path is the introductory one with steps added, in order', () => {
    for (const g of G.GUIDES) {
      const intro = G.stepsOn(g, 'intro').map(s => s.id);
      const advanced = G.stepsOn(g, 'advanced').map(s => s.id);
      expect(advanced.filter(id => intro.includes(id))).toEqual(intro);
      expect(advanced.length).toBeGreaterThan(intro.length);
      expect(intro.length).toBeGreaterThanOrEqual(6);
    }
  });

  test('every word a step shows exists in English and in Spanish', () => {
    const need = [];
    for (const g of G.GUIDES) {
      need.push(`gd.${g.id}.title`, `gd.${g.id}.summary`);
      for (const s of g.steps) {
        const k = `gd.${g.id}.${s.id}`;
        need.push(`${k}.title`, `${k}.text`);
        const checked =
          s.kind === 'do' ||
          s.kind === 'answer' ||
          (s.kind === 'choose' && s.correct !== null);
        if (checked) need.push(`${k}.ok`);
        if (s.kind === 'answer' || (s.kind === 'choose' && s.correct !== null))
          need.push(`${k}.no`);
        for (const o of s.options || []) need.push(`${k}.opt.${o}`);
        if (s.show) need.push(`gd.show.how.${s.show}`);
      }
    }
    for (const t of Object.keys(G.TARGETS)) need.push(`gd.target.${t}`);
    const missing = need.filter(k => !(k in EN_GUIDES) || !(k in ES_GUIDES));
    expect(missing).toEqual([]);
    // And nothing in one language only.
    expect(Object.keys(ES_GUIDES).sort()).toEqual(
      Object.keys(EN_GUIDES).sort()
    );
  });

  test('every message id the runner and the suite write out is in its catalog', () => {
    const ids = file =>
      [
        ...readFileSync(path.join(REPO, file), 'utf8').matchAll(
          /\bt\(\s*'(gd\.[\w.-]+)'/g
        ),
      ].map(m => m[1]);
    const runner = ids('js/observatory/guidePanel.js');
    expect(runner.length).toBeGreaterThan(20);
    expect(runner.filter(id => !(id in EN_RUNNER))).toEqual([]);
    // The suite's panels are drawn with the runner's translator, `h.t`.
    const suite = ids('js/observatory/guides/exoplanet.js');
    expect(suite.length).toBeGreaterThan(20);
    expect(suite.filter(id => !(id in EN_GUIDES))).toEqual([]);
    // Every suite has a title in the runner's own catalog, for the chooser.
    for (const s of ['exoplanet', 'populations'])
      expect(EN_RUNNER).toHaveProperty([`gd.suite.${s}`]);
    for (const why of [
      'notOpened',
      'noFold',
      'foldPeriod',
      'noMeasurement',
      'outside',
      'noFit',
      'fitSettings',
      'unknown',
    ])
      expect(EN_GUIDES).toHaveProperty([`gd.check.${why}`]);
  });

  test('an answer reads only steps that come before it, in its own guide', () => {
    for (const g of G.GUIDES) {
      for (const p of G.PATHS) {
        const list = G.stepsOn(g, p);
        list.forEach((s, i) => {
          const asked = [];
          const c = {
            quantity: id => (asked.push(id), null),
            evidence: id => (asked.push(id), null),
            pack: () => null,
            series: () => null,
          };
          if (s.kind === 'answer') G.ANSWERS[s.expect.answer](c, s);
          if (s.kind === 'choose' && s.correct?.answer)
            G.CORRECT[s.correct.answer](c, s);
          for (const id of asked) {
            const at = list.findIndex(x => x.id === id);
            expect({
              step: `${g.id}.${s.id}`,
              reads: id,
              before: at >= 0 && at < i,
            }).toEqual({
              step: `${g.id}.${s.id}`,
              reads: id,
              before: true,
            });
            expect(list[at].kind).toBe('do');
          }
        });
      }
    }
  });

  test('the simulation it compares with is the simulation Gravitas runs', () => {
    expect(G.ADOPTED.simulation.stellarRadius).toBe(HD209458.star.radiusSolar);
    expect(G.ADOPTED.simulation.planetRadius).toBe(
      HD209458.planet.radiusJupiter
    );
    expect(G.ADOPTED.simulation.period).toBe(HD209458.planet.periodDays);
  });

  test("HD 209458's CROWDSAP is the pinned raw file's header value", () => {
    const header = readFileSync(
      path.join(
        REPO,
        'tests/fixtures/fits/tess2022244194134-s0056-0000000420814525-0243-s_lc.headers.txt'
      ),
      'utf8'
    );
    const v = Number(/CROWDSAP=\s*([\d.]+)/.exec(header)[1]);
    expect(G.ADOPTED.hd209458.crowdsap.value).toBe(v);
  });

  test('every adopted value names its source', () => {
    const walk = (o, where) => {
      if (o && typeof o === 'object' && 'value' in o)
        expect({ where, ref: typeof o.ref }).toEqual({ where, ref: 'string' });
      else if (o && typeof o === 'object')
        for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`);
    };
    walk(G.ADOPTED.hd209458, 'hd209458');
    walk(G.ADOPTED.kepler13, 'kepler13');
    for (const p of G.ADOPTED.kepler13.published)
      expect(p.ref).toMatch(/\d{4}/);
  });
});

// --- Synthetic recovery --------------------------------------------------------------

describe('science.js recovers what a synthetic light curve holds', () => {
  test('lightFraction: equal stars share equally; 2.5 magnitudes is a factor of ten', () => {
    expect(S.lightFraction(0)).toBeCloseTo(0.5, 12);
    expect(S.lightFraction(2.5)).toBeCloseTo(10 / 11, 12);
    expect(S.lightFraction(-2.5)).toBeCloseTo(1 / 11, 12);
  });

  test('a box transit: its epoch and its depth, within the stated error', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = synthetic({ seed });
      const epoch = S.bestEpoch(s, { period: 3.5, duration: 0.14 });
      // A box's flat bottom is a plateau for the middle half of a longer
      // box: any center within (0.12 - 0.14 / 2) / 2 of the true one reads
      // the same depth, and noise picks among them. Within that, and a step.
      expect(Math.abs(epoch - 1.3)).toBeLessThan(
        (0.12 - 0.14 / 2) / 2 + 0.14 / 32 + 1e-9
      );
      const d = S.boxDepth(s, { period: 3.5, epoch, duration: 0.14 });
      expect(Math.abs(d.depth - 0.01)).toBeLessThan(3 * d.error);
      expect(d.cycles).toBe(8);
      expect(d.error).toBeGreaterThanOrEqual(d.whiteError);
    }
  });

  test('odd and even: alike for a planet, told apart for an alternating binary', () => {
    const planet = synthetic({ seed: 7 });
    const at = { period: 3.5, epoch: 1.3, duration: 0.14 };
    expect(S.oddEven(planet, at).sigmas).toBeLessThan(3);
    const binary = synthetic({ seed: 7, alternate: 0.3 });
    const oe = S.oddEven(binary, at);
    expect(oe.sigmas).toBeGreaterThan(5);
    expect(oe.odd.depth / oe.even.depth).toBeCloseTo(1.3, 1);
  });

  test('half an orbit later: nothing for a planet, a dip for a second star', () => {
    const at = { period: 3.5, epoch: 1.3, duration: 0.14 };
    const planet = S.secondary(synthetic({ seed: 9 }), at);
    expect(Math.abs(planet.depth)).toBeLessThan(3 * planet.error);
    const star = S.secondary(synthetic({ seed: 9, second: 0.004 }), at);
    expect(star.depth / star.error).toBeGreaterThan(10);
    expect(star.depth).toBeCloseTo(0.004, 3);
  });

  test('correlated noise makes the depth less certain, not more', () => {
    // A slow wobble with a period near the transit's length: red noise.
    const s = synthetic({ seed: 11, noise: 0.0005 });
    const red = {
      ...s,
      y: s.y.map((v, i) => v + 0.001 * Math.sin(s.t[i] * 40)),
    };
    const at = { period: 3.5, epoch: 1.3, duration: 0.14 };
    const white = S.boxDepth(s, at);
    const wobbly = S.boxDepth(red, at);
    expect(wobbly.error).toBeGreaterThan(white.error * 1.5);
    expect(wobbly.whiteError).toBeLessThan(wobbly.error);
  });

  test('the series a view shows leaves out masked and non-finite rows', () => {
    const view = {
      axes: { x: 'time', y: 'flux' },
      columns: [
        { id: 'time', values: [1, 2, 3, 4] },
        { id: 'flux', values: [1, NaN, 0.99, 1] },
        {
          id: 'err',
          role: 'uncertainty',
          of: 'flux',
          values: [0.1, 0.1, 0.1, 0.1],
        },
      ],
      masks: [{ rows: [3] }],
    };
    expect(S.seriesOf(view)).toEqual({
      t: [1, 3],
      y: [1, 0.99],
      dy: [0.1, 0.1],
    });
  });
});

// --- Published values -------------------------------------------------------------

describe('the reference run against the literature', () => {
  let run;
  let key;
  const at = (guide, step, p = 'advanced') =>
    key.find(r => r.guide === guide && r.step === step && r.path === p);
  beforeAll(async () => {
    // In Node itself: the fits run ten times slower in Jest's sandbox.
    const out = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(REPO, 'tools/exoplanet-reference.mjs'), '--json'],
        { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }
      )
    );
    key = out.key;
    run = { ...out.run, observations: await R.openTargets(G.TARGETS) };
  }, 120_000);

  test('the committed answer key is what the reference run gives', () => {
    // To a part in ten thousand: the fits' last digits may move with the
    // engine's floating point, and the key is printed to six.
    expect(EXOPLANET_KEY).toHaveLength(key.length);
    key.forEach((row, i) => {
      const { expected, ...rest } = C.rounded(row);
      const { expected: committed, ...kept } = EXOPLANET_KEY[i];
      expect(kept).toEqual(JSON.parse(JSON.stringify(rest)));
      if (typeof expected === 'number')
        expect(Math.abs(committed - expected)).toBeLessThanOrEqual(
          1e-4 * Math.abs(expected)
        );
      else expect(committed).toBe(expected);
    });
  });

  test('every check a guide asks for can be passed by following its steps', () => {
    const failing = key.filter(r => r.passes === false);
    expect(failing).toEqual([]);
    const unanswerable = key.filter(
      r =>
        (r.kind === 'answer' && r.expected === null) ||
        (r.kind === 'choose' &&
          r.expected === null &&
          r.step.startsWith('predict') === false)
    );
    expect(unanswerable).toEqual([]);
  });

  test('the observations are the ones the guides name', () => {
    for (const [id, T] of Object.entries(G.TARGETS))
      expect(run.observations[id].id).toBe(T.observation);
  });

  test('HD 209458: 23 pixels summed, and 1288 cadences flagged', () => {
    expect(at('exo-star', 'aperture').expected).toBe(23);
    expect(at('exo-star', 'quality').expected).toBe(1288);
  });

  test("Kepler-13: A's share from the catalog is within 0.02 of CROWDSAP", () => {
    const share = at('exo-star', 'share').expected;
    const crowd = at('exo-star', 'crowdsap').expected;
    expect(crowd).toBeCloseTo(0.5492385, 7);
    expect(Math.abs(share - crowd)).toBeLessThan(0.02);
    expect(share).toBeGreaterThan(crowd);
  });

  test('the box search finds the period within 2 minutes of Stassun et al. 2017', () => {
    expect(at('exo-find', 'minutes-off').expected).toBeLessThan(2);
  });

  test("the fit's k is within 3 sigma of Torres et al. 2008's 0.12086", () => {
    const fit = run.fits[0];
    const k = fit.parameters.find(p => p.name === 'k');
    const sigma = k.sigmaScaled ?? k.sigma;
    expect(Math.abs(k.value - 0.12086)).toBeLessThan(3 * sigma);
  });

  test("Rp with Stassun's star is within 3 sigma of their 1.39 +- 0.02 RJ", () => {
    const rp = run.fits[1].derived.find(d => d.name === 'Rp');
    const sigma = Math.hypot(rp.sigmaScaled ?? rp.sigma, 0.02);
    expect(Math.abs(rp.value - 1.39)).toBeLessThan(3 * sigma);
    // The star's uncertainty is carried: Rp's sigma is at least the 1.7% of
    // R*'s.
    expect(rp.sigma / rp.value).toBeGreaterThanOrEqual(0.02 / 1.19 - 1e-9);
  });

  test('the correlation the data cannot break is b with a/R*', () => {
    expect(at('exo-fit', 'pair').expected).toBe('b-aRs');
    const fit = run.fits[0];
    const b = fit.free.indexOf('b');
    const a = fit.free.indexOf('aRs');
    expect(fit.correlation[b][a]).toBeLessThan(-0.9);
  });

  test('SAP over PDCSAP depth is within 0.035 of CROWDSAP (2 sigma of the ratio)', () => {
    expect(
      Math.abs(at('exo-dilution', 'ratio').expected - 0.5492385)
    ).toBeLessThan(0.035);
  });

  test("Kepler-13's diluted SAP fit is within 3 sigma of Esteves et al. 2015's k", () => {
    const k = run.fits[3].parameters.find(p => p.name === 'k');
    expect(Math.abs(k.value - 0.087373)).toBeLessThan(
      3 * (k.sigmaScaled ?? k.sigma)
    );
    // And the undiluted fit is the diluted one shrunk by about sqrt(CROWDSAP).
    const raw = run.fits[2].parameters.find(p => p.name === 'k');
    expect(raw.value / k.value).toBeCloseTo(Math.sqrt(0.5492385), 1);
  });

  test('a host B would need a bigger planet than A', () => {
    const kB = at('exo-dilution', 'if-b').expected;
    expect(kB).toBeGreaterThan(0.087373);
    expect(kB).toBeLessThan(0.12);
  });

  test("HD 209458's transits pass both binary tests", () => {
    expect(at('exo-planet', 'odd-even').expected).toBe('equal');
    expect(at('exo-planet', 'secondary').expected).toBe('none');
  });

  test("the simulation's k is within 0.005 of the fitted one", () => {
    expect(
      Math.abs(
        at('exo-planet', 'simulation').expected -
          at('exo-fit', 'ratio').expected
      )
    ).toBeLessThan(0.005);
  });
});

// --- The runner -----------------------------------------------------------------------

describe('the runner', () => {
  test('a typed answer: a point or a comma, and nothing else', () => {
    expect(P.parseAnswer('0.5')).toBe(0.5);
    expect(P.parseAnswer(' 0,558 ')).toBe(0.558);
    expect(P.parseAnswer('3.52e0')).toBe(3.52);
    expect(P.parseAnswer('')).toBeNull();
    expect(P.parseAnswer('about 3')).toBeNull();
    expect(P.parseAnswer('1.2.3')).toBeNull();
    expect(P.answerMatches(0.119, 0.119262, 0.001)).toBe(true);
    expect(P.answerMatches(0.121, 0.119262, 0.001)).toBe(false);
    expect(P.answerMatches(1288, 1288, 0)).toBe(true);
  });

  const hd = { id: G.TARGETS.hd209458.observation };
  test('opened and folded', () => {
    const opened = { kind: 'opened', target: 'hd209458' };
    expect(evaluate(opened, { source: hd }).ok).toBe(true);
    expect(evaluate(opened, { source: { id: 'other' } }).why).toBe('notOpened');
    const folded = { kind: 'folded', target: 'hd209458', period: [3.51, 3.54] };
    expect(evaluate(folded, { source: hd, changes: [] }).why).toBe('noFold');
    expect(
      evaluate(folded, {
        source: hd,
        changes: [{ op: 'fold', period: 1.76 }],
      }).why
    ).toBe('foldPeriod');
    expect(
      evaluate(folded, {
        source: hd,
        changes: [{ op: 'fold', period: 3.524 }],
      }).ok
    ).toBe(true);
  });

  test('measured: the tool, its settings, the observation, and the value', () => {
    const check = G.GUIDES[0].steps.find(s => s.id === 'aperture').check;
    const node = (over = {}) => ({
      tool: 'aperture',
      status: 'current',
      params: { mode: 'bits', bit: 2 },
      input: { observation: G.TARGETS['hd209458-aperture'].observation },
      quantities: [{ id: 'count', value: 23 }],
      ...over,
    });
    expect(evaluate(check, { nodes: [node()] }).ok).toBe(true);
    expect(
      evaluate(check, {
        nodes: [node({ params: { mode: 'bits', bit: 4 } })],
      }).why
    ).toBe('noMeasurement');
    expect(evaluate(check, { nodes: [node({ status: 'stale' })] }).why).toBe(
      'noMeasurement'
    );
    expect(
      evaluate(check, {
        nodes: [node({ quantities: [{ id: 'count', value: 35 }] })],
      }).why
    ).toBe('outside');
  });

  test('fitted: the settings a step asks for, then the value', () => {
    const check = G.GUIDES[2].steps.find(s => s.id === 'radius').check;
    const doc = settings => ({
      data: { observation: hd.id },
      settings,
      results: {
        fit: { parameters: [], derived: [{ name: 'Rp', value: 1.38 }] },
      },
    });
    expect(evaluate(check, { fits: [] }).why).toBe('noFit');
    expect(evaluate(check, { fits: [doc({ dilution: 0 })] }).why).toBe(
      'fitSettings'
    );
    expect(
      evaluate(check, {
        fits: [
          doc({ dilution: 0, stellarRadius: { value: 1.19, sigma: 0.02 } }),
        ],
      }).ok
    ).toBe(true);
    expect(
      evaluate(check, {
        fits: [
          doc({ dilution: 0, stellarRadius: { value: 1.155, sigma: 0.02 } }),
        ],
      }).why
    ).toBe('fitSettings');
  });

  test('a guide walked in the page: an answer checked, a prediction kept', async () => {
    const root = globalThis.document.createElement('details');
    root.open = true;
    const main = globalThis.document.createElement('main');
    main.append(root);
    globalThis.document.body.append(main);
    const messages = {};
    const run = { observations: await R.openTargets(G.TARGETS) };
    const said = [];
    const panel = P.mountGuidePanel(root, {
      t: (id, vars) =>
        (messages[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
          vars && k in vars ? vars[k] : w
        ),
      number: v => String(v),
      registerMessages: parts => Object.assign(messages, parts.en),
      language: () => 'en',
      open: () => {},
      status: text => said.push(text),
      state: {
        source: run.observations.hd209458,
        history: { changes: () => [] },
        fits: [],
      },
      openFixture: async () => run.observations.hd209458,
      lightCurveObservation: async () => null,
      nodes: async () => [],
      showPanel: async () => true,
    });
    await panel.ready;
    expect(root.querySelector('#gdSuite').value).toBe('exoplanet');
    root.querySelector('#gdGuide').value = 'exo-star';
    root.querySelector('#gdPath').value = 'intro';
    root.querySelector('#gdStart').click();
    expect(root.querySelector('#gdStepTitle').textContent).toMatch(
      /^Step 1 of 9/
    );
    const next = () => root.querySelector('#gdNext').click();
    next();
    // Step 2 is open-the-light-curve: it is already open, so a check passes.
    root.querySelector('#gdCheck').click();
    await new Promise(r => globalThis.setTimeout(r, 0));
    expect(panel.snapshot().record.open.passed).toBe(true);
    next();
    // Step 3: the quality flags. A wrong answer first, then the right one.
    root.querySelector('#gdAnswer').value = '12';
    root.querySelector('#gdCheck').click();
    await new Promise(r => globalThis.setTimeout(r, 0));
    expect(panel.snapshot().record.quality.ok).toBe(false);
    expect(root.querySelector('#gdReveal')).not.toBeNull();
    root.querySelector('#gdAnswer').value = '1288';
    root.querySelector('#gdCheck').click();
    await new Promise(r => globalThis.setTimeout(r, 0));
    expect(panel.snapshot().record.quality).toEqual({
      value: 1288,
      ok: true,
      shown: false,
    });
    next();
    next();
    // Step 5: a prediction is recorded, whatever it is.
    root.querySelector('input[value="most"]').checked = true;
    root.querySelector('#gdCheck').click();
    await new Promise(r => globalThis.setTimeout(r, 0));
    expect(panel.snapshot().record['predict-share']).toEqual({
      choice: 'most',
      ok: null,
    });
    expect(said.at(-1)).toBe(EN_GUIDES['gd.check.recorded']);
    main.remove();
  }, 30_000);
});
