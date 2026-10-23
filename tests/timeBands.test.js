// =============================================================================
// The editorial time bands (Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// js/data/instructorTimeBands.js is one authored table, read by the printable
// activity list, the adoption pages and the Library's length facet. This holds
// it consistent with what it is read against, and holds the label that says it
// is an estimate to the record that says no class was timed:
//
//   - every investigation has a row, for exactly the depths it offers;
//   - the core band is the one the lesson browser's own cut-offs give the
//     lesson's declared upper bound, so the Library's facet never moved;
//   - a deeper depth never has a shorter band, and is the band the documented
//     rule gives (the extra steps at twice the core's minutes a step);
//   - the bands' upper bounds are those cut-offs, and the ranges are ordered;
//   - library/library.json's `length` is the band's, for every entry;
//   - OBSERVED is false exactly while the evidence-status record's
//     `timing-estimates` claim is UNKNOWN, so the label cannot outlive the
//     evidence nor the evidence arrive without the label changing;
//   - nothing in the table's module or its readers takes a median from a walk.
// =============================================================================

import './galacticFetch.js';
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  BANDS,
  BAND_LENGTH,
  BAND_ORDER,
  LESSON_BANDS,
  OBSERVED,
  STATEMENT,
  bandOfMinutes,
  lessonBand,
  shareBand,
} from '../js/data/instructorTimeBands.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import {
  DEMO_MINUTES,
  PERIOD_MINUTES,
  lengthOf,
} from '../js/data/investigations/sequences.js';
import { withDepth } from '../js/investigations/depth.js';
import { stepCounts } from '../js/investigations/depthPure.js';
import { statementFor } from '../js/instructorPlan.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const hi = m => Math.max(...m.duration.match(/\d+/g).map(Number));
const rank = b => BAND_ORDER.indexOf(b);

describe('the table', () => {
  test('the bands are ordered and their upper bounds are the lesson browser’s cut-offs', () => {
    expect(BAND_ORDER).toEqual(['short', 'medium', 'long']);
    expect(BANDS.short.hi).toBe(DEMO_MINUTES);
    expect(BANDS.medium.hi).toBe(PERIOD_MINUTES);
    for (let i = 1; i < BAND_ORDER.length; i++) {
      expect(BANDS[BAND_ORDER[i]].lo).toBeGreaterThan(
        BANDS[BAND_ORDER[i - 1]].hi
      );
      expect(BANDS[BAND_ORDER[i]].hi).toBeGreaterThan(BANDS[BAND_ORDER[i]].lo);
    }
    expect(Object.keys(BAND_LENGTH)).toEqual(BAND_ORDER);
  });

  test('bandOfMinutes follows the upper bounds', () => {
    expect(bandOfMinutes(5)).toBe('short');
    expect(bandOfMinutes(25)).toBe('short');
    expect(bandOfMinutes(26)).toBe('medium');
    expect(bandOfMinutes(50)).toBe('medium');
    expect(bandOfMinutes(51)).toBe('long');
    expect(bandOfMinutes(100)).toBe('long');
  });

  test('every investigation has a row and no row is for a missing one', () => {
    expect(Object.keys(LESSON_BANDS).sort()).toEqual(
      MANIFEST.map(m => m.id).sort()
    );
  });

  test('the core band is the band of the declared upper bound, and the Library facet agrees', () => {
    for (const m of MANIFEST) {
      expect(BAND_LENGTH[LESSON_BANDS[m.id].core]).toBe(lengthOf(m));
      expect(lessonBand(m.id)).toBe(LESSON_BANDS[m.id].core);
    }
  });

  test('a depth the lesson does not offer has no entry, and one it offers has', async () => {
    // One at a time: Jest's module linker loses a module several imports reach at once.
    for (const m of MANIFEST) {
      const lesson = await withDepth(await loadInvestigation(m.id, 'en'));
      const counts = stepCounts(lesson);
      expect(Object.keys(LESSON_BANDS[m.id])).toEqual(Object.keys(counts));
      // The documented rule: extra steps at twice the core's minutes a step.
      const perStep = hi(m) / counts.core;
      let floor = 0;
      for (const [depth, n] of Object.entries(counts)) {
        const total = hi(m) + 2 * perStep * (n - counts.core);
        const rule = Math.max(floor, rank(bandOfMinutes(Math.round(total))));
        floor = rule;
        expect([m.id, depth, LESSON_BANDS[m.id][depth]]).toEqual([
          m.id,
          depth,
          BAND_ORDER[rule],
        ]);
      }
    }
  }, 120_000);

  test('a deeper depth is never shorter, and the depth asked for falls back to the deepest offered', () => {
    for (const [id, row] of Object.entries(LESSON_BANDS)) {
      let floor = 0;
      for (const depth of ['core', 'quantitative', 'advanced'])
        if (row[depth]) {
          expect(rank(row[depth])).toBeGreaterThanOrEqual(floor);
          floor = rank(row[depth]);
        }
      expect(lessonBand(id, 'advanced')).toBe(
        row.advanced ?? row.quantitative ?? row.core
      );
    }
    expect(lessonBand('no-such-lesson')).toBeNull();
  });

  test('a share of an investigation is a band of its own, never under five minutes', () => {
    expect(shareBand('keplers-laws', 'core', 1)).toBe('medium');
    expect(shareBand('keplers-laws', 'core', 0.4)).toBe('short');
    expect(shareBand('keplers-laws', 'core', 0.01)).toBe('short');
    expect(shareBand('no-such-lesson', 'core', 0.5)).toBeNull();
  });
});

describe('the Library reads it', () => {
  const library = JSON.parse(read('library/library.json'));

  test('every entry with a duration has the band’s length; the lessons have their row’s', () => {
    for (const e of library.entries) {
      if (!e.duration) continue;
      const id = e.id.replace(/^investigation:/, '');
      const expected =
        e.format === 'lesson' && LESSON_BANDS[id]
          ? BAND_LENGTH[lessonBand(id)]
          : BAND_LENGTH[bandOfMinutes(e.duration.max)];
      expect([e.id, e.length]).toEqual([e.id, expected]);
    }
  });
});

describe('the label', () => {
  test('is said in both languages and names both halves: an estimate, and no class data', () => {
    expect(STATEMENT.en).toBe('Editorial estimate; no observed class data.');
    expect(STATEMENT.es).toMatch(/^Estimación editorial; sin datos/);
    expect(statementFor('en')).toBe(STATEMENT.en);
    expect(statementFor('es')).toBe(STATEMENT.es);
  });

  test('OBSERVED is false exactly while the evidence record says no class was timed', () => {
    const claim = JSON.parse(read('tools/evidence-status.json')).claims.find(
      c => c.id === 'timing-estimates'
    );
    expect(claim).toBeTruthy();
    expect(OBSERVED).toBe(claim.status !== 'UNKNOWN');
    expect(claim.method).toMatch(/none timed with a class/);
  });

  test('every generated page that shows a time carries it', () => {
    const pages = [
      'teaching/find/index.html',
      'teaching/alignment/index.html',
      'teaching/activity/orbital-speed/index.html',
      ...MANIFEST.map(m => `teaching/investigation/${m.id}/index.html`),
    ];
    for (const p of pages) {
      const html = read(p);
      expect(html).toContain(STATEMENT.en);
      expect(html).toContain(STATEMENT.es);
    }
  });

  test('no median from a walk or a script is used for a time', () => {
    for (const p of [
      'js/data/instructorTimeBands.js',
      'js/instructorPlan.js',
      'js/instructorPlanView.js',
    ])
      expect(read(p).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')).not.toMatch(
        /median|authorWalk|walk/i
      );
  });
});
