import { describe, test, expect } from '@jest/globals';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { collectTexts } from '../js/composer/compile.js';

// A cold file: nothing has loaded the Spanish lesson before the static
// catalog writes on the English one.

describe('a lesson object that js/data/investigations.js has written on', () => {
  // That module attaches the English summary to every lesson object it
  // imports, for the build tools and tests; a Spanish lesson made from such an
  // object carries the English summary as its own. A Playwright worker that had
  // loaded it (e2e/authorWalk.spec.js does) lost the Spanish summary of every
  // remix made after.
  test('does not cost the remix its Spanish summary', async () => {
    const { loadInvestigation } =
      await import('../js/data/investigations/registry.js');
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const tides = INVESTIGATIONS.find(i => i.id === 'tides');
    expect(typeof tides.summary).toBe('string');
    // Built after the write, as a worker's later spec builds it.
    const es = await loadInvestigation('tides', 'es');
    expect(es.summary).toBe(tides.summary);
    const { pack } = await remixBuiltin('tides', { id: 'my-tides' });
    expect(pack.summary.es).toEqual(expect.any(String));
    expect(pack.summary.es).not.toBe(pack.summary.en);
    expect(collectTexts(pack).find(t => t.path === 'summary').status).toBe(
      'done'
    );
  });
});
