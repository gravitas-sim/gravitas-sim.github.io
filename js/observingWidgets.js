// =============================================================================
// The observing planner
// -----------------------------------------------------------------------------
// One instrument, for one lesson: you have twelve measurements to spend on a
// star that is above the airmass limit for five hours a night, and you have to
// decide when to take them before you have seen a single velocity.
//
// What it shows, and what it deliberately does not
// -----------------------------------------------------------------------------
// It shows the observing windows, the twelve epochs a strategy produces, and
// the spectral window of those epochs. It does not show a period, a velocity
// or a fit, and that is the whole design:
//
//   the spectral window is a property of the SCHEDULE ALONE. It contains no
//   data. Everything this widget can tell a student is therefore something
//   they could know before the telescope opened, which is the situation a
//   real time allocation puts them in.
//
// The moment a planner shows you what you would have found, the exercise stops
// being planning. The velocities come from the Radial Velocity panel, after
// the student has committed - the lesson makes them write the plan down and
// predict the outcome first, and js/rvSchedule.js takes the plan verbatim as
// an explicit epoch list.
//
// The seam, stated out loud
// -----------------------------------------------------------------------------
// The windows here are real: a real site, a real target, real dates, computed
// by js/observingWindow.js against published ephemerides. The velocities the
// student will collect afterwards are simulated. Those are two different
// things and the lesson says so in its first step. What carries across the
// seam is the only thing that has to: the list of times.
//
// Cost
// -----------------------------------------------------------------------------
// Twenty nights of window-finding is about a quarter of a second, which is too
// slow for a slider. Only the airmass limit changes the windows, so the run is
// memoized on it; the other two controls reshuffle epochs inside windows that
// are already computed and are free.
// =============================================================================

import { julianDate, localMidnight, observingRun } from './observingWindow.js';
import { formatEpochList, spectralWindow } from './rvSchedule.js';
import { MONO, surface, token, typeAt } from './widgetCanvas.js';
import { t } from './i18n/index.js';

/**
 * La Silla. Chosen because it is where HARPS is and because the target the
 * radial-velocity lessons already use is badly placed from it, which is what
 * makes the exercise an exercise.
 */
export const SITE = Object.freeze({
  name: 'La Silla',
  latitudeDeg: -29.2563,
  longitudeDeg: -70.738,
});

/** HD 209458. Declination +18.9 from latitude -29.3: never better than X=1.5. */
export const TARGET = Object.freeze({
  name: 'HD 209458',
  raDeg: 330.795,
  decDeg: 18.8842,
});

/** How many nights the allocation covers, and how many visits it pays for. */
export const ALLOCATION_NIGHTS = 20;
export const EPOCHS = 12;

/** The first night. September: the whole of the target's window fits in the dark. */
const FIRST_MIDNIGHT = localMidnight(
  julianDate(2026, 9, 5, 6),
  SITE.longitudeDeg
);

/** One sidereal day, in mean solar days. The spacing the sky imposes. */
const SIDEREAL_DAY = 0.997269566;

/** Cycles per day at which a once-a-night schedule aliases. */
export const SIDEREAL_FREQUENCY = 1 / SIDEREAL_DAY;

/**
 * The twenty nights, for one airmass limit.
 *
 * Memoized because finding a window is a search and a slider is not. Ten
 * minutes between samples rather than the module default of two: the
 * boundaries are still bisected to the second, and the only thing a coarser
 * grid risks is missing a window under ten minutes long, which this target
 * does not have on any night of this allocation.
 */
const runCache = new Map();
function runFor(airmassLimit) {
  const key = airmassLimit.toFixed(2);
  if (!runCache.has(key)) {
    runCache.set(
      key,
      observingRun({
        site: SITE,
        target: TARGET,
        firstMidnightJd: FIRST_MIDNIGHT,
        nights: ALLOCATION_NIGHTS,
        options: { airmassLimit, stepMinutes: 10, refineSeconds: 1 },
      })
    );
  }
  return runCache.get(key);
}

/**
 * Which nights to visit: twelve, spread as evenly as they will go over a span.
 *
 * Rounded from an even division rather than taken from a list, so the count is
 * always twelve however wide the span is. That is what keeps the comparison
 * honest - two spans differ in placement and in nothing else, which is the
 * same discipline js/rvSchedule.js applies to its own shapes.
 *
 * @param {number} spanNights - How many nights of the allocation to use
 * @returns {Array<number>} Night indices, ascending and distinct
 */
export function nightsToVisit(spanNights) {
  const span = Math.max(EPOCHS, Math.min(ALLOCATION_NIGHTS, spanNights));
  const out = [];
  for (let i = 0; i < EPOCHS; i++) {
    const idx = Math.round((i * (span - 1)) / (EPOCHS - 1));
    out.push(idx);
  }
  // Rounding can collide when the span is barely wider than the count; nudge
  // forward rather than dropping an epoch, because twelve is the budget.
  for (let i = 1; i < out.length; i++) {
    if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1;
  }
  return out;
}

/**
 * Where in a night's window an epoch goes.
 *
 * Spread zero puts every epoch at the middle of its window, which is the best
 * airmass and the worst schedule. Spread one alternates between the two ends,
 * using nine tenths of the width - the ends themselves are the airmass limit
 * exactly, and an epoch there is a measurement taken at the moment the target
 * became unobservable.
 *
 * @param {number} index - Which epoch, in order
 * @param {number} spread - 0 to 1
 * @returns {number} Fraction of the way through the window
 */
export const placementFraction = (index, spread) =>
  0.5 + (index % 2 ? 1 : -1) * 0.45 * spread;

const PLANNER = {
  id: 'observing-planner',
  get title() {
    return t('obsW.twelveNightsOnOneStar');
  },
  get note() {
    return t('obsW.theBarsAreTheNights');
  },
  controls: [
    {
      id: 'span',
      get label() {
        return t('obsW.spreadTheTwelveOver');
      },
      get unit() {
        return t('obsW.nights');
      },
      min: EPOCHS,
      max: ALLOCATION_NIGHTS,
      step: 1,
      value: ALLOCATION_NIGHTS,
      decimals: 0,
    },
    {
      id: 'spread',
      get label() {
        return t('obsW.useThisMuchOfEachWindow');
      },
      unit: '',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0,
      decimals: 2,
    },
    {
      id: 'airmass',
      get label() {
        return t('obsW.airmassLimit');
      },
      unit: 'X',
      min: 1.3,
      max: 3,
      step: 0.1,
      value: 2,
      decimals: 1,
    },
  ],
  presets: [
    {
      get label() {
        return t('obsW.twelveNightsInARow');
      },
      values: { span: EPOCHS, spread: 0, airmass: 2 },
      note: 'The shortest baseline the budget allows, every visit at the best moment of its night. The nights are consecutive, so the epochs are one sidereal day apart and nothing else.',
    },
    {
      get label() {
        return t('obsW.spreadOutBestMoment');
      },
      values: { span: ALLOCATION_NIGHTS, spread: 0, airmass: 2 },
      note: 'What a careful observer does: use the whole allocation, and take each measurement when the target is highest. Watch what it does to the peak at one cycle a day.',
    },
    {
      get label() {
        return t('obsW.spreadOutBothEnds');
      },
      values: { span: ALLOCATION_NIGHTS, spread: 1, airmass: 2 },
      note: 'The same twelve nights, but alternating between the start and the end of each window. Every measurement is at worse airmass than it could have been, and the schedule is better.',
    },
  ],

  compute(v) {
    const airmassLimit = Math.max(1.05, Number(v.airmass) || 2);
    const spread = Math.min(1, Math.max(0, Number(v.spread) || 0));
    const run = runFor(airmassLimit);
    const visits = nightsToVisit(Number(v.span) || ALLOCATION_NIGHTS);

    // Offsets are measured from the opening of the first night's window, so a
    // plan reads as "day zero, day one, ..." rather than from a Julian Date
    // nobody can hold in their head.
    const origin = run[0].usable.intervals[0]?.startJd ?? run[0].midnightJd;

    const epochs = [];
    const placed = [];
    visits.forEach((nightIndex, i) => {
      const window = run[nightIndex].usable.intervals[0];
      if (!window) return;
      const f = placementFraction(i, spread);
      const jd = window.startJd + f * (window.endJd - window.startJd);
      epochs.push(jd - origin);
      placed.push({ nightIndex, jd, offset: jd - origin });
    });

    const window = spectralWindow(epochs, { fMin: 0, fMax: 2, samples: 700 });
    // The power exactly at the sidereal frequency, which is where the sky puts
    // the alias - not at 1.000 cycles a day, where a reader expects it.
    let atSidereal = 0;
    if (window) {
      let nearest = Infinity;
      window.frequencies.forEach((f, i) => {
        const d = Math.abs(f - SIDEREAL_FREQUENCY);
        if (d < nearest) {
          nearest = d;
          atSidereal = window.power[i];
        }
      });
    }

    const widths = run.map(n => n.usable.hours);
    const baseline = epochs.length
      ? Math.max(...epochs) - Math.min(...epochs)
      : 0;

    return {
      run,
      epochs,
      placed,
      window,
      atSidereal,
      baseline,
      medianWindowHours: widths.slice().sort((a, b) => a - b)[
        Math.floor(widths.length / 2)
      ],
      driftMinutes: (1 - SIDEREAL_DAY) * 1440,
      airmassLimit,
    };
  },

  readout(v) {
    const c = this.compute(v);
    const peak = c.window?.peaks?.[0] || null;
    return [
      {
        get label() {
          return t('obsW.usableWindowPerNight');
        },
        value: `${c.medianWindowHours.toFixed(2)} h`,
      },
      {
        get label() {
          return t('obsW.theWindowOpensEarlierBy');
        },
        value: `${c.driftMinutes.toFixed(1)} min / night`,
      },
      {
        get label() {
          return t('obsW.baseline');
        },
        value: `${c.baseline.toFixed(2)} d`,
      },
      {
        get label() {
          return t('obsW.powerAtTheSiderealDay');
        },
        value: c.atSidereal.toFixed(3),
        emphasis: c.atSidereal > 0.5,
      },
      {
        get label() {
          return t('obsW.strongestAlias');
        },
        value: peak
          ? `${peak.power.toFixed(3)} at ${peak.period.toFixed(4)} d`
          : '—',
      },
      {
        get label() {
          return t('obsW.theEpochList');
        },
        value: formatEpochList(c.epochs, 4),
      },
    ];
  },

  draw(canvas, v) {
    const { ctx, w } = surface(canvas, 340);
    const c = this.compute(v);
    const ink = token('--text-primary', '#e9edf7');
    const muted = token('--text-muted', '#8a8f9e');
    const grid = token('--border-subtle', '#2a2f3d');
    const accent = token('--accent', '#38bdf8');
    const warn = token('--warning', '#f0b429');

    // --- Top: the nights, as bars ----------------------------------------
    const left = 34;
    const right = w - 12;
    const rowH = 10;
    const top = 18;
    // Every night is drawn on the same 24-hour axis centered on local midnight,
    // so the four-minute walk is visible as a slope down the page rather than
    // being normalized away by giving each night its own scale.
    const spanDays = 0.55;
    const xOf = (jd, midnight) =>
      left + ((jd - midnight + spanDays / 2) / spanDays) * (right - left);

    ctx.font = typeAt(10);
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(t('obsW.eachRowIsANight'), left, 12);

    c.run.forEach((night, i) => {
      const y = top + i * rowH;
      const mid = night.midnightJd;
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y + rowH / 2 + 0.5);
      ctx.lineTo(right, y + rowH / 2 + 0.5);
      ctx.stroke();

      // Astronomical night, then the part of it the target is up for.
      for (const iv of night.night.intervals) {
        ctx.fillStyle = grid;
        ctx.fillRect(
          xOf(iv.startJd, mid),
          y + 2,
          Math.max(1, xOf(iv.endJd, mid) - xOf(iv.startJd, mid)),
          rowH - 4
        );
      }
      for (const iv of night.usable.intervals) {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(
          xOf(iv.startJd, mid),
          y + 2,
          Math.max(1, xOf(iv.endJd, mid) - xOf(iv.startJd, mid)),
          rowH - 4
        );
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = muted;
      ctx.font = typeAt(9);
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), left - 5, y + rowH - 2);
    });

    // The epochs actually booked.
    for (const p of c.placed) {
      const y = top + p.nightIndex * rowH;
      const x = xOf(p.jd, c.run[p.nightIndex].midnightJd);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x, y + rowH - 1);
      ctx.stroke();
    }

    // --- Bottom: the spectral window --------------------------------------
    const gTop = top + ALLOCATION_NIGHTS * rowH + 22;
    const gH = 74;
    const gBottom = gTop + gH;
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, gBottom + 0.5);
    ctx.lineTo(right, gBottom + 0.5);
    ctx.stroke();

    if (c.window) {
      const fx = f => left + (f / 2) * (right - left);
      // The sidereal frequency, marked, because the whole point is that the
      // peak is not at 1.000.
      ctx.strokeStyle = warn;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(fx(SIDEREAL_FREQUENCY), gTop);
      ctx.lineTo(fx(SIDEREAL_FREQUENCY), gBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      c.window.frequencies.forEach((f, i) => {
        const x = fx(f);
        const y = gBottom - c.window.power[i] * gH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.font = `${typeAt(10)}`;
      ctx.fillStyle = warn;
      ctx.textAlign = 'left';
      ctx.fillText(
        `${t('obsW.siderealDay')} ${SIDEREAL_FREQUENCY.toFixed(5)} c/d`,
        fx(SIDEREAL_FREQUENCY) + 4,
        gTop + 10
      );
      ctx.fillStyle = muted;
      ctx.font = `${typeAt(10)}`;
      ctx.textAlign = 'center';
      for (const f of [0, 0.5, 1, 1.5, 2]) {
        ctx.fillText(f.toFixed(1), fx(f), gBottom + 12);
      }
      ctx.textAlign = 'left';
      ctx.fillText(t('obsW.cyclesPerDay'), left, gBottom + 24);
      ctx.font = `${MONO}`;
      ctx.font = typeAt(10);
      ctx.textAlign = 'right';
      ctx.fillStyle = ink;
      ctx.fillText(`W = ${c.atSidereal.toFixed(3)}`, right, gTop + 10);
    }
  },
};

/** Registered by js/widgets.js, like every other family. */
export const OBSERVING_WIDGETS = [PLANNER];
