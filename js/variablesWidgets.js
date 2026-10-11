// =============================================================================
// The variable-star instruments
// -----------------------------------------------------------------------------
// Three instruments over the variable-star kernel (js/kernels/variables,
// TIME_DOMAIN_LADDER.md) and its data (js/variablesData.js):
//
//   variable-fold   fold a light curve on a trial period: two real TESS stars
//                   and a real star seen once a night (the aliases)
//   leavitt-law     the Cepheid period-luminosity relation, fitted on the LMC and
//                   used to measure a host's distance with its error budget
//   variable-class  a labelled synthetic sample of five kinds of variable and
//                   a nearest-neighbour classifier with its confusion table
//
// The stars and the Cepheids are authentic; the classification sample is
// synthetic and the instrument says so. Every number a lesson asks for is a
// row of the readout under the picture.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_VARIABLES } from './i18n/en.variables.js';
import { ES_VARIABLES } from './i18n/es.variables.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { loadVariablesData, ANCHORS } from './variablesData.js';
import {
  harmonicFit,
  curveStats,
  phasesOf,
  findPeriod,
  refinePeriod,
  bootstrapPeriod,
  aliasPeriods,
  fitLeavitt,
  ladderDistance,
  wesenheitResidual,
  classifyLeaveOneOut,
  confusion,
  FEATURE_SETS,
  CLASSES,
} from './kernels/variables/index.js';

registerMessages('en', EN_VARIABLES);
registerMessages('es', ES_VARIABLES);

let data = null;
let law = null;
/**
 * Resolves true once the data have been tried. Never rejects: a missing file
 * is logged and the rows keep reading "loading".
 */
export const variablesReady = Promise.all([
  loadVariablesData(),
  import('./data/radiation/extinction.js'),
])
  .then(([d, ext]) => {
    data = d;
    law = ext.LAW;
    return true;
  })
  .catch(err => {
    console.warn('The variable-star data could not be loaded:', err);
    return true;
  });

const num = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const signed = v => (v < 0 ? `−${num(-v)}` : num(v));
const isOn = x => x >= 0.5;
const loading = () => [{ label: t('varW.row.state'), value: t('varW.loading') }];

// -----------------------------------------------------------------------------
// The stars
// -----------------------------------------------------------------------------

/** The three series the fold instrument shows, and where to search for each. */
export const STARS = Object.freeze([
  { id: 'suDra', source: 'suDra', range: [0.15, 5], nightly: false },
  { id: 'etaAql', source: 'etaAql', range: [1, 20], nightly: false },
  { id: 'suDraNightly', source: 'suDra', range: [0.15, 5], nightly: true },
]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const starAt = v => STARS[clamp(v.star, 0, STARS.length - 1)];

/** One visit a night: the bins within 0.3 to 0.4 day after each integer BTJD. */
export function nightlyRows(tt) {
  const keep = [];
  for (let i = 0; i < tt.length; i++) {
    const f = tt[i] - Math.floor(tt[i]);
    if (f >= 0.3 && f < 0.4) keep.push(i);
  }
  return keep;
}

const analyses = new Map();
/** The pipeline on one star, once: period, width, refinement, bootstrap, curve. */
export function analysisOf(index, source = data) {
  const star = STARS[index];
  if (!star || !source) return null;
  const key = `${index}`;
  if (analyses.has(key) && source === data) return analyses.get(key);
  const lc = source[star.source];
  const rows = star.nightly
    ? nightlyRows(lc.t)
    : Array.from({ length: lc.t.length }, (_, i) => i);
  const tt = Float64Array.from(rows, i => lc.t[i]);
  const mag = Float64Array.from(rows, i => lc.mag[i]);
  const found = findPeriod(tt, mag, {
    minPeriod: star.range[0],
    maxPeriod: star.range[1],
    oversample: 8,
  });
  const K = star.nightly ? 3 : 6;
  const refined = refinePeriod(tt, mag, found.period, K, 0.5 * found.width);
  const fit = harmonicFit(tt, mag, refined.period, K, { t0: tt[0] });
  // The bootstrap on every third point of a long series: it assumes
  // independent points and is a floor, so thinning changes little.
  const step = tt.length > 700 ? Math.ceil(tt.length / 600) : 1;
  const bt = Float64Array.from({ length: Math.ceil(tt.length / step) }, (_, i) => tt[i * step]);
  const bm = Float64Array.from({ length: bt.length }, (_, i) => mag[i * step]);
  const boot = bootstrapPeriod(bt, bm, refined.period, {
    K: 2,
    resamples: 20,
    seed: `fold:${index}`,
  });
  const out = {
    star,
    t: tt,
    mag,
    found,
    refined,
    fit,
    stats: fit ? curveStats(fit) : null,
    boot,
    aliases: aliasPeriods(refined.period, 1, 1),
    cycles: found.baseline / refined.period,
  };
  if (source === data) analyses.set(key, out);
  return out;
}

// -----------------------------------------------------------------------------
// Drawing helpers
// -----------------------------------------------------------------------------

function plot(canvas, xr, yr, labels, { base = 260, logX = false } = {}) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, 210));
  const r = { x: 52, y: 12, w: w - 66, h: h - 44 };
  const fx = logX ? Math.log10 : x => x;
  const X = x => r.x + ((fx(x) - fx(xr[0])) / (fx(xr[1]) - fx(xr[0]))) * r.w;
  const Y = y => r.y + ((y - yr[0]) / (yr[1] - yr[0])) * r.h;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  const ticks = (lo, hi) => {
    const raw = (hi - lo) / 6;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
      out.push(Math.abs(v) < 1e-9 ? 0 : v);
    return out;
  };
  const xt = logX
    ? [0.1, 0.2, 0.5, 1, 2, 5, 10, 20].filter(v => v >= xr[0] && v <= xr[1])
    : ticks(...xr);
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const v of xt)
    g.fillText(String(Math.round(v * 1e6) / 1e6), X(v), r.y + r.h + 4);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const v of ticks(...yr))
    g.fillText(String(Math.round(v * 1e6) / 1e6), r.x - 5, Y(v));
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillText(t(labels[0]), r.x, r.y + r.h + 20);
  g.textAlign = 'right';
  g.fillText(t(labels[1]), r.x + r.w, r.y + 2);
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
  return { g, r, X, Y, colors, done: () => g.restore() };
}
const dot = (g, x, y, rad, fill) => {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, rad, 0, 2 * Math.PI);
  g.fill();
};
const note = (canvas, key) => {
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(120, 100));
  g.fillStyle = palette().muted;
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'center';
  g.fillText(t(key), w / 2, h / 2);
};
const sourceRow = key => ({
  label: t('varW.row.source'),
  value: t(key),
  emphasis: true,
});

// -----------------------------------------------------------------------------
// Fold a light curve
// -----------------------------------------------------------------------------

/** The period the fold uses, from the controls. */
export function foldPeriod(a, v) {
  const mult = [0.5, 1, 2][clamp(v.multiple, 0, 2)];
  return a.refined.period * mult * (1 + v.offset / 100);
}

function drawFold(canvas, v) {
  const a = analysisOf(clamp(v.star, 0, 2));
  if (!a) return note(canvas, 'varW.loading');
  const lo = Math.min(...a.mag);
  const hi = Math.max(...a.mag);
  const pad = 0.05 * (hi - lo);
  const yr = [hi + pad, lo - pad]; // brighter is up
  if (clamp(v.view, 0, 2) === 0) {
    const p = plot(canvas, [a.t[0], a.t.at(-1)], yr, ['varW.f.axisT', 'varW.f.axisM']);
    for (let i = 0; i < a.t.length; i++)
      dot(p.g, p.X(a.t[i]), p.Y(a.mag[i]), 1.8, p.colors.accent);
    p.done();
  } else if (clamp(v.view, 0, 2) === 1) {
    const f = a.found;
    const p = plot(canvas, a.star.range, [1.05, -0.02], ['varW.f.axisP', 'varW.f.axisPow'], {
      logX: true,
    });
    p.g.strokeStyle = p.colors.accent;
    p.g.lineWidth = 1.5;
    p.g.beginPath();
    f.grid.forEach((P, i) => {
      const x = p.X(P);
      const y = p.Y(f.spectrum[i]);
      if (i === 0) p.g.moveTo(x, y);
      else p.g.lineTo(x, y);
    });
    p.g.stroke();
    p.g.strokeStyle = p.colors.warn;
    p.g.lineWidth = 2;
    for (const P of [a.refined.period, ...a.aliases.map(x => x.period)]) {
      if (P < a.star.range[0] || P > a.star.range[1]) continue;
      p.g.beginPath();
      p.g.moveTo(p.X(P), p.Y(0));
      p.g.lineTo(p.X(P), p.Y(1.05));
      p.g.stroke();
    }
    p.done();
  } else {
    const P = foldPeriod(a, v);
    const ph = phasesOf(a.t, P, a.t[0]);
    const p = plot(canvas, [0, 2], yr, ['varW.f.axisPhase', 'varW.f.axisM']);
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < ph.length; i++)
        dot(p.g, p.X(ph[i] + c), p.Y(a.mag[i]), 1.8, p.colors.accent);
    if (a.fit && Math.abs(P / a.refined.period - 1) < 1e-9) {
      p.g.strokeStyle = p.colors.warn;
      p.g.lineWidth = 2;
      p.g.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = i / 100;
        const y = a.fit.at(a.fit.t0 + (x % 1) * a.fit.period);
        if (i === 0) p.g.moveTo(p.X(x), p.Y(y));
        else p.g.lineTo(p.X(x), p.Y(y));
      }
      p.g.stroke();
    }
    p.done();
  }
}

const FOLD = {
  id: 'variable-fold',
  get title() {
    return t('varW.f.title');
  },
  get note() {
    return t('varW.f.note');
  },
  animated: false,
  controls: [
    {
      id: 'star',
      get label() {
        return t('varW.f.control.star');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`varW.f.star.${clamp(v, 0, 2)}`),
    },
    {
      id: 'view',
      get label() {
        return t('varW.f.control.view');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`varW.f.view.${clamp(v, 0, 2)}`),
    },
    {
      id: 'multiple',
      get label() {
        return t('varW.f.control.multiple');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(`varW.f.multiple.${clamp(v, 0, 2)}`),
    },
    {
      id: 'offset',
      get label() {
        return t('varW.f.control.offset');
      },
      min: -5,
      max: 5,
      step: 0.1,
      value: 0,
      decimals: 1,
      format: v => `${signed(v)} %`,
    },
  ],
  presets: [
    {
      values: { star: 0, view: 0, multiple: 1, offset: 0 },
      get label() {
        return t('varW.f.preset.suDra');
      },
    },
    {
      values: { star: 1, view: 0, multiple: 1, offset: 0 },
      get label() {
        return t('varW.f.preset.etaAql');
      },
    },
    {
      values: { star: 2, view: 1, multiple: 1, offset: 0 },
      get label() {
        return t('varW.f.preset.nightly');
      },
    },
  ],
  draw: drawFold,
  readout(v) {
    const a = analysisOf(clamp(v.star, 0, 2));
    if (!a) return loading();
    const P = foldPeriod(a, v);
    const s = a.stats;
    const al = a.aliases;
    return [
      sourceRow(a.star.nightly ? 'varW.f.source.nightly' : 'varW.f.source.tess'),
      { label: t('varW.f.row.points'), value: String(a.t.length) },
      {
        label: t('varW.f.row.peak'),
        value: withUnit(num(a.found.period, 4), 'd'),
        emphasis: true,
      },
      {
        label: t('varW.f.row.width'),
        value: withUnit(num(a.found.width, 3), 'd'),
        emphasis: true,
      },
      {
        label: t('varW.f.row.period'),
        value: withUnit(num(a.refined.period, 5), 'd'),
        emphasis: true,
      },
      {
        label: t('varW.f.row.error'),
        value: withUnit(num(a.boot.sigma, 2), 'd'),
        emphasis: true,
      },
      { label: t('varW.f.row.cycles'), value: num(a.cycles, 3) },
      {
        label: t('varW.f.row.alias1'),
        value: al[0] ? withUnit(num(al[0].period, 4), 'd') : '—',
        emphasis: true,
      },
      {
        label: t('varW.f.row.alias2'),
        value: al[1] ? withUnit(num(al[1].period, 4), 'd') : '—',
        emphasis: true,
      },
      {
        label: t('varW.f.row.amplitude'),
        value: s ? withUnit(num(s.amplitude, 3), 'mag') : '—',
        emphasis: true,
      },
      {
        label: t('varW.f.row.r21'),
        value: s ? num(s.r21, 3) : '—',
      },
      { label: t('varW.f.row.fold'), value: withUnit(num(P, 5), 'd') },
      {
        label: t('varW.f.row.how'),
        value: t('varW.f.value.how'),
      },
    ];
  },
};

// -----------------------------------------------------------------------------
// Leavitt's law
// -----------------------------------------------------------------------------

const HOSTS = ['lmc', 'n4258', 'm101'];
const hostAt = v => HOSTS[clamp(v.host, 0, 2)];

export function leavittView(v, source = data) {
  if (!source) return null;
  const c = source.cepheids;
  const anchor = c.lmc;
  const calibration = fitLeavitt(anchor.periods, anchor.mags);
  const key = hostAt(v);
  const result =
    key === 'lmc'
      ? null
      : ladderDistance(c[key], anchor, ANCHORS.lmc, {});
  return {
    key,
    c,
    calibration,
    result,
    truth: key === 'n4258' ? ANCHORS.n4258 : null,
    dust: law ? wesenheitResidual(law, 3.3) : null,
  };
}

function drawLeavitt(canvas, v) {
  const f = leavittView(v);
  if (!f) return note(canvas, 'varW.loading');
  const all = [...f.c.lmc.mags, ...(f.key === 'lmc' ? [] : f.c[f.key].mags)];
  const lo = Math.min(...all) - 0.3;
  const hi = Math.max(...all) + 0.3;
  const p = plot(canvas, [3, 150], [hi, lo], ['varW.l.axisP', 'varW.l.axisM'], {
    logX: true,
  });
  const pts = (s, fill, rad) => {
    for (let i = 0; i < s.periods.length; i++)
      dot(p.g, p.X(s.periods[i]), p.Y(s.mags[i]), rad, fill);
  };
  pts(f.c.lmc, p.colors.grid, 2);
  const line = (mu, color) => {
    p.g.strokeStyle = color;
    p.g.lineWidth = 2;
    p.g.beginPath();
    [4, 120].forEach((P, i) => {
      const y = f.calibration.a + f.calibration.b * (Math.log10(P) - 1) + mu;
      if (i === 0) p.g.moveTo(p.X(P), p.Y(y));
      else p.g.lineTo(p.X(P), p.Y(y));
    });
    p.g.stroke();
  };
  line(0, p.colors.muted);
  if (f.result) {
    pts(f.c[f.key], p.colors.accent, 2.4);
    line(f.result.mu - ANCHORS.lmc.mu, p.colors.warn);
  }
  p.done();
}

const LEAVITT = {
  id: 'leavitt-law',
  get title() {
    return t('varW.l.title');
  },
  get note() {
    return t('varW.l.note');
  },
  animated: false,
  controls: [
    {
      id: 'host',
      get label() {
        return t('varW.l.control.host');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`varW.l.host.${clamp(v, 0, 2)}`),
    },
  ],
  presets: [
    {
      values: { host: 0 },
      get label() {
        return t('varW.l.preset.lmc');
      },
    },
    {
      values: { host: 1 },
      get label() {
        return t('varW.l.preset.n4258');
      },
    },
    {
      values: { host: 2 },
      get label() {
        return t('varW.l.preset.m101');
      },
    },
  ],
  draw: drawLeavitt,
  readout(v) {
    const f = leavittView(v);
    if (!f) return loading();
    const c = f.calibration;
    const rows = [
      sourceRow('varW.l.source'),
      { label: t('varW.l.row.stars'), value: String(c.n) },
      {
        label: t('varW.l.row.slope'),
        value: withUnit(`${signed(c.b)} ± ${num(c.sigmaB, 2)}`, 'mag/dex'),
        emphasis: true,
      },
      {
        label: t('varW.l.row.zero'),
        value: withUnit(`${num(c.a, 4)} ± ${num(c.sigmaA, 2)}`, 'mag'),
        emphasis: true,
      },
      {
        label: t('varW.l.row.scatter'),
        value: withUnit(num(c.rms, 3), 'mag'),
        emphasis: true,
      },
    ];
    if (f.dust)
      rows.push({
        label: t('varW.l.row.dust'),
        value: num(f.dust.residual, 2),
        emphasis: true,
      });
    if (f.result) {
      const r = f.result;
      const term = id => r.budget.find(b => b.id === id).sigma;
      rows.push(
        { label: t('varW.l.row.hostStars'), value: String(r.hostN) },
        {
          label: t('varW.l.row.mu'),
          value: withUnit(`${num(r.mu, 4)} ± ${num(r.sigma, 2)}`, 'mag'),
          emphasis: true,
        },
        {
          label: t('varW.l.row.distance'),
          value: withUnit(
            `${num(r.distanceMpc, 3)} ± ${num(r.distanceErrorMpc, 2)}`,
            'Mpc'
          ),
          emphasis: true,
        },
        { label: t('varW.l.row.budgetHost'), value: withUnit(num(term('host'), 2), 'mag') },
        { label: t('varW.l.row.budgetAnchor'), value: withUnit(num(term('anchor'), 2), 'mag') },
        { label: t('varW.l.row.budgetSlope'), value: withUnit(num(term('slope'), 2), 'mag') },
        {
          label: t('varW.l.row.budgetDistance'),
          value: withUnit(num(term('anchorDistance'), 2), 'mag'),
        }
      );
      if (f.truth)
        rows.push({
          label: t('varW.l.row.maser'),
          value: withUnit(`${num(f.truth.mu, 4)} ± ${num(f.truth.sigma, 2)}`, 'mag'),
          emphasis: true,
        });
    }
    rows.push({ label: t('varW.l.row.how'), value: t('varW.l.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// Which kind of variable
// -----------------------------------------------------------------------------

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross'];
const HUES = ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e'];
const mark = (g, kind, x, y, r, fill) => {
  g.fillStyle = fill;
  g.strokeStyle = fill;
  g.lineWidth = 1.6;
  g.beginPath();
  if (kind === 'circle') g.arc(x, y, r, 0, 2 * Math.PI);
  else if (kind === 'square') g.rect(x - r, y - r, 2 * r, 2 * r);
  else if (kind === 'triangle') {
    g.moveTo(x, y - r - 1);
    g.lineTo(x + r + 1, y + r);
    g.lineTo(x - r - 1, y + r);
    g.closePath();
  } else if (kind === 'diamond') {
    g.moveTo(x, y - r - 1);
    g.lineTo(x + r + 1, y);
    g.lineTo(x, y + r + 1);
    g.lineTo(x - r - 1, y);
    g.closePath();
  } else {
    g.moveTo(x - r, y - r);
    g.lineTo(x + r, y + r);
    g.moveTo(x + r, y - r);
    g.lineTo(x - r, y + r);
    g.stroke();
    return;
  }
  g.fill();
};

const classCache = new Map();
/** The classifier's result for a feature set, once. */
export function classView(v, source = data) {
  if (!source) return null;
  const set = ['period', 'periodAmplitude', 'shape'][clamp(v.features, 0, 2)];
  if (classCache.has(set) && source === data) return classCache.get(set);
  const rows = source.sample;
  const predicted = classifyLeaveOneOut(rows, FEATURE_SETS[set], 5);
  const table = confusion(rows, predicted);
  const out = { set, rows, predicted, table };
  if (source === data) classCache.set(set, out);
  return out;
}

function drawClasses(canvas, v) {
  const f = classView(v);
  if (!f) return note(canvas, 'varW.loading');
  const shape = clamp(v.view, 0, 1) === 1;
  const ys = f.rows.map(r => (shape ? r.r21 : r.logAmp));
  const yr = shape ? [1.3, -0.05] : [0.6, -2.3];
  const p = plot(canvas, [-1.5, 1.6], yr, [
    'varW.c.axisLogP',
    shape ? 'varW.c.axisR21' : 'varW.c.axisLogAmp',
  ]);
  const ids = CLASSES.map(c => c.id);
  f.rows.forEach((r, i) => {
    const k = ids.indexOf(r.cls);
    mark(p.g, SHAPES[k], p.X(r.logP), p.Y(ys[i]), 3.2, HUES[k]);
  });
  p.done();
}

const CLASSIFY = {
  id: 'variable-class',
  get title() {
    return t('varW.c.title');
  },
  get note() {
    return t('varW.c.note');
  },
  animated: false,
  controls: [
    {
      id: 'features',
      get label() {
        return t('varW.c.control.features');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`varW.c.features.${clamp(v, 0, 2)}`),
    },
    {
      id: 'view',
      get label() {
        return t('varW.c.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'varW.c.view.shape' : 'varW.c.view.amplitude'),
    },
  ],
  presets: [
    {
      values: { features: 0, view: 0 },
      get label() {
        return t('varW.c.preset.period');
      },
    },
    {
      values: { features: 1, view: 0 },
      get label() {
        return t('varW.c.preset.amplitude');
      },
    },
    {
      values: { features: 2, view: 1 },
      get label() {
        return t('varW.c.preset.shape');
      },
    },
  ],
  draw: drawClasses,
  readout(v) {
    const f = classView(v);
    if (!f) return loading();
    const ids = f.table.classes;
    const rows = [
      sourceRow('varW.c.source'),
      { label: t('varW.c.row.stars'), value: String(f.rows.length) },
      {
        label: t('varW.c.row.accuracy'),
        value: `${num(100 * f.table.accuracy, 3)} %`,
        emphasis: true,
      },
    ];
    ids.forEach((id, i) =>
      rows.push({
        label: t('varW.c.row.truth', { cls: t(`varW.c.class.${id}`) }),
        value: f.table.matrix[i]
          .map((n, j) => (n ? `${t(`varW.c.short.${ids[j]}`)} ${n}` : null))
          .filter(Boolean)
          .join(' · '),
        emphasis: id === 'rrab' || id === 'eclipsing',
      })
    );
    ids.forEach((id, i) =>
      rows.push({
        label: t('varW.c.row.recall', { cls: t(`varW.c.class.${id}`) }),
        value: `${num(100 * f.table.perClass[i].recall, 3)} %`,
      })
    );
    rows.push({ label: t('varW.c.row.how'), value: t('varW.c.value.how') });
    return rows;
  },
};

export const VARIABLES_WIDGETS = [FOLD, LEAVITT, CLASSIFY];
