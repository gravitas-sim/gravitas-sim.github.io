// =============================================================================
// The image packs (Prompt 189)
// -----------------------------------------------------------------------------
// The four packs the Observatory opens as images, their frames files, their
// rights records, their contracts, and the authentic-frame legs of Prompts 180
// and 183 (tools/image-packs-validate.mjs, run in plain Node: Jest's VM makes
// Math and Float64Array reads about ten times slower) against the analysis
// contract committed before any leg was run. Nothing here is an exact float
// that passes through exp, log or a trigonometric function.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { permits } from '../js/dataKinds/contract.js';
import { adapt, measure } from '../js/measure/photometry.js';
import { framesOf } from '../js/observatory/imageMarks.js';
import {
  imagePackObservation,
  readFrames,
} from '../js/observatory/imagePacks.js';
import { FIXTURES } from '../js/observatory/fixtures.js';
import { precacheLists } from '../tools/build-service-worker.mjs';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const ROOT = path.resolve(import.meta.dirname, '..');
const json = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const CONTRACT = json('tests/fixtures/imagePacks/analysis-contract.json');
const CONTRACT2 = json('tests/fixtures/imagePacks/analysis-contract-2.json');
const FAILED = json('tests/fixtures/imagePacks/failed-legs.json').legs;

const PACKS = [
  [
    'tess-hd209458-s56-frame',
    'tessHd209458S56Frame',
    'quantitative',
    'tess-frame',
  ],
  [
    'sdo-hmi-continuum-20240510',
    'sdoHmiContinuum20240510',
    'display-only',
    'sdo-hmi-sun',
  ],
  [
    'galileo-moon-19921207',
    'galileoMoon19921207',
    'display-only',
    'galileo-moon',
  ],
  [
    'hirise-cerberus-fossae',
    'hiriseCerberusFossae',
    'display-only',
    'hirise-cerberus-fossae',
  ],
];
const mod = name => import(`../js/data/observations/${name}.js`);
const bytesOf = file => {
  const b = readFileSync(path.join(ROOT, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

describe('the four packs, their frames files and their rights', () => {
  for (const [id, name, use, fixture] of PACKS) {
    test(`${id}: ${use}, its frames file is the one the module records, and it opens as a fixture`, async () => {
      const m = await mod(name);
      const manifest = json(`data-packs/${id}.json`);
      expect(manifest.license.status).toMatch(/^(public-domain|cc-by)$/);
      expect(manifest.license.statement).toMatch(/read 2026-10-24/);
      expect(manifest.offline).toBe('none');
      const bytes = bytesOf(m.SIDECAR.file);
      expect(bytes.byteLength).toBe(m.SIDECAR.bytes);
      expect(
        createHash('sha256').update(Buffer.from(bytes)).digest('hex')
      ).toBe(m.SIDECAR.sha256);
      const side = m.PACK.image.sidecar;
      expect(side.use).toBe(use);
      expect(permits(side, 'marking').ok).toBe(true);
      expect(permits(side, 'photometry').ok).toBe(use === 'quantitative');
      if (use === 'display-only') {
        // a picture says so: no measurement is offered on it
        expect(permits(side, 'astrometry').ok).toBe(false);
        expect(side.pixels.unit).toBe('display');
      }
      const o = await imagePackObservation(m, { bytes });
      expect(o.kind).toBe('image');
      expect(o.license.status).toBe(manifest.license.status);
      expect(o.credit).toBeTruthy();
      expect(FIXTURES.some(f => f.id === fixture && f.kind === 'image')).toBe(
        true
      );
    });
  }

  test('a frames file that is not the one the pack records is refused, not drawn', async () => {
    const m = await mod('galileoMoon19921207');
    const good = bytesOf(m.SIDECAR.file);
    const flipped = good.slice(0);
    new Uint8Array(flipped)[1000] ^= 1;
    await expect(readFrames(flipped, m.SIDECAR, m.PACK)).rejects.toThrow(
      /SHA-256/
    );
    await expect(
      readFrames(good.slice(0, 1000), m.SIDECAR, m.PACK)
    ).rejects.toThrow(/bytes, not/);
    await expect(
      readFrames(good, m.SIDECAR, { ...m.PACK, id: 'other' })
    ).rejects.toThrow(/not the frames of/);
  });

  test('the packs are fetched when opened and never installed: no tier of the service worker holds one', async () => {
    const { core, optional, idle } = await precacheLists();
    const held = [...core, ...optional, ...idle];
    for (const [, name] of PACKS)
      expect(held).not.toContain(`js/data/observations/${name}.js`);
    expect(held).not.toContain('js/observatory/imagePacks.js');
    expect(held.filter(p => p.startsWith('frames/'))).toEqual([]);
  });

  test('the TESS pack states what the contract needs: saturation, linearity, the noise, the time and the world coordinates', async () => {
    const m = await mod('tessHd209458S56Frame');
    const s = m.PACK.image.sidecar;
    expect(s.pixels.saturation.level).toBeGreaterThan(0);
    expect(s.pixels.linearity.status).toBe('corrected');
    expect(s.planes.variance).toBeTruthy();
    expect(s.time.scale).toBe('TDB');
    expect(s.exposure.seconds).toBeGreaterThan(0);
    expect(s.wcs.ctype).toEqual(['RA---TAN', 'DEC--TAN']);
    expect(m.PACK.image.optimalAperture.length).toBe(23);
  });
});

describe('the authentic-frame legs, against the contract committed first', () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools/image-packs-validate.mjs'), '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
    )
  );

  test('every row passes except the legs recorded as failed, and each of those still fails', () => {
    for (const r of rows) {
      if (r.pass === null) continue;
      if (FAILED[r.id])
        expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: false });
      else expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    // (the page-stage failures are judged in the browser, by e2e/imagePacks.spec.js)
    for (const id of Object.keys(FAILED))
      if (!id.includes('.page.'))
        expect(rows.some(r => r.id === id)).toBe(true);
  });

  test('every leg of the contract has rows, and the legs not run say why', () => {
    for (const id of [
      'pack.integrity',
      'photometry.e2',
      'detection.e2',
      'injection.g1',
      'import.hostilePng',
    ])
      expect(rows.filter(r => r.id.startsWith(id)).length).toBeGreaterThan(0);
    for (const [id, leg] of Object.entries(CONTRACT.legs)) {
      if (!leg.status) continue;
      const r = rows.find(q => q.id === id);
      expect(r.pass).toBeNull();
      expect(r.note).toMatch(/^NOT RUN/);
    }
  });

  test("part 2 of the contract: the earlier prompts' legs the one frame runs have rows and pass, and the rest say why they do not run", () => {
    const ran = [
      'astrometry.b4.pack',
      'astrometry.e1.single',
      'overlay.b5.pack.pixels',
      'overlay.b5.pack.list',
      'framepipeline.g1.refusal',
      'framepipeline.g1.cosmic',
      'series.b6.refusal',
    ];
    for (const id of ran) {
      const r = rows.find(q => q.id === id);
      expect({ id, pass: r?.pass }).toEqual({ id, pass: true });
    }
    for (const [id, leg] of Object.entries(CONTRACT2.legs)) {
      if (!leg.status) continue;
      const r = rows.find(q => q.id === id);
      expect(r.pass).toBeNull();
      expect(r.note).toMatch(/^NOT RUN/);
    }
    // the bounds of the earlier prompts are read, not restated
    const b4 = json('tests/fixtures/astrometry/thresholds.json').checks[
      'b4.oracleAuthenticHeader'
    ].boundDeg;
    expect(rows.find(q => q.id === 'astrometry.b4.pack').bound).toBe(b4);
    const pix = json('tests/fixtures/overlay/thresholds.json').checks[
      'b4.oracleSkyMap'
    ].boundPix;
    expect(rows.find(q => q.id === 'overlay.b5.pack.pixels').bound).toBe(pix);
    // the single-star leg is judged against the bound the contract states
    expect(rows.find(q => q.id === 'astrometry.e1.single').bound).toBe(
      CONTRACT2.legs['astrometry.e1.single'].bounds.separationPix
    );
    // the oracle's sky results were run on the header the pack holds
    const inputs = json('tests/fixtures/imagePacks/oracle-inputs.json');
    const wcs = JSON.parse(
      readFileSync(path.join(ROOT, 'data-packs/tess-hd209458-s56-frame.json'))
    ).image.sidecar.wcs;
    expect(inputs.astrometry.wcs).toEqual(wcs);
  });

  test('the bounds are read from the earlier prompts, not restated: the contract names the files', () => {
    for (const id of ['photometry.e2', 'detection.e2', 'injection.g1'])
      expect(json(CONTRACT.legs[id].references)).toBeTruthy();
  });

  test('the oracle was run on the frame the pack holds', () => {
    const inputs = json('tests/fixtures/imagePacks/oracle-inputs.json');
    const frame = readFileSync(path.join(ROOT, inputs.frame.file));
    expect(createHash('sha256').update(frame).digest('hex')).toBe(
      inputs.frame.sha256
    );
    const results = json('tests/fixtures/imagePacks/oracle-results.json');
    expect(results.detection.convolveAgreement).toBeLessThan(1e-9);
  });
});

describe('a rate in the pack is measured in electrons (the defect the authentic frame found)', () => {
  test('the TESS frame is adapted in electrons, and its magnitude is the rate magnitude photutils gives', async () => {
    const m = await mod('tessHd209458S56Frame');
    const o = await imagePackObservation(m, { bytes: bytesOf(m.SIDECAR.file) });
    const [frame] = framesOf(o);
    expect(m.PACK.image.sidecar.pixels.unit).toBe('electron/s');
    const a = adapt(frame, permits);
    const t = m.PACK.image.sidecar.exposure.seconds;
    expect([a.ok, a.unit, a.route]).toEqual([true, 'electron', 'variance']);
    // the pixels and their variance are the archive's, times t and t squared
    expect(a.image.values[60]).toBeCloseTo(frame.data[60] * t, 6);
    expect(a.variance[60] / (frame.variance[60] * t * t)).toBeCloseTo(1, 12);
    // the same measurement the leg makes, against photutils' sum and annulus mean of the rate
    const res = json(
      'tests/fixtures/imagePacks/oracle-results.json'
    ).photometry;
    const { x, y, r, rIn, rOut } = res.case;
    const me = measure(a, { x, y, r, rIn, rOut, weighting: 'exact' });
    expect(me.ok).toBe(true);
    expect(me.unit).toBe('electron');
    const rateNet = res.sum_exact - Math.PI * r * r * res.annulus.level;
    // not exact floats through log10: a tolerance (the old behaviour read -8.387)
    expect(Math.abs(me.mag - -2.5 * Math.log10(rateNet))).toBeLessThan(1e-9);
    expect(me.mag).toBeLessThan(-13);
    expect(Math.abs(me.net / t / rateNet - 1)).toBeLessThan(1e-9);
  });

  test('a frame in electrons, and one whose variance plane is in electrons, are as they were', () => {
    const side = {
      format: 'gravitas.image',
      formatVersion: 1,
      id: 'u',
      use: 'quantitative',
      width: 2,
      height: 2,
      planes: {
        data: { encoding: 'float64-le' },
        variance: { encoding: 'float64-le', unit: 'electron^2', source: 's' },
      },
      pixels: {
        unit: 'electron',
        linearity: { status: 'linear', limit: 1000, source: 's' },
        saturation: { level: 1000, source: 's' },
      },
      time: {
        value: '2026-01-01T00:00:00Z',
        scale: 'UTC',
        format: 'iso',
        reference: 'mid',
      },
      exposure: { seconds: 10, kind: 'effective' },
      calibration: { state: 'calibrated' },
      history: [],
    };
    const frame = {
      width: 2,
      height: 2,
      data: Float64Array.of(1, 2, 3, 4),
      variance: Float64Array.of(1, 1, 1, 1),
      sidecar: side,
    };
    const a = adapt(frame, () => ({ ok: true }));
    expect([
      a.unit,
      a.image.values === frame.data,
      a.variance === frame.variance,
    ]).toEqual(['electron', true, true]);
  });
});
