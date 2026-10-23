/* global process, performance, URL */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

import {
  BOUNDS,
  CLAIMS_CARDS,
  RASTER_ACCEPT,
  RASTER_REFUSE,
  REFUSAL_CODES,
  REQUIRED_WORD_IDS,
} from '../tools/image-import-cases.mjs';
import { REFUSE, image as fitsImage } from '../tools/data-kinds-cases.mjs';
import {
  flipRows,
  lumaPlane,
  readRasterHeader,
  sniff,
  unknownFormat,
} from '../js/dataKinds/raster.js';
import { planRasterRead, runRasterJob } from '../js/dataKinds/rasterJob.js';
import { planFitsRead } from '../js/dataKinds/fitsJob.js';
import { readFits } from '../js/dataKinds/fits.js';
import { LIMITS } from '../js/dataKinds/limits.js';
import { permits, validateImage } from '../js/dataKinds/contract.js';
import { validateObservation, columnOf } from '../js/observatory/schema.js';
import {
  CODES,
  GAP_WORD,
  WHY,
  buildObservation,
  buildSidecar,
  fieldProblems,
  proposeFields,
  unitOfBunit,
  verdictOf,
} from '../js/observatory/imageImport.js';
import { EN_IMAGEIMPORT } from '../js/i18n/en.imageImport.js';
import { ES_IMAGEIMPORT } from '../js/i18n/es.imageImport.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

// =============================================================================
// Prompt 188: the image import, judged against what tools/image-import-cases.mjs
// committed before the code: every hostile PNG, JPEG and FITS file refused with
// its code and its exact message, no allocation for a refusal, bounded time, the
// display-only verdicts in the contract's own words, the sidecar fields and
// their rules, the words in both languages.
// =============================================================================

const fits = JSON.parse(
  readFileSync(
    new URL('./fixtures/imageImport/fits-refusals.json', import.meta.url),
    'utf8'
  )
);

/** The page's verdict on a file's bytes before any realm: sniff, then the header. */
function pageVerdict(bytes) {
  const b = new Uint8Array(bytes);
  if (b.length > LIMITS.maxFileBytes) return planFitsRead(b); // the size comes first in both readers
  const kind = sniff(b);
  if (!kind) {
    const e = unknownFormat(b);
    return { ok: false, code: e.code, message: e.message };
  }
  return kind === 'fits' ? planFitsRead(b) : planRasterRead(b);
}

describe('the PNG and JPEG readers, against the committed cases', () => {
  test('every hostile file is refused with its code and its exact message', () => {
    expect(RASTER_REFUSE.length).toBeGreaterThanOrEqual(50);
    for (const [name, , build, code, message, opt] of RASTER_REFUSE) {
      if (opt?.browser) continue;
      const v = pageVerdict(build());
      expect({ name, ok: v.ok, code: v.code }).toEqual({
        name,
        ok: false,
        code,
      });
      if (message)
        expect({ name, message: v.message }).toEqual({ name, message });
    }
  });

  test('the cases only the browser can refuse are accepted by structure, so the decoder is asked', () => {
    const browser = RASTER_REFUSE.filter(r => r[5]?.browser);
    expect(browser.length).toBeGreaterThanOrEqual(3);
    for (const [name, , build] of browser) {
      const v = pageVerdict(build());
      expect({ name, ok: v.ok }).toEqual({ name, ok: true });
    }
  });

  test('a sound file is accepted and its size is the header’s', () => {
    for (const [name, , build, kind, w, h] of RASTER_ACCEPT) {
      const b = new Uint8Array(build());
      expect({ name, kind: sniff(b) }).toEqual({ name, kind });
      const o = readRasterHeader(b, kind);
      expect({ name, w: o.width, h: o.height }).toEqual({ name, w, h });
      const plan = planRasterRead(b);
      expect(plan.ok).toBe(true);
      expect(plan.job.memoryBytes).toBe(b.length + 12 * w * h);
    }
  });

  test('the format is the bytes, never the name', () => {
    const png = RASTER_ACCEPT[0][2]();
    expect(sniff(new Uint8Array(png))).toBe('png');
    const e = unknownFormat(new Uint8Array(Buffer.from('a,b\n1,2\n')));
    expect([e.code, e.message]).toEqual([
      'unknown-format',
      'this is not a FITS, PNG or JPEG file (its first bytes are 61 2c 62 0a)',
    ]);
  });

  test('the decoder is not asked for what the readers refuse, and a realm without one says so', async () => {
    const ok = RASTER_ACCEPT[0][2]();
    const msg = { index: 0, payload: { buffer: new Uint8Array(ok).buffer } };
    const out = await runRasterJob(msg);
    expect(out.result.status).toBe('refused');
    expect(out.result.code).toBe('no-decoder');
    const bad = RASTER_REFUSE.find(r => r[1] === 'bomb.png')[2]();
    const refused = await runRasterJob({
      index: 0,
      payload: { buffer: new Uint8Array(bad).buffer },
    });
    expect([refused.result.status, refused.result.code]).toEqual([
      'refused',
      'too-large',
    ]);
  });
});

describe('the FITS corpus (Prompt 157’s 73 files) through the import’s page check', () => {
  test('every case is refused with its code and its exact message, at the stage recorded', () => {
    expect(fits.cases).toHaveLength(REFUSE.length);
    expect(fits.cases.length).toBe(73);
    REFUSE.forEach(([name, build, code], i) => {
      const want = fits.cases[i];
      expect(want.name).toBe(name);
      const bytes = new Uint8Array(build());
      const plan = pageVerdict(bytes);
      if (want.stage === 'page') {
        expect([name, plan.ok, plan.code, plan.message]).toEqual([
          name,
          false,
          want.code,
          want.message,
        ]);
      } else {
        expect([name, plan.ok]).toEqual([name, true]);
        let err;
        try {
          readFits(bytes);
        } catch (e) {
          err = e;
        }
        expect([name, err?.code, err?.message]).toEqual([
          name,
          want.code,
          want.message,
        ]);
      }
      expect(want.readerCode).toBe(code);
    });
  });

  test('a cube and a table are refused by name and never read as an image', () => {
    const cube = fits.cases.filter(c => c.code === 'axes-unsupported');
    const table = fits.cases.filter(c => c.code === 'no-image');
    expect(cube.length).toBeGreaterThan(0);
    expect(table.length).toBeGreaterThan(0);
    for (const c of [...cube, ...table]) expect(c.stage).toBe('page');
  });

  test('a file over the bound is refused as it stands: no copy, no walk, one message', () => {
    const over = Buffer.alloc(LIMITS.maxFileBytes + 1);
    const before = process.memoryUsage().arrayBuffers;
    const v = planFitsRead(over);
    const w = planRasterRead(over);
    const grew = process.memoryUsage().arrayBuffers - before;
    const message = `the file is ${over.length} bytes; the most a frame and its headers can take is ${LIMITS.maxFileBytes}`;
    expect([v.ok, v.code, v.message]).toEqual([
      false,
      'file-too-large',
      message,
    ]);
    expect([w.ok, w.code, w.message]).toEqual([
      false,
      'file-too-large',
      message,
    ]);
    expect(grew).toBeLessThan(BOUNDS.refusalArrayBufferBytes);
  });
});

describe('a refusal costs no memory and little time', () => {
  const all = [
    ...RASTER_REFUSE.filter(r => !r[5]?.browser).map(r => [r[0], r[2]]),
    ...REFUSE.map(r => [r[0], r[1]]),
  ];

  test(`every page-stage refusal allocates under ${BOUNDS.refusalArrayBufferBytes} bytes in all and is quick`, () => {
    const files = all.map(([name, build]) => [name, new Uint8Array(build())]);
    const before = process.memoryUsage().arrayBuffers;
    let slowest = 0;
    let refused = 0;
    for (const [, bytes] of files) {
      const t0 = performance.now();
      const v = pageVerdict(bytes);
      slowest = Math.max(slowest, performance.now() - t0);
      if (!v.ok) refused++;
    }
    const grew = process.memoryUsage().arrayBuffers - before;
    // A few files pass the page check and fail in the realm (the 28 recorded).
    expect(refused).toBeGreaterThanOrEqual(files.length - 28);
    expect(grew).toBeLessThan(BOUNDS.refusalArrayBufferBytes);
    expect(slowest).toBeLessThan(BOUNDS.refusalMsNode);
  });
});

describe('what a reader may state, and what the contract then says', () => {
  const frame = ({ cards = [], bitpix = 16, width = 8, height = 6 } = {}) => ({
    ...readFits(new Uint8Array(fitsImage({ bitpix, width, height, cards }))),
    kind: 'fits',
  });
  const claimed = frame({ cards: CLAIMS_CARDS });

  test('the header’s claims are proposed with the card each came from, and none is invented', () => {
    const { fields, from } = proposeFields(claimed);
    expect(fields).toMatchObject({
      pixelsAre: 'light',
      unit: 'adu',
      exposure: '30',
      gain: '1.5',
      readNoise: '4.25',
      saturation: '60000',
      time: { value: '2026-03-14T02:15:30', scale: 'UTC', reference: 'start' },
      linearLimit: '',
      calibration: '',
    });
    expect(from.gain).toBe('header GAIN');
    expect(from.time).toBe('header DATE-OBS');
    expect(from.timeScale).toBe('header TIMESYS');
    const bare = proposeFields(frame());
    expect(bare.fields.pixelsAre).toBe('display');
    expect(bare.fields.time).toEqual({
      value: '',
      scale: '',
      reference: 'start',
    });
    expect(bare.from).toEqual({});
  });

  test('BUNIT is read by its spellings and nothing else is a unit', () => {
    expect(unitOfBunit('ADU')).toBe('adu');
    expect(unitOfBunit(' e-/s ')).toBe('electron/s');
    expect(unitOfBunit('counts')).toBe('count');
    expect(unitOfBunit('DN')).toBeNull();
    expect(unitOfBunit(undefined)).toBeNull();
  });

  test('the header alone leaves photometry refused and says exactly what is missing', () => {
    const { fields, from } = proposeFields(claimed);
    const side = buildSidecar(claimed, fields, { id: 'x', from });
    expect(validateImage(side).ok).toBe(true);
    const v = verdictOf(side);
    expect(v.marking.ok).toBe(true);
    expect(v.photometry.code).toBe('incomplete-contract');
    expect(v.photometry.missing).toEqual([
      'pixels.linearity',
      'calibration.state',
    ]);
    expect(v.photometry.missing.every(m => m in GAP_WORD)).toBe(true);
  });

  test('stating the rest makes it quantitative, and the numbers keep their sources', () => {
    const { fields, from } = proposeFields(claimed);
    fields.linearLimit = '50000';
    fields.linearHow = 'the camera’s data sheet';
    fields.calibration = 'calibrated';
    expect(fieldProblems(fields)).toEqual([]);
    const side = buildSidecar(claimed, fields, { id: 'x', from });
    const v = verdictOf(side);
    expect(v.photometry).toEqual({ ok: true });
    expect(side.pixels.gain).toMatchObject({ value: 1.5, source: 'header' });
    expect(side.pixels.linearity).toMatchObject({
      status: 'linear',
      limit: 50000,
      source: 'the camera’s data sheet',
    });
    expect(side.time).toEqual({
      value: '2026-03-14T02:15:30',
      scale: 'UTC',
      format: 'iso',
      reference: 'start',
    });
    // A number the reader typed is the reader's.
    fields.gain = '2';
    const typed = buildSidecar(claimed, fields, { id: 'x', from: {} });
    expect(typed.pixels.gain).toMatchObject({
      value: 2,
      source: 'assumed',
      note: 'typed by the reader on import',
    });
  });

  test('astrometry is the header’s world coordinates or nothing', () => {
    const none = buildSidecar(claimed, proposeFields(claimed).fields, {
      id: 'x',
    });
    expect(verdictOf(none).astrometry.code).toBe('no-wcs');
  });

  test('a PNG and a JPEG are display-only in the contract’s own words, marks allowed', () => {
    for (const kind of ['png', 'jpeg']) {
      const read = { kind, width: 4, height: 3, depth: 8 };
      const { fields } = proposeFields(read);
      expect(fields.pixelsAre).toBe('display');
      const side = buildSidecar(read, fields, { id: 'p' });
      expect(side.use).toBe('display-only');
      expect(side.pixels.unit).toBe('display');
      expect(side.source.kind).toBe('upload');
      const v = verdictOf(side);
      expect(v.marking.ok).toBe(true);
      for (const op of ['photometry', 'astrometry']) {
        expect(v[op].ok).toBe(false);
        expect(v[op].code).toBe('display-only');
        expect(v[op].message).toBe(permits(side, op).message);
        expect(v[op].message).toMatch(
          /^This image is display-only: it can be marked, but /
        );
      }
    }
    const jpegSide = buildSidecar(
      { kind: 'jpeg', width: 2, height: 2 },
      proposeFields({ kind: 'jpeg' }).fields,
      { id: 'j' }
    );
    expect(jpegSide.history[0].lossy).toBe(true);
    const g16 = buildSidecar(
      { kind: 'png', width: 2, height: 2, depth: 16 },
      proposeFields({ kind: 'png' }).fields,
      { id: 'k' }
    );
    expect(g16.history[0].lossy).toBe(true);
    const g8 = buildSidecar(
      { kind: 'png', width: 2, height: 2, depth: 8 },
      proposeFields({ kind: 'png' }).fields,
      { id: 'k' }
    );
    expect(g8.history[0].lossy).toBe(false);
  });

  test('a time needs its scale, a scale a positive number, an orientation 0 up to 360', () => {
    const f = () => proposeFields({ kind: 'png' }).fields;
    const codes = fields =>
      fieldProblems(fields).map(p => `${p.field}:${p.code}`);
    expect(codes(f())).toEqual([]);
    const a = f();
    a.time.value = '2026-03-14T02:15:30';
    expect(codes(a)).toEqual(['timeScale:timeScale']);
    a.time.scale = 'UTC';
    expect(codes(a)).toEqual([]);
    const b = f();
    b.time.scale = 'TT';
    expect(codes(b)).toEqual(['time:timeValue']);
    const c = f();
    c.time = { value: 'yesterday', scale: 'UTC', reference: 'mid' };
    expect(codes(c)).toEqual(['time:timeFormat']);
    c.time.value = '2026-13-45T99:99:99';
    expect(codes(c)).toEqual(['time:timeFormat']);
    for (const bad of ['0', '-1', '3600.5', 'x']) {
      const d = f();
      d.scale = bad;
      expect(codes(d)).toEqual(['scale:scaleRange']);
    }
    for (const bad of ['-0.1', '360', '720', 'north']) {
      const d = f();
      d.orientation.angle = bad;
      expect(codes(d)).toEqual(['orientation:orientationRange']);
    }
    for (const good of ['0', '359.99', '90']) {
      const d = f();
      d.orientation.angle = good;
      expect(codes(d)).toEqual([]);
    }
    const e = frame({ cards: CLAIMS_CARDS });
    const g = proposeFields(e).fields;
    g.gain = '0';
    g.readNoise = '-1';
    g.linearLimit = '100';
    expect(codes(g).sort()).toEqual(
      [
        'gain:gainRange',
        'linearHow:linearHow',
        'readNoise:readNoiseRange',
      ].sort()
    );
  });
});

describe('the observation an import becomes', () => {
  const digest = 'ab'.repeat(32);
  const read = {
    kind: 'png',
    width: 5,
    height: 3,
    depth: 8,
    values: Float64Array.from({ length: 15 }, (_, i) => i * 10),
  };

  test('it is a valid image observation, display-only, with provenance and the reader’s statements', () => {
    const { fields, from } = proposeFields(read);
    fields.time = {
      value: '2026-03-14T02:15:30',
      scale: 'UTC',
      reference: 'mid',
    };
    fields.scale = '0.5';
    fields.orientation = { angle: '12.5', east: 'right' };
    expect(fieldProblems(fields)).toEqual([]);
    const side = buildSidecar(read, fields, {
      id: 'import:image-abababababab',
      from,
    });
    const o = buildObservation(read, side, {
      name: 'moon.png',
      bytes: 1234,
      digest,
      fields,
      from,
    });
    expect(validateObservation(o)).toEqual([]);
    expect(o.origin).toBe('imported');
    expect(o.source).toEqual({
      kind: 'import',
      id: 'moon.png',
      version: null,
      file: { name: 'moon.png', bytes: 1234, digest },
    });
    expect(o.title).toBe('moon');
    expect(o.id).toBe('import:image-abababababab');
    expect(columnOf(o, 'x').values).toBeInstanceOf(Uint16Array);
    expect(Array.from(columnOf(o, 'x').values.slice(0, 6))).toEqual([
      1, 2, 3, 4, 5, 1,
    ]);
    expect(Array.from(columnOf(o, 'y').values.slice(0, 6))).toEqual([
      1, 1, 1, 1, 1, 2,
    ]);
    expect(columnOf(o, 'v').values).toBe(read.values);
    expect(columnOf(o, 'v').unit).toBe('');
    expect(o.image.sidecar).toBe(side);
    expect(o.image.time).toEqual(side.time);
    expect(o.image.import).toEqual({
      kind: 'png',
      orientation: { angle: 12.5, east: 'right' },
      statedByReader: ['time', 'scale', 'orientation'],
      fromHeader: {},
    });
    expect(side.scale).toEqual({ arcsecPerPixel: 0.5 });
  });

  test('a FITS frame keeps its world coordinates, its blanks and its unit', () => {
    const claimed = {
      ...readFits(
        new Uint8Array(
          fitsImage({
            bitpix: -32,
            width: 4,
            height: 4,
            values: Array.from({ length: 16 }, (_, i) => (i === 3 ? NaN : i)),
            cards: [
              ...CLAIMS_CARDS,
              ['CTYPE1', 'RA---TAN'],
              ['CTYPE2', 'DEC--TAN'],
              ['CRPIX1', 2],
              ['CRPIX2', 2],
              ['CRVAL1', 10],
              ['CRVAL2', 20],
              ['CDELT1', -0.001],
              ['CDELT2', 0.001],
            ],
          })
        )
      ),
      kind: 'fits',
    };
    const { fields, from } = proposeFields(claimed);
    const side = buildSidecar(claimed, fields, { id: 'import:image-1', from });
    const o = buildObservation(claimed, side, {
      name: 'frame.fits',
      bytes: 11520,
      digest,
      fields,
      from,
    });
    expect(validateObservation(o)).toEqual([]);
    expect(o.image.wcs).toBe(claimed.wcs);
    expect(side.wcs).toBe(claimed.wcs);
    expect(Number.isNaN(columnOf(o, 'v').values[3])).toBe(true);
    expect(side.use).toBe('quantitative');
    expect(columnOf(o, 'v').unit).toBeNull();
    expect(o.image.import.fromHeader.gain).toBe('header GAIN');
    expect(verdictOf(side).astrometry.ok).toBe(true);
  });

  test('luma is Rec. 601 on the decoder’s bytes and the rows are turned to FITS order', () => {
    const rgba = Uint8ClampedArray.from([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const g = lumaPlane(rgba, 2, 2);
    expect(Array.from(g)).toEqual([76.245, 149.685, 29.07, 255]);
    expect(Array.from(flipRows(g, 2, 2))).toEqual([
      29.07, 255, 76.245, 149.685,
    ]);
    expect(() => lumaPlane(rgba, 3, 2)).toThrow(/not 3 by 2/);
    let at = -1;
    expect(() =>
      lumaPlane(new Uint8Array(4 * 128 * 128), 128, 128, {
        isCancelled: () => ++at >= 1,
      })
    ).toThrow(/canceled/);
  });
});

describe('the words', () => {
  const keys = o => Object.keys(o).sort();
  const slots = s => (s.match(/\{[a-z]+\}/gi) ?? []).sort().join(',');

  test('English and Spanish carry the same ids and the same placeholders', () => {
    expect(keys(ES_IMAGEIMPORT)).toEqual(keys(EN_IMAGEIMPORT));
    for (const k of keys(EN_IMAGEIMPORT))
      expect([k, slots(ES_IMAGEIMPORT[k])]).toEqual([
        k,
        slots(EN_IMAGEIMPORT[k]),
      ]);
    for (const k of keys(ES_IMAGEIMPORT))
      expect(ES_IMAGEIMPORT[k].trim()).not.toBe('');
  });

  test('every refusal code has a sentence of its own in both, and the panel’s list is the cases’', () => {
    expect([...CODES].sort()).toEqual([...REFUSAL_CODES].sort());
    for (const code of CODES)
      for (const words of [EN_IMAGEIMPORT, ES_IMAGEIMPORT])
        expect(words[`obs.imp.no.${code}`]).toBeTruthy();
    for (const code of WHY)
      for (const words of [EN_IMAGEIMPORT, ES_IMAGEIMPORT])
        expect(words[`obs.imp.why.${code}`]).toBeTruthy();
    for (const id of REQUIRED_WORD_IDS) {
      expect(EN_IMAGEIMPORT[id]).toBeTruthy();
      expect(ES_IMAGEIMPORT[id]).toBeTruthy();
    }
    // Every code any committed case can produce is one the panel says.
    const produced = new Set([
      ...RASTER_REFUSE.map(r => r[3]),
      ...fits.cases.map(c => c.code),
    ]);
    for (const c of produced) expect(CODES).toContain(c);
  });

  test('the effect of each field a reader fills is stated, and the display-only paragraph says what is refused', () => {
    for (const id of [
      'obs.imp.effect.time',
      'obs.imp.effect.scale',
      'obs.imp.effect.orientation',
    ]) {
      expect(EN_IMAGEIMPORT[id].length).toBeGreaterThan(60);
      expect(ES_IMAGEIMPORT[id].length).toBeGreaterThan(60);
    }
    expect(EN_IMAGEIMPORT['obs.imp.displayOnly']).toMatch(
      /Photometry and astrometry are refused/
    );
    expect(ES_IMAGEIMPORT['obs.imp.displayOnly']).toMatch(
      /fotometría y la astrometría se rechazan/
    );
    expect(EN_IMAGEIMPORT['obs.imp.needs']).toMatch(/linear/);
  });
});

describe('the install', () => {
  test('the readers, the panel and its words are never precached, and the manifest carries none', async () => {
    const files = [
      'js/dataKinds/raster.js',
      'js/dataKinds/rasterJob.js',
      'js/dataKinds/fits.js',
      'js/dataKinds/fitsJob.js',
      'js/dataKinds/fitsWorker.js',
      'js/observatory/imageImport.js',
      'js/i18n/en.imageImport.js',
      'js/i18n/es.imageImport.js',
    ];
    for (const f of files)
      expect([f, NEVER_PRECACHED.some(re => re.test(f))]).toEqual([f, true]);
    const { paths } = await buildManifest();
    for (const f of files) expect(paths).not.toContain(f);
  });
});

describe('the cancel probe’s record', () => {
  const rec = JSON.parse(
    readFileSync(
      new URL('../tools/import-cancel-results.json', import.meta.url),
      'utf8'
    )
  );

  test('the recorded bounds are the committed ones and every recorded row passed them', () => {
    expect(rec.bounds).toEqual({
      ledgerBytes: BOUNDS.cancelledLedgerBytes,
      workersEndedWithinMs: BOUNDS.cancelledWorkersAfterMs,
      heapGrowthBytes: BOUNDS.cancelledHeapBytes,
    });
    expect(rec.rows.map(r => `${r.profile} ${r.mode}`).sort()).toEqual([
      'desktop cancel',
      'desktop close',
      'low-end cancel',
      'low-end close',
    ]);
    for (const r of rec.rows) {
      expect(r.ledgerAfterCancel).toBe(BOUNDS.cancelledLedgerBytes);
      expect(r.workers.started).toBe(r.workers.ended);
      expect(r.growthBytes).toBeLessThanOrEqual(BOUNDS.cancelledHeapBytes);
      expect(r.verdict).toBe('pass');
    }
    // The cancelled read really was in flight: the ledger held the file and the plane.
    for (const r of rec.rows.filter(x => x.mode === 'cancel'))
      expect(r.heldInFlight).toBeGreaterThan(60_000_000);
  });

  test('the save limit is the table import’s row limit', async () => {
    const { LIMITS: table } = await import('../js/observatory/import.js');
    const { SAVE_ROWS } = await import('../js/observatory/imageImport.js');
    expect(SAVE_ROWS).toBe(table.rows);
  });
});
