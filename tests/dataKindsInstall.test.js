import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  NEVER_PRECACHED,
  buildManifest,
  idleGroupOf,
} from '../tools/build-service-worker.mjs';

// =============================================================================
// Prompt 157: the install holds to its word
// -----------------------------------------------------------------------------
// The FITS reader, its job and its Worker are in NEVER_PRECACHED until a shipped
// module imports them (local import, Prompt 188): no page can fetch them, an
// install has no use for them, and the first-visit tier has no room for them
// (D-R10-32 holds the measured cost of adopting them). The first adopter deletes
// the entry and the first test below. The contract and the limits were adopted by
// the image marks instrument (Prompt 179): they are the idle group "image
// measurement", never the first-visit install, and only that instrument imports
// them. The planes, grid and draft files wait with the reader: no shipped module
// imports them, and the idle tier's ceiling has no room for dead code.
// =============================================================================

const KIND = 'js/dataKinds';
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = path.posix.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });

describe('the install', () => {
  const files = walk(KIND);
  const shipped = walk('js').filter(
    f =>
      !f.startsWith(`${KIND}/`) &&
      !NEVER_PRECACHED.some(re => re.test(f)) &&
      !f.startsWith('js/validation/')
  );
  const importers = shipped.filter(f =>
    /['"][./]*\/dataKinds\//.test(readFileSync(f, 'utf8'))
  );

  const CONTRACT = ['contract', 'limits'].map(n => `${KIND}/${n}.js`);
  const READER = [
    'fits',
    'fitsJob',
    'fitsWorker',
    'planes',
    'grid',
    'draft',
  ].map(n => `${KIND}/${n}.js`);

  test('no module the install carries imports the FITS reader or the planes, grid and draft files: the first adopter deletes the NEVER_PRECACHED entry and this test', async () => {
    for (const f of READER)
      expect(NEVER_PRECACHED.some(re => re.test(f))).toBe(true);
    const readerImporters = shipped.filter(f =>
      /['"][./]*\/dataKinds\/(fits|fitsJob|fitsWorker|planes|grid|draft)/.test(
        readFileSync(f, 'utf8')
      )
    );
    expect(readerImporters).toEqual([]);
    const { paths } = await buildManifest();
    for (const f of READER) expect(paths).not.toContain(f);
  });

  test('the contract files are the idle group "image measurement", only the instrument imports them, and the first visit does not carry them', async () => {
    const m = await buildManifest();
    const first = new Set([...m.core, ...m.optional]);
    for (const f of CONTRACT) {
      expect(idleGroupOf(f)).toBe('image measurement');
      expect(m.idle).toContain(f);
      expect(first.has(f)).toBe(false);
    }
    expect(importers.sort()).toEqual([
      'js/measure/scale.js',
      'js/observatory/imageMarks.js',
    ]);
    for (const f of importers) expect(idleGroupOf(f)).toBe('image measurement');
  });

  test('nothing in the folder imports the DOM, a clock or a random source', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(text).not.toMatch(
        /\b(document\.|window\.|localStorage|Math\.random|Date\.now|performance\.now)/
      );
    }
  });

  test('the folder is the documented size', () => {
    expect(files.map(f => path.posix.basename(f)).sort()).toEqual([
      'contract.js',
      'draft.js',
      'fits.js',
      'fitsJob.js',
      'fitsWorker.js',
      'grid.js',
      'limits.js',
      'planes.js',
      'raster.js',
      'rasterJob.js',
    ]);
  });
});
