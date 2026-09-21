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
import { EN as EN_BASE } from '../js/i18n/en.js';
import { ES as ES_BASE } from '../js/i18n/es.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

// One catalog, in two files. The split is a code-splitting measure - a
// single message object cannot be deferred, so the strings for panels most
// visitors never open live beside the chunks that use them - and every check
// below is about the catalog as a whole.
const EN = { ...EN_BASE, ...EN_DEFERRED };

// Every registered locale's whole catalog, walked from LOCALES rather than
// named here. The static imports above stay because two dozen checks below are
// about the base/deferred SPLIT and need the halves separately; this map is for
// the checks that are about a catalog as a whole, and it is what makes a third
// language covered by them on the day it is registered rather than the day
// somebody remembers this file exists.
//
// The convention is the one the directory has always kept: `<id>.js` exports
// the id upper-cased, `<id>.deferred.js` exports it with `_DEFERRED`.
async function catalogFor(id) {
  const upper = id.toUpperCase().replace(/-/g, '_');
  const [base, deferred] = await Promise.all([
    import(`../js/i18n/${id}.js`),
    import(`../js/i18n/${id}.deferred.js`),
  ]);
  return { ...base[upper], ...deferred[`${upper}_DEFERRED`] };
}

/** Locale id -> whole catalog, in registry order. */
const CATALOGS = new Map(
  await Promise.all(LOCALES.map(async l => [l.id, await catalogFor(l.id)]))
);
/** Every locale that is a translation of English. */
const TRANSLATIONS = [...CATALOGS].filter(([id]) => id !== 'en');
const ES = CATALOGS.get('es');
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  scenarioTitle,
  scenarioSummary,
  tagLabelLocalized,
} from '../js/i18n/scenario.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { SCENARIO_TAGS, TAG_ORDER } from '../js/data/scenarioTags.js';

// The catalog is the one place a user-facing string is written down, so most
// of what is worth testing about it is structural: that the two locales line up,
// that nothing falls through to a blank, and that the boundary the language
// picker promises - a Spanish interface and English lessons - is real.

beforeEach(async () => {
  await setLocale('en', { persist: false });
});

describe('the catalog', () => {
  test('every registered locale has a catalog that loaded', async () => {
    // The guard on everything below: those checks iterate CATALOGS, so a
    // locale that failed to load would be silently unchecked rather than
    // reported. Naming the registry here makes that impossible.
    expect([...CATALOGS.keys()]).toEqual(LOCALES.map(l => l.id));
    for (const [id, catalog] of CATALOGS) {
      expect(`${id}:${Object.keys(catalog).length > 400}`).toBe(`${id}:true`);
    }
  });

  test('English is complete and Spanish carries the same ids', async () => {
    const en = Object.keys(EN);
    expect(en.length).toBeGreaterThan(400);
    // Every translated id must exist in English. An id that does not is a typo,
    // and a typo in a locale file is silent: the message simply never shows.
    // toHaveProperty reads dots as a path, and every id here has dots in it.
    const enIds = new Set(en);
    for (const [locale, catalog] of TRANSLATIONS) {
      for (const id of Object.keys(catalog)) {
        expect([locale, id, enIds.has(id)]).toEqual([locale, id, true]);
      }
    }
  });

  test('no message is empty, and none is left as a TODO', async () => {
    for (const [name, catalog] of CATALOGS) {
      for (const [id, value] of Object.entries(catalog)) {
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
    // Mutating ES_BASE rather than the merged view: the merge above is a copy,
    // and deleting from a copy would leave the runtime's catalog untouched
    // and the test passing for the wrong reason.
    const id = 'settings.settingsCancel';
    const saved = ES_BASE[id];
    delete ES_BASE[id];
    await setLocale('es', { persist: false });
    expect(t(id)).toBe(EN[id]);
    ES_BASE[id] = saved;
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

  test('a locale states its own coverage, in its own language', async () => {
    // Carried on the registry rather than in the catalog, so it can be shown
    // for a language that has not been fetched yet.
    //
    // This sentence used to say the investigations were still English. They are
    // not: all ten have Spanish translations under
    // js/data/investigations/es/. A promise about coverage is exactly the kind
    // of sentence that goes quietly out of date, so the next assertion ties it
    // to the files rather than to anyone's memory.
    const es = LOCALES.find(l => l.id === 'es');
    expect(es.coverage).toMatch(/español/i);
    expect(es.coverage).toMatch(/investigaciones/i);
    expect(es.coverage).not.toMatch(/inglés/i);
    // And the same sentence is in the catalog, so a translator meets it with
    // everything else.
    expect(ES['locale.coverage.es']).toBe(es.coverage);
  });

  test('the Spanish coverage sentence matches the lessons that exist', async () => {
    // Every lesson the registry can load in Spanish is one the coverage
    // sentence is entitled to claim. If a lesson is added without a
    // translation, this fails and the sentence has to be rewritten - which is
    // the point.
    const { MANIFEST } = await import('../js/data/investigations/manifest.js');
    const translated = await Promise.all(
      MANIFEST.map(l =>
        import(`../js/data/investigations/es/${l.id}.js`).then(
          () => true,
          () => false
        )
      )
    );
    const all = translated.every(Boolean);
    const es = LOCALES.find(l => l.id === 'es');
    // The claim and the files have to agree in both directions.
    expect(
      /investigaciones en español|e investigaciones/i.test(es.coverage)
    ).toBe(all);
  });

  test('coverage is measured against English, not asserted', async () => {
    // The Spanish catalog is fetched on demand, so it has to be in memory
    // before it can be counted.
    await setLocale('es', { persist: false });
    const { translated, total } = coverageOf('es');
    // Against the loaded catalogs, not the merged view: the deferred half
    // is registered by the bridge that loads its panel, and in a bare test
    // environment no panel has been loaded.
    expect(total).toBe(Object.keys(EN_BASE).length);
    expect(translated).toBe(Object.keys(ES_BASE).length);
  });
});

describe('the catalog split', () => {
  test('both halves are present in both languages', () => {
    // The split exists so a panel most visitors never open does not cost them
    // its prose at start-up. It is only safe while the two halves stay in
    // step, and nothing else in this suite would notice a key added to one.
    expect(Object.keys(EN_DEFERRED).sort()).toEqual(
      Object.keys(ES_DEFERRED).sort()
    );
    expect(Object.keys(EN_DEFERRED).length).toBeGreaterThan(50);
  });

  test('no id appears in both halves', () => {
    // A duplicated id would be shadowed by whichever half registered last,
    // which is a bug that would show up as a string reverting when a panel
    // opens.
    const overlap = Object.keys(EN_DEFERRED).filter(k => k in EN_BASE);
    expect(overlap).toEqual([]);
  });

  test('the deferred half holds only deferred panels’ strings', () => {
    // A string used by the start-up path would render as its own id until
    // somebody opened an unrelated panel.
    // reliability.* belongs here because the bench that shows it is itself
    // lazy: its bridge registers this catalog before the panel renders.
    // rvsched.* and most of rv.survey.* belong here for the same reason one
    // level down: the radial velocity panel is eager, but its synthetic
    // observing run is opt-in and its controls are inside a section that is
    // hidden until the reader switches it on - which is the moment the panel
    // registers this catalog and re-sweeps the document. What stays behind
    // in the start-up half is rv.survey.enable, which is the label on the
    // checkbox that does the switching, and the two chart dataset labels,
    // which are written whenever the chart is built and not only during a run.
    // dmW, bhW and transitW joined the list when their thirteen kilobytes of
    // instrument labels were moved out of the start-up download to pay for the
    // gravitational-wave lab. Nothing in the entry graph reaches those three
    // modules; each now registers this catalog itself, the way chaosW and
    // resW already did.
    // gwW is the gravitational-wave lab, which is a widget family like the
    // rest. sound.* is the *body* of the speaker panel, which is written from
    // JavaScript after ensureDeferredMessages() resolves - the button's own
    // labels, which are read at start-up, stayed in the eager half and are
    // checked for below.
    // The front door (welcome*, welcomeCard, welcomeAudience, welcomeLink), the
    // export dialog, the activity bridge and the tidal-disruption model joined
    // the list when the stellar foundation needed room in the start-up
    // download. All four are loaded on demand and none of them can be reached
    // from the entry graph; js/main.js awaits this catalog before it shows
    // the front door, so a first visit never paints a message id.
    // stellar.phase.* is here for the same reason: a phase name is read only
    // for a star something has modeled, which cannot happen before a deferred
    // panel has loaded. The luminosity-class words stayed behind - the
    // inspector prints one on every star's card - and are checked for below.
    // lessonFn.* is every sentence a lesson *computes* - probe rows and
    // answer-checking messages, keyed by what they say. js/i18n/lesson.js is
    // the only module that reads them and js/investigations.js is the only
    // module that imports it, so a visitor who never opened a lesson was
    // downloading 133 of them in order to render none. The loader awaits this
    // catalog before initInvestigations(), so the lookup cannot outrun it.
    // summary.life.* is the one family here that a core module reads:
    // js/canvasSummary.js runs on every frame for everybody. It is allowed
    // because the branch that reads it is guarded on state.evolutionOverlay
    // being active, and only a lesson makes it active - so the lookup cannot
    // happen before the lesson engine, and therefore this catalog, has
    // loaded. The rest of summary.* stayed eager and is checked for below:
    // those sentences describe an ordinary sandbox and are read on a first
    // visit with no lesson anywhere near.
    const allowed =
      /^(lessonFn|binaryRun|binarySweep|assist|rvfit|rvsched|rv\.survey|exoW|resW|chaosW|energyW|hzW|binW|tideW|dmW|bhW|transitW|gwW|sound|reliability|bench|sweep|assign|burn|inv|cr3bp|nb|obsW|export|activity|welcome|welcomeCard|welcomeAudience|welcomeLink|tideP|stelW|stelE|stellar\.phase|summary\.life)\./;
    expect(Object.keys(EN_DEFERRED).filter(k => !allowed.test(k))).toEqual([]);

    // The sandbox sentences the summary reads on a first visit stayed eager.
    for (const id of [
      'summary.scenario',
      'summary.running',
      'summary.paused',
      'summary.noSelection',
      'summary.readoutPointer',
    ]) {
      expect(Object.keys(EN)).toContain(id);
      expect(Object.keys(EN_DEFERRED)).not.toContain(id);
    }

    // The words the inspector prints on every star card stayed eager.
    for (const id of [
      'stellar.class.dwarf',
      'stellar.class.giant',
      'stellar.class.supergiant',
      'stellar.class.degenerate',
    ]) {
      expect(EN_BASE[id]).toBeTruthy();
      expect(EN_DEFERRED[id]).toBeUndefined();
    }

    // The speaker button's own labels are read before any panel is open, so
    // they must not have gone with the panel's prose.
    for (const id of [
      'sound.button.label',
      'sound.button.labeled',
      'sound.state.muted',
      'sound.state.playing',
    ]) {
      expect(EN_BASE[id]).toBeTruthy();
      expect(EN_DEFERRED[id]).toBeUndefined();
    }

    // ...and the three that must NOT have gone with them.
    for (const id of [
      'rv.survey.enable',
      'rv.survey.velocityLabel',
      'rv.survey.measurementsLabel',
    ]) {
      expect(EN_BASE[id]).toBeTruthy();
      expect(EN_DEFERRED[id]).toBeUndefined();
    }
  });
});

describe('the boundary around the investigations', () => {
  test('no lesson text is in the catalog at all', async () => {
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
  test('every scenario has a title and a summary in the catalog', async () => {
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

  test('every step type a lesson uses has a badge in every language', () => {
    // js/investigations.js renders each step's kind with
    // t(`inv.step.kind.${step.type}`), and t() falls back to printing the key
    // itself. Two step types unique to Kepler's Laws - the reshapeable ellipse
    // and the swept-area wedges - had no entry, so the first lesson in the
    // catalog displayed the literal text "inv.step.kind.ellipse" as a badge
    // and logged an i18n warning to every reader's console.
    const types = [
      ...new Set(INVESTIGATIONS.flatMap(inv => inv.steps.map(s => s.type))),
    ];
    expect(types.length).toBeGreaterThan(4);
    const missing = [];
    for (const [locale, catalog] of CATALOGS) {
      for (const type of types) {
        if (!(`inv.step.kind.${type}` in catalog)) {
          missing.push(`${locale}: inv.step.kind.${type}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('no scenario card overflows its limits in any language', () => {
    // js/ui.js validates the catalog at start-up against a 500-character
    // summary and a 100-character title, and warns to the console when a
    // scenario breaks either. It validates SCENARIO_INFO, which is English, so
    // the limits were only ever enforced in one language: five Spanish
    // summaries were over, the longest by a hundred characters, and the cards
    // that carry them are the same size whatever the reader's language.
    //
    // English was breaking it too - Exoplanet Characterization Lab shipped at
    // 506 characters, so every visitor's console carried a validation warning
    // on every load.
    const problems = [];
    for (const [locale, catalog] of CATALOGS) {
      for (const [key, value] of Object.entries(catalog)) {
        if (typeof value !== 'string') continue;
        if (/^scenario\..*\.summary$/.test(key) && value.length > 500) {
          problems.push(`${locale} ${key}: ${value.length} chars (max 500)`);
        }
        if (/^scenario\..*\.title$/.test(key) && value.length > 100) {
          problems.push(`${locale} ${key}: ${value.length} chars (max 100)`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test('a Spanish title is not simply the English one copied over', async () => {
    // A locale file that has been filled in mechanically shows up here: at
    // least most of the catalog should actually differ.
    const keys = Object.keys(SCENARIO_INFO);
    const identical = keys.filter(
      k => ES[`scenario.${k}.summary`] === EN[`scenario.${k}.summary`]
    );
    expect(identical.length).toBeLessThan(keys.length * 0.1);
  });
});

// An escape sequence that survived into the rendered string is not a typo the
// eye catches in a catalog of two thousand entries: `'M\\u2609'` in a
// single-quoted JS string is the seven characters backslash-u-2-6-0-9, and the
// settings panel drew "Default BH Mass (M☉)" on every load in English.
// Spanish had the character itself, which is how the two came to disagree.
describe('catalog strings are text, not source', () => {
  const ESCAPE = /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/;

  for (const [locale, catalog] of CATALOGS) {
    test(`no ${locale} message carries a literal escape sequence`, () => {
      const offenders = Object.entries(catalog)
        .filter(([, value]) => typeof value === 'string' && ESCAPE.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });
  }
});
