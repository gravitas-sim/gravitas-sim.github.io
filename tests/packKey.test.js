import { describe, test, expect } from '@jest/globals';
import { packKey as make } from '../js/composer/packKey.js';
import { checkInvestigationPack } from '../js/composer/api.js';
import { collectTexts } from '../js/composer/compile.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { answerKeyDocument } from '../js/instructorDocs.js';

// The page has checked the pack; the module is given what that made.
async function packKey(pack, options) {
  const checked = await checkInvestigationPack(pack);
  if (checked.errors.length) return { errors: checked.errors };
  return make(pack, checked.compiled, collectTexts(pack), options);
}

// =============================================================================
// An answer key made in the browser from a pack (Prompt 79)
// =============================================================================

const decode = bytes => new TextDecoder('latin1').decode(bytes);
const drawn = pdf =>
  [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)]
    .map(m => m[1].replace(/\\([()\\])/g, '$1'))
    .join(' ');

describe('the key of a pack is the generator’s key', () => {
  test.each(['orbital-energy', 'keplers-laws', 'weighing-stars'])(
    'a faithful remix of %s prints what the shipped English key prints',
    async id => {
      const { pack } = await remixBuiltin(id, { id: `my-${id}` });
      const got = await packKey(pack, { locale: 'en', version: 'T' });
      expect(got.errors).toBeUndefined();
      const shipped = answerKeyDocument(
        withAllDepths(INVESTIGATIONS.find(i => i.id === id)),
        { version: 'T' }
      );
      expect(drawn(got.bytes)).toBe(drawn(shipped));
    }
  );

  test('the remix’s expectations are the original’s, by reference', async () => {
    const { pack } = await remixBuiltin('keplers-laws', { id: 'my-kl' });
    const text = drawn((await packKey(pack, { version: 'T' })).bytes);
    expect(text).toMatch(/What to expect|expect/i);
  });

  test('Spanish: the key is in Spanish and says how much of it is', async () => {
    const { pack } = await remixBuiltin('orbital-energy', { id: 'my-oe' });
    const got = await packKey(pack, { locale: 'es', version: 'T' });
    const text = drawn(got.bytes);
    expect(text).toMatch(/Clave de respuestas|Paso 1/);
    expect(text).toMatch(/Llega a la respuesta correcta/);
    expect(got.status.total).toBeGreaterThan(0);
    expect(got.status.done).toBeLessThanOrEqual(got.status.total);
    expect(text).toMatch(new RegExp(`${got.status.done}`));
  });

  test('English has no status, and a pack with no Spanish still prints', async () => {
    const pack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const en = await packKey(pack, { locale: 'en' });
    expect(en.status).toBeNull();
    expect(drawn(en.bytes)).toMatch(/Reading an orbit/);
    const es = await packKey(pack, { locale: 'es' });
    expect(es.bytes.length).toBeGreaterThan(1000);
  });

  test('a pack that does not check gives its errors and no key', async () => {
    const pack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    pack.seed = -1;
    const got = await packKey(pack);
    expect(got.bytes).toBeUndefined();
    expect(got.errors.length).toBeGreaterThan(0);
  });
});
