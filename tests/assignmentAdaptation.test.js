// =============================================================================
// Assignment adaptation proven by the step graph (Prompt 175)
// -----------------------------------------------------------------------------
// An adaptation is an order, a sentence on a step and a due line. The order is
// the only one that can change what a step means, so it is judged against what
// the lessons declare (requires, reveal, when, setup, scene), over every lesson
// the Library lists and every edge they declare, not over a sample.
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import {
  assignmentLink,
  readAssignmentLink,
} from '../js/assignments/assignmentLink.js';
import {
  BINDING,
  buildAssignment,
  resolveSelection,
  setupIndexFor,
  stepBindings,
  validateAssignment,
} from '../js/assignments/assignment.js';
import { packageBinding } from '../js/assignments/pinning.js';
import {
  MAX_DUE,
  MAX_NOTE,
  applyAdaptation,
  checkAdaptation,
  cleanNotes,
  lessonOrder,
  mergeOrder,
  moveStep,
  noteFor,
  readAdaptation,
  repin,
  whatChanged,
} from '../js/assignments/adapt.js';
import { archiveOld, run } from './compat/harness.js';

const lessons = INVESTIGATIONS.map(withAllDepths);
const sidsOf = l => l.steps.map(s => s.sid);

/** Swap two places of a list. */
const swap = (list, a, b) => {
  const out = [...list];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
};

/**
 * What the graph says of an order, worked out a second way: step by step, from
 * the lesson's declarations and the closure's own setupIndexFor(), with no
 * code shared with adapt.js.
 */
function oracle(lesson, list, base) {
  const at = sid => list.indexOf(sid);
  const bad = new Set();
  const by = sid => lesson.steps.find(s => s.sid === sid);
  list.forEach((sid, i) => {
    const s = by(sid);
    for (const r of s.requires || [])
      if (by(r) && (at(r) < 0 || at(r) > i)) bad.add(`requires:${sid}:${r}`);
    if (s.when && by(s.when.sid) && (at(s.when.sid) < 0 || at(s.when.sid) > i))
      bad.add(`when:${sid}:${s.when.sid}`);
    if (s.reveal && by(s.reveal) && (at(s.reveal) < 0 || at(s.reveal) < i))
      bad.add(`reveal:${sid}:${s.reveal}`);
    // The world, by the engine's rule (the nearest setup at or before), over
    // the list as if it were a lesson, against the lesson whole.
    const sub = { steps: list.map(by) };
    const mine = setupIndexFor(sub, i);
    const full = setupIndexFor(lesson, lesson.steps.indexOf(s));
    const a = mine < 0 ? null : list[mine];
    const b = full < 0 ? null : lesson.steps[full].sid;
    if (a !== b) bad.add(`setup:${sid}`);
  });
  const scene = (row, i) => {
    let k = i;
    while (k >= 0 && !by(row[k]).setup && !by(row[k]).stage) k--;
    return k < 0 ? null : row[k];
  };
  list.forEach((sid, i) => {
    if (scene(list, i) !== scene(base, base.indexOf(sid)))
      bad.add(`scene:${sid}`);
  });
  return bad;
}

describe('the lessons as they stand', () => {
  test('there is a graph to prove against: edges of every rule', () => {
    const count = f => lessons.flatMap(l => l.steps).filter(f).length;
    expect(count(s => s.requires?.length)).toBeGreaterThan(50);
    expect(count(s => s.reveal)).toBeGreaterThan(100);
    expect(count(s => s.setup)).toBeGreaterThan(60);
    expect(count(s => s.stage)).toBeGreaterThan(400);
  });

  test.each(lessons.map(l => [l.id, l]))(
    '%s: its own order passes, at every depth it offers',
    (id, lesson) => {
      expect(checkAdaptation(lesson, sidsOf(lesson)).problems).toEqual([]);
      for (const depth of lesson.depths || [
        'core',
        'quantitative',
        'advanced',
      ]) {
        const cut = resolveSelection(lesson, sidsOf(lesson), depth).sids;
        expect(checkAdaptation(lesson, cut, { depth }).problems).toEqual([]);
      }
    }
  );
});

describe('an order that breaks an edge is refused, naming the step it needs', () => {
  const edges = (rule, pick) =>
    lessons.flatMap(l =>
      l.steps.flatMap(s => pick(s).map(ref => [l, s.sid, ref, rule]))
    );

  test('requires: every declared edge, moved ahead of what it reads', () => {
    const all = edges('requires', s =>
      (s.requires || []).filter(r => r !== s.sid)
    );
    expect(all.length).toBeGreaterThan(50);
    for (const [lesson, sid, ref] of all) {
      const list = sidsOf(lesson).filter(x => x !== sid);
      list.splice(list.indexOf(ref), 0, sid);
      const { problems } = checkAdaptation(lesson, list);
      expect(problems).toContainEqual({
        rule: 'requires',
        sid,
        needs: ref,
        why: 'later',
      });
    }
  });

  test('requires: dropping what a step reads is refused as absent', () => {
    for (const [lesson, sid, ref] of edges('requires', s => s.requires || [])) {
      const list = sidsOf(lesson).filter(x => x !== ref);
      // Removing is judged against the order as it stood.
      const { problems } = checkAdaptation(lesson, list, {
        base: sidsOf(lesson),
      });
      expect(problems).toContainEqual({
        rule: 'requires',
        sid,
        needs: ref,
        why: 'absent',
      });
    }
  });

  test('reveal: a prediction is refused ahead of the step that reveals it, or without it', () => {
    const all = edges('reveal', s => (s.reveal ? [s.reveal] : []));
    expect(all.length).toBeGreaterThan(100);
    for (const [lesson, sid, ref] of all) {
      const ahead = sidsOf(lesson).filter(x => x !== sid);
      ahead.splice(ahead.indexOf(ref) + 1, 0, sid);
      expect(checkAdaptation(lesson, ahead).problems).toContainEqual({
        rule: 'reveal',
        sid,
        needs: ref,
        why: 'earlier',
      });
      const without = sidsOf(lesson).filter(x => x !== ref);
      expect(
        checkAdaptation(lesson, without, { base: sidsOf(lesson) }).problems
      ).toContainEqual({
        rule: 'reveal',
        sid,
        needs: ref,
        why: 'absent',
      });
    }
  });

  test('setup: a step moved above the step that builds its world is refused', () => {
    let tried = 0;
    for (const lesson of lessons) {
      const ids = sidsOf(lesson);
      lesson.steps.forEach((s, i) => {
        const k = setupIndexFor(lesson, i);
        if (k < 0 || k === i) return;
        const list = ids.filter(x => x !== s.sid);
        list.splice(list.indexOf(lesson.steps[k].sid), 0, s.sid);
        const { problems } = checkAdaptation(lesson, list);
        expect(problems.some(p => p.rule === 'setup' && p.sid === s.sid)).toBe(
          true
        );
        tried++;
      });
    }
    expect(tried).toBeGreaterThan(100);
  });

  test('every adjacent swap in every lesson: the check and the second reckoning agree', () => {
    let refused = 0;
    let allowed = 0;
    for (const lesson of lessons) {
      const ids = sidsOf(lesson);
      for (let i = 0; i + 1 < ids.length; i++) {
        const list = swap(ids, i, i + 1);
        const mine = checkAdaptation(lesson, list).ok;
        const theirs = oracle(lesson, list, ids).size === 0;
        expect([lesson.id, i, mine]).toEqual([lesson.id, i, theirs]);
        if (mine) allowed++;
        else refused++;
      }
    }
    // Both outcomes are exercised, or the agreement proves nothing.
    expect(refused).toBeGreaterThan(200);
    expect(allowed).toBeGreaterThan(200);
  });

  test('seeded shuffles of cuts: the check and the second reckoning agree', () => {
    let seed = 175;
    const rnd = () =>
      (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
    let ok = 0;
    let no = 0;
    for (const lesson of lessons) {
      const ids = sidsOf(lesson);
      for (let n = 0; n < 6; n++) {
        const pick = ids.filter(() => rnd() < 0.4).slice(0, 14);
        if (pick.length < 2) continue;
        const cut = resolveSelection(lesson, pick).sids;
        const list = [...cut];
        for (let m = 0; m < 3; m++) {
          const a = Math.floor(rnd() * list.length);
          const b = Math.floor(rnd() * list.length);
          [list[a], list[b]] = [list[b], list[a]];
        }
        const mine = checkAdaptation(lesson, list, { base: cut }).ok;
        const theirs = oracle(lesson, list, cut).size === 0;
        // The baseline's own gaps (a prediction cut off from its reveal) are
        // not the shuffle's: the oracle sees them, the check does not blame it.
        const baseGaps = oracle(lesson, cut, cut);
        const fresh = [...oracle(lesson, list, cut)].filter(
          k => !baseGaps.has(k)
        );
        expect([lesson.id, mine]).toEqual([lesson.id, fresh.length === 0]);
        if (theirs) ok++;
        else no++;
      }
    }
    expect(ok + no).toBeGreaterThan(100);
  });

  test('a depth the step is deeper than is refused', () => {
    const lesson = lessons.find(l => l.depths);
    const deep = lesson.steps.find(s => s.depth && s.depth !== 'core');
    const { problems } = checkAdaptation(lesson, [deep.sid], {
      depth: 'core',
      base: [],
    });
    expect(problems).toContainEqual({
      rule: 'depth',
      sid: deep.sid,
      needs: null,
      why: 'core',
    });
  });
});

describe('moving and merging', () => {
  const lesson = {
    id: 'x',
    steps: [
      { sid: 'a', type: 'read', setup: { scenario: 'S' } },
      { sid: 'b', type: 'measure', fields: [{ id: 'd' }] },
      { sid: 'c', type: 'question', requires: ['b'] },
      { sid: 'd', type: 'read' },
      { sid: 'e', type: 'predict', reveal: 'f' },
      { sid: 'f', type: 'read' },
    ],
  };
  const all = lesson.steps.map(s => s.sid);

  test('a move that keeps the graph is made, and one that breaks it is not', () => {
    const ok = moveStep(lesson, all, 'd', -1);
    expect(ok.list).toEqual(['a', 'b', 'd', 'c', 'e', 'f']);
    const no = moveStep(lesson, all, 'c', -1);
    expect(no.list).toEqual(all);
    expect(no.problems[0]).toMatchObject({
      rule: 'requires',
      sid: 'c',
      needs: 'b',
    });
    expect(moveStep(lesson, all, 'a', -1)).toEqual({ list: all, problems: [] });
  });

  test('a step that is not under its world is named', () => {
    const { problems } = checkAdaptation(lesson, [
      'b',
      'a',
      'c',
      'd',
      'e',
      'f',
    ]);
    expect(problems.some(p => p.rule === 'setup' && p.sid === 'b')).toBe(true);
  });

  test('an order is kept through a change of selection, and falls back when it cannot', () => {
    const kept = mergeOrder(lesson, ['a', 'd', 'b', 'c'], ['a', 'b', 'c', 'd']);
    expect(kept).toEqual(['a', 'd', 'b', 'c']);
    const grown = mergeOrder(
      lesson,
      ['a', 'd', 'b', 'c'],
      ['a', 'b', 'c', 'd', 'e', 'f']
    );
    expect(grown).toEqual(['a', 'd', 'e', 'f', 'b', 'c']);
    // c now before b is not an order the graph allows: the lesson's own.
    expect(mergeOrder(lesson, ['a', 'c', 'b'], ['a', 'b', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(lessonOrder(lesson, ['c', 'a'])).toEqual(['a', 'c']);
  });
});

describe('the package', () => {
  const lesson = lessons.find(l => l.id === 'orbital-energy');
  const ids = sidsOf(lesson).filter(
    sid => !lesson.steps.find(s => s.sid === sid).depth
  );
  const build = extra =>
    buildAssignment({
      lesson,
      chosen: ids.slice(0, 8),
      title: 'Week 3',
      id: 'p175fixed',
      now: new Date('2026-10-22T00:00:00Z'),
      fingerprint: stepFingerprint,
      ...extra,
    });

  test('with no adaptation it is byte for byte what the builder made', () => {
    const base = build();
    expect(
      JSON.stringify(
        applyAdaptation(base, { lesson, fingerprint: stepFingerprint })
      )
    ).toBe(JSON.stringify(base));
    expect(
      applyAdaptation(base, {
        lesson,
        order: base.s,
        notes: { [base.s[0]]: '  ' },
        due: '   ',
        fingerprint: stepFingerprint,
      })
    ).toEqual(base);
  });

  test('an order, notes and a due line round-trip through the link', async () => {
    const base = build();
    let order = base.s;
    for (let i = 0; i + 1 < order.length; i++) {
      const moved = moveStep(lesson, order, order[i], 1);
      if (moved.list !== order) {
        order = moved.list;
        break;
      }
    }
    expect(order).not.toEqual(base.s);
    const made = applyAdaptation(base, {
      lesson,
      order,
      notes: {
        [order[0]]: ['Read this first.', 'Léelo primero.'],
        zzz: 'gone',
      },
      due: 'Friday, before lab',
      fingerprint: stepFingerprint,
    });
    expect(made.s).toEqual(order);
    expect(made.f).toHaveLength(order.length);
    expect(made.i).not.toBe(base.i);
    expect(Object.keys(made.x)).toEqual([order[0]]);
    expect(validateAssignment(made)).toMatchObject({ ok: true });
    const link = await assignmentLink(made, 'https://example.test/');
    const read = await readAssignmentLink(link.fragment);
    expect(read.ok).toBe(true);
    expect(read.assignment).toEqual(made);
    const resolved = stepBindings(read.assignment, lesson, stepFingerprint);
    expect(resolved.present).toBe(order.length);
    expect(resolved.steps.map(s => s.sid)).toEqual(order);
    expect(readAdaptation(read.assignment)).toEqual({
      x: made.x,
      u: 'Friday, before lab',
    });
  });

  test('a link is untrusted: oversize and misplaced fields are cut', () => {
    const x = cleanNotes(
      { a: 'y'.repeat(MAX_NOTE + 50), b: ['', 'solo es'], c: 7, zz: 'no' },
      ['a', 'b', 'c']
    );
    expect(x.a[0]).toHaveLength(MAX_NOTE);
    expect(x.b).toEqual(['', 'solo es']);
    expect(x.c).toEqual(['7']);
    expect(x.zz).toBeUndefined();
    expect(
      readAdaptation({ s: ['a'], x: 'text', u: 'z'.repeat(MAX_DUE * 2) }).u
    ).toHaveLength(MAX_DUE);
    expect(readAdaptation({ s: ['a'], u: 4 }).u).toBe('');
  });

  test('a reader sees their own language, else the other', () => {
    const x = {
      a: ['en words', 'palabras'],
      b: ['', 'solo es'],
      c: ['solo en'],
    };
    expect(noteFor(x, 'a', 'es')).toBe('palabras');
    expect(noteFor(x, 'a', 'en')).toBe('en words');
    expect(noteFor(x, 'b', 'en')).toBe('solo es');
    expect(noteFor(x, 'c', 'es')).toBe('solo en');
    expect(noteFor(x, 'zz', 'en')).toBe('');
  });
});

describe('what changed under a pinned activity', () => {
  const make = () => {
    const lesson = {
      id: 'tides',
      title: 'Tides',
      steps: [
        { sid: 'intro', type: 'read', title: 'Welcome' },
        {
          sid: 'build',
          type: 'read',
          title: 'Build the Moon',
          setup: { scenario: 'Earth-Moon' },
        },
        {
          sid: 'ask',
          type: 'question',
          kind: 'choice',
          title: 'Which bulge',
          options: ['x', 'y', 'z'],
          answer: 2,
        },
        { sid: 'done', type: 'read', title: 'Done' },
      ],
    };
    const a = buildAssignment({
      lesson,
      chosen: ['ask', 'done'],
      title: 'Tides',
      id: 'p175pin',
      now: new Date('2026-10-01T00:00:00Z'),
      fingerprint: stepFingerprint,
    });
    return { lesson, a };
  };

  test('nothing changed says nothing', () => {
    const { lesson, a } = make();
    const r = stepBindings(a, lesson, stepFingerprint);
    const out = whatChanged(a, lesson, r, packageBinding(a, null));
    expect(out.any).toBe(false);
  });

  test('a rewritten step and a removed one are named by their titles', () => {
    const { lesson, a } = make();
    const later = {
      ...lesson,
      steps: lesson.steps
        .filter(s => s.sid !== 'done')
        .map(s => (s.sid === 'ask' ? { ...s, options: ['x', 'y'] } : s)),
    };
    const r = stepBindings(a, later, stepFingerprint);
    const out = whatChanged(a, later, r, packageBinding(a, null));
    expect(out.any).toBe(true);
    expect(out.changed).toEqual(['Which bulge']);
    expect(out.missingSids).toEqual(['done']);
    expect(out.changedSids).toEqual(['ask']);
  });

  test('a graph the lesson now declares is checked against the steps still there', () => {
    const { lesson, a } = make();
    const later = {
      ...lesson,
      steps: lesson.steps.map(s =>
        s.sid === 'ask' ? { ...s, requires: ['intro'] } : s
      ),
    };
    const r = stepBindings(a, later, stepFingerprint);
    const out = whatChanged(a, later, r, packageBinding(a, null));
    expect(out.graph).toContainEqual(
      expect.objectContaining({
        rule: 'requires',
        step: 'Which bulge',
        needsTitle: 'Welcome',
      })
    );
  });

  test('re-pinning gives current digests, drops the gone, and a new id', () => {
    const { lesson, a } = make();
    const later = {
      ...lesson,
      steps: lesson.steps
        .filter(s => s.sid !== 'done')
        .map(s => (s.sid === 'ask' ? { ...s, options: ['x', 'y'] } : s)),
    };
    const fresh = repin(
      { ...a, x: { ask: ['hi'], done: ['gone'] } },
      later,
      stepFingerprint,
      null,
      new Date('2026-10-22T00:00:00Z')
    );
    expect(fresh.s).toEqual(['build', 'ask']);
    expect(fresh.i).not.toBe(a.i);
    expect(fresh.x).toEqual({ ask: ['hi'] });
    expect(validateAssignment(fresh)).toMatchObject({ ok: true });
    const r = stepBindings(fresh, later, stepFingerprint);
    expect(r.present).toBe(2);
    expect(r.changed + r.missing).toBe(0);
    expect(BINDING.PRESENT).toBe('present');
  });
});

describe('the 2.0.0 reader (the corpus row for the additive fields)', () => {
  let old;
  beforeAll(() => {
    old = archiveOld();
  });
  afterAll(() => old?.cleanup());

  test('opens an adapted link: it keeps the order and leaves the sentences and the due line out', async () => {
    const lesson = lessons.find(l => l.id === 'orbital-energy');
    const base = buildAssignment({
      lesson,
      chosen: sidsOf(lesson).slice(1, 4),
      title: 'Week 3',
      id: 'p175old',
      now: new Date('2026-10-22T00:00:00Z'),
      fingerprint: stepFingerprint,
    });
    const reversed = [...base.s].reverse();
    const made = {
      ...base,
      s: reversed,
      f: [...base.f].reverse(),
      x: { [reversed[0]]: ['A sentence.'] },
      u: 'Friday',
    };
    const { fragment } = await assignmentLink(made, 'https://example.test/');
    const got = run(old.tree, 'assignment-link', 'read', { fragment }).value;
    expect(got.accepted).toBe(true);
    expect(got.value.s).toEqual(reversed);
    // Said plainly: the older build opens it and does not show them.
    expect(got.value.x).toEqual(made.x);
  });
});
