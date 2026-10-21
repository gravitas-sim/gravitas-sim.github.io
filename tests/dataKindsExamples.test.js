import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { EXAMPLES, TOL } from '../tools/data-kinds-cases.mjs';
import {
  buildImageExample,
  buildMistGrid,
  buildSequenceExample,
  simulateSequence,
} from '../tools/data-kinds-examples.mjs';
import {
  frameOf,
  permits,
  validateGrid,
  validateImage,
  validateImageSequence,
} from '../js/dataKinds/contract.js';
import { LIMITS } from '../js/dataKinds/limits.js';
import { readKeyedGrid } from '../js/dataKinds/grid.js';
import { imagePlanesOfPack, readImagePlanes } from '../js/dataKinds/planes.js';
import { partProblems } from '../js/offlineParts.js';
import { skyOf, separation } from '../js/observatory/wcs.js';
import { tableOf } from '../js/tableObservation.js';
import {
  detectorPattern,
  normalizeDetector,
} from '../js/kernels/detector/frame.js';

// =============================================================================
// Prompt 157: an example of each kind, from material Gravitas already has
// -----------------------------------------------------------------------------
// The committed files (tests/fixtures/dataKinds/, tools/data-kinds-examples.mjs)
// are judged as they are: validated, tied to the pack or the model they come
// from, and, for the frames, held to the noise their sidecar claims. Nothing here
// compares a digest of a regeneration.
// =============================================================================

const read = name =>
  JSON.parse(readFileSync(path.join(EXAMPLES.dir, name), 'utf8'));
const bytes = rel => new Uint8Array(readFileSync(rel.replace(/^\//, '')));

describe('the folder holds what the generator writes, and nothing else', () => {
  test('files', () => {
    const want = [
      EXAMPLES.image.file,
      EXAMPLES.sequence.file,
      EXAMPLES.grid.file,
      ...read(EXAMPLES.sequence.file).frames.map(f =>
        path.basename(f.part.url)
      ),
    ].sort();
    expect(readdirSync(EXAMPLES.dir).sort()).toEqual(want);
  });
});

describe('image: the TESS aperture mask with its contract filled', () => {
  const doc = read(EXAMPLES.image.file);

  test('is valid, and is what the pack gives', () => {
    expect(validateImage(doc)).toMatchObject({ ok: true });
    expect(doc).toEqual(buildImageExample());
    expect([doc.width, doc.height]).toEqual([
      EXAMPLES.image.width,
      EXAMPLES.image.height,
    ]);
    expect(doc.source.pack ?? doc.source.id).toBe(EXAMPLES.image.pack);
  });

  test('the pack decodes to the sidecar’s shape, and the optimal aperture is the 23 pixels the pack checks', async () => {
    const mod =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    const px = imagePlanesOfPack(mod);
    expect([px.width, px.height]).toEqual([doc.width, doc.height]);
    expect(px.data.filter(v => v & 2).length).toBe(
      EXAMPLES.image.optimalAperture
    );
    // The sidecar's bits are the pack's, word for word.
    expect(doc.pixels.bits).toEqual(mod.PACK.image.bits);
    expect(doc.pixels.bitsSource).toBe(mod.PACK.image.bitsSource);
    // Its plane is read by the sidecar's own encoding from the pack's bytes.
    const raw = Buffer.from(mod.SERIES.data, 'base64');
    const out = readImagePlanes(doc, { data: new Uint8Array(raw) });
    expect([...out.data]).toEqual([...px.data]);
  });

  test('photometry is refused as not light, astrometry and marking are allowed', () => {
    expect(permits(doc, 'marking')).toEqual({ ok: true });
    expect(permits(doc, 'photometry')).toMatchObject({
      ok: false,
      code: EXAMPLES.image.photometry,
    });
    expect(permits(doc, 'astrometry')).toEqual({ ok: true });
  });

  test('the world coordinates put the centroid pixels where the pack says (7.13 arcseconds from the target)', async () => {
    const mod =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    const manifest = JSON.parse(
      readFileSync('data-packs/tess-hd209458-s56-aperture.json', 'utf8')
    );
    const target = manifest.validation.against.find(a => a.ra !== undefined);
    const px = imagePlanesOfPack(mod);
    let sx = 0;
    let sy = 0;
    let n = 0;
    px.data.forEach((v, i) => {
      if (v & 8) {
        sx += (i % doc.width) + 1;
        sy += Math.floor(i / doc.width) + 1;
        n++;
      }
    });
    const center = skyOf(doc.wcs, sx / n, sy / n);
    const arcsec =
      separation(center, { ra: target.ra, dec: target.dec }) * 3600;
    expect(Math.abs(arcsec - 7.13)).toBeLessThan(0.01);
    expect(doc.scale.arcsecPerPixel).toBeGreaterThan(19);
    expect(doc.scale.arcsecPerPixel).toBeLessThan(20);
  });
});

describe('image-sequence: two frames of the forward ccd model', () => {
  const doc = read(EXAMPLES.sequence.file);
  const frames = doc.frames.map(f => bytes(f.part.url));
  const { width, height } = doc.frame;

  test('is valid, in time order, and every frame is a part by the offline contract', () => {
    expect(validateImageSequence(doc)).toMatchObject({ ok: true });
    expect(doc.frames.length).toBe(EXAMPLES.sequence.frames);
    expect([width, height]).toEqual([
      EXAMPLES.sequence.width,
      EXAMPLES.sequence.height,
    ]);
    for (const f of doc.frames) expect(partProblems(f.part)).toEqual([]);
    expect(doc.frame.source.kind).toBe('synthetic');
    expect(doc.frame.source.model.name).toMatch(/ccd/);
    expect(doc.frame.source.model.parameters.seed).toBeTruthy();
  });

  test('each part is the bytes it declares', () => {
    doc.frames.forEach((f, i) => {
      expect(frames[i].length).toBe(f.part.bytes);
      expect(createHash('sha256').update(frames[i]).digest('hex')).toBe(
        f.part.sha256
      );
      expect(f.part.url).toContain(f.part.sha256.slice(0, 16));
    });
  });

  test('the contract is complete, so photometry and astrometry are allowed on both frames', () => {
    for (const i of [0, 1]) {
      expect(permits(doc, 'photometry', i)).toEqual({ ok: true });
      expect(permits(doc, 'astrometry', i)).toEqual({ ok: true });
    }
    expect(frameOf(doc, 1).time.value).toBe('2026-03-01T04:01:00Z');
  });

  test('two frames of 96 x 128 are 196,608 bytes decoded; a page keeps floor(64 MiB / that) of them resident', () => {
    const each = width * height * 8;
    expect(each).toBe(98304);
    expect(validateImageSequence(doc).resident).toBe(
      Math.floor(LIMITS.maxDecodedBytes / each)
    );
  });

  test('the noise is the noise the sidecar claims: the difference of the frames has the stated gain and read noise', () => {
    const planes = frames.map(b =>
      readImagePlanes({ ...frameOf(doc, 0) }, { data: b })
    );
    const [a, b] = planes.map(p => p.data);
    const { gain, readNoise } = doc.frame.pixels;
    const d = normalizeDetector({
      cosmicRate: 0,
      width,
      height,
      fwhm:
        doc.frame.source.model.parameters.psfFwhmArcsec /
        doc.frame.source.model.parameters.pixelScaleArcsec,
    });
    const pattern = detectorPattern(
      doc.frame.source.model.parameters.seed,
      d
    ).biasPattern;
    const bias = doc.frame.source.model.parameters.biasLevel;
    let observed = 0;
    let expected = 0;
    let sumDiff = 0;
    for (let i = 0; i < a.length; i++) {
      const mean = (a[i] + b[i]) / 2;
      const electrons = Math.max(
        0,
        gain.value * (mean - bias - pattern[i % width])
      );
      expected += (electrons + readNoise.value ** 2) / gain.value ** 2 + 1 / 12;
      observed += (a[i] - b[i]) ** 2;
      sumDiff += a[i] - b[i];
    }
    expect(a.length).toBeGreaterThanOrEqual(10000);
    const ratio = observed / (2 * expected);
    expect(ratio).toBeGreaterThan(TOL.noiseRatio.min);
    expect(ratio).toBeLessThan(TOL.noiseRatio.max);
    // The fixed pattern cancels: the frames differ by noise alone, with no mean offset.
    expect(Math.abs(sumDiff / a.length)).toBeLessThan(0.1);
  });

  test('a regeneration is within a count of the committed frames', () => {
    const fresh = buildSequenceExample(simulateSequence());
    fresh.frames.forEach((b, i) => {
      let worst = 0;
      for (let k = 0; k < b.length; k += 2)
        worst = Math.max(
          worst,
          Math.abs(b.readUInt16LE(k) - Buffer.from(frames[i]).readUInt16LE(k))
        );
      expect(worst).toBeLessThanOrEqual(TOL.regeneratedAdu.value);
    });
    // And the rest of the document is the same.
    const strip = d =>
      JSON.stringify(d, (k, v) => (k === 'part' ? undefined : v));
    expect(strip(fresh.doc)).toBe(strip(doc));
  });
});

describe('grid: the MIST isochrones as a keyed grid', () => {
  const doc = read(EXAMPLES.grid.file);

  test('is valid and is what the pack gives', async () => {
    expect(validateGrid(doc)).toMatchObject({ ok: true });
    expect(doc).toEqual(await buildMistGrid());
    expect(doc.axes.map(a => a.name)).toEqual(EXAMPLES.grid.axes);
    expect(doc.storage.pack).toBe(EXAMPLES.grid.pack);
  });

  test('its 21 cells tile the 1,410 rows of the pack, and each cell is found by its key', async () => {
    const mod = await import('../js/data/observations/mistSdssIsochrones.js');
    const table = tableOf(mod);
    const grid = readKeyedGrid(doc, table);
    expect(grid.cells.length).toBe(
      doc.axes[0].values.length * doc.axes[1].values.length
    );
    expect(grid.cells.reduce((s, c) => s + c.count, 0)).toBe(table.n);
    expect(grid.cells[0].start).toBe(0);
    grid.cells.forEach(
      (c, i) =>
        i &&
        expect(c.start).toBe(grid.cells[i - 1].start + grid.cells[i - 1].count)
    );
    const cell = grid.find([-0.25, doc.axes[1].values[2]]);
    const feh = table.columns.find(c => c.id === 'feh').values;
    const age = table.columns.find(c => c.id === 'logAge').values;
    let count = 0;
    for (let i = 0; i < table.n; i++)
      if (feh[i] === -0.25 && age[i] === doc.axes[1].values[2]) count++;
    expect(cell.count).toBe(count);
    expect(grid.find([1, 9])).toBeNull();
  });

  test('a table that is not the one the document describes is refused', async () => {
    const mod = await import('../js/data/observations/mistSdssIsochrones.js');
    const table = tableOf(mod);
    const swapped = {
      ...table,
      columns: table.columns.map(c => ({
        ...c,
        values: Float64Array.from(c.values),
      })),
    };
    const col = swapped.columns.find(c => c.id === 'feh').values;
    const last = col.length - 1;
    [col[0], col[last]] = [col[last], col[0]];
    expect(() => readKeyedGrid(doc, swapped)).toThrow(
      /not together|not the table|differ|cell/
    );
    expect(() => readKeyedGrid(doc, { ...table, n: table.n - 1 })).toThrow(
      /rows/
    );
    const wrong = { ...doc, rows: doc.rows + 1 };
    expect(() => readKeyedGrid(wrong, table)).toThrow();
  });
});
