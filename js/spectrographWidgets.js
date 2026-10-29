// =============================================================================
// The spectrograph instruments (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// Three panels over one kernel (js/kernels/spectrograph/):
//
//   spectrograph-lines   two lines through an instrument: the resolving power, the
//                        pixels and the noise you set, and what they do to a pair
//   spectrograph-arc     an arc lamp and a star: mark lines, fit the wavelength
//                        solution, read its residuals and uncertainty, measure a velocity
//   spectrograph-trade   resolving power against slit, light and signal to noise
//
// Nothing is calculated here: every number is the kernel's or the field module's
// (js/spectrographField.js), and tests/spectrographLessons.test.js recomputes each one a
// lesson states. Every spectrum is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SPECTROGRAPH } from './i18n/en.spectrograph.js';
import { ES_SPECTROGRAPH } from './i18n/es.spectrograph.js';
import { fixed, decimal } from './format.js';
import {
  surface,
  palette,
  TYPE,
  typeAt,
  responsiveHeight,
} from './widgetCanvas.js';
import {
  PAIR_R,
  PAIR_SAMPLING,
  PAIR_SNR,
  SCIENCE_LINES,
  TRADE_APERTURES,
  arcView,
  pairView,
  tradeView,
} from './spectrographField.js';

registerMessages('en', EN_SPECTROGRAPH);
registerMessages('es', ES_SPECTROGRAPH);

const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
export const TRADE_R = Object.freeze([
  300, 500, 1000, 1500, 2000, 3000, 5000, 10000, 20000,
]);
export const TRADE_RS = Object.freeze([1000, 2000, 3000, 4000, 6000]);
export const TRADE_WIDTH_NM = Object.freeze([0, 0.05, 0.1, 0.2]);
export const TRADE_EXPOSURE_S = Object.freeze([60, 300, 600, 1800, 3600]);

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
const choice = (id, label, list, value, text) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: list.length - 1,
  step: 1,
  value,
  decimals: 0,
  format: x =>
    text(list[clampIndex(x, list.length)], clampIndex(x, list.length)),
});

// ---------------------------------------------------------------------------- small drawing kit
/** A plot box on a canvas context: maps data to pixels, draws axes and end ticks. */
function frame(g, colors, box, xr, yr, { logX = false, xLabel, yLabel } = {}) {
  const [x0, y0, w, h] = box;
  const X = x => {
    const u = logX
      ? (Math.log(x) - Math.log(xr[0])) / (Math.log(xr[1]) - Math.log(xr[0]))
      : (x - xr[0]) / (xr[1] - xr[0]);
    return x0 + u * w;
  };
  const Y = y => y0 + h - ((y - yr[0]) / (yr[1] - yr[0])) * h;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(x0, y0, w, h);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillText(decimal(xr[0], 3), x0, y0 + h + 3);
  g.textAlign = 'right';
  g.fillText(decimal(xr[1], 3), x0 + w, y0 + h + 3);
  g.textAlign = 'center';
  if (xLabel) g.fillText(xLabel, x0 + w / 2, y0 + h + 3);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(decimal(yr[1], 3), x0 + 4, y0 + 12);
  if (yLabel) g.fillText(yLabel, x0 + 4, y0 + h - 4);
  return { X, Y };
}

const legend = (g, colors, x, y, items) => {
  g.font = typeAt(TYPE.TICK);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  items.forEach(([color, text, kind], i) => {
    const yy = y + i * 14;
    g.fillStyle = color;
    g.strokeStyle = color;
    if (kind === 'dot') {
      g.beginPath();
      g.arc(x + 4, yy, 2.5, 0, 2 * Math.PI);
      g.fill();
    } else {
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x + 9, yy);
      g.stroke();
    }
    g.fillStyle = colors.muted;
    g.fillText(text, x + 14, yy);
  });
};

// ---------------------------------------------------------------------------- two lines
export function pairConfig(v = {}) {
  return {
    R: PAIR_R[clampIndex(v.R ?? 3, PAIR_R.length)],
    separationNm: v.sep ?? 0.5,
    sampling: PAIR_SAMPLING[clampIndex(v.sampling ?? 3, PAIR_SAMPLING.length)],
    snr: PAIR_SNR[clampIndex(v.snr ?? 0, PAIR_SNR.length)],
    seed: 0,
  };
}
let lastPair = null;
export function pairOf(v) {
  const cfg = pairConfig(v);
  const key = JSON.stringify(cfg);
  if (lastPair?.key === key) return lastPair.view;
  const view = pairView(cfg);
  lastPair = { key, view };
  return view;
}

function drawPair(canvas, v) {
  const m = pairOf(v);
  const colors = palette();
  const { ctx: g, w } = surface(canvas, responsiveHeight(250, 200));
  const h = responsiveHeight(250, 200);
  const box = [44, 10, w - 56, h - 38];
  const half = Math.max(2.5 * m.fwhmNm, m.sepNm * 0.9 + 2 * m.fwhmNm);
  const lo = 500 - half;
  const hi = 500 + half;
  const top = m.peak * 2.2 + 40;
  const { X, Y } = frame(g, colors, box, [-half, half], [0, top], {
    xLabel: t('specW.axis.x'),
    yLabel: t('specW.axis.y'),
  });
  g.strokeStyle = colors.accent;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 240; i++) {
    const lam = lo + ((hi - lo) * i) / 240;
    const x = X(lam - 500);
    const y = Y(m.curve(lam));
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.fillStyle = colors.warn;
  m.xs.forEach((x, i) => {
    const lam = m.spec.centreNm(i);
    if (lam < lo || lam > hi) return;
    g.beginPath();
    g.arc(X(lam - 500), Y(m.expo.counts[i]), 2.6, 0, 2 * Math.PI);
    g.fill();
  });
  g.setLineDash([3, 3]);
  g.strokeStyle = colors.good;
  g.lineWidth = 1;
  for (const l of m.lines) {
    const x = X(l.centreNm - 500);
    g.beginPath();
    g.moveTo(x, box[1]);
    g.lineTo(x, box[1] + box[3]);
    g.stroke();
  }
  g.setLineDash([]);
  legend(g, colors, box[0] + box[2] - 190, box[1] + 12, [
    [colors.accent, t('specW.legend.model'), 'line'],
    [colors.warn, t('specW.legend.pixels'), 'dot'],
    [colors.good, t('specW.legend.truth'), 'line'],
  ]);
}

const PAIR = {
  id: 'spectrograph-lines',
  get title() {
    return t('specW.pair.title');
  },
  get note() {
    return t('specW.pair.note');
  },
  animated: false,
  controls: [
    choice('R', 'specW.control.R', PAIR_R, 3, r => `${r}`),
    numeric('sep', 'specW.control.sep', 0.1, 2, 0.05, 0.5, ' nm', 2),
    choice('sampling', 'specW.control.sampling', PAIR_SAMPLING, 3, s => `${s}`),
    choice('snr', 'specW.control.snr', PAIR_SNR, 0, (s, i) =>
      i === 0 ? t('specW.snr.0') : `${s}`
    ),
  ],
  draw: drawPair,
  readout(v) {
    const m = pairOf(v);
    const rows = [
      { label: t('specW.row.model'), value: t('specW.m') },
      {
        label: t('specW.row.fwhm'),
        value: t('specW.v.fwhm', { w: fixed(m.fwhmNm, 3) }),
        emphasis: true,
      },
      {
        label: t('specW.row.sampling'),
        value: t('specW.v.sampling', {
          s: fixed(m.sampling, 1),
          v: t(`specW.verdict.${m.samplingVerdict}`),
        }),
        emphasis: true,
      },
      {
        label: t('specW.row.sep'),
        value: t('specW.v.sep', {
          n: fixed(m.sepNm, 2),
          f: fixed(m.sepFwhm, 2),
          p: fixed(m.sepPx, 1),
        }),
      },
      {
        label: t('specW.row.dip'),
        value:
          m.dipModel > 0
            ? t('specW.v.dip', { d: fixed(100 * m.dipModel, 1) })
            : t('specW.v.noDip'),
        emphasis: true,
      },
      {
        label: t('specW.row.pixels'),
        value: t(m.pixelsShowTwo ? 'specW.v.pixelsTwo' : 'specW.v.pixelsOne'),
      },
    ];
    const f = m.fit;
    rows.push({
      label: t('specW.row.fit'),
      value:
        f.status !== 'ok'
          ? t('specW.v.fitNone', { r: f.reason ?? f.status })
          : t(f.broadened ? 'specW.v.fitBroad' : 'specW.v.fitOk', {
              w: fixed(f.fwhmPx * m.dispersionNm, 3),
              i: fixed(m.fwhmNm, 3),
              x: fixed(100 * f.widthExcess, 0),
            }),
    });
    rows.push({ label: t('specW.row.assumes'), value: t('specW.a') });
    return rows;
  },
};

// ---------------------------------------------------------------------------- the arc
export function arcConfig(v = {}) {
  return {
    marked: Math.round(v.marked ?? 8),
    degree: Math.round(v.degree ?? 3),
    seed: Math.round(v.seed ?? 0),
    line: Math.round(v.line ?? 0),
    restMedium: Math.round(v.medium ?? 0) === 1 ? 'vacuum' : 'air',
  };
}
let lastArc = null;
export function arcOf(v) {
  const cfg = arcConfig(v);
  const key = JSON.stringify(cfg);
  if (lastArc?.key === key) return lastArc.view;
  const view = arcView(cfg);
  lastArc = { key, view };
  return view;
}

function drawArc(canvas, v) {
  const m = arcOf(v);
  const colors = palette();
  const total = responsiveHeight(300, 230);
  const { ctx: g, w } = surface(canvas, total);
  const topH = Math.round(total * 0.5);
  const box1 = [44, 8, w - 56, topH - 20];
  const peak = Math.max(...m.counts) * 1.05;
  const { X, Y } = frame(g, colors, box1, [0, m.spec.nPixels], [0, peak], {
    xLabel: t('specW.axis.pixel'),
    yLabel: t('specW.axis.counts'),
  });
  g.strokeStyle = colors.accent;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < m.spec.nPixels; i++) {
    const x = X(i);
    const y = Y(m.counts[i]);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.strokeStyle = colors.warn;
  g.setLineDash([3, 2]);
  for (const f of m.fits) {
    if (f.fit.status !== 'ok') continue;
    const x = X(f.fit.centrePx);
    g.beginPath();
    g.moveTo(x, box1[1]);
    g.lineTo(x, box1[1] + box1[3]);
    g.stroke();
  }
  g.setLineDash([]);
  legend(g, colors, box1[0] + 10, box1[1] + 12, [
    [colors.accent, t('specW.legend.arc'), 'line'],
    [colors.warn, t('specW.legend.mark'), 'line'],
  ]);
  // residuals
  const sol = m.solution;
  const y0 = topH + 14;
  const box2 = [44, y0, w - 56, total - y0 - 20];
  if (!sol.coefficients) return;
  const res = sol.residualsNm;
  const sg = sol.sigmaLamNm;
  const lim = Math.max(
    0.003,
    ...res.map((r, i) => Math.abs(r) + sg[i]),
    ...[0, m.spec.nPixels - 1].map(x => sol.sigmaAt(x))
  );
  const { X: X2, Y: Y2 } = frame(
    g,
    colors,
    box2,
    [0, m.spec.nPixels],
    [-lim, lim],
    {
      xLabel: t('specW.axis.pixel'),
      yLabel: t('specW.axis.resid'),
    }
  );
  g.fillStyle = colors.grid;
  g.globalAlpha = 0.5;
  g.beginPath();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const x = (m.spec.nPixels - 1) * (i / N);
    if (i) g.lineTo(X2(x), Y2(sol.sigmaAt(x)));
    else g.moveTo(X2(x), Y2(sol.sigmaAt(x)));
  }
  for (let i = N; i >= 0; i--) {
    const x = (m.spec.nPixels - 1) * (i / N);
    g.lineTo(X2(x), Y2(-sol.sigmaAt(x)));
  }
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = colors.good;
  g.fillStyle = colors.good;
  const used = m.fits.filter(f => f.fit.status === 'ok');
  used.forEach((f, i) => {
    const x = X2(f.fit.centrePx);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, Y2(res[i] - sg[i]));
    g.lineTo(x, Y2(res[i] + sg[i]));
    g.stroke();
    g.beginPath();
    g.arc(x, Y2(res[i]), 3, 0, 2 * Math.PI);
    g.fill();
  });
  legend(g, colors, box2[0] + 10, box2[1] + 12, [
    [colors.good, t('specW.legend.resid'), 'dot'],
    [colors.muted, t('specW.legend.band'), 'line'],
  ]);
}

const ARC = {
  id: 'spectrograph-arc',
  get title() {
    return t('specW.arc.title');
  },
  get note() {
    return t('specW.arc.note');
  },
  animated: false,
  controls: [
    numeric('marked', 'specW.control.marked', 1, 14, 1, 8, ''),
    numeric('degree', 'specW.control.degree', 1, 5, 1, 3, ''),
    numeric('seed', 'specW.control.seed', 0, 4, 1, 0, ''),
    choice(
      'line',
      'specW.control.line',
      SCIENCE_LINES,
      0,
      (id, i) => ['Hβ', 'Hγ', 'Hδ', 'Hε'][i]
    ),
    choice('medium', 'specW.control.medium', [0, 1], 0, (_, i) =>
      t(`specW.medium.${i}`)
    ),
  ],
  draw: drawArc,
  readout(v) {
    const m = arcOf(v);
    const s = m.solution;
    const rows = [{ label: t('specW.row.arc'), value: t('specW.v.arc') }];
    const state =
      s.status === 'constrained'
        ? t('specW.state.constrained', { k: s.dof })
        : s.status === 'exactly-determined'
          ? t('specW.state.exactly-determined')
          : s.status === 'not-constrained'
            ? t('specW.state.not-constrained', { m: s.message })
            : t('specW.state.refused', { m: s.message });
    rows.push({
      label: t('specW.row.solution'),
      value: t('specW.v.solution', { d: m.degree, n: m.marked, s: state }),
      emphasis: true,
    });
    if (s.coefficients) {
      rows.push({
        label: t('specW.row.residual'),
        value:
          s.status === 'exactly-determined'
            ? t('specW.v.noResidual')
            : t(s.flagged ? 'specW.v.residualFlag' : 'specW.v.residual', {
                r: fixed(s.rmsNm, 4),
                c: fixed(s.reducedChi2, 2),
              }),
      });
      const mid = (m.spec.nPixels - 1) / 2;
      rows.push({
        label: t('specW.row.sigma'),
        value: t('specW.v.sigma', {
          s: fixed(s.sigmaAt(mid), 4),
          p: fixed(s.sigmaAt(mid) / Math.abs(s.dispersionAt(mid)), 3),
        }),
      });
    }
    const me = m.science.measured;
    if (!me)
      rows.push({ label: t('specW.row.star'), value: t('specW.v.starNone') });
    else {
      rows.push({
        label: t('specW.row.star'),
        value: t('specW.v.star', {
          n: me.line.name,
          w: fixed(me.wavelength.nm, 3),
          s: fixed(me.wavelength.sigmaNm, 3),
        }),
      });
      const vel = me.velocity;
      rows.push({
        label: t('specW.row.velocity'),
        value:
          vel.status === 'ok'
            ? t('specW.v.velocity', {
                v: fixed(vel.velocityKmS, 1),
                s: fixed(vel.sigmaKmS, 1),
                r: fixed(me.line[m.science.restMedium], 4),
                m: t(`specW.medium.${m.science.restMedium === 'air' ? 0 : 1}`),
              })
            : t('specW.v.velocityRefused', {
                o: fixed(Math.abs(me.mediaOffsetKmS), 1),
              }),
        emphasis: true,
      });
      if (vel.status !== 'ok')
        rows.push({
          label: t('specW.row.ignored'),
          value: t('specW.v.ignored', {
            v: fixed(me.ignoringMediaKmS, 1),
            m: t('specW.medium.1'),
          }),
        });
    }
    rows.push({ label: t('specW.row.assumes'), value: t('specW.arcA') });
    return rows;
  },
};

// ---------------------------------------------------------------------------- the trade
export function tradeConfig(v = {}) {
  return {
    R: TRADE_R[clampIndex(v.R ?? 5, TRADE_R.length)],
    Rs: TRADE_RS[clampIndex(v.Rs ?? 2, TRADE_RS.length)],
    seeing: v.seeing ?? 1,
    sigmaIntNm: TRADE_WIDTH_NM[clampIndex(v.width ?? 0, TRADE_WIDTH_NM.length)],
    ewNm: 0.02,
    vmag: v.vmag ?? 12,
    facility: clampIndex(v.facility ?? 1, TRADE_APERTURES.length),
    exposureS:
      TRADE_EXPOSURE_S[clampIndex(v.exposure ?? 2, TRADE_EXPOSURE_S.length)],
  };
}
let lastTrade = null;
export function tradeOf(v) {
  const cfg = tradeConfig(v);
  const key = JSON.stringify(cfg);
  if (lastTrade?.key === key) return lastTrade.view;
  const view = tradeView(cfg);
  lastTrade = { key, view };
  return view;
}

function drawTrade(canvas, v) {
  const m = tradeOf(v);
  const colors = palette();
  const total = responsiveHeight(250, 200);
  const { ctx: g, w } = surface(canvas, total);
  const box = [44, 10, w - 56, total - 38];
  const xs = m.curve.map(p => p.R);
  const top = Math.max(...m.curve.map(p => p.snr)) * 1.1;
  const { X, Y } = frame(g, colors, box, [xs[0], xs.at(-1)], [0, top], {
    logX: true,
    xLabel: t('specW.axis.R'),
    yLabel: t('specW.axis.snr'),
  });
  g.strokeStyle = colors.accent;
  g.lineWidth = 2;
  g.beginPath();
  m.curve.forEach((p, i) => {
    const x = X(p.R);
    const y = Y(p.snr);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  });
  g.stroke();
  const mark = (p, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(X(p.R), Y(p.snr), 4.5, 0, 2 * Math.PI);
    g.fill();
  };
  if (!m.optimum.atBound) mark(m.optimum.point, colors.good);
  mark(m.point, colors.warn);
  legend(g, colors, box[0] + 12, box[1] + 12, [
    [colors.warn, t('specW.legend.now'), 'dot'],
    [colors.good, t('specW.legend.best'), 'dot'],
  ]);
}

const TRADE = {
  id: 'spectrograph-trade',
  get title() {
    return t('specW.trade.title');
  },
  get note() {
    return t('specW.trade.note');
  },
  animated: false,
  controls: [
    choice('R', 'specW.control.R2', TRADE_R, 5, r => `${r}`),
    choice('Rs', 'specW.control.Rs', TRADE_RS, 2, r => `${r}`),
    numeric('seeing', 'specW.control.seeing', 0.5, 2.5, 0.1, 1, ' arcsec', 1),
    choice('width', 'specW.control.width', TRADE_WIDTH_NM, 0, x => `${x} nm`),
    numeric('vmag', 'specW.control.vmag', 8, 16, 1, 12, ''),
    choice('facility', 'specW.control.facility', [0, 1, 2], 1, (_, i) =>
      t(`specW.facility.${i}`)
    ),
    choice(
      'exposure',
      'specW.control.exposure',
      TRADE_EXPOSURE_S,
      2,
      s => `${s} s`
    ),
  ],
  draw: drawTrade,
  readout(v) {
    const m = tradeOf(v);
    const p = m.point;
    return [
      {
        label: t('specW.row.slit'),
        value: t('specW.v.slit', {
          w: fixed(m.slitArcsec, 2),
          r: fixed(m.slitArcsec / m.seeing, 2),
          t: fixed(100 * p.throughput, 0),
        }),
        emphasis: true,
      },
      {
        label: t('specW.row.line'),
        value: t('specW.v.line', {
          f: fixed(p.fwhmNm, 3),
          o: fixed(p.sigmaObsNm * 2.3548200450309493, 3),
          k: t(p.resolved ? 'specW.line.resolved' : 'specW.line.unresolved'),
        }),
      },
      {
        label: t('specW.row.snr'),
        value: t('specW.v.snr', {
          s: fixed(p.snr, 1),
          e: fixed(p.minimumEwNm3, 4),
        }),
        emphasis: true,
      },
      {
        label: t('specW.row.best'),
        value: m.optimum.atBound
          ? t('specW.v.bestBound', { r: fixed(m.Rs, 0) })
          : t('specW.v.best', {
              r: fixed(m.optimum.R, 0),
              s: fixed(m.optimum.point.snr, 1),
            }),
      },
      {
        label: t('specW.row.light'),
        value: t('specW.v.light', {
          a: fixed(m.areaM2, 2),
          f: t(`specW.facility.${TRADE_APERTURES.indexOf(m.facility)}`),
          p: decimal(m.continuumPerNmFull, 3),
          t: m.exposureS,
        }),
      },
      { label: t('specW.row.assumes'), value: t('specW.tradeA') },
    ];
  },
};

export const SPECTROGRAPH_WIDGETS = [PAIR, ARC, TRADE];
