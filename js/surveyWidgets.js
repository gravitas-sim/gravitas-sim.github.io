// =============================================================================
// The survey instruments
// -----------------------------------------------------------------------------
// Three instruments over the survey model (js/survey/model.js, SELECTION_
// EFFECTS.md): who a magnitude-limited survey counts, why the bright stars
// win (Malmquist bias, and the bias of trusting well-measured parallaxes) and
// how a completeness function is corrected for. The stars are synthetic and
// the truth is known; every number a lesson asks for is a row of the readout
// under the picture, and the picture is never the only place a value is.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SURVEY } from './i18n/en.survey.js';
import { ES_SURVEY } from './i18n/es.survey.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  makeUniverse,
  observe,
  edgesOf,
  limitDistance,
  trueLuminosityFunction,
  recoveredLuminosityFunction,
  malmquistBias,
  malmquistShells,
  malmquistAtMagnitude,
  malmquistFormula,
  parallaxSelectionBias,
  completenessCurve,
  cumulativeCounts,
} from './survey/model.js';

registerMessages('en', EN_SURVEY);
registerMessages('es', ES_SURVEY);

/** The universes the instruments share. Fixed seeds: a lesson's numbers are reproducible. */
export const UNIVERSES = Object.freeze({
  population: {
    kind: 'population',
    count: 3000,
    seed: 'survey-lab-1',
    maxPc: 1000,
    areaDeg2: 100,
  },
  deep: {
    kind: 'population',
    count: 6000,
    seed: 'survey-lab-2',
    maxPc: 1000,
    areaDeg2: 100,
  },
  candle: {
    kind: 'gaussian',
    count: 30000,
    seed: 'survey-lab-3',
    maxPc: 500,
    areaDeg2: 100,
    meanM: 10,
    sigmaM: 0.7,
  },
});
const universes = new Map();
const universe = id => {
  if (!universes.has(id)) universes.set(id, makeUniverse(UNIVERSES[id]));
  return universes.get(id);
};
const observations = new Map();
const observeCached = (id, instrument) => {
  const key = `${id}:${JSON.stringify(instrument)}`;
  if (!observations.has(key)) {
    if (observations.size > 24)
      observations.delete(observations.keys().next().value);
    observations.set(key, observe(universe(id), instrument));
  }
  return observations.get(key);
};

const num = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const signed = v => (v < 0 ? `−${num(-v)}` : num(v));
const isOn = x => x >= 0.5;
const pct = x => t('svyW.c.value.share', { p: num(100 * x, 3) });

/** A weaker astrometer than Gaia, so that selecting on parallax is visible. */
export const POOR_ASTROMETRY = Object.freeze({
  parallax: Object.freeze({ floor: 0.1, m0: 12, slope: 0.2 }),
  pm: Object.freeze({ floor: 0.1, m0: 12, slope: 0.2 }),
});

export const SHELLS = Object.freeze({
  population: [0, 250, 500, 750, 1000],
  candle: [0, 125, 250, 375, 500],
});
export const BINS = edgesOf(-2, 12, 2);

// -----------------------------------------------------------------------------
// Pure views, for the instruments and for the tests
// -----------------------------------------------------------------------------

export function countsView(v) {
  const obs = observeCached('population', { limit: v.limit });
  const u = obs.universe;
  let faintMissed = 0;
  let missed = 0;
  let sumAll = 0;
  let sumSeen = 0;
  for (let i = 0; i < u.n; i++) {
    sumAll += u.M[i];
    if (obs.detected[i]) sumSeen += u.M[i];
    else {
      missed++;
      if (u.M[i] > 8) faintMissed++;
    }
  }
  return {
    obs,
    total: u.n,
    counted: obs.count,
    missed,
    fraction: obs.count / u.n,
    faintShare: missed ? faintMissed / missed : 0,
    sunPc: limitDistance(4.74, v.limit),
    dwarfPc: limitDistance(10, v.limit),
    meanAll: sumAll / u.n,
    meanCounted: obs.count ? sumSeen / obs.count : NaN,
  };
}

export function biasView(v) {
  const id = isOn(v.lf) ? 'candle' : 'population';
  const obs = observeCached(id, { limit: v.limit, errors: POOR_ASTROMETRY });
  const u = obs.universe;
  const b = malmquistBias(obs);
  const shells = malmquistShells(obs, SHELLS[id]);
  const bin = malmquistAtMagnitude(u, v.limit - 0.5, v.limit);
  const sigma = id === 'candle' ? u.sigmaM : null;
  return {
    id,
    obs,
    ...b,
    shells,
    atLimit: bin,
    formula: sigma ? malmquistFormula(sigma) : null,
    plx: parallaxSelectionBias(obs, v.snr),
  };
}

export function completenessView(v) {
  const completeness = { m50: v.m50, width: v.width };
  const obs = observeCached('deep', { limit: v.limit, completeness });
  const u = obs.universe;
  const truth = trueLuminosityFunction(u, BINS);
  const truthM = recoveredLuminosityFunction(obs, BINS, 'truth');
  const cat = recoveredLuminosityFunction(obs, BINS, 'catalogue');
  const step = BINS[1] - BINS[0];
  const raw = Float64Array.from(truthM.counts, c => c / (u.volume * step));
  const bins = truth.centers.map((M, b) => {
    const phi = truth.phi[b];
    return {
      M,
      truth: phi,
      detected: truthM.counts[b],
      raw: phi > 0 ? raw[b] / phi : NaN,
      fixed: phi > 0 && truthM.counts[b] ? truthM.phi[b] / phi : NaN,
      error: phi > 0 && truthM.counts[b] ? truthM.sigma[b] / phi : NaN,
      catalogue: phi > 0 && cat.counts[b] ? cat.phi[b] / phi : NaN,
      rawPhi: raw[b],
      fixedPhi: truthM.phi[b],
      sigmaPhi: truthM.sigma[b],
    };
  });
  return {
    obs,
    counted: obs.count,
    bins,
    curve: completenessCurve(obs, edgesOf(11, 21, 0.5)),
  };
}

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

function plot(canvas, xr, yr, labels, base = 260, fmtY = v => v) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, 210));
  const r = { x: 48, y: 12, w: w - 62, h: h - 44 };
  const X = x => r.x + ((x - xr[0]) / (xr[1] - xr[0])) * r.w;
  const Y = y => r.y + r.h - ((y - yr[0]) / (yr[1] - yr[0])) * r.h;
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
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const v of ticks(...xr))
    g.fillText(String(Math.round(v * 1e6) / 1e6), X(v), r.y + r.h + 4);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const v of ticks(...yr))
    g.fillText(String(fmtY(Math.round(v * 1e6) / 1e6)), r.x - 5, Y(v));
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
const legend = (g, r, colors, key, y = 0) => {
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(t(key), r.x + 6, r.y + 4 + y);
};
const sourceRow = () => [
  {
    label: t('svyW.row.source'),
    value: t('svyW.value.source'),
    emphasis: true,
  },
];
const howRow = () => ({
  label: t('svyW.row.how'),
  value: t('svyW.value.how'),
});

// -----------------------------------------------------------------------------
// Who gets counted
// -----------------------------------------------------------------------------

function drawCounts(canvas, v) {
  const f = countsView(v);
  const u = f.obs.universe;
  if (!isOn(v.view)) {
    const p = plot(
      canvas,
      [0, 1000],
      [14, -4],
      ['svyW.c.axisD', 'svyW.c.axisM']
    );
    const { g, X, Y, colors } = p;
    for (let i = 0; i < u.n; i++)
      if (!f.obs.detected[i]) dot(g, X(u.d[i]), Y(u.M[i]), 1.6, colors.grid);
    for (let i = 0; i < u.n; i++)
      if (f.obs.detected[i]) dot(g, X(u.d[i]), Y(u.M[i]), 1.9, colors.accent);
    // The limit: the absolute magnitude that just reaches the limit at each distance.
    g.strokeStyle = colors.warn;
    g.lineWidth = 2;
    g.beginPath();
    for (let d = 20; d <= 1000; d += 10) {
      const M = v.limit - 5 * Math.log10(d / 10);
      if (d === 20) g.moveTo(X(d), Y(M));
      else g.lineTo(X(d), Y(M));
    }
    g.stroke();
    legend(g, p.r, colors, 'svyW.c.legend');
    p.done();
    return;
  }
  const grid = [];
  for (let m = 6; m <= 24; m += 0.5) grid.push(m);
  const all = cumulativeCounts(u.m, grid);
  const seen = cumulativeCounts(
    Array.from(f.obs.index, i => f.obs.mObs[i]),
    grid
  );
  const p = plot(canvas, [6, 24], [0, 4], ['svyW.c.axisMag', 'svyW.c.axisN']);
  const { g, X, Y, colors } = p;
  const line = (rows, hue) => {
    g.strokeStyle = hue;
    g.lineWidth = 2;
    g.beginPath();
    let first = true;
    for (const r of rows) {
      if (r.n < 1) continue;
      const x = X(r.m);
      const y = Y(Math.log10(r.n));
      if (first) g.moveTo(x, y);
      else g.lineTo(x, y);
      first = false;
    }
    g.stroke();
  };
  line(all, colors.grid);
  line(seen, colors.accent);
  p.done();
}

const COUNTS = {
  id: 'survey-counts',
  get title() {
    return t('svyW.c.title');
  },
  get note() {
    return t('svyW.c.note');
  },
  animated: false,
  controls: [
    {
      id: 'limit',
      get label() {
        return t('svyW.c.control.limit');
      },
      min: 10,
      max: 24,
      step: 0.5,
      value: 18,
      decimals: 1,
      format: v => num(v, 3),
    },
    {
      id: 'view',
      get label() {
        return t('svyW.c.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'svyW.c.view.counts' : 'svyW.c.view.wedge'),
    },
  ],
  presets: [
    {
      values: { limit: 14, view: 0 },
      get label() {
        return t('svyW.c.preset.shallow');
      },
    },
    {
      values: { limit: 16, view: 0 },
      get label() {
        return t('svyW.c.preset.mid');
      },
    },
    {
      values: { limit: 18, view: 0 },
      get label() {
        return t('svyW.c.preset.deep');
      },
    },
  ],
  draw: drawCounts,
  readout(v) {
    const f = countsView(v);
    return [
      ...sourceRow(),
      { label: t('svyW.c.row.total'), value: String(f.total) },
      {
        label: t('svyW.c.row.counted'),
        value: String(f.counted),
        emphasis: true,
      },
      {
        label: t('svyW.c.row.missed'),
        value: String(f.missed),
        emphasis: true,
      },
      {
        label: t('svyW.c.row.fraction'),
        value: pct(f.fraction),
        emphasis: true,
      },
      {
        label: t('svyW.c.row.faint'),
        value: pct(f.faintShare),
        emphasis: true,
      },
      { label: t('svyW.c.row.sun'), value: withUnit(num(f.sunPc, 3), 'pc') },
      {
        label: t('svyW.c.row.dwarf'),
        value: withUnit(num(f.dwarfPc, 3), 'pc'),
      },
      { label: t('svyW.c.row.meanAll'), value: num(f.meanAll, 3) },
      { label: t('svyW.c.row.meanCounted'), value: num(f.meanCounted, 3) },
      howRow(),
    ];
  },
};

// -----------------------------------------------------------------------------
// Why the bright ones win
// -----------------------------------------------------------------------------

function drawBias(canvas, v) {
  const f = biasView(v);
  const sh = SHELLS[f.id];
  const lim = Math.max(1, ...f.shells.map(s => Math.abs(s.bias) || 0));
  const p = plot(
    canvas,
    [sh[0], sh.at(-1)],
    [Math.ceil(lim) + 0.5, -0.5],
    ['svyW.b.axisD', 'svyW.b.axisB']
  );
  const { g, X, Y, colors } = p;
  g.strokeStyle = colors.grid;
  g.beginPath();
  g.moveTo(X(sh[0]), Y(0));
  g.lineTo(X(sh.at(-1)), Y(0));
  g.stroke();
  g.fillStyle = colors.accent;
  for (const s of f.shells) {
    if (!Number.isFinite(s.bias)) continue;
    const x0 = X(s.from) + 4;
    const x1 = X(s.to) - 4;
    const y = Y(-s.bias);
    g.fillRect(x0, Math.min(Y(0), y), x1 - x0, Math.abs(y - Y(0)));
  }
  p.done();
}

const BIAS = {
  id: 'malmquist',
  get title() {
    return t('svyW.b.title');
  },
  get note() {
    return t('svyW.b.note');
  },
  animated: false,
  controls: [
    {
      id: 'limit',
      get label() {
        return t('svyW.b.control.limit');
      },
      min: 12,
      max: 22,
      step: 0.5,
      value: 16,
      decimals: 1,
      format: v => num(v, 3),
    },
    {
      id: 'lf',
      get label() {
        return t('svyW.b.control.lf');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'svyW.b.lf.candle' : 'svyW.b.lf.population'),
    },
    {
      id: 'snr',
      get label() {
        return t('svyW.b.control.snr');
      },
      min: 1,
      max: 10,
      step: 1,
      value: 5,
      decimals: 0,
      format: v => num(v, 2),
    },
  ],
  presets: [
    {
      values: { limit: 16, lf: 0, snr: 5 },
      get label() {
        return t('svyW.b.preset.pop');
      },
    },
    {
      values: { limit: 16, lf: 1, snr: 5 },
      get label() {
        return t('svyW.b.preset.candle');
      },
    },
    {
      values: { limit: 18, lf: 0, snr: 3 },
      get label() {
        return t('svyW.b.preset.weak');
      },
    },
  ],
  draw: drawBias,
  readout(v) {
    const f = biasView(v);
    const rows = [
      ...sourceRow(),
      { label: t('svyW.b.row.meanAll'), value: num(f.meanAll, 3) },
      { label: t('svyW.b.row.meanCounted'), value: num(f.meanCounted, 3) },
      {
        label: t('svyW.b.row.bias'),
        value: withUnit(signed(f.bias), 'mag'),
        emphasis: true,
      },
    ];
    for (const s of f.shells)
      rows.push({
        label: t('svyW.b.row.shell', { a: s.from, b: s.to }),
        value: s.counted
          ? t('svyW.b.value.shell', {
              p: num(100 * s.fraction, 3),
              b: num(-s.bias, 2),
              n: s.counted,
            })
          : '—',
      });
    rows.push(
      {
        label: t('svyW.b.row.limit'),
        value:
          f.formula === null
            ? t('svyW.b.value.none')
            : withUnit(signed(f.atLimit.bias), 'mag'),
        emphasis: true,
      },
      {
        label: t('svyW.b.row.formula'),
        value:
          f.formula === null
            ? t('svyW.b.value.none')
            : withUnit(signed(f.formula), 'mag'),
      },
      {
        label: t('svyW.b.row.snr', { s: v.snr }),
        value: String(f.plx.stars),
      },
      {
        label: t('svyW.b.row.plx'),
        value: pct(f.plx.meanFractionalError),
        emphasis: true,
      },
      {
        label: t('svyW.b.row.dM'),
        value: withUnit(num(f.plx.meanDeltaM, 2), 'mag'),
        emphasis: true,
      },
      howRow()
    );
    return rows;
  },
};

// -----------------------------------------------------------------------------
// The completeness curve
// -----------------------------------------------------------------------------

function drawCompleteness(canvas, v) {
  const f = completenessView(v);
  if (isOn(v.view)) {
    const p = plot(
      canvas,
      [11, 21],
      [1.05, -0.05],
      ['svyW.k.axisMag', 'svyW.k.axisF']
    );
    const { g, X, Y, colors } = p;
    g.strokeStyle = colors.warn;
    g.lineWidth = 2;
    g.beginPath();
    f.curve.forEach((r, i) => {
      const x = X(r.m);
      const y = Y(Math.min(1, r.model));
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
    for (const r of f.curve)
      if (r.stars >= 15) dot(g, X(r.m), Y(r.fraction), 3.5, colors.accent);
    p.done();
    return;
  }
  const logs = f.bins
    .map(b => [b.truth, b.rawPhi, b.fixedPhi])
    .flat()
    .filter(x => x > 0)
    .map(Math.log10);
  const lo = Math.floor(Math.min(...logs)) - 0.5;
  const hi = Math.ceil(Math.max(...logs)) + 0.5;
  const p = plot(
    canvas,
    [-2, 12],
    [lo, hi],
    ['svyW.k.axisM', 'svyW.k.axisPhi']
  );
  const { g, X, Y, colors } = p;
  g.strokeStyle = colors.grid;
  g.lineWidth = 2;
  g.beginPath();
  let first = true;
  for (const b of f.bins) {
    if (!(b.truth > 0)) continue;
    const x = X(b.M);
    const y = Y(Math.log10(b.truth));
    if (first) g.moveTo(x, y);
    else g.lineTo(x, y);
    first = false;
  }
  g.stroke();
  for (const b of f.bins) {
    if (b.truth > 0) dot(g, X(b.M), Y(Math.log10(b.truth)), 3, colors.grid);
    if (b.rawPhi > 0) {
      g.strokeStyle = colors.warn;
      g.lineWidth = 2;
      g.strokeRect(X(b.M) - 4, Y(Math.log10(b.rawPhi)) - 4, 8, 8);
    }
    if (b.fixedPhi > 0) {
      dot(g, X(b.M), Y(Math.log10(b.fixedPhi)), 4, colors.accent);
      const up = Math.log10(b.fixedPhi + b.sigmaPhi);
      const dn = Math.log10(Math.max(b.fixedPhi - b.sigmaPhi, b.fixedPhi / 50));
      g.strokeStyle = colors.accent;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(X(b.M), Y(up));
      g.lineTo(X(b.M), Y(dn));
      g.stroke();
    }
  }
  legend(g, p.r, colors, 'svyW.k.legend');
  p.done();
}

const share = x => (Number.isFinite(x) ? num(100 * x, 3) + ' %' : '—');
const fixed = b =>
  Number.isFinite(b.fixed)
    ? t('svyW.k.value.fix', { r: num(b.fixed, 3), e: num(b.error, 2) })
    : '—';

const COMPLETENESS = {
  id: 'completeness-lf',
  get title() {
    return t('svyW.k.title');
  },
  get note() {
    return t('svyW.k.note');
  },
  animated: false,
  controls: [
    {
      id: 'limit',
      get label() {
        return t('svyW.k.control.limit');
      },
      min: 14,
      max: 24,
      step: 0.5,
      value: 20,
      decimals: 1,
      format: v => num(v, 3),
    },
    {
      id: 'm50',
      get label() {
        return t('svyW.k.control.m50');
      },
      min: 13,
      max: 21,
      step: 0.5,
      value: 20,
      decimals: 1,
      format: v => num(v, 3),
    },
    {
      id: 'width',
      get label() {
        return t('svyW.k.control.width');
      },
      min: 0.1,
      max: 1.5,
      step: 0.1,
      value: 0.3,
      decimals: 1,
      format: v => num(v, 2),
    },
    {
      id: 'view',
      get label() {
        return t('svyW.k.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'svyW.k.view.curve' : 'svyW.k.view.lf'),
    },
  ],
  presets: [
    {
      values: { limit: 20, m50: 20, width: 0.3, view: 0 },
      get label() {
        return t('svyW.k.preset.sharp');
      },
    },
    {
      values: { limit: 20, m50: 17, width: 0.5, view: 0 },
      get label() {
        return t('svyW.k.preset.fade');
      },
    },
    {
      values: { limit: 17, m50: 16, width: 1, view: 1 },
      get label() {
        return t('svyW.k.preset.bad');
      },
    },
  ],
  draw: drawCompleteness,
  readout(v) {
    const f = completenessView(v);
    const b8 = f.bins[5];
    const b10 = f.bins[6];
    return [
      ...sourceRow(),
      { label: t('svyW.k.row.counted'), value: String(f.counted) },
      { label: t('svyW.k.row.bin8'), value: String(b8.detected) },
      { label: t('svyW.k.row.raw8'), value: share(b8.raw), emphasis: true },
      { label: t('svyW.k.row.fix8'), value: fixed(b8), emphasis: true },
      {
        label: t('svyW.k.row.cat8'),
        value: Number.isFinite(b8.catalogue) ? num(b8.catalogue, 3) : '—',
      },
      { label: t('svyW.k.row.bin10'), value: String(b10.detected) },
      { label: t('svyW.k.row.raw10'), value: share(b10.raw), emphasis: true },
      { label: t('svyW.k.row.fix10'), value: fixed(b10), emphasis: true },
      {
        label: t('svyW.k.row.cat10'),
        value: Number.isFinite(b10.catalogue) ? num(b10.catalogue, 3) : '—',
      },
      howRow(),
    ];
  },
};

export const SURVEY_WIDGETS = [COUNTS, BIAS, COMPLETENESS];
