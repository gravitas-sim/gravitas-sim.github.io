import { describe, test, expect } from '@jest/globals';
import {
  DEFAULT_JITTER,
  SCHEDULE,
  SCHEDULE_KINDS,
  SCHEDULE_LIMITS,
  SCHEDULE_PROBLEM,
  formatEpochList,
  formatGaps,
  parseEpochList,
  parseGaps,
  phaseCoverageDetail,
  planSchedule,
  scheduleFingerprint,
  spectralWindow,
} from '../js/rvSchedule.js';

/** Every shape, built from the same count and baseline. */
const shapes = (epochs, baselineDays, over = {}) =>
  Object.fromEntries(
    [SCHEDULE.REGULAR, SCHEDULE.IRREGULAR, SCHEDULE.CLUSTERED].map(kind => [
      kind,
      planSchedule({ kind, epochs, baselineDays, seed: 'sch', ...over }),
    ])
  );

const offsetsOf = plan => plan.epochs.map(e => e.offset);

describe('reading a list of times', () => {
  test('it takes commas, spaces, semicolons and newlines', () => {
    expect(parseEpochList('0, 1.5 2.5;3\n4').offsets).toEqual([
      0, 1.5, 2.5, 3, 4,
    ]);
  });

  test('anything unreadable is returned rather than dropped', () => {
    // Silently observing on a shorter schedule than somebody typed is the one
    // behaviour that would be worse than refusing.
    const out = parseEpochList('0 1 oops 2 -3 NaN');
    expect(out.offsets).toEqual([0, 1, 2]);
    expect(out.rejected).toEqual(['oops', '-3', 'NaN']);
  });

  test('times are sorted and coincident ones are merged', () => {
    const out = parseEpochList('3 1 2 1');
    expect(out.offsets).toEqual([1, 2, 3]);
    expect(out.duplicates).toBe(1);
  });

  test('too short a list is not ok, and says so rather than throwing', () => {
    expect(parseEpochList('').ok).toBe(false);
    expect(parseEpochList('4').ok).toBe(false);
    expect(parseEpochList('4 5').ok).toBe(true);
  });

  test('the list is capped', () => {
    const many = Array.from({ length: 900 }, (_, i) => i * 0.1).join(' ');
    expect(parseEpochList(many).offsets).toHaveLength(
      SCHEDULE_LIMITS.maxEpochs
    );
  });

  test('it round-trips through the text field', () => {
    const offsets = [0, 1.25, 3.5, 7];
    expect(parseEpochList(formatEpochList(offsets)).offsets).toEqual(offsets);
  });
});
describe('a schedule the instrument cannot honour is refused, not adjusted', () => {
  test('a decimal comma is ambiguous and is named as such', () => {
    // "0,5 1,5" would silently become three observations at 0, 1 and 5. The
    // comma is the list separator in both languages this ships in, so the
    // decimal comma cannot be told from a list and is not guessed at.
    const out = parseEpochList('0,5 1,5');
    expect(out.ok).toBe(false);
    expect(out.problems.map(p => p.id)).toContain(
      SCHEDULE_PROBLEM.DECIMAL_COMMA
    );
  });

  test('a full stop is the decimal point, and it works', () => {
    const out = parseEpochList('0.5, 1.5, 2.25');
    expect(out.ok).toBe(true);
    expect(out.offsets).toEqual([0.5, 1.5, 2.25]);
  });

  test('times before the run are a different mistake from unreadable ones', () => {
    const out = parseEpochList('0 1 oops -3 2');
    const ids = out.problems.map(p => p.id);
    expect(ids).toContain(SCHEDULE_PROBLEM.UNREADABLE);
    expect(ids).toContain(SCHEDULE_PROBLEM.NEGATIVE);
    expect(out.offsets).toEqual([0, 1, 2]);
  });

  test('entries past the limit are discarded and counted', () => {
    // Observing the first four hundred of six hundred times without saying so
    // is the same failure as dropping the unreadable ones, one order of
    // magnitude quieter.
    const many = Array.from({ length: 500 }, (_, i) => i * 0.1);
    const out = parseEpochList(many.join(' '));
    expect(out.offsets).toHaveLength(SCHEDULE_LIMITS.maxEpochs);
    expect(out.discarded).toBe(500 - SCHEDULE_LIMITS.maxEpochs);
    const limit = out.problems.find(p => p.id === SCHEDULE_PROBLEM.OVER_LIMIT);
    expect(limit.count).toBe(100);
    expect(limit.limit).toBe(SCHEDULE_LIMITS.maxEpochs);
    expect(out.ok).toBe(false);
  });

  test('too few times is reported rather than padded', () => {
    const out = parseEpochList('3');
    expect(out.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.TOO_FEW);
    expect(out.ok).toBe(false);
  });
});

describe('gap syntax is checked whole', () => {
  test('a leading minus is not a separator', () => {
    // "-1-2" was accepted as the interval [1, 2]: the minus vanished into the
    // dash split and a gap nobody asked for was applied to the run.
    const out = parseGaps('-1-2');
    expect(out.gaps).toEqual([]);
    expect(out.ok).toBe(false);
    expect(out.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.GAP_SYNTAX);
  });

  test('an en dash is still a dash, and decimals still work', () => {
    const out = parseGaps('4-9, 15\u201316.5');
    expect(out.ok).toBe(true);
    expect(out.gaps).toEqual([
      [4, 9],
      [15, 16.5],
    ]);
  });

  test('a gap has to end after it starts', () => {
    const out = parseGaps('9-4');
    expect(out.gaps).toEqual([]);
    expect(out.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.GAP_ORDER);
  });

  test('a gap cannot run past the longest baseline there is', () => {
    const out = parseGaps(`1-${SCHEDULE_LIMITS.maxBaselineDays + 10}`);
    expect(out.gaps).toEqual([]);
    expect(out.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.GAP_RANGE);
  });

  test('gaps past the limit are discarded and counted', () => {
    const many = Array.from(
      { length: SCHEDULE_LIMITS.maxGaps + 3 },
      (_, i) => `${i * 2}-${i * 2 + 1}`
    ).join(', ');
    const out = parseGaps(many);
    expect(out.gaps).toHaveLength(SCHEDULE_LIMITS.maxGaps);
    expect(out.discarded).toBe(3);
    expect(out.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.OVER_LIMIT);
  });
});

describe('a schedule survives being written down and read back', () => {
  test('times round-trip through the field at their own precision', () => {
    // Three decimals turned 1.000499 into 1 and 2.9999 into 3, so a schedule
    // could be moved by a tenth of a day by being displayed.
    const times = [0, 0.123456, 1.000499, 2.9999, 17.5];
    const back = parseEpochList(formatEpochList(times));
    expect(back.ok).toBe(true);
    expect(back.offsets).toHaveLength(times.length);
    for (const [i, t] of times.entries()) {
      expect(back.offsets[i]).toBeCloseTo(t, 6);
    }
  });

  test('gaps round-trip too', () => {
    const gaps = [
      [1.25, 2.5],
      [8.0625, 9.125],
    ];
    const back = parseGaps(formatGaps(gaps));
    expect(back.ok).toBe(true);
    expect(back.gaps).toEqual(gaps);
  });

  test('a plan written out and read back plans the same times', () => {
    const plan = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 20,
      baselineDays: 33.3,
      seed: 'round-trip',
    });
    const back = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: parseEpochList(formatEpochList(offsetsOf(plan))).offsets,
      baselineDays: 33.3,
    });
    expect(scheduleFingerprint(back)).toBe(scheduleFingerprint(plan));
  });
});

describe('reading gaps', () => {
  test('hyphen and en dash both work', () => {
    // A reader who wrote this in a document and pasted it should not have to
    // know which dash they got.
    expect(parseGaps('4-9, 12–13.5').gaps).toEqual([
      [4, 9],
      [12, 13.5],
    ]);
  });

  test('a backwards or malformed range is rejected by name', () => {
    const out = parseGaps('9-4, 5, 6-7, x-y');
    expect(out.gaps).toEqual([[6, 7]]);
    expect(out.rejected).toEqual(['9-4', '5', 'x-y']);
    expect(out.ok).toBe(false);
  });

  test('gaps round-trip', () => {
    expect(parseGaps(formatGaps([[4, 9]])).gaps).toEqual([[4, 9]]);
  });
});

describe('the shapes share a count and a baseline', () => {
  test('all three place the same number of observations over the same span', () => {
    // The premise of the whole comparison activity: if N or the baseline
    // differed, any difference in what the schedules resolve would be
    // confounded with how much data they had.
    const plans = shapes(16, 15);
    for (const [kind, plan] of Object.entries(plans)) {
      expect(plan.planned).toBe(16);
      expect(plan.span).toBeCloseTo(15, 9);
      expect(offsetsOf(plan)[0]).toBe(0);
      expect(offsetsOf(plan).at(-1)).toBeCloseTo(15, 9);
      expect(plan.kind).toBe(kind);
    }
  });

  test('every schedule is sorted and strictly advancing', () => {
    for (const plan of Object.values(shapes(24, 30))) {
      const offsets = offsetsOf(plan);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
      }
    }
  });

  test('regular is evenly spaced, to the last bit', () => {
    const plan = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 11,
      baselineDays: 10,
    });
    expect(plan.minSpacing).toBeCloseTo(1, 12);
    expect(plan.maxSpacing).toBeCloseTo(1, 12);
  });

  test('irregular nudges the middle and pins the ends', () => {
    const regular = offsetsOf(
      planSchedule({ kind: SCHEDULE.REGULAR, epochs: 12, baselineDays: 11 })
    );
    const jittered = offsetsOf(
      planSchedule({
        kind: SCHEDULE.IRREGULAR,
        epochs: 12,
        baselineDays: 11,
        seed: 'j',
      })
    );
    expect(jittered[0]).toBe(regular[0]);
    expect(jittered.at(-1)).toBeCloseTo(regular.at(-1), 12);
    // The interior moved, but not by more than the jitter allows.
    const step = 11 / 11;
    let moved = 0;
    for (let i = 1; i < jittered.length - 1; i++) {
      const shift = Math.abs(jittered[i] - regular[i]);
      if (shift > 1e-9) moved++;
      expect(shift).toBeLessThanOrEqual(DEFAULT_JITTER * step + 1e-9);
    }
    expect(moved).toBeGreaterThan(6);
  });

  test('zero jitter is exactly the regular schedule', () => {
    expect(
      offsetsOf(
        planSchedule({
          kind: SCHEDULE.IRREGULAR,
          epochs: 10,
          baselineDays: 9,
          jitter: 0,
          seed: 'j',
        })
      )
    ).toEqual(
      offsetsOf(
        planSchedule({ kind: SCHEDULE.REGULAR, epochs: 10, baselineDays: 9 })
      )
    );
  });

  test('clustered makes tight groups with wide gaps between them', () => {
    const plan = planSchedule({
      kind: SCHEDULE.CLUSTERED,
      epochs: 15,
      baselineDays: 15,
      clusters: 3,
      tightDays: 0.1,
    });
    expect(plan.clusters).toBe(3);
    expect(plan.minSpacing).toBeCloseTo(0.1, 9);
    // The between-group gap is what makes it clustered at all.
    expect(plan.maxSpacing).toBeGreaterThan(plan.minSpacing * 10);
    // Exactly three runs of tight spacing.
    const wide = plan.spacings.filter(s => s > 0.5);
    expect(wide).toHaveLength(2);
  });

  test('an explicit list is used as given', () => {
    const plan = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: [0, 0.5, 4, 4.25, 20],
    });
    expect(offsetsOf(plan)).toEqual([0, 0.5, 4, 4.25, 20]);
    expect(plan.planned).toBe(5);
    expect(plan.span).toBe(20);
  });

  test('an empty explicit list refuses rather than substituting a comb', () => {
    // It used to fall back to a regular cadence, which is the one behaviour
    // this feature cannot have: the panel would tell the student their own
    // times were being used and observe on an evenly spaced comb instead.
    const plan = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: [],
      epochs: 6,
      baselineDays: 5,
    });
    expect(plan.planned).toBe(0);
    expect(plan.ok).toBe(false);
    expect(plan.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.UNUSABLE);
  });

  test('a single usable time is not a schedule either', () => {
    const plan = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: [2.5],
      epochs: 6,
      baselineDays: 5,
    });
    expect(plan.planned).toBe(0);
    expect(plan.problems.map(p => p.id)).toContain(SCHEDULE_PROBLEM.UNUSABLE);
  });

  test('a usable explicit list is used, and says so', () => {
    const plan = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: [0, 0.4, 1.1, 2.6],
      epochs: 6,
      baselineDays: 5,
    });
    expect(plan.ok).toBe(true);
    expect(plan.epochs.map(e => e.offset)).toEqual([0, 0.4, 1.1, 2.6]);
  });

  test('a configuration with no kind is the regular cadence, unchanged', () => {
    // Backward compatibility is not decoration here: existing lessons, share
    // links and tests all supply a cadence and no kind.
    const plan = planSchedule({ epochs: 12, baselineDays: 3.52 });
    expect(plan.kind).toBe(SCHEDULE.REGULAR);
    expect(plan.planned).toBe(12);
  });

  test('counts, jitter and cluster requests are clamped, not refused', () => {
    expect(planSchedule({ epochs: 0, baselineDays: 5 }).planned).toBe(
      SCHEDULE_LIMITS.minEpochs
    );
    expect(planSchedule({ epochs: 1e6, baselineDays: 5 }).planned).toBe(
      SCHEDULE_LIMITS.maxEpochs
    );
    expect(
      planSchedule({
        kind: SCHEDULE.IRREGULAR,
        epochs: 10,
        baselineDays: 9,
        jitter: 99,
        seed: 'j',
      }).jitter
    ).toBe(SCHEDULE_LIMITS.maxJitter);
    expect(
      planSchedule({
        kind: SCHEDULE.CLUSTERED,
        epochs: 20,
        baselineDays: 15,
        clusters: 999,
      }).clusters
    ).toBeLessThanOrEqual(SCHEDULE_LIMITS.maxClusters);
  });

  test('every kind the interface offers produces a plan', () => {
    for (const kind of SCHEDULE_KINDS) {
      const plan = planSchedule({
        kind,
        epochs: 8,
        baselineDays: 7,
        explicit: [0, 1, 2, 3],
        seed: 's',
      });
      expect(plan.planned).toBeGreaterThanOrEqual(SCHEDULE_LIMITS.minEpochs);
      expect(plan.epochs.every(e => Number.isFinite(e.offset))).toBe(true);
    }
  });
});

describe('an irregular schedule is reproducible', () => {
  test('the same seed gives the same times', () => {
    const one = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 14,
      baselineDays: 12,
      seed: 'lab-3',
    });
    const two = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 14,
      baselineDays: 12,
      seed: 'lab-3',
    });
    expect(offsetsOf(one)).toEqual(offsetsOf(two));
    expect(scheduleFingerprint(one)).toBe(scheduleFingerprint(two));
  });

  test('a different seed gives a different schedule', () => {
    const a = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 14,
      baselineDays: 12,
      seed: 'a',
    });
    const b = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 14,
      baselineDays: 12,
      seed: 'b',
    });
    expect(offsetsOf(a)).not.toEqual(offsetsOf(b));
    // But still the same count and baseline, so they remain comparable.
    expect(a.planned).toBe(b.planned);
    expect(a.span).toBeCloseTo(b.span, 9);
  });
});

describe('gaps remove observations without renumbering the rest', () => {
  test('the survivors keep the index the survey keys its noise by', () => {
    // The property this exists for: toggling a gap must change WHICH
    // observations exist and not the VALUE of any that remain. The survey
    // draws each epoch's noise from its index, so a gap that renumbered the
    // survivors would silently redraw the whole run.
    const base = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 16,
      baselineDays: 15,
    });
    const gapped = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 16,
      baselineDays: 15,
      gaps: [[4, 9]],
    });
    expect(gapped.dropped).toBe(5);
    expect(gapped.planned).toBe(11);
    expect(gapped.epochs.map(e => e.index)).toEqual([
      0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const before = new Map(base.epochs.map(e => [e.index, e.offset]));
    for (const e of gapped.epochs) expect(e.offset).toBe(before.get(e.index));
  });

  test('two gaps, and one that catches nothing', () => {
    const plan = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 11,
      baselineDays: 10,
      gaps: [
        [2, 4],
        [7, 8],
        [100, 200],
      ],
    });
    expect(plan.epochs.map(e => e.index)).toEqual([0, 1, 4, 5, 6, 8, 9, 10]);
  });

  test('a gap is half-open, so back-to-back gaps do not both claim a boundary', () => {
    const plan = planSchedule({
      kind: SCHEDULE.EXPLICIT,
      explicit: [0, 1, 2, 3, 4],
      gaps: [
        [1, 2],
        [2, 3],
      ],
    });
    // 1 and 2 are removed; 3 is the end of the second gap and survives.
    expect(plan.epochs.map(e => e.offset)).toEqual([0, 3, 4]);
  });

  test('a malformed gap is ignored rather than dropping everything', () => {
    const plan = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 6,
      baselineDays: 5,
      gaps: [[NaN, 3], [4, 2], 'nonsense', [1, 2]],
    });
    expect(plan.gaps).toEqual([[1, 2]]);
    expect(plan.planned).toBe(5);
  });

  test('gaps shorten the observed span and the plan says so', () => {
    const plan = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 11,
      baselineDays: 10,
      gaps: [[8, 20]],
    });
    expect(plan.baselineDays).toBe(10);
    // What was asked for and what was achieved are different numbers, and both
    // are reported: a reader comparing two runs needs the achieved one.
    expect(plan.span).toBeLessThan(10);
    expect(plan.span).toBe(7);
  });

  test('the fingerprint moves when the plan does and not otherwise', () => {
    const a = planSchedule({ epochs: 12, baselineDays: 11 });
    const b = planSchedule({ epochs: 12, baselineDays: 11 });
    const c = planSchedule({ epochs: 12, baselineDays: 11, gaps: [[3, 5]] });
    expect(scheduleFingerprint(a)).toBe(scheduleFingerprint(b));
    expect(scheduleFingerprint(a)).not.toBe(scheduleFingerprint(c));
  });
});

describe('phase coverage', () => {
  test('a regular schedule on a commensurate period covers almost nothing', () => {
    // Twelve observations a day apart, folded on exactly two days: every one
    // lands on one of two phases. This is the failure the picture exists to
    // make visible.
    const detail = phaseCoverageDetail([0, 1, 2, 3, 4, 5, 6, 7], 2, 20);
    expect(detail.covered).toBe(2);
    expect(detail.n).toBe(8);
    expect(detail.largestGap).toBeGreaterThan(0.4);
  });

  test('the counts add up and the peak is the tallest bin', () => {
    const detail = phaseCoverageDetail([0, 0.5, 1, 1.5, 2.2, 3.1], 3.5, 10);
    expect(detail.counts.reduce((a, b) => a + b, 0)).toBe(6);
    expect(detail.peak).toBe(Math.max(...detail.counts));
    expect(detail.fraction).toBeCloseTo(detail.covered / 10, 12);
  });

  test('the largest hole is measured on the phases, not rounded to a bin', () => {
    // Two observations at phase 0 and 0.5 leave two holes of just under a
    // half. A bin-based answer would report the bin width instead.
    const detail = phaseCoverageDetail([0, 1.75], 3.5, 10);
    expect(detail.largestGap).toBeGreaterThan(0.45);
    expect(detail.largestGap).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  test('no period means no coverage rather than a made-up one', () => {
    expect(phaseCoverageDetail([0, 1], 0)).toBe(null);
    expect(phaseCoverageDetail([0, 1], NaN)).toBe(null);
    expect(phaseCoverageDetail([], 3)).toBe(null);
  });
});

describe('the sampling window', () => {
  test('it is one at zero frequency, by construction', () => {
    const w = spectralWindow([0, 1, 2.5, 4, 9]);
    expect(w.power[0]).toBeCloseTo(1, 12);
    expect(w.fMin).toBe(0);
  });

  test('it contains no data, only times', () => {
    // The correctness condition for calling this a sampling window at all:
    // the same times must give the same curve whatever the star is doing.
    // This is asserted by construction - the function takes only times - and
    // restated here because the usual mistake is to plot the periodogram of
    // the data and label it a window.
    const times = [0, 1, 2, 3, 5, 8];
    const once = spectralWindow(times);
    const again = spectralWindow([...times]);
    expect(once.power).toEqual(again.power);
    // It takes times and options, and there is no third argument a velocity
    // could arrive through.
    expect(spectralWindow.length).toBe(1);
    // And nothing in its body reads one. A structural check, because a later
    // "improvement" that weighted the window by the data would still return a
    // plausible curve - it just would not be a sampling window any more, and
    // the whole reason for plotting it is that it is the schedule alone.
    const body = String(spectralWindow);
    expect(body).not.toMatch(/\brv\b|velocit|\.value\b/i);
  });

  test('a regular comb has a near-perfect alias at one over its spacing', () => {
    const w = spectralWindow(
      Array.from({ length: 16 }, (_, i) => i * 1.0),
      { fMax: 3, samples: 1200 }
    );
    expect(w.peaks.length).toBeGreaterThan(0);
    // The 1/day alias, and it is almost as tall as the central peak: the
    // schedule cannot tell a one-day signal from a constant.
    expect(w.peaks[0].frequency).toBeCloseTo(1, 1);
    expect(w.worstPeak).toBeGreaterThan(0.9);
  });

  test('nudging the same observations weakens that alias', () => {
    const regular = spectralWindow(offsetsOf(shapes(16, 15).regular), {
      fMax: 3,
      samples: 1200,
    });
    const irregular = spectralWindow(offsetsOf(shapes(16, 15).irregular), {
      fMax: 3,
      samples: 1200,
    });
    // Same count, same baseline, different placement - and the alias drops.
    expect(irregular.worstPeak).toBeLessThan(regular.worstPeak);
    // But it does NOT vanish, which is the point the lesson has to make:
    // irregular sampling helps some aliases and guarantees nothing.
    expect(irregular.worstPeak).toBeGreaterThan(0.2);
  });

  test('clustering trades the tight alias for one at the group spacing', () => {
    const plan = planSchedule({
      kind: SCHEDULE.CLUSTERED,
      epochs: 15,
      baselineDays: 15,
      clusters: 3,
      tightDays: 0.1,
    });
    const w = spectralWindow(offsetsOf(plan), { fMax: 3, samples: 1500 });
    // A strong peak near the between-group spacing rather than near the
    // within-group one: clustering does not remove aliasing, it moves it.
    expect(w.worstPeak).toBeGreaterThan(0.5);
    const between = plan.maxSpacing;
    expect(
      w.peaks.some(p => Math.abs(p.period - between) / between < 0.2)
    ).toBe(true);
  });

  test('fewer than two times has no window rather than a flat one', () => {
    expect(spectralWindow([])).toBe(null);
    expect(spectralWindow([3])).toBe(null);
  });

  test('the grid is bounded however wild the request', () => {
    const w = spectralWindow([0, 1, 2], { samples: 1e9, fMax: 1e9 });
    expect(w.samples).toBeLessThanOrEqual(4000);
    expect(w.frequencies).toHaveLength(w.samples);
    expect(w.power.every(Number.isFinite)).toBe(true);
  });

  test('coincident times do not divide by zero', () => {
    const w = spectralWindow([0, 0, 1]);
    expect(w).not.toBe(null);
    expect(w.power.every(Number.isFinite)).toBe(true);
  });
});
