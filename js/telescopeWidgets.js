// =============================================================================
// The telescope instrument (Prompt 208, TELESCOPES.md)
// -----------------------------------------------------------------------------
// One panel in the detector family's spirit: a synthetic double star or a faint
// field, made through the telescope the controls describe (an Airy pattern of
// the aperture convolved with a Moffat seeing profile, js/kernels/detector/
// optics.js and telescope.js) and measured with Prompt 183's PSF tool
// (js/telescopeField.js). Two numbers are labelled and kept apart:
//
//   Rayleigh separation   computed from the aperture and the wavelength: the first
//                         dark ring of the diffraction pattern
//   measured FWHM         fitted to the reference stars of this frame: the width of
//                         a profile, with the seeing and the fit's model in it
//
// No arithmetic is repeated here: every number is the kernel's or a tool's, and
// tests/telescopeLessons.test.js recomputes each one a lesson states. Every frame
// is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_TELESCOPE } from './i18n/en.telescope.js';
import { ES_TELESCOPE } from './i18n/es.telescope.js';
import { fixed } from './format.js';
import {
  surface,
  palette,
  TYPE,
  typeAt,
  responsiveHeight,
} from './widgetCanvas.js';
import { measureTelescope } from './telescopeField.js';
import { toRad } from './kernels/detector/optics.js';
import { DETECTOR } from './kernels/detector/telescope.js';

registerMessages('en', EN_TELESCOPE);
registerMessages('es', ES_TELESCOPE);

/** The apertures, centimetres, and the exposures, seconds, the sliders step through. */
export const APERTURES_CM = Object.freeze([
  5, 10, 20, 30, 40, 60, 100, 200, 400, 800,
]);
export const EXPOSURES_S = Object.freeze([5, 10, 30, 60, 120, 300, 600]);
const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

/** The config a set of control values means. */
export function configOf(v = {}) {
  return {
    apertureM:
      APERTURES_CM[clampIndex(v.aperture ?? 2, APERTURES_CM.length)] / 100,
    focalRatio: v.focal ?? 12,
    wavelengthNm: v.wavelength ?? 550,
    seeingArcsec: v.seeing ?? 1,
    obstruction: (v.obstruction ?? 0) / 100,
    exposureS: EXPOSURES_S[clampIndex(v.exposure ?? 3, EXPOSURES_S.length)],
    scene: (v.scene ?? 0) >= 0.5 ? 'field' : 'pair',
    separationArcsec: v.separation ?? 1,
    pixelM: 5e-6,
    seed: 'telescope-208',
  };
}

let last = null;
/** The measured frame for control values (the last one is kept: draw and readout both ask). */
export function telescopeView(v) {
  const cfg = configOf(v);
  const key = JSON.stringify(cfg);
  if (last?.key === key) return last.view;
  const view = measureTelescope(cfg);
  last = { key, view };
  return view;
}

const numeric = (id, label, min, max, step, value, unit, decimals = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min,
  max,
  step,
  value,
  decimals,
  format: x => `${fixed(x, decimals)}${unit}`,
});

function pictureOf(view) {
  const f = view.result.frame;
  const { width: W, height: H, values } = f;
  const sorted = Float64Array.from(values).sort();
  const base = sorted[Math.floor(sorted.length / 2)] ?? DETECTOR.biasLevel;
  const noise = Math.max(
    1,
    Math.sqrt(Math.max(1, base - DETECTOR.biasLevel) / 1) / 4 + 1
  );
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const top = Math.asinh(300);
  for (let i = 0; i < W * H; i += 1) {
    const u = (values[i] - base) / noise;
    const s = Math.max(
      0,
      Math.min(255, Math.round((255 * Math.asinh(Math.max(0, u) / 2)) / top))
    );
    const k = 4 * i;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = s;
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function draw(canvas, v) {
  const view = telescopeView(v);
  const colors = palette();
  const r = view.result;
  const side = Math.min(responsiveHeight(260, 200), canvas.clientWidth || 260);
  const plot = view.config.scene === 'pair' ? 92 : 0;
  const { ctx: g, w } = surface(canvas, side + plot + 4);
  const ox = Math.max(0, (w - side) / 2);
  const k = side / r.frame.width;
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  g.imageSmoothingEnabled = false;
  g.drawImage(pictureOf(view), ox, 0, side, side);
  g.lineWidth = 1.5;
  g.strokeStyle = colors.accent;
  for (const s of view.sources ?? []) {
    if (s.placed?.role === 'pair') continue;
    g.beginPath();
    g.arc(
      ox + (s.x + 0.5) * k,
      (s.y + 0.5) * k,
      Math.max(6, 2.2 * r.truth.combinedFwhmPx * k),
      0,
      2 * Math.PI
    );
    g.stroke();
  }
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillStyle = colors.warn;
  g.fillText(t('telW.legend.frame'), ox + 6, 6);
  if (view.config.scene === 'field') {
    const f = r.stars.find(s => s.role === 'faint');
    g.strokeStyle = colors.warn;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.arc(
      ox + (f.x + 0.5) * k,
      (f.y + 0.5) * k,
      Math.max(9, 3 * r.truth.combinedFwhmPx * k),
      0,
      2 * Math.PI
    );
    g.stroke();
    g.setLineDash([]);
    g.fillText(t('telW.legend.faint'), ox + 6, 22);
  } else {
    drawCut(g, view, colors, ox, side + 6, side, plot - 8);
  }
}

/** The row through the pair against the model's summed profile, as one small plot. */
function drawCut(g, view, colors, ox, y0, width, height) {
  const r = view.result;
  const cfg = view.config;
  const A = r.stars.find(s => s.id === 'A');
  const B = r.stars.find(s => s.id === 'B');
  const px = cfg.pixelScaleArcsec;
  const half = Math.max(
    2.2 * r.truth.combinedFwhmPx,
    (cfg.separationArcsec / px) * 0.9 + 3
  );
  const cx = (A.x + B.x) / 2;
  const row = Math.round(A.y);
  const W = r.frame.width;
  const xs = [];
  for (
    let x = Math.max(0, Math.floor(cx - half));
    x <= Math.min(W - 1, Math.ceil(cx + half));
    x += 1
  )
    xs.push(x);
  const bias = DETECTOR.biasLevel;
  const data = xs.map(x => r.frame.values[row * W + x] - bias);
  const model = xs.map(
    x =>
      r.psf.profile(toRad(Math.abs(x - A.x) * px)) +
      r.psf.profile(toRad(Math.abs(x - B.x) * px))
  );
  const top = Math.max(...model, 1e-9);
  const dTop = Math.max(...data, 1e-9);
  const X = x =>
    ox + 28 + ((x - xs[0]) / Math.max(1, xs.at(-1) - xs[0])) * (width - 34);
  const Y = u => y0 + height - 14 - Math.max(0, u) * (height - 22);
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(ox + 28, y0 + 2, width - 34, height - 14);
  g.strokeStyle = colors.accent;
  g.lineWidth = 2;
  g.beginPath();
  xs.forEach((x, i) =>
    i ? g.lineTo(X(x), Y(model[i] / top)) : g.moveTo(X(x), Y(model[i] / top))
  );
  g.stroke();
  g.fillStyle = colors.warn;
  xs.forEach((x, i) => {
    g.beginPath();
    g.arc(X(x), Y(data[i] / dTop), 2.5, 0, 2 * Math.PI);
    g.fill();
  });
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.fillText(
    `${t('telW.legend.pair')}  ·  ${t('telW.legend.row')}`,
    ox + 30,
    y0 + height - 10
  );
}

const TELESCOPE = {
  id: 'telescope',
  get title() {
    return t('telW.title');
  },
  get note() {
    return t('telW.note');
  },
  animated: false,
  controls: [
    {
      id: 'aperture',
      get label() {
        return t('telW.control.aperture');
      },
      min: 0,
      max: APERTURES_CM.length - 1,
      step: 1,
      value: 2,
      decimals: 0,
      format: x => `${APERTURES_CM[clampIndex(x, APERTURES_CM.length)]} cm`,
    },
    numeric('focal', 'telW.control.focal', 4, 60, 1, 12, '', 0),
    numeric('wavelength', 'telW.control.wavelength', 400, 1000, 50, 550, ' nm'),
    numeric('seeing', 'telW.control.seeing', 0, 3, 0.1, 1, ' arcsec', 1),
    numeric('obstruction', 'telW.control.obstruction', 0, 50, 5, 0, ' %'),
    {
      id: 'exposure',
      get label() {
        return t('telW.control.exposure');
      },
      min: 0,
      max: EXPOSURES_S.length - 1,
      step: 1,
      value: 3,
      decimals: 0,
      format: x => `${EXPOSURES_S[clampIndex(x, EXPOSURES_S.length)]} s`,
    },
    {
      id: 'scene',
      get label() {
        return t('telW.control.scene');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`telW.scene.${Math.round(x)}`),
    },
    numeric(
      'separation',
      'telW.control.separation',
      0.3,
      3,
      0.1,
      1,
      ' arcsec',
      1
    ),
  ],
  draw,
  readout(v) {
    const m = telescopeView(v);
    const cfg = m.config;
    const rows = [
      { label: t('telW.row.model'), value: t('telW.m'), emphasis: false },
      {
        label: t('telW.row.rayleigh'),
        value: `${fixed(m.rayleighArcsec, 2)} arcsec`,
        emphasis: true,
      },
      {
        label: t('telW.row.fwhm'),
        value: Number.isFinite(m.measuredFwhmArcsec)
          ? t(m.modelLimited ? 'telW.v.fwhmLimited' : 'telW.v.fwhm', {
              w: fixed(m.measuredFwhmArcsec, 2),
              s: fixed(m.measuredFwhmSigmaArcsec, 2),
            })
          : t('telW.v.none'),
        emphasis: true,
      },
      {
        label: t('telW.row.airy'),
        value: `${fixed(m.airyFwhmArcsec, 2)} arcsec`,
      },
      {
        label: t('telW.row.seeing'),
        value: `${fixed(cfg.seeingArcsec, 1)} arcsec`,
      },
      {
        label: t('telW.row.profile'),
        value: `${fixed(m.truthFwhmArcsec, 2)} arcsec`,
      },
    ];
    if (m.pair)
      rows.push({
        label: t('telW.row.pair'),
        value: t('telW.v.pair', {
          s: fixed(m.pair.separationArcsec, 1),
          r: fixed(m.pair.rayleighRatio, 2),
          d: fixed(100 * m.pair.dip, 0),
        }),
        emphasis: true,
      });
    if (m.faint)
      rows.push({
        label: t('telW.row.faint'),
        value: t(m.faint.detected ? 'telW.v.faintSeen' : 'telW.v.faintMissed', {
          m: fixed(m.faint.magnitude, 1),
          e: fixed(m.faint.expectedSnr, 1),
        }),
        emphasis: true,
      });
    rows.push(
      {
        label: t('telW.row.gather'),
        value: t('telW.v.gather', {
          a: fixed(m.lightGathering, 1),
          b: fixed(m.againstEye, 0),
        }),
      },
      {
        label: t('telW.row.scale'),
        value: t('telW.v.scale', {
          p: fixed(m.pixelScaleArcsec, 3),
          f: fixed(cfg.focalLengthM, 1),
        }),
      }
    );
    if (m.saturated)
      rows.push({
        label: t('telW.row.saturated'),
        value: t('telW.v.saturated'),
      });
    rows.push({ label: t('telW.row.assumes'), value: t('telW.a') });
    return rows;
  },
};

export const TELESCOPE_WIDGETS = [TELESCOPE];
