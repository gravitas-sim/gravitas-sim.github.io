// =============================================================================
// A translated lesson must never be a core precache asset
// -----------------------------------------------------------------------------
// tools/build-service-worker.mjs walks js/ with core: true, and sw.js deletes
// the cache and rejects the install if any core asset 404s. So a lesson shadow
// directory that reaches the core list makes a single missing translated file
// able to stop a new version activating - for every reader, in every language,
// not only the one whose file is missing.
//
// That was live: the exclusion named js/data/investigations/es/ literally, so
// adding a third locale directory would have precached roughly 850 KB of new
// shadows as core. These checks are about the property rather than about the
// locales that exist today, which is the only way a test can protect a locale
// nobody has added yet.
// =============================================================================
import { describe, test, expect } from '@jest/globals';

import {
  buildManifest,
  expectedFile,
  isLocaleShadow,
} from '../tools/build-service-worker.mjs';
import { LOCALES } from '../js/i18n/index.js';

const SHADOW = 'js/data/investigations';
const TRANSLATED = LOCALES.map(l => l.id).filter(id => id !== 'en');

describe('the precache and translated lessons', () => {
  test('the exclusion matches any locale directory, not only the ones that exist', () => {
    // The regression this file exists for. `fr` is deliberately not registered
    // anywhere: the exclusion has to be keyed to the shape of the path, because
    // a pattern keyed to the registry would let an unregistered directory
    // through - and an unregistered directory is exactly the case nobody is
    // watching for.
    for (const id of ['es', 'fr', 'de', 'pt', 'zh', 'pt-BR']) {
      expect(`${id}:${isLocaleShadow(`${SHADOW}/${id}/tides.js`)}`).toBe(
        `${id}:true`
      );
    }
  });

  test('an English lesson body is not mistaken for a translation', () => {
    for (const p of [
      `${SHADOW}/tides.js`,
      `${SHADOW}/manifest.js`,
      'js/ui.js',
      'js/data/activities.js',
    ]) {
      expect(`${p}:${isLocaleShadow(p)}`).toBe(`${p}:false`);
    }
  });

  test('no translated lesson is precached, as core or as optional', async () => {
    const { core, optional } = await buildManifest();
    expect(core.filter(isLocaleShadow)).toEqual([]);
    expect(optional.filter(isLocaleShadow)).toEqual([]);
  });

  test('every registered translation gets a warm list', async () => {
    const file = await expectedFile();
    const block = file.slice(file.indexOf('__GRAVITAS_LOCALE_WARM'));
    for (const id of TRANSLATED) {
      expect(`${id}:${new RegExp(`\\n  ${id}: \\[`).test(block)}`).toBe(
        `${id}:true`
      );
    }
    // English is the base and has no shadows, so warming it would be a list of
    // files that do not exist.
    expect(/\n {2}en: \[/.test(block)).toBe(false);
  });

  test('the warm lists name real files', async () => {
    const file = await expectedFile();
    const warm = [...file.matchAll(/'\.\/(js\/data\/investigations\/[^']+)'/g)]
      .map(m => m[1])
      .filter(isLocaleShadow);
    expect(warm.length).toBeGreaterThan(0);
    for (const p of warm) expect(`${p}:${isLocaleShadow(p)}`).toBe(`${p}:true`);
  });
});
