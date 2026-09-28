import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';

import {
  serialize,
  createHistory,
  createDrafts,
  semanticDiff,
} from '../js/studio/model.js';
import {
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
} from '../js/platform/scenario.js';
import { blankPack, settingsFromScenario } from '../js/scenarioPack.js';
import { TAG_ORDER } from '../js/data/scenarioTags.js';
import { BUILDER_TYPES } from '../js/systemSpec.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';
import { EN_STUDIO } from '../js/i18n/en.studio.js';
import { ES_STUDIO } from '../js/i18n/es.studio.js';
import { EN_BUILDER } from '../js/i18n/en.builder.js';
import { ES_BUILDER } from '../js/i18n/es.builder.js';
import { EN_PLACEMENT } from '../js/i18n/en.placement.js';
import { ES_PLACEMENT } from '../js/i18n/es.placement.js';

// =============================================================================
// The Scenario Studio: the parts that lose work when they are wrong, and the
// words
// -----------------------------------------------------------------------------
// js/studio/model.js is the history, the drafts and the differences; a bug in
// any of them loses a reader's scenario, so each is held to the behaviour the
// page relies on. The page's words come from four tables in each language -
// the application's base catalog, the Studio's fragment, and the Orbital
// System Builder's and precise placement's - and the last block holds every
// key js/studioPage.js names, literal or built, to all four in both.
// =============================================================================

describe('history', () => {
  test('undo and redo return each state byte for byte', () => {
    const a = blankPack(1);
    const h = createHistory(a);
    const b = { ...a, seed: 2, settings: { num_planets: 12 } };
    const c = { ...b, tags: ['orbits'] };
    expect(h.commit(b)).toBe(true);
    expect(h.commit(c)).toBe(true);
    expect(serialize(h.undo())).toBe(serialize(b));
    expect(serialize(h.undo())).toBe(serialize(a));
    expect(h.undo()).toBeNull();
    expect(h.canUndo()).toBe(false);
    expect(serialize(h.redo())).toBe(serialize(b));
    expect(serialize(h.redo())).toBe(serialize(c));
    expect(h.redo()).toBeNull();
  });

  test('an edit after an undo drops the redo branch', () => {
    const h = createHistory({ n: 0 });
    h.commit({ n: 1 });
    h.commit({ n: 2 });
    h.undo();
    h.commit({ n: 3 });
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toEqual({ n: 1 });
  });

  test('a commit that changes nothing is not a step', () => {
    const h = createHistory({ n: 0 });
    expect(h.commit({ n: 0 })).toBe(false);
    expect(h.canUndo()).toBe(false);
  });

  test('the current document is a copy the caller cannot corrupt', () => {
    const h = createHistory({ list: [1, 2] });
    h.current().list.push(3);
    expect(h.current()).toEqual({ list: [1, 2] });
  });

  test('the oldest snapshots are dropped past the limit', () => {
    const h = createHistory({ n: 0 }, 3);
    for (let n = 1; n <= 10; n++) h.commit({ n });
    let steps = 0;
    while (h.undo()) steps++;
    expect(steps).toBe(3);
    expect(h.current()).toEqual({ n: 7 });
  });

  test('reset forgets everything before it', () => {
    const h = createHistory({ n: 0 });
    h.commit({ n: 1 });
    h.reset({ n: 5 });
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.current()).toEqual({ n: 5 });
  });
});

/** A Storage stand-in, and one that refuses every call, as a private window may. */
function memoryStore() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}
const refusingStore = () => {
  const no = () => {
    throw new Error('SecurityError');
  };
  return {
    get length() {
      return no();
    },
    key: no,
    getItem: no,
    setItem: no,
    removeItem: no,
  };
};

describe('drafts', () => {
  test('a saved draft loads back, and is the last one', () => {
    const d = createDrafts(memoryStore());
    const pack = blankPack(7);
    expect(d.save(pack, 1000).ok).toBe(true);
    expect(d.load(pack.id)).toEqual({ savedAt: 1000, doc: pack });
    expect(d.last()).toBe(pack.id);
  });

  test('drafts list newest first, and a removed one is gone', () => {
    const d = createDrafts(memoryStore());
    d.save({ ...blankPack(1), id: 'older' }, 1);
    d.save({ ...blankPack(2), id: 'newer' }, 2);
    expect(d.list().map(x => x.id)).toEqual(['newer', 'older']);
    d.remove('newer');
    expect(d.list().map(x => x.id)).toEqual(['older']);
    expect(d.load('newer')).toBeNull();
  });

  test('other keys in the store are not drafts, and a broken one hides no other', () => {
    const store = memoryStore();
    store.setItem('gravitas_settings', '{"x":1}');
    store.setItem('gravitas_studio_draft:broken', 'not json');
    const d = createDrafts(store);
    d.save({ ...blankPack(3), id: 'kept' }, 5);
    expect(d.list().map(x => x.id)).toEqual(['kept']);
    expect(d.load('broken')).toBeNull();
  });

  test('a store that refuses is reported, never thrown', () => {
    const d = createDrafts(refusingStore());
    expect(d.save(blankPack(1)).ok).toBe(false);
    expect(d.load('anything')).toBeNull();
    expect(d.list()).toEqual([]);
    expect(d.last()).toBeNull();
    expect(() => d.remove('anything')).not.toThrow();
  });
});

describe('semantic differences', () => {
  test('nothing differs between a document and its copy', () => {
    const a = blankPack(1);
    expect(semanticDiff(a, JSON.parse(serialize(a)))).toEqual([]);
  });

  test('paths are the validator’s, and each change says what kind it is', () => {
    const a = { settings: { num_planets: 3 }, bodies: [{ mass: 1 }] };
    const b = {
      settings: { num_planets: 5, num_comets: 2 },
      bodies: [{ mass: 2 }],
      tags: ['orbits'],
    };
    expect(semanticDiff(a, b)).toEqual([
      {
        path: 'settings.num_planets',
        kind: 'changed',
        before: 3,
        after: 5,
      },
      {
        path: 'settings.num_comets',
        kind: 'added',
        before: undefined,
        after: 2,
      },
      { path: 'bodies[0].mass', kind: 'changed', before: 1, after: 2 },
      { path: 'tags', kind: 'added', before: undefined, after: ['orbits'] },
    ]);
    expect(semanticDiff(b, a).find(c => c.path === 'tags').kind).toBe(
      'removed'
    );
  });

  test('a list of numbers is one field', () => {
    const d = semanticDiff(
      { settings: { bh_masses: [1, 2] } },
      { settings: { bh_masses: [1, 2, 3] } }
    );
    expect(d).toEqual([
      {
        path: 'settings.bh_masses',
        kind: 'changed',
        before: [1, 2],
        after: [1, 2, 3],
      },
    ]);
  });

  test('a body added to a list is one addition', () => {
    const d = semanticDiff(
      { bodies: [{ m: 1 }] },
      { bodies: [{ m: 1 }, { m: 2 }] }
    );
    expect(d).toEqual([
      { path: 'bodies[1]', kind: 'added', before: undefined, after: { m: 2 } },
    ]);
  });

  test('a difference holds copies, not the documents’ own objects', () => {
    const after = { bodies: [{ m: 2 }] };
    const [c] = semanticDiff({}, after);
    after.bodies[0].m = 99;
    expect(c.after).toEqual([{ m: 2 }]);
  });
});

// --- The words ----------------------------------------------------------------

const TABLES = {
  en: { ...EN, ...EN_STUDIO, ...EN_BUILDER, ...EN_PLACEMENT },
  es: { ...ES, ...ES_STUDIO, ...ES_BUILDER, ...ES_PLACEMENT },
};
const PAGE = readFileSync('js/studioPage.js', 'utf8');
const VALIDATOR = readFileSync('js/platform/scenario.js', 'utf8');
const camel = key => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Every call to a plain function named `name`, anywhere in a module. */
function callsOf(source, name) {
  const out = [];
  const visit = node => {
    if (!node || typeof node.type !== 'string') return;
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === name
    )
      out.push(node);
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }));
  return out;
}

/** Every string literal passed as the first argument of t(). */
function literalKeys(source) {
  const keys = new Set();
  for (const n of callsOf(source, 't')) {
    const [a] = n.arguments;
    if (a?.type === 'Literal' && typeof a.value === 'string') keys.add(a.value);
  }
  return [...keys];
}

/** The literal third argument of each need(ok, path, code, ...) call. */
function validatorCodes(source) {
  const codes = new Set();
  for (const n of callsOf(source, 'need')) {
    const a = n.arguments[2];
    if (a?.type === 'Literal') codes.add(a.value);
  }
  return [...codes];
}

describe('the Studio’s words', () => {
  const missing = keys =>
    Object.fromEntries(
      Object.entries(TABLES).map(([id, table]) => [
        id,
        keys.filter(k => !(k in table)),
      ])
    );
  const none = { en: [], es: [] };

  test('every key js/studioPage.js names is in both languages', () => {
    const keys = literalKeys(PAGE);
    expect(keys.length).toBeGreaterThan(80);
    expect(missing(keys)).toEqual(none);
  });

  test('the fragments have the same keys, and none repeats the base catalog', () => {
    expect(Object.keys(ES_STUDIO).sort()).toEqual(
      Object.keys(EN_STUDIO).sort()
    );
    expect(Object.keys(EN_STUDIO).filter(k => k in EN)).toEqual([]);
  });

  test('every setting a scenario can carry has a label in both languages', () => {
    const unlabelled = Object.fromEntries(
      Object.entries(TABLES).map(([id, table]) => [
        id,
        Object.keys(SETTING_RULES).filter(
          k =>
            !(`settings.label.${camel(k)}` in (id === 'en' ? EN : ES)) &&
            !(`studio.setting.${k}` in table)
        ),
      ])
    );
    expect(unlabelled).toEqual(none);
  });

  test('a Studio label is only where the Settings panel has none', () => {
    const redundant = Object.keys(EN_STUDIO)
      .filter(k => k.startsWith('studio.setting.'))
      .map(k => k.slice('studio.setting.'.length))
      .filter(k => !(k in SETTING_RULES) || `settings.label.${camel(k)}` in EN);
    expect(redundant).toEqual([]);
  });

  test('every validator complaint has words in both languages', () => {
    const codes = validatorCodes(VALIDATOR);
    expect(codes.length).toBeGreaterThan(25);
    expect(missing(codes.map(c => `studio.error.${c}`))).toEqual(none);
  });

  test('the keys the page builds exist in both languages', () => {
    const rail = Object.fromEntries(
      [...PAGE.matchAll(/^\s+(\w+): '(rail\.\w+)',$/gm)].map(m => [m[1], m[2]])
    );
    expect(Object.keys(rail).sort()).toEqual(
      [...STARTING_PANELS, ...STARTING_TOOLS].sort()
    );
    const built = [
      ...Object.values(rail),
      ...['id', 'version', 'title', 'summary', 'open', 'tools'].map(
        k => `studio.field.${k}`
      ),
      ...['en', 'es'].map(k => `studio.language.${k}`),
      ...TAG_ORDER.map(tag => `tag.${tag}.label`),
      ...['physics', 'population', 'display'].map(g => `studio.group.${g}`),
      ...['added', 'removed', 'changed'].map(k => `studio.diff.${k}`),
      ...['unreadable', 'notPack', 'newer'].map(k => `studio.file.${k}`),
      ...new Set(
        Object.values(BUILDER_TYPES).map(
          b => `builder.mass.${b.unit ?? 'suns'}`
        )
      ),
    ];
    expect(missing(built)).toEqual(none);
    const groups = new Set(Object.values(SETTING_RULES).map(r => r.group));
    expect([...groups].sort()).toEqual(['display', 'physics', 'population']);
  });

  test('a built-in scenario’s settings copy without an unknown key', () => {
    const { settings } = settingsFromScenario('Star Cluster');
    expect(Object.keys(settings).filter(k => !(k in SETTING_RULES))).toEqual(
      []
    );
  });
});
