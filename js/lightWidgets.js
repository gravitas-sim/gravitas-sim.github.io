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
import { loadBandpasses } from './kernels/radiation/packs.js';
import { TEFF_SUN_K } from './kernels/radiation/constants.js';
import { blackbodyRgb, rgbCss } from './light/model.js';

registerMessages('en', EN_LIGHT);
registerMessages('es', ES_LIGHT);

/** The bandpasses, decoded, once the pack has arrived. */
let bands = null;

/** Resolves true when the bandpasses are usable. Never rejects. */
export const lightReady = loadBandpasses()
  .then(pack => {
    bands = Object.fromEntries(pack.BANDS.map(b => [b.id, decodeBand(b)]));
    return true;
  })
  .catch(err => {
    console.warn('The bandpasses could not be loaded:', err);
    return false;
  });

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

export const LIGHT_WIDGETS = [BLACKBODY];
export { PAIRS };
