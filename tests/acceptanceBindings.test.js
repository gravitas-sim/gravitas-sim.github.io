// =============================================================================
// The rules that decide whether a central experiment is really accepted
// -----------------------------------------------------------------------------
// tools/acceptance-bindings.mjs is the half of the scene audit that judges the
// acceptance map, and it is a pure function so that this file can drive it. An
// earlier version of this test had to be deleted: the check lived inside the
// audit, which shells out to `playwright --list`, and Playwright refuses to
// collect anything from inside a Jest process - so the test saw an empty list,
// every binding looked missing, and it proved nothing about the rules.
//
// Every case here is a tree built to fail, because that is the only way to know
// a rule bites. The tree that should pass is checked too, so a rule that
// rejects everything would be caught as well.
// =============================================================================

import {
  auditBindings,
  parseCollected,
  tagsIn,
  RESERVED,
} from '../tools/acceptance-bindings.mjs';

const LESSONS = [{ id: 'tides' }, { id: 'keplers-laws' }];

const MAP = {
  lessons: {
    tides: { centralExperimentId: 'ce.tides', test: 'e2e/ce.spec.js' },
    'keplers-laws': {
      centralExperimentId: 'ce.keplers-laws',
      test: 'e2e/ce.spec.js',
    },
  },
};

/** A spec file that binds both experiments the way the rules want. */
const GOOD = `
import { test, expect } from './fixtures.js';
test('tides: stretch against distance @accepts:ce.tides', async () => {
  expect(1).toBe(1);
});
test('keplers-laws: a and P for four planets @accepts:ce.keplers-laws', async () => {
  expect(1).toBe(1);
});
`;

const collectedFor = (...titles) =>
  parseCollected(
    titles
      .map((t, i) => `  [chromium] › ce.spec.js:${(i + 1) * 10}:3 › ${t}`)
      .join('\n')
  );

const BOTH = collectedFor(
  `a › tides ${RESERVED}ce.tides`,
  `a › keplers ${RESERVED}ce.keplers-laws`
);

const run = (sources, collected = BOTH) =>
  auditBindings({ acceptance: MAP, lessons: LESSONS, sources, collected });

describe('a tree that says what it means', () => {
  test('two dedicated tests, one per experiment, is clean', () => {
    expect(run({ 'e2e/ce.spec.js': GOOD })).toEqual([]);
  });
});

describe('a templated tag is not a binding', () => {
  const TEMPLATE = `
import { test } from './fixtures.js';
for (const loop of LOOPS) {
  test(\`\${loop.id}: whatever @accepts:ce.\${loop.id}\`, async () => {});
}
`;

  test('the template itself is reported, wherever it lives', () => {
    const problems = run({
      'e2e/ce.spec.js': GOOD,
      'e2e/loops.spec.js': TEMPLATE,
    });
    expect(problems.join('\n')).toMatch(/assembled from a variable/);
    expect(problems.join('\n')).toMatch(/e2e\/loops\.spec\.js:4/);
  });

  test('a template cannot stand in for the dedicated test', () => {
    // The only tag for tides is the generated one. It resolves at run time,
    // which is exactly why the old checker accepted it.
    const problems = run(
      {
        'e2e/ce.spec.js': GOOD.replace(
          "test('tides: stretch against distance @accepts:ce.tides', async () => {\n  expect(1).toBe(1);\n});\n",
          ''
        ),
        'e2e/loops.spec.js': TEMPLATE,
      },
      BOTH
    );
    expect(problems.join('\n')).toMatch(
      /tides: no test in e2e\/ce\.spec\.js is tagged @accepts:ce\.tides/
    );
  });
});

describe('one experiment, one test', () => {
  test('the same tag twice in the declared file is refused', () => {
    const twice = `${GOOD}
test('tides again @accepts:ce.tides', async () => {});
`;
    expect(run({ 'e2e/ce.spec.js': twice }).join('\n')).toMatch(
      /@accepts:ce\.tides appears 2 times/
    );
  });

  test('two collected tests carrying one tag is refused', () => {
    const problems = run(
      { 'e2e/ce.spec.js': GOOD },
      collectedFor(
        `a › tides ${RESERVED}ce.tides`,
        `b › tides again ${RESERVED}ce.tides`,
        `c › keplers ${RESERVED}ce.keplers-laws`
      )
    );
    expect(problems.join('\n')).toMatch(
      /2 collected tests carry @accepts:ce\.tides/
    );
  });

  test('the tag in another file is refused even when the declared one is right', () => {
    const problems = run({
      'e2e/ce.spec.js': GOOD,
      'e2e/other.spec.js':
        "test('tides elsewhere @accepts:ce.tides', () => {});",
    });
    expect(problems.join('\n')).toMatch(
      /is also in e2e\/other\.spec\.js:1, but the map names e2e\/ce\.spec\.js/
    );
  });
});

describe('the tag has to be somewhere real', () => {
  test('a declared file that does not exist is refused', () => {
    const problems = auditBindings({
      acceptance: {
        lessons: {
          tides: { centralExperimentId: 'ce.tides', test: 'e2e/nope.spec.js' },
        },
      },
      lessons: [{ id: 'tides' }],
      sources: { 'e2e/ce.spec.js': GOOD },
      collected: collectedFor(`a › tides ${RESERVED}ce.tides`),
    });
    expect(problems.join('\n')).toMatch(
      /acceptance test "e2e\/nope\.spec\.js" does not exist/
    );
  });

  test('a collected test in the wrong file is refused', () => {
    const problems = run(
      { 'e2e/ce.spec.js': GOOD },
      parseCollected(
        `  [chromium] › other.spec.js:5:3 › a › tides ${RESERVED}ce.tides\n` +
          `  [chromium] › ce.spec.js:9:3 › a › keplers ${RESERVED}ce.keplers-laws`
      )
    );
    expect(problems.join('\n')).toMatch(
      /the collected test carrying @accepts:ce\.tides is in e2e\/other\.spec\.js/
    );
  });

  test('a tag Playwright never collects is refused', () => {
    const problems = run(
      { 'e2e/ce.spec.js': GOOD },
      collectedFor(`a › keplers ${RESERVED}ce.keplers-laws`)
    );
    expect(problems.join('\n')).toMatch(
      /Playwright collects no test carrying it/
    );
  });

  test('no listing at all is a problem, not a pass', () => {
    const problems = auditBindings({
      acceptance: MAP,
      lessons: LESSONS,
      sources: { 'e2e/ce.spec.js': GOOD },
      collected: null,
    });
    expect(problems.join('\n')).toMatch(/could not list the browser suite/);
  });

  test('a tag on a test that never names its lesson is refused', () => {
    const anonymous = GOOD.replace(
      'tides: stretch against distance',
      'a thing'
    );
    // The word "tides" survives only in the tag itself, so strip that too by
    // renaming the lesson the map declares.
    const problems = auditBindings({
      acceptance: {
        lessons: {
          'retrograde-motion': {
            centralExperimentId: 'ce.tides',
            test: 'e2e/ce.spec.js',
          },
        },
      },
      lessons: [{ id: 'retrograde-motion' }],
      sources: { 'e2e/ce.spec.js': anonymous },
      collected: collectedFor(`a › a thing ${RESERVED}ce.tides`),
    });
    expect(problems.join('\n')).toMatch(/never names "retrograde-motion"/);
  });
});

describe('an inactive test accepts nothing', () => {
  for (const marker of [
    'test.skip(',
    'test.only(',
    'test.fixme(',
    'test.fail(',
    'it.only(',
    'it.skip(',
    'test.describe.only(',
  ]) {
    test(`${marker} on the tagged test is refused`, () => {
      const src = GOOD.replace(
        "test('tides: stretch against distance @accepts:ce.tides'",
        `${marker}'tides: stretch against distance @accepts:ce.tides'`
      );
      expect(run({ 'e2e/ce.spec.js': src }).join('\n')).toMatch(
        /skipped, fixed, expected to fail, or exclusive/
      );
    });
  }

  test('a skip inside the body is refused too', () => {
    const src = GOOD.replace(
      "test('tides: stretch against distance @accepts:ce.tides', async () => {\n  expect(1).toBe(1);\n});",
      "test('tides: stretch against distance @accepts:ce.tides', async () => {\n  test.skip(!process.env.X, 'no');\n  expect(1).toBe(1);\n});"
    );
    expect(run({ 'e2e/ce.spec.js': src }).join('\n')).toMatch(
      /skipped, fixed, expected to fail, or exclusive/
    );
  });

  test('test.slow is a budget, not a state, and is allowed', () => {
    const src = GOOD.replace(
      'expect(1).toBe(1);',
      'test.slow();\n  expect(1).toBe(1);'
    );
    expect(run({ 'e2e/ce.spec.js': src })).toEqual([]);
  });
});

describe('an unsupported declaration', () => {
  test('a reserved tag for an id nobody declares is refused', () => {
    const src = `${GOOD}
test('something else @accepts:ce.not-a-lesson', async () => {});
`;
    expect(run({ 'e2e/ce.spec.js': src }).join('\n')).toMatch(
      /@accepts:ce\.not-a-lesson is not a declared central experiment/
    );
  });

  test('@covers: is not reserved and is ignored', () => {
    const src = `${GOOD}
test('generic persistence @covers:ce.tides', async () => {});
`;
    expect(run({ 'e2e/ce.spec.js': src })).toEqual([]);
  });

  test('an entry with no centralExperimentId is refused', () => {
    const problems = auditBindings({
      acceptance: { lessons: { tides: { test: 'e2e/ce.spec.js' } } },
      lessons: [{ id: 'tides' }],
      sources: { 'e2e/ce.spec.js': GOOD },
      collected: BOTH,
    });
    expect(problems.join('\n')).toMatch(/has no centralExperimentId/);
  });

  test('two lessons sharing one id is refused', () => {
    const problems = auditBindings({
      acceptance: {
        lessons: {
          tides: { centralExperimentId: 'ce.tides', test: 'e2e/ce.spec.js' },
          'keplers-laws': {
            centralExperimentId: 'ce.tides',
            test: 'e2e/ce.spec.js',
          },
        },
      },
      lessons: LESSONS,
      sources: { 'e2e/ce.spec.js': GOOD },
      collected: BOTH,
    });
    expect(problems.join('\n')).toMatch(/is already used by tides/);
  });
});

describe('the pieces it is built from', () => {
  test('tagsIn separates written-out tags from generated ones', () => {
    const { literal, templated } = tagsIn(
      'a @accepts:ce.one\nb @accepts:ce.${x}\nc @covers:ce.two\n'
    );
    expect(literal.map(t => t.id)).toEqual(['ce.one', 'ce.']);
    expect(templated).toHaveLength(1);
    expect(templated[0].line).toBe(2);
  });

  test('parseCollected puts the test directory back on', () => {
    const rows = parseCollected(
      '  [chromium] › a/b.spec.js:12:3 › x › y @accepts:ce.z'
    );
    expect(rows).toEqual([
      { file: 'e2e/a/b.spec.js', line: 12, title: 'x › y @accepts:ce.z' },
    ]);
  });

  test('parseCollected reports "no listing" apart from "empty listing"', () => {
    expect(parseCollected(null)).toBeNull();
    expect(parseCollected('')).toEqual([]);
  });
});
