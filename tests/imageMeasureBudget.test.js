// =============================================================================
// The image marks instrument's bytes and requests against the gate (Prompt 179)
// -----------------------------------------------------------------------------
// IMAGE_MEASUREMENT_GATE.md committed T1: the Observatory route gains no request
// and almost no bytes (the instrument is one lazy import), the lazy chunks are at
// most 25,600 B minified and gzipped, and opening an image observation fetches at
// most three of them. tools/image-marks-bytes.mjs measures the production modules
// the way build.js counts them; this runs it in plain Node (esbuild in Jest's VM
// is slow for no benefit) and holds the rows to THRESHOLDS.
//
// Two figures, both reported in the PR, both held to the gate's bound:
//   open  what opening an image observation fetches: the instrument and the
//         modules only it uses, plus ONE language's words (a reader downloads
//         the page's language; the other is fetched on a live switch)
//   gate  the gate's own convention, which also counts the rest of the image
//         kind's files (planes, grid, draft; the install does not carry them, no
//         shipped module imports them) for the consumers after this one, and the larger language's words: the number
//         24,080 B was measured as. At most 25,600 B, as the gate states it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { THRESHOLDS } from '../tools/image-measure-gate.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const figures = JSON.parse(
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools/image-marks-bytes.mjs')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  )
);
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');

describe('T1: bytes and requests', () => {
  test('opening an image observation fetches at most three lazy chunks, within the gate bytes', () => {
    expect(figures.open.requests).toBeLessThanOrEqual(
      THRESHOLDS.deferred.maxRequests
    );
    expect(figures.open.bytes).toBeLessThanOrEqual(
      THRESHOLDS.deferred.maxBytes
    );
  });

  test("the gate's own convention (kind files and the larger language) is at most the gate's bytes", () => {
    expect(figures.gate.bytes).toBeLessThanOrEqual(
      THRESHOLDS.deferred.maxBytes
    );
  });

  test('the modules the instrument opens with are the ones named, and nothing that loads at start-up', () => {
    expect(figures.open.modules.sort()).toEqual(
      [
        'js/dataKinds/contract.js',
        'js/dataKinds/limits.js',
        'js/hash.js',
        'js/measure/imageRecord.js',
        'js/measure/marks.js',
        'js/measure/refine.js',
        'js/measure/scale.js',
        'js/observatory/imageMarks.js',
        'js/offlineParts.js',
      ].sort()
    );
  });
});

describe('T1: the route and the first visit', () => {
  test('the Observatory page reaches the instrument only through one import()', () => {
    const owners = [];
    for (const rel of [
      'js/observatoryPage.js',
      'js/observatory/image.js',
      'js/observatory/export.js',
      'js/observatory/import.js',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/^import .*\/(imageMarks|measure\/\w+)\.js'/m);
      if (/import\('\.\/observatory\/imageMarks\.js'\)/.test(src))
        owners.push(rel);
    }
    expect(owners).toEqual(['js/observatoryPage.js']);
  });

  test('no module the first visit carries imports the instrument', () => {
    // A static import only: the page's one import() of it is the lazy door.
    const mine =
      /^(import|export) [^;]*\/(imageMarks|measure\/(refine|marks|scale|imageRecord))\.js'/m;
    for (const rel of [
      'js/main.js',
      'js/observatoryPage.js',
      'js/observatory/export.js',
      'js/observatory/import.js',
      'js/notebook/entry.js',
      'js/notebook/ledger.js',
      'js/myWork/model.js',
    ])
      expect({ rel, imports: mine.test(read(rel)) }).toEqual({
        rel,
        imports: false,
      });
  });

  test("the gate's first-visit allowance is zero; the idle group is held by dataKindsInstall.test.js", () => {
    expect(THRESHOLDS.tier.firstVisitBytes).toBe(0);
  });
});
