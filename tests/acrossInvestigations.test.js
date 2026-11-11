import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The same quantity in two investigations (Roadmap III Prompt 276, part 2)
// -----------------------------------------------------------------------------
// My work offers a comparison where one applies: two entries of one kind, kept
// in two different investigations, holding a quantity Prompt 275's comparison
// can compare as they stand. The pairs are found by acrossInvestigations and
// compared by compareEntries, unchanged; the list is drawn in jsdom and one
// press puts the two into the comparison of the review.
// =============================================================================

import { webcrypto } from 'node:crypto';
import { buildEntry } from '../js/notebook/entry.js';
import { artifact } from '../js/platform/artifact.js';
import {
  acrossInvestigations,
  compareEntries,
} from '../js/myWork/evidenceReview.js';
import { KEY_EVIDENCE_NOTEBOOK } from '../js/names.js';
import { SURFACE_ROUTE, surfaceOf } from '../js/myWork/model.js';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

const q = (id, value, sigma, extra = {}) => ({
  id,
  value,
  unit: null,
  uncertainty:
    sigma === null ? { kind: 'none' } : { kind: 'sigma', sigma, basis: 'data' },
  origin: 'fitted',
  label: id,
  ...extra,
});

function entry({
  id,
  source = 'inference-fit',
  quantities,
  context,
  capturedAt = Date.parse('2026-03-10T12:00:00'),
}) {
  return buildEntry({
    id,
    source,
    title: `Entry ${id}`,
    quantities: [{ label: 'x', value: 0, unit: '' }],
    capturedAt,
    context,
    artifact: artifact({
      id,
      source: { kind: 'pipeline', id: 'tool' },
      quantities,
    }),
  });
}

const KEPLER = { lesson: 'keplers-laws', step: 4 };
const WEIGH = { lesson: 'weighing-stars', step: 2 };

const A = entry({ id: 'a', quantities: [q('mass', 10, 0.3)], context: KEPLER });
const B = entry({
  id: 'b',
  quantities: [q('mass', 9, 0.4)],
  context: WEIGH,
  capturedAt: Date.parse('2026-04-01T12:00:00'),
});

describe('the pairs that apply', () => {
  test('one kind, two investigations, a quantity both hold with one unit and a sigma', () => {
    expect(acrossInvestigations([A, B])).toEqual([
      { a: 'a', b: 'b', id: 'mass', unit: null },
    ]);
    // The pair it names is one compareEntries compares.
    const r = compareEntries(A, B, { idA: 'mass' });
    expect(r.ok).toBe(true);
    expect(r.difference).toBeCloseTo(1, 12);
    expect(r.sigma).toBeCloseTo(0.5, 12);
  });

  test('nothing is offered within one investigation, across kinds, or for what cannot be compared', () => {
    const same = entry({
      id: 'c',
      quantities: [q('mass', 9, 0.4)],
      context: { lesson: 'keplers-laws', step: 9 },
    });
    expect(acrossInvestigations([A, same])).toEqual([]);
    const otherKind = entry({
      id: 'd',
      source: 'bench-sweep',
      quantities: [q('mass', 9, 0.4)],
      context: WEIGH,
    });
    expect(acrossInvestigations([A, otherKind])).toEqual([]);
    const otherQuantity = entry({
      id: 'e',
      quantities: [q('period', 9, 0.4)],
      context: WEIGH,
    });
    expect(acrossInvestigations([A, otherQuantity])).toEqual([]);
    const otherUnit = entry({
      id: 'f',
      quantities: [q('mass', 9, 0.4, { unit: 'kg' })],
      context: WEIGH,
    });
    expect(acrossInvestigations([A, otherUnit])).toEqual([]);
    const noSigma = entry({
      id: 'g',
      quantities: [q('mass', 9, null)],
      context: WEIGH,
    });
    expect(acrossInvestigations([A, noSigma])).toEqual([]);
    expect(acrossInvestigations([])).toEqual([]);
    expect(acrossInvestigations([A])).toEqual([]);
  });

  test('a later quantity is found when the first cannot be compared, and an altered entry is left out', () => {
    const two = context =>
      entry({
        id: context.lesson,
        quantities: [q('slope', 1, null), q('mass', 9, 0.4)],
        context,
      });
    expect(acrossInvestigations([two(KEPLER), two(WEIGH)])).toEqual([
      { a: 'keplers-laws', b: 'weighing-stars', id: 'mass', unit: null },
    ]);
    expect(acrossInvestigations([A, { ...B, tampered: true }])).toEqual([]);
  });

  test('the newest pairs come first and the list is bounded', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      entry({
        id: `m${i}`,
        quantities: [q('mass', i, 0.1)],
        context: { lesson: `lesson-${i}`, step: 1 },
        capturedAt: Date.parse('2026-05-01T00:00:00') + i * 86400000,
      })
    );
    const pairs = acrossInvestigations(many);
    expect(pairs.length).toBe(6);
    expect(pairs[0]).toEqual({ a: 'm0', b: 'm5', id: 'mass', unit: null });
    expect(pairs.every(p => p.b === 'm5' || p.b === 'm4')).toBe(true);
    expect(acrossInvestigations(many, 2).length).toBe(2);
  });
});

describe('drawn on My work', () => {
  const settle = () => new Promise(r => setTimeout(r, 40));

  test('says where each was measured and one press opens the comparison on its statement', async () => {
    const view = await import('../js/myWork/evidenceView.js');
    for (const lang of ['en', 'es']) {
      document.documentElement.lang = lang;
      document.body.innerHTML =
        '<section id="mwReview" hidden><div class="mw-body"></div></section><section id="mwAcross" hidden></section>';
      const page = {
        surfaces: { SURFACE_ROUTE, surfaceOf },
        state: {
          records: [
            {
              id: KEY_EVIDENCE_NOTEBOOK,
              collection: 'evidence',
              value: { v: 1, entries: JSON.parse(JSON.stringify([A, B])) },
            },
          ],
          store: { collection: () => ({ put: async () => ({ ok: true }) }) },
        },
        refresh: async () => {},
      };
      await view.show(page);
      await view.showAcross(page);
      await settle();
      const box = document.getElementById('mwAcross');
      expect(box.hidden).toBe(false);
      expect(box.querySelector('h2').textContent).toBe(
        lang === 'es'
          ? 'Entre tus investigaciones'
          : 'Across your investigations'
      );
      const item = box.querySelector('li');
      expect(item.textContent).toContain(
        lang === 'es'
          ? 'Lo mediste en investigación keplers-laws, paso 4 (Entry a) y en investigación weighing-stars, paso 2 (Entry b).'
          : 'You measured it in investigation keplers-laws, step 4 (Entry a) and in investigation weighing-stars, step 2 (Entry b).'
      );
      const button = item.querySelector('button[data-across]');
      expect(button.getAttribute('aria-label')).toContain('Entry a, Entry b');
      button.click();
      await settle();
      const review = document.getElementById('mwReview');
      const ticked = [
        ...review.querySelectorAll('input[data-rv="compare"]:checked'),
      ].map(c => c.dataset.id);
      expect(ticked.sort()).toEqual(['a', 'b']);
      const result = review.querySelector('[data-rv="result"]');
      expect(result.classList.contains('is-ok')).toBe(true);
      expect(document.activeElement).toBe(result);
      expect(result.textContent).toMatch(
        lang === 'es' ? /independencia/i : /Independence assumed/
      );
    }
    document.documentElement.lang = 'en';
  });

  test('draws nothing where no comparison applies', async () => {
    const view = await import('../js/myWork/evidenceView.js');
    document.documentElement.lang = 'en';
    document.body.innerHTML =
      '<section id="mwReview" hidden><div class="mw-body"></div></section><section id="mwAcross"></section>';
    const page = {
      surfaces: { SURFACE_ROUTE, surfaceOf },
      state: {
        records: [
          {
            id: KEY_EVIDENCE_NOTEBOOK,
            collection: 'evidence',
            value: { v: 1, entries: JSON.parse(JSON.stringify([A])) },
          },
        ],
        store: { collection: () => ({ put: async () => ({ ok: true }) }) },
      },
      refresh: async () => {},
    };
    await view.showAcross(page);
    const box = document.getElementById('mwAcross');
    expect(box.hidden).toBe(true);
    expect(box.innerHTML).toBe('');
  });
});
