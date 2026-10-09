import { describe, test, expect } from '@jest/globals';
import { summaryOf } from '../js/composer/remixCore.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { remixInvestigation } from '../js/platform/remix.js';
import { collectTexts } from '../js/composer/compile.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';

// =============================================================================
// A remix keeps the card summary in both languages (Prompt 78)
// -----------------------------------------------------------------------------
// The catalog refuses a package with a text missing in Spanish, and a summary
// is the one text a lesson does not hold: it comes from summaries.js and
// summaries.es.js. CI saw a remix of Tides lose its Spanish summary on a cold
// process, only there.
// =============================================================================

describe('the summary source', () => {
  test.each(MANIFEST.map(m => m.id))('%s: both languages', async id => {
    const s = await summaryOf(id);
    expect(s.en).toEqual(expect.any(String));
    expect(s.es).toEqual(expect.any(String));
    expect(s.es).not.toBe(s.en);
  });

  test.each(MANIFEST.map(m => m.id))(
    '%s: a remix keeps the summary in Spanish',
    async id => {
      const { pack } = await remixBuiltin(id, { id: `my-${id}` });
      expect(collectTexts(pack).find(t => t.path === 'summary').status).toBe(
        'done'
      );
      expect(pack.summary.es).toEqual(expect.any(String));
    }
  );
});

describe('where the Spanish summary comes from', () => {
  const lesson = {
    id: 'x',
    title: 'T',
    steps: [{ sid: 'a', type: 'read', title: 'A', body: 'b' }],
  };
  const summary = { en: 'English summary.', es: 'Resumen en español.' };

  test('an empty Spanish summary on the lesson does not hide the source’s', () => {
    const { pack } = remixInvestigation(
      lesson,
      { summary: '' },
      { id: 'my-x', summary }
    );
    expect(pack.summary).toMatchObject({ en: summary.en, es: summary.es });
  });

  test('a Spanish lesson’s own summary is used when no source is given', () => {
    const { pack } = remixInvestigation(
      lesson,
      { summary: 'El del propio archivo.' },
      { id: 'my-x' }
    );
    expect(pack.summary).toBeUndefined();
    const own = remixInvestigation(
      { ...lesson, summary: 'Own.' },
      { summary: 'El del propio archivo.' },
      { id: 'my-x' }
    );
    expect(own.pack.summary.es).toBe('El del propio archivo.');
  });
});
