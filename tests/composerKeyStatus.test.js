// A status the Composer builds while a language switch is still loading is said
// in the language the reader chose, not the one they are leaving (e2e/packKey
// .spec.js flaked on it: the English message stayed after pressing Spanish).
import { describe, test, expect } from '@jest/globals';
import { keyEs } from '../js/composer/publish.js';

describe('the answer-key status during a language switch', () => {
  test('a key that cannot be made waits for the switch, then says so in the new language', async () => {
    let locale = 'en';
    let release;
    const switching = new Promise(r => (release = r)).then(() => {
      locale = 'es';
    });
    const said = [];
    const ctx = {
      languageSettled: () => switching,
      verdict: () => true,
      ok: () => false,
      t: id => `${locale}:${id}`,
      setStatus: m => said.push(m),
    };
    const done = keyEs(ctx);
    await Promise.resolve();
    expect(said).toEqual([]);
    release();
    await done;
    expect(said).toEqual(['es:studio.status.fixFirst']);
  });

  test('the failure path waits too', async () => {
    let locale = 'en';
    let release;
    const switching = new Promise(r => (release = r)).then(() => {
      locale = 'es';
    });
    const said = [];
    const ctx = {
      languageSettled: () => switching,
      verdict: () => {
        throw new Error('no key');
      },
      t: id => `${locale}:${id}`,
      setStatus: m => said.push(m),
    };
    const done = keyEs(ctx);
    release();
    await done;
    expect(said).toEqual(['es:composer.key.failed']);
  });
});
