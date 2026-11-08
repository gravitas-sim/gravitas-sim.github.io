// =============================================================================
// Progress in My work (Roadmap III Prompt 276, part 1): the states, the depth
// reached and the advice about earlier investigations, derived from the
// existing records. Nothing here is a lock; a prerequisite is a note.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import {
  DEPTH_NAMES,
  describe as describeRecords,
  progressGroups,
  stateOf,
  unmetPrerequisites,
} from '../js/myWork/model.js';

const T = en => ({ en, es: en });
const inv = (name, steps, prerequisites, rel) => [
  `investigation:${name}`,
  {
    id: `investigation:${name}`,
    kind: 'investigation',
    format: 'lesson',
    title: T(name),
    route: `/#investigation=${name}`,
    steps,
    prerequisites,
    rel: { in: rel },
  },
];
const library = new Map([
  inv(
    'a',
    4,
    [],
    [
      ['seq', 's1', 0],
      ['course', 'c1', 1],
    ]
  ),
  inv('b', 4, ['investigation:a'], [['seq', 's1', 1]]),
  inv('c', 4, ['investigation:b', 'scenario:x'], [['seq', 's2', 0]]),
  ['course:c1', { id: 'course:c1', kind: 'course', title: T('Course one') }],
  [
    'investigation:obs',
    { id: 'investigation:obs', kind: 'investigation', format: 'guide' },
  ],
]);
const sequences = [
  { id: 's1', title: T('Sequence one') },
  { id: 's2', title: T('Sequence two') },
];
const lesson = (id, seen, done, depth) => ({
  kind: 'lesson',
  id,
  seen,
  total: 4,
  done,
  depth,
});

describe('progress states', () => {
  test('no record is new, a record is doing, all steps seen is done', () => {
    expect(stateOf(undefined)).toBe('new');
    expect(stateOf(lesson('a', 0, false))).toBe('doing');
    expect(stateOf(lesson('a', 4, true))).toBe('done');
  });

  test('every depth a record can name has both words', () => {
    for (const d of ['core', 'quantitative', 'advanced'])
      expect(DEPTH_NAMES[d]).toHaveLength(2);
  });
});

describe('groups by sequence and course', () => {
  const lessons = [
    lesson('a', 4, true, 'quantitative'),
    lesson('b', 2, false, 'core'),
  ];
  const groups = progressGroups(library, sequences, lessons);
  const g = id => groups.find(x => `${x.kind}:${x.id}` === id);

  test('items follow the sequence order, guides are left out', () => {
    expect(g('seq:s1').items.map(i => i.id)).toEqual([
      'investigation:a',
      'investigation:b',
    ]);
    expect(
      groups.flatMap(x => x.items).some(i => i.id === 'investigation:obs')
    ).toBe(false);
  });

  test('counts, the next item and the depth reached', () => {
    expect(g('seq:s1').counts).toEqual({ done: 1, doing: 1, new: 0 });
    expect(g('seq:s1').next.id).toBe('investigation:b');
    expect(g('seq:s1').items[0].depth).toBe('quantitative');
    expect(g('seq:s2').items[0].depth).toBeNull();
  });

  test('a course takes its title from its entry, a sequence from the list', () => {
    expect(g('course:c1').title.en).toBe('Course one');
    expect(g('seq:s1').title.en).toBe('Sequence one');
  });

  test('groups with something begun come first', () => {
    expect(groups.map(x => `${x.kind}:${x.id}`)).toEqual([
      'seq:s1',
      'course:c1',
      'seq:s2',
    ]);
  });

  test('an unknown depth is not shown', () => {
    const odd = progressGroups(library, sequences, [
      lesson('a', 1, false, 'x'),
    ]);
    expect(odd[0].items[0].depth).toBeNull();
  });
});

describe('prerequisites are advice, never a lock', () => {
  const none = new Map();
  test('an unfinished prerequisite is named with its route', () => {
    const u = unmetPrerequisites(library.get('investigation:b'), library, none);
    expect(u).toEqual([
      { id: 'investigation:a', title: T('a'), route: '/#investigation=a' },
    ]);
  });

  test('a finished prerequisite is not named, a non-investigation is ignored', () => {
    const have = new Map([['b', lesson('b', 4, true)]]);
    expect(
      unmetPrerequisites(library.get('investigation:c'), library, have)
    ).toEqual([]);
  });

  test('a finished investigation carries no advice, a begun one still does', () => {
    const rows = progressGroups(library, sequences, [
      lesson('b', 4, true),
    ]).find(x => x.id === 's1').items;
    expect(rows[1].prerequisites).toEqual([]);
    const begun = progressGroups(library, sequences, [
      lesson('b', 1, false),
    ]).find(x => x.id === 's1').items;
    expect(begun[1].prerequisites.map(p => p.id)).toEqual(['investigation:a']);
  });
});

describe('derived from the existing records', () => {
  test('a progress record yields the depth reached through describe()', () => {
    const records = [
      {
        collection: 'x',
        id: 'gravitas_investigation_a',
        value: { visited: ['1', '2'], deepest: 'quantitative' },
      },
    ];
    const lessons = describeRecords(records, library).lessons;
    expect(lessons[0].depth).toBe('quantitative');
    const groups = progressGroups(library, sequences, lessons);
    expect(groups[0].items[0]).toMatchObject({
      state: 'doing',
      seen: 2,
      depth: 'quantitative',
    });
  });
});
