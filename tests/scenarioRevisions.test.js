/* global document, setTimeout, Buffer */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as app from '../js/appState.js';
import {
  SCENARIO_REVISIONS,
  buildPayload,
  currentRevision,
  decodePayload,
  encodePayload,
  linkVersionOf,
  markOrigin,
  payloadFromSetup,
  payloadSeed,
  pristineSettingsFor,
  resolveRevision,
  rowFor,
  setupFor,
  withRevision,
} from '../js/shareState.js';
import { SCENARIO_PRESETS } from '../js/scenarios.js';
import { compileScenarioPack } from '../js/scenarioPack.js';
import { itemLink } from '../js/course/links.js';
import { parseSeed } from '../js/rng.js';
import { LISTS, bodyRecord, digest, fnv } from './scenarioDigest.js';

// =============================================================================
// The scenario revision rule, proven on a fixture (SCENARIO_REVISIONS.md)
// -----------------------------------------------------------------------------
// Nothing is corrected and the registry ships empty. The fixture id below is
// registered by each test and removed after it: revision 2 is a different row
// of the same scenario (more planets, a different trail), revision 1 is the row
// the table holds, which is what 3.0 built. Both forms of an earlier revision
// are exercised: retained (its world is rebuilt) and migrated (the corrected
// world opens under a notice).
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const V30 = JSON.parse(
  readFileSync(path.join(ROOT, 'tests/fixtures/scenarioLinks30.json'), 'utf8')
);
const ID = V30.scenario;
const SEED = parseSeed(V30.seed);
const ROW1 = SCENARIO_PRESETS[ID];
const ROW2 = { ...ROW1, num_asteroids: 20, trail_length: 123 };
const REASON = {
  en: 'the second star now weighs what the card says.',
  es: 'la segunda estrella ahora pesa lo que dice la ficha.',
};

/** Register the fixture: revision 2, and revision 1 retained or migrated. */
const register = form => {
  SCENARIO_REVISIONS[ID] = {
    revision: 2,
    rows: { 2: ROW2 },
    earlier: { 1: form === 'retained' ? 'retained' : { migrated: REASON } },
  };
};
afterEach(() => {
  delete SCENARIO_REVISIONS[ID];
  document.querySelector('#revisionNotice')?.remove();
});

let world;
let physics;
beforeAll(async () => {
  // world.js pulls in the renderer, which wants its canvases at import time.
  const find = globalThis.document.getElementById.bind(globalThis.document);
  globalThis.document.getElementById = id => {
    let el = find(id);
    if (!el) {
      el = globalThis.document.createElement(
        /canvas/i.test(id) ? 'canvas' : 'div'
      );
      el.id = id;
      globalThis.document.body.appendChild(el);
    }
    return el;
  };
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
  world = await import('../js/world.js');
  physics = await import('../js/physics.js');
  await import('../js/bodyEffects.js');
});

const clone = o => JSON.parse(JSON.stringify(o));

/** What is built, as the headless digest says it: bodies and settings. */
const worldDigest = () => ({
  rows: LISTS.flatMap(l => physics[l].map((b, i) => bodyRecord(l, i, b))),
  settings: fnv(
    Object.keys(app.SETTINGS)
      .filter(k => k !== 'quality_tier')
      .sort()
      .map(k => `${k}=${JSON.stringify(app.SETTINGS[k])}`)
      .join('\n')
  ),
});
/** The same, from the headless build at a revision. */
const truth = (revision, seed, pending = null) => {
  const d = digest(ID, seed, pending, revision);
  return { rows: d.rows, settings: d.settings };
};
const same = (a, b) => {
  expect(a.rows.length).toBe(b.rows.length);
  expect(a.rows).toEqual(b.rows);
  expect(a.settings).toBe(b.settings);
};
// Not getElementById: this file's stub makes an element for any id.
/** The bodies as a capture carries them (the digest holds fields a restore does not rebuild). */
const bodiesOf = () =>
  world.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  }).b;
const notice = () => document.querySelector('#revisionNotice');
const settle = () => new Promise(r => setTimeout(r, 30));

const link30 = which => decodePayload(V30[which]);
/** A new link, as a producer writes it, read back as text. */
const reread = async payload => decodePayload(await encodePayload(payload));

describe('the registry and the wire form', () => {
  test('an id that is not registered has revision 1 and the row of the table', () => {
    expect(currentRevision(ID)).toBe(1);
    expect(currentRevision('None')).toBe(1);
    expect(rowFor(ID, 1)).toBeUndefined();
    expect(Object.keys(SCENARIO_REVISIONS)).toEqual([]);
  });

  test('the version written is 3 with r from revision 2, and what it was before for every other id', async () => {
    const plain = { v: 2, s: ID, seed: 'abc' };
    expect(linkVersionOf(plain)).toBe(2);
    expect(withRevision(plain, 1)).toBe(plain);
    const stamped = withRevision(plain, 2);
    expect(stamped).toEqual({ v: 3, s: ID, seed: 'abc', r: 2 });
    expect(linkVersionOf(stamped)).toBe(3);
    expect((await encodePayload(plain)).startsWith('2')).toBe(true);
    expect((await encodePayload(stamped)).startsWith('3')).toBe(true);
  });

  test('a version 3 link needs an integer r of 2 or more, and one above the registry is a newer link', async () => {
    register('retained');
    const ok = await reread(withRevision({ v: 2, s: ID, seed: 'abc' }, 2));
    expect(ok.r).toBe(2);
    // No r, a fraction, a 1.
    for (const bad of [undefined, 2.5, 1, 'two'])
      await expect(
        decodePayload(
          await (async () => {
            const { encodeTagged } = await import('../js/shareState.js');
            return encodeTagged('', 3, { v: 3, s: ID, seed: 'abc', r: bad });
          })()
        )
      ).rejects.toThrow(/incomplete|simulation/);
    // r above what the registry knows: the existing newer-version refusal.
    await expect(
      reread(withRevision({ v: 2, s: ID, seed: 'abc' }, 3))
    ).rejects.toThrow('This link was made by a newer version of Gravitas');
    // A version above 3 is refused the same way.
    const { encodeTagged } = await import('../js/shareState.js');
    await expect(
      decodePayload(await encodeTagged('', 4, { v: 4, s: ID, seed: 'abc' }))
    ).rejects.toThrow('newer version');
  });

  test('an r in a version 1 or 2 payload is not a revision', async () => {
    register('retained');
    const { encodeTagged } = await import('../js/shareState.js');
    const text = await encodeTagged('', 2, { v: 2, s: ID, seed: 'abc', r: 2 });
    const p = await decodePayload(text);
    expect(p.r).toBeUndefined();
    expect(resolveRevision(p).revision).toBe(1);
  });

  test('scenario None and an unregistered id never get r', async () => {
    register('retained');
    const none = buildPayload({
      scenario: 'None',
      seed: 1,
      settings: {},
      DEFAULT_SETTINGS: {},
    });
    expect(none.r).toBeUndefined();
    expect(none.v).toBe(2);
    expect(
      payloadFromSetup({ scenario: 'solar-system', seed: 'a' }).r
    ).toBeUndefined();
  });
});

describe('the reader decides by origin, never by v', () => {
  test('a link means the revision it carries: 1 at version 1 or 2', async () => {
    register('retained');
    expect(resolveRevision(await link30('v1'))).toEqual({
      revision: 1,
      notice: null,
    });
    expect(resolveRevision(await link30('v2'))).toEqual({
      revision: 1,
      notice: null,
    });
    const now = await reread(
      withRevision({ v: 2, s: ID, seed: V30.seed }, currentRevision(ID))
    );
    expect(resolveRevision(now).revision).toBe(2);
  });

  test('the same setup, named in code, means the current revision; a version 1 payload of it from text means 1', async () => {
    register('retained');
    const inCode = payloadFromSetup({ scenario: ID, seed: V30.seed });
    expect(inCode.v).toBe(3);
    expect(resolveRevision(inCode).revision).toBe(2);
    const text = await link30('v1');
    expect(text.v).toBe(1);
    expect(resolveRevision(text).revision).toBe(1);
    // A setup payload as such, with no stamp, is still the current revision.
    expect(resolveRevision({ v: 1, s: ID, seed: 'a' }, 'setup').revision).toBe(
      2
    );
  });

  test('stored text can never be a setup', async () => {
    register('retained');
    const text = await link30('v2');
    // Asked to read decoded text as a setup, it is read as the text it is.
    expect(resolveRevision(text, 'setup').revision).toBe(1);
    // An unmarked plain object is the caller's word; text is marked.
    expect(resolveRevision({ v: 1, s: ID, seed: 'a' }, 'setup').revision).toBe(
      2
    );
    const marked = markOrigin({ v: 1, s: ID, seed: 'a' }, 'link');
    expect(resolveRevision(marked, 'setup').revision).toBe(1);
  });

  test('an imported declaration means the revision it states, and 1 if it states none', async () => {
    register('retained');
    expect(
      resolveRevision(payloadFromSetup({ scenario: ID, revision: 1 })).revision
    ).toBe(1);
    expect(
      resolveRevision(payloadFromSetup({ scenario: ID, revision: 2 })).revision
    ).toBe(2);
    // A built-in lesson states none and means the current one.
    expect(resolveRevision(payloadFromSetup({ scenario: ID })).revision).toBe(
      2
    );
    // A pack naming the id, a course item and a Studio pack, likewise.
    const pack = { id: 'p', version: '1.0.0', seed: 5, scenario: ID };
    expect(resolveRevision(compileScenarioPack(pack)).revision).toBe(1);
    expect(
      resolveRevision(compileScenarioPack({ ...pack, scenarioRevision: 2 }))
        .revision
    ).toBe(2);
  });

  test('a newer revision than the registry holds is refused whole, from any origin', () => {
    register('retained');
    for (const origin of ['link', 'capture'])
      expect(() =>
        resolveRevision({ v: 3, s: ID, seed: 'a', r: 3 }, origin)
      ).toThrow('newer version');
  });
});

describe('retained: the old world is rebuilt', () => {
  beforeEach(() => register('retained'));

  test.each([
    ['version 1', 'v1', null],
    ['version 2', 'v2', V30.v2Delta],
  ])(
    'the 3.0 link of %s rebuilds the 3.0 digest, with no notice',
    async (_, which, pending) => {
      const payload = await link30(which);
      const result = world.applyShareState(payload);
      expect(result.revision).toBe(1);
      expect(app.current_scenario_revision).toBe(1);
      expect(app.current_scenario_name).toBe(ID);
      same(worldDigest(), truth(1, payloadSeed(payload), pending));
      expect(app.SETTINGS.trail_length).toBe(ROW1.trail_length);
      await settle();
      expect(notice()).toBeNull();
    }
  );

  test('the current revision builds the corrected world', () => {
    const payload = payloadFromSetup({ scenario: ID, seed: V30.seed });
    const result = world.applyShareState(payload);
    expect(result.revision).toBe(2);
    expect(app.current_scenario_revision).toBe(2);
    expect(app.SETTINGS.trail_length).toBe(123);
    const seed = payloadSeed(payload);
    same(worldDigest(), truth(2, seed));
    // The fixture really differs from revision 1, so the test can tell them apart.
    expect(truth(2, seed).rows).not.toEqual(truth(1, seed).rows);
    expect(truth(2, seed).rows.length).toBe(truth(1, seed).rows.length + 5);
  });

  test('a new link round-trips r', async () => {
    const payload = payloadFromSetup({ scenario: ID, seed: V30.seed });
    const text = await encodePayload(payload);
    expect(text.startsWith('3')).toBe(true);
    const back = await decodePayload(text);
    expect(back.r).toBe(2);
    expect(world.applyShareState(back).revision).toBe(2);
    same(worldDigest(), truth(2, payloadSeed(back)));
  });

  test('a link made from the world is 3 with r at revision 2, and 2 without r at revision 1', async () => {
    world.applyShareState(payloadFromSetup({ scenario: ID, seed: V30.seed }));
    const now = world.captureShareState({ kind: 'seeded' });
    expect(now).toMatchObject({ v: 3, r: 2 });
    expect((await encodePayload(now)).startsWith('3')).toBe(true);
    world.applyShareState(await link30('v2'));
    const old = world.captureShareState({ kind: 'seeded' });
    expect(old.r).toBeUndefined();
    expect(old.v).toBe(2);
    expect((await encodePayload(old)).startsWith('2')).toBe(true);
  });

  test('a rebuild with the same seed keeps the world, a plain rebuild is the current one', () => {
    world.applyShareState(link30Sync('v1'));
    expect(app.current_scenario_revision).toBe(1);
    world.initialize_simulation({ keepSeed: true });
    expect(app.current_scenario_revision).toBe(1);
    expect(app.SETTINGS.trail_length).toBe(ROW1.trail_length);
    world.initialize_simulation();
    expect(app.current_scenario_revision).toBe(2);
  });
});

/** A version 1 link, read without waiting (it is uncompressed). */
const link30Sync = which => {
  const text = V30[which];
  if (!text.startsWith('1r')) throw new Error('only the raw link');
  const payload = JSON.parse(
    Buffer.from(text.slice(2), 'base64url').toString('utf8')
  );
  return markOrigin(payload, 'link');
};

describe('migrated: the corrected world opens under a notice', () => {
  beforeEach(() => register('migrated'));

  test.each([
    ['version 1', 'v1', null],
    ['version 2', 'v2', V30.v2Delta],
  ])(
    'the 3.0 link of %s opens the current digest and says why',
    async (_, which, pending) => {
      const payload = await link30(which);
      const result = world.applyShareState(payload);
      expect(result.revision).toBe(2);
      expect(result.notice).toEqual(REASON);
      same(worldDigest(), truth(2, payloadSeed(payload), pending));
      await settle();
      const el = notice();
      expect(el).not.toBeNull();
      expect(el.textContent).toContain(
        'This link was made for an earlier version of this scenario. It now opens the corrected one:'
      );
      expect(el.textContent).toContain(REASON.en);
    }
  );

  test('the notice is announced, in the reader’s language, and stays until dismissed', async () => {
    const { showRevisionNotice, NOTICE_ID } =
      await import('../js/scenarioNotice.js');
    const { setLocale } = await import('../js/i18n/index.js');
    const el = showRevisionNotice(REASON);
    expect(el.id).toBe(NOTICE_ID);
    expect(el.getAttribute('role')).toBe('status');
    expect(document.getElementById('srStatus').textContent).toContain(
      REASON.en
    );
    // No timer takes it away.
    await new Promise(r => setTimeout(r, 2600));
    expect(notice()).toBe(el);
    // Dismissed by its button, which is reachable and named.
    const button = el.querySelector('button');
    expect(button.textContent).toBe('Dismiss');
    button.click();
    expect(notice()).toBeNull();
    // The Spanish words, with the Spanish reason.
    await setLocale('es', { persist: false });
    const es = showRevisionNotice(REASON);
    expect(es.textContent).toContain('Este enlace se hizo para una versión');
    expect(es.textContent).toContain(REASON.es);
    expect(es.querySelector('button').textContent).toBe('Cerrar');
    await setLocale('en', { persist: false });
  });

  test('a capture made before the correction is migrated too, never read against the current row silently', async () => {
    const stale = clone(await link30('v2'));
    stale.b = []; // an unstamped capture holds no more than an old link says
    const result = world.applyShareState(stale, 'capture');
    expect(result.notice).toEqual(REASON);
    expect(app.current_scenario_revision).toBe(2);
  });

  test('a current link and a setup show no notice', async () => {
    world.applyShareState(payloadFromSetup({ scenario: ID, seed: V30.seed }));
    await settle();
    expect(notice()).toBeNull();
    const text = await reread(withRevision({ v: 2, s: ID, seed: V30.seed }, 2));
    expect(world.applyShareState(text).notice).toBeNull();
  });
});

describe('a capture means the revision of the world it was made from', () => {
  test('a retained revision 1 world entered into a lesson and restored, or saved, exported, imported and restored by the bench, comes back equal', () => {
    register('retained');
    world.applyShareState(link30Sync('v1'));
    app.SETTINGS.trail_length = 222; // a hand change after the build
    const before = { settings: clone(app.SETTINGS), bodies: bodiesOf() };
    // The lesson's entry capture, and the bench's: full, with ids, cloned and stored.
    const entry = world.captureShareState({
      kind: 'full',
      includeCamera: true,
      forExperiment: true,
    });
    expect(entry.r).toBeUndefined();
    const stored = JSON.parse(JSON.stringify(entry));
    // Something else happens: a lesson scene of the current revision.
    world.applyShareState(payloadFromSetup({ scenario: ID, seed: 'other' }));
    expect(app.current_scenario_revision).toBe(2);
    world.applyShareState(stored, 'capture');
    expect(app.current_scenario_revision).toBe(1);
    expect(bodiesOf()).toEqual(before.bodies);
    expect(app.SETTINGS.trail_length).toBe(222);
    for (const k of Object.keys(before.settings))
      if (!['preset_scenario'].includes(k))
        expect({ k, v: app.SETTINGS[k] }).toEqual({
          k,
          v: before.settings[k],
        });
  });

  test.each(['retained', 'migrated'])(
    'a revision 2 world captured for a record is stamped, full, and writes every setting (%s)',
    form => {
      register(form);
      world.applyShareState(
        payloadFromSetup({
          scenario: ID,
          seed: V30.seed,
          settings: { sim_speed: 9 },
        })
      );
      const seeded = world.captureShareState({ kind: 'seeded' });
      expect(seeded).toMatchObject({ v: 3, r: 2 });
      expect(seeded.b).toBeUndefined();
      const record = world.captureShareState({
        kind: 'seeded',
        forExperiment: true,
      });
      // Always full for a record: no older build regenerates it.
      expect(record).toMatchObject({ v: 3, r: 2 });
      expect(record.b.length).toBeGreaterThan(0);
      // Every setting travels: an old reader's row cannot change one.
      const { d } = record;
      for (const k of Object.keys(app.SETTINGS))
        if (!['preset_scenario', 'quality_tier'].includes(k))
          expect(d).toHaveProperty(k);
      expect(d.trail_length).toBe(123);
      expect(d.sim_speed).toBe(9);
      // And it comes back equal under the current build.
      const settings = clone(app.SETTINGS);
      const bodies = bodiesOf();
      world.applyShareState(payloadFromSetup({ scenario: ID, seed: 'other' }));
      world.applyShareState(JSON.parse(JSON.stringify(record)), 'capture');
      expect(app.current_scenario_revision).toBe(2);
      expect(bodiesOf()).toEqual(bodies);
      for (const k of Object.keys(settings))
        if (k !== 'preset_scenario')
          expect({ k, v: app.SETTINGS[k] }).toEqual({ k, v: settings[k] });
    }
  );

  test('a record of a revision 1 world keeps its bytes (d is the delta from the row, no stamp)', () => {
    register('retained');
    world.applyShareState(link30Sync('v1'));
    const record = world.captureShareState({
      kind: 'full',
      forExperiment: true,
    });
    expect(record.v).toBe(2);
    expect(record.r).toBeUndefined();
    expect(Object.keys(record.d ?? {}).length).toBeLessThan(5);
  });
});

describe('the writers of item 3: a link newly made carries the revision its origin means', () => {
  beforeEach(() => register('retained'));

  test('a course scenario item states a revision, or means 1', async () => {
    const item = { kind: 'scenario', scenario: ID, seed: V30.seed };
    const root = 'https://example.test/';
    const hashOf = async it =>
      (await itemLink(it, { root })).href.slice(root.length + 1);
    const none = await decodePayload(await hashOf(item));
    expect(resolveRevision(none).revision).toBe(1);
    expect(await hashOf(item)).toMatch(/^2/);
    const said = await decodePayload(await hashOf({ ...item, revision: 2 }));
    expect(said.r).toBe(2);
    expect(await hashOf({ ...item, revision: 2 })).toMatch(/^3/);
  });

  test('a scenario chosen on the figure builder is the current revision; a pasted link keeps the one it carried', async () => {
    // The two operations js/figureBuilder.js readState and update perform.
    const chosen = buildPayload({
      scenario: ID,
      seed: SEED,
      settings: {},
      DEFAULT_SETTINGS: {},
    });
    expect(chosen).toMatchObject({ v: 3, r: 2 });
    expect((await encodePayload(chosen)).startsWith('3')).toBe(true);
    for (const which of ['v1', 'v2']) {
      const pasted = await link30(which);
      const again = await encodePayload({ ...pasted, p: 1 });
      expect(again.startsWith('2')).toBe(true);
      expect(resolveRevision(await decodePayload(again)).revision).toBe(1);
    }
    const v3 = await reread(chosen);
    const again = await encodePayload({ ...v3, p: 1 });
    expect(again.startsWith('3')).toBe(true);
    expect((await decodePayload(again)).r).toBe(2);
  });

  test('the Studio pack link and the System Builder: a pack naming the id states its revision, scenario None has none', async () => {
    const pack = { id: 'p', version: '1.0.0', seed: 7, scenario: ID };
    expect(compileScenarioPack(pack).r).toBeUndefined();
    expect(compileScenarioPack({ ...pack, scenarioRevision: 2 })).toMatchObject(
      { v: 3, r: 2 }
    );
    const own = compileScenarioPack({ id: 'p', version: '1.0.0', seed: 7 });
    expect(own.s).toBe('None');
    expect(own.r).toBeUndefined();
    expect((await encodePayload(own)).startsWith('2')).toBe(true);
  });

  test('a setup a file states is a declaration; the Composer and the course builder write the revision only from 2', () => {
    expect(setupFor(ID, { seed: 'a', revision: 9 })).toEqual({
      seed: 'a',
      scenario: ID,
      revision: 2,
    });
    expect(setupFor('solar-system', { seed: 'a', revision: 2 })).toEqual({
      seed: 'a',
      scenario: 'solar-system',
    });
  });

  test('the build tools write the prefix the registry selects, with no browser', async () => {
    const { rawWorldLink } = await import('../tools/build-library.mjs');
    const made = rawWorldLink({ v: 1, s: ID, seed: 'library' });
    expect(made.startsWith('3r')).toBe(true);
    const back = await decodePayload(made);
    expect(back).toMatchObject({ v: 3, r: 2, s: ID });
    delete SCENARIO_REVISIONS[ID];
    expect(
      rawWorldLink({ v: 1, s: ID, seed: 'library' }).startsWith('1r')
    ).toBe(true);
  });
});

describe('the generated pages differ from the base only in the links of the ids registered', () => {
  // The fixture, and the scenario the teaching pages embed most (a registry
  // entry alone: nothing is built from it here).
  const IDS = new Set([ID, 'solar-system']);
  /** The world links in a text: [fragment, payload] with a raw (r) body. */
  const linksIn = text =>
    [...text.matchAll(/#([123]r[A-Za-z0-9_-]+)/g)].map(m => m[1]);
  const payloadOf = frag =>
    JSON.parse(Buffer.from(frag.slice(2), 'base64url').toString('utf8'));

  /** Every differing line of two texts holds only links of ID that differ. */
  const onlyIdLinksDiffer = (a, b) => {
    const A = a.split('\n');
    const B = b.split('\n');
    expect(B.length).toBe(A.length);
    let differing = 0;
    A.forEach((line, i) => {
      if (line === B[i]) return;
      differing++;
      const la = linksIn(line);
      const lb = linksIn(B[i]);
      expect(la.length).toBeGreaterThan(0);
      expect(la.length).toBe(lb.length);
      la.forEach((f, j) => {
        if (f === lb[j]) return;
        expect(IDS.has(payloadOf(f).s)).toBe(true);
        expect(payloadOf(lb[j])).toMatchObject({ v: 3, r: 2 });
      });
      // The line is otherwise the same text.
      let masked = line;
      la.forEach((f, j) => (masked = masked.replace(f, lb[j])));
      expect(masked).toBe(B[i]);
    });
    return differing;
  };

  test('the Library, the teaching pages and the demos', async () => {
    const { buildLibrary, renderJson } =
      await import('../tools/build-library.mjs');
    const { buildAdoption } = await import('../tools/build-adoption-pages.mjs');
    const demos = await import('../tools/build-teaching-demos.mjs');
    const make = async () => ({
      library: renderJson(await buildLibrary()),
      adoption: await buildAdoption(),
      demos: await demos.fragments(),
    });
    const base = await make();
    register('retained');
    SCENARIO_REVISIONS['solar-system'] = {
      revision: 2,
      earlier: { 1: 'retained' },
    };
    const revised = await make();
    delete SCENARIO_REVISIONS['solar-system'];
    delete SCENARIO_REVISIONS[ID];

    // The Library: the cards of the two scenarios, and nothing else.
    expect(onlyIdLinksDiffer(base.library, revised.library)).toBe(2);

    // The teaching pages: every page that differs differs in links of ID only
    // (an embed on a page of an investigation that uses the scenario).
    expect(revised.adoption.pages.map(p => p.file)).toEqual(
      base.adoption.pages.map(p => p.file)
    );
    let changed = 0;
    base.adoption.pages.forEach((page, i) => {
      const other = revised.adoption.pages[i];
      if (page.html === other.html) return;
      changed += 1;
      expect(onlyIdLinksDiffer(page.html, other.html)).toBeGreaterThan(0);
    });
    expect(changed).toBeGreaterThan(0);

    // The demos: a demonstration of another scenario is the same payload.
    expect(Object.keys(revised.demos)).toEqual(Object.keys(base.demos));
    for (const id of Object.keys(base.demos)) {
      const a = await decodePayload(base.demos[id]);
      const b = await decodePayload(revised.demos[id]);
      if (IDS.has(a.s)) expect(b).toMatchObject({ v: 3, r: 2 });
      else expect(b).toEqual(a);
    }
  }, 120_000);
});

// The shipped ids: every producer's link is what the base wrote.
describe('all 61 shipped ids and scenario None, from every producer, are byte-identical to the base', () => {
  const GOLD = JSON.parse(
    readFileSync(
      path.join(ROOT, 'tests/fixtures/scenarioLinksBase.json'),
      'utf8'
    )
  );
  let ids;
  let pack;
  let links;
  let lib;
  let rng;
  beforeAll(async () => {
    ({ SCENARIO_IDS: ids } = await import('../js/scenarios.js'));
    ids = [...ids, 'None'];
    pack = await import('../js/scenarioPack.js');
    links = await import('../js/course/links.js');
    lib = await import('../tools/build-library.mjs');
    rng = await import('../js/rng.js');
  });
  const sha = async text => {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
  };
  const prefixOf = f => /^(\d+)[zr]/.exec(f)[1];
  const seen = {};
  const rec = async (producer, id, payload) => {
    const frag = await encodePayload(payload);
    (seen[producer] ??= {})[id] = {
      v: prefixOf(frag),
      json: await sha(JSON.stringify(payload)),
    };
  };

  test('the registry is empty and the producers write what they wrote', async () => {
    expect(Object.keys(SCENARIO_REVISIONS)).toEqual([]);
    for (const id of ids) {
      const seed = rng.parseSeed('orbit-1');
      const settings = pristineSettingsFor(id, app.DEFAULT_SETTINGS);
      await rec(
        'dialog',
        id,
        buildPayload({
          scenario: id,
          seed,
          settings,
          generationSettings: settings,
          DEFAULT_SETTINGS: app.DEFAULT_SETTINGS,
          camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
          paused: false,
        })
      );
      await rec(
        'dialogChanged',
        id,
        buildPayload({
          scenario: id,
          seed,
          settings: { ...settings, trail_length: 77 },
          generationSettings: settings,
          DEFAULT_SETTINGS: app.DEFAULT_SETTINGS,
          paused: true,
        })
      );
      await rec(
        'lessonSetup',
        id,
        payloadFromSetup({
          scenario: id,
          seed: 'kepler-3',
          settings: { sim_speed: 2 },
          camera: { zoom: 2 },
          paused: true,
        })
      );
      await rec('lessonSetupPlain', id, payloadFromSetup({ scenario: id }));
      await rec(
        'course',
        id,
        links.scenarioPayload({
          kind: 'scenario',
          scenario: id,
          seed: 'orbit-1',
          paused: true,
        })
      );
      const demo = buildPayload({
        scenario: id,
        seed,
        settings: {},
        DEFAULT_SETTINGS: app.DEFAULT_SETTINGS,
        paused: true,
      });
      demo.d = { sim_speed: 3 };
      await rec('demo', id, demo);
      await rec(
        'figureChosen',
        id,
        buildPayload({
          scenario: id,
          seed,
          settings: {},
          DEFAULT_SETTINGS: {},
        })
      );
      const pasted = await decodePayload(
        await encodePayload(payloadFromSetup({ scenario: id, seed: 'orbit-1' }))
      );
      await rec('figurePasted', id, { ...pasted, p: 1 });
      await rec(
        'pack',
        id,
        pack.compileScenarioPack({
          id: 'p',
          version: '1.0.0',
          seed: 7,
          ...(id === 'None' ? {} : { scenario: id }),
          settings: { sim_speed: 2 },
        })
      );
      (seen.raw ??= {})[id] = lib.rawWorldLink({
        v: 1,
        s: id,
        seed: 'library',
      });
    }
    for (const producer of Object.keys(seen))
      expect({ producer, links: seen[producer] }).toEqual({
        producer,
        links: GOLD[producer],
      });
    // Nothing the golden holds was left unchecked.
    expect(Object.keys(seen).sort()).toEqual(
      Object.keys(GOLD)
        .filter(k => !['generatedFrom', 'note'].includes(k))
        .sort()
    );
  }, 120_000);
});
