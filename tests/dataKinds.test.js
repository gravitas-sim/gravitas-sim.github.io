import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import {
  ACCEPT,
  BLOCK,
  BOUNDARY,
  CONSERVE,
  DECODED_BYTES,
  DISPLAY_FACTORS,
  DOWNSAMPLE,
  GOOD_IMAGE,
  GRID_CASES,
  GRID_POINTS,
  GRID_REFUSED,
  IMAGE_CASES,
  LIMITS_EXPECTED,
  NOT_BUFFERS,
  REFUSE,
  RESIDENT,
  SEQUENCE_CASES,
  SWEEP,
  TOL,
  WCS_ANALYTIC,
  WCS_SWEEP,
  blockMean,
  file,
  gridFn,
  goodGrid,
  goodImage,
  goodSequence,
  hdu,
  image,
  lcg,
  skyByVectors,
  tanCards,
} from '../tools/data-kinds-cases.mjs';
import {
  DataKindError,
  LIMITS,
  checkFrame,
  decodedBytes,
  displayPlan,
  downsampleMean,
  residentFrames,
  toDrawn,
  toFull,
} from '../js/dataKinds/limits.js';
import { locateImage, readFits } from '../js/dataKinds/fits.js';
import {
  DATA_KINDS,
  frameOf,
  permits,
  validateGrid,
  validateImage,
  validateImageSequence,
} from '../js/dataKinds/contract.js';
import { readGrid } from '../js/dataKinds/grid.js';
import {
  decodePlane,
  imagePlanesOfPack,
  readImagePlanes,
} from '../js/dataKinds/planes.js';
import { draftSidecar } from '../js/dataKinds/draft.js';
import { skyOf } from '../js/observatory/wcs.js';

// =============================================================================
// Prompt 157: the data kinds, held to cases committed before the code
// -----------------------------------------------------------------------------
// tools/data-kinds-cases.mjs holds every limit, refusal code, oracle and
// tolerance; this runs js/dataKinds/ against them.
// =============================================================================

const same = (a, b) => Object.is(a, b);
const arr = u8 => new Uint8Array(u8.buffer, u8.byteOffset, u8.byteLength);
const refusal = fn => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
};

describe('the limits are the committed ones', () => {
  test('LIMITS equals what was written down first', () => {
    expect(LIMITS).toEqual(LIMITS_EXPECTED);
  });

  test('a frame of the largest size is one 32 MiB Float64 plane', () => {
    expect(LIMITS.maxPixels * 8).toBe(33554432);
    expect(LIMITS.maxPixels).toBe(2048 * 2048);
    // The largest file: an empty primary header, an image header of 16 blocks
    // and 2,048 x 2,048 pixels of 8 bytes padded to whole blocks.
    const dataBlocks = Math.ceil((LIMITS.maxPixels * 8) / BLOCK) * BLOCK;
    expect(LIMITS.maxFileBytes).toBe(
      dataBlocks + 2 * LIMITS.maxHeaderBlocks * BLOCK
    );
    expect(LIMITS.maxCards).toBe(LIMITS.maxHeaderBlocks * 36);
  });

  test('the page ceiling is the data budget key it names', () => {
    const budget = JSON.parse(readFileSync('tools/data-budget.json', 'utf8'));
    const row = budget.ceilings.find(c => c.key === 'decodedImageBytesPerPage');
    expect(LIMITS.maxDecodedBytes).toBe(row.ceiling);
  });

  test.each(DECODED_BYTES)(
    'decodedBytes %i x %i %j = %i',
    (w, h, planes, bytes) => {
      expect(decodedBytes(w, h, planes)).toBe(bytes);
    }
  );

  test.each(RESIDENT)(
    '%i x %i %j keeps %i frames resident',
    (w, h, planes, n) => {
      expect(residentFrames(w, h, planes)).toBe(n);
    }
  );

  test('checkFrame names the first limit it crosses, and allocates nothing', () => {
    expect(checkFrame(2048, 2048)).toMatchObject({
      ok: true,
      pixels: 4194304,
      bytes: 33554432,
    });
    expect(
      checkFrame(2048, 2048, { data: true, variance: true })
    ).toMatchObject({ ok: true });
    expect(
      checkFrame(2048, 2048, { data: true, variance: true, mask: true })
    ).toMatchObject({ ok: false, code: 'too-large' });
    expect(checkFrame(8193, 1).message).toMatch(/8192/);
    expect(checkFrame(3000, 3000).message).toMatch(/4194304/);
    expect(checkFrame(2.5, 2)).toMatchObject({
      ok: false,
      code: 'axis-invalid',
    });
    expect(checkFrame(0, 2)).toMatchObject({ ok: false, code: 'axis-invalid' });
    expect(checkFrame(Infinity, 2)).toMatchObject({ ok: false });
  });
});

describe('the display rule', () => {
  test.each(DISPLAY_FACTORS)(
    '%i x %i is drawn at a factor of %i',
    (w, h, k) => {
      const plan = displayPlan(w, h);
      expect(plan.factor).toBe(k);
      expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(
        LIMITS.maxDisplaySide
      );
      expect(plan.rgbaBytes).toBe(4 * plan.width * plan.height);
      expect(plan.rgbaBytes).toBeLessThanOrEqual(
        4 * LIMITS.maxDisplaySide ** 2
      );
    }
  );

  test.each(DOWNSAMPLE)('block means: $name', c => {
    const out = downsampleMean(
      Float64Array.from(c.values),
      c.width,
      c.height,
      c.k
    );
    const want = blockMean(c.values, c.width, c.height, c.k);
    expect([out.width, out.height]).toEqual([want.width, want.height]);
    for (let i = 0; i < want.values.length; i++)
      expect(same(out.values[i], want.values[i])).toBe(true);
  });

  test('a total of floats is conserved to the stated tolerance', () => {
    const { seed, width, height, k } = CONSERVE;
    const next = lcg(seed);
    const values = Float64Array.from(
      { length: width * height },
      () => next() * 1000
    );
    const out = downsampleMean(values, width, height, k);
    const sum = a => a.reduce((s, v) => s + v, 0);
    const want = sum(values);
    expect(Math.abs(sum(out.values) * k * k - want) / want).toBeLessThan(
      TOL.blockMeanFloat.value
    );
    const o2 = blockMean(Array.from(values), width, height, k);
    out.values.forEach((v, i) =>
      expect(Math.abs(v - o2.values[i]) / o2.values[i]).toBeLessThan(
        TOL.blockMeanFloat.value
      )
    );
  });

  test('a drawn coordinate maps back to full resolution and returns', () => {
    for (const k of [1, 2, 3, 8]) {
      expect(toFull(1, k)).toBe((k + 1) / 2);
      for (const x of [1, 1.5, 7.25, 100])
        expect(Math.abs(toDrawn(toFull(x, k), k) - x)).toBeLessThan(1e-12);
    }
    // The centre of the first drawn pixel is the middle of the first k full pixels.
    expect(toFull(1, 2)).toBe(1.5);
  });
});

describe('FITS: what the reader reads', () => {
  test.each(ACCEPT)('$name', c => {
    const buf = c.file();
    const r = readFits(buf);
    expect([r.width, r.height]).toEqual([c.width, c.height]);
    expect(r.values).toBeInstanceOf(Float64Array);
    expect(r.values.length).toBe(c.values.length);
    c.values.forEach((v, i) => expect(same(r.values[i], v)).toBe(true));
    expect(r.nanPixels).toBe(c.nanPixels ?? 0);
    expect(r.hdu).toBe(c.hdu ?? 0);
    expect(r.decodedBytes).toBe(8 * c.width * c.height);
  });

  test('FITS is big-endian: the bytes 0x01 0x02 are 258', () => {
    const buf = hdu({ bitpix: 16, axes: [1, 1], data: Buffer.from([1, 2]) });
    expect(readFits(buf).values[0]).toBe(258);
  });

  test.each(BOUNDARY)('%j', ({ width, height, ok }) => {
    if (ok) {
      const buf = image({
        bitpix: 16,
        width,
        height,
        values: new Array(width * height).fill(3),
      });
      const r = readFits(buf);
      expect(r.values.length).toBe(width * height);
      expect(r.decodedBytes).toBeLessThanOrEqual(LIMITS.maxDecodedBytes);
    } else {
      // The header alone, 2,880 bytes: the bound is checked before the data is looked for.
      const buf = hdu({
        bitpix: 16,
        axes: [width, height],
        data: Buffer.alloc(0),
      });
      expect(refusal(() => readFits(buf))).toMatchObject({ code: 'too-large' });
    }
  });

  test('a file larger than any admissible frame is refused before a byte is read', () => {
    const e = refusal(() =>
      locateImage(new ArrayBuffer(LIMITS.maxFileBytes + 1))
    );
    expect(e).toMatchObject({ code: 'file-too-large' });
    expect(
      refusal(() => locateImage(new ArrayBuffer(LIMITS.maxFileBytes)))
    ).toMatchObject({ code: 'not-fits' });
  });

  test('headers and claims: the header values come back, each with its card', () => {
    const buf = image({
      bitpix: 16,
      width: 2,
      height: 2,
      cards: [
        ['GAIN', 1.5],
        ['RDNOISE', 4.25],
        ['SATURATE', 60000],
        ['EXPTIME', 30],
        ['DATE-OBS', '2026-03-01T04:05:06'],
        ['BUNIT', 'adu'],
        ['OBJECT', 'M 13'],
      ],
    });
    const r = readFits(buf);
    expect(r.claims.gain).toEqual({ value: 1.5, source: 'header GAIN' });
    expect(r.claims.readNoise.value).toBe(4.25);
    expect(r.claims.dateObs.value).toBe('2026-03-01T04:05:06');
    expect(r.claims.unit.value).toBe('adu');
    expect(r.header.OBJECT).toBe('M 13');
    expect(r.header.EXPTIME).toBe(30);
  });
});

describe('FITS: what the reader refuses', () => {
  test.each(REFUSE)('%s is refused as %s', (name, build, code) => {
    const buf = build();
    const e = refusal(() => readFits(buf));
    expect(e).toBeInstanceOf(DataKindError);
    expect({ name, code: e.code }).toEqual({ name, code });
    expect(e.message.length).toBeGreaterThan(12);
    expect(e.message).not.toMatch(/undefined|\[object|null/);
  });

  test.each(NOT_BUFFERS.map(v => [String(v), v]))(
    '%s is not a file',
    (_n, v) => {
      expect(refusal(() => readFits(v))).toMatchObject({ code: 'not-fits' });
    }
  );

  test('the header check and the full read refuse the same files, and never allocate the plane', () => {
    for (const [, build, code] of REFUSE) {
      const buf = build();
      const e = refusal(() => locateImage(buf));
      // A scale, a blank or a world coordinate is judged when the plane is read.
      if (e) expect(e.code).toBe(code);
      else
        expect(
          [
            'scale-invalid',
            'nonfinite-header',
            'blank-invalid',
            'card-malformed',
            'nonfinite-pixel',
          ].includes(code) || code.startsWith('wcs-')
        ).toBe(true);
    }
  });

  test('a refusal leaves the source bytes alone', () => {
    const buf = Buffer.from(REFUSE[5][1]());
    const before = Buffer.from(buf);
    refusal(() => readFits(buf));
    expect(buf.equals(before)).toBe(true);
  });

  test('cancellation: refused as canceled, polled between rows', () => {
    const buf = image({ bitpix: 16, width: 512, height: 512 });
    expect(
      refusal(() => readFits(buf, { isCancelled: () => true }))
    ).toMatchObject({ code: 'canceled' });
    let calls = 0;
    const e = refusal(() => readFits(buf, { isCancelled: () => ++calls > 2 }));
    expect(e).toMatchObject({ code: 'canceled' });
    expect(calls).toBe(3);
    const progress = [];
    readFits(buf, { onProgress: f => progress.push(f) });
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((f, i) => i === 0 || f >= progress[i - 1])).toBe(
      true
    );
  });
});

describe('FITS: the adversarial sweep never meets a stranger', () => {
  const bases = [
    image({ bitpix: 16, width: 8, height: 4, cards: tanCards() }),
    file(
      hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
      hdu({
        kind: 'IMAGE',
        bitpix: -32,
        axes: [5, 3],
        values: Array.from({ length: 15 }, (_, i) => i / 3),
        cards: [['BSCALE', 2]],
      })
    ),
    file(
      image({ bitpix: 32, width: 3, height: 3 }),
      hdu({ kind: 'BINTABLE', bitpix: 8, axes: [8, 2], data: Buffer.alloc(16) })
    ),
  ];
  const outcome = buf => {
    try {
      const r = readFits(buf);
      expect(r.values.length).toBe(r.width * r.height);
      expect(r.decodedBytes).toBeLessThanOrEqual(LIMITS.maxDecodedBytes);
      return 'read';
    } catch (e) {
      if (!(e instanceof DataKindError))
        throw new Error(`a stranger: ${e?.constructor?.name}: ${e?.message}`);
      return e.code;
    }
  };

  test('header bytes changed at random, and files cut short', () => {
    const next = lcg(SWEEP.seed);
    const counts = {};
    for (let n = 0; n < SWEEP.headerMutations; n++) {
      const base = Buffer.from(bases[n % bases.length]);
      const kind = next();
      let buf = base;
      if (kind < 0.6) {
        const at = Math.floor(next() * Math.min(base.length, 2 * BLOCK));
        buf[at] = Math.floor(next() * 256);
      } else if (kind < 0.8) {
        const at = Math.floor(next() * Math.min(base.length, 2 * BLOCK));
        buf[at] = [0x20, 0x30, 0x39, 0x2d, 0x2e, 0x45, 0x27, 0x3d][
          Math.floor(next() * 8)
        ];
      } else buf = base.subarray(0, Math.floor(next() * base.length));
      const o = outcome(buf);
      counts[o] = (counts[o] ?? 0) + 1;
    }
    // Most single-byte edits of a header change nothing that matters or are refused, and both are fine.
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(
      SWEEP.headerMutations
    );
    expect(counts.read).toBeGreaterThan(0);
    expect(Object.keys(counts).length).toBeGreaterThan(4);
  });

  test('data bytes changed at random read as the same shape with one pixel different', () => {
    const next = lcg(SWEEP.seed + 1);
    const base = Buffer.from(bases[0]);
    const want = readFits(base);
    for (let n = 0; n < SWEEP.dataMutations; n++) {
      const buf = Buffer.from(base);
      const at = BLOCK + Math.floor(next() * 8 * 4 * 2);
      buf[at] = Math.floor(next() * 256);
      const r = readFits(buf);
      expect([r.width, r.height]).toEqual([want.width, want.height]);
      const pixel = Math.floor((at - BLOCK) / 2);
      for (let i = 0; i < want.values.length; i++)
        if (i !== pixel) expect(same(r.values[i], want.values[i])).toBe(true);
    }
  });
});

describe('FITS: world coordinates', () => {
  const RAD = Math.PI / 180;
  const wrap = d => ((((d + 180) % 360) + 360) % 360) - 180;
  const sky = (cards, x, y) =>
    skyOf(
      readFits(image({ bitpix: 16, width: 2, height: 2, cards })).wcs,
      x,
      y
    );

  test('the aperture pack: the reader gives the WCS the pack records, bit for bit', () => {
    const pack = JSON.parse(
      readFileSync('data-packs/tess-hd209458-s56-aperture.json', 'utf8')
    );
    const w = pack.image.wcs;
    const r = readFits(
      image({
        bitpix: 16,
        width: 2,
        height: 2,
        cards: tanCards({
          crpix: w.crpix,
          crval: w.crval,
          pc: w.pc,
          cdelt: w.cdelt,
        }),
      })
    );
    expect(r.wcs).toEqual(w);
    for (const [x, y] of [
      [1, 1],
      [6.25, 6.5],
      [11, 13],
    ])
      expect(skyOf(r.wcs, x, y)).toEqual(skyOf(w, x, y));
  });

  test.each(WCS_ANALYTIC.map(c => [c.name, c]))('closed form: %s', (_n, c) => {
    const cdelt = c.cdelt ?? [0.001, 0.001];
    const cards = tanCards({
      crpix: [100, 100],
      crval: c.crval,
      cdelt,
      pc: [
        [1, 0],
        [0, 1],
      ],
    });
    const p = sky(cards, 100 + c.dx, 100 + c.dy);
    const terms = { xi: cdelt[0] * c.dx * RAD, eta: cdelt[1] * c.dy * RAD };
    expect(Math.abs(wrap(p.ra - c.ra(terms)))).toBeLessThan(
      TOL.wcsDegrees.value
    );
    expect(Math.abs(p.dec - c.dec(terms))).toBeLessThan(TOL.wcsDegrees.value);
  });

  test('against rotation of vectors, over a seeded sweep', () => {
    const next = lcg(WCS_SWEEP.seed);
    let worst = 0;
    for (let n = 0; n < WCS_SWEEP.points; n++) {
      const dec0 = (next() * 2 - 1) * WCS_SWEEP.maxAbsDec0;
      const ra0 = next() * 360;
      const cdelt = [0.002, 0.002];
      const rho = (next() * 2 - 1) * 180 * RAD;
      const pc = [
        [Math.cos(rho), -Math.sin(rho)],
        [Math.sin(rho), Math.cos(rho)],
      ];
      const reach = (next() * WCS_SWEEP.maxOffsetRadians) / (cdelt[0] * RAD);
      const dx = (next() * 2 - 1) * reach * 0.7;
      const dy = (next() * 2 - 1) * reach * 0.7;
      const w = readFits(
        image({
          bitpix: 16,
          width: 2,
          height: 2,
          cards: tanCards({ crpix: [50, 50], crval: [ra0, dec0], cdelt, pc }),
        })
      ).wcs;
      const got = skyOf(w, 50 + dx, 50 + dy);
      const xi = cdelt[0] * (pc[0][0] * dx + pc[0][1] * dy);
      const eta = cdelt[1] * (pc[1][0] * dx + pc[1][1] * dy);
      const want = skyByVectors(ra0, dec0, xi, eta);
      worst = Math.max(
        worst,
        Math.abs(wrap(got.ra - want.ra)),
        Math.abs(got.dec - want.dec)
      );
    }
    expect(worst).toBeLessThan(TOL.wcsDegrees.value);
  });

  test('CD, CDELT with PC and CROTA2 give the same sky', () => {
    const cdelt = [-0.0021, 0.0019];
    const rho = 30 * RAD;
    const pc = [
      [Math.cos(rho), -(cdelt[1] / cdelt[0]) * Math.sin(rho)],
      [(cdelt[0] / cdelt[1]) * Math.sin(rho), Math.cos(rho)],
    ];
    const base = tanCards({
      crpix: [20, 30],
      crval: [210, 15],
      cdelt,
      pc,
    }).filter(([k]) => !/^(PC|CDELT)/.test(k));
    const cd = [
      ['CD1_1', cdelt[0] * pc[0][0]],
      ['CD1_2', cdelt[0] * pc[0][1]],
      ['CD2_1', cdelt[1] * pc[1][0]],
      ['CD2_2', cdelt[1] * pc[1][1]],
    ];
    const withPc = tanCards({ crpix: [20, 30], crval: [210, 15], cdelt, pc });
    const withRota = [
      ...base,
      ['CDELT1', cdelt[0]],
      ['CDELT2', cdelt[1]],
      ['CROTA2', 30],
    ];
    for (const [x, y] of [
      [1, 1],
      [20, 30],
      [64, 3],
      [7.5, 48.25],
    ]) {
      const a = sky(withPc, x, y);
      for (const other of [[...base, ...cd], withRota]) {
        const b = sky(other, x, y);
        expect(Math.abs(wrap(a.ra - b.ra))).toBeLessThan(
          TOL.wcsMatrixForms.value
        );
        expect(Math.abs(a.dec - b.dec)).toBeLessThan(TOL.wcsMatrixForms.value);
      }
    }
  });

  test('an image with no CTYPE has no world coordinates, and says null', () => {
    expect(readFits(image({ bitpix: 16, width: 2, height: 2 })).wcs).toBeNull();
  });
});

describe('the image sidecar', () => {
  test('the good frame is the example the cases mutate', () => {
    expect(validateImage(GOOD_IMAGE)).toMatchObject({ ok: true });
  });

  test.each(IMAGE_CASES.map(c => [c[0], c]))('%s', (_n, [, change, want]) => {
    const doc = goodImage();
    change(doc);
    const v = validateImage(doc);
    expect(v.ok).toBe(want.valid);
    if (!want.valid) {
      expect(v.problems.length).toBeGreaterThan(0);
      if (want.code) expect(v.problems.map(p => p.code)).toContain(want.code);
      expect(permits(doc, 'marking')).toMatchObject({
        ok: false,
        code: 'invalid',
      });
      return;
    }
    for (const op of ['marking', 'photometry', 'astrometry']) {
      const got = permits(doc, op);
      const expected = want[op];
      if (expected === true) expect({ op, ...got }).toEqual({ op, ok: true });
      else {
        expect({ op, ok: got.ok, code: got.code }).toEqual({
          op,
          ok: false,
          code: expected,
        });
        expect(got.message.length).toBeGreaterThan(20);
        if (want.missing && op === 'photometry')
          expect(got.missing).toEqual(want.missing);
      }
    }
  });

  test('a refusal tells a student what to do, not a code', () => {
    const d = goodImage();
    d.use = 'display-only';
    expect(permits(d, 'photometry').message).toMatch(/display-only/);
    expect(permits(d, 'photometry').message).toMatch(/marked/);
    d.use = 'quantitative';
    delete d.pixels.gain;
    expect(permits(d, 'photometry').message).toMatch(/noise/);
  });

  test('an operation that does not exist is a programming error', () => {
    expect(() => permits(goodImage(), 'astronomy')).toThrow(RangeError);
  });

  test('the catalogue of kinds names three', () => {
    expect(DATA_KINDS.map(k => k.kind)).toEqual([
      'image',
      'image-sequence',
      'grid',
    ]);
    expect(DATA_KINDS.map(k => k.format)).toEqual([
      'gravitas.image',
      'gravitas.image-sequence',
      'gravitas.grid',
    ]);
  });
});

describe('the image sequence', () => {
  test.each(SEQUENCE_CASES.map(c => [c[0], c]))(
    '%s',
    (_n, [, change, valid, code]) => {
      const doc = goodSequence();
      change(doc);
      const v = validateImageSequence(doc);
      expect(v.ok).toBe(valid);
      if (code) expect(v.problems.map(p => p.code)).toContain(code);
    }
  );

  test('a sequence of full-size frames keeps two resident, and frames inherit the contract', () => {
    const doc = goodSequence();
    doc.frame.width = 2048;
    doc.frame.height = 2048;
    const v = validateImageSequence(doc);
    expect(v).toMatchObject({ ok: true, resident: 2 });
    expect(permits(doc, 'photometry', 1)).toEqual({ ok: true });
    expect(frameOf(doc, 2).time.value).toBe(doc.frames[2].time.value);
    doc.frames[1].exposure = undefined;
    expect(validateImageSequence(doc).ok).toBe(false);
  });

  test('a display-only sequence is marked and nothing else', () => {
    const doc = goodSequence();
    doc.frame.use = 'display-only';
    expect(permits(doc, 'marking')).toEqual({ ok: true });
    expect(permits(doc, 'photometry', 2)).toMatchObject({
      ok: false,
      code: 'display-only',
    });
  });
});

describe('the grid', () => {
  test.each(GRID_CASES.map(c => [c[0], c]))(
    '%s',
    (_n, [, change, valid, code]) => {
      const doc = goodGrid();
      change(doc);
      const v = validateGrid(doc);
      expect(v.ok).toBe(valid);
      if (code) expect(v.problems.map(p => p.code)).toContain(code);
    }
  );

  test('values at the nodes are exact, between them the multilinear function', () => {
    const g = readGrid(goodGrid());
    expect(g.shape).toEqual([3, 4]);
    for (const { at, exact } of GRID_POINTS) {
      const got = g.interpolate(at);
      const want = gridFn(...at);
      if (exact) expect(same(got, want)).toBe(true);
      else
        expect(Math.abs(got - want) / Math.abs(want)).toBeLessThan(
          TOL.gridMultilinear.value
        );
    }
    expect(g.at([0, 0])).toBe(gridFn(3000, 3.5));
    expect(g.at([2, 3])).toBe(gridFn(5000, 5));
  });

  test.each(GRID_REFUSED.map(p => [JSON.stringify(p), p]))(
    '%s is refused, not extrapolated',
    (_n, p) => {
      expect(refusal(() => readGrid(goodGrid()).interpolate(p))).toBeInstanceOf(
        DataKindError
      );
    }
  );

  test('a point with the wrong number of values, and an index outside, are refused', () => {
    const g = readGrid(goodGrid());
    expect(refusal(() => g.interpolate([3500]))).toMatchObject({
      code: 'not-a-number',
    });
    expect(refusal(() => g.at([3, 0]))).toMatchObject({
      code: 'outside-domain',
    });
    expect(refusal(() => g.at([0.5, 0]))).toMatchObject({
      code: 'outside-domain',
    });
    expect(refusal(() => g.interpolate([3500, 4], 'nothing'))).toMatchObject({
      code: 'no-output',
    });
  });

  test('a part is read from the bytes it names, and only those', () => {
    const doc = goodGrid();
    const bytes = Buffer.from(doc.storage.data, 'base64');
    const url = `/parts/g.${'ab12cd34ef567890'}.bin`;
    doc.storage = {
      encoding: 'float64-le',
      part: {
        id: 'g',
        url,
        sha256: `ab12cd34ef567890${'0'.repeat(48)}`,
        bytes: bytes.length,
      },
    };
    expect(readGrid(doc, arr(bytes)).at([1, 1])).toBe(gridFn(4000, 4));
    expect(refusal(() => readGrid(doc, arr(bytes).subarray(8)))).toMatchObject({
      code: 'bad-size',
    });
    expect(refusal(() => readGrid(doc))).toMatchObject({ code: 'bad-size' });
  });

  test('float32 values come back as what float32 holds', () => {
    const doc = goodGrid();
    const f = Buffer.alloc(48);
    const src = Buffer.from(doc.storage.data, 'base64');
    for (let i = 0; i < 12; i++) f.writeFloatLE(src.readDoubleLE(8 * i), 4 * i);
    doc.storage = { encoding: 'float32-le', data: f.toString('base64') };
    expect(readGrid(doc).at([2, 2])).toBe(Math.fround(gridFn(5000, 4.5)));
  });
});

describe('planes and drafts', () => {
  test.each([
    ['uint8', 1, (b, v, i) => b.writeUInt8(v, i), [0, 7, 255]],
    ['uint16-le', 2, (b, v, i) => b.writeUInt16LE(v, i), [0, 1, 65535]],
    ['int16-le', 2, (b, v, i) => b.writeInt16LE(v, i), [-32768, 0, 32767]],
    ['uint32-le', 4, (b, v, i) => b.writeUInt32LE(v, i), [0, 1, 4294967295]],
    [
      'int32-le',
      4,
      (b, v, i) => b.writeInt32LE(v, i),
      [-2147483648, 5, 2147483647],
    ],
    [
      'float32-le',
      4,
      (b, v, i) => b.writeFloatLE(v, i),
      [0.1, -2.5, 1e20].map(Math.fround),
    ],
    ['float64-le', 8, (b, v, i) => b.writeDoubleLE(v, i), [Math.PI, -0, 1e300]],
  ])('%s decodes exactly', (enc, size, put, values) => {
    const b = Buffer.alloc(size * 3);
    values.forEach((v, i) => put(b, v, i * size));
    const out = decodePlane(enc, arr(b), 3, 1);
    values.forEach((v, i) => expect(same(out[i], v)).toBe(true));
    expect(
      refusal(() => decodePlane(enc, arr(b).subarray(1), 3, 1))
    ).toMatchObject({ code: 'bad-size' });
  });

  test('a plane is refused by its declared size before it is decoded', () => {
    expect(
      refusal(() => decodePlane('uint8', new Uint8Array(4), 4097, 4097))
    ).toMatchObject({ code: 'too-large' });
    expect(
      refusal(() => decodePlane('uint9', new Uint8Array(4), 2, 2))
    ).toMatchObject({ code: 'bad-encoding' });
  });

  test('readImagePlanes decodes the planes a sidecar names', () => {
    const doc = goodImage();
    doc.width = 3;
    doc.height = 2;
    doc.planes = {
      data: { encoding: 'uint16-le' },
      variance: { encoding: 'float32-le', unit: 'adu2', source: 'pipeline' },
      mask: {
        encoding: 'uint8',
        bits: [{ value: 1, meaning: 'bad' }],
        bitsSource: 'pipeline',
      },
    };
    const data = Buffer.alloc(12);
    [1, 2, 3, 4, 5, 60000].forEach((v, i) => data.writeUInt16LE(v, 2 * i));
    const variance = Buffer.alloc(24);
    [1.5, 2, 3, 4, 5, 6].forEach((v, i) => variance.writeFloatLE(v, 4 * i));
    const mask = Buffer.from([0, 1, 0, 0, 1, 1]);
    const r = readImagePlanes(doc, {
      data: arr(data),
      variance: arr(variance),
      mask: arr(mask),
    });
    expect([...r.data]).toEqual([1, 2, 3, 4, 5, 60000]);
    expect(r.variance[0]).toBe(1.5);
    expect(r.mask).toBeInstanceOf(Uint16Array);
    expect([...r.mask]).toEqual([0, 1, 0, 0, 1, 1]);
    expect(
      refusal(() =>
        readImagePlanes(doc, { data: arr(data), variance: arr(variance) })
      )
    ).toMatchObject({ code: 'bad-size' });
    doc.width = 0;
    expect(
      refusal(() => readImagePlanes(doc, { data: arr(data) }))
    ).toMatchObject({ code: 'axis-invalid' });
  });

  test('a draft from a header says what the header says, and what is missing', async () => {
    const buf = image({
      bitpix: 16,
      width: 4,
      height: 3,
      cards: [
        ...tanCards({ crpix: [2, 2] }),
        ['GAIN', 1.5],
        ['RDNOISE', 4],
        ['SATURATE', 60000],
        ['EXPTIME', 30],
        ['DATE-OBS', '2026-03-01T04:05:06'],
        ['BUNIT', 'ADU'],
      ],
    });
    const { doc, missing, valid } = draftSidecar(readFits(buf), {
      id: 'frame-1',
    });
    expect(valid).toBe(true);
    expect(missing).toEqual(['pixels.linearity', 'calibration.state']);
    expect(doc.use).toBe('display-only');
    expect(doc.pixels.gain.source).toBe('header');
    expect(doc.time).toMatchObject({
      scale: 'UTC',
      format: 'iso',
      reference: 'start',
    });
    expect(permits(doc, 'photometry')).toMatchObject({
      ok: false,
      code: 'display-only',
    });
    expect(permits(doc, 'marking').ok).toBe(true);
    expect(permits(doc, 'astrometry').code).toBe('display-only');
    // Filled in by the person who knows, it becomes quantitative.
    const filled = draftSidecar(readFits(buf), { id: 'frame-1' }).doc;
    filled.pixels.linearity = {
      status: 'linear',
      limit: 50000,
      source: 'the camera manual',
    };
    filled.calibration = { state: 'bias-subtracted' };
    expect(permits({ ...filled, use: 'quantitative' }, 'photometry')).toEqual({
      ok: true,
    });
    expect(permits({ ...filled, use: 'quantitative' }, 'astrometry')).toEqual({
      ok: true,
    });
    // A header with no claims: unknown unit, not flux.
    const bare = draftSidecar(
      readFits(image({ bitpix: 16, width: 2, height: 2 })),
      { id: 'x' }
    );
    expect(bare.doc.pixels.unit).toBe('unknown');
    expect(bare.missing.length).toBe(6);
  });

  test('the aperture pack decodes through its own decoder, bytes untouched', async () => {
    const pack =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    const r = imagePlanesOfPack(pack);
    expect([r.width, r.height, r.data.length]).toEqual([11, 13, 143]);
    expect(r.data.filter(v => v & 2).length).toBe(23);
    expect(r.wcs.ctype).toEqual(['RA---TAN', 'DEC--TAN']);
  });
});
