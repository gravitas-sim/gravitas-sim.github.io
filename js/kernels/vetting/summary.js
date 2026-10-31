// =============================================================================
// The vetting summary (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// Runs the tests a candidate's data allow and says what they add up to:
//
//   rejected    at least one test fails: the candidate is not a planet on the
//               evidence, or at least not on this star
//   survives    every test ran and passed. It is NOT validated: the tests rule out
//               some false positives and leave the rest (a blend of two equal
//               stars at twice the period, a bound companion, a planet around
//               the neighbour at a separation the frames cannot resolve)
//   undecided   no test fails and at least one is inconclusive, or none ran
//
// The summary never says planet and never says validated. Each test's number
// goes into a gravitas.artifact/1 record in Prompt 150's uncertainty kinds, so a
// vetting result moves between tools with its uncertainties and its limits.
// =============================================================================

import { artifact } from '../../platform/artifact.js';
import { VERSION } from './constants.js';
import { oddEvenTest, secondaryTest } from './lightcurve.js';
import { differenceCentroid } from './frames.js';

const { Number } = globalThis;

/** The overall of a list of verdicts (VETTING.md, "summary"). */
export function overallOf(verdicts) {
  if (verdicts.includes('fail')) return 'rejected';
  if (verdicts.length > 0 && verdicts.every(v => v === 'pass'))
    return 'survives';
  return 'undecided';
}

/**
 * Vet a candidate.
 * @param {{series?: object, ephemeris: object, frames?: object, target?: object,
 *   options?: object}} c
 */
export function vet(c) {
  const tests = {};
  if (c.series) {
    tests.oddEven = oddEvenTest(c.series, c.ephemeris, c.options);
    tests.secondary = secondaryTest(c.series, c.ephemeris, c.options);
  }
  if (c.frames) {
    tests.centroid = differenceCentroid(
      c.frames,
      c.frames.ephemeris ?? c.ephemeris,
      c.target ?? c.frames.target,
      c.options
    );
  }
  const verdicts = Object.values(tests).map(t => t.verdict);
  return {
    kernel: VERSION,
    overall: overallOf(verdicts),
    tests,
    counts: {
      pass: verdicts.filter(v => v === 'pass').length,
      fail: verdicts.filter(v => v === 'fail').length,
      inconclusive: verdicts.filter(v => v === 'inconclusive').length,
    },
    synthetic: Boolean(c.series?.synthetic || c.frames?.kind === 'synthetic'),
  };
}

const finite = Number.isFinite;

/** A quantity of the record: a sigma, a limit, or the refusal to say. */
const q = (id, value, unit, sigma, origin, extra = {}) => ({
  id,
  value: finite(value) ? value : null,
  unit,
  uncertainty: finite(value)
    ? finite(sigma)
      ? { kind: 'sigma', sigma, basis: 'data' }
      : { kind: 'none' }
    : { kind: 'failed', reason: extra.reason ?? 'not measured' },
  origin,
});

/**
 * The summary as a gravitas.artifact/1 record.
 * @param {object} s - vet()'s result
 * @param {{id?: string, origin?: string}} [o]
 */
export function vettingRecord(s, o = {}) {
  const origin = o.origin ?? (s.synthetic ? 'synthetic' : 'measured');
  const quantities = [];
  const t = s.tests;
  if (t.oddEven)
    quantities.push(
      q(
        'oddEvenDifference',
        t.oddEven.difference,
        '',
        t.oddEven.sigma,
        origin,
        {
          reason: t.oddEven.reason,
        }
      )
    );
  if (t.secondary) {
    const sec = t.secondary;
    if (
      finite(sec.depth) &&
      sec.verdict !== 'fail' &&
      sec.reason !== 'detected-below-limit'
    )
      quantities.push({
        id: 'secondaryDepth',
        value: sec.upperLimit,
        unit: '',
        uncertainty: { kind: 'limit', bound: 'upper', basis: 'data' },
        origin,
      });
    else
      quantities.push(
        q('secondaryDepth', sec.depth, '', sec.sigma, origin, {
          reason: sec.reason,
        })
      );
  }
  if (t.centroid) {
    const c = t.centroid;
    quantities.push(
      q('centroidOffsetX', c.offset?.dx, 'pix', c.sigma?.x, origin, {
        reason: c.reason,
      }),
      q('centroidOffsetY', c.offset?.dy, 'pix', c.sigma?.y, origin, {
        reason: c.reason,
      })
    );
  }
  return artifact({
    id: o.id ?? 'vetting',
    source: { kind: 'analysis', id: 'vetting', version: VERSION },
    provenance: {
      vetting: {
        overall: s.overall,
        tests: Object.fromEntries(
          Object.entries(t).map(([k, v]) => [
            k,
            { verdict: v.verdict, reason: v.reason },
          ])
        ),
      },
    },
    quantities,
    warnings: ['a passed checklist is not validation'],
  });
}
