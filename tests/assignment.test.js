import { describe, test, expect } from '@jest/globals';
import {
  ASSIGNMENT_KIND,
  ASSIGNMENT_SCHEMA,
  BINDING,
  MAX_STEPS,
  assignmentStorageKey,
  buildAssignment,
  filterResponses,
  assignmentIdFor,
  resolveSelection,
  setupIndexFor,
  shortHash,
  stepBindings,
  validateAssignment,
  validateSelection,
} from '../js/assignments/assignment.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';

/**
 * A lesson shaped like the real ones: a setup step, some steps that depend on
 * it, a second setup, and more steps after it.
 */
const lesson = () => ({
  id: 'tides',
  steps: [
    { sid: 'intro', type: 'read' },
    { sid: 'build-a', type: 'read', setup: { scenario: 'Solar System' } },
    { sid: 'look', type: 'read' },
    { sid: 'guess', type: 'predict', options: ['a', 'b'], answer: 0 },
    { sid: 'build-b', type: 'read', setup: { scenario: 'Earth-Moon System' } },
    { sid: 'measure', type: 'measure', fields: [{ id: 'd' }] },
    {
      sid: 'ask',
      type: 'question',
      kind: 'choice',
      options: ['x', 'y', 'z'],
      answer: 2,
    },
  ],
});

const key = sid => `tides:${sid}`;

describe('what a selection has to include', () => {
  test('the world a step is about comes with it', () => {
    // 'measure' is about the Earth-Moon system, which 'build-b' loads. Without
    // that step the student reads a question about a screen showing something
    // else entirely.
    const out = resolveSelection(lesson(), ['measure']);
    expect(out.sids).toEqual(['build-b', 'measure']);
    expect(out.added).toHaveLength(1);
    expect(out.added[0]).toMatchObject({
      sid: 'build-b',
      reason: 'setup',
      forSid: 'measure',
      scenario: 'Earth-Moon System',
    });
  });

  test('the nearest preceding setup wins, not the first one', () => {
    expect(setupIndexFor(lesson(), 6)).toBe(4);
    expect(setupIndexFor(lesson(), 3)).toBe(1);
    // Nothing before the first setup step needs one.
    expect(setupIndexFor(lesson(), 0)).toBe(-1);
  });

  test('two steps under one setup pull it in once', () => {
    const out = resolveSelection(lesson(), ['measure', 'ask']);
    expect(out.sids).toEqual(['build-b', 'measure', 'ask']);
    expect(out.added).toHaveLength(1);
  });

  test('steps under different setups pull in both', () => {
    const out = resolveSelection(lesson(), ['guess', 'ask']);
    expect(out.sids).toEqual(['build-a', 'guess', 'build-b', 'ask']);
    expect(out.added.map(a => a.sid).sort()).toEqual(['build-a', 'build-b']);
  });

  test('a setup already chosen is not reported as an addition', () => {
    const out = resolveSelection(lesson(), ['build-b', 'measure']);
    expect(out.sids).toEqual(['build-b', 'measure']);
    expect(out.added).toEqual([]);
  });

  test('the order is the lesson order, whatever order they were ticked in', () => {
    // The prose refers backwards - "the value you measured above" - so a
    // reordered subset is nonsense even when every step is present.
    const out = resolveSelection(lesson(), ['ask', 'intro', 'measure']);
    expect(out.sids).toEqual(['intro', 'build-b', 'measure', 'ask']);
  });

  test('an id the lesson does not have is reported, not silently dropped', () => {
    const out = resolveSelection(lesson(), ['measure', 'no-such-step']);
    expect(out.unknown).toEqual(['no-such-step']);
    expect(
      validateSelection(lesson(), { chosen: ['no-such-step'] })
    ).toMatchObject({ ok: false, reason: 'unknownSteps' });
  });

  test('an empty or oversized selection is refused', () => {
    expect(validateSelection(lesson(), { chosen: [] }).reason).toBe(
      'nothingSelected'
    );
    expect(validateSelection(null, { chosen: ['intro'] }).reason).toBe(
      'noLesson'
    );
    expect(
      validateSelection(lesson(), { chosen: ['intro'], title: 'x'.repeat(500) })
        .reason
    ).toBe('titleTooLong');
  });
});

describe('the payload', () => {
  test('carries no answers, no hints and no student work', () => {
    const built = buildAssignment({
      lesson: lesson(),
      chosen: ['guess', 'ask'],
      title: 'Week 3',
      intro: 'Do these before Friday.',
      fingerprint: stepFingerprint,
    });
    const json = JSON.stringify(built);

    // The whole safety claim of the link, checked directly against the text
    // that goes in the address bar. A student who decodes this must find
    // nothing they could not have seen by opening the lesson.
    expect(json).not.toMatch(/answer/i);
    expect(json).not.toMatch(/"hints"/);
    expect(json).not.toMatch(/worked/i);
    expect(json).not.toMatch(/rubric/i);
    expect(json).not.toMatch(/misconception/i);
    // The option text of the questions is not in there either.
    expect(json).not.toMatch(/"x"|"y"|"z"/);
    // What it does carry.
    expect(built.k).toBe(ASSIGNMENT_KIND);
    expect(built.v).toBe(ASSIGNMENT_SCHEMA);
    expect(built.l).toBe('tides');
    expect(built.s).toEqual(['build-a', 'guess', 'build-b', 'ask']);
    expect(built.f).toHaveLength(4);
  });

  test('the id comes from the content, so different activities differ', () => {
    const day = new Date('2026-09-06T00:00:00Z');
    const mk = (sids, title) =>
      assignmentIdFor({ lesson: 'tides', sids, title }, day);

    // A random id was the first attempt and collided in a browser test on the
    // first try; two assignments sharing an id share a progress namespace,
    // which is the one thing the namespace exists to prevent.
    expect(mk(['a', 'b'], 'W3')).not.toBe(mk(['a', 'c'], 'W3'));
    expect(mk(['a', 'b'], 'W3')).not.toBe(mk(['a', 'b'], 'W4'));
    expect(mk(['a', 'b'], 'W3')).not.toBe(
      assignmentIdFor({ lesson: 'orbits', sids: ['a', 'b'], title: 'W3' }, day)
    );

    // And reissuing the same activity keeps the same id, so a student who
    // already did some of it does not start again.
    expect(mk(['a', 'b'], 'W3')).toBe(mk(['a', 'b'], 'W3'));
    expect(mk(['a', 'b'], 'W3')).toMatch(/^\d{6}[0-9a-f]{8}$/);
  });

  test('changing the steps changes the id, which is what versions the link', () => {
    const day = new Date('2026-09-06T00:00:00Z');
    const before = buildAssignment({
      lesson: lesson(),
      chosen: ['guess'],
      title: 'W3',
      now: day,
      fingerprint: stepFingerprint,
    });
    const after = buildAssignment({
      lesson: lesson(),
      chosen: ['guess', 'ask'],
      title: 'W3',
      now: day,
      fingerprint: stepFingerprint,
    });
    expect(before.i).not.toBe(after.i);
  });

  test('progress lives under the assignment, not under the lesson', () => {
    const built = buildAssignment({
      lesson: lesson(),
      chosen: ['ask'],
      id: 'abc123',
      fingerprint: stepFingerprint,
    });
    // Two assignments cut from one lesson must not share a namespace, and
    // neither may disturb the full lesson's own progress.
    expect(assignmentStorageKey(built)).toBe('gravitas_assignment_abc123');
    expect(assignmentStorageKey(built)).not.toContain('tides');
  });
});

describe('validating something that arrived from outside', () => {
  const good = () =>
    buildAssignment({
      lesson: lesson(),
      chosen: ['ask'],
      fingerprint: stepFingerprint,
    });

  test('a payload this build made is accepted', () => {
    expect(validateAssignment(good()).ok).toBe(true);
  });

  test('anything that is not an assignment is refused by kind', () => {
    expect(validateAssignment(null).reason).toBe('notAnObject');
    expect(validateAssignment([1, 2]).reason).toBe('notAnObject');
    expect(validateAssignment({ k: 'something.else' }).reason).toBe(
      'wrongKind'
    );
  });

  test('a newer schema is refused rather than half-read', () => {
    expect(
      validateAssignment({ ...good(), v: ASSIGNMENT_SCHEMA + 1 }).reason
    ).toBe('newerVersion');
    expect(validateAssignment({ ...good(), v: 0 }).reason).toBe('badVersion');
  });

  test('malformed step ids are refused', () => {
    expect(validateAssignment({ ...good(), s: [] }).reason).toBe('noSteps');
    expect(validateAssignment({ ...good(), s: ['a', 'a'] }).reason).toBe(
      'duplicateSteps'
    );
    // A colon would collide with the sub-key scheme progress keys use.
    expect(validateAssignment({ ...good(), s: ['a:b'] }).reason).toBe(
      'badStepId'
    );
    expect(validateAssignment({ ...good(), s: [7] }).reason).toBe('badStepId');
    expect(
      validateAssignment({
        ...good(),
        s: Array.from({ length: MAX_STEPS + 1 }, (_, i) => `s${i}`),
      }).reason
    ).toBe('tooManySteps');
  });

  test('a fingerprint list that does not match the steps is refused', () => {
    // good() resolves to two steps (the chosen one plus its setup), so a
    // one-entry fingerprint list is the mismatch.
    expect(validateAssignment({ ...good(), f: ['a'] }).reason).toBe(
      'fingerprintMismatch'
    );
  });

  test('a payload carrying answers or student work is refused outright', () => {
    // Nothing here writes such a field, so one arriving means the payload was
    // made by something else and is not to be trusted as an assignment.
    for (const field of ['responses', 'answers', 'attempts']) {
      expect(validateAssignment({ ...good(), [field]: {} })).toMatchObject({
        ok: false,
        reason: 'unexpectedField',
      });
    }
  });

  test('a bad id or lesson is refused', () => {
    expect(validateAssignment({ ...good(), i: 'has spaces' }).reason).toBe(
      'badId'
    );
    expect(validateAssignment({ ...good(), l: '' }).reason).toBe('badLesson');
  });
});

describe('opening an assignment after the lesson changed', () => {
  const built = () =>
    buildAssignment({
      lesson: lesson(),
      chosen: ['guess', 'measure', 'ask'],
      fingerprint: stepFingerprint,
    });

  test('an unchanged lesson binds every step', () => {
    const out = stepBindings(built(), lesson(), stepFingerprint);
    expect(out.missing).toBe(0);
    expect(out.changed).toBe(0);
    expect(out.present).toBe(out.bindings.length);
    expect(out.usable).toBe(true);
  });

  test('a retired step is missing, and the rest still work', () => {
    const revised = lesson();
    revised.steps = revised.steps.filter(s => s.sid !== 'measure');
    const out = stepBindings(built(), revised, stepFingerprint);
    expect(out.missing).toBe(1);
    expect(out.bindings.find(b => b.sid === 'measure').status).toBe(
      BINDING.MISSING
    );
    // The activity is still runnable; it is short by one step and says so.
    expect(out.usable).toBe(true);
    expect(out.steps.map(s => s.sid)).not.toContain('measure');
  });

  test('a question rewritten under its own id is flagged as changed', () => {
    const revised = lesson();
    // Same sid, four options instead of three: a different question.
    revised.steps.find(s => s.sid === 'ask').options = ['w', 'x', 'y', 'z'];
    const out = stepBindings(built(), revised, stepFingerprint);
    expect(out.changed).toBe(1);
    const ask = out.bindings.find(b => b.sid === 'ask');
    expect(ask.status).toBe(BINDING.CHANGED);
    expect(ask.expected).not.toBe(ask.actual);
  });

  test('a changed step does not inherit the old answer', () => {
    const revised = lesson();
    revised.steps.find(s => s.sid === 'ask').options = ['w', 'x', 'y', 'z'];
    const out = stepBindings(built(), revised, stepFingerprint);

    const stored = {
      'tides:guess': 0,
      'tides:ask': 2,
      'tides:ask:first': 1,
      'tides:measure:d': '4',
    };
    const { kept, dropped } = filterResponses(out, stored, key);

    // This is the failure the whole fingerprint mechanism exists to prevent:
    // answer 2 was the right answer to a three-option question and means
    // something else entirely against four options.
    expect(kept['tides:ask']).toBeUndefined();
    expect(dropped).toContain('tides:ask');
    // Its sub-keys go with it.
    expect(dropped).toContain('tides:ask:first');
    // Untouched steps keep their work.
    expect(kept['tides:guess']).toBe(0);
    expect(kept['tides:measure:d']).toBe('4');
  });

  test('a step renamed to a new id is treated as missing, not as a match', () => {
    const revised = lesson();
    revised.steps.find(s => s.sid === 'ask').sid = 'ask-again';
    const out = stepBindings(built(), revised, stepFingerprint);
    expect(out.bindings.find(b => b.sid === 'ask').status).toBe(
      BINDING.MISSING
    );
    // And nothing was matched to it by position, which is the tempting and
    // wrong repair.
    expect(out.steps.map(s => s.sid)).not.toContain('ask-again');
  });

  test('an assignment whose every step is gone is not usable', () => {
    const out = stepBindings(
      built(),
      { id: 'tides', steps: [] },
      stepFingerprint
    );
    expect(out.usable).toBe(false);
    // Five, not three: the three chosen steps plus the two setup steps their
    // worlds come from.
    expect(out.missing).toBe(5);
  });

  test('a payload from before fingerprints existed still opens', () => {
    const old = { ...built() };
    delete old.f;
    const out = stepBindings(old, lesson(), stepFingerprint);
    expect(out.changed).toBe(0);
    expect(out.present).toBe(5);
  });
});

describe('the fingerprint hash', () => {
  test('is stable and short', () => {
    expect(shortHash('a|b|c')).toBe(shortHash('a|b|c'));
    expect(shortHash('a|b|c')).toMatch(/^[0-9a-f]{8}$/);
  });

  test('separates steps that differ in the ways that matter', () => {
    const a = stepFingerprint({
      type: 'question',
      kind: 'choice',
      options: [1, 2, 3],
    });
    const b = stepFingerprint({
      type: 'question',
      kind: 'choice',
      options: [1, 2, 3, 4],
    });
    expect(shortHash(a)).not.toBe(shortHash(b));
  });

  test('ignores wording, which is what makes it locale-invariant', () => {
    const en = { type: 'read', title: 'The tides', body: 'English prose' };
    const es = { type: 'read', title: 'Las mareas', body: 'Prosa espanola' };
    // A student switching language must not have every step reported as
    // rewritten.
    expect(shortHash(stepFingerprint(en))).toBe(shortHash(stepFingerprint(es)));
  });
});

describe('prerequisites are resolved to a fixed point', () => {
  /** A lesson whose later steps depend on earlier ones by declaration. */
  const chained = {
    id: 'chain',
    steps: [
      { sid: 's0-setup', type: 'read', setup: { scenario: 'A' } },
      { sid: 's1-measure', type: 'measure' },
      { sid: 's2-setup', type: 'read', setup: { scenario: 'B' } },
      { sid: 's3-measure', type: 'measure', requires: ['s1-measure'] },
      {
        sid: 's4-question',
        type: 'question',
        kind: 'numeric',
        requires: ['s3-measure'],
      },
    ],
  };

  test('a chain longer than one link is followed all the way', () => {
    // s4 needs s3, s3 needs s1, s1 sits under s0, and s3/s4 sit under s2.
    // The first version pulled in one level and stopped.
    const out = resolveSelection(chained, ['s4-question']);
    expect(out.ok).toBe(true);
    expect(out.sids).toEqual([
      's0-setup',
      's1-measure',
      's2-setup',
      's3-measure',
      's4-question',
    ]);
  });

  test('every addition says which step needed it, and why', () => {
    const out = resolveSelection(chained, ['s4-question']);
    const byId = Object.fromEntries(out.added.map(a => [a.sid, a]));
    expect(byId['s3-measure']).toMatchObject({
      reason: 'requires',
      forSid: 's4-question',
    });
    expect(byId['s1-measure']).toMatchObject({
      reason: 'requires',
      forSid: 's3-measure',
    });
    // The setup a pulled-in step needs is itself pulled in, which is the case
    // one level of resolution could never reach.
    expect(byId['s0-setup']).toMatchObject({ reason: 'setup', scenario: 'A' });
    expect(byId['s2-setup']).toMatchObject({ reason: 'setup', scenario: 'B' });
  });

  test('steps in lesson order, never in dependency order', () => {
    const out = resolveSelection(chained, ['s4-question', 's1-measure']);
    const order = chained.steps.map(s => s.sid);
    const positions = out.sids.map(sid => order.indexOf(sid));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('a dependency the lesson does not have is reported, not invented', () => {
    const broken = {
      id: 'broken',
      steps: [
        { sid: 'a', type: 'read', setup: { scenario: 'A' } },
        { sid: 'b', type: 'measure', requires: ['gone'] },
      ],
    };
    const out = resolveSelection(broken, ['b']);
    expect(out.unknown).toContain('gone');
    expect(out.sids).toEqual(['a', 'b']);
  });

  test('a cycle terminates rather than spinning', () => {
    const cyclic = {
      id: 'cyclic',
      steps: [
        { sid: 'x', type: 'measure', requires: ['y'] },
        { sid: 'y', type: 'measure', requires: ['x'] },
      ],
    };
    const out = resolveSelection(cyclic, ['x']);
    expect(out.sids).toEqual(['x', 'y']);
  });
});

describe('a binding cannot survive an answer-semantic change', () => {
  const choice = over => ({
    sid: 'q',
    type: 'question',
    kind: 'choice',
    options: ['a', 'b', 'c', 'd'],
    answer: 1,
    ...over,
  });

  test('a same-length reorder that moves the answer is caught', () => {
    // The defect: only the option COUNT was hashed, so this reorder left the
    // fingerprint identical - and a stored answer is an index, so a student's
    // "1" silently came to mean a different option.
    const before = stepFingerprint(choice());
    const after = stepFingerprint(
      choice({ options: ['b', 'a', 'c', 'd'], answer: 0 })
    );
    expect(after).not.toBe(before);
  });

  test('changing which option is correct is caught', () => {
    expect(stepFingerprint(choice({ answer: 2 }))).not.toBe(
      stepFingerprint(choice())
    );
  });

  test('a numeric answer or its tolerance moving is caught', () => {
    const numeric = over => ({
      sid: 'n',
      type: 'question',
      kind: 'numeric',
      answer: 8,
      tolerance: 0.4,
      unit: 'years',
      ...over,
    });
    expect(stepFingerprint(numeric({ answer: 9 }))).not.toBe(
      stepFingerprint(numeric())
    );
    expect(stepFingerprint(numeric({ tolerance: 0.1 }))).not.toBe(
      stepFingerprint(numeric())
    );
    expect(stepFingerprint(numeric({ unit: 'days' }))).not.toBe(
      stepFingerprint(numeric())
    );
  });

  test('translating the options does not invalidate anything', () => {
    // The counterweight. Every binding in Spanish would break if the prose
    // were hashed, and a translation changes no answer's meaning.
    expect(stepFingerprint(choice({ options: ['α', 'β', 'γ', 'δ'] }))).toBe(
      stepFingerprint(choice())
    );
  });

  test('an assignment binding reports the change instead of staying valid', () => {
    const lesson = { id: 'l', steps: [choice()] };
    const assignment = buildAssignment({
      lesson,
      chosen: ['q'],
      title: 'T',
      fingerprint: stepFingerprint,
    });
    const moved = {
      id: 'l',
      steps: [choice({ options: ['b', 'a', 'c', 'd'], answer: 0 })],
    };
    const binding = stepBindings(assignment, moved, stepFingerprint);
    expect(binding.changed).toBe(1);
    expect(binding.bindings[0].status).toBe(BINDING.CHANGED);

    // And the student's stored answer to the old question is held back rather
    // than shown against the new one.
    const kept = filterResponses(binding, { 'l:q': '1' }, sid => `l:${sid}`);
    expect(kept.kept['l:q']).toBeUndefined();
  });
});
