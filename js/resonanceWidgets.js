// =============================================================================
// The resonance instruments
// -----------------------------------------------------------------------------
// Four of them, and the split between them is the argument of the lesson:
//
//   resonance-periods       measured periods, the ratios between them, and the
//                           nearest small-integer ratio to each - together with
//                           how close chance alone would have got. This is the
//                           evidence students are tempted to stop at.
//   resonance-angle         the resonant argument against time, wrapped and
//                           unwrapped, and the verdict. This is the evidence
//                           that settles it.
//   resonance-conjunctions  where the two bodies line up, plotted round a
//                           circle. The same fact as the angle, seen as a
//                           picture rather than a number.
//   resonance-frame         the rotating frame, for the co-orbital case, with
//                           L4 and L5 marked.
//
// All four read one shared history (js/resonance/recorder.js) sampled from the
// live world, so a student who switches instruments does not lose the run.
//
// Every one of them will say it does not know. The angle instrument reports
// "inconclusive" whenever the record cannot separate a slow circulation from a
// wide libration, which is not a failure mode but the third of its three
// answers - and over a lesson-length run it is the honest answer for Callisto,
// which sits closer to 7:3 with Ganymede than Pluto does to 3:2 with Neptune
// and is in no resonance at all.
// =============================================================================

import { t } from './i18n/index.js';
import { surface, responsiveHeight, palette, MONO } from './widgetCanvas.js';
import { recorder, partition } from './resonance/recorder.js';
import {
  ANGLE_STATE,
  classifyAngle,
  conjunctions,
  conjunctionCluster,
  coorbitalAngle,
  laplaceArgument,
  nearestRatio,
  plutoArgument,
  ratioSurprise,
  rotatingFrame,
  triangularPoints,
  twoBodyArgument,
  wrap360,
  wrapAbout,
} from './resonance/elements.js';
import {
  SCALE_JOVIAN,
  TIME_SCALE_JOVIAN,
  simSecondsToDays,
  simSecondsToYears,
} from './resonance/systems.js';

// --- Shared plumbing ----------------------------------------------------------

/**
 * Sample the live world and hand back everything the instruments need.
 *
 * Called from every widget's draw and readout, and cheap to call twice: the
 * recorder ignores a second call in the same frame.
 *
 * @param {Object} ctx - The live lesson context
 * @returns {{ready: boolean, reason?: string, ...}} The shared state
 */
function collect(ctx) {
  const parts = partition(ctx);
  if (!parts) return { ready: false, reason: 'no-world' };
  const clock = typeof ctx.clock === 'function' ? ctx.clock() : NaN;
  recorder.record({ clock, ...parts });
  const series = recorder.series();
  return {
    ready: series.length >= 8,
    reason: series.length >= 8 ? '' : 'warming-up',
    series,
    primary: parts.primary,
    bodies: parts.bodies,
    G: parts.G,
    stats: recorder.stats(),
    window: recorder.window(),
  };
}

/**
 * Whether the current world is the Jovian scale model, and by how much.
 *
 * Only that one scenario is scaled, and only its own instrument readings need
 * converting back. Detected from the primary rather than from a setting,
 * because the instruments are handed a world and not a scenario name.
 *
 * @param {Object} primary - The central body
 * @returns {{length: number, time: number, moons: boolean}} The scale in force
 */
function scaleOf(primary) {
  const moons = primary?.name === 'Jupiter';
  return {
    length: moons ? SCALE_JOVIAN : 1,
    time: moons ? TIME_SCALE_JOVIAN : 1,
    moons,
  };
}

/**
 * The mean of a body's measured period over the whole record.
 *
 * The instantaneous osculating period wobbles at the synodic frequency by a
 * fraction of a percent, and a ratio built from two instantaneous values
 * inherits both wobbles. Averaging over the record removes them, and the
 * lesson's ratios are quoted to five figures.
 *
 * @param {Array} series - The recorder's history
 * @param {string} name - Body name
 * @returns {number} Mean period in simulated seconds, or NaN
 */
function meanPeriod(series, name) {
  let sum = 0;
  let n = 0;
  for (const s of series) {
    const p = s.el[name]?.period;
    if (Number.isFinite(p) && p > 0) {
      sum += p;
      n++;
    }
  }
  return n ? sum / n : NaN;
}

/** Bodies present in the record, innermost first. @param {Array} series @returns {Array<string>} */
function orderedNames(series) {
  const last = series[series.length - 1]?.el || {};
  return Object.keys(last).sort(
    (a, b) => (last[a]?.a ?? 0) - (last[b]?.a ?? 0)
  );
}

/**
 * Which resonant argument a step wants, and the terms that build it.
 *
 * A lesson step names the argument by kind in its `tool` block. `auto` is the
 * general case and the one the lesson leans on for its awkward examples: find
 * the nearest small-integer ratio to the measured period ratio, build the
 * first-order argument that goes with it, and see what that argument does. It
 * is what a student would do if they believed the ratio, and it is how Callisto
 * gets its honest answer.
 *
 * @param {Object} spec - The step's `tool` object
 * @param {Array} series - The record
 * @returns {Object|null} {kind, label, names, evaluate(sample), ratio}
 */
export function argumentFor(spec, series) {
  const names = orderedNames(series);
  const kind = spec?.argument || 'auto';

  const has = n => names.includes(n);

  if (kind === 'laplace' && has('Io') && has('Europa') && has('Ganymede')) {
    return {
      kind,
      label: 'λ(Io) − 3λ(Europa) + 2λ(Ganymede)',
      names: ['Io', 'Europa', 'Ganymede'],
      // The conjunction cycle the argument is paced by. The Laplace argument is
      // driven by the Io-Europa conjunctions, so that is what "long enough to
      // tell" is measured in.
      reference: (a, b) => 1 / (1 / a - 1 / b),
      referencePair: ['Io', 'Europa'],
      evaluate: s =>
        laplaceArgument(
          s.el.Io?.lambda,
          s.el.Europa?.lambda,
          s.el.Ganymede?.lambda
        ),
    };
  }

  if (kind === 'pluto' && has('Pluto') && has('Neptune')) {
    return {
      kind,
      label: '3λ(Pluto) − 2λ(Neptune) − ϖ(Pluto)',
      names: ['Neptune', 'Pluto'],
      referencePair: ['Neptune', 'Pluto'],
      evaluate: s =>
        plutoArgument(
          s.el.Pluto?.lambda,
          s.el.Neptune?.lambda,
          s.el.Pluto?.varpi
        ),
    };
  }

  // The general case, and the one the lesson uses to make its point: whatever
  // small-integer ratio the periods are nearest to, build its argument. That
  // is what a student would do if they believed the ratio, and it is how
  // Callisto gets the honest answer that its 7:3 argument does not librate.
  //
  // A step can name the ratio instead, with `p` and `q`. That is for the cases
  // where the question is about a *particular* resonance rather than about the
  // nearest one - testing whether a body is in the same 3:2 as Pluto, say,
  // when its own measured ratio happens to be nearest to 8:5.
  const inner = spec?.inner || names[0];
  const outer = spec?.outer || names[names.length - 1];
  if (!has(inner) || !has(outer) || inner === outer) return null;

  const pIn = meanPeriod(series, inner);
  const pOut = meanPeriod(series, outer);
  if (!(pIn > 0) || !(pOut > 0)) return null;

  const named =
    Number.isInteger(spec?.p) &&
    Number.isInteger(spec?.q) &&
    spec.p > 0 &&
    spec.q > 0;
  const ratio = named
    ? {
        p: spec.p,
        q: spec.q,
        value: spec.p / spec.q,
        error: pOut / pIn - spec.p / spec.q,
        fractional: Math.abs(pOut / pIn - spec.p / spec.q) / (pOut / pIn),
      }
    : nearestRatio(pOut / pIn, spec?.maxDenominator ?? 10);
  if (!ratio) return null;

  // A 1:1 pair has no first-order argument - p - q is zero, so the periapsis
  // term vanishes and what is left is just the difference of the two mean
  // longitudes. That is the co-orbital angle, and it is measured from actual
  // positions rather than from mean longitudes because a Trojan's eccentricity
  // is small enough that its periapsis direction is noise.
  if (ratio.p === ratio.q) {
    return {
      kind: 'coorbital',
      label: `λ(${outer}) − λ(${inner})`,
      names: [inner, outer],
      referencePair: [inner, outer],
      coorbital: { inner, outer },
      ratio,
      evaluate: s => wrap360(s.el[outer]?.lambda - s.el[inner]?.lambda),
    };
  }

  return {
    kind: 'two-body',
    label: `${ratio.p}λ(${outer}) − ${ratio.q}λ(${inner}) − ${ratio.p - ratio.q}ϖ(${outer})`,
    names: [inner, outer],
    referencePair: [inner, outer],
    ratio,
    evaluate: s =>
      twoBodyArgument(
        ratio.p,
        ratio.q,
        s.el[outer]?.lambda,
        s.el[inner]?.lambda,
        s.el[outer]?.varpi
      ),
  };
}

/**
 * Classify whichever argument the step asked for.
 * @param {Object} ctx - Live context
 * @param {Object} spec - The step's tool block
 * @returns {Object} Everything the angle instrument draws and reports
 */
export function measureAngle(ctx, spec) {
  const base = collect(ctx);
  if (!base.ready) return base;
  const arg = argumentFor(spec, base.series);
  if (!arg) return { ...base, ready: false, reason: 'no-argument' };

  const samples = base.series.map(s => ({ t: s.t, phi: arg.evaluate(s) }));

  // The cycle the argument is paced by, which is what a bounded record's
  // verdict is measured against and what the short-period ripple is averaged
  // over. Without it the classifier falls back to multiples of the run length
  // and the verdict depends on how long a student happened to watch.
  //
  // For everything but a co-orbital pair that is the synodic period, the
  // interval between conjunctions. For a co-orbital pair it cannot be: the two
  // periods are equal by definition, the synodic period is infinite, and every
  // threshold measured in conjunction cycles would be unreachable. There the
  // orbital period is the natural cycle, and it is the one the tadpole
  // libration is quoted in anyway.
  const [inName, outName] = arg.referencePair;
  const pIn = meanPeriod(base.series, inName);
  const pOut = meanPeriod(base.series, outName);
  const coorbital = arg.kind === 'coorbital';
  const rawSynodic =
    pIn > 0 && pOut > 0 && pIn !== pOut
      ? Math.abs(1 / (1 / pIn - 1 / pOut))
      : Infinity;
  const synodic =
    coorbital || !Number.isFinite(rawSynodic)
      ? pOut || pIn
      : Math.min(rawSynodic, 50 * Math.max(pIn, pOut));

  const verdict = classifyAngle(samples, { referencePeriod: synodic });
  return { ...base, arg, samples, verdict, synodic, pIn, pOut };
}

// --- Drawing helpers ----------------------------------------------------------

/** A framed plot area with a title. */
function frame(g, box, colors, title) {
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(box.x, box.y, box.w, box.h);
  if (title) {
    g.font = `10px ${MONO}`;
    g.fillStyle = colors.muted;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(title, box.x + 5, box.y + 4);
  }
}

/** Centre a message in a box. */
function message(g, w, h, colors, text) {
  g.font = `12px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > w - 32 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) =>
    g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 15)
  );
}

// --- 1. Periods and ratios ----------------------------------------------------

const PERIODS = {
  id: 'resonance-periods',
  live: true,
  animated: true,
  get title() {
    return t('resW.periods.title');
  },
  get note() {
    return t('resW.periods.note');
  },
  controls: [],

  draw(canvas, _v, ctx) {
    const H = responsiveHeight(210, 170);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    g.clearRect(0, 0, w, H);

    const base = collect(ctx);
    if (!base.ready) {
      message(g, w, H, colors, t(`resW.empty.${base.reason || 'no-world'}`));
      return;
    }

    const names = orderedNames(base.series);
    const periods = names.map(n => meanPeriod(base.series, n));
    const scale = scaleOf(base.primary);

    // A log axis, because the periods in these systems span a factor of ten and
    // the eye should see the 2:1 steps as equal gaps, which is what they are.
    const finite = periods.filter(p => Number.isFinite(p) && p > 0);
    if (finite.length < 2) {
      message(g, w, H, colors, t('resW.empty.warming-up'));
      return;
    }
    const lo = Math.log10(Math.min(...finite));
    const hi = Math.log10(Math.max(...finite));
    const span = hi - lo || 1;

    const box = { x: 4, y: 4, w: w - 8, h: H - 8 };
    frame(g, box, colors, t('resW.periods.axis'));

    const rowH = Math.min(30, (box.h - 26) / names.length);
    names.forEach((name, i) => {
      const p = periods[i];
      const y = box.y + 22 + i * rowH;
      if (!Number.isFinite(p) || p <= 0) return;
      const frac = (Math.log10(p) - lo) / span;
      const barW = 12 + frac * (box.w * 0.44);

      g.fillStyle = i === 0 ? colors.accent : colors.grid;
      g.fillRect(box.x + 96, y + rowH * 0.25, barW, Math.max(4, rowH * 0.4));

      g.font = `11px ${MONO}`;
      g.fillStyle = colors.ink;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(name.slice(0, 12), box.x + 8, y + rowH * 0.45);

      g.textAlign = 'right';
      g.fillStyle = colors.muted;
      g.fillText(
        `${(p / periods[0]).toFixed(4)}×`,
        box.x + box.w - 8,
        y + rowH * 0.45
      );
    });

    g.font = `9px ${MONO}`;
    g.fillStyle = colors.muted;
    g.textAlign = 'left';
    g.textBaseline = 'bottom';
    g.fillText(
      scale.moons ? t('resW.periods.scaled') : t('resW.periods.true'),
      box.x + 6,
      box.y + box.h - 4
    );
  },

  readout(_v, ctx) {
    const base = collect(ctx);
    if (!base.ready) {
      return [
        {
          label: t('resW.row.status'),
          value: t(`resW.empty.${base.reason || 'no-world'}`),
        },
      ];
    }
    const names = orderedNames(base.series);
    const scale = scaleOf(base.primary);
    const rows = [];

    for (const name of names) {
      const p = meanPeriod(base.series, name);
      if (!Number.isFinite(p)) continue;
      const days = simSecondsToDays(p, scale.time);
      rows.push({
        label: name,
        value:
          days >= 365
            ? t('resW.value.periodYears', {
                years: simSecondsToYears(p, scale.time).toFixed(2),
              })
            : t('resW.value.periodDays', { days: days.toFixed(4) }),
      });
    }

    // Every adjacent pair, because a chain of resonances is what the Galilean
    // system is and reporting only the ends would hide the middle link.
    for (let i = 1; i < names.length; i++) {
      const inner = meanPeriod(base.series, names[i - 1]);
      const outer = meanPeriod(base.series, names[i]);
      if (!(inner > 0) || !(outer > 0)) continue;
      const x = outer / inner;
      const near = nearestRatio(x, 10);
      const surprise = ratioSurprise(x, 10);
      rows.push({
        label: t('resW.row.ratio', { a: names[i], b: names[i - 1] }),
        value: t('resW.value.ratio', {
          ratio: x.toFixed(5),
          p: near.p,
          q: near.q,
          off: (near.fractional * 100).toFixed(3),
          chance: surprise.timesCloser.toFixed(1),
        }),
        emphasis: i === 1,
      });
    }

    return rows;
  },
};

// --- 2. The resonant angle ----------------------------------------------------

const ANGLE = {
  id: 'resonance-angle',
  live: true,
  animated: true,
  get title() {
    return t('resW.angle.title');
  },
  get note() {
    return t('resW.angle.note');
  },
  controls: [],

  draw(canvas, _v, ctx, spec) {
    const H = responsiveHeight(300, 240);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    g.clearRect(0, 0, w, H);

    const m = measureAngle(ctx, spec);
    if (!m.ready) {
      message(g, w, H, colors, t(`resW.empty.${m.reason || 'no-world'}`));
      return;
    }

    const gap = 10;
    const each = (H - gap) / 2;
    // Wrapped, on a fixed 0-360 axis: this is the plot that shows at a glance
    // whether the angle visits every value or only some of them.
    wrappedPlot(g, { x: 2, y: 0, w: w - 4, h: each }, m, colors);
    // Unwrapped, on its own axis: this is the plot the verdict is made from,
    // and the one where a circulation is a straight ramp and a libration is a
    // wave.
    unwrappedPlot(g, { x: 2, y: each + gap, w: w - 4, h: each }, m, colors);
  },

  readout(_v, ctx, spec) {
    return angleRows(measureAngle(ctx, spec));
  },
};

/**
 * The rows the angle instrument reports, from a measurement.
 *
 * Split out from the widget so it can be tested against every verdict the
 * classifier can produce without having to build a world that produces each
 * one. The classifier does not hand back centre, amplitude and period as a
 * set - a confined angle has the first two and no period, and one whose centre
 * is drifting has an amplitude and neither of the others - so each is emitted
 * only if it exists. That last case is Callisto, which is the system the lesson
 * spends longest on.
 *
 * @param {Object} m - From measureAngle
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows
 */
export function angleRows(m) {
  if (!m || !m.ready) {
    return [
      {
        label: t('resW.row.status'),
        value: t(`resW.empty.${m?.reason || 'no-world'}`),
      },
    ];
  }
  const scale = scaleOf(m.primary);
  const v = m.verdict;
  const rows = [{ label: t('resW.row.argument'), value: m.arg.label }];

  if (m.arg.ratio) {
    const measured = m.pOut / m.pIn;
    const surprise = ratioSurprise(measured, 10);
    rows.push({
      label: t('resW.row.ratio', {
        a: m.arg.referencePair[1],
        b: m.arg.referencePair[0],
      }),
      value: t('resW.value.ratio', {
        ratio: measured.toFixed(5),
        p: m.arg.ratio.p,
        q: m.arg.ratio.q,
        off: (m.arg.ratio.fractional * 100).toFixed(3),
        chance: surprise.timesCloser.toFixed(1),
      }),
    });
  }

  rows.push({
    label: t('resW.row.watched'),
    value: t('resW.value.watched', {
      cycles: (v.observedCycles ?? 0).toFixed(1),
      days: simSecondsToDays(m.window, scale.time).toFixed(0),
    }),
  });

  rows.push({
    label: t('resW.row.verdict'),
    value: verdictText(v),
    emphasis: true,
  });

  if (v.centre != null) {
    rows.push({
      label: t('resW.row.centre'),
      value: `${v.centre.toFixed(1)}\u00b0`,
    });
  }
  if (v.amplitude != null) {
    rows.push({
      label: t('resW.row.amplitude'),
      value: v.amplitudeIsBound
        ? t('resW.value.amplitudeBound', { amp: v.amplitude.toFixed(1) })
        : `\u00b1${v.amplitude.toFixed(1)}\u00b0`,
    });
  }

  const cyclesOf = duration =>
    Number.isFinite(duration) && m.synodic > 0
      ? (duration / m.synodic).toFixed(0)
      : '\u221e';

  if (v.state === ANGLE_STATE.LIBRATION) {
    rows.push({
      label: t('resW.row.libration'),
      value: v.period
        ? t('resW.value.librationPeriod', {
            days: simSecondsToDays(v.period, scale.time).toFixed(0),
            cycles: cyclesOf(v.period),
            certainty: v.periodResolved
              ? t('resW.value.measured')
              : t('resW.value.provisional'),
          })
        : t('resW.value.librationUnresolved', {
            cycles: cyclesOf(v.minimumCirculationPeriod),
          }),
    });
  } else if (v.state === ANGLE_STATE.CIRCULATION) {
    rows.push({
      label: t('resW.row.circulation'),
      value: t('resW.value.circulationPeriod', {
        days: simSecondsToDays(v.period, scale.time).toFixed(1),
        cycles: Number.isFinite(v.period / m.synodic)
          ? (v.period / m.synodic).toFixed(1)
          : '\u221e',
      }),
    });
  } else {
    rows.push({
      label: t('resW.row.needed'),
      value: t('resW.value.needed', {
        drift: Math.abs(v.drift ?? 0).toFixed(0),
        cycles: cyclesOf(v.minimumCirculationPeriod),
      }),
    });
  }

  if (m.stats?.halvings) {
    rows.push({
      label: t('resW.row.sampling'),
      value: t('resW.value.sampling', {
        n: m.stats.samples,
        every: simSecondsToDays(m.stats.interval, scale.time).toFixed(3),
      }),
    });
  }

  return rows;
}

/** A localized verdict line. @param {Object} v - From classifyAngle @returns {string} */
export function verdictText(v) {
  if (!v) return t('resW.verdict.none');
  if (v.state === ANGLE_STATE.CIRCULATION) return t('resW.verdict.circulation');
  if (v.state === ANGLE_STATE.LIBRATION) {
    if (v.reason === 'stationary') return t('resW.verdict.stationary');
    return v.periodResolved
      ? t('resW.verdict.libration')
      : t('resW.verdict.librationProvisional');
  }
  return t(`resW.inconclusive.${v.reason || 'ambiguous-drift'}`);
}

/** The wrapped angle on a fixed 0-360 axis. */
function wrappedPlot(g, box, m, colors) {
  frame(g, box, colors, t('resW.plot.wrapped'));
  const { x, y, w, h } = box;
  const pts = m.samples.filter(p => Number.isFinite(p.phi));
  if (pts.length < 2) return;

  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const tSpan = t1 - t0 || 1;
  const px = s => x + 34 + ((s.t - t0) / tSpan) * (w - 40);
  const py = phi => y + h - 14 - (phi / 360) * (h - 28);

  // The 180 line, because that is where two of the three arguments in the
  // lesson sit and a plot without it makes "about 180 degrees" a judgement.
  g.strokeStyle = colors.grid;
  g.setLineDash([3, 3]);
  for (const level of [0, 90, 180, 270, 360]) {
    g.beginPath();
    g.moveTo(x + 34, py(level));
    g.lineTo(x + w - 6, py(level));
    g.stroke();
    g.font = `9px ${MONO}`;
    g.fillStyle = colors.muted;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText(String(level), x + 30, py(level));
  }
  g.setLineDash([]);

  // Points rather than a line: a circulating angle jumps from 360 to 0 and a
  // line would draw a vertical stripe through the whole plot at every wrap.
  g.fillStyle = colors.accent;
  const step = Math.max(1, Math.floor(pts.length / 900));
  for (let i = 0; i < pts.length; i += step) {
    g.fillRect(px(pts[i]) - 0.7, py(pts[i].phi) - 0.7, 1.6, 1.6);
  }
}

/** The unwrapped angle, with the libration band or the circulation ramp. */
function unwrappedPlot(g, box, m, colors) {
  frame(g, box, colors, t('resW.plot.unwrapped'));
  const { x, y, w, h } = box;
  const u = m.verdict.unwrapped || [];
  if (u.length < 2) return;

  const t0 = m.samples[0].t;
  const t1 = m.samples[m.samples.length - 1].t;
  const tSpan = t1 - t0 || 1;
  const lo = Math.min(...u);
  const hi = Math.max(...u);
  const pad = (hi - lo) * 0.12 || 10;
  const vLo = lo - pad;
  const vHi = hi + pad;
  const px = i => x + 34 + ((m.samples[i].t - t0) / tSpan) * (w - 40);
  const py = v => y + h - 14 - ((v - vLo) / (vHi - vLo)) * (h - 28);

  // The libration band: centre and amplitude, drawn over the data they were
  // fitted to, so the two numbers in the readout are never quoted without the
  // evidence for them.
  const verdict = m.verdict;
  if (verdict.state === ANGLE_STATE.LIBRATION && verdict.amplitude != null) {
    const centre = wrapAbout(verdict.centre, (lo + hi) / 2);
    g.fillStyle = 'rgba(56, 189, 248, 0.10)';
    const top = py(centre + verdict.amplitude);
    const bottom = py(centre - verdict.amplitude);
    g.fillRect(x + 34, top, w - 40, bottom - top);
    g.strokeStyle = colors.warn;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(x + 34, py(centre));
    g.lineTo(x + w - 6, py(centre));
    g.stroke();
    g.setLineDash([]);
  }

  g.strokeStyle = colors.accent;
  g.lineWidth = 1.5;
  g.beginPath();
  const step = Math.max(1, Math.floor(u.length / 900));
  for (let i = 0; i < u.length; i += step) {
    const X = px(i);
    const Y = py(u[i]);
    if (i === 0) g.moveTo(X, Y);
    else g.lineTo(X, Y);
  }
  g.stroke();

  // The turning points the period was measured from.
  g.fillStyle = colors.good;
  for (const turn of verdict.turns || []) {
    g.beginPath();
    g.arc(px(turn.index), py(turn.value), 2.6, 0, Math.PI * 2);
    g.fill();
  }

  g.font = `9px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(`${Math.round(vHi)}`, x + 30, py(vHi));
  g.fillText(`${Math.round(vLo)}`, x + 30, py(vLo));
}

// --- 3. Conjunctions ----------------------------------------------------------

/**
 * Where two bodies line up, as seen from the primary.
 *
 * @param {Object} ctx - Live context
 * @param {Object} spec - The step's tool block
 * @returns {Object} Conjunction events and their clustering
 */
export function measureConjunctions(ctx, spec) {
  const base = collect(ctx);
  if (!base.ready) return base;
  const names = orderedNames(base.series);
  const inner = spec?.inner || names[0];
  const outer = spec?.outer || names[1];
  if (!names.includes(inner) || !names.includes(outer)) {
    return { ...base, ready: false, reason: 'no-pair' };
  }

  const events = conjunctions(
    base.series.map(s => ({
      t: s.t,
      inner: s.el[inner]?.lambda,
      outer: s.el[outer]?.lambda,
    }))
  );

  // Where the outer body was on its own orbit at each line-up. For Pluto this
  // is the whole protection mechanism in one number: every conjunction happens
  // near a true anomaly of 180 degrees, which is aphelion.
  const anomalies = [];
  let cursor = 0;
  for (const e of events) {
    while (
      cursor < base.series.length - 1 &&
      base.series[cursor + 1].t <= e.t
    ) {
      cursor++;
    }
    const f = base.series[cursor]?.el[outer]?.trueAnomaly;
    if (Number.isFinite(f)) anomalies.push({ longitude: f });
  }

  return {
    ...base,
    inner,
    outer,
    events,
    longitudes: conjunctionCluster(events),
    anomalies: conjunctionCluster(anomalies),
  };
}

const CONJUNCTIONS = {
  id: 'resonance-conjunctions',
  live: true,
  animated: true,
  get title() {
    return t('resW.conj.title');
  },
  get note() {
    return t('resW.conj.note');
  },
  controls: [],

  draw(canvas, _v, ctx, spec) {
    const H = responsiveHeight(260, 210);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    g.clearRect(0, 0, w, H);

    const m = measureConjunctions(ctx, spec);
    if (!m.ready) {
      message(g, w, H, colors, t(`resW.empty.${m.reason || 'no-world'}`));
      return;
    }
    if (!m.events.length) {
      message(g, w, H, colors, t('resW.empty.no-conjunctions'));
      return;
    }

    // Two dials. Left: where in the sky the line-ups happen. Right: where the
    // outer body is on its own orbit when they do. For a resonant pair the
    // first is a few tight clumps and the second is a single one; for a
    // non-resonant pair both are a smear all the way round.
    const r = Math.min(H / 2 - 26, w / 4 - 20);
    dial(
      g,
      w * 0.25,
      H / 2,
      r,
      m.events,
      m.longitudes,
      colors,
      t('resW.conj.sky')
    );
    dial(
      g,
      w * 0.75,
      H / 2,
      r,
      m.events.map((e, i) => ({ longitude: anomalyAt(m, i) })),
      m.anomalies,
      colors,
      t('resW.conj.orbit')
    );
  },

  readout(_v, ctx, spec) {
    const m = measureConjunctions(ctx, spec);
    if (!m.ready) {
      return [
        {
          label: t('resW.row.status'),
          value: t(`resW.empty.${m.reason || 'no-world'}`),
        },
      ];
    }
    const rows = [
      { label: t('resW.row.pair'), value: `${m.inner} / ${m.outer}` },
      { label: t('resW.row.count'), value: String(m.events.length) },
    ];
    if (!m.events.length) return rows;

    rows.push({
      label: t('resW.row.skySpread'),
      value: t('resW.value.spread', {
        mean: m.longitudes.mean.toFixed(0),
        spread: m.longitudes.spreadDeg.toFixed(0),
      }),
    });
    if (m.anomalies) {
      rows.push({
        label: t('resW.row.orbitSpread'),
        value: t('resW.value.spread', {
          mean: m.anomalies.mean.toFixed(0),
          spread: m.anomalies.spreadDeg.toFixed(0),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('resW.row.where'),
        value: whereText(m.anomalies),
      });
    }
    return rows;
  },
};

/** The outer body's true anomaly at the i-th conjunction. */
function anomalyAt(m, i) {
  const e = m.events[i];
  let best = m.series[0];
  for (const s of m.series) if (s.t <= e.t) best = s;
  return best?.el[m.outer]?.trueAnomaly ?? NaN;
}

/** "near aphelion", "near perihelion", or "all round the orbit". */
function whereText(cluster) {
  if (!cluster || cluster.R < 0.6) return t('resW.where.scattered');
  const f = cluster.mean;
  if (f > 135 && f < 225) return t('resW.where.aphelion');
  if (f < 45 || f > 315) return t('resW.where.perihelion');
  return t('resW.where.side');
}

/** One polar dial of angles, with the mean direction marked. */
function dial(g, cx, cy, r, events, cluster, colors, label) {
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  for (const a of [0, 90, 180, 270]) {
    const rad = (a * Math.PI) / 180;
    g.beginPath();
    g.moveTo(cx + Math.cos(rad) * r * 0.9, cy - Math.sin(rad) * r * 0.9);
    g.lineTo(cx + Math.cos(rad) * r, cy - Math.sin(rad) * r);
    g.stroke();
  }

  g.fillStyle = colors.accent;
  for (const e of events) {
    if (!Number.isFinite(e.longitude)) continue;
    const rad = (e.longitude * Math.PI) / 180;
    g.beginPath();
    g.arc(
      cx + Math.cos(rad) * r * 0.82,
      cy - Math.sin(rad) * r * 0.82,
      2.2,
      0,
      Math.PI * 2
    );
    g.fill();
  }

  // The mean direction, its length showing how tight the clump is: a full-
  // length arrow is a perfect cluster and a stub is a smear.
  if (cluster && Number.isFinite(cluster.mean)) {
    const rad = (cluster.mean * Math.PI) / 180;
    g.strokeStyle = cluster.R > 0.8 ? colors.good : colors.warn;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(
      cx + Math.cos(rad) * r * cluster.R,
      cy - Math.sin(rad) * r * cluster.R
    );
    g.stroke();
  }

  g.font = `10px ${MONO}`;
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText(label, cx, cy + r + 6);
}

// --- 4. The rotating frame ----------------------------------------------------

/**
 * The co-orbital bodies as seen from a frame turning with the secondary.
 *
 * @param {Object} ctx - Live context
 * @param {Object} spec - The step's tool block, optionally naming the secondary
 * @returns {Object} Tracks in the rotating frame
 */
export function measureFrame(ctx, spec) {
  const base = collect(ctx);
  if (!base.ready) return base;

  const secondaryName = spec?.secondary || 'Jupiter';
  const secondary = base.bodies.find(b => b.name === secondaryName);
  if (!secondary) return { ...base, ready: false, reason: 'no-secondary' };

  const others = base.bodies.filter(b => b !== secondary);
  const now = new Map(
    others.map(b => [
      b.name,
      rotatingFrame(b.pos, base.primary, secondary, { normalise: true }),
    ])
  );

  // Tracks are rebuilt from the record each frame rather than accumulated,
  // because the rotating frame is defined by where the secondary was at each
  // instant and a stored track would be drawn in the wrong frame the moment it
  // moved. Primary-centred and normalised by the separation, matching
  // rotatingFrame(), so the secondary is at (1, 0) and the marks this widget
  // draws for L4 and L5 are exactly (0.5, +/-sqrt(3)/2).
  const tracks = new Map(others.map(b => [b.name, []]));
  const step = Math.max(1, Math.floor(base.series.length / 600));
  for (let i = 0; i < base.series.length; i += step) {
    const s = base.series[i];
    const sec = s.el[secondaryName];
    if (!sec) continue;
    // Rebuild each body's position from its recorded elements, in the frame the
    // secondary defined at that instant. Positions relative to the primary are
    // all the transform needs, and the record has them as (r, true longitude).
    const secAngle = sec.trueLongitude;
    for (const b of others) {
      const e = s.el[b.name];
      if (!e) continue;
      const rel = (e.trueLongitude - secAngle) * (Math.PI / 180);
      const rho = e.r / sec.r;
      tracks
        .get(b.name)
        .push({ x: rho * Math.cos(rel), y: rho * Math.sin(rel) });
    }
  }

  const angles = new Map(
    others.map(b => [b.name, coorbitalAngle(b, base.primary, secondary)])
  );

  return {
    ...base,
    secondary,
    others,
    now,
    tracks,
    angles,
    points: triangularPoints(),
  };
}

const FRAME = {
  id: 'resonance-frame',
  live: true,
  animated: true,
  get title() {
    return t('resW.frame.title');
  },
  get note() {
    return t('resW.frame.note');
  },
  controls: [],

  draw(canvas, _v, ctx, spec) {
    const H = responsiveHeight(300, 240);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    g.clearRect(0, 0, w, H);

    const m = measureFrame(ctx, spec);
    if (!m.ready) {
      message(g, w, H, colors, t(`resW.empty.${m.reason || 'no-world'}`));
      return;
    }

    // Normalised coordinates: the secondary sits at (1, 0) whatever the real
    // separation, so L4 and L5 are exactly at (0.5, ±√3/2) and the picture is
    // the textbook one.
    const cx = w / 2;
    const cy = H / 2;
    const R = Math.min(w / 2 - 18, H / 2 - 18) / 1.35;
    const X = u => cx + u * R;
    const Y = u => cy - u * R;

    // The unit circle the co-orbitals share.
    g.strokeStyle = colors.grid;
    g.setLineDash([2, 4]);
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);

    // Primary, secondary, and the two triangular points.
    g.fillStyle = colors.warn;
    g.beginPath();
    g.arc(X(0), Y(0), 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = colors.ink;
    g.beginPath();
    g.arc(X(1), Y(0), 4, 0, Math.PI * 2);
    g.fill();

    g.font = `10px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const [name, p] of Object.entries(m.points)) {
      g.strokeStyle = colors.good;
      g.lineWidth = 1.2;
      const px = X(p.x);
      const py = Y(p.y);
      g.beginPath();
      g.moveTo(px - 5, py);
      g.lineTo(px + 5, py);
      g.moveTo(px, py - 5);
      g.lineTo(px, py + 5);
      g.stroke();
      g.fillStyle = colors.good;
      g.fillText(name, px, py - 13);
    }

    // Each body's track, then its current position.
    let hue = 0;
    for (const [name, track] of m.tracks) {
      const colour = `hsl(${(hue * 67) % 360} 70% 65%)`;
      hue++;
      if (track.length > 1) {
        g.strokeStyle = colour;
        g.globalAlpha = 0.55;
        g.lineWidth = 1;
        g.beginPath();
        track.forEach((p, i) => {
          const sx = X(p.x);
          const sy = Y(p.y);
          if (i === 0) g.moveTo(sx, sy);
          else g.lineTo(sx, sy);
        });
        g.stroke();
        g.globalAlpha = 1;
      }
      const at = m.now.get(name);
      if (at) {
        g.fillStyle = colour;
        g.beginPath();
        g.arc(X(at.x), Y(at.y), 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  },

  readout(_v, ctx, spec) {
    const m = measureFrame(ctx, spec);
    if (!m.ready) {
      return [
        {
          label: t('resW.row.status'),
          value: t(`resW.empty.${m.reason || 'no-world'}`),
        },
      ];
    }
    const rows = [{ label: t('resW.row.frame'), value: m.secondary.name }];
    for (const body of m.others) {
      const samples = m.series
        .map(s => {
          const e = s.el[body.name];
          const sec = s.el[m.secondary.name];
          return e && sec
            ? { t: s.t, phi: wrap360(e.trueLongitude - sec.trueLongitude) }
            : null;
        })
        .filter(Boolean);
      const period = meanPeriod(m.series, m.secondary.name);
      const v = classifyAngle(samples, { referencePeriod: period });
      // A body sitting on its Lagrange point is not a zero-amplitude tadpole,
      // it is the equilibrium the tadpoles go round, and saying "tadpole about
      // 60 degrees, amplitude 0" of it would bury the most striking thing in
      // the scene. Everything else that librates gets named by its kind:
      // a swing wider than a quarter turn has stopped encircling one
      // triangular point and become a horseshoe enclosing both.
      const librating =
        v.state === ANGLE_STATE.LIBRATION && v.reason !== 'stationary';
      rows.push({
        label: body.name,
        value: librating
          ? t('resW.value.tadpole', {
              kind:
                v.amplitude > 90
                  ? t('resW.kind.horseshoe')
                  : t('resW.kind.tadpole'),
              centre: v.centre.toFixed(0),
              amp: v.amplitude.toFixed(0),
            })
          : verdictText(v),
      });
    }
    return rows;
  },
};

export const RESONANCE_WIDGETS = [PERIODS, ANGLE, CONJUNCTIONS, FRAME];
