import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// =============================================================================
// An image as a data pack: the TESS light curve's aperture mask
// -----------------------------------------------------------------------------
// The FITS reader decodes two-dimensional images now, which the observation
// workspace's one image fixture needs, and the aperture pack is built from
// the same pinned light curve as the light-curve pack. What these hold:
//   - the reader decodes an image in FITS order, applies BSCALE and BZERO,
//     and lists an image of more axes as unread rather than guessing;
//   - the aperture reader refuses a pixel that is not made of documented bits;
//   - the committed pack is the one its manifest records, its bits are the
//     documented ones, its optimal aperture is the header's count, and its
//     world coordinates put the centroid pixels on the target;
//   - the SDK's schema knows every data type the tool does, image included.
// =============================================================================

import { readFits } from '../tools/data-packs/fits.mjs';
import {
  APERTURE_BITS,
  readAperture,
} from '../tools/data-packs/tess-aperture.mjs';
import {
  DATA_TYPES,
  runtimeDisagreement,
  runtimeMeta,
  validateDataPack,
} from '../tools/data-packs/schema.mjs';
import { PACKS } from '../tools/build-data-packs.mjs';
import { checkObservation, observationOf } from '../js/observation.js';
import { loadBuiltin } from '../js/platform/resolver.js';
import { separation, skyOf } from '../js/observatory/wcs.js';

const REPO = process.cwd();
const json = rel =>
  JSON.parse(readFileSync(path.join(REPO, rel)).toString('utf8'));
const APERTURE = PACKS.find(p => p.id === 'tess-hd209458-s56-aperture');

const card = (key, value) => {
  const v =
    typeof value === 'string'
      ? `'${value.padEnd(8)}'`
      : value === true
        ? 'T'
        : String(value);
  return `${key.padEnd(8)}= ${v.padStart(20)}`.padEnd(80);
};
const block = bytes => {
  const b = Buffer.alloc(Math.ceil(bytes.length / 2880) * 2880 || 2880);
  bytes.copy(b);
  return b;
};
const header = cards =>
  block(
    Buffer.from(
      cards.map(([k, v]) => card(k, v)).join('') + 'END'.padEnd(80),
      'latin1'
    )
  ).fill(' ', cards.length * 80 + 80);

/** A primary header and one IMAGE extension of 16-bit pixels. */
function imageFile(values, { width, height, extra = [], axes = 2 } = {}) {
  const primary = header([
    ['SIMPLE', true],
    ['BITPIX', 8],
    ['NAXIS', 0],
    ['EXTEND', true],
  ]);
  const shape =
    axes === 2
      ? [
          ['NAXIS', 2],
          ['NAXIS1', width],
          ['NAXIS2', height],
        ]
      : [
          ['NAXIS', 3],
          ['NAXIS1', width],
          ['NAXIS2', height],
          ['NAXIS3', 1],
        ];
  const ext = header([
    ['XTENSION', 'IMAGE'],
    ['BITPIX', 16],
    ...shape,
    ['PCOUNT', 0],
    ['GCOUNT', 1],
    ...extra,
  ]);
  const data = Buffer.alloc(values.length * 2);
  values.forEach((v, i) => data.writeInt16BE(v, 2 * i));
  return new Uint8Array(Buffer.concat([primary, ext, block(data)]));
}

describe('the FITS reader, on images', () => {
  test('decodes a two-dimensional image in FITS order', () => {
    const units = readFits(
      imageFile([1, 2, 3, 4, 5, 6], { width: 3, height: 2 })
    );
    const im = units[1].image;
    expect(im.width).toBe(3);
    expect(im.height).toBe(2);
    // The first row stored is the lowest; nothing is flipped.
    expect([...im.values]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(im.values).toBeInstanceOf(Int16Array);
    expect(units[1].unread).toBeUndefined();
  });

  test('applies BSCALE and BZERO, and gives numbers back when they apply', () => {
    const units = readFits(
      imageFile([0, 10, -10, 100], {
        width: 2,
        height: 2,
        extra: [
          ['BSCALE', 0.5],
          ['BZERO', 32768],
        ],
      })
    );
    const im = units[1].image;
    expect(im.values).toBeInstanceOf(Float64Array);
    expect([...im.values]).toEqual([32768, 32773, 32763, 32818]);
  });

  test('lists an image of more than two axes as unread, rather than guessing', () => {
    const units = readFits(
      imageFile([1, 2, 3, 4], { width: 2, height: 2, axes: 3 })
    );
    expect(units[1].image).toBeUndefined();
    expect(units[1].unread).toEqual([{ name: '(image)', form: '3 axes' }]);
  });
});

describe('the aperture reader', () => {
  const units = (values, extraCards = {}) => [
    { cards: {} },
    {
      cards: {
        EXTNAME: 'APERTURE',
        CTYPE1: 'RA---TAN',
        CTYPE2: 'DEC--TAN',
        CRPIX1: 1,
        CRPIX2: 1,
        CRVAL1: 10,
        CRVAL2: 20,
        CDELT1: -0.005,
        CDELT2: 0.005,
        PC1_1: 1,
        PC1_2: 0,
        PC2_1: 0,
        PC2_2: 1,
        RA_OBJ: 10,
        DEC_OBJ: 20,
        NPIXSAP: 1,
        NPIXMISS: 0,
        ...extraCards,
      },
      image: { width: 2, height: 1, values: Int32Array.from(values) },
    },
  ];

  test('counts every documented bit', () => {
    const a = readAperture(units([257, 267]));
    expect(a.record.counts[1]).toBe(2);
    expect(a.record.counts[2]).toBe(1);
    expect(a.record.counts[8]).toBe(1);
    expect(a.record.counts[256]).toBe(2);
    expect(a.values).toBeInstanceOf(Uint16Array);
  });

  test('refuses a pixel that is not made of documented bits', () => {
    expect(() => readAperture(units([257, 1024]))).toThrow(
      /not a combination of the documented bits/
    );
  });

  test('refuses world coordinates in a projection it does not read', () => {
    expect(() =>
      readAperture(
        units([257, 257], { CTYPE1: 'RA---SIN', CTYPE2: 'DEC--SIN' })
      )
    ).toThrow(/only TAN is read here/);
  });
});

describe('the aperture pack', () => {
  const manifest = json(APERTURE.manifest);

  test('is valid, pinned to the light curve, and an image', () => {
    expect(validateDataPack(manifest)).toEqual([]);
    expect(manifest.dataType).toBe('image');
    expect(manifest.raw).toEqual(
      PACKS.find(p => p.id === 'tess-hd209458-s56-lc').raw
    );
    // The bits, with where their meanings come from.
    expect(manifest.image.bits).toEqual(APERTURE_BITS);
    expect(manifest.image.bitsSource).toMatch(/NASA\/TM-2018-220036.*table 15/);
    const noBits = { ...manifest, image: { ...manifest.image, width: 0 } };
    expect(validateDataPack(noBits).map(p => p.path)).toContain('image');
  });

  test('decodes, through the platform, to the 11 x 13 pixels the archive has', async () => {
    const mod = await loadBuiltin('data/tess-hd209458-s56-aperture');
    const o = observationOf(mod);
    expect(checkObservation(o)).toEqual([]);
    expect(o.quantity).toBe('aperture-flags');
    expect(o.image.width).toBe(11);
    expect(o.image.height).toBe(13);
    // Three kinds of pixel: the edge, the background ring, the aperture.
    expect([...new Set(o.image.values)].sort((a, b) => a - b)).toEqual([
      257, 261, 267,
    ]);
    // The header's own count of the optimal aperture.
    expect(o.image.values.filter(v => v & 2).length).toBe(23);
    const { ok, result } = APERTURE.validate(o);
    expect(ok).toBe(true);
    expect(result).toEqual(manifest.validation.result);
  });

  test('its world coordinates put the reference pixel at the reference position, and the centroid on the star', async () => {
    const o = observationOf(
      await loadBuiltin('data/tess-hd209458-s56-aperture')
    );
    const { wcs } = o.image;
    const ref = skyOf(wcs, wcs.crpix[0], wcs.crpix[1]);
    expect(ref.ra).toBeCloseTo(wcs.crval[0], 10);
    expect(ref.dec).toBeCloseTo(wcs.crval[1], 10);
    // Under 20 arcseconds, one TESS pixel, from HD 209458: 7.13, absolute.
    expect(manifest.validation.result.centroidOffsetArcsec).toBe(7.13);
    expect(
      separation(ref, { ra: APERTURE.target.ra, dec: APERTURE.target.dec }) *
        3600
    ).toBeLessThan(1);
  });
});

describe('the SDK and the tool agree on what a pack may be', () => {
  test('every data type the tool knows, the SDK schema knows', () => {
    const schema = json('sdk/schemas/observation-data-pack-1.schema.json');
    expect(schema.properties.dataType.enum).toEqual(DATA_TYPES);
  });
});

describe('a runtime copy written before SDK 1.1.0', () => {
  test('still agrees with its manifest, with a warning, when it leaves out the reductions', () => {
    const m = json('data-packs/tess-hd209458-s56-lc.json');
    const PACK = runtimeMeta(m);
    expect(runtimeDisagreement(PACK, m)).toEqual({ errors: [], warnings: [] });
    const { reductions, ...before } = PACK;
    expect(reductions.length).toBeGreaterThan(0);
    const r = runtimeDisagreement(before, m);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([
      'reductions is in the manifest and not the runtime copy, so an interface cannot show it',
    ]);
  });

  test('anything else still has to match, and an image must say it is one', () => {
    const m = json('data-packs/tess-hd209458-s56-lc.json');
    const PACK = runtimeMeta(m);
    expect(runtimeDisagreement({ ...PACK, title: 'x' }, m).errors).toEqual([
      "title is not the manifest's",
    ]);
    expect(runtimeDisagreement({ ...PACK, extra: 1 }, m).errors).toEqual([
      'extra is not a runtime field',
    ]);
    const ap = json('data-packs/tess-hd209458-s56-aperture.json');
    const { image, ...noImage } = runtimeMeta(ap);
    expect(image.width).toBe(11);
    expect(runtimeDisagreement(noImage, ap).errors).toEqual([
      'image is required in the runtime copy of an image',
    ]);
  });
});
