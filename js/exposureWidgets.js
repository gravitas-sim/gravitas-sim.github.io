// =============================================================================
// The exposure planner (Prompt 210, EXPOSURE_PLANNING.md)
// -----------------------------------------------------------------------------
// One panel in the detector family's spirit: a facility from the instrument
// library (js/instruments/exposure.js reads its cited table), a target and a
// signal-to-noise go in; the exposure the CCD equation asks, its noise budget
// and the faintest object it reaches come out (js/kernels/detector/snr.js,
// planExposure). A synthetic frame of that very plan is rendered through the
// detector kernel and measured with the Observatory's aperture photometry
// (js/exposureField.js), so the prediction sits beside a measurement.
//
// Nothing is calculated here: every number is the kernel's or the field
// module's, and tests/exposureLessons.test.js recomputes each one a lesson
// states. What the library does not state (a throughput, a dark current, an
// extinction coefficient) is supplied by this table and labelled as supplied.
// Every frame is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_EXPOSURE } from './i18n/en.exposure.js';
import { ES_EXPOSURE } from './i18n/es.exposure.js';
import { fixed } from './format.js';
import {
  surface,
  palette,
  TYPE,
  typeAt,
  responsiveHeight,
} from './widgetCanvas.js';
import { planExposure } from './kernels/detector/snr.js';
import { exposureSetupOf } from './instruments/exposure.js';
import {
  renderPlan,
  predictRendered,
  measureRendered,
} from './exposureField.js';

registerMessages('en', EN_EXPOSURE);
registerMessages('es', ES_EXPOSURE);

/** The most total exposure a plan may ask, seconds: four hours. */
export const MAX_TOTAL_S = 14400;

/**
 * The choices of the facility control. `zeroPoint` is electrons per second at
 * magnitude 0 at the zenith for a SUPPLIED peak throughput of 0.5 through the
 * band (the library states none; tests/exposureLessons.test.js recomputes each
 * from the radiation kernel's passband and the collecting area); `dark` and `k`
 * are supplied too where the library has none. All are teaching values.
 */
export const SETUPS = Object.freeze([
  {
    id: 'lco-0m35',
    band: 'V',
    zeroPoint: 294339668.3281891,
    system: 'vega',
    dark: 0.01,
    k: 0.2,
  },
  {
    id: 'lco-1m0',
    band: 'V',
    zeroPoint: 3500543127.4462337,
    system: 'vega',
    dark: 0.002,
    k: 0.2,
  },
  {
    id: 'rubin',
    band: 'g',
    zeroPoint: 224744156408.62534,
    system: 'ab',
    dark: 0.01,
  },
  {
    id: 'rubin',
    band: 'r',
    zeroPoint: 163847616767.59027,
    system: 'ab',
    dark: 0.01,
  },
  {
    id: 'rubin',
    band: 'i',
    zeroPoint: 126958586936.29507,
    system: 'ab',
    dark: 0.01,
  },
]);
export const THROUGHPUT = 0.5;
const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

/** The inputs a set of control values means. */
export function configOf(v = {}) {
  return {
    setup: idx(v.setup ?? 3, SETUPS.length),
    extended: (v.kind ?? 0) >= 0.5,
    mag: v.mag ?? 22,
    aperture: v.aperture ?? 1.5,
    patch: v.patch ?? 3,
    nExp: Math.max(1, Math.round(v.exposures ?? 2)),
    target: v.target ?? 20,
    airmass: v.airmass ?? 1,
    moon: v.moon ?? 0,
  };
}

let last = null;
/** The plan, the frame and its measurement for control values (the last is kept: draw and readout both ask). */
export function exposureView(v) {
  const cfg = configOf(v);
  const key = JSON.stringify(cfg);
  if (last?.key === key) return last.view;
  const sx = SETUPS[cfg.setup];
  const { setup, from } = exposureSetupOf(sx.id, {
    band: sx.band,
    zeroPoint: sx.zeroPoint,
    darkRate: sx.dark,
    ...(sx.k !== undefined ? { extinction: sx.k } : {}),
    airmass: cfg.airmass,
  });
  setup.skyMag -= cfg.moon;
  const fwhmPix = setup.fwhm / setup.pixelScale;
  const patchPix = cfg.patch * fwhmPix;
  const source = cfg.extended
    ? {
        kind: 'extended',
        mu: cfg.mag,
        areaArcsec2: Math.PI * (patchPix * setup.pixelScale) ** 2,
      }
    : { kind: 'point', mag: cfg.mag };
  const plan = planExposure({
    ...setup,
    source,
    aperture: { mode: 'aperture', radiusArcsec: cfg.aperture * setup.fwhm },
    nBackground: Math.PI * (25 - 9) * fwhmPix * fwhmPix,
    nExp: cfg.nExp,
    targetSnr: cfg.target,
    maxTotal: MAX_TOTAL_S,
  });
  let frame = null;
  if (plan.ok || plan.reason === 'exposure-limit') {
    const seconds = plan.seconds ?? MAX_TOTAL_S;
    const rendered = renderPlan({
      setup,
      plan: { rates: plan.rates, seconds, exposures: cfg.nExp },
      source,
      seed: 'exposure-210:panel',
    });
    const r = cfg.extended ? patchPix : cfg.aperture * fwhmPix;
    frame = {
      rendered,
      seconds,
      predicted: predictRendered(rendered, { r }),
      measured: measureRendered(rendered, { r }),
    };
  }
  const view = { cfg, setup, from, plan, frame, source };
  last = { key, view };
  return view;
}

const numeric = (id, label, min, max, step, value, format) => ({
  id,
  get label() {
    return t(label);
  },
  min,
  max,
  step,
  value,
  decimals: step < 1 ? 1 : 0,
  format,
});

/** The frame as a stretched grey picture on its own small canvas. */
function pictureOf(rendered) {
  const { width: W, height: H, values } = rendered.image;
  const sorted = Float64Array.from(values).sort();
  const base = sorted[Math.floor(sorted.length / 2)];
  const spread = Math.max(
    1,
    sorted[Math.floor(0.84 * sorted.length)] -
      sorted[Math.floor(0.16 * sorted.length)]
  );
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const top = Math.asinh(40);
  for (let i = 0; i < W * H; i += 1) {
    const u = (values[i] - base) / spread;
    const s = Math.max(
      0,
      Math.min(255, Math.round((255 * Math.asinh(Math.max(0, u + 1))) / top))
    );
    const k = 4 * i;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = s;
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function draw(canvas, v) {
  const view = exposureView(v);
  const colors = palette();
  const side = Math.min(responsiveHeight(220, 170), canvas.clientWidth || 220);
  const bar = 96;
  const { ctx: g, w } = surface(canvas, side + bar + 10);
  const ox = Math.max(0, (w - side) / 2);
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'top';
  g.textAlign = 'left';
  if (view.frame) {
    const f = view.frame.rendered;
    g.imageSmoothingEnabled = false;
    g.drawImage(pictureOf(f), ox, 0, side, side);
    const k = side / f.image.width;
    const rpx = view.frame.predicted.aperture.r;
    g.strokeStyle = colors.accent;
    g.lineWidth = 1.5;
    g.save();
    g.translate(ox, 0);
    g.beginPath();
    g.arc(
      (f.center.x + 0.5) * k,
      (f.center.y + 0.5) * k,
      rpx * k,
      0,
      2 * Math.PI
    );
    g.stroke();
    g.restore();
    g.fillStyle = colors.warn;
    g.fillText(t('expW.legend.frame'), ox + 6, 6);
  } else {
    g.fillStyle = colors.muted;
    g.fillText(t('expW.legend.none'), ox + 6, 6);
  }
  // The noise budget as one stacked bar, a share of the noise squared.
  const y0 = side + 14;
  const x0 = ox;
  const palette4 = [colors.good, colors.accent, colors.muted, colors.warn];
  g.fillStyle = colors.muted;
  g.fillText(t('expW.axis.budget'), x0, y0 - 12);
  let x = x0;
  const budget = view.plan.budget ?? [];
  budget.forEach((b, i) => {
    const wi = b.share * side;
    g.fillStyle = palette4[i];
    g.fillRect(x, y0, wi, 16);
    x += wi;
  });
  g.strokeStyle = colors.grid;
  g.strokeRect(x0 + 0.5, y0 + 0.5, side - 1, 15);
  budget.forEach((b, i) => {
    const y = y0 + 24 + i * 15;
    g.fillStyle = palette4[i];
    g.fillRect(x0, y + 1, 9, 9);
    g.fillStyle = colors.muted;
    g.fillText(
      `${t(`expW.term.${b.term}`)} ${fixed(100 * b.share, 0)}%`,
      x0 + 14,
      y
    );
  });
}

const EXPOSURE_PLANNER = {
  id: 'exposure-planner',
  get title() {
    return t('expW.title');
  },
  get note() {
    return t('expW.note');
  },
  animated: false,
  controls: [
    {
      id: 'setup',
      get label() {
        return t('expW.control.setup');
      },
      min: 0,
      max: SETUPS.length - 1,
      step: 1,
      value: 3,
      decimals: 0,
      format: x => t(`expW.setup.${idx(x, SETUPS.length)}`),
    },
    {
      id: 'kind',
      get label() {
        return t('expW.control.kind');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`expW.kind.${Math.round(x)}`),
    },
    numeric('mag', 'expW.control.mag', 12, 30, 0.5, 22, x => fixed(x, 1)),
    numeric('aperture', 'expW.control.aperture', 0.5, 2.5, 0.25, 1.5, x =>
      t('expW.v.aperture', { r: fixed(x, 2) })
    ),
    numeric('patch', 'expW.control.patch', 1, 8, 1, 3, x =>
      t('expW.v.patch', { r: fixed(x, 0) })
    ),
    numeric('exposures', 'expW.control.exposures', 1, 20, 1, 2, x =>
      fixed(x, 0)
    ),
    numeric('target', 'expW.control.target', 5, 200, 5, 20, x => fixed(x, 0)),
    numeric('airmass', 'expW.control.airmass', 1, 3, 0.1, 1, x => fixed(x, 1)),
    numeric(
      'moon',
      'expW.control.moon',
      0,
      3,
      0.5,
      0,
      x => `${fixed(x, 1)} mag`
    ),
  ],
  draw,
  readout(v) {
    const m = exposureView(v);
    const p = m.plan;
    const rows = [{ label: t('expW.row.model'), value: t('expW.m') }];
    const status = p.ok
      ? t('expW.s.ok')
      : t(
          `expW.s.${p.status === 'not-reachable' ? 'not-reachable' : p.reason}`,
          {
            t: fixed(MAX_TOTAL_S, 0),
            n: fixed(p.needed ?? 0, 0),
            r: fixed(p.reachedSnr ?? 0, 1),
            p: fixed(p.peakElectrons ?? 0, 0),
            w: fixed(m.setup.fullWell ?? 0, 0),
            m: fixed(p.maxPerExposure ?? 0, 1),
            s: p.suggestion
              ? t('expW.s.suggest', {
                  n: p.suggestion.exposures,
                  e: fixed(p.suggestion.perExposure, 1),
                  t: fixed(p.suggestion.seconds, 0),
                })
              : t('expW.s.nosuggest'),
          }
        );
    rows.push({ label: t('expW.row.status'), value: status, emphasis: true });
    if (p.ok) {
      rows.push(
        {
          label: t('expW.row.exposure'),
          value: t('expW.v.exposure', {
            t: fixed(p.seconds, 1),
            n: p.exposures,
            e: fixed(p.perExposure, 1),
          }),
          emphasis: true,
        },
        { label: t('expW.row.snr'), value: fixed(p.snr, 1) },
        {
          label: t('expW.row.dominant'),
          value: t(`expW.term.${p.dominant}`),
          emphasis: true,
        }
      );
      for (const b of p.budget)
        rows.push({
          label: t(`expW.row.budget.${b.term}`),
          value: t('expW.v.budget', {
            v: fixed(b.variance, 0),
            p: fixed(100 * b.share, 1),
          }),
        });
    }
    if (p.limitingMagnitude !== undefined)
      rows.push({
        label: t('expW.row.limit'),
        value: t('expW.v.limit', { m: fixed(p.limitingMagnitude, 2) }),
        emphasis: true,
      });
    if (p.peakElectrons !== undefined && m.setup.fullWell)
      rows.push({
        label: t('expW.row.peak'),
        value: t('expW.v.peakWell', {
          p: fixed(p.peakElectrons, 0),
          w: fixed(m.setup.fullWell, 0),
        }),
      });
    rows.push({
      label: t('expW.row.pixels'),
      value: t('expW.v.pixels', {
        n: fixed(p.geometry.npix, 0),
        e: fixed(100 * p.geometry.enclosed, 1),
      }),
    });
    if (m.frame) {
      const pr = m.frame.predicted;
      const me = m.frame.measured;
      rows.push(
        {
          label: t('expW.row.frame'),
          value: t('expW.v.frame', {
            s: fixed(pr.snr, 1),
            e: fixed(pr.signal, 0),
            n: fixed(pr.sigma, 0),
          }),
        },
        {
          label: t('expW.row.measured'),
          value: t('expW.v.measured', {
            s: fixed(me.snr, 1),
            e: fixed(me.net, 0),
            n: fixed(me.sigma, 0),
          }),
          emphasis: true,
        }
      );
    }
    const f = m.from;
    rows.push(
      {
        label: t('expW.row.from'),
        value: t('expW.v.from', {
          pix: fixed(m.setup.pixelScale, 3),
          rn: fixed(m.setup.readNoise, 2),
          sky: fixed(m.setup.skyMag, 1),
          see: fixed(m.setup.fwhm, 2),
          x: f.fwhm?.model ? t('expW.v.fromX') : '',
        }),
      },
      {
        label: t('expW.row.supplied'),
        value: t('expW.v.supplied', {
          tp: fixed(THROUGHPUT, 2),
          d: fixed(m.setup.darkRate, 3),
          k: f.extinction?.supplied
            ? t('expW.v.suppliedK', { k: fixed(m.setup.extinction, 2) })
            : '',
        }),
      }
    );
    const warns = (p.warnings ?? []).filter(
      w => w.code !== 'perfect-sky-estimate'
    );
    rows.push({
      label: t('expW.row.warn'),
      value: warns.length
        ? warns.map(w => t(`expW.w.${w.code}`)).join('; ')
        : t('expW.v.nowarn'),
    });
    rows.push({ label: t('expW.row.assumes'), value: t('expW.a') });
    return rows;
  },
};

export const EXPOSURE_WIDGETS = [EXPOSURE_PLANNER];
