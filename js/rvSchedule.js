// =============================================================================
// When to look
// -----------------------------------------------------------------------------
// A radial-velocity programme is decided by its schedule long before anybody
// looks at the data. The regular cadence js/rvSurvey.js started with - look
// every c days for b days - is the simplest schedule and the worst one for the
// question the lesson asks, because a regular comb has a comb for a sampling
// window and therefore an alias at every multiple of 1/c.
//
// This module is the schedule as a first-class thing: a list of times, however
// it was arrived at.
//
// Built from a count and a baseline, not from a cadence
// -----------------------------------------------------------------------------
// Every shape here takes the same two numbers - how many observations, and over
// how long - and places them differently. That is what makes the comparison
// activity honest: two schedules with the same N and the same baseline differ
// in *nothing but the placement*, so any difference in what they can resolve is
// caused by the placement. Deriving from a cadence instead makes N a function
// of the shape and the comparison a confound.
//
// The regular cadence still works exactly as it did: a configuration with no
// `kind` takes the old path, byte for byte, so every existing lesson, share
// link and test is unaffected.
//
// Gaps do not renumber the epochs
// -----------------------------------------------------------------------------
// js/rvSurvey.js keys its observing noise by epoch index, which is what makes a
// measurement's value a property of when it was scheduled rather than of when
// the browser got round to it. So a gap REMOVES epochs and leaves the survivors
// holding their original indices. Toggling a gap changes which observations
// exist and not the value of any that remain, and a student can therefore see
// what losing a week does without the rest of the run changing underneath them.
//
// The sampling window is the window, not the periodogram
// -----------------------------------------------------------------------------
// spectralWindow() below is |sum of exp(2 pi i f t_j)|^2 / N^2 over the
// observation TIMES alone. It contains no velocities, so it is a property of
// the schedule and of nothing else, and it is the thing that tells you which
// aliases a schedule cannot tell apart. Plotting the periodogram of the data
// and labelling it a window is the usual mistake and would defeat the point:
// that curve mixes the star and the schedule, and a student comparing two
// schedules needs the half that is only the schedule.
// =============================================================================

import { mulberry32, normalizeSeed } from './rng.js';

/** The shapes a schedule can take. */
export const SCHEDULE = Object.freeze({
  /** Evenly spaced. The comb, and the alias machine. */
  REGULAR: 'regular',
  /** Evenly spaced, then nudged. Breaks the comb without changing the plan. */
  IRREGULAR: 'irregular',
  /** A few tight groups, far apart. Good on short periods, blind between. */
  CLUSTERED: 'clustered',
  /** Whatever times the reader typed. */
  EXPLICIT: 'explicit',
});

/** In the order the interface offers them. */
export const SCHEDULE_KINDS = [
  SCHEDULE.REGULAR,
  SCHEDULE.IRREGULAR,
  SCHEDULE.CLUSTERED,
  SCHEDULE.EXPLICIT,
];

/** Bounds, so a text field cannot ask for a million epochs. */
export const SCHEDULE_LIMITS = Object.freeze({
  minEpochs: 2,
  maxEpochs: 400,
  maxGaps: 12,
  /** Two epochs closer than this are the same epoch as far as a plan goes. */
  minSpacingDays: 1e-4,
  maxBaselineDays: 3650,
  /** How far an irregular schedule may nudge an epoch, as a fraction of the
   *  regular spacing. Half would let neighbours swap places. */
  maxJitter: 0.45,
  minClusters: 2,
  maxClusters: 12,
});

/**
 * What can be wrong with a schedule somebody typed.
 *
 * Named rather than described, so the panel can say it in either language and
 * a test can assert on the fault rather than on the prose. Every one of these
 * is reported; none of them is quietly worked around, because a schedule the
 * instrument silently corrected is a schedule the student did not run.
 */
export const SCHEDULE_PROBLEM = Object.freeze({
  /** Tokens that are not numbers at all. */
  UNREADABLE: 'unreadable',
  /** A decimal comma, where a comma is the list separator. */
  DECIMAL_COMMA: 'decimalComma',
  /** Times before the run starts. */
  NEGATIVE: 'negative',
  /** Two entries at the same instant: one observation, however it was typed. */
  DUPLICATE: 'duplicate',
  /** Fewer usable entries than a schedule needs. */
  TOO_FEW: 'tooFew',
  /** More entries than the limit, so some were discarded. */
  OVER_LIMIT: 'overLimit',
  /** A gap that is not two numbers with a dash between them. */
  GAP_SYNTAX: 'gapSyntax',
  /** A gap whose end is not after its start. */
  GAP_ORDER: 'gapOrder',
  /** A gap outside the range a run can have. */
  GAP_RANGE: 'gapRange',
  /** An explicit schedule that cannot be observed as typed. */
  UNUSABLE: 'unusable',
});

/**
 * How precisely an epoch time is kept, in decimal places of a day.
 *
 * Under a tenth of a second. Shared by the planner and by the text field, so
 * a plan written out and read back is the same plan.
 */
export const EPOCH_DECIMALS = 6;

/** What an irregular schedule defaults to: noticeable, not chaotic. */
export const DEFAULT_JITTER = 0.35;

/** How many groups a clustered schedule defaults to. */
export const DEFAULT_CLUSTERS = 3;

const clampInt = (v, lo, hi, fallback) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

const clampNum = (v, lo, hi, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

/**
 * Read a list of observation times.
 *
 * Accepts whatever a reader is likely to paste: commas, spaces, newlines,
 * semicolons. Everything unreadable is returned in `rejected` rather than
 * dropped, so the panel can say "three of those were not numbers" instead of
 * silently observing on a shorter schedule than the reader typed.
 *
 * Times are days from the start of the run, and they are sorted and
 * de-duplicated: a schedule is a set of instants, and two epochs at the same
 * instant are one observation however they were typed.
 *
 * @param {string} text - As typed
 * @returns {{ok: boolean, offsets: Array<number>, rejected: Array<string>,
 *   duplicates: number}} The parse
 */
export function parseEpochList(text) {
  const raw = String(text ?? '');
  const problems = [];
  const note = (id, extra = {}) => problems.push({ id, ...extra });

  // A comma separates times here, in every language this ships in, so a
  // decimal comma is ambiguous rather than merely unusual: "0,5 1,5" would
  // silently become three observations at 0, 1 and 5 instead of two at 0.5 and
  // 1.5. Caught before the split, which is the only point at which the
  // evidence still exists, and refused rather than guessed at.
  const decimalCommas = raw.match(/\d,\d/g) || [];
  if (decimalCommas.length) {
    note(SCHEDULE_PROBLEM.DECIMAL_COMMA, { count: decimalCommas.length });
  }

  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const offsets = [];
  const rejected = [];
  const negatives = [];
  for (const token of tokens) {
    const n = Number(token);
    if (!Number.isFinite(n)) {
      rejected.push(token);
      continue;
    }
    // A time before the run starts is not a time in the run. Separated from
    // the unreadable ones because it is a different mistake with a different
    // correction.
    if (n < 0) {
      negatives.push(token);
      rejected.push(token);
      continue;
    }
    offsets.push(n);
  }
  if (rejected.length > negatives.length) {
    note(SCHEDULE_PROBLEM.UNREADABLE, {
      count: rejected.length - negatives.length,
      list: rejected.filter(t => !negatives.includes(t)).slice(0, 4),
    });
  }
  if (negatives.length) {
    note(SCHEDULE_PROBLEM.NEGATIVE, {
      count: negatives.length,
      list: negatives.slice(0, 4),
    });
  }

  offsets.sort((a, b) => a - b);
  const unique = [];
  let duplicates = 0;
  for (const offset of offsets) {
    const last = unique[unique.length - 1];
    if (last !== undefined && offset - last < SCHEDULE_LIMITS.minSpacingDays) {
      duplicates++;
      continue;
    }
    unique.push(offset);
  }
  if (duplicates) note(SCHEDULE_PROBLEM.DUPLICATE, { count: duplicates });

  // Truncation is reported. Observing the first four hundred of somebody's six
  // hundred times without saying so is the same failure as dropping the ones
  // that could not be read, one order of magnitude quieter.
  const kept = unique.slice(0, SCHEDULE_LIMITS.maxEpochs);
  const discarded = unique.length - kept.length;
  if (discarded) {
    note(SCHEDULE_PROBLEM.OVER_LIMIT, {
      count: discarded,
      limit: SCHEDULE_LIMITS.maxEpochs,
    });
  }
  if (kept.length < SCHEDULE_LIMITS.minEpochs) {
    note(SCHEDULE_PROBLEM.TOO_FEW, {
      count: kept.length,
      limit: SCHEDULE_LIMITS.minEpochs,
    });
  }

  return {
    /** Whether this list can be observed exactly as it was typed. */
    ok: problems.length === 0 && kept.length >= SCHEDULE_LIMITS.minEpochs,
    offsets: kept,
    rejected,
    duplicates,
    discarded,
    problems,
  };
}

/**
 * Render a list of times for the text field.
 *
 * Six decimals by default rather than three, and trailing zeros trimmed. The
 * field is a round trip - the panel writes a plan into it and reads the plan
 * back out - and three decimals is not enough to survive one: 1.000499 came
 * back as 1 and 2.9999 as 3, so a schedule could be moved by a tenth of a day
 * by being displayed. Six decimals is under a tenth of a second and well
 * inside the minimum spacing a plan will accept.
 *
 * @param {Array<number>} offsets - Days from the run start
 * @param {number} [decimals] - How much precision to show
 * @returns {string} The list
 */
export const formatEpochList = (offsets, decimals = EPOCH_DECIMALS) =>
  (offsets || []).map(v => Number(v.toFixed(decimals)).toString()).join(', ');

/**
 * Read a list of gaps, as `from-to` ranges in days from the run start.
 *
 * @param {string} text - As typed, e.g. "4-9, 15-16.5"
 * @returns {{ok: boolean, gaps: Array<Array<number>>, rejected: Array<string>}}
 */
export function parseGaps(text) {
  const raw = String(text ?? '');
  const problems = [];
  const note = (id, extra = {}) => problems.push({ id, ...extra });

  if (/\d,\d/.test(raw)) {
    note(SCHEDULE_PROBLEM.DECIMAL_COMMA, {
      count: (raw.match(/\d,\d/g) || []).length,
    });
  }

  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const gaps = [];
  const rejected = [];
  const outOfRange = [];
  const misordered = [];

  // The whole token, not its pieces. Splitting on the dash and keeping
  // whatever was left accepted "-1-2" as the interval [1, 2]: a leading minus
  // vanished into the separator and a gap the reader did not ask for was
  // silently applied to their run.
  const RANGE = /^(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+(?:\.\d+)?)$/;
  for (const token of tokens) {
    const m = RANGE.exec(token);
    if (!m) {
      rejected.push(token);
      continue;
    }
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      rejected.push(token);
      continue;
    }
    if (to <= from) {
      misordered.push(token);
      rejected.push(token);
      continue;
    }
    if (to > SCHEDULE_LIMITS.maxBaselineDays) {
      outOfRange.push(token);
      rejected.push(token);
      continue;
    }
    gaps.push([from, to]);
  }

  const plainlyUnreadable = rejected.filter(
    t => !misordered.includes(t) && !outOfRange.includes(t)
  );
  if (plainlyUnreadable.length) {
    note(SCHEDULE_PROBLEM.GAP_SYNTAX, {
      count: plainlyUnreadable.length,
      list: plainlyUnreadable.slice(0, 4),
    });
  }
  if (misordered.length) {
    note(SCHEDULE_PROBLEM.GAP_ORDER, {
      count: misordered.length,
      list: misordered.slice(0, 4),
    });
  }
  if (outOfRange.length) {
    note(SCHEDULE_PROBLEM.GAP_RANGE, {
      count: outOfRange.length,
      list: outOfRange.slice(0, 4),
      limit: SCHEDULE_LIMITS.maxBaselineDays,
    });
  }

  gaps.sort((a, b) => a[0] - b[0]);
  const kept = gaps.slice(0, SCHEDULE_LIMITS.maxGaps);
  const discarded = gaps.length - kept.length;
  if (discarded) {
    note(SCHEDULE_PROBLEM.OVER_LIMIT, {
      count: discarded,
      limit: SCHEDULE_LIMITS.maxGaps,
    });
  }

  return {
    ok: problems.length === 0,
    gaps: kept,
    rejected,
    discarded,
    problems,
  };
}

/** Render gaps back for the text field, at the precision they were set at. */
export const formatGaps = gaps =>
  (gaps || [])
    .map(([a, b]) => `${Number(a.toFixed(6))}-${Number(b.toFixed(6))}`)
    .join(', ');

/**
 * Where a regular schedule puts its observations.
 *
 * From N and the baseline, so the last epoch lands exactly on the baseline and
 * the spacing is baseline/(N-1). A cadence-derived plan is a special case:
 * js/rvSurvey.js converts one before calling in.
 *
 * @param {number} n - How many observations
 * @param {number} baseline - Days from first to last
 * @returns {Array<number>} Offsets
 */
function regularOffsets(n, baseline) {
  if (n < 2) return [0];
  const step = baseline / (n - 1);
  return Array.from({ length: n }, (_, i) => i * step);
}

/**
 * A regular schedule with every epoch nudged.
 *
 * Seeded, so the same seed gives the same schedule: an irregular plan a student
 * cannot reproduce is a plan they cannot compare against anybody else's. The
 * salt keeps this stream clear of the observing noise's, so changing the shape
 * of the schedule does not change the noise on the measurements.
 *
 * The first and last epochs are pinned. Nudging them would change the baseline,
 * and the comparison activity's whole premise is that two schedules share one.
 *
 * @param {number} n - How many observations
 * @param {number} baseline - Days from first to last
 * @param {number} jitter - Fraction of the regular spacing, up to maxJitter
 * @param {string|number} seed - The run seed
 * @returns {Array<number>} Offsets, sorted
 */
function irregularOffsets(n, baseline, jitter, seed) {
  const base = regularOffsets(n, baseline);
  if (n < 3) return base;
  const step = baseline / (n - 1);
  const amount = clampNum(jitter, 0, SCHEDULE_LIMITS.maxJitter, DEFAULT_JITTER);
  // A salt, so this stream is not the observing-noise stream. Without it,
  // switching from regular to irregular would redraw every measurement's error
  // as well as moving its epoch, and the comparison would confound the two.
  const rand = mulberry32((normalizeSeed(seed) ^ 0x5c4e21d3) >>> 0);
  const out = base.map((offset, i) => {
    if (i === 0 || i === n - 1) return offset;
    return offset + (rand() - 0.5) * 2 * amount * step;
  });
  out.sort((a, b) => a - b);
  return out;
}

/**
 * A clustered schedule: a few tight groups, spread over the baseline.
 *
 * The shape a real programme often has - a run of nights, then nothing until
 * the target is up again - and the one with the most interesting window: dense
 * within a group, so it resolves short periods, and blind between groups, so it
 * cannot tell some long ones apart at all.
 *
 * @param {number} n - How many observations in total
 * @param {number} baseline - Days from first to last
 * @param {number} clusters - How many groups
 * @param {number} tightDays - Spacing inside a group
 * @returns {Array<number>} Offsets, sorted
 */
function clusteredOffsets(n, baseline, clusters, tightDays) {
  const groups = clampInt(
    clusters,
    SCHEDULE_LIMITS.minClusters,
    Math.min(SCHEDULE_LIMITS.maxClusters, Math.max(2, Math.floor(n / 2))),
    DEFAULT_CLUSTERS
  );
  if (n < groups * 2) return regularOffsets(n, baseline);

  // Sizes as equal as N allows, remainder to the earliest groups.
  const per = Math.floor(n / groups);
  const extra = n % groups;
  const sizes = Array.from(
    { length: groups },
    (_, i) => per + (i < extra ? 1 : 0)
  );

  // The groups' starts are spread so the last observation of the last group
  // falls exactly on the baseline, which is what keeps the baseline equal to
  // the other shapes'.
  const lastSpan = (sizes[groups - 1] - 1) * tightDays;
  const reach = Math.max(0, baseline - lastSpan);
  const between = groups > 1 ? reach / (groups - 1) : 0;

  const out = [];
  for (let g = 0; g < groups; g++) {
    const start = g * between;
    for (let i = 0; i < sizes[g]; i++) out.push(start + i * tightDays);
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Whether an offset falls inside any gap.
 *
 * Half-open at the end, so two gaps written back to back do not both claim the
 * instant between them.
 */
const inGap = (offset, gaps) =>
  gaps.some(([from, to]) => offset >= from && offset < to);

/**
 * Turn a configuration into a plan.
 *
 * The plan is the schedule frozen: a list of `{index, offset}` where the index
 * is the epoch's place in the ungapped list and never moves. Everything else
 * here is derived from those offsets and is reported so a reader can see what
 * the shape actually produced rather than what it was asked for.
 *
 * @param {object} cfg - kind, epochs, baselineDays, jitter, clusters,
 *   tightDays, explicit, gaps, seed
 * @returns {object} The plan
 */
export function planSchedule(cfg = {}) {
  const kind = SCHEDULE_KINDS.includes(cfg.kind) ? cfg.kind : SCHEDULE.REGULAR;
  const baselineDays = clampNum(
    cfg.baselineDays,
    0,
    SCHEDULE_LIMITS.maxBaselineDays,
    3.52
  );
  const requested = clampInt(
    cfg.epochs,
    SCHEDULE_LIMITS.minEpochs,
    SCHEDULE_LIMITS.maxEpochs,
    12
  );
  const jitter = clampNum(
    cfg.jitter,
    0,
    SCHEDULE_LIMITS.maxJitter,
    DEFAULT_JITTER
  );
  const clusters = clampInt(
    cfg.clusters,
    SCHEDULE_LIMITS.minClusters,
    SCHEDULE_LIMITS.maxClusters,
    DEFAULT_CLUSTERS
  );
  // A tenth of the regular spacing unless asked otherwise: tight enough that a
  // group is clearly a group, wide enough that the frames can resolve it.
  const tightDays = clampNum(
    cfg.tightDays,
    SCHEDULE_LIMITS.minSpacingDays,
    baselineDays || 1,
    requested > 1 ? baselineDays / (requested - 1) / 10 : 0.1
  );

  const problems = [];
  let offsets;
  if (kind === SCHEDULE.EXPLICIT) {
    const supplied = Array.isArray(cfg.explicit) ? cfg.explicit : [];
    const usable = supplied
      .map(Number)
      .filter(v => Number.isFinite(v) && v >= 0)
      .sort((a, b) => a - b);
    offsets = usable.slice(0, SCHEDULE_LIMITS.maxEpochs);
    if (usable.length > offsets.length) {
      problems.push({
        id: SCHEDULE_PROBLEM.OVER_LIMIT,
        count: usable.length - offsets.length,
        limit: SCHEDULE_LIMITS.maxEpochs,
      });
    }
    // No substitution. A list that cannot be observed as typed produces a plan
    // with no epochs and a reason, and the caller refuses to run it. Falling
    // back to a regular cadence here meant the instrument told the student
    // their times had been used and then observed on a comb instead - the one
    // failure this whole feature exists to prevent.
    if (offsets.length < SCHEDULE_LIMITS.minEpochs) {
      problems.push({
        id: SCHEDULE_PROBLEM.UNUSABLE,
        count: offsets.length,
        limit: SCHEDULE_LIMITS.minEpochs,
      });
      offsets = [];
    }
  } else if (kind === SCHEDULE.IRREGULAR) {
    offsets = irregularOffsets(requested, baselineDays, jitter, cfg.seed);
  } else if (kind === SCHEDULE.CLUSTERED) {
    offsets = clusteredOffsets(requested, baselineDays, clusters, tightDays);
  } else {
    offsets = regularOffsets(requested, baselineDays);
  }

  // Quantised to the microday, which is under a tenth of a second and far
  // below anything this instrument can resolve.
  //
  // The reason is reproducibility rather than tidiness. The field this plan is
  // written into is a round trip - the panel shows the times and reads them
  // back - and an offset carrying seventeen significant digits does not
  // survive being written down. A schedule that changes when it is displayed
  // is not a schedule anyone can repeat, and the checksum said so by moving.
  offsets = offsets.map(v => Number(v.toFixed(EPOCH_DECIMALS)));

  const gaps = (Array.isArray(cfg.gaps) ? cfg.gaps : [])
    .filter(
      g =>
        Array.isArray(g) &&
        Number.isFinite(g[0]) &&
        Number.isFinite(g[1]) &&
        g[1] > g[0]
    )
    .slice(0, SCHEDULE_LIMITS.maxGaps);

  // The indices are assigned BEFORE the gaps are applied and are what the
  // survey keys its noise by. See the note at the top of this file.
  const all = offsets.map((offset, index) => ({ index, offset }));
  const epochs = gaps.length ? all.filter(e => !inGap(e.offset, gaps)) : all;

  const kept = epochs.map(e => e.offset);
  const spacings = [];
  for (let i = 1; i < kept.length; i++) spacings.push(kept[i] - kept[i - 1]);

  return {
    kind,
    epochs,
    /** Whether this plan is the plan that was asked for. */
    ok: problems.length === 0,
    /** Why it is not, when it is not. Empty when it is. */
    problems,
    /** How many the shape produced, before gaps. */
    generated: all.length,
    /** How many survive the gaps: the number of observations this plan makes. */
    planned: epochs.length,
    dropped: all.length - epochs.length,
    requested,
    baselineDays,
    /** From the first surviving epoch to the last, which a gap can shorten. */
    span: kept.length ? kept[kept.length - 1] - kept[0] : 0,
    gaps,
    jitter: kind === SCHEDULE.IRREGULAR ? jitter : null,
    clusters: kind === SCHEDULE.CLUSTERED ? clusters : null,
    tightDays: kind === SCHEDULE.CLUSTERED ? tightDays : null,
    spacings,
    minSpacing: spacings.length ? Math.min(...spacings) : 0,
    maxSpacing: spacings.length ? Math.max(...spacings) : 0,
    medianSpacing: spacings.length
      ? [...spacings].sort((a, b) => a - b)[Math.floor(spacings.length / 2)]
      : 0,
  };
}

/**
 * A short checksum over the times a plan will observe at.
 *
 * Over the offsets and their indices, so a plan that lost an epoch to a gap
 * hashes differently from one that never had it. Used to freeze the schedule
 * into a recording's provenance: a reader can tell whether two exports came
 * from the same plan without comparing four hundred numbers.
 *
 * FNV-1a. Not cryptographic - it makes a changed schedule visible, it does not
 * prove anything about who changed it.
 *
 * @param {object} plan - From planSchedule
 * @returns {string} Checksum
 */
export function scheduleFingerprint(plan) {
  const text = (plan?.epochs || [])
    .map(e => `${e.index}:${e.offset.toPrecision(12)}`)
    .join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

/**
 * How much of the orbital cycle a set of times actually samples.
 *
 * Richer than the count in js/rvSurvey.js because the picture needs the shape:
 * which bins were hit, how many times each, and the largest stretch of phase
 * nobody looked at. That last number is the one that matters - a run that
 * covers nine tenths of a cycle in nine bins and misses the tenth has a hole
 * where the maximum might be.
 *
 * @param {Array<number>} days - Observation times
 * @param {number} periodDays - The period being folded on
 * @param {number} [bins] - How finely to divide the cycle
 * @returns {?object} The coverage, or null without a period to fold on
 */
export function phaseCoverageDetail(days, periodDays, bins = 20) {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return null;
  const times = (days || []).filter(Number.isFinite);
  if (!times.length) return null;

  const counts = new Array(bins).fill(0);
  const phases = [];
  for (const t of times) {
    let phase = (t / periodDays) % 1;
    if (phase < 0) phase += 1;
    phases.push(phase);
    counts[Math.min(bins - 1, Math.floor(phase * bins))]++;
  }

  // The largest unobserved arc, measured on the phases themselves rather than
  // on the bins: binning would round a gap down to the bin width and report a
  // hole smaller than the one that is there.
  phases.sort((a, b) => a - b);
  let largestGap = phases[0] + (1 - phases[phases.length - 1]);
  let gapStart = phases[phases.length - 1];
  for (let i = 1; i < phases.length; i++) {
    const gap = phases[i] - phases[i - 1];
    if (gap > largestGap) {
      largestGap = gap;
      gapStart = phases[i - 1];
    }
  }

  const covered = counts.filter(c => c > 0).length;
  return {
    bins,
    counts,
    covered,
    fraction: covered / bins,
    n: times.length,
    largestGap,
    gapStart,
    peak: Math.max(...counts),
  };
}

/**
 * The spectral window of a set of observation times.
 *
 * W(f) = (1/N) sum_j exp(2 pi i f t_j),  and this returns |W(f)|^2.
 *
 * A property of the TIMES and nothing else - no velocities go in, so the curve
 * says what the schedule can and cannot distinguish regardless of what is
 * being observed. W(0) is exactly 1 by construction, and every other peak is a
 * frequency at which the schedule cannot tell one signal from another: a comb
 * with spacing c has a peak at every multiple of 1/c, which is precisely why a
 * regular cadence aliases.
 *
 * @param {Array<number>} days - Observation times
 * @param {object} [opts] - fMin, fMax (cycles/day), samples
 * @returns {?object} frequencies, power, and the peaks away from zero
 */
export function spectralWindow(days, opts = {}) {
  const times = (days || []).filter(Number.isFinite);
  if (times.length < 2) return null;

  const span = Math.max(...times) - Math.min(...times);
  const fMin = clampNum(opts.fMin, 0, 1e4, 0);
  // Out to a few times the Nyquist-ish frequency of the closest pair, so the
  // first alias peaks are on screen. A window plotted only to 1/baseline shows
  // nothing but the central peak.
  const spacings = [];
  const sorted = [...times].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++)
    spacings.push(sorted[i] - sorted[i - 1]);
  const tightest = spacings.length ? Math.min(...spacings) : span || 1;
  const fMax = clampNum(
    opts.fMax,
    fMin + 1e-6,
    1e4,
    2 / Math.max(tightest, 1e-6)
  );
  const samples = clampInt(opts.samples, 64, 4000, 900);

  // Referenced to the first observation, so the window does not depend on
  // where the clock happened to be zeroed. |W| is invariant to that shift
  // anyway; doing it explicitly keeps the arithmetic well conditioned when the
  // times are large.
  const t0 = sorted[0];
  const frequencies = new Array(samples);
  const power = new Array(samples);
  for (let i = 0; i < samples; i++) {
    const f = fMin + ((fMax - fMin) * i) / (samples - 1);
    let re = 0;
    let im = 0;
    for (const t of times) {
      const angle = 2 * Math.PI * f * (t - t0);
      re += Math.cos(angle);
      im += Math.sin(angle);
    }
    frequencies[i] = f;
    power[i] = (re * re + im * im) / (times.length * times.length);
  }

  // Local maxima above a tenth of the central peak, ignoring the peak at zero
  // itself, which is always 1 and says nothing.
  const peaks = [];
  for (let i = 1; i < samples - 1; i++) {
    if (frequencies[i] <= 0) continue;
    if (power[i] > power[i - 1] && power[i] >= power[i + 1] && power[i] > 0.1) {
      peaks.push({
        frequency: frequencies[i],
        period: 1 / frequencies[i],
        power: power[i],
      });
    }
  }
  peaks.sort((a, b) => b.power - a.power);

  return {
    frequencies,
    power,
    fMin,
    fMax,
    samples,
    n: times.length,
    span,
    /** The strongest alias peaks, worst first. */
    peaks: peaks.slice(0, 8),
    /** How high the worst non-zero peak is: 1 would mean total ambiguity. */
    worstPeak: peaks.length ? peaks[0].power : 0,
  };
}
