// =============================================================================
// The small-body instruments (Prompt 198 part 3, SMALL_BODIES.md)
// -----------------------------------------------------------------------------
// Two instruments for "The Gaps in the Belt" and "How Fast Does It Spin?", each
// standing on the kernel in js/kernels/smallbodies/:
//
//   belt-gaps    the semi-major axes of the numbered minor planets with H < 13
//                (js/data/smallbodies/numbered-h13.json, a real JPL Small-Body
//                Database cut): the histogram, a smooth baseline fitted outside
//                the resonance windows, the depletion of a window against that
//                baseline with a bootstrap interval and a verdict (resolved or
//                not resolved), the orbit-class counts, and what a magnitude-
//                limited survey keeps of a population
//   spin-curve   a SYNTHETIC light curve of a triaxial ellipsoid (a truth
//                manifest, withheld until the reader asks): nights, hours and
//                noise chosen by the reader, the periodogram, the rotation
//                period by the two-maxima rule, the amplitude and the bound it
//                puts on the axis ratio a/b, and the verdicts (ambiguous, not
//                periodic, amplitude withheld)
//
// No arithmetic of the kernel is repeated here: every number is its own, and
// tests/smallBodiesLessons.test.js recomputes each one a lesson states. The belt
// is a REAL catalog and says what its cut is (what was found, not what is
// there); the light curve is SYNTHETIC and says so. The measured light curve
// the roadmap asked for was not retrievable (tier e2 NOT RUN), so nothing here
// is presented as a real asteroid's light.
//
// The catalog (about 290 KB) arrives behind `smallBodiesReady`, which never
// rejects; until it lands the belt instrument says it is loading.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SMALLBODIES } from './i18n/en.smallbodies.js';
import { ES_SMALLBODIES } from './i18n/es.smallbodies.js';
import { fixed } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  DEFAULT_GAPS,
  catalogFromPack,
  countClasses,
  detectedFractionRatio,
  gapSurvey,
  histogram,
  meanAxisDetected,
  nightlyTimes,
  rotationFromLightCurve,
  synthLightCurve,
} from './kernels/smallbodies/index.js';
import { periodogram } from './kernels/variables/period.js';

registerMessages('en', EN_SMALLBODIES);
registerMessages('es', ES_SMALLBODIES);

const fix = (v, d = 2) => (Number.isFinite(v) ? fixed(v, d) : '-');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clampIndex = (v, n) => clamp(Math.round(v ?? 0), 0, n - 1);

// -----------------------------------------------------------------------------
// The catalog: what arrives later
// -----------------------------------------------------------------------------

let catalog = null;
let catalogFailed = false;
const surveys = new Map();

/** A test or a page that already has the pack hands it in. */
export const provideBelt = json => {
  const c = json ? catalogFromPack(json) : null;
  catalog = c?.status === 'ok' ? c : null;
  surveys.clear();
};

async function loadBelt() {
  try {
    const res = await fetch('/js/data/smallbodies/numbered-h13.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    provideBelt(await res.json());
    if (!catalog) throw new Error('not a catalog pack');
  } catch (err) {
    catalogFailed = true;
    console.warn('The small-body catalog could not be loaded:', err);
  }
}

/** Resolves true when the catalog is in; never rejects. */
export const smallBodiesReady = loadBelt().then(
  () => true,
  () => false
);

const statusRow = () => ({
  label: t('sbW.row.how'),
  value: t(catalogFailed ? 'sbW.failed' : 'sbW.loading'),
});

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------

const bare = (id, labelKey, min, max, step, value, format, decimals) => ({
  id,
  get label() {
    return t(labelKey);
  },
  min,
  max,
  step,
  value,
  decimals: decimals ?? (step < 1 ? 2 : 0),
  format,
});
const toggle = (id, labelKey, value = 0) =>
  bare(id, labelKey, 0, 1, 1, value, x => t(x >= 0.5 ? 'sbW.on' : 'sbW.off'));

// -----------------------------------------------------------------------------
// belt-gaps
// -----------------------------------------------------------------------------

/** The histogram's range and the H limits the controls offer. */
export const BELT = Object.freeze({
  loAu: 2.0,
  hiAu: 3.5,
  binAu: 0.01,
  hMin: 9,
  hMax: 13,
  widthMin: 0.5,
  widthMax: 2,
  degreeMin: 2,
  degreeMax: 6,
  draws: 400,
  seed: 'small-bodies-198:e1', // the seed and label of the validation record's e1 rows, so the default view prints their intervals
});

/** The survey's stated model: a limiting magnitude and a power-law slope (see SELECTION_ASSUMES). */
export const SURVEY = Object.freeze({ alpha: 0.5, innerAu: 2.0, outerAu: 3.5 });

const gapLabel = g => `${g.id}`;

/** What the controls ask of the kernel, and what comes back. Null while the catalog loads. */
export function beltView(v) {
  if (!catalog) return null;
  const hLimit = clamp(
    Math.round((v.hlimit ?? BELT.hMax) * 2) / 2,
    BELT.hMin,
    BELT.hMax
  );
  const scale = clamp(
    Math.round((v.width ?? 1) * 4) / 4,
    BELT.widthMin,
    BELT.widthMax
  );
  const degree = clamp(
    Math.round(v.degree ?? 4),
    BELT.degreeMin,
    BELT.degreeMax
  );
  const gi = clampIndex(v.gap ?? 1, DEFAULT_GAPS.length);
  const key = `${hLimit}|${scale}|${degree}`;
  let hit = surveys.get(key);
  if (!hit) {
    const keep = [];
    const rows = [];
    for (let i = 0; i < catalog.n; i++)
      if (catalog.H[i] < hLimit) {
        keep.push(catalog.a[i]);
        rows.push({ a: catalog.a[i], e: catalog.e[i], i: catalog.i[i] });
      }
    const a = Float64Array.from(keep);
    const gaps = DEFAULT_GAPS.map(g => ({
      ...g,
      halfWidthAu: g.halfWidthAu * scale,
    }));
    const survey = gapSurvey(a, {
      gaps,
      baselineDegree: degree,
      draws: BELT.draws,
      seed: BELT.seed,
      label: 'e1',
    });
    hit = {
      hLimit,
      scale,
      degree,
      n: a.length,
      survey,
      hist: histogram(a, {
        lo: BELT.loAu,
        hi: BELT.hiAu,
        binWidth: BELT.binAu,
      }),
      classes: countClasses(rows),
    };
    surveys.set(key, hit);
    if (surveys.size > 24) surveys.delete(surveys.keys().next().value);
  }
  return {
    ...hit,
    gap: gi,
    ok: hit.survey.status === 'ok',
    row: hit.survey.status === 'ok' ? hit.survey.gaps[gi] : null,
    showClasses: (v.classes ?? 0) >= 0.5,
    showSurvey: (v.survey ?? 0) >= 0.5,
  };
}

function drawBelt(canvas, v) {
  const f = beltView(v);
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(300, 230));
  g.fillStyle = '#0b0e16';
  g.fillRect(0, 0, w, h);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(t('sbW.b.legend'), 8, 6);
  if (!f?.ok) {
    g.fillStyle = colors.muted;
    g.fillText(t(f ? 'sbW.b.refused' : 'sbW.loading'), 8, 28);
    return;
  }
  const left = 44;
  const right = w - 10;
  const top = 38;
  const bottom = h - 32;
  const X = a =>
    left + ((a - BELT.loAu) / (BELT.hiAu - BELT.loAu)) * (right - left);
  const counts = f.hist.counts;
  const base = f.survey.baseline;
  let ymax = 1;
  for (let k = 0; k < counts.length; k++) {
    ymax = Math.max(ymax, counts[k], base.density(f.hist.centers[k]));
  }
  ymax = Math.ceil((ymax * 1.08) / 10) * 10;
  const Y = c => bottom - (c / ymax) * (bottom - top);
  const sel = f.survey.gaps[f.gap];
  g.fillStyle = 'rgba(56,189,248,0.18)';
  g.fillRect(
    X(sel.centerAu - sel.halfWidthAu),
    top,
    X(sel.centerAu + sel.halfWidthAu) - X(sel.centerAu - sel.halfWidthAu),
    bottom - top
  );
  g.fillStyle = colors.muted;
  const bw = Math.max(1, ((right - left) / counts.length) * 0.9);
  for (let k = 0; k < counts.length; k++) {
    const x = X(f.hist.centers[k]) - bw / 2;
    g.fillRect(x, Y(counts[k]), bw, bottom - Y(counts[k]));
  }
  g.strokeStyle = colors.accent;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let k = 0; k < counts.length; k++) {
    const a = f.hist.centers[k];
    if (k) g.lineTo(X(a), Y(base.density(a)));
    else g.moveTo(X(a), Y(base.density(a)));
  }
  g.stroke();
  g.lineWidth = 1;
  g.setLineDash([3, 4]);
  g.strokeStyle = colors.warn;
  g.fillStyle = colors.warn;
  g.textAlign = 'center';
  for (const gp of f.survey.gaps) {
    g.beginPath();
    g.moveTo(X(gp.centerAu), top);
    g.lineTo(X(gp.centerAu), bottom);
    g.stroke();
    g.fillText(gapLabel(gp), X(gp.centerAu), top - 14);
  }
  g.setLineDash([]);
  g.strokeStyle = colors.muted;
  g.beginPath();
  g.moveTo(left, top);
  g.lineTo(left, bottom);
  g.lineTo(right, bottom);
  g.stroke();
  g.fillStyle = colors.muted;
  g.textAlign = 'right';
  for (const c of [0, ymax / 2, ymax])
    g.fillText(fix(c, 0), left - 4, Y(c) - 6);
  g.textAlign = 'center';
  for (const a of [2.0, 2.5, 3.0, 3.5]) g.fillText(fix(a, 1), X(a), bottom + 4);
  g.fillText(t('sbW.b.axis'), (left + right) / 2, bottom + 17);
}

const REASONS = new Set([
  'too-few-expected',
  'steep-baseline',
  'uneven-flanks',
  'interval-includes-zero',
]);
const verdictWords = r =>
  r.resolved
    ? t('sbW.verdict.resolved')
    : t('sbW.verdict.not', {
        why: t(`sbW.reason.${REASONS.has(r.reason) ? r.reason : 'unknown'}`),
      });

const BELT_GAPS = {
  id: 'belt-gaps',
  get title() {
    return t('sbW.b.title');
  },
  get note() {
    return t('sbW.b.note');
  },
  animated: false,
  controls: [
    bare('gap', 'sbW.b.control.gap', 0, DEFAULT_GAPS.length - 1, 1, 1, x =>
      t('sbW.b.gapName', {
        id: DEFAULT_GAPS[clampIndex(x, DEFAULT_GAPS.length)].id,
        a: fix(DEFAULT_GAPS[clampIndex(x, DEFAULT_GAPS.length)].centerAu, 4),
      })
    ),
    bare(
      'hlimit',
      'sbW.b.control.hlimit',
      BELT.hMin,
      BELT.hMax,
      0.5,
      BELT.hMax,
      x => t('sbW.b.hName', { h: fix(x, 1) }),
      1
    ),
    bare(
      'width',
      'sbW.b.control.width',
      BELT.widthMin,
      BELT.widthMax,
      0.25,
      1,
      x => `× ${fix(x, 2)}`
    ),
    bare(
      'degree',
      'sbW.b.control.degree',
      BELT.degreeMin,
      BELT.degreeMax,
      1,
      4,
      x => fix(x, 0)
    ),
    toggle('classes', 'sbW.b.control.classes'),
    toggle('survey', 'sbW.b.control.survey'),
  ],
  presets: [
    {
      values: {
        gap: 1,
        hlimit: 13,
        width: 1,
        degree: 4,
        classes: 0,
        survey: 0,
      },
      get label() {
        return t('sbW.b.preset.default');
      },
    },
    {
      values: {
        gap: 2,
        hlimit: 13,
        width: 1,
        degree: 4,
        classes: 0,
        survey: 0,
      },
      get label() {
        return t('sbW.b.preset.five');
      },
    },
  ],
  draw: drawBelt,
  readout(v) {
    const f = beltView(v);
    if (!f) return [statusRow()];
    const rows = [
      {
        label: t('sbW.row.source'),
        value: t('sbW.b.value.source', {
          n: catalog.n,
          date: catalog.retrieved,
        }),
        emphasis: true,
      },
      { label: t('sbW.b.row.cut'), value: t('sbW.b.value.cut') },
    ];
    if (!f.ok) {
      rows.push({
        label: t('sbW.refused'),
        value: t('sbW.b.value.refused', { code: f.survey.code ?? '-' }),
      });
      return rows;
    }
    const r = f.row;
    rows.push(
      {
        label: t('sbW.b.row.used'),
        value: t('sbW.b.value.used', {
          n: f.survey.n,
          h: fix(f.hLimit, 1),
          lo: fix(BELT.loAu, 1),
          hi: fix(BELT.hiAu, 1),
        }),
      },
      {
        label: t('sbW.b.row.window'),
        value: t('sbW.b.value.window', {
          id: r.id,
          a: fix(r.centerAu, 4),
          half: fix(r.halfWidthAu, 3),
        }),
      },
      {
        label: t('sbW.b.row.found'),
        value: t('sbW.b.value.found', {
          found: r.nObs,
          expected: fix(r.nExp, 0),
        }),
        emphasis: true,
      },
      {
        label: t('sbW.b.row.depletion'),
        value: t('sbW.b.value.depletion', {
          d: fix(100 * r.depletion, 1),
          lo: fix(100 * r.lo, 1),
          hi: fix(100 * r.hi, 1),
        }),
        emphasis: true,
      },
      {
        label: t('sbW.b.row.verdict'),
        value: verdictWords(r),
        emphasis: true,
      }
    );
    if (r.warnings.length)
      rows.push({
        label: t('sbW.b.row.warnings'),
        value: r.warnings.map(w => t(`sbW.warn.${w}`)).join('; '),
      });
    for (const o of f.survey.gaps)
      if (o !== r)
        rows.push({
          label: t('sbW.b.row.other', { id: o.id }),
          value: t('sbW.b.value.other', {
            d: fix(100 * o.depletion, 0),
            verdict: t(o.resolved ? 'sbW.short.resolved' : 'sbW.short.not'),
          }),
        });
    rows.push({
      label: t('sbW.b.row.baseline'),
      value: t('sbW.b.value.baseline', {
        degree: f.degree,
        bins: f.survey.baseline.binsUsed,
        draws: f.survey.draws,
      }),
    });
    if (f.showClasses) {
      const c = f.classes.counts;
      rows.push({
        label: t('sbW.b.row.classes'),
        value: t('sbW.b.value.classes', {
          inner: c.innerMainBelt,
          middle: c.middleMainBelt,
          outer: c.outerMainBelt,
          hilda: c.hilda,
          trojan: c.trojan,
        }),
        emphasis: true,
      });
    }
    if (f.showSurvey) {
      const ratio = detectedFractionRatio(
        SURVEY.innerAu,
        SURVEY.outerAu,
        SURVEY.alpha
      );
      const mean = meanAxisDetected({
        range: [SURVEY.innerAu, SURVEY.outerAu],
        alpha: SURVEY.alpha,
      });
      rows.push(
        {
          label: t('sbW.b.row.surveyRatio'),
          value: t('sbW.b.value.surveyRatio', {
            ratio: fix(ratio, 1),
            inner: fix(SURVEY.innerAu, 1),
            outer: fix(SURVEY.outerAu, 1),
          }),
          emphasis: true,
        },
        {
          label: t('sbW.b.row.surveyMean'),
          value: t('sbW.b.value.surveyMean', {
            mean: fix(mean, 2),
            truth: fix((SURVEY.innerAu + SURVEY.outerAu) / 2, 2),
          }),
          emphasis: true,
        }
      );
    }
    rows.push({ label: t('sbW.row.how'), value: t('sbW.b.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// spin-curve
// -----------------------------------------------------------------------------

/**
 * The four synthetic targets: three triaxial ellipsoids and a star that does not
 * vary. Their truth is the manifest the kernel writes with each curve.
 */
export const SPIN_TARGETS = Object.freeze([
  Object.freeze({
    id: 'A',
    body: Object.freeze({ a: 1.5, b: 1, c: 0.8 }),
    thetaDeg: 70,
    periodHours: 6.2,
  }),
  Object.freeze({
    id: 'B',
    body: Object.freeze({ a: 1.15, b: 1, c: 0.9 }),
    thetaDeg: 60,
    periodHours: 11.4,
  }),
  Object.freeze({
    id: 'C',
    body: Object.freeze({ a: 1.4, b: 1, c: 0.8 }),
    thetaDeg: 75,
    periodHours: 8.0,
  }),
  Object.freeze({
    id: 'D',
    body: Object.freeze({ a: 1, b: 1, c: 1 }),
    thetaDeg: 90,
    periodHours: 7.0,
  }),
]);

/** What the controls offer, and the cadence the dense setting uses. */
export const SPIN = Object.freeze({
  pointsPerNight: 40,
  onceNights: 40,
  seed: 'spin-curve',
  maxNights: 8,
});

const spins = new Map();

/** The curve the controls ask for, the kernel's reading of it, and a coarse periodogram. */
export function spinView(v) {
  const ti = clampIndex(v.target ?? 0, SPIN_TARGETS.length);
  const nights = clamp(Math.round(v.nights ?? 5), 1, SPIN.maxNights);
  const hours = clamp(Math.round(v.hours ?? 7), 2, 8);
  const noise = clamp(Math.round((v.noise ?? 0.01) * 200) / 200, 0.005, 0.05);
  const once = (v.cadence ?? 0) >= 0.5;
  const key = `${ti}|${nights}|${hours}|${noise}|${once}`;
  let hit = spins.get(key);
  if (!hit) {
    const target = SPIN_TARGETS[ti];
    const times = once
      ? nightlyTimes({
          nights: SPIN.onceNights,
          hoursPerNight: 0,
          pointsPerNight: 1,
          jitterDay: 0.02,
          seed: SPIN.seed,
          label: 'times-once',
        })
      : nightlyTimes({
          nights,
          hoursPerNight: hours,
          pointsPerNight: SPIN.pointsPerNight,
          seed: SPIN.seed,
          label: `times-${hours}`,
        });
    const lc = synthLightCurve(target, times, {
      noiseMag: noise,
      seed: SPIN.seed,
      label: `noise-${ti}-${hours}`,
    });
    const rot = rotationFromLightCurve(lc.t, lc.m, { seed: SPIN.seed });
    // The light's period in days: a rotation of 2 to 30 hours is two maxima, so the light repeats every 1 to 15 hours.
    const grid = Float64Array.from(
      { length: 240 },
      (_, k) => (1 / 24) * Math.pow(15, k / 239)
    );
    const spectrum = periodogram(lc.t, lc.m, grid);
    hit = {
      target,
      nights: once ? SPIN.onceNights : nights,
      hours: once ? 0 : hours,
      noise,
      once,
      lc,
      rot,
      grid,
      spectrum,
    };
    spins.set(key, hit);
    if (spins.size > 24) spins.delete(spins.keys().next().value);
  }
  return { ...hit, showTruth: (v.truth ?? 0) >= 0.5 };
}

function drawSpin(canvas, v) {
  const f = spinView(v);
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(360, 280));
  g.fillStyle = '#0b0e16';
  g.fillRect(0, 0, w, h);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(t(f.showTruth ? 'sbW.s.legendTruth' : 'sbW.s.legend'), 8, 4);
  const { t: ts, m: ms } = f.lc;
  const left = 46;
  const right = w - 10;
  const panelH = (h - 30) / 3;
  const panel = k => ({
    top: 22 + k * panelH + 6,
    bottom: 22 + (k + 1) * panelH - 14,
  });
  const mlo = Math.min(...ms);
  const mhi = Math.max(...ms);
  const pad = (mhi - mlo) * 0.12 || 0.02;
  const frame = (p, caption) => {
    g.strokeStyle = colors.muted;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(left, p.top);
    g.lineTo(left, p.bottom);
    g.lineTo(right, p.bottom);
    g.stroke();
    g.fillStyle = colors.muted;
    g.textAlign = 'right';
    g.fillText(caption, right, p.top - 2);
    g.textAlign = 'left';
  };
  // 1. the data against time
  const p0 = panel(0);
  frame(p0, t('sbW.s.axis.time'));
  const t0 = ts[0];
  const t1 = ts[ts.length - 1];
  const X0 = x => left + ((x - t0) / (t1 - t0 || 1)) * (right - left);
  const Y0 = m =>
    p0.top + ((m - (mlo - pad)) / (mhi - mlo + 2 * pad)) * (p0.bottom - p0.top);
  g.fillStyle = colors.accent;
  for (let i = 0; i < ts.length; i++)
    g.fillRect(X0(ts[i]) - 1, Y0(ms[i]) - 1, 2, 2);
  g.fillStyle = colors.muted;
  g.textAlign = 'right';
  g.fillText(fix(mlo, 2), left - 4, p0.top);
  g.fillText(fix(mhi, 2), left - 4, p0.bottom - 12);
  // 2. the periodogram against the rotation period
  const p1 = panel(1);
  frame(p1, t('sbW.s.axis.period'));
  const pmax = Math.max(...f.spectrum, 1e-9);
  const rlo = f.grid[0] * 48;
  const rhi = f.grid[f.grid.length - 1] * 48;
  const X1 = hrs =>
    left +
    ((Math.log(hrs) - Math.log(rlo)) / (Math.log(rhi) - Math.log(rlo))) *
      (right - left);
  g.strokeStyle = colors.accent;
  g.lineWidth = 1.5;
  g.beginPath();
  f.grid.forEach((pd, k) => {
    const x = X1(pd * 48);
    const y = p1.bottom - (f.spectrum[k] / pmax) * (p1.bottom - p1.top);
    if (k) g.lineTo(x, y);
    else g.moveTo(x, y);
  });
  g.stroke();
  const P = f.rot.status === 'ok' ? f.rot.periodHours : null;
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  for (const hr of [3, 6, 12, 24])
    if (hr >= rlo && hr <= rhi) g.fillText(`${hr}`, X1(hr), p1.bottom + 1);
  if (P && P >= rlo && P <= rhi) {
    g.strokeStyle = colors.warn;
    g.setLineDash([3, 4]);
    g.beginPath();
    g.moveTo(X1(P), p1.top);
    g.lineTo(X1(P), p1.bottom);
    g.stroke();
    g.setLineDash([]);
  }
  // 3. the fold at the rotation period (two turns)
  const p2 = panel(2);
  frame(p2, t('sbW.s.axis.phase'));
  if (P) {
    g.fillStyle = colors.accent;
    const Y2 = m =>
      p2.top +
      ((m - (mlo - pad)) / (mhi - mlo + 2 * pad)) * (p2.bottom - p2.top);
    for (let rep = 0; rep < 2; rep++)
      for (let i = 0; i < ts.length; i++) {
        const ph = (((ts[i] - t0) * 24) / P) % 1;
        const x = left + ((ph + rep) / 2) * (right - left);
        g.fillRect(x - 1, Y2(ms[i]) - 1, 2, 2);
      }
  }
  g.textAlign = 'left';
}

const truthRows = f => {
  const tr = f.lc.truth;
  return [
    {
      label: t('sbW.s.row.truth'),
      value: t('sbW.s.value.truth', {
        p: fix(tr.periodHours, 2),
        ab: fix(tr.body.a / tr.body.b, 2),
        bc: fix(tr.body.b / tr.body.c, 2),
        th: fix(tr.thetaDeg, 0),
        amp: fix(tr.amplitudeMag, 3),
      }),
      emphasis: true,
    },
  ];
};

const SPIN_CURVE = {
  id: 'spin-curve',
  get title() {
    return t('sbW.s.title');
  },
  get note() {
    return t('sbW.s.note');
  },
  animated: false,
  controls: [
    bare(
      'target',
      'sbW.s.control.target',
      0,
      SPIN_TARGETS.length - 1,
      1,
      0,
      x =>
        t('sbW.s.targetName', {
          id: SPIN_TARGETS[clampIndex(x, SPIN_TARGETS.length)].id,
        })
    ),
    bare('nights', 'sbW.s.control.nights', 1, SPIN.maxNights, 1, 5, x =>
      fix(x, 0)
    ),
    bare('hours', 'sbW.s.control.hours', 2, 8, 1, 7, x => `${fix(x, 0)} h`),
    bare(
      'noise',
      'sbW.s.control.noise',
      0.005,
      0.05,
      0.005,
      0.01,
      x => `${fix(x, 3)} mag`,
      3
    ),
    bare('cadence', 'sbW.s.control.cadence', 0, 1, 1, 0, x =>
      t(x >= 0.5 ? 'sbW.s.cadence.once' : 'sbW.s.cadence.dense')
    ),
    toggle('truth', 'sbW.s.control.truth'),
  ],
  presets: [
    {
      values: {
        target: 0,
        nights: 5,
        hours: 7,
        noise: 0.01,
        cadence: 0,
        truth: 0,
      },
      get label() {
        return t('sbW.s.preset.default');
      },
    },
    {
      values: {
        target: 0,
        nights: 5,
        hours: 7,
        noise: 0.01,
        cadence: 1,
        truth: 0,
      },
      get label() {
        return t('sbW.s.preset.once');
      },
    },
  ],
  draw: drawSpin,
  readout(v) {
    const f = spinView(v);
    const r = f.rot;
    const rows = [
      {
        label: t('sbW.row.source'),
        value: t('sbW.s.value.source'),
        emphasis: true,
      },
      {
        label: t('sbW.s.row.data'),
        value: t(f.once ? 'sbW.s.value.dataOnce' : 'sbW.s.value.data', {
          n: f.lc.t.length,
          nights: f.nights,
          hours: f.hours,
          noise: fix(f.noise, 3),
        }),
      },
    ];
    if (r.status !== 'ok') {
      rows.push({
        label: t('sbW.refused'),
        value: t('sbW.s.value.refused', { code: r.code ?? '-' }),
      });
      if (f.showTruth) rows.push(...truthRows(f));
      return rows;
    }
    rows.push({
      label: t('sbW.s.row.peak'),
      value: t('sbW.s.value.peak', {
        p: fix(r.peakPeriodHours, 3),
        power: fix(r.power, 2),
        fap: r.falseAlarm < 1e-3 ? t('sbW.s.value.tiny') : fix(r.falseAlarm, 3),
      }),
    });
    if (r.verdict === 'not-periodic') {
      rows.push({
        label: t('sbW.s.row.verdict'),
        value: t('sbW.s.value.notPeriodic'),
        emphasis: true,
      });
      if (f.showTruth) rows.push(...truthRows(f));
      rows.push({ label: t('sbW.row.how'), value: t('sbW.s.value.how') });
      return rows;
    }
    rows.push({
      label: t('sbW.s.row.period'),
      value: t('sbW.s.value.period', {
        p: fix(r.periodHours, 3),
        s: fix(r.sigmaHours, 3),
      }),
      emphasis: true,
    });
    rows.push({
      label: t('sbW.s.row.verdict'),
      value: t(
        r.verdict === 'ambiguous'
          ? 'sbW.s.value.ambiguous'
          : 'sbW.s.value.single'
      ),
      emphasis: r.verdict === 'ambiguous',
    });
    if (r.candidates)
      rows.push({
        label: t('sbW.s.row.candidates'),
        value: t('sbW.s.value.candidates', {
          p1: fix(r.candidates[0].periodHours, 2),
          p2: fix(r.candidates[1].periodHours, 2),
        }),
      });
    rows.push({
      label: t('sbW.s.row.alternative'),
      value: t('sbW.s.value.alternative', {
        p: fix(r.alternative.periodHours, 2),
      }),
    });
    if (r.amplitudeMag === null)
      rows.push({
        label: t('sbW.s.row.amplitude'),
        value: t(`sbW.s.value.withheld.${r.amplitudeWithheld}`, {
          gap: fix(r.phaseGap, 2),
        }),
        emphasis: true,
      });
    else {
      const ai = r.amplitudeInterval;
      rows.push({
        label: t('sbW.s.row.amplitude'),
        value: t('sbW.s.value.amplitude', {
          a: fix(r.amplitudeMag, 3),
          lo: fix(ai.lo, 3),
          hi: fix(ai.hi, 3),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('sbW.s.row.bound'),
        value: t('sbW.s.value.bound', {
          b: fix(r.axisRatioBound.value, 2),
          est: fix(r.axisRatioBound.atEstimate, 2),
        }),
        emphasis: true,
      });
    }
    if (f.showTruth) rows.push(...truthRows(f));
    rows.push({ label: t('sbW.row.how'), value: t('sbW.s.value.how') });
    return rows;
  },
};

export const SMALL_BODIES_WIDGETS = [BELT_GAPS, SPIN_CURVE];
