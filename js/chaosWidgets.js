// =============================================================================
// The divergence instrument
// -----------------------------------------------------------------------------
// One widget, and it is the whole measuring apparatus of the chaos lesson: it
// reads the two runs the Experiment Bench recorded, works out how far apart
// they are at each moment of simulated time, and says which of four things is
// happening - nothing, bounded wandering, ordinary linear drift, or exponential
// growth.
//
// It draws two plots of the same data, and the reason there are two is the
// lesson. On linear axes an exponential looks like nothing at all until it
// suddenly looks like a cliff, which is a good picture of the surprise and a
// bad one for measuring. On logarithmic axes an exponential is a straight line
// and ordinary drift is a curve that flattens, and the difference between the
// two is visible at a glance. A student who has seen both understands why
// anyone bothers with a log scale.
//
// What it will not do
// -----------------------------------------------------------------------------
// It will not print a Lyapunov time for every pair of runs it is given. The
// arithmetic that produces one works on any increasing series; the judgement
// about whether the number means anything is in js/chaos/divergence.js, and
// this widget reports the refusal as prominently as it would report a result.
// A two-body pair gets "your runs drifted apart in proportion to time - that is
// not chaos", which is the single most important sentence in the lesson.
// =============================================================================

import { t } from './i18n/index.js';
import { surface, responsiveHeight, palette, MONO } from './widgetCanvas.js';
import {
  BEHAVIOUR,
  CRITERIA,
  separationSeries,
  analyseDivergence,
  refinementVerdict,
} from './chaos/divergence.js';

/**
 * Pull the two recorded runs out of the bench, in the shape the analysis wants.
 *
 * The bench stores whatever metrics the student selected; this needs body
 * positions, which the bench records for every run as `__bodies`. A pair of
 * runs recorded without them - an older experiment, or one recorded before the
 * lesson asked for positions - yields null rather than a wrong answer.
 *
 * @param {Object} experiment - The bench's active experiment
 * @returns {{a:Array, b:Array}|null} Samples, or null
 */
export function runsFrom(experiment) {
  const a = experiment?.runs?.A?.samples;
  const b = experiment?.runs?.B?.samples;
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
    return null;
  }
  const shape = s =>
    s
      .filter(x => Array.isArray(x.__bodies) && x.__bodies.length)
      .map(x => ({ t: x.t, bodies: x.__bodies }));
  const A = shape(a);
  const B = shape(b);
  return A.length && B.length ? { a: A, b: B } : null;
}

/**
 * Everything the widget shows, computed once per repaint.
 * @param {Object} ctx - The live lesson context
 * @returns {Object} The measurement, or a reason there is not one
 */
export function measure(ctx) {
  const experiment = ctx?.experiment?.() ?? null;
  const runs = runsFrom(experiment);
  if (!runs) {
    return { ready: false, reason: 'no-runs', verdict: null, series: [] };
  }
  const { series, sampling, unmatched } = separationSeries(runs.a, runs.b);
  const verdict = analyseDivergence(series);
  return {
    ready: series.length > 1,
    reason: series.length > 1 ? '' : 'no-overlap',
    series,
    verdict,
    sampling,
    unmatched,
    perturbation: experiment?.perturbation ?? null,
    // Every recorded numerical control, so the widget can say whether the
    // answer survived refinement.
    controls: experiment?.numericalControls ?? [],
  };
}

/** A localized one-line verdict. @param {Object} v - From analyseDivergence @returns {string} Text */
export function verdictText(v) {
  if (!v) return t('chaosW.verdict.none');
  switch (v.behaviour) {
    case BEHAVIOUR.IDENTICAL:
      return t('chaosW.verdict.identical');
    case BEHAVIOUR.BOUNDED:
      return t('chaosW.verdict.bounded');
    case BEHAVIOUR.LINEAR:
      return t('chaosW.verdict.linear');
    case BEHAVIOUR.SATURATED:
      return t('chaosW.verdict.saturated');
    case BEHAVIOUR.EXPONENTIAL:
      return t('chaosW.verdict.exponential', {
        tau: v.tau.toFixed(1),
        r2: v.r2.toFixed(3),
      });
    default:
      return t(`chaosW.reject.${v.reason || 'insufficient'}`);
  }
}

// --- Drawing -------------------------------------------------------------------

/**
 * One plot: separation against simulated time, linear or logarithmic in d.
 *
 * @param {CanvasRenderingContext2D} g - Context
 * @param {Object} box - {x, y, w, h}
 * @param {Array<{t:number,d:number}>} series - The separation
 * @param {Object} opts - {log, window, fit, colors, title}
 */
function plot(g, box, series, opts) {
  const { log, verdict, colors, title } = opts;
  const { x, y, w, h } = box;
  const pts = series.filter(p => Number.isFinite(p.d) && (!log || p.d > 0));
  g.save();

  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);

  g.font = `10px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(title, x + 4, y + 4);

  if (pts.length < 2) {
    g.fillStyle = colors.muted;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t('chaosW.plot.empty'), x + w / 2, y + h / 2);
    g.restore();
    return;
  }

  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const values = pts.map(p => (log ? Math.log10(p.d) : p.d));
  const lo = log ? Math.min(...values) : 0;
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const tSpan = t1 - t0 || 1;

  const px = p => x + 6 + ((p.t - t0) / tSpan) * (w - 12);
  const py = v => y + h - 16 - ((v - lo) / span) * (h - 28);

  // The fitted interval, shaded, so the estimate is never quoted without the
  // stretch of data it came from.
  if (verdict?.window?.ok) {
    const a = px({ t: verdict.window.from });
    const b = px({ t: verdict.window.to });
    g.fillStyle = 'rgba(56, 189, 248, 0.10)';
    g.fillRect(a, y + 1, Math.max(1, b - a), h - 2);
  }

  g.strokeStyle = colors.accent;
  g.lineWidth = 1.6;
  g.beginPath();
  pts.forEach((p, i) => {
    const X = px(p);
    const Y = py(log ? Math.log10(p.d) : p.d);
    if (i === 0) g.moveTo(X, Y);
    else g.lineTo(X, Y);
  });
  g.stroke();

  // On the log plot, the fitted straight line, drawn over the data it fits.
  if (
    log &&
    verdict?.behaviour === BEHAVIOUR.EXPONENTIAL &&
    verdict.window.ok
  ) {
    const pointsIn = verdict.window.points;
    const first = pointsIn[0];
    const rate = verdict.rate;
    g.strokeStyle = colors.warn;
    g.lineWidth = 1.2;
    g.setLineDash([4, 3]);
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const tt =
        verdict.window.from +
        (i / 24) * (verdict.window.to - verdict.window.from);
      const dd = first.d * Math.exp(rate * (tt - first.t));
      const X = px({ t: tt });
      const Y = py(Math.log10(dd));
      if (i === 0) g.moveTo(X, Y);
      else g.lineTo(X, Y);
    }
    g.stroke();
    g.setLineDash([]);
  }

  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(
    log ? t('chaosW.axis.logSeparation') : t('chaosW.axis.separation'),
    x + 4,
    y + h - 3
  );
  g.textAlign = 'right';
  g.fillText(t('chaosW.axis.time'), x + w - 4, y + h - 3);
  g.restore();
}

const DIVERGENCE = {
  id: 'chaos-divergence',
  live: true,
  get title() {
    return t('chaosW.title');
  },
  get note() {
    return t('chaosW.note');
  },
  controls: [],

  /**
   * Both plots, one above the other.
   * @param {HTMLCanvasElement} canvas - Target
   * @param {Object} _v - Control values, unused
   * @param {Object} ctx - The live lesson context
   */
  draw(canvas, _v, ctx) {
    const H = responsiveHeight(300, 240);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const m = measure(ctx);

    g.clearRect(0, 0, w, H);
    if (!m.ready) {
      g.font = `12px ${MONO}`;
      g.fillStyle = colors.muted;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t(`chaosW.empty.${m.reason || 'no-runs'}`), w / 2, H / 2);
      return;
    }

    const gap = 10;
    const each = (H - gap) / 2;
    plot(g, { x: 2, y: 0, w: w - 4, h: each }, m.series, {
      log: false,
      verdict: m.verdict,
      colors,
      title: t('chaosW.plot.linear'),
    });
    plot(g, { x: 2, y: each + gap, w: w - 4, h: each }, m.series, {
      log: true,
      verdict: m.verdict,
      colors,
      title: t('chaosW.plot.log'),
    });
  },

  /**
   * The numbers, in words. This is the textual equivalent of both plots, so a
   * student who cannot read the graph is not being asked to.
   * @param {Object} _v - Control values
   * @param {Object} ctx - Live context
   * @returns {Array<{label:string, value:string, emphasis?:boolean}>} Rows
   */
  readout(_v, ctx) {
    const m = measure(ctx);
    if (!m.ready) {
      return [
        {
          label: t('chaosW.row.status'),
          value: t(`chaosW.empty.${m.reason || 'no-runs'}`),
        },
      ];
    }
    const v = m.verdict;
    const rows = [];

    if (m.perturbation) {
      rows.push({
        label: t('chaosW.row.perturbation'),
        value: t('chaosW.value.perturbation', {
          body: m.perturbation.bodyName,
          axis: m.perturbation.axisLabel,
          km: formatKm(m.perturbation.km),
        }),
      });
    }

    const first = m.series.find(p => p.d > 0);
    rows.push({
      label: t('chaosW.row.start'),
      value: first ? units(first.d) : '—',
    });
    rows.push({
      label: t('chaosW.row.end'),
      value: units(m.series[m.series.length - 1].d),
    });
    rows.push({
      label: t('chaosW.row.growth'),
      value: v.growth === Infinity ? '—' : `×${formatBig(v.growth)}`,
    });
    rows.push({
      label: t('chaosW.row.behaviour'),
      value: verdictText(v),
      emphasis: true,
    });

    if (v.behaviour === BEHAVIOUR.EXPONENTIAL) {
      rows.push({
        label: t('chaosW.row.window'),
        value: t('chaosW.value.window', {
          from: v.window.from.toFixed(0),
          to: v.window.to.toFixed(0),
          efolds: v.efolds.toFixed(1),
        }),
      });
    } else if (v.reason) {
      rows.push({
        label: t('chaosW.row.noEstimate'),
        value: t(`chaosW.reject.${v.reason}`),
      });
    }

    // The straight-line comparison, always. It is what distinguishes drift
    // from chaos, and hiding it when the answer is "exponential" would leave
    // the student with no way to see that the comparison was made.
    rows.push({
      label: t('chaosW.row.straightLine'),
      value: `r² = ${v.linearR2.toFixed(3)}`,
    });

    if (m.controls.length) {
      const verdictOf = refinementVerdict([
        { tau: v.tau, behaviour: v.behaviour },
        ...m.controls,
      ]);
      rows.push({
        label: t('chaosW.row.refinement'),
        value: verdictOf.resolved
          ? t('chaosW.value.resolved', {
              spread: (verdictOf.spread * 100).toFixed(0),
            })
          : t(`chaosW.unresolved.${verdictOf.reason}`),
        emphasis: true,
      });
    }

    return rows;
  },
};

/** A separation in simulation units and kilometres. @param {number} d - Units @returns {string} Text */
function units(d) {
  const km = d * 1.495978707e6;
  if (d < 1e-3) return `${d.toExponential(2)} u  (${formatKm(km)})`;
  return `${d.toPrecision(3)} u  (${formatKm(km)})`;
}

/** @param {number} km - Kilometres @returns {string} A readable distance */
function formatKm(km) {
  const a = Math.abs(km);
  if (a >= 1e6) return `${(km / 1e6).toPrecision(3)} million km`;
  if (a >= 1) return `${Math.round(km).toLocaleString()} km`;
  return `${km.toPrecision(2)} km`;
}

/** @param {number} n - A ratio @returns {string} Compact form */
function formatBig(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e4) return n.toExponential(1);
  if (n >= 100) return String(Math.round(n));
  return n.toPrecision(3);
}

export const CHAOS_WIDGETS = [DIVERGENCE];
export { CRITERIA };
