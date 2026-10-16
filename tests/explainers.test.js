import { describe, test, expect } from '@jest/globals';
import { RETIRED } from '../tools/glossary.mjs';
import { LAZY_FAMILIES } from '../js/widgets.js';
import en from '../js/explain/en.js';
import es from '../js/explain/es.js';
import {
  FAMILY_IDS,
  explainerFor,
  explainerKeyFor,
  toggleExplainer,
} from '../js/explainers.js';

// =============================================================================
// "What am I looking at?" (Roadmap II, Prompt 71)
// -----------------------------------------------------------------------------
// Every instrument family and every kind of plot declares four answers, in both
// languages, entry for entry; and the families it names are the registry's.
// =============================================================================

/** The kinds of plot and the other instruments that also have one. */
const OTHERS = [
  'plot-measure',
  'plot-series',
  'plot-table',
  'plot-log',
  'plot-bars',
  'plot-light-curve',
  'plot-rv',
  'plot-energy',
  'plot-ellipse',
  'plot-experiment',
  'plot-compare',
  'observatory-image',
  'observatory-measure',
  'observatory-fit',
  'observatory-archive',
  'analysis-sweep',
  'analysis-models',
];

describe('every instrument family has an explainer', () => {
  test('the families and their ids are the registry’s', () => {
    const registry = Object.fromEntries(
      Object.entries(LAZY_FAMILIES).map(([k, v]) => [k, [...v.ids]])
    );
    expect(FAMILY_IDS).toEqual(registry);
    for (const k of Object.keys(registry)) expect(en[k]).toBeDefined();
  });

  test('an instrument id finds its family’s explainer', () => {
    expect(explainerKeyFor('depth-size')).toBe('transit');
    expect(explainerKeyFor('gw-events')).toBe('gwEvents');
    expect(explainerKeyFor('nonsense')).toBeNull();
  });
});

describe('every plot type, Observatory instrument and analysis tool has one', () => {
  test('they are all declared', () => {
    for (const k of OTHERS) expect(en[k]).toBeDefined();
    expect(Object.keys(en).sort()).toEqual(
      [...Object.keys(FAMILY_IDS), ...OTHERS].sort()
    );
  });
});

describe('four answers, in both languages, entry for entry', () => {
  test('the Spanish has every key, four sentences each', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en)) {
      expect(en[k]).toHaveLength(4);
      expect(es[k]).toHaveLength(4);
      for (const s of [...en[k], ...es[k]]) {
        expect(typeof s).toBe('string');
        expect(s.length).toBeGreaterThan(20);
      }
    }
  });

  test('none of the retired nouns comes back', () => {
    for (const [lang, table] of [
      ['en', en],
      ['es', es],
    ])
      for (const k of Object.keys(table))
        for (const s of table[k])
          for (const r of RETIRED) expect(r[lang].test(s)).toBe(false);
  });

  test('it loads in the reader’s language', async () => {
    expect(await explainerFor('transit', 'es')).toEqual(es.transit);
    expect(await explainerFor('transit', 'en')).toEqual(en.transit);
    expect(await explainerFor('nope', 'en')).toBeNull();
  });
});

describe('the control opens and closes a labelled region', () => {
  test('on demand, named, and removed on the second press', async () => {
    document.body.innerHTML =
      '<header id="h"><button id="b"></button></header>';
    const b = document.getElementById('b');
    const host = document.getElementById('h');
    expect(await toggleExplainer(b, 'transit', host)).toBe(true);
    const region = host.nextElementSibling;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBeTruthy();
    expect(region.querySelectorAll('dt')).toHaveLength(4);
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(b.getAttribute('aria-controls')).toBe(region.id);
    expect(await toggleExplainer(b, 'transit', host)).toBe(false);
    expect(host.nextElementSibling).toBeNull();
    expect(b.getAttribute('aria-expanded')).toBe('false');
  });
});
