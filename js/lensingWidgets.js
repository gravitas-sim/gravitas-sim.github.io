// =============================================================================
// The lensing instruments
// -----------------------------------------------------------------------------
// Three instruments over the lensing kernel (js/kernels/lensing, GRAVITATIONAL_
// LENSING.md): how far a mass bends a ray of light, the lens plane of a point
// mass and of a singular isothermal sphere (images, ring and arcs), and the
// microlensing light curve of a lens passing in front of a star, driven by the
// same geometry. The thin-lens, weak-field and point-mass assumptions are
// stated in the readout; every number a lesson asks for is a row of it, and
// the picture is never the only place a value is. The source of the "event
// with data" mode is synthetic: a model curve with seeded noise.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_LENSING } from './i18n/en.lensing.js';
import { ES_LENSING } from './i18n/es.lensing.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  AU_METERS,
  PARSEC_M,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from './constants.js';
import {
  ARCSEC,
  MAS,
  deflectionAngle,
  einsteinAngle,
  massForTimescale,
  microlensingFlux,
  peakFlux,
  pointImages,
  pointTimeDelay,
  schwarzschildRadius,
  sisDispersion,
  sisImages,
  timescale,
  syntheticEvent,
  fitMicrolensing,
} from './kernels/lensing/index.js';

registerMessages('en', EN_LENSING);
registerMessages('es', ES_LENSING);

const KPC = 1000 * PARSEC_M;
const num = (v, sig = 3) => formatNumber(v, { sig });
const plain = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const isOn = x => x >= 0.5;

/** The source distance of every geometry, and the fixed synthetic event of the data mode. */
export const SOURCE_KPC = 8;
export const EVENT = Object.freeze({
  truth: Object.freeze({ t0: 0, u0: 0.15, tE: 25, fs: 0.6 }),
  noise: 0.02,
  seed: 'lensing-event-1',
});
export const WINDOW_DAYS = 60;
const TIMES = Float64Array.from({ length: 241 }, (_, i) => -60 + i * 0.5);

// -----------------------------------------------------------------------------
// Pure views, for the instruments and for the tests
// -----------------------------------------------------------------------------

export function bendingView(v) {
  const m = SOLAR_MASS_KG * 10 ** v.logM;
  const b = SOLAR_RADIUS_M * 10 ** v.logB;
  const alpha = deflectionAngle(m, b);
  return {
    mSun: 10 ** v.logM,
    bSun: 10 ** v.logB,
    rsKm: schwarzschildRadius(m) / 1000,
    ratio: b / schwarzschildRadius(m),
    arcsec: alpha / ARCSEC,
    newtonArcsec: alpha / ARCSEC / 2,
    weak: b / schwarzschildRadius(m) >= 10,
  };
}

export function planeView(v) {
  const dl = 10 ** v.logD * KPC;
  const ds = 2 * dl;
  const m = SOLAR_MASS_KG * 10 ** v.logM;
  const th = einsteinAngle(m, dl, ds);
  const sis = isOn(v.kind);
  const images = sis ? sisImages(v.y) : pointImages(v.y);
  const rE = th * dl;
  return {
    sis,
    mSun: 10 ** v.logM,
    dlKpc: 10 ** v.logD,
    thetaE: th,
    thetaEMas: th / MAS,
    thetaEArcsec: th / ARCSEC,
    rEau: rE / AU_METERS,
    sigmaKms: sisDispersion(th, ds, ds - dl) / 1000,
    images,
    delayDays: sis ? NaN : pointTimeDelay(m, v.y) / 86400,
    delaySeconds: sis ? NaN : pointTimeDelay(m, v.y),
  };
}

const eventCache = new Map();
/** The synthetic event of the data mode and its two fits (cached: a fit costs milliseconds). */
export function eventData() {
  if (!eventCache.has('data')) {
    const d = syntheticEvent({
      seed: EVENT.seed,
      times: TIMES,
      truth: EVENT.truth,
      noise: EVENT.noise,
    });
    eventCache.set('data', {
      ...d,
      held: fitMicrolensing(d, { blend: 'none' }),
      free: fitMicrolensing(d, { blend: 'free' }),
    });
  }
  return eventCache.get('data');
}

export function passingView(v) {
  const m = SOLAR_MASS_KG * 10 ** v.logM;
  const dl = v.dl * KPC;
  const ds = SOURCE_KPC * KPC;
  const tE = timescale(m, dl, ds, v.v * 1000);
  const th = einsteinAngle(m, dl, ds);
  const p = { t0: 0, u0: v.u0, tE, fs: v.fs, rho: v.rho };
  const flux = microlensingFlux(TIMES, p);
  const peak = peakFlux(p);
  const view = {
    p,
    tE,
    thetaEMas: th / MAS,
    rEau: (th * dl) / AU_METERS,
    peak,
    flux,
    above: v.u0 < 1 ? 2 * tE * Math.sqrt(1 - v.u0 * v.u0) : 0,
    // The mass that gives the same tE for a lens at 2 kpc and 100 km/s, and at 6 kpc and 300 km/s.
    massNear: massForTimescale(tE, 2 * KPC, ds, 100e3) / SOLAR_MASS_KG,
    massFar: massForTimescale(tE, 6 * KPC, ds, 300e3) / SOLAR_MASS_KG,
    data: null,
  };
  if (isOn(v.data)) {
    const d = eventData();
    let chi = 0;
    for (let i = 0; i < d.x.length; i++) {
      // The source flux and the blend are the instrument's own: the model curve is
      // fs A + (1 - fs) of the baseline, which the data are normalised to.
      const r = (d.y[i] - flux[i]) / d.sigma[i];
      chi += r * r;
    }
    view.data = { d, chiPerDof: chi / d.x.length };
  }
  return view;
}

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

function plot(
  canvas,
  xr,
  yr,
  labels,
  base = 260,
  fmtX = v => v,
  fmtY = v => v
) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, 210));
  const r = { x: 52, y: 12, w: w - 66, h: h - 44 };
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
    for (let q = Math.ceil(lo / step) * step; q <= hi + 1e-9; q += step)
      out.push(Math.abs(q) < 1e-9 ? 0 : q);
    return out;
  };
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const q of ticks(...xr))
    g.fillText(String(fmtX(Math.round(q * 1e6) / 1e6)), X(q), r.y + r.h + 4);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const q of ticks(...yr))
    g.fillText(String(fmtY(Math.round(q * 1e6) / 1e6)), r.x - 5, Y(q));
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
const legend = (g, r, colors, key) => {
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(t(key), r.x + 6, r.y + 4);
};
const sourceRow = key => [
  { label: t('lensW.row.source'), value: t(key), emphasis: true },
];
const howRow = key => ({ label: t('lensW.row.how'), value: t(key) });

// -----------------------------------------------------------------------------
// Bending light
// -----------------------------------------------------------------------------

function drawBending(canvas, v) {
  const f = bendingView(v);
  const p = plot(
    canvas,
    [-1, 8],
    [-8, 11],
    ['lensW.b.axisB', 'lensW.b.axisA'],
    260
  );
  const { g, X, Y, colors } = p;
  // The chosen mass's weak-field limit: ten Schwarzschild radii, in solar radii.
  const rs = schwarzschildRadius(SOLAR_MASS_KG * 10 ** v.logM);
  const limit = Math.log10((10 * rs) / SOLAR_RADIUS_M);
  g.fillStyle = colors.grid;
  g.globalAlpha = 0.35;
  g.fillRect(X(-1), Y(11), X(Math.min(8, limit)) - X(-1), Y(-8) - Y(11));
  g.globalAlpha = 1;
  const line = (logM, hue, width) => {
    g.strokeStyle = hue;
    g.lineWidth = width;
    g.beginPath();
    for (let lb = -1; lb <= 8.001; lb += 0.25) {
      const a = deflectionAngle(
        SOLAR_MASS_KG * 10 ** logM,
        SOLAR_RADIUS_M * 10 ** lb
      );
      const y = Math.log10(a / ARCSEC);
      if (lb === -1) g.moveTo(X(lb), Y(y));
      else g.lineTo(X(lb), Y(y));
    }
    g.stroke();
  };
  line(0, colors.grid, 1.5);
  line(v.logM, colors.accent, 2.5);
  dot(g, X(v.logB), Y(Math.log10(f.arcsec)), 5.5, colors.warn);
  legend(g, p.r, colors, 'lensW.b.legend');
  p.done();
}

const BENDING = {
  id: 'light-bending',
  get title() {
    return t('lensW.b.title');
  },
  get note() {
    return t('lensW.b.note');
  },
  animated: false,
  controls: [
    {
      id: 'logM',
      get label() {
        return t('lensW.b.control.mass');
      },
      min: 0,
      max: 9,
      step: 0.5,
      value: 0,
      decimals: 1,
      format: v => withUnit(plain(10 ** v, 3), 'M☉'),
    },
    {
      id: 'logB',
      get label() {
        return t('lensW.b.control.impact');
      },
      min: -1,
      max: 8,
      step: 0.5,
      value: 0,
      decimals: 1,
      format: v => withUnit(plain(10 ** v, 3), 'R☉'),
    },
  ],
  presets: [
    {
      values: { logM: 0, logB: 0 },
      get label() {
        return t('lensW.b.preset.sun');
      },
    },
    {
      values: { logM: 0, logB: 2 },
      get label() {
        return t('lensW.b.preset.far');
      },
    },
    {
      values: { logM: 1, logB: 0 },
      get label() {
        return t('lensW.b.preset.ten');
      },
    },
    {
      values: { logM: 8, logB: 3 },
      get label() {
        return t('lensW.b.preset.bh');
      },
    },
  ],
  draw: drawBending,
  readout(v) {
    const f = bendingView(v);
    return [
      ...sourceRow('lensW.b.value.source'),
      { label: t('lensW.b.row.mass'), value: withUnit(plain(f.mSun, 3), 'M☉') },
      {
        label: t('lensW.b.row.impact'),
        value: withUnit(plain(f.bSun, 3), 'R☉'),
      },
      { label: t('lensW.b.row.rs'), value: withUnit(num(f.rsKm, 3), 'km') },
      { label: t('lensW.b.row.ratio'), value: num(f.ratio, 3) },
      {
        label: t('lensW.b.row.alpha'),
        value: withUnit(num(f.arcsec, 3), '″'),
        emphasis: true,
      },
      {
        label: t('lensW.b.row.newton'),
        value: withUnit(num(f.newtonArcsec, 3), '″'),
      },
      {
        label: t('lensW.b.row.valid'),
        value: t(f.weak ? 'lensW.b.value.valid' : 'lensW.b.value.invalid'),
        emphasis: !f.weak,
      },
      howRow('lensW.b.value.how'),
    ];
  },
};

// -----------------------------------------------------------------------------
// The lens plane
// -----------------------------------------------------------------------------

/** The images of a source point (sx, sy), in Einstein radii, for either lens. */
function imagesOf(sx, sy, sis) {
  const r = Math.hypot(sx, sy);
  const ux = r > 1e-12 ? sx / r : 1;
  const uy = r > 1e-12 ? sy / r : 0;
  const xs = sis ? (r < 1 ? [r + 1, r - 1] : [r + 1]) : pointImages(r).x;
  return xs.map(x => [x * ux, x * uy]);
}

function drawPlane(canvas, v) {
  const f = planeView(v);
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(300, 240));
  const span = 3.2;
  const scale = Math.min(w, h) / (2 * span);
  const cx = w / 2;
  const cy = h / 2;
  const X = x => cx + x * scale;
  const Y = y => cy - y * scale;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  g.beginPath();
  g.arc(cx, cy, scale, 0, 2 * Math.PI);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(cx - 6, cy);
  g.lineTo(cx + 6, cy);
  g.moveTo(cx, cy - 6);
  g.lineTo(cx, cy + 6);
  g.stroke();
  // The source: a disk of radius `size` Einstein radii centred y along the axis.
  const n = 96;
  const rim = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    rim.push([v.y + v.size * Math.cos(a), v.size * Math.sin(a)]);
  }
  g.fillStyle = colors.warn;
  g.globalAlpha = 0.7;
  g.beginPath();
  rim.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  // The images: each rim point's images, joined into the outlines of the arcs.
  const outlines = [[], []];
  for (const [sx, sy] of rim) {
    imagesOf(sx, sy, f.sis).forEach((p, k) => outlines[k].push(p));
  }
  g.fillStyle = colors.accent;
  g.strokeStyle = colors.accent;
  g.lineWidth = 1.5;
  g.globalAlpha = 0.55;
  g.beginPath();
  for (const o of outlines)
    o.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  for (const o of outlines) if (o.length) g.closePath();
  g.fill('evenodd');
  g.globalAlpha = 1;
  g.stroke();
  g.fillStyle = colors.muted;
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(t('lensW.p.legend'), 8, 6);
  return f;
}

const PLANE = {
  id: 'lens-plane',
  get title() {
    return t('lensW.p.title');
  },
  get note() {
    return t('lensW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'kind',
      get label() {
        return t('lensW.p.control.kind');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'lensW.p.kind.sis' : 'lensW.p.kind.point'),
    },
    {
      id: 'logM',
      get label() {
        return t('lensW.p.control.mass');
      },
      min: 0,
      max: 13,
      step: 0.1,
      value: 11,
      decimals: 1,
      format: v => withUnit(num(10 ** v, 3), 'M☉'),
    },
    {
      id: 'logD',
      get label() {
        return t('lensW.p.control.dist');
      },
      min: 0,
      max: 6.5,
      step: 0.1,
      value: 6,
      decimals: 1,
      format: v =>
        10 ** v >= 1000
          ? withUnit(plain(10 ** (v - 3), 3), 'Mpc')
          : withUnit(plain(10 ** v, 3), 'kpc'),
    },
    {
      id: 'y',
      get label() {
        return t('lensW.p.control.y');
      },
      min: 0,
      max: 3,
      step: 0.05,
      value: 0,
      decimals: 2,
      format: v => plain(v, 3),
    },
    {
      id: 'size',
      get label() {
        return t('lensW.p.control.size');
      },
      min: 0.02,
      max: 0.4,
      step: 0.02,
      value: 0.1,
      decimals: 2,
      format: v => plain(v, 3),
    },
  ],
  presets: [
    {
      values: { kind: 0, logM: 0, logD: Math.log10(4), y: 0, size: 0.1 },
      get label() {
        return t('lensW.p.preset.star');
      },
    },
    {
      values: { kind: 0, logM: 11, logD: 6, y: 0, size: 0.1 },
      get label() {
        return t('lensW.p.preset.ring');
      },
    },
    {
      values: { kind: 0, logM: 11, logD: 6, y: 0.5, size: 0.1 },
      get label() {
        return t('lensW.p.preset.offset');
      },
    },
    {
      values: { kind: 1, logM: 11, logD: 6, y: 0.5, size: 0.1 },
      get label() {
        return t('lensW.p.preset.sis');
      },
    },
  ],
  draw: drawPlane,
  readout(v) {
    const f = planeView(v);
    const im = f.images;
    const fmtMu = m => (Number.isFinite(m) ? num(m, 3) : '∞');
    const rows = [
      ...sourceRow('lensW.p.value.source'),
      {
        label: t('lensW.p.row.mass'),
        value: withUnit(num(f.mSun, 3), 'M☉'),
      },
      {
        label: t('lensW.p.row.thetaMas'),
        value: withUnit(num(f.thetaEMas, 3), 'mas'),
        emphasis: true,
      },
      {
        label: t('lensW.p.row.thetaArcsec'),
        value: withUnit(num(f.thetaEArcsec, 3), '″'),
        emphasis: true,
      },
      {
        label: t('lensW.p.row.radius'),
        value:
          f.rEau < 1e4
            ? withUnit(num(f.rEau, 3), 'au')
            : withUnit(num((f.rEau * AU_METERS) / KPC, 3), 'kpc'),
      },
      {
        label: t('lensW.p.row.sigma'),
        value: withUnit(num(f.sigmaKms, 3), 'km/s'),
      },
      { label: t('lensW.p.row.count'), value: String(im.x.length) },
      { label: t('lensW.p.row.outer'), value: num(im.x[0], 3) },
      {
        label: t('lensW.p.row.inner'),
        value: im.x.length > 1 ? num(im.x[1], 3) : '—',
      },
      {
        label: t('lensW.p.row.muOuter'),
        value: fmtMu(im.mu[0]),
      },
      {
        label: t('lensW.p.row.muInner'),
        value: im.mu.length > 1 ? fmtMu(im.mu[1]) : '—',
      },
      {
        label: t('lensW.p.row.total'),
        value: fmtMu(im.total),
        emphasis: true,
      },
      {
        label: t('lensW.p.row.delay'),
        value: f.sis
          ? t('lensW.p.value.noDelay')
          : withUnit(num(f.delaySeconds, 3), 's'),
      },
      howRow('lensW.p.value.how'),
    ];
    return rows;
  },
};

// -----------------------------------------------------------------------------
// A lens passing by
// -----------------------------------------------------------------------------

function drawPassing(canvas, v) {
  const f = passingView(v);
  const top = Math.max(1.5, Math.min(30, f.peak * 1.1));
  const p = plot(
    canvas,
    [-WINDOW_DAYS, WINDOW_DAYS],
    [0.8, top],
    ['lensW.m.axisT', 'lensW.m.axisF'],
    280
  );
  const { g, X, Y, colors } = p;
  g.strokeStyle = colors.grid;
  g.beginPath();
  g.moveTo(X(-WINDOW_DAYS), Y(1));
  g.lineTo(X(WINDOW_DAYS), Y(1));
  g.stroke();
  if (f.data) {
    const d = f.data.d;
    for (let i = 0; i < d.x.length; i += 2)
      dot(g, X(d.x[i]), Y(d.y[i]), 2.2, colors.muted);
  }
  g.strokeStyle = colors.accent;
  g.lineWidth = 2.5;
  g.beginPath();
  for (let i = 0; i < TIMES.length; i++) {
    const x = X(TIMES[i]);
    const y = Y(f.flux[i]);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  legend(g, p.r, colors, f.data ? 'lensW.m.legendData' : 'lensW.m.legend');
  p.done();
}

const PASSING = {
  id: 'lens-passing',
  get title() {
    return t('lensW.m.title');
  },
  get note() {
    return t('lensW.m.note');
  },
  animated: false,
  controls: [
    {
      id: 'logM',
      get label() {
        return t('lensW.m.control.mass');
      },
      min: -1,
      max: 1,
      step: 0.05,
      value: Math.log10(0.3),
      decimals: 2,
      format: v => withUnit(plain(10 ** v, 3), 'M☉'),
    },
    {
      id: 'dl',
      get label() {
        return t('lensW.m.control.dist');
      },
      min: 1,
      max: 7.5,
      step: 0.5,
      value: 6,
      decimals: 1,
      format: v => withUnit(plain(v, 3), 'kpc'),
    },
    {
      id: 'v',
      get label() {
        return t('lensW.m.control.speed');
      },
      min: 20,
      max: 500,
      step: 10,
      value: 200,
      decimals: 0,
      format: v => withUnit(plain(v, 3), 'km/s'),
    },
    {
      id: 'u0',
      get label() {
        return t('lensW.m.control.u0');
      },
      min: 0.01,
      max: 1.5,
      step: 0.01,
      value: 0.1,
      decimals: 2,
      format: v => plain(v, 3),
    },
    {
      id: 'fs',
      get label() {
        return t('lensW.m.control.fs');
      },
      min: 0.1,
      max: 1,
      step: 0.05,
      value: 1,
      decimals: 2,
      format: v => plain(v, 3),
    },
    {
      id: 'rho',
      get label() {
        return t('lensW.m.control.rho');
      },
      min: 0,
      max: 0.3,
      step: 0.01,
      value: 0,
      decimals: 2,
      format: v => plain(v, 3),
    },
    {
      id: 'data',
      get label() {
        return t('lensW.m.control.data');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'lensW.m.data.on' : 'lensW.m.data.off'),
    },
  ],
  presets: [
    {
      values: {
        logM: Math.log10(0.3),
        dl: 6,
        v: 200,
        u0: 0.1,
        fs: 1,
        rho: 0,
        data: 0,
      },
      get label() {
        return t('lensW.m.preset.typical');
      },
    },
    {
      values: {
        logM: Math.log10(0.3),
        dl: 6,
        v: 200,
        u0: 0.01,
        fs: 1,
        rho: 0.1,
        data: 0,
      },
      get label() {
        return t('lensW.m.preset.finite');
      },
    },
    {
      values: {
        logM: Math.log10(0.3),
        dl: 6,
        v: 200,
        u0: 0.1,
        fs: 0.5,
        rho: 0,
        data: 0,
      },
      get label() {
        return t('lensW.m.preset.blend');
      },
    },
    {
      values: {
        logM: Math.log10(0.3),
        dl: 6,
        v: 200,
        u0: 0.15,
        fs: 0.6,
        rho: 0,
        data: 1,
      },
      get label() {
        return t('lensW.m.preset.data');
      },
    },
  ],
  draw: drawPassing,
  readout(v) {
    const f = passingView(v);
    const rows = [
      ...sourceRow('lensW.m.value.source'),
      {
        label: t('lensW.m.row.thetaE'),
        value: withUnit(num(f.thetaEMas, 3), 'mas'),
      },
      { label: t('lensW.m.row.radius'), value: withUnit(num(f.rEau, 3), 'au') },
      {
        label: t('lensW.m.row.tE'),
        value: withUnit(num(f.tE, 3), 'd'),
        emphasis: true,
      },
      {
        label: t('lensW.m.row.peak'),
        value: num(f.peak, 4),
        emphasis: true,
      },
      {
        label: t('lensW.m.row.above'),
        value: withUnit(num(f.above, 3), 'd'),
      },
      {
        label: t('lensW.m.row.near'),
        value: withUnit(num(f.massNear, 3), 'M☉'),
      },
      {
        label: t('lensW.m.row.far'),
        value: withUnit(num(f.massFar, 3), 'M☉'),
      },
    ];
    if (f.data) {
      const { d, chiPerDof } = f.data;
      const fit = (r, blend) => [
        {
          label: t(`lensW.m.row.fit${blend}.tE`),
          value: t('lensW.m.value.pm', {
            v: num(r.tE, 3),
            e: num(r.sigma.tE, 2),
            u: 'd',
          }),
          emphasis: true,
        },
        {
          label: t(`lensW.m.row.fit${blend}.u0`),
          value: t('lensW.m.value.pm', {
            v: num(r.u0, 3),
            e: num(r.sigma.u0, 2),
            u: '',
          }),
        },
        {
          label: t(`lensW.m.row.fit${blend}.chi`),
          value: num(r.chi2 / r.dof, 3),
        },
      ];
      rows.push(
        {
          label: t('lensW.m.row.chi'),
          value: num(chiPerDof, 3),
          emphasis: true,
        },
        ...fit(d.held, 'Held'),
        ...fit(d.free, 'Free'),
        {
          label: t('lensW.m.row.fitFree.fs'),
          value: num(d.free.fs, 3),
        }
      );
    }
    rows.push(howRow('lensW.m.value.how'));
    return rows;
  },
};

export const LENSING_WIDGETS = [BENDING, PLANE, PASSING];
