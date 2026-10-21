import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

// =============================================================================
// Prompt 157: the install holds to its word
// -----------------------------------------------------------------------------
// js/dataKinds/ is in NEVER_PRECACHED until a shipped module imports it: no page
// can fetch it, an install has no use for it, and the first-visit tier has no
// room for it (D-R10-32 holds the measured cost of adopting it). The first
// adopter deletes the entry and this test.
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

  test('no module the install carries imports a data kind: the first adopter deletes the NEVER_PRECACHED entry and this test', async () => {
    expect(NEVER_PRECACHED.some(re => re.test(`${KIND}/fits.js`))).toBe(true);
    expect(importers).toEqual([]);
    const { paths } = await buildManifest();
    for (const f of files) expect(paths).not.toContain(f);
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
    ]);
  });
});
