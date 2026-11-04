// =============================================================================
// The dependency audit's exception list
// -----------------------------------------------------------------------------
// tools/deps-audit.mjs passes over a named advisory with no patched release and
// fails on every other. The reports below are the shape `npm audit --json`
// writes: a vulnerable package's `via` holds advisory objects, or the names of
// other vulnerable packages it depends on. The case that matters is the one
// built to fail: an ignored advisory beside one that is not.
// =============================================================================

import { advisories, expired, judge, IGNORED } from '../tools/deps-audit.mjs';
import { readFileSync } from 'node:fs';

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

// The list ships empty when every advisory has a patched release; these cases
// inject an exception the way a future one would be written, so the judging
// logic stays covered. SPRINTF is the advisory that once held the only entry.
const SPRINTF = 'GHSA-hp3w-g68c-fv3c';
const WITH_SPRINTF = {
  ignored: new Map([[SPRINTF, 'no patched release (test fixture)']]),
};

describe('the dependency audit', () => {
  test('every exception on the list carries a reason', () => {
    for (const [id, reason] of IGNORED) {
      expect(id).toMatch(/^GHSA-/);
      expect(reason.length).toBeGreaterThan(10);
    }
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
      ),
      WITH_SPRINTF
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
      ),
      WITH_SPRINTF
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
    expect(judge(report(), WITH_SPRINTF).unreported).toEqual([SPRINTF]);
    expect(judge(report()).unreported).toEqual([...IGNORED.keys()]);
  });

  test('every exception has a basis and an expiry date, and none has lapsed', () => {
    const { exceptions } = JSON.parse(
      readFileSync('tools/deps-audit-exceptions.json', 'utf8')
    );
    for (const e of exceptions) {
      expect(e.basis.length).toBeGreaterThan(10);
      expect(e.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(expired()).toEqual([]);
  });

  test('an exception expires on its date, and not before', () => {
    const list = [{ id: 'GHSA-aaaa-bbbb-cccc', expires: '2027-01-15' }];
    expect(expired(list, new Date('2027-01-14T23:59:59Z'))).toEqual([]);
    expect(expired(list, new Date('2027-01-15T00:00:00Z'))).toEqual(list);
    expect(expired(list, new Date('2027-02-01T00:00:00Z'))).toEqual(list);
  });
});
