// A status the Composer builds while a language switch is still loading is said
// in the language the reader chose, not the one they are leaving (e2e/packKey
// .spec.js flaked on it: the English message stayed after pressing Spanish).
import { describe, test, expect } from '@jest/globals';
import { keyEs, preview, publishLink, remix } from '../js/composer/publish.js';

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

describe('the remix, preview and link statuses during a language switch', () => {
  /** A context whose words change when the switch lands. */
  const make = extra => {
    let locale = 'en';
    let release;
    const switching = new Promise(r => (release = r)).then(() => {
      locale = 'es';
    });
    const said = [];
    const ctx = {
      languageSettled: () => switching,
      t: id => `${locale}:${id}`,
      setStatus: m => said.push(m),
      taken: () => [],
      $: () => ({ value: 'no-such-investigation' }),
      ...extra,
    };
    return { ctx, said, release };
  };

  test('a pack that is not valid says so in the new language (preview)', async () => {
    const { ctx, said, release } = make({ ok: () => false });
    const done = preview(ctx);
    await Promise.resolve();
    expect(said).toEqual([]);
    release();
    await done;
    expect(said).toEqual(['es:studio.status.fixFirst']);
  });

  test('a pack that is not valid says so in the new language (link)', async () => {
    const { ctx, said, release } = make({ ok: () => false });
    const done = publishLink(ctx);
    await Promise.resolve();
    expect(said).toEqual([]);
    release();
    await done;
    expect(said).toEqual(['es:composer.publish.fixFirst']);
  });

  test('a remix that cannot be made says so in the new language', async () => {
    const { ctx, said, release } = make();
    const done = remix(ctx);
    // The failure is known while the language is still loading.
    await new Promise(r => setTimeout(r, 100));
    expect(said).toEqual([]);
    release();
    await done;
    expect(said).toEqual(['es:composer.status.remixFailed']);
  });

  test('a remix that is made is announced in the new language', async () => {
    const { ctx, release } = make({ $: () => ({ value: 'keplers-laws' }) });
    let started;
    ctx.start = (pack, msg) => (started = msg);
    const done = remix(ctx);
    // The remix is built while the language is still loading.
    await new Promise(r => setTimeout(r, 0));
    expect(started).toBeUndefined();
    release();
    await done;
    expect(started).toMatch(/^es:composer\.status\.remixed/);
  });
});
