import { describe, expect, test } from '@jest/globals';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';
import { EDITS, editedLesson, lesson } from './compat/kinds/_lesson.mjs';

// The task-change contract: a shipped step is reworded in place, or revised
// under a new id with the old id retired, and what a student saved under the
// old id stays readable as an answer from an earlier version and is never
// marked against the new step. Each reader has its own block below.

const SAVED = {
  schema: 2,
  lesson: 'tides',
  stepSid: 'guess',
  responses: {
    'tides:guess': 0,
    'tides:measure:d': '4.2',
    'tides:measure:d:locale': 'en',
    'tides:ask': 2,
  },
  attempts: { 'tides:guess': 1 },
  visited: ['intro', 'guess'],
  startedAt: '2026-10-01T00:00:00.000Z',
};

describe('the retired map', () => {
  const owner = {
    id: 'o',
    steps: [{ sid: 'z' }],
    retired: {
      a: { to: 'z', release: '3.1', was: { en: 'A?', es: 'A?es' } },
      gone: { to: null, release: '3.1', was: 'Gone?' },
    },
  };

  test('what a step asked is read in the reader language, English as the fallback', () => {
    expect(wasIn(owner.retired.a.was, 'es')).toBe('A?es');
    expect(wasIn({ en: 'B?' }, 'es')).toBe('B?');
    expect(wasIn('Gone?', 'es')).toBe('Gone?');
    expect(wasIn(null)).toBe('');
  });

  test('saved answers under ids the lesson lacks come back with where they went, unknown ones too', () => {
    const rows = earlierAnswers(owner, {
      'o:a': 1,
      'o:z': 2,
      'o:gone': 3,
      'o:mystery': 4,
    });
    expect(rows.map(r => [r.id, r.r?.to])).toEqual([
      ['a', 'z'],
      ['gone', null],
      ['mystery', undefined],
    ]);
  });
});

describe('progress load: reword, revise, insert and remove', () => {
  const read = edit => readProgress(SAVED, editedLesson(edit));

  test('a reword changes nothing a reader sees', () => {
    const r = read('reword');
    expect(r.responses).toEqual(read('none').responses);
    expect(r.earlier).toBeUndefined();
    expect(r.notes).toEqual([]);
  });

  test('an insert leaves every answer on its own step', () => {
    const r = read('insert');
    expect(r.responses['tides:guess']).toBe(0);
    expect(r.responses['tides:measure:d']).toBe('4.2');
    expect(r.earlier).toBeUndefined();
  });

  test('a revised step opens blank; the old answer is kept as an earlier version', () => {
    const l = editedLesson('revise');
    const r = readProgress(SAVED, l);
    expect(r.responses['tides:guess']).toBeUndefined();
    expect(r.responses['tides:guess-2']).toBeUndefined();
    expect(r.earlier.responses['tides:guess']).toBe(0);
    expect(r.earlier.attempts['tides:guess']).toBe(1);
    const [e] = earlierAnswers(l, r.earlier.responses);
    expect(e).toMatchObject({ id: 'guess', text: '0' });
    expect(e.r).toMatchObject({ to: 'guess-2', release: '3.1' });
    expect(wasIn(e.r.was, 'es')).toMatch(/mayor/);
  });

  test('a removed step is retired with no successor and its field answers stay readable', () => {
    const l = editedLesson('remove');
    const r = readProgress(SAVED, l);
    expect(r.responses['tides:measure:d']).toBeUndefined();
    const [e] = earlierAnswers(l, r.earlier.responses);
    expect(e).toMatchObject({ id: 'measure', text: 'd=4.2' });
    expect(e.r.to).toBeNull();
    expect(r.notes.find(n => n.code === 'removedSteps').dropped).toBe(2);
  });

  test.each(EDITS)('%s: saving after reading loses no saved key', edit => {
    const l = editedLesson(edit);
    const r = readProgress(SAVED, l);
    const back = writeProgress({ lesson: l, ...r, depth: 'core' });
    const keys = o => Object.keys(o).sort();
    expect(keys(back.responses)).toEqual(keys(SAVED.responses));
    expect(keys(back.attempts)).toEqual(keys(SAVED.attempts));
    // and the next read sets the same answers aside again
    expect(readProgress(back, l).earlier).toEqual(r.earlier);
  });

  test('an answer is never read against the successor step', () => {
    const l = editedLesson('revise');
    const r = readProgress(SAVED, l);
    for (const { sid } of l.steps) {
      expect(r.responses[`tides:${sid}`]).toBe(sid === 'ask' ? 2 : undefined);
    }
  });

  test('a key that is not this lesson at all is left out', () => {
    const r = readProgress(
      { ...SAVED, responses: { ...SAVED.responses, 'other:x': 1 } },
      lesson()
    );
    expect(JSON.stringify(r)).not.toMatch(/other/);
  });
});

describe('the other readers', () => {
  const revised = editedLesson('revise');
  const removed = editedLesson('remove');

  test('an activity format names a retired step: its successor, or left out', async () => {
    const { assignmentForFormat } =
      await import('../js/activities/activities.js');
    const act = { id: 'a', markingNote: false };
    const run = (l, steps) =>
      assignmentForFormat(l, act, { steps, assignmentId: 'f1' }, 'A', '');
    const r = run(revised, ['guess', 'ask']);
    expect(r.assignment.s).toContain('guess-2');
    expect(r.assignment.s).not.toContain('guess');
    const gone = run(removed, ['measure', 'ask']);
    expect(gone.assignment.s).toEqual(expect.arrayContaining(['ask']));
    expect(gone.assignment.s).not.toContain('measure');
    expect(gone.unknown).toEqual([]);
  });

  test('a re-pinned assignment puts the successor where the retired step was', async () => {
    const { repin, whatChanged } = await import('../js/assignments/adapt.js');
    const { stepBindings, buildAssignment } =
      await import('../js/assignments/assignment.js');
    const { stepFingerprint } =
      await import('../js/investigations/progressBackup.js');
    const a = buildAssignment({
      lesson: lesson(),
      chosen: ['guess', 'ask'],
      title: 'W',
      fingerprint: stepFingerprint,
      provider: null,
    });
    const res = stepBindings(a, revised, stepFingerprint);
    expect(whatChanged(a, revised, res, null).missing).toHaveLength(1);
    const fresh = repin(a, revised, stepFingerprint, null);
    expect(fresh.s).toContain('guess-2');
    expect(fresh.s).not.toContain('guess');
  });

  test('a course review names the successor, and the reviewed upgrade follows it', async () => {
    const { reviewItem, upgradeCoursePack } =
      await import('../js/course/review.js');
    const facts = {
      lessons: new Map([
        [
          'tides',
          {
            fp: 'x',
            n: 6,
            hashes: new Map(revised.steps.map(s => [s.sid, 'h'])),
            sids: revised.steps.map(s => s.sid),
            retired: revised.retired,
            steps: [],
            guide: false,
          },
        ],
      ]),
      scenarios: new Map(),
    };
    const item = {
      id: 'i1',
      kind: 'assignment',
      lesson: 'tides',
      steps: ['guess'],
      pin: { fp: 'x', n: 6, f: ['h'] },
    };
    expect(reviewItem(item, facts, 'compatible').detail.revisedSteps).toEqual([
      expect.objectContaining({ sid: 'guess', to: 'guess-2', release: '3.1' }),
    ]);
    const pack = {
      version: '1.0.0',
      pinning: 'compatible',
      units: [{ items: [item] }],
    };
    const up = upgradeCoursePack(pack, facts, ['i1'], {
      today: '2026-01-01',
      newAssignmentId: () => 'new',
    });
    const items = up.pack.units[0].items;
    expect(items[0].steps).toEqual(['guess-2']);
    expect(up.refused).toEqual([]);
  });

  test('a 3-D guide report lists a retired step answer with its retirement entry', async () => {
    const { reportOf } = await import('../js/lab3d/view/guidePanel.js');
    const guide = {
      id: 'g',
      steps: [{ id: 's2', kind: 'read', path: 'both' }],
      retired: {
        s1: { to: 's2', release: '3.1', was: { en: 'Old', es: 'Viejo' } },
      },
    };
    const progress = {
      answers: {},
      records: {},
      earlier: { s1: { typed: '4', passed: true } },
    };
    const rep = reportOf(guide, 'intro', progress, { locale: 'es' });
    expect(rep.earlier).toEqual([
      {
        step: 's1',
        typed: '4',
        passed: true,
        to: 's2',
        release: '3.1',
        was: { en: 'Old', es: 'Viejo' },
      },
    ]);
    expect(
      reportOf(guide, 'intro', { answers: {}, records: {} }).earlier
    ).toBeUndefined();
  });

  test('the bench store reads an older record and labels nothing as current that is not', async () => {
    const { migrate, SCHEMA_VERSION } =
      await import('../js/experiments/store.js');
    const { FIXTURES } = await import('./compat/previous.mjs');
    for (const k of ['store-v1', 'store-v2']) {
      const r = migrate(FIXTURES[k]);
      expect(r.ok).toBe(true);
      expect(r.record.v).toBe(SCHEMA_VERSION);
      expect(r.record.runs.A.samples.length).toBeGreaterThan(0);
    }
    expect(migrate({ v: SCHEMA_VERSION + 1 }).ok).toBe(false);
  });
});

describe('the author rule id/retired', () => {
  test('accepts the fixture lessons and names each fault', async () => {
    const { retiredFindings } =
      await import('../tools/authoring/retiredRules.mjs');
    expect(retiredFindings(lesson())).toEqual([]);
    expect(retiredFindings(editedLesson('revise'))).toEqual([]);
    expect(retiredFindings(editedLesson('remove'))).toEqual([]);
    const bad = editedLesson('revise');
    bad.retired.ask = { to: 'nowhere', release: 'soon', was: { en: 'x' } };
    bad.retired.guess.to = 'gone';
    const found = retiredFindings(bad).join('\n');
    expect(found).toMatch(/"ask": the lesson has a step with this id/);
    expect(found).toMatch(/"ask": `to` must be a step/);
    expect(found).toMatch(/"ask": `release`/);
    expect(found).toMatch(/"ask": `was.es`/);
    expect(found).toMatch(/"guess": `to` must be a step/);
  });

  test('is wired into the catalog check, which reports a bad map on a real lesson', async () => {
    const { checkCatalog } = await import('../js/authoring/rules.js');
    const base = await import('../tools/authoring/inputs.mjs');
    const inputs = await base.loadAuthoringInputs();
    const one = inputs.investigations.find(l => l.steps?.length);
    const copy = { ...one, retired: { [one.steps[0].sid]: { to: null } } };
    const found = checkCatalog({
      ...inputs,
      investigations: [copy],
    }).filter(f => f.rule === 'id/retired');
    expect(found.length).toBeGreaterThan(0);
  });
});
