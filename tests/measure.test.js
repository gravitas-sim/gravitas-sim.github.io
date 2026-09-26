import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

// =============================================================================
// The measurement pipeline's numbers, against truth and against the sky
// -----------------------------------------------------------------------------
// Two kinds of evidence for every tool in js/measure/:
//   - synthetic truth: data made with a known answer and seeded noise, many
//     times, so the tool's answer is right AND its stated uncertainty is the
//     spread of its answers (the pulls have unit width);
//   - cited reference cases, on the curated data the Observatory ships:
//       SU Dra's period from 47 Gaia DR3 epochs  (Monson et al. 2017)
//       HD 209458 b's period from TESS sector 56  (Knutson et al. 2007)
//       SDSS Balmer-line velocities               (SDSS DR18's own redshifts)
//       the TESS optimal aperture                 (NPIXSAP, and the star)
//       GWTC masses                               (the GWOSC catalog values)
// And the pipeline itself: digests, staleness, the saved document, reading it
// back to the same numbers, and the migrations it accepts and refuses.
// =============================================================================

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const P = await import('../js/measure/periodogram.js');
const L = await import('../js/measure/spectrumLine.js');
const A = await import('../js/measure/aperture.js');
const T = await import('../js/measure/tableOps.js');
const pipe = await import('../js/measure/pipeline.js');
const { openFixture } = await import('../js/observatory/fixtures.js');
const W = await import('../js/observatory/wcs.js');

/** A seeded uniform generator (mulberry32) and a normal one from it. */
function uniform(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(seed) {
  const u = uniform(seed);
  return () =>
    Math.sqrt(-2 * Math.log(u() || 1e-300)) * Math.cos(2 * Math.PI * u());
}
const meanSd = xs => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return [m, Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)];
};
const rejectsWith = async (promise, code) => {
  let caught = null;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  expect(caught?.code).toBe(code);
};

// --- Period search ---------------------------------------------------------------------

describe('the period search (generalized Lomb-Scargle)', () => {
  test('recovers a sinusoid, and its stated error is the spread of its answers', async () => {
    const truth = 0.66042;
    const pulls = [];
    for (let s = 1; s <= 40; s++) {
      const u = uniform(s);
      const g = normal(1000 + s);
      const t = Array.from({ length: 60 }, () => u() * 900).sort(
        (a, b) => a - b
      );
      const y = t.map(
        x => 10 + 0.4 * Math.sin((2 * Math.PI * x) / truth + 1) + 0.05 * g()
      );
      const r = await P.searchPeriod(
        { t, y, dy: t.map(() => 0.05) },
        { minPeriod: 0.3, maxPeriod: 1.2 }
      );
      pulls.push((r.period - truth) / r.periodError);
    }
    const [m, sd] = meanSd(pulls);
    expect(Math.abs(m)).toBeLessThan(0.4);
    expect(sd).toBeGreaterThan(0.75);
    expect(sd).toBeLessThan(1.25);
  }, 60_000);

  test('its false-alarm probability is conservative on noise alone (Baluev 2008 is a bound)', async () => {
    const faps = [];
    for (let s = 1; s <= 150; s++) {
      const u = uniform(5000 + s);
      const g = normal(9000 + s);
      const t = Array.from({ length: 50 }, () => u() * 100).sort(
        (a, b) => a - b
      );
      const r = await P.searchPeriod(
        { t, y: t.map(() => g()) },
        { minPeriod: 0.5, maxPeriod: 50 }
      );
      faps.push(r.falseAlarm);
    }
    for (const level of [0.1, 0.2, 0.5]) {
      const rate = faps.filter(f => f <= level).length / faps.length;
      // At most the nominal rate, allowing the binomial scatter of 150 trials.
      expect(rate).toBeLessThanOrEqual(
        level + 2 * Math.sqrt((level * (1 - level)) / 150)
      );
    }
  }, 60_000);

  test('ln Γ is right where it is checkable', () => {
    expect(P.lnGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(P.lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
    expect(P.lnGamma(100)).toBeCloseTo(359.1342053695754, 9);
  });

  test('refuses by name, before it spends the work', async () => {
    const t = [1, 2, 3, 4, 5, 6];
    const y = [1, 0, 1, 0, 1, 0];
    await rejectsWith(
      P.searchPeriod({ t: [1, 2], y: [1, 2] }, { minPeriod: 1, maxPeriod: 2 }),
      'tooFew'
    );
    await rejectsWith(
      P.searchPeriod({ t, y }, { minPeriod: 2, maxPeriod: 1 }),
      'range'
    );
    await rejectsWith(
      P.searchPeriod(
        { t: [...t, NaN], y: [...y, 1] },
        { minPeriod: 0.5, maxPeriod: 2 }
      ),
      'notFinite'
    );
    await rejectsWith(
      P.searchPeriod({ t, y }, { minPeriod: 1e-5, maxPeriod: 5 }),
      'tooLarge'
    );
  });

  test('reports progress and stops when it is canceled', async () => {
    const u = uniform(7);
    const t = Array.from({ length: 4000 }, () => u() * 1000).sort(
      (a, b) => a - b
    );
    const y = t.map(x => Math.sin(x));
    const c = new AbortController();
    const seen = [];
    const run = P.searchPeriod(
      { t, y },
      {
        minPeriod: 0.5,
        maxPeriod: 50,
        signal: c.signal,
        onProgress: f => {
          seen.push(f);
          if (seen.length === 2) c.abort();
        },
      }
    );
    await rejectsWith(run, 'canceled');
    expect(seen[1]).toBeGreaterThan(seen[0]);
    expect(seen.at(-1)).toBeLessThan(1);
  }, 60_000);
});

describe('the box search (BLS)', () => {
  test('recovers a synthetic transit: period, epoch, duration and depth', async () => {
    const g = normal(42);
    const truth = { P: 2.7, epoch: 0.9, D: 0.12, depth: 0.01 };
    const t = [];
    const y = [];
    for (let x = 0; x < 27; x += 0.0139) {
      t.push(x);
      const ph = (((((x - truth.epoch) / truth.P + 0.5) % 1) + 1) % 1) - 0.5;
      y.push(
        1 -
          (Math.abs(ph * truth.P) < truth.D / 2 ? truth.depth : 0) +
          0.002 * g()
      );
    }
    const r = await P.searchBox(
      { t, y },
      { minPeriod: 2, maxPeriod: 4, durations: [0.08, 0.12, 0.16] }
    );
    expect(r.period).toBeCloseTo(truth.P, 2);
    const phase =
      (((((r.epoch - truth.epoch) / truth.P + 0.5) % 1) + 1) % 1) - 0.5;
    expect(Math.abs(phase * truth.P)).toBeLessThan(0.02);
    expect(r.duration).toBe(0.12);
    expect(r.depth).toBeGreaterThan(0.008);
    expect(r.depth).toBeLessThan(0.012);
    expect(r.sde).toBeGreaterThan(7);
    expect(r.warnings.map(w => w.code)).toContain('noPeriodError');
  }, 60_000);
});

// --- Cited reference cases, on curated data ------------------------------------------

describe('reference cases on the data the Observatory ships', () => {
  test('SU Dra from 47 Gaia DR3 epochs: 0.66042001 d (Monson et al. 2017, AJ 153, 96)', async () => {
    const cds = await import('../js/archive/cds.js');
    const { toObservation } = await import('../js/archive/gaiaEpochs.js');
    const bytes = new Uint8Array(
      readFileSync('tests/fixtures/archive/gaia-epphot-su-dra.vot')
    );
    const answer = await cds.readAnswer(
      { bytes, url: 'u' },
      { url: 'u', retrieved: '2026-09-26T04:40:20.000Z' }
    );
    const o = toObservation(answer, { source: '1058066262817534336' });
    const n = await pipe.runNode(o, {
      id: 'm1',
      tool: 'period',
      params: { minPeriod: 0.3, maxPeriod: 1.2, oversample: 10 },
      at: 0,
    });
    const period = n.quantities.find(q => q.id === 'period');
    expect(Math.abs(period.value - 0.66042001) / period.error).toBeLessThan(2);
    expect(n.quantities.find(q => q.id === 'falseAlarm').value).toBeLessThan(
      1e-6
    );
  });

  test('HD 209458 b from TESS sector 56: 3.52474859 d (Knutson et al. 2007, ApJ 655, 564)', async () => {
    const o = await openFixture('tess-light-curve');
    const box = await pipe.runNode(o, {
      id: 'm1',
      tool: 'box',
      params: { minPeriod: 1, maxPeriod: 10, durations: [0.08, 0.12, 0.16] },
      at: 0,
    });
    const q = id => box.quantities.find(x => x.id === id).value;
    // One sector: seven transits in 20-minute bins.
    expect(Math.abs(q('period') - 3.52474859)).toBeLessThan(0.002);
    // (Rp/Rs)^2 is about 1.5% for this planet; a box is shallower than the
    // limb-darkened transit it stands in for.
    expect(q('depth')).toBeGreaterThan(0.011);
    expect(q('depth')).toBeLessThan(0.016);
    expect(q('sde')).toBeGreaterThan(7);
    // The same light curve, searched for a sinusoid, finds half the period:
    // why a transit needs the box.
    const gls = await pipe.runNode(o, {
      id: 'm2',
      tool: 'period',
      params: { minPeriod: 1, maxPeriod: 10, oversample: 5 },
      at: 0,
    });
    expect(Math.abs(gls.quantities[0].value - 3.52474859 / 2)).toBeLessThan(
      0.01
    );
  }, 120_000);

  test("SDSS Balmer lines: the A star's velocity is SDSS's own redshift, and the lines weaken A > G > K", async () => {
    const c = 299792.458;
    const H_ALPHA = 6564.61; // vacuum, Angstrom (NIST)
    const H_BETA = 4862.68;
    const measure = async (id, rest, half, gap, side) => {
      const o = await openFixture(id);
      const z = o.spectral.redshift;
      const center = rest * (1 + z);
      const n = await pipe.runNode(o, {
        id: 'm1',
        tool: 'line',
        params: {
          line: [center - half, center + half],
          blue: [center - gap - side, center - gap],
          red: [center + gap, center + gap + side],
          rest,
          restMedium: 'vacuum',
        },
        at: 0,
      });
      const q = k => n.quantities.find(x => x.id === k);
      return {
        cz: c * z,
        v: q('velocity'),
        ew: q('ew'),
        kinds: n.quantities.map(x => [x.id, x.kind]),
      };
    };
    const aHa = await measure('sdss-a', H_ALPHA, 20, 25, 40);
    const aHb = await measure('sdss-a', H_BETA, 15, 20, 30);
    const gHa = await measure('sdss-g', H_ALPHA, 20, 25, 40);
    const kHa = await measure('sdss-k', H_ALPHA, 20, 25, 40);
    for (const m of [aHa, aHb, gHa])
      expect(Math.abs(m.v.value - m.cz) / m.v.error).toBeLessThan(2);
    expect(aHa.ew.value).toBeGreaterThan(gHa.ew.value + 3 * gHa.ew.error);
    expect(gHa.ew.value).toBeGreaterThan(kHa.ew.value);
    // The rest wavelength is assumed; the velocity derived; the error, from
    // the continuum's scatter because SDSS's bundle carries none, assumed.
    expect(Object.fromEntries(aHa.kinds)).toMatchObject({
      ew: 'measured',
      center: 'measured',
      rest: 'assumed',
      velocity: 'derived',
    });
    expect(aHa.ew.errorKind).toBe('assumed');
  });

  test("the TESS optimal aperture: NPIXSAP's 23 pixels, centered within a pixel of HD 209458", async () => {
    const o = await openFixture('tess-aperture');
    const [sx, sy] = W.pixelScale(o.image.wcs);
    const n = await pipe.runNode(
      o,
      { id: 'm1', tool: 'aperture', params: { mode: 'bits', bit: 2 }, at: 0 },
      { skyOf: W.skyOf, pixelScale: W.pixelScale }
    );
    const q = k => n.quantities.find(x => x.id === k)?.value;
    expect(q('count')).toBe(23);
    const sep = W.separation({ ra: q('ra'), dec: q('dec') }, o.object) * 3600;
    expect(sep).toBeLessThan(Math.max(sx, sy));
    expect(q('skyArea')).toBeCloseTo(23 * sx * sy, 6);
    // In FITS pixels, as the image's own columns count them: the centroid's
    // sky position is the WCS's at that pixel.
    const at = W.skyOf(o.image.wcs, q('centroidX'), q('centroidY'));
    expect(at.ra).toBeCloseTo(q('ra'), 10);
    // A circle around a pixel, and a masked pixel left out.
    const one = await pipe.runNode(
      { ...o, masks: [{ id: 'r', label: 'x', source: 'reader', rows: [0] }] },
      {
        id: 'm2',
        tool: 'aperture',
        params: { mode: 'bits', bit: 1, x: 1, y: 1, r: 0.5 },
        at: 0,
      }
    );
    expect(one.quantities[0].value).toBe(0);
  });

  test('GWTC masses: a secondary above 3 Msun leaves the three black-hole pairs, and GW170817 has no total mass', async () => {
    const o = await openFixture('gwosc-events');
    const names = o.columns.find(c => c.id === 'event').values;
    const r = T.filterRows(o, [
      { column: 'mass_2_source', op: '>', value: 3, unit: 'Msun' },
    ]);
    expect(r.keep.map(i => names[i])).toEqual([
      'GW150914',
      'GW190412',
      'GW190521',
    ]);
    const total = T.filterRows(o, [
      { column: 'total_mass_source', op: '>', value: 0, unit: 'Msun' },
    ]);
    expect(total.missing.total_mass_source).toBe(1);
    expect(total.keep.map(i => names[i])).not.toContain('GW170817');
  });
});

// --- Line, aperture and tables, against synthetic truth --------------------------------

describe('a spectral line, against synthetic truth', () => {
  const lam0 = 6564.61;
  const center = lam0 * (1 + 5e-4);
  const spectrum = (seed, withErrors) => {
    const g = normal(seed);
    const x = [];
    const y = [];
    for (let l = 6450; l <= 6680; l += 1.5) {
      const cont = 100 + 0.05 * (l - 6564);
      x.push(l);
      y.push(cont * (1 - 0.4 * Math.exp(-0.5 * ((l - center) / 4) ** 2)) + g());
    }
    return { x, y, dy: withErrors ? x.map(() => 1) : null };
  };
  const windows = {
    blue: [6470, 6520],
    line: [center - 25, center + 25],
    red: [6610, 6660],
    rest: lam0,
  };

  test.each([true, false])(
    'EW and center recovered, errors calibrated (errors given: %s)',
    withErrors => {
      const truthEw = 0.4 * 4 * Math.sqrt(2 * Math.PI);
      const pe = [];
      const pc = [];
      for (let s = 1; s <= 120; s++) {
        const r = L.measureLine(spectrum(s, withErrors), windows);
        pe.push((r.ew - truthEw) / r.ewError);
        pc.push((r.center - center) / r.centerError);
      }
      const [me, se] = meanSd(pe);
      const [mc, sc] = meanSd(pc);
      expect(Math.abs(me)).toBeLessThan(0.3);
      expect(Math.abs(mc)).toBeLessThan(0.3);
      // The EW's stated error is slightly conservative, never optimistic.
      expect(se).toBeGreaterThan(0.75);
      expect(se).toBeLessThan(1.15);
      expect(sc).toBeGreaterThan(0.8);
      expect(sc).toBeLessThan(1.2);
    }
  );

  test('refuses windows that overlap or hold too little', () => {
    const d = spectrum(1, true);
    expect(() => L.measureLine(d, { ...windows, blue: [6470, 6560] })).toThrow(
      expect.objectContaining({ code: 'order' })
    );
    expect(() => L.measureLine(d, { ...windows, blue: [6470, 6471] })).toThrow(
      expect.objectContaining({ code: 'continuumPoints' })
    );
    expect(() =>
      L.measureLine(d, { ...windows, line: [center - 1, center + 1] })
    ).toThrow(expect.objectContaining({ code: 'linePoints' }));
  });
});

describe('an aperture, against a synthetic star', () => {
  test('net flux and centroid recovered, errors calibrated, the edge measured exactly', () => {
    const Wd = 41;
    const F = 5000;
    const sig = 1.5;
    const pn = [];
    const px = [];
    let area = 0;
    for (let k = 1; k <= 80; k++) {
      const g = normal(k);
      const u = uniform(777 + k);
      const x0 = 20 + u() - 0.5;
      const y0 = 20 + u() - 0.5;
      const values = new Float64Array(Wd * Wd);
      for (let j = 0; j < Wd; j++)
        for (let i = 0; i < Wd; i++) {
          let v = 0;
          for (let a = 0; a < 4; a++)
            for (let b = 0; b < 4; b++) {
              const uu = i - 0.5 + (a + 0.5) / 4;
              const ww = j - 0.5 + (b + 0.5) / 4;
              v +=
                Math.exp(-((uu - x0) ** 2 + (ww - y0) ** 2) / (2 * sig * sig)) /
                16;
            }
          values[j * Wd + i] =
            200 + (F * v) / (2 * Math.PI * sig * sig) + 10 * g();
        }
      const r = A.measureFlux(
        { width: Wd, height: Wd, values },
        { x: x0, y: y0, r: 6, rIn: 9, rOut: 15 }
      );
      const truth = F * (1 - Math.exp(-36 / (2 * sig * sig)));
      pn.push((r.net - truth) / r.netError);
      px.push((r.centroid.x - x0) / r.centroid.xError);
      area = r.area;
    }
    const [mn, sn] = meanSd(pn);
    const [mx, sx] = meanSd(px);
    expect(Math.abs(mn)).toBeLessThan(0.35);
    expect(sn).toBeGreaterThan(0.8);
    expect(sn).toBeLessThan(1.2);
    expect(Math.abs(mx)).toBeLessThan(0.35);
    expect(sx).toBeGreaterThan(0.8);
    expect(sx).toBeLessThan(1.2);
    expect(Math.abs(area / (Math.PI * 36) - 1)).toBeLessThan(0.002);
  });

  test('refuses an annulus inside the aperture, a center off the image, a bit that is not a bit', () => {
    const img = { width: 10, height: 10, values: new Float64Array(100) };
    expect(() =>
      A.measureFlux(img, { x: 5, y: 5, r: 3, rIn: 2, rOut: 4 })
    ).toThrow(expect.objectContaining({ code: 'annulus' }));
    expect(() =>
      A.measureFlux(img, { x: 50, y: 5, r: 3, rIn: 4, rOut: 5 })
    ).toThrow(expect.objectContaining({ code: 'outside' }));
    expect(() => A.measureBits(img, { bit: 3 })).toThrow(
      expect.objectContaining({ code: 'bit' })
    );
  });
});

describe('tables: a filter that knows units, a match that pairs once', () => {
  const colOf = (id, values, unit = 'deg') => ({
    id,
    name: id,
    unit,
    role: 'value',
    values,
  });

  test('a sky match finds every true partner and no decoy, one to one', () => {
    const u = uniform(3);
    const bra = [];
    const bde = [];
    for (let i = 0; i < 2000; i++) {
      bra.push(u() * 360);
      bde.push((Math.asin(2 * u() - 1) * 180) / Math.PI);
    }
    const ara = [];
    const ade = [];
    const truth = [];
    while (truth.length < 300) {
      const j = Math.floor(u() * 2000);
      if (truth.includes(j)) continue;
      truth.push(j);
      const d = (u() * 0.8) / 3600;
      const th = u() * 2 * Math.PI;
      ade.push(bde[j] + d * Math.sin(th));
      ara.push(
        bra[j] + (d * Math.cos(th)) / Math.cos((bde[j] * Math.PI) / 180)
      );
    }
    for (let k = 0; k < 60; k++) {
      ara.push(u() * 360);
      ade.push(u() * 180 - 90);
    }
    const r = T.crossMatch(
      { columns: [colOf('ra', ara), colOf('dec', ade)] },
      { columns: [colOf('ra', bra), colOf('dec', bde)] },
      { by: 'sky', a: ['ra', 'dec'], b: ['ra', 'dec'], radiusArcsec: 1 }
    );
    expect(r.pairs).toHaveLength(300);
    expect(r.pairs.every(p => truth[p.a] === p.b)).toBe(true);
    expect(r.unmatchedA).toBe(60);
    expect(new Set(r.pairs.map(p => p.b)).size).toBe(300);
  });

  test('a value match pairs nearest first, and counts the rows that had a choice', () => {
    const a = { columns: [colOf('t', [1.0, 1.05, 5], 's')] };
    const b = { columns: [colOf('t', [1.02, 9], 's')] };
    const r = T.crossMatch(a, b, {
      by: 'value',
      a: 't',
      b: 't',
      tolerance: 0.1,
    });
    // 1.02 is 0.02 from 1.0 and 0.03 from 1.05: 1.0 gets it.
    expect(r.pairs).toEqual([
      { a: 0, b: 0, distance: expect.closeTo(0.02, 12) },
    ]);
    expect(r.unmatchedA).toBe(2);
    expect(() =>
      T.crossMatch(
        a,
        { columns: [colOf('t', [1], 'd')] },
        { by: 'value', a: 't', b: 't', tolerance: 1 }
      )
    ).toThrow(expect.objectContaining({ code: 'unit' }));
  });

  test('separations are right across the pole and the zero of right ascension', () => {
    expect(T.separationDeg(10, 20, 10, 20 + 1 / 3600) * 3600).toBeCloseTo(1, 9);
    expect(T.separationDeg(0, 89.9999, 180, 89.9999) * 3600).toBeCloseTo(
      0.72,
      6
    );
    expect(T.separationDeg(359.9999, 0, 0.0001, 0) * 3600).toBeCloseTo(0.72, 6);
  });
});

// --- The pipeline ------------------------------------------------------------------------

describe('the pipeline: digests, staleness, the document, reading it back', () => {
  let o;
  beforeAll(async () => {
    o = await openFixture('tess-light-curve');
  });

  test('the content digest is the data: a title does not move it, a value does', async () => {
    const d = await pipe.contentDigest(o);
    expect(await pipe.contentDigest({ ...o, title: 'another' })).toBe(d);
    const values = Float64Array.from(o.columns[1].values);
    values[0] += 1e-9;
    const moved = {
      ...o,
      columns: o.columns.map((c, i) => (i === 1 ? { ...c, values } : c)),
    };
    expect(await pipe.contentDigest(moved)).not.toBe(d);
  });

  test('a node records its tool, version, parameters, position and input, and is stale when its input goes', async () => {
    const n = await pipe.runNode(o, {
      id: 'm1',
      tool: 'box',
      params: { minPeriod: 2, maxPeriod: 5, durations: [0.12] },
      at: 0,
    });
    expect(n).toMatchObject({
      tool: 'box',
      version: P.VERSION,
      at: 0,
      status: 'current',
      input: { observation: o.id },
    });
    const d = await pipe.contentDigest(o);
    expect(
      await pipe.staleness([n], async at => (at === 0 ? d : null))
    ).toEqual(['current']);
    expect(await pipe.staleness([n], async () => 'something else')).toEqual([
      'stale',
    ]);
    expect(
      await pipe.staleness([{ ...n, at: 3 }], async at => (at <= 0 ? d : null))
    ).toEqual(['stale']);
  });

  test('a tool that cannot measure this kind, or fails, says so in the node', async () => {
    await expect(
      pipe.runNode(o, { id: 'm1', tool: 'line', params: {}, at: 0 })
    ).rejects.toMatchObject({ code: 'kind' });
    const bad = await pipe.runNode(o, {
      id: 'm1',
      tool: 'period',
      params: { minPeriod: 5, maxPeriod: 1 },
      at: 0,
    });
    expect(bad).toMatchObject({ status: 'failed', error: { code: 'range' } });
    expect(pipe.toolsFor(o)).toEqual(['period', 'box']);
  });

  test('saved, read back and recomputed, every node gives the number it saved', async () => {
    const { observationJson } = await import('../js/observatory/export.js');
    const { read } = await import('../js/observatory/import.js');
    const { replay } = await import('../js/observatory/transforms.js');
    const changes = [{ op: 'normalize', column: 'flux' }];
    const view = replay(o, changes).o;
    const nodes = [
      await pipe.runNode(view, {
        id: 'm1',
        tool: 'box',
        params: { minPeriod: 2, maxPeriod: 5, durations: [0.12] },
        at: 1,
      }),
    ];
    const text = pipe.pipelineJson({
      source: o,
      digest: await pipe.contentDigest(o),
      workspace: observationJson(view, { source: o, changes }),
      nodes,
    });
    expect(text).toBe(
      pipe.pipelineJson({
        source: o,
        digest: await pipe.contentDigest(o),
        workspace: observationJson(view, { source: o, changes }),
        nodes,
      })
    );
    const back = pipe.readPipeline(text);
    expect(back.ok).toBe(true);
    const ws = read(back.workspaceText);
    expect(ws.ok).toBe(true);
    expect(await pipe.contentDigest(ws.observation)).toBe(back.digest);
    const again = await pipe.runNode(
      replay(ws.observation, ws.changes.slice(0, back.nodes[0].at)).o,
      back.nodes[0]
    );
    expect(pipe.sameResult(back.nodes[0], again)).toBe(true);
    // A number that moved is a different result.
    const edited = {
      ...back.nodes[0],
      quantities: back.nodes[0].quantities.map((q, i) =>
        i ? q : { ...q, value: q.value + 1e-6 }
      ),
    };
    expect(pipe.sameResult(edited, again)).toBe(false);
  });

  test('migrations: an Observatory save opens as a pipeline; a newer format or an unknown tool is refused', async () => {
    const { observationJson } = await import('../js/observatory/export.js');
    const save = observationJson(o, { source: o, changes: [] });
    expect(pipe.readPipeline(save)).toMatchObject({
      ok: true,
      migrated: 'observation',
      nodes: [],
    });
    const doc = JSON.parse(
      pipe.pipelineJson({ source: o, digest: 'x', workspace: save, nodes: [] })
    );
    expect(
      pipe.readPipeline(JSON.stringify({ ...doc, formatVersion: 2 }))
    ).toMatchObject({ ok: false, code: 'newer' });
    expect(
      pipe.readPipeline(
        JSON.stringify({
          ...doc,
          nodes: [{ id: 'm1', tool: 'astrology', at: 0 }],
        })
      )
    ).toMatchObject({ ok: false, code: 'unknownTool' });
    expect(pipe.readPipeline('{')).toMatchObject({
      ok: false,
      code: 'notJson',
    });
    expect(pipe.readPipeline('{"format":"other"}')).toMatchObject({
      ok: false,
      code: 'notPipeline',
    });
  });

  test('every workspace change is classed, with how it treats uncertainty', async () => {
    const { OPS } = await import('../js/observatory/transforms.js');
    expect(Object.keys(pipe.CHANGE_CLASS).sort()).toEqual(
      Object.keys(OPS).sort()
    );
  });
});
