/**
 * Stars and their populations: the guided investigations
 * (js/observatory/guides/populations.js, STELLAR_POPULATIONS.md).
 *
 * As tests/exoplanetGuides.test.js does for the first suite:
 *
 *   the guides as data     every step well formed, every word in both
 *                          languages, the advanced path a superset of the
 *                          introductory one, every answer's inputs earlier,
 *                          every adopted value tied to its source
 *   the suite's rules      the ring counts, the velocity window, the median
 *                          and the RR Lyrae distance, on data made here
 *   published values       the reference run on the real packs against the
 *                          literature, each with its stated tolerance
 *   the runner             the suite chosen, a guide walked in the DOM
 *
 * The primitives the suite added (the band index, the curve comparison, the
 * column summary, derived columns, table packs) are tested on their own in
 * tests/stellarTools.test.js. The reference run takes about three seconds.
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
const G = await import('../js/observatory/guides/populations.js');
const X = await import('../js/observatory/guides/exoplanet.js');
const P = await import('../js/observatory/guidePanel.js');
const C = await import('../js/observatory/guides/core.js');
const { TOOLS } = await import('../js/measure/pipeline.js');
const { EN_GUIDES: EN_RUNNER } = await import('../js/i18n/en.guides.js');
const { ES_GUIDES: ES_RUNNER } = await import('../js/i18n/es.guides.js');
const { EN_POPULATIONS } = await import('../js/i18n/en.populations.js');
const { ES_POPULATIONS } = await import('../js/i18n/es.populations.js');
const EN_GUIDES = { ...EN_RUNNER, ...EN_POPULATIONS };
const ES_GUIDES = { ...ES_RUNNER, ...ES_POPULATIONS };
const { RECORDS } = await import('../js/data/spectra/sdssSpectraProvenance.js');
const PHOT = await import('../js/data/observations/sdssNgc2420Photometry.js');
const R = await import('../tools/populations-reference.mjs');
const { POPULATIONS_KEY } = await import('../js/data/populationsAnswerKey.js');

const KINDS = ['read', 'do', 'answer', 'choose'];
const CHECKS = ['opened', 'measured', 'folded', 'changed'];
const SHOWS = [
  'halpha',
  'pipeline',
  'core',
  'rings',
  'rv',
  'neighbors',
  'feh',
  'fits',
  'dustMap',
  'literature',
  'shape',
  'candle',
  'parallax',
  'harmonic',
];

// --- The guides as data ------------------------------------------------------------

describe('the guides as data', () => {
  test('five guides, each id unique, each step id unique within its guide', () => {
    expect(G.GUIDES.map(g => g.id)).toEqual([
      'pop-spectra',
      'pop-cmd',
      'pop-members',
      'pop-age',
      'pop-variable',
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
        if (s.check?.kind === 'measured')
          expect(TOOLS).toHaveProperty([s.check.tool]);
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
        for (const u of s.uses || []) expect(TOOLS).toHaveProperty([u]);
      }
    }
    expect(Object.keys(G.SHOWS).sort()).toEqual([...SHOWS].sort());
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
    need.push('gd.suite.populations.intro');
    const missing = need.filter(k => !(k in EN_GUIDES) || !(k in ES_GUIDES));
    expect(missing).toEqual([]);
    expect(Object.keys(ES_POPULATIONS).sort()).toEqual(
      Object.keys(EN_POPULATIONS).sort()
    );
  });

  test('every message id the suite writes out is in its catalog, and none is left over', () => {
    const src = readFileSync(
      path.join(REPO, 'js/observatory/guides/populations.js'),
      'utf8'
    );
    const ids = [...src.matchAll(/\bt\(\s*'(gd\.[\w.-]+)'/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThan(30);
    expect(ids.filter(id => !(id in EN_GUIDES))).toEqual([]);
    // No id is built at run time, so every one of the suite's show labels is
    // one the source names.
    expect(src).not.toMatch(/\bt\(\s*`/);
    const shown = Object.keys(EN_POPULATIONS).filter(
      k => k.startsWith('gd.show.') && !k.startsWith('gd.show.how.')
    );
    expect(shown.filter(k => !ids.includes(k))).toEqual([]);
    expect(EN_RUNNER).toHaveProperty(['gd.check.noChange']);
    expect(ES_RUNNER).toHaveProperty(['gd.check.noChange']);
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
            observation: () => null,
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

  test("the pipeline's parameters are the spectra's own record", () => {
    for (const [id, s] of Object.entries(G.ADOPTED.pipeline.stars)) {
      const rec = RECORDS[id];
      expect({ id, ...s }).toEqual({
        id,
        type: rec.elodieSpType,
        teff: rec.elodieTEff,
        logg: rec.elodieLogG,
        feh: rec.elodieFeH,
      });
    }
  });

  test("the cluster's center is the pack's, and HD 209458's period the exoplanet suite's", () => {
    expect(G.ADOPTED.ngc2420.center).toEqual({
      ra: PHOT.PACK.object.ra,
      dec: PHOT.PACK.object.dec,
    });
    expect(G.ADOPTED.hd209458).toEqual({
      period: X.ADOPTED.hd209458.period.value,
      ref: X.ADOPTED.hd209458.period.ref,
    });
    expect(G.ADOPTED.suDra.period).toBe(0.66042001);
  });

  test('every adopted value names its source, with a year', () => {
    for (const [k, v] of Object.entries(G.ADOPTED))
      expect({ k, ref: /\d{4}/.test(v.ref) }).toEqual({ k, ref: true });
  });

  test('the E(g − r) the map gives is its E(B − V) by Schlafly & Finkbeiner’s coefficients', () => {
    const { ebv, egr } = G.ADOPTED.dustMap;
    expect(egr).toBeCloseTo((3.303 - 2.285) * ebv, 3);
  });
});

// --- The suite's rules, on data made here ---------------------------------------------

describe("the suite's rules", () => {
  const table = columns => ({
    columns: Object.entries(columns).map(([id, values]) => ({
      id,
      values: Float64Array.from(values),
    })),
  });

  test('a median: the middle value, or the mean of the middle two, leaving out the missing', () => {
    expect(G.median([3, 1, 2])).toBe(2);
    expect(G.median([4, 1, 3, 2])).toBe(2.5);
    expect(G.median([NaN, 5, 7])).toBe(6);
    expect(G.median([])).toBeNull();
  });

  test('the rings: counts to the faint limit, and the field share when the field is even', () => {
    // A uniform field of one star per square arcminute, and nothing else:
    // the share of the inner ring that is field is then one.
    const ra = [];
    const dec = [];
    const g = [];
    const c = G.ADOPTED.ngc2420.center;
    const cos = Math.cos((c.dec * Math.PI) / 180);
    for (let x = -15; x <= 15; x += 1)
      for (let y = -15; y <= 15; y += 1) {
        ra.push(c.ra + x / 60 / cos);
        dec.push(c.dec + y / 60);
        g.push(18);
      }
    const k = G.ringCounts(table({ ra, dec, g }), c);
    expect(k.inner.density).toBeCloseTo(1, 1);
    expect(k.outer.density).toBeCloseTo(1, 1);
    expect(k.fieldShare).toBeCloseTo(1, 1);
    // Stars fainter than the limit are not counted.
    const faint = G.ringCounts(table({ ra, dec, g: g.map(() => 21) }), c);
    expect(faint.inner.n).toBe(0);
  });

  test('the field in a velocity window, from the windows beside it', () => {
    const rv = [];
    for (let v = 0; v < 150; v += 0.5) rv.push(v);
    // Two per km/s everywhere: 40 in a window of 20.
    expect(G.fieldInWindow(table({ rv }), 65, 85)).toBe(40);
  });

  test('an RR Lyrae distance: M_V from the relation, and the extinction taken off', () => {
    expect(G.rrLyraeMv(-1.5)).toBeCloseTo(0.45, 12);
    expect(G.rrLyraeMv(-1.8)).toBeCloseTo(0.45 - 0.214 * 0.3, 12);
    // m - M = 5 log10(d / 10 pc).
    expect(G.distanceOf(10, 0, 0)).toBeCloseTo(1000, 9);
    expect(G.distanceOf(10.3, 0, 0.3)).toBeCloseTo(1000, 9);
  });

  test("the folded light curve's spread: half its 1st to 99th percentile", () => {
    const y = Array.from({ length: 1001 }, (_, i) => i / 1000);
    expect(G.halfRange(y)).toBeCloseTo(0.49, 9);
    expect(G.halfRange([1, 2, 3])).toBeNull();
  });
});

// --- Published values ----------------------------------------------------------------

describe('the reference run against the literature', () => {
  let run;
  let key;
  const at = (guide, step, p = 'advanced') =>
    key.find(r => r.guide === guide && r.step === step && r.path === p);
  beforeAll(async () => {
    // In Node itself: the comparisons run much slower in Jest's sandbox.
    const out = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(REPO, 'tools/populations-reference.mjs'), '--json'],
        { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }
      )
    );
    key = out.key;
    run = { ...out.run, observations: await R.openTargets(G.TARGETS) };
  }, 120_000);

  test('the committed answer key is what the reference run gives', () => {
    expect(POPULATIONS_KEY).toHaveLength(key.length);
    key.forEach((row, i) => {
      const { expected, ...rest } = C.rounded(row);
      const { expected: committed, ...kept } = POPULATIONS_KEY[i];
      expect(kept).toEqual(JSON.parse(JSON.stringify(rest)));
      if (typeof expected === 'number')
        expect(Math.abs(committed - expected)).toBeLessThanOrEqual(
          1e-4 * Math.abs(expected)
        );
      else expect(committed).toBe(expected);
    });
  });

  test('every check a guide asks for can be passed by following its steps', () => {
    expect(key.filter(r => r.passes === false)).toEqual([]);
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

  test("H-alpha weakens from A to M, and the A star's velocity is SDSS's within 5 km/s", async () => {
    expect(at('pop-spectra', 'ew').expected).toBeGreaterThan(5);
    const ew = ['a', 'g', 'k', 'm'].map(
      x => G.halphaOf(run.observations[`sdss-${x}`]).ew
    );
    expect([...ew].sort((a, b) => b - a)).toEqual(ew);
    // SDSS's redshift for the star, as a velocity.
    const z = run.observations['sdss-a'].spectral.redshift;
    expect(
      Math.abs(at('pop-spectra', 'velocity').expected - 299792.458 * z)
    ).toBeLessThan(5);
  });

  test('TiO5 in the M star is deep, as an M1 dwarf’s is (Reid, Hawley & Gizis 1995)', () => {
    const v = at('pop-spectra', 'tio5-value').expected;
    expect(v).toBeGreaterThan(0.55);
    expect(v).toBeLessThan(0.8);
  });

  test('the photometry: no core, a field that dominates, and the saturation limit', () => {
    expect(at('pop-cmd', 'core').expected).toBeLessThan(10);
    const share = at('pop-cmd', 'field').expected;
    expect(share).toBeGreaterThan(0.6);
    expect(share).toBeLessThan(0.85);
    const bright = at('pop-cmd', 'bright').expected;
    expect(bright).toBeGreaterThan(13.5);
    expect(bright).toBeLessThan(14.5);
  });

  test("the members' velocity is Lee et al. 2008b's within 2 km/s", () => {
    expect(
      Math.abs(at('pop-members', 'rv').expected - G.ADOPTED.lee2008.rv)
    ).toBeLessThan(2);
    expect(at('pop-members', 'members').expected).toBeGreaterThan(130);
  });

  test('the members’ [Fe/H] lies between the published values it is set beside', () => {
    const feh = at('pop-members', 'feh').expected;
    expect(feh).toBeGreaterThan(G.ADOPTED.webda.feh);
    expect(feh).toBeLessThan(G.ADOPTED.apogee.feh);
  });

  test("at solar metallicity the distance modulus is Cantat-Gaudin et al.'s within 0.1", () => {
    expect(
      Math.abs(at('pop-age', 'dm-solar').expected - G.ADOPTED.ngc2420.dm)
    ).toBeLessThan(0.1);
    // A metal-poorer isochrone gives an older, nearer cluster.
    expect(at('pop-age', 'age-mid').expected).toBeGreaterThan(2.5);
    expect(at('pop-age', 'dm-mid').expected).toBeLessThan(
      at('pop-age', 'dm-solar').expected
    );
  });

  test("the dust map's reddening makes the same metallicity younger", () => {
    expect(at('pop-age', 'age-map').expected).toBeLessThan(
      at('pop-age', 'age-mid').expected
    );
  });

  test("SU Dra's period is Monson et al. 2017's within its error, three times over", () => {
    const node = run.nodes.find(
      n => n.observation === G.TARGETS['su-dra'].observation
    );
    const err = 1.1e-4;
    expect(
      Math.abs(
        at('pop-variable', 'period-value').expected - G.ADOPTED.suDra.period
      )
    ).toBeLessThan(3 * err);
    expect(node.warnings).toContain('errorAssumesSinusoid');
  });

  test('the standard candle and the parallax agree within the parallax’s error', () => {
    const d = at('pop-variable', 'candle').expected;
    const s = G.ADOPTED.suDra;
    expect(Math.abs(d - 1000 / s.parallax)).toBeLessThan(
      (1000 * s.parallaxSigma) / s.parallax ** 2
    );
    expect(at('pop-variable', 'parallax').expected).toBe('agree');
  });

  test("a period search on HD 209458's transit finds half the orbit", () => {
    const found = at('pop-variable', 'transit').expected;
    expect(G.ADOPTED.hd209458.period / found).toBeCloseTo(2, 2);
  });
});

// --- The runner -----------------------------------------------------------------------

describe('the runner', () => {
  test('a guide of the second suite walked in the page: a change checked, a count answered', async () => {
    const root = globalThis.document.createElement('details');
    root.open = true;
    const main = globalThis.document.createElement('main');
    main.append(root);
    globalThis.document.body.append(main);
    const messages = {};
    const photometry = (
      await R.openTargets({ photometry: G.TARGETS.photometry })
    ).photometry;
    const changes = [];
    const panel = P.mountGuidePanel(root, {
      t: (id, vars) =>
        (messages[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
          vars && k in vars ? vars[k] : w
        ),
      number: v => String(v),
      registerMessages: parts => Object.assign(messages, parts.en),
      open: () => {},
      status: () => {},
      state: {
        source: photometry,
        history: { changes: () => changes },
        fits: [],
      },
      openFixture: async () => photometry,
      lightCurveObservation: async () => null,
      nodes: async () => [],
      showPanel: async () => true,
    });
    await panel.ready;
    const suite = root.querySelector('#gdSuite');
    suite.value = 'populations';
    suite.dispatchEvent(new globalThis.Event('change'));
    await new Promise(r => globalThis.setTimeout(r, 50));
    root.querySelector('#gdGuide').value = 'pop-cmd';
    root.querySelector('#gdPath').value = 'intro';
    root.querySelector('#gdStart').click();
    expect(root.querySelector('#gdStepTitle').textContent).toMatch(
      /^Step 1 of 11/
    );
    const next = () => root.querySelector('#gdNext').click();
    const check = async () => {
      root.querySelector('#gdCheck').click();
      await new Promise(r => globalThis.setTimeout(r, 0));
    };
    next();
    await check();
    expect(panel.snapshot().record.open.passed).toBe(true);
    next();
    // The color: not made yet, then made.
    await check();
    expect(panel.snapshot().record.color).toBeUndefined();
    changes.push({
      op: 'derive',
      id: 'g-r-1',
      name: 'g - r',
      terms: [
        { column: 'g', factor: 1 },
        { column: 'r', factor: -1 },
      ],
    });
    await check();
    expect(panel.snapshot().record.color.passed).toBe(true);
    next();
    next();
    changes.push({
      op: 'derive',
      id: 'distance-2',
      name: 'distance',
      separation: { ra: 'ra', dec: 'dec', center: [114.602, 21.575] },
    });
    await check();
    expect(panel.snapshot().record.radius.passed).toBe(true);
    next();
    // The core: the stars within 3 arcminutes.
    root.querySelector('#gdAnswer').value = String(
      POPULATIONS_KEY.find(r => r.guide === 'pop-cmd' && r.step === 'core')
        .expected
    );
    await check();
    expect(panel.snapshot().record.core.ok).toBe(true);
    main.remove();
  }, 30_000);
});
