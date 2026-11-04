// =============================================================================
// The Gaia astrometry panels (Prompt 233 Part B, GAIA_WORKFLOWS.md)
// -----------------------------------------------------------------------------
// One lazy family, two panels, both drawn through the plot component.
//
//  - `gaia-distance`: ONE parallax as a distance. The numbers are the student's
//    (not a star's): the likelihood of every distance is drawn, a prior only when
//    switched on (and its assumptions are written beside it), a zero point only as
//    the offset set, and a proper motion scales the interval to a speed.
//  - `gaia-sample`: NGC 2420's 993 stars from the Gaia pack (version 1.1.0). The
//    selection cuts are controls (a magnitude limit, a parallax-over-error
//    minimum, RUWE), the colour-magnitude diagram and a velocity plot show what is
//    left, and the cluster's distance is leg E1's contract (members from proper
//    motion alone, a zero point per star, a 3-sigma clip, no systematic floor).
//
// Nothing is calculated here: every number is js/gaiaField.js's, over
// js/kernels/galactic/gaia.js. The sample's rows are the pack's sidecar, fetched
// when the family loads; until then the panel draws its empty axes and says
// "loading". The neighbourhood pack is not read (its parallax is rounded: E3).
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_GAIA } from './i18n/en.gaia.js';
import { ES_GAIA } from './i18n/es.gaia.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  CLIP_SIGMA,
  K_PM,
  MEMBER_THRESHOLD,
  PACK_LIMITS,
  POE_THRESHOLD,
  SAMPLE_START,
  DISTANCE_START,
  cmdOf,
  distanceView,
  loadCluster,
  sampleView,
} from './gaiaField.js';

registerMessages('en', EN_GAIA);
registerMessages('es', ES_GAIA);

/** NGC 2420, once it has arrived. */
let data = null;

/**
 * Resolves true once the cluster has been tried. Never rejects: a failure is
 * logged and the sample panel keeps reading "loading", so a missing file never
 * blocks the other instruments or the audits that wait for every family.
 */
export const gaiaReady = loadCluster()
  .then(d => {
    data = d;
    return true;
  })
  .catch(err => {
    console.warn('The Gaia cluster data could not be loaded:', err);
    return true;
  });

/** The seam for a test or a Worker to supply the prepared cluster (js/gaiaField.js prepareCluster). */
export function provideGaiaData(d) {
  data = d;
}
export const gaiaData = () => data;

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#868e96',
  ink: '#495057',
};

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label, height) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      // The magnitude axis runs upward in the data (negated) so that brighter is up.
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 1 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const num = (v, d) => fixed(v, d);
const kpc = v => num(v, v >= 10 ? 1 : v >= 1 ? 2 : 3);
const isOn = x => (x ?? 0) >= 0.5;

const toggle = (id, label, value) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(isOn(x) ? 'gaiaW.on' : 'gaiaW.off'),
});

// ---- the distance panel ----------------------------------------------------------

function distanceSpec(v) {
  const view = distanceView(v);
  const axis = {
    xTitle: t('gaiaW.d.axis.x'),
    yTitle: t('gaiaW.d.axis.y'),
  };
  if (!view.curve) return { label: t('gaiaW.d.title'), ...axis, series: [] };
  const { r } = view.curve;
  const series = [
    {
      id: 'likelihood',
      label: t('gaiaW.d.legend.likelihood'),
      x: r,
      y: view.curve.likelihood,
      color: COLOR.blue,
      width: 2.5,
      mode: 'line',
    },
  ];
  if (view.curve.prior)
    series.push({
      id: 'prior',
      label: t('gaiaW.d.legend.prior'),
      x: r,
      y: view.curve.prior,
      color: COLOR.grey,
      width: 2,
      dash: [6, 4],
      mode: 'line',
    });
  if (view.curve.posterior)
    series.push({
      id: 'posterior',
      label: t('gaiaW.d.legend.posterior'),
      x: r,
      y: view.curve.posterior,
      color: COLOR.orange,
      width: 2.5,
      mode: 'line',
    });
  const iv = view.record.interval;
  if (iv)
    series.push({
      id: 'interval',
      label: t('gaiaW.d.legend.interval'),
      x: [iv.lo, iv.hi === null ? view.range : Math.min(iv.hi, view.range)],
      y: [-0.06, -0.06],
      color: COLOR.ink,
      width: 5,
      mode: 'line',
    });
  return {
    label: t('gaiaW.d.title'),
    ...axis,
    xRange: [0, view.range],
    yRange: [-0.12, 1.05],
    series,
  };
}

const DISTANCE = {
  id: 'gaia-distance',
  get title() {
    return t('gaiaW.d.title');
  },
  get note() {
    return t('gaiaW.d.note', { n: POE_THRESHOLD });
  },
  animated: false,
  controls: [
    {
      id: 'plx',
      get label() {
        return t('gaiaW.d.control.plx');
      },
      min: -0.3,
      max: 2,
      step: 0.01,
      value: DISTANCE_START.plx,
      decimals: 2,
      format: x => `${num(x, 2)} mas`,
    },
    {
      id: 'err',
      get label() {
        return t('gaiaW.d.control.err');
      },
      min: 0.01,
      max: 0.3,
      step: 0.01,
      value: DISTANCE_START.err,
      decimals: 2,
      format: x => `${num(x, 2)} mas`,
    },
    {
      id: 'zp',
      get label() {
        return t('gaiaW.d.control.zp');
      },
      min: -0.1,
      max: 0,
      step: 0.005,
      value: DISTANCE_START.zp,
      decimals: 3,
      format: x => (x === 0 ? t('gaiaW.none') : `${num(x, 3)} mas`),
    },
    {
      id: 'prior',
      get label() {
        return t('gaiaW.d.control.prior');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`gaiaW.d.prior.${isOn(x) ? 1 : 0}`),
    },
    {
      id: 'L',
      get label() {
        return t('gaiaW.d.control.L');
      },
      min: 0.2,
      max: 5,
      step: 0.1,
      value: DISTANCE_START.L,
      decimals: 1,
      format: x => `${num(x, 1)} kpc`,
    },
    {
      id: 'range',
      get label() {
        return t('gaiaW.d.control.range');
      },
      min: 2,
      max: 30,
      step: 1,
      value: DISTANCE_START.range,
      decimals: 0,
      format: x => `${num(x, 0)} kpc`,
    },
    {
      id: 'mu',
      get label() {
        return t('gaiaW.d.control.mu');
      },
      min: 0,
      max: 20,
      step: 0.5,
      value: 0,
      decimals: 1,
      format: x => (x === 0 ? t('gaiaW.none') : `${num(x, 1)} mas/yr`),
    },
  ],
  presets: [
    {
      values: { plx: 0.4, err: 0.02, zp: 0, prior: 0, L: 1, range: 10, mu: 0 },
      get label() {
        return t('gaiaW.d.preset.good');
      },
    },
    {
      values: { plx: 0.15, err: 0.1, zp: 0, prior: 0, L: 1, range: 20, mu: 0 },
      get label() {
        return t('gaiaW.d.preset.low');
      },
    },
    {
      values: { plx: -0.1, err: 0.05, zp: 0, prior: 0, L: 1, range: 20, mu: 0 },
      get label() {
        return t('gaiaW.d.preset.negative');
      },
    },
  ],
  draw(canvas, v) {
    const spec = distanceSpec(v);
    hostOf(canvas, t('gaiaW.d.title'), 260).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const view = distanceView(v);
    const rec = view.record;
    if (rec.status === 'refused')
      return [{ label: t('gaiaW.d.row.status'), value: rec.why }];
    const rows = [];
    const p = rec.parallax;
    rows.push({
      label: t('gaiaW.d.row.input'),
      value: t('gaiaW.d.v.input', {
        p: num(p.observed, 3),
        e: num(p.error, 3),
        z: p.zeroPoint.value
          ? `${num(p.zeroPoint.value, 3)} mas`
          : t('gaiaW.none'),
      }),
    });
    rows.push({
      label: t('gaiaW.d.row.corrected'),
      value: t('gaiaW.d.v.corrected', {
        w: num(p.corrected, 3),
        s: num(p.totalError, 3),
        k: num(rec.poe, 1),
        n: POE_THRESHOLD,
      }),
    });
    rows.push({
      label: t('gaiaW.d.row.status'),
      value: t(`gaiaW.d.status.${rec.status}`, { n: POE_THRESHOLD }),
      emphasis: true,
    });
    // The likelihood's own answer, whatever the prior: the maximum is 1 / w.
    const w = p.corrected;
    if (!(w > 0))
      rows.push({
        label: t('gaiaW.d.row.distance'),
        value: t('gaiaW.d.v.noDistance', { w: num(w, 3) }),
        emphasis: true,
      });
    else {
      const open = distanceView({ ...v, prior: 0 }).record;
      const iv = open.interval;
      rows.push({
        label: t('gaiaW.d.row.distance'),
        value:
          iv.hi === null
            ? t('gaiaW.d.v.distanceOpen', {
                d: kpc(open.distance),
                w: num(w, 3),
                lo: kpc(iv.lo),
              })
            : t('gaiaW.d.v.distance', {
                d: kpc(open.distance),
                w: num(w, 3),
                lo: kpc(iv.lo),
                hi: kpc(iv.hi),
              }),
        emphasis: true,
      });
    }
    if (rec.posterior)
      rows.push({
        label: t('gaiaW.d.row.posterior'),
        value: t('gaiaW.d.v.posterior', {
          m: kpc(rec.posterior.median),
          o: kpc(rec.posterior.mode),
          lo: kpc(rec.posterior.interval.lo),
          hi: kpc(rec.posterior.interval.hi),
          L: num(rec.posterior.prior.L, 1),
        }),
        emphasis: true,
      });
    rows.push({
      label: t('gaiaW.d.row.assumes'),
      value: t(`gaiaW.d.assume.${rec.prior === 'none' ? 'none' : 'edsd'}`),
    });
    if (view.velocity) {
      const vel = view.velocity;
      const mu = num(v.mu, 1);
      rows.push({
        label: t('gaiaW.d.row.velocity'),
        value:
          vel.value === null
            ? t('gaiaW.d.v.velocityNone')
            : vel.interval.hi === null
              ? t('gaiaW.d.v.velocityOpen', {
                  mu,
                  v: num(vel.value, 1),
                  lo: num(vel.interval.lo, 1),
                  k: num(K_PM, 2),
                })
              : t('gaiaW.d.v.velocity', {
                  mu,
                  v: num(vel.value, 1),
                  lo: num(vel.interval.lo, 1),
                  hi: num(vel.interval.hi, 1),
                  k: num(K_PM, 2),
                }),
      });
    }
    rows.push({
      label: t('gaiaW.d.row.correction'),
      value: t('gaiaW.d.v.correction'),
    });
    return rows;
  },
};

// ---- the sample panel ------------------------------------------------------------

function sampleSpec(v) {
  const velocityView = Math.round(v.view ?? 0) === 1;
  const axis = velocityView
    ? {
        xTitle: t('gaiaW.s.axis.vra'),
        yTitle: t('gaiaW.s.axis.vdec'),
      }
    : {
        xTitle: t('gaiaW.s.axis.colour'),
        yTitle: t('gaiaW.s.axis.g'),
      };
  const label = t('gaiaW.s.title');
  if (!data) return { label, ...axis, series: [] };
  const view = sampleView(data, v);
  const aria = t('gaiaW.s.aria', { k: view.kept, n: data.n });
  if (velocityView) {
    const vel = view.velocity;
    return {
      label: aria,
      ...axis,
      series: vel
        ? [
            {
              id: 'velocity',
              label: t('gaiaW.s.legend.velocity'),
              x: vel.vra,
              y: vel.vdec,
              color: COLOR.blue,
              mode: 'points',
              radius: 2.2,
            },
          ]
        : [],
    };
  }
  const cmd = cmdOf(data, view);
  const set = (id, key, color, radius) => ({
    id,
    label: t(`gaiaW.s.legend.${key}`),
    x: cmd[key].x,
    y: cmd[key].g.map(g => -g),
    color,
    mode: 'points',
    radius,
  });
  return {
    label: aria,
    ...axis,
    xRange: [0, 3.2],
    yRange: [-17.8, -8.5],
    series: [
      set('removed', 'removed', COLOR.orange, 1.8),
      set('others', 'others', COLOR.grey, 1.8),
      set('members', 'members', COLOR.blue, 2.4),
    ],
  };
}

const MAG = {
  id: 'mag',
  get label() {
    return t('gaiaW.s.control.mag');
  },
  min: 12,
  max: PACK_LIMITS.g,
  step: 0.5,
  value: SAMPLE_START.mag,
  decimals: 1,
  format: x => (x >= PACK_LIMITS.g ? t('gaiaW.off') : num(x, 1)),
};

const SAMPLE = {
  id: 'gaia-sample',
  get title() {
    return t('gaiaW.s.title');
  },
  get note() {
    return t('gaiaW.s.note', {
      n: data ? data.n : 993,
      p: num(MEMBER_THRESHOLD, 1),
      c: CLIP_SIGMA,
    });
  },
  animated: false,
  controls: [
    {
      id: 'view',
      get label() {
        return t('gaiaW.s.control.view');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`gaiaW.s.view.${isOn(x) ? 1 : 0}`),
    },
    MAG,
    {
      id: 'poe',
      get label() {
        return t('gaiaW.s.control.poe');
      },
      min: 0,
      max: 12,
      step: 1,
      value: SAMPLE_START.poe,
      decimals: 0,
      format: x => (x <= 0 ? t('gaiaW.off') : num(x, 0)),
    },
    {
      id: 'ruwe',
      get label() {
        return t('gaiaW.s.control.ruwe');
      },
      min: 0.9,
      max: PACK_LIMITS.ruwe,
      step: 0.05,
      value: SAMPLE_START.ruwe,
      decimals: 2,
      format: x => (x >= PACK_LIMITS.ruwe ? t('gaiaW.off') : num(x, 2)),
    },
    toggle('zp', 'gaiaW.s.control.zp', SAMPLE_START.zp),
  ],
  presets: [
    {
      values: { view: 0, mag: 17.5, poe: 0, ruwe: 1.4, zp: 1 },
      get label() {
        return t('gaiaW.s.preset.all');
      },
    },
    {
      values: { view: 0, mag: 15, poe: 0, ruwe: 1.4, zp: 1 },
      get label() {
        return t('gaiaW.s.preset.bright');
      },
    },
    {
      values: { view: 0, mag: 17.5, poe: 10, ruwe: 1.4, zp: 1 },
      get label() {
        return t('gaiaW.s.preset.precise');
      },
    },
    {
      values: { view: 0, mag: 17.5, poe: 0, ruwe: 1.4, zp: 0 },
      get label() {
        return t('gaiaW.s.preset.noZp');
      },
    },
  ],
  draw(canvas, v) {
    const spec = sampleSpec(v);
    hostOf(canvas, t('gaiaW.s.title'), 300).chart.draw(spec);
    return spec;
  },
  readout(v) {
    if (!data)
      return [{ label: t('gaiaW.s.row.source'), value: t('gaiaW.loading') }];
    const view = sampleView(data, v);
    const rows = [];
    rows.push({
      label: t('gaiaW.s.row.source'),
      value: t('gaiaW.s.v.source', {
        v: '1.1.0',
        n: data.n,
        d: data.dropped ?? '?',
      }),
    });
    const alone = Object.fromEntries(
      view.cuts.alone.map(a => [a.id, a.removed])
    );
    const lines = view.cuts.steps.map(s =>
      t(`gaiaW.s.cut.${s.id}`, {
        x:
          s.id === 'parallaxOverError'
            ? num(s.limit, 0)
            : num(s.limit, s.id === 'ruwe' ? 2 : 1),
        a: alone[s.id],
        n: data.n,
        r: s.removed,
      })
    );
    rows.push({
      label: t('gaiaW.s.row.cuts'),
      value: lines.length ? lines.join('; ') : t('gaiaW.s.v.noCuts'),
    });
    const cl = view.cluster;
    rows.push({
      label: t('gaiaW.s.row.kept'),
      value: cl
        ? t('gaiaW.s.v.kept', {
            k: view.kept,
            n: data.n,
            m: view.members.length,
            u: cl.n,
            c: CLIP_SIGMA,
          })
        : t('gaiaW.s.v.noMembers', { k: view.kept, n: data.n }),
      emphasis: true,
    });
    if (cl && view.record && view.record.distance !== null) {
      rows.push({
        label: t('gaiaW.s.row.parallax'),
        value: t('gaiaW.s.v.parallax', {
          p: num(cl.mean, 4),
          e: num(cl.statError, 4),
          z: view.useZeroPoint
            ? `${num(cl.meanZeroPoint, 4)} mas`
            : t('gaiaW.none'),
        }),
      });
      const iv = view.record.interval;
      rows.push({
        label: t('gaiaW.s.row.distance'),
        value: t('gaiaW.s.v.distance', {
          d: num(view.record.distance, 3),
          lo: num(iv.lo, 3),
          hi: iv.hi === null ? '∞' : num(iv.hi, 3),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('gaiaW.s.row.limit'),
        value: t('gaiaW.s.v.limit'),
      });
      const vel = view.velocity;
      if (vel)
        rows.push({
          label: t('gaiaW.s.row.velocity'),
          value: t('gaiaW.s.v.velocity', {
            d: num(view.record.distance, 3),
            a: num(vel.meanRa, 1),
            b: num(vel.meanDec, 1),
            sa: num(vel.scatterRa, 1),
            sb: num(vel.scatterDec, 1),
            mu: num(vel.muMean, 2),
            v: num(vel.speed.value, 1),
            lo: num(vel.speed.interval.lo, 1),
            hi: num(vel.speed.interval.hi, 1),
          }),
        });
    }
    rows.push({
      label: t('gaiaW.s.row.zeroPoint'),
      value: t(
        view.useZeroPoint ? 'gaiaW.s.v.zeroPointOn' : 'gaiaW.s.v.zeroPointOff'
      ),
    });
    return rows;
  },
};

export const GAIA_WIDGETS = [DISTANCE, SAMPLE];
