// =============================================================================
// The Light Lab
// -----------------------------------------------------------------------------
// Instruments over the radiation kernel (js/kernels/radiation, RADIATION.md).
// Every number a lesson asks for is read off the kernel by the instrument and
// listed in its readout: the canvas is a picture of the rows under it, never
// the only place a value is.
//
// Blackbody explorer. A temperature, the Planck curve it makes, the bandpasses
// a color is measured through, and the color that results. The curve is drawn
// as B_lambda against log wavelength and scaled to its own peak: it is the
// SHAPE that is being compared, and the power is a readout (sigma T^4).
// =============================================================================

import { t, registerMessages } from './i18n/index.js';
import { EN_LIGHT } from './i18n/en.light.js';
import { ES_LIGHT } from './i18n/es.light.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  planckLambda,
  wienPeakLambda,
  wienPeakNu,
  exitance,
} from './kernels/radiation/planck.js';
import { decodeBand, blackbodyColor } from './kernels/radiation/photometry.js';
import { loadBandpasses, loadLines } from './kernels/radiation/packs.js';
import { TEFF_SUN_K, C_LIGHT } from './kernels/radiation/constants.js';
import { loadBuiltin } from './platform/resolver.js';
import {
  blackbodyRgb,
  rgbCss,
  syntheticFlux,
  syntheticGrid,
  SYNTH_STARS,
  VIEW_LINES,
  DIP_IDS,
  measureViewLine,
  deepestDips,
} from './light/model.js';

registerMessages('en', EN_LIGHT);
registerMessages('es', ES_LIGHT);

/** The bandpasses, decoded, once the pack has arrived. */
let bands = null;

/** The line list and the four SDSS spectra, once they have arrived. */
let lineList = null;
let sdss = null;

/**
 * Resolves true when the instruments' data are usable. Never rejects: each
 * pack that fails to load is reported and left null, and the instrument that
 * needs it says so on screen.
 */
export const lightReady = Promise.all([
  loadBandpasses()
    .then(pack => {
      bands = Object.fromEntries(pack.BANDS.map(b => [b.id, decodeBand(b)]));
      return true;
    })
    .catch(err => {
      console.warn('The bandpasses could not be loaded:', err);
      return false;
    }),
  loadLines()
    .then(pack => {
      lineList = pack.LINES;
      return true;
    })
    .catch(err => {
      console.warn('The line list could not be loaded:', err);
      return false;
    }),
  loadBuiltin('builtin:data/sdss-spectra')
    .then(mod => {
      sdss = mod;
      return true;
    })
    .catch(err => {
      console.warn('The SDSS spectra could not be loaded:', err);
      return false;
    }),
]).then(oks => oks.every(Boolean));

/** The two colors the explorer can measure: bands, system, and the label. */
const PAIRS = [
  { a: 'B', b: 'V', system: 'vega', key: 'bv' },
  { a: 'g', b: 'r', system: 'ab', key: 'gr' },
];
const pairAt = v => PAIRS[v >= 0.5 ? 1 : 0];

/** The plot's wavelength range, nm, drawn on a logarithmic axis. */
const LAM = [100, 3000];
const LAM_LOG = LAM.map(Math.log);
const xOf = (lam, r) =>
  r.x + ((Math.log(lam) - LAM_LOG[0]) / (LAM_LOG[1] - LAM_LOG[0])) * r.w;

const nm = v => withUnit(v, 'nm', { sig: 4 });

/** What the canvas draws, as the readout lists it. Pure, for the tests. */
export function blackbodyFacts(T, pairIndex = 0) {
  const pair = PAIRS[pairIndex];
  const color =
    bands && bands[pair.a] && bands[pair.b]
      ? blackbodyColor(T, bands[pair.a], bands[pair.b], pair.system)
      : NaN;
  return {
    T,
    peakNm: wienPeakLambda(T) * 1e9,
    peakTHz: wienPeakNu(T) / 1e12,
    exitanceWm2: exitance(T),
    relativeToSun: (T / TEFF_SUN_K) ** 4,
    color,
    pair,
    rgb: blackbodyRgb(T),
  };
}

function draw(canvas, v) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(270, 200));
  const T = v.T;
  const pair = pairAt(v.pair);
  const r = { x: 44, y: 10, w: w - 56, h: h - 40 };

  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  // The visible range, as a neutral band: it is where the eye looks, not a color.
  g.fillStyle = colors.muted;
  g.globalAlpha = 0.12;
  g.fillRect(xOf(380, r), r.y, xOf(750, r) - xOf(380, r), r.h);
  g.globalAlpha = 1;
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const lam of [100, 300, 1000, 3000]) {
    g.fillText(String(lam), xOf(lam, r), r.y + r.h + 4);
  }
  g.textAlign = 'left';
  g.fillText(t('lightW.axis.wavelength'), r.x, r.y + r.h + 20);
  g.textAlign = 'center';
  g.fillText(t('lightW.visible'), (xOf(380, r) + xOf(750, r)) / 2, r.y + 4);

  // The two bandpasses the color is measured through.
  if (bands) {
    [pair.a, pair.b].forEach((id, k) => {
      const band = bands[id];
      g.strokeStyle = colors[k ? 'warn' : 'good'];
      g.setLineDash(k ? [5, 3] : []);
      g.lineWidth = 1.5;
      g.beginPath();
      band.lambdaNm.forEach((lam, i) => {
        const x = xOf(lam, r);
        const y = r.y + r.h - band.s[i] * r.h * 0.34;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = colors[k ? 'warn' : 'good'];
      g.textAlign = 'center';
      g.fillText(
        id,
        xOf(band.lambdaNm[band.s.indexOf(Math.max(...band.s))], r),
        r.y + r.h - r.h * 0.34 - 4
      );
    });
  }

  // The Planck curve, scaled to its own peak.
  const peakLam = wienPeakLambda(T);
  const top = planckLambda(peakLam, T);
  g.strokeStyle = colors.ink;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 240; i++) {
    const lam = Math.exp(LAM_LOG[0] + ((LAM_LOG[1] - LAM_LOG[0]) * i) / 240);
    const y = r.y + r.h - (planckLambda(lam * 1e-9, T) / top) * (r.h - 22) - 2;
    if (i === 0) g.moveTo(xOf(lam, r), y);
    else g.lineTo(xOf(lam, r), y);
  }
  g.stroke();

  // The Wien peak.
  const px = xOf(peakLam * 1e9, r);
  if (px > r.x && px < r.x + r.w) {
    g.setLineDash([2, 3]);
    g.lineWidth = 1;
    g.strokeStyle = colors.accent;
    g.beginPath();
    g.moveTo(px, r.y + 18);
    g.lineTo(px, r.y + r.h);
    g.stroke();
    g.setLineDash([]);
  }

  // The color a blackbody of this temperature appears: a swatch.
  g.fillStyle = rgbCss(blackbodyRgb(T));
  g.fillRect(r.x + r.w - 34, r.y + 4, 28, 28);
  g.strokeStyle = colors.grid;
  g.strokeRect(r.x + r.w - 34.5, r.y + 3.5, 29, 29);
}

const BLACKBODY = {
  id: 'blackbody',
  get title() {
    return t('lightW.bb.title');
  },
  get note() {
    return t('lightW.bb.note');
  },
  animated: false,
  controls: [
    {
      id: 'T',
      get label() {
        return t('lightW.control.T');
      },
      min: 2000,
      max: 20000,
      step: 1,
      value: 5772,
      decimals: 0,
      format: v => withUnit(Math.round(v), 'K', { sig: 5 }),
    },
    {
      id: 'pair',
      get label() {
        return t('lightW.control.pair');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`lightW.pair.${pairAt(v).key}`),
    },
  ],
  presets: [
    {
      values: { T: 3000 },
      get label() {
        return t('lightW.preset.k', { T: '3,000' });
      },
    },
    {
      values: { T: 5772 },
      get label() {
        return t('lightW.preset.sun');
      },
    },
    {
      values: { T: 10000 },
      get label() {
        return t('lightW.preset.k', { T: '10,000' });
      },
    },
  ],

  draw,

  readout(v) {
    const f = blackbodyFacts(v.T, v.pair >= 0.5 ? 1 : 0);
    const label = t(`lightW.pair.${f.pair.key}`);
    return [
      {
        label: t('lightW.row.kind'),
        value: t('lightW.value.kind'),
        emphasis: true,
      },
      {
        label: t('lightW.row.T'),
        value: withUnit(Math.round(f.T), 'K', { sig: 5 }),
      },
      { label: t('lightW.row.peak'), value: nm(f.peakNm), emphasis: true },
      {
        label: t('lightW.row.peakNu'),
        value: t('lightW.value.peakNu', {
          v: formatNumber(f.peakTHz, { sig: 4 }),
        }),
      },
      {
        label: t('lightW.row.exitance'),
        value: withUnit(f.exitanceWm2, 'W/m²', { sig: 4 }),
      },
      {
        label: t('lightW.row.vsSun'),
        value: `${formatNumber(f.relativeToSun, { sig: 3 })} ×`,
      },
      {
        label: t('lightW.row.color', { pair: label }),
        value: Number.isFinite(f.color)
          ? formatNumber(f.color, { sig: 3, sci: false })
          : t('lightW.loading'),
        emphasis: true,
      },
      {
        label: t('lightW.row.rgb'),
        value: t('lightW.value.rgb', { r: f.rgb[0], g: f.rgb[1], b: f.rgb[2] }),
      },
      { label: t('lightW.row.cite'), value: t('lightW.value.cite') },
    ];
  },
};

// -----------------------------------------------------------------------------
// Spectrum viewer
// -----------------------------------------------------------------------------

/** The sources, in the order the control steps through them. */
const SOURCES = ['a', 'g', 'k', 'm', ...SYNTH_STARS.map(s => s.id)];
const sourceAt = v =>
  SOURCES[Math.max(0, Math.min(SOURCES.length - 1, Math.round(v)))];
const isSynthetic = id => id.startsWith('s');

const C_KM_S = C_LIGHT / 1000;

/** The overview's wavelength range, Angstroms, for each kind of source. */
const OVERVIEW = { real: [3800, 9200], synthetic: [3800, 6800] };

const memo = new Map();

/** One source's spectrum about a line, or overall: { x, y }, Angstroms. */
function spectrumOf(id, lineRest, overview) {
  const key = `${id}/${overview ? 'all' : Math.round(lineRest)}`;
  if (memo.has(key)) return memo.get(key);
  let out = null;
  if (isSynthetic(id)) {
    const star = SYNTH_STARS.find(s => s.id === id);
    let x;
    if (overview) {
      x = [];
      for (let l = OVERVIEW.synthetic[0]; l <= OVERVIEW.synthetic[1]; l++)
        x.push(l);
    } else x = syntheticGrid(lineRest);
    out = { x, y: Array.from(syntheticFlux(x, star)), star };
  } else if (sdss) {
    const rec = sdss.decodeSpectrum(id);
    out = {
      x: Array.from(sdss.wavelengths()),
      y: Array.from(rec.flux),
      rec,
    };
  }
  if (memo.size > 40) memo.clear();
  if (out) memo.set(key, out);
  return out;
}

/** Everything the viewer shows for one setting. Pure, for the tests. */
export function spectrumFacts(v) {
  const id = sourceAt(v.src);
  const view = v.view >= 0.5 ? 'zoom' : 'all';
  const win =
    VIEW_LINES[
      Math.max(0, Math.min(VIEW_LINES.length - 1, Math.round(v.line)))
    ];
  const line = lineList ? lineList.find(l => l.id === win.id) : null;
  const restA = line ? line.vacuum * 10 : NaN;
  const data = line ? spectrumOf(id, restA, view === 'all') : null;
  const facts = {
    id,
    view,
    win,
    line,
    restA,
    data,
    synthetic: isSynthetic(id),
  };
  if (!data) return facts;
  if (view === 'zoom') {
    try {
      facts.m = measureViewLine(data.x, data.y, restA, win);
    } catch (err) {
      facts.error = err.code || 'measure';
    }
    if (facts.m && data.rec && Number.isFinite(data.rec.z)) {
      facts.catalogKmS = data.rec.z * C_KM_S;
      facts.catalogErrKmS = data.rec.zErr * C_KM_S;
    }
  } else {
    facts.dips = deepestDips(data.x, data.y, lineList, 5);
  }
  return facts;
}

const lineName = l => t(`lightW.line.${l.id}`);

function drawSpectrum(canvas, v) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(270, 200));
  const f = spectrumFacts(v);
  const r = { x: 44, y: 22, w: w - 56, h: h - 56 };
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillText(
    t(f.synthetic ? 'lightW.sp.tagSynthetic' : 'lightW.sp.tagObserved'),
    r.x,
    4
  );
  if (!f.data || !f.line) {
    g.textAlign = 'center';
    g.fillText(t('lightW.loading'), r.x + r.w / 2, r.y + r.h / 2);
    return;
  }
  const { x, y } = f.data;
  const lo =
    f.view === 'zoom'
      ? f.restA - 70
      : OVERVIEW[f.synthetic ? 'synthetic' : 'real'][0];
  const hi =
    f.view === 'zoom'
      ? f.restA + 70
      : OVERVIEW[f.synthetic ? 'synthetic' : 'real'][1];
  const X = lam => r.x + ((lam - lo) / (hi - lo)) * r.w;
  const idx = [];
  for (let i = 0; i < x.length; i++) if (x[i] >= lo && x[i] <= hi) idx.push(i);
  // The vertical scale: flux over the continuum fit when measuring, and flux
  // over its own largest value in view otherwise (a display choice; shape only).
  let norm = i => y[i];
  let top = Math.max(...idx.map(i => y[i]));
  let bottom = 0;
  if (f.view === 'zoom' && f.m) {
    const { c0, c1, reference } = f.m.continuum;
    norm = i => y[i] / (c0 + c1 * (x[i] - reference));
    top = 1.15;
    bottom = Math.min(0.3, Math.min(...idx.map(norm)) - 0.05);
  } else top *= 1.08;
  const Y = val => r.y + r.h - ((val - bottom) / (top - bottom)) * r.h;

  if (f.view === 'zoom' && f.m) {
    const shade = (a, b, hue) => {
      g.globalAlpha = 0.13;
      g.fillStyle = hue;
      g.fillRect(X(a), r.y, X(b) - X(a), r.h);
      g.globalAlpha = 1;
    };
    shade(f.m.windows.blue[0], f.m.windows.blue[1], colors.muted);
    shade(f.m.windows.red[0], f.m.windows.red[1], colors.muted);
    shade(f.m.windows.line[0], f.m.windows.line[1], colors.accent);
    g.setLineDash([4, 3]);
    g.strokeStyle = colors.muted;
    g.beginPath();
    g.moveTo(r.x, Y(1));
    g.lineTo(r.x + r.w, Y(1));
    g.stroke();
    g.setLineDash([]);
  }
  g.strokeStyle = colors.ink;
  g.lineWidth = 1.5;
  g.beginPath();
  idx.forEach((i, k) => {
    const px = X(x[i]);
    const py = Y(norm(i));
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.stroke();
  g.lineWidth = 1;

  // The line list: a tick at every listed rest wavelength in view.
  g.textAlign = 'center';
  const named =
    f.view === 'all'
      ? new Set((f.dips || []).map(d => d.line.id))
      : new Set([f.line.id]);
  for (const L of lineList) {
    if (!DIP_IDS.includes(L.id) && L.id !== f.line.id) continue;
    const lam = L.vacuum * 10;
    if (lam < lo || lam > hi) continue;
    g.strokeStyle = named.has(L.id) ? colors.accent : colors.grid;
    g.setLineDash(named.has(L.id) ? [] : [2, 3]);
    g.beginPath();
    g.moveTo(X(lam), r.y);
    g.lineTo(X(lam), r.y + 8);
    g.stroke();
    g.setLineDash([]);
    if (named.has(L.id)) {
      g.fillStyle = colors.accent;
      g.fillText(lineName(L), X(lam), r.y + 10);
    }
  }
  if (f.view === 'zoom' && f.m && f.m.center !== null) {
    g.strokeStyle = colors.warn;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(X(f.m.center), r.y + 24);
    g.lineTo(X(f.m.center), r.y + r.h);
    g.stroke();
    g.lineWidth = 1;
  }

  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  const step = f.view === 'zoom' ? 20 : 1000;
  for (let lam = Math.ceil(lo / step) * step; lam <= hi; lam += step) {
    g.fillText(String(lam), X(lam), r.y + r.h + 4);
  }
  g.textAlign = 'left';
  g.fillText(t('lightW.sp.axisX'), r.x, r.y + r.h + 20);
  g.textAlign = 'right';
  g.fillText(
    t(f.view === 'zoom' ? 'lightW.sp.axisYZoom' : 'lightW.sp.axisYAll'),
    r.x + r.w,
    r.y + r.h + 20
  );
}

const pm = (v, e, unit, sig = 5) =>
  `${formatNumber(v, { sig, sci: false })} ± ${formatNumber(e, { sig: 2, sci: false })} ${unit}`;

const SPECTRUM = {
  id: 'spectrum-viewer',
  get title() {
    return t('lightW.sp.title');
  },
  get note() {
    return t('lightW.sp.note');
  },
  animated: false,
  controls: [
    {
      id: 'src',
      get label() {
        return t('lightW.sp.control.src');
      },
      min: 0,
      max: SOURCES.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`lightW.sp.src.${sourceAt(v)}`),
    },
    {
      id: 'view',
      get label() {
        return t('lightW.sp.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(v >= 0.5 ? 'lightW.sp.view.zoom' : 'lightW.sp.view.all'),
    },
    {
      id: 'line',
      get label() {
        return t('lightW.sp.control.line');
      },
      min: 0,
      max: VIEW_LINES.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`lightW.line.${VIEW_LINES[Math.round(v)].id}`),
    },
  ],
  presets: [
    {
      values: { src: 0, view: 0 },
      get label() {
        return t('lightW.sp.preset.all');
      },
    },
    {
      values: { src: 4, view: 1, line: 0 },
      get label() {
        return t('lightW.sp.preset.synth');
      },
    },
  ],

  draw: drawSpectrum,

  readout(v) {
    const f = spectrumFacts(v);
    const rows = [
      {
        label: t('lightW.row.kind'),
        value: t(
          f.synthetic ? 'lightW.sp.kindSynthetic' : 'lightW.sp.kindObserved'
        ),
        emphasis: true,
      },
      { label: t('lightW.sp.row.src'), value: t(`lightW.sp.src.${f.id}`) },
    ];
    if (!f.data || !f.line) {
      rows.push({
        label: t('lightW.sp.row.state'),
        value: t('lightW.loading'),
      });
      return rows;
    }
    if (f.view === 'all') {
      rows.push({
        label: t('lightW.sp.row.dips'),
        value: t('lightW.sp.value.dips'),
      });
      (f.dips || []).forEach((d, k) =>
        rows.push({
          label: t('lightW.sp.row.dip', { n: k + 1 }),
          value: t('lightW.sp.value.dip', {
            name: lineName(d.line),
            lam: formatNumber(d.restA, { sig: 5 }),
            depth: formatNumber(d.depth * 100, { sig: 2 }),
          }),
        })
      );
      rows.push({
        label: t('lightW.sp.row.cite'),
        value: t('lightW.sp.value.cite'),
      });
      return rows;
    }
    rows.push({
      label: t('lightW.sp.row.line'),
      value: t('lightW.sp.value.line', {
        name: lineName(f.line),
        species: f.line.species,
        rest: formatNumber(f.restA, { sig: 7, sci: false }),
      }),
      emphasis: true,
    });
    const m = f.m;
    if (!m || m.center === null) {
      rows.push({
        label: t('lightW.sp.row.state'),
        value: t('lightW.sp.value.noLine'),
      });
      return rows;
    }
    rows.push(
      {
        label: t('lightW.sp.row.center'),
        value: pm(m.center, m.centerError, 'Å'),
        emphasis: true,
      },
      {
        label: t('lightW.sp.row.shift'),
        value: pm(m.shiftA, m.centerError, 'Å'),
      },
      {
        label: t('lightW.sp.row.v'),
        value: pm(m.velocity, m.velocityError, 'km/s', 3),
        emphasis: true,
      },
      { label: t('lightW.sp.row.ew'), value: pm(m.ew, m.ewError, 'Å') },
      {
        label: t('lightW.sp.row.depth'),
        value: `${formatNumber(m.depth * 100, { sig: 3 })} %`,
      },
      {
        label: t('lightW.sp.row.cont'),
        value: t('lightW.sp.value.cont', {
          n: m.continuum.points,
          scatter: formatNumber(m.continuum.scatter, { sig: 2 }),
        }),
      },
      { label: t('lightW.sp.row.how'), value: t('lightW.sp.value.how') }
    );
    if (f.catalogKmS !== undefined) {
      rows.push({
        label: t('lightW.sp.row.catalog'),
        value: t('lightW.sp.value.catalog', {
          z: formatNumber(f.data.rec.z, { sig: 4, sci: false }),
          v: pm(f.catalogKmS, f.catalogErrKmS, 'km/s', 3),
        }),
      });
    }
    rows.push({
      label: t('lightW.sp.row.cite'),
      value: t('lightW.sp.value.cite'),
    });
    return rows;
  },
};

export const LIGHT_WIDGETS = [BLACKBODY, SPECTRUM];
export { PAIRS, SOURCES };
