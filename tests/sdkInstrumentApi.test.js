import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as api from '../sdk/lib/api.mjs';
import { loadExtension, validateExtension } from '../sdk/lib/extension.mjs';
import { colorToken } from '../js/platform/instrument/tokens.js';

// =============================================================================
// The public instrument API (SDK 1.9.0): strings, colour tokens, the plot
// -----------------------------------------------------------------------------
// What sdk/README.md promises an extension instrument may import, and what
// `sdk validate` and `sdk test` do with it.
// =============================================================================

const EXAMPLE = path.join('sdk', 'examples', 'kepler-third-law');
const errors = r => r.findings.filter(f => f.severity === 'error');

describe('translator()', () => {
  const t = api.translator(
    {
      en: { hi: 'Hello {name}', only: 'English only' },
      es: { hi: 'Hola {name}' },
    },
    'es'
  );
  test('speaks the chosen language, falls back to English, then to the key', () => {
    expect(t('hi', { name: 'Ana' })).toBe('Hola Ana');
    expect(t('only')).toBe('English only');
    expect(t('nothing')).toBe('nothing');
    expect(t('hi')).toBe('Hola {name}');
    expect(api.translator({ en: { a: 'A' } }, 'fr')('a')).toBe('A');
    expect(api.translator({ en: {} }, '__proto__')('x')).toBe('x');
  });

  test('checkCatalogs names what is missing, extra, not text or differently interpolated', () => {
    expect(api.checkCatalogs({ en: { a: '{n}' }, es: { a: '{n}' } })).toEqual(
      []
    );
    expect(api.checkCatalogs({ es: {} })).toEqual([
      'an English catalog is required',
    ]);
    expect(
      api.checkCatalogs({
        en: { a: '{n}', b: 'b' },
        es: { a: '{m}', c: 'c', d: 4 },
      })
    ).toEqual([
      'es.d: not text',
      'es.a: placeholders differ from English',
      'es.b: missing',
      'es.c: English has no such key',
      'es.d: English has no such key',
    ]);
  });
});

describe('colour tokens', () => {
  test('every public token is defined by css/tokens.css', () => {
    const css = readFileSync('css/tokens.css', 'utf8');
    for (const name of Object.keys(api.COLOR_TOKENS))
      expect({ name, defined: css.includes(`${name}:`) }).toEqual({
        name,
        defined: true,
      });
  });

  test('a name not on the list is refused, and outside a page the fallback is used', () => {
    expect(() => colorToken('--space-1', '#000')).toThrow(
      /not a public colour token/
    );
    expect(colorToken('--accent', '#123456')).toBe('#123456');
  });
});

describe('INSTRUMENT_API', () => {
  test('names modules that exist and export what it says', async () => {
    for (const [spec, { module, exports }] of Object.entries(
      api.INSTRUMENT_API
    )) {
      const mod = await import(`../${module}`);
      for (const name of exports)
        expect({ spec, name, has: name in mod }).toEqual({
          spec,
          name,
          has: true,
        });
    }
  });

  test('ticks, the plot’s chooser, is a usable public export', async () => {
    const { ticks } = await import('../js/platform/instrument/plot.js');
    expect(ticks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('what `sdk validate` does with it', () => {
  test('the example, which uses all but the plot, is valid and declares Spanish', async () => {
    const r = await validateExtension(loadExtension(EXAMPLE));
    expect(errors(r)).toEqual([]);
    expect(r.findings.some(f => /imports/.test(f.message))).toBe(false);
  });

  test('a declared Spanish catalog that lacks a key is an error', async () => {
    const ext = loadExtension(EXAMPLE);
    const es = JSON.parse(ext.files.get('strings.es.json').toString());
    delete es.years;
    ext.files.set('strings.es.json', Buffer.from(JSON.stringify(es)));
    const r = await validateExtension(ext);
    expect(errors(r).map(f => f.message)).toEqual(['es.years: missing']);
  });

  test('no Spanish catalog is a warning, not an error', async () => {
    const ext = loadExtension(EXAMPLE);
    const m = JSON.parse(ext.files.get('gravitas-extension.json').toString());
    m.provides.translations = m.provides.translations.filter(
      t => t.locale === 'en'
    );
    ext.files.set('gravitas-extension.json', Buffer.from(JSON.stringify(m)));
    const r = await validateExtension(ext);
    expect(errors(r)).toEqual([]);
    expect(r.findings.map(f => f.message).join()).toMatch(/no Spanish catalog/);
  });

  test('an instrument module that is not public is an error, and a private js/ path is still a warning', async () => {
    const ext = loadExtension(EXAMPLE);
    const file = 'keplerThirdLawWidgets.js';
    const src = ext.files.get(file).toString();
    ext.files.set(
      file,
      Buffer.from(`import 'gravitas:instrument/secret';\n${src}`)
    );
    expect(
      errors(await validateExtension(ext))
        .map(f => f.message)
        .join()
    ).toMatch(/not a public instrument module/);
    ext.files.set(
      file,
      Buffer.from(`import '../../js/widgetCanvas.js';\n${src}`)
    );
    const r = await validateExtension(ext);
    expect(
      r.findings.some(
        f => f.severity === 'warning' && /widgetCanvas/.test(f.message)
      )
    ).toBe(true);
  });
});
