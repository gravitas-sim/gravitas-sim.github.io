// =============================================================================
// The dependency audit's exception list
// -----------------------------------------------------------------------------
// tools/deps-audit.mjs passes over a named advisory with no patched release and
// fails on every other. The reports below are the shape `npm audit --json`
// writes: a vulnerable package's `via` holds advisory objects, or the names of
// other vulnerable packages it depends on. The case that matters is the one
// built to fail: an ignored advisory beside one that is not.
// =============================================================================

import { advisories, judge, IGNORED } from '../tools/deps-audit.mjs';

const advisory = (id, name, severity) => ({
  source: 1,
  name,
  dependency: name,
  title: `${name} advisory`,
  url: `https://github.com/advisories/${id}`,
  severity,
  range: '*',
});

const report = (...vias) => ({
  vulnerabilities: Object.fromEntries(
    vias.map(([pkg, via]) => [pkg, { name: pkg, via }])
  ),
});

const SPRINTF = 'GHSA-hp3w-g68c-fv3c';

describe('the dependency audit', () => {
  test('names the sprintf-js advisory, and only that one, with a reason', () => {
    expect([...IGNORED.keys()]).toEqual([SPRINTF]);
    expect(IGNORED.get(SPRINTF)).toMatch(/no patched release/i);
  });

  test('collects advisories once, and skips names of other packages', () => {
    const found = advisories(
      report(
        ['sprintf-js', [advisory(SPRINTF, 'sprintf-js', 'moderate')]],
        ['argparse', ['sprintf-js']],
        ['jest', ['@jest/core', advisory(SPRINTF, 'sprintf-js', 'moderate')]]
      )
    );
    expect(found.map(a => a.id)).toEqual([SPRINTF]);
  });

  test('the ignored advisory alone passes', () => {
    const result = judge(
      report(
        ['sprintf-js', [advisory(SPRINTF, 'sprintf-js', 'moderate')]],
        ['argparse', ['sprintf-js']]
      )
    );
    expect(result.failing).toEqual([]);
    expect(result.ignored.map(a => a.id)).toEqual([SPRINTF]);
  });

  test('any other advisory beside it still fails', () => {
    const result = judge(
      report(
        ['sprintf-js', [advisory(SPRINTF, 'sprintf-js', 'moderate')]],
        [
          'brace-expansion',
          [advisory('GHSA-q2hr-2g5m-vwhr', 'brace-expansion', 'high')],
        ]
      )
    );
    expect(result.failing.map(a => a.id)).toEqual(['GHSA-q2hr-2g5m-vwhr']);
  });

  test('below moderate does not fail, as with --audit-level=moderate', () => {
    const result = judge(
      report(['x', [advisory('GHSA-aaaa-bbbb-cccc', 'x', 'low')]])
    );
    expect(result.failing).toEqual([]);
  });

  test('an advisory with no GHSA id is still counted', () => {
    const result = judge(
      report([
        'y',
        [{ source: 1234, name: 'y', title: 't', severity: 'critical' }],
      ])
    );
    expect(result.failing.map(a => a.id)).toEqual(['npm-1234']);
  });

  test('an ignored advisory that is no longer reported is pointed out', () => {
    expect(judge(report()).unreported).toEqual([SPRINTF]);
  });
});
