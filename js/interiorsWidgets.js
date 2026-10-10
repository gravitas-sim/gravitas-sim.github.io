// =============================================================================
// The interiors instruments
// -----------------------------------------------------------------------------
// Three instruments over the stellar-structure kernel (js/kernels/stellar,
// STELLAR_STRUCTURE.md): the profile of a polytropic star (density, pressure,
// temperature and enclosed mass from the Lane-Emden equation), the white-dwarf
// mass-radius relation from a cold degenerate electron gas, and the scaling of
// the main sequence set against the MIST zero-age models. Every assumption is a
// row of the readout and every number a lesson asks for is a row too. No
// observed white dwarfs are drawn: the compilation's terms could not be
// confirmed (D-INTERIOR-01).
//
// The heavy integrations (the table of indices, the white-dwarf relation) are
// requested from the kernel's Worker when the family loads, so the page does
// not do the arithmetic; until an answer lands, or where there is no Worker, the
// same functions run in place and give the same numbers.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_INTERIORS } from './i18n/en.interiors.js';
import { ES_INTERIORS } from './i18n/es.interiors.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  polytropeStar,
  polytropeProfile,
  homologyExponents,
  OPACITY,
  ENERGY,
  zeroAgeModels,
  fitPowerLaw,
  whiteDwarf,
  massRadiusCurve,
  fermiX,
  chandrasekharMassSun,
  nuclearTimescaleYr,
  createStellarClient,
} from './kernels/stellar/index.js';

registerMessages('en', EN_INTERIORS);
registerMessages('es', ES_INTERIORS);

const num = (v, sig = 3) => formatNumber(v, { sig });
const plain = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const isOn = x => x >= 0.5;

// -----------------------------------------------------------------------------
// The Worker's answers, kept
// -----------------------------------------------------------------------------

const curves = new Map();
const client = createStellarClient();
/** The white-dwarf relation for a mu_e: from the Worker when it has answered, else computed in place. */
export function curveFor(muE) {
  const key = muE.toFixed(2);
  if (!curves.has(key)) curves.set(key, massRadiusCurve(undefined, muE));
  return curves.get(key);
}
if (typeof Worker !== 'undefined') {
  client
    .request('whiteDwarfCurve', { muE: 2 })
    .then(c => curves.set('2.00', c))
    .catch(() => {});
}

// -----------------------------------------------------------------------------
// Pure views, for the instruments and for the tests
// -----------------------------------------------------------------------------

/** Where in a polytrope the enclosed mass reaches `fraction`, in units of the radius. */
export function radiusEnclosing(rows, fraction) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].m >= fraction) {
      const a = rows[i - 1];
      const b = rows[i];
      return a.r + ((fraction - a.m) / (b.m - a.m)) * (b.r - a.r);
    }
  }
  return 1;
}

export function polytropeView(v) {
  const mSun = 10 ** v.logM;
  const rSun = 10 ** v.logR;
  const star = polytropeStar(v.n, mSun * SOLAR_MASS_KG, rSun * SOLAR_RADIUS_M);
  const rows = polytropeProfile(star, 120);
  return {
    n: v.n,
    mSun,
    rSun,
    star,
    rows,
    xi1: star.sol.xi1,
    massConst: star.sol.mass,
    ratio: star.sol.rhoRatio,
    rhoMeanGcc: star.rhoMean / 1000,
    rhoCentralGcc: star.rhoCentral / 1000,
    pCentral: star.pCentral,
    tCentral: star.tCentral,
    halfMass: radiusEnclosing(rows, 0.5),
  };
}

export function dwarfView(v) {
  const muE = v.muE;
  const x = fermiX(10 ** v.logRho * 1000, muE);
  const w = whiteDwarf(x, muE);
  const limit = chandrasekharMassSun(muE);
  return {
    muE,
    x,
    w,
    limit,
    massSun: w.massSun,
    radiusSun: w.radiusSun,
    radiusKm: w.radiusM / 1000,
    meanGcc: w.meanDensity / 1000,
    relativistic: x >= 1,
    fractionOfLimit: w.massSun / limit,
  };
}

export const MS_RANGES = Object.freeze({ low: [0.5, 2], high: [2, 40] });
const LAWS = {
  opacity: [OPACITY.kramers, OPACITY.electron],
  energy: [ENERGY.pp, ENERGY.cno],
};

export function scalingView(v) {
  const z = zeroAgeModels();
  const kind = Math.round(v.quantity);
  const key = ['luminositySun', 'radiusSun', 'mainSequenceYr'][kind];
  const h = homologyExponents(
    LAWS.opacity[isOn(v.opacity) ? 1 : 0],
    LAWS.energy[isOn(v.energy) ? 1 : 0]
  );
  const predicted = [h.luminosityMass, h.x, 1 - h.luminosityMass][kind];
  const part = ([lo, hi]) => {
    const pts = z.filter(m => m.massSun >= lo && m.massSun <= hi);
    const xs = pts.map(m => m.massSun);
    const ys = pts.map(m => m[key]);
    const fit = fitPowerLaw(xs, ys);
    // The predicted exponent, with the intercept that fits best: what is left is the shape.
    const lx = xs.map(Math.log10);
    const ly = ys.map(Math.log10);
    const mx = lx.reduce((s, q) => s + q, 0) / lx.length;
    const my = ly.reduce((s, q) => s + q, 0) / ly.length;
    const b0 = my - predicted * mx;
    const res = ly.map((q, i) => q - (b0 + predicted * lx[i]));
    return {
      xs,
      fit: fit.slope,
      intercept: fit.intercept,
      b0,
      rms: Math.sqrt(res.reduce((s, q) => s + q * q, 0) / res.length),
    };
  };
  const sel = z[Math.min(z.length - 1, Math.max(0, Math.round(v.idx)))];
  return {
    z,
    key,
    kind,
    predicted,
    h,
    low: part(MS_RANGES.low),
    high: part(MS_RANGES.high),
    sel,
    selNuclearYr: nuclearTimescaleYr(sel.massSun, sel.luminositySun),
  };
}

// -----------------------------------------------------------------------------
// Drawing
// -----------------------------------------------------------------------------

function plot(canvas, xr, yr, labels, base, fmtX, fmtY) {
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
  { label: t('intW.row.source'), value: t(key), emphasis: true },
];
const howRow = key => ({ label: t('intW.row.how'), value: t(key) });

// -----------------------------------------------------------------------------
// The polytrope explorer
// -----------------------------------------------------------------------------

function drawPolytrope(canvas, v) {
  const f = polytropeView(v);
  const p = plot(
    canvas,
    [0, 1],
    [0, 1.05],
    ['intW.p.axisR', 'intW.p.axisY'],
    260,
    x => x,
    y => y
  );
  const { g, X, Y, colors } = p;
  const curve = (pick, hue, width, dash) => {
    g.strokeStyle = hue;
    g.lineWidth = width;
    g.setLineDash(dash || []);
    g.beginPath();
    f.rows.forEach((r, i) =>
      i ? g.lineTo(X(r.r), Y(pick(r))) : g.moveTo(X(r.r), Y(pick(r)))
    );
    g.stroke();
    g.setLineDash([]);
  };
  curve(r => r.rho / f.star.rhoCentral, colors.accent, 2.5);
  curve(r => r.p / f.star.pCentral, colors.warn, 2);
  curve(r => r.t / f.star.tCentral, colors.muted, 2, [5, 4]);
  curve(r => r.m, colors.grid, 2);
  g.strokeStyle = colors.grid;
  g.setLineDash([3, 4]);
  g.beginPath();
  g.moveTo(X(f.halfMass), Y(0));
  g.lineTo(X(f.halfMass), Y(1.05));
  g.stroke();
  g.setLineDash([]);
  dot(g, X(f.halfMass), Y(0.5), 4.5, colors.warn);
  legend(g, p.r, colors, 'intW.p.legend');
  p.done();
}

const POLYTROPE = {
  id: 'polytrope',
  get title() {
    return t('intW.p.title');
  },
  get note() {
    return t('intW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'n',
      get label() {
        return t('intW.p.control.n');
      },
      min: 0,
      max: 4.5,
      step: 0.5,
      value: 3,
      decimals: 1,
      format: v => plain(v, 2),
    },
    {
      id: 'logM',
      get label() {
        return t('intW.p.control.mass');
      },
      min: -1,
      max: 1.5,
      step: 0.01,
      value: 0,
      decimals: 2,
      format: v => withUnit(plain(10 ** v, 3), 'M☉'),
    },
    {
      id: 'logR',
      get label() {
        return t('intW.p.control.radius');
      },
      min: -1,
      max: 1,
      step: 0.01,
      value: 0,
      decimals: 2,
      format: v => withUnit(plain(10 ** v, 3), 'R☉'),
    },
  ],
  presets: [
    {
      values: { n: 3, logM: 0, logR: 0 },
      get label() {
        return t('intW.p.preset.sun');
      },
    },
    {
      values: { n: 1.5, logM: -0.7, logR: -0.66 },
      get label() {
        return t('intW.p.preset.dwarf');
      },
    },
    {
      values: { n: 0, logM: 0, logR: 0 },
      get label() {
        return t('intW.p.preset.uniform');
      },
    },
    {
      values: { n: 4.5, logM: 0, logR: 0 },
      get label() {
        return t('intW.p.preset.centred');
      },
    },
  ],
  draw: drawPolytrope,
  readout(v) {
    const f = polytropeView(v);
    return [
      ...sourceRow('intW.p.value.source'),
      { label: t('intW.p.row.n'), value: plain(f.n, 2) },
      { label: t('intW.p.row.mass'), value: withUnit(plain(f.mSun, 3), 'M☉') },
      {
        label: t('intW.p.row.radius'),
        value: withUnit(plain(f.rSun, 3), 'R☉'),
      },
      { label: t('intW.p.row.xi1'), value: plain(f.xi1, 5) },
      { label: t('intW.p.row.massConst'), value: plain(f.massConst, 5) },
      { label: t('intW.p.row.ratio'), value: num(f.ratio, 4) },
      {
        label: t('intW.p.row.rhoMean'),
        value: withUnit(num(f.rhoMeanGcc, 3), 'g/cm³'),
      },
      {
        label: t('intW.p.row.rhoC'),
        value: withUnit(num(f.rhoCentralGcc, 3), 'g/cm³'),
        emphasis: true,
      },
      {
        label: t('intW.p.row.pC'),
        value: withUnit(num(f.pCentral, 3), 'Pa'),
      },
      {
        label: t('intW.p.row.tC'),
        value: withUnit(num(f.tCentral, 3), 'K'),
        emphasis: true,
      },
      {
        label: t('intW.p.row.half'),
        value: plain(f.halfMass, 3),
      },
      {
        label: t('intW.p.row.approx'),
        value: t(
          f.n === 0
            ? 'intW.p.approx.0'
            : f.n <= 1.5
              ? 'intW.p.approx.low'
              : f.n <= 3.5
                ? 'intW.p.approx.mid'
                : 'intW.p.approx.high'
        ),
      },
      howRow('intW.p.value.how'),
    ];
  },
};

// -----------------------------------------------------------------------------
// The white-dwarf mass-radius relation
// -----------------------------------------------------------------------------

function drawDwarf(canvas, v) {
  const f = dwarfView(v);
  const p = plot(
    canvas,
    [0, 6.1],
    [-3.6, -0.6],
    ['intW.w.axisM', 'intW.w.axisR'],
    260,
    x => plain(x, 2),
    y => plain(10 ** y, 2)
  );
  const { g, X, Y, colors } = p;
  const curve = curveFor(f.muE);
  g.strokeStyle = colors.accent;
  g.lineWidth = 2.5;
  g.beginPath();
  let first = true;
  for (const d of curve) {
    const x = X(d.massSun);
    const y = Y(Math.log10(d.radiusSun));
    if (first) g.moveTo(x, y);
    else g.lineTo(x, y);
    first = false;
  }
  g.stroke();
  g.strokeStyle = colors.warn;
  g.setLineDash([4, 4]);
  g.beginPath();
  g.moveTo(X(f.limit), Y(-3.6));
  g.lineTo(X(f.limit), Y(-0.6));
  g.stroke();
  g.setLineDash([]);
  dot(g, X(f.massSun), Y(Math.log10(f.radiusSun)), 5.5, colors.warn);
  legend(g, p.r, colors, 'intW.w.legend');
  p.done();
}

const DWARF = {
  id: 'wd-mass-radius',
  get title() {
    return t('intW.w.title');
  },
  get note() {
    return t('intW.w.note');
  },
  animated: false,
  controls: [
    {
      id: 'logRho',
      get label() {
        return t('intW.w.control.rho');
      },
      min: 4,
      max: 11,
      step: 0.1,
      value: 6.5,
      decimals: 1,
      format: v => withUnit(num(10 ** v, 3), 'g/cm³'),
    },
    {
      id: 'muE',
      get label() {
        return t('intW.w.control.muE');
      },
      min: 1,
      max: 2.2,
      step: 0.05,
      value: 2,
      decimals: 2,
      format: v => plain(v, 3),
    },
  ],
  presets: [
    {
      values: { logRho: 5, muE: 2 },
      get label() {
        return t('intW.w.preset.light');
      },
    },
    {
      values: { logRho: 6.5, muE: 2 },
      get label() {
        return t('intW.w.preset.typical');
      },
    },
    {
      values: { logRho: 9, muE: 2 },
      get label() {
        return t('intW.w.preset.heavy');
      },
    },
    {
      values: { logRho: 8, muE: 1 },
      get label() {
        return t('intW.w.preset.hydrogen');
      },
    },
  ],
  draw: drawDwarf,
  readout(v) {
    const f = dwarfView(v);
    return [
      ...sourceRow('intW.w.value.source'),
      {
        label: t('intW.w.row.rho'),
        value: withUnit(num(10 ** v.logRho, 3), 'g/cm³'),
      },
      { label: t('intW.w.row.muE'), value: plain(f.muE, 3) },
      { label: t('intW.w.row.x'), value: num(f.x, 3) },
      {
        label: t('intW.w.row.regime'),
        value: t(f.relativistic ? 'intW.w.value.rel' : 'intW.w.value.nonrel'),
      },
      {
        label: t('intW.w.row.mass'),
        value: withUnit(num(f.massSun, 3), 'M☉'),
        emphasis: true,
      },
      {
        label: t('intW.w.row.radius'),
        value: withUnit(num(f.radiusSun, 3), 'R☉'),
        emphasis: true,
      },
      {
        label: t('intW.w.row.radiusKm'),
        value: withUnit(num(f.radiusKm, 3), 'km'),
      },
      {
        label: t('intW.w.row.mean'),
        value: withUnit(num(f.meanGcc, 3), 'g/cm³'),
      },
      {
        label: t('intW.w.row.limit'),
        value: withUnit(num(f.limit, 4), 'M☉'),
        emphasis: true,
      },
      {
        label: t('intW.w.row.fraction'),
        value: plain(f.fractionOfLimit, 3),
      },
      howRow('intW.w.value.how'),
    ];
  },
};

// -----------------------------------------------------------------------------
// Scaling the main sequence
// -----------------------------------------------------------------------------

const QUANTITY_KEYS = ['L', 'R', 'tau'];

function drawScaling(canvas, v) {
  const f = scalingView(v);
  const ys = f.z.map(m => Math.log10(m[f.key]));
  const lo = Math.floor(Math.min(...ys) - 0.3);
  const hi = Math.ceil(Math.max(...ys) + 0.3);
  const p = plot(
    canvas,
    [-0.8, 1.8],
    [lo, hi],
    ['intW.s.axisM', `intW.s.axisY.${QUANTITY_KEYS[f.kind]}`],
    280,
    x => plain(10 ** x, 2),
    y => (Math.abs(y) < 100 ? `10^${plain(y, 3)}` : plain(y))
  );
  const { g, X, Y, colors } = p;
  const line = (part, hue, dash) => {
    g.strokeStyle = hue;
    g.lineWidth = 2;
    g.setLineDash(dash || []);
    g.beginPath();
    const a = Math.log10(part.xs[0]);
    const b = Math.log10(part.xs[part.xs.length - 1]);
    g.moveTo(X(a), Y(part.b0 + f.predicted * a));
    g.lineTo(X(b), Y(part.b0 + f.predicted * b));
    g.stroke();
    g.setLineDash([]);
  };
  line(f.low, colors.accent, [6, 3]);
  line(f.high, colors.accent);
  f.z.forEach(m => {
    const on = m === f.sel;
    dot(
      g,
      X(Math.log10(m.massSun)),
      Y(Math.log10(m[f.key])),
      on ? 6 : 4,
      on ? colors.warn : colors.muted
    );
  });
  legend(g, p.r, colors, 'intW.s.legend');
  p.done();
}

const SCALING = {
  id: 'ms-scaling',
  get title() {
    return t('intW.s.title');
  },
  get note() {
    return t('intW.s.note');
  },
  animated: false,
  controls: [
    {
      id: 'quantity',
      get label() {
        return t('intW.s.control.quantity');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`intW.s.quantity.${QUANTITY_KEYS[Math.round(v)]}`),
    },
    {
      id: 'opacity',
      get label() {
        return t('intW.s.control.opacity');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(isOn(v) ? 'intW.s.opacity.es' : 'intW.s.opacity.kramers'),
    },
    {
      id: 'energy',
      get label() {
        return t('intW.s.control.energy');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(isOn(v) ? 'intW.s.energy.cno' : 'intW.s.energy.pp'),
    },
    {
      id: 'idx',
      get label() {
        return t('intW.s.control.model');
      },
      min: 0,
      max: 7,
      step: 1,
      value: 2,
      decimals: 0,
      format: v =>
        withUnit(plain(zeroAgeModels()[Math.round(v)].massSun, 3), 'M☉'),
    },
  ],
  presets: [
    {
      values: { quantity: 0, opacity: 1, energy: 1, idx: 5 },
      get label() {
        return t('intW.s.preset.massive');
      },
    },
    {
      values: { quantity: 0, opacity: 0, energy: 0, idx: 2 },
      get label() {
        return t('intW.s.preset.low');
      },
    },
    {
      values: { quantity: 1, opacity: 1, energy: 1, idx: 5 },
      get label() {
        return t('intW.s.preset.radius');
      },
    },
    {
      values: { quantity: 2, opacity: 1, energy: 1, idx: 3 },
      get label() {
        return t('intW.s.preset.life');
      },
    },
  ],
  draw: drawScaling,
  readout(v) {
    const f = scalingView(v);
    const s = f.sel;
    return [
      ...sourceRow('intW.s.value.source'),
      {
        label: t('intW.s.row.predicted'),
        value: plain(f.predicted, 3),
        emphasis: true,
      },
      {
        label: t('intW.s.row.fitLow'),
        value: plain(f.low.fit, 3),
        emphasis: true,
      },
      { label: t('intW.s.row.rmsLow'), value: plain(f.low.rms, 3) },
      {
        label: t('intW.s.row.fitHigh'),
        value: plain(f.high.fit, 3),
        emphasis: true,
      },
      { label: t('intW.s.row.rmsHigh'), value: plain(f.high.rms, 3) },
      {
        label: t('intW.s.row.model'),
        value: withUnit(plain(s.massSun, 3), 'M☉'),
      },
      {
        label: t('intW.s.row.lum'),
        value: withUnit(num(s.luminositySun, 3), 'L☉'),
      },
      {
        label: t('intW.s.row.rad'),
        value: withUnit(num(s.radiusSun, 3), 'R☉'),
      },
      {
        label: t('intW.s.row.life'),
        value: withUnit(num(s.mainSequenceYr / 1e9, 3), 'Gyr'),
      },
      {
        label: t('intW.s.row.nuclear'),
        value: withUnit(num(f.selNuclearYr / 1e9, 3), 'Gyr'),
      },
      howRow('intW.s.value.how'),
    ];
  },
};

export const INTERIORS_WIDGETS = [POLYTROPE, DWARF, SCALING];
