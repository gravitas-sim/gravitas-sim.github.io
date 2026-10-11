// =============================================================================
// The cosmology instruments
// -----------------------------------------------------------------------------
// Three instruments over the cosmology kernel (js/kernels/cosmology,
// COSMOLOGY.md) and its data (js/cosmologyData.js):
//
//   hubble-law       a straight line of velocity against distance: Hubble's 1929
//                    nebulae, or the DES supernovae out to a redshift you choose
//   hubble-diagram   the 1,829 supernovae's distance moduli against redshift, a
//                    flat Lambda-CDM curve with its Omega_m and H0, the fit, and
//                    the degeneracy between H0 and the supernovae's absolute
//                    magnitude
//   redshift-wedge   2,911 galaxies of an SDSS strip as a wedge of the sky,
//                    with the clustering and the thinning that a flux limit makes
//
// The data are authentic; the distance scale of the supernova table is fixed by
// its release (H0 = 70), and the instruments say so. Every number a lesson asks
// for is a row of the readout under the picture.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_COSMOLOGY } from './i18n/en.cosmology.js';
import { ES_COSMOLOGY } from './i18n/es.cosmology.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { loadCosmologyData } from './cosmologyData.js';
import {
  createCosmology,
  fitHubbleLaw,
  fitSupernovae,
  h0Degeneracy,
  distanceFromModulus,
  wedgePoint,
  C_KMS,
} from './kernels/cosmology/index.js';

registerMessages('en', EN_COSMOLOGY);
registerMessages('es', ES_COSMOLOGY);

let data = null;
/** Resolves true once the data have been tried; never rejects. */
export const cosmologyReady = loadCosmologyData()
  .then(d => {
    data = d;
    return true;
  })
  .catch(err => {
    console.warn('The cosmology data could not be loaded:', err);
    return true;
  });

const num = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const signed = v => (v < 0 ? `−${num(-v)}` : num(v));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const loading = () => [
  { label: t('cosW.row.state'), value: t('cosW.loading') },
];
const sourceRow = key => ({
  label: t('cosW.row.source'),
  value: t(key),
  emphasis: true,
});
const DEG = Math.PI / 180;

// --- Drawing helpers -----------------------------------------------------------

function plot(canvas, xr, yr, labels, { base = 260 } = {}) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, 210));
  const r = { x: 56, y: 12, w: w - 70, h: h - 44 };
  const X = x => r.x + ((x - xr[0]) / (xr[1] - xr[0])) * r.w;
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
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const v of ticks(...xr))
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
const line = (p, pts, color, width = 2) => {
  p.g.strokeStyle = color;
  p.g.lineWidth = width;
  p.g.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) p.g.moveTo(p.X(x), p.Y(y));
    else p.g.lineTo(p.X(x), p.Y(y));
  });
  p.g.stroke();
};

// --- Hubble's law -----------------------------------------------------------------

/** The sample a Hubble-law view fits: distance (Mpc), cz (km/s), the errors, and the fits. */
export function hubbleLawView(v, source = data) {
  if (!source) return null;
  const sample = clamp(v.sample, 0, 1);
  if (sample === 0) {
    const h = source.hubble;
    // Hubble printed no errors: one scatter-sized error stands in, and the
    // error on the slope comes from the scatter about the line.
    const sigma = Float64Array.from(h.r, () => 100);
    const d = { x: h.r, y: h.v, sigma };
    return {
      sample,
      n: h.r.length,
      x: h.r,
      y: h.v,
      origin: fitHubbleLaw(d),
      line: fitHubbleLaw(d, { intercept: true }),
    };
  }
  const s = source.supernovae;
  const zmax = Math.max(0.05, v.zmax);
  const idx = [];
  for (let i = 0; i < s.z.length; i++) if (s.z[i] <= zmax) idx.push(i);
  const x = Float64Array.from(idx, i => distanceFromModulus(s.mu[i]));
  const y = Float64Array.from(idx, i => C_KMS * s.z[i]);
  const sigma = Float64Array.from(
    idx,
    (i, k) => (y[k] * Math.LN10 * s.err[i]) / 5
  );
  return {
    sample,
    n: idx.length,
    x,
    y,
    origin: fitHubbleLaw({ x, y, sigma }),
    line: null,
  };
}

function drawHubbleLaw(canvas, v) {
  const f = hubbleLawView(v);
  if (!f) return note(canvas, 'cosW.loading');
  const xmax = Math.max(...f.x) * 1.05;
  const ymax = Math.max(...f.y) * 1.08;
  const ymin = Math.min(0, ...f.y) * 1.1;
  const p = plot(
    canvas,
    [0, xmax],
    [ymax, ymin],
    ['cosW.h.axisD', 'cosW.h.axisV']
  );
  for (let i = 0; i < f.x.length; i++)
    dot(
      p.g,
      p.X(f.x[i]),
      p.Y(f.y[i]),
      f.sample === 0 ? 3.4 : 2,
      p.colors.accent
    );
  line(
    p,
    [
      [0, 0],
      [xmax, f.origin.H0 * xmax],
    ],
    p.colors.warn
  );
  if (f.line)
    line(
      p,
      [
        [0, f.line.v0],
        [xmax, f.line.v0 + f.line.H0 * xmax],
      ],
      p.colors.muted,
      1.5
    );
  p.done();
}

const HUBBLE_LAW = {
  id: 'hubble-law',
  get title() {
    return t('cosW.h.title');
  },
  get note() {
    return t('cosW.h.note');
  },
  animated: false,
  controls: [
    {
      id: 'sample',
      get label() {
        return t('cosW.h.control.sample');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`cosW.h.sample.${clamp(v, 0, 1)}`),
    },
    {
      id: 'zmax',
      get label() {
        return t('cosW.h.control.zmax');
      },
      min: 0.05,
      max: 0.5,
      step: 0.01,
      value: 0.1,
      decimals: 2,
      format: v => `z ≤ ${num(v, 2)}`,
    },
  ],
  presets: [
    {
      values: { sample: 0, zmax: 0.1 },
      get label() {
        return t('cosW.h.preset.1929');
      },
    },
    {
      values: { sample: 1, zmax: 0.1 },
      get label() {
        return t('cosW.h.preset.modern');
      },
    },
    {
      values: { sample: 1, zmax: 0.5 },
      get label() {
        return t('cosW.h.preset.far');
      },
    },
  ],
  draw: drawHubbleLaw,
  readout(v) {
    const f = hubbleLawView(v);
    if (!f) return loading();
    const o = f.origin;
    const rows = [
      sourceRow(f.sample === 0 ? 'cosW.h.source.1929' : 'cosW.h.source.des'),
      { label: t('cosW.h.row.n'), value: String(f.n) },
      {
        label: t('cosW.h.row.h0'),
        value: withUnit(
          `${num(o.H0, 4)} ± ${num(o.sigmaH0Scaled, 2)}`,
          'km/s/Mpc'
        ),
        emphasis: true,
      },
    ];
    if (f.line)
      rows.push({
        label: t('cosW.h.row.h0line'),
        value: withUnit(
          `${num(f.line.H0, 4)} ± ${num(f.line.sigmaH0Scaled, 2)}`,
          'km/s/Mpc'
        ),
        emphasis: true,
      });
    rows.push(
      {
        label: t('cosW.h.row.times'),
        value: num(o.H0 / 70, 3),
        emphasis: true,
      },
      { label: t('cosW.h.row.how'), value: t(`cosW.h.value.how.${f.sample}`) }
    );
    return rows;
  },
};

// --- The supernova Hubble diagram ----------------------------------------------------

let best = null;
let flat = null;
/** The full fit and the H0 profile, once (about 0.2 s). */
export function bestFit(source = data) {
  if (!source) return null;
  if (best && source === data) return best;
  const s = source.supernovae;
  const d = { x: s.z, y: s.mu, sigma: s.err };
  const out = {
    fit: fitSupernovae(d),
    degeneracy: h0Degeneracy(d, [50, 70, 90]),
  };
  if (source === data) best = out;
  return out;
}

/** chi-square and offset of flat Lambda-CDM at (Om, H0), the offset solved. */
function chi2At(Om, H0, s) {
  const c = createCosmology({ H0, Om, OL: 1 - Om });
  const mu = Float64Array.from(s.z, z => c.distanceModulus(z));
  let sw = 0;
  let sr = 0;
  for (let i = 0; i < mu.length; i++) {
    const w = 1 / (s.err[i] * s.err[i]);
    sw += w;
    sr += w * (s.mu[i] - mu[i]);
  }
  const offset = sr / sw;
  let chi2 = 0;
  for (let i = 0; i < mu.length; i++)
    chi2 += ((s.mu[i] - mu[i] - offset) / s.err[i]) ** 2;
  return { mu, offset, chi2 };
}

/** What the diagram instrument shows for a set of controls. */
export function diagramView(v, source = data) {
  if (!source) return null;
  const b = bestFit(source);
  const s = source.supernovae;
  const at = chi2At(v.om, v.h0, s);
  const calib = v.calib ?? 0;
  return {
    best: b.fit,
    degeneracy: b.degeneracy,
    at,
    dchi2: at.chi2 - b.fit.chi2,
    impliedH0: 70 * 10 ** (-calib / 5),
    perTenth: 100 * (1 - 10 ** -0.02),
    s,
  };
}

function milne(s) {
  if (flat?.s === s) return flat;
  const c = createCosmology({ H0: 70, Om: 0, OL: 0 });
  const mu = Float64Array.from(s.z, z => c.distanceModulus(z));
  let sw = 0;
  let sr = 0;
  for (let i = 0; i < mu.length; i++) {
    const w = 1 / (s.err[i] * s.err[i]);
    sw += w;
    sr += w * (s.mu[i] - mu[i]);
  }
  flat = { s, mu, offset: sr / sw, c };
  return flat;
}

function drawDiagram(canvas, v) {
  const f = diagramView(v);
  if (!f) return note(canvas, 'cosW.loading');
  const s = f.s;
  const view = clamp(v.view, 0, 1);
  const zmax = 1.15;
  if (view === 0) {
    const p = plot(
      canvas,
      [0, zmax],
      [47, 33],
      ['cosW.d.axisZ', 'cosW.d.axisMu']
    );
    for (let i = 0; i < s.z.length; i += 1)
      if (s.err[i] < 0.5)
        dot(p.g, p.X(s.z[i]), p.Y(s.mu[i]), 1.4, p.colors.accent);
    const c = createCosmology({ H0: v.h0, Om: v.om, OL: 1 - v.om });
    const pts = [];
    for (let k = 0; k <= 60; k++) {
      const z = 0.005 + (k / 60) * zmax;
      pts.push([z, c.distanceModulus(z) + f.at.offset]);
    }
    line(p, pts, p.colors.warn);
    p.done();
    return;
  }
  const m = milne(s);
  const p = plot(
    canvas,
    [0, zmax],
    [0.45, -0.45],
    ['cosW.d.axisZ', 'cosW.d.axisResid']
  );
  for (let i = 0; i < s.z.length; i += 1)
    if (s.err[i] < 0.5)
      dot(
        p.g,
        p.X(s.z[i]),
        p.Y(s.mu[i] - m.mu[i] - m.offset),
        1.4,
        p.colors.accent
      );
  const c = createCosmology({ H0: v.h0, Om: v.om, OL: 1 - v.om });
  const pts = [];
  for (let k = 0; k <= 60; k++) {
    const z = 0.005 + (k / 60) * zmax;
    pts.push([
      z,
      c.distanceModulus(z) + f.at.offset - m.c.distanceModulus(z) - m.offset,
    ]);
  }
  line(p, pts, p.colors.warn);
  line(
    p,
    [
      [0, 0],
      [zmax, 0],
    ],
    p.colors.muted,
    1
  );
  p.done();
}

const DIAGRAM = {
  id: 'hubble-diagram',
  get title() {
    return t('cosW.d.title');
  },
  get note() {
    return t('cosW.d.note');
  },
  animated: false,
  controls: [
    {
      id: 'om',
      get label() {
        return t('cosW.d.control.om');
      },
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.3,
      decimals: 2,
      format: v => num(v, 2),
    },
    {
      id: 'h0',
      get label() {
        return t('cosW.d.control.h0');
      },
      min: 50,
      max: 90,
      step: 1,
      value: 70,
      decimals: 0,
      format: v => withUnit(num(v, 3), 'km/s/Mpc'),
    },
    {
      id: 'calib',
      get label() {
        return t('cosW.d.control.calib');
      },
      min: -0.3,
      max: 0.3,
      step: 0.01,
      value: 0,
      decimals: 2,
      format: v => withUnit(signed(v), 'mag'),
    },
    {
      id: 'view',
      get label() {
        return t('cosW.d.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`cosW.d.view.${clamp(v, 0, 1)}`),
    },
  ],
  presets: [
    {
      values: { om: 0.3, h0: 70, calib: 0, view: 0 },
      get label() {
        return t('cosW.d.preset.default');
      },
    },
    {
      values: { om: 0.36, h0: 70, calib: 0, view: 1 },
      get label() {
        return t('cosW.d.preset.best');
      },
    },
    {
      values: { om: 0.3, h0: 70, calib: 0.1, view: 0 },
      get label() {
        return t('cosW.d.preset.calib');
      },
    },
  ],
  draw: drawDiagram,
  readout(v) {
    const f = diagramView(v);
    if (!f) return loading();
    const b = f.best;
    return [
      sourceRow('cosW.d.source'),
      { label: t('cosW.d.row.n'), value: String(b.n) },
      {
        label: t('cosW.d.row.om'),
        value: num(b.Om, 3),
        emphasis: true,
      },
      {
        label: t('cosW.d.row.interval'),
        value: `${num(b.omInterval[0], 3)} – ${num(b.omInterval[1], 3)}`,
        emphasis: true,
      },
      {
        label: t('cosW.d.row.chi2'),
        value: `${num(b.chi2, 5)} / ${b.dof}`,
        emphasis: true,
      },
      {
        label: t('cosW.d.row.chi2at'),
        value: num(f.at.chi2, 5),
        emphasis: true,
      },
      {
        label: t('cosW.d.row.delta'),
        value: num(f.dchi2, 4),
        emphasis: true,
      },
      {
        label: t('cosW.d.row.h0range'),
        value: formatNumber(f.degeneracy.range, { sig: 2, sci: true }),
        emphasis: true,
      },
      {
        label: t('cosW.d.row.implied'),
        value: withUnit(num(f.impliedH0, 4), 'km/s/Mpc'),
        emphasis: true,
      },
      {
        label: t('cosW.d.row.perTenth'),
        value: `${num(f.perTenth, 3)} %`,
        emphasis: true,
      },
      { label: t('cosW.d.row.how'), value: t('cosW.d.value.how') },
    ];
  },
};

// --- The redshift wedge ----------------------------------------------------------------

const wedges = new Map();
/** The strip as a wedge for a flat cosmology; cached by Omega_m (to 0.01). */
export function wedgeView(v, source = data) {
  if (!source) return null;
  const om = Math.round(v.om * 100) / 100;
  const key = `${om}`;
  let w = source === data ? wedges.get(key) : null;
  if (!w) {
    const c = createCosmology({ H0: 70, Om: om, OL: 1 - om });
    const { ra, z } = source.strip;
    const pts = Array.from(z, (zi, i) => ({
      z: zi,
      ra: ra[i],
      ...wedgePoint(c, ra[i], zi),
    }));
    w = { om, c, pts };
    if (source === data) wedges.set(key, w);
  }
  const zmax = v.zmax;
  const shown = w.pts.filter(p => p.z <= zmax);
  const rmax = w.c.comovingDistance(zmax);
  const shells = [];
  const omega = 120 * DEG * (0.5 * DEG);
  for (let r0 = 100; r0 + 25 <= rmax + 1e-9 && r0 < 400; r0 += 25) {
    const counts = new Array(24).fill(0);
    let total = 0;
    for (const p of shown)
      if (p.r >= r0 && p.r < r0 + 25) {
        total++;
        const k = Math.floor((p.ra - 180 + 60) / 5);
        if (k >= 0 && k < 24) counts[k]++;
      }
    const m = counts.reduce((a, b) => a + b, 0) / 24;
    const vmr =
      m > 0 ? counts.reduce((a, c) => a + (c - m) ** 2, 0) / 23 / m : null;
    const volume = (omega / 3) * ((r0 + 25) ** 3 - r0 ** 3);
    shells.push({ r0, total, vmr, density: (total / volume) * 1e6 });
  }
  const vm = shells.filter(s => s.vmr !== null);
  return {
    shown,
    rmax,
    shells,
    vmr: vm.length ? vm.reduce((a, s) => a + s.vmr, 0) / vm.length : null,
    near: shells.find(s => s.r0 === 100) ?? null,
    far: shells.find(s => s.r0 === 300) ?? null,
  };
}

function drawWedge(canvas, v) {
  const f = wedgeView(v);
  if (!f) return note(canvas, 'cosW.loading');
  const view = clamp(v.view, 0, 1);
  if (view === 1) {
    const dens = f.shells;
    const top = Math.max(1, ...dens.map(s => s.density)) * 1.1;
    const p = plot(
      canvas,
      [100, 400],
      [top, 0],
      ['cosW.w.axisR', 'cosW.w.axisDensity']
    );
    for (const s of dens)
      dot(p.g, p.X(s.r0 + 12.5), p.Y(s.density), 4, p.colors.accent);
    p.done();
    return;
  }
  const R = f.rmax * 1.03;
  const p = plot(
    canvas,
    [-R * 0.6, R * 0.6],
    [R, 0],
    ['cosW.w.axisX', 'cosW.w.axisY']
  );
  for (const q of f.shown) dot(p.g, p.X(q.x), p.Y(q.y), 1.1, p.colors.accent);
  p.done();
}

const WEDGE = {
  id: 'redshift-wedge',
  get title() {
    return t('cosW.w.title');
  },
  get note() {
    return t('cosW.w.note');
  },
  animated: false,
  controls: [
    {
      id: 'zmax',
      get label() {
        return t('cosW.w.control.zmax');
      },
      min: 0.04,
      max: 0.12,
      step: 0.01,
      value: 0.12,
      decimals: 2,
      format: v => `z ≤ ${num(v, 2)}`,
    },
    {
      id: 'om',
      get label() {
        return t('cosW.w.control.om');
      },
      min: 0.1,
      max: 0.5,
      step: 0.05,
      value: 0.3,
      decimals: 2,
      format: v => num(v, 2),
    },
    {
      id: 'view',
      get label() {
        return t('cosW.w.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`cosW.w.view.${clamp(v, 0, 1)}`),
    },
  ],
  presets: [
    {
      values: { zmax: 0.12, om: 0.3, view: 0 },
      get label() {
        return t('cosW.w.preset.wedge');
      },
    },
    {
      values: { zmax: 0.12, om: 0.3, view: 1 },
      get label() {
        return t('cosW.w.preset.density');
      },
    },
  ],
  draw: drawWedge,
  readout(v) {
    const f = wedgeView(v);
    if (!f) return loading();
    const rows = [
      sourceRow('cosW.w.source'),
      {
        label: t('cosW.w.row.shown'),
        value: String(f.shown.length),
        emphasis: true,
      },
      {
        label: t('cosW.w.row.rmax'),
        value: withUnit(num(f.rmax, 3), 'Mpc'),
        emphasis: true,
      },
    ];
    if (f.vmr !== null)
      rows.push({
        label: t('cosW.w.row.vmr'),
        value: num(f.vmr, 3),
        emphasis: true,
      });
    if (f.near)
      rows.push({
        label: t('cosW.w.row.near'),
        value: num(f.near.density, 3),
        emphasis: true,
      });
    if (f.far)
      rows.push({
        label: t('cosW.w.row.far'),
        value: num(f.far.density, 3),
        emphasis: true,
      });
    rows.push({ label: t('cosW.w.row.how'), value: t('cosW.w.value.how') });
    return rows;
  },
};

export const COSMOLOGY_WIDGETS = [HUBBLE_LAW, DIAGRAM, WEDGE];
