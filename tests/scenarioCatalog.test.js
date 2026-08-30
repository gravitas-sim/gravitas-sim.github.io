import { describe, test, expect } from '@jest/globals';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { SCENARIO_TAGS, TAG_ORDER, tagLabel } from '../js/data/scenarioTags.js';
import {
  catalogEntries,
  filterScenarios,
  tagCounts,
  resultSummary,
} from '../js/scenarioBrowser.js';

const KEYS = Object.keys(SCENARIO_INFO);
const repoFile = rel => fileURLToPath(new URL(`../${rel}`, import.meta.url));

describe('the scenario catalog is complete', () => {
  // Deliberately not `expect(KEYS.length).toBe(43)`. The catalog will grow, and
  // a test that has to be edited every time one is added teaches people to edit
  // tests rather than to think.
  test('there is a catalog at all', () => {
    expect(KEYS.length).toBeGreaterThan(20);
  });

  test.each(KEYS)('%s has a title and a summary', key => {
    const info = SCENARIO_INFO[key];
    expect(typeof info.title).toBe('string');
    expect(info.title.trim().length).toBeGreaterThan(2);
    expect(info.title.length).toBeLessThan(120);
    expect(typeof info.summary).toBe('string');
    expect(info.summary.trim().length).toBeGreaterThan(20);
  });

  test.each(KEYS)('%s has between one and four valid tags', key => {
    const { tags } = SCENARIO_INFO[key];
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThanOrEqual(1);
    expect(tags.length).toBeLessThanOrEqual(4);
    for (const t of tags) expect(SCENARIO_TAGS[t]).toBeTruthy();
    // No scenario carries the same concept twice.
    expect(new Set(tags).size).toBe(tags.length);
  });

  test.each(KEYS)('%s names a thumbnail under images/scenarios', key => {
    const { thumbnail } = SCENARIO_INFO[key];
    expect(typeof thumbnail).toBe('string');
    expect(thumbnail).toMatch(/^images\/scenarios\/[a-z0-9-]+\.webp$/);
  });

  test('no two scenarios share a thumbnail', () => {
    const paths = KEYS.map(k => SCENARIO_INFO[k].thumbnail);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('every concept in the vocabulary is used by something', () => {
    // A tag nobody carries is a dead chip in the gallery: it shows a count of
    // zero and an empty grid.
    const counts = tagCounts();
    for (const id of TAG_ORDER) expect(counts[id]).toBeGreaterThan(0);
  });

  test('the vocabulary stays small enough to read at a glance', () => {
    // The chips are a curriculum index, not an ontology. Thirty concepts would
    // be a worse browsing experience than the wall of text they replaced.
    expect(TAG_ORDER.length).toBeLessThanOrEqual(14);
    for (const id of TAG_ORDER) {
      expect(SCENARIO_TAGS[id].label.length).toBeGreaterThan(3);
      expect(SCENARIO_TAGS[id].description.length).toBeGreaterThan(30);
    }
  });
});

describe('every thumbnail is a committed file', () => {
  test.each(KEYS)('%s', key => {
    const file = repoFile(SCENARIO_INFO[key].thumbnail);
    expect(existsSync(file)).toBe(true);
    const { size } = statSync(file);
    // A blank or failed capture encodes to almost nothing; a heavy one makes
    // opening the gallery expensive.
    expect(size).toBeGreaterThan(2048);
    expect(size).toBeLessThan(200 * 1024);
  });

  test('the whole set stays a reasonable download', () => {
    const total = KEYS.reduce(
      (a, k) => a + statSync(repoFile(SCENARIO_INFO[k].thumbnail)).size,
      0
    );
    expect(total).toBeLessThan(4 * 1024 * 1024);
  });
});

describe('search', () => {
  const keysOf = res => res.map(r => r.key);

  test('matches a title', () => {
    expect(keysOf(filterScenarios({ search: 'trappist' }))).toContain(
      'TRAPPIST-1 System'
    );
  });

  test('matches a summary', () => {
    // "kilonova"-adjacent wording lives only in the summary.
    const hits = keysOf(filterScenarios({ search: 'gamma-ray' }));
    expect(hits).toContain('Neutron Star Collision');
  });

  test('matches the scenario key even when the title differs', () => {
    // 'Binary Star System' is titled "Binary Stars": searching the key works.
    const hits = keysOf(filterScenarios({ search: 'Binary Star System' }));
    expect(hits).toContain('Binary Star System');
  });

  test('matches a concept nobody wrote in the prose', () => {
    // The whole point of indexing the tags. "kepler" is a curriculum word, not
    // necessarily a word in a given scenario's description.
    const hits = keysOf(filterScenarios({ search: 'kepler' }));
    expect(hits).toContain('Solar System');
    expect(hits).toContain('Binary Pair');
    expect(hits.length).toBe(tagCounts()['orbits-kepler']);

    const tidal = keysOf(filterScenarios({ search: 'tides' }));
    expect(tidal).toContain('Earth-Moon System');
    expect(tidal).toContain('Tidal Disruption Event');
  });

  test('is case-insensitive and ignores surrounding space', () => {
    const a = filterScenarios({ search: 'NEUTRON' });
    const b = filterScenarios({ search: '  neutron  ' });
    expect(keysOf(a)).toEqual(keysOf(b));
    expect(a.length).toBeGreaterThan(0);
  });

  test('an empty search returns the whole catalog', () => {
    expect(filterScenarios({ search: '' })).toHaveLength(KEYS.length);
    expect(filterScenarios({})).toHaveLength(KEYS.length);
    expect(filterScenarios()).toHaveLength(KEYS.length);
  });

  test('a search that matches nothing returns nothing, not everything', () => {
    expect(filterScenarios({ search: 'zzzznotathing' })).toHaveLength(0);
  });
});

describe('concept filtering', () => {
  const keysOf = res => res.map(r => r.key);

  test('selecting a concept returns only scenarios carrying it', () => {
    const res = filterScenarios({ tag: 'exoplanets' });
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) expect(r.tags).toContain('exoplanets');
    expect(keysOf(res)).toContain('TRAPPIST-1 System');
    expect(keysOf(res)).toContain('Transit Lab');
    // A scenario with planets in it is not automatically an exoplanet lesson.
    expect(keysOf(res)).not.toContain('Solar System');
  });

  test('All restores the full catalog', () => {
    expect(filterScenarios({ tag: 'all' })).toHaveLength(KEYS.length);
    expect(filterScenarios({ tag: '' })).toHaveLength(KEYS.length);
  });

  test('an unknown concept returns nothing rather than everything', () => {
    // A typo in a filter should look empty, not look like "All": silently
    // showing the whole catalog would hide the mistake.
    expect(filterScenarios({ tag: 'not-a-concept' })).toHaveLength(0);
  });

  test('results keep catalog order, which is curated', () => {
    const res = filterScenarios({ tag: 'orbits-kepler' }).map(r => r.key);
    const expected = KEYS.filter(k =>
      SCENARIO_INFO[k].tags.includes('orbits-kepler')
    );
    expect(res).toEqual(expected);
  });

  test('the counts on the chips match the results behind them', () => {
    const counts = tagCounts();
    expect(counts.all).toBe(KEYS.length);
    for (const id of TAG_ORDER) {
      expect(filterScenarios({ tag: id })).toHaveLength(counts[id]);
    }
  });
});

describe('search and concept filter combine', () => {
  const keysOf = res => res.map(r => r.key);

  test('the result is the intersection, not the union', () => {
    const both = keysOf(
      filterScenarios({ tag: 'compact-objects', search: 'binary' })
    );
    const tagOnly = keysOf(filterScenarios({ tag: 'compact-objects' }));
    const searchOnly = keysOf(filterScenarios({ search: 'binary' }));

    expect(both.length).toBeGreaterThan(0);
    expect(both.length).toBeLessThan(tagOnly.length);
    expect(both.length).toBeLessThanOrEqual(searchOnly.length);
    for (const k of both) {
      expect(tagOnly).toContain(k);
      expect(searchOnly).toContain(k);
    }
  });

  test('a concept and a search that do not overlap give nothing', () => {
    expect(
      filterScenarios({ tag: 'exoplanets', search: 'gamma-ray' })
    ).toHaveLength(0);
  });
});

describe('the result line', () => {
  test('counts are derived, never spelled out', () => {
    expect(resultSummary(43, 'all', '')).toBe('43 scenarios');
    expect(resultSummary(1, 'all', '')).toBe('1 scenario');
  });

  test('it names the active concept', () => {
    expect(resultSummary(6, 'tides', '')).toBe(
      '6 scenarios in Tides & Disruption'
    );
  });

  test('it quotes the search', () => {
    expect(resultSummary(2, 'all', 'merger')).toBe(
      '2 scenarios matching “merger”'
    );
    expect(resultSummary(2, 'exoplanets', 'lab')).toBe(
      '2 scenarios in Exoplanets matching “lab”'
    );
  });
});

describe('the catalog is the only source of truth', () => {
  test('the settings panel derives its preset list rather than listing it', async () => {
    const src = await import('node:fs').then(fs =>
      fs.readFileSync(repoFile('js/ui.js'), 'utf8')
    );
    // The hand-written copy of all forty-three names is gone. Spot-check a few
    // that only ever appeared in that list.
    expect(src).toContain("options: ['None', ...Object.keys(SCENARIO_INFO)]");
    expect(src).not.toContain("'Stellar Graveyard',");
    expect(src).not.toContain("'Micro BH Swarm',");
  });

  test('no scenario count is hardcoded in the markup', async () => {
    const html = await import('node:fs').then(fs =>
      fs.readFileSync(repoFile('index.html'), 'utf8')
    );
    // The gallery writes its own subtitle from Object.keys(SCENARIO_INFO). A
    // number typed into the page is the bug this replaced: it said 37 while the
    // catalog held 43.
    // Covers the page copy and the social-card description alike: both are
    // public, and both said "37" while the catalog held 43.
    expect(html).not.toMatch(/\b\d{2}\s+(built-in\s+)?scenarios\b/i);
    expect(html).not.toMatch(/\ball\s+\d{2}\s+scenarios\b/i);
    expect(html).not.toMatch(/\b\d{2}\s+systems to explore\b/i);
  });

  test('tag labels are written once, in the registry', () => {
    expect(tagLabel('orbits-kepler')).toBe('Orbits & Kepler');
    // An id with no entry falls back to itself rather than throwing, so one bad
    // tag cannot take the gallery down.
    expect(tagLabel('nonsense')).toBe('nonsense');
  });

  test('catalog entries expose the tags the cards render', () => {
    for (const entry of catalogEntries()) {
      expect(entry.tags).toEqual(SCENARIO_INFO[entry.key].tags);
      expect(entry.haystack).toContain(entry.key.toLowerCase());
      for (const t of entry.tags) {
        expect(entry.haystack).toContain(tagLabel(t).toLowerCase());
      }
    }
  });
});
