import { describe, test, expect } from '@jest/globals';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import {
  MANIFEST,
  investigationIds,
  investigationMeta,
  hasInvestigation,
  loadInvestigation,
  loadAllInvestigations,
  loadedInvestigation,
  setLessonLocale,
  seriesPosition as registrySeriesPosition,
} from '../js/data/investigations/registry.js';
import { seriesPosition } from '../js/data/investigations.js';
import { gradedSteps } from '../js/data/investigations/catalog.js';
import {
  browseMeta,
  manifestEntries,
} from '../tools/build-investigation-manifest.js';
import { BROWSE_META } from '../js/data/investigations/browseData.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';

/**
 * Everything in a lesson that is machinery rather than words.
 *
 * A translation may change any string that is prose; it may not change any of
 * these, and this is what the test compares.
 */
const machinery = inv => ({
  id: inv.id,
  thumbnail: inv.thumbnail,
  lock: inv.lock,
  steps: inv.steps.map(s => ({
    type: s.type,
    kind: s.kind,
    answer: s.answer,
    tolerance: s.tolerance,
    setup: s.setup,
    widget: s.widget,
    toolId: s.tool?.id,
    plotAxis: s.plot?.axis,
    fieldIds: s.fields?.map(f => f.id),
    figureSrc: s.figure?.src,
    importGroups: s.importGroups,
  })),
});

// The ten lessons are split one per file and loaded on demand. There are then
// two descriptions of the catalog in the repository - the lessons themselves
// and the generated manifest the browser draws its cards from - and the whole
// risk of the arrangement is that they stop agreeing. That is what most of this
// file is about.

const DIR = path.join(process.cwd(), 'js', 'data', 'investigations');

/** Locales the registry claims to have lesson translations for. */
const TRANSLATED_LOCALES = ['es'];

describe('the manifest', () => {
  test('every translated locale has a manifest of its own', async () => {
    // The lesson browser draws its cards before any lesson is loaded, so the
    // titles on those cards come from a manifest. A language without one shows
    // ten English cards and then opens a Spanish lesson.
    for (const locale of TRANSLATED_LOCALES) {
      const mod = await import(
        `../js/data/investigations/manifest.${locale}.js`
      );
      expect(mod.MANIFEST.map(m => m.id)).toEqual(MANIFEST.map(m => m.id));
      // And it has to actually be translated, not a copy of the English.
      const same = mod.MANIFEST.filter((m, i) => m.title === MANIFEST[i].title);
      expect(same).toHaveLength(0);
    }
  });

  test('is exactly what the generator would write today', () => {
    // The failure this catches: someone edits a lesson title or adds a step and
    // does not run `npm run manifest`, so the browser quietly shows the old
    // title and the old step count. Compared as data rather than as text, so
    // this fails for a stale manifest and not for a reformatted one.
    expect(MANIFEST).toEqual(manifestEntries());
  });

  test('the filter metadata is what the generator would write today', () => {
    // Same failure as above, one file over: a lesson gains a tag or a numeric
    // step, nobody runs `npm run manifest`, and the browser's subject filter
    // quietly stops offering it.
    expect(BROWSE_META).toEqual(browseMeta());
  });

  test('the filter metadata is not duplicated into the manifest', () => {
    // It is language-independent, so it lives in one file rather than once per
    // locale - and the manifest is in the start-up download while this is read
    // only by the lesson browser.
    for (const entry of MANIFEST) {
      expect(entry.tags).toBeUndefined();
      expect(entry.numericCount).toBeUndefined();
      expect(BROWSE_META[entry.id]).toBeDefined();
    }
  });

  test('describes every lesson, in catalog order', () => {
    expect(MANIFEST.map(m => m.id)).toEqual(INVESTIGATIONS.map(i => i.id));
    expect(investigationIds()).toEqual(INVESTIGATIONS.map(i => i.id));
  });

  test('carries the same values as the lessons it describes', () => {
    for (const inv of INVESTIGATIONS) {
      const m = investigationMeta(inv.id);
      expect(m.title).toBe(inv.title);
      expect(m.subtitle).toBe(inv.subtitle);
      expect(m.duration).toBe(inv.duration);
      expect(m.level).toBe(inv.level);
      expect(m.summary).toBe(inv.summary);
      expect(m.thumbnail).toBe(inv.thumbnail);
      expect(m.series).toBe(inv.series);
      expect(m.stepCount).toBe(inv.steps.length);
      expect(m.gradedCount).toBe(gradedSteps(inv).length);
      expect(m.objectiveCount).toBe(inv.objectives?.length || 0);
    }
  });

  test('carries the card fields and no lesson text', () => {
    // The point of the manifest is that it is small. `steps` creeping into it
    // would put all 225KB back on the start-up path of the lesson browser.
    for (const m of MANIFEST) {
      expect(m.steps).toBeUndefined();
      expect(m.objectives).toBeUndefined();
      expect(m.lock).toBeUndefined();
    }
    // Per entry rather than per manifest. The old bound was a flat 16 KB,
    // which is not a property of the manifest's design but of how many
    // lessons happened to exist when it was written: at 22 it sat 86 bytes
    // under, so the 23rd lesson failed it whatever size that lesson was. A
    // mean-per-entry bound scales with the catalog and is strictly more
    // sensitive to the thing this test exists for - a `steps` leak inflates
    // every entry at once, so it moves the mean by an order of magnitude
    // while a long summary on one lesson moves it by a few bytes.
    const bytes = JSON.stringify(MANIFEST).length;
    const perEntry = bytes / MANIFEST.length;
    expect(perEntry).toBeLessThan(800);
    // And a card entry is a card entry: no single one is allowed to become a
    // lesson in disguise, which the mean alone would let through on a large
    // catalog.
    for (const m of MANIFEST) {
      expect(JSON.stringify(m).length).toBeLessThan(1400);
    }
  });
});

describe('loading a lesson', () => {
  test('there is one file per lesson and no strays', () => {
    const files = readdirSync(DIR)
      .filter(f => f.endsWith('.js'))
      .sort();
    const lessons = INVESTIGATIONS.map(i => `${i.id}.js`);
    expect(files).toEqual(
      [
        ...lessons,
        ...TRANSLATED_LOCALES.map(l => `manifest.${l}.js`),
        // The lesson machinery. Anything else in this directory is a lesson,
        // and a file here that is neither is either a stray or something the
        // registry does not know to load.
        'browse.js',
        'browseData.js',
        'catalog.js',
        'i18n.js',
        'manifest.js',
        // Generated by tools/lesson-scene-audit.mjs --write from the reviewed
        // acceptance map: where each lesson's central experiment gets its
        // number from, for the line the explanation step shows a learner.
        'provenance.js',
        'registry.js',
        'sequences.js',
      ].sort()
    );
  });

  test('every translated locale has a file per lesson', () => {
    // A missing translation is not an error - the lesson falls back to English
    // - but a locale that is half wired is: the registry names a file per
    // lesson, and an import of a file that is not there is a failed fetch on
    // the one path a student is waiting on.
    for (const locale of TRANSLATED_LOCALES) {
      const files = readdirSync(path.join(DIR, locale))
        .filter(f => f.endsWith('.js'))
        .sort();
      expect(files).toEqual(INVESTIGATIONS.map(i => `${i.id}.js`).sort());
    }
  });

  test('returns the same lesson the synchronous barrel has', async () => {
    for (const id of investigationIds()) {
      const lazy = await loadInvestigation(id);
      expect(lazy).toBe(getInvestigation(id));
    }
  });

  test('an unknown id resolves to undefined rather than throwing', async () => {
    expect(hasInvestigation('keplers-laws')).toBe(true);
    expect(hasInvestigation('no-such-lesson')).toBe(false);
    await expect(loadInvestigation('no-such-lesson')).resolves.toBeUndefined();
  });

  test('is memoized, so a second open is the same object', async () => {
    const a = await loadInvestigation('tides');
    const b = await loadInvestigation('tides');
    expect(a).toBe(b);
    expect(loadedInvestigation('tides')).toBe(a);
  });

  test('two simultaneous opens share one load', async () => {
    // A double click on a card. Both callers must get the lesson, and they must
    // get the same one.
    const [a, b] = await Promise.all([
      loadInvestigation('black-holes'),
      loadInvestigation('black-holes'),
    ]);
    expect(a).toBe(b);
  });

  test('loadAll gives the whole catalog, in order', async () => {
    const all = await loadAllInvestigations();
    expect(all.map(i => i.id)).toEqual(INVESTIGATIONS.map(i => i.id));
    expect(all).toEqual(INVESTIGATIONS);
  });
});

describe('series position', () => {
  test('reads the same from the manifest as from the lessons', () => {
    // The browser card computes this from a manifest entry and the open panel
    // computes it from the lesson. "2 of 3" has to be the same sentence.
    for (const inv of INVESTIGATIONS) {
      expect(registrySeriesPosition(investigationMeta(inv.id))).toEqual(
        seriesPosition(inv)
      );
    }
  });

  test('a lesson in no series has no position', () => {
    const loner = INVESTIGATIONS.find(i => !i.series);
    expect(loner).toBeDefined();
    expect(seriesPosition(loner)).toBeNull();
    expect(registrySeriesPosition(loner)).toBeNull();
  });

  test('an entry the catalog does not know is not placed in it', () => {
    expect(seriesPosition(null)).toBeNull();
    expect(
      registrySeriesPosition({ id: 'nope', series: 'Detecting exoplanets' })
    ).toBeNull();
  });
});

describe('the split itself', () => {
  test('no lesson file imports anything', async () => {
    // A lesson is content. The moment one imports the simulation, the chunk it
    // loads in stops being content and the split stops paying for itself.
    const { readFileSync } = await import('node:fs');
    for (const inv of INVESTIGATIONS) {
      const src = readFileSync(path.join(DIR, `${inv.id}.js`), 'utf8');
      expect(src).not.toMatch(/^\s*import\s/m);
      expect(src).toMatch(/\nexport default [A-Z_]+;\n$/);
    }
  });

  test('the registry names every lesson as a static specifier', async () => {
    // esbuild can only split a chunk for an import it can see. A computed
    // specifier would bundle all ten back into one.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(path.join(DIR, 'registry.js'), 'utf8');
    for (const inv of INVESTIGATIONS) {
      expect(src).toContain(`import('./${inv.id}.js')`);
    }
    expect(src).not.toMatch(/import\(\s*[`'"][^`'"]*\$\{/);
  });
});

describe('lesson translations', () => {
  test('a translation never reaches the lesson machinery', async () => {
    // The one thing a translation must not be able to do. A `setup.scenario`
    // translated into Spanish loads no scenario; a translated field id loses
    // the student's saved answer; a translated widget id draws nothing.
    for (const locale of TRANSLATED_LOCALES) {
      for (const inv of INVESTIGATIONS) {
        const es = (
          await import(`../js/data/investigations/${locale}/${inv.id}.js`)
        ).default;
        const translated = mergeTranslation(inv, es);
        expect(machinery(translated)).toEqual(machinery(inv));
      }
    }
  });

  test('a shadow cannot move a star, however hard it tries', async () => {
    // The keys that say where a lesson's stars stand are strings, and so are
    // the words beside them, so nothing in the shape of a shadow distinguishes
    // "translate this" from "break this". STRUCTURAL is what distinguishes
    // them, and mergeTranslation refuses those keys outright - a deliberate
    // change, because the file's header had claimed this for a long time
    // before it was true.
    const base = {
      id: 'x',
      steps: [
        {
          sid: 'one',
          title: 'Two stars',
          stage: {
            stars: [
              { role: 'dwarf', name: 'Red dwarf', track: 'm020', at: 'ms' },
            ],
          },
          tool: { id: 'stellar-compare', pace: 'phase', bind: 'cursor' },
          fields: [{ id: 'r', label: 'Radius', unit: 'R☉' }],
        },
      ],
    };
    const hostile = {
      id: 'y',
      steps: [
        {
          sid: 'uno',
          title: 'Dos estrellas',
          stage: {
            stars: [
              {
                role: 'enana',
                name: 'Enana roja',
                track: 'm2000',
                at: 'sp',
              },
            ],
          },
          tool: { id: 'otra-cosa', pace: 'tiempo', bind: 'cursor-es' },
          fields: [{ id: 'radio', label: 'Radio', unit: 'R sol' }],
        },
      ],
    };
    const out = mergeTranslation(base, hostile);
    const star = out.steps[0].stage.stars[0];
    // The words changed.
    expect(out.steps[0].title).toBe('Dos estrellas');
    expect(star.name).toBe('Enana roja');
    expect(out.steps[0].fields[0].label).toBe('Radio');
    // Nothing else did. Each of these would have been a silent break: a role
    // no binding resolves, a star at the wrong point of the wrong track, an
    // instrument that does not exist, a lost answer, a units bug.
    expect(star.role).toBe('dwarf');
    expect(star.track).toBe('m020');
    expect(star.at).toBe('ms');
    expect(out.steps[0].tool).toMatchObject({
      id: 'stellar-compare',
      pace: 'phase',
      bind: 'cursor',
    });
    expect(out.steps[0].fields[0]).toMatchObject({ id: 'r', unit: 'R☉' });
    expect(out.steps[0].sid).toBe('one');
    expect(out.id).toBe('x');
  });

  test('a star that is named on screen is named in every language', async () => {
    // Object names are read out on the canvas, in the accessible object list,
    // on the comparison card and in a capture, so they are content and not
    // machinery. This is the lesson that leans on them hardest.
    const en = (
      await import('../js/data/investigations/a-universe-of-stars.js')
    ).default;
    const es = (
      await import('../js/data/investigations/es/a-universe-of-stars.js')
    ).default;
    const merged = mergeTranslation(en, es);
    const named = merged.steps.flatMap(s =>
      (s.stage?.stars ?? []).map(x => x.name)
    );
    expect(named.length).toBeGreaterThan(20);
    expect(named.every(Boolean)).toBe(true);
    // A handful that must have moved into Spanish, checked by name rather
    // than by counting: a coverage percentage can be satisfied by nulls.
    const all = named.join(' | ');
    for (const word of ['Estrella 1', 'Enana roja', 'El Sol', 'Supergigante']) {
      expect(all).toContain(word);
    }
    expect(all).not.toContain('Red dwarf');
  });

  test('every function comes through by reference', async () => {
    // Probes, widget hooks and graders. mergeTranslation copies objects, so a
    // function that had been replaced by a copy would still work; one replaced
    // by a string would not, and neither would be caught by a shape check.
    for (const inv of INVESTIGATIONS) {
      const es = (await import(`../js/data/investigations/es/${inv.id}.js`))
        .default;
      const translated = mergeTranslation(inv, es);
      const walk = (a, b, path) => {
        if (typeof a === 'function') {
          expect(`${path}: ${typeof b}`).toBe(`${path}: function`);
          expect(b).toBe(a);
          return;
        }
        if (Array.isArray(a))
          return a.forEach((x, i) => walk(x, b?.[i], `${path}.${i}`));
        if (a && typeof a === 'object')
          for (const k of Object.keys(a)) walk(a[k], b?.[k], `${path}.${k}`);
      };
      walk(inv, translated, inv.id);
    }
  });

  test('the step and option counts are untouched', async () => {
    // Answer indices point at positions in `options`, and gradedSteps counts
    // positions in `steps`. A translation that dropped or added one would
    // silently mark right answers wrong.
    for (const inv of INVESTIGATIONS) {
      const es = (await import(`../js/data/investigations/es/${inv.id}.js`))
        .default;
      const translated = mergeTranslation(inv, es);
      expect(translated.steps).toHaveLength(inv.steps.length);
      inv.steps.forEach((step, i) => {
        expect(translated.steps[i].options?.length).toBe(step.options?.length);
        expect(translated.steps[i].fields?.length).toBe(step.fields?.length);
        expect(translated.steps[i].checklist?.length).toBe(
          step.checklist?.length
        );
      });
      expect(gradedSteps(translated)).toHaveLength(gradedSteps(inv).length);
    }
  });

  test('the lessons are actually in Spanish', async () => {
    // Structure alone would pass on a file that still held the English. This
    // is the check that the words changed.
    for (const inv of INVESTIGATIONS) {
      const es = (await import(`../js/data/investigations/es/${inv.id}.js`))
        .default;
      let same = 0;
      let total = 0;
      const walk = (a, b) => {
        if (typeof a === 'string') {
          if (!a.trim()) return;
          total++;
          if (typeof b === 'string' && b.trim() === a.trim()) same++;
          return;
        }
        if (Array.isArray(a))
          return a.forEach((x, i) =>
            walk(x, Array.isArray(b) ? b[i] : undefined)
          );
        if (a && typeof a === 'object')
          for (const k of Object.keys(a))
            walk(a[k], b && typeof b === 'object' ? b[k] : undefined);
      };
      walk(inv, es);
      // Units and symbols - km/s, kpc, M☉ - are the same word in both
      // languages, so this is not 100%.
      expect(`${inv.id}: ${Math.round((1 - same / total) * 100)}%`).toBe(
        `${inv.id}: ${Math.round((1 - same / total) * 100)}%`
      );
      expect(1 - same / total).toBeGreaterThan(0.9);
    }
  });

  test('the registry serves a lesson in the chosen language', async () => {
    setLessonLocale('es');
    const es = await loadInvestigation('tides');
    expect(es.title).toBe('Mareas');
    setLessonLocale('en');
    const en = await loadInvestigation('tides');
    expect(en.title).toBe('Tides');
    // Memoized separately, so switching back and forth does not re-merge.
    expect(await loadInvestigation('tides')).toBe(en);
  });

  test('an unknown locale falls back to the English lesson', async () => {
    setLessonLocale('fr');
    const inv = await loadInvestigation('tides');
    expect(inv).toBe(getInvestigation('tides'));
    setLessonLocale('en');
  });
});
