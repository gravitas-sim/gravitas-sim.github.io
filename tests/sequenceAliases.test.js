// Renamed sequence ids still resolve: a stored "what next" record from before
// the rename keeps offering the next step (js/investigations/next.js).
import { readFileSync } from 'node:fs';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  SEQUENCES,
  SEQUENCE_ALIASES,
  currentSequenceId,
} from '../js/data/investigations/sequences.js';
import { whatNext, CONTEXT_KEY } from '../js/investigations/next.js';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));

describe('SEQUENCE_ALIASES', () => {
  test('every target is a real sequence and no old id is still one', () => {
    const live = new Set(SEQUENCES.map(s => s.id));
    for (const [old, now] of Object.entries(SEQUENCE_ALIASES)) {
      expect([old, live.has(old)]).toEqual([old, false]);
      expect([old, live.has(now)]).toEqual([old, true]);
    }
  });

  test('records the renames Prompt 97 made, and passes current ids through', () => {
    expect(currentSequenceId('orbital-mechanics')).toBe('gravity-and-orbits');
    expect(currentSequenceId('exoplanet-detection')).toBe(
      'planets-and-exoplanets'
    );
    expect(currentSequenceId('the-sky')).toBe('the-sky');
  });

  test('the Library file carries the same map', () => {
    expect(library.sequenceAliases).toEqual(SEQUENCE_ALIASES);
  });
});

describe('the next-step offer under an old sequence id', () => {
  const list = () => {
    const ul = document.createElement('ul');
    ul.dataset.seqEn = 'Next in {name}: {title}';
    ul.dataset.seqEs = 'Siguiente en {name}: {title}';
    return ul;
  };
  const offer = async (seqId, id) => {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify({ k: 'seq', id: seqId }));
    const ul = list();
    await whatNext(ul, { id, deeper: null, onDeeper: () => {} });
    return [...ul.querySelectorAll('a')].map(a => a.getAttribute('href'));
  };

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(async () => ({ json: async () => library }));
  });

  test('orbital-mechanics offers what gravity-and-orbits does', async () => {
    const now = await offer('gravity-and-orbits', 'keplers-laws');
    expect(now).toHaveLength(1);
    expect(now[0]).toMatch(/retrograde-motion/);
    expect(await offer('orbital-mechanics', 'keplers-laws')).toEqual(now);
  });

  test('exoplanet-detection offers what planets-and-exoplanets does', async () => {
    const old = await offer('exoplanet-detection', 'transit-photometry');
    expect(old).toHaveLength(1);
    expect(old[0]).toMatch(/radial-velocity/);
  });

  test('an unknown sequence id still offers nothing', async () => {
    expect(await offer('no-such-sequence', 'keplers-laws')).toEqual([]);
  });
});
