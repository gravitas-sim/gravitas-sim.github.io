// =============================================================================
// The observing schedule's controls
// -----------------------------------------------------------------------------
// The prose and the arithmetic behind the schedule fields in the Radial
// Velocity panel: what the plan came out as, what it refused to read, which
// fields the chosen shapes need, and how a comparison of two schedules reads.
//
// A separate module because js/radialVelocity.js is in the start-up download
// and this is not needed until somebody switches the synthetic observing run
// on. The panel imports it alongside js/rvSurvey.js, which the same tick of
// the same checkbox already pays for, and everything here is written to be
// called with a context rather than to reach for the panel's state - so the
// panel keeps its own DOM writing and this keeps the strings.
// =============================================================================

import { t } from './i18n/index.js';
import { formatNumber } from './format.js';
import {
  SCHEDULE_PROBLEM,
  parseEpochList,
  parseGaps,
  planSchedule,
  scheduleFingerprint,
} from './rvSchedule.js';

/**
 * The period range both arms are searched over.
 *
 * One range for both arms. Two arms searched over two ranges would differ in
 * their search as well as in their times, and a difference in the answer could
 * not be attributed to either.
 *
 * The long end is the longer of the two spans: a period that never completes a
 * cycle inside the run has not been observed to repeat.
 *
 * The short end is deliberately generous - a hundredth of the span, or twice
 * the tightest spacing if that is shorter still - and NOT any kind of Nyquist
 * limit on the spacing. That would be the one choice that makes this whole
 * comparison pointless. Unevenly sampled data has no Nyquist limit, and the
 * advantage an irregular schedule has over a comb is exactly that it can
 * recover a period shorter than the comb's mean spacing; a range starting at
 * twice that spacing would have excluded the answer from the search before
 * either arm was fitted, and both arms would then have agreed, wrongly, that
 * there was nothing there.
 *
 * @param {Array<Array<object>>} sets - The two arms' measurements
 * @returns {?{minPeriod: number, maxPeriod: number}} The bounds
 */
export function comparisonBounds(sets) {
  const spans = [];
  let tightest = Infinity;
  for (const set of sets) {
    const days = (set || [])
      .map(m => Number(m.day))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (days.length < 2) continue;
    spans.push(days[days.length - 1] - days[0]);
    for (let i = 1; i < days.length; i++) {
      const gap = days[i] - days[i - 1];
      if (gap > 0 && gap < tightest) tightest = gap;
    }
  }
  if (!spans.length || !Number.isFinite(tightest)) return null;
  const maxPeriod = Math.max(...spans);
  const minPeriod = Math.max(1e-3, Math.min(2 * tightest, maxPeriod / 100));
  if (!(maxPeriod > minPeriod)) return null;
  return { minPeriod, maxPeriod };
}

/**
 * How many observations a shaped schedule makes.
 *
 * Defaults to the number the cadence and baseline would have produced, which
 * is what makes switching shape a controlled change: the reader gets the same
 * number of observations over the same span, placed differently, rather than a
 * different programme.
 *
 * @param {object} fields - {epochs, cadenceDays, baselineDays}
 * @returns {number} The count
 */
export function epochCount({ epochs, cadenceDays, baselineDays }) {
  const typed = Number(epochs);
  if (Number.isFinite(typed) && typed >= 2) return Math.trunc(typed);
  const cadence = Number(cadenceDays);
  const baseline = Number(baselineDays);
  if (!(cadence > 0) || !(baseline >= 0)) return 12;
  return Math.max(2, Math.floor(baseline / cadence) + 1);
}

/**
 * The schedule half of the observing configuration.
 *
 * Only reached once a shape, a gap or a comparison has been asked for; a plain
 * cadence run never comes here at all and takes the path it always took.
 *
 * @param {object} raw - What the controls say
 * @returns {object} The schedule fields for js/rvSurvey.js
 */
export function scheduleConfig(raw) {
  return {
    kind: raw.kind,
    epochs: epochCount(raw),
    jitter: Number(raw.jitter),
    clusters: Number(raw.clusters),
    explicit: parseEpochList(raw.epochList ?? '').offsets,
    gaps: parseGaps(raw.gapsText ?? '').gaps,
  };
}

/**
 * Problems that mean the run would not be the run the reader described.
 *
 * A duplicate time and an over-long list are reported and then observed
 * anyway: merging two entries at one instant is what a schedule IS, and the
 * length limit is the instrument protecting itself, with the discarded count
 * stated. Everything else changes which instants get observed, and observing
 * them while telling the student their own list was used is the failure this
 * whole feature exists to prevent - so the run does not start.
 */
const FATAL = new Set([
  SCHEDULE_PROBLEM.UNREADABLE,
  SCHEDULE_PROBLEM.DECIMAL_COMMA,
  SCHEDULE_PROBLEM.NEGATIVE,
  SCHEDULE_PROBLEM.TOO_FEW,
  SCHEDULE_PROBLEM.GAP_SYNTAX,
  SCHEDULE_PROBLEM.GAP_ORDER,
  SCHEDULE_PROBLEM.GAP_RANGE,
  SCHEDULE_PROBLEM.UNUSABLE,
]);

/**
 * Whether the schedule in the controls can be observed as described.
 *
 * @param {object} ctx - The same context scheduleNote() takes
 * @returns {{runnable: boolean, problems: Array<object>}} The verdict
 */
export function scheduleFault(ctx) {
  const problems = [];
  if ((ctx.kind || 'regular') === 'explicit') {
    problems.push(...parseEpochList(ctx.epochList ?? '').problems);
  }
  const gapsText = String(ctx.gapsText ?? '').trim();
  if (gapsText) problems.push(...parseGaps(gapsText).problems);
  const cfg = ctx.config || {};
  if (cfg.kind) {
    problems.push(
      ...planSchedule({
        kind: cfg.kind,
        epochs: cfg.epochs,
        baselineDays: cfg.baselineDays,
        jitter: cfg.jitter,
        clusters: cfg.clusters,
        explicit: cfg.explicit,
        gaps: cfg.gaps,
        seed: cfg.seed,
      }).problems
    );
  }
  return {
    runnable: !problems.some(p => FATAL.has(p.id)),
    problems,
  };
}

/**
 * Build the comparison of two finished arms.
 *
 * The arithmetic and the held-constant bookkeeping, kept out of the start-up
 * download with the rest of this module. The caller owns the generation guard:
 * it decides whether the answer is still wanted by the time it arrives.
 *
 * @param {object} ctx - {lib, armA, armB, bounds, target}
 * @returns {?object} The comparison, or null without usable bounds
 */
export function buildComparison(ctx) {
  const { lib, armA, armB, bounds } = ctx;
  if (!bounds) return null;
  const a = armA.config;
  const b = armB.config;
  return lib.compareSchedules(
    {
      label: 'A',
      kind: a.kind ?? 'regular',
      plan: a.plan,
      measurements: armA.measurements(),
    },
    {
      label: 'B',
      kind: b.kind ?? 'regular',
      plan: b.plan,
      measurements: armB.measurements(),
    },
    {
      ...bounds,
      held: {
        sigmaMs: { a: a.sigmaMs, b: b.sigmaMs },
        seed: { a: a.seed, b: b.seed },
        // Both arms observed the same frames of the same world, so the system
        // is the same by construction; it is stated rather than assumed so the
        // check is a check.
        system: { a: ctx.target ?? null, b: ctx.target ?? null },
      },
    }
  );
}

/**
 * What the note under the schedule fields should say.
 *
 * @param {object} ctx - {kind, epochList, gapsText, config}
 * @returns {{text: string, state: string}} The note and whether it is a warning
 */
export function scheduleNote(ctx) {
  const kind = ctx.kind || 'regular';
  const parts = [];
  let state = 'ok';
  /** Every fault, from the parsers and from the plan, in one list. */
  const problems = [];

  // What the reader typed and this could not use. Reported rather than
  // dropped: observing on a shorter list than somebody wrote, silently, is the
  // one failure that would undermine the whole instrument.
  if (kind === 'explicit') {
    problems.push(...parseEpochList(ctx.epochList ?? '').problems);
  }
  const gapsText = String(ctx.gapsText ?? '').trim();
  if (gapsText) problems.push(...parseGaps(gapsText).problems);

  // What the plan actually came out as, which is not always what was asked
  // for: a gap removes epochs, and a clustered plan can only place so many.
  const cfg = ctx.config || {};
  let plan = null;
  if (cfg.kind) {
    plan = planSchedule({
      kind: cfg.kind,
      epochs: cfg.epochs,
      baselineDays: cfg.baselineDays,
      jitter: cfg.jitter,
      clusters: cfg.clusters,
      explicit: cfg.explicit,
      gaps: cfg.gaps,
      seed: cfg.seed,
    });
    problems.push(...plan.problems);
  }

  for (const problem of problems) {
    parts.push(
      t(`rvsched.problem.${problem.id}`, {
        count: problem.count ?? 0,
        limit: problem.limit ?? 0,
        list: (problem.list || []).join(', '),
      })
    );
    state = 'warn';
  }

  if (plan && plan.epochs.length) {
    parts.push(
      t('rvsched.note.plan', {
        planned: plan.planned,
        span: formatNumber(plan.span, { sig: 3 }),
        id: scheduleFingerprint(plan),
      })
    );
    if (plan.dropped)
      parts.push(t('rvsched.note.dropped', { count: plan.dropped }));
    if (plan.planned < 4) state = 'warn';
  } else if (plan) {
    // Nothing to observe. Said plainly, because the alternative the panel used
    // to take was to observe something else and not mention it.
    parts.push(t('rvsched.note.willNotRun'));
    state = 'warn';
  }

  return { text: parts.join(' '), state, ok: problems.length === 0 };
}

/**
 * What the comparison block should say.
 *
 * @param {object} ctx - {report, bounds, progress: {a, b, planned}}
 * @returns {{text: string, state: string}} The block and whether it is a warning
 */
export function comparisonText(ctx) {
  const compareReport = ctx.report;
  const compareBounds = ctx.bounds;
  if (!compareReport) {
    return {
      text: t('rvsched.compare.waiting', {
        a: ctx.progress?.a ?? 0,
        b: ctx.progress?.b ?? 0,
        planned: ctx.progress?.planned ?? 0,
      }),
      state: 'ok',
    };
  }

  const [a, b] = compareReport.arms;
  const line = arm =>
    t('rvsched.compare.arm', {
      kind: t(`rvsched.shape.${arm.kind}`),
      // What the fit was computed from, which is not the number of rows the
      // run produced: an epoch that came back without a velocity is a row and
      // not an observation.
      used: arm.used,
      planned: arm.planned ?? arm.attempted,
      period: arm.fit ? formatNumber(arm.fit.periodDays, { sig: 4 }) : '—',
      k: arm.fit?.amplitudeMs
        ? formatNumber(arm.fit.amplitudeMs, { sig: 3 })
        : '—',
      hole: arm.coverage
        ? formatNumber(arm.coverage.largestGap * 100, { sig: 2 })
        : '—',
      alias: formatNumber((arm.window?.worstPeak ?? 0) * 100, { sig: 2 }),
    });

  const parts = [line(a), line(b)];

  // What each arm lost, and to what. Silence here would let a run that was
  // fitted on half its nights read exactly like one that got them all.
  for (const arm of [a, b]) {
    const lost = [];
    if (arm.notReached)
      lost.push(t('rvsched.compare.lost.notReached', { n: arm.notReached }));
    if (arm.missed)
      lost.push(t('rvsched.compare.lost.missed', { n: arm.missed }));
    if (arm.excluded?.degraded && !arm.excluded.degradedKept)
      lost.push(
        t('rvsched.compare.lost.degraded', { n: arm.excluded.degraded })
      );
    const other =
      (arm.excluded?.notFinite ?? 0) + (arm.excluded?.badSigma ?? 0);
    if (other) lost.push(t('rvsched.compare.lost.unusable', { n: other }));
    if (lost.length) {
      parts.push(
        t('rvsched.compare.lost', {
          kind: t(`rvsched.shape.${arm.kind}`),
          list: lost.join(', '),
        })
      );
    }
  }

  // The window of the times that were fitted is not the window of the times
  // that were planned once anything has been lost, and the second is the one a
  // proposal was argued from.
  for (const arm of [a, b]) {
    const planned = arm.plannedWindow?.worstPeak;
    const observed = arm.window?.worstPeak;
    if (!Number.isFinite(planned) || !Number.isFinite(observed)) continue;
    if (Math.abs(planned - observed) < 0.01) continue;
    parts.push(
      t('rvsched.compare.windowMoved', {
        kind: t(`rvsched.shape.${arm.kind}`),
        planned: formatNumber(planned * 100, { sig: 2 }),
        observed: formatNumber(observed * 100, { sig: 2 }),
      })
    );
  }

  // The range both arms were searched over. A period is only ever "the best
  // fit in this range", and a reader who cannot see the range cannot tell a
  // measurement from a boundary.
  if (compareBounds) {
    parts.push(
      t('rvsched.compare.range', {
        min: formatNumber(compareBounds.minPeriod, { sig: 3 }),
        max: formatNumber(compareBounds.maxPeriod, { sig: 4 }),
      })
    );
  }

  if (!compareReport.controls.controlled) {
    parts.push(
      t('rvsched.compare.uncontrolled', {
        list: compareReport.controls.broken
          .map(x => t(`rvsched.compare.control.${x.control}`))
          .join(', '),
      })
    );
  } else if (compareReport.periods) {
    parts.push(
      compareReport.periods.agree
        ? t('rvsched.compare.agree', {
            tolerance: formatNumber(compareReport.periods.toleranceDays, {
              sig: 2,
            }),
          })
        : t('rvsched.compare.disagree', {
            difference: formatNumber(compareReport.periods.differenceDays, {
              sig: 3,
            }),
          })
    );
  }

  // A fit that came back on the edge of its search is the range's answer, not
  // the star's, and two of them agree about nothing at all.
  if (compareReport.caveats.includes('atBound')) {
    parts.push(t('rvsched.compare.atBound'));
  }

  if (compareReport.alias) {
    parts.push(
      t('rvsched.compare.alias', {
        period: formatNumber(compareReport.alias.periodDays, { sig: 3 }),
        side: compareReport.alias.side === 'a' ? 'A' : 'B',
      })
    );
  }

  // The caveat that can never be dropped: one draw each says what happened
  // this time, not which schedule is better.
  parts.push(t('rvsched.compare.oneDraw'));

  return {
    text: parts.join(' '),
    state: compareReport.interpretable ? 'ok' : 'warn',
  };
}

/**
 * Which of the schedule fields the chosen shapes need.
 *
 * @param {object} ctx - {kind, kindB, comparing, gapsText}
 * @returns {object} A hidden flag per field
 */
export function fieldVisibility(ctx) {
  const kind = ctx.kind || 'regular';
  const comparing = Boolean(ctx.comparing);
  // Both arms read the shape-specific fields from the same controls, which is
  // what keeps everything but the shape held equal - so a field is wanted when
  // EITHER arm needs it.
  const kindB = comparing ? ctx.kindB || '' : '';
  const wants = shape => kind === shape || kindB === shape;
  // The count is on show whenever the run has a plan rather than only a
  // cadence: a shape needs it, a comparison holds it constant, and a gap turns
  // a cadence into a plan whose count the reader can no longer work out from
  // the spacing.
  const gapped = Boolean(String(ctx.gapsText ?? '').trim());
  return {
    epochs: kind === 'regular' && !comparing && !gapped,
    jitter: !wants('irregular'),
    clusters: !wants('clustered'),
    epochList: !wants('explicit'),
    compareShape: !comparing,
  };
}
