// =============================================================================
// The Sky Lab's data (Roadmap II, Prompt 88)
// -----------------------------------------------------------------------------
// The star sidecar against its pack record, the constellation figures against
// the stars, and the colour fit against the one js/bodyVisuals.js draws with.
// The pack's own checks (positions against Hipparcos, provenance from the pinned
// raw files) are `npm run packs:check` and `npm run packs:provenance`.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { PACK, SIDECAR } from '../js/data/sky/brightStars.js';
import { CONSTELLATIONS } from '../js/data/sky/constellations.js';
import { loadStars, colourOfTemperature } from '../js/kernels/sky/stars.js';
import { starColor } from '../js/bodyVisuals.js';
import { prettyDesignation } from '../js/sky/fmt.js';

const text = readFileSync(path.resolve(process.cwd(), SIDECAR.file), 'utf8');
const doc = JSON.parse(text);
const key = d => {
  const t = d.split(' ');
  return t.length === 3 ? t.slice(1).join(' ') : d;
};
const sep = (a, b) => {
  const D = Math.PI / 180;
  return (
    Math.acos(
      Math.min(
        1,
        Math.sin(a.decDeg * D) * Math.sin(b.decDeg * D) +
          Math.cos(a.decDeg * D) *
            Math.cos(b.decDeg * D) *
            Math.cos((a.raDeg - b.raDeg) * D)
      )
    ) / D
  );
};

describe('the star sidecar', () => {
  test('is the file the pack module records, and carries the same pack record', () => {
    expect(createHash('sha256').update(text).digest('hex')).toBe(
      SIDECAR.sha256
    );
    expect(Buffer.byteLength(text)).toBe(SIDECAR.bytes);
    expect(doc.pack).toEqual(PACK);
    expect(doc.stars.length).toBe(SIDECAR.count);
    expect(doc.count).toBe(904);
  });
  test('holds 904 stars, brightest first, none fainter than 4.5, with the catalogue licence stated', () => {
    const v = doc.stars.map(s => s[3]);
    expect([...v].sort((a, b) => a - b)).toEqual(v);
    expect(Math.max(...v)).toBeLessThanOrEqual(450);
    expect(PACK.license.status).toBe('no-license-stated');
    expect(PACK.credit).toMatch(/Hoffleit/);
    expect(doc.stars.filter(s => s[8]).length).toBe(65);
  });
  test('the sidecar is under the 30 KB gzipped the gate allowed', async () => {
    const { gzipSync } = await import('node:zlib');
    expect(gzipSync(text).length).toBeLessThanOrEqual(30 * 1024);
  });
});

describe('the constellation figures', () => {
  const stars = loadStars(doc);
  const by = new Map(stars.map(s => [key(s.desig), s]));
  test('every line joins two stars of the pack, no more than 25 degrees apart, and no line is listed twice', () => {
    const seen = new Set();
    for (const c of CONSTELLATIONS) {
      expect(c.en && c.es).toBeTruthy();
      for (const [a, b] of c.lines) {
        expect({ c: c.id, a, found: by.has(a) }).toEqual({
          c: c.id,
          a,
          found: true,
        });
        expect({ c: c.id, b, found: by.has(b) }).toEqual({
          c: c.id,
          b,
          found: true,
        });
        expect(sep(by.get(a), by.get(b))).toBeLessThan(25);
        const k = [a, b].sort().join('|');
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
    expect(CONSTELLATIONS.length).toBe(22);
  });
  test("each figure is mostly made of its own constellation's stars", () => {
    for (const c of CONSTELLATIONS) {
      const own = c.lines.flat().filter(n => n.endsWith(c.id)).length;
      expect(own / c.lines.flat().length).toBeGreaterThanOrEqual(0.7);
    }
  });
});

describe('drawing', () => {
  test('the star colour fit is the one the application draws with', () => {
    for (const T of [
      2500, 3500, 4000, 5000, 5800, 7000, 9000, 12000, 20000, 40000,
    ]) {
      expect(colourOfTemperature(T)).toEqual(starColor(T));
    }
    expect(colourOfTemperature(null)).toEqual({ r: 255, g: 255, b: 255 });
  });
  test('designations read as a chart does', () => {
    expect(prettyDesignation('9 Alp CMa')).toBe('α CMa');
    expect(prettyDesignation('80 UMa')).toBe('80 UMa');
    expect(prettyDesignation('Gam1 And')).toBe('γ¹ And');
  });
});
