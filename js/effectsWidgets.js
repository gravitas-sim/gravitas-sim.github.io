// =============================================================================
// The detector-effects instrument (Prompt 211, DETECTOR_EFFECTS.md)
// -----------------------------------------------------------------------------
// One panel in the detector family's spirit: a synthetic frame of a bright star
// and some fainter ones, made with the effects the toggles switch on
// (js/kernels/detector/frame.js with effects.js: a stated nonlinearity,
// cosmic-ray tracks, charge bleeding) and measured with Prompt 180's photometry
// (js/effectsField.js). The tool refuses a pixel at the linear limit and a pixel the
// frame's sidecar flags; the number it would have given, had it ignored them, is
// shown beside the refusal and never as the measurement. Every row of the readout is
// also the table alternative to the picture. No arithmetic is repeated here:
// every number is the kernel's or a tool's. Every frame is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_EFFECTS } from './i18n/en.effects.js';
import { ES_EFFECTS } from './i18n/es.effects.js';
import { fixed } from './format.js';
import {
  surface,
  palette,
  TYPE,
  typeAt,
  responsiveHeight,
} from './widgetCanvas.js';
import { DETECTOR, measureEffects } from './effectsField.js';
import { FLAG, responseCurve } from './kernels/detector/effects.js';
import { phaseStats } from './kernels/detector/sampling.js';

registerMessages('en', EN_EFFECTS);
registerMessages('es', ES_EFFECTS);

/** The exposures, seconds, the slider steps through. */
export const EXPOSURES_S = Object.freeze([5, 10, 30, 60, 120, 300]);
const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
const on = x => (x ?? 0) >= 0.5;

/** The config a set of control values means. */
export function configOf(v = {}) {
  return {
    brightMag: v.bright ?? 9.5,
    exposureS: EXPOSURES_S[clampIndex(v.exposure ?? 3, EXPOSURES_S.length)],
    nonlinearity: on(v.nonlinear),
    bleed: on(v.bleed),
    cosmic: on(v.cosmic),
    fwhmPx: v.fwhm ?? 2.8,
    seed: 'detector-effects',
  };
}

let last = null;
/** The measured frame for control values (the last one is kept: draw and readout both ask). */
export function effectsView(v) {
  const cfg = configOf(v);
  const key = JSON.stringify(cfg);
  if (last?.key === key) return last.view;
  const view = measureEffects(cfg);
  view.phase = phaseStats(cfg.fwhmPx);
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
const toggle = (id, label, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(`fxW.toggle.${Math.round(x)}`),
});

const FLAG_COLORS = [
  [FLAG.nonlinear, 'rgba(255,160,40,0.45)'],
  [FLAG.cosmic, 'rgba(60,220,255,0.6)'],
  [FLAG.bleed, 'rgba(255,60,220,0.5)'],
  [FLAG.saturated, 'rgba(255,60,60,0.7)'],
];

function pictureOf(view, showFlags) {
  const r = view.result;
  const f = r.frame;
  const { width: W, height: H, values } = f;
  const bias = DETECTOR.biasLevel;
  const sorted = Float64Array.from(values).sort();
  const base = sorted[Math.floor(sorted.length / 2)] ?? bias;
  const noise = Math.max(1, Math.sqrt(Math.max(1, base - bias)) / 4 + 1);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const top = Math.asinh(600);
  const flags = f.truth.effects.flags;
  for (let i = 0; i < W * H; i += 1) {
    const u = (values[i] - base) / noise;
    const s = Math.max(
      0,
      Math.min(255, Math.round((255 * Math.asinh(Math.max(0, u) / 2)) / top))
    );
    let rgb = [s, s, s];
    if (showFlags && flags[i]) {
      const hit = FLAG_COLORS.find(([b]) => flags[i] & b);
      const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(hit[1]);
      const a = Number(m[4]);
      rgb = [0, 1, 2].map(k => Math.round((1 - a) * s + a * Number(m[k + 1])));
    }
    const k = 4 * i;
    img.data[k] = rgb[0];
    img.data[k + 1] = rgb[1];
    img.data[k + 2] = rgb[2];
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Each star's peak: the charge collected there (truth) and what was recorded, electrons. */
function peaks(view) {
  const r = view.result;
  const fx = r.frame.truth.effects;
  const W = r.frame.width;
  const d = r.detector;
  return r.stars.map(s => {
    let col = 0;
    let rec = 0;
    for (let j = Math.round(s.y) - 1; j <= Math.round(s.y) + 1; j += 1)
      for (let i = Math.round(s.x) - 1; i <= Math.round(s.x) + 1; i += 1) {
        const k = j * W + i;
        if (!(k >= 0 && k < fx.flags.length)) continue;
        col = Math.max(col, fx.electronsCollected[k]);
        rec = Math.max(rec, (r.frame.values[k] - d.biasLevel) * d.gain);
      }
    return { id: s.id, collected: col, recorded: rec };
  });
}

function draw(canvas, v) {
  const view = effectsView(v);
  const colors = palette();
  const r = view.result;
  const showFlags = on(v.flags ?? 1);
  const side = Math.min(responsiveHeight(260, 200), canvas.clientWidth || 260);
  const plot = 110;
  const { ctx: g, w } = surface(canvas, side + plot + 20);
  const ox = Math.max(0, (w - side) / 2);
  const k = side / r.frame.width;
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  g.imageSmoothingEnabled = false;
  g.drawImage(pictureOf(view, showFlags), ox, 0, side, side);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.lineWidth = 1.5;
  for (const row of view.rows) {
    g.strokeStyle = row.code ? colors.warn : colors.accent;
    g.beginPath();
    g.arc(
      ox + (row.x + 0.5) * k,
      (row.y + 0.5) * k,
      Math.max(5, 1.5 * r.config.fwhmPx * k),
      0,
      2 * Math.PI
    );
    g.stroke();
    g.fillStyle = colors.text ?? '#ffffff';
    g.fillText(row.id, ox + (row.x + 0.5) * k + 6, (row.y + 0.5) * k + 6);
  }
  g.fillStyle = colors.warn;
  g.fillText(t('fxW.legend.frame'), ox + 6, 6);
  if (showFlags) {
    g.fillStyle = colors.muted;
    g.fillText(t('fxW.legend.flags'), ox, side + 4);
  }
  drawResponse(g, view, colors, ox, side + 20, side, plot - 6);
}

/** The stars' peaks against the stated response: recorded against collected charge. */
function drawResponse(g, view, colors, ox, y0, width, height) {
  const r = view.result;
  const fx = r.frame.truth.effects;
  const FW = r.detector.fullWell;
  const nl = fx.applied.nonlinearity;
  const xMax = 1.15 * FW;
  const X = e => ox + 34 + (e / xMax) * (width - 40);
  const Y = e => y0 + height - 14 - (e / xMax) * (height - 22);
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(ox + 34, y0 + 2, width - 40, height - 14);
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(X(0), Y(0));
  g.lineTo(X(FW), Y(FW));
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = colors.accent;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const e = (i / 60) * FW;
    const y = nl ? responseCurve(e, FW, nl.kneeFraction) : e;
    if (i) g.lineTo(X(e), Y(y));
    else g.moveTo(X(e), Y(y));
  }
  g.lineTo(X(xMax), Y(fx.plateauElectrons));
  g.stroke();
  if (fx.linearLimitElectrons !== null) {
    g.strokeStyle = colors.warn;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(X(fx.linearLimitElectrons), y0 + 2);
    g.lineTo(X(fx.linearLimitElectrons), y0 + height - 12);
    g.stroke();
    g.setLineDash([]);
  }
  g.fillStyle = colors.warn;
  for (const p of peaks(view)) {
    g.beginPath();
    g.arc(X(p.collected), Y(p.recorded), 2.5, 0, 2 * Math.PI);
    g.fill();
  }
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.fillText(t('fxW.legend.plot'), ox + 36, y0 + height - 10);
}

const flagText = names =>
  names.length
    ? names.map(n => t(`fxW.flag.${n}`)).join(', ')
    : t('fxW.flags.none');

/** The readout's rows for control values (what the panel shows under the picture; the tests read it). */
export const readoutRows = v => DETECTOR_EFFECTS.readout(v);

const DETECTOR_EFFECTS = {
  id: 'detector-effects',
  get title() {
    return t('fxW.title');
  },
  get note() {
    return t('fxW.note');
  },
  animated: false,
  controls: [
    numeric('bright', 'fxW.control.bright', 6, 14, 0.5, 9.5, '', 1),
    {
      id: 'exposure',
      get label() {
        return t('fxW.control.exposure');
      },
      min: 0,
      max: EXPOSURES_S.length - 1,
      step: 1,
      value: 3,
      decimals: 0,
      format: x => `${EXPOSURES_S[clampIndex(x, EXPOSURES_S.length)]} s`,
    },
    toggle('nonlinear', 'fxW.control.nonlinear'),
    toggle('bleed', 'fxW.control.bleed'),
    toggle('cosmic', 'fxW.control.cosmic'),
    numeric('fwhm', 'fxW.control.fwhm', 1, 5, 0.2, 2.8, '', 1),
    toggle('flags', 'fxW.control.flags', 1),
  ],
  draw,
  readout(v) {
    const view = effectsView(v);
    const r = view.result;
    const cfg = r.config;
    const fx = r.frame.truth.effects;
    const FW = r.detector.fullWell;
    const rows = [
      { label: t('fxW.row.model'), value: t('fxW.m'), emphasis: false },
      {
        label: t('fxW.row.sampling'),
        value: t('fxW.v.sampling', {
          w: fixed(cfg.fwhmPx, 1),
          r: t(`fxW.regime.${view.regime}`),
          lo: fixed(100 * view.phase.peakMin, 0),
          hi: fixed(100 * view.phase.peakMax, 0),
          s: fixed(100 * view.phase.apRelStd, 3),
        }),
      },
      {
        label: t('fxW.row.limit'),
        value:
          fx.linearLimitElectrons === null
            ? t('fxW.v.limitOff', { fw: fixed(FW, 0) })
            : t('fxW.v.limitOn', {
                lim: fixed(fx.linearLimitElectrons, 0),
                fw: fixed(FW, 0),
                plateau: fixed(fx.plateauElectrons, 0),
              }),
      },
    ];
    for (const s of view.rows) {
      const common = {
        role: t(`fxW.role.${s.role}`),
        m: fixed(s.mag, 1),
        truth: fixed(s.truthElectrons, 0),
        flags: flagText(s.flags),
      };
      let value;
      if (s.net !== undefined)
        value = t('fxW.v.measured', {
          ...common,
          net: fixed(s.net, 0),
          pull: fixed(s.pull, 1),
        });
      else if (s.code === 'saturated' || s.code === 'masked')
        value = t(`fxW.v.refused.${s.code}`, {
          ...common,
          ratio: s.ignored ? fixed(100 * s.ignored.ratio, 0) : '?',
        });
      else value = t('fxW.v.refused.other', { ...common, code: s.code });
      rows.push({
        label: t('fxW.row.star', { id: s.id }),
        value,
        emphasis: s.role === 'bright',
      });
    }
    rows.push(
      {
        label: t('fxW.row.bleed'),
        value: cfg.bleed
          ? t('fxW.v.bleed', {
              n: fixed(fx.bleed.pixels, 0),
              lost: fixed(fx.bleed.lost, 0),
            })
          : t('fxW.v.bleedOff'),
      },
      {
        label: t('fxW.row.cosmic'),
        value: cfg.cosmic
          ? t('fxW.v.cosmic', {
              n: fixed(fx.cosmicTracks.length, 0),
              p: fixed(
                fx.flags.reduce((s, b) => s + (b & FLAG.cosmic ? 1 : 0), 0),
                0
              ),
            })
          : t('fxW.v.cosmicOff'),
      },
      { label: t('fxW.row.assumes'), value: t('fxW.a') }
    );
    return rows;
  },
};

export const EFFECTS_WIDGETS = [DETECTOR_EFFECTS];
