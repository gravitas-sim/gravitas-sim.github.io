// =============================================================================
// Classroom activities
// -----------------------------------------------------------------------------
// An activity is a teaching format pointing at steps that already exist. Almost
// everything that could go wrong with that is a question about references -
// does the step exist, does it still mean what it meant, does the format still
// make sense once the resolver has added what it needs - and all of it can be
// answered without a browser.
//
// What is deliberately NOT tested here is the assignment machinery itself:
// resolveSelection, the progress namespace and the fingerprints have their own
// tests. What is tested is that activities use them, and use them correctly.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  ACTIVITIES,
  activityById,
  formatById,
  allFormats,
} from '../js/data/activities.js';
import {
  assignmentForFormat,
  resolvedSteps,
  routeFor,
  routeTo,
  LAUNCH,
} from '../js/activities/activities.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { EN_TEACHING } from '../js/i18n/en.teaching.js';
import { ES_TEACHING } from '../js/i18n/es.teaching.js';

const lessonFor = activity =>
  INVESTIGATIONS.find(l => l.id === activity.lesson);

describe('the catalog is honest about what it offers', () => {
  test('every activity has at least one format and no duplicate ids', () => {
    // This used to pin the number at one, on the reasoning that a card saying
    // "coming soon" is worse than no card. That reasoning is still right and
    // the assertion was the wrong shape for it: a count has to be edited every
    // time the catalog grows, which makes it a chore rather than a check.
    // What actually matters is that nothing here is a stub.
    expect(ACTIVITIES.length).toBeGreaterThan(0);
    const activityIds = new Set();
    const assignmentIds = new Set();
    for (const activity of ACTIVITIES) {
      expect(activityIds.has(activity.id)).toBe(false);
      activityIds.add(activity.id);
      expect(activity.formats.length).toBeGreaterThan(0);
      const formatIds = new Set();
      for (const format of activity.formats) {
        expect(formatIds.has(format.id)).toBe(false);
        formatIds.add(format.id);
        // Two formats sharing an assignment id would share one progress
        // namespace and mark each other complete.
        expect(assignmentIds.has(format.assignmentId)).toBe(false);
        assignmentIds.add(format.assignmentId);
      }
    }
  });

  test('the short routes are the three the showcase page offers', () => {
    // Named rather than counted: /teaching/ promises three short routes and
    // this is the list it promises them from.
    const routes = ACTIVITIES.filter(a =>
      a.formats.some(f => f.id === 'route')
    ).map(a => a.id);
    expect(routes.sort()).toEqual(
      ['binary-planets', 'orbital-speed', 'star-sizes'].sort()
    );
    for (const activity of ACTIVITIES) {
      const route = activity.formats.find(f => f.id === 'route');
      if (!route) continue;
      // Three to five minutes is what the page says a route takes.
      expect(route.minutes).toBeGreaterThanOrEqual(3);
      expect(route.minutes).toBeLessThanOrEqual(5);
    }
  });

  test('it reuses a real investigation, and a real scenario where it names one', () => {
    for (const activity of ACTIVITIES) {
      const lesson = lessonFor(activity);
      expect(lesson).toBeTruthy();
      if (activity.scenario === null) {
        // Null is allowed only for a lesson that stands up its own scene, and
        // the claim is checked rather than taken: a lesson that loads a
        // scenario and says null would strand its reader in whatever world
        // happened to be on screen.
        expect(lesson.steps.every(s => s.stage)).toBe(true);
        expect(lesson.steps.every(s => !s.setup?.scenario)).toBe(true);
      } else {
        expect(Object.hasOwn(SCENARIO_INFO, activity.scenario)).toBe(true);
      }
    }
  });

  test('every id it names exists in both languages', () => {
    for (const activity of ACTIVITIES) {
      const ids = [
        activity.titleId,
        activity.questionId,
        activity.audienceId,
        activity.prerequisitesId,
        ...activity.objectiveIds,
        'teach.activity.duration',
        ...activity.formats.flatMap(f => [
          f.nameId,
          f.forId,
          f.introId,
          f.closingId,
        ]),
      ];
      for (const id of ids) {
        expect([id, Object.hasOwn(EN_TEACHING, id)]).toEqual([id, true]);
        expect([id, Object.hasOwn(ES_TEACHING, id)]).toEqual([id, true]);
      }
    }
  });

  test('the durations read as estimates, in both languages', () => {
    // The one thing that must not be presented as fact: none of these has been
    // timed with a class.
    for (const cat of [EN_TEACHING, ES_TEACHING]) {
      expect(cat['teach.activity.duration']).toMatch(/about|unos|aproximad/i);
      // And the number is substituted, never written into the sentence, so it
      // cannot drift from the format's own `minutes`.
      expect(cat['teach.activity.duration']).toContain('{n}');
    }
    for (const { format } of allFormats()) {
      expect(Number.isFinite(format.minutes)).toBe(true);
    }
  });
});

describe('every format resolves to a coherent lesson', () => {
  test.each(
    allFormats().map(({ activity, format }) => [format.id, activity, format])
  )('%s', (_id, activity, format) => {
    const lesson = lessonFor(activity);
    const resolved = resolvedSteps(lesson, format);

    expect(resolved.unknown).toEqual([]);
    expect(resolved.sids.length).toBeGreaterThanOrEqual(format.steps.length);

    // Every chosen step survives resolution, and everything that came back
    // is a real step of the lesson.
    const sids = new Set(lesson.steps.map(s => s.sid));
    for (const sid of resolved.sids) expect(sids.has(sid)).toBe(true);
    for (const sid of format.steps) expect(resolved.sids).toContain(sid);
  });

  test('each one opens with a step that builds a world', () => {
    // A format whose first step is a question about a screen nobody set up is
    // the failure this resolver exists to prevent. The setup arrives whether
    // or not the format asked for it.
    //
    // A stage counts. Two ways a lesson can have a world on the first screen:
    // load a scenario, or stand the objects up itself. The stellar lessons do
    // the second on every step and have no setup anywhere, and requiring one
    // would have failed a format whose world is built more thoroughly than
    // most.
    for (const { activity, format } of allFormats()) {
      const lesson = lessonFor(activity);
      const resolved = resolvedSteps(lesson, format);
      const byId = new Map(lesson.steps.map(s => [s.sid, s]));
      const first = byId.get(resolved.sids[0]);
      expect(Boolean(first.setup || first.stage)).toBe(true);
    }
  });

  test('the steps come back in lesson order, never reordered', () => {
    for (const { activity, format } of allFormats()) {
      const lesson = lessonFor(activity);
      const order = new Map(lesson.steps.map((s, i) => [s.sid, i]));
      const positions = resolvedSteps(lesson, format).sids.map(s =>
        order.get(s)
      );
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  test('an activity offers its formats shortest first', () => {
    // A reader scanning a card should meet the five-minute option before the
    // fifty-minute one. Strictly increasing in steps; non-decreasing in
    // minutes, because a projected demonstration and a short route are the
    // same length for different audiences.
    for (const activity of ACTIVITIES) {
      const lesson = lessonFor(activity);
      const lengths = activity.formats.map(
        f => resolvedSteps(lesson, f).sids.length
      );
      const minutes = activity.formats.map(f => f.minutes);
      for (let i = 1; i < lengths.length; i++) {
        expect(lengths[i - 1]).toBeLessThan(lengths[i]);
        expect(minutes[i - 1]).toBeLessThanOrEqual(minutes[i]);
      }
    }
  });
});

describe('what each format is required to contain', () => {
  const activity = ACTIVITIES[0];
  const lesson = lessonFor(activity);
  const stepsOf = id => {
    const format = formatById(activity, id);
    const byId = new Map(lesson.steps.map(s => [s.sid, s]));
    return resolvedSteps(lesson, format).sids.map(sid => byId.get(sid));
  };

  test('the demonstration asks for a prediction and needs no typing', () => {
    const steps = stepsOf('demonstration');
    const predict = steps.find(s => s.type === 'predict');
    expect(predict).toBeTruthy();
    // Multiple choice: a room can answer it aloud or through the polling the
    // instructor already uses. A short-answer step would stall a five-minute
    // demonstration on somebody's typing.
    expect(Array.isArray(predict.options)).toBe(true);
    const shortAnswers = steps.filter(s => s.kind === 'short');
    expect(shortAnswers).toEqual([]);
  });

  test('the guided activity measures at both extremes and explains', () => {
    const steps = stepsOf('guided');
    expect(steps.find(s => s.type === 'predict')).toBeTruthy();

    // Event-based pauses, not a stopwatch and a steady hand.
    const measure = steps.find(s => s.pauseAt);
    expect(measure).toBeTruthy();
    expect(measure.pauseAt.kind).toBe('periapsis');
    // The fields it captures are the comparison, computed rather than
    // transcribed.
    const ids = measure.fields.map(f => f.id);
    expect(ids).toEqual(
      expect.arrayContaining(['v_peri', 'v_apo', 'r_peri', 'r_apo'])
    );
    expect(measure.fields.find(f => f.id === 'v_ratio').compute).toBeTruthy();

    // And it ends by revisiting the prediction in the student's own words.
    expect(steps.at(-1).sid).toBe('why-the-speed-changes');
  });

  test('the lab has a controlled comparison and a transfer task', () => {
    const steps = stepsOf('lab');
    // Both orbiters go round the same star, so eccentricity is what differs.
    expect(steps.map(s => s.sid)).toContain('measure-the-two-orbits');
    // The last step is the transfer: where "the planet orbits the star" stops
    // being the right description.
    expect(steps.at(-1).sid).toBe('where-kepler-s-version-breaks');
    // Which brings its own world with it rather than being asked about the
    // wrong one.
    const transferIndex = steps.findIndex(
      s => s.sid === 'where-kepler-s-version-breaks'
    );
    const setupBefore = steps
      .slice(0, transferIndex)
      .filter(s => s.setup)
      .at(-1);
    expect(setupBefore).toBeTruthy();
    expect(setupBefore.sid).toBe('what-newton-added');
  });

  test('the second law is shown, not asserted', () => {
    // An equal-time distance comparison does not demonstrate equal areas. Every
    // format that claims the second law includes the swept-area step.
    for (const id of ['demonstration', 'guided', 'lab']) {
      const types = stepsOf(id).map(s => s.type);
      expect([id, types.includes('wedges')]).toEqual([id, true]);
    }
  });
});

describe('building the assignment a student opens', () => {
  const activity = ACTIVITIES[0];
  const lesson = lessonFor(activity);

  test('each format gets its own fixed id, so progress cannot be shared', () => {
    const ids = activity.formats.map(
      f => assignmentForFormat(lesson, activity, f, 'T', '').assignment.i
    );
    expect(new Set(ids).size).toBe(ids.length);
    // Fixed, not derived from today: a student's answers must survive the
    // calendar turning over.
    expect(ids).toEqual(activity.formats.map(f => f.assignmentId));
  });

  test('the same format built twice is the same assignment', () => {
    const format = formatById(activity, 'guided');
    const a = assignmentForFormat(lesson, activity, format, 'T', '');
    const b = assignmentForFormat(lesson, activity, format, 'T', '');
    expect(b.assignment).toEqual(a.assignment);
  });

  test('it carries step ids and fingerprints, and no answers', () => {
    const format = formatById(activity, 'guided');
    const { assignment } = assignmentForFormat(
      lesson,
      activity,
      format,
      'T',
      ''
    );
    expect(assignment.l).toBe('keplers-laws');
    expect(assignment.s.length).toBe(assignment.f.length);
    const json = JSON.stringify(assignment);
    // Nothing from a rubric, an answer or a because-line may travel in a link.
    for (const step of lesson.steps) {
      if (step.rubric) expect(json).not.toContain(step.rubric.slice(0, 40));
      if (step.because) expect(json).not.toContain(step.because.slice(0, 40));
    }
  });

  test('a missing activity, format or lesson is refused by name', () => {
    const format = formatById(activity, 'guided');
    expect(assignmentForFormat(lesson, null, format).reason).toBe(
      LAUNCH.NO_ACTIVITY
    );
    expect(assignmentForFormat(lesson, activity, null).reason).toBe(
      LAUNCH.NO_FORMAT
    );
    expect(assignmentForFormat(null, activity, format).reason).toBe(
      LAUNCH.NO_LESSON
    );
    expect(
      assignmentForFormat({ id: 'x', steps: [] }, activity, format).reason
    ).toBe(LAUNCH.NO_LESSON);
  });
});

describe('routing', () => {
  test('no activity asked for is not an error', () => {
    const route = routeFor('');
    expect(route.asked).toBe(false);
    expect(route.reason).toBeNull();
  });

  test('a real activity and format resolve', () => {
    const route = routeFor('?activity=orbital-speed&format=guided');
    expect(route.activity.id).toBe('orbital-speed');
    expect(route.format.id).toBe('guided');
    expect(route.reason).toBeNull();
  });

  test('an activity with no format shows the activity', () => {
    const route = routeFor('?activity=orbital-speed');
    expect(route.activity.id).toBe('orbital-speed');
    expect(route.format).toBeNull();
    expect(route.reason).toBeNull();
  });

  test('an unknown activity says so and offers nothing instead', () => {
    const route = routeFor('?activity=nope');
    expect(route.activity).toBeNull();
    expect(route.reason).toBe(LAUNCH.NO_ACTIVITY);
    expect(route.requested.activity).toBe('nope');
  });

  test('an unknown format keeps the activity and says which one was wrong', () => {
    // Falling back to a different format would be the worst outcome: a class
    // silently running the wrong length of activity.
    const route = routeFor('?activity=orbital-speed&format=nope');
    expect(route.activity.id).toBe('orbital-speed');
    expect(route.format).toBeNull();
    expect(route.reason).toBe(LAUNCH.NO_FORMAT);
    expect(route.requested.format).toBe('nope');
  });

  test('routeTo round-trips', () => {
    expect(routeTo('orbital-speed', 'lab')).toBe(
      '?activity=orbital-speed&format=lab'
    );
    const back = routeFor(routeTo('orbital-speed', 'lab'));
    expect(back.format.id).toBe('lab');
    expect(routeTo()).toBe('');
  });
});

describe('lookups', () => {
  test('by id, and undefined for anything else', () => {
    expect(activityById('orbital-speed').id).toBe('orbital-speed');
    expect(activityById('nope')).toBeUndefined();
    expect(formatById(ACTIVITIES[0], 'lab').id).toBe('lab');
    expect(formatById(ACTIVITIES[0], 'nope')).toBeUndefined();
    expect(formatById(undefined, 'lab')).toBeUndefined();
  });

  test('allFormats pairs every format with its activity', () => {
    const pairs = allFormats();
    const total = ACTIVITIES.reduce((n, a) => n + a.formats.length, 0);
    expect(pairs).toHaveLength(total);
    for (const { activity, format } of pairs) {
      expect(activity.formats).toContain(format);
    }
  });
});
