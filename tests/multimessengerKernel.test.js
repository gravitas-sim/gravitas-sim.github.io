// =============================================================================
// The multi-messenger kernel's public contract (Roadmap III, Prompt 244)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/multimessenger/thresholds.json, run by
// tools/multimessenger-validate.mjs and held in tests/multimessengerResults.test.js.
// These tests hold the contracts a caller relies on: the time systems, the bound with
// its assumption and its refusals, the vocabulary, the host rule, the kilonova
// model's domain, the detection rule, the synthetic data's determinism, and the
// readers and legs that wait for authentic files (run here against SYNTHETIC files
// in a temporary directory, never against a real one).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as K from '../js/kernels/multimessenger/index.js';
import { EVENTS } from '../js/data/gw/gwoscEvents.js';
import {
  checkLeapList,
  parseLeapSecondsList,
  parsePhotometryCsv,
} from '../tools/multimessenger-authentic.mjs';
import { runValidation } from '../tools/multimessenger-validate.mjs';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/multimessenger/thresholds.json');
const ORACLE = read('tests/fixtures/multimessenger/oracle-results.json');
const table = K.makeLeapTable(THR.synthetic.leapTable);
const code = fn => {
  try {
    fn();
  } catch (e) {
    return e.code;
  }
  return null;
};

describe('time systems', () => {
  test('GPS zero is the GPS epoch and a day is 86400 s away', () => {
    const t = K.toT72({ value: '1980-01-06T00:00:00', system: 'UTC' }, table);
    expect(K.fromT72(t, 'GPS', table)).toBe(0);
    expect(
      K.fromT72(
        K.toT72({ value: '1980-01-07T00:00:00Z', system: 'UTC' }, table),
        'GPS',
        table
      )
    ).toBe(86400);
  });
  test('a leap second is one second long on the continuous scale', () => {
    const at = s => K.toT72({ value: s, system: 'UTC' }, table);
    expect(at('1999-12-31T23:59:60') - at('1999-12-31T23:59:59')).toBe(1);
    expect(at('2000-01-01T00:00:00') - at('1999-12-31T23:59:60')).toBe(1);
  });
  test('MJD is refused on a leap-second day and unknown systems are refused', () => {
    expect(
      code(() => K.toT72({ value: 51543.5, system: 'MJD_UTC' }, table))
    ).toBe('mjd-leap-day');
    expect(code(() => K.toT72({ value: 1, system: 'TT' }, table))).toBe(
      'unknown-system'
    );
  });
  test('a leap table must satisfy the definition of GPS and ascend', () => {
    const bad = THR.synthetic.leapTable.map(e =>
      e.from === '1980-01-01' ? { ...e, taiMinusUtc: 18 } : e
    );
    expect(code(() => K.makeLeapTable(bad))).toBe('bad-leap-table');
    expect(
      code(() => K.makeLeapTable([{ from: '1972-01-01', taiMinusUtc: 10 }]))
    ).toBe('bad-leap-table');
    expect(
      code(() =>
        K.makeLeapTable([
          { from: '1972-01-01', taiMinusUtc: 10 },
          { from: '1980-01-01', taiMinusUtc: 19 },
          { from: '1979-01-01', taiMinusUtc: 20 },
        ])
      )
    ).toBe('bad-leap-table');
  });
  test('the delay between two systems is the difference of the instants', () => {
    const d = K.delaySeconds(
      { value: 1000, system: 'GPS' },
      {
        value: K.fromT72(
          K.toT72({ value: 1000, system: 'GPS' }, table) + 1.74,
          'FERMI_MET',
          table
        ),
        system: 'FERMI_MET',
      },
      table
    );
    expect(d).toBeCloseTo(1.74, 6);
  });
});

describe('the speed-of-gravity bound states its assumption', () => {
  const base = {
    delay: 1.74,
    distance: 40,
    emissionDelay: { min: 0, max: 10 },
  };
  test('an assumption is required and returned', () => {
    expect(code(() => K.speedBound({ delay: 1, distance: 40 }))).toBe(
      'assumption-required'
    );
    const r = K.speedBound(base);
    expect(r.assumption.emissionDelayMaxS).toBe(10);
    expect(K.describeBound(r)).toMatch(
      /assuming photons emitted between 0 s and 10 s/
    );
  });
  test('a distance interval uses its lower end', () => {
    const r = K.speedBound({
      ...base,
      distance: { value: 40, lower: -15, upper: 7 },
    });
    expect(r.distanceMpc).toBe(25);
    expect(r.distanceRule).toBe('lower-end');
  });
  test('the bound is wider for a larger assumed maximum delay, never narrower', () => {
    const w = max => {
      const r = K.speedBound({ ...base, emissionDelay: { min: 0, max } });
      return r.upper - r.lower;
    };
    expect(w(20)).toBeGreaterThan(w(10));
    expect(w(10)).toBeGreaterThan(w(2));
  });
  test('an assumption that excludes equal speeds gives no bound, with the implied interval marked', () => {
    const r = K.speedBound({ ...base, emissionDelay: { min: 3, max: 10 } });
    expect(r.status).toBe('no-bound');
    expect(r.lower).toBeNull();
    expect(r.implied.upper).toBeLessThan(0);
    expect(K.describeBound(r)).toMatch(/^No bound/);
  });
  test('a delay too large for the distance is refused, not approximated', () => {
    expect(
      code(() =>
        K.speedBound({
          delay: 1e16,
          distance: 1,
          emissionDelay: { min: 0, max: 1e16 },
        })
      )
    ).toBe('out-of-domain');
  });
  test('the bound curve gives each end against its own assumption', () => {
    const c = K.boundCurve({
      delay: 1.74,
      distance: 40,
      tauGrid: [0, 1, 2, 10],
    });
    expect(c.upperVsTauMin.map(r => r.consistent)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(c.lowerVsTauMax.map(r => r.consistent)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });
});

describe('the timeline names things correctly', () => {
  const s = K.syntheticScene({ seed: 'unit', leapTable: table });
  test('a band is not a messenger', () => {
    for (const m of ['gamma-ray', 'optical', 'x-ray', 'GW'])
      expect(
        code(() =>
          K.makeEvent({ id: 'e', messenger: m, band: null, time: s.stamps.gw })
        )
      ).toBe('bad-messenger');
  });
  test('every entry keeps its system and its definition, and the reference sits at zero', () => {
    const ev = (id, messenger, band, t) =>
      K.makeEvent({ id, messenger, band, time: t });
    const tl = K.buildTimeline(
      [
        ev('gw', 'gravitational-wave', null, s.stamps.gw),
        ev('grb', 'photon', 'gamma', s.stamps.grb),
        ev('opt', 'photon', 'optical', s.stamps.optical),
      ],
      { reference: 'gw', leapTable: table }
    );
    expect(tl.entries[0].id).toBe('gw');
    expect(tl.entries[0].offsetS).toBe(0);
    expect(tl.entries.map(e => e.system)).toEqual([
      'GPS',
      'FERMI_MET',
      'MJD_UTC',
    ]);
    expect(tl.entries.every(e => /^\d{4}-/.test(e.utc))).toBe(true);
    expect(tl.entries[1].offsetS).toBeCloseTo(s.truth.delayS, 6);
  });
  test('the synthetic scene is deterministic and labelled', () => {
    const a = K.syntheticScene({ seed: 'same', leapTable: table });
    const b = K.syntheticScene({ seed: 'same', leapTable: table });
    expect(a).toEqual(b);
    expect(a.label).toMatch(/^SYNTHETIC/);
    expect(
      K.syntheticScene({ seed: 'other', leapTable: table }).truth.delayS
    ).not.toBe(a.truth.delayS);
  });
});

describe('the host rule ranks and refuses', () => {
  test('a field is deterministic and its candidates are labelled synthetic', () => {
    const a = K.syntheticGalaxyField({ seed: 1, label: 'x' });
    expect(a).toEqual(K.syntheticGalaxyField({ seed: 1, label: 'x' }));
    expect(a.label).toMatch(/^SYNTHETIC/);
    expect(a.candidates).toHaveLength(25);
  });
  test('the weights sum to one and the rule says what it assumes', () => {
    const f = K.syntheticGalaxyField({ seed: 2 });
    const r = K.rankHosts({
      candidates: f.candidates,
      ...{
        distanceHatMpc: f.measurement.distanceHatMpc,
        sigmaDistanceMpc: f.measurement.sigmaDistanceMpc,
        sigmaSkyDeg: f.measurement.sigmaSkyDeg,
      },
    });
    expect(r.ranked.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 12);
    expect(r.rule.note).toMatch(/only if the stated model is true/);
  });
});

describe('the kilonova model is bounded', () => {
  test('it is labelled illustrative and refuses outside its domain', () => {
    expect(K.ILLUSTRATIVE_PARAMETERS.label).toMatch(/not fitted/);
    expect(code(() => K.kilonovaState(K.ILLUSTRATIVE_PARAMETERS, 100))).toBe(
      'out-of-domain'
    );
  });
});

describe('the detection rule', () => {
  test('a k = 1 rule at n sigma has the one-epoch false-alarm probability', () => {
    expect(
      K.falseAlarmProbability({
        epochs: 1,
        thresholdSigma: 3,
        minDetections: 1,
      })
    ).toBeCloseTo(0.0013498980316300933, 12);
  });
  test('the probability of detecting a bright source is one and never above it', () => {
    const p = K.detectionProbability({ means: [100, 100, 100], sigmas: 1 });
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeGreaterThan(1 - 1e-12);
  });
  test('the exact interval holds zero and one', () => {
    expect(K.binomialInterval(0, 10).lo).toBe(0);
    expect(K.binomialInterval(10, 10).hi).toBe(1);
    expect(code(() => K.binomialInterval(11, 10))).toBe('bad-counts');
  });
  test('an injection is reproducible from its seed', () => {
    const truth = [0, 1, 2].map(t => ({ t, flux: 6 }));
    const a = K.injectionCompleteness({
      truth,
      sigma: 1,
      trials: 50,
      seed: 's',
    });
    expect(a).toEqual(
      K.injectionCompleteness({ truth, sigma: 1, trials: 50, seed: 's' })
    );
  });
});

describe('the authentic readers and the legs that wait for them', () => {
  const NTP_1900_TO = iso =>
    (Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1900, 0, 1)) / 1000;
  const listText = (entries, extra = '') =>
    [
      '# a SYNTHETIC list for a test; not the IERS list',
      `#$ ${NTP_1900_TO('2010-01-01')}`,
      extra,
      ...entries.map(
        e => `${NTP_1900_TO(e.from)}\t${e.taiMinusUtc}\t# ${e.from}`
      ),
    ].join('\n');

  test('a leap-seconds.list parses and checks itself', () => {
    const parsed = parseLeapSecondsList(
      listText(THR.synthetic.leapTable, `#@ ${NTP_1900_TO('2030-01-01')}`)
    );
    expect(parsed.entries.map(e => e.from)).toEqual(
      THR.synthetic.leapTable.map(e => e.from)
    );
    expect(checkLeapList(parsed, '2026-11-04')).toEqual([]);
    expect(checkLeapList(parsed, '2031-01-01')[0]).toMatch(/expired/);
    const wrong = parseLeapSecondsList(
      listText(
        THR.synthetic.leapTable.map(e =>
          e.from === '1980-01-01' ? { ...e, taiMinusUtc: 20 } : e
        )
      )
    );
    expect(checkLeapList(wrong, '2026-11-04').join()).toMatch(/19 s/);
  });

  test('the photometry csv parses its four required columns', () => {
    const rows = parsePhotometryCsv(
      'mjd_utc,band,ab_mag,ab_mag_err,reference\n57982.5,g,17.1,0.05,x\n'
    );
    expect(rows).toEqual([
      { mjd: 57982.5, band: 'g', mag: 17.1, sigma: 0.05, reference: 'x' },
    ]);
    expect(() => parsePhotometryCsv('a,b\n1,2\n')).toThrow(/lacks/);
  });

  test('B2 fails a list that is not the real one, E1 and E3 run on supplied files', () => {
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'mm244-')));
    try {
      writeFileSync(
        path.join(dir, 'leap-seconds.list'),
        listText(THR.synthetic.leapTable)
      );
      writeFileSync(
        path.join(dir, 'SOURCES.json'),
        JSON.stringify({ 'leap-seconds.list': { retrieved: '2026-11-04' } })
      );
      const o = ORACLE.boundA2[1];
      const sf = 2;
      writeFileSync(
        path.join(dir, 'published-bound.json'),
        JSON.stringify({
          delay: {
            value: 1.74,
            sigma: 0.05,
            definition: 'trigger-minus-merger',
          },
          distance: { value: o.distanceMpc },
          emissionDelay: { min: o.tauMin, max: o.tauMax },
          bound: {
            lower: Number(o.firstOrderLower.toPrecision(sf)),
            upper: Number(o.firstOrderUpper.toPrecision(sf)),
            printedSignificantFigures: sf,
          },
        })
      );
      // the kernel's bound for delay 1.74 differs from the oracle case's (delay 1.0), so B4 must fail here
      writeFileSync(
        path.join(dir, 'grb-trigger.json'),
        JSON.stringify({
          trigger: {
            value: EVENTS.GW170817.gps + 1.7,
            system: 'GPS',
            definition: 'instrument-trigger',
          },
        })
      );
      const mergerMjd = K.fromT72(
        K.toT72({ value: EVENTS.GW170817.gps, system: 'GPS' }, table),
        'MJD_UTC',
        table
      );
      const csv = ['mjd_utc,band,ab_mag,ab_mag_err']
        .concat(
          [0.5, 1.5, 3, 5].flatMap((d, k) => [
            `${mergerMjd + d},g,${17 + 0.5 * k},0.05`,
            `${mergerMjd + d + 0.02},i,17,0.05`,
          ])
        )
        .join('\n');
      writeFileSync(path.join(dir, 'kilonova-photometry.csv'), csv);
      const rows = runValidation({
        only: ['B2', 'B4', 'E1', 'E3'],
        authDir: dir,
      });
      const by = Object.fromEntries(rows.map(r => [r.id, r]));
      // the pinned oracle output is for the files as supplied, so synthetic files are not judged by it
      for (const id of [
        'B2b.leapListParse',
        'B4o.boundOracle',
        'E1b.onsetDelayFromPacks',
      ])
        expect(by[id].status).toBe('not-run');
      expect(by['B4o.boundOracle'].note).toMatch(/was not made from/);
      expect(by['B2.timeAuthentic'].status).toBe('fail');
      expect(by['B4.boundPublished'].status).toBe('fail');
      expect(by['E1.delayFromPacks'].status).toBe('pass');
      expect(by['E3.kilonovaReddening'].status).toBe('pass');
      writeFileSync(
        path.join(dir, 'published-bound.json'),
        JSON.stringify({
          delay: { value: 1.74, sigma: 0.05, definition: 'onset-minus-merger' },
          distance: { value: 40 },
          emissionDelay: { min: 0, max: 10 },
          bound: { lower: 0, upper: 0, printedSignificantFigures: 1 },
        })
      );
      const other = runValidation({ only: ['E1'], authDir: dir })[0];
      expect(other.status).toBe('not-run');
      expect(other.note).toMatch(/a different quantity/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('B4 reads a bound printed as strings (AM5), and a different printed pair fails it', () => {
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'mm244-')));
    try {
      const file = (lower, upper) =>
        writeFileSync(
          path.join(dir, 'published-bound.json'),
          JSON.stringify({
            delay: { value: 1.74, sigma: 0.05, definition: 'free text' },
            distance: { value: 26 },
            emissionDelay: { min: 0, max: 10 },
            bound: { lower, upper, printedSignificantFigures: 1 },
          })
        );
      file('-3e-15', '+7e-16');
      expect(runValidation({ only: ['B4.'], authDir: dir })[0].status).toBe(
        'pass'
      );
      file('-3e-15', '+6e-16');
      expect(runValidation({ only: ['B4.'], authDir: dir })[0].status).toBe(
        'fail'
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('with no authentic files the four legs are NOT RUN and say which file is missing', () => {
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'mm244-')));
    try {
      const rows = runValidation({
        only: ['B2', 'B4', 'E1', 'E3'],
        authDir: dir,
      });
      expect(rows.map(r => `${r.id}:${r.status}`)).toEqual([
        'B2.timeAuthentic:not-run',
        'B2b.leapListParse:not-run',
        'B4.boundPublished:not-run',
        'B4o.boundOracle:not-run',
        'E1.delayFromPacks:not-run',
        'E1b.onsetDelayFromPacks:not-run',
        'E3.kilonovaReddening:not-run',
      ]);
      expect(rows.every(r => /was not supplied/.test(r.note))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
