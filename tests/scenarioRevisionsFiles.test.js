import { afterEach, describe, expect, test } from '@jest/globals';

import { SCENARIO_REVISIONS, payloadFromSetup } from '../js/shareState.js';
import { checkPack } from '../js/scenarioPack.js';
import { checkInvestigationPack } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { courseApi } from '../js/course/api.js';
import { validateCoursePack } from '../js/course/pack.js';
import { newCourseItem, setWorld } from '../js/course/manifest.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';

// =============================================================================
// The three files that can name a scenario from outside the build
// -----------------------------------------------------------------------------
// A scenario pack, an investigation pack's step setup and a course pack's
// scenario item state the revision they mean, in a key written only for an id at
// revision 2 or more (SCENARIO_REVISIONS.md). A file that states none means
// revision 1, and an older build refuses the key (tests/compat/scenarioRevisions).
// =============================================================================

const ID = 'binary-pair';
const clone = o => JSON.parse(JSON.stringify(o));
const register = () => {
  SCENARIO_REVISIONS[ID] = { revision: 2, earlier: { 1: 'retained' } };
};
afterEach(() => delete SCENARIO_REVISIONS[ID]);

const scenarioPack = extra => ({
  format: 'gravitas.scenario-pack',
  formatVersion: 1,
  id: 'rv-pack',
  version: '1.0.0',
  locales: ['en'],
  title: { en: 'A revision' },
  summary: { en: 'A scenario at a revision.' },
  tags: [],
  seed: 7,
  scenario: ID,
  settings: {},
  ...extra,
});

describe('a scenario pack', () => {
  test('states the revision of the built-in it names, 2 or more', () => {
    expect(checkPack(scenarioPack())).toEqual([]);
    expect(checkPack(scenarioPack({ scenarioRevision: 2 }))).toEqual([]);
    for (const bad of [1, 2.5, '2'])
      expect(
        checkPack(scenarioPack({ scenarioRevision: bad })).map(p => p.code)
      ).toContain('scenarioRevision');
  });

  test('has none to state without a built-in to be a revision of', () => {
    const own = scenarioPack({ scenarioRevision: 2 });
    delete own.scenario;
    expect(checkPack(own).map(p => p.code)).toContain('scenarioRevision');
  });
});

describe('an investigation pack', () => {
  const withRevision = revision => {
    const pack = clone(EXAMPLE_INVESTIGATION);
    pack.steps[0].setup = { ...pack.steps[0].setup, revision };
    return pack;
  };

  test('compiles its setups as declarations: the revision they state, 1 if none', async () => {
    const plain = await checkInvestigationPack(clone(EXAMPLE_INVESTIGATION));
    expect(plain.errors).toEqual([]);
    const setup = plain.compiled.lesson.steps[0].setup;
    expect(setup).toMatchObject({ scenario: 'solar-system', revision: 1 });
    // The compiled setup is read as the text it came from, not as this build's own.
    expect(payloadFromSetup(setup).v).toBe(1);

    const said = await checkInvestigationPack(withRevision(2));
    expect(said.errors).toEqual([]);
    expect(said.compiled.lesson.steps[0].setup.revision).toBe(2);
    // The authoring rules take it too: a finding about it would fail a pack.
    expect(
      said.findings.filter(f => /revision|setup/i.test(f.code ?? ''))
    ).toEqual([]);
  });

  test('refuses a revision that is not 2 or more', async () => {
    for (const bad of [1, 2.5, '2'])
      expect(
        (await checkInvestigationPack(withRevision(bad))).errors.length
      ).toBeGreaterThan(0);
  });
});

describe('a course pack scenario item', () => {
  const item = pack =>
    pack.units.flatMap(u => u.items).find(i => i.kind === 'scenario');
  const problems = pack =>
    validateCoursePack(pack, courseApi()).map(p => `${p.path} ${p.code}`);

  test('states the revision, 2 or more', () => {
    const pack = clone(INTRO_ASTRONOMY);
    expect(problems(pack)).toEqual([]);
    item(pack).revision = 2;
    expect(problems(pack)).toEqual([]);
    item(pack).revision = 1;
    expect(problems(pack).join('; ')).toMatch(/revision/);
  });

  test('the builder writes the revision only for an id at revision 2 or more', () => {
    const d = { freshId: x => x, lesson: 'tides', today: '2026-11-23' };
    d.scenarioTitle = id => id;
    expect(newCourseItem('scenario', d).revision).toBeUndefined();
    SCENARIO_REVISIONS['solar-system'] = {
      revision: 2,
      earlier: { 1: 'retained' },
    };
    try {
      expect(newCourseItem('scenario', d).revision).toBe(2);
    } finally {
      delete SCENARIO_REVISIONS['solar-system'];
    }
    // Choosing another scenario drops the key, and choosing a corrected one adds it.
    register();
    const it = { kind: 'scenario', scenario: 'solar-system', revision: 9 };
    setWorld(it, 'transit-lab', 'Transit');
    expect(it.revision).toBeUndefined();
    setWorld(it, ID, 'Pair');
    expect(it).toMatchObject({ scenario: ID, revision: 2 });
  });
});
