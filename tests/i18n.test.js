import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  t,
  setLocale,
  getLocale,
  onLocaleChange,
  LOCALES,
  localeInfo,
  isSupportedLocale,
  preferredLocale,
  coverageOf,
  hasMessage,
  num,
  initI18n,
} from '../js/i18n/index.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';
import {
  scenarioTitle,
  scenarioSummary,
  tagLabelLocalized,
} from '../js/i18n/scenario.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { SCENARIO_TAGS, TAG_ORDER } from '../js/data/scenarioTags.js';

// The catalogue is the one place a user-facing string is written down, so most
// of what is worth testing about it is structural: that the two locales line up,
// that nothing falls through to a blank, and that the boundary the language
// picker promises - a Spanish interface and English lessons - is real.

beforeEach(async () => {
  await setLocale('en', { persist: false });
});

describe('the catalogue', () => {
  test('English is complete and Spanish carries the same ids', async () => {
    const en = Object.keys(EN);
    const es = Object.keys(ES);
    expect(en.length).toBeGreaterThan(400);
    // Every Spanish id must exist in English. An id that does not is a typo,
    // and a typo in a locale file is silent: the message simply never shows.
    // toHaveProperty reads dots as a path, and every id here has dots in it.
    const enIds = new Set(en);
    for (const id of es) expect([id, enIds.has(id)]).toEqual([id, true]);
  });

  test('no message is empty, and none is left as a TODO', async () => {
    for (const [catalogue, name] of [
      [EN, 'en'],
      [ES, 'es'],
    ]) {
      for (const [id, value] of Object.entries(catalogue)) {
        const forms =
          typeof value === 'string' ? [value] : Object.values(value);
        for (const form of forms) {
          expect(typeof form).toBe('string');
          expect(`${name}:${id}:${form.trim().length > 0}`).toBe(
            `${name}:${id}:true`
          );
          expect(`${name}:${id}:${/\b(TODO|FIXME|XXX)\b/.test(form)}`).toBe(
            `${name}:${id}:false`
          );
        }
      }
    }
  });

  test('a plural message has the same forms in both languages', async () => {
    for (const [id, value] of Object.entries(EN)) {
      if (typeof value === 'string') continue;
      const es = ES[id];
      expect(`${id}:${typeof es}`).toBe(`${id}:object`);
      // Both locales must answer for the same categories, or one of them will
      // fall through to `other` for a count the other handles.
      expect(`${id}:${Object.keys(es).sort()}`).toBe(
        `${id}:${Object.keys(value).sort()}`
      );
    }
  });

  test('a message keeps its placeholders when translated', async () => {
    // The most damaging translation bug there is: a dropped {n} leaves a
    // sentence that reads correctly and states no number at all.
    const holders = v => {
      const forms = typeof v === 'string' ? [v] : Object.values(v);
      return new Set(
        forms.flatMap(f => [...f.matchAll(/\{(\w+)\}/g)].map(m => m[1]))
      );
    };
    for (const [id, value] of Object.entries(EN)) {
      if (!(id in ES)) continue;
      expect(`${id}:${[...holders(ES[id])].sort()}`).toBe(
        `${id}:${[...holders(value)].sort()}`
      );
    }
  });
});

describe('looking a message up', () => {
  test('answers in the active locale', async () => {
    await setLocale('es', { persist: false });
    expect(t('settings.settingsCancel')).toBe('Cancelar');
    await setLocale('en', { persist: false });
    expect(t('settings.settingsCancel')).toBe('Cancel');
  });

  test('falls back to English rather than to a blank', async () => {
    // Proven by asking for an id English has and Spanish is pretending not to.
    const id = 'settings.settingsCancel';
    const saved = ES[id];
    delete ES[id];
    await setLocale('es', { persist: false });
    expect(t(id)).toBe(EN[id]);
    ES[id] = saved;
  });

  test('an unknown id renders as itself, never as nothing', async () => {
    // Loud enough to be caught in review, quiet enough not to collapse a
    // layout into an empty box.
    expect(t('no.such.message')).toBe('no.such.message');
  });

  test('fills placeholders, and leaves unknown ones alone', async () => {
    expect(t('settings.info.about', { label: 'Gravity' })).toBe(
      'Information about Gravity'
    );
    // A brace in prose is not a placeholder waiting to be filled.
    expect(t('settings.info.about', {})).toBe('Information about {label}');
  });

  test('selects a plural form by the active language, not by n === 1', async () => {
    expect(t('gallery.results.all', { n: 1 })).toBe('1 scenario');
    expect(t('gallery.results.all', { n: 0 })).toBe('0 scenarios');
    expect(t('gallery.results.all', { n: 12 })).toBe('12 scenarios');
    await setLocale('es', { persist: false });
    expect(t('gallery.results.all', { n: 1 })).toBe('1 escenario');
    expect(t('gallery.results.all', { n: 12 })).toBe('12 escenarios');
  });

  test('hasMessage answers about the active locale only', async () => {
    await setLocale('en', { persist: false });
    expect(hasMessage('settings.settingsCancel')).toBe(true);
    expect(hasMessage('no.such.message')).toBe(false);
  });

  test('numbers are grouped the way the language groups them', async () => {
    await setLocale('en', { persist: false });
    expect(num(1234567)).toBe('1,234,567');
    await setLocale('es', { persist: false });
    expect(num(1234567)).toBe('1.234.567');
  });
});

describe('choosing a language', () => {
  test('an unsupported id resolves to English rather than throwing', async () => {
    await setLocale('fr', { persist: false });
    expect(getLocale()).toBe('en');
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('es')).toBe(true);
  });

  test('listeners are told, and the document says which language it is in', async () => {
    let seen = null;
    const off = onLocaleChange(id => {
      seen = id;
    });
    await setLocale('es', { persist: false });
    expect(seen).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
    off();
    await setLocale('en', { persist: false });
    expect(seen).toBe('es');
  });

  test('a stored choice survives a reload', async () => {
    window.localStorage.setItem('gravitas_locale', 'es');
    expect(preferredLocale()).toBe('es');
    await initI18n();
    expect(getLocale()).toBe('es');
    window.localStorage.removeItem('gravitas_locale');
  });

  test('with nothing stored, English is the default', async () => {
    window.localStorage.removeItem('gravitas_locale');
    // jsdom reports en-US, which is neither stored nor Spanish.
    expect(preferredLocale()).toBe('en');
  });

  test('every offered locale has a name in its own language', async () => {
    for (const l of LOCALES) {
      expect(typeof l.endonym).toBe('string');
      expect(l.endonym.trim().length).toBeGreaterThan(1);
      // English is bundled; anything else names how to fetch itself.
      expect(l.id === 'en' ? l.load === null : typeof l.load).toBeTruthy();
    }
    expect(localeInfo('es').endonym).toBe('Español');
  });

  test('a partial locale says so, in its own language', async () => {
    // The picker's whole job beyond switching: telling a Spanish reader that
    // the lessons are still English, in Spanish.
    // Carried on the registry rather than in the catalogue, so the picker can
    // show it for a language that has not been fetched yet.
    const es = LOCALES.find(l => l.id === 'es');
    expect(es.coverage).toMatch(/español/i);
    expect(es.coverage).toMatch(/inglés/i);
    expect(es.coverage).toMatch(/investigaciones/i);
    // And the same sentence is in the catalogue, so a translator meets it with
    // everything else.
    expect(ES['locale.coverage.es']).toBe(es.coverage);
  });

  test('coverage is measured against English, not asserted', async () => {
    // The Spanish catalogue is fetched on demand, so it has to be in memory
    // before it can be counted.
    await setLocale('es', { persist: false });
    const { translated, total } = coverageOf('es');
    expect(total).toBe(Object.keys(EN).length);
    expect(translated).toBe(Object.keys(ES).length);
  });
});

describe('the boundary around the investigations', () => {
  test('no lesson text is in the catalogue at all', async () => {
    // Structural rather than a promise: a lesson cannot be half-translated if
    // none of it is here to translate. Ids are checked rather than prose,
    // because prose about investigations does appear - the rail button that
    // opens them is chrome.
    const lessonIds = Object.keys(EN).filter(id =>
      /^(investigation|lesson|step)\./.test(id)
    );
    expect(lessonIds).toEqual([]);
  });
});

describe('scenario prose', () => {
  test('every scenario has a title and a summary in the catalogue', async () => {
    for (const key of Object.keys(SCENARIO_INFO)) {
      expect(Object.keys(EN)).toContain(`scenario.${key}.title`);
      expect(Object.keys(EN)).toContain(`scenario.${key}.summary`);
    }
  });

  test('SCENARIO_INFO still exposes English strings for the tooling', async () => {
    // The thumbnail generator, the instructor build and the catalog tests read
    // these directly and have no reader to localize for.
    for (const [key, info] of Object.entries(SCENARIO_INFO)) {
      expect(info.title).toBe(EN[`scenario.${key}.title`]);
      expect(info.summary).toBe(EN[`scenario.${key}.summary`]);
    }
  });

  test('the accessors answer in the reader’s language', async () => {
    await setLocale('es', { persist: false });
    expect(scenarioTitle('Solar System')).toBe('Sistema solar');
    expect(scenarioSummary('Solar System')).toMatch(/sistema solar/i);
    expect(tagLabelLocalized('dark-matter')).toBe('Materia oscura');
    await setLocale('en', { persist: false });
    expect(scenarioTitle('Solar System')).toBe('Solar System');
    expect(tagLabelLocalized('dark-matter')).toBe('Dark Matter');
  });

  test('every concept tag has a label and a description', async () => {
    for (const id of TAG_ORDER) {
      expect(SCENARIO_TAGS[id].label.length).toBeGreaterThan(2);
      expect(SCENARIO_TAGS[id].description.length).toBeGreaterThan(10);
      expect(Object.keys(ES)).toContain(`tag.${id}.label`);
    }
  });

  test('a Spanish title is not simply the English one copied over', async () => {
    // A locale file that has been filled in mechanically shows up here: at
    // least most of the catalogue should actually differ.
    const keys = Object.keys(SCENARIO_INFO);
    const identical = keys.filter(
      k => ES[`scenario.${k}.summary`] === EN[`scenario.${k}.summary`]
    );
    expect(identical.length).toBeLessThan(keys.length * 0.1);
  });
});
