// =============================================================================
// A link whose investigation cannot be opened says why, in words, and offers
// only a way on that works
// -----------------------------------------------------------------------------
// openInvestigation answers { ok: false, reason: 'noLesson' } when the
// investigation cannot be loaded. Each bridge turns that into the catalog's
// sentence (never the token) and does not offer "open the investigation on its
// own" for an investigation that did not load. A reason the catalog has no
// sentence for reads as a damaged link, and logs nothing.
// =============================================================================

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { buildAssignment } from '../js/assignments/assignment.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packLink } from '../js/composer/packLink.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { ENTITIES } from '../js/lessonMarkup.js';
import { UNITS } from '../js/answerParse.js';

const shown = [];
let reason = 'noLesson';
jest.unstable_mockModule('../js/notify.js', () => ({
  toast: () => {},
  announce: () => {},
  loadFailed: () => {},
  refuseLink: what => shown.push(what),
}));
jest.unstable_mockModule('../js/investigations.js', () => ({
  packFacts: async () => ({
    provideLessonLoaders: () => {},
    loadInvestigation,
    ENTITIES,
    UNITS,
    scenarios: Object.keys(SCENARIO_INFO),
    scenarioId,
    lessons: MANIFEST.map(m => m.id),
    openInvestigation: async () => ({ ok: false, reason }),
  }),
  openInvestigation: async () => ({ ok: false, reason }),
  activeAssignmentBinding: () => null,
  activeAssignment: () => null,
}));
const { openAssignmentFromUrl } =
  await import('../js/assignments/assignmentBridge.js');
const { openPackFromUrl } = await import('../js/remix/open.js');
const { openActivityFromUrl } =
  await import('../js/activities/activityBridge.js');

let link;
beforeAll(async () => {
  const lesson = await loadInvestigation('keplers-laws');
  const chosen = lesson.steps
    .filter(s => !s.setup && Array.isArray(s.options))
    .slice(0, 2)
    .map(s => s.sid);
  const made = buildAssignment({
    lesson,
    chosen,
    title: 'Week 3',
    fingerprint: stepFingerprint,
  });
  const url = (await assignmentLink(made)).url;
  link = url.slice(url.indexOf('#'));
});

beforeEach(() => {
  shown.length = 0;
  reason = 'noLesson';
});

describe('an assignment whose investigation did not load', () => {
  test("says so in the catalog's words and offers no button for an investigation that is not there", async () => {
    location.hash = link;
    expect(await openAssignmentFromUrl()).toBe(false);
    expect(shown).toHaveLength(1);
    expect(shown[0].why).toBe('That investigation could not be read.');
    expect(shown[0].lesson).toBeNull();
    expect(shown[0].who).toBe('sender');
  });

  test('a reason the catalog has no sentence for reads as a damaged link, silently', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    reason = 'someSentenceTheDecoderMadeUp';
    location.hash = link;
    await openAssignmentFromUrl();
    expect(shown[0].why).not.toMatch(/assign\.error|someSentence/);
    expect(shown[0].who).toBe('you');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test('one that has run out of steps can still be opened on its own', async () => {
    reason = 'noStepsLeft';
    location.hash = link;
    await openAssignmentFromUrl();
    expect(shown[0].lesson).toBe('keplers-laws');
  });
});

describe('an activity whose investigation did not load', () => {
  test('says so in words and offers no way to open it on its own', async () => {
    location.hash = '#activity=orbital-speed/guided';
    await openActivityFromUrl();
    expect(shown).toHaveLength(1);
    expect(shown[0].why).toBe('That investigation could not be read.');
    expect(shown[0].lesson).toBeNull();
  });
});

describe('a pack whose investigation did not load', () => {
  test("says so in the catalog's words, not the reason token", async () => {
    // A link that carries only what changed from its original (a whole
    // pack is more than a link can hold).
    const core = await import('../js/composer/remixCore.js');
    const { withDepth } = await import('../js/investigations/depth.js');
    const original = await core.originalWith('tides', {
      loadInvestigation,
      withDepth,
    });
    const base = await core.remixOf(original, 'tides', { id: 'base' });
    const { pack } = await remixBuiltin('tides', { id: 'my-tides-pack' });
    pack.steps[1].title = { en: 'Changed title', es: 'Título cambiado' };
    const made = await packLink(pack, { root: 'http://x/', base: base.pack });
    location.hash = `#${made.fragment}`;
    expect(await openPackFromUrl()).toBe(false);
    expect(shown).toHaveLength(1);
    expect(shown[0].why).toBe('That investigation could not be read.');
    expect(shown[0].why).not.toMatch(/noLesson/);
  }, 60_000);
});
