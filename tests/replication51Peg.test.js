// =============================================================================
// The 51 Pegasi replication: the data, and the claims the lesson makes about it
// -----------------------------------------------------------------------------
// This is not a test of arithmetic. js/rvFit.js and js/rvUncertainty.js have
// their own suites and this duplicates none of it.
//
// What it guards is narrower and, for a replication lesson, more important:
// that the committed velocities are still the velocities that were fetched,
// and that the numbers the lesson prints on screen are still what the shipped
// code produces from them. A lesson that tells a student their reduced
// chi-square will be 6.6 is making a claim about the interaction of a dataset
// and a fitter, and either of them can move without the other noticing.
//
// The numbers below were not chosen to make this pass. They came out of the
// stack before the lesson was written and the lesson quotes them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  PROVENANCE,
  PUBLISHED,
  VELOCITIES,
  EPOCH_BJD,
  recording,
  activityIndex,
} from '../js/data/rv/51peg.js';
import LESSON from '../js/data/investigations/replicating-51-peg.js';
import { periodSearch, usablePoints, foldOnPeriod } from '../js/rvFit.js';
import { runMonteCarlo } from '../js/rvUncertainty.js';

describe('the committed velocities', () => {
  test('are the forty-three rows the provenance block claims', () => {
    expect(VELOCITIES).toHaveLength(PROVENANCE.rows);
    expect(PROVENANCE.rows).toBe(43);
  });

  test('carry four finite columns each, in chronological order', () => {
    let previous = -Infinity;
    for (const row of VELOCITIES) {
      expect(row).toHaveLength(4);
      for (const value of row) expect(Number.isFinite(value)).toBe(true);
      const [bjd, , sigma] = row;
      expect(bjd).toBeGreaterThan(2450000);
      expect(sigma).toBeGreaterThan(0);
      expect(bjd).toBeGreaterThanOrEqual(previous);
      previous = bjd;
    }
  });

  test('span the baseline and carry the gap the lesson asks students to find', () => {
    const days = VELOCITIES.map(([bjd]) => bjd - EPOCH_BJD);
    const baseline = Math.max(...days) - Math.min(...days);
    expect(baseline).toBeCloseTo(2749.7, 0);

    const sorted = [...days].sort((a, b) => a - b);
    let largest = 0;
    for (let i = 1; i < sorted.length; i++) {
      largest = Math.max(largest, sorted[i] - sorted[i - 1]);
    }
    // Step 5 validates a student's answer against 408 +/- 40 days.
    expect(largest).toBeCloseTo(407.9, 0);
  });

  test('still contain the seven near-simultaneous exposure pairs', () => {
    const days = VELOCITIES.map(([bjd]) => bjd - EPOCH_BJD).sort(
      (a, b) => a - b
    );
    let pairs = 0;
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i - 1] < 0.01) pairs++;
    }
    // Reproduced, not reprocessed: binning these away would be a defensible
    // analysis choice and an indefensible thing to do silently.
    expect(pairs).toBe(7);
  });
});

describe('the provenance block', () => {
  test('names a source, a retrieval date and a checksum', () => {
    expect(PROVENANCE.paper).toMatch(/Butler/);
    expect(PROVENANCE.catalog).toBe('J/AJ/153/208');
    expect(PROVENANCE.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PROVENANCE.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(PROVENANCE.query).toContain('J/AJ/153/208/table1');
    expect(PROVENANCE.attribution).toBeTruthy();
  });

  test('says what was done to the numbers and what was not', () => {
    expect(PROVENANCE.processing.length).toBeGreaterThan(0);
    expect(PROVENANCE.notApplied.length).toBeGreaterThan(0);
    expect(PROVENANCE.knownSystematics.length).toBeGreaterThanOrEqual(3);
    for (const s of PROVENANCE.knownSystematics) {
      expect(s.what).toBeTruthy();
      expect(s.consequence).toBeTruthy();
    }
  });

  test('re-quotes a published value that does not come from our own fit', () => {
    expect(PUBLISHED.catalogFit.periodDays).toBeCloseTo(4.23077, 5);
    expect(PUBLISHED.catalogFit.kMs).toBeCloseTo(56.05, 2);
    expect(PUBLISHED.catalogFit.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    // And is honest about what kind of independence it has.
    expect(PUBLISHED.catalogFit.independent).toBe(false);
    expect(PUBLISHED.discovery.independent).toBe(true);
  });

  test('carries no discovery numbers that nothing in the repo has verified', () => {
    // Deliberate. If somebody fills this in, they must also record where from -
    // this is the one block in the application where an unsourced number would
    // undo the entire point of the file.
    expect(PUBLISHED.discovery.values).toBeNull();
    expect(PUBLISHED.discovery.bibcode).toBe('1995Natur.378..355M');
  });
});

describe('the recording handed to the workspace', () => {
  const rec = recording();

  test('has no generating parameters to reveal', () => {
    // js/rvWorkspace.js reads `source.truth`. Absent means the reveal control
    // reports that there is nothing to reveal, which is the truth: nobody
    // knows the real period of 51 Pegasi b.
    expect(rec.truth).toBeUndefined();
  });

  test('leaves every simulated-run field null rather than plausible', () => {
    expect(rec.seed).toBeNull();
    expect(rec.scenario).toBeNull();
    expect(rec.worldGeneration).toBeNull();
    expect(rec.geometry).toBeNull();
    expect(rec.config.cadenceDays).toBeNull();
    expect(rec.config.sigma).toBeNull();
  });

  test('every point is usable by the fitter', () => {
    const { usable, counts } = usablePoints(rec.points);
    expect(usable).toHaveLength(43);
    expect(counts.missed).toBe(0);
    expect(counts.notFinite).toBe(0);
  });

  test('carries an activity index aligned with the velocities', () => {
    const activity = activityIndex();
    expect(activity).toHaveLength(VELOCITIES.length);
    expect(activity[0].day).toBeCloseTo(rec.points[0].day, 5);
  });
});

describe('what the lesson tells a student they will see', () => {
  const { usable } = usablePoints(recording().points);
  const search = periodSearch(usable, { minPeriod: 1.5, maxPeriod: 100 });

  test('the search over 1.5-100 days finds the planet', () => {
    // Step 8's validate() rejects anything more than 0.02 d from 4.2309.
    expect(search.bestPeriod).toBeCloseTo(4.2309, 3);
    expect(search.best.K).toBeCloseTo(56.7, 0);
    expect(search.weighting).toBe('inverseVariance');
  });

  test('the period is unambiguous despite the window function', () => {
    // Step 6 teaches that gaps make aliases; step 7 shows that here they lose.
    // If this margin ever collapses the lesson's framing is wrong, not just
    // its arithmetic.
    expect(search.minima[1].deltaChi2).toBeGreaterThan(1000);
  });

  test('agrees with the published period to about eleven seconds', () => {
    const seconds =
      (search.bestPeriod - PUBLISHED.catalogFit.periodDays) * 86400;
    // Step 9 asks for this number and accepts 11.2 +/- 5 s.
    expect(seconds).toBeGreaterThan(6.2);
    expect(seconds).toBeLessThan(16.2);
  });

  test('the reduced chi-square is about 6 on either convention, not about 1', () => {
    // Two divisors, both correct, and the lesson has to survive both. The
    // workspace panel scores the curve on the sliders, so nothing was
    // estimated from the data and its divisor is n: 257.3 / 43 = 5.98, which
    // is the number a student reads off the screen. periodSearch chose the
    // period against these same points, so it reports n - 4: 6.60. Step 10
    // accepts 6.3 +/- 1.8, which spans both. If these ever drift apart far
    // enough that one falls outside that window, the step is telling some
    // students they are wrong for reading the panel correctly.
    const asPanel = search.best.chi2 / usable.length;
    const asFit = search.best.chi2 / (usable.length - 4);
    expect(asPanel).toBeCloseTo(5.98, 1);
    expect(asFit).toBeCloseTo(6.6, 1);
    for (const value of [asPanel, asFit]) {
      expect(Math.abs(value - 6.3)).toBeLessThan(1.8);
    }
  });

  test('the residuals scatter by more than the quoted uncertainties', () => {
    const folded = foldOnPeriod(usable, search.best);
    const rms = Math.sqrt(
      folded.reduce((a, f) => a + f.residual ** 2, 0) / folded.length
    );
    const meanSigma = usable.reduce((a, p) => a + p.sigma, 0) / usable.length;
    expect(rms).toBeCloseTo(2.79, 0);
    expect(meanSigma).toBeCloseTo(1.13, 1);
    // The claim step 11 rests on: about two and a half times.
    expect(rms / meanSigma).toBeGreaterThan(2);
  });

  test('the seeded Monte Carlo excludes the published value', async () => {
    const report = await runMonteCarlo(
      {
        points: usable,
        params: search.best,
        minPeriod: 4.1,
        maxPeriod: 4.4,
        trials: 200,
        seed: '51peg',
      },
      { yieldTo: () => Promise.resolve() }
    );
    expect(report.ok).toBe(true);
    expect(report.outcome).toBe('complete');
    expect(report.period.p16).toBeLessThan(report.period.p84);

    // Steps 14 and 15 are built on this being false. If a change to the
    // resampler ever makes it true, the lesson is telling students to look for
    // something that is not there and these three steps have to be rewritten.
    const covers =
      PUBLISHED.catalogFit.periodDays >= report.period.p16 &&
      PUBLISHED.catalogFit.periodDays <= report.period.p84;
    expect(covers).toBe(false);

    // And the two numbers step 14 asks a student to copy out of the notebook,
    // in the units it asks for them in. The notebook writes the interval as a
    // value plus or minus half the 16th-84th span, so that is what is checked
    // here rather than the percentiles themselves.
    const halfWidth = ((report.period.p84 - report.period.p16) / 2) * 1e5;
    const offset =
      (report.period.median - PUBLISHED.catalogFit.periodDays) * 1e5;
    expect(halfWidth).toBeGreaterThan(0.75);
    expect(halfWidth).toBeLessThan(2.35);
    expect(Math.abs(offset)).toBeGreaterThan(7);
    expect(Math.abs(offset)).toBeLessThan(19);
    // "About eight of your own error bars away" - the line step 14 prints and
    // step 15 argues from.
    expect(Math.abs(offset / halfWidth)).toBeGreaterThan(3);
  }, 30000);

  test('the same seed gives the same interval twice', async () => {
    const spec = {
      points: usable,
      params: search.best,
      minPeriod: 4.1,
      maxPeriod: 4.4,
      trials: 100,
      seed: '51peg',
    };
    const hooks = { yieldTo: () => Promise.resolve() };
    const a = await runMonteCarlo(spec, hooks);
    const b = await runMonteCarlo(spec, hooks);
    expect(a.period.median).toBe(b.period.median);
    expect(a.period.p16).toBe(b.period.p16);
    expect(a.period.p84).toBe(b.period.p84);
  }, 30000);
});

describe('the lesson wiring', () => {
  test('every step that needs the data names a dataset that exists', () => {
    const named = LESSON.steps
      .filter(s => s.observed)
      .map(s => s.observed.dataset);
    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(id).toBe('51peg');
  });

  test('opens on the data before it asks anything about it', () => {
    const first = LESSON.steps.findIndex(s => s.observed);
    const firstMeasure = LESSON.steps.findIndex(s => s.type === 'measure');
    expect(first).toBeLessThan(firstMeasure);
  });

  test('is labeled as an observation rather than a scenario', () => {
    expect(recording().config.scheduleKind).toBe('observed');
  });
});
