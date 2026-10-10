// =============================================================================
// The galactic instruments
// -----------------------------------------------------------------------------
// Three instruments over the galactic kernel (js/kernels/galactic,
// GALACTIC_DYNAMICS.md) and the Gaia packs: the Sun's motion from nearby
// stars, the rotating disk (Oort constants and the rotation curve against a
// mass model) and cluster membership by motion. Every number a lesson asks for
// is a row of the readout under the picture; the picture is never the only
// place a value is. What each computes is in js/galactic/model.js.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_GALACTIC } from './i18n/en.galactic.js';
import { ES_GALACTIC } from './i18n/es.galactic.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { hammerAitoff } from './kernels/galactic/index.js';
import {
  loadGalacticPacks,
  solarFacts,
  oortFacts,
  massFacts,
  speedsAt,
  clusterFacts,
  memberMeans,
  FRAMES,
  SCHONRICH_2010,
} from './galactic/model.js';

registerMessages('en', EN_GALACTIC);
registerMessages('es', ES_GALACTIC);

/** The packs, once they have arrived. */
let data = null;

/**
 * Resolves true when the instruments' data are usable. Never rejects: a pack
 * that fails to load is reported and the instrument says so on screen.
 */
export const galacticReady = loadGalacticPacks()
  .then(d => {
    data = d;
    return true;
  })
  .catch(err => {
    console.warn('The galactic data could not be loaded:', err);
    return false;
  });

const num = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const kms = (v, e) =>
  e === undefined ? withUnit(num(v), 'km/s') : `${num(v)} ± ${num(e, 2)} km/s`;
const frameAt = v => FRAMES[Math.max(0, Math.min(2, Math.round(v.frame)))];
const isOn = x => x >= 0.5;

// Small plotting helpers: a frame, axes, ticks and a mapped scatter.
function plot(canvas, xr, yr, labels, base = 260) {
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
  g.textBaseline = 'top';
  g.textAlign = 'center';
  const ticks = (lo, hi) => {
    const raw = (hi - lo) / 6;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
      out.push(Math.abs(v) < 1e-9 ? 0 : v);
    return out;
  };
  for (const v of ticks(...xr))
    g.fillText(String(+v.toFixed(6)), X(v), r.y + r.h + 4);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const v of ticks(...yr))
    g.fillText(String(+v.toFixed(6)), r.x - 5, Y(v));
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
const cross = (g, x, y, s, hue) => {
  g.strokeStyle = hue;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - s, y);
  g.lineTo(x + s, y);
  g.moveTo(x, y - s);
  g.lineTo(x, y + s);
  g.stroke();
};
const loadingNote = canvas => {
  const { ctx: g } = surface(canvas, responsiveHeight(260, 210));
  g.fillStyle = palette().muted;
  g.font = typeAt(TYPE.LABEL);
  g.fillText(t('galW.loading'), 16, 24);
};

// -----------------------------------------------------------------------------
// The Sun's motion
// -----------------------------------------------------------------------------

/** What the instrument reads: pure, for the tests (given the stars). */
export const solarView = (stars, v) =>
  solarFacts(stars, { maxPc: v.maxPc, frame: frameAt(v) });

function drawSolar(canvas, v) {
  if (!data) return loadingNote(canvas);
  const f = solarView(data.solar, v);
  if (!isOn(v.view)) {
    const p = plot(
      canvas,
      [-120, 120],
      [-120, 120],
      ['galW.sm.axisU', 'galW.sm.axisV']
    );
    const { g, X, Y, colors } = p;
    g.strokeStyle = colors.grid;
    g.beginPath();
    g.moveTo(X(0), Y(-120));
    g.lineTo(X(0), Y(120));
    g.moveTo(X(-120), Y(0));
    g.lineTo(X(120), Y(0));
    g.stroke();
    for (const s of f.velocities) dot(g, X(s.U), Y(s.V), 2, colors.muted);
    cross(g, X(-f.U), Y(-f.VStars), 7, colors.accent);
    // The Sun's own motion, from the origin: minus the sample's mean.
    g.strokeStyle = colors.warn;
    g.fillStyle = colors.warn;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(X(0), Y(0));
    g.lineTo(X(f.U), Y(f.V));
    g.stroke();
    dot(g, X(f.U), Y(f.V), 4, colors.warn);
    p.done();
    return;
  }
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(260, 210));
  const cx = w / 2;
  const cy = h / 2 - 6;
  const sx = Math.min((w - 24) / (4 * Math.SQRT2), (h - 36) / (2 * Math.SQRT2));
  const P = (l, b) => {
    const q = hammerAitoff(l, b);
    return [cx + q.x * sx, cy - q.y * sx];
  };
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, cy, 2 * Math.SQRT2 * sx, Math.SQRT2 * sx, 0, 0, 2 * Math.PI);
  g.stroke();
  g.beginPath();
  for (let l = 0; l <= 360; l += 5) {
    const [x, y] = P(l, 0);
    if (l === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  for (const s of f.velocities) {
    const [x, y] = P(s.l, s.b);
    dot(g, x, y, 1.8, colors.muted);
  }
  const [ax, ay] = P(f.apexL, f.apexB);
  cross(g, ax, ay, 9, colors.warn);
  g.fillStyle = colors.warn;
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillText(t('galW.sm.apex'), ax + 11, ay - 3);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.fillText(t('galW.sm.skyNote'), 8, h - 18);
}

const SOLAR = {
  id: 'solar-motion',
  get title() {
    return t('galW.sm.title');
  },
  get note() {
    return t('galW.sm.note');
  },
  animated: false,
  controls: [
    {
      id: 'maxPc',
      get label() {
        return t('galW.sm.control.maxPc');
      },
      min: 25,
      max: 1000,
      step: 5,
      value: 100,
      decimals: 0,
      format: v => withUnit(Math.round(v), 'pc'),
    },
    {
      id: 'frame',
      get label() {
        return t('galW.sm.control.frame');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`galW.sm.frame.${frameAt({ frame: v })}`),
    },
    {
      id: 'view',
      get label() {
        return t('galW.sm.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'galW.sm.view.sky' : 'galW.sm.view.uv'),
    },
  ],
  presets: [
    {
      values: { maxPc: 100, frame: 0, view: 0 },
      get label() {
        return t('galW.sm.preset.near');
      },
    },
    {
      values: { maxPc: 1000, frame: 0, view: 0 },
      get label() {
        return t('galW.sm.preset.far');
      },
    },
    {
      values: { maxPc: 100, frame: 1, view: 1 },
      get label() {
        return t('galW.sm.preset.lsr');
      },
    },
  ],
  draw: drawSolar,
  readout(v) {
    if (!data)
      return [{ label: t('galW.row.source'), value: t('galW.loading') }];
    const f = solarView(data.solar, v);
    const rows = [
      {
        label: t('galW.row.source'),
        value: t('galW.sm.value.source'),
        emphasis: true,
      },
      { label: t('galW.sm.row.n'), value: String(f.n) },
      { label: t('galW.sm.row.U'), value: kms(f.U, f.errU), emphasis: true },
      {
        label: t('galW.sm.row.V'),
        value: f.frame === 'schonrich' ? kms(f.V) : kms(f.V, f.errV),
        emphasis: true,
      },
      { label: t('galW.sm.row.W'), value: kms(f.W, f.errW), emphasis: true },
      {
        label: t('galW.sm.row.speed'),
        value: kms(f.speed, f.frame === 'schonrich' ? undefined : f.speedErr),
      },
      {
        label: t('galW.sm.row.apex'),
        value: t('galW.sm.value.apex', {
          l: num(f.apexL, 3),
          b: num(f.apexB, 3),
        }),
      },
      { label: t('galW.sm.row.sigmaU'), value: kms(f.sigma.U) },
      { label: t('galW.sm.row.lag'), value: kms(f.lag) },
      { label: t('galW.sm.row.frame'), value: t(`galW.sm.about.${f.frame}`) },
    ];
    if (f.frame === 'schonrich')
      rows.push({
        label: t('galW.sm.row.assume'),
        value: t('galW.sm.value.assume', { v: num(SCHONRICH_2010.V, 4) }),
      });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// The rotating disk
// -----------------------------------------------------------------------------

const oortCache = new Map();
const oortView = w => {
  if (!oortCache.has(w)) oortCache.set(w, oortFacts(data.solar, w));
  return oortCache.get(w);
};
const fitCache = new Map();
const MODES = ['mine', 'halo', 'stars'];
const modeAt = v => MODES[Math.max(0, Math.min(2, Math.round(v.fit)))];
const modelOf = v => ({
  bulgeMass: 1.5e10,
  discMass: 10 ** v.mdisk,
  discScale: v.rd,
  haloVFlat: v.vh,
  haloCore: v.rc,
});

/** What the curve view reads, given the packs. Pure, for the tests. */
export function diskView(points, v) {
  const mode = modeAt(v);
  if (mode !== 'mine') {
    if (!fitCache.has(mode)) fitCache.set(mode, massFacts(points, null, mode));
    return fitCache.get(mode);
  }
  return massFacts(points, modelOf(v), 'mine');
}

const oortWeight = v => (isOn(v.weight) ? 'none' : 'distance');

function drawDisk(canvas, v) {
  if (!data) return loadingNote(canvas);
  if (!isOn(v.view)) {
    const o = oortView(oortWeight(v));
    const p = plot(
      canvas,
      [0, 360],
      [-100, 100],
      ['galW.rd.axisL', 'galW.rd.axisY']
    );
    const { g, X, Y, colors } = p;
    g.strokeStyle = colors.grid;
    g.beginPath();
    g.moveTo(X(0), Y(0));
    g.lineTo(X(360), Y(0));
    g.stroke();
    g.strokeStyle = colors.accent;
    g.lineWidth = 2;
    g.beginPath();
    for (let l = 0; l <= 360; l += 3) {
      const y = o.A * Math.cos((2 * l * Math.PI) / 180) + o.B;
      if (l === 0) g.moveTo(X(l), Y(y));
      else g.lineTo(X(l), Y(y));
    }
    g.stroke();
    for (const q of o.points) {
      g.strokeStyle = colors.ink;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(X(q.l), Y(q.y - q.err));
      g.lineTo(X(q.l), Y(q.y + q.err));
      g.stroke();
      dot(g, X(q.l), Y(q.y), 3.5, colors.ink);
    }
    p.done();
    return;
  }
  const f = diskView(data.rotation, v);
  const p = plot(canvas, [0, 26], [0, 320], ['galW.rd.axisR', 'galW.rd.axisV']);
  const { g, X, Y, colors } = p;
  const trace = (key, hue, width, dash) => {
    g.strokeStyle = hue;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    for (let i = 1; i <= 104; i++) {
      const r = i / 4;
      const y = speedsAt(r, f.model)[key];
      if (i === 1) g.moveTo(X(r), Y(y));
      else g.lineTo(X(r), Y(y));
    }
    g.stroke();
    g.setLineDash([]);
  };
  trace('visible', colors.good, 1.5, [5, 3]);
  trace('halo', colors.warn, 1.5, [2, 3]);
  trace('total', colors.accent, 2.5, []);
  for (const q of data.rotation) {
    g.strokeStyle = colors.ink;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(X(q.r), Y(q.v - q.err));
    g.lineTo(X(q.r), Y(q.v + q.err));
    g.stroke();
    dot(g, X(q.r), Y(q.v), 3, colors.ink);
  }
  p.done();
}

const SLIDER = (id, key, min, max, step, value, decimals, format) => ({
  id,
  get label() {
    return t(key);
  },
  min,
  max,
  step,
  value,
  decimals,
  format,
});

const DISK = {
  id: 'rotating-disk',
  get title() {
    return t('galW.rd.title');
  },
  get note() {
    return t('galW.rd.note');
  },
  animated: false,
  controls: [
    {
      id: 'view',
      get label() {
        return t('galW.rd.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'galW.rd.view.curve' : 'galW.rd.view.oort'),
    },
    {
      id: 'weight',
      get label() {
        return t('galW.rd.control.weight');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        t(isOn(v) ? 'galW.rd.weight.none' : 'galW.rd.weight.distance'),
    },
    {
      id: 'fit',
      get label() {
        return t('galW.rd.control.fit');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`galW.rd.fit.${modeAt({ fit: v })}`),
    },
    SLIDER('mdisk', 'galW.rd.control.mdisk', 9.7, 11, 0.01, 10.7, 2, v =>
      withUnit(`10^${num(v, 3)}`, 'M☉')
    ),
    SLIDER('rd', 'galW.rd.control.rd', 1.5, 4.5, 0.1, 2.6, 1, v =>
      withUnit(num(v), 'kpc')
    ),
    SLIDER('vh', 'galW.rd.control.vh', 0, 300, 5, 150, 0, v =>
      withUnit(Math.round(v), 'km/s')
    ),
    SLIDER('rc', 'galW.rd.control.rc', 0.5, 40, 0.5, 8, 1, v =>
      withUnit(num(v), 'kpc')
    ),
  ],
  presets: [
    {
      values: { view: 0, weight: 0 },
      get label() {
        return t('galW.rd.preset.oort');
      },
    },
    {
      values: { view: 1, fit: 2 },
      get label() {
        return t('galW.rd.preset.stars');
      },
    },
    {
      values: { view: 1, fit: 1 },
      get label() {
        return t('galW.rd.preset.halo');
      },
    },
  ],
  draw: drawDisk,
  readout(v) {
    if (!data)
      return [{ label: t('galW.row.source'), value: t('galW.loading') }];
    if (!isOn(v.view)) {
      const o = oortView(oortWeight(v));
      const R0 = 8.3;
      return [
        {
          label: t('galW.row.source'),
          value: t('galW.rd.value.oort'),
          emphasis: true,
        },
        { label: t('galW.rd.row.n'), value: String(o.n) },
        {
          label: t('galW.rd.row.A'),
          value: `${num(o.A)} ± ${num(o.errA, 2)} km/s/kpc`,
          emphasis: true,
        },
        {
          label: t('galW.rd.row.B'),
          value: `${num(o.B)} ± ${num(o.errB, 2)} km/s/kpc`,
          emphasis: true,
        },
        {
          label: t('galW.rd.row.omega'),
          value: `${num(o.omega)} ± ${num(o.omegaErr, 2)} km/s/kpc`,
        },
        { label: t('galW.rd.row.v0'), value: `${num(R0 * o.omega, 3)} km/s` },
        {
          label: t('galW.rd.row.weight'),
          value: t(`galW.rd.about.${oortWeight(v)}`),
        },
      ];
    }
    const f = diskView(data.rotation, v);
    const at = speedsAt(8.3, f.model);
    const m = f.model;
    return [
      {
        label: t('galW.row.source'),
        value: t('galW.rd.value.curve'),
        emphasis: true,
      },
      { label: t('galW.rd.row.points'), value: String(f.n) },
      { label: t('galW.rd.row.chi2'), value: num(f.chi2, 3), emphasis: true },
      {
        label: t('galW.rd.row.reduced'),
        value: num(f.reduced, 3),
        emphasis: true,
      },
      {
        label: t('galW.rd.row.disc'),
        value: withUnit(`${num(m.discMass / 1e10, 3)} × 10¹⁰`, 'M☉'),
      },
      { label: t('galW.rd.row.halo'), value: kms(m.haloVFlat) },
      {
        label: t('galW.rd.row.atSun'),
        value: t('galW.rd.value.atSun', {
          total: num(at.total, 3),
          visible: num(at.visible, 3),
          halo: num(at.halo, 3),
        }),
      },
      { label: t('galW.rd.row.how'), value: t('galW.rd.value.how') },
    ];
  },
};

// -----------------------------------------------------------------------------
// Cluster membership
// -----------------------------------------------------------------------------

const memberCache = new Map();
const membersOf = dims => {
  if (!memberCache.has(dims))
    memberCache.set(dims, clusterFacts(data.cluster, dims, 0.5));
  return memberCache.get(dims);
};

/** What the instrument reads for one setting, given the packs. Pure, for the tests. */
export function clusterView(rows, v) {
  const dims = isOn(v.dims) ? 3 : 2;
  const base = clusterFacts(rows, dims, v.threshold);
  const m = memberMeans(rows, base.p, Math.max(v.threshold, 1e-6));
  return { ...base, means: m };
}

function drawCluster(canvas, v) {
  if (!data) return loadingNote(canvas);
  const dims = isOn(v.dims) ? 3 : 2;
  const fit = membersOf(dims);
  const rows = data.cluster;
  const cmd = isOn(v.view);
  const p = cmd
    ? plot(canvas, [0, 2.6], [18, 8], ['galW.cm.axisC', 'galW.cm.axisG'], 280)
    : plot(
        canvas,
        [-9, 6],
        [-10, 5],
        ['galW.cm.axisPmRa', 'galW.cm.axisPmDec'],
        280
      );
  const { g, X, Y, colors } = p;
  const at = row => (cmd ? [X(row.bp), Y(row.g)] : [X(row.pmRa), Y(row.pmDec)]);
  g.globalAlpha = 0.45;
  rows.forEach((row, i) => {
    if (fit.p[i] >= v.threshold) return;
    const [x, y] = at(row);
    dot(g, x, y, 1.8, colors.muted);
  });
  g.globalAlpha = 1;
  rows.forEach((row, i) => {
    if (fit.p[i] < v.threshold) return;
    const [x, y] = at(row);
    dot(g, x, y, 2.4, colors.accent);
  });
  p.done();
}

const CLUSTER = {
  id: 'cluster-members',
  get title() {
    return t('galW.cm.title');
  },
  get note() {
    return t('galW.cm.note');
  },
  animated: false,
  controls: [
    {
      id: 'view',
      get label() {
        return t('galW.cm.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'galW.cm.view.cmd' : 'galW.cm.view.pm'),
    },
    {
      id: 'dims',
      get label() {
        return t('galW.cm.control.dims');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(isOn(v) ? 'galW.cm.dims.three' : 'galW.cm.dims.two'),
    },
    {
      id: 'threshold',
      get label() {
        return t('galW.cm.control.threshold');
      },
      min: 0.05,
      max: 0.99,
      step: 0.01,
      value: 0.5,
      decimals: 2,
      format: v => num(v, 2),
    },
  ],
  presets: [
    {
      values: { view: 0, dims: 1, threshold: 0.5 },
      get label() {
        return t('galW.cm.preset.pm');
      },
    },
    {
      values: { view: 1, dims: 1, threshold: 0.5 },
      get label() {
        return t('galW.cm.preset.cmd');
      },
    },
    {
      values: { view: 1, dims: 1, threshold: 0.99 },
      get label() {
        return t('galW.cm.preset.strict');
      },
    },
  ],
  draw: drawCluster,
  readout(v) {
    if (!data)
      return [{ label: t('galW.row.source'), value: t('galW.loading') }];
    const dims = isOn(v.dims) ? 3 : 2;
    const f = membersOf(dims);
    const p = f.p;
    let n = 0;
    let uncertain = 0;
    for (const x of p) {
      if (x >= v.threshold) n++;
      if (x > 0.1 && x < 0.9) uncertain++;
    }
    const mm = memberMeans(data.cluster, p, v.threshold);
    return [
      {
        label: t('galW.row.source'),
        value: t('galW.cm.value.source'),
        emphasis: true,
      },
      { label: t('galW.cm.row.n'), value: String(data.cluster.length) },
      { label: t('galW.cm.row.members'), value: String(n), emphasis: true },
      {
        label: t('galW.cm.row.expected'),
        value: num(f.expected, 4),
        emphasis: true,
      },
      { label: t('galW.cm.row.uncertain'), value: String(uncertain) },
      {
        label: t('galW.cm.row.pm'),
        value: t('galW.cm.value.pm', { a: num(f.pmRa, 3), d: num(f.pmDec, 3) }),
        emphasis: true,
      },
      { label: t('galW.cm.row.width'), value: `${num(f.sigmaPm, 2)} mas/yr` },
      {
        label: t('galW.cm.row.parallax'),
        value: `${num(mm.mean[2], 3)} ± ${num(mm.err[2], 2)} mas`,
      },
      {
        label: t('galW.cm.row.distance'),
        value: t('galW.cm.value.distance', { d: num(1 / mm.mean[2], 3) }),
      },
      { label: t('galW.cm.row.how'), value: t('galW.cm.value.how') },
    ];
  },
};

export const GALACTIC_WIDGETS = [SOLAR, DISK, CLUSTER];
export const galacticData = () => data;
