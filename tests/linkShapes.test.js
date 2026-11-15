// =============================================================================
// Every kind of link a student can be handed, against the front door
// -----------------------------------------------------------------------------
// js/welcomeGate.js decides whether the introduction opens, and it keeps its own
// patterns because it runs before the loader and the share code are needed. A
// copy drifts: it once knew only world and lesson links, so a first-time
// student on an assignment, an activity or a pack link got the introduction
// over the lesson. This runs a table of real hashes of every shape through the
// loader's and share.js's predicates and through the gate and requires one
// answer from all of them.
// =============================================================================

import { beforeAll, describe, expect, test } from '@jest/globals';
import { hasDeepLinkDestination, shouldShowWelcome } from '../js/welcome.js';
import {
  activityInHash,
  assignmentInHash,
  lessonInHash,
  packInHash,
} from '../js/investigationsLoader.js';
import { hasSharedLink } from '../js/share.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { buildAssignment } from '../js/assignments/assignment.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packLink } from '../js/composer/packLink.js';

/** The answer of every predicate the loader and share.js keep, for one hash. */
function predicates(hash) {
  window.location.hash = hash;
  return {
    lesson: lessonInHash(),
    assignment: assignmentInHash(),
    pack: packInHash(),
    activity: activityInHash(),
    world: hasSharedLink(),
  };
}

const fragmentOf = url => url.slice(url.indexOf('#'));

describe('the gate agrees with the link predicates', () => {
  let real;

  beforeAll(async () => {
    const lesson = await loadInvestigation('keplers-laws');
    const chosen = lesson.steps
      .filter(s => !s.setup && Array.isArray(s.options))
      .slice(0, 1)
      .map(s => s.sid);
    const made = buildAssignment({
      lesson,
      chosen,
      title: 'Week 3',
      fingerprint: stepFingerprint,
    });
    const assignment = fragmentOf((await assignmentLink(made)).url);
    const remix = await remixBuiltin('keplers-laws', { id: 'my-kepler' });
    const pack = fragmentOf(
      (
        await packLink(remix.pack, {
          root: 'https://example.test/',
          base: remix.pack,
        })
      ).url
    );
    real = { assignment, pack };
  });

  test('a real assignment and a real pack link carry the expected tags', () => {
    expect(real.assignment).toMatch(/^#a\d+[zr]./);
    expect(real.pack).toMatch(/^#i\d+[zr]./);
  });

  /** One table: every shape the product writes or a student can paste. */
  const shapes = () => [
    '#1zeJyrVkrLz1eyUkrOSC0uUUgtSc7PLShKLS7JzM9TqgUAY_MJ8Q',
    '#7rAAAA',
    '#investigation=goldilocks-question',
    '#investigation=keplers-laws/quantitative',
    '#investigations',
    '#activity=orbital-speed',
    '#activity=orbital-speed/guided',
    '#ACTIVITY=orbital-speed/Guided',
    real.assignment,
    '#a1rAAAA',
    '#a12zeJyrVkrL',
    real.pack,
    '#i1rAAAA',
    '#i3zeJyrVkrL',
    // Not destinations.
    '',
    '#',
    '#top',
    '#home',
    '#mainControls',
    '#investigation=',
    '#investigationsx',
    '#activity=',
    '#activity=a/b/c',
    '#a',
    '#az',
    '#a1',
    '#i1',
    '#ab1z',
  ];

  test('the gate answers as the predicates do, hash by hash', () => {
    for (const hash of shapes()) {
      const p = predicates(hash);
      // `#investigations` is the shell's chooser: the gate honours it and the
      // lesson predicate rightly does not.
      const expected =
        p.lesson ||
        p.assignment ||
        p.pack ||
        p.activity ||
        p.world ||
        hash === '#investigations';
      expect([hash.slice(0, 24), hasDeepLinkDestination(hash)]).toEqual([
        hash.slice(0, 24),
        expected,
      ]);
    }
  });

  test('a first-time student on any of them is not shown the introduction', () => {
    for (const hash of shapes()) {
      if (!hasDeepLinkDestination(hash)) continue;
      expect(shouldShowWelcome({ hash, seen: false, week: false })).toBe(false);
      expect(shouldShowWelcome({ hash, seen: true, week: true })).toBe(false);
    }
  });

  test('a plain visit still gets it', () => {
    for (const hash of ['', '#', '#top', '#home', '#a1']) {
      expect(shouldShowWelcome({ hash, seen: false })).toBe(true);
    }
  });
});
