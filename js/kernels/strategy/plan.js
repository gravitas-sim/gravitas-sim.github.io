// =============================================================================
// A multi-night plan and its cost in hours (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// From the observing-window planner's nights (js/observingWindow.js observingNight:
// the intervals when the target is above the airmass limit, the Sun below the
// twilight limit and the Moon far enough away, read unchanged and handed in as data)
// this places `perNight` visits in each requested night, drops what does not fit,
// loses whole nights to a weather mask, and adds up what it cost.
//
// A visit is `exposure + overhead` long, in that order: its epoch is the middle of
// the exposure, start + exposure / 2. A night's visits go in its LONGEST usable
// interval (a night is one stretch of observing; a Moon that splits the window leaves
// the longer half). A visit longer than the window is dropped and reported, never
// truncated.
//
// Cost, in hours: requested = sum of (exposure + overhead) over planned visits;
// executed = the same over the visits that were not lost to weather; lost = the
// difference; windowHours = the usable hours in the nights asked for. Nothing here is
// a forecast.
// =============================================================================

const { Math, Number } = globalThis;

const DAY_S = 86400;

export const PLAN_REASONS = Object.freeze({
  neverUp: 'never-up',
  noWindow: 'no-window',
  allLost: 'all-lost',
  visitLongerThanWindow: 'visit-longer-than-window',
});

const longest = intervals => {
  let best = null;
  for (const iv of intervals || [])
    if (!best || iv.endJd - iv.startJd > best.endJd - best.startJd) best = iv;
  return best;
};

/**
 * Where a night's visits go inside one interval, as visit start times (JD).
 * @returns {{starts: number[], dropped: number, reason: string|null}}
 */
export function placeVisits(
  interval,
  { perNight, spacingHours = null, placement = 'spread', visitDays }
) {
  const len = interval.endJd - interval.startJd;
  if (!(visitDays <= len + 1e-12) || perNight < 1)
    return {
      starts: [],
      dropped: Math.max(perNight, 0),
      reason: perNight < 1 ? null : PLAN_REASONS.visitLongerThanWindow,
    };
  let n;
  const starts = [];
  if (spacingHours > 0) {
    const s = spacingHours / 24;
    const fit = Math.floor((len - visitDays) / s + 1e-9) + 1;
    n = Math.min(perNight, fit);
    const span = (n - 1) * s + visitDays;
    const lead =
      placement === 'start'
        ? 0
        : placement === 'end'
          ? len - span
          : (len - span) / 2;
    for (let i = 0; i < n; i++) starts.push(interval.startJd + lead + i * s);
  } else {
    n = Math.min(perNight, Math.floor(len / visitDays + 1e-9));
    for (let i = 0; i < n; i++)
      starts.push(
        n === 1
          ? interval.startJd + (len - visitDays) / 2
          : interval.startJd + (i * (len - visitDays)) / (n - 1)
      );
  }
  return { starts, dropped: perNight - n, reason: null };
}

/**
 * @param {object} o
 * @param {object[]} o.nights - observingNight() records, one per night, in order
 * @param {{perNight?: number, spacingHours?: number|null, placement?: string,
 *   everyNth?: number, firstNight?: number}} [o.cadence]
 * @param {number} o.exposureSeconds
 * @param {number} [o.overheadSeconds]
 * @param {ArrayLike<number>|null} [o.clear] - 1 where the night is clear (default all clear)
 */
export function planCampaign({
  nights,
  cadence = {},
  exposureSeconds,
  overheadSeconds = 0,
  clear = null,
}) {
  const {
    perNight = 1,
    spacingHours = null,
    placement = 'spread',
    everyNth = 1,
    firstNight = 0,
  } = cadence;
  if (!(Number.isFinite(exposureSeconds) && exposureSeconds > 0))
    throw new RangeError('the exposure is a positive number of seconds');
  if (!(Number.isFinite(overheadSeconds) && overheadSeconds >= 0))
    throw new RangeError('the overhead is a number of seconds, zero or more');
  const visitSeconds = exposureSeconds + overheadSeconds;
  const visitDays = visitSeconds / DAY_S;
  const visits = [];
  const rows = [];
  let requested = 0;
  let executed = 0;
  let windowHours = 0;
  let asked = 0;
  let neverUp = 0;
  let dropped = 0;
  let droppedReason = null;
  nights.forEach((night, i) => {
    const row = {
      index: i,
      midnightJd: night.midnightJd,
      status: 'skipped',
      windowHours: 0,
      planned: 0,
      executed: 0,
      dropped: 0,
    };
    rows.push(row);
    if (i < firstNight || (i - firstNight) % Math.max(1, everyNth) !== 0)
      return;
    asked++;
    const iv = longest(night.usable?.intervals);
    if (!iv) {
      row.status =
        night.targetUp?.hours > 0
          ? PLAN_REASONS.noWindow
          : PLAN_REASONS.neverUp;
      if (row.status === PLAN_REASONS.neverUp) neverUp++;
      return;
    }
    row.windowHours = (iv.endJd - iv.startJd) * 24;
    windowHours += row.windowHours;
    const placed = placeVisits(iv, {
      perNight,
      spacingHours,
      placement,
      visitDays,
    });
    row.planned = placed.starts.length;
    row.dropped = placed.dropped;
    dropped += placed.dropped;
    if (placed.reason) droppedReason = placed.reason;
    const lost = clear ? !clear[i] : false;
    row.status = lost ? 'weather' : 'observed';
    row.executed = lost ? 0 : placed.starts.length;
    for (const start of placed.starts) {
      visits.push({
        night: i,
        startJd: start,
        endJd: start + visitDays,
        jd: start + exposureSeconds / 2 / DAY_S,
        executed: !lost,
      });
      requested += visitSeconds;
      if (!lost) executed += visitSeconds;
    }
  });
  const times = visits.filter(v => v.executed).map(v => v.jd);
  let reason = null;
  if (!visits.length)
    reason =
      droppedReason ??
      (asked > 0 && neverUp === asked
        ? PLAN_REASONS.neverUp
        : PLAN_REASONS.noWindow);
  else if (!times.length) reason = PLAN_REASONS.allLost;
  const h = s => s / 3600;
  return {
    visits,
    nights: rows,
    times,
    reason,
    dropped,
    droppedReason,
    visitSeconds,
    cost: {
      requestedHours: h(requested),
      executedHours: h(executed),
      lostHours: h(requested - executed),
      exposureHours: h((executed * exposureSeconds) / visitSeconds),
      overheadHours: h((executed * overheadSeconds) / visitSeconds),
      windowHours,
      nightsAsked: asked,
      nightsObserved: rows.filter(r => r.status === 'observed').length,
      nightsLost: rows.filter(r => r.status === 'weather').length,
      visitsPlanned: visits.length,
      visitsExecuted: times.length,
    },
  };
}
