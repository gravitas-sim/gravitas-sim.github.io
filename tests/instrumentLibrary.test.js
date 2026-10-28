// =============================================================================
// The instrument library (Prompt 209)
// -----------------------------------------------------------------------------
// tests/fixtures/instruments/thresholds.json fixed every bound before the table,
// the validator or this file existed. This holds its rows: the structural rows
// (s1 to s6), the refusal list (r1 to r8), the cross-checks the oracle runs
// (o1 to o6, tools/instruments-validate.mjs) with the legs that fail kept
// failing and labelled, and the three adopters (a1 to a3).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runLegs } from '../tools/instruments-validate.mjs';
import {
  CLASSES,
  EXPECTED,
  PARAMS,
  completeness,
  describeProblems,
  unitSignature,
  validateFacility,
  validateLibrary,
  validatePack,
  validateSources,
} from '../js/instruments/validate.js';
import {
  FACILITIES,
  SITES,
  SOURCES,
  InstrumentTableError,
  facilityIds,
  getFacility,
  inUnit,
  realFacilities,
  siteOf,
} from '../js/instruments/index.js';
import { detectorOf, imagerSetupOf } from '../js/instruments/detector.js';
import { observingNightAt } from '../js/instruments/planner.js';
import {
  julianDate,
  localMidnight,
  observingNight,
} from '../js/observingWindow.js';
import { DEFAULT_DETECTOR } from '../js/kernels/detector/frame.js';
import { validateSetup } from '../js/forward/setup.js';
import * as ccd from '../js/forward/models/ccd.js';
import { UNITS } from '../js/units/registry.js';
import { valid } from './jsonSchemaSubset.js';

const THR = JSON.parse(
  readFileSync('tests/fixtures/instruments/thresholds.json', 'utf8')
);
const clone = x => JSON.parse(JSON.stringify(x));
const lib = () => ({ sources: SOURCES, sites: SITES });

// Legs that fail, and why. A leg that stops failing, or a new one that starts,
// fails this file until the table or this list is changed on purpose.
const KNOWN_FAILING = new Map([
  [
    'o5.zero-point-throughput lco-0m35/qhy600:u',
    "the paper's u' zero point (17.5) implies a system throughput of 2 percent against the 10 percent floor",
  ],
  [
    'o5.zero-point-throughput lco-0m35/qhy600:z',
    "the paper's zs zero point (18.4) implies a system throughput of 5 percent against the 10 percent floor",
  ],
]);

describe('structural rows', () => {
  test('s1: five real facilities, one per class', () => {
    const real = realFacilities();
    expect(real.length).toBeGreaterThanOrEqual(5);
    expect(new Set(real.map(f => f.class))).toEqual(new Set(CLASSES));
  });

  test('s2: typical entries are labelled and cite only the convention', () => {
    const typical = FACILITIES.filter(f => f.typical);
    expect(typical.length).toBeGreaterThanOrEqual(1);
    for (const f of typical) {
      expect(f.site).toBeUndefined();
      const srcs = JSON.stringify(f).match(/"s":"([^"]+)"/g);
      for (const m of srcs)
        expect(SOURCES[m.slice(5, -1)].kind).toBe('typical');
    }
    for (const f of realFacilities())
      expect(JSON.stringify(f)).not.toContain('teaching-default');
  });

  test('s3, s4, s5: the whole table validates (units, citations, absence)', () => {
    const table = { sources: SOURCES, sites: SITES, facilities: FACILITIES };
    expect(describeProblems(validateLibrary(table))).toBe('');
    for (const s of Object.values(SOURCES)) {
      expect(s.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.rights.length).toBeGreaterThan(20);
    }
    // No null, NaN or empty value anywhere in the data.
    const walk = x => {
      if (x === null) throw new Error('null in the table');
      if (typeof x === 'number') expect(Number.isFinite(x)).toBe(true);
      if (typeof x === 'string') expect(x.trim()).not.toBe('');
      // A unit of '' is the registry's dimensionless unit (a focal ratio).
      if (x && typeof x === 'object')
        for (const [k, v] of Object.entries(x))
          if (!(k === 'u' && v === '')) walk(v);
    };
    walk(FACILITIES);
    walk(SITES);
  });

  test('s6: the committed module is exactly what the source table writes', () => {
    // A child process: Jest loads Prettier's standalone bundle, which has no
    // parsers, and the command line is the only caller that gates anything.
    const out = execFileSync(
      'node',
      ['tools/build-instruments.mjs', '--check'],
      {
        encoding: 'utf8',
      }
    );
    expect(out).toMatch(/are current/);
  });
});

describe('refusals (r1 to r8)', () => {
  const base = () => clone(getFacility('lco-1m0'));
  const problems = f =>
    validateFacility(f, lib()).map(p => `${p.path} ${p.message}`);
  const mentions = (f, re) =>
    expect(problems(f).some(p => re.test(p))).toBe(true);

  test('r1: a value with no source', () => {
    const f = base();
    delete f.telescope.aperture.s;
    mentions(f, /telescope\.aperture .*no source/);
  });
  test('r2: a source not in the table', () => {
    const f = base();
    f.telescope.aperture.s = 'nowhere2099';
    mentions(f, /not in the sources/);
  });
  test('r3: a unit not in the registry', () => {
    const f = base();
    f.telescope.aperture.u = 'furlong';
    mentions(f, /not in the registry/);
  });
  test('r4: a unit of the wrong dimension', () => {
    const f = base();
    f.telescope.aperture.u = 'kg';
    mentions(f, /dimension mass; this parameter is length/);
    const g = base();
    g.instruments[0].readNoise.u = 'electron/count';
    mentions(g, /readNoise .*dimension/);
  });
  test('r5: null, NaN and non-finite values', () => {
    for (const bad of [null, NaN, Infinity, '', [1, NaN]]) {
      const f = base();
      f.telescope.aperture.v = bad;
      expect(problems(f).length).toBeGreaterThan(0);
    }
  });
  test('r6: a pack may not reuse a built-in facility id', () => {
    const pack = {
      format: 'gravitas.instrument',
      formatVersion: 1,
      id: 'my-dish',
      facility: { ...clone(getFacility('gbt')) },
    };
    const out = validatePack(pack, {
      sources: SOURCES,
      sites: SITES,
      facilityIds: facilityIds(),
    });
    expect(out.some(p => /already has/.test(p.message))).toBe(true);
  });
  test('r7: typical needs the convention source, a real facility may not cite it', () => {
    const f = clone(getFacility('typical-campus'));
    f.telescope.aperture.s = 'harbeck2024';
    mentions(f, /typical entry but cites a real source/);
    const g = base();
    g.telescope.aperture.s = 'teaching-default';
    mentions(g, /project convention in a real facility/);
  });
  test('r8: an unknown parameter, and a missing site, are refused', () => {
    const f = base();
    f.instruments[0].colour = { v: 1, u: '', s: 'lco-sinistro' };
    mentions(f, /not a parameter of this block/);
    const g = base();
    delete g.site;
    mentions(g, /names its site/);
  });
  test('a source without a retrieval date or a rights basis is refused', () => {
    const s = clone(SOURCES);
    delete s.brown2013.retrieved;
    delete s.brown2013.rights;
    const out = validateSources(s).map(p => p.path);
    expect(out).toEqual(
      expect.arrayContaining([
        'sources.brown2013.retrieved',
        'sources.brown2013.rights',
      ])
    );
  });
  test('compound units are read from the registry, not guessed', () => {
    expect(unitSignature('arcsec/pix')).toBe('angle/pixel');
    expect(unitSignature('electron/s/pix')).toBe('electrons/time/pixel');
    expect(unitSignature('mag/arcsec2')).toBe('magnitude/solid-angle');
    expect(unitSignature('e-/ADU')).toBeNull();
    expect(unitSignature('m^2')).toBe('length^2');
    expect(unitSignature('furlong^2')).toBeNull();
    for (const id of ['electron', 'deg2', 'airmass'])
      expect(UNITS[id].symbol).toBeTruthy();
  });
});

describe('cross-checks (o1 to o6)', () => {
  const rows = runLegs(
    { sources: SOURCES, sites: SITES, facilities: FACILITIES },
    THR
  );
  const key = r => `${r.id} ${r.facility}`;

  test('every leg passes except the labelled failures, which keep failing', () => {
    const failing = rows.filter(r => r.status === 'fail').map(key);
    expect(failing.sort()).toEqual([...KNOWN_FAILING.keys()].sort());
  });
  test('the legs that ran are the legs the thresholds name', () => {
    const ids = new Set(rows.map(r => r.id));
    for (const id of Object.keys(THR.oracle).filter(k => /^o\d/.test(k)))
      expect(ids.has(id)).toBe(true);
    expect(rows.filter(r => r.status === 'pass').length).toBeGreaterThanOrEqual(
      22
    );
  });
  test('a leg without its inputs is N/A and names the missing field', () => {
    const na = rows.filter(r => r.status === 'N/A');
    expect(na.length).toBeGreaterThan(0);
    for (const r of na) expect(r.detail).toMatch(/^needs \S/);
  });
  test('the Rubin depth formula reproduces all six bands to 0.05 mag', () => {
    const six = rows.filter(r => r.id === 'o4.rubin-m5');
    expect(six).toHaveLength(6);
    for (const r of six) expect(r.value).toBeLessThanOrEqual(0.05);
  });
  test('the oracle can fail: a wrong pixel scale is caught', () => {
    const bad = clone(FACILITIES);
    bad.find(f => f.id === 'lco-1m0').instruments[0].pixelScale.v = 0.5;
    const out = runLegs(
      { sources: SOURCES, sites: SITES, facilities: bad },
      THR
    );
    expect(
      out.some(
        r =>
          r.id === 'o1.plate-scale' &&
          r.facility.startsWith('lco-1m0') &&
          r.status === 'fail'
      )
    ).toBe(true);
  });
  test('the typical entry holds the detector kernel defaults, once', () => {
    const ins = getFacility('typical-campus').instruments[0];
    expect(ins.gain.v).toBe(DEFAULT_DETECTOR.gain);
    expect(ins.readNoise.v).toBe(DEFAULT_DETECTOR.readNoise);
    expect(ins.darkCurrent.v).toBe(DEFAULT_DETECTOR.darkRate);
    expect(ins.fullWell.v).toBe(DEFAULT_DETECTOR.fullWell);
    expect(ins.sensorWidth.v).toBe(DEFAULT_DETECTOR.width);
    expect(ins.sensorHeight.v).toBe(DEFAULT_DETECTOR.height);
  });
});

describe('completeness', () => {
  test('is counted against what the class expects, and says what is missing', () => {
    const c = completeness(getFacility('gbt'), SITES['green-bank']);
    expect(c.present).toBe(c.expected);
    const t = completeness(getFacility('tess'), SITES['tess-orbit']);
    expect(t.missing).toEqual(
      expect.arrayContaining(['instrument.gain', 'instrument.darkCurrent'])
    );
    expect(EXPECTED.imager.instrument).toContain('zeroPoint');
  });
});

describe('adopters', () => {
  test('a1: the observing-window planner reads the site from the table', () => {
    const ctio = siteOf('lco-1m0');
    expect(ctio).toMatchObject({
      latitudeDeg: -30.1673,
      longitudeDeg: -70.8046,
      elevationM: 2180,
    });
    const target = { raDeg: 330.795, decDeg: 18.8842 };
    const midnightJd = localMidnight(
      julianDate(2026, 9, 5, 6),
      ctio.longitudeDeg
    );
    const args = {
      target,
      midnightJd,
      options: { stepMinutes: 10, refineSeconds: 1 },
    };
    const viaTable = observingNightAt('lco-1m0', args);
    const byHand = observingNight({
      ...args,
      site: { latitudeDeg: -30.1673, longitudeDeg: -70.8046 },
    });
    // The result echoes the site it was given; everything else is the same,
    // to the last bit.
    const { site: s1, ...r1 } = viaTable;
    const { site: s2, ...r2 } = byHand;
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(s1).toMatchObject(s2);
    expect(() => siteOf('tess')).toThrow(InstrumentTableError);
    expect(() => siteOf('typical-campus')).toThrow(/no ground site/);
  });

  test('a2: a detector spec carries the table values and lists what it lacks', () => {
    const { detector, from, absent } = detectorOf('lco-0m35', {
      range: 'mid',
      size: [128, 96],
    });
    expect(detector).toMatchObject({
      gain: 0.75,
      readNoise: 3.3,
      fullWell: 44000,
      width: 128,
    });
    expect(absent).toEqual(['darkRate']);
    expect(from.gain).toMatchObject({ range: [0.7, 0.8], took: 'mid' });
    expect(
      detectorOf('lco-0m35', { range: 'lo', size: [8, 8] }).detector.gain
    ).toBe(0.7);
    // An upper bound says so.
    expect(
      detectorOf('tess', { size: [64, 64] }).from.readNoise.qualifier
    ).toBe('upper');
    // A sensor over the kernel's frame limit needs a cutout, never a guess.
    expect(() => detectorOf('lco-0m35')).toThrow(/pass size/);
    expect(detectorOf('lco-0m35', { size: [128, 96] }).detector).toMatchObject({
      width: 128,
      height: 96,
    });
    // The typical entry reproduces the kernel's own defaults.
    const typ = detectorOf('typical-campus').detector;
    for (const k of [
      'gain',
      'readNoise',
      'fullWell',
      'darkRate',
      'width',
      'height',
    ])
      expect(typ[k]).toBe(DEFAULT_DETECTOR[k]);
  });

  test('a3: the ccd forward model runs from a facility and refuses what the table lacks', () => {
    const size = [48, 48];
    const setup = imagerSetupOf('lco-0m35', { seed: 'p209', size });
    expect(validateSetup(setup)).toEqual([]);
    expect(setup.instrument).toMatchObject({
      width: 48,
      height: 48,
      pixelScale: 0.73,
      psfFwhm: 1.3,
    });
    const { detector } = detectorOf('lco-0m35', { size });
    const obs = ccd.run(
      {
        kind: 'science',
        exposure: 30,
        scene: { sky: 5, sources: [{ x: 24, y: 24, rate: 5000 }] },
        detector,
      },
      setup
    );
    const p = id =>
      obs.synthetic.truth.parameters.find(q => q.id === id)?.value;
    expect(p('gain')).toBe(0.75);
    expect(p('readNoise')).toBe(3.3);
    expect(p('fullWell')).toBe(44000);
    expect(p('psfFwhm')).toBe(1.3);
    // Missing fields are errors that name the field.
    expect(() => imagerSetupOf('typical-campus', { seed: 'x' })).toThrow(
      /no pixel scale/
    );
    expect(() => imagerSetupOf('tess', { seed: 'x', size })).toThrow(
      /no seeing/
    );
    expect(
      imagerSetupOf('tess', { seed: 'x', size, psfFwhm: 21 }).instrument
        .pixelScale
    ).toBeCloseTo(21, 10);
    expect(() => imagerSetupOf('gbt', { seed: 'x' })).toThrow(/not an imager/);
  });

  test('a facility is an exact conversion, never a rounded one', () => {
    expect(
      inUnit(getFacility('tess').instruments[0].pixelScale, 'arcsec')
    ).toBeCloseTo(21, 10);
    expect(siteOf('gbt').latitudeDeg).toBeCloseTo(
      38 + 25 / 60 + 59.236 / 3600,
      6
    );
  });
});

describe('the pack kind (gravitas.instrument/1)', () => {
  const schema = JSON.parse(
    readFileSync('sdk/schemas/instrument-1.schema.json', 'utf8')
  );
  const packOf = f => ({
    format: 'gravitas.instrument',
    formatVersion: 1,
    id: `copy-of-${f.id}`,
    sources: SOURCES,
    sites: SITES,
    facility: { ...clone(f), id: `copy-of-${f.id}` },
  });
  const builtin = {
    sources: {},
    sites: {},
    facilityIds: facilityIds(),
  };

  test('the schema holds every built-in facility, and the validator accepts it as a pack', () => {
    for (const f of FACILITIES) {
      const pack = packOf(f);
      expect([f.id, valid(schema, pack)]).toEqual([f.id, true]);
      expect(describeProblems(validatePack(pack, builtin))).toBe('');
    }
  });
  test('the schema names the parameters the validator knows, no more and no fewer', () => {
    const named = d => Object.keys(d.properties).sort();
    const without = (list, drop) => list.filter(k => !drop.includes(k));
    expect(named(schema.$defs.facility.properties.telescope)).toEqual(
      ['name', ...Object.keys(PARAMS.telescope)].sort()
    );
    const [im, rc] = schema.$defs.instrument.anyOf;
    expect(
      without(named(im), ['id', 'kind', 'name', 'filters', 'bands'])
    ).toEqual(Object.keys(PARAMS.imager).sort());
    expect(without(named(rc), ['id', 'kind', 'name'])).toEqual(
      Object.keys(PARAMS.receiver).sort()
    );
    expect(named(schema.$defs.band)).toEqual(Object.keys(PARAMS.band).sort());
  });
  test('the schema rejects what the validator rejects at the structure level', () => {
    const bad = packOf(getFacility('gbt'));
    bad.facility.instruments[0].colour = { v: 1, u: '', s: 'gbt-instruments' };
    expect(valid(schema, bad)).toBe(false);
    const noSrc = packOf(getFacility('gbt'));
    delete noSrc.facility.telescope.aperture.s;
    expect(valid(schema, noSrc)).toBe(false);
  });
  test('a pack with its own sources and a wrong unit is refused by path', () => {
    const pack = packOf(getFacility('typical-campus'));
    pack.facility.instruments[0].gain.u = 'e-/ADU';
    const out = validatePack(pack, builtin);
    expect(out.map(p => p.path)).toContain('facility.instruments[0].gain');
  });
});
