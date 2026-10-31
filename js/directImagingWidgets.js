// =============================================================================
// The direct-imaging panels (Prompt 230, IMAGING.md)
// -----------------------------------------------------------------------------
// Two panels in a lazy family.
//   imaging-contrast       one planet beside its star: its separation on the sky, the telescope's
//                          diffraction scale, an example instrument's inner working angle and contrast
//                          floor, the contrast (thermal and reflected) and whether this instrument could
//                          see it. A chart of the contrast against wavelength.
//   imaging-architectures  the Solar System's planets and the archive's imaged planets on one log
//                          diagram: orbit against mass, or angle on the sky against mass.
//
// Nothing is calculated here: every number is js/directImagingField.js's, over js/kernels/imaging/.
// The instruments are teaching examples and the panels say so; the planet temperature of a young
// giant is stated and flagged, never derived from a blackbody at the irradiation equilibrium.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_DIRECT_IMAGING } from './i18n/en.directImaging.js';
import { ES_DIRECT_IMAGING } from './i18n/es.directImaging.js';
import { fixed, scientific } from './format.js';
import { createChart } from './plot/mount.js';
import {
  SYSTEMS,
  INSTRUMENTS,
  PLOT_FLOOR,
  AU_M,
  contrastView,
  architecturesView,
} from './directImagingField.js';

registerMessages('en', EN_DIRECT_IMAGING);
registerMessages('es', ES_DIRECT_IMAGING);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
};
const sci = x => scientific(x, 2);
const ang = x => (x < 0.1 ? fixed(x, 4) : x < 10 ? fixed(x, 3) : fixed(x, 1));
const log10 = x => Math.log10(Math.max(x, PLOT_FLOOR));
const hosts = new WeakMap();

/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 260,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 1 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

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
  format: x => t(x >= 0.5 ? 'dirW.on' : 'dirW.off'),
});

const picker = (id, label, count, key, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: count - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(`${key}.${Math.max(0, Math.min(count - 1, Math.round(x)))}`),
});

function contrastSpec(v) {
  const x = v.curve.map(p => log10(p.wavelengthM * 1e6));
  const col = k => v.curve.map(p => log10(p[k]));
  const floor = log10(v.telescope.contrastFloor);
  const at = {
    id: 'at',
    label: t('dirW.legend.at'),
    x: [log10(v.lambdaM * 1e6)],
    y: [log10(v.contrast.total)],
    color: COLOR.green,
    mode: 'points',
    radius: 5,
  };
  const series = [
    {
      id: 'reflected',
      label: t('dirW.legend.reflected'),
      x,
      y: col('reflected'),
      color: COLOR.blue,
      width: 2,
    },
    {
      id: 'thermal',
      label: t('dirW.legend.thermal'),
      x,
      y: col('thermal'),
      color: COLOR.orange,
      width: 2,
    },
    {
      id: 'total',
      label: t('dirW.legend.total'),
      x,
      y: col('total'),
      color: COLOR.grey,
      width: 2,
      dash: [5, 3],
    },
    {
      id: 'floor',
      label: t('dirW.legend.floor'),
      x: [x[0], x[x.length - 1]],
      y: [floor, floor],
      color: COLOR.green,
      width: 1,
      dash: [2, 3],
    },
    at,
  ];
  return {
    xTitle: t('dirW.axis.wavelength'),
    yTitle: t('dirW.axis.contrast'),
    xRange: [x[0], x[x.length - 1]],
    yRange: [-16, 0],
    series,
  };
}

const CONTRAST = {
  id: 'imaging-contrast',
  get title() {
    return t('dirW.contrast.title');
  },
  get note() {
    return t('dirW.contrast.note');
  },
  animated: false,
  controls: [
    picker('system', 'dirW.control.system', SYSTEMS.length, 'dirW.system', 0),
    {
      id: 'distance',
      get label() {
        return t('dirW.control.distance');
      },
      min: 1,
      max: 100,
      step: 1,
      value: 10,
      decimals: 0,
      format: x => `${fixed(x, 0)} pc`,
    },
    picker(
      'telescope',
      'dirW.control.telescope',
      INSTRUMENTS.length,
      'dirW.tel',
      3
    ),
    {
      id: 'phase',
      get label() {
        return t('dirW.control.phase');
      },
      min: 0,
      max: 180,
      step: 15,
      value: 90,
      decimals: 0,
      format: x => `${fixed(x, 0)}°`,
    },
    {
      id: 'band',
      get label() {
        return t('dirW.control.band');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(x >= 0.5 ? 'dirW.band.1' : 'dirW.band.0'),
    },
    toggle('plots', 'dirW.control.plots', 1),
  ],
  draw(canvas, vals) {
    const v = contrastView(vals);
    const spec = { label: t('dirW.contrast.title'), ...contrastSpec(v) };
    const h = hostOf(canvas, t('dirW.contrast.title'));
    const show = Math.round(vals.plots ?? 1) === 1;
    h.el.hidden = !show;
    if (show) h.chart.draw(spec);
    return spec;
  },
  readout(vals) {
    const v = contrastView(vals);
    const c = v.contrast;
    const i = SYSTEMS.indexOf(v.system);
    const w = fixed(v.lambdaM * 1e6, v.lambdaM < 1e-6 ? 2 : 2);
    const rows = [
      {
        label: t('dirW.row.system'),
        value: t('dirW.v.system', {
          n: t(`dirW.systemName.${i}`),
          d: fixed(v.distancePc, 0),
          a: fixed(v.alphaDeg, 0),
          r: fixed(
            v.system.semiMajorM / AU_M,
            v.system.semiMajorM / AU_M < 1 ? 2 : 1
          ),
          t: fixed(v.system.starTeffK, 0),
        }),
      },
      {
        label: t('dirW.row.separation'),
        value: t('dirW.v.separation', {
          s: ang(v.separation.arcsec),
          r: fixed(v.separationAu, 3),
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.scale'),
        value: t('dirW.v.scale', {
          x: ang(v.scale.lambdaOverDArcsec),
          D: fixed(v.telescope.apertureM, v.telescope.apertureM < 1 ? 2 : 1),
          w,
          k: fixed(v.separationOverScale, 1),
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.iwa'),
        value: t('dirW.v.iwa', {
          n: fixed(v.telescope.innerWorkingLambdaOverD, 0),
          a: ang(v.innerWorkingArcsec),
        }),
      },
      {
        label: t('dirW.row.contrast'),
        value: t('dirW.v.contrast', {
          r: sci(c.reflected),
          t: sci(c.thermal),
          c: sci(c.total),
          k: scientific(1 / c.total, 2),
          w,
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.verdict'),
        value: v.verdict.observable
          ? t('dirW.v.observable', { f: sci(v.telescope.contrastFloor) })
          : t('dirW.v.notObservable', {
              r: t(`dirW.reason.${v.verdict.code}`, {
                f: sci(v.telescope.contrastFloor),
              }),
            }),
        emphasis: true,
      },
      {
        label: t('dirW.row.temperature'),
        value: c.planetTeffStated
          ? t('dirW.v.selfLuminous', {
              t: fixed(c.planetTeffK, 0),
              e: fixed(c.irradiationTeqK, 0),
            })
          : t('dirW.v.irradiated', {
              t: fixed(c.planetTeffK, 0),
              b: fixed(Math.min(1, 1.5 * v.system.geometricAlbedo), 2),
            }),
      },
      { label: t('dirW.row.assumes'), value: t('dirW.a') },
    ];
    return rows;
  },
};

function archSpec(v) {
  const m = p => log10(p.massJup);
  const xs = p => (v.view === 0 ? log10(p.semiMajorAu) : log10(p.arcsec));
  const solar = v.solar;
  const imaged =
    v.view === 0 ? v.imaged : v.imaged.filter(p => p.arcsec != null);
  const series = [
    {
      id: 'imaged',
      label: t('dirW.legend.imaged'),
      x: imaged.map(xs),
      y: imaged.map(m),
      color: COLOR.orange,
      mode: 'points',
      radius: 3,
    },
    {
      id: 'solar',
      label: t('dirW.legend.solar'),
      x: solar.map(xs),
      y: solar.map(m),
      color: COLOR.blue,
      mode: 'points',
      radius: 5,
    },
  ];
  if (v.view === 1) {
    const x = log10(v.innerWorkingArcsec);
    series.push({
      id: 'iwa',
      label: t('dirW.legend.iwa'),
      x: [x, x],
      y: [-4, 2],
      color: COLOR.green,
      width: 1,
      dash: [4, 3],
    });
  }
  return {
    xTitle: t(v.view === 0 ? 'dirW.axis.axis' : 'dirW.axis.angle'),
    yTitle: t('dirW.axis.mass'),
    xRange: v.view === 0 ? [-1.5, 3.6] : [-3.2, 1.3],
    yRange: [-4, 2],
    series,
  };
}

const ARCH = {
  id: 'imaging-architectures',
  get title() {
    return t('dirW.arch.title');
  },
  get note() {
    return t('dirW.arch.note');
  },
  animated: false,
  controls: [
    picker('view', 'dirW.control.view', 2, 'dirW.view', 0),
    picker(
      'telescope',
      'dirW.control.telescope',
      INSTRUMENTS.length,
      'dirW.tel',
      3
    ),
    {
      id: 'distance',
      get label() {
        return t('dirW.control.distance');
      },
      min: 1,
      max: 100,
      step: 1,
      value: 10,
      decimals: 0,
      format: x => `${fixed(x, 0)} pc`,
    },
  ],
  draw(canvas, vals) {
    const v = architecturesView(vals);
    const spec = { label: t('dirW.arch.title'), ...archSpec(v) };
    const h = hostOf(canvas, t('dirW.arch.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(vals) {
    const v = architecturesView(vals);
    const c = v.counts;
    const sun = v.solar;
    return [
      {
        label: t('dirW.row.table'),
        value: t('dirW.v.table', {
          n: c.table,
          m: c.withAxisAndMass,
          k: c.withDistanceToo,
        }),
      },
      {
        label: t('dirW.row.imaged'),
        value: t('dirW.v.imaged', {
          a: fixed(v.median.imagedAxisAu, 0),
          m: fixed(v.median.imagedMassJup, 1),
          h: v.imagedHeavierThanJupiter,
          n: c.withAxisAndMass,
          b: v.imagedBeyondNeptune,
        }),
        emphasis: true,
      },
      {
        label: t('dirW.row.solar'),
        value: t('dirW.v.solar', {
          d: fixed(v.distancePc, 0),
          lo: ang(sun[0].arcsec),
          hi: ang(sun[sun.length - 1].arcsec),
        }),
      },
      {
        label: t('dirW.row.window'),
        value: t('dirW.v.window', {
          a: ang(v.innerWorkingArcsec),
          i: c.imagedOutside,
          k: c.withDistanceToo,
          s: c.solarOutside,
        }),
        emphasis: true,
      },
      { label: t('dirW.row.source'), value: t('dirW.v.source') },
    ];
  },
};

export const DIRECT_IMAGING_WIDGETS = [CONTRAST, ARCH];
